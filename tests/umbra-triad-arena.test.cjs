"use strict";

// Reuse the existing presentation-only fixture without running or changing
// its historical tests. No production calculation is replaced by these tests.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const fixtureSource = fs.readFileSync(path.join(__dirname, "umbra-phantomnova-arena.test.cjs"), "utf8");
const fixtureEnd = fixtureSource.indexOf("\ntest(");
assert.ok(fixtureEnd > 0);
const fixtureContext = vm.createContext({ require, __dirname, console });
vm.runInContext(fixtureSource.slice(0, fixtureEnd)
  .replace("final = false }", "final = false, triad = false }")
  .replace("umbraFinal: final }", "umbraFinal: final, umbraTriad: triad }")
  + "\nglobalThis.makeArenaFixture = fixture;", fixtureContext);
const ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"];
const plain = value => JSON.parse(JSON.stringify(value));
const snapshot = (revision = 0) => ({ revision, reason: "TEST", selections: {}, targetSkillIds: ids,
  selectedCounts: { core: 0, final: 0 }, core: { type: "standby", level: 0 }, final: { type: "standby", level: 0 },
  modifiers: { skillDamageMultiplier: 1, executionDamageMultiplier: 1, prismDamageMultiplier: 1,
    controlMultiplier: 1, singularityMultiplier: 1, dashStaminaDrainMultiplier: 1, overdriveGaugeMultiplier: 1, robotSyncGaugeMultiplier: 1 } });

function fixture(triad = true) {
  const f = fixtureContext.makeArenaFixture({ growth: true, core: true, final: true, triad }), s = f.scene;
  s.triadView = snapshot(); s.getUmbraTriadSnapshot = () => s.triadView;
  s.destroyUmbraTriadRun = reason => { s.endCalls ||= []; s.endCalls.push({ reason, run: s.umbraGrowthRun }); s.umbraTriadEndSnapshot = s.triadView; s.triadView = null; };
  s.getUmbraActiveSkillStage = id => s.playerSkills[id] ? { stage: s.playerSkills[id].stageIndex + 1 } : null;
  s.getUmbraSelectedCoreId = s.getUmbraSelectedFinalId = () => null;
  s.getActiveDropObjects = () => [];
  return f;
}

test("TRIAD controls require the explicit entry and reset recommended stages without selecting a Core or Final", () => {
  const old = fixture(false);
  assert.equal(old.arena.triadInfo, undefined); assert.equal(old.arena.setTriadComparison("mixed"), false);
  const f = fixture(), s = f.scene, a = f.arena, events = [];
  s.initializeUmbraGrowthRun = () => { s.umbraGrowthRun = {}; s.playerSkills = { umbraMoonlight: { id: ids[0], stageIndex: 0 } }; };
  s.isUmbraGrowthContextActive = () => s.mechId === "umbraSeraph";
  s.unlockSkill = id => { s.playerSkills[id] = { id, stageIndex: 0 }; };
  s.applySkillStage = state => events.push(`stage:${state.id}:${state.stageIndex + 1}`);
  s.syncUmbraCoreMilestones = () => events.push("milestones");
  s.initializeUmbraTriadRun = () => { events.push("triad-init"); s.triadView = snapshot(); };
  for (const [id, stages] of [["moon_s1", [1, 8, 8]], ["spike_s1", [8, 1, 8]], ["nova_s1", [8, 8, 1]], ["reactor", [4, 4, 4]], ["two_one", [8, 8, 8]]]) {
    events.length = 0; const before = f.calls.reset;
    assert.equal(a.setTriadComparison(id), true); assert.equal(f.calls.reset, before + 1);
    a.afterDriveReset();
    assert.deepEqual(ids.map(id => s.playerSkills[id].stageIndex + 1), stages);
    assert.equal(events.at(-1), "triad-init"); assert.equal(s.skillMutationState, undefined, "Presentation never selects mutation entries");
    assert.equal(s.verificationContext.triadEnabled, true);
  }
  a.resetGrowthPreset(8); assert.equal(a.triadComparisonId, null);
  a.setTriadComparison("mixed"); a.setCoreComparisonWeapons("moonlight"); assert.equal(a.triadComparisonId, null);
  assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0);
});

test("TRIAD HUD reads cached axis values and publication notices once without recalculating or awarding anything", () => {
  const f = fixture(), s = f.scene, a = f.arena, objects = f.objects.length;
  s.refreshUmbraTriadSnapshot = () => { throw Error("HUD must not reaggregate"); };
  const first = s.triadView, second = snapshot(1);
  second.core = { type: "link", id: "assault_link", level: 1, displayName: "ASSAULT LINK I" };
  second.selectedCounts.core = 2; second.modifiers.skillDamageMultiplier = 1.04;
  s.triadView = second; s.onUmbraTriadSnapshotChanged(second, first);
  s.onUmbraTriadSnapshotChanged(second, first);
  for (let n = 0; n < 100; n++) a.refreshTriadHud();
  assert.equal(a.triadNoticeCount, 1); assert.equal(f.objects.length, objects);
  assert.match(a.triadInfo.text, /LINK I 2\/3/); assert.match(a.triadInfo.text, /Final STANDBY 0\/3/);
  assert.match(a.triadInfo.text, /主×1\.040/); assert.match(a.triadInfo.text, /umbraMoonlight \/ umbraBloodSpike \/ umbraPhantomNova/);
  s.onUmbraTriadSnapshotChanged({ ...second, revision: 2 }, second); assert.equal(a.triadNoticeCount, 1);
  const captured = plain(second); s.drivePaused = true; s.time.now = 100000; a.refreshTriadHud();
  assert.deepEqual(plain(second), captured); assert.match(a.triadInfo.text, /成立更新/);
  a.elapsedMs = 1400; a.refreshTriadHud(); assert.doesNotMatch(a.triadInfo.text, /成立更新/);
  assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0); assert.equal(f.calls.physicsObjects, 0);
});

test("TRIAD HUD tolerates initial or inactive context with neither a snapshot nor a notice", () => {
  const f = fixture(), s = f.scene, a = f.arena;
  s.triadView = null; a.triadNotice = null;
  a.refreshTriadHud(); assert.match(a.triadInfo.text, /TRIAD \/ 非作動/);
  s.mechId = "defaultBear"; a.refreshTriadHud();
  assert.equal(a.triadNoticeCount, 0); assert.equal(f.calls.reset, 0);
});

test("AP0 TRIAD display reads the end snapshot and cleanup occurs before the growth run is released", () => {
  const f = fixture(), s = f.scene, a = f.arena;
  const run = s.umbraGrowthRun = {}; s.triadView = snapshot(9);
  s.triadView.completeBuild = { displayName: "TRIAD TEST BUILD" };
  s.triggerGameOver();
  s.getUmbraTriadSnapshot = () => { throw Error("Ended HUD must not reauthorize combat"); };
  a.refreshTriadHud(); assert.match(a.triadInfo.text, /終了時 TRIAD完成 TRIAD TEST BUILD \/ rev9/);
  assert.equal(s.endCalls[0].run, run); assert.equal(s.gameOver, true); assert.equal(s.drivePaused, true);
  a.beforeDriveReset(); assert.equal(s.endCalls.at(-1).run, run); assert.equal(s.umbraGrowthRun, null);
});

test("TRIAD field drawing uses each captured corrected radius and never enlarges an old ring when the current revision changes", () => {
  const f = fixture(), s = f.scene, a = f.arena;
  const profile = Object.freeze({ finalId: "singularity", coreId: "control", triadProfile: Object.freeze({ revision: 2, singularityMultiplier: 1.12 }) });
  s.finalView = { owners: [], fields: [{ fieldId: "old", ownerGeneration: 1, position: { x: 600, y: 500 }, radius: 179.2,
    finalProfile: profile, coreProfile: { coreId: "control" } }] };
  a.updateFinalFx(); const fx = a.finalFields.get("old"), commands = plain(fx.object.commands);
  s.triadView = snapshot(5); a.refreshTriadHud(); a.updateFinalFx();
  assert.equal(a.finalFields.get("old"), fx); assert.deepEqual(plain(fx.object.commands), commands);
  assert.equal(fx.object.commands.find(c => c[0] === "strokeCircle")[3], 179.2);
  assert.equal(fx.finalProfile.triadProfile.revision, 2); assert.equal(f.calls.physicsObjects, 0);
});
