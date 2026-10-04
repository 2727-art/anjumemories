"use strict";
// Phase6D2 legacy regression against its own A61 start, using explicit RAM gear.
// The real generic equipment/OVL/queue/select/complete methods run below. Graphics,
// timers and physics pause/resume are recorded leaves. Generic Mutation selection
// setters run, but their TRIAD publication boundary is a recorded stub because
// the full generic publisher may reach Atlas persistence. No save or load runs.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), Module = require("node:module");
const crypto = require("node:crypto"), test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), baseline = path.join(root, ".tmp_umbra_phase6d2/2026-09-08-start/baseline");
const oldIds = ["basicSkill", "tornadoSkill", "rabbitThunderSkill"], cannon = "regaliaBastionCannon";
const umbraIds = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"], plain = value => JSON.parse(JSON.stringify(value));
assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(baseline, "game.js"))).digest("hex"),
  "a61a85788ce07d2ac67124f9b9cedadc9a5306e8a2b8bc33b64e2084ee66f90c");
function loader(previous) {
  const file = path.join(__dirname, "umbra-growth-stats.test.cjs");
  let text = fs.readFileSync(file, "utf8"); text = text.slice(0, text.indexOf("\nfor (const id of ids) test("));
  if (previous) for (const name of ["game.js", "skillDefinitions.js"])
    text = text.replace(`path.join(root, "${name}")`, JSON.stringify(path.join(baseline, name)));
  const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(text + "\nmodule.exports={fixture};", file);
  const env = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(previous ? baseline : root, "equipmentDefinitions.js"), "utf8"), env);
  return { ...mod.exports, equipment: env.window.EquipmentSystem };
}
const current = loader(false), previous = loader(true);
function fixture(source, mechId, rarity = "LEGEND", undefinedFlag = false) {
  const f = source.fixture({ acquired: [], growth: false }), s = f.scene, events = [];
  delete s.verificationContext; if (undefinedFlag) s.verificationContext = { equipmentEnabled: undefined };
  delete s.getRunEquipmentCombatLinkState; delete s.getRunEquipmentSkillOverlimitCap;
  s.isUmbraPhase2ADrive = false; s.runPlayerMechSnapshotActive = true; s.runPlayerMechId = mechId;
  s.getSelectedPlayerMechId = () => mechId; s.getSelectedPlayerMechDefinition = () => f.api.mechs[mechId];
  s.getEquipmentSystem = () => source.equipment;
  for (const method of ["loadEquipmentState", "saveEquipmentState", "loadMutationAtlasState", "saveMutationAtlasState"])
    s[method] = () => { f.calls.storage++; assert.fail(`${method} must not run in the isolated legacy fixture`); };
  s.refreshTriadMatrixSnapshot = reason => events.push(["triadPublicationBoundary", reason]);
  s.initializeSkillMutationState();
  for (const id of [...oldIds, cannon]) {
    s.playerSkills[id] = s.createSkillState(f.api.skills[id]);
    s.playerSkills[id].stageIndex = 7; s.playerSkills[id].currentStage = f.api.skills[id].stages[7];
    if (s.isSkillMutationTargetSkill(id)) {
      assert.equal(s.setSkillMutationCore(id, "assault"), true); assert.equal(s.setSkillMutationFinal(id, "execution"), true);
    }
  }
  const equipment = source.equipment.createDefaultEquipmentState();
  for (const slot of source.equipment.SLOTS) {
    equipment.bestBySlot[slot] = rarity ? { id: `legacy-ram-${slot}`, slot, rarity, rank: 5, sourceType: "debug", sourceDepth: 1 } : null;
    equipment.refinementBySlot[slot] = rarity === "LEGEND" ? 20 : 0; equipment.refinementLimitUnlockedBySlot[slot] = rarity === "LEGEND";
  }
  s.runEquipmentLoadoutSnapshot = s.normalizeEquipmentState(equipment);
  s.runEquipmentBonuses = source.equipment.getEquipmentBonusesFromState(s.runEquipmentLoadoutSnapshot);
  s.captureRunEquipmentCombatLinkSnapshot(s.runEquipmentLoadoutSnapshot);
  s.initializeRunEquipmentOverlimitBonusState(); s.pendingLevelUps = 0;
  s.updateHud = () => events.push(["hud"]); s.cancelActiveEnemyBeamCharges = () => events.push(["beamCancel"]);
  s.physics.world.pause = () => events.push(["physicsPause"]);
  s.physics.world.resume = () => events.push(["physicsResume"]);
  s.tryOpenPendingPostOverlaySelections = () => { events.push(["postOverlayBoundary"]); return false; };
  s.resumeGameplayAfterBlockingOverlay = reason => events.push(["resumeBoundary", reason]);
  s.showLevelUpCardOverlay = (title, body, choices, mode) => {
    events.push(["overlay", title, body, choices.map(choice => choice.skillId), mode]);
    s.levelUpActive = true; s.levelUpSelectionMode = mode; s.levelUpSelectionLocked = false; s.levelUpInputEnabled = true;
    s.levelUpCardRecords = choices.map(option => ({ model: { option } }));
  };
  s.drawLevelUpCardBackground = () => {};
  s.playLevelUpSelectAnimation = (record, others, callback) => { events.push(["selectAnimationBoundary"]); s.confirm = callback; };
  s.hideOverlay = () => { events.push(["hide"]); s.levelUpCardRecords = []; s.levelUpInputEnabled = false; s.levelUpSelectionLocked = false; };
  return { ...f, events };
}
const state = f => plain({ combat: f.scene.getRunEquipmentCombatLinkState(), bonus: f.scene.runEquipmentOverlimitBonusState,
  pending: f.scene.pendingLevelUps, mode: f.scene.levelUpSelectionMode, active: f.scene.levelUpActive,
  choices: f.scene.levelUpCardRecords?.map(record => record.model.option), events: f.events, calls: f.calls });
function select(s, index = 0) { s.selectLevelUpCard(index); s.selectLevelUpCard(index); s.confirm(); }

for (const mech of ["defaultBear", "regaliaBastion"]) test(`${mech}: old three-ID eligibility, default arithmetic and normal OVL selection match A61`, () => {
  for (const undefinedFlag of [false, true]) for (const rarity of [null, "SSR", "LEGEND"]) {
    const pairs = [previous, current].map(source => fixture(source, mech, rarity, undefinedFlag));
    const results = pairs.map(f => {
      const s = f.scene, initial = plain(s.getAvailableEquipmentOverlimitChoices()), steps = s.countAvailableEquipmentOverlimitUpgradeSteps();
      const eligible = mech === "defaultBear" ? oldIds : oldIds.slice(1);
      assert.deepEqual(initial.map(option => option.skillId), rarity ? eligible : []);
      assert.equal(steps, eligible.length * (rarity === "LEGEND" ? 2 : rarity === "SSR" ? 1 : 0));
      assert.equal(s.hasAvailableRunEquipmentOverlimitUpgrade(), Boolean(rarity));
      const arithmetic = [];
      for (let level = 0; level <= s.getRunEquipmentOverlimitCap(); level++) {
        s.runEquipmentCombatLinkState.overlimitLevels = Object.fromEntries(oldIds.map(id => [id, level]));
        for (const id of [...oldIds, cannon, ...umbraIds]) for (const raw of [0, .1, 1, 2, 3, 7, 12, 23, -2])
          arithmetic.push([id, level, raw, s.applyRunEquipmentPlayerSkillDamageBonus(id, raw),
            s.getRunEquipmentAdjustedSkillIntervalMs(id, 101.5), s.getRunEquipmentAdjustedSkillIntervalMs(id, 31.5, 70)]);
      }
      s.runEquipmentCombatLinkState.overlimitLevels = s.createDefaultRunEquipmentOverlimitLevels();
      if (rarity) {
        const option = s.getAvailableEquipmentOverlimitChoices()[0]; s.pendingLevelUps = 1;
        s.showLevelUpCardOverlay("normal", "", [option], "level"); select(s);
        assert.equal(s.getRunEquipmentSkillOverlimitLevel(option.skillId), 1); assert.equal(s.pendingLevelUps, 0);
        assert.equal(s.getRunEquipmentSkillOverlimitDamageMultiplier(option.skillId), 1.1);
      }
      assert.deepEqual(f.calls, { storage: 0, network: 0 });
      return { initial, steps, arithmetic, state: state(f) };
    });
    assert.deepEqual(results[1], results[0]);
  }
});

for (const mech of ["defaultBear", "regaliaBastion"]) test(`${mech}: Final-target bonus then Deep choices retain their queues, one-step awards and normal budget`, () => {
  const results = [previous, current].map(source => {
    const f = fixture(source, mech), s = f.scene, target = mech === "defaultBear" ? oldIds[0] : oldIds[1];
    assert.equal(s.queueFinalMutationEquipmentOverlimitBonus(target), true); assert.equal(s.queueFinalMutationEquipmentOverlimitBonus(target), false);
    const deep = s.queueDeepLevelEquipmentOverlimitBonus(99), snapshots = [state(f)];
    assert.equal(deep.queued, (mech === "defaultBear" ? 6 : 4) - 1);
    assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), true);
    assert.equal(s.levelUpCardRecords.length, 1); assert.equal(s.levelUpCardRecords[0].model.option.skillId, target);
    select(s); assert.equal(s.getRunEquipmentSkillOverlimitLevel(target), 1); assert.equal(s.pendingLevelUps, 0); snapshots.push(state(f));
    assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), true); select(s);
    assert.equal(s.getRunEquipmentSkillOverlimitLevel(target), 2); assert.equal(s.getRunEquipmentSkillOverlimitDamageMultiplier(target), 1.2);
    assert.equal(s.pendingLevelUps, 0); snapshots.push(state(f));
    assert.deepEqual(f.calls, { storage: 0, network: 0 }); return snapshots;
  });
  assert.deepEqual(results[1], results[0]);
});

test("legacy blocked eligibility and empty queue defaults, Raid suppression, cannon exclusion and static normalizer IDs are unchanged", () => {
  for (const mech of ["defaultBear", "regaliaBastion"]) {
    const results = [previous, current].map(source => {
      const { scene: s, calls } = fixture(source, mech), target = "tornadoSkill", values = [];
      assert.equal(s.isUmbraEquipmentScope?.() || false, false);
      assert.equal(s.isEquipmentCombatLinkSkillId(cannon), false); assert.equal(s.applyRunEquipmentPlayerSkillDamageBonus(cannon, 3), 3);
      assert.equal(s.getRunEquipmentAdjustedSkillIntervalMs(cannon, 101.5), 102);
      assert.deepEqual(Object.keys(s.normalizeRunEquipmentOverlimitLevels({ ...Object.fromEntries(umbraIds.map(id => [id, 2])), [cannon]: 2 }, 2)), oldIds);
      for (const id of [cannon, ...umbraIds]) assert.equal(s.queueFinalMutationEquipmentOverlimitBonus(id), false);
      for (const options of [{}, { openingBoost: true }, { source: "openingBoost" }, { allowEquipmentOverlimit: false }])
        values.push(s.canUpgradeRunEquipmentSkillOverlimit(target, options));
      for (const flag of ["gameOver", "shopActive", "extractionComplete", "skillMutationSelectionActive"]) {
        s[flag] = true; values.push(s.canUpgradeRunEquipmentSkillOverlimit(target)); s[flag] = false;
      }
      s.skillMutationState.pendingQueue.push({ skillId: target, phase: "stage8" }); values.push(s.canUpgradeRunEquipmentSkillOverlimit(target)); s.skillMutationState.pendingQueue = [];
      s.playerSkills[target].stageIndex = 6; values.push(s.canUpgradeRunEquipmentSkillOverlimit(target)); s.playerSkills[target].stageIndex = 7;
      s.isFinalBossRaidActive = () => true; s.finalBossRaidState = { targetDepth: 10, blockingPlaceholderActive: false };
      values.push(s.shouldSuppressRunEquipmentCombatLink(), s.getRunEquipmentCombatLinkLevel({ effective: true }),
        s.getRunEquipmentSkillOverlimitDamageMultiplier(target), s.applyRunEquipmentPlayerSkillDamageBonus(target, 7), s.getRunEquipmentAdjustedSkillIntervalMs(target, 101.5));
      assert.equal(values[0], true); assert.equal(values.slice(1, 10).every(value => value === false), true);
      assert.equal(s.canUpgradeRunEquipmentSkillOverlimit(target), false);
      assert.deepEqual(plain(s.queueDeepLevelEquipmentOverlimitBonus(0)), { queued: 0, pendingCount: 0 });
      assert.equal(s.canOpenEquipmentOverlimitBonusSelection(), false); assert.equal(s.tryOpenPendingEquipmentOverlimitBonusSelection(), false);
      assert.deepEqual(calls, { storage: 0, network: 0 }); return { values, state: plain(s.getRunEquipmentCombatLinkState()) };
    });
    assert.deepEqual(results[1], results[0]);
  }
});
