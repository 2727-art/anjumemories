"use strict";

// Controlled browser-engine timeline, with synthetic Phaser Key input. Real
// Game.step -> Scene -> Arcade World -> render order is retained throughout.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_airbrake", "output");
const sourceRoot = process.env.UMBRA_BRAKE_SOURCE_ROOT || project;
const variant = process.env.UMBRA_BRAKE_VARIANT || "legacy";
assert.ok(["legacy", "tuned"].includes(variant));
const smoke = process.argv.includes("--smoke");
const rates = smoke ? [60] : [30, 60, 120];
const mechs = smoke ? ["umbraSeraph"] : ["defaultBear", "regaliaBastion", "umbraSeraph"];
const fixtureIds = smoke ? ["baseline"] : ["baseline", "medium", "deep"];
fs.mkdirSync(output, { recursive: true });

// Freeze script responses at process startup, so concurrent local edits cannot
// mix a legacy calculation with a newer Drive adapter midway through the matrix.
const frozenSources = new Map();
for (const name of ["index.html", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraPreview.js", "umbraPreviewAssets.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js"]) {
  const file = fs.existsSync(path.join(sourceRoot, name)) ? path.join(sourceRoot, name) : path.join(project, name);
  const body = fs.readFileSync(file);
  frozenSources.set(name, { body, file, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
const report = {
  variant, smoke, sourceRoot, base,
  methodology: "Synthetic keyboard states and timestamps, actual Phaser Game.step/Arcade body/render; no wall-clock FPS or physical keyboard claim.",
  checkpoints: "First actual Scene-clock sample at or after 50/100/150/200ms from successful startAcAirBrake, never from key-down.",
  directMethod: "Synthetic velocity 1540px/s, normalized opposite input magnitude 1, post-glide state, actual startAcAirBrake at a shared starting instant; direct case isolates the active brake from its normal eligibility gate.",
  controlledEnvironment: "Each case seeds Scene clock at 10000ms and Arcade fixed-step accumulator at 0; timestamps are frame-index-derived. RAM open measuring lane disables the wall collider and expands bounds to +/-20000px, avoiding environmental collision being reported as braking. Collision behavior is covered by the separate regression harness.",
  sources: Object.fromEntries([...frozenSources].map(([name, s]) => [name, { file: s.file, sha256: s.sha256 }])),
  contexts: [], measurements: []
};
let browser;

async function openContext(rate) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { rate, externalRequests: [], pageErrors: [] };
  report.contexts.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { record.externalRequests.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname);
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    const frozen = frozenSources.get(name);
    return frozen ? route.fulfill({ status: 200, body: frozen.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => record.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__brakeAudit = { storageProbes: [], storageOperations: [], normalEntries: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) {
      Storage.prototype[method] = function () { window.__brakeAudit.storageOperations.push(method); throw new Error("Storage forbidden"); };
    }
    for (const area of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, area, { configurable: true, get() {
        window.__brakeAudit.storageProbes.push({ area, stack: new Error().stack });
        throw new Error("Storage capability denied");
      } });
    }
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__brakeAudit.normalEntries.push(name); return method.apply(this, args);
        };
      }
    }, { once: true });
  });
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1&umbraBrake=${variant}`);
  await page.waitForFunction(() => {
    const game = window.__SURVIVAL_GAME__;
    return game?.scene.isActive("UmbraPhase2ADrive") && game.scene.getScene("UmbraPhase2ADrive").stats && game.scene.getScene("UmbraPhase1Assets").status.finished;
  }, null, { timeout: 30000 });
  record.engine = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    game.loop.stop();
    return { phaser: Phaser.VERSION, gameStep: game.step.toString(), fixedStep: scene.physics.world.fixedStep, physicsFps: scene.physics.world.fps, storageProbeCount: window.__brakeAudit.storageProbes.length };
  });
  assert.equal(record.engine.fixedStep, true);
  assert.equal(record.engine.physicsFps, 60);
  return { context, page, record };
}

async function measure(page, settings) {
  return page.evaluate(({ rate, mech, fixture, kind, requestedBoostMs, variant }) => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    scene.time.now = 10000;
    scene.resetDrive(mech, fixture, variant);
    const physicsRemainderBeforeSeed = scene.physics.world._elapsed;
    scene.physics.world._elapsed = 0;
    scene.physics.world.setBounds(-20000, -20000, 40000, 40000);
    scene.wallCollider.active = false;
    const state = scene.ensureAcMovementState();
    const delta = 1000 / rate;
    let timestamp = scene.time.now;
    const timelineStart = timestamp;
    const samples = [], starts = [], ends = [], physicsReverse = [], inputChanges = [], ordering = [];
    const counts = { gameSteps: 0, sceneUpdates: 0, physicsSteps: 0, renderFrames: 0 };
    let priorInput = "", priorBodyX = scene.playerHitbox.body.center.x, firstStart = null;
    let phase = "prelude", release = null;
    const sourceStart = scene.startAcAirBrake, sourceEnd = scene.endAcAirBrake;
    const read = () => {
      const body = scene.playerHitbox.body, brake = state.airBrake;
      const bodySpeed = Math.hypot(body.velocity.x, body.velocity.y);
      return {
        time: scene.time.now, timelineMs: scene.time.now - timelineStart,
        sinceBrakeMs: firstStart ? scene.time.now - firstStart.time : null,
        phase, x: body.center.x, y: body.center.y,
        bodySpeed, bodyVx: body.velocity.x, bodyVy: body.velocity.y, originalDirectionComponent: body.velocity.x,
        stateSpeed: Math.hypot(state.velocity.x, state.velocity.y), stateVx: state.velocity.x, stateVy: state.velocity.y,
        active: !!brake.active, blockReason: brake.lastBlockReason, endReason: brake.endReason,
        en: scene.stats.stamina, maxEn: scene.stats.maxStamina,
        boost: !!state.continuousBoost.active, boostEndReason: state.continuousBoost.endReason,
        fullOverheat: scene.isAcFullOverheatActive(state), invulnerable: scene.isAcEvadeWindowActive(scene.time.now, state),
        evadeRemainingMs: scene.getAcEvadeWindowRemainingMs(scene.time.now, state),
        inputMagnitude: state.lastInputVector?.magnitude, inputX: state.lastInputVector?.normalizedX,
        targetSpeed: brake.targetSpeed, strength: brake.strength,
        mustRelease: state.mustReleaseDashBeforeBoost,
        collisionCount: scene.collisionCount,
        blocked: { ...body.blocked },
        sceneUpdates: counts.sceneUpdates, physicsSteps: counts.physicsSteps
      };
    };
    scene.startAcAirBrake = function (...args) {
      const before = read();
      const result = sourceStart.apply(this, args);
      if (result) {
        const entry = { ...read(), before, sampleIndex: samples.length, speedBefore: state.airBrake.speedBefore, durationMs: state.airBrake.until - state.airBrake.startedAt };
        starts.push(entry); if (!firstStart) firstStart = entry;
      }
      return result;
    };
    scene.endAcAirBrake = function (...args) {
      const before = read();
      const result = sourceEnd.apply(this, args);
      if (before.active) ends.push({ ...read(), before, requestedReason: args[2] });
      return result;
    };
    const handlers = [];
    const on = (emitter, event, label, counter, extra) => {
      const handler = () => {
        if (counter) counts[counter] += 1;
        if (counts.gameSteps <= 3) ordering.push(label);
        extra?.();
      };
      emitter.on(event, handler); handlers.push([emitter, event, handler]);
    };
    on(game.events, "step", "GAME_STEP", "gameSteps");
    on(scene.events, "preupdate", "SCENE_PREUPDATE");
    on(scene.events, "update", "SCENE_UPDATE", "sceneUpdates");
    on(scene.events, "postupdate", "SCENE_POSTUPDATE");
    on(game.events, "postrender", "RENDER", "renderFrames");
    on(scene.physics.world, "worldstep", "PHYSICS", "physicsSteps", () => {
      const x = scene.playerHitbox.body.center.x;
      if (firstStart && x - priorBodyX < -0.0001) physicsReverse.push({ time: scene.time.now, sinceBrakeMs: scene.time.now - firstStart.time, physicsSteps: counts.physicsSteps, deltaX: x - priorBodyX, x });
      priorBodyX = x;
    });
    const step = (right = false, dash = false, left = false) => {
      const signature = `${right}|${dash}|${left}`;
      if (signature !== priorInput) {
        inputChanges.push({ timelineMs: timestamp - timelineStart, phase, right, dash, left }); priorInput = signature;
      }
      for (const [name, key] of Object.entries(scene.keys)) {
        key.isDown = name === "right" ? right : name === "left" ? left : name === "dash" ? dash : false;
        key.isUp = !key.isDown;
      }
      timestamp = timelineStart + (counts.gameSteps + 1) * delta;
      game.step(timestamp, delta);
      samples.push(read());
    };
    const forMs = (ms, right, dash, left) => {
      const frames = Math.ceil(ms / delta - 1e-9);
      for (let i = 0; i < frames; i += 1) step(right, dash, left);
      return frames * delta;
    };
    let direct = null, deliveredBoostMs = 0;
    try {
      forMs(100, false, false, false);
      if (kind === "direct1540") {
        phase = "direct-brake";
        // Equal velocity/input/activation seed, without changing the engine or
        // brake function. The normal activation gate is tested by boost cases.
        state.velocity.x = 1540; state.velocity.y = 0;
        scene.playerHitbox.body.setVelocity(1540, 0);
        state.lastMoveDirection.x = 1; state.lastMoveDirection.y = 0;
        state.postBoostGlideUntil = scene.time.now + 1000;
        for (const [name, key] of Object.entries(scene.keys)) { key.isDown = name === "left"; key.isUp = !key.isDown; }
        state.lastInputVector = scene.getPlayerMoveInputVector();
        const components = scene.getAcAirBrakeComponents(state, state.lastInputVector);
        direct = { seededSpeed: 1540, components, result: scene.startAcAirBrake(state, scene.time.now, components) };
        if (!direct.result) throw new Error("Direct brake did not start");
        forMs(1500, false, false, true);
      } else {
        phase = "boost";
        deliveredBoostMs = forMs(requestedBoostMs, true, true, false);
        release = read();
        phase = "released-reverse";
        forMs(2000, false, false, true);
      }
      const start = starts[0] || null, end = ends[0] || null;
      const afterStart = start ? samples.slice(start.sampleIndex) : [];
      const targets = Object.fromEntries([50, 100, 150, 200].map(target => {
        const sample = afterStart.find(s => s.time - start.time >= target - 1e-6) || null;
        return [target, sample ? { requestedMs: target, actualMs: sample.time - start.time, ...sample } : null];
      }));
      const firstEndStep = end ? samples.find(s => s.time >= end.time - 1e-6) : null;
      const beforeEnd = start && end ? afterStart.filter(s => s.time <= end.time + 1e-6) : [];
      const nearStop20 = afterStart.find(s => s.bodySpeed <= 20) || null;
      const nearStop1 = afterStart.find(s => s.bodySpeed <= 1) || null;
      return {
        rate, mech, fixture, variant, kind, requestedBoostMs, deliveredBoostMs,
        clockSeed: timelineStart, physicsRemainderBeforeSeed, physicsRemainderSeed: 0, physicsRemainderAfter: scene.physics.world._elapsed,
        maxDeltaSeconds: scene.getActiveAcMovementTuning().maxDeltaSeconds, effectiveMovementDeltaSeconds: scene.clampAcMovementDelta(delta),
        collisionCount: scene.collisionCount,
        effectiveVariant: scene.snapshot().airBrakeVariant || scene.airBrakeVariant || scene.verificationContext?.airBrakeVariant || "legacy",
        profile: scene.getRunPlayerMechStatProfile(), tuning: Object.fromEntries(Object.entries(scene.getActiveAcMovementTuning()).filter(([key]) => key.toLowerCase().includes("airbrake"))),
        initialStats: scene.umbraDriveFixtureSummary.stats, direct, release, starts, ends, checkpoints: targets,
        firstEndStep, firstReversePhysicalMovement: physicsReverse[0] || null,
        nearStop20: nearStop20 ? { actualMs: nearStop20.time - start.time, speed: nearStop20.bodySpeed, x: nearStop20.x } : null,
        nearStop1: nearStop1 ? { actualMs: nearStop1.time - start.time, speed: nearStop1.bodySpeed, x: nearStop1.x } : null,
        brakeDistance: start && end ? Math.hypot(end.x - start.x, end.y - start.y) : null,
        brakeForwardDisplacement: start && end ? end.x - start.x : null,
        maxForwardDriftDuringBrake: start && beforeEnd.length ? Math.max(...beforeEnd.map(s => s.x - start.x)) : null,
        maxForwardDriftAfterActivation: start && afterStart.length ? Math.max(...afterStart.map(s => s.x - start.x)) : null,
        minimumBodySpeedAfterActivation: afterStart.length ? Math.min(...afterStart.map(s => s.bodySpeed)) : null,
        final: read(), counts, sceneCounts: { updates: scene.sceneUpdates, physicsSteps: scene.physicsSteps, renderFrames: scene.renderFrames },
        elapsedTimelineMs: timestamp - timelineStart, ordering, inputChanges, samples,
        activationBlockReasons: [...new Set(samples.filter(s => !s.active).map(s => s.blockReason))]
      };
    } finally {
      scene.startAcAirBrake = sourceStart; scene.endAcAirBrake = sourceEnd;
      handlers.forEach(([emitter, event, handler]) => emitter.off(event, handler));
      scene.clearDriveInput();
    }
  }, settings);
}

function writeComparison() {
  const legacy = JSON.parse(fs.readFileSync(path.join(output, "airbrake-legacy.json")));
  const tuned = JSON.parse(fs.readFileSync(path.join(output, "airbrake-tuned.json")));
  assert.equal(legacy.pass, true); assert.equal(tuned.pass, true);
  assert.equal(legacy.measurements.length, 81); assert.equal(tuned.measurements.length, 81);
  const comparison = {
    pass: false, comparedCases: 81, unchangedExistingMechCases: 0,
    maximumExistingMechNumericDifference: 0, maximumEnergyDifference: 0,
    methodology: legacy.controlledEnvironment,
    sources: { legacy: legacy.sources, tuned: tuned.sources }, rows: []
  };
  try {
    legacy.measurements.forEach((old, index) => {
      const current = tuned.measurements[index];
      const identity = result => [result.rate, result.mech, result.fixture, result.kind];
      assert.deepEqual(identity(old), identity(current));
      assert.equal(old.clockSeed, 10000); assert.equal(current.clockSeed, 10000);
      assert.equal(old.physicsRemainderSeed, 0); assert.equal(current.physicsRemainderSeed, 0);
      assert.deepEqual(old.inputChanges, current.inputChanges);
      assert.deepEqual(old.counts, current.counts);
      assert.equal(old.samples.length, current.samples.length);
      old.samples.forEach((sample, sampleIndex) => {
        const next = current.samples[sampleIndex];
        comparison.maximumEnergyDifference = Math.max(comparison.maximumEnergyDifference, Math.abs(sample.en - next.en));
        assert.equal(sample.en, next.en, "Air Brake variant must preserve EN timeline");
        assert.equal(sample.invulnerable, next.invulnerable, "Air Brake must not add Evade");
        assert.equal(sample.evadeRemainingMs, next.evadeRemainingMs);
        if (old.mech === "umbraSeraph") return;
        for (const key of ["x", "y", "bodySpeed", "bodyVx", "bodyVy", "stateSpeed", "en"]) {
          const difference = Math.abs(sample[key] - next[key]);
          comparison.maximumExistingMechNumericDifference = Math.max(comparison.maximumExistingMechNumericDifference, difference);
          assert.equal(difference, 0, `${old.mech} ${old.fixture} ${old.kind} ${old.rate}Hz ${key}`);
        }
        for (const key of ["active", "blockReason", "endReason", "boost", "fullOverheat", "mustRelease"]) assert.equal(sample[key], next[key]);
      });
      if (old.mech !== "umbraSeraph") comparison.unchangedExistingMechCases += 1;
      const summarize = result => ({
        releaseSpeed: result.release?.bodySpeed ?? null,
        activationSpeed: result.starts[0]?.speedBefore ?? null,
        strength: result.starts[0]?.strength ?? null,
        checkpoints: Object.fromEntries(Object.entries(result.checkpoints).map(([key, sample]) => [key, sample ? {
          actualMs: sample.actualMs, bodySpeed: sample.bodySpeed, originalDirectionComponent: sample.originalDirectionComponent,
          speedFraction: sample.bodySpeed / result.starts[0].speedBefore, en: sample.en, invulnerable: sample.invulnerable
        } : null])),
        endTimeMs: result.ends[0]?.sinceBrakeMs ?? null,
        endCallBodySpeed: result.ends[0]?.bodySpeed ?? null,
        endCallStateSpeed: result.ends[0]?.stateSpeed ?? null,
        endReason: result.ends[0]?.endReason ?? null,
        startEndDistance: result.brakeDistance,
        forwardDriftDuringBrake: result.maxForwardDriftDuringBrake,
        maximumForwardDriftAfterActivation: result.maxForwardDriftAfterActivation,
        firstReversePhysicalMovementMs: result.firstReversePhysicalMovement?.sinceBrakeMs ?? null,
        nearStop20: result.nearStop20, nearStop1: result.nearStop1,
        activationBlockReasons: result.activationBlockReasons, counts: result.counts
      });
      comparison.rows.push({ rate: old.rate, mech: old.mech, fixture: old.fixture, kind: old.kind, legacy: summarize(old), tuned: summarize(current) });
    });
    comparison.pass = true;
  } catch (error) {
    comparison.error = error.stack; throw error;
  } finally {
    fs.writeFileSync(path.join(output, "airbrake-comparison-summary.json"), JSON.stringify(comparison, null, 2));
  }
  return comparison;
}

(async () => {
  if (process.argv.includes("--compare-only")) {
    report.comparisonOnly = true;
    writeComparison(); report.pass = true;
    return;
  }
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  for (const rate of rates) {
    const { context, page, record } = await openContext(rate);
    for (const fixture of fixtureIds) for (const mech of mechs) {
      for (const kind of ["short", "long", "direct1540"]) {
        const result = await measure(page, { rate, mech, fixture, variant, kind, requestedBoostMs: kind === "short" ? 250 : kind === "long" ? 1200 : 0 });
        report.measurements.push(result);
        assert.equal(result.counts.gameSteps, result.counts.sceneUpdates);
        assert.equal(result.counts.gameSteps, result.counts.renderFrames);
        assert.equal(result.counts.sceneUpdates, result.sceneCounts.updates);
        assert.equal(result.counts.physicsSteps, result.sceneCounts.physicsSteps);
        assert.ok(Math.abs(result.counts.physicsSteps - result.elapsedTimelineMs * 0.06) <= 1.01);
        assert.ok(result.samples.every(s => [s.bodySpeed, s.x, s.y, s.en].every(Number.isFinite)));
        assert.equal(result.collisionCount, 0);
        if (kind === "direct1540") { assert.ok(result.starts.length >= 1); assert.equal(result.direct.components.speed, 1540); }
      }
    }
    record.isolation = await page.evaluate(() => ({ ...window.__brakeAudit, firebaseCache: !!window.__LASTMEMO_FIREBASE_LEADERBOARD__, loopRunning: window.__SURVIVAL_GAME__.loop.running }));
    assert.deepEqual(record.isolation.storageOperations, []);
    assert.equal(record.isolation.storageProbes.length, record.engine.storageProbeCount);
    assert.ok(record.isolation.storageProbes.every(p => p.stack.includes("/vendor/phaser.min.js")));
    assert.deepEqual(record.isolation.normalEntries, []);
    assert.equal(record.isolation.firebaseCache, false);
    assert.equal(record.isolation.loopRunning, false);
    assert.deepEqual(record.externalRequests, []); assert.deepEqual(record.pageErrors, []);
    await context.close();
    console.log(JSON.stringify({ variant, rate, completed: report.measurements.length }));
  }
  report.pass = true;
})().catch(error => { report.pass = false; report.error = error.stack; process.exitCode = 1; }).finally(async () => {
  const suffix = smoke ? "-smoke" : "";
  if (!report.comparisonOnly) fs.writeFileSync(path.join(output, `airbrake-${variant}${suffix}.json`), JSON.stringify(report, null, 2));
  await browser?.close();
  if (report.pass && variant === "tuned" && !smoke && !report.comparisonOnly) writeComparison();
  console.log(JSON.stringify({ variant, pass: report.pass, cases: report.measurements.length, ...(report.comparisonOnly ? { comparedCases: 81 } : {}), error: report.error }));
});
