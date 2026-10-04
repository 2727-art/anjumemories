"use strict";
// Real production lifecycle helpers on controlled numeric bodies. These tests
// do not stand in for actual Gate UI, Phaser shutdown, or natural progression.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-normal-context.test.cjs"), content = fs.readFileSync(filename, "utf8");
const fixtureModule = new Module(filename, module); fixtureModule.filename = filename; fixtureModule.paths = Module._nodeModulePaths(__dirname);
fixtureModule._compile(content.slice(0, content.indexOf('\ntest("')) + "\nmodule.exports = fixture;", filename);
const fixture = fixtureModule.exports, ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"];
function active(all = true) {
  const f = fixture({ equipped: true }), s = f.scene;
  s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  if (all) { s.unlockSkill(ids[1]); s.unlockSkill(ids[2]); }
  return f;
}
function runtimes(s) { return [s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, s.umbraPhantomNovaRuntime]; }
function registerAll(s, enemy) { s.registerUmbraMoonlightEnemyLife(enemy); s.registerUmbraBloodSpikeEnemyLife(enemy); s.registerUmbraPhantomNovaEnemyLife(enemy); }
function cross(s, transition) {
  const ticket = s.captureUmbraGateSurvivors(transition);
  s.stageDepth = transition.targetDepth;
  return { ticket, result: s.adoptUmbraGateSurvivors(ticket) };
}

test("normal repeated life registration and shape configuration preserve all three life IDs", () => {
  const f = active(), s = f.scene, enemy = f.add(); registerAll(s, enemy);
  const before = runtimes(s).map(r => r.targets.get(enemy));
  const life = s.getUmbraNormalEnemyLife(enemy);
  enemy.body.width *= 2; enemy.body.height *= 2;
  registerAll(s, enemy);
  runtimes(s).forEach((runtime, index) => { assert.equal(runtime.targets.get(enemy), before[index]); assert.equal(before[index].normalLife, life); });
  s.getUmbraNormalEnemyLife(enemy, { spawn: true }); registerAll(s, enemy);
  runtimes(s).forEach((runtime, index) => assert.notEqual(runtime.targets.get(enemy).lifeId, before[index].lifeId));
});

test("explicit Depth adoption preserves same life and combat clocks, consumes old path and rejects near-position free hits", () => {
  const f = active(), s = f.scene, enemy = f.add(-200, 50); registerAll(s, enemy);
  f.step(-199); assert.equal(f.count(), 1);
  const records = runtimes(s).map(r => r.targets.get(enemy)), clocks = runtimes(s).map(r => r.combatTimeMs);
  const hit = records[0].lastHitAt, transition = { completedDepth: 1, targetDepth: 2, mode: "next" };
  const { ticket, result } = cross(s, transition);
  assert.equal(result.adopted.length, 1); assert.equal(result.rejected.length, 0);
  runtimes(s).forEach((runtime, i) => { assert.equal(runtime.targets.get(enemy), records[i]); assert.equal(runtime.combatTimeMs, clocks[i]); });
  assert.equal(records[0].lastHitAt, hit); assert.equal(records[0].initialEligible, false); assert.equal(records[0].armed, false);
  s.updateUmbraNormalRunState(); f.step(-198); assert.equal(f.count(), 1);
  assert.equal(s.adoptUmbraGateSurvivors(ticket), null); assert.equal(s.captureUmbraGateSurvivors(transition), null);
  assert.equal(s.snapshotUmbraBloodSpikeEnemy(enemy).reason, ""); assert.equal(s.snapshotUmbraPhantomNovaEnemy(enemy).reason, "");
});

test("Depth adoption keeps Moon rehit debt; elapsed cooldown alone inside does not create a new pass", () => {
  const f = active(false), s = f.scene, enemy = f.add(); f.step(0); assert.equal(f.count(), 1);
  const record = s.umbraMoonlightRuntime.targets.get(enemy), hit = record.lastHitAt;
  cross(s, { completedDepth: 1, targetDepth: 2, mode: "next" }); s.updateUmbraNormalRunState();
  f.step(-200, 0, { dt: 10 }); f.step(0, 0, { dt: 10 });
  assert.equal(f.count(), 1); assert.equal(record.lastHitAt, hit);
  assert.ok(s.umbraMoonlightRuntime.skips.REHIT_WAIT > 0);
  f.step(1, 0, { dt: 1000 }); assert.equal(f.count(), 1);
  f.step(-200); f.step(0); assert.equal(f.count(), 2);
});

test("dead, replaced body, reused life and removed enemies are never adopted", () => {
  const f = active(), s = f.scene, enemies = Array.from({length: 4}, () => f.add()); enemies.forEach(e => registerAll(s, e));
  const transition = { targetDepth: 2 }, ticket = s.captureUmbraGateSurvivors(transition);
  enemies[0].isDying = true; enemies[0].hp = 0;
  enemies[1].body = { ...enemies[1].body };
  s.getUmbraNormalEnemyLife(enemies[2], { spawn: true }); registerAll(s, enemies[2]);
  f.enemies.splice(f.enemies.indexOf(enemies[3]), 1);
  s.stageDepth = 2; const result = s.adoptUmbraGateSurvivors(ticket);
  assert.equal(result.adopted.length, 0); assert.equal(result.rejected.length, 4);
  runtimes(s).forEach(runtime => assert.equal(runtime.targets.size, 0));
});

test("Depth clears Spike casts and fields; Nova deployed residual plus captured regen is carried exactly once", () => {
  const f = active(), s = f.scene, spike = s.umbraBloodSpikeRuntime, nova = s.umbraPhantomNovaRuntime;
  spike.casts.push({ castId: "old-depth" }); spike.combatTimeMs = 400;
  nova.combatTimeMs = 400; const slot = nova.slots[0];
  Object.assign(slot, { state: "DEPLOYED", deployedUntilMs: 1700, deployedSnapshot: { regenerationMs: 900 }, position: {x:0,y:0} });
  const transition = { targetDepth: 2 }, { ticket } = cross(s, transition);
  assert.equal(spike.casts.length, 0); assert.equal(slot.state, "REGENERATING"); assert.equal(slot.regenerateAtMs, 2600);
  assert.equal(slot.regenerateAtMs - nova.combatTimeMs, 2200); assert.equal(slot.position, null);
  s.adoptUmbraGateSurvivors(ticket); assert.equal(slot.regenerateAtMs, 2600);
});

test("end snapshots numeric state before owner cleanup, releases all runtimes, and is idempotent", () => {
  const f = active(), s = f.scene; f.add();
  s.umbraMoonlightRuntime.counts.accepted = 9; s.umbraBloodSpikeRuntime.counts.casts = 4;
  const snapshot = s.endUmbraNormalRun("TEST_EXTRACT");
  assert.equal(snapshot.skills.length, 3); assert.equal(snapshot.attacks[0].counts.accepted, 9); assert.equal(snapshot.attacks[1].counts.casts, 4);
  assert.equal(snapshot.equipment.qualification.overlimitCap, 2); assert.ok(Object.isFrozen(snapshot.skills[0]));
  assert.equal(snapshot.maxAp, 134); assert.equal(snapshot.maxEn, 165);
  assert.equal(s.umbraRunContext.state, "ENDED"); assert.equal(s.umbraGrowthRun.closed, true);
  assert.equal(s.umbraBoostTrace, null); runtimes(s).forEach(runtime => assert.equal(runtime, null));
  assert.equal(s.endUmbraNormalRun("AGAIN"), snapshot);
  const types = f.events.map(e => e.type);
  assert.ok(types.indexOf("umbra-end-snapshot") < types.indexOf("umbra-end-cleanup-start"));
  assert.equal(types.filter(t => t === "umbra-end-snapshot").length, 1);
  assert.equal(s.upgradeSkill(ids[0]), false);
});
