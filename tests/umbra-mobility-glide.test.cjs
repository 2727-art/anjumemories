"use strict";
// Real trace/consumer/receiver methods with controlled body coordinates and clocks.
// This proves lifecycle and geometric gates, not browser physics or human input.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const fixturePath = path.join(__dirname, "umbra-moonlight-history.test.cjs");
const fixtureSource = fs.readFileSync(fixturePath, "utf8");
const fixtureModule = new Module(fixturePath, module);
fixtureModule.filename = fixturePath; fixtureModule.paths = Module._nodeModulePaths(__dirname);
fixtureModule._compile(fixtureSource.slice(0, fixtureSource.indexOf('\ntest("')) + "\nmodule.exports = fixture;", fixturePath);

function fixture(enabled = true) {
  const f = fixtureModule.exports(), s = f.scene, b = f.body;
  s.getUmbraMobilityTrialSettings = () => Object.freeze({ moonGlideMs: enabled ? 250 : 0 });
  const start = () => s.beginUmbraBoostTrace(s.time.now, "CONTINUOUS");
  const release = (reason = "RELEASE", cancelled = false) => s.endUmbraBoostTrace(reason, cancelled, s.time.now);
  const step = (dx = 10, { dy = 0, dt = 50, mode, sceneAdvance = dt, plannedX = dx, plannedY = dy,
    resolvedVelocity, blocked = false, commandBody, wall = false } = {}) => {
    for (const enemy of f.enemies) { enemy.body.prev = { ...enemy.body.position }; enemy.body.newVelocity = { x: 0, y: 0 }; }
    const powered = Boolean(s.umbraBoostTrace?.active);
    b.velocity = { x: plannedX * 1000 / dt, y: plannedY * 1000 / dt };
    b.blocked = { left: blocked }; b.touching = {};
    s.time.now += sceneAdvance;
    s.submitUmbraBoostTraceCommand({}, s.time.now, powered && (!mode || mode === "BOOST"), mode || (powered ? "BOOST" : "POST_BOOST_GLIDE"));
    if (commandBody) s.umbraBoostTrace.command.body = commandBody;
    b.prev = { ...b.position }; b.position = { x: b.position.x + dx, y: b.position.y + dy };
    b.newVelocity = { x: plannedX, y: plannedY };
    if (resolvedVelocity) b.velocity = resolvedVelocity;
    if (wall) s.doesUmbraBoostTraceCrossWall = () => true;
    f.world.emit("worldstep", dt / 1000);
    if (wall) delete s.doesUmbraBoostTraceCrossWall;
    f.assertClean();
    return s.getUmbraBoostTraceSnapshot().events.at(-1);
  };
  const arm = () => { start(); step(10); release(); assert.ok(s.umbraMoonlightRuntime.glide); };
  const snap = () => s.getUmbraMoonlightSnapshot();
  return { ...f, s, b, start, release, step, arm, snap };
}

test("only actual RELEASE after same-boost powered motion arms a 250ms window; empty tap never arms", () => {
  const f = fixture(); f.arm(); const a = f.snap();
  assert.equal(a.glide.expiresAtMs - a.glide.releasedAtMs, 250);
  assert.equal(a.glide.expiresAtSceneMs - a.glide.releasedAtSceneMs, 250);
  assert.equal(a.counts.glideArmed, 1);
  f.s.endUmbraBoostTrace("RELEASE"); assert.equal(f.snap().counts.glideArmed, 1);
  const empty = fixture(); empty.start(); empty.release(); empty.add(-50, 50); empty.step(150);
  assert.equal(empty.snap().counts.glideArmed, 0); assert.equal(empty.count(), 0);
});

test("a safe moving glide can hit with zero held movement input while its shared trace stays invalid", () => {
  const f = fixture(); f.add(-50, 50); f.arm();
  f.s.acMovementState = { input: { x: 0, y: 0 }, lastDashDown: false };
  const event = f.step(100);
  assert.equal(event.valid, false); assert.equal(event.reason, "POST_BOOST_GLIDE");
  assert.equal(f.count(), 1); assert.equal(f.snap().counts.glideAccepted, 1);
  assert.equal(f.snap().glide.lastStepActive, true);
  assert.equal(f.snap().counts.attempts, 1); assert.equal(f.receivers[0].damage, 4);
  assert.equal(f.s.umbraBoostTrace.counts.segment, 1, "glide never becomes a valid powered segment/NOVA trigger");
});

test("full physical budget and scene-time deadline each expire without being refreshed by later glide", () => {
  for (const sceneAdvance of [0, 50]) {
    const f = fixture(); f.arm();
    for (let n = 0; n < 5; n++) f.step(1, { sceneAdvance });
    assert.equal(f.snap().glide.active, false); assert.equal(f.snap().counts.glideExpired, 1);
    f.add(-50, 50); f.step(150, { sceneAdvance }); assert.equal(f.count(), 0);
  }
  const delayed = fixture(); delayed.arm(); delayed.add(-50, 50);
  delayed.step(150, { dt: 50, sceneAdvance: 1000 }); assert.equal(delayed.count(), 0);
  assert.equal(delayed.snap().glide.active, false);
});

test("a step straddling expiry clips the hit entry rather than granting its entire swept path", () => {
  for (const [targetX, expected] of [[-90, 1], [0, 0]]) {
    const f = fixture(); f.arm();
    for (let n = 0; n < 4; n++) f.step(1);
    f.add(targetX, 0); f.step(200, { dt: 100 });
    assert.equal(f.count(), expected, `target ${targetX}`); assert.equal(f.snap().glide.active, false);
  }
});

test("unsafe boost endings never arm even after powered motion", () => {
  for (const reason of ["EN_EMPTY", "LOW_EN", "FULL_OVERHEAT", "MAX_HOLD", "BOOST_COMPLETE", "AIR_BRAKE", "RUN_EXIT", "UNKNOWN"]) {
    const f = fixture(); f.start(); f.step(10); f.release(reason); f.add(-50, 50); f.step(100);
    assert.equal(f.count(), 0, reason); assert.equal(f.snap().counts.glideArmed, 0, reason);
  }
  const cancelled = fixture(); cancelled.start(); cancelled.step(10); cancelled.release("RELEASE", true);
  assert.equal(cancelled.snap().counts.glideArmed, 0);
});

test("zero motion or unexplained final powered velocity cannot be reused as release eligibility", () => {
  for (const options of [{ dx: 0 }, { dx: 10, resolvedVelocity: { x: 900, y: 0 } }]) {
    const f = fixture(); f.start(); f.step(10); f.step(options.dx, options); f.release();
    assert.equal(f.snap().counts.glideArmed, 0); f.add(-50, 50); f.step(100); assert.equal(f.count(), 0);
  }
});

test("normal walking, brake, stopped motion, walls and untrusted body motion cancel the window permanently", () => {
  const rows = [
    { name: "normal", dx: 1, mode: "NORMAL" }, { name: "brake", dx: 1, mode: "AIR_BRAKE" },
    { name: "zero", dx: 0 }, { name: "blocked", dx: 1, blocked: true },
    { name: "wall", dx: 1, wall: true }, { name: "correction", dx: 1, plannedX: 2 },
    { name: "external after integration", dx: 1, resolvedVelocity: { x: 100, y: 0 } },
    { name: "stale body", dx: 1, commandBody: {} }
  ];
  for (const row of rows) {
    const f = fixture(); f.arm(); f.step(row.dx, row);
    assert.equal(f.snap().glide.active, false, row.name); assert.equal(f.snap().glide.lastStepActive, false, row.name);
    f.add(-50, 50); f.step(100); assert.equal(f.count(), 0, row.name);
  }
});

test("teleport, pause/resume, Depth generation and run ending remove the release window", () => {
  for (const reason of ["WORLD_PAUSE", "WORLD_RESUME", "HIDDEN", "VISIBLE", "RUN_EXIT", "BODY_CHANGED", "DEPTH_CHANGED"]) {
    const f = fixture(); f.arm(); const clock = f.snap().combatTimeMs;
    if (reason === "DEPTH_CHANGED") f.s.stageDepth++;
    f.s.invalidateUmbraBoostTrace(reason);
    assert.equal(f.snap().glide.active, false, reason); assert.equal(f.snap().combatTimeMs, clock);
    f.add(-50, 50); f.step(100); assert.equal(f.count(), 0, reason);
  }
  const warped = fixture(); warped.arm(); warped.b.position.x += 50; warped.add(-50, 50); warped.step(100);
  assert.equal(warped.count(), 0); assert.equal(warped.snap().glide.active, false);
  const ended = fixture(); ended.arm(); const runtime = ended.s.umbraMoonlightRuntime;
  ended.s.destroyUmbraMoonlightRuntime("RUN_EXIT"); assert.equal(runtime.glide, null); assert.equal(runtime.glideActive, false);
});

test("release, expiry and another tap keep the same living enemy pass and rehit clock", () => {
  const f = fixture(), enemy = f.add(-190, 40);
  f.start(); f.step(10); assert.equal(f.count(), 1);
  const record = f.s.umbraMoonlightRuntime.targets.get(enemy), lifeId = record.lifeId, lastHitAt = record.lastHitAt;
  f.release(); f.step(1); f.start(); f.release(); f.step(1);
  assert.equal(f.count(), 1); assert.equal(record.lifeId, lifeId); assert.equal(record.lastHitAt, lastHitAt);
  assert.equal(record.passId, 1); assert.equal(record.passConsumed, true);
  assert.equal(f.snap().counts.glideArmed, 1, "empty tap does not renew the old window");
  f.s.invalidateUmbraBoostTrace("WORLD_PAUSE");
  assert.equal(record.lastHitAt, lastHitAt); assert.equal(record.passId, 1);
});

test("early glide reentry consumes the existing pass cooldown and cannot retry by waiting inside", () => {
  const f = fixture(); f.add(-190, 40); f.start(); f.step(10); f.step(150); f.release();
  f.step(-150); assert.equal(f.count(), 1); assert.ok(f.snap().skips.REHIT_WAIT);
  f.step(1, { dt: 800 }); assert.equal(f.count(), 1);
  f.start(); f.step(1); assert.equal(f.count(), 1);
});

test("duplicate/stale events and a disabled legacy setting cannot create or renew glide damage", () => {
  const f = fixture(); f.arm(); const release = f.s.getUmbraBoostTraceSnapshot().events.at(-1);
  f.s.receiveUmbraMoonlightTrace(release); assert.equal(f.snap().counts.glideArmed, 1);
  f.s.receiveUmbraMoonlightTrace({ ...release, order: release.order + 10, basisGeneration: release.basisGeneration - 1 });
  assert.equal(f.snap().counts.glideArmed, 1); assert.ok(f.snap().skips.STALE_GENERATION);
  const legacy = fixture(false); legacy.add(-50, 50); legacy.start(); legacy.step(10); legacy.release(); legacy.step(100);
  assert.equal(legacy.count(), 0); assert.equal(legacy.snap().counts.glideArmed, 0);
  const changed = fixture(); changed.arm(); changed.s.getUmbraMobilityTrialSettings = () => ({ moonGlideMs: 0 });
  changed.add(-50, 50); changed.step(100); assert.equal(changed.count(), 0); assert.equal(changed.snap().glide.active, false);
});
