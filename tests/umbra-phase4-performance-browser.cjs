"use strict";

// Phase 4 regression against completed Phase 3 + adopted tuned Air Brake.
// Separate evidence for trace-only, no weapons, and both weapons with no enemies.
// Requires the installed Playwright runtime only. No user's browser/save is used.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase4", "performance");
const baselineRoot = path.join(project, ".tmp_umbra_phase4", "baseline");
const stage = process.argv.includes("--baseline-only") ? "baseline" : "current";
const smoke = process.argv.includes("--smoke");
const rates = smoke ? [60] : [30, 60, 120];
const fixtureIds = smoke ? ["baseline"] : ["baseline", "medium", "deep"];
const referenceHash = "307ea67fe2bed619ba02f1739c956d44b2bca41df14b98a6774d3ce0b5b57de6";
const sourceRoot = stage === "baseline" ? baselineRoot : project;
const sourceNames = ["index.html", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraPreview.js", "umbraPreviewAssets.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js", "umbraMoonlightArena.js"];
const frozen = new Map();
for (const name of sourceNames) {
  // Phase 4 snapshots contain every core source, including equipment. No
  // missing baseline file may silently fall back to current working code.
  if (stage === "baseline") {
    assert.ok(fs.existsSync(path.join(sourceRoot, name)), `Missing required baseline source: ${name}`);
  }
  const file = fs.existsSync(path.join(sourceRoot, name)) ? path.join(sourceRoot, name) : path.join(project, name);
  const body = fs.readFileSync(file);
  frozen.set(name, { body, file, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
if (stage === "baseline") assert.equal(frozen.get("game.js").sha256, referenceHash, "Use the Phase 4 start snapshot / completed Phase 3, never HEAD or an earlier baseline");
const finalManifestPath = path.join(project, ".tmp_umbra_phase4", "final-sources.json");
const finalManifest = stage === "current" && fs.existsSync(finalManifestPath)
  ? JSON.parse(fs.readFileSync(finalManifestPath, "utf8")) : null;
if (finalManifest) {
  assert.equal(finalManifest.baselineGameSha256, referenceHash);
  assert.deepEqual(Object.keys(finalManifest.sources).sort(), [...frozen.keys()].sort());
  for (const [name, value] of frozen) assert.equal(value.sha256, finalManifest.sources[name], `Final source freeze mismatch: ${name}`);
}
fs.mkdirSync(output, { recursive: true });
const report = {
  stage, smoke, base, sourceRoot, sources: Object.fromEntries([...frozen].map(([name, s]) => [name, { file: s.file, sha256: s.sha256 }])),
  finalManifest: finalManifest ? { file: finalManifestPath, frozenAt: finalManifest.frozenAt, verified: true } : null,
  harnessSha256: crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),
  methodology: "Actual Phaser Game.step / Scene / Arcade fixed 60Hz / renderer with controlled 30, 60, 120Hz timestamps and synthetic Phaser Key states. Not wall-clock FPS, physical hardware input or audible sound verification.",
  reference: "Completed Phase 3 game 307ea67 + adopted tuned, frozen from the Phase 4 starting snapshot. Four matching notification/display modes compare every sample. Phase 4 arena none/both with empty placement and contact OFF compare against the same trace-only timeline; no enemy deaths or contact changes enter this comparison.",
  environment: "Every measurement seeds Scene Clock at 10000ms and Arcade accumulator at zero; measuring lane uses RAM bounds +/-20000px and disabled wall collider. No movement tuning, World.step, Body.update or vendor changes. Wall behavior is tested separately.",
  directMethod: "1540px/s physical/body and movement state, opposite input, successful production startAcAirBrake, explicit maximum strength=1 fixture. Samples use first actual Scene update at or after 50/100/150/200ms; actualMs is retained, not interpolated.",
  seMethod: "Counts entry to the existing presentation-only triggerAcQuickBoostSe adapter; engine noAudio and existing sound omission remain. Counts do not certify audible playback.",
  contexts: [], measurements: [], arenaMeasurements: [], defaults: [], comparisons: [], arenaComparisons: []
};
let browser;

async function openContext(mode, rate, query = "&umbraBrake=tuned", arenaMode = null) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { mode, rate, query, arenaMode, requests: [], externalRequests: [], pageErrors: [] };
  report.contexts.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { record.externalRequests.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    const source = frozen.get(name);
    return source ? route.fulfill({ status: 200, body: source.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push(request.url()));
  page.on("pageerror", error => record.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__phase4PerfAudit = { probes: [], storage: [], entries: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () {
      window.__phase4PerfAudit.storage.push(method); throw new Error("Performance test storage data access forbidden");
    };
    for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() {
      window.__phase4PerfAudit.probes.push({ area, stack: new Error().stack }); throw new Error("Storage getter denied");
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__phase4PerfAudit.entries.push(name); return method.apply(this, args);
        };
      }
    }, { once: true });
  });
  const toggles = mode === "baseline" || mode === "defaults" ? "" : `&umbraTraceNotify=${mode.includes("notify-off") ? "0" : "1"}&umbraTrace=${mode.includes("display-off") ? "0" : "1"}`;
  const attackQuery = arenaMode ? "&umbraMoonlight=1&umbraBloodSpike=1" : "";
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1${query}${toggles}${attackQuery}`);
  await page.waitForFunction(() => {
    const game = window.__SURVIVAL_GAME__;
    return game?.scene.isActive("UmbraPhase2ADrive") && game.scene.getScene("UmbraPhase2ADrive").stats && game.scene.getScene("UmbraPhase1Assets").status.finished;
  }, null, { timeout: 30000 });
  record.engine = await page.evaluate(arenaMode => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    if (arenaMode) {
      if (!s.moonlightArena?.setWeaponSelection || !s.getUmbraBloodSpikeStage1Config) throw new Error("Phase 4 arena adapters are unavailable");
      s.moonlightArena.configId = "empty"; s.moonlightArena.contactEnabled = false;
      s.moonlightArena.setWeaponSelection(arenaMode);
    }
    return {
      phaser: Phaser.VERSION, fixedStep: s.physics.world.fixedStep, physicsFps: s.physics.world.fps,
      probes: __phase4PerfAudit.probes.length, initialVariant: s.snapshot().airBrakeVariant,
      moonlightEnabled: s.isUmbraMoonlightVerificationEnabled?.() === true,
      arenaMode: s.moonlightArena?.weaponSelection || null
    };
  }, arenaMode);
  assert.equal(record.engine.fixedStep, true); assert.equal(record.engine.physicsFps, 60);
  assert.equal(record.engine.moonlightEnabled, !!arenaMode, "Only the explicit empty arena comparison enables combat context");
  assert.equal(record.engine.arenaMode, arenaMode);
  return { context, page, record };
}

async function audit(item) {
  item.record.audit = await item.page.evaluate(() => ({ ...window.__phase4PerfAudit, firebase: !!window.__LASTMEMO_FIREBASE_LEADERBOARD__, loopRunning: window.__SURVIVAL_GAME__.loop.running }));
  assert.deepEqual(item.record.audit.storage, []); assert.deepEqual(item.record.audit.entries, []);
  assert.equal(item.record.audit.probes.length, item.record.engine.probes);
  assert.ok(item.record.audit.probes.every(p => p.stack.includes("/vendor/phaser.min.js")));
  assert.equal(item.record.audit.firebase, false); assert.equal(item.record.audit.loopRunning, false);
  assert.deepEqual(item.record.externalRequests, []); assert.deepEqual(item.record.pageErrors, []);
  if (!item.record.arenaMode) assert.ok(item.record.requests.every(url => !/umbraMoonlight[^/]*\.js/.test(url)), "Trace-only drive never loads the combat arena module");
}

async function measure(page, settings) {
  return page.evaluate(({ mode, rate, fixture, kind, arenaMode = null }) => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    if (arenaMode) {
      scene.moonlightArena.configId = "empty"; scene.moonlightArena.weaponSelection = arenaMode;
      scene.moonlightArena.contactEnabled = false;
    }
    scene.time.now = 10000; scene.resetDrive("umbraSeraph", fixture, "tuned");
    if (arenaMode && (scene.moonlightArena.enemies.size !== 0 || scene.moonlightArena.contactEnabled)) throw new Error("Arena reset must remain empty and contact OFF");
    scene.physics.world._elapsed = 0;
    scene.physics.world.setBounds(-20000, -20000, 40000, 40000); scene.wallCollider.active = false;
    const state = scene.ensureAcMovementState(), delta = 1000 / rate, initialTime = scene.time.now;
    const counters = { gameSteps: 0, sceneUpdates: 0, physicsSteps: 0, renderFrames: 0, boostStarts: 0, seEntries: 0 };
    const samples = [], physics = [], boostStarts = [], brakeStarts = [], brakeEnds = [], inputs = [], ordering = [], traceEvents = [];
    const traceOrigin = scene.umbraBoostTrace ? {
      order: scene.umbraBoostTrace.order, physicalStep: scene.umbraBoostTrace.physicalStep,
      sceneUpdates: scene.umbraBoostTrace.sceneUpdates, runGeneration: scene.umbraBoostTrace.runGeneration,
      depthGeneration: scene.umbraBoostTrace.depthGeneration, basisGeneration: scene.umbraBoostTrace.basisGeneration
    } : {};
    const unsubscribeTrace = scene.subscribeUmbraBoostTrace("phase4-performance-order", event => {
      const value = JSON.parse(JSON.stringify(event));
      // Reset count is different when an arena is configured before measurement.
      // Retain every field, but compare generation/order relative to this reset.
      for (const key of Object.keys(traceOrigin)) value[key] -= traceOrigin[key];
      traceEvents.push(value);
    });
    const wrappers = [], listeners = []; let phase = "release-prelude", previousInput = "";
    const read = () => {
      const body = scene.playerHitbox.body, brake = state.airBrake, continuous = state.continuousBoost;
      return {
        time: scene.time.now, timelineMs: scene.time.now - initialTime, phase,
        x: body.center.x, y: body.center.y, vx: body.velocity.x, vy: body.velocity.y, speed: Math.hypot(body.velocity.x, body.velocity.y),
        stateVx: state.velocity.x, stateVy: state.velocity.y, stateSpeed: Math.hypot(state.velocity.x, state.velocity.y), allowedSpeed: state.lastAllowedSpeed,
        en: scene.stats.stamina, maxEn: scene.stats.maxStamina, hp: scene.stats.hp, maxHp: scene.stats.maxHp,
        boost: !!continuous.active, boostEnd: continuous.endReason, boostMode: state.boostMode,
        fullOverheat: scene.isAcFullOverheatActive(state), mustRelease: !!state.mustReleaseDashBeforeBoost,
        airBrake: !!brake.active, brakeReason: brake.lastBlockReason, brakeEnd: brake.endReason, brakeStartedAt: brake.startedAt, brakeUntil: brake.until, brakeCooldownUntil: brake.cooldownUntil,
        brakeRegenUntil: brake.regenBlockedUntil, boostRegenUntil: state.boostRegenBlockedUntil,
        invulnerable: scene.isAcEvadeWindowActive(scene.time.now, state), evadeRemainingMs: scene.getAcEvadeWindowRemainingMs(scene.time.now, state),
        evadeReason: state.evadeWindow.lastReason, mode: state.mode, visualMode: state.visualMode,
        boostStarts: counters.boostStarts, seEntries: counters.seEntries,
        input: { ...state.lastInputVector, dash: !!state.lastDashInput?.isDown }
      };
    };
    const wrap = (name, fn) => { const original = scene[name]; wrappers.push([name, original]); scene[name] = function (...args) { return fn.call(this, original, args); }; };
    wrap("startAcContinuousBoost", function (original, args) {
      const wasActive = !!this.acMovementState.continuousBoost.active, result = original.apply(this, args);
      if (result && !wasActive && this.acMovementState.continuousBoost.active) { counters.boostStarts += 1; boostStarts.push(read()); }
      return result;
    });
    wrap("triggerAcQuickBoostSe", function (original, args) { counters.seEntries += 1; return original.apply(this, args); });
    wrap("startAcAirBrake", function (original, args) {
      const result = original.apply(this, args);
      if (result) brakeStarts.push({ ...read(), startSpeed: state.airBrake.speedBefore, strength: state.airBrake.strength, sampleIndex: samples.length });
      return result;
    });
    wrap("endAcAirBrake", function (original, args) {
      const wasActive = state.airBrake.active, result = original.apply(this, args);
      if (wasActive) brakeEnds.push({ ...read(), reasonArgument: args[2] }); return result;
    });
    const listen = (emitter, event, counter, extra) => {
      const fn = () => { if (counter) counters[counter] += 1; if (counters.gameSteps <= 3) ordering.push(event); extra?.(); };
      emitter.on(event, fn); listeners.push([emitter, event, fn]);
    };
    listen(game.events, "step", "gameSteps"); listen(scene.events, "update", "sceneUpdates"); listen(game.events, "postrender", "renderFrames");
    listen(scene.physics.world, "worldstep", "physicsSteps", () => {
      const body = scene.playerHitbox.body;
      physics.push({ step: counters.physicsSteps, sceneTime: scene.time.now, x: body.center.x, y: body.center.y, vx: body.velocity.x, vy: body.velocity.y });
    });
    const step = (input = {}) => {
      const signature = JSON.stringify(input);
      if (signature !== previousInput) { inputs.push({ beforeGameStep: counters.gameSteps + 1, timelineMs: counters.gameSteps * delta, phase, input }); previousInput = signature; }
      for (const [name, key] of Object.entries(scene.keys)) { key.isDown = input[name] === true; key.isUp = !key.isDown; }
      game.step(initialTime + (counters.gameSteps + 1) * delta, delta); samples.push(read());
    };
    const forMs = (duration, input) => { const frames = Math.ceil(duration / delta - 1e-9); for (let i = 0; i < frames; i += 1) step(input); return frames * delta; };
    let directSeed = null, deliveredBoostMs = 0, heldFullRecharge = null;
    try {
      forMs(100, {});
      const initial = read();
      if (kind === "direct1540") {
        phase = "direct-brake";
        state.velocity.x = 1540; state.velocity.y = 0; scene.playerHitbox.body.setVelocity(1540, 0);
        state.lastMoveDirection.x = 1; state.lastMoveDirection.y = 0; state.postBoostGlideUntil = scene.time.now + 1000;
        for (const [name, key] of Object.entries(scene.keys)) { key.isDown = name === "left"; key.isUp = !key.isDown; }
        state.lastInputVector = scene.getPlayerMoveInputVector();
        const components = scene.getAcAirBrakeComponents(state, state.lastInputVector);
        const result = scene.startAcAirBrake(state, scene.time.now, components), calculatedStrength = state.airBrake.strength;
        state.airBrake.strength = 1; // Explicit maximum-strength measurement fixture.
        directSeed = { result, components, calculatedStrength, strength: 1, x: scene.playerHitbox.body.center.x, y: scene.playerHitbox.body.center.y };
        if (!result) throw new Error("Direct AirBrake did not start");
        forMs(600, { left: true });
      } else if (kind === "overheat-release") {
        phase = "held-to-empty";
        for (let i = 0; i < rate * 8 && !scene.isAcFullOverheatActive(state); i += 1) step({ right: true, dash: true });
        if (!scene.isAcFullOverheatActive(state)) throw new Error("Overheat fixture did not empty EN");
        phase = "held-full-recharge";
        for (let i = 0; i < rate * 25 && scene.stats.stamina < scene.stats.maxStamina - 0.000001; i += 1) step({ dash: true });
        heldFullRecharge = read();
        phase = "release-required"; forMs(150, { dash: true });
        phase = "released"; forMs(100, {});
        phase = "new-success"; forMs(250, { left: true, dash: true });
        phase = "released-glide"; forMs(150, {});
      } else {
        phase = "boost"; deliveredBoostMs = forMs(kind === "short" ? 250 : 1200, { right: true, dash: true });
        phase = "reverse-after-release"; forMs(1000, { left: true });
        phase = "glide"; forMs(500, {});
      }
      const firstBrake = brakeStarts[0], checkpoints = {};
      if (firstBrake) for (const target of [50, 100, 150, 200]) {
        const sample = samples.slice(firstBrake.sampleIndex).find(s => s.time - firstBrake.time >= target - 0.000001);
        checkpoints[target] = sample ? { requestedMs: target, actualMs: sample.time - firstBrake.time, speed: sample.speed, stateSpeed: sample.stateSpeed, x: sample.x, y: sample.y, distanceFromStart: Math.hypot(sample.x - firstBrake.x, sample.y - firstBrake.y) } : null;
      }
      const diagnostics = scene.getDriveTraceDiagnostics?.();
      return {
        mode, rate, fixture, kind, arenaMode, clockSeed: initialTime, physicsAccumulatorSeed: 0, initial, final: read(), deliveredBoostMs, directSeed, heldFullRecharge,
        effectiveVariant: scene.snapshot().airBrakeVariant, fixtureComposition: scene.umbraDriveFixtureSummary.composition,
        collisionCount: scene.collisionCount, counters, inputs, ordering, boostStarts, brakeStarts, brakeEnds, checkpoints, samples, physics, traceEvents,
        arena: arenaMode ? { selection: scene.moonlightArena.weaponSelection, enemies: scene.moonlightArena.enemies.size,
          contactEnabled: scene.moonlightArena.contactEnabled, kills: scene.runStats.kills,
          acquired: Object.keys(scene.playerSkills).sort(), moonlight: scene.getUmbraMoonlightSnapshot?.(),
          bloodSpike: scene.getUmbraBloodSpikeSnapshot?.() } : null,
        observedControls: {
          query: window.location.search,
          notificationGetter: typeof scene.isUmbraBoostTraceEnabled === "function" ? scene.isUmbraBoostTraceEnabled() : null,
          runtimePresent: !!scene.umbraBoostTrace,
          visible: scene.driveTraceVisible ?? null,
          diagnostics: diagnostics ? { visible: diagnostics.visible, notificationsEnabled: diagnostics.notificationsEnabled, subscribed: diagnostics.subscribed,
            sourceCounts: diagnostics.source?.counts || null, A: diagnostics.A ? { count: diagnostics.A.count, hash: diagnostics.A.hash, duplicates: diagnostics.A.duplicates } : null,
            B: diagnostics.B ? { count: diagnostics.B.count, hash: diagnostics.B.hash, duplicates: diagnostics.B.duplicates } : null } : null
        }
      };
    } finally {
      unsubscribeTrace();
      wrappers.forEach(([name, original]) => { scene[name] = original; });
      listeners.forEach(([emitter, event, fn]) => emitter.off(event, fn)); scene.clearDriveInput();
    }
  }, settings);
}

function validate(result) {
  const count = result.counters;
  assert.equal(result.effectiveVariant, "tuned"); assert.equal(result.clockSeed, 10000); assert.equal(result.physicsAccumulatorSeed, 0);
  assert.equal(count.gameSteps, count.sceneUpdates); assert.equal(count.gameSteps, count.renderFrames);
  assert.ok(Math.abs(count.physicsSteps - result.final.timelineMs * 0.06) <= 1.01);
  assert.equal(result.collisionCount, 0);
  assert.ok(result.samples.every(s => [s.x, s.y, s.vx, s.vy, s.en, s.evadeRemainingMs].every(Number.isFinite)));
  assert.equal(count.boostStarts, count.seEntries, "One presentation SE entry per successful continuous boost");
  if (result.arenaMode) {
    assert.equal(result.arena.selection, result.arenaMode); assert.equal(result.arena.enemies, 0);
    assert.equal(result.arena.contactEnabled, false); assert.equal(result.arena.kills, 0);
    assert.deepEqual(result.arena.acquired, result.arenaMode === "both" ? ["umbraBloodSpike", "umbraMoonlight"] : []);
    assert.ok(result.arena.moonlight?.counts && result.arena.bloodSpike?.counts, "Arena must expose both installed production runtimes");
    assert.equal(result.arena.moonlight.counts.attempts, 0);
    assert.equal(result.arena.bloodSpike.counts.attempts, 0);
    assert.equal(result.arena.moonlight.errors, 0); assert.equal(result.arena.bloodSpike.errors, 0);
    assert.equal(result.arena.bloodSpike.counts.casts, 0); assert.deepEqual(result.arena.bloodSpike.casts, []);
    if (result.arenaMode === "both") {
      assert.equal(result.arena.bloodSpike.counts.steps, count.physicsSteps);
      assert.ok(result.arena.bloodSpike.counts.searches > 0, "Empty SPIKE must actually perform independent searches, including notification OFF");
      assert.ok(Math.abs(result.arena.bloodSpike.combatTimeMs - count.physicsSteps * 1000 / 60) < 0.000001, "Combat time advances once per physical step");
      if (!result.mode.includes("notify-off")) {
        assert.equal(result.arena.moonlight.counts.steps, count.physicsSteps);
        assert.equal(result.arena.moonlight.combatTimeMs, result.arena.bloodSpike.combatTimeMs);
      } else assert.equal(result.arena.moonlight.counts.steps, 0);
    }
  }
  if (result.mode !== "baseline") {
    const enabled = !result.mode.includes("notify-off"), visible = !result.mode.includes("display-off"), controls = result.observedControls;
    assert.equal(controls.notificationGetter, enabled); assert.equal(controls.runtimePresent, enabled);
    assert.equal(controls.visible, visible); assert.equal(controls.diagnostics.visible, visible);
    assert.equal(controls.diagnostics.notificationsEnabled, enabled); assert.equal(controls.diagnostics.subscribed, enabled ? 2 : 0);
    assert.deepEqual(controls.diagnostics.A, controls.diagnostics.B);
    if (enabled) {
      assert.equal(controls.diagnostics.A.duplicates, 0);
      assert.equal(controls.diagnostics.sourceCounts.start, count.boostStarts, "Normal starts and trace starts must agree");
    }
  }
  if (result.kind === "direct1540") {
    assert.equal(result.directSeed.components.speed, 1540); assert.equal(result.directSeed.strength, 1);
    assert.equal(count.boostStarts, 0); assert.equal(count.seEntries, 0);
    assert.ok(result.checkpoints[200]);
    assert.ok(Math.abs(result.checkpoints[200].speed - 616) < 0.000001, `Expected 616px/s after tuned maximum-strength brake, got ${result.checkpoints[200].speed}`);
  } else if (result.kind === "overheat-release") {
    assert.equal(result.heldFullRecharge.en, result.heldFullRecharge.maxEn);
    assert.equal(result.heldFullRecharge.boost, false); assert.equal(result.heldFullRecharge.mustRelease, true);
    assert.ok(result.samples.some(s => s.fullOverheat)); assert.equal(count.boostStarts, 2);
  } else {
    assert.equal(count.boostStarts, 1); assert.ok(result.brakeStarts.length > 0); assert.ok(result.brakeEnds.length > 0);
  }
}

const performanceFields = ["initial", "final", "counters", "inputs", "ordering", "deliveredBoostMs", "directSeed", "heldFullRecharge", "effectiveVariant", "collisionCount", "boostStarts", "brakeStarts", "brakeEnds", "checkpoints", "samples", "physics", "fixtureComposition", "traceEvents"];

function compare(reference, current) {
  const key = m => `${m.mode}/${m.rate}/${m.fixture}/${m.kind}`;
  const oldByKey = new Map(reference.measurements.map(m => [key(m), m]));
  for (const currentResult of current.measurements) {
    const old = oldByKey.get(key(currentResult)); assert.ok(old, "Missing matching baseline measurement");
    const row = { mode: currentResult.mode, key: key(currentResult), pass: false, maximumNumericDifference: 0 };
    current.comparisons.push(row);
    try {
      for (const field of performanceFields) {
        assert.deepEqual(currentResult[field], old[field], `${row.mode} ${row.key}: ${field} differs from adopted tuned baseline`);
      }
      for (const field of ["sourceCounts", "A", "B"]) {
        assert.deepEqual(currentResult.observedControls.diagnostics[field], old.observedControls.diagnostics[field], `${row.key}: notification ${field} differs from Phase 3`);
      }
      row.pass = true;
    } catch (error) { row.error = error.message; throw error; }
  }
  const physicalKey = m => `${m.rate}/${m.fixture}/${m.kind}`;
  const visibleByKey = new Map(current.measurements.filter(m => m.mode === "notify-on-display-on").map(m => [physicalKey(m), m]));
  current.diagnosticParity = [];
  for (const result of current.measurements.filter(m => m.mode === "notify-on-display-off")) {
    const visible = visibleByKey.get(physicalKey(result)); assert.ok(visible);
    for (const field of ["sourceCounts", "A", "B"]) {
      assert.deepEqual(result.observedControls.diagnostics[field], visible.observedControls.diagnostics[field], `Diagnostic visibility changed trace ${field}: ${key(result)}`);
    }
    current.diagnosticParity.push({ key: key(result), pass: true });
  }
  current.arenaComparisons = [];
  for (const result of current.arenaMeasurements || []) {
    const old = oldByKey.get(key(result)), traceOnly = current.measurements.find(value => key(value) === key(result));
    assert.ok(old && traceOnly, "Empty arena requires both a Phase 3 baseline and a current trace-only reference");
    const row = { arenaMode: result.arenaMode, key: key(result), pass: false, maximumNumericDifference: 0 };
    current.arenaComparisons.push(row);
    for (const field of performanceFields) {
      assert.deepEqual(result[field], old[field], `${result.arenaMode} ${key(result)}: ${field} differs from Phase 3`);
      assert.deepEqual(result[field], traceOnly[field], `${result.arenaMode} ${key(result)}: ${field} differs from trace-only current`);
    }
    // A/B retain their own absolute-generation hash for the full diagnostic log;
    // reset count differs here, so use full normalized event payloads above for
    // cross-arena order equality, plus each context's internal A/B parity.
    assert.deepEqual(result.observedControls.diagnostics.sourceCounts, traceOnly.observedControls.diagnostics.sourceCounts);
    row.pass = true;
  }
}

async function verifyDefaults() {
  for (const [value, expectedUmbra] of [[null, "tuned"], ["tuned", "tuned"], ["invalid", "tuned"], ["legacy", "legacy"]]) {
    const item = await openContext("defaults", 60, value === null ? "" : `&umbraBrake=${value}`);
    try {
      assert.equal(item.record.engine.initialVariant, expectedUmbra);
      const results = await item.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), rows = [];
        for (const mech of ["defaultBear", "regaliaBastion", "umbraSeraph"]) for (const fixture of ["baseline", "medium", "deep"]) {
          s.resetDrive(mech, fixture);
          rows.push({ mech, fixture, effective: s.snapshot().airBrakeVariant, raw: s.airBrakeVariant, context: s.verificationContext,
            tracePresent: !!s.umbraBoostTrace, subscriptions: s.getDriveTraceDiagnostics().subscribed });
        }
        return rows;
      });
      for (const row of results) {
        assert.equal(row.effective, row.mech === "umbraSeraph" ? expectedUmbra : "legacy");
        assert.equal(row.tracePresent, row.mech === "umbraSeraph");
        assert.equal(row.subscriptions, row.mech === "umbraSeraph" ? 2 : 0);
      }
      report.defaults.push({ requested: value, expectedUmbra, results, pass: true }); await audit(item);
    } finally { await item.context.close(); }
  }
}

(async () => {
  if (process.argv.includes("--compare-only")) {
    assert.equal(stage, "current");
    const suffix = smoke ? "-smoke" : "";
    const saved = JSON.parse(fs.readFileSync(path.join(output, `phase4-performance-current${suffix}.json`), "utf8"));
    Object.assign(report, saved); report.comparisons = []; delete report.error;
    const reference = JSON.parse(fs.readFileSync(path.join(output, `phase4-performance-baseline${suffix}.json`), "utf8"));
    assert.equal(reference.pass, true); assert.equal(reference.sources["game.js"].sha256, referenceHash);
    report.measurements.forEach(validate); (report.arenaMeasurements || []).forEach(validate);
    compare(reference, report); report.pass = true; return;
  }
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  const modes = ["notify-on-display-on", "notify-off-display-on", "notify-on-display-off", "notify-off-display-off"];
  for (const mode of modes) for (const rate of rates) {
    const item = await openContext(mode, rate);
    try {
      for (const fixture of fixtureIds) for (const kind of ["short", "long", "direct1540", ...(fixture === "baseline" && !smoke ? ["overheat-release"] : [])]) {
        const result = await measure(item.page, { mode, rate, fixture, kind }); report.measurements.push(result); validate(result);
      }
      await audit(item);
      if (rate === 60) await item.page.screenshot({ path: path.join(output, `phase4-perf-${stage}-${mode}.png`) });
    } finally { await item.context.close(); }
    console.log(JSON.stringify({ stage, mode, rate, completed: report.measurements.length }));
  }
  if (stage === "current") {
    for (const arenaMode of ["none", "both"]) for (const mode of ["notify-on-display-on", "notify-off-display-off"]) for (const rate of rates) {
      const item = await openContext(mode, rate, "&umbraBrake=tuned", arenaMode);
      try {
        for (const fixture of fixtureIds) for (const kind of ["short", "long", "direct1540", ...(fixture === "baseline" && !smoke ? ["overheat-release"] : [])]) {
          const result = await measure(item.page, { mode, rate, fixture, kind, arenaMode });
          report.arenaMeasurements.push(result); validate(result);
        }
        await audit(item);
        if (rate === 60) await item.page.screenshot({ path: path.join(output, `phase4-perf-arena-${arenaMode}-${mode}.png`) });
      } finally { await item.context.close(); }
      console.log(JSON.stringify({ stage, arenaMode, mode, rate, arenaCompleted: report.arenaMeasurements.length }));
    }
    const suffix = smoke ? "-smoke" : "";
    const reference = JSON.parse(fs.readFileSync(path.join(output, `phase4-performance-baseline${suffix}.json`), "utf8"));
    assert.equal(reference.pass, true); assert.equal(reference.sources["game.js"].sha256, referenceHash);
    compare(reference, report); if (!smoke) await verifyDefaults();
  }
  report.pass = true;
})().catch(error => { report.pass = false; report.error = error.stack; process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  const name = `phase4-performance-${stage}${smoke ? "-smoke" : ""}.json`;
  fs.writeFileSync(path.join(output, name), JSON.stringify(report, null, 2));
  const primary = report.measurements.filter(m => m.mode === "notify-on-display-on");
  const summary = {
    stage, pass: report.pass, methodology: report.methodology, environment: report.environment, seMethod: report.seMethod,
    sources: report.sources, finalManifest: report.finalManifest, harnessSha256: report.harnessSha256,
    measurements: report.measurements.length, comparisons: report.comparisons.length,
    arenaMeasurements: report.arenaMeasurements.length, arenaComparisons: report.arenaComparisons,
    maximumNumericDifference: report.comparisons.length && [...report.comparisons, ...report.arenaComparisons].every(c => c.pass) ? 0 : null,
    diagnosticParity: report.diagnosticParity || [], defaults: report.defaults,
    direct1540: primary.filter(m => m.kind === "direct1540").map(m => ({ rate: m.rate, fixture: m.fixture, checkpoints: m.checkpoints })),
    boosts: primary.filter(m => m.kind === "short" || m.kind === "long").map(m => ({
      rate: m.rate, fixture: m.fixture, kind: m.kind, deliveredBoostMs: m.deliveredBoostMs,
      functionExitStateSpeed: m.boostStarts[0]?.stateSpeed, functionExitBodySpeed: m.boostStarts[0]?.speed,
      firstSceneUpdateSpeed: m.samples.find(s => s.boost)?.speed, preReleaseSpeed: m.samples.filter(s => s.phase === "boost").at(-1)?.speed,
      brakeStartMs: m.brakeStarts[0]?.timelineMs, brakeEndMs: m.brakeEnds[0]?.timelineMs, boostStarts: m.counters.boostStarts, seEntries: m.counters.seEntries
    })),
    overheat: primary.filter(m => m.kind === "overheat-release").map(m => ({ rate: m.rate, fullRecharge: m.heldFullRecharge, counters: m.counters })),
    isolation: report.contexts.map(c => ({ mode: c.mode, rate: c.rate, storage: c.audit?.storage.length,
      vendorGetterProbes: c.audit?.probes.length, normalAuthEntries: c.audit?.entries.length, external: c.externalRequests.length, errors: c.pageErrors.length }))
  };
  fs.writeFileSync(path.join(output, name.replace(/\.json$/, "-summary.json")), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ stage, pass: report.pass, measurements: report.measurements.length, compared: report.comparisons.length,
    arenaMeasurements: report.arenaMeasurements.length, arenaComparisons: report.arenaComparisons.length,
    defaults: report.defaults.length, error: report.error, report: path.join(output, name) }, null, 2));
});
