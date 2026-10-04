"use strict";

// Browser-engine test with a synthetic clock and keyboard state. This calls the
// real Phaser Game.step, including Scene, Arcade World and renderer ordering.
// It does not measure wall-clock FPS, display refresh, or physical key hardware.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, "..", "phase2a-output");
fs.mkdirSync(output, { recursive: true });
const report = {
  test: "Phaser Game.step with a controlled synthetic timeline",
  disclaimer: "Synthetic keyboard state and timestamps. Not wall-clock or monitor 120 FPS; not a delta-only movement-function unit test.",
  base, durationMs: 2000, rates: [30, 60, 120], fixture: "baseline", mech: "umbraSeraph",
  cases: [], checks: []
};
let browser;

async function createContext(rate) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { rate, requests: [], externalRequests: [], pageErrors: [], cases: [] };
  report.cases.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) {
      record.externalRequests.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push({ url: request.url(), method: request.method() }));
  page.on("pageerror", error => record.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__steppedAudit = { storageGetterProbes: [], storageOperations: [], normalEntries: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) {
      Storage.prototype[method] = function () {
        window.__steppedAudit.storageOperations.push(method);
        throw new Error("Storage data operations are forbidden");
      };
    }
    for (const area of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, area, {
        configurable: true,
        get() {
          window.__steppedAudit.storageGetterProbes.push({ area, stack: new Error().stack });
          throw new Error("Stepped drive must not access " + area);
        }
      });
    }
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__steppedAudit.normalEntries.push(name);
          return method.apply(this, args);
        };
      }
    }, { once: true });
  });
  await page.goto(base + "/?umbraPreview=1&umbraDrive=1", { waitUntil: "load" });
  await page.waitForFunction(() => {
    const game = window.__SURVIVAL_GAME__;
    return game?.scene.isActive("UmbraPhase2ADrive") && game.scene.getScene("UmbraPhase2ADrive").stats &&
      game.scene.getScene("UmbraPhase1Assets").status.finished;
  }, null, { timeout: 30000 });
  record.engine = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__;
    game.loop.stop();
    return {
      version: Phaser.VERSION, loopRunning: game.loop.running,
      storageProbesBeforeTimeline: window.__steppedAudit.storageGetterProbes.length,
      gameStepSource: game.step.toString(),
      worldUpdateSource: game.scene.getScene("UmbraPhase2ADrive").physics.world.update.toString(),
      worldFps: game.scene.getScene("UmbraPhase2ADrive").physics.world.fps,
      fixedStep: game.scene.getScene("UmbraPhase2ADrive").physics.world.fixedStep,
      rendererType: game.renderer.type
    };
  });
  assert.equal(record.engine.loopRunning, false, "Automatic game loop must be stopped");
  assert.equal(record.engine.fixedStep, true, "Use existing fixed-step Arcade World");
  assert.equal(record.engine.worldFps, 60, "Do not retune the production physics rate");
  return { context, page, record };
}

async function runTimeline(page, rate, scenario) {
  return page.evaluate(({ rate, scenario }) => {
    const game = window.__SURVIVAL_GAME__;
    const scene = game.scene.getScene("UmbraPhase2ADrive");
    scene.resetDrive("umbraSeraph", "baseline");
    if (scenario === "wall") scene.playerHitbox.body.reset(1520, 1000);
    const delta = 1000 / rate;
    const frameCount = rate * 2;
    let timestamp = scene.time.now;
    const initial = scene.snapshot();
    const counters = { sceneUpdates: 0, physicsSteps: 0, renderFrames: 0, gameSteps: 0 };
    const ordering = [];
    let frame = -1;
    const listeners = [];
    const listen = (emitter, event, label, counter) => {
      const handler = () => {
        if (counter) counters[counter] += 1;
        if (frame < 3) ordering.push({ frame, event: label });
      };
      emitter.on(event, handler);
      listeners.push([emitter, event, handler]);
    };
    listen(game.events, "prestep", "Game PRE_STEP");
    listen(game.events, "step", "Game STEP", "gameSteps");
    listen(game.events, "poststep", "Game POST_STEP");
    listen(game.events, "prerender", "Game PRE_RENDER");
    listen(game.events, "postrender", "Game POST_RENDER", "renderFrames");
    listen(scene.events, "preupdate", "Scene PRE_UPDATE");
    listen(scene.events, "update", "Scene UPDATE", "sceneUpdates");
    listen(scene.events, "postupdate", "Scene POST_UPDATE");
    listen(scene.physics.world, "worldstep", "Arcade WORLD_STEP", "physicsSteps");
    const elapsedBefore = scene.physics.world._elapsed;
    const samples = [];
    const inputChanges = [];
    let previousInputSignature = "";
    const input = (seconds) => {
      const state = { right: false, left: false, up: false, down: false, dash: false };
      if (scenario === "cruise" || scenario === "wall") {
        state.right = true;
        state.dash = scenario === "wall" && seconds >= 0.1;
      } else {
        state.right = seconds < 0.7;
        state.down = seconds >= 0.7 && seconds < 1.35;
        state.left = seconds >= 1.35;
        state.dash = seconds >= 0.1 && seconds < 0.25;
      }
      return state;
    };
    try {
      for (frame = 0; frame < frameCount; frame += 1) {
        const keys = input(frame / rate);
        const inputSignature = JSON.stringify(keys);
        if (inputSignature !== previousInputSignature) {
          inputChanges.push({ beforeGameStep: frame + 1, timelineMs: frame * delta, keys: { ...keys } });
          previousInputSignature = inputSignature;
        }
        // Deliberately synthetic input through the existing Phaser Key state.
        // getPlayerMoveInputVector/getPlayerDashInputDown remain the real methods.
        for (const [name, key] of Object.entries(scene.keys)) {
          key.isDown = keys[name] === true;
          key.isUp = !key.isDown;
        }
        timestamp += delta;
        game.step(timestamp, delta);
        if (frame % Math.max(1, Math.round(rate / 10)) === 0 || frame === frameCount - 1) {
          samples.push({ frame: frame + 1, timelineMs: (frame + 1) * delta, ...scene.snapshot() });
        }
      }
      return {
        scenario, rate, delta, durationMs: frameCount * delta,
        inputDescription: scenario === "cruise" ? "right for 2000ms" : scenario === "wall"
          ? "start x1520/y1000; right for 2000ms; dash from 100ms"
          : "right 0-700ms; dash 100-250ms; down 700-1350ms; left 1350-2000ms",
        inputChanges, counters, sceneCounters: { updates: scene.sceneUpdates, physicsSteps: scene.physicsSteps, renderFrames: scene.renderFrames },
        elapsedBefore, elapsedAfter: scene.physics.world._elapsed,
        initial, final: scene.snapshot(), collisions: scene.collisionCount, ordering, samples,
        transitions: scene.transitions
      };
    } finally {
      listeners.forEach(([emitter, event, handler]) => emitter.off(event, handler));
      scene.clearDriveInput();
    }
  }, { rate, scenario });
}

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  for (const rate of report.rates) {
    const { context, page, record } = await createContext(rate);
    for (const scenario of ["cruise", "tap-release-turn", "wall"]) {
      const result = await runTimeline(page, rate, scenario);
      record.cases.push(result);
      assert.equal(result.counters.gameSteps, rate * 2);
      assert.equal(result.counters.sceneUpdates, rate * 2);
      assert.equal(result.counters.renderFrames, rate * 2);
      assert.equal(result.sceneCounters.updates, rate * 2);
      assert.ok(Math.abs(result.counters.physicsSteps - 120) <= 1, `Expected 120 fixed physics steps, got ${result.counters.physicsSteps}`);
      assert.equal(result.counters.physicsSteps, result.sceneCounters.physicsSteps);
      assert.ok(result.samples.every(s => [s.x, s.y, s.speed, s.en].every(Number.isFinite)));
      if (scenario === "cruise") {
        assert.ok(result.final.x > result.initial.x + 300);
        assert.ok(Math.abs(result.final.speed - result.final.allowedSpeed) < 0.01);
      } else if (scenario === "tap-release-turn") {
        assert.ok(result.transitions.some(s => s.boostActive));
        assert.ok(result.final.vx < 0 && result.final.y > result.initial.y);
        assert.equal(result.final.invulnerable, false);
        assert.equal(result.final.boostActive, false);
      } else {
        assert.ok(result.collisions > 0);
        assert.ok(result.final.x <= 1643.01, "Wall penetration");
        assert.ok(result.final.en < result.initial.en, "Boost must consume real EN while wall blocked");
      }
      report.checks.push(`${rate}Hz ${scenario}: ${result.counters.gameSteps} Game/Scene/render calls, ${result.counters.physicsSteps} fixed physics steps`);
    }
    record.isolation = await page.evaluate(() => ({
      ...window.__steppedAudit,
      firebaseCacheCreated: Boolean(window.__LASTMEMO_FIREBASE_LEADERBOARD__),
      loopRunning: window.__SURVIVAL_GAME__.loop.running
    }));
    // The vendored engine probes window.localStorage once during feature detection.
    // Our getter denies that capability without exposing a Storage object. There
    // must be no data operation and no new probe after entering the drive timeline.
    assert.deepEqual(record.isolation.storageOperations, []);
    assert.equal(record.isolation.storageGetterProbes.length, record.engine.storageProbesBeforeTimeline);
    assert.ok(record.isolation.storageGetterProbes.every(probe => probe.stack.includes("/vendor/phaser.min.js")));
    assert.deepEqual(record.isolation.normalEntries, []);
    assert.equal(record.isolation.firebaseCacheCreated, false);
    assert.equal(record.isolation.loopRunning, false);
    assert.deepEqual(record.externalRequests, []);
    assert.deepEqual(record.pageErrors, []);
    await context.close();
  }
  report.pass = true;
})().catch(error => { report.pass = false; report.error = error.stack; process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(output, "drive-stepped-browser-report.json"), JSON.stringify(report, null, 2));
  await browser?.close();
  console.log(JSON.stringify({ pass: report.pass, checks: report.checks, error: report.error }));
});
