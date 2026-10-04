"use strict";
// Phase7B pure launch/owner/selection boundaries. Numeric bodies and a synthetic
// environment stand in for Phaser/bootstrap. No Storage or network is executed;
// actual normal Scene progression is a separate browser test.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova";
const plain = value => JSON.parse(JSON.stringify(value));
function prefix(file, exports) {
  const filename = path.join(__dirname, file), content = fs.readFileSync(filename, "utf8"), mod = new Module(filename, module);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(content.slice(0, content.indexOf('\ntest("')) + `\nmodule.exports = {${exports}};`, filename);
  return mod.exports;
}
const { moonFixture } = prefix("umbra-growth-runtime.test.cjs", "moonFixture");
const equipmentContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "equipmentDefinitions.js"), "utf8"), equipmentContext);
const equipmentSystem = equipmentContext.window.EquipmentSystem;
function fixture({ equipped = false } = {}) {
  const f = moonFixture(), s = f.scene, body = s.playerHitbox.body, player = s.playerHitbox, world = s.physics.world;
  s.destroyUmbraMoonlightRuntime(); s.destroyUmbraBloodSpikeRuntime(); s.destroyUmbraPhantomNovaRuntime();
  delete s.getRunPlayerMechId; delete s.getUmbraPhase2AVerifiedMechId; delete s.verificationContext;
  s.sys = { settings: { key: "survival-scene" }, isActive: () => true }; s.isUmbraPhase2ADrive = false;
  s.shopActive = true; s.gameOver = false; s.extractionComplete = false;
  s.shopState = s.normalizeShopState({}); s.getEquipmentSystem = () => equipmentSystem;
  s.equipmentState = equipmentSystem.createDefaultEquipmentState();
  if (equipped) for (const slot of equipmentSystem.SLOTS) {
    s.equipmentState.bestBySlot[slot] = { id: `ram-${slot}`, slot, rarity: "LEGEND", rank: 5, sourceType: "debug", sourceDepth: 1 };
    s.equipmentState.refinementBySlot[slot] = 20; s.equipmentState.refinementLimitUnlockedBySlot[slot] = true;
  }
  s.passiveLevels = {}; s.startingUpgradeSelectionsRemaining = 3; s.pendingLevelUps = 0; s.survivalTime = 0;
  s.runStartContext = { mode: "standard", runStartDepth: 1, usedDepthRelay: false };
  s.getUrlStageParam = () => null; s.updateHud = () => {}; s.spawnPlayerHealNumber = () => {};
  s.initializeUmbraNormalPresentation = () => {}; // Rendering is tested with the actual module/browser, not these numeric bodies.
  world.pause = () => { world.isPaused = true; world.emit("pause"); };
  world.resume = () => { world.isPaused = false; world.emit("resume"); };
  s.playerHitbox = null;
  const events = [], input = Object.freeze({ id: "baseline", mechId: "umbraSeraph", startDepth: 1, mode: "natural" });
  let live = true, closing = false, fixtureReads = 0;
  const env = Object.freeze({ id: "pure-environment", mode: "normal-integration", version: "umbra-phase7b-v1",
    isValid: () => live, isClosing: () => closing, ownsScene: scene => scene === s && live && s.runEnvironmentIO === env,
    getFixture: scene => { assert.equal(scene, s); assert.equal(closing, false); fixtureReads++; return input; },
    record: (type, detail) => events.push({ type, ...detail }) });
  s.runEnvironmentIO = env;
  return { ...f, body, player, env, events, fixtureReads: () => fixtureReads,
    close: () => { closing = true; }, invalidate: () => { live = false; },
    bind() { s.playerHitbox = player; player.active = true; assert.equal(s.bindUmbraNormalRunContext(), true); s.createPlayerSkills(); },
    activate() { s.shopActive = false; s.umbraRunContext.launchConsumed = true; s.startingUpgradeSelectionsRemaining = 0;
      s.pendingLevelUps = 0; s.levelUpActive = false; world.resume(); s.updateUmbraNormalRunState(); } };
}

test("normal PREPARED preserves the canonical Moon model without body, captures once, and never releases ownership", () => {
  const f = fixture({ equipped: true }), s = f.scene;
  const context = s.prepareUmbraNormalRunContext(), run = s.umbraGrowthRun, model = s.playerSkills[M];
  assert.equal(context.state, "PREPARED"); assert.equal(s.playerHitbox, null); assert.equal(s.isUmbraGrowthContextActive(), true);
  assert.equal(s.getUmbraActiveSkillStage(M), model.definition.stages[0]); assert.deepEqual(Object.keys(s.playerSkills), [M]);
  assert.equal(s.umbraMoonlightRuntime, null); assert.equal(s.getRunPlayerMechId(), "umbraSeraph");
  assert.equal(s.isPlayerMechReleased("umbraSeraph"), true); assert.equal(s.isPlayerMechOwned("umbraSeraph"), false);
  assert.ok(Object.isFrozen(context.inputs)); assert.ok(Object.isFrozen(context.inputs.equipment.bestBySlot));
  const equipment = s.getUmbraEquipmentSnapshot(); assert.equal(equipment.overlimitCap, 2);
  const before = plain(context.inputs);
  s.equipmentState.bestBySlot.head = null; s.shopState.playerMechs.selectedId = "regaliaBastion";
  assert.equal(s.prepareUmbraNormalRunContext(), context); assert.equal(s.initializeUmbraGrowthRun(), run);
  assert.equal(s.playerSkills[M], model); assert.equal(f.fixtureReads(), 1); assert.deepEqual(plain(context.inputs), before);
  assert.equal(s.hasUmbraRunCapability("growth", { purpose: "select" }), false);
  assert.equal(s.getUmbraNormalCombatBlockReason(), "RUN_PREPARED");
});

test("normal BOUND applies real starting stats once before owner; Opening Unlock does not advance attacks", () => {
  const f = fixture({ equipped: true }), s = f.scene; s.prepareUmbraNormalRunContext();
  const model = s.playerSkills[M]; f.bind();
  assert.equal(s.umbraRunContext.state, "BOUND"); assert.equal(s.playerSkills[M], model); assert.ok(s.umbraMoonlightRuntime);
  assert.equal(s.stats.maxHp, 134); assert.equal(s.stats.maxStamina, 165); assert.equal(s.stats.moveSpeed, 403);
  assert.equal(s.getApReinforceHpGain(), 8); assert.equal(s.getBoosterTuningSpeedGain(), 39);
  const stats = plain(s.stats), owner = s.umbraMoonlightRuntime, equipmentId = s.getUmbraEquipmentSnapshot().equipmentSnapshotId;
  f.bind(); s.rebuildPlayerSkillsForRun(); s.captureRunEquipmentBonuses();
  assert.deepEqual(plain(s.stats), stats); assert.equal(s.umbraMoonlightRuntime, owner); assert.equal(s.getUmbraEquipmentSnapshot().equipmentSnapshotId, equipmentId);
  s.shopActive = false; s.umbraRunContext.launchConsumed = true; s.levelUpActive = true;
  s.unlockSkill(B); s.unlockSkill(N); assert.ok(s.umbraBloodSpikeRuntime); assert.ok(s.umbraPhantomNovaRuntime);
  for (let i = 0; i < 5; i++) { s.events.emit("preupdate"); s.physics.world.emit("worldstep", 0.016); }
  assert.equal(s.umbraBloodSpikeRuntime.combatTimeMs, 0); assert.equal(s.umbraPhantomNovaRuntime.combatTimeMs, 0);
  assert.equal(s.umbraBloodSpikeRuntime.counts.casts, 0); assert.equal(s.umbraPhantomNovaRuntime.counts.pulses, 0);
  assert.equal(s.getUmbraAirBrakeCalibration().retainedSpeedRatio, 0.4);
});

test("normal ACTIVE starts only after Opening and Core pending clear; resume cannot bypass it", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  assert.equal(s.umbraRunContext.state, "ACTIVE");
  s.skillMutationState = { umbraGrowthRun: s.umbraGrowthRun, entries: {}, pendingQueue: [{ skillId: M, phase: "stage4" }] };
  s.updateUmbraNormalRunState(); assert.equal(s.umbraRunContext.state, "SUSPENDED");
  s.physics.world.resume(); assert.equal(s.getUmbraNormalCombatBlockReason(), "PAUSED");
  s.skillMutationState.pendingQueue = []; s.updateUmbraNormalRunState(); assert.equal(s.umbraRunContext.state, "ACTIVE");
  s.levelUpActive = true; assert.equal(s.hasUmbraRunCapability("growth", { purpose: "select" }), true);
  assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), false);
});

test("ending and environment closing preserve read snapshots but reject selection/combat and stale body/run", () => {
  const f = fixture(), s = f.scene; const context = s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  const stage = s.getUmbraActiveSkillStage(M), gear = s.getUmbraEquipmentSnapshot();
  context.ending = true; f.close();
  assert.equal(s.isUmbraRunContextCurrent(context), true); assert.equal(s.getUmbraActiveSkillStage(M), stage);
  assert.equal(s.getUmbraEquipmentSnapshot().equipmentSnapshotId, gear.equipmentSnapshotId);
  assert.equal(s.hasUmbraRunCapability("growth", { purpose: "select" }), false); assert.equal(s.upgradeSkill(M), false);
  assert.equal(s.bindUmbraNormalRunContext(context), false); assert.equal(s.initializeUmbraPhantomNovaRuntime(), null);
  assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), false);
  assert.equal(s.setUmbraNormalRunState("ENDED", "TEST"), true); assert.equal(s.setUmbraNormalRunState("ACTIVE", "OLD_CALLBACK"), false);
  assert.equal(s.getUmbraActiveSkillStage(M), null); assert.equal(s.isUmbraRunContextCurrent(context), false);
  assert.equal(f.fixtureReads(), 1);
});

test("ENDED invalidates the issued owner even after the physical body was disabled", () => {
  const f = fixture(), s = f.scene; const context = s.prepareUmbraNormalRunContext(); f.bind();
  s.playerHitbox.body.enable = false;
  assert.equal(s.isUmbraRunContextCurrent(context), false);
  assert.equal(s.setUmbraNormalRunState("ENDED", "WORLD_TEARDOWN"), true);
  assert.equal(context.state, "ENDED"); assert.equal(s.getUmbraActiveSkillStage(M), null);
  assert.equal(s.setUmbraNormalRunState("BOUND", "OLD_CALLBACK"), false);
});

test("repeated SORTIE shares one preparation and a replaced request cannot run the loaded continuation", async () => {
  const f = fixture(), s = f.scene;
  s.isCloudSaveSortieBlocked = () => false;
  let resolveAssets, requests = 0, continuations = 0;
  s.prepareUmbraPresentationAssets = () => { requests++; return new Promise(resolve => { resolveAssets = resolve; }); };
  s.loadGameplayAssetsThenContinueSortie = () => { continuations++; return true; };
  const first = s.continueSortieFromHub(), second = s.continueSortieFromHub();
  assert.equal(first, second); await Promise.resolve(); assert.equal(requests, 1);
  const request = s.umbraNormalLaunchRequest; s.umbraNormalLaunchRequest = { ...request };
  resolveAssets(); assert.equal(await first, false); assert.equal(continuations, 0);
  assert.equal(s.umbraRunContext.assetsPrepared, false);
});

test("Opening three Moon upgrades completes normal selections before the Core queue can activate combat", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind();
  s.shopActive = false; s.umbraRunContext.launchConsumed = true;
  s.showLevelUpChoices = () => {
    s.levelUpActive = true; s.levelUpSelectionMode = "level"; s.levelUpOpeningBoostActive = true; s.levelUpSelectionLocked = true;
    s.levelUpCardRecords = [{ model: { option: s.buildUmbraSkillGrowthChoice(M) } }];
  };
  s.hideOverlay = () => {}; s.resumeGameplayAfterBlockingOverlay = () => s.physics.world.resume();
  s.showLevelUpCardOverlay = (title, description, choices, mode) => {
    s.levelUpActive = true; s.levelUpSelectionMode = mode; s.levelUpSelectionLocked = false;
    s.levelUpCardRecords = choices.map(option => ({ model: { option } }));
  };
  s.beginStartingUpgradeDraft();
  for (let count = 0; count < 3; count++) {
    const option = s.levelUpCardRecords[0].model.option;
    s.completeLevelUpCardSelection(option);
    s.events.emit("preupdate"); s.physics.world.emit("worldstep", .016);
    assert.equal(s.umbraMoonlightRuntime.combatTimeMs, 0);
  }
  assert.equal(s.pendingLevelUps, 0); assert.equal(s.startingUpgradeSelectionsRemaining, 0);
  assert.equal(s.getUmbraActiveSkillStage(M).stage, 4);
  assert.equal(s.skillMutationState.currentSelection.phase, "stage4"); assert.equal(s.levelUpSelectionMode, "skillMutation");
  assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), false);
});

test("normal post-overlay preserves ordinary LOST ARMS/OD/Depth choices and an old overlay cannot consume pending", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  const visited = [];
  for (const name of ["tryOpenPendingSkillMutationSelection", "tryOpenQueuedLostArmsEvolutionSelection", "tryOpenPendingOverdriveModSelection",
    "tryOpenPendingEquipmentOverlimitBonusSelection", "tryStartFinalBossRaidFromDebugStart", "tryOpenPendingDepthDirectiveSelection"]) {
    s[name] = () => { visited.push(name); return name === "tryOpenPendingDepthDirectiveSelection"; };
  }
  assert.equal(s.tryOpenPendingPostOverlaySelections(), true); assert.equal(visited.length, 6);
  const old = { onSelect() { assert.fail("stale option selected"); } };
  s.levelUpActive = true; s.pendingLevelUps = 2; s.levelUpCardRecords = [{ model: { option: {} } }];
  assert.equal(s.completeLevelUpCardSelection(old), false); assert.equal(s.pendingLevelUps, 2); assert.equal(s.levelUpActive, true);
});

test("normal permit identity and current player/body/world are mandatory, never a Scene name or capability flag alone", () => {
  const f = fixture(), s = f.scene; const context = s.prepareUmbraNormalRunContext(); f.bind();
  const body = s.playerHitbox.body; s.playerHitbox.body = { ...body };
  assert.equal(s.isUmbraGrowthContextActive(), false); assert.equal(s.getUmbraActiveSkillStage(M), null);
  s.playerHitbox.body = body; assert.equal(s.isUmbraGrowthContextActive(), true);
  const env = s.runEnvironmentIO; s.runEnvironmentIO = { ...env }; assert.equal(s.isUmbraGrowthContextActive(), false);
  s.runEnvironmentIO = env; s.umbraNormalLaunchRequest = { ...context.request }; assert.equal(s.isUmbraRunContextCurrent(context), false);
  s.umbraNormalLaunchRequest = context.request; f.invalidate(); assert.equal(s.isUmbraGrowthContextActive(), false);
});

test("normal early end listeners are paired, idempotent, and leave no counterpart after repeated Scene restarts", () => {
  const { scene: s } = fixture(), reasons = [], order = [];
  s.events = new (require("node:events").EventEmitter)(); // Isolate the early pair from fixture weapon listeners.
  s.endUmbraNormalRun = reason => { reasons.push(reason); order.push("snapshot-owner-end"); };
  s.prepareUmbraIntegrationSceneShutdown = () => order.push("whole-scene-layers");
  for (let i = 0; i < 12; i++) {
    s.initializeUmbraNormalEndListeners(); s.initializeUmbraNormalEndListeners();
    assert.equal(s.events.listenerCount("shutdown"), 1); assert.equal(s.events.listenerCount("destroy"), 1);
    const stale = s.umbraNormalEndListeners;
    s.events.emit(i % 2 ? "destroy" : "shutdown");
    assert.equal(s.events.listenerCount("shutdown"), 0); assert.equal(s.events.listenerCount("destroy"), 0);
    stale.shutdown(); stale.destroy(); assert.equal(reasons.length, i + 1);
    assert.deepEqual(order.slice(-2), ["snapshot-owner-end", "whole-scene-layers"]);
  }
  s.runEnvironmentIO = null; s.initializeUmbraNormalEndListeners();
  assert.equal(s.events.listenerCount("shutdown"), 0); assert.equal(s.events.listenerCount("destroy"), 0);
});

test("normal successful owner acquisition requests presentation once; repeated Stage application does not repeat it", () => {
  const f = fixture(), s = f.scene, requested = [];
  s.requestUmbraSkillPresentationAssets = (id, context) => requested.push({ id, context });
  const context = s.prepareUmbraNormalRunContext(); f.bind();
  s.unlockSkill(B); s.unlockSkill(N);
  for (let i = 0; i < 3; i++) for (const id of [M, B, N]) s.applySkillStage(s.playerSkills[id]);
  assert.deepEqual(requested.map(x => x.id), [M, B, N]);
  assert.ok(requested.every(x => x.context === context));
  context.ending = true; s.initializeUmbraPhantomNovaRuntime();
  assert.equal(requested.length, 3);
});

test("normal update does not advance survival time before launch or after owner invalidation; ordinary and Raid paths remain", () => {
  for (const mode of ["beforeLaunch", "oldBody", "ended", "active", "ordinary", "raid"]) {
    const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
    // Exercise actual Scene.update up to the time/progression boundary. Rendering,
    // HUD and later movement/combat leaves are omitted; no Phaser frame is claimed.
    const actualUpdate = s.update, kept = new Set(["update", "updateUmbraNormalRunState", "getUmbraNormalCombatBlockReason",
      "isUmbraRunContextCurrent", "setUmbraNormalRunState"]);
    for (let proto = s; proto; proto = Object.getPrototypeOf(proto)) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !kept.has(key) && typeof s[key] === "function") s[key] = () => false;
      }
    }
    s.gameplayRuntimeCreated = true; s.isFinalBossRaidActive = () => mode === "raid";
    s.updateOverdrive = () => { throw new Error("PASSED_TIME_BOUNDARY"); };
    if (mode === "beforeLaunch") { s.umbraRunContext.launchConsumed = false; s.umbraRunContext.state = "BOUND"; }
    if (mode === "oldBody") s.playerHitbox.body = { ...s.playerHitbox.body };
    if (mode === "ended" || mode === "raid") { s.umbraRunContext.ending = true; s.umbraRunContext.state = "ENDED"; }
    if (mode === "ordinary") s.umbraRunContext = null;
    if (["active", "ordinary", "raid"].includes(mode)) {
      assert.throws(() => actualUpdate.call(s, 16, 16), /PASSED_TIME_BOUNDARY/); assert.equal(s.survivalTime, 16);
    } else {
      actualUpdate.call(s, 16, 16); assert.equal(s.survivalTime, 0, mode);
    }
  }
});
