"use strict";
// Production normal-context NOVA/receiver methods with numeric bodies and
// explicit accepted first-step notifications. Phaser movement is tested apart.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const assert = require("node:assert/strict"), test = require("node:test");
const file = path.join(__dirname, "umbra-mobility-field.test.cjs"), source = fs.readFileSync(file, "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
function loadFixture(lane) {
  const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
  const original = source.slice(0, source.indexOf('\ntest("'));
  assert.ok(original.includes("novaField: ${enabled},"), "expected immutable fixture input seam");
  const prefix = lane ? original.replace("novaField: ${enabled},", "novaField: ${enabled}, novaFieldShape: 'lane',") : original;
  mod._compile(prefix + "\nmodule.exports = fixture;", file); return mod.exports;
}
const laneFixture = loadFixture(true), circleFixture = loadFixture(false);
function lane(options) {
  const f = laneFixture(options);
  const decide = ({ from, to, valid = true, firstPhysicalEvaluation = true } = {}) => {
    const trace = f.s.umbraBoostTrace; trace.physicalStep++;
    f.s.emitUmbraBoostTrace("step", { valid, firstPhysicalEvaluation,
      reason: valid ? "VALID_BOOST" : "ZERO_DISPLACEMENT", deltaMs: 10,
      from: from || trace.fixedStart, to: to || { x: trace.fixedStart.x + 10, y: trace.fixedStart.y } });
  };
  const deploy = (x = 0, y = 0, dx = 10, dy = 0) => {
    f.start(x, y); decide({ to: { x: x + dx, y: y + dy } }); f.step(10);
    return f.s.umbraPhantomNovaRuntime.slots.find(slot => slot.state === "DEPLOYED" && slot.position.x === x && slot.position.y === y);
  };
  return { ...f, decide, deploy };
}
function at(field, along, across) {
  return { x: field.x + along * field.dirX - across * field.dirY,
    y: field.y + along * field.dirY + across * field.dirX };
}
function assertAt(f, field, along, across, expected) {
  const point = at(field, along, across); f.move(point.x, point.y);
  assert.equal(f.s.isPointInsideUmbraNovaProtectionField(point, field), expected, `${along},${across} helper`);
  assert.equal(f.protected(), expected, `${along},${across} damage guard`);
  assert.equal(f.visual().fields[0].containsPlayer, expected, `${along},${across} visual`);
}

test("lane geometry snapshots the first accepted physical direction at normal DEP", () => {
  const f = lane(); f.start(50, 60); assert.equal(f.protected(), false);
  const from = { x: 53, y: 64 }, to = { x: 59, y: 72 };
  f.decide({ from, to }); const decision = f.s.umbraPhantomNovaRuntime.pendingPhysical;
  assert.ok(Object.isFrozen(decision)); assert.ok(Object.isFrozen(decision.physicalDirection));
  assert.deepEqual(plain(decision.physicalDirection), { x: .6, y: .8 });
  from.x = 99999; to.y = -99999; f.step();
  const slot = f.s.umbraPhantomNovaRuntime.slots[0], field = slot.protectionField;
  assert.ok(field); assert.ok(Object.isFrozen(field)); assert.equal(field.shape, "lane");
  assert.equal(field.x, 50); assert.equal(field.y, 60); assert.equal(field.dirX, .6); assert.equal(field.dirY, .8);
  assert.equal(field.forwardLength, 1800); assert.equal(field.rearLength, 120); assert.equal(field.halfWidth, 120);
  assert.equal(field.durationMs, 2000); assert.equal(field.expiresAtMs, slot.deployedAtMs + 2000);
  assert.equal(slot.deployedUntilMs, slot.deployedAtMs + 3000);
  assert.deepEqual(plain(f.visual().fields[0]), { slotId: 1, cycleGeneration: 1, x: 50, y: 60,
    radius: 180, durationMs: 2000, expiresAtMs: slot.deployedAtMs + 2000, shape: "lane", dirX: .6, dirY: .8,
    forwardLength: 1800, rearLength: 120, halfWidth: 120, remainingMs: 2000, containsPlayer: true });
});

test("axis and diagonal rectangle sides and all corners share exact body/visual/receiver boundaries", () => {
  for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10], [3, 4], [-3, -4], [1, -1]]) {
    const f = lane(), field = f.deploy(50, 60, dx, dy).protectionField;
    f.s.playerSprite = { x: -100000, y: 100000 };
    for (const along of [-120, 0, 1800]) for (const across of [-120, 0, 120]) assertAt(f, field, along, across, true);
    for (const [along, across] of [[-120.00001, 0], [1800.00001, 0], [700, 120.00001], [700, -120.00001],
      [-120.00001, 120], [1800, 120.00001]]) assertAt(f, field, along, across, false);
  }
});

test("lane protects the forward corridor without becoming an enlarged circle, and leaving applies damage normally", () => {
  const f = lane(), field = f.deploy().protectionField, hp = f.s.stats.hp;
  assertAt(f, field, 1760, 110, true);
  for (const source of ["enemyContact", "enemyProjectile", "playerDamage"]) assert.equal(f.s.applyDamageToPlayer(5, { source }), false);
  assert.equal(f.s.stats.hp, hp); assert.equal(f.s.barrierBudget, 25); assert.equal(f.s.evadeCalls, 0); assert.equal(f.s.invincibleUntil, 0);
  assertAt(f, field, 700, 120.00001, false); f.s.barrierBudget = 0;
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), true); assert.equal(f.s.stats.hp, hp - 5);
  assert.equal(f.s.evadeCalls, 1);
});

test("direction, size and deadline remain fixed through release, Air Brake, camera and EN changes", () => {
  const f = lane(), field = f.deploy(0, 0, 3, 4).protectionField;
  const geometry = plain(f.visual().fields[0]);
  f.s.endUmbraBoostTrace("RELEASE"); f.s.invalidateUmbraBoostTrace("AIR_BRAKE");
  f.s.acMovementState = { mode: "AIR_BRAKE", airBrake: { active: true } };
  f.s.worldCamera = { scrollX: 5000, scrollY: -1000, zoom: .2, rotation: 1.4 };
  f.s.stats.stamina = 0; f.body.velocity = { x: -500, y: 0 };
  assertAt(f, field, 1200, 50, true); assert.equal(f.s.umbraPhantomNovaRuntime.slots[0].protectionField, field);
  assert.equal(f.s.createUmbraNovaProtectionField(f.s.umbraPhantomNovaRuntime.slots[0], { x: -1, y: 0 }), false);
  const visual = plain(f.visual().fields[0]); assert.deepEqual(visual, geometry);
});

test("missing, rejected or nonfinite first-step directions never fall back to a circle", () => {
  for (const detail of [{ valid: false }, { firstPhysicalEvaluation: false }, { to: { x: 0, y: 0 } }]) {
    const f = lane(); f.start(); f.decide(detail); f.step();
    assert.equal(f.visual().fields.length, 0); assert.equal(f.protected(), false);
    assert.equal(f.s.umbraPhantomNovaRuntime.counts.deployed, 0);
  }
  const nonfinite = lane(); nonfinite.start(); nonfinite.decide({ to: { x: Infinity, y: 0 } });
  assert.equal(nonfinite.s.umbraPhantomNovaRuntime.pendingPhysical.physicalDirection, undefined); nonfinite.step();
  assert.equal(nonfinite.protected(), false);
  const f = lane(), moon = f.s.playerSkills.umbraMoonlight; delete f.s.playerSkills.umbraMoonlight;
  const slot = f.deploy(); f.s.playerSkills.umbraMoonlight = moon;
  assert.equal(slot.state, "DEPLOYED", "NOVA still deploys when lane cannot be created");
  assert.equal(slot.protectionField, undefined); assert.equal(f.protected(), false);
  assert.equal(f.s.createUmbraNovaProtectionField(slot), false);
  for (const direction of [{ x: 0, y: 0 }, { x: NaN, y: 1 }, { x: 1, y: Infinity }]) assert.equal(f.s.createUmbraNovaProtectionField(slot, direction), false);
});

test("lane requires both canonical owned active skills at creation and current protection", () => {
  const f = lane(); delete f.s.playerSkills.umbraMoonlight;
  const slot = f.deploy(); assert.equal(slot.state, "DEPLOYED"); assert.equal(slot.protectionField, undefined);
  assert.equal(f.protected(), false);
  for (const skillId of ["umbraMoonlight", "umbraPhantomNova"]) {
    const active = lane(); active.deploy(); delete active.s.playerSkills[skillId];
    assert.equal(active.protected(), false); assert.equal(active.visual().fields.length, 0);
  }
  const forged = lane(); forged.s.playerSkills.umbraMoonlight.currentStage = { ...forged.s.playerSkills.umbraMoonlight.currentStage };
  assert.equal(forged.deploy().protectionField, undefined);
  const inactive = lane(); delete inactive.s.playerSkills.umbraPhantomNova; inactive.start();
  assert.equal(inactive.s.umbraPhantomNovaRuntime.reservation, null); assert.equal(inactive.protected(), false);
});

test("a delayed later step cannot replace the committed first-step lane direction", () => {
  const f = lane(); f.start(); f.decide({ to: { x: 10, y: 0 } });
  const first = f.s.umbraPhantomNovaRuntime.pendingPhysical;
  f.decide({ to: { x: 0, y: -10 }, firstPhysicalEvaluation: false });
  assert.equal(f.s.umbraPhantomNovaRuntime.pendingPhysical, first); f.step();
  const field = f.s.umbraPhantomNovaRuntime.slots[0].protectionField;
  assert.equal(field.dirX, 1); assert.equal(field.dirY, 0);
});

test("three independently oriented lanes do not add width, lifetime or extra slot capacity", () => {
  const f = lane({ stage: 8 }), a = f.deploy(0, 0, 1, 0).protectionField;
  f.step(800); const b = f.deploy(200, 0, 0, 1).protectionField;
  f.step(800); const c = f.deploy(400, 0, -1, 0).protectionField;
  assert.equal(f.visual().fields.length, 3); assert.equal(f.s.umbraPhantomNovaRuntime.slots.length, 3);
  assert.equal(a.expiresAtMs, 2010); assert.equal(b.expiresAtMs, 2820); assert.equal(c.expiresAtMs, 3630);
  f.move(200, 1760); assert.equal(f.protected(), true); f.move(700, 121); assert.equal(f.protected(), false);
  f.step(380); assert.equal(f.visual().fields.length, 2); assert.equal(a.expiresAtMs, 2010);
  assert.equal(f.s.umbraPhantomNovaRuntime.slots[0].state, "DEPLOYED");
  assert.equal(f.s.umbraPhantomNovaRuntime.slots[0].deployedUntilMs, 3010);
  f.start(900, 0); f.decide(); f.step(); assert.equal(f.s.umbraPhantomNovaRuntime.counts.deployed, 3);
});

test("lane expires at 2000ms before collider reception while DEP attacks continue until 3000ms", () => {
  const f = lane(), slot = f.deploy(), field = slot.protectionField;
  const deploymentEndsAt = slot.deployedUntilMs, regenerationMs = slot.deployedSnapshot.regenerationMs;
  assertAt(f, field, 1760, 0, true); f.step(1999); assert.equal(f.protected(), true);
  assert.equal(f.visual().fields[0].remainingMs, 1);
  f.s.events.emit("preupdate", f.s.time.now, 1); assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
  assert.equal(slot.state, "DEPLOYED"); const pulsesBeforeExpiry = f.s.umbraPhantomNovaRuntime.counts.deployedPulses;
  f.s.barrierBudget = 0; const hp = f.s.stats.hp;
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), true); assert.equal(f.s.stats.hp, hp - 5);
  f.s.observeUmbraPhantomNovaStep(.001); assert.equal(slot.state, "DEPLOYED");
  assert.equal(slot.deployedUntilMs, deploymentEndsAt); assert.equal(slot.regenerateAtMs, null);
  assert.ok(f.s.umbraPhantomNovaRuntime.counts.deployedPulses > pulsesBeforeExpiry);
  f.step(999); assert.equal(slot.state, "DEPLOYED"); assert.equal(f.protected(), false);
  f.step(1); assert.equal(slot.state, "REGENERATING"); assert.equal(slot.regenerateAtMs, deploymentEndsAt + regenerationMs);
  const gate = lane(), old = gate.deploy(), due = old.deployedUntilMs + old.deployedSnapshot.regenerationMs;
  const ticket = gate.s.captureUmbraGateSurvivors({ targetDepth: 2 }); gate.s.stageDepth = 2; gate.s.adoptUmbraGateSurvivors(ticket);
  assert.equal(old.protectionField, null); assert.equal(old.regenerateAtMs, due); assert.equal(gate.protected(), false);
  for (const mutate of [q => q.invalidate(), q => { q.s.playerHitbox.body = { ...q.body }; }, q => { q.s.extractionComplete = true; }]) {
    const oldRun = lane(); oldRun.deploy(); mutate(oldRun); assert.equal(oldRun.protected(), false); assert.equal(oldRun.visual().fields.length, 0);
  }
});

test("old circle output and canonical NOVA attacks remain identical with OFF, circle and lane", () => {
  const off = circleFixture({ enabled: false }), circle = circleFixture(), corridor = lane();
  for (const f of [off, circle, corridor]) {
    for (const x of [60, 700]) f.s.registerUmbraPhantomNovaEnemyLife(f.add(x, 0, 10000));
  }
  off.deploy(); circle.deploy(); corridor.deploy();
  const circleField = circle.visual().fields[0];
  assert.deepEqual(Object.keys(circleField).sort(), ["slotId", "cycleGeneration", "x", "y", "radius", "durationMs", "expiresAtMs", "remainingMs", "containsPlayer"].sort());
  circle.move(0, 180); assert.equal(circle.protected(), true); circle.move(700, 0); assert.equal(circle.protected(), false);
  circle.move(0, 0);
  const snapshot = f => plain({ visual: f.s.getUmbraPhantomNovaVisualState(), counts: f.s.umbraPhantomNovaRuntime.counts,
    skips: f.s.umbraPhantomNovaRuntime.skips, enemyHp: f.enemies.map(enemy => enemy.hp) });
  for (let i = 0; i < 600; i++) {
    off.step(10); circle.step(10); corridor.step(10);
    if (i === 199) {
      assert.equal(circle.protected(), true); assert.equal(corridor.protected(), false);
      assert.equal(corridor.s.umbraPhantomNovaRuntime.slots[0].state, "DEPLOYED");
      assert.equal(corridor.s.umbraPhantomNovaRuntime.slots[0].deployedUntilMs, 3010);
    }
    assert.deepEqual(snapshot(corridor), snapshot(off), `lane/off ${(i + 1) * 10}ms`);
    assert.deepEqual(snapshot(circle), snapshot(off), `circle/off ${(i + 1) * 10}ms`);
  }
  const counts = corridor.s.umbraPhantomNovaRuntime.counts;
  assert.ok(counts.deployedPulses > 0); assert.ok(counts.orbitPulses > 0); assert.equal(counts.expired, 1); assert.equal(counts.regenerated, 1);
  assert.ok(counts.accepted > 0 && counts.hpDelta > 0); assert.ok(corridor.enemies[0].hp < 10000);
  assert.equal(corridor.enemies[1].hp, 10000, "lane coverage does not extend NOVA circular attack range");
});
