"use strict";
// Pure numeric bodies / real selection guards. Actual Phaser displacement is
// measured separately by umbra-core-browser.cjs.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-growth-runtime.test.cjs");
const content = fs.readFileSync(filename, "utf8"), mod = new Module(filename, module);
mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(content.slice(0, content.indexOf('\ntest("')) + "\nmodule.exports={growth,stage,moonFixture,spikeFixture,novaFixture};", filename);
const { growth, stage, moonFixture, spikeFixture, novaFixture } = mod.exports;
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova";
const plain = value => JSON.parse(JSON.stringify(value));
function core(f, acquire = []) {
  f.scene.verificationContext = { ...f.scene.verificationContext, coreEnabled: true };
  growth(f, acquire);
  const s = f.scene, world = s.physics.world;
  world.pause = () => { world.isPaused = true; world.emit("pause"); };
  world.resume = () => { world.isPaused = false; };
  s.showLevelUpCardOverlay = (title, subtitle, options, mode) => {
    s.levelUpSelectionMode = mode; s.levelUpSelectionLocked = false; s.levelUpInputEnabled = true;
    s.levelUpCardRecords = options.map(option => ({ model: { option } }));
  };
  s.drawLevelUpCardBackground = () => {};
  s.playLevelUpSelectAnimation = (record, others, callback) => { s.testConfirm = callback; };
  s.hideOverlay = () => {};
  s.resumeGameplayAfterBlockingOverlay = () => world.resume();
  return f;
}
function choose(s, id, choiceId) {
  assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
  assert.equal(s.skillMutationState.currentSelection.skillId, id);
  const options = s.levelUpCardRecords.map(record => record.model.option);
  const option = options.find(option => option.choiceId === choiceId);
  const before = { stage: s.playerSkills[id].stageIndex, pending: s.pendingLevelUps, opening: s.startingUpgradeSelectionsRemaining,
    damage: s.stats.bulletDamage, fire: s.stats.fireInterval };
  s.selectLevelUpCard(options.indexOf(option));
  assert.equal(s.getUmbraSelectedCoreId(id), null);
  const callback = s.testConfirm; callback();
  assert.equal(s.getUmbraSelectedCoreId(id), choiceId);
  assert.deepEqual({ stage: s.playerSkills[id].stageIndex, pending: s.pendingLevelUps, opening: s.startingUpgradeSelectionsRemaining,
    damage: s.stats.bulletDamage, fire: s.stats.fireInterval }, before);
  return { option, callback };
}
function select(s, id, choiceId) {
  // finish may already have opened the next FIFO request.
  if (s.skillMutationState?.selectionOpen) {
    const options = s.levelUpCardRecords.map(r => r.model.option);
    assert.equal(s.skillMutationState.currentSelection.skillId, id);
    s.selectLevelUpCard(options.findIndex(option => option.choiceId === choiceId)); s.testConfirm();
  } else choose(s, id, choiceId);
}

test("Core FIFO retains original Final order, waits for normal/Opening, consumes only Core, and rejects stale callbacks", () => {
  const f = core(spikeFixture(), [B, N]), s = f.scene;
  s.pendingLevelUps = 2; s.startingUpgradeSelectionsRemaining = 1;
  stage(s, M, 8); stage(s, N, 8); stage(s, B, 8);
  const history = plain(s.umbraGrowthRun.deferredMilestones);
  assert.deepEqual(history.map(x => x.order), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(plain(s.skillMutationState.pendingQueue.map(x => x.skillId)), [M, N, B]);
  for (let i = 0; i < 10; i++) { s.syncUmbraCoreMilestones(); s.applySkillStage(s.playerSkills[M]); }
  assert.equal(s.skillMutationState.pendingQueue.length, 3);
  assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
  s.pendingLevelUps = 0; assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
  s.startingUpgradeSelectionsRemaining = 0;
  const selected = choose(s, M, "assault");
  assert.equal(selected.option.onSelect(), false);
  select(s, N, "control"); select(s, B, "reactor");
  assert.equal(s.skillMutationState.pendingQueue.length, 0);
  assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones), history);
  assert.ok(Object.values(s.skillMutationState.entries).every(entry => !entry.stage8Selected && !entry.stage8Queued));
  assert.equal(s.levelUpActive, false); assert.equal(s.physics.world.isPaused, false);
  assert.equal(s.applyUmbraCoreChoice(M, "reactor"), false);
  const run = s.umbraGrowthRun; s.umbraGrowthRun = { ...run }; assert.equal(selected.option.onSelect(), false); s.umbraGrowthRun = run;
});

test("query does not select, Esc preserves queue, failed apply cannot become selected", () => {
  const s = core(spikeFixture()).scene; stage(s, M, 4);
  assert.equal(s.buildSkillMutationChoices(M).length, 3);
  assert.equal(s.buildSkillMutationChoices(M)[0].onSelect(), false);
  assert.equal(s.buildSkillMutationChoices(M, "stage8").length, 0);
  assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
  const old = s.levelUpCardRecords[0].model.option;
  s.closeUmbraCoreSelection(); s.levelUpActive = false; s.physics.world.resume();
  assert.equal(old.onSelect(), false); assert.equal(s.skillMutationState.pendingQueue.length, 1);
  assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
  const apply = s.applyUmbraSkillStageChange; s.applyUmbraSkillStageChange = () => false;
  s.selectLevelUpCard(0); s.testConfirm();
  assert.equal(s.getUmbraSelectedCoreId(M), null); assert.equal(s.skillMutationState.pendingQueue.length, 1);
  s.applyUmbraSkillStageChange = apply; select(s, M, "control");
  assert.equal(s.getUmbraSelectedCoreId(M), "control");
});

test("Moon only REACTOR rebases exit without clearing life/cursor/history or attacking", () => {
  for (const id of ["assault", "control", "reactor"]) {
    const f = core(moonFixture()), s = f.scene; stage(s, M, 4); const e = f.add(); f.step(200);
    const rt = s.umbraMoonlightRuntime, rec = rt.targets.get(e), hits = f.count();
    // Existing world.pause invalidation is separate from same-Stage application.
    s.tryOpenPendingSkillMutationSelection();
    const before = { ...rec };
    select(s, M, id);
    for (const key of ["lifeId", "passId", "lastHitAt", "cursor", "body"]) assert.equal(rec[key], before[key]);
    assert.equal(f.count(), hits); assert.equal(rt, s.umbraMoonlightRuntime);
    if (id === "reactor") { assert.equal(rec.radiusRebasePending, true); assert.equal(rec.armed, false); }
    else { assert.equal(rec.armed, before.armed); assert.equal(rec.radiusRebasePending, before.radiusRebasePending); }
    rec.cursor = { x: 999, y: 999 }; f.step(300);
    assert.ok(s.getUmbraMoonlightSnapshot().skips.TARGET_DISCONTINUITY);
  }
});

test("SPIKE old cast at +100 and just after impact keeps old raw/slow/deadline; new cast uses selected Core", () => {
  for (const id of ["assault", "control", "reactor"]) for (const at of [100, 200]) {
    const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); const e = f.add();
    f.tick(10); const rt = s.umbraBloodSpikeRuntime, cast = rt.casts[0], due = rt.nextCastAtMs;
    f.tick(at); const snapshot = cast.coreProfile; choose(s, B, id);
    assert.equal(rt.nextCastAtMs, due); assert.equal(cast.coreProfile, snapshot); assert.equal(cast.rawDamage, 5);
    if (at === 100) f.tick(100);
    assert.equal(e.hp, 95); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
    f.tick(due - rt.combatTimeMs); const newer = rt.casts.at(-1);
    assert.equal(newer.coreProfile.coreId, id); assert.equal(newer.rawDamage, id === "assault" ? 6 : 5);
    f.tick(200); assert.equal(s.getUmbraControlSpeedMultiplier(e), id === "control" ? .75 : 1);
  }
});

test("NOVA existing DEP/REGEN preserves snapshots and new deployment alone gets Core regen1000", () => {
  for (const id of ["assault", "control", "reactor"]) {
    const f = core(novaFixture(), [N]), s = f.scene; stage(s, N, 4); f.add();
    const slot = f.deploy(), snapshot = slot.deployedSnapshot, due = slot.nextPulseAtMs;
    choose(s, N, id); assert.equal(slot.deployedSnapshot, snapshot); assert.equal(slot.nextPulseAtMs, due);
    assert.equal(snapshot.coreProfile.coreId, null); assert.equal(snapshot.regenerationMs, 1200);
    const rt = s.umbraPhantomNovaRuntime, listenerCount = f.world.listenerCount("worldstep"), ids = rt.slots.map(x => x.slotId);
    for (let i = 0; i < 10; i++) s.applySkillStage(s.playerSkills[N]);
    assert.deepEqual(rt.slots.map(x => x.slotId), ids); assert.equal(f.world.listenerCount("worldstep"), listenerCount);
    f.tick(3000); assert.equal(slot.regenerateAtMs, 4210);
    const oldDue = slot.regenerateAtMs; s.applySkillStage(s.playerSkills[N]); assert.equal(slot.regenerateAtMs, oldDue);
    const newer = f.deploy(200, 0); assert.equal(newer.deployedSnapshot.coreProfile.coreId, id);
    assert.equal(newer.deployedSnapshot.regenerationMs, id === "reactor" ? 1000 : 1200);
  }
});

test("independent CONTROL owner clocks/min/refresh/death/reuse: .75 expires before remaining .85", () => {
  const f = core(spikeFixture(), [B, N]), s = f.scene; stage(s, B, 4); stage(s, N, 4);
  choose(s, B, "control"); select(s, N, "control"); const e = f.add(); s.registerUmbraPhantomNovaEnemyLife(e);
  const spike = s.umbraBloodSpikeRuntime, nova = s.umbraPhantomNovaRuntime;
  const apply = (id, rt, source) => s.applyUmbraControlHit(id, rt, e, rt.targets.get(e), s.getUmbraSkillCoreProfile(id, s.getUmbraActiveSkillStage(id)), source);
  assert.equal(apply(B, spike, "a"), true); assert.equal(apply(B, spike, "a"), false);
  spike.combatTimeMs = 100; apply(B, spike, "b");
  assert.equal(spike.controlContributions.get(e).get(.75).expiresAtMs, 700);
  spike.combatTimeMs = 600; nova.combatTimeMs = 9000; apply(N, nova, "x");
  assert.equal(s.getUmbraControlSpeedMultiplier(e), .75);
  spike.combatTimeMs = 700; nova.combatTimeMs = 9100; assert.equal(s.getUmbraControlSpeedMultiplier(e), .85);
  assert.equal(spike.controlContributions.size, 1); // getters are read-only
  s.pruneUmbraControlContributions(B); assert.equal(spike.controlContributions.size, 0);
  nova.combatTimeMs = 9250; assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
  apply(N, nova, "y"); e.isDying = true; assert.equal(s.getUmbraControlSpeedMultiplier(e), 1); e.isDying = false;
  s.registerUmbraPhantomNovaEnemyLife(e); assert.equal(nova.controlContributions.size, 0);
  apply(N, nova, "z"); s.destroyUmbraBloodSpikeRuntime(); assert.equal(s.getUmbraControlSpeedMultiplier(e), .85);
  s.destroyUmbraPhantomNovaRuntime(); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
});

test("CONTROL true primary HP success only: normal/Boss/Nemesis flags, rejected/lethal/reused targets", () => {
  for (const flag of [null, "isBoss", "isWaveBoss", "isNemesisBoss", "isVoidHunterBoss", "isRobotBoss"]) {
    const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); choose(s, B, "control");
    const e = f.add(); if (flag) e[flag] = true; e.maxHp = 999999; f.tick(10); f.tick(200);
    assert.equal(s.getUmbraControlSpeedMultiplier(e), flag ? .92 : .75);
    const rt = s.umbraBloodSpikeRuntime, rec = [...rt.controlContributions.get(e).values()][0];
    assert.equal(rec.expiresAtMs - rec.appliedAtMs, 600); assert.equal(rec.appliedAtMs, 210);
  }
  for (const mode of ["reject", "supportHold", "lethal", "reuse"]) {
    const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); choose(s, B, "control"); const e = f.add(100, 0, mode === "lethal" ? 1 : 100);
    if (mode === "reject") s.applyDamageToEnemy = () => {};
    if (mode === "supportHold") e.supportDamageHoldUntil = 2000;
    if (mode === "reuse") { const receiver = s.applyDamageToEnemy; s.applyDamageToEnemy = (...args) => { receiver.apply(s, args); s.registerUmbraBloodSpikeEnemyLife(e); }; }
    f.tick(10); f.tick(200); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
  }
});

test("CONTROL freezes on overlays/hidden, expires in ordinary time, does not multiply legacy, stops cleanly", () => {
  const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); choose(s, B, "control"); const e = f.add();
  f.tick(10); f.tick(200); const rt = s.umbraBloodSpikeRuntime;
  for (const flag of ["drivePaused", "driveHidden", "levelUpActive"]) {
    s[flag] = true; f.tick(2000); assert.equal(rt.combatTimeMs, 210); assert.equal(s.getUmbraControlSpeedMultiplier(e), .75); s[flag] = false;
  }
  s.getEnemyLostArmsSlowMultiplier = () => .5; s.getEnemyCleaningRobotSlowMultiplier = () => 1; s.getEnemySkillMutationSlowMultiplier = () => 1;
  assert.equal(s.getEnemySpeedMultiplier(e), .5);
  let vx = 100; e.body.velocity.scale = v => { vx *= v; };
  s.applyUmbraControlMovementMultiplier(e, .5); assert.equal(vx, 100);
  s.applyUmbraControlMovementMultiplier(e, 1); assert.equal(vx, 75);
  f.tick(599); assert.equal(s.getUmbraControlSpeedMultiplier(e), .75); f.tick(1); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
  f.tick(1000); f.tick(200); assert.equal(s.getUmbraControlSpeedMultiplier(e), .75);
  s.bloodSpikeAttackEnabled = false; s.events.emit("preupdate"); assert.equal(rt.controlContributions.size, 0);
  assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
});

test("Moon notification OFF removes its stopped-clock contributions without removing SPIKE", () => {
  const f = core(moonFixture(), [B]), s = f.scene; stage(s, M, 4); stage(s, B, 4); choose(s, M, "control"); select(s, B, "control");
  const e = f.add(); s.registerUmbraBloodSpikeEnemyLife(e); f.step(200);
  assert.equal(s.getUmbraControlSpeedMultiplier(e), .78);
  s.isUmbraBoostTraceEnabled = () => false; s.events.emit("preupdate");
  assert.equal(s.umbraMoonlightRuntime.controlContributions.size, 0); assert.equal(s.getUmbraControlSpeedMultiplier(e), 1);
});

test("SPIKE CONTROL covers every accepted main target, exceeding six, without extra receivers", () => {
  const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); choose(s, B, "control");
  const enemies = Array.from({ length: 12 }, (_, i) => f.add(100 + (i % 4) * 10, Math.floor(i / 4) * 10));
  f.tick(10); f.tick(200);
  assert.equal(f.calls.length, 12); assert.equal(s.umbraBloodSpikeRuntime.controlContributions.size, 12);
  assert.ok(enemies.every(e => e.hp === 95 && s.getUmbraControlSpeedMultiplier(e) === .75));
});

test("Boss persistent dash rebuilds the current AI command, never exponentially scales or restores an old velocity", () => {
  const s = core(spikeFixture(), [B]).scene; stage(s, B, 4); choose(s, B, "control");
  const enemy = { active: true, body: {}, isBossDashing: true, bossDashEndsAt: 1500, dashSpeed: 340 };
  let speed = 340, control = .92;
  enemy.body.velocity = { scale: ratio => { speed *= ratio; } };
  s.getUmbraControlSpeedMultiplier = () => control;
  s.physics.velocityFromRotation = (angle, value) => { assert.equal(angle, .2); speed = value; };
  s.recordUmbraBossDashCommand(enemy, .2);
  for (let i = 0; i < 20; i++) { s.updateUmbraBossDashCommand(enemy); s.applyUmbraControlMovementMultiplier(enemy, 1); assert.equal(speed, 312.8); }
  enemy.dashSpeed = 400; control = 1;
  s.updateUmbraBossDashCommand(enemy); s.applyUmbraControlMovementMultiplier(enemy, 1); assert.equal(speed, 400);
  enemy.bossDashEndsAt = 2000; assert.equal(s.isUmbraBossDashCommandActive(enemy), false);
  control = .92; s.applyUmbraControlMovementMultiplier(enemy, 1); assert.equal(speed, 400);
});

test("REACTOR preserves already scheduled empty/cap waits and shortens only new empty search", () => {
  const f = core(spikeFixture(), [B]), s = f.scene; stage(s, B, 4); f.tick(10);
  const rt = s.umbraBloodSpikeRuntime; assert.equal(rt.nextCastAtMs, 160);
  choose(s, B, "reactor"); assert.equal(rt.nextCastAtMs, 160);
  f.tick(150); assert.equal(rt.nextCastAtMs, 260);
  const e = f.add(), target = s.findUmbraBloodSpikePlacement();
  for (let i = 0; i < 3; i++) s.createUmbraBloodSpikeCast(target);
  rt.nextCastAtMs = rt.combatTimeMs; f.tick(10);
  assert.equal(rt.nextCastAtMs - rt.combatTimeMs, 150); assert.equal(rt.casts.length, 3);
  assert.equal(e.hp, 100);
});

test("destroyed/old owner and throwing profile cannot select or recreate an attack runtime", () => {
  for (const mode of ["destroy", "oldOwner", "throw"]) {
    const s = core(spikeFixture(), [B]).scene; stage(s, B, 4);
    s.tryOpenPendingSkillMutationSelection(); const option = s.levelUpCardRecords[0].model.option;
    s.selectLevelUpCard(0);
    if (mode === "destroy") s.destroyUmbraBloodSpikeRuntime();
    if (mode === "oldOwner") s.umbraBloodSpikeRuntime.umbraGrowthRun = {};
    if (mode === "throw") s.applyUmbraSkillStageChange = () => { throw new Error("TEST_PROFILE_FAILURE"); };
    assert.equal(option.onSelect(), false);
    assert.equal(s.getUmbraSelectedCoreId(B), null);
    assert.equal(s.skillMutationState.pendingQueue.length, 1); assert.equal(s.skillMutationState.entries[B].stage4Selected, false);
    assert.equal(s.umbraGrowthRun.coreApplying, undefined);
    if (mode === "throw") { assert.equal(s.skillMutationState.selectionLocked, false); assert.match(s.skillMutationState.lastError, /TEST_PROFILE_FAILURE/); }
    if (mode === "destroy") assert.equal(s.umbraBloodSpikeRuntime, null);
  }
});

test("explicit same-RAM Phase6B deferred attaches once without replacing clock/casts or migrating storage", () => {
  const f = growth(spikeFixture(), [B]), s = f.scene; stage(s, M, 8); stage(s, B, 8);
  const owner = s.umbraBloodSpikeRuntime, before = plain(s.umbraGrowthRun.deferredMilestones);
  const context = Object.freeze({ ...s.verificationContext, coreEnabled: true });
  s.verificationContext = context; s.umbraGrowthRun.context = context; // explicit isolated in-RAM permission fixture
  for (let i = 0; i < 10; i++) s.syncUmbraCoreMilestones();
  assert.equal(s.umbraBloodSpikeRuntime, owner); assert.equal(owner.combatTimeMs, 0);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones), before);
  assert.deepEqual(plain(s.skillMutationState.pendingQueue.map(x => x.skillId)), [M, B]);
  assert.equal(owner.umbraGrowthRun, s.umbraGrowthRun);
});

test("last Opening S3→S4 confirms through normal selection before opening Core, while extra normal pending still wins", () => {
  for (const pending of [1, 2]) {
    const s = core(spikeFixture()).scene; stage(s, M, 3);
    s.pendingLevelUps = pending; s.startingUpgradeSelectionsRemaining = 1; s.levelUpOpeningBoostActive = true;
    s.levelUpActive = true; s.levelUpInputEnabled = true; s.levelUpSelectionLocked = false; s.levelUpSelectionMode = "level";
    let normalReopened = 0; s.showLevelUpChoices = () => { normalReopened++; };
    s.levelUpCardRecords = [{ model: { option: s.buildUmbraSkillGrowthChoice(M) } }];
    s.selectLevelUpCard(0); assert.equal(s.playerSkills[M].currentStage.stage, 3);
    s.testConfirm(); assert.equal(s.playerSkills[M].currentStage.stage, 4);
    assert.equal(s.pendingLevelUps, pending - 1); assert.equal(s.startingUpgradeSelectionsRemaining, 0);
    assert.equal(s.skillMutationState.pendingQueue.length, 1);
    if (pending === 1) { assert.equal(s.skillMutationSelectionActive, true); select(s, M, "assault"); assert.equal(s.pendingLevelUps, 0); }
    else { assert.equal(normalReopened, 1); assert.equal(s.skillMutationSelectionActive, undefined); assert.equal(s.tryOpenPendingSkillMutationSelection(), false); }
  }
});
