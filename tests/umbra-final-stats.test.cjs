"use strict";

// Phase 6C2 production arithmetic/FIFO in isolated RAM. Explicit selected records
// below are numeric inputs; separate selection tests exercise real callbacks.
// No browser, physics step, persistence or authentication is invoked here.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), crypto = require("node:crypto");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), baseline = ".tmp_umbra_phase6c2/2026-09-08-start/baseline";
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", ids = [M, B, N];
const getters = { [M]: "getUmbraMoonlightEffectiveStats", [B]: "getUmbraBloodSpikeEffectiveStats", [N]: "getUmbraPhantomNovaEffectiveStats" };
const owners = { [M]: "umbraMoonlightRuntime", [B]: "umbraBloodSpikeRuntime", [N]: "umbraPhantomNovaRuntime" };
const plain = value => JSON.parse(JSON.stringify(value));
function compile(filename, source, exports) {
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(source + `\nmodule.exports = { ${exports} };`, filename); return mod.exports;
}
function loadStats(old = false) {
  const filename = path.join(__dirname, "umbra-growth-stats.test.cjs"), file = fs.readFileSync(filename, "utf8");
  const first = file.indexOf("\nfor (const id of ids) test(");
  const start = file.indexOf("function progressionFixture("), end = file.indexOf('\ntest("', start);
  let source = file.slice(0, first) + "\n" + file.slice(start, end);
  if (old) source = source.replace('path.join(root, "game.js")', JSON.stringify(path.join(root, baseline, "game.js")))
    .replace('path.join(root, "skillDefinitions.js")', JSON.stringify(path.join(root, baseline, "skillDefinitions.js")));
  return compile(filename, source, "fixture, selectStage, progressionFixture");
}
const live = loadStats(), old = loadStats(true);
function numeric({ loader = live, fixtureId = "baseline", stage = 8, coreId = "assault", finalId = null,
  finalEnabled = true, passives = false, acquired = ids } = {}) {
  const f = loader.fixture({ fixtureId, acquired }), s = f.scene;
  s.verificationContext = Object.freeze({ ...s.verificationContext, coreEnabled: true, ...(finalEnabled ? { finalEnabled: true } : {}) });
  s.umbraGrowthRun.context = s.verificationContext;
  s.skillMutationState = { umbraGrowthRun: s.umbraGrowthRun, entries: {}, pendingQueue: [], selectionOpen: false, selectionLocked: false };
  for (const id of acquired) {
    loader.selectStage(s, f.api, id, stage);
    s.skillMutationState.entries[id] = { core: coreId, stage4Selected: coreId !== null, stage4Queued: false,
      ...(finalEnabled ? { final: finalId, stage8Selected: finalId !== null, stage8Queued: false } : {}) };
    s[owners[id]] = { umbraGrowthRun: s.umbraGrowthRun, destroyed: false, player: s.playerHitbox, body: s.playerHitbox.body };
  }
  if (passives) for (const [id, count] of [["overchargeBolt", 3], ["rapidSigil", 2]]) for (let index = 0; index < count; index++) {
    const choice = s.getPassiveUpgradeChoices().find(candidate => candidate.id === id); assert.ok(choice); choice.onSelect();
  }
  return f;
}
const coreRuntimePath = path.join(__dirname, "umbra-core-runtime.test.cjs");
const coreRuntimeSource = fs.readFileSync(coreRuntimePath, "utf8");
const runtime = compile(coreRuntimePath, coreRuntimeSource.slice(0, coreRuntimeSource.indexOf('\ntest("')), "core, stage, spikeFixture, novaFixture, moonFixture");
function finalRuntime(acquired = [B, N]) {
  const f = runtime.core(runtime.spikeFixture(), acquired), s = f.scene;
  s.verificationContext = Object.freeze({ ...s.verificationContext, finalEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  return f;
}
function pick(s, coreId = "assault", finalId = "execution") {
  if (!s.skillMutationState?.selectionOpen) assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
  const selection = s.skillMutationState.currentSelection, options = s.levelUpCardRecords.map(record => record.model.option);
  const id = selection.phase === "stage4" ? coreId : finalId, option = options.find(value => value.choiceId === id);
  assert.ok(option); assert.equal(options.length, 3);
  const before = [s.pendingLevelUps, s.startingUpgradeSelectionsRemaining, s.stats.bulletDamage, s.stats.fireInterval, s.stats.hp, s.stats.stamina,
    ...ids.map(skillId => s.playerSkills[skillId]?.stageIndex)];
  s.selectLevelUpCard(options.indexOf(option)); s.selectLevelUpCard(options.indexOf(option));
  const callback = s.testConfirm; callback();
  assert.deepEqual([s.pendingLevelUps, s.startingUpgradeSelectionsRemaining, s.stats.bulletDamage, s.stats.fireInterval, s.stats.hp, s.stats.stamina,
    ...ids.map(skillId => s.playerSkills[skillId]?.stageIndex)], before);
  assert.equal(option.onSelect(), false);
  return { skillId: selection.skillId, phase: selection.phase, option, callback };
}

test("Phase 6C2 baseline retains b04b8 AP0 correction; Stage bytes differ only by the requested SPIKE S8 radius", () => {
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, baseline, "game.js"))).digest("hex"),
    "b04b8be5c048f991cb73ee748f01af385aff797d270ec86607685ab885485d3c");
  const old = fs.readFileSync(path.join(root, baseline, "skillDefinitions.js"), "utf8");
  const radiusRow = "impactRadius: [90, 100, 110, 122, 135, 147, 160]";
  assert.equal(old.split(radiusRow).length, 2);
  assert.equal(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), old.replace(radiusRow, radiusRow.replace("160]", "240]")));
});

for (const fixtureId of ["baseline", "medium", "deep"]) test(`${fixtureId}: Final absent preserves current Phase6C1 Core stats, shape and cards`, () => {
  for (const coreId of ["assault", "control", "reactor"]) for (const passives of [false, true]) {
    const now = numeric({ fixtureId, coreId, passives, finalEnabled: false }), before = numeric({ loader: old, fixtureId, coreId, passives, finalEnabled: false });
    for (let stage = 1; stage <= 8; stage++) for (const id of ids) {
      live.selectStage(now.scene, now.api, id, stage); old.selectStage(before.scene, before.api, id, stage);
      const oldStats = plain(before.scene[getters[id]]());
      if (id === B && stage === 8) { assert.equal(oldStats.impactRadius, 160); oldStats.impactRadius = 240; }
      assert.deepEqual(plain(now.scene[getters[id]]()), oldStats);
      if (stage >= 4) assert.deepEqual(plain(now.scene.buildUmbraCoreCard(id, coreId)), plain(before.scene.buildUmbraCoreCard(id, coreId)));
    }
  }
});

for (const id of ids) for (const coreId of ["assault", "control", "reactor"]) for (const finalId of ["execution", "prism", "singularity"])
test(`${id}: ${coreId}+${finalId} canonical form retains Core effects and immutable unrounded R`, () => {
  for (const fixtureId of ["baseline", "medium", "deep"]) for (const passives of [false, true]) {
    const f = numeric({ fixtureId, coreId, finalId, passives }), s = f.scene, stats = s[getters[id]]();
    const before = numeric({ loader: old, fixtureId, coreId, passives, finalEnabled: false }).scene[getters[id]]();
    const stripped = plain(stats); delete stripped.finalProfile; delete stripped.orbitFinalProfile; delete stripped.deployedFinalProfile;
    const oldStats = plain(before);
    if (id === B) { assert.equal(oldStats.impactRadius, 160); oldStats.impactRadius = 240; }
    assert.deepEqual(stripped, oldStats);
    const profiles = id === N ? [stats.orbitFinalProfile, stats.deployedFinalProfile] : [stats.finalProfile];
    for (const profile of profiles) {
      assert.ok(Object.isFrozen(profile)); assert.equal(profile.finalId, finalId); assert.equal(profile.coreId, coreId);
      assert.equal(profile.addedRaw, (id === M ? 12 : id === B ? 5 : 3) + (passives ? 3 : 0));
      assert.equal(profile.coreDamageMultiplier, coreId === "assault" ? 1.25 : 1);
      for (const enemy of [{ hp: 1, maxHp: 10 }, { hp: 10, maxHp: 10 }]) {
        const finalFactor = finalId === "execution" && enemy.hp === 10 ? 1.25 : 1;
        const baseRaw = Math.max(1, Math.round(profile.addedRaw * profile.coreDamageMultiplier));
        assert.equal(s.getUmbraFinalMainRawDamage(profile, enemy, baseRaw),
          Math.max(1, Math.round(profile.addedRaw * profile.coreDamageMultiplier * finalFactor)));
      }
    }
    const card = s.buildUmbraFinalCard(id, finalId); assert.ok(card);
    assert.equal(card.umbraFinalCard.finalId, finalId); assert.equal(card.umbraFinalCard.coreId, coreId);
    assert.ok(card.chips.length >= 2); assert.match(card.title, new RegExp(`${coreId.toUpperCase()} \\+ ${finalId.toUpperCase()}`));
    const model = s.buildSkillMutationCardModel({ type: "skillMutation", phase: "stage8", choiceId: finalId, ...card }, 0);
    assert.deepEqual(plain(model.chips), plain(card.chips)); assert.equal(model.stageProgress, "●●●●●●●●");
    assert.equal(model.themeColor, card.themeColor); assert.deepEqual(f.calls, { storage: 0, network: 0 });
  }
});

test("Final cards distinguish Execution conditional round, Prism budget, no-damage field, and main CONTROL", () => {
  const s = numeric({ coreId: "assault", finalId: "execution" }).scene;
  for (const [id, primary, ordinary, branch] of [[M, 19, 15, 5], [B, 8, 6, 2], [N, 5, 4, 2]]) {
    const execution = s.buildUmbraFinalCard(id, "execution"), prism = s.buildUmbraFinalCard(id, "prism"), field = s.buildUmbraFinalCard(id, "singularity");
    assert.ok(execution.chips.some(chip => chip.label.includes(`強対象 ${primary} / その他 ${ordinary}`)));
    assert.match(execution.description, /満HPの小さい一般敵/); assert.match(execution.description, /1回だけ丸め/);
    assert.ok(prism.chips.some(chip => chip.label.includes(`${id === N ? "周回" : "主"}${branch}`)));
    assert.match(prism.description, /再試行しません/); assert.match(field.description, /CONTROLでなくても有効/);
    assert.ok(field.chips.some(chip => chip.label.includes("各field最大6体 / 通常0.85・Boss系0.95")));
  }
  const control = numeric({ coreId: "control" }).scene.buildUmbraFinalCard(B, "singularity");
  assert.match(control.description, /主CONTROLの短い期限とfieldは別所有/);
  assert.ok(control.chips.some(chip => chip.label.includes("半径200px")));
});

test("EXECUTION uses the existing strong-target boundaries immediately and rounds R6×1.25×1.25 to9, not10", () => {
  const s = numeric({ coreId: "assault", finalId: "execution" }).scene;
  s.stats.bulletDamage = 2;
  const stats = s.getUmbraBloodSpikeEffectiveStats(), profile = stats.finalProfile;
  assert.equal(profile.addedRaw, 6); assert.equal(stats.rawDamage, 8);
  const cases = [[{ hp: 1, maxHp: 1 }, true], [{ hp: 6.2, maxHp: 10 }, true], [{ hp: 6.199, maxHp: 10 }, false],
    [{ hp: 1, maxHp: 36 }, true], [{ hp: 1, maxHp: 35.999 }, false], [{ hp: 1, maxHp: 10, isBoss: true }, true],
    [{ hp: 1, maxHp: 10, isElite: true }, true], [{ hp: 1, maxHp: 10, isNemesisBoss: true }, true]];
  const oldScene = numeric({ loader: old, finalEnabled: false }).scene;
  for (const [enemy, high] of cases) {
    assert.equal(s.isHighValueMutationTarget(enemy), high); assert.equal(oldScene.isHighValueMutationTarget(enemy), high);
    assert.equal(s.getUmbraFinalMainRawDamage(profile, enemy, stats.rawDamage), high ? 9 : 8);
  }
  const enemy = { hp: 10, maxHp: 10 };
  assert.equal(s.getUmbraFinalMainRawDamage(profile, enemy, stats.rawDamage), 9);
  enemy.hp = 1; assert.equal(s.getUmbraFinalMainRawDamage(profile, enemy, stats.rawDamage), 8);
  assert.equal(Math.round(stats.rawDamage * 1.25), 10);
  assert.equal(s.getUmbraFinalMainRawDamage(null, enemy, stats.rawDamage), 8);
  assert.equal(s.isUmbraControlBossTarget({ hp: 10, maxHp: 10 }), false);
});

test("Final permission rejects S1–S7, missing Core/acquisition, stale owner/run, forged Stage and old URLs", () => {
  for (const stage of [1, 2, 3, 4, 5, 6, 7]) {
    const s = numeric({ stage, finalId: "execution" }).scene;
    for (const id of ids) { assert.equal(s.getUmbraSelectedFinalId(id), null); assert.equal(s.getUmbraSkillFinalProfile(id), null); assert.deepEqual(plain(s.buildUmbraFinalChoices(id)), []); }
  }
  for (const invalidate of [s => { s.verificationContext = { ...s.verificationContext, finalEnabled: false }; s.umbraGrowthRun.context = s.verificationContext; },
    s => { s.skillMutationState.entries[B].stage4Selected = false; }, s => { s.skillMutationState.entries[B].core = "unknown"; },
    s => { delete s.playerSkills[B]; }, s => { s.playerSkills[B].currentStage = { ...s.playerSkills[B].currentStage }; },
    s => { s.umbraBloodSpikeRuntime.destroyed = true; }, s => { s.umbraBloodSpikeRuntime.umbraGrowthRun = {}; },
    s => { s.umbraGrowthRun = { ...s.umbraGrowthRun }; }, s => { s.playerHitbox.body = {}; },
    s => { s.physics.world = {}; }, s => { s.gameOver = true; }]) {
    const s = numeric({ finalId: "execution" }).scene; invalidate(s);
    assert.equal(s.getUmbraSelectedFinalId(B), null); assert.equal(s.buildUmbraFinalCard(B, "prism"), null);
  }
  const s = numeric({ finalId: "unknown" }).scene;
  assert.equal(s.getUmbraSelectedFinalId(B), null); assert.equal(s.buildUmbraFinalCard(B, "unknown"), null);
  assert.equal(s.getUmbraSkillFinalProfile(B, { ...s.playerSkills[B].currentStage }, "orbit", "execution"), null);
});

test("Final/Core FIFO is original arrival order per eligible milestone, never all-Core-first, and queries are pure", () => {
  const f = finalRuntime(), s = f.scene; s.pendingLevelUps = 2; s.startingUpgradeSelectionsRemaining = 1;
  runtime.stage(s, M, 8); runtime.stage(s, B, 8); runtime.stage(s, N, 8);
  const history = plain(s.umbraGrowthRun.deferredMilestones), refs = ids.map(id => s[owners[id]]);
  assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
  s.pendingLevelUps = 0; assert.equal(s.tryOpenPendingSkillMutationSelection(), false); s.startingUpgradeSelectionsRemaining = 0;
  const order = [];
  for (let index = 0; index < 6; index++) {
    const next = pick(s); order.push([next.skillId, next.phase]);
    const before = JSON.stringify([s.skillMutationState.entries, s.skillMutationState.pendingQueue, s.umbraGrowthRun.deferredMilestones]);
    for (let repeat = 0; repeat < 6; repeat++) for (const id of ids) { s.getUmbraSelectedFinalId(id); s.buildUmbraFinalCard(id, "prism"); s[getters[id]](); }
    assert.equal(JSON.stringify([s.skillMutationState.entries, s.skillMutationState.pendingQueue, s.umbraGrowthRun.deferredMilestones]), before);
  }
  assert.deepEqual(order, [[M, "stage4"], [M, "stage8"], [B, "stage4"], [B, "stage8"], [N, "stage4"], [N, "stage8"]]);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones), history); assert.deepEqual(ids.map(id => s[owners[id]]), refs);
  assert.equal(s.skillMutationState.pendingQueue.length, 0); assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
});

test("same-RAM Core-only Final deferred connects once, failed/throwing apply and Esc keep a retryable queue", () => {
  const f = runtime.core(runtime.spikeFixture(), [B]), s = f.scene; runtime.stage(s, M, 8); runtime.stage(s, B, 8);
  pick(s); pick(s); const history = plain(s.umbraGrowthRun.deferredMilestones), owner = s.umbraBloodSpikeRuntime;
  assert.equal(s.buildSkillMutationChoices(B, "stage8").length, 0);
  s.verificationContext = Object.freeze({ ...s.verificationContext, finalEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  for (let index = 0; index < 10; index++) s.syncUmbraCoreMilestones();
  assert.deepEqual(plain(s.skillMutationState.pendingQueue.map(request => [request.skillId, request.phase])), [[M, "stage8"], [B, "stage8"]]);
  s.tryOpenPendingSkillMutationSelection(); const stale = s.levelUpCardRecords[0].model.option;
  s.closeUmbraCoreSelection(); s.levelUpActive = false; s.physics.world.resume(); assert.equal(stale.onSelect(), false);
  const apply = s.applyUmbraSkillStageChange;
  for (const mode of ["false", "throw"]) {
    s.applyUmbraSkillStageChange = () => { if (mode === "throw") throw Error("FINAL_TEST_FAILURE"); return false; };
    pick(s); assert.equal(s.getUmbraSelectedFinalId(M), null); assert.equal(s.skillMutationState.pendingQueue.length, 2);
    assert.equal(s.umbraGrowthRun.finalApplying, undefined); assert.equal(s.skillMutationState.selectionLocked, false);
  }
  s.applyUmbraSkillStageChange = apply; pick(s); pick(s);
  assert.equal(s.skillMutationState.pendingQueue.length, 0); assert.equal(s.umbraBloodSpikeRuntime, owner);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones), history);
});

test("invalid pending records are diagnosed without blocking valid later requests or producing empty overlay loops", () => {
  const s = finalRuntime().scene; runtime.stage(s, M, 8); runtime.stage(s, B, 8);
  s.skillMutationState.pendingQueue.unshift({ skillId: "unknown", phase: "stage8", order: -1 });
  s.syncUmbraCoreMilestones(); assert.match(s.skillMutationState.finalQueueIssues.join("/"), /INELIGIBLE_QUEUE_ENTRY/);
  const first = pick(s); assert.equal(first.skillId, M); assert.equal(first.phase, "stage4");
  pick(s); pick(s); pick(s); assert.equal(s.tryOpenPendingSkillMutationSelection(), false);
  assert.equal(s.levelUpActive, false); assert.equal(s.skillMutationState.pendingQueue.length, 1);
});

test("Final confirmation rejects old run, destroyed/replaced owner, forged Stage or lost Core without re-creating runtime", () => {
  for (const invalidate of [s => { s.umbraGrowthRun = { ...s.umbraGrowthRun }; },
    s => { s.destroyUmbraBloodSpikeRuntime(); }, s => { s.umbraBloodSpikeRuntime = { ...s.umbraBloodSpikeRuntime }; },
    s => { s.playerSkills[B].currentStage = { ...s.playerSkills[B].currentStage }; }, s => { s.skillMutationState.entries[B].core = null; }]) {
    const s = finalRuntime([B]).scene; runtime.stage(s, B, 8); pick(s);
    const option = s.levelUpCardRecords[0].model.option; assert.equal(option.phase, "stage8");
    s.selectLevelUpCard(0); invalidate(s); assert.equal(option.onSelect(), false);
    assert.equal(s.skillMutationState.entries[B].stage8Selected, undefined);
    assert.equal(s.skillMutationState.pendingQueue.length, 1); assert.equal(s.getUmbraSelectedFinalId(B), null);
  }
});

test("23 skill + four passive + three Core + three Final selections = 33 actual confirmation operations, with Lv25 final pending preserved through Deep", () => {
  const f = live.progressionFixture(6), s = f.scene;
  s.verificationContext = Object.freeze({ ...s.verificationContext, coreEnabled: true, finalEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  s.syncUmbraCoreMilestones();
  s.showLevelUpCardOverlay = (title, subtitle, options, mode) => {
    s.levelUpSelectionMode = mode; s.levelUpSelectionLocked = false; s.levelUpInputEnabled = true; s.levelUpOpeningBoostActive = false;
    s.levelUpCardRecords = options.map(option => ({ model: s.buildLevelUpCardModel(option, 0), container: {} }));
  };
  s.physics.world.pause = () => { s.physics.world.isPaused = true; }; s.physics.world.resume = () => { s.physics.world.isPaused = false; };
  s.tryOpenPendingPostOverlaySelections = s.tryOpenPendingSkillMutationSelection;
  const originalHide = s.hideOverlay; s.hideOverlay = () => { originalHide(); s.closeUmbraCoreSelection(); };
  const mutationConfirm = () => {
    const option = s.levelUpCardRecords[0].model.option, phase = option.phase;
    const oldDelayed = s.time.delayedCall; let done, ms;
    s.time.delayedCall = (delay, callback) => { ms = delay; done = callback; return { remove() {} }; };
    s.selectLevelUpCard(0); s.selectLevelUpCard(0); assert.equal(ms, 360); assert.ok(done); done(); s.time.delayedCall = oldDelayed;
    return phase;
  };
  s.beginStartingUpgradeDraft(); let normal = 0, skills = 0, passives = 0, cores = 0, finals = 0;
  const passivePlan = ["evasiveFirmware", "evasiveFirmware", "evasiveFirmware", "vitalBloom"];
  while (normal < 27) {
    while (s.skillMutationState?.selectionOpen) mutationConfirm() === "stage4" ? cores++ : finals++;
    if (!s.pendingLevelUps) { s.survivalTime = 1; s.gainExperience(s.stats.nextLevelXp); }
    if (normal === 26) {
      assert.equal(s.stats.level, 25); assert.equal(s.pendingLevelUps, 1);
      s.gainExperience(s.stats.nextLevelXp); assert.equal(s.stats.level, 26); assert.equal(s.pendingLevelUps, 1);
    }
    const passive = !s.isOpeningBoostDraftActive() && passives < 4;
    const option = passive ? s.getPassiveUpgradeChoices().find(candidate => candidate.id === passivePlan[passives]) : s.getAvailableSkillChoices()[0];
    assert.ok(option, JSON.stringify({ normal, skills, passives, passive, level: s.stats.level, pending: s.pendingLevelUps,
      core: s.skillMutationState, stages: ids.map(id => s.getUmbraActiveSkillStage(id)?.stage) }, (key, value) => key === "umbraGrowthRun" ? "owner" : value));
    f.choose(option); normal++; passive ? passives++ : skills++;
  }
  while (s.skillMutationState?.selectionOpen || s.tryOpenPendingSkillMutationSelection()) mutationConfirm() === "stage4" ? cores++ : finals++;
  assert.deepEqual({ skills, passives, cores, finals, operations: normal + cores + finals }, { skills: 23, passives: 4, cores: 3, finals: 3, operations: 33 });
  assert.equal(s.stats.level, 26); assert.equal(s.pendingLevelUps, 0); assert.equal(s.startingUpgradeSelectionsRemaining, 0);
  assert.ok(ids.every(id => s.getUmbraActiveSkillStage(id).stage === 8 && s.getUmbraSelectedFinalId(id) === "execution"));
  assert.equal(s.umbraGrowthRun.deferredMilestones.length, 6); assert.equal(s.skillMutationState.pendingQueue.length, 0);
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});
