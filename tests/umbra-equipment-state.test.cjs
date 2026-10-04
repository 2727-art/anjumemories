"use strict";
// Phase6D2 isolated RAM capture/selection tests. Explicit equipment and Stage
// inputs are not acquisition, refinement, natural XP or a persisted loadout.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", ids = [M, B, N];
const file = path.join(__dirname, "umbra-triad-stats.test.cjs"), text = fs.readFileSync(file, "utf8"), mod = new Module(file, module);
mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(text.slice(0, text.indexOf('\ntest("')) + "\nmodule.exports={triad,setSelections,base};", file);
const { triad, setSelections, base } = mod.exports;
const env = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, "equipmentDefinitions.js"), "utf8"), env);
const system = env.window.EquipmentSystem, plain = value => JSON.parse(JSON.stringify(value));
function equipmentData(rarity = null, rank = 1, refine = 0, overrides = {}) {
  const value = system.createDefaultEquipmentState();
  for (const slot of system.SLOTS) {
    value.bestBySlot[slot] = rarity ? { id: `ram-${slot}`, slot, rarity, rank, sourceType: "debug", sourceDepth: 1 } : null;
    value.refinementBySlot[slot] = refine; value.refinementLimitUnlockedBySlot[slot] = refine >= 16;
  }
  for (const [key, record] of Object.entries(overrides)) Object.assign(value[key], record);
  return value;
}
function installEquipment(f, loadout) {
  const s = f.scene;
  // Remove the old growth-only numeric fixture's two explicit OVL-off stubs;
  // use the actual prototype adapters now being tested.
  delete s.getRunEquipmentCombatLinkState; delete s.getRunEquipmentSkillOverlimitCap;
  s.verificationContext = Object.freeze({ ...s.verificationContext, equipmentEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  s.getEquipmentSystem = () => system;
  s.initializeUmbraEquipmentRun(loadout);
  return f;
}
function equipment({ fixtureId = "baseline", stage = 8, cores = [], finals = [], loadout = equipmentData(), acquired = ids } = {}) {
  return installEquipment(triad(cores, finals, { fixtureId, stage, acquired }), loadout);
}
function runtimeEquipment(acquired = [B, N], loadout = equipmentData("LEGEND", 5, 20)) {
  const f = base.finalRuntime(acquired), s = f.scene;
  s.pendingLevelUps = 0; s.startingUpgradeSelectionsRemaining = 0;
  s.verificationContext = Object.freeze({ ...s.verificationContext, triadEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  s.initializeUmbraTriadRun(); installEquipment(f, loadout);
  s.cancelActiveEnemyBeamCharges = () => {}; // No beam emitter in this numeric fixture; arena keeps its existing cancellation leaf.
  return f;
}
function selectVisible(s, predicate = () => true) {
  const options = s.levelUpCardRecords.map(record => record.model.option), index = options.findIndex(predicate);
  assert.ok(index >= 0); const option = options[index];
  s.selectLevelUpCard(index); s.selectLevelUpCard(index); const callback = s.testConfirm; callback();
  return { option, callback };
}
function numericUi(s) {
  s.pendingLevelUps = 2; s.startingUpgradeSelectionsRemaining = 0; s.updateHud = () => {};
  s.showLevelUpCardOverlay = (title, body, choices, mode) => {
    s.levelUpActive = true; s.levelUpSelectionMode = mode; s.levelUpSelectionLocked = false; s.levelUpInputEnabled = true;
    s.levelUpCardRecords = choices.map(option => ({ model: { option } }));
  };
  s.drawLevelUpCardBackground = () => {};
  s.playLevelUpSelectAnimation = (record, other, callback) => { s.testConfirm = callback; };
  s.hideOverlay = () => { s.levelUpCardRecords = []; s.levelUpInputEnabled = false; s.levelUpSelectionLocked = false; };
  s.resumeGameplayAfterBlockingOverlay = () => {};
  s.showLevelUpChoices = () => { s.lastNormalRebuild = true; s.levelUpActive = false; };
  return s;
}

test("equipment capture normalizes real loadouts, preserves source independence and separates qualification from OVL0", () => {
  for (const [loadout, sensor, arm, cap] of [[equipmentData(), 1, 1, 0], [equipmentData("SR", 3, 5), .96, 1.186, 0],
    [equipmentData("LEGEND", 5, 20), .9075, 1.42, 2], [equipmentData("SSR", 1), .96, 1.192, 1]]) {
    const s = equipment({ loadout }).scene, snap = s.getUmbraEquipmentSnapshot();
    assert.equal(snap.sensorMultiplier, sensor); assert.equal(snap.armamentMultiplier, arm); assert.equal(snap.overlimitCap, cap);
    assert.deepEqual(plain(snap.overlimitLevels), Object.fromEntries(ids.map(id => [id, 0])));
    const old = plain(snap.loadout); loadout.bestBySlot.head = null; loadout.refinementBySlot.weapon = 0;
    assert.deepEqual(plain(s.getUmbraEquipmentSnapshot().loadout), old);
    s.initializeUmbraEquipmentRun(equipmentData()); assert.equal(s.getUmbraEquipmentSnapshot().equipmentSnapshotId, snap.equipmentSnapshotId);
    assert.equal(s.getUmbraEquipmentSnapshot().armamentMultiplier, arm); assert.ok(Object.isFrozen(snap.loadout.bestBySlot));
  }
});

test("S1 equipment is valid but OVL requires individual canonical S8/Core/Final and rejects stale context", () => {
  const f = equipment({ stage: 1, loadout: equipmentData("LEGEND", 5, 20) }), s = f.scene;
  assert.equal(s.getUmbraEquipmentCombatProfile(M).armamentMultiplier, 1.42); assert.equal(s.canUpgradeRunEquipmentSkillOverlimit(M), false);
  const run = s.umbraGrowthRun; s.umbraGrowthRun = { ...run }; assert.equal(s.getUmbraEquipmentCombatProfile(M), null); s.umbraGrowthRun = run;
  for (const key of ["gameOver", "shopActive", "finalBossRaidAssetsLoading"]) {
    s[key] = true; assert.equal(s.getUmbraEquipmentSnapshot(), null); s[key] = false;
  }
  const t = equipment({ cores: ["assault"], finals: ["execution"], loadout: equipmentData("LEGEND", 5, 20) }).scene;
  assert.equal(t.canUpgradeRunEquipmentSkillOverlimit(M), true); assert.equal(t.canUpgradeRunEquipmentSkillOverlimit(B), false);
  assert.equal(t.getUmbraEquipmentCombatProfile(M, 2).overlimitMultiplier, 1.2); assert.equal(t.getUmbraEquipmentSnapshot().overlimitLevels[M], 0);
  assert.equal(t.queueFinalMutationEquipmentOverlimitBonus(M), false, "Query/manual queue cannot retroactively award an existing Final");
});

test("real Final commits create only matching bonus tickets; Esc and open exceptions restore exactly once", () => {
  const s = runtimeEquipment([]).scene;
  base.runtime.stage(s, M, 8); base.pick(s, "assault", "execution"); base.pick(s, "assault", "execution");
  assert.equal(s.levelUpSelectionMode, "equipmentOverlimitBonus"); assert.equal(s.levelUpCardRecords.length, 1);
  const snapshot = s.getUmbraEquipmentSnapshot(); assert.equal(snapshot.currentSelection.skillId, M);
  s.closeUmbraEquipmentOverlimitSelection(); s.closeUmbraEquipmentOverlimitSelection(); s.levelUpActive = false;
  assert.deepEqual(plain(s.getUmbraEquipmentSnapshot().pendingFinalSkillIds), [M]);
  const show = s.showLevelUpCardOverlay; s.showLevelUpCardOverlay = () => { throw Error("INTENDED_OVL_OPEN_FAILURE"); };
  assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), false); assert.deepEqual(plain(s.getUmbraEquipmentSnapshot().pendingFinalSkillIds), [M]);
  s.showLevelUpCardOverlay = show; s.levelUpActive = false;
  assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), true);
  const picked = selectVisible(s); assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[M], 1);
  assert.equal(s.getUmbraEquipmentSnapshot().overlimitRevision, 1); assert.equal(picked.option.onSelect(), false);
  assert.equal(s.pendingLevelUps, 0); assert.equal(s.getUmbraEquipmentSnapshot().currentSelection, null);
});

test("set qualification uses real five-slot rarity rules, normalizes invalid data and does not reapply starting stats", () => {
  const missing = equipmentData("LEGEND", 5, 20, { bestBySlot: { head: null } });
  const mixed = equipmentData("LEGEND", 5, 20); mixed.bestBySlot.head.rarity = "SSR";
  const low = equipmentData("LEGEND", 5, 20); low.bestBySlot.head.rarity = "SR";
  for (const [loadout, cap] of [[missing, 0], [mixed, 1], [low, 0]]) assert.equal(equipment({ loadout }).scene.getUmbraEquipmentSnapshot().overlimitCap, cap);
  const invalid = equipmentData("SSR", 1); invalid.bestBySlot.head.slot = "unknown";
  invalid.bestBySlot.weapon.rank = Infinity; invalid.refinementBySlot.weapon = -100;
  const s = equipment({ loadout: invalid }).scene, snapshot = s.getUmbraEquipmentSnapshot();
  assert.equal(snapshot.loadout.bestBySlot.head, null); assert.equal(snapshot.loadout.refinementBySlot.weapon, 0);
  assert.equal(snapshot.overlimitCap, 0); assert.ok(Number.isFinite(snapshot.armamentMultiplier));
  const values = plain(s.stats); s.initializeUmbraEquipmentRun(equipmentData("LEGEND", 5, 20));
  assert.deepEqual(plain(s.stats), values, "Capture neither reapplies FRAME/CORE nor rebuilds player stats");
  assert.deepEqual(plain(s.normalizeRunEquipmentOverlimitLevels({ [M]: 2, basicSkill: 1 }, 2)), { basicSkill: 1, tornadoSkill: 0, rabbitThunderSkill: 0 });
});

test("normal OVL consumes one normal pending only; stale I, false, exception, query and duplicate callback cannot upgrade or consume", () => {
  const make = () => numericUi(equipment({ cores: ["assault"], finals: ["execution"], loadout: equipmentData("LEGEND", 5, 20) }).scene);
  let s = make(), option = s.buildEquipmentOverlimitChoice(M, { source: "levelUp" });
  assert.equal(option.onSelect(), false); const triadRevision = s.umbraTriadState.revision;
  s.showLevelUpCardOverlay("normal", "", [option], "level"); const selected = selectVisible(s);
  assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[M], 1); assert.equal(s.pendingLevelUps, 1);
  assert.equal(s.getUmbraEquipmentSnapshot().selectionCounts.normal, 1); assert.equal(s.umbraTriadState.revision, triadRevision);
  assert.equal(selected.option.onSelect(), false); assert.equal(s.playerSkills[M].stageIndex, 7);
  for (const kind of ["false", "throw", "staleI"]) {
    s = make(); option = s.buildEquipmentOverlimitChoice(M, { source: "levelUp" });
    s.showLevelUpCardOverlay("normal", "", [option], "level");
    if (kind === "staleI") s.umbraEquipmentState.overlimitLevels = Object.freeze({ ...s.umbraEquipmentState.overlimitLevels, [M]: 1 }); // Explicit adversarial RAM boundary, no acquisition claim.
    else option.onSelect = () => { if (kind === "throw") throw Error("INTENDED_OVL_APPLY_FAILURE"); return false; };
    selectVisible(s); assert.equal(s.pendingLevelUps, 2); assert.equal(s.getUmbraEquipmentSnapshot().overlimitRevision, 0);
    assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[M], kind === "staleI" ? 1 : 0);
    assert.equal(s.getUmbraEquipmentSnapshot().selectionCounts.normal, 0); assert.equal(s.levelUpActive, false);
  }
});

test("Deep bonus is driven by actual Deep Level gains, capped by current remaining steps minus Final/current reservations", () => {
  const s = equipment({ cores: ["assault", "control", "reactor"], finals: ["execution", "prism", "singularity"], loadout: equipmentData("LEGEND", 5, 20) }).scene;
  s.stageDepth = 6; s.stats.level = 25; s.stats.xp = 0; s.umbraEquipmentState.lastDeepLevel = 25;
  s.setLastPickupNotice = s.spawnPlayerHealNumber = s.showOverflowRewardText = () => {};
  s.tryOpenPendingPostOverlaySelections = () => false; s.syncPlayerLevelXpRequirement();
  const bonus = s.umbraEquipmentState.bonus;
  bonus.pendingFinalSkillIds = [M, B]; bonus.currentSelection = { id: 1, skillId: N, source: "finalMutationOverlimitBonus", status: "open" };
  for (let index = 0; index < 5; index++) {
    assert.equal(s.gainDeepLevelExperience(s.stats.nextLevelXp).levels, 1);
    assert.equal(s.getUmbraEquipmentSnapshot().pendingDeepCount, Math.min(3, index + 1));
  }
  const pending = bonus.pendingCount; s.queueDeepLevelEquipmentOverlimitBonus(50); assert.equal(bonus.pendingCount, pending, "No actual new level means no opportunity");
  s.stats.level = 99; s.umbraEquipmentState.lastDeepLevel = 99; s.syncPlayerLevelXpRequirement();
  assert.equal(s.gainDeepLevelExperience(999999).levels, 0); assert.equal(bonus.pendingCount, pending);
  s.stats.level = 26; s.stageDepth = 5; assert.equal(s.gainDeepLevelExperience(999999).levels, 0);
});

test("zero-difference OVL I remains selectable with truthful cap-specific cards and perweapon levels", () => {
  for (const [rarity, cap] of [["SSR", 1], ["LEGEND", 2]]) {
    const s = equipment({ cores: [null, null, "assault"], finals: [null, null, "prism"], loadout: equipmentData(rarity, 5) }).scene;
    const choice = s.buildEquipmentOverlimitChoice(N, { source: "levelUp" });
    assert.ok(choice); assert.equal(choice.umbraEquipmentCard.zeroCurrentDifference, true); assert.match(choice.description, /差0/);
    assert.equal(choice.description.includes("IIへの前段階"), cap === 2);
    assert.ok(choice.umbraEquipmentCard.chips.some(chip => chip.label.includes("周回 受付前E")));
    assert.ok(choice.umbraEquipmentCard.chips.some(chip => chip.label.includes("残留 PRISM")));
  }
});

test("the actual Deep98 to99 gain reserves once, XP after99 does not; invalid pending drains without empty overlays", () => {
  const s = equipment({ cores: ["assault"], finals: ["execution"], loadout: equipmentData("LEGEND", 5, 20) }).scene;
  s.stageDepth = 6; s.stats.level = 98; s.stats.xp = 0; s.umbraEquipmentState.lastDeepLevel = 98;
  s.setLastPickupNotice = s.spawnPlayerHealNumber = s.showOverflowRewardText = () => {}; s.tryOpenPendingPostOverlaySelections = () => false;
  s.syncPlayerLevelXpRequirement(); assert.equal(s.gainDeepLevelExperience(s.stats.nextLevelXp).levels, 1);
  assert.equal(s.getUmbraEquipmentSnapshot().pendingDeepCount, 1);
  assert.equal(s.gainDeepLevelExperience(999999).levels, 0); assert.equal(s.getUmbraEquipmentSnapshot().pendingDeepCount, 1);
  const bonus = s.umbraEquipmentState.bonus; bonus.pendingFinalSkillIds = ["unknown", M]; bonus.pendingCount = 2;
  s.umbraEquipmentState.overlimitLevels = Object.freeze({ ...s.umbraEquipmentState.overlimitLevels, [M]: 2 }); // Explicit cap boundary input.
  let overlays = 0; s.showLevelUpCardOverlay = () => { overlays++; };
  assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), false); assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), false);
  assert.equal(overlays, 0); assert.equal(s.getUmbraEquipmentSnapshot().pendingDeepCount, 0);
  assert.deepEqual(plain(s.getUmbraEquipmentSnapshot().pendingFinalSkillIds), []);
});

test("Final false or thrown Stage application never queues OVL; owner/Opening/Raid/old-run guards reject card queries and confirmations", () => {
  for (const fail of [false, "throw"]) {
    const s = runtimeEquipment([]).scene; base.runtime.stage(s, M, 8); base.pick(s, "assault");
    s.applyUmbraSkillStageChange = () => { if (fail === "throw") throw Error("INTENDED_FINAL_BEFORE_OVL_FAILURE"); return false; };
    selectVisible(s, option => option.choiceId === "execution");
    const snapshot = s.getUmbraEquipmentSnapshot(); assert.equal(snapshot.pendingFinalSkillIds.length, 0);
    assert.equal(snapshot.currentSelection, null); assert.equal(s.getUmbraSelectedFinalId(M), null); assert.equal(s.pendingLevelUps, 0);
  }
  const s = numericUi(equipment({ cores: ["assault"], finals: ["execution"], loadout: equipmentData("SSR", 5) }).scene);
  assert.equal(s.buildEquipmentOverlimitChoice(M, { openingBoost: true }), null);
  s.startingUpgradeSelectionsRemaining = 1; s.survivalTime = 0;
  assert.equal(s.isOpeningBoostDraftActive(), true); assert.equal(s.buildEquipmentOverlimitChoice(M), null); s.startingUpgradeSelectionsRemaining = 0;
  s.skillMutationState.pendingQueue.push({ skillId: M, phase: "stage8" }); assert.equal(s.buildEquipmentOverlimitChoice(M), null); s.skillMutationState.pendingQueue = [];
  const option = s.buildEquipmentOverlimitChoice(M, { source: "levelUp" }); s.showLevelUpCardOverlay("normal", "", [option], "level");
  s.selectLevelUpCard(0); const run = s.umbraGrowthRun; s.umbraGrowthRun = { ...run }; s.testConfirm();
  assert.equal(s.pendingLevelUps, 2); s.umbraGrowthRun = run; assert.equal(s.getUmbraEquipmentSnapshot().overlimitRevision, 0);
  s.umbraMoonlightRuntime.destroyed = true; assert.equal(s.buildEquipmentOverlimitChoice(M), null); assert.equal(s.getUmbraEquipmentCombatProfile(M), null);
});

test("a post-commit presentation error is reported but cannot undo or duplicate an already successful OVL transaction", () => {
  const s = numericUi(equipment({ cores: ["assault"], finals: ["execution"], loadout: equipmentData("SSR", 5) }).scene);
  s.updateHud = () => { throw Error("INTENDED_HUD_AFTER_SUCCESS"); };
  const option = s.buildEquipmentOverlimitChoice(M, { source: "levelUp" }); s.showLevelUpCardOverlay("normal", "", [option], "level");
  selectVisible(s);
  assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[M], 1); assert.equal(s.getUmbraEquipmentSnapshot().overlimitRevision, 1);
  assert.equal(s.pendingLevelUps, 1); assert.match(s.umbraEquipmentState.lastError, /INTENDED_HUD_AFTER_SUCCESS/);
  assert.equal(option.onSelect(), false); assert.equal(s.buildEquipmentOverlimitChoice(M), null, "SSR cap I is terminal");
});

test("a delayed callback from a closed overlay cannot close, restore or change the new live bonus ticket", () => {
  const s = runtimeEquipment([]).scene;
  base.runtime.stage(s, M, 8); base.pick(s, "assault", "execution"); base.pick(s, "assault", "execution");
  s.selectLevelUpCard(0); const oldCallback = s.testConfirm;
  s.closeUmbraEquipmentOverlimitSelection(); s.hideOverlay(); s.levelUpActive = false;
  assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), true);
  const before = plain(s.getUmbraEquipmentSnapshot()), records = s.levelUpCardRecords;
  const ticket = s.umbraEquipmentState.bonus.currentSelection, pending = s.pendingLevelUps;
  oldCallback();
  assert.deepEqual(plain(s.getUmbraEquipmentSnapshot()), before);
  assert.equal(s.umbraEquipmentState.bonus.currentSelection, ticket); assert.equal(s.levelUpCardRecords, records);
  assert.equal(s.levelUpActive, true); assert.equal(s.levelUpSelectionMode, "equipmentOverlimitBonus");
  assert.equal(s.pendingLevelUps, pending); assert.equal(s.levelUpSelectionLocked, false);
});
