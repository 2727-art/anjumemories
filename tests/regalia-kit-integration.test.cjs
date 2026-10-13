"use strict";
// REGALIA's own skills joined to the rest of the game (docs/regalia-kit-design.md 7-9, R4):
// Mutation names and targets, the equipment Combat Link (SENSOR / ARMAMENT / OVERLIMIT) and the
// RUN ARCHIVE v3 slots, with old REGALIA records still shown in their old slots.
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, plain, skillStateAt } = require("./regalia-kit-fixture.cjs");
const AEGIS = "regaliaAegisWall";
const PULSE = "regaliaCounterPulse";
const CANNON = "regaliaBastionCannon";
const DEFAULT_SLOTS = ["basicSkill", "tornadoSkill", "rabbitThunderSkill"];
const LEGACY_REGALIA_SLOTS = [CANNON, "tornadoSkill", "rabbitThunderSkill"];
const KIT_SLOTS = [CANNON, AEGIS, PULSE];

// The fixture stubs the equipment and Mutation multipliers for the skill tests; these tests use the real ones.
function useRealModifiers(scene) {
  for (const name of ["getMutatedSkillDamage", "applyRunEquipmentPlayerSkillDamageBonus",
    "getSkillMutationCooldownMultiplier", "getRunEquipmentAttackIntervalMultiplier"]) {
    delete scene[name];
  }
  scene.refreshTriadMatrixSnapshot = () => null;
  scene.initializeSkillMutationState();
}

// A LEGEND +5 loadout in RAM: SENSOR and ARMAMENT bonuses and OVERLIMIT up to II.
function equipLegend(scene) {
  scene.runEquipmentBonuses = {
    ...scene.createEmptyEquipmentBonuses(),
    attackIntervalMultiplier: 0.9,
    playerSkillDamageMultiplier: 1.4
  };
  scene.runEquipmentCombatLinkState = scene.normalizeRunEquipmentCombatLinkState({
    snapshotCaptured: true, highestTierId: "legendFive"
  });
  scene.initializeRunEquipmentOverlimitBonusState();
}

// Owns the slot skills at Stage 8 with a Final Mutation, as a late run does.
function ownFinalSkills(scene, api, skillIds) {
  for (const skillId of skillIds) {
    scene.playerSkills[skillId] = skillStateAt(scene, api, skillId, 8);
    if (scene.isSkillMutationTargetSkill(skillId)) {
      assert.equal(scene.setSkillMutationCore(skillId, "assault"), true);
      assert.equal(scene.setSkillMutationFinal(skillId, "execution"), true);
    }
  }
}

test("Mutation names follow the design for both skills", () => {
  const { scene } = fixture();
  const expected = {
    [AEGIS]: {
      titles: ["AEGIS MUTATION CORE", "AEGIS FINAL MUTATION"],
      cores: { assault: "SPIKE WALL CORE", control: "HOLD LINE CORE", reactor: "RAPID RAMPART CORE" },
      finals: {
        assault_execution: "KINGSLAYER RAMPART", assault_prism: "SHARD BULWARK", assault_singularity: "CITADEL QUAKE",
        control_execution: "IRON VERDICT", control_prism: "MIRROR PHALANX", control_singularity: "GRAVITY BASTION",
        reactor_execution: "LANCE WALL", reactor_prism: "RELAY AEGIS", reactor_singularity: "ROYAL DOMINION"
      }
    },
    [PULSE]: {
      titles: ["PULSE MUTATION CORE", "PULSE FINAL MUTATION"],
      cores: { assault: "RETRIBUTION CORE", control: "REPULSE CORE", reactor: "CAPACITOR CORE" },
      finals: {
        assault_execution: "JUDGMENT WAVE", assault_prism: "SPLINTER NOVA", assault_singularity: "WRATH EPICENTER",
        control_execution: "SENTENCE PULSE", control_prism: "ECHO REPULSE", control_singularity: "STILL DOMAIN",
        reactor_execution: "OVERLOAD RETORT", reactor_prism: "RELAY SURGE", reactor_singularity: "CROWN DYNAMO"
      }
    }
  };
  for (const [skillId, names] of Object.entries(expected)) {
    const definition = scene.getSkillMutationSkillDefinition(skillId);
    assert.deepEqual([definition.stage4Title, definition.stage8Title], names.titles);
    for (const [coreId, label] of Object.entries(names.cores)) {
      assert.equal(scene.getSkillMutationCoreLabel(skillId, coreId), label);
    }
    for (const [formId, label] of Object.entries(names.finals)) {
      assert.equal(scene.getSkillMutationFinalFormLabel(skillId, formId), label);
    }
  }
});

test("REGALIA's own skills are Mutation targets in its slots, and their damage and intervals read the Mutation", () => {
  const { scene, api } = fixture();
  useRealModifiers(scene);
  assert.deepEqual(plain(scene.getSkillMutationTargetSkillIds()), KIT_SLOTS);
  ownFinalSkills(scene, api, [AEGIS, PULSE]);
  scene.isHighValueMutationTarget = () => false;
  scene.getTriadSkillDamageMultiplier = () => 1;
  // assault Core x1.12, execution Final only on high-value targets.
  assert.equal(scene.getMutatedSkillDamage(AEGIS, 100), 112);
  assert.equal(scene.getMutatedSkillDamage(PULSE, 100), 112);
  // assault Core shortens the re-deploy and the automatic wave (x0.96).
  const aegis = scene.playerSkills[AEGIS];
  const pulse = scene.playerSkills[PULSE];
  scene.stats = { maxHp: 200, fireInterval: 540, bulletDamage: 1 };
  assert.equal(scene.getRegaliaAegisWallCooldownMs(aegis, aegis.currentStage), Math.round(5500 * 0.96));
  assert.equal(scene.getRegaliaCounterPulseIntervalMs(pulse, pulse.currentStage), Math.round(1800 * 0.96));
});

test("the default mech keeps Orbit Core / Tornado / Rabbit as its Mutation targets", () => {
  const { scene } = fixture({ mechId: "defaultBear" });
  assert.deepEqual(plain(scene.getSkillMutationTargetSkillIds()), DEFAULT_SLOTS);
});

test("the Combat Link targets are each mech's own slots; the cannon stays outside", () => {
  const regalia = fixture().scene;
  assert.deepEqual(plain(regalia.getEquipmentCombatLinkTargetSkillIds()), [AEGIS, PULSE]);
  const bear = fixture({ mechId: "defaultBear" }).scene;
  assert.deepEqual(plain(bear.getEquipmentCombatLinkTargetSkillIds()), DEFAULT_SLOTS);
  for (const scene of [regalia, bear]) {
    assert.equal(scene.isEquipmentCombatLinkSkillId(CANNON), false);
    assert.equal(scene.isEquipmentCombatLinkSkillId(AEGIS), true);
    assert.equal(scene.isEquipmentCombatLinkSkillId(PULSE), true);
  }
  // The run state keeps one level per target of the mech; the default mech's state is unchanged.
  assert.deepEqual(plain(regalia.createDefaultRunEquipmentOverlimitLevels()), { [AEGIS]: 0, [PULSE]: 0 });
  assert.deepEqual(plain(regalia.normalizeRunEquipmentOverlimitLevels({ [CANNON]: 2, [AEGIS]: 2, tornadoSkill: 1 }, 2)), { [AEGIS]: 2, [PULSE]: 0 });
  assert.deepEqual(Object.keys(bear.createDefaultRunEquipmentOverlimitLevels()), DEFAULT_SLOTS);
  assert.deepEqual(Object.keys(bear.normalizeRunEquipmentOverlimitLevels({ [AEGIS]: 2 }, 2)), DEFAULT_SLOTS);
  // UMBRA keeps the default three in this generic state (its own equipment state is separate).
  const umbra = fixture({ mechId: "umbraSeraph" }).scene;
  assert.deepEqual(Object.keys(umbra.createDefaultRunEquipmentOverlimitLevels()), DEFAULT_SLOTS);
});

test("SENSOR shortens both intervals and ARMAMENT raises every hit; the cannon gets neither", () => {
  const { scene, api } = fixture();
  useRealModifiers(scene);
  equipLegend(scene);
  scene.stats = { maxHp: 200, fireInterval: 540, bulletDamage: 1 };
  const aegis = scene.playerSkills[AEGIS] = skillStateAt(scene, api, AEGIS, 1);
  const pulse = scene.playerSkills[PULSE] = skillStateAt(scene, api, PULSE, 1);
  assert.equal(scene.getRegaliaAegisWallCooldownMs(aegis, aegis.currentStage), Math.round(7000 * 0.9));
  assert.equal(scene.getRegaliaCounterPulseIntervalMs(pulse, pulse.currentStage), Math.round(3200 * 0.9));
  assert.equal(scene.applyRunEquipmentPlayerSkillDamageBonus(AEGIS, 10), 14);
  assert.equal(scene.applyRunEquipmentPlayerSkillDamageBonus(PULSE, 10), 14);
  assert.equal(scene.applyRunEquipmentPlayerSkillDamageBonus(CANNON, 10), 10);
  assert.equal(scene.getRunEquipmentAttackIntervalMultiplier(CANNON), 1);
});

test("OVERLIMIT is offered for a Final Aegis Wall / Counter Pulse and multiplies their damage", () => {
  const { scene, api } = fixture();
  useRealModifiers(scene);
  equipLegend(scene);
  scene.updateHud = () => {};
  ownFinalSkills(scene, api, [CANNON, AEGIS, PULSE]);
  assert.deepEqual(plain(scene.getAvailableEquipmentOverlimitChoices().map(choice => choice.skillId)), [AEGIS, PULSE]);
  assert.equal(scene.countAvailableEquipmentOverlimitUpgradeSteps(), 4);
  assert.equal(scene.applyRunEquipmentSkillOverlimitUpgrade(PULSE), true);
  assert.equal(scene.getRunEquipmentSkillOverlimitLevel(PULSE), 1);
  // OVERLIMIT I x1.10, then ARMAMENT x1.4: round(round(10 * 1.1) * 1.4).
  assert.equal(scene.applyRunEquipmentPlayerSkillDamageBonus(PULSE, 10), 15);
  assert.equal(scene.applyRunEquipmentPlayerSkillDamageBonus(AEGIS, 10), 14);
  assert.equal(scene.applyRunEquipmentSkillOverlimitUpgrade(CANNON), false);
});

test("RUN ARCHIVE v3 records REGALIA's slots and levels for its own skills", () => {
  const { scene, api } = fixture();
  scene.runPlayerMechSnapshotActive = true;
  scene.runPlayerMechId = "regaliaBastion";
  scene.playerSkills[CANNON] = skillStateAt(scene, api, CANNON, 5);
  scene.playerSkills[AEGIS] = skillStateAt(scene, api, AEGIS, 3);
  scene.playerSkills[PULSE] = skillStateAt(scene, api, PULSE, 8);
  const levels = scene.getRunArchiveSkillLevels();
  assert.deepEqual([levels[CANNON], levels[AEGIS], levels[PULSE]], [5, 3, 8]);
  const entry = scene.normalizeRunArchiveEntry({
    id: "kit", mechId: "regaliaBastion", skills: levels,
    skillSlotIds: scene.getPlayerSkillSlotIds({ mechId: "regaliaBastion" })
  });
  assert.equal(entry.version, 3);
  assert.deepEqual(plain(entry.skillSlotIds), KIT_SLOTS);
  assert.deepEqual(plain(scene.getRunArchiveSkillSlotIds(entry)), KIT_SLOTS);
  scene.getRunArchiveSkillOverlimitLabel = () => "";
  assert.equal(scene.getRunArchiveSkillSummary(entry), "REGALIA 5 / AEGIS 3 / PULSE 8");
});

test("old REGALIA records keep their Tornado / Rabbit slots", () => {
  const { scene } = fixture();
  scene.getRunArchiveSkillOverlimitLabel = () => "";
  const oldSkills = { [CANNON]: 8, tornadoSkill: 6, rabbitThunderSkill: 4 };
  // v2 record with mechId, and a v1 record known only by its cannon level.
  for (const raw of [{ id: "v2", version: 2, mechId: "regaliaBastion", skills: oldSkills }, { id: "v1", skills: oldSkills }]) {
    const entry = scene.normalizeRunArchiveEntry(raw);
    assert.equal(entry.mechId, "regaliaBastion");
    assert.deepEqual(plain(entry.skillSlotIds), LEGACY_REGALIA_SLOTS);
    assert.equal(scene.getRunArchiveSkillSummary(entry), "REGALIA 8 / TORNADO 6 / RABBIT 4");
    // Normalizing again (load -> save -> load) keeps the old slots.
    assert.deepEqual(plain(scene.normalizeRunArchiveEntry(entry).skillSlotIds), LEGACY_REGALIA_SLOTS);
  }
  // Display of a record that was never normalized also falls back to the old slots.
  assert.deepEqual(plain(scene.getRunArchiveSkillSlotIds({ mechId: "regaliaBastion", skills: oldSkills })), LEGACY_REGALIA_SLOTS);
});

test("an unknown stored slot list is not trusted; other mechs keep their own slots", () => {
  const { scene } = fixture();
  const forged = scene.normalizeRunArchiveEntry({ id: "x", mechId: "defaultBear", skills: {}, skillSlotIds: ["umbraMoonlight", AEGIS, "x"] });
  assert.deepEqual(plain(forged.skillSlotIds), DEFAULT_SLOTS);
  const bear = scene.normalizeRunArchiveEntry({ id: "b", mechId: "defaultBear", skills: { basicSkill: 8 } });
  assert.deepEqual(plain(bear.skillSlotIds), DEFAULT_SLOTS);
  const umbra = scene.normalizeRunArchiveEntry({ id: "u", mechId: "umbraSeraph", skills: { umbraMoonlight: 8 } });
  assert.deepEqual(plain(umbra.skillSlotIds), ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]);
  // A newer record is kept untouched.
  const future = { version: 4, id: "future", skillSlotIds: ["anything"] };
  assert.deepEqual(plain(scene.normalizeRunArchiveEntry(future)), future);
});
