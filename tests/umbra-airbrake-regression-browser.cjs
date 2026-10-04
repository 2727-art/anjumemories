"use strict";

// Uses the already installed Playwright runtime, a fresh context and localhost.
// Controlled cases call real Phaser Game.step (Scene + Arcade + renderer), with
// synthetic timestamps/Key states. The last case uses Playwright keyboard events.
// Neither kind certifies physical keyboard hardware or monitor refresh rate.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, "..", ".tmp_umbra_airbrake", "regression-output");
const filter = (process.env.UMBRA_BRAKE_REGRESSION_FILTER || "").split(",").filter(Boolean);
fs.mkdirSync(output, { recursive: true });
const report = { scope: "Isolated AirBrake regression; real Phaser engine with synthetic 64Hz timeline, plus one real browser keyboard case", timelineNote: "15.625ms is binary-exact and avoids placing old/new comparisons on the old algorithm's floating-point 200ms duration boundary. Arcade World remains at its existing fixed 60Hz. Separate controlled measurement covers 30/60/120Hz.", base, cases: [], checks: [] };
let browser;

async function createCase(name, variant = "legacy", controlled = true) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { name, variant, controlled, requests: [], external: [], errors: [] };
  report.cases.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { record.external.push(url); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push({ url: request.url(), method: request.method() }));
  page.on("pageerror", error => record.errors.push(error.message));
  await page.addInitScript(() => {
    const original = Object.fromEntries(["getItem", "setItem", "removeItem", "clear", "key"].map(k => [k, Storage.prototype[k]]));
    const length = Object.getOwnPropertyDescriptor(Storage.prototype, "length").get;
    const local = window.localStorage, session = window.sessionStorage;
    original.setItem.call(local, "lastmemoVansabaCoins", "314159");
    original.setItem.call(local, "lastmemoVansabaShopState", JSON.stringify({ version: 1, sentinel: "synthetic-airbrake-only" }));
    original.setItem.call(session, "lastmemoVansabaExtractionMessage", "synthetic-airbrake-session");
    const one = storage => {
      const result = {};
      for (let i = 0; i < length.call(storage); i += 1) { const k = original.key.call(storage, i); result[k] = original.getItem.call(storage, k); }
      return result;
    };
    const snapshot = () => ({ local: one(local), session: one(session) });
    window.__brakeAudit = { storage: [], entries: [], snapshot, before: snapshot() };
    for (const method of Object.keys(original)) Storage.prototype[method] = function (...args) {
      window.__brakeAudit.storage.push({ method, key: args[0] });
      return original[method].apply(this, args);
    };
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const originalMethod = SurvivalScene.prototype[name];
        if (typeof originalMethod === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__brakeAudit.entries.push(name); return originalMethod.apply(this, args);
        };
      }
    }, { once: true });
  });
  await page.goto(base + "/?umbraPreview=1&umbraDrive=1&umbraBrake=" + variant, { waitUntil: "load" });
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.isActive("UmbraPhase2ADrive") && window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive").stats && window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase1Assets").status.finished, null, { timeout: 30000 });
  record.initial = await page.evaluate(controlled => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive");
    if (controlled) game.loop.stop();
    return { snapshot: s.snapshot(), rawVariant: s.airBrakeVariant, context: s.verificationContext, frozen: Object.isFrozen(s.verificationContext), engine: Phaser.VERSION, fixedStep: s.physics.world.fixedStep, worldFps: s.physics.world.fps };
  }, controlled);
  assert.equal(record.initial.snapshot.airBrakeVariant, variant);
  assert.equal(record.initial.frozen, true);
  assert.equal(record.initial.worldFps, 60);
  assert.equal(record.initial.fixedStep, true);
  await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive");
    const take = () => {
      const state = s.ensureAcMovementState(), now = s.time.now, brake = state.airBrake;
      return { ...s.snapshot(), brakeRemaining: Math.max(0, brake.until - now), brakeCooldown: Math.max(0, brake.cooldownUntil - now), brakeRegen: Math.max(0, brake.regenBlockedUntil - now), boostRegen: Math.max(0, state.boostRegenBlockedUntil - now), reason: brake.lastBlockReason, brakeSpeedBefore: brake.speedBefore, brakeSpeedCurrent: brake.speedCurrent, brakeStrength: brake.strength, collisionCount: s.collisionCount, rawVariant: s.airBrakeVariant, paused: s.drivePaused };
    };
    const input = values => {
      for (const [name, key] of Object.entries(s.keys)) { key.isDown = values[name] === true; key.isUp = !key.isDown; }
      s.mobileMoveVector = values.stick || { x: 0, y: 0 };
    };
    window.__brakeTools = {
      take,
      step(frames, values = {}) {
        const snapshots = [];
        for (let i = 0; i < frames; i += 1) { input(values); game.step(s.time.now + 15.625, 15.625); snapshots.push(take()); }
        return snapshots;
      },
      reset(mech = "umbraSeraph", fixture = "baseline", variant = "legacy", position = null) {
        s.resetDrive(mech, fixture, variant);
        // Align only the browser test clock's fixed-step accumulator for pairs.
        // This does not alter production movement tuning or physics fps.
        s.physics.world._elapsed = 0;
        if (position) s.playerHitbox.body.reset(position.x, position.y);
        this.step(1); // Observe released DASH once after the new-run release guard.
        return take();
      }
    };
  });
  return { context, page, record };
}

async function audit({ page, record }) {
  record.audit = await page.evaluate(() => ({ before: __brakeAudit.before, after: __brakeAudit.snapshot(), storage: __brakeAudit.storage, entries: __brakeAudit.entries, firebase: !!window.__LASTMEMO_FIREBASE_LEADERBOARD__ }));
  assert.deepEqual(record.audit.after, record.audit.before, "Synthetic persisted data changed");
  assert.equal(record.audit.storage.length, 0, "Drive accessed storage data");
  assert.equal(record.audit.entries.length, 0, "Normal/auth/ranking entry ran");
  assert.equal(record.audit.firebase, false);
  assert.equal(record.external.length, 0, "Drive attempted external communication");
  assert.equal(record.errors.length, 0, "Uncaught browser exception");
}

async function runCase(name, callback, variant = "legacy", controlled = true) {
  if (filter.length && !filter.includes(name)) return;
  let item;
  try {
    item = await createCase(name, variant, controlled);
    await callback(item);
    await audit(item);
    item.record.passed = true;
    report.checks.push(name);
  } catch (error) {
    if (!item) { report.cases.push({ name, passed: false, failure: error.stack }); return; }
    item.record.passed = false; item.record.failure = error.stack;
    console.error(name, error.message);
    try { item.record.final = await item.page.evaluate(() => __brakeTools.take()); await item.page.screenshot({ path: path.join(output, name + "-failure.png") }); } catch (_) {}
  } finally { if (item) await item.context.close(); }
}

async function timeline(page, { mech = "umbraSeraph", fixture = "baseline", variant = "legacy", position = null, phases }) {
  return page.evaluate(({ mech, fixture, variant, position, phases }) => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), t = __brakeTools;
    const initial = t.reset(mech, fixture, variant, position), samples = [];
    for (const [index, phase] of phases.entries()) for (const sample of t.step(phase.frames, phase.input)) samples.push({ phase: index, ...sample });
    return { initial, final: t.take(), samples, transitions: s.transitions };
  }, { mech, fixture, variant, position, phases });
}

function compareTrajectories(a, b, label) {
  assert.equal(a.samples.length, b.samples.length);
  const numeric = ["x", "y", "vx", "vy", "speed", "stateSpeed", "allowedSpeed", "en", "maxEn", "hp", "maxHp", "evadeRemainingMs", "brakeRemaining", "brakeCooldown", "brakeRegen", "boostRegen"];
  const exact = ["phase", "boostActive", "airBrake", "fullOverheat", "mustRelease", "invulnerable", "mode", "boostMode", "reason", "collisionCount"];
  let maxDifference = 0;
  a.samples.forEach((x, i) => {
    const y = b.samples[i];
    for (const key of numeric) {
      const d = Math.abs(x[key] - y[key]); maxDifference = Math.max(maxDifference, d);
      assert.ok(d < 0.000001, `${label} sample ${i} ${key}: ${x[key]} vs ${y[key]}`);
    }
    for (const key of exact) assert.equal(x[key], y[key], `${label} sample ${i} ${key}`);
  });
  return maxDifference;
}

const straight = [
  { frames: 20, input: { right: true } }, { frames: 40, input: { right: true, dash: true } },
  { frames: 25, input: { right: true } }, { frames: 40, input: {} },
  { frames: 30, input: { up: true } }
];
const reverse = [
  { frames: 27, input: { right: true, dash: true } },
  { frames: 6, input: { left: true, dash: true } },
  { frames: 24, input: { left: true } }, { frames: 20, input: {} }
];

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });

  await runCase("non-brake-parity", async ({ page, record }) => {
    record.legacy = await timeline(page, { variant: "legacy", phases: straight });
    record.tuned = await timeline(page, { variant: "tuned", phases: straight });
    assert.equal(record.tuned.final.airBrakeVariant, "tuned");
    assert.ok(record.legacy.samples.some(s => s.boostActive));
    assert.ok(record.legacy.samples.every(s => !s.airBrake));
    record.maxDifference = compareTrajectories(record.legacy, record.tuned, "UMBRA non-brake");
    const source = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");
      return { tuning: s.getActiveAcMovementTuning(), skills: ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"].map(id => window.skillDefinitions[id]), movement: SurvivalScene.prototype.updateAcPlayerMovement.toString() };
    });
    for (const skill of source.skills) { assert.equal(skill.behavior, "displayOnly"); assert.equal(skill.previewOnly, true); assert.equal(skill.stages.length, 8); }
    record.protectedTuning = source.tuning;
    record.movementSha256 = crypto.createHash("sha256").update(source.movement).digest("hex");
    record.phase2B = "Three UMBRA entries remain previewOnly/displayOnly with empty stages; no attacks are installed in this driver.";
  });

  await runCase("existing-mechs-legacy", async ({ page, record }) => {
    record.comparisons = [];
    for (const mech of ["defaultBear", "regaliaBastion"]) {
      const legacy = await timeline(page, { mech, variant: "legacy", phases: reverse });
      const requestedTuned = await timeline(page, { mech, variant: "tuned", phases: reverse });
      assert.equal(requestedTuned.final.rawVariant, "tuned");
      assert.equal(requestedTuned.final.airBrakeVariant, "legacy");
      assert.ok(legacy.samples.some(s => s.airBrake), mech + " never exercised legacy brake");
      const comparison = { mech, legacy, requestedTuned }; record.comparisons.push(comparison);
      comparison.maxDifference = compareTrajectories(legacy, requestedTuned, mech);
    }
    record.contextGuard = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), t = __brakeTools;
      t.reset("umbraSeraph", "baseline", "tuned");
      const verified = s.getUmbraAirBrakeCalibration() !== null, context = s.verificationContext;
      s.verificationContext = null;
      const noContext = s.getUmbraAirBrakeCalibration(); s.verificationContext = context;
      s.isUmbraPhase2ADrive = false;
      const noFlag = s.getUmbraAirBrakeCalibration(); s.isUmbraPhase2ADrive = true;
      return { verified, noContext, noFlag };
    });
    assert.deepEqual(record.contextGuard, { verified: true, noContext: null, noFlag: null });
  });

  await runCase("turn-and-stick-boundaries", async ({ page, record }) => {
    record.variants = [];
    for (const variant of ["legacy", "tuned"]) {
      const turn90 = await timeline(page, { variant, phases: [{ frames: 27, input: { right: true, dash: true } }, { frames: 24, input: { up: true } }] });
      const turn180 = await timeline(page, { variant, phases: reverse });
      const weak = await timeline(page, { variant, phases: [{ frames: 27, input: { right: true, dash: true } }, { frames: 24, input: { stick: { x: -0.4, y: 0 } } }] });
      assert.ok(turn90.samples.every(s => !s.airBrake), "90 degree input triggered reverse brake");
      assert.ok(turn90.final.vy < 0);
      assert.ok(turn180.samples.filter(s => s.phase === 1).every(s => s.boostActive && !s.airBrake), "Held boost boundary changed");
      assert.ok(turn180.samples.some(s => s.airBrake), "180 degree released boost did not brake");
      assert.ok(turn180.samples.filter(s => s.airBrake).every(s => !s.invulnerable && !s.boostActive));
      assert.ok(weak.samples.every(s => !s.airBrake), "Weak stick triggered AirBrake");
      assert.ok(weak.samples.some(s => s.phase === 1 && s.reason === "LOW_INPUT"), "Weak input rejection was not exercised");
      record.variants.push({ variant, turn90, turn180, weak });
    }
    await page.screenshot({ path: path.join(output, "airbrake-weak-stick.png") });
  });

  await runCase("wall-corner-and-repeat-boost", async ({ page, record }) => {
    record.variants = [];
    for (const variant of ["legacy", "tuned"]) {
      const wall = await timeline(page, { variant, fixture: "medium", position: { x: 1840, y: 1250 }, phases: [
        { frames: 28, input: { down: true, left: true, dash: true } }, { frames: 24, input: { up: true, right: true } },
        { frames: 36, input: { left: true, down: true, dash: true } }, { frames: 24, input: { right: true, up: true } }
      ] });
      assert.ok(wall.final.collisionCount > 0, "Corner test did not hit real Arcade collider");
      const rectangles = [[1665, 775, 1735, 1425], [1670, 1355, 2190, 1425]];
      for (const s of wall.samples) {
        assert.ok([s.x, s.y, s.vx, s.vy, s.en].every(Number.isFinite));
        for (const [left, top, right, bottom] of rectangles) {
          const dx = s.x - Math.max(left, Math.min(right, s.x)), dy = s.y - Math.max(top, Math.min(bottom, s.y));
          assert.ok(Math.hypot(dx, dy) >= 21.8, "Body penetrated the test wall/corner");
        }
        assert.ok(!s.airBrake || !s.invulnerable);
      }
      const phases = [];
      for (let i = 0; i < 3; i += 1) phases.push({ frames: 20, input: { right: true, dash: true } }, { frames: 32, input: { right: true } });
      const repeat = await timeline(page, { variant, fixture: "medium", phases });
      const starts = repeat.samples.filter((s, i, a) => s.boostActive && (i === 0 || !a[i - 1].boostActive)).length;
      assert.equal(starts, 3);
      assert.ok(repeat.samples.every(s => !s.airBrake));
      assert.ok(repeat.final.en < repeat.initial.en);
      assert.equal(repeat.final.invulnerable, false);
      record.variants.push({ variant, wall, repeat, starts });
    }
    record.repeatParity = compareTrajectories(record.variants[0].repeat, record.variants[1].repeat, "Repeated boost");
  });

  await runCase("pause-resume-brake", async ({ page, record }) => {
    record.variants = [];
    for (const variant of ["legacy", "tuned"]) {
      const result = await page.evaluate(variant => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), t = __brakeTools;
        t.reset("umbraSeraph", "baseline", variant); t.step(27, { right: true, dash: true });
        const reverseSamples = [];
        for (let i = 0; i < 16 && !s.acMovementState.airBrake.active; i += 1) reverseSamples.push(...t.step(1, { left: true }));
        const before = t.take(); s.toggleDrivePause(); const interrupted = t.take();
        t.step(60); const paused = t.take(); s.toggleDrivePause(); t.step(1); const resumed = t.take();
        t.step(8, { right: true }); const moving = t.take();
        return { before, interrupted, paused, resumed, moving, reverseSamples };
      }, variant);
      assert.equal(result.before.airBrake, true);
      assert.equal(result.interrupted.airBrake, false);
      assert.equal(result.paused.paused, true);
      assert.equal(result.paused.en, result.before.en);
      assert.equal(result.paused.speed, 0);
      assert.equal(result.resumed.en, result.before.en);
      assert.ok(Math.abs(result.resumed.brakeCooldown - result.before.brakeCooldown) < 0.001, "Pause consumed brake cooldown");
      assert.ok(Math.abs(result.resumed.brakeRegen - result.before.brakeRegen) < 0.001, "Pause consumed regen block");
      assert.equal(result.resumed.invulnerable, false);
      assert.equal(result.resumed.airBrake, false);
      assert.ok(result.moving.vx > 0);
      record.variants.push({ variant, ...result });
    }
  }, "tuned");

  await runCase("fixture-mech-variant-reset", async ({ page, record }) => {
    record.resets = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), t = __brakeTools, result = [];
      for (const [mech, fixture, variant] of [["umbraSeraph", "medium", "tuned"], ["umbraSeraph", "medium", "legacy"], ["regaliaBastion", "deep", "tuned"], ["defaultBear", "baseline", "legacy"], ["umbraSeraph", "baseline", "tuned"]]) {
        t.step(20, { right: true, dash: true });
        s.openCandidateCards(false); t.step(1);
        const oldState = s.levelUpCandidatePresentationState;
        s.resetDrive(mech, fixture, variant);
        const fresh = t.take();
        result.push({ requested: { mech, fixture, variant }, fresh, context: s.verificationContext, candidateStateReplaced: oldState !== s.levelUpCandidatePresentationState, candidateObjects: s.selectionObjects.length, candidates: s.candidateChoices.length, keysDown: Object.values(s.keys).some(k => k.isDown), stick: s.mobileMoveVector, pausedMotion: s.umbraDriveMotionPaused, timestamps: { start: s.acMovementState.airBrake.startedAt, until: s.acMovementState.airBrake.until, cooldown: s.acMovementState.airBrake.cooldownUntil }, activeSkills: s.getAvailableSkillChoices().map(c => c.id) });
        t.step(1);
      }
      return result;
    });
    for (const result of record.resets) {
      const { requested, fresh } = result;
      assert.equal(fresh.mech, requested.mech); assert.equal(fresh.fixture, requested.fixture);
      assert.equal(fresh.airBrakeVariant, requested.mech === "umbraSeraph" ? requested.variant : "legacy");
      assert.equal(fresh.x, 350); assert.equal(fresh.y, 500);
      assert.equal(fresh.speed, 0); assert.equal(fresh.stateSpeed, 0);
      assert.equal(fresh.en, fresh.maxEn); assert.equal(fresh.hp, fresh.maxHp);
      for (const key of ["airBrake", "boostActive", "invulnerable", "fullOverheat", "paused"]) assert.equal(fresh[key], false, key);
      assert.equal(fresh.mustRelease, true);
      assert.equal(result.candidateStateReplaced, true); assert.equal(result.candidateObjects, 0); assert.equal(result.candidates, 0);
      assert.equal(result.keysDown, false); assert.deepEqual(result.stick, { x: 0, y: 0 });
      assert.equal(result.pausedMotion, false); assert.deepEqual(result.timestamps, { start: 0, until: 0, cooldown: 0 });
      assert.deepEqual(result.activeSkills, []);
    }
    await page.screenshot({ path: path.join(output, "airbrake-tuned-fresh-reset.png") });
  }, "tuned");

  await runCase("browser-keyboard-reverse", async ({ page, record }) => {
    // Real DOM keyboard events and automatic Phaser browser loop, no Key writes.
    await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift"); await page.waitForTimeout(460);
    record.boost = await page.evaluate(() => __brakeTools.take());
    assert.equal(record.boost.boostActive, true);
    await page.keyboard.up("ArrowRight"); await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(90);
    record.heldReverse = await page.evaluate(() => __brakeTools.take());
    assert.equal(record.heldReverse.airBrake, false);
    await page.keyboard.up("Shift"); await page.waitForTimeout(150);
    record.afterRelease = await page.evaluate(() => __brakeTools.take());
    await page.screenshot({ path: path.join(output, "airbrake-keyboard-tuned.png") });
    await page.waitForTimeout(250); await page.keyboard.up("ArrowLeft");
    record.transitions = await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive").transitions);
    assert.ok(record.transitions.some(s => s.airBrake), "Real browser keyboard did not trigger reverse brake");
    assert.ok(record.transitions.filter(s => s.airBrake).every(s => !s.invulnerable && !s.boostActive));
  }, "tuned", false);

  report.passed = report.cases.every(c => c.passed);
})().catch(error => { report.fatal = error.stack; report.passed = false; }).finally(async () => {
  if (browser) await browser.close();
  fs.writeFileSync(path.join(output, "umbra-airbrake-regression.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, checks: report.checks, failures: report.cases.filter(c => !c.passed).map(c => ({ name: c.name, failure: c.failure })), fatal: report.fatal, output }, null, 2));
  if (!report.passed) process.exitCode = 1;
});
