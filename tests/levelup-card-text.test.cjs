"use strict";
// Level-up card text for the standard mechs: Japanese badges, stage and level labels, a
// "now → next" summary, per-stat difference chips, and comms messages held off the cards.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
// Values built inside the VM context compare by structure only after a plain copy.
const plain = value => JSON.parse(JSON.stringify(value));

function fixture({ mechId = "defaultBear", orbitCore = true } = {}) {
  const forbidden = () => assert.fail("Storage and network must not be accessed");
  const window = { location: { search: "" }, fetch: forbidden };
  Object.defineProperties(window, {
    localStorage: { get: forbidden }, sessionStorage: { get: forbidden }, firebase: { get: forbidden }
  });
  const context = vm.createContext({
    window, console, URLSearchParams, fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden,
    Phaser: {
      Scene: class {}, Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) },
      Utils: { Array: { Shuffle: values => values } }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
  const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const laterDeclarationsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
  assert.ok(declarationsEnd > 0 && laterDeclarationsStart > declarationsEnd && classEnd > laterDeclarationsStart);
  vm.runInContext(source.slice(0, declarationsEnd) + "\n" + source.slice(laterDeclarationsStart, classEnd) +
    "\nthis.api = { Scene: SurvivalScene, skills: SKILL_DEFINITIONS, mechs: PLAYER_MECH_DEFINITIONS, cds: CD_CATALOG };", context);
  const scene = Object.create(context.api.Scene.prototype);
  scene.sys = { settings: { key: "SurvivalScene" } };
  scene.getUrlStageParam = () => null;
  scene.getDebugPlayerMechIdOverride = () => null;
  scene.getSelectedPlayerMechDefinition = () => context.api.mechs[mechId];
  scene.getSelectedPlayerMechId = () => mechId;
  scene.getOwnedCdDefinitions = () => context.api.cds.filter(cd => cd.id === "anju");
  scene.isFinalBossRaidActive = () => false;
  scene.shouldUseAcEvasionPassive = () => false;
  scene.getActiveAcMovementTuning = () => ({});
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
  scene.getRunEquipmentCombatLinkState = () => ({ snapshotCaptured: false });
  scene.getRunEquipmentSkillOverlimitCap = () => 0;
  scene.getRunPlayerMechStatProfile = () => scene.normalizePlayerMechStatProfile(context.api.mechs[mechId].statProfile);
  scene.shopState = { upgrades: { weapon: 0, armor: 0, shoes: 0 } };
  scene.stats = scene.createBasePlayerStats();
  scene.applyPermanentUpgradesToStats();
  scene.applySelectedPlayerMechStatProfile();
  scene.passiveLevels = {};
  scene.playerSkills = orbitCore ? { basicSkill: { currentStage: context.api.skills.basicSkill.stages[0] } } : {};
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0;
  scene.levelUpOpeningBoostActive = false;
  scene.survivalTime = 1;
  scene.time = { now: 10000, delayedCall() {} };
  scene.resetLevelUpCandidatePresentationState();
  return { scene, api: context.api };
}

function skillOption(api, skillId, fromStage) {
  const definition = api.skills[skillId];
  return {
    type: "skill", skillId, definition, actionType: fromStage ? "upgrade" : "unlock",
    currentStage: fromStage ? definition.stages[fromStage - 1] : null, nextStage: definition.stages[fromStage]
  };
}

const passive = (scene, id) => scene.getPassiveUpgradeChoices({ openingBoost: false }).find(choice => choice.id === id);
const englishStatLabel = /\b(DMG|HIT|SPD|SIZE|TARGET)\b/;

test("an upgrade card names the two main changes as now → next and keeps difference chips", () => {
  const { scene, api } = fixture();
  const model = scene.buildLevelUpCardModel(skillOption(api, "basicSkill", 2), 0);
  assert.equal(model.typeLabel, "スキル強化");
  assert.equal(model.title, "Orbit Core");
  assert.equal(model.stageLabel, "段階 2 → 3");
  assert.equal(model.description, "威力 1 → 2\n雷撃本数 1 → 2");
  assert.equal(model.stageProgress, "●●●○○○○○");
  assert.deepEqual(plain(model.chips.map(chip => chip.label).slice(0, 2)), ["威力 +1", "雷撃本数 +1"]);
  model.chips.forEach(chip => assert.doesNotMatch(chip.label, englishStatLabel));
});

test("times are shown in seconds on both the summary and the chips", () => {
  const { scene, api } = fixture();
  const model = scene.buildLevelUpCardModel(skillOption(api, "basicSkill", 1), 0);
  assert.equal(model.description, "攻撃間隔 0.46 → 0.38秒");
  assert.ok(model.chips.some(chip => chip.label === "攻撃間隔 -0.08秒"));
  assert.equal(scene.formatLevelUpSeconds(380), "0.38");
  assert.equal(scene.formatLevelUpSeconds(8), "0.008");
  assert.equal(scene.formatLevelUpSeconds(1900), "1.9");
});

test("a new skill explains its role and shows its starting values", () => {
  const { scene, api } = fixture();
  const model = scene.buildLevelUpCardModel(skillOption(api, "tornadoSkill", 0), 0);
  assert.equal(model.typeLabel, "新スキル");
  assert.equal(model.stageLabel, "段階 1 で取得");
  assert.equal(model.description, "画面内の敵を追尾する竜巻を発生させる");
  assert.deepEqual(plain(model.chips.map(chip => chip.label)), ["威力 1", "攻撃間隔 0.32秒", "速度 220", "範囲 18"]);
});

test("new-effect and final cards use Japanese badges and mark the last stage", () => {
  const { scene, api } = fixture();
  const effect = scene.buildLevelUpCardModel(skillOption(api, "tornadoSkill", 6), 0);
  assert.equal(effect.typeLabel, "新効果つき強化");
  assert.deepEqual([...effect.newEffects], ["吸引フィールド解放"]);
  const final = scene.buildLevelUpCardModel(skillOption(api, "basicSkill", 7), 0);
  assert.equal(final.typeLabel, "最終段階");
  assert.equal(final.stageLabel, "段階 7 → 8（最終）");
  const cannon = scene.buildLevelUpCardModel(skillOption(api, "regaliaBastionCannon", 2), 0);
  assert.equal(cannon.description, "威力 18 → 20\n弾数 1 → 2");
});

test("passive cards show their level, a 10-step track and now → next values", () => {
  const { scene } = fixture();
  const ap = scene.buildLevelUpCardModel(passive(scene, "vitalBloom"), 0);
  assert.equal(ap.typeLabel, "機体強化");
  assert.equal(ap.stageLabel, "Lv 0 → 1（最大 10）");
  assert.equal(ap.stageProgress, "●○○○○○○○○○");
  assert.equal(ap.description, `最大AP ${scene.stats.maxHp} → ${scene.stats.maxHp + 20}\nAP も 20 回復`);
  assert.equal(ap.chips[0].label, "AP +20");
  scene.passiveLevels.vitalBloom = 3;
  assert.equal(scene.buildLevelUpCardModel(passive(scene, "vitalBloom"), 0).stageLabel, "Lv 3 → 4（最大 10）");

  const energy = scene.buildLevelUpCardModel(passive(scene, "staminaCore"), 0);
  assert.equal(energy.description, `最大ブーストEN ${scene.stats.maxStamina} → ${scene.stats.maxStamina + 25}\nEN も 25 回復`);
  assert.equal(energy.chips[0].label, "ブーストEN +25");

  const fire = passive(scene, "rapidSigil");
  const before = scene.getCurrentPlayerFireInterval(), after = scene.getCurrentPlayerFireInterval(fire.nextFireIntervalMs);
  const fireModel = scene.buildLevelUpCardModel(fire, 0);
  assert.equal(fireModel.description, `Orbit Core の自動雷撃\n間隔 ${scene.formatLevelUpSeconds(before)} → ${scene.formatLevelUpSeconds(after)}秒`);
  assert.equal(fireModel.chips[0].label, `雷撃の間隔 -${scene.formatLevelUpSeconds(before - after)}秒`);
  assert.equal(scene.buildLevelUpCardModel(passive(scene, "overchargeBolt"), 0).description, "Orbit Core の自動雷撃\n威力 +1");
});

test("the lightning passives say when Orbit Core is not owned", () => {
  const { scene } = fixture({ orbitCore: false });
  assert.equal(scene.buildLevelUpCardModel(passive(scene, "overchargeBolt"), 0).description, "自動雷撃の威力 +1\nOrbit Core 所持時のみ有効");
  assert.match(scene.buildLevelUpCardModel(passive(scene, "rapidSigil"), 0).description, /^自動雷撃の間隔 [\d.]+ → [\d.]+秒\nOrbit Core 所持時のみ有効$/);
});

const passiveIds = (scene, options = { openingBoost: false }) => plain(scene.getPassiveUpgradeChoices(options).map(choice => choice.id));
const ownLostArm = (scene, armId = "abyssRail") => {
  scene.lostArmsState = { permanentLevels: { [armId]: 1 }, pendingLevels: {}, runtimeLevels: {} };
};

test("a mech without an Orbit Core slot is not offered the lightning passives", () => {
  const { scene } = fixture({ mechId: "regaliaBastion", orbitCore: false });
  assert.equal(scene.isOrbitCoreOutOfReachForPassives(), true);
  for (const openingBoost of [false, true]) {
    const ids = passiveIds(scene, { openingBoost });
    assert.ok(!ids.includes("overchargeBolt") && !ids.includes("rapidSigil"), `openingBoost=${openingBoost}: ${ids}`);
    assert.ok(["swiftStep", "staminaCore", "vitalBloom"].every(id => ids.includes(id)), "the other passives stay");
  }

  // The default mech has an Orbit Core slot and keeps both cards.
  const standard = fixture().scene;
  assert.equal(standard.isOrbitCoreOutOfReachForPassives(), false);
  assert.ok(["overchargeBolt", "rapidSigil"].every(id => passiveIds(standard).includes(id)));
});

test("without an Orbit Core slot, Fire Control Link is offered for the LOST ARMS cooldowns", () => {
  const { scene } = fixture({ mechId: "regaliaBastion", orbitCore: false });
  ownLostArm(scene, "gravitySeed");
  assert.deepEqual(passiveIds(scene).filter(id => id === "overchargeBolt" || id === "rapidSigil"), ["rapidSigil"]);

  const fire = passive(scene, "rapidSigil");
  assert.deepEqual(plain(fire.lostArmsCooldown), { beforePercent: 100, afterPercent: 91.6, reductionPercent: 8.4 });
  const card = scene.buildLevelUpCardModel(fire, 0);
  assert.equal(card.description, "LOST ARMS の再発動待ち\n基本の 100% → 91.6%");
  assert.equal(card.chips[0].label, "LOST ARMS 待ち -8.4%");

  // The card matches the cooldown the LOST ARMS actually use after the pick.
  assert.equal(scene.getLostArmCooldownMs(6500), 6500);
  fire.onSelect();
  assert.equal(scene.stats.fireInterval, 470);
  assert.equal(scene.getLostArmCooldownMs(6500), 5952); // 6500 × 91.57%
  assert.equal(scene.passiveLevels.rapidSigil, 1);
  assert.equal(scene.buildLevelUpCardModel(passive(scene, "rapidSigil"), 0).description, "LOST ARMS の再発動待ち\n基本の 91.6% → 83.1%");

  // At the fire interval floor, or above 610ms where the next level would not reach 540ms, the
  // LOST ARMS cooldown does not change, so the card is not offered.
  scene.stats.fireInterval = 160;
  assert.equal(passive(scene, "rapidSigil"), undefined);
  scene.stats.fireInterval = 610;
  assert.equal(passive(scene, "rapidSigil"), undefined);
  scene.stats.fireInterval = 609;
  assert.ok(passive(scene, "rapidSigil"));
});

test("XP overflows to OVERDRIVE once only ineffective lightning passives would remain", () => {
  const maxOtherPassives = (scene) => {
    scene.getAvailableSkillChoices = () => [];
    for (const id of ["swiftStep", "staminaCore", "vitalBloom"]) scene.passiveLevels[id] = scene.getPassiveMaxLevel(id);
  };
  const regalia = fixture({ mechId: "regaliaBastion", orbitCore: false }).scene;
  maxOtherPassives(regalia);
  assert.deepEqual(passiveIds(regalia), []);
  assert.equal(regalia.isXpProgressionCapped(), true);
  ownLostArm(regalia);
  assert.equal(regalia.isXpProgressionCapped(), false, "Fire Control Link still shortens the LOST ARMS cooldowns");

  const standard = fixture().scene;
  maxOtherPassives(standard);
  assert.equal(standard.isXpProgressionCapped(), false, "the default mech still raises Orbit Core's lightning");
  standard.passiveLevels.overchargeBolt = standard.getPassiveMaxLevel("overchargeBolt");
  standard.passiveLevels.rapidSigil = standard.getPassiveMaxLevel("rapidSigil");
  assert.equal(standard.isXpProgressionCapped(), true);
});

test("a comms message on screen goes back to the front of the queue while a selection overlay is open", () => {
  const { scene } = fixture();
  const hidden = [];
  const message = { text: "banter", source: "banter" };
  scene.commsState = { container: { active: true }, activeMessage: message, queue: [{ text: "next" }] };
  scene.hideCurrentCommsMessage = (reason, options) => { hidden.push({ reason, options }); scene.commsState.activeMessage = null; };
  assert.equal(scene.suspendCommsMessageForOverlay("levelUp"), true);
  assert.deepEqual(plain(scene.commsState.queue.map(item => item.text)), ["banter", "next"]);
  assert.deepEqual(plain(hidden), [{ reason: "levelUp:suspend", options: { immediate: true, showNext: false } }]);
  assert.equal(scene.suspendCommsMessageForOverlay("levelUp"), false, "nothing to hold once it is queued");

  for (const kept of [{ source: "epilogue" }, { epilogueSequenceId: "x" }, { commsStateTransition: "external_carrier_detected" }]) {
    scene.commsState = { container: { active: true }, activeMessage: kept, queue: [] };
    assert.equal(scene.suspendCommsMessageForOverlay("levelUp"), false);
    assert.equal(scene.commsState.activeMessage, kept);
  }
});
