"use strict";
// Lifecycle and delivery unit tests. Physical integration evidence lives in the browser suite.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { EventEmitter } = require("node:events");
const assert = require("node:assert/strict"), test = require("node:test");
const source = fs.readFileSync(path.join(__dirname, "..", "game.js"), "utf8");
const context = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, console, URLSearchParams,
  Phaser: { Scene: class {} } });
vm.runInContext(source.slice(0, source.indexOf("function isCommsStoryDebugResetRequested()"))
  + source.slice(source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS"), source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends")))
  + "\nthis.proto = SurvivalScene.prototype;", context);

function fixture(mech = "umbraSeraph", enabled = true) {
  const scene = Object.create(context.proto), world = new EventEmitter();
  const body = { world, enable: true, moves: true, width: 44, height: 44, halfWidth: 22, halfHeight: 22,
    position: { x: 0, y: 0 }, prev: { x: 0, y: 0 }, velocity: { x: 600, y: 0 }, newVelocity: { x: 10, y: 0 } };
  Object.assign(scene, { getRunPlayerMechId: () => mech, getUmbraPhase2AVerifiedMechId: () => mech,
    verificationContext: { traceNotifications: enabled }, isFinalBossRaidActive() { return Boolean(this.finalBossRaidState?.active); },
    stageDepth: 1, events: new EventEmitter(), physics: { world }, game: { events: new EventEmitter() },
    playerHitbox: { body }, time: { now: 1000 } });
  const A = [], B = [];
  scene.subscribeUmbraBoostTrace("A", e => A.push(e)); scene.subscribeUmbraBoostTrace("B", e => B.push(e));
  const start = () => { scene.beginUmbraBoostTrace(scene.time.now, "CONTINUOUS"); scene.submitUmbraBoostTraceCommand({}, scene.time.now, true, "BOOST"); };
  const step = (dx = 10, dy = 0) => {
    body.prev = { ...body.position }; body.position.x += dx; body.position.y += dy;
    world.emit("worldstep", 1 / 60);
  };
  return { scene, world, body, A, B, start, step };
}

test("only the running UMBRA context allocates the runtime and listeners", () => {
  for (const [mech, enabled] of [["defaultBear", true], ["regaliaBastion", true], ["umbraSeraph", false]]) {
    const f = fixture(mech, enabled); f.start();
    assert.equal(f.scene.umbraBoostTrace, undefined); assert.equal(f.world.eventNames().length, 0);
    assert.equal(f.scene.getUmbraBoostTraceSnapshot(), null);
  }
});

test("nested start is unique, a successful start without physics has zero segments, and end is idempotent", () => {
  const f = fixture(); f.start(); f.start();
  f.scene.endUmbraBoostTrace("RELEASE"); f.scene.endUmbraBoostTrace("RELEASE");
  const s = f.scene.getUmbraBoostTraceSnapshot();
  assert.equal(s.counts.start, 1); assert.equal(s.counts.end, 1); assert.equal(s.counts.segment, 0);
  f.start(); assert.equal(f.scene.getUmbraBoostTraceSnapshot().boostSequence, 2);
});

test("fixed origin, immutable events and two independent consumers preserve identical ordering", () => {
  const f = fixture(); f.start(); const start = f.A[0];
  f.scene.subscribeUmbraBoostTrace("mutator", e => { e.to.x = 999; });
  f.step(); f.step(); f.scene.endUmbraBoostTrace("RELEASE");
  assert.equal(start.fixedStart.x, 22); assert.equal(f.A[1].to.x, 32);
  assert.equal(f.A[2].from.x, 32); assert.equal(f.A[2].to.x, 42);
  assert.ok(Object.isFrozen(start) && Object.isFrozen(start.fixedStart));
  assert.deepEqual(f.A, f.B); assert.equal(new Set(f.A.map(e => e.order)).size, f.A.length);
  assert.equal(f.A.filter(e => e.firstPhysicalEvaluation).length, 1);
  assert.equal(f.A.filter(e => e.firstValidMovement).length, 1);
  assert.equal(f.scene.getUmbraBoostTraceSnapshot().consumerErrors, 3);
});

test("external velocity, short coordinate reset and non-boost commands cannot form valid segments", () => {
  const f = fixture(); f.start();
  f.body.newVelocity.x = 20; f.step(20);
  assert.equal(f.A.at(-1).reason, "EXTERNAL_VELOCITY"); assert.equal(f.A.at(-1).valid, false);
  f.body.velocity.x = 1200; f.step(20);
  assert.equal(f.A.at(-1).reason, "EXTERNAL_MOTION"); assert.equal(f.A.at(-1).valid, false);
  f.body.position.x += 0.01; f.body.newVelocity.x = 10; f.step();
  assert.equal(f.A.at(-1).reason, "POSITION_DISCONTINUITY");
  assert.equal(f.scene.getUmbraBoostTraceSnapshot().active, false);
  for (const mode of ["NORMAL", "POST_BOOST_GLIDE", "AIR_BRAKE"]) {
    f.scene.submitUmbraBoostTraceCommand({}, 1000, false, mode); f.step();
    assert.equal(f.A.at(-1).valid, false); assert.equal(f.A.at(-1).reason, mode);
  }
});

test("pause, exit and Raid guards reject forced world steps; ordinary Depth 10 and enemy stop do not", () => {
  for (const flag of ["drivePaused", "driveHidden", "levelUpActive", "gateGuidanceOverlayActive", "gateChoiceActive", "extractionComplete", "gameOver", "restartInProgress", "shopActive", "finalBossRaidAssetsLoading"]) {
    const f = fixture(); f.start(); f.scene[flag] = true; const before = f.scene.getUmbraBoostTraceSnapshot().counts.segment;
    f.step(); assert.equal(f.scene.getUmbraBoostTraceSnapshot().counts.segment, before, flag);
    assert.equal(f.scene.getUmbraBoostTraceSnapshot().active, false, flag);
  }
  const f = fixture(); f.scene.stageDepth = 10; f.scene.finalBossRaidState = { active: false };
  f.scene.enemy = { timeStopUntil: 999999 }; f.scene.prepareUmbraBoostTraceFrame(); f.start(); f.step();
  assert.equal(f.A.at(-1).valid, true);
  f.scene.finalBossRaidState.active = true; f.step();
  assert.equal(f.scene.getUmbraBoostTraceSnapshot().active, false);
});

test("body identity and generation changes invalidate reservations; cleanup is safe after world teardown", () => {
  const f = fixture(); f.start(); f.step(); const before = f.scene.getUmbraBoostTraceSnapshot().generations.basis;
  f.scene.playerHitbox.body = { ...f.body }; f.scene.prepareUmbraBoostTraceFrame();
  assert.equal(f.scene.getUmbraBoostTraceSnapshot().active, false);
  assert.ok(f.scene.getUmbraBoostTraceSnapshot().generations.basis > before);
  f.scene.physics.world = null; f.scene.destroyUmbraBoostTrace(); f.scene.destroyUmbraBoostTrace();
  assert.equal(f.world.listenerCount("worldstep"), 0); assert.equal(f.scene.events.eventNames().length, 0);
  assert.equal(f.scene.game.events.eventNames().length, 0);
});

test("a collision flag without contact with known terrain cannot validate unexplained position correction", () => {
  const f = fixture(); f.start(); f.body.touching = { right: true }; f.step(5);
  assert.equal(f.A.at(-1).valid, false); assert.equal(f.A.at(-1).reason, "UNEXPLAINED_CORRECTION");
});

test("post-integration external velocity preserves the completed path but cannot authorize the next catch-up step", () => {
  const f = fixture(); f.start(); f.body.velocity.x = 1200; f.step(10);
  assert.equal(f.A.at(-1).valid, true);
  assert.equal(f.A.at(-1).nextCommandExcludedReason, "EXTERNAL_POST_COLLIDER_VELOCITY");
  f.body.newVelocity.x = 20; f.step(20);
  assert.equal(f.A.at(-1).valid, false); assert.equal(f.A.at(-1).reason, "EXTERNAL_MOTION");
  f.scene.submitUmbraBoostTraceCommand({}, 1000, true, "BOOST"); f.step(20);
  assert.equal(f.A.at(-1).valid, true);
});

test("bounded history and reentrant consumers cannot retain or drain an unlimited event backlog", () => {
  const f = fixture(); f.start(); for (let i = 0; i < 600; i++) f.step();
  assert.equal(f.scene.getUmbraBoostTraceSnapshot().events.length, 256);
  assert.equal(f.A.length, 601); assert.deepEqual(f.A, f.B);
  const g = fixture();
  g.scene.subscribeUmbraBoostTrace("loop", () => g.scene.emitUmbraBoostTrace("step"));
  g.start();
  assert.ok(g.scene.getUmbraBoostTraceSnapshot().events.some(e => e.reason === "DELIVERY_GAP"));
  assert.equal(g.scene.umbraBoostTrace.deliveryQueue.length, 0);
  assert.equal(g.scene.getUmbraBoostTraceSnapshot().active, false);
});

test("adopted Air Brake default is normalized at the core context boundary", () => {
  for (const mech of ["umbraSeraph", "defaultBear", "regaliaBastion"]) for (const variant of [undefined, "tuned", "bad", "legacy"]) {
    const f = fixture(mech); f.scene.verificationContext.airBrakeVariant = variant;
    assert.equal(Boolean(f.scene.getUmbraAirBrakeCalibration()), mech === "umbraSeraph" && variant !== "legacy");
  }
});
