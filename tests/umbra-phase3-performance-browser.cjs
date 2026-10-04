"use strict";

// Phase 3 regression against the adopted Phase 2B completion. This independent
// copy preserves the older harness/evidence and runs with MOONLIGHT attack OFF.
// Requires the installed Playwright runtime only. No user's browser/save is used.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase3", "performance");
const baselineRoot = path.join(project, ".tmp_umbra_phase3", "baseline");
const stage = process.argv.includes("--baseline-only") ? "baseline" : "current";
const smoke = process.argv.includes("--smoke");
const rates = smoke ? [60] : [30, 60, 120];
const fixtureIds = smoke ? ["baseline"] : ["baseline", "medium", "deep"];
const referenceHash = "15479571d8829ffe5aa9fb8254d946b05ac63b473418b9bb3b55cb65dfc2b968";
const sourceRoot = stage === "baseline" ? baselineRoot : project;
const sourceNames = ["index.html", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraPreview.js", "umbraPreviewAssets.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js"];
const frozen = new Map();
for (const name of sourceNames) {
  // Phase 3 snapshots contain every core source, including equipment. No
  // missing baseline file may silently fall back to current working code.
  if (stage === "baseline") {
    assert.ok(fs.existsSync(path.join(sourceRoot, name)), `Missing required baseline source: ${name}`);
  }
  const file = fs.existsSync(path.join(sourceRoot, name)) ? path.join(sourceRoot, name) : path.join(project, name);
  const body = fs.readFileSync(file);
  frozen.set(name, { body, file, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
if (stage === "baseline") assert.equal(frozen.get("game.js").sha256, referenceHash, "Use the Phase 3 start snapshot / completed adopted Phase 2B, never HEAD or an earlier baseline");
fs.mkdirSync(output, { recursive: true });
const report = {
  stage, smoke, base, sourceRoot, sources: Object.fromEntries([...frozen].map(([name, s]) => [name, { file: s.file, sha256: s.sha256 }])),
  methodology: "Actual Phaser Game.step / Scene / Arcade fixed 60Hz / renderer with controlled 30, 60, 120Hz timestamps and synthetic Phaser Key states. Not wall-clock FPS, physical hardware input or audible sound verification.",
  reference: "Phase 3 start snapshot / adopted Phase 2B completion, with explicit umbraBrake=tuned in every performance URL and reset. MOONLIGHT attack is OFF; differences caused by enemy deaths or contacts are outside this comparison.",
  environment: "Every measurement seeds Scene Clock at 10000ms and Arcade accumulator at zero; measuring lane uses RAM bounds +/-20000px and disabled wall collider. No movement tuning, World.step, Body.update or vendor changes. Wall behavior is tested separately.",
  directMethod: "1540px/s physical/body and movement state, opposite input, successful production startAcAirBrake, explicit maximum strength=1 fixture. Samples use first actual Scene update at or after 50/100/150/200ms; actualMs is retained, not interpolated.",
  seMethod: "Counts entry to the existing presentation-only triggerAcQuickBoostSe adapter; engine noAudio and existing sound omission remain. Counts do not certify audible playback.",
  contexts: [], measurements: [], defaults: [], comparisons: []
};
let browser;

async function openContext(mode, rate, query = "&umbraBrake=tuned") {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { mode, rate, query, requests: [], externalRequests: [], pageErrors: [] };
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
    window.__phase3PerfAudit = { probes: [], storage: [], entries: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () {
      window.__phase3PerfAudit.storage.push(method); throw new Error("Performance test storage data access forbidden");
    };
    for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() {
      window.__phase3PerfAudit.probes.push({ area, stack: new Error().stack }); throw new Error("Storage getter denied");
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__phase3PerfAudit.entries.push(name); return method.apply(this, args);
        };
      }
    }, { once: true });
  });
  const toggles = mode === "baseline" || mode === "defaults" ? "" : `&umbraTraceNotify=${mode.includes("notify-off") ? "0" : "1"}&umbraTrace=${mode.includes("display-off") ? "0" : "1"}`;
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1${query}${toggles}`);
  await page.waitForFunction(() => {
    const game = window.__SURVIVAL_GAME__;
    return game?.scene.isActive("UmbraPhase2ADrive") && game.scene.getScene("UmbraPhase2ADrive").stats && game.scene.getScene("UmbraPhase1Assets").status.finished;
  }, null, { timeout: 30000 });
  record.engine = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    return {
      phaser: Phaser.VERSION, fixedStep: s.physics.world.fixedStep, physicsFps: s.physics.world.fps,
      probes: __phase3PerfAudit.probes.length, initialVariant: s.snapshot().airBrakeVariant,
      moonlightEnabled: s.isUmbraMoonlightVerificationEnabled?.() === true
    };
  });
  assert.equal(record.engine.fixedStep, true); assert.equal(record.engine.physicsFps, 60);
  assert.equal(record.engine.moonlightEnabled, false, "Movement regression must not enable combat");
  return { context, page, record };
}

async function audit(item) {
  item.record.audit = await item.page.evaluate(() => ({ ...window.__phase3PerfAudit, firebase: !!window.__LASTMEMO_FIREBASE_LEADERBOARD__, loopRunning: window.__SURVIVAL_GAME__.loop.running }));
  assert.deepEqual(item.record.audit.storage, []); assert.deepEqual(item.record.audit.entries, []);
  assert.equal(item.record.audit.probes.length, item.record.engine.probes);
  assert.ok(item.record.audit.probes.every(p => p.stack.includes("/vendor/phaser.min.js")));
  assert.equal(item.record.audit.firebase, false); assert.equal(item.record.audit.loopRunning, false);
  assert.deepEqual(item.record.externalRequests, []); assert.deepEqual(item.record.pageErrors, []);
  assert.ok(item.record.requests.every(url => !/umbraMoonlight[^/]*\.js/.test(url)), "Attack-off drive never loads the combat arena module");
}

async function measure(page, settings) {
  return page.evaluate(({ mode, rate, fixture, kind }) => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    scene.time.now = 10000; scene.resetDrive("umbraSeraph", fixture, "tuned");
    scene.physics.world._elapsed = 0;
    scene.physics.world.setBounds(-20000, -20000, 40000, 40000); scene.wallCollider.active = false;
    const state = scene.ensureAcMovementState(), delta = 1000 / rate, initialTime = scene.time.now;
    const counters = { gameSteps: 0, sceneUpdates: 0, physicsSteps: 0, renderFrames: 0, boostStarts: 0, seEntries: 0 };
    const samples = [], physics = [], boostStarts = [], brakeStarts = [], brakeEnds = [], inputs = [], ordering = [];
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
        mode, rate, fixture, kind, clockSeed: initialTime, physicsAccumulatorSeed: 0, initial, final: read(), deliveredBoostMs, directSeed, heldFullRecharge,
        effectiveVariant: scene.snapshot().airBrakeVariant, fixtureComposition: scene.umbraDriveFixtureSummary.composition,
        collisionCount: scene.collisionCount, counters, inputs, ordering, boostStarts, brakeStarts, brakeEnds, checkpoints, samples, physics,
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

function compare(reference, current) {
  const key = m => `${m.rate}/${m.fixture}/${m.kind}`;
  const oldByKey = new Map(reference.measurements.map(m => [key(m), m]));
  for (const currentResult of current.measurements) {
    const old = oldByKey.get(key(currentResult)); assert.ok(old, "Missing matching baseline measurement");
    const row = { mode: currentResult.mode, key: key(currentResult), pass: false, maximumNumericDifference: 0 };
    current.comparisons.push(row);
    try {
      for (const field of ["initial", "final", "counters", "inputs", "ordering", "deliveredBoostMs", "directSeed", "heldFullRecharge", "effectiveVariant", "collisionCount", "boostStarts", "brakeStarts", "brakeEnds", "checkpoints", "samples", "physics", "fixtureComposition"]) {
        assert.deepEqual(currentResult[field], old[field], `${row.mode} ${row.key}: ${field} differs from adopted tuned baseline`);
      }
      row.pass = true;
    } catch (error) { row.error = error.message; throw error; }
  }
  const visibleByKey = new Map(current.measurements.filter(m => m.mode === "notify-on-display-on").map(m => [key(m), m]));
  current.diagnosticParity = [];
  for (const result of current.measurements.filter(m => m.mode === "notify-on-display-off")) {
    const visible = visibleByKey.get(key(result)); assert.ok(visible);
    for (const field of ["sourceCounts", "A", "B"]) {
      assert.deepEqual(result.observedControls.diagnostics[field], visible.observedControls.diagnostics[field], `Diagnostic visibility changed trace ${field}: ${key(result)}`);
    }
    current.diagnosticParity.push({ key: key(result), pass: true });
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
    const saved = JSON.parse(fs.readFileSync(path.join(output, `phase3-performance-current${suffix}.json`), "utf8"));
    Object.assign(report, saved); report.comparisons = []; delete report.error;
    const reference = JSON.parse(fs.readFileSync(path.join(output, `phase3-performance-baseline${suffix}.json`), "utf8"));
    assert.equal(reference.pass, true); assert.equal(reference.sources["game.js"].sha256, referenceHash);
    report.measurements.forEach(validate); compare(reference, report); report.pass = true; return;
  }
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  const modes = stage === "baseline" ? ["baseline"] : ["notify-on-display-on", "notify-off-display-on", "notify-on-display-off", "notify-off-display-off"];
  for (const mode of modes) for (const rate of rates) {
    const item = await openContext(mode, rate);
    try {
      for (const fixture of fixtureIds) for (const kind of ["short", "long", "direct1540", ...(fixture === "baseline" && !smoke ? ["overheat-release"] : [])]) {
        const result = await measure(item.page, { mode, rate, fixture, kind }); report.measurements.push(result); validate(result);
      }
      await audit(item);
      if (rate === 60) await item.page.screenshot({ path: path.join(output, `phase3-perf-${stage}-${mode}.png`) });
    } finally { await item.context.close(); }
    console.log(JSON.stringify({ stage, mode, rate, completed: report.measurements.length }));
  }
  if (stage === "current") {
    const suffix = smoke ? "-smoke" : "";
    const reference = JSON.parse(fs.readFileSync(path.join(output, `phase3-performance-baseline${suffix}.json`), "utf8"));
    assert.equal(reference.pass, true); assert.equal(reference.sources["game.js"].sha256, referenceHash);
    compare(reference, report); if (!smoke) await verifyDefaults();
  }
  report.pass = true;
})().catch(error => { report.pass = false; report.error = error.stack; process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  const name = `phase3-performance-${stage}${smoke ? "-smoke" : ""}.json`;
  fs.writeFileSync(path.join(output, name), JSON.stringify(report, null, 2));
  const primary = report.measurements.filter(m => m.mode === (stage === "baseline" ? "baseline" : "notify-on-display-on"));
  const summary = {
    stage, pass: report.pass, methodology: report.methodology, environment: report.environment, seMethod: report.seMethod,
    sources: report.sources, measurements: report.measurements.length, comparisons: report.comparisons.length,
    maximumNumericDifference: report.comparisons.length && report.comparisons.every(c => c.pass) ? 0 : null,
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
  console.log(JSON.stringify({ stage, pass: report.pass, measurements: report.measurements.length, compared: report.comparisons.length, defaults: report.defaults.length, error: report.error, report: path.join(output, name) }, null, 2));
});
