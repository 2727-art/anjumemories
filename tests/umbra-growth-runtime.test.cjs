"use strict";
// Reuse the pre-existing numeric-body fixtures, exercising the live production
// prototype. These explicit notifications are separate from the Phaser browser tests.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const plain = value => JSON.parse(JSON.stringify(value));
function existingFixture(file) {
  const filename = path.join(__dirname, file), content = fs.readFileSync(filename, "utf8");
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(content.slice(0, content.indexOf('\ntest("')) + "\nmodule.exports = fixture;", filename);
  return mod.exports;
}
const moonFixture = existingFixture("umbra-moonlight-history.test.cjs");
const spikeFixture = existingFixture("umbra-bloodspike-runtime.test.cjs");
const novaFixture = existingFixture("umbra-nova-runtime.test.cjs");
function growth(f, acquire = []) {
  const s = f.scene;
  s.destroyUmbraMoonlightRuntime(); s.destroyUmbraBloodSpikeRuntime(); s.destroyUmbraPhantomNovaRuntime();
  s.isUmbraPhase2ADrive = true; s.sys = { settings: { key: "UmbraPhase2ADrive" } };
  s.verificationContext = Object.freeze({ ...s.verificationContext, growthEnabled: true,
    moonlightArena: true, bloodSpikeArena: true, phantomNovaArena: true });
  s.updateHud = () => {};
  assert.ok(s.initializeUmbraGrowthRun());
  for (const id of acquire) s.unlockSkill(id);
  return f;
}
function stage(s, id, n) { const state = s.playerSkills[id]; state.stageIndex = n - 1; assert.equal(s.applySkillStage(state), true); return state; }

test("growth authorization is canonical, acquired, owner-bound and pure; invalid indices never become S1", () => {
  const { scene: s } = growth(novaFixture());
  const skill = s.playerSkills.umbraMoonlight, run = s.umbraGrowthRun, runtime = s.umbraMoonlightRuntime;
  const good = () => assert.equal(s.getUmbraActiveSkillStage("umbraMoonlight"), skill.definition.stages[skill.stageIndex]);
  good(); assert.equal(s.getUmbraActiveSkillStage("umbraBloodSpike"), null);
  for (const index of [-1, 8, 1.5, NaN]) { skill.stageIndex = index; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); }
  skill.stageIndex = 0;
  const stage1 = skill.currentStage; skill.currentStage = { ...stage1 };
  assert.equal(s.getUmbraActiveSkillStage(skill.id), null); skill.currentStage = stage1;
  skill.currentStage = skill.definition.stages[3];
  assert.equal(s.applySkillStage(skill), false); assert.equal(skill.currentStage, skill.definition.stages[3]); skill.currentStage = stage1;
  const definition = skill.definition; skill.definition = { ...definition };
  assert.equal(s.getUmbraActiveSkillStage(skill.id), null); skill.definition = definition;
  skill.umbraGrowthRun = { ...run }; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); skill.umbraGrowthRun = run;
  const context = s.verificationContext; s.verificationContext = { ...context };
  assert.equal(s.getUmbraActiveSkillStage(skill.id), null); s.verificationContext = context;
  s.verificationContext = { ...context, growthEnabled: false };
  assert.equal(s.getUmbraMoonlightBlockReason(), "SKILL_INACTIVE"); s.verificationContext = context;
  const player = s.playerHitbox; s.playerHitbox = { body: player.body };
  assert.equal(s.getUmbraActiveSkillStage(skill.id), null); s.playerHitbox = player;
  const body = player.body; player.body = { ...body };
  assert.equal(s.getUmbraActiveSkillStage(skill.id), null); player.body = body;
  player.active = false; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); player.active = true;
  body.enable = false; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); body.enable = true;
  s.driveShuttingDown = true; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); s.driveShuttingDown = false;
  for (const flag of ["gameOver", "extractionComplete", "restartInProgress", "shopActive"]) {
    s[flag] = true; assert.equal(s.getUmbraActiveSkillStage(skill.id), null); s[flag] = false;
  }
  const before = plain({ counts: runtime.counts, milestones: run.deferredMilestones });
  for (let i = 0; i < 20; i++) { good(); s.getUmbraMoonlightEffectiveStats(); }
  assert.deepEqual(plain({ counts: runtime.counts, milestones: run.deferredMilestones }), before);
  assert.equal(s.umbraMoonlightRuntime, runtime);
});

test("Moon damage-only upgrade preserves armed state, enemy cursor and all hit identity", () => {
  for (const startStage of [1, 4]) {
    const f = growth(moonFixture()), s = f.scene, enemy = f.add();
    stage(s, "umbraMoonlight", startStage); f.step(200);
    const rt = s.umbraMoonlightRuntime, record = rt.targets.get(enemy), cursor = record.cursor;
    const before = plain(record), trace = s.umbraBoostTrace, previousRaw = s.getUmbraMoonlightEffectiveStats().rawDamage;
    stage(s, "umbraMoonlight", startStage + 1);
    assert.deepEqual(plain(record), before); assert.equal(record.cursor, cursor); assert.equal(s.umbraBoostTrace, trace);
    assert.equal(rt.hitHistory.length, 1); assert.equal(s.getUmbraMoonlightEffectiveStats().rawDamage, previousRaw + 1);
    const snapshot = plain(record); s.applySkillStage(s.playerSkills.umbraMoonlight);
    assert.deepEqual(plain(record), snapshot);
  }
});

test("Moon radius rebase blocks initial-near/current-pass hits until trusted outside, preserving cursor/warp detection", () => {
  const f = growth(moonFixture()), s = f.scene, enemy = f.add(-200, 65);
  const rt = s.umbraMoonlightRuntime, record = rt.targets.get(enemy), cursor = record.cursor;
  stage(s, "umbraMoonlight", 8);
  assert.equal(record.radiusRebasePending, true); assert.equal(record.initialEligible, false);
  assert.equal(record.cursor, cursor); assert.equal(record.lastHitAt, null);
  f.step(-199); assert.equal(f.count(), 0); assert.equal(record.radiusRebasePending, true);
  f.step(-198, 0, { valid: false, reason: "UNKNOWN_CORRECTION" }); assert.equal(record.radiusRebasePending, true);
  f.step(100, 0, { valid: false, reason: "NORMAL" });
  assert.equal(record.radiusRebasePending, false); assert.equal(f.count(), 0);
  f.step(-200); assert.equal(f.count(), 1);
  const last = record.lastHitAt, pass = record.passId;
  stage(s, "umbraMoonlight", 8); assert.equal(record.lastHitAt, last); assert.equal(record.passId, pass);
  // Establish a cursor, then corrupt the previous target coordinate across a Stage boundary.
  const cursor2 = record.cursor; record.cursor = { x: cursor2.x + 500, y: cursor2.y };
  s.applySkillStage(s.playerSkills.umbraMoonlight);
  f.step(100); assert.ok(s.getUmbraMoonlightSnapshot().skips.TARGET_DISCONTINUITY >= 1);
});

test("Moon old hit time uses latest rehit only on a legitimate re-entry, never attacks at Stage application", () => {
  const f = growth(moonFixture()), s = f.scene; f.add(); f.step(200);
  const count = f.count(), hitAt = s.umbraMoonlightRuntime.hitHistory[0].combatTimeMs;
  stage(s, "umbraMoonlight", 8); assert.equal(f.count(), count);
  f.step(300, 0, { dt: 800 }); f.step(-200);
  assert.equal(f.count(), count + 1); assert.ok(s.getUmbraMoonlightEffectiveStats().rehitMs === 650);
  assert.equal(s.umbraMoonlightRuntime.hitHistory.length, 2);
});

test("Spike upgrade at cast+100 preserves old radius80/impact200 and deadline; next cast alone gets radius240", () => {
  const f = growth(spikeFixture(), ["umbraBloodSpike"]), s = f.scene;
  const anchor = f.add(100), near = f.add(180), far = f.add(255);
  f.tick(10); f.tick(100);
  const rt = s.umbraBloodSpikeRuntime, cast = rt.casts[0], attempted = cast.attempted, before = plain(f.snapshot().casts[0]);
  const next = rt.nextCastAtMs, clock = rt.combatTimeMs, sceneUpdates = rt.sceneUpdates;
  stage(s, "umbraBloodSpike", 8);
  assert.equal(rt.casts[0], cast); assert.equal(cast.attempted, attempted);
  assert.deepEqual(plain(f.snapshot().casts[0]), before); assert.equal(rt.combatTimeMs, clock); assert.equal(rt.sceneUpdates, sceneUpdates);
  assert.equal(rt.nextCastAtMs, next); f.tick(100);
  assert.equal(anchor.hp, 95); assert.equal(near.hp, 95); assert.equal(far.hp, 100);
  f.tick(next - rt.combatTimeMs); assert.equal(rt.casts[0].radius, 240); f.tick(200);
  assert.equal(far.hp, 95); assert.equal(f.calls.filter(c => c.e === far).length, 1);
  assert.equal(s.umbraBloodSpikeRuntime, rt);
});

test("Spike S7 to S8 keeps an existing cast fixed and only the next cast receives giant 240px edge coverage once per life", () => {
  const f = growth(spikeFixture(), ["umbraBloodSpike"]), s = f.scene;
  stage(s, "umbraBloodSpike", 7);
  const anchor = f.add(100), oldEdge = f.add(257), newEdge = f.add(350), outside = f.add(350.01);
  f.enemies.push(newEdge); // Repeated group entry must never double-accept one enemy life.
  f.tick(10); f.tick(100);
  const rt = s.umbraBloodSpikeRuntime, cast = rt.casts[0], before = plain(f.snapshot().casts[0]);
  const nextAtMs = rt.nextCastAtMs, attempts = cast.attempted;
  assert.equal(cast.radius, 147);
  stage(s, "umbraBloodSpike", 8);
  f.move(s.playerHitbox, -50, 50);
  assert.equal(rt.casts[0], cast); assert.equal(cast.attempted, attempts);
  assert.deepEqual(plain(f.snapshot().casts[0]), before); assert.equal(rt.nextCastAtMs, nextAtMs);
  f.tick(100);
  assert.equal(anchor.hp, 95); assert.equal(oldEdge.hp, 95);
  assert.equal(newEdge.hp, 100); assert.equal(outside.hp, 100);
  f.tick(nextAtMs - rt.combatTimeMs);
  const giant = rt.casts[0]; assert.equal(giant.radius, 240);
  assert.deepEqual(plain(giant.position), { x: 100, y: 0 });
  assert.equal(giant.impactDueAtMs - giant.createdCombatTimeMs, 200);
  assert.equal(giant.durationMs, 800);
  f.tick(200); s.applyUmbraBloodSpikeImpact(giant);
  assert.equal(newEdge.hp, 95); assert.equal(outside.hp, 100);
  assert.equal(f.calls.filter(call => call.e === newEdge).length, 1);
  assert.equal(f.calls.filter(call => call.e === outside).length, 0);
});

test("NOVA S1→S8 adds only missing IDs at 0/pi/pi2; repeated apply/getters do not move old slot or pulse", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova"]), s = f.scene; f.add(); f.tick(100);
  const rt = s.umbraPhantomNovaRuntime, slot = rt.slots[0], before = plain(slot), pending = slot.nextPulseAtMs;
  stage(s, "umbraPhantomNova", 8);
  assert.equal(rt.slots[0], slot); assert.deepEqual(plain(slot), before);
  assert.deepEqual(plain(rt.slots.map(x => x.slotId)), [1, 2, 3]);
  assert.deepEqual(plain(rt.slots.map(x => x.phaseOffset)), [0, Math.PI, Math.PI / 2]);
  assert.deepEqual(plain(rt.slots.map(x => x.nextPulseAtMs)), [pending, 1000, 1000]);
  assert.equal(f.calls.length, 0); const copy = plain(rt.slots);
  for (let i = 0; i < 10; i++) { s.applySkillStage(s.playerSkills.umbraPhantomNova); s.getUmbraPhantomNovaEffectiveStats(); }
  assert.deepEqual(plain(rt.slots), copy); f.invariant();
  f.tick(799); assert.equal(f.calls.length, 0); f.tick(1); assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].damage, 3); f.tick(100); assert.equal(f.calls.length, 3);
});

test("NOVA DEP snapshot and REGEN deadlines survive incremental growth; all states reserve their phase", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova"]), s = f.scene; f.add();
  const dep = f.deploy(10, 10), rt = s.umbraPhantomNovaRuntime, frozen = plain(dep);
  stage(s, "umbraPhantomNova", 4); assert.deepEqual(plain(dep), frozen);
  assert.equal(rt.slots[1].phaseOffset, Math.PI); assert.equal(rt.totalSlots, 2);
  f.tick(3000); assert.equal(dep.state, "REGENERATING");
  const deadline = dep.regenerateAtMs, regen = plain(dep), other = plain(rt.slots[1]);
  stage(s, "umbraPhantomNova", 8); assert.deepEqual(plain(dep), regen); assert.deepEqual(plain(rt.slots[1]), other);
  assert.equal(rt.slots[2].phaseOffset, Math.PI / 2); assert.equal(dep.regenerateAtMs, deadline);
  s.stats.fireInterval = 160; f.tick(deadline - rt.combatTimeMs);
  assert.equal(dep.state, "ORBITING"); assert.equal(dep.nextPulseAtMs, rt.combatTimeMs + 300); f.invariant();
});

test("NOVA growth between successful start and first physical step preserves one reservation; held/rejected start never replays", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova"]), s = f.scene; f.start(20, 30);
  const rt = s.umbraPhantomNovaRuntime, reservation = rt.reservation, order = rt.lastEventOrder, sequence = rt.lastStartSequence;
  stage(s, "umbraPhantomNova", 8);
  assert.equal(rt.reservation, reservation); assert.equal(rt.lastEventOrder, order); assert.equal(rt.lastStartSequence, sequence);
  assert.equal(rt.counts.reservations, 1); f.physical(); f.tick(10); assert.equal(rt.counts.deployed, 1);
  f.tick(1000); assert.equal(rt.counts.deployed, 1);
  const failed = growth(novaFixture(), ["umbraPhantomNova"]); failed.start(); failed.physical(false); failed.tick();
  stage(failed.scene, "umbraPhantomNova", 8); failed.physical(true, { firstPhysicalEvaluation: false }); failed.tick();
  assert.equal(failed.snapshot().counts.reservations, 1); assert.equal(failed.snapshot().counts.deployed, 0);
});

test("NOVA paused overlay cancels reservation/freezes time; Depth preserves Stage and deployed remaining plus regen", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova"]), s = f.scene; f.start();
  s.levelUpActive = true; f.tick(500); const rt = s.umbraPhantomNovaRuntime;
  assert.equal(rt.reservation, null); assert.equal(rt.combatTimeMs, 0);
  stage(s, "umbraPhantomNova", 4); assert.equal(rt.slots[1].nextPulseAtMs, 900);
  s.levelUpActive = false; const dep = f.deploy(); f.tick(500);
  const remaining = dep.deployedUntilMs - rt.combatTimeMs, clock = rt.combatTimeMs, regenMs = dep.deployedSnapshot.regenerationMs;
  s.stageDepth = 6; s.prepareUmbraPhantomNovaFrame();
  assert.equal(dep.state, "REGENERATING"); assert.equal(dep.regenerateAtMs, clock + remaining + regenMs);
  assert.equal(s.getUmbraActiveSkillStage("umbraPhantomNova").stage, 4); assert.equal(rt.totalSlots, 2); f.invariant();
});

test("deferred Core/Final is RAM only, exactly six ordered unique records with direct S8 and duplicate apply", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova", "umbraBloodSpike"]), s = f.scene;
  for (const id of ["umbraPhantomNova", "umbraMoonlight", "umbraBloodSpike"]) {
    stage(s, id, 8); stage(s, id, 8); s.handleSkillStageMutationUnlock(id, 8);
  }
  const entries = s.umbraGrowthRun.deferredMilestones;
  assert.deepEqual(plain(entries.map(x => x.phase)), ["core", "final", "core", "final", "core", "final"]);
  assert.deepEqual(plain(entries.map(x => x.order)), [1, 2, 3, 4, 5, 6]);
  assert.equal(s.skillMutationState, undefined); assert.equal(s.triadMatrixState, undefined);
});

test("NOVA-first Unlock retains existing slots and ordering when SPIKE is acquired later", () => {
  const f = growth(novaFixture(), ["umbraPhantomNova"]), s = f.scene;
  const runtime = s.umbraPhantomNovaRuntime, slot = runtime.slots[0], order = [];
  const novaStep = s.observeUmbraPhantomNovaStep, spikeStep = s.observeUmbraBloodSpikeStep;
  s.observeUmbraPhantomNovaStep = function (delta) { order.push("nova"); return novaStep.call(this, delta); };
  s.observeUmbraBloodSpikeStep = function (delta) { order.push("spike"); return spikeStep.call(this, delta); };
  s.unlockSkill("umbraBloodSpike"); f.tick();
  assert.deepEqual(order, ["spike", "nova"]); assert.equal(runtime.slots[0], slot);
  const listeners = f.world.listenerCount("worldstep"); stage(s, "umbraBloodSpike", 8); stage(s, "umbraPhantomNova", 8);
  assert.equal(f.world.listenerCount("worldstep"), listeners);
});

test("numeric prior profile detects a same-Stage radius change without clearing target cursor", () => {
  const f = growth(moonFixture()), s = f.scene, e = f.add(); const record = s.umbraMoonlightRuntime.targets.get(e), cursor = record.cursor;
  const getter = s.getUmbraMoonlightEffectiveStats;
  s.getUmbraMoonlightEffectiveStats = function () { const p = getter.call(this); return { ...p, exitRadius: p.exitRadius + 2 }; };
  s.applySkillStage(s.playerSkills.umbraMoonlight);
  assert.equal(record.radiusRebasePending, true); assert.equal(record.cursor, cursor);
  assert.equal(s.umbraMoonlightRuntime.appliedGrowthProfile.exitRadius, 74);
});
