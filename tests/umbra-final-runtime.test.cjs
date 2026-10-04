"use strict";
// Real prototype/receiver, numeric-body fixtures. These explicit notifications
// are not Phaser integration or real device-refresh-rate evidence.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const file = path.join(__dirname, "umbra-core-runtime.test.cjs"), src = fs.readFileSync(file, "utf8");
const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(src.slice(0, src.indexOf('\ntest("')) + '\nmodule.exports={core,stage,moonFixture,spikeFixture,novaFixture};', file);
const { core, stage, moonFixture, spikeFixture, novaFixture } = mod.exports;
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", ids = [M, B, N];
const plain = x => JSON.parse(JSON.stringify(x));
function final(f, id, choice = "prism", coreId = "assault") {
  f.scene.verificationContext = { ...f.scene.verificationContext, finalEnabled: true };
  core(f, id === M ? [] : [id]); const s = f.scene;
  stage(s, id, 8);
  for (const value of [coreId, choice]) {
    if (!s.skillMutationState.selectionOpen) assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
    assert.equal(s.skillMutationState.currentSelection.skillId, id);
    s.selectLevelUpCard(s.levelUpCardRecords.findIndex(r => r.model.option.choiceId === value)); s.testConfirm();
  }
  s.levelUpActive = false; s.physics.world.isPaused = false;
  assert.equal(s.getUmbraSelectedFinalId(id), choice);
  return f;
}
function castAt(s, x = 100, y = 0) {
  const rt = s.umbraBloodSpikeRuntime;
  return s.createUmbraBloodSpikeCast({ position: { x, y }, record: { lifeId: "placement" } });
}
function impact(s, cast) { s.umbraBloodSpikeRuntime.combatTimeMs = cast.impactDueAtMs; s.applyUmbraBloodSpikeImpact(cast); }
function field(s, id, x = 100, y = 0, extra = {}) {
  const rt = s.getUmbraControlOwner(id), stats = s[id === M ? "getUmbraMoonlightEffectiveStats" : id === B ? "getUmbraBloodSpikeEffectiveStats" : "getUmbraPhantomNovaEffectiveStats"]();
  return s.createUmbraFinalField(id, rt, { x, y }, stats.coreProfile, stats.finalProfile || stats.deployedFinalProfile,
    { radius: 160, ...extra });
}

test("SPIKE PRISM uses first success point, excludes all main attempts, waits for full main loop, and never recurses", () => {
  const f = final(spikeFixture(), B), s = f.scene;
  // Preserve the pre-existing main/branch roles after S8 radius160 -> 240.
  const edge = f.add(340), center = f.add(100), rejectedMain = f.add(320), secondary = f.add(430), secondary2 = f.add(450), far = f.add(580);
  rejectedMain.supportDamageHoldUntil = 2000; f.enemies.push(secondary);
  const mainAtSecondary = [];
  s.onUmbraFinalSecondaryAcceptedHit = hit => { mainAtSecondary.push({ hit, main: f.hits.length }); };
  const cast = castAt(s); impact(s, cast);
  assert.equal(edge.hp, 94); assert.equal(center.hp, 94); assert.equal(rejectedMain.hp, 100);
  assert.equal(secondary.hp, 98); assert.equal(secondary2.hp, 98); assert.equal(far.hp, 100);
  assert.equal(f.calls.filter(c => c.e === secondary).length, 1);
  assert.equal(cast.attempted.size, 3); assert.equal(s.umbraBloodSpikeRuntime.counts.accepted, 2);
  assert.equal(mainAtSecondary.length, 2); assert.ok(mainAtSecondary.every(x => x.main === 2 && x.hit.secondaryDepth === 1 && x.hit.budget === 2));
  assert.equal(mainAtSecondary[0].hit.sourcePosition.x, 330); // surface, not cast center 100
  assert.equal(s.umbraBloodSpikeRuntime.finalState.counts.secondaryAttempts, 2);
  s.applyUmbraBloodSpikeImpact(cast); assert.equal(f.calls.length, 5);
});

test("PRISM reserves empty ICD, consumes blocked parents and never refills a rejected/invalid secondary slot", () => {
  const f = final(novaFixture(), N), s = f.scene, rt = s.umbraPhantomNovaRuntime;
  const stats = s.getUmbraPhantomNovaEffectiveStats(), profile = stats.orbitFinalProfile;
  const reserve = parent => s.reserveUmbraFinalDispatch(N, rt, parent, { x: 0, y: 0 }, stats.coreProfile, profile);
  const a = { id: "pulse-a", attempted: new Set(), consumed: false };
  s.dispatchUmbraFinalSecondary(reserve(a)); assert.equal(rt.finalState.prismNextAtMs, 500);
  assert.equal(reserve(a), null);
  const blocked = { id: "pulse-b", attempted: new Set(), consumed: false };
  assert.equal(reserve(blocked), null); rt.combatTimeMs = 500; assert.equal(reserve(blocked), null);
  assert.equal(rt.finalState.prismNextAtMs, 500);
  const near = f.add(30), far = f.add(60); const receiver = s.applyDamageToEnemy;
  s.applyDamageToEnemy = (e, ...args) => e === near ? undefined : receiver.call(s, e, ...args);
  s.dispatchUmbraFinalSecondary(reserve({ id: "pulse-c", attempted: new Set(), consumed: false }));
  assert.equal(near.hp, 1000); assert.equal(far.hp, 1000); assert.equal(rt.finalState.counts.secondaryRejected, 1);
  assert.equal(rt.finalState.prismNextAtMs, 1000);
});

test("all rejected SPIKE mains produce zero Final; lethal first main branches from immutable hit position", () => {
  const f = final(spikeFixture(), B), s = f.scene, main = f.add(340), secondary = f.add(430);
  main.supportDamageHoldUntil = 2000; const rejected = castAt(s); impact(s, rejected);
  assert.equal(s.umbraBloodSpikeRuntime.finalState, undefined); assert.equal(secondary.hp, 100);
  main.supportDamageHoldUntil = 0; main.hp = 1;
  const killed = castAt(s); impact(s, killed); assert.equal(main.killCalls, 1); assert.equal(secondary.hp, 98);
  assert.equal(s.umbraBloodSpikeRuntime.finalState.counts.secondaryAccepted, 1);
});

test("secondary callback stop/Depth/owner replacement aborts later candidates synchronously", () => {
  for (const transition of [s => { s.drivePaused = true; }, s => { s.stageDepth++; }, s => { s.destroyUmbraBloodSpikeRuntime(); }]) {
    const f = final(spikeFixture(), B), s = f.scene; f.add(340); const a = f.add(430), b = f.add(450);
    s.onUmbraFinalSecondaryAcceptedHit = () => transition(s);
    impact(s, castAt(s)); assert.equal(a.hp, 98); assert.equal(b.hp, 100);
  }
});

test("Moon main attempted life is excluded across one boost; branch is after all main receivers and one attempt only", () => {
  const f = final(moonFixture(), M), s = f.scene;
  const main = f.add(0, 50), laterMain = f.add(100, 50), secondary = f.add(0, 145), outside = f.add(0, 500);
  s.onUmbraFinalSecondaryAcceptedHit = () => assert.equal(f.count(), 2);
  f.step(200);
  assert.equal(main.hp, 85); assert.equal(laterMain.hp, 85); assert.equal(secondary.hp, 95); assert.equal(outside.hp, 100);
  const rt = s.umbraMoonlightRuntime, parent = rt.finalState.moonParent;
  assert.equal(parent.attempted.size, 2); assert.equal(parent.consumed, true);
  const secondaryHits = rt.finalState.counts.secondaryAccepted;
  f.step(-200, 0, { dt: 700 }); f.step(200, 0, { dt: 700 });
  assert.equal(rt.finalState.counts.secondaryAccepted, secondaryHits);
});

test("EXECUTION SPIKE evaluates pre-impact HP and one-round Assault raw; old cast profile is unchanged", () => {
  const f = final(spikeFixture(), B, "execution"), s = f.scene;
  s.stats.bulletDamage = 2; const high = f.add(100), low = f.add(140);
  high.maxHp = 30; high.hp = 30; low.maxHp = 30; low.hp = 15;
  const cast = castAt(s); assert.equal(cast.finalProfile.addedRaw, 6);
  s.stats.bulletDamage = 10; impact(s, cast);
  assert.equal(high.hp, 21); assert.equal(low.hp, 7); // 6*1.25*1.25=9; 6*1.25=8
  assert.ok(f.calls.every(c => c.impact === null)); assert.equal(cast.finalProfile.addedRaw, 6);
});

test("throwing Moon cosmetic callback consumes dispatch and cannot leave an attack for a later physical step", () => {
  const f = final(moonFixture(), M), s = f.scene; f.add(0, 50); const secondary = f.add(0, 145);
  s.onUmbraMoonlightAcceptedHit = () => { throw new Error("test cosmetic consumer failure"); };
  f.step(200); const rt = s.umbraMoonlightRuntime;
  assert.equal(rt.errors, 1); assert.equal(rt.finalState.moonParent.pending, null); assert.equal(rt.finalState.moonParent.consumed, true);
  s.onUmbraMoonlightAcceptedHit = () => {}; f.step(300, 0, { valid: false }); assert.equal(secondary.hp, 100);
});

test("old pre-Final cast snapshot never acquires newly selected Final", () => {
  const f = final(spikeFixture(), B), s = f.scene, enemy = f.add(100), secondary = f.add(430);
  const stats = s.getUmbraBloodSpikeEffectiveStats, profile = stats.call(s);
  s.getUmbraBloodSpikeEffectiveStats = () => ({ ...profile, finalProfile: null });
  const old = castAt(s); s.getUmbraBloodSpikeEffectiveStats = stats; impact(s, old);
  assert.equal(enemy.hp, 94); assert.equal(secondary.hp, 100); assert.equal(s.umbraBloodSpikeRuntime.finalState, undefined);
});

test("SPIKE Singularity is no-damage, starts at impact, survives angle expiry, fixes geometry and caps two without replacement", () => {
  const f = final(spikeFixture(), B, "singularity", "control"), s = f.scene, enemy = f.add(100);
  const cast = castAt(s); impact(s, cast); const rt = s.umbraBloodSpikeRuntime, first = [...rt.finalState.fields.values()][0];
  assert.equal(cast.radius, 240); // Main impact grows; Singularity keeps its existing independent 200px cap.
  assert.equal(first.createdAtMs, 200); assert.equal(first.expiresAtMs, 1200); assert.equal(first.radius, 200);
  for (const key of ["radius", "position", "coreProfile", "finalProfile", "createdAtMs", "expiresAtMs"]) {
    assert.equal(Object.getOwnPropertyDescriptor(first, key).writable, false);
  }
  assert.equal(enemy.hp, 95); assert.equal(s.getUmbraControlSpeedMultiplier(enemy), .75);
  rt.combatTimeMs = 800; s.updateUmbraFinalFields(B, rt); assert.equal(s.getUmbraControlSpeedMultiplier(enemy), .85);
  assert.equal(field(s, B, 200).expiresAtMs, 1800); assert.equal(field(s, B, 300), null);
  assert.equal(rt.finalState.fields.get(first.fieldId), first); assert.equal(first.position.x, 100);
  rt.combatTimeMs = 1199.999; assert.equal(s.getUmbraControlSpeedMultiplier(enemy), .85);
  rt.combatTimeMs = 1200; s.updateUmbraFinalFields(B, rt); assert.equal(rt.finalState.fields.has(first.fieldId), false);
  assert.equal(enemy.hp, 95); assert.equal(f.calls.length, 1);
});

test("field membership picks nearest six, replaces only its subowner, preserves main Control and immediate protection guard", () => {
  const f = final(spikeFixture(), B, "singularity", "control"), s = f.scene, enemies = Array.from({ length: 9 }, (_, i) => f.add(100 + i * 10));
  const rt = s.umbraBloodSpikeRuntime, a = field(s, B), b = field(s, B, 180);
  assert.equal(a.members.size, 6); assert.equal(b.members.size, 6);
  assert.ok(!a.members.has(enemies[8])); assert.ok(b.members.has(enemies[8]));
  const e = enemies[0], life = rt.targets.get(e), profile = s.getUmbraBloodSpikeEffectiveStats().coreProfile;
  s.applyUmbraControlHit(B, rt, e, life, profile, "main-control");
  f.move(e, 1000, 0); rt.combatTimeMs = 99; s.updateUmbraFinalFields(B, rt); assert.ok(a.members.has(e));
  rt.combatTimeMs = 100; s.updateUmbraFinalFields(B, rt); assert.ok(!a.members.has(e)); assert.equal(s.getUmbraControlSpeedMultiplier(e), .75);
  e.supportDamageHoldUntil = 2000; assert.equal(s.getUmbraFinalFieldSpeedMultiplier(B, rt, enemies[2]), .85);
  enemies[2].supportDamageHoldUntil = 2000; assert.equal(s.getUmbraFinalFieldSpeedMultiplier(B, rt, enemies[2]), 1);
  enemies[2].supportDamageHoldUntil = 0; enemies[2].isFinalBossRaidMinion = true;
  assert.equal(s.getUmbraFinalFieldSpeedMultiplier(B, rt, enemies[2]), 1);
  assert.equal(f.calls.length, 0);
});

test("field read-only getter, local owner clock, pause holding, exit invalidation and no legacy slow multiplication", () => {
  const f = final(spikeFixture(), B, "singularity"), s = f.scene, e = f.add(100), rt = s.umbraBloodSpikeRuntime;
  const a = field(s, B); const before = plain(s.getUmbraFinalSnapshot());
  s.drivePaused = true;
  for (let i = 0; i < 20; i++) { assert.equal(s.getUmbraControlSpeedMultiplier(e), .85); s.getUmbraFinalVisualState(); }
  assert.deepEqual(plain(s.getUmbraFinalSnapshot()), before);
  s.getEnemyLostArmsSlowMultiplier = () => .5; s.getEnemyCleaningRobotSlowMultiplier = () => 1; s.getEnemySkillMutationSlowMultiplier = () => 1;
  assert.equal(s.getEnemySpeedMultiplier(e), .5);
  s.drivePaused = false; s.bloodSpikeAttackEnabled = false; s.events.emit("preupdate");
  assert.equal(rt.finalState.fields.size, 0); assert.equal(a.members.size, 0); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
});

test("NOVA Singularity follows committed DEP half-open lifetime and three slots; Depth clears fields but preserves regen debt", () => {
  const f = final(novaFixture(), N, "singularity"), s = f.scene, rt = s.umbraPhantomNovaRuntime;
  f.deploy(0, 0);
  f.tick(800); f.deploy(200, 0);
  f.tick(800); f.deploy(400, 0);
  assert.equal(rt.finalState.fields.size, 3); assert.equal(rt.counts.deployed, 3); assert.equal(f.calls.length, 0);
  for (const a of rt.finalState.fields.values()) assert.equal(a.expiresAtMs, rt.slots.find(slot => slot.slotId === a.slotId).deployedUntilMs);
  const until = rt.slots[0].deployedUntilMs, regen = rt.slots[0].deployedSnapshot.regenerationMs;
  s.stageDepth++; s.prepareUmbraPhantomNovaFrame(); s.pruneUmbraFinalFields(N, rt);
  assert.equal(rt.finalState.fields.size, 0); assert.equal(rt.slots[0].regenerateAtMs, until + regen);
  assert.equal(rt.slots[0].state, "REGENERATING"); assert.equal(f.calls.length, 0);
});

test("Moon Singularity starts at owner step end (not sweep fraction), ICD/parent survive pause and notification OFF clears owned fields", () => {
  const f = final(moonFixture(), M, "singularity"), s = f.scene; f.add(0, 50);
  f.step(200, 0, { dt: 200 }); const rt = s.umbraMoonlightRuntime, a = [...rt.finalState.fields.values()][0];
  assert.equal(a.createdAtMs, 200); assert.equal(a.expiresAtMs, 800); assert.equal(rt.finalState.fieldNextAtMs, 950);
  assert.ok(f.hits[0].combatTimeMs < 200); const parent = rt.finalState.moonParent;
  s.drivePaused = true; f.step(-200, 0, { dt: 500 }); assert.equal(rt.combatTimeMs, 200);
  assert.equal(rt.finalState.moonParent, parent); assert.equal(rt.finalState.fields.size, 1);
  s.drivePaused = false; s.verificationContext = { ...s.verificationContext, traceNotifications: false };
  s.events.emit("preupdate"); assert.equal(rt.finalState.fields.size, 0); assert.equal(rt.finalState.fieldNextAtMs, 950);
});

test("fields observe current rectangle surface/LOS, duplicate lives once and old body/protection never linger", () => {
  const f = final(spikeFixture(), B, "singularity"), s = f.scene, rt = s.umbraBloodSpikeRuntime;
  const blocked = f.add(200, 0), rect = f.add(290, 40), duplicate = f.add(100, 20);
  Object.assign(rect.body, { isCircle: false, width: 80, height: 20, position: { x: 250, y: 30 } });
  f.enemies.push(duplicate); s.walls = { getChildren: () => [{ body: { enable: true, left: 170, right: 175, top: -10, bottom: 10 } }] };
  const a = field(s, B); assert.equal(a.members.has(blocked), false); assert.equal(a.members.has(rect), true); assert.equal(a.members.size, 2);
  const oldBody = duplicate.body; duplicate.body = { ...oldBody }; assert.equal(s.getUmbraControlSpeedMultiplier(duplicate), 1);
  duplicate.body = oldBody; s.registerUmbraBloodSpikeEnemyLife(duplicate); assert.equal(s.getUmbraControlSpeedMultiplier(duplicate), 1);
  assert.equal(f.calls.length, 0);
});

test("field physical timelines 30/60/120 Hz expire without replay at half-open deadline and membership stays bounded", () => {
  for (const hz of [30, 60, 120]) {
    const f = final(spikeFixture(), B, "singularity"), s = f.scene, rt = s.umbraBloodSpikeRuntime;
    for (let i = 0; i < 12; i++) f.add(100 + i);
    const a = field(s, B); for (let i = 1; i <= hz; i++) { rt.combatTimeMs = i * 1000 / hz; s.updateUmbraFinalFields(B, rt); }
    assert.equal(rt.finalState.fields.size, 0); assert.equal(a.members.size, 0);
    assert.equal(rt.finalState.counts.membershipUpdates, 10); assert.equal(rt.finalState.counts.maxMembers, 6); assert.equal(f.calls.length, 0);
  }
});

test("NOVA PRISM all slots consume their own pulse attempts but share one 500ms deadline across Core/Fire/pause", () => {
  const f = final(novaFixture(), N, "prism", "reactor"), s = f.scene, rt = s.umbraPhantomNovaRuntime;
  f.add(0, 0); f.add(20, 0); f.add(40, 0); f.tick(900);
  assert.equal(rt.counts.accepted, 3); assert.equal(rt.finalState.counts.dispatchAttempts, 3);
  assert.equal(rt.finalState.counts.dispatches, 1); assert.equal(rt.finalState.prismNextAtMs, 1400);
  const count = rt.finalState.counts.secondaryAccepted; assert.equal(count, 1);
  s.drivePaused = true; f.tick(500); assert.equal(rt.combatTimeMs, 900); assert.equal(rt.finalState.prismNextAtMs, 1400);
  s.drivePaused = false; s.stats.fireInterval = 60; s.applySkillStage(s.playerSkills[N]);
  assert.equal(rt.finalState.prismNextAtMs, 1400); assert.equal(rt.finalState.counts.secondaryAccepted, count);
});

test("secondary never applies CONTROL and invalidated selected life is skipped without refilling its budget", () => {
  const f = final(spikeFixture(), B, "prism", "control"), s = f.scene, rt = s.umbraBloodSpikeRuntime;
  const main = f.add(340), a = f.add(430), b = f.add(450), reserve = f.add(460);
  s.onUmbraFinalSecondaryAcceptedHit = () => s.registerUmbraBloodSpikeEnemyLife(b);
  impact(s, castAt(s));
  assert.equal(s.getUmbraControlSpeedMultiplier(main), .75); assert.equal(s.getUmbraControlSpeedMultiplier(a), 1);
  assert.equal(a.hp, 98); assert.equal(b.hp, 100); assert.equal(reserve.hp, 100);
  assert.equal(rt.finalState.counts.secondaryAttempts, 1); assert.equal(rt.finalState.skips.SECONDARY_TARGET_CHANGED, 1);
  assert.equal(rt.controlContributions.size, 1);
});
