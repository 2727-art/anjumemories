"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const skillSource = fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const passiveIds = ["overchargeBolt", "rapidSigil", "swiftStep", "staminaCore", "vitalBloom", "evasiveFirmware"];
const slots = {
  defaultBear: ["basicSkill", "tornadoSkill", "rabbitThunderSkill"],
  regaliaBastion: ["regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"]
};

// Historical evidence: .tmp_umbra_phase2a/baseline/game.js:78505 selected
// min(passives.length > 0 ? min(2, limit - 1) : limit, skills.length).
// Phase 2B restores its effective-empty-pool case only for normal choices on the
// two released mechs. The temporary baseline is evidence, not a test dependency.
function fixture(mechId = "defaultBear") {
  const calls = { storage: 0, network: 0, consumed: [], shown: [], paused: 0 };
  const forbidStorage = () => { calls.storage += 1; assert.fail("Unexpected storage operation"); };
  const forbidNetwork = () => { calls.network += 1; assert.fail("Unexpected network operation"); };
  const storage = Object.fromEntries(["getItem", "setItem", "removeItem", "clear"].map(k => [k, forbidStorage]));
  const math = Object.create(Math); let seed = 12345;
  math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const context = vm.createContext({
    window: { location: { search: "" }, localStorage: storage, sessionStorage: storage, fetch: forbidNetwork },
    localStorage: storage, sessionStorage: storage, fetch: forbidNetwork, XMLHttpRequest: forbidNetwork,
    console, URLSearchParams, Math: math,
    Phaser: { Scene: class {}, Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) } }
  });
  vm.runInContext(skillSource, context);
  const constantsEnd = gameSource.indexOf("function isCommsStoryDebugResetRequested()");
  const classStart = gameSource.indexOf("class SurvivalScene extends");
  const classEnd = gameSource.indexOf("\nconst config =", classStart);
  assert.ok(constantsEnd > 0 && classStart > constantsEnd && classEnd > classStart);
  const passiveConstants = ["LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS", "LEVEL_UP_PASSIVE_MAX_LEVEL"].map(name => {
    const declaration = gameSource.match(new RegExp(`^const ${name} = [^;]+;`, "m")); assert.ok(declaration, name); return declaration[0];
  }).join("\n");
  vm.runInContext(gameSource.slice(0, constantsEnd) + "\n" + passiveConstants + "\n" + gameSource.slice(classStart, classEnd) +
    "\nthis.api = { Scene: SurvivalScene, mechs: PLAYER_MECH_DEFINITIONS, skills: SKILL_DEFINITIONS, rapidMinimum: LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS };", context);
  const scene = Object.create(context.api.Scene.prototype);
  scene.getUrlStageParam = () => null;
  scene.getSelectedPlayerMechDefinition = () => context.api.mechs[mechId];
  scene.getSelectedPlayerMechId = () => mechId;
  scene.getRunPlayerMechStatProfile = () => scene.normalizePlayerMechStatProfile(context.api.mechs[mechId].statProfile);
  scene.getActiveAcMovementTuning = () => ({});
  scene.shouldUseAcEvasionPassive = () => true;
  scene.isFinalBossRaidActive = () => false;
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
  scene.shuffleArray = values => values;
  // No equipment fixture. Keep the real candidate eligibility and builders.
  scene.getRunEquipmentCombatLinkState = () => ({ snapshotCaptured: false });
  scene.getRunEquipmentSkillOverlimitCap = () => 0;
  scene.playerSkills = {};
  scene.stats = { moveSpeed: 280, maxStamina: 100, stamina: 80, maxHp: 100, hp: 50, fireInterval: 500, bulletDamage: 4 };
  scene.passiveLevels = {};
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0; scene.survivalTime = 1;
  scene.levelUpOpeningBoostActive = false; scene.levelUpSelectionLocked = false;
  scene.resetLevelUpCandidatePresentationState();
  const tickets = { openingBoostPlusOne: 2, openingBoostReroll: 2 };
  scene.runAnjuMemoryState = {};
  scene.getAnjuMemoryConsumableCount = id => tickets[id] || 0;
  scene.consumeAnjuMemoryConsumable = (id, count) => { calls.consumed.push({ id, count }); tickets[id] -= count; return true; };
  scene.setLastPickupNotice = () => {};
  scene.cancelActiveEnemyBeamCharges = () => {};
  scene.physics = { world: { pause() { calls.paused += 1; } } };
  scene.showLevelUpCardOverlay = (title, description, choices, mode, options) => calls.shown.push({ title, choices, mode, options });
  const capPassives = () => passiveIds.forEach(id => { scene.passiveLevels[id] = scene.getPassiveMaxLevel(id); });
  const capSkill = id => {
    const definition = context.api.skills[id], stageIndex = definition.stages.length - 1;
    scene.playerSkills[id] = { id, definition, stageIndex, currentStage: definition.stages[stageIndex] };
  };
  return { scene, calls, tickets, api: context.api, capPassives, capSkill };
}

for (const mechId of Object.keys(slots)) test(`${mechId}: no effective passive restores three real skill choices`, () => {
  const { scene, calls, capPassives } = fixture(mechId); capPassives();
  assert.deepEqual(plain(scene.getPassiveUpgradeChoices()), []);
  const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false, choiceLimit: 99 });
  assert.deepEqual(plain(choices.map(c => c.skillId)), slots[mechId]);
  assert.ok(choices.every(c => c.type === "skill" && c.nextStage.stage === 1));
  assert.equal(new Set(choices.map(c => c.skillId)).size, 3);
  scene.showLevelUpChoices();
  assert.equal(calls.shown[0].choices.length, 3);
  assert.equal(calls.shown[0].title, "Level Up");
  assert.equal(scene.hasAvailableLevelUpUpgrade(), true);
  assert.equal(scene.isXpProgressionCapped(), false);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  assert.deepEqual(calls.consumed, []); assert.equal(calls.storage, 0); assert.equal(calls.network, 0);
});

test("effective-empty means no offered passive, even if a numeric level is below cap", () => {
  for (const mechId of Object.keys(slots)) {
    const { scene, api, capPassives } = fixture(mechId); capPassives();
    scene.passiveLevels.rapidSigil = 0;
    scene.stats.fireInterval = api.rapidMinimum;
    assert.equal(scene.isPassiveUpgradeAvailable("rapidSigil"), true);
    assert.equal(scene.getPassiveUpgradeChoices().length, 0, "No reduction remains at the interval floor");
    assert.equal(scene.buildLevelUpUpgradeChoices({ openingBoost: false }).length, 3);
  }
});

test("one effective passive keeps the normal two-skill plus one-passive limit", () => {
  for (const mechId of Object.keys(slots)) {
    const { scene, capPassives } = fixture(mechId); capPassives();
    scene.passiveLevels.swiftStep -= 1;
    const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
    assert.deepEqual(plain(choices.map(c => c.skillId || c.id)), [...slots[mechId].slice(0, 2), "swiftStep"]);
    assert.equal(choices[2].nextLevel, scene.getPassiveMaxLevel("swiftStep"));
  }
});

test("one, two and zero available skills are returned without invalid or duplicate fillers", () => {
  for (const mechId of Object.keys(slots)) {
    const { scene, capPassives, capSkill } = fixture(mechId); capPassives();
    for (let capped = 1; capped <= 3; capped += 1) {
      capSkill(slots[mechId][capped - 1]);
      const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
      assert.deepEqual(plain(choices.map(c => c.skillId)), slots[mechId].slice(capped));
      assert.equal(new Set(choices.map(c => c.skillId)).size, choices.length);
      assert.equal(scene.hasAvailableLevelUpUpgrade(), capped < 3);
      assert.equal(scene.isXpProgressionCapped(), capped === 3);
    }
  }
});

test("existing skill shuffle and mixed unlock/upgrade ordering feed the restored third slot", () => {
  for (const mechId of Object.keys(slots)) {
    const { scene, capPassives, api } = fixture(mechId); capPassives();
    const id = slots[mechId][0], definition = api.skills[id];
    scene.playerSkills[id] = { id, definition, stageIndex: 0, currentStage: definition.stages[0] };
    scene.shuffleArray = choices => [...choices].reverse();
    const choices = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
    assert.deepEqual(plain(choices.map(c => c.skillId)), [...slots[mechId]].reverse());
    assert.equal(choices[2].actionType, "upgrade"); assert.equal(choices[2].nextStage.stage, 2);
    assert.ok(choices.slice(0, 2).every(c => c.actionType === "unlock"));
  }
});

test("Opening Boost effective-empty pool remains at two skills and cannot spend a +1 ticket", () => {
  for (const mechId of Object.keys(slots)) {
    const { scene, calls, tickets, capPassives } = fixture(mechId); capPassives();
    scene.startingUpgradeSelectionsRemaining = 3; scene.survivalTime = 0;
    scene.showLevelUpChoices();
    assert.equal(calls.shown[0].choices.length, 2);
    assert.ok(calls.shown[0].choices.every(c => c.type === "skill"));
    assert.equal(calls.shown[0].title, "Opening Boost");
    assert.equal(tickets.openingBoostPlusOne, 2); assert.deepEqual(calls.consumed, []);
  }
});

test("Opening +1 and one-use Reroll retain their existing consumption and four-card rules", () => {
  for (const mechId of [...Object.keys(slots), "umbraSeraph"]) {
    const { scene, calls, tickets } = fixture(mechId);
    scene.startingUpgradeSelectionsRemaining = 3; scene.survivalTime = 0;
    scene.showLevelUpChoices();
    const first = calls.shown[0];
    assert.equal(first.choices.length, 4);
    assert.equal(first.choices.filter(c => c.type === "skill").length, mechId === "umbraSeraph" ? 0 : 2);
    assert.ok(first.choices.every(c => c.id !== "evasiveFirmware"));
    assert.equal(tickets.openingBoostPlusOne, 1);
    scene.rerollOpeningBoostChoices(); scene.rerollOpeningBoostChoices();
    assert.equal(calls.shown.length, 2, "Reroll must not be consumed or displayed twice");
    assert.equal(calls.shown[1].choices.length, 4);
    assert.ok(calls.shown[1].choices.every(c => c.id !== "evasiveFirmware"));
    assert.deepEqual(calls.consumed, [{ id: "openingBoostPlusOne", count: 1 }, { id: "openingBoostReroll", count: 1 }]);
    assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
    assert.equal(calls.storage, 0); assert.equal(calls.network, 0);
  }
});

test("UMBRA has no preview-only skill fillers and retains query-safe first presentation", () => {
  const { scene, capPassives } = fixture("umbraSeraph");
  const first = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  assert.equal(first.length, 3); assert.ok(first.every(c => c.type === "passive"));
  assert.equal(first[0].id, "evasiveFirmware");
  assert.equal(scene.getSelectedPlayerMechPassiveWeights().evasiveFirmware, 3);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  scene.hasAvailableLevelUpUpgrade(); scene.isXpProgressionCapped();
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  const state = scene.levelUpCandidatePresentationState;
  assert.equal(scene.markLevelUpChoicesPresented(first, { openingBoost: false, presentationState: state }), true);
  assert.equal(scene.markLevelUpChoicesPresented(first, { openingBoost: false, presentationState: state }), false);
  capPassives();
  assert.equal(scene.getAvailableSkillChoices().length, 0);
  assert.equal(scene.buildLevelUpUpgradeChoices({ openingBoost: false }).length, 0);
  assert.equal(scene.isXpProgressionCapped(), true);
});

test("normal/Opening eligibility context and overlimit flag still reach the real skill builder", () => {
  const { scene, capPassives } = fixture(); capPassives();
  const original = scene.getAvailableSkillChoices, contexts = [];
  scene.getAvailableSkillChoices = function (options) { contexts.push(options); return original.call(this, options); };
  const normal = scene.buildLevelUpUpgradeChoices({ openingBoost: false });
  const opening = scene.buildLevelUpUpgradeChoices({ openingBoost: true, choiceLimit: 4 });
  assert.equal(normal.length, 3); assert.equal(opening.length, 2);
  assert.equal(contexts[0].source, "levelUp"); assert.equal(contexts[0].allowEquipmentOverlimit, true);
  assert.equal(contexts[1].source, "openingBoost"); assert.equal(contexts[1].allowEquipmentOverlimit, false);
});
