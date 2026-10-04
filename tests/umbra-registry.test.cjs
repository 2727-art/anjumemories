"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const skillSource = fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8");
const expectedSlots = {
  defaultBear: ["basicSkill", "tornadoSkill", "rabbitThunderSkill"],
  regaliaBastion: ["regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"],
  umbraSeraph: ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]
};
const releasedSkillIds = ["basicSkill", "regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"];
const plain = (value) => JSON.parse(JSON.stringify(value));

function createFixture() {
  const calls = { storage: [], network: [] };
  const fakeStorage = Object.freeze({
    getItem(key) { calls.storage.push(["get", key]); return null; },
    setItem(key) { calls.storage.push(["set", key]); throw new Error("Unexpected storage write"); },
    removeItem(key) { calls.storage.push(["remove", key]); throw new Error("Unexpected storage removal"); },
    clear() { calls.storage.push(["clear"]); throw new Error("Unexpected storage clear"); }
  });
  const forbiddenNetwork = (...args) => {
    calls.network.push(args);
    throw new Error("Network is forbidden in registry tests");
  };
  const fakeWindow = {
    localStorage: fakeStorage,
    sessionStorage: fakeStorage,
    location: { search: "" },
    fetch: forbiddenNetwork
  };
  const context = vm.createContext({
    window: fakeWindow,
    console,
    URLSearchParams,
    fetch: forbiddenNetwork,
    XMLHttpRequest: forbiddenNetwork,
    WebSocket: forbiddenNetwork,
    Phaser: {
      Scene: class {},
      Math: { Clamp: (value, min, max) => Math.min(max, Math.max(min, value)) }
    }
  });
  vm.runInContext(skillSource, context, { filename: "skillDefinitions.js" });
  // Evaluate declarations only; neither normal boot nor preview boot is executed.
  const constantsEnd = gameSource.indexOf("function isCommsStoryDebugResetRequested()");
  const classStart = gameSource.indexOf("class SurvivalScene extends");
  const classEnd = gameSource.indexOf("\nconst config =", classStart);
  assert.ok(constantsEnd > 0 && classStart > constantsEnd && classEnd > classStart);
  const declarations = gameSource.slice(0, constantsEnd) + "\n" + gameSource.slice(classStart, classEnd);
  vm.runInContext(declarations + `
    this.registry = {
      Scene: SurvivalScene,
      mechs: PLAYER_MECH_DEFINITIONS,
      slots: PLAYER_MECH_SKILL_SLOT_IDS,
      skills: SKILL_DEFINITIONS,
      neutralProfile: PLAYER_MECH_NEUTRAL_STAT_PROFILE,
      mutationIds: SKILL_MUTATION_ARCHIVE_SKILL_IDS,
      mutationMechs: Object.keys(PLAYER_MECH_SKILL_MUTATION_SKILL_IDS),
      atlasMechs: MUTATION_ATLAS_PLAYER_MECH_IDS,
      equipmentSkills: EQUIPMENT_COMBAT_LINK_SKILL_IDS
    };
  `, context, { filename: "game-registry-declarations.js" });
  const scene = Object.create(context.registry.Scene.prototype);
  scene.getUrlStageParam = () => "";
  scene.shopState = scene.normalizeShopState({});
  scene.playerSkills = {};
  scene.runPlayerMechSnapshotActive = false;
  return { scene, registry: context.registry, calls };
}

test("all three mech slot lists are explicit, ordered and immutable", () => {
  const { scene, registry, calls } = createFixture();
  for (const [mechId, slots] of Object.entries(expectedSlots)) {
    assert.deepEqual(plain(scene.getPlayerSkillSlotIds({ mechId })), slots);
    assert.deepEqual(plain(scene.getPlayerSkillSlotIds(mechId)), slots);
    assert.equal(Object.isFrozen(registry.slots[mechId]), true);
  }
  const copy = scene.getPlayerSkillSlotIds("umbraSeraph");
  copy.reverse();
  assert.deepEqual(plain(scene.getPlayerSkillSlotIds("umbraSeraph")), expectedSlots.umbraSeraph);
  for (const unknownId of ["missing", "toString", "__proto__", "constructor"]) {
    assert.equal(scene.getPlayerMechDefinition(unknownId), null);
    assert.equal(scene.isPlayerMechReleased(unknownId), false);
    assert.deepEqual(plain(scene.getPlayerSkillSlotIds(unknownId)), expectedSlots.defaultBear);
  }
  assert.deepEqual(calls, { storage: [], network: [] });
});

test("released frames preserve their starters, available skills and max build", () => {
  const { scene, registry } = createFixture();
  for (const mechId of ["defaultBear", "regaliaBastion"]) {
    const slots = expectedSlots[mechId];
    scene.shopState = scene.normalizeShopState({ playerMechs: { ownedIds: ["defaultBear", mechId], selectedId: mechId } });
    const initial = scene.buildInitialSkillStates({ mechId });
    assert.deepEqual(Object.keys(initial), [slots[0]]);
    assert.equal(initial[slots[0]].stageIndex, 0);
    assert.equal(initial[slots[0]].currentStage.stage, 1);
    assert.equal(scene.getResolvedPlayerMechStartingSkillId(mechId), slots[0]);
    for (const skillId of Object.keys(registry.skills)) {
      assert.equal(scene.isSkillAvailableForPlayerMech(skillId, mechId), slots.includes(skillId), `${mechId}/${skillId}`);
    }
    scene.playerSkills = initial;
    scene.applyDebugMaxBuildSkills();
    assert.deepEqual(Object.keys(scene.playerSkills).sort(), [...slots].sort());
    for (const skillId of slots) {
      assert.equal(scene.playerSkills[skillId].stageIndex, 7);
      assert.equal(scene.playerSkills[skillId].currentStage.stage, 8);
      assert.equal(scene.isSkillRuntimeBehaviorImplemented(registry.skills[skillId]), true);
    }
  }
});

test("candidate enumeration and growth checks stay on the selected three slots", () => {
  const { scene } = createFixture();
  scene.shuffleArray = (items) => items;
  // Keep real eligibility at the boundary while isolating card presentation.
  scene.buildSkillChoice = (skillId, options) => scene.isSkillAvailableForPlayerMech(skillId, options.mechId)
    ? { skillId, actionType: "unlock" }
    : null;
  for (const mechId of ["defaultBear", "regaliaBastion"]) {
    const actual = scene.getAvailableSkillChoices({ mechId });
    assert.deepEqual(plain(actual.map((choice) => choice.skillId)), expectedSlots[mechId]);
  }
  assert.deepEqual(plain(scene.getAvailableSkillChoices({ mechId: "umbraSeraph" })), []);
  scene.getAvailableSkillChoices = () => [];
  scene.getPassiveUpgradeChoices = () => [];
  assert.equal(scene.hasAvailableLevelUpUpgrade(), false);
  scene.getPassiveUpgradeChoices = () => [{ id: "existing-passive" }];
  assert.equal(scene.hasAvailableLevelUpUpgrade(), true);
});

test("released UMBRA still requires its issued run context for skill availability and attack behavior", () => {
  const { scene, registry } = createFixture();
  assert.equal(registry.mechs.umbraSeraph.previewOnly, false);
  const profile = registry.mechs.umbraSeraph.statProfile;
  assert.equal(profile.maxHpMultiplier, 0.4);
  assert.equal(profile.moveSpeedMultiplier, 1.3);
  assert.equal(profile.boostDrainMultiplier, 0.75);
  assert.equal(profile.boostRegenMultiplier, 1.25);
  assert.equal(profile.evadeWindowMultiplier, 1);
  assert.equal(profile.quickBoostMaxSpeedMultiplier * profile.moveSpeedMultiplier, 1.4);
  assert.equal(profile.boostTerminalSpeedMultiplier * profile.moveSpeedMultiplier, 1.4);
  assert.equal(profile.quickBoostExitSpeedMultiplier * profile.moveSpeedMultiplier, 1.4);
  assert.equal(profile.quickBoostImpulseMultiplier, 1);
  assert.equal(profile.quickBoostSustainAccelerationMultiplier, 1);
  assert.equal(registry.mechs.umbraSeraph.passiveWeights.evasiveFirmware, 3);
  assert.equal(registry.mechs.umbraSeraph.startingSkillId, "umbraMoonlight");
  for (const id of expectedSlots.umbraSeraph) {
    const definition = registry.skills[id];
    assert.equal(definition.previewOnly, true);
    assert.equal(definition.behavior, "displayOnly");
    assert.equal(definition.startsUnlocked, false);
    assert.equal(definition.stages.length, 8);
    assert.equal(definition.stages[0], definition.verificationStage1);
    assert.ok(Object.isFrozen(definition.stages));
    assert.equal(scene.isSkillRuntimeBehaviorImplemented(definition), false);
    for (const mechId of Object.keys(expectedSlots)) assert.equal(scene.isSkillAvailableForPlayerMech(id, mechId), false);
  }
  assert.equal(registry.skills.umbraMoonlight.previewStartsUnlocked, true);
  assert.equal(registry.skills.umbraBloodSpike.previewStartsUnlocked, false);
  assert.equal(registry.skills.umbraPhantomNova.previewStartsUnlocked, false);
  assert.equal(scene.getResolvedPlayerMechStartingSkillDefinition("umbraSeraph"), null);
  assert.equal(scene.getResolvedPlayerMechStartingSkillId("umbraSeraph"), "");
  assert.deepEqual(plain(scene.buildInitialSkillStates({ mechId: "umbraSeraph" })), {}, "HUB has no live skills before the issued sortie context");
  scene.playerSkills = Object.fromEntries(expectedSlots.umbraSeraph.map((id) => [id, { id, definition: registry.skills[id], currentStage: {} }]));
  scene.updateOrbitSkill = () => assert.fail("preview must not fall back to orbit damage");
  scene.updateScreenHomingSkill = () => assert.fail("preview must not use old homing damage");
  scene.updateDirectionalDashSkill = () => assert.fail("preview must not use old dash damage");
  scene.updateSkills(16);
});

test("released mech identity does not grant ownership; explicit Phase 2A context remains isolated", async () => {
  const { scene, calls } = createFixture();
  scene.runPlayerMechId = "umbraSeraph";
  assert.equal(scene.getRunPlayerMechId(), "umbraSeraph");
  scene.isUmbraPhase2ADrive = true;
  scene.verificationContext = { kind: "umbra-phase2a", mechId: "umbraSeraph" };
  scene.sys = { settings: { key: "survival-scene" } };
  assert.equal(scene.getUmbraPhase2AVerifiedMechId(), "");
  assert.equal(scene.getRunPlayerMechId(), "umbraSeraph");
  scene.sys.settings.key = "UmbraPhase2ADrive";
  assert.equal(scene.getUmbraPhase2AVerifiedMechId(), "umbraSeraph");
  assert.equal(scene.getRunPlayerMechId(), "umbraSeraph");
  assert.equal(scene.getActivePlayerMechIdForRuntime(), "umbraSeraph");
  assert.equal(scene.isPlayerMechReleased("umbraSeraph"), true);
  assert.equal(scene.isPlayerMechOwned("umbraSeraph"), false);
  assert.equal(scene.canPurchasePlayerMech("umbraSeraph"), false);
  assert.equal(await scene.purchasePlayerMech("umbraSeraph"), false);
  assert.equal(scene.selectPlayerMech("umbraSeraph"), false);
  assert.equal(scene.captureRunPlayerMechSnapshot("verificationTest").id, "umbraSeraph");
  scene.verificationContext.kind = "other";
  assert.equal(scene.getRunPlayerMechId(), "umbraSeraph");
  assert.deepEqual(calls.storage, []);
  assert.deepEqual(calls.network, []);
});

test("normal Level Up and Opening Boost retain two skill cards and a passive", () => {
  const { scene } = createFixture();
  let displayed = null;
  scene.getOpeningBoostChoiceLimit = () => 3;
  scene.getAvailableSkillChoices = () => expectedSlots.defaultBear.map((skillId) => ({ type: "skill", skillId }));
  scene.getPassiveUpgradeChoices = () => [{ type: "passive", id: "vitalBloom" }, { type: "passive", id: "swiftStep" }];
  scene.weightedShuffleUpgradeChoices = (choices) => choices;
  scene.prioritizeEvasiveFirmwareChoice = (choices) => choices;
  scene.consumeOpeningBoostExtraChoiceTicketIfNeeded = () => {};
  scene.cancelActiveEnemyBeamCharges = () => {};
  scene.physics = { world: { pause() {} } };
  scene.showLevelUpCardOverlay = (title, description, choices) => { displayed = choices; };
  for (const openingBoost of [false, true]) {
    scene.isOpeningBoostDraftActive = () => openingBoost;
    scene.showLevelUpChoices();
    assert.equal(displayed.length, 3);
    assert.equal(displayed.filter((choice) => choice.type === "skill").length, 2);
    assert.equal(displayed.filter((choice) => choice.type === "passive").length, 1);
  }
});

test("unowned UMBRA debug override cannot grant ownership or bypass durable purchase", async () => {
  const { scene, calls } = createFixture();
  scene.shopState = scene.normalizeShopState({ playerMechs: { ownedIds: ["defaultBear"], selectedId: "umbraSeraph" } });
  scene.coins = 10000000;
  scene.finalBossState = { cleared: false };
  scene.getUrlStageParam = (key) => key === "debugPlayerMech" ? "umbraSeraph" : "1";
  const before = JSON.stringify(scene.shopState);
  for (const method of ["isPlayerMechOwned", "isPlayerMechStartsUnlocked", "selectPlayerMech"]) {
    assert.equal(scene[method]("umbraSeraph"), false, method);
  }
  assert.equal(await scene.purchasePlayerMech("umbraSeraph"), false);
  assert.equal(JSON.stringify(scene.shopState), before);
  assert.equal(scene.coins, 10000000);
  assert.equal(scene.getSelectedPlayerMechId(), "defaultBear");
  assert.equal(scene.getDebugPlayerMechIdOverride(), "umbraSeraph");
  assert.equal(scene.isUmbraProductionRunContext(), false);
  scene.shuffleArray = items => items;
  assert.equal(scene.getAvailableSkillChoices({ mechId: "umbraSeraph" }).length, 0);
  scene.runPlayerMechId = "umbraSeraph";
  scene.shopActive = false;
  assert.equal(scene.getRunPlayerMechId(), "umbraSeraph");
  assert.equal(scene.getActivePlayerMechIdForRuntime(), "umbraSeraph");
  assert.deepEqual(calls, { storage: [], network: [] });
});

test("Shop Atlas and Mutation records recognize UMBRA while ordinary equipment combat IDs stay unchanged", () => {
  const { scene, registry } = createFixture();
  assert.deepEqual(plain(scene.getReleasedPlayerMechIds()), ["defaultBear", "regaliaBastion", "umbraSeraph"]);
  const normalized = scene.normalizeShopState({ playerMechs: { ownedIds: ["defaultBear", "umbraSeraph", "unknown"], selectedId: "umbraSeraph" } });
  assert.ok(normalized.playerMechs.ownedIds.includes("umbraSeraph"));
  assert.equal(normalized.playerMechs.selectedId, "umbraSeraph");
  assert.deepEqual(plain(registry.mutationMechs), ["defaultBear", "regaliaBastion", "umbraSeraph"]);
  assert.deepEqual(plain(registry.atlasMechs), ["defaultBear", "regaliaBastion", "umbraSeraph"]);
  assert.deepEqual(plain(registry.mutationIds).sort(), [...releasedSkillIds, ...expectedSlots.umbraSeraph].sort());
  assert.deepEqual(plain(registry.equipmentSkills), expectedSlots.defaultBear);
});

test("normal player and skill preload never requests UMBRA assets", () => {
  const { scene, registry, calls } = createFixture();
  const requested = [];
  scene.loadImageIfNeeded = (key, imagePath) => requested.push({ key, imagePath });
  // Also prove the preview guard holds if preview metadata later gains a display frame.
  registry.skills.umbraMoonlight.stages = [{ textureKey: "forbidden-umbra-preview", imagePath: "./umbra-preview.png" }];
  scene.preloadPlayerAssets();
  scene.preloadSkillAssets();
  assert.ok(requested.length > 60, "existing player/skill assets remain queued");
  assert.ok(requested.some((entry) => entry.key === "basic-skill-stage-1"));
  assert.ok(requested.some((entry) => entry.key === "regalia-bastion-cannon-impact-01"));
  assert.equal(requested.some((entry) => /umbra|KGK-02|MOONLIGHT|bloodspike|nova\.png/i.test(entry.key + entry.imagePath)), false);
  assert.deepEqual(calls, { storage: [], network: [] });
});
