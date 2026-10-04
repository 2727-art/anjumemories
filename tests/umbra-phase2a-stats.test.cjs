"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const plain = (value) => JSON.parse(JSON.stringify(value));

function createHarness() {
  const calls = { storage: 0, network: 0 };
  const forbiddenStorage = () => { calls.storage += 1; throw new Error("Storage is forbidden"); };
  const forbiddenNetwork = () => { calls.network += 1; throw new Error("Network is forbidden"); };
  const fakeWindow = { location: { search: "?umbraPreview=1" }, fetch: forbiddenNetwork };
  Object.defineProperties(fakeWindow, {
    localStorage: { get: forbiddenStorage }, sessionStorage: { get: forbiddenStorage },
    firebase: { get: forbiddenNetwork }
  });
  const context = vm.createContext({
    window: fakeWindow, console, URLSearchParams,
    fetch: forbiddenNetwork, XMLHttpRequest: forbiddenNetwork, WebSocket: forbiddenNetwork,
    Phaser: { Scene: class {}, Math: { Clamp: (value, min, max) => Math.min(max, Math.max(min, value)) } }
  });
  for (const filename of ["skillDefinitions.js", "equipmentDefinitions.js", "umbraDriveFixtures.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context, { filename });
  }
  const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
  const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const passiveDeclarationsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classStart = source.indexOf("class SurvivalScene extends");
  const classEnd = source.indexOf("\nconst config =", classStart);
  assert.ok(declarationsEnd > 0 && classStart > declarationsEnd && classEnd > classStart);
  vm.runInContext(source.slice(0, declarationsEnd) + "\n" + source.slice(passiveDeclarationsStart, classEnd) + `
    this.bridge = {
      sourcePrototype: SurvivalScene.prototype, mechDefinitions: PLAYER_MECH_DEFINITIONS,
      cdCatalog: CD_CATALOG, movementConfig: AC_MOVEMENT_CONFIG, movementPresets: AC_MOVEMENT_PRESETS
    };
    this.fixtureApi = window.createUmbraDriveFixtures(this.bridge);
  `, context, { filename: "game-stat-declarations.js" });
  const api = context.fixtureApi;
  const scene = api.install({ isUmbraPhase2ADrive: true, sys: { settings: { key: "UmbraPhase2ADrive" } } });
  scene.getActiveAcMovementTuning = () => context.bridge.movementPresets.acV3;
  scene.shouldUseAcEvasionPassive = () => true;
  return { scene, api, bridge: context.bridge, calls, equipment: fakeWindow.EquipmentSystem };
}

test("missing and invalid AP multipliers retain the neutral legacy value", () => {
  const { scene } = createHarness();
  for (const value of [undefined, null, 0, -1, NaN, Infinity, "bad"]) {
    assert.equal(scene.normalizePlayerMechStatProfile({ maxHpMultiplier: value }).maxHpMultiplier, 1);
  }
  assert.equal(scene.getPlayerMechMaxHpForBase(125, { maxHpAdd: 100 }), 225);
  assert.equal(scene.getPlayerMechMaxHpForBase(125, { maxHpAdd: 100, maxHpMultiplier: 0.4 }), 90);
  assert.equal(scene.getPlayerMechMaxHpForBase(1, { maxHpMultiplier: 0.4 }), 1);
});

test("all fixture rebuilds apply AP once and share the HUB starting calculation", () => {
  const { scene, api } = createHarness();
  const expectedStarting = {
    baseline: { defaultBear: 100, regaliaBastion: 200, umbraSeraph: 40 },
    medium: { defaultBear: 304, regaliaBastion: 404, umbraSeraph: 122 },
    deep: { defaultBear: 710, regaliaBastion: 810, umbraSeraph: 284 }
  };
  for (const fixture of api.fixtures) {
    for (const mechId of ["defaultBear", "regaliaBastion", "umbraSeraph"]) {
      const first = plain(api.resetFixture(scene, fixture.id, mechId));
      assert.equal(first.startingStats.maxHp, expectedStarting[fixture.id][mechId]);
      assert.equal(first.hubMaxHp, first.startingStats.maxHp);
      const beforeReapply = plain(scene.stats);
      assert.equal(scene.applySelectedPlayerMechStatProfile(), false);
      assert.deepEqual(plain(scene.stats), beforeReapply);
      for (let i = 0; i < 3; i += 1) {
        assert.deepEqual(plain(api.resetFixture(scene, fixture.id, mechId).stats), first.stats);
      }
      for (let i = 0; i < 3; i += 1) {
        scene.rebuildStartingStats({ applyPlayerMech: true });
        assert.deepEqual(plain(scene.stats), first.startingStats);
      }
    }
  }
});

test("AP Reinforce card, chip, maximum and partial current AP use one effective gain", () => {
  const { scene, api, bridge } = createHarness();
  scene.getPassiveUiMeta = bridge.sourcePrototype.getPassiveUiMeta;
  scene.buildLevelUpCardModel = bridge.sourcePrototype.buildLevelUpCardModel;
  for (const mechId of ["defaultBear", "regaliaBastion", "umbraSeraph"]) {
    api.resetFixture(scene, "baseline", mechId);
    const gain = mechId === "umbraSeraph" ? 8 : 20;
    scene.stats.hp = scene.stats.maxHp - 23;
    const before = plain(scene.stats);
    const choice = scene.getPassiveUpgradeChoices({ openingBoost: false }).find((entry) => entry.id === "vitalBloom");
    const card = scene.buildLevelUpCardModel(choice, 0);
    assert.match(choice.description, new RegExp(`最大AP \\+${gain}、APも${gain}回復`));
    assert.equal(card.description, `最大AP +${gain}、APも${gain}回復`);
    assert.equal(card.chips[0].label, `AP +${gain}`);
    const healed = [];
    scene.spawnPlayerHealNumber = (amount) => healed.push(amount);
    choice.onSelect();
    assert.equal(scene.stats.maxHp - before.maxHp, gain);
    assert.equal(scene.stats.hp - before.hp, gain);
    assert.equal(scene.stats.maxHp - scene.stats.hp, 23);
    assert.equal(scene.passiveLevels.vitalBloom, 1);
    assert.deepEqual(healed, [gain]);
    scene.stats.hp = 0;
    scene.applyApReinforceUpgrade();
    assert.equal(scene.stats.hp, gain);
  }
});

test("cumulative AP rounding uses the unscaled base, including the minimum AP bound", () => {
  const { scene, api } = createHarness();
  api.resetFixture(scene, "baseline", "umbraSeraph");
  scene.stats = { ...scene.createBasePlayerStats(), maxHp: 1, hp: 1 };
  scene.applySelectedPlayerMechStatProfile();
  const deltas = [];
  for (let index = 0; index < 12; index += 1) {
    deltas.push(scene.applyApReinforceUpgrade(1));
    assert.equal(scene.stats.maxHp, Math.max(1, Math.round((index + 2) * 0.4)));
    assert.equal(scene.stats.hp, scene.stats.maxHp);
  }
  assert.ok(deltas.includes(0) && deltas.includes(1));
  api.resetFixture(scene, "baseline", "umbraSeraph");
  for (let index = 0; index < 10; index += 1) {
    const choice = scene.getPassiveUpgradeChoices().find((entry) => entry.id === "vitalBloom");
    choice.onSelect();
    assert.equal(scene.stats.maxHp, Math.round((100 + (index + 1) * 20) * 0.4));
  }
  assert.equal(scene.getPassiveUpgradeChoices().some((entry) => entry.id === "vitalBloom"), false);
});

test("legacy frames retain starting AP, movement, EN and the +20 AP passive", () => {
  const { scene, api } = createHarness();
  const expected = {
    baseline: { defaultBear: [100, 310, 100], regaliaBastion: [200, 233, 75] },
    medium: { defaultBear: [304, 410, 143], regaliaBastion: [404, 308, 118] },
    deep: { defaultBear: [710, 542, 250], regaliaBastion: [810, 407, 225] }
  };
  for (const [fixtureId, mechs] of Object.entries(expected)) {
    for (const [mechId, values] of Object.entries(mechs)) {
      const summary = api.resetFixture(scene, fixtureId, mechId);
      assert.deepEqual([summary.startingStats.maxHp, summary.startingStats.moveSpeed, summary.startingStats.maxStamina], values);
      assert.equal(scene.getApReinforceHpGain(), 20);
    }
  }
  for (const [mechId, expectedHp] of [["defaultBear", 100], ["regaliaBastion", 200]]) {
    api.resetFixture(scene, "baseline", mechId);
    scene.stats = { ...scene.createBasePlayerStats(), hp: 0 };
    scene.applySelectedPlayerMechStatProfile();
    assert.equal(scene.stats.hp, expectedHp); // Preserve the existing start-profile zero-HP fallback.
    scene.stats.hp = 0;
    scene.applyApReinforceUpgrade();
    assert.equal(scene.stats.hp, 20); // AP Reinforce itself remains an incremental heal.
  }
});

test("the same Booster Tuning fixture preserves the rounded 1.30 move comparison", () => {
  const { scene, api } = createHarness();
  for (const fixture of api.fixtures) {
    const standard = plain(api.resetFixture(scene, fixture.id, "defaultBear").stats);
    const umbra = plain(api.resetFixture(scene, fixture.id, "umbraSeraph").stats);
    assert.equal(umbra.moveSpeed, Math.round(standard.moveSpeed * 1.3));
    assert.equal(umbra.maxStamina, standard.maxStamina);
    const boostChoice = scene.getPassiveUpgradeChoices().find((entry) => entry.id === "swiftStep");
    assert.equal(boostChoice.chipLabel, "推進 +39");
    const before = scene.stats.moveSpeed;
    boostChoice.onSelect();
    assert.equal(scene.stats.moveSpeed - before, 39);
  }
});

test("Deep levels preserve the existing fixed base, integer rounding and minimum one AP", () => {
  const { scene, api } = createHarness();
  const expected = {
    baseline: { defaultBear: [100, 101, 125, 174], umbraSeraph: [40, 41, 65, 114] },
    medium: { defaultBear: [364, 368, 464, 660], umbraSeraph: [146, 147, 171, 220] },
    deep: { defaultBear: [910, 919, 1135, 1576], umbraSeraph: [364, 368, 464, 660] }
  };
  for (const [fixtureId, mechs] of Object.entries(expected)) {
    for (const [mechId, values] of Object.entries(mechs)) {
      const rows = api.measureDeepLevels(fixtureId, mechId);
      assert.deepEqual(plain(rows.map((entry) => entry.level)), [25, 26, 50, 99]);
      assert.deepEqual(plain(rows.map((entry) => entry.maxHp)), values);
      assert.ok(rows.every((entry) => entry.baseMaxHp === values[0]));
    }
  }
  api.resetFixture(scene, "baseline", "umbraSeraph");
  scene.stageDepth = 6;
  scene.stats.level = 25;
  scene.syncPlayerLevelXpRequirement();
  scene.gainDeepLevelExperience(scene.stats.nextLevelXp);
  assert.equal(scene.deepLevelBaseMaxHp, 40);
  scene.applyApReinforceUpgrade();
  scene.gainDeepLevelExperience(scene.stats.nextLevelXp);
  assert.equal(scene.deepLevelBaseMaxHp, 40);
  assert.equal(scene.stats.maxHp, 50); // 40 + 1 + 8 + 1, with no second 0.4.
});

test("fixture composition stays within current caps and switching resets candidate state", () => {
  const { scene, api, equipment } = createHarness();
  for (const fixture of api.fixtures) {
    api.resetFixture(scene, fixture.id, "umbraSeraph");
    assert.ok(fixture.shopLevel <= 25 && fixture.coolingLevel <= 25);
    for (const slot of equipment.SLOTS) {
      const item = scene.equipmentState.bestBySlot[slot];
      if (item) assert.ok(item.rank >= equipment.RANK_MIN && item.rank <= equipment.RANK_MAX);
      assert.ok(scene.equipmentState.refinementBySlot[slot] <= equipment.EQUIPMENT_REFINEMENT_MAX_LEVEL);
    }
    for (const [id, level] of Object.entries(scene.passiveLevels)) {
      assert.ok(level <= scene.getPassiveMaxLevel(id));
    }
    scene.levelUpCandidatePresentationState.evasiveFirmwarePresented = true;
    const old = scene.levelUpCandidatePresentationState;
    api.resetFixture(scene, fixture.id, "defaultBear");
    assert.notEqual(scene.levelUpCandidatePresentationState, old);
    assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
    assert.deepEqual(plain(scene.playerSkills), {});
  }
});

test("existing Barrier minimum and Recovery pulses use the resulting AP without another mech factor", () => {
  const { scene, api, bridge } = createHarness();
  for (const name of ["getRobotBarrierMaxHp", "getRobotBarrierRechargeAmount", "getRobotHealAmount", "getRobotHealAmountForLevel", "updateRobotHealing"]) {
    scene[name] = bridge.sourcePrototype[name];
  }
  scene.isRobotBarrierUnlocked = () => true;
  scene.getRobotEffectiveBarrierLevel = () => 20;
  scene.getRobotSyncFieldHealMultiplier = () => 1;
  scene.getRobotHealInterval = () => 1000;
  scene.addRobotSubsystemXp = () => {};
  scene.spawnRobotHealPulse = () => {};
  scene.rechargeRobotBarrierFromFieldPulse = () => {};
  scene.isRobotSyncActive = () => false;
  scene.addRobotSyncGauge = () => {};
  scene.playerHitbox = { x: 0, y: 0 };
  for (const [mechId, expectedShield] of [["defaultBear", 21], ["umbraSeraph", 8]]) {
    api.resetFixture(scene, "baseline", mechId);
    scene.robotState = { healLevel: 1, healAmountLevel: 0, healTimer: 0 };
    assert.equal(scene.getRobotBarrierMaxHp(), expectedShield);
    assert.equal(scene.getRobotBarrierRechargeAmount(4), Math.max(1, Math.round(expectedShield * 0.34 + 4 * 0.22)));
    assert.equal(scene.getRobotHealAmount(), 4);
    scene.stats.hp = scene.stats.maxHp - 10;
    scene.updateRobotHealing(1000);
    assert.equal(scene.stats.hp, scene.stats.maxHp - 6);
    scene.stats.hp = scene.stats.maxHp - 2;
    scene.updateRobotHealing(1000);
    assert.equal(scene.stats.hp, scene.stats.maxHp);
  }
});

test("numeric fixtures install no saving functions and perform zero storage or network operations", () => {
  const { scene, api, calls } = createHarness();
  for (const method of api.methodNames) assert.doesNotMatch(method, /^(?:load|save|purchase|scheduleCloud|normalizeShop|captureRunPlayer)/);
  for (const name of ["saveShopState", "loadShopState", "normalizeShopState", "scheduleCloudSave", "purchasePlayerMech", "create"]) {
    assert.equal(scene[name], undefined);
  }
  for (const fixture of api.fixtures) {
    api.resetFixture(scene, fixture.id, "umbraSeraph");
    api.measureDeepLevels(fixture.id, "umbraSeraph");
  }
  assert.deepEqual(calls, { storage: 0, network: 0 });
  assert.throws(() => api.install({}), /isolated drive scene/);
  assert.throws(() => api.resetFixture({ ...scene, isUmbraPhase2ADrive: false }), /isolated drive scene/);
});
