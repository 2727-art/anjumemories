"use strict";
// Production receiver/DEP/lifecycle methods with the existing normal-owner
// numeric fixture. Explicit trace decisions are not Phaser collision evidence.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-normal-context.test.cjs"), source = fs.readFileSync(filename, "utf8");
function loadFixture(enabled) {
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
  // Add only an immutable environment input; all game methods stay untouched.
  const prefix = source.slice(0, source.indexOf('\ntest("')).replace('version: "umbra-phase7b-v1",',
    `version: "umbra-phase7b-v1", novaField: ${enabled},`);
  mod._compile(prefix + "\nmodule.exports = fixture;", filename);
  return mod.exports;
}
const onFixture = loadFixture(true), offFixture = loadFixture(false);
function fixture({ enabled = true, stage = 1 } = {}) {
  const f = (enabled ? onFixture : offFixture)(), s = f.scene;
  // The older Moon fixture omits this browser global because its own tests
  // never execute the NOVA physical observer.
  s.observeUmbraPhantomNovaStep.constructor("value", "globalThis.performance = value")(performance);
  s.prepareUmbraNormalRunContext(); f.bind(); f.activate(); s.unlockSkill("umbraPhantomNova");
  if (stage > 1) {
    const skill = s.playerSkills.umbraPhantomNova; skill.stageIndex = stage - 1;
    assert.equal(s.applySkillStage(skill), true);
    // Synthetic Stage setup is not natural growth/Core selection evidence.
    s.skillMutationState.pendingQueue = []; s.skillMutationState.currentSelection = null;
    s.skillMutationSelectionActive = false; f.activate();
  }
  f.world.bounds = { x: -2000, y: -2000, width: 4000, height: 4000 };
  s.invincibleUntil = 0; s.barrierBudget = 25; s.evadeCalls = 0; s.barrierCalls = 0;
  s.getOverdriveModDamageTakenMultiplier = () => 1; s.getRunEquipmentDamageTakenMultiplier = () => 1;
  s.shouldNegatePlayerDamageByAcEvade = () => { s.evadeCalls++; return false; };
  s.applyRobotBarrierToIncomingDamage = amount => {
    s.barrierCalls++; const absorbed = Math.min(s.barrierBudget, amount); s.barrierBudget -= absorbed;
    return { hpDamage: amount - absorbed, absorbed };
  };
  s.applyFinalRaidGuildDamageReduction = null; s.consumeFinalRaidRescueShield = null; s.consumeFinalRaidLegendGuard = null;
  s.handleDepthDirectivePlayerDamage = () => {}; s.handleGenericCommsHpThresholds = () => {};
  s.tweens = { add() {} }; s.triggerGameOver = () => { s.gameOver = true; };
  const move = (x, y = 0) => { f.body.position.x = x - f.body.halfWidth; f.body.position.y = y - f.body.halfHeight; };
  const step = (ms = 10) => { s.events.emit("preupdate", s.time.now, ms); s.observeUmbraPhantomNovaStep(ms / 1000); s.time.now += ms; };
  const start = (x = 0, y = 0) => { s.endUmbraBoostTrace("RELEASE"); move(x, y); s.beginUmbraBoostTrace(s.time.now, "CONTINUOUS"); };
  const decide = valid => {
    const trace = s.umbraBoostTrace; trace.physicalStep++;
    s.emitUmbraBoostTrace("step", { valid, firstPhysicalEvaluation: true,
      reason: valid ? "VALID_BOOST" : "ZERO_DISPLACEMENT", deltaMs: 10,
      from: trace.fixedStart, to: { x: trace.fixedStart.x + (valid ? 10 : 0), y: trace.fixedStart.y } });
  };
  const deploy = (x = 0, y = 0) => { start(x, y); decide(true); step(10); return s.umbraPhantomNovaRuntime.slots.find(slot => slot.state === "DEPLOYED" && slot.position.x === x && slot.position.y === y); };
  return { ...f, s, move, step, start, decide, deploy, protected: () => s.isPlayerProtectedByUmbraNovaField(), visual: () => s.getUmbraNovaProtectionVisualState() };
}

test("NOVA field is opt-in and starts only after successful normal DEP", () => {
  const off = fixture({ enabled: false }); const offSlot = off.deploy();
  assert.equal(offSlot.state, "DEPLOYED"); assert.equal(offSlot.protectionField, undefined); assert.equal(off.protected(), false);
  const f = fixture(); f.start(); assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
  f.decide(false); f.step(); assert.equal(f.protected(), false); assert.equal(f.s.umbraPhantomNovaRuntime.counts.deployed, 0);
  const slot = f.deploy(); assert.equal(slot.state, "DEPLOYED"); assert.equal(f.protected(), true);
  assert.equal(slot.protectionField.radius, 180); assert.equal(slot.protectionField.durationMs, 3000);
  assert.equal(slot.protectionField.expiresAtMs - slot.deployedAtMs, 3000);
  assert.equal(slot.protectionField.expiresAtMs, slot.deployedUntilMs); assert.ok(Object.isFrozen(slot.protectionField));
  assert.equal(f.s.invincibleUntil, 0);
});

test("inside including exact boundary uses the physical body center; leaving stops protection immediately", () => {
  const f = fixture(); f.deploy(50, 60); f.s.playerSprite = { x: 10000, y: -10000 };
  for (const [x, y] of [[50, 60], [230, 60], [50, -120]]) { f.move(x, y); assert.equal(f.protected(), true); }
  f.move(230.000001, 60); assert.equal(f.protected(), false);
  f.s.playerSprite.x = 50; f.s.playerSprite.y = 60; assert.equal(f.protected(), false);
  f.move(50, 60); assert.equal(f.protected(), true); assert.equal(f.visual().fields[0].containsPlayer, true);
});

test("damage before DEP commit stays applied and field creation grants no new invincibleUntil", () => {
  const f = fixture(); f.s.barrierBudget = 0; f.start(); const before = f.s.stats.hp;
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), true);
  const deadline = f.s.invincibleUntil; assert.equal(f.s.stats.hp, before - 5);
  f.decide(true); f.step(); assert.equal(f.protected(), true);
  assert.equal(f.s.stats.hp, before - 5); assert.equal(f.s.invincibleUntil, deadline);
});

test("protected reception preserves AP, barrier, evade and unrelated invincibility", () => {
  const f = fixture(); f.deploy(); const hp = f.s.stats.hp;
  for (const source of ["enemyContact", "enemyProjectile", "playerDamage"]) assert.equal(f.s.applyDamageToPlayer(100, { source }), false);
  assert.equal(f.s.stats.hp, hp); assert.equal(f.s.barrierBudget, 25); assert.equal(f.s.barrierCalls, 0);
  assert.equal(f.s.evadeCalls, 0); assert.equal(f.s.invincibleUntil, 0);
  f.s.invincibleUntil = f.s.time.now + 200; f.move(181); assert.equal(f.s.applyDamageToPlayer(100), false);
  assert.equal(f.s.barrierBudget, 25); assert.equal(f.s.invincibleUntil, f.s.time.now + 200);
  f.s.invincibleUntil = 0; assert.equal(f.s.applyDamageToPlayer(100), true);
  assert.equal(f.s.stats.hp, Math.max(0, hp - 75)); assert.equal(f.s.barrierBudget, 0); assert.equal(f.s.evadeCalls, 1);
});

test("field expiry is half-open and receiver before WORLD_STEP never gets an extra protected step", () => {
  const f = fixture(); const slot = f.deploy(); const deadline = slot.protectionField.expiresAtMs;
  f.step(2999); assert.equal(f.protected(), true); assert.ok(Math.abs(f.visual().fields[0].remainingMs - 1) < 1e-7);
  // At the next PRE_UPDATE, colliders run before NOVA's WORLD_STEP clock advances.
  f.s.events.emit("preupdate", f.s.time.now, 1);
  assert.equal(f.s.umbraPhantomNovaRuntime.combatTimeMs, deadline - 1); assert.equal(f.protected(), false);
  assert.equal(f.visual().fields.length, 0); assert.equal(slot.state, "DEPLOYED");
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), true);
  f.s.observeUmbraPhantomNovaStep(.001); assert.equal(f.protected(), false); assert.equal(slot.state, "REGENERATING");
});

test("30/60/120 Hz and long frames cannot extend the 3000ms field beyond normal DEP expiry", () => {
  for (const hz of [30, 60, 120]) {
    const f = fixture(), slot = f.deploy(), until = slot.deployedUntilMs, regenerationMs = slot.deployedSnapshot.regenerationMs;
    for (let i = 0; i < 3 * hz - 1; i++) f.step(1000 / hz);
    assert.equal(f.protected(), true, `${hz} Hz before expiry`); f.step(1000 / hz);
    assert.equal(f.protected(), false, `${hz} Hz expiry`); assert.equal(slot.deployedUntilMs, null);
    assert.equal(slot.state, "REGENERATING"); assert.equal(slot.regenerateAtMs, until + regenerationMs);
  }
  const f = fixture(), slot = f.deploy(), until = slot.deployedUntilMs;
  f.s.events.emit("preupdate", f.s.time.now, 4000); assert.equal(f.protected(), false); assert.equal(slot.deployedUntilMs, until);
});

test("multiple slot fields form a fixed union without radius stacking or refreshing an earlier expiry", () => {
  const f = fixture({ stage: 8 }), first = f.deploy(0), original = first.protectionField;
  f.step(800); const second = f.deploy(150);
  assert.ok(second); assert.equal(f.visual().fields.length, 2); assert.equal(first.protectionField, original);
  assert.equal(f.s.createUmbraNovaProtectionField(first), false); assert.equal(first.protectionField.expiresAtMs, original.expiresAtMs);
  f.move(331); assert.equal(f.protected(), false); f.move(150); assert.equal(f.protected(), true);
  f.step(2190); assert.equal(f.visual().fields.length, 1); assert.equal(f.protected(), true);
  f.move(-180); assert.equal(f.protected(), false); assert.equal(f.s.umbraPhantomNovaRuntime.slots.length, 3);
});

test("returning after two seconds uses the original field without refreshing its three-second deadline", () => {
  const f = fixture(), slot = f.deploy(50, 60), original = slot.protectionField;
  // Numeric physical-center positions exercise the production receiver and
  // lifetime only; an actual boost out-and-back is a separate browser test.
  f.step(1100); f.move(231, 60); assert.equal(f.protected(), false);
  f.step(900); f.move(50, 60); const hp = f.s.stats.hp;
  assert.equal(f.protected(), true); assert.equal(f.visual().fields[0].remainingMs, 1000);
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), false); assert.equal(f.s.stats.hp, hp);
  assert.equal(slot.protectionField, original); assert.equal(f.s.createUmbraNovaProtectionField(slot), false);
  f.step(999); assert.equal(f.protected(), true);
  f.step(1); assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
  assert.equal(slot.state, "REGENERATING"); assert.equal(slot.protectionField, null);
  f.s.barrierBudget = 0;
  assert.equal(f.s.applyDamageToPlayer(5, { source: "enemyContact" }), true); assert.equal(f.s.stats.hp, hp - 5);
  f.move(231, 60); f.move(50, 60); assert.equal(f.protected(), false);
});

test("field ON/OFF preserves NOVA pulse scheduling, DEP expiry and regeneration at every sampled frame", () => {
  const on = fixture(), off = fixture({ enabled: false }); on.deploy(); off.deploy();
  const plain = value => JSON.parse(JSON.stringify(value));
  const snapshot = f => ({ visual: f.s.getUmbraPhantomNovaVisualState(), counts: f.s.umbraPhantomNovaRuntime.counts,
    skips: f.s.umbraPhantomNovaRuntime.skips });
  assert.deepEqual(plain(snapshot(on)), plain(snapshot(off)));
  for (let i = 0; i < 600; i++) {
    on.step(10); off.step(10);
    assert.deepEqual(plain(snapshot(on)), plain(snapshot(off)), `active time ${(i + 1) * 10}ms`);
  }
  const counts = on.s.umbraPhantomNovaRuntime.counts;
  assert.ok(counts.deployedPulses > 0); assert.ok(counts.orbitPulses > 0);
  assert.equal(counts.expired, 1); assert.equal(counts.regenerated, 1);
  assert.equal(on.s.umbraPhantomNovaRuntime.slots[0].state, "ORBITING");
  assert.equal(on.protected(), false);
});

test("pause and overlay block protection without spending the remaining active lifetime", () => {
  for (const flag of ["drivePaused", "levelUpActive", "gateChoiceActive", "gateGuidanceOverlayActive"]) {
    const f = fixture(); f.deploy(); f.step(200); const left = f.visual().fields[0].remainingMs;
    f.s[flag] = true; f.step(5000); assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
    f.s[flag] = false; f.activate(); assert.equal(f.protected(), true); assert.equal(f.visual().fields[0].remainingMs, left);
  }
  const f = fixture(); f.deploy(); f.s.overlayContainer = { visible: true }; assert.equal(f.protected(), false);
});

test("run, body, cycle and Depth identity reject stale fields and Gate clears them while preserving regen debt", () => {
  for (const change of [f => { f.s.umbraPhantomNovaRuntime.runGeneration++; }, f => { f.s.umbraPhantomNovaRuntime.depthGeneration++; },
    f => { f.s.umbraPhantomNovaRuntime.slots[0].cycleGeneration++; }, f => { f.s.playerHitbox.body = { ...f.body }; },
    f => { f.s.umbraNormalLaunchRequest = { ...f.s.umbraNormalLaunchRequest }; }, f => f.invalidate()]) {
    const f = fixture(); f.deploy(); change(f); assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
  }
  const f = fixture(), slot = f.deploy(), due = slot.deployedUntilMs + slot.deployedSnapshot.regenerationMs;
  const ticket = f.s.captureUmbraGateSurvivors({ targetDepth: 2 }); assert.equal(f.protected(), false);
  f.s.stageDepth = 2; f.s.adoptUmbraGateSurvivors(ticket); assert.equal(slot.protectionField, null);
  assert.equal(slot.state, "REGENERATING"); assert.equal(slot.regenerateAtMs, due); assert.equal(f.visual().fields.length, 0);
});

test("run exit and runtime destruction discard fields without HP restoration or listener residue", () => {
  for (const flag of ["gameOver", "extractionComplete", "restartInProgress", "shopActive"]) {
    const f = fixture(); f.deploy(); const hp = f.s.stats.hp; f.s[flag] = true;
    assert.equal(f.protected(), false); f.s.prepareUmbraPhantomNovaFrame(); assert.equal(f.s.umbraPhantomNovaRuntime, null);
    assert.equal(f.s.stats.hp, hp);
  }
  const f = fixture(); f.deploy(); const runtime = f.s.umbraPhantomNovaRuntime;
  f.s.destroyUmbraPhantomNovaRuntime(); assert.equal(runtime.slots.length, 0); assert.equal(runtime.cleanups.length, 0);
  assert.equal(f.protected(), false); assert.equal(f.visual().fields.length, 0);
});
