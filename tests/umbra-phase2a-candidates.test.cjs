"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const skillSource = fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8");
const E = "evasiveFirmware";
const plain = (value) => JSON.parse(JSON.stringify(value));

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function fixture(mechId = "umbraSeraph", seed = 0x2a2026) {
  const calls = { storage: 0, network: 0 };
  const forbidStorage = () => { calls.storage += 1; assert.fail("storage access"); };
  const forbidNetwork = () => { calls.network += 1; assert.fail("network access"); };
  const storage = Object.fromEntries(["getItem", "setItem", "removeItem", "clear"].map((key) => [key, forbidStorage]));
  const math = Object.create(Math);
  math.random = seededRandom(seed);
  const context = vm.createContext({
    window: { localStorage: storage, sessionStorage: storage, location: { search: "" }, fetch: forbidNetwork },
    localStorage: storage, sessionStorage: storage,
    fetch: forbidNetwork, XMLHttpRequest: forbidNetwork, WebSocket: forbidNetwork,
    console, URLSearchParams, Math: math,
    Phaser: { Scene: class {}, Math: { Clamp: (n, min, max) => Math.min(max, Math.max(min, n)) } }
  });
  vm.runInContext(skillSource, context);
  const constantsEnd = gameSource.indexOf("function isCommsStoryDebugResetRequested()");
  const classStart = gameSource.indexOf("class SurvivalScene extends");
  const classEnd = gameSource.indexOf("\nconst config =", classStart);
  assert.ok(constantsEnd > 0 && classStart > constantsEnd && classEnd > classStart);
  const passiveConstants = ["LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS", "LEVEL_UP_PASSIVE_MAX_LEVEL"].map((name) => {
    const declaration = gameSource.match(new RegExp(`^const ${name} = [^;]+;`, "m"));
    assert.ok(declaration, name);
    return declaration[0];
  }).join("\n");
  vm.runInContext(gameSource.slice(0, constantsEnd) + "\n" + passiveConstants + "\n" + gameSource.slice(classStart, classEnd) +
    "\nthis.api = { Scene: SurvivalScene, mechs: PLAYER_MECH_DEFINITIONS, evasive: EVASIVE_FIRMWARE_CONFIG };", context);
  const scene = Object.create(context.api.Scene.prototype);
  // Environment adapters only: the production candidate builders, passive levels,
  // duration calculation, weighted shuffle and display acknowledgment stay real.
  scene.getUrlStageParam = () => null;
  scene.getSelectedPlayerMechDefinition = () => context.api.mechs[mechId];
  scene.getSelectedPlayerMechId = () => mechId;
  scene.getSkillSelectionPlayerMechId = (options = {}) => options.mechId || mechId;
  scene.getRunPlayerMechStatProfile = () => scene.normalizePlayerMechStatProfile(context.api.mechs[mechId].statProfile);
  scene.shouldUseAcEvasionPassive = () => true;
  scene.isFinalBossRaidActive = () => false;
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
  scene.getActiveAcMovementTuning = () => ({});
  scene.shuffleArray = (choices) => choices;
  scene.playerSkills = {};
  scene.stats = { moveSpeed: 280, maxStamina: 100, stamina: 80, maxHp: 100, hp: 50, fireInterval: 500, bulletDamage: 4 };
  scene.passiveLevels = {};
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0;
  scene.levelUpOpeningBoostActive = false;
  scene.survivalTime = 1;
  scene.resetLevelUpCandidatePresentationState();
  return { scene, api: context.api, calls, math };
}

test("queries and overflow checks preserve the initial guarantee", () => {
  const { scene, calls } = fixture();
  for (let i = 0; i < 10; i += 1) {
    const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
    assert.equal(choices.length, 3);
    assert.equal(choices[0].id, E);
    assert.equal(choices.every((choice) => choice.type === "passive"), true);
    assert.equal(scene.hasAvailableLevelUpUpgrade(), true);
    assert.equal(scene.isXpProgressionCapped(), false);
    assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  }
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("Opening Boost cannot offer or consume Evasive, including forced debug", () => {
  const { scene } = fixture();
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => true;
  for (const openingBoost of [true, true, true]) {
    const choices = scene.buildLevelUpUpgradeChoices({ openingBoost, choiceLimit: 4 });
    assert.equal(choices.some((choice) => choice.id === E), false);
    assert.equal(scene.markLevelUpChoicesPresented([{ id: E, type: "passive" }], { openingBoost }), false);
  }
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  // An explicit normal-query context is not confused by the previous overlay.
  scene.levelUpOpeningBoostActive = true;
  assert.equal(scene.buildLevelUpUpgradeChoices({ openingBoost: false }).some((choice) => choice.id === E), true);
});

test("only a normal visible offer consumes the guarantee, once per run", () => {
  const { scene } = fixture();
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  const oldState = scene.levelUpCandidatePresentationState;
  assert.equal(scene.markLevelUpChoicesPresented(choices, { selectionMode: "robot", openingBoost: false }), false);
  assert.equal(scene.markLevelUpChoicesPresented(choices.filter((choice) => choice.id !== E), { openingBoost: false }), false);
  assert.equal(scene.markLevelUpChoicesPresented(choices, { openingBoost: false, presentationState: oldState }), true);
  assert.equal(scene.markLevelUpChoicesPresented(choices, { openingBoost: false, presentationState: oldState }), false);
  assert.equal(scene.getPassiveLevel(E), 0, "display does not force acquisition");
  const order = [{ id: "swiftStep", type: "passive" }, { id: E, type: "passive" }];
  assert.deepEqual(scene.prioritizeEvasiveFirmwareChoice(order, { openingBoost: false }), order);
  scene.stageDepth = 6;
  scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, true);
  scene.resetLevelUpCandidatePresentationState();
  assert.equal(scene.markLevelUpChoicesPresented(choices, { openingBoost: false, presentationState: oldState }), false);
  assert.equal(scene.buildLevelUpUpgradeChoices({ openingBoost: false })[0].id, E);
});

test("max level and no effective duration increase are excluded", () => {
  const { scene } = fixture();
  scene.passiveLevels[E] = scene.getEvasiveFirmwareMaxLevel();
  assert.equal(scene.createEvasiveFirmwarePassiveChoice({ openingBoost: false }), null);
  assert.equal(scene.buildLevelUpUpgradeChoices({ openingBoost: false }).some((choice) => choice.id === E), false);
  scene.passiveLevels[E] = 0;
  scene.getActiveAcMovementTuning = () => ({ evasiveFirmwareDurationMsByLevel: Array(11).fill(70) });
  assert.equal(scene.createEvasiveFirmwarePassiveChoice({ openingBoost: false }), null);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
});

test("guarantee occupies a passive slot and preserves card limits without duplicates", () => {
  const { scene } = fixture();
  scene.getAvailableSkillChoices = () => ["a", "b", "c"].map((skillId) => ({ type: "skill", skillId }));
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false, choiceLimit: 99 });
  assert.equal(choices.length, 3);
  assert.equal(choices.filter((choice) => choice.type === "skill").length, 2);
  assert.equal(choices[2].id, E);
  assert.equal(new Set(choices.map((choice) => choice.id || choice.skillId)).size, choices.length);
  const opening = scene.buildLevelUpUpgradeChoices({ openingBoost: true, choiceLimit: 4 });
  assert.equal(opening.length, 4);
  assert.equal(opening.filter((choice) => choice.type === "skill").length, 2);
  assert.equal(opening.some((choice) => choice.id === E), false);
});

test("default and REGALIA retain weights and do not receive a first-offer guarantee", () => {
  for (const [mechId, expectedWeight] of [["defaultBear", 1], ["regaliaBastion", 0.25]]) {
    const { scene } = fixture(mechId);
    assert.equal(scene.getSelectedPlayerMechPassiveWeights()[E], expectedWeight);
    const order = [{ id: "swiftStep", type: "passive" }, { id: E, type: "passive" }];
    assert.deepEqual(scene.prioritizeEvasiveFirmwareChoice(order, { openingBoost: false }), order);
    assert.equal(scene.markLevelUpChoicesPresented(order, { openingBoost: false }), false);
  }
});

test("Booster Tuning scales only the isolated UMBRA increment and matches its card text", () => {
  const finalSpeed = {};
  for (const [mechId, startSpeed, gain] of [
    ["defaultBear", 280, 30], ["regaliaBastion", 210, 30], ["umbraSeraph", 364, 39]
  ]) {
    const { scene } = fixture(mechId);
    scene.isUmbraPhase2ADrive = true;
    scene.sys = { settings: { key: "UmbraPhase2ADrive" } };
    scene.verificationContext = { kind: "umbra-phase2a", mechId };
    scene.stats.moveSpeed = startSpeed;
    for (let level = 0; level < 10; level += 1) {
      const choice = scene.getPassiveUpgradeChoices({ openingBoost: false }).find((entry) => entry.id === "swiftStep");
      assert.ok(choice);
      assert.ok(choice.description.includes(`+${gain}`));
      assert.equal(choice.cardDescription, `推進出力 +${gain}`);
      assert.equal(choice.chipLabel, `推進 +${gain}`);
      const before = scene.stats.moveSpeed;
      choice.onSelect();
      assert.equal(scene.stats.moveSpeed - before, gain);
      assert.equal(scene.getPassiveLevel("swiftStep"), level + 1);
    }
    assert.equal(scene.getPassiveUpgradeChoices({ openingBoost: false }).some((entry) => entry.id === "swiftStep"), false);
    finalSpeed[mechId] = scene.stats.moveSpeed;
  }
  assert.equal(finalSpeed.umbraSeraph / finalSpeed.defaultBear, 1.3);
  const { scene } = fixture();
  assert.equal(scene.getBoosterTuningSpeedGain(), 30, "raw UMBRA ID is not an isolated runtime");
  scene.getBoosterTuningSpeedGain = () => 0;
  assert.equal(scene.getPassiveUpgradeChoices({ openingBoost: false }).some((entry) => entry.id === "swiftStep"), false);
});

test("weight three has exact first-draw interval coverage and reproducible sampling", () => {
  const { scene, math } = fixture();
  const choices = scene.getPassiveUpgradeChoices({ openingBoost: false });
  const weights = scene.getSelectedPlayerMechPassiveWeights();
  assert.equal(weights[E], 3);
  assert.equal(choices.length, 6);
  const counts = {};
  // Five weight-one chips plus Evasive weight three give eight exact intervals.
  for (let bin = 0; bin < 8; bin += 1) {
    math.random = () => (bin + 0.5) / 8;
    const first = scene.weightedShuffleUpgradeChoices(choices, weights)[0].id;
    counts[first] = (counts[first] || 0) + 1;
  }
  assert.equal(counts[E], 3);
  choices.filter((choice) => choice.id !== E).forEach((choice) => assert.equal(counts[choice.id], 1));
  const run = (seed) => {
    math.random = seededRandom(seed);
    return Array.from({ length: 512 }, () => plain(scene.weightedShuffleUpgradeChoices(choices, weights).map((choice) => choice.id)));
  };
  assert.deepEqual(run(12345), run(12345));
  // This validates the current six-passive pool only, not future complete builds.
});

function imageStub() {
  return {
    active: true, visible: true, alpha: 1, y: 0,
    setAlpha(value) { this.alpha = value; return this; },
    setY(value) { this.y = value; return this; },
    setScale() { return this; }
  };
}

test("production animation acknowledges after the Evasive card appears, never for stale callbacks", () => {
  const { scene } = fixture();
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  let animations = [];
  scene.tweens = { add: (config) => { animations.push(config); } };
  scene.time = { delayedCall: () => ({ remove() {} }) };
  scene.levelUpSelectionMode = "level";
  scene.overlayContainer = imageStub();
  scene.overlayBackdrop = imageStub();
  scene.levelUpCardRecords = choices.map((option) => ({ model: { option }, container: imageStub() }));
  scene.playLevelUpOpenAnimation(scene.overlayContainer, scene.levelUpCardRecords);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  const evasiveAnimation = animations.find((animation) => animation.targets === scene.levelUpCardRecords[0].container);
  evasiveAnimation.onComplete();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false, "alpha zero is not shown");
  scene.levelUpCardRecords[0].container.alpha = 1;
  evasiveAnimation.onComplete();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, true);
  scene.resetLevelUpCandidatePresentationState();
  evasiveAnimation.onComplete();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false, "old run token rejected");
  animations = [];
  scene.playLevelUpOpenAnimation(scene.overlayContainer, scene.levelUpCardRecords);
  const staleAnimation = animations[0];
  staleAnimation.targets.alpha = 1;
  scene.levelUpCardRecords = [];
  staleAnimation.onComplete();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false, "discarded overlay rejected");
});

test("new run initialization resets presentation state without adding persistence", () => {
  const { scene, calls } = fixture();
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  scene.markLevelUpChoicesPresented(choices, { openingBoost: false });
  scene.initializeOverflowRewardState();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("the production Depth transition keeps the already-presented run state", () => {
  const { scene, calls } = fixture();
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  scene.markLevelUpChoicesPresented(choices, { openingBoost: false });
  const presentationState = scene.levelUpCandidatePresentationState;
  // Environment effects are isolated; the real transition method executes.
  // Passive initialization and reset methods intentionally remain unstubbed.
  const unrelatedEffects = [
    "clearActiveAnomalyContract", "clearActiveDepthDirective", "cleanupNemesisBoss", "cleanupVoidHunterBoss",
    "queueBaseCalibrationCapUnlockNotices", "resetAcMovementState", "initializeEquipmentProductionDropState",
    "updateRunRankingDepthProgress", "updateAnjuMemoryDepthProgress", "syncPlayerLevelXpRequirement",
    "applySupportJammingForDepth", "resetGateCycleForNextDepth", "spawnDataCacheDrops", "updateRunEquipmentHud",
    "shouldEnterFinalBossRaid", "refreshTriadMatrixSnapshot", "hideOverlay", "hasPendingBaseCalibrationCapUnlockNotice",
    "resumeGameplayAfterBlockingOverlay", "clearGateStabilizeProtocolState", "setLastPickupNotice",
    "notifyGeekMilestoneForDepth", "activatePendingAnomalyContract", "shouldUseEndlessVoidAtmosphereForDepth",
    "syncDepthBgmForCurrentDepth", "tryOpenPendingBaseCalibrationCapUnlockOverlay", "queueDepthDirectiveSelection",
    "onDepthStartedForNemesis", "onDepthStartedForVoidHunter", "tryQueueDepthComms", "resetCommsBanterForDepth"
  ];
  unrelatedEffects.forEach((name) => { scene[name] = () => false; });
  scene.updateRunDepthProgressForEnteredDepth = (state) => state;
  scene.getRunMaxAbsoluteDepthReached = () => scene.stageDepth;
  scene.unlockCompletedDepthRelayAnchors = () => ({ newlyUnlockedDepths: [] });
  scene.unlockDepth20ClearCodeFromAdvance = () => ({ unlockedNow: false });
  scene.stageDepth = 5;
  scene.completeGateDepthTransition({ completedDepth: 5, targetDepth: 6, mode: "next" });
  assert.equal(scene.stageDepth, 6);
  assert.equal(scene.levelUpCandidatePresentationState, presentationState);
  assert.equal(presentationState.evasiveFirmwarePresented, true);
  assert.deepEqual(calls, { storage: 0, network: 0 });
});
