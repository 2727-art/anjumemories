"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const assert = require("node:assert/strict"), test = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
const context = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, console, URLSearchParams,
  Phaser: { Scene: class {}, Math: { Clamp: (v, lo, hi) => Math.min(hi, Math.max(lo, v)), Linear: (a, b, t) => a + (b - a) * t } } });
const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
const definitionsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
vm.runInContext(source.slice(0, declarationsEnd) + source.slice(definitionsStart, classEnd)
  + "\nthis.proto = SurvivalScene.prototype; this.tuning = AC_MOVEMENT_PRESETS.acV3;", context);
const proto = context.proto, tuning = context.tuning;
function harness(mech = "umbraSeraph", variant = "tuned", speed = 1540, strength = 1) {
  const scene = Object.create(proto);
  Object.assign(scene, { getRunPlayerMechId: () => mech, getUmbraPhase2AVerifiedMechId: () => mech,
    verificationContext: Object.freeze({ kind: "umbra-phase2a", mechId: mech, airBrakeVariant: variant }),
    getActiveAcMovementTuning: () => tuning, getAcMovementBaseSpeed: () => 403,
    triggerAcAirBrakeFx: () => {}, logAcQuickBoostEvent: () => {},
    playerHitbox: { body: { velocity: { x: speed, y: 0 } } } });
  const state = { velocity: { x: speed, y: 0 }, lastMoveDirection: { x: 1, y: 0 }, airBrake: scene.createAcAirBrakeState() };
  scene.ensureAcMovementState = () => state;
  scene.startAcAirBrake(state, 1000, { speed, opposingDot: -1, inputMagnitude: 1, inputDirX: -1, inputDirY: 0 });
  state.airBrake.strength = strength;
  const apply = (at, delta = 16.667) => {
    const result = scene.applyAcAirBrakeVelocity(state, at, delta);
    Object.assign(scene.playerHitbox.body.velocity, state.velocity);
    return result;
  };
  return { scene, state, apply };
}
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test("UMBRА trial is selected by running context, never HUB selection; preset remains immutable in use", () => {
  const before = JSON.stringify(tuning);
  for (const mech of ["defaultBear", "regaliaBastion"]) {
    const { scene } = harness(mech);
    scene.selectedPlayerMechId = "umbraSeraph";
    assert.equal(scene.getUmbraAirBrakeCalibration(), null);
  }
  assert.equal(harness("umbraSeraph", "legacy").scene.getUmbraAirBrakeCalibration(), null);
  const { scene } = harness();
  scene.selectedPlayerMechId = "defaultBear";
  assert.equal(scene.getUmbraAirBrakeCalibration().retainedSpeedRatio, 0.4);
  assert.ok(Object.isFrozen(scene.getUmbraAirBrakeCalibration()));
  assert.equal(JSON.stringify(tuning), before);
});

test("maximum brake retains 40% across 30/60/120 Hz with smooth positive intermediate speeds", () => {
  for (const hz of [30, 60, 120]) {
    const { state, apply } = harness();
    close(state.airBrake.targetSpeed, 1540);
    let prior = state.velocity.x;
    for (let i = 1; i <= hz / 5; i++) {
      const elapsed = i * 1000 / hz;
      apply(1000 + elapsed, 1000 / hz);
      close(state.velocity.x, 1540 * Math.pow(0.4, elapsed / 200));
      assert.ok(state.velocity.x > 0 && state.velocity.x < prior);
      assert.equal(state.velocity.y, 0);
      prior = state.velocity.x;
    }
    close(state.velocity.x, 616);
    assert.equal(state.airBrake.endReason, "DURATION");
  }
});

test("irregular samples, zero timestamp and repeated timestamps do not multiply elapsed braking", () => {
  const { state, apply } = harness();
  state.airBrake.startedAt = state.airBrake.umbraLastAppliedAt = 0;
  state.airBrake.until = 200;
  for (const at of [0, 17, 17, 42, 105, 199, 240]) apply(at, 1000);
  close(state.velocity.x, 616);
  assert.equal(state.airBrake.endReason, "DURATION");
  assert.equal(state.airBrake.umbraLastAppliedAt, 200);
});

test("reduced physical velocity and collision tangent are retained without restoring the start command", () => {
  const { scene, state, apply } = harness();
  apply(1050, 50);
  scene.playerHitbox.body.velocity = { x: 0, y: 100 };
  apply(1100, 50);
  assert.equal(state.velocity.x, 0);
  close(state.velocity.y, 100 * Math.pow(0.4, 0.25));
  scene.playerHitbox.body.velocity = { x: 0, y: 0 };
  assert.equal(apply(1150, 50), true);
  assert.equal(state.velocity.x, 0);
  assert.equal(state.velocity.y, 0);
  assert.equal(state.airBrake.endReason, "LOW_SPEED");
  assert.equal(state.airBrake.cooldownUntil, 1800);
  assert.equal(state.airBrake.regenBlockedUntil, 1500);
});

test("braking cannot inherit a physical acceleration or reverse its own direction", () => {
  const { scene, state, apply } = harness();
  scene.playerHitbox.body.velocity = { x: -3000, y: 0 };
  apply(1050, 50);
  close(state.velocity.x, 1540 * Math.pow(0.4, 0.25));
  assert.equal(state.velocity.y, 0);
});

test("collision on the activation update cannot revive the stale velocity command", () => {
  const { scene, state } = harness();
  scene.playerHitbox.body.velocity = { x: 0, y: 0 };
  scene.startAcAirBrake(state, 2000, { speed: 1540, opposingDot: -1, inputMagnitude: 1, inputDirX: -1, inputDirY: 0 });
  assert.equal(state.velocity.x, 0);
  assert.equal(state.velocity.y, 0);
  assert.equal(state.airBrake.speedBefore, 0);
  assert.equal(state.airBrake.cooldownUntil, 2800);
  assert.equal(state.airBrake.regenBlockedUntil, 2500);
});

test("strength remains graded; duration, cooldown and regen suppression are identical", () => {
  for (const strength of [0.35, 0.65, 1]) {
    const { state, apply } = harness("umbraSeraph", "tuned", 1540, strength);
    assert.equal(state.airBrake.until, 1200);
    assert.equal(state.airBrake.cooldownUntil, 1800);
    assert.equal(state.airBrake.regenBlockedUntil, 1500);
    assert.equal(apply(1200, 200), true);
    close(state.velocity.x, 1540 * Math.pow(0.4, strength));
    assert.equal(state.airBrake.active, false);
    assert.equal(state.airBrake.cooldownUntil, 1800);
    assert.equal(state.boostRegenBlockedUntil, 1500);
  }
});

test("legacy computation and terminal return are shared by both released mechs and legacy UMBRA", () => {
  for (const hz of [30, 60, 120]) {
    const results = ["defaultBear", "regaliaBastion", "umbraSeraph"].map(mech => {
      const { state, apply } = harness(mech, "legacy");
      let terminal;
      for (let i = 1; i <= hz / 5; i++) terminal = apply(1000 + i * 1000 / hz, 1000 / hz);
      assert.equal(terminal, false);
      return state.velocity.x;
    });
    assert.deepEqual(results, [results[0], results[0], results[0]]);
    assert.ok(results[0] > 1500);
  }
});
