"use strict";
// Bounded production runtime/receiver and actual OVL selection commits, using
// numeric bodies and controlled notifications. These are not browser/Phaser
// timing evidence. The first test explicitly injects a later OVL RAM state in
// a main-hit callback solely to probe the same-dispatch snapshot boundary.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova";
const plain = value => JSON.parse(JSON.stringify(value));
function prefix(name, exports) {
  const file = path.join(__dirname, name), text = fs.readFileSync(file, "utf8"), mod = new Module(file, module);
  mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(text.slice(0, text.indexOf('\ntest("')) + `\nmodule.exports={${exports}};`, file); return mod.exports;
}
const { setup, build, moonFixture, spikeFixture, novaFixture } = prefix("umbra-triad-runtime.test.cjs", "setup,build,moonFixture,spikeFixture,novaFixture");
const { installEquipment, equipmentData } = prefix("umbra-equipment-state.test.cjs", "installEquipment,equipmentData");
function gear(factory) {
  const f = build(setup(factory), ["assault", "assault", "assault"], ["prism", "prism", "prism"]);
  f.storageCalls = 0;
  for (const method of ["loadEquipmentState", "saveEquipmentState", "loadMutationAtlasState", "saveMutationAtlasState"])
    f.scene[method] = () => { f.storageCalls++; assert.fail(`${method} must not be reached`); };
  installEquipment(f, equipmentData("LEGEND", 5, 20));
  assert.equal(f.scene.getUmbraEquipmentSnapshot().overlimitRevision, 0); return f;
}
function commitNormal(s, id) {
  const choice = s.buildEquipmentOverlimitChoice(id, { source: "levelUp" }); assert.ok(choice);
  s.pendingLevelUps = 1; s.startingUpgradeSelectionsRemaining = 0; s.levelUpActive = true;
  // Production select/complete run; the inherited overlay and animation leaves
  // expose the real callback without manufacturing a new world pause/step.
  // Existing pause invalidation belongs to the separate lifecycle/browser test.
  s.showLevelUpCardOverlay("normal", "", [choice], "level");
  s.selectLevelUpCard(0); assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[id], 0);
  s.testConfirm(); assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[id], 1);
  assert.equal(s.pendingLevelUps, 0); assert.equal(s.getUmbraEquipmentSnapshot().selectionCounts.normal, 1);
}

test("same-dispatch SPIKE main callback OVL injection cannot replace the parent's old equipment profile for PRISM", () => {
  const f = gear(spikeFixture), s = f.scene, parent = f.add(340), secondary = f.add(430), runtime = s.umbraBloodSpikeRuntime;
  const cast = s.createUmbraBloodSpikeCast({ position: { x: 100, y: 0 }, record: { lifeId: "placement" } });
  const old = cast.finalProfile.equipmentProfile; assert.equal(old.overlimitLevel, 0);
  let callbackCalls = 0;
  s.onUmbraBloodSpikeAcceptedHit = () => {
    callbackCalls++;
    // Adversarial numeric input, not a card grant or naturally reachable input
    // while the same synchronous physical dispatch is already on the stack.
    s.umbraEquipmentState.overlimitLevels = Object.freeze({ ...s.umbraEquipmentState.overlimitLevels, [B]: 2 });
    s.umbraEquipmentState.overlimitRevision++;
  };
  runtime.combatTimeMs = cast.impactDueAtMs; s.applyUmbraBloodSpikeImpact(cast);
  assert.equal(callbackCalls, 1); assert.equal(s.getUmbraEquipmentCombatProfile(B).overlimitLevel, 2);
  const hit = runtime.finalState.history[0]; assert.ok(hit); assert.equal(hit.finalProfile, cast.finalProfile);
  assert.equal(hit.finalProfile.equipmentProfile, old); assert.equal(hit.finalProfile.equipmentProfile.overlimitRevision, 0);
  assert.equal(hit.rawDamage, 3); assert.equal(hit.equipmentDamage, 4);
  assert.equal(s.getUmbraEquipmentDamageBreakdown(hit.rawDamage, s.getUmbraEquipmentCombatProfile(B)).equipmentRaw, 6);
  assert.equal(parent.hp, 90); assert.equal(secondary.hp, 96);
  assert.equal(f.calls.filter(call => call.e === secondary).length, 1); assert.ok(f.calls.every(call => call.impact === null));
  assert.equal(f.storageCalls, 0);
});

test("real Moon OVL commit preserves life/pass/lastHit/cursor, boost parent and ICD without creating a hit", () => {
  const f = gear(moonFixture), s = f.scene, enemy = f.add(0, 50); f.add(0, 145); f.step(200);
  const runtime = s.umbraMoonlightRuntime, record = runtime.targets.get(enemy), parent = runtime.finalState.moonParent;
  assert.ok(record.lastHitAt !== null); assert.ok(parent.consumed); assert.ok(runtime.finalState.prismNextAtMs > 0);
  const before = plain(record), cursor = record.cursor, history = [...runtime.hitHistory], trace = s.umbraBoostTrace;
  const finalState = runtime.finalState, parentSnapshot = { ...parent, attempted: [...parent.attempted] };
  const deadline = finalState.prismNextAtMs, count = f.count(), receiverCount = f.receivers.length, triadRevision = s.umbraTriadState.revision;
  commitNormal(s, M);
  assert.equal(s.umbraMoonlightRuntime, runtime); assert.equal(s.umbraBoostTrace, trace);
  assert.deepEqual(plain(record), before); assert.equal(record.cursor, cursor);
  assert.equal(runtime.hitHistory.length, history.length); assert.ok(runtime.hitHistory.every((hit, index) => hit === history[index]));
  assert.equal(runtime.finalState, finalState); assert.equal(finalState.moonParent, parent);
  assert.deepEqual({ ...parent, attempted: [...parent.attempted] }, parentSnapshot); assert.equal(finalState.prismNextAtMs, deadline);
  assert.equal(f.count(), count); assert.equal(f.receivers.length, receiverCount); assert.equal(s.umbraTriadState.revision, triadRevision);
  assert.equal(runtime.hitHistory[0].finalProfile.equipmentProfile.overlimitLevel, 0);
  assert.equal(s.getUmbraSkillFinalProfile(M).equipmentProfile.overlimitLevel, 1); assert.equal(f.storageCalls, 0);
});

test("real Nova OVL commit while REGENERATING preserves every slot/deadline, old DEP and pending deployment reservation", () => {
  const f = gear(novaFixture), s = f.scene, runtime = s.umbraPhantomNovaRuntime;
  f.deploy(0, 0); f.tick(800); f.deploy(200, 0); f.tick(2190);
  assert.equal(runtime.combatTimeMs, 3010);
  assert.equal(runtime.slots.filter(slot => slot.state === "REGENERATING").length, 1);
  assert.equal(runtime.slots.filter(slot => slot.state === "DEPLOYED").length, 1);
  f.start(400, 0); const reservation = runtime.reservation; assert.ok(reservation);
  const slots = [...runtime.slots], before = plain(slots), reservationBefore = plain(reservation);
  const deployed = slots.find(slot => slot.state === "DEPLOYED"), oldProfile = deployed.deployedSnapshot.finalProfile;
  const clocks = [runtime.combatTimeMs, runtime.lastDeployAtMs, runtime.lastPhysicalStep], counts = plain(runtime.counts);
  const listenerCount = f.world.listenerCount("worldstep"), triadRevision = s.umbraTriadState.revision;
  commitNormal(s, N);
  assert.equal(s.umbraPhantomNovaRuntime, runtime); assert.deepEqual(plain(runtime.slots), before);
  assert.ok(runtime.slots.every((slot, index) => slot === slots[index])); assert.equal(runtime.reservation, reservation);
  assert.deepEqual(plain(reservation), reservationBefore); assert.equal(deployed.deployedSnapshot.finalProfile, oldProfile);
  assert.equal(oldProfile.equipmentProfile.overlimitLevel, 0);
  assert.deepEqual([runtime.combatTimeMs, runtime.lastDeployAtMs, runtime.lastPhysicalStep], clocks);
  assert.deepEqual(plain(runtime.counts), counts); assert.equal(f.world.listenerCount("worldstep"), listenerCount);
  assert.equal(s.umbraTriadState.revision, triadRevision);
  f.physical(); f.tick(10);
  const next = runtime.slots.find(slot => slot.position?.x === 400 && slot.state === "DEPLOYED");
  assert.ok(next); assert.equal(next.deployedSnapshot.finalProfile.equipmentProfile.overlimitLevel, 1);
  assert.equal(deployed.deployedSnapshot.finalProfile.equipmentProfile.overlimitLevel, 0);
  assert.equal(runtime.slots.find(slot => slot.state === "REGENERATING").regenerateAtMs, 4210);
  assert.equal(f.calls.length, 0); assert.equal(f.storageCalls, 0);
});
