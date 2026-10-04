"use strict";

// Phase 6B pure production definitions, resolver, arithmetic and card models.
// Scene clocks/attack lifecycles and real pointer/key selection are separate tests.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { EventEmitter } = require("node:events");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const skillSource = fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8");
const MOON = "umbraMoonlight", SPIKE = "umbraBloodSpike", NOVA = "umbraPhantomNova";
const ids = [MOON, SPIKE, NOVA];
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const expected = {
  [MOON]: { damage: [4, 5, 6, 7, 8, 9, 10, 12], passageRadius: [60, 60, 62, 64, 64, 66, 68, 70],
    rehitBaseMs: [750, 750, 750, 725, 725, 700, 675, 650] },
  [SPIKE]: { impactRadius: [80, 90, 100, 110, 122, 135, 147, 240] },
  [NOVA]: { orbitDamage: [2, 2, 2, 2, 3, 3, 3, 3], orbitRange: [220, 230, 230, 230, 230, 230, 240, 240],
    deployedRange: [300, 300, 310, 310, 310, 320, 320, 320], slotCount: [1, 1, 1, 2, 2, 2, 2, 3] }
};
const fixtures = {
  baseline: { weapon: 0, cds: ["anju"], fire: 540, multiplier: 1, moon: [750, 725, 650] },
  medium: { weapon: 10, cds: ["anju", "hanseikai", "miraiwoikiteru"], fire: 513, multiplier: 1.6, moon: [711, 688, 618] },
  deep: { weapon: 25, cds: ["anju", "nandeyanen", "kotokoto", "miraiwoikiteru"], fire: 482, multiplier: 2.66, moon: [666, 645, 581] }
};

function fixture({ fixtureId = "baseline", acquired = ids, growth = true } = {}) {
  const calls = { storage: 0, network: 0 };
  const forbiddenStorage = () => { calls.storage++; assert.fail("Storage data APIs are prohibited"); };
  const forbiddenNetwork = () => { calls.network++; assert.fail("Network/SDK entrances are prohibited"); };
  const window = { location: { search: "" }, fetch: forbiddenNetwork };
  Object.defineProperties(window, { localStorage: { get: forbiddenStorage }, sessionStorage: { get: forbiddenStorage }, firebase: { get: forbiddenNetwork } });
  const context = vm.createContext({ window, console, URLSearchParams, fetch: forbiddenNetwork,
    XMLHttpRequest: forbiddenNetwork, WebSocket: forbiddenNetwork,
    Phaser: { Scene: class {}, Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) }, Utils: { Array: { Shuffle: values => values } } } });
  vm.runInContext(skillSource, context);
  const earlyEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const laterStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
  assert.ok(earlyEnd > 0 && laterStart > earlyEnd && classEnd > laterStart);
  vm.runInContext(source.slice(0, earlyEnd) + "\n" + source.slice(laterStart, classEnd)
    + "\nthis.api = { Scene: SurvivalScene, skills: SKILL_DEFINITIONS, mechs: PLAYER_MECH_DEFINITIONS, cds: CD_CATALOG };", context);
  const api = context.api, scene = Object.create(api.Scene.prototype), row = fixtures[fixtureId];
  scene.isUmbraPhase2ADrive = true; scene.sys = { settings: { key: "UmbraPhase2ADrive" } };
  scene.physics = { world: {} };
  scene.playerHitbox = { active: true, body: { world: scene.physics.world, enable: true, position: { x: 100, y: 100 } } };
  scene.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId: "umbraSeraph",
    moonlightArena: true, bloodSpikeArena: true, phantomNovaArena: true, traceNotifications: true, growthEnabled: growth });
  scene.getUrlStageParam = () => null; scene.getDebugPlayerMechIdOverride = () => null;
  scene.getSelectedPlayerMechDefinition = () => api.mechs.umbraSeraph; scene.getSelectedPlayerMechId = () => "umbraSeraph";
  scene.getOwnedCdDefinitions = () => api.cds.filter(cd => row.cds.includes(cd.id));
  scene.isFinalBossRaidActive = () => false;
  scene.shouldUseAcEvasionPassive = () => true; scene.getActiveAcMovementTuning = () => ({});
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
  scene.getRunEquipmentCombatLinkState = () => ({ snapshotCaptured: false }); scene.getRunEquipmentSkillOverlimitCap = () => 0;
  scene.shopState = { upgrades: { weapon: row.weapon, armor: 0, shoes: 0 } };
  scene.stats = scene.createBasePlayerStats(); scene.applyPermanentUpgradesToStats(); scene.applySelectedPlayerMechStatProfile();
  scene.passiveLevels = {}; scene.playerSkills = {};
  if (growth) scene.umbraGrowthRun = { context: scene.verificationContext, generation: 1,
    player: scene.playerHitbox, body: scene.playerHitbox.body, world: scene.physics.world, closed: false, deferredMilestones: [] };
  for (const id of acquired) scene.playerSkills[id] = { ...scene.createSkillState(api.skills[id]), verificationOnly: true };
  scene.moonlightAttackEnabled = true; scene.bloodSpikeAttackEnabled = true; scene.novaAttackEnabled = true;
  scene.acEvasionPassiveStartLevelApplied = true; scene.startingUpgradeSelectionsRemaining = 0; scene.levelUpOpeningBoostActive = false;
  scene.time = { now: 10000, delayedCall() {} }; scene.survivalTime = 1; scene.resetLevelUpCandidatePresentationState();
  return { scene, api, calls };
}

function selectStage(scene, api, id, number) {
  // Canonical, owner-bound numerical fixture only. This does not claim runtime application.
  const skill = scene.playerSkills[id]; skill.stageIndex = number - 1; skill.currentStage = api.skills[id].stages[number - 1];
}
const statMethods = { [MOON]: "getUmbraMoonlightEffectiveStats", [SPIKE]: "getUmbraBloodSpikeEffectiveStats", [NOVA]: "getUmbraPhantomNovaEffectiveStats" };

for (const id of ids) test(`${id}: all eight canonical immutable Stages and every adjacent field match the approved table`, () => {
  const { api } = fixture(), definition = api.skills[id];
  assert.equal(definition.stages.length, 8); assert.equal(definition.stages[0], definition.verificationStage1);
  assert.ok(Object.isFrozen(definition.stages)); assert.equal(definition.previewOnly, true); assert.equal(definition.startsUnlocked, false);
  const first = plain(definition.verificationStage1);
  definition.stages.forEach((stage, index) => {
    assert.ok(Object.isFrozen(stage));
    const wanted = { ...first, stage: index + 1, ...Object.fromEntries(Object.entries(expected[id]).map(([key, values]) => [key, values[index]])) };
    assert.deepEqual(plain(stage), wanted);
    if (index) {
      const changed = Object.keys(stage).filter(key => key !== "stage" && stage[key] !== definition.stages[index - 1][key]);
      const expectedChanged = Object.keys(expected[id]).filter(key => expected[id][key][index] !== expected[id][key][index - 1]);
      assert.deepEqual(changed.sort(), expectedChanged.sort());
      assert.ok(changed.length > 0, "Every Stage has a basic effect");
    }
  });
  assert.throws(() => { definition.stages[0].damage = 999; }, TypeError);
  assert.throws(() => { definition.stages.push(first); }, { name: "TypeError" });
});

test("Moon exit radii and Spike invariant timing/search/damage retain their separate meanings", () => {
  const { scene, api } = fixture();
  assert.deepEqual(plain(api.skills[MOON].stages.map(stage => stage.passageRadius + stage.leaveMargin)), [72, 72, 74, 76, 76, 78, 80, 82]);
  for (let number = 1; number <= 8; number++) {
    selectStage(scene, api, SPIKE, number); const stats = scene.getUmbraBloodSpikeEffectiveStats();
    assert.equal(stats.rawDamage, 5); assert.equal(stats.searchRange, 600); assert.equal(stats.intervalMs, 1800);
    assert.equal(stats.impactOffsetMs, 200); assert.equal(stats.lifetimeMs, 800); assert.equal(stats.maxActiveCasts, 3);
    assert.equal(stats.frameCount, 8); assert.equal(stats.frameRate, 10); assert.equal(stats.searchRetryMs, 150);
  }
});

for (const [fixtureId, row] of Object.entries(fixtures)) test(`${fixtureId}: all 24 effective Stages use Stage plus Reactor and dedicated q exactly once`, () => {
  const { scene, api, calls } = fixture({ fixtureId });
  assert.equal(scene.stats.fireInterval, row.fire);
  for (let number = 1; number <= 8; number++) {
    for (const id of ids) selectStage(scene, api, id, number);
    const moon = scene.getUmbraMoonlightEffectiveStats(), spike = scene.getUmbraBloodSpikeEffectiveStats(), nova = scene.getUmbraPhantomNovaEffectiveStats();
    const interval = (base, floor) => Math.max(floor, Math.round(floor + (base - floor) * ((row.fire - 160) / 380)));
    assert.equal(moon.rawDamage, expected[MOON].damage[number - 1]); assert.equal(moon.rehitMs, interval(expected[MOON].rehitBaseMs[number - 1], 200));
    assert.equal(spike.rawDamage, 5); assert.equal(spike.intervalMs, interval(1800, 500));
    assert.equal(nova.orbitRawDamage, expected[NOVA].orbitDamage[number - 1]); assert.equal(nova.deployedRawDamage, 3);
    assert.equal(nova.orbitIntervalMs, interval(900, 300)); assert.equal(nova.deployedIntervalMs, interval(500, 200));
    near(moon.damageBeforeTargetModifiers, moon.rawDamage * row.multiplier);
    near(spike.damageBeforeTargetModifiers, 5 * row.multiplier);
    near(nova.orbitDamageBeforeTargetModifiers, nova.orbitRawDamage * row.multiplier);
    if ([1, 4, 8].includes(number)) assert.equal(moon.rehitMs, row.moon[[1, 4, 8].indexOf(number)]);
  }
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("R3/F2 Stage1/4/8 values match design 8.3 without Mutation, gear, or OVERDRIVE cadence", () => {
  const { scene, api } = fixture(); scene.stats.bulletDamage = 4; scene.stats.fireInterval = 400;
  for (const [index, number] of [1, 4, 8].entries()) {
    for (const id of ids) selectStage(scene, api, id, number);
    const moon = scene.getUmbraMoonlightEffectiveStats(), spike = scene.getUmbraBloodSpikeEffectiveStats(), nova = scene.getUmbraPhantomNovaEffectiveStats();
    assert.equal(moon.rawDamage, [7, 10, 15][index]); assert.equal(moon.rehitMs, [547, 532, 484][index]);
    assert.equal(spike.rawDamage, 8); assert.equal(spike.intervalMs, 1321);
    assert.equal(nova.orbitRawDamage, [5, 5, 6][index]); assert.equal(nova.deployedRawDamage, 6);
    assert.equal(nova.orbitIntervalMs, 679); assert.equal(nova.deployedIntervalMs, 389);
  }
  const intervals = [scene.getUmbraMoonlightRehitIntervalMs(), scene.getUmbraBloodSpikeIntervalMs(), scene.getUmbraPhantomNovaIntervalMs(), scene.getUmbraPhantomNovaIntervalMs("deployed")];
  scene.overflowRewardState = { overdriveRemainingMs: 1000 }; scene.overdriveModState = { activeModId: "cooldownReactor" };
  assert.deepEqual([scene.getUmbraMoonlightRehitIntervalMs(), scene.getUmbraBloodSpikeIntervalMs(), scene.getUmbraPhantomNovaIntervalMs(), scene.getUmbraPhantomNovaIntervalMs("deployed")], intervals);
});

test("invalid index, forged Stage, missing ownership, closed or replaced Context cannot fall back to S1", () => {
  const invalidators = [
    scene => { delete scene.playerSkills[MOON]; },
    scene => { scene.playerSkills[MOON].stageIndex = -1; },
    scene => { scene.playerSkills[MOON].stageIndex = 8; },
    scene => { scene.playerSkills[MOON].stageIndex = 1.5; },
    scene => { scene.playerSkills[MOON].currentStage = { ...scene.playerSkills[MOON].currentStage }; },
    scene => { scene.playerSkills[MOON].verificationOnly = false; },
    scene => { scene.playerSkills[MOON].umbraGrowthRun = {}; },
    scene => { scene.playerSkills[MOON].definition = { ...scene.playerSkills[MOON].definition }; },
    scene => { scene.umbraGrowthRun.closed = true; },
    scene => { scene.verificationContext = { ...scene.verificationContext }; },
    scene => { scene.umbraGrowthRun.world = {}; },
    scene => { scene.playerHitbox = { ...scene.playerHitbox }; },
    scene => { scene.gameOver = true; }
  ];
  for (const invalidate of invalidators) {
    const { scene } = fixture(); invalidate(scene);
    assert.equal(scene.getUmbraActiveSkillStage(MOON), null);
    assert.equal(scene.getUmbraMoonlightEffectiveStats(), null);
    assert.equal(scene.getUmbraMoonlightRawDamage(), 0);
    assert.equal(scene.getUmbraMoonlightRehitIntervalMs(), Infinity);
    const choice = scene.buildUmbraSkillGrowthChoice(MOON);
    if (!scene.playerSkills[MOON] && scene.isUmbraGrowthContextActive()) assert.equal(choice?.actionType, "unlock");
    else assert.equal(Boolean(choice), false);
  }
  const { scene, api } = fixture();
  assert.equal(scene.getUmbraMoonlightEffectiveStats({ ...api.skills[MOON].stages[7] }), null);
  assert.equal(scene.getUmbraMoonlightEffectiveStats(api.skills[SPIKE].stages[7]), null);
  assert.equal(scene.getUmbraSkillStatsConfig("basicSkill", api.skills.basicSkill.stages[0]), null);
});

test("every range-only and radius-only upgrade has truthful chips; Fire floor does not invent a shortening", () => {
  const { scene, api } = fixture();
  for (const id of ids) for (let number = 1; number < 8; number++) {
    selectStage(scene, api, id, number);
    const choice = scene.buildSkillChoice(id), model = scene.buildLevelUpCardModel(choice, 0);
    assert.equal(choice.actionType, "upgrade"); assert.equal(choice.nextStage, api.skills[id].stages[number]);
    assert.ok(model.chips.length > 0); assert.equal(model.stageProgress.length, 8);
    assert.deepEqual(plain(model.newEffects), []); assert.doesNotMatch(model.description, /ASSAULT|CONTROL|REACTOR CORE|NEW EFFECT/);
    if (id === SPIKE) assert.match(model.description, /単体威力・周期は固定/);
    if (id === NOVA && [1, 2, 5, 6].includes(number)) assert.match(model.chips.map(chip => chip.label).join(" / "), /射程 \+10px/);
    if (id === NOVA && [3, 7].includes(number)) {
      assert.match(model.chips[0].label, /保有枠 \+1/); assert.match(model.description, /待って初回放電/);
      assert.match(model.description, /配置時のまま/);
    }
  }
  scene.stats.fireInterval = 160;
  for (const number of [3, 5, 6, 7]) {
    selectStage(scene, api, MOON, number);
    const model = scene.buildLevelUpCardModel(scene.buildSkillChoice(MOON), 0);
    assert.doesNotMatch(model.chips.map(chip => chip.label).join(" / "), /再命中/);
    assert.match(model.description, /離脱外縁/);
  }
});

test("Unlock is S1 only, S8 has no candidate, and old S1 entrance still has no growth cards", () => {
  const { scene, api } = fixture({ acquired: [MOON] });
  for (const id of [SPIKE, NOVA]) {
    const choice = scene.buildSkillChoice(id), model = scene.buildLevelUpCardModel(choice, 0);
    assert.equal(choice.actionType, "unlock"); assert.equal(choice.currentStage, null); assert.equal(choice.nextStage, api.skills[id].verificationStage1);
    assert.equal(model.typeLabel, "NEW SKILL"); assert.equal(model.stageProgress, "●○○○○○○○");
  }
  selectStage(scene, api, MOON, 8);
  assert.equal(scene.buildSkillChoice(MOON), null); assert.equal(scene.getUmbraMoonlightEffectiveStats().stage, 8);
  const legacy = fixture({ growth: false });
  assert.deepEqual(plain(legacy.scene.getAvailableSkillChoices({ mechId: "umbraSeraph" })), []);
});

test("Reactor/Fire cards read acquired latest Stages and change their common stat once", () => {
  const { scene, api } = fixture({ fixtureId: "medium" });
  for (const id of ids) selectStage(scene, api, id, 8);
  const choices = scene.getPassiveUpgradeChoices(), reactor = choices.find(choice => choice.id === "overchargeBolt"), fire = choices.find(choice => choice.id === "rapidSigil");
  const before = { bullet: scene.stats.bulletDamage, fire: scene.stats.fireInterval };
  assert.match(reactor.description, /MOONLIGHT/); assert.match(reactor.description, /BLOOD SPIKE/); assert.match(reactor.description, /NOVA 周回/); assert.match(reactor.description, /NOVA 残留/);
  reactor.onSelect(); fire.onSelect();
  assert.equal(scene.stats.bulletDamage, before.bullet + 1); assert.equal(scene.stats.fireInterval, before.fire - 70);
  assert.equal(scene.getUmbraMoonlightRawDamage(), 13); assert.equal(scene.getUmbraBloodSpikeRawDamage(), 6);
  assert.equal(scene.getUmbraPhantomNovaRawDamage(), 4); assert.equal(scene.getUmbraPhantomNovaRawDamage("deployed"), 4);
  scene.stats.fireInterval = 160;
  assert.equal(scene.getPassiveUpgradeChoices().find(choice => choice.id === "rapidSigil"), undefined);
});

test("query repetition changes no owner, runtime, deferred milestone, passive level or Evasive presentation", () => {
  const { scene, api, calls } = fixture();
  scene.umbraMoonlightRuntime = { combatTimeMs: 10, targets: new Map([["life", { lastHitAtMs: 5, passId: 4 }]]) };
  scene.umbraBloodSpikeRuntime = { combatTimeMs: 10, casts: [{ radius: 80, nextAt: 99 }], nextCastAtMs: 1800 };
  scene.umbraPhantomNovaRuntime = { combatTimeMs: 10, reservation: { slotId: 1 }, slots: [{ slotId: 1, phaseOffset: 0, nextPulseAtMs: 900 }] };
  const refs = ids.map(id => scene.playerSkills[id]);
  const before = JSON.stringify([scene.umbraMoonlightRuntime, scene.umbraBloodSpikeRuntime, scene.umbraPhantomNovaRuntime,
    scene.umbraGrowthRun.deferredMilestones, scene.passiveLevels, scene.levelUpCandidatePresentationState]);
  const history = scene.umbraMoonlightRuntime.targets.get("life");
  for (let count = 0; count < 30; count++) {
    for (const id of ids) {
      scene[statMethods[id]](); scene.buildSkillChoice(id); scene.buildUmbraSkillGrowthCard(id, api.skills[id].stages[0], api.skills[id].stages[7]);
    }
    scene.getAvailableSkillChoices(); scene.getPassiveUpgradeChoices();
  }
  assert.equal(JSON.stringify([scene.umbraMoonlightRuntime, scene.umbraBloodSpikeRuntime, scene.umbraPhantomNovaRuntime,
    scene.umbraGrowthRun.deferredMilestones, scene.passiveLevels, scene.levelUpCandidatePresentationState]), before);
  assert.equal(scene.umbraMoonlightRuntime.targets.get("life"), history);
  ids.forEach((id, index) => assert.equal(scene.playerSkills[id], refs[index]));
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("a growth choice callback is one-shot and rejects a changed Stage or replaced run before dispatch", () => {
  // Dispatch counters isolate the candidate closure guard; actual progression
  // and selectLevelUpCard animation/overlay behavior are tested separately.
  const { scene, api } = fixture({ acquired: [MOON] });
  let upgrades = 0, unlocks = 0;
  scene.upgradeSkill = () => { upgrades++; }; scene.unlockSkill = () => { unlocks++; };
  const upgrade = scene.buildSkillChoice(MOON), unlock = scene.buildSkillChoice(SPIKE);
  upgrade.onSelect(); upgrade.onSelect(); unlock.onSelect(); unlock.onSelect();
  assert.equal(upgrades, 1); assert.equal(unlocks, 1);
  const staleStage = scene.buildSkillChoice(MOON); selectStage(scene, api, MOON, 2); staleStage.onSelect(); assert.equal(upgrades, 1);
  const staleRun = scene.buildSkillChoice(NOVA); scene.umbraGrowthRun = { ...scene.umbraGrowthRun, generation: 2 }; staleRun.onSelect(); assert.equal(unlocks, 1);
});

function progressionFixture(depth = 6, options = {}) {
  const f = fixture({ ...options, acquired: [] }), s = f.scene;
  const world = s.physics.world = new EventEmitter();
  world.bounds = { x: 0, y: 0, width: 2000, height: 2000 }; world.bodies = { contains: body => body.world === world };
  Object.assign(s.playerHitbox.body, { world, isCircle: true, width: 44, height: 44, halfWidth: 22, halfHeight: 22 });
  s.events = new EventEmitter(); s.game = { events: new EventEmitter() }; s.stageDepth = depth;
  s.enemies = { getChildren: () => [] }; s.walls = { getChildren: () => [] };
  const trace = { runGeneration: 1, depthGeneration: 1, basisGeneration: 1, order: 0, physicalStep: 0,
    boostSequence: 0, consumers: new Map() };
  s.ensureUmbraBoostTrace = () => s.umbraBoostTrace = trace;
  s.subscribeUmbraBoostTrace = (id, fn) => { trace.consumers.set(id, fn); return () => trace.consumers.delete(id); };
  // No physics ticks or enemies in this selection-budget fixture. Production
  // runtimes and Stage application are real; Trace transport and visual UI are RAM substitutes.
  s.updateHud = () => {}; s.updateDashStaminaGauge = () => {}; s.drawLevelUpCardBackground = () => {};
  s.hideOverlay = () => {}; s.resumeGameplayAfterBlockingOverlay = () => {}; s.tryOpenPendingPostOverlaySelections = () => {};
  s.showLevelUpChoices = () => { s.levelUpActive = true; };
  s.setLastPickupNotice = () => {}; s.spawnPlayerHealNumber = () => {}; s.showOverflowRewardText = () => {};
  const overflowInputs = []; s.addOverdriveFromXp = amount => { overflowInputs.push(amount); };
  // Deep's reward side effects are outside the budget calculation. Do not enter
  // equipment, TRIAD, save, cloud, or normal run UI from this synthetic fixture.
  s.queueDeepLevelEquipmentOverlimitBonus = () => {};
  s.getAnjuMemoryConsumableCount = () => 0;
  s.tweens = { killTweensOf() {}, add() {} };
  const timers = [];
  s.time.delayedCall = (ms, callback) => { const timer = { ms, callback, cancelled: false, remove() { this.cancelled = true; } }; timers.push(timer); return timer; };
  s.pendingLevelUps = 0; s.startingUpgradeSelectionsRemaining = 3; s.survivalTime = 0;
  s.runAnjuMemoryState = { openingBoostExtraChoiceActive: false, openingBoostExtraChoiceUsed: false };
  s.initializeSkillMutationState(); assert.ok(s.initializeUmbraGrowthRun());
  const choose = option => {
    assert.ok(option, "A real production candidate is required");
    s.levelUpOpeningBoostActive = s.isOpeningBoostDraftActive(); s.levelUpSelectionMode = "level";
    s.levelUpInputEnabled = true; s.levelUpSelectionLocked = false;
    // A selected candidate from the complete production pool is presented to
    // the real lock/animation/completion pipeline. This is not random-card luck evidence.
    s.levelUpCardRecords = [{ model: s.buildLevelUpCardModel(option, 0), container: {} }];
    s.selectLevelUpCard(0); s.selectLevelUpCard(0);
    assert.equal(timers.length, 1); const timer = timers.shift(); assert.equal(timer.ms, 360);
    assert.equal(s.levelUpSelectionLocked, true); timer.callback();
  };
  return { ...f, choose, overflowInputs };
}

test("23 production skill selections reach all S8 and six deferred milestones without rebuilding any runtime", () => {
  const f = progressionFixture(), s = f.scene;
  s.beginStartingUpgradeDraft(); assert.equal(s.pendingLevelUps, 3);
  const runtimeRefs = {}, choicesBySkill = {};
  for (let index = 0; index < 23; index++) {
    if (!s.pendingLevelUps) { s.survivalTime = 1; s.gainExperience(s.stats.nextLevelXp); }
    const option = s.getAvailableSkillChoices().find(candidate => ids.includes(candidate.skillId));
    const id = option.skillId; choicesBySkill[id] = (choicesBySkill[id] || 0) + 1;
    f.choose(option);
    const runtime = s[{ [MOON]: "umbraMoonlightRuntime", [SPIKE]: "umbraBloodSpikeRuntime", [NOVA]: "umbraPhantomNovaRuntime" }[id]];
    if (runtimeRefs[id]) assert.equal(runtime, runtimeRefs[id]); else runtimeRefs[id] = runtime;
  }
  assert.deepEqual(choicesBySkill, { [MOON]: 7, [SPIKE]: 8, [NOVA]: 8 });
  for (const id of ids) assert.equal(s.getUmbraActiveSkillStage(id).stage, 8);
  assert.equal(s.umbraPhantomNovaRuntime.slots.length, 3);
  assert.equal(s.umbraGrowthRun.deferredMilestones.length, 6);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones.map(entry => [entry.skillId, entry.phase, entry.order])),
    [[MOON, "core", 1], [MOON, "final", 2], [SPIKE, "core", 3], [SPIKE, "final", 4], [NOVA, "core", 5], [NOVA, "final", 6]]);
  assert.deepEqual(plain(s.skillMutationState.pendingQueue), []); assert.deepEqual(plain(s.skillMutationState.entries), {});
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});

for (const passiveCount of [4, 5]) test(`Opening3 + Lv1→25 gives 27 choices: ${passiveCount} passives leave ${27 - passiveCount} skill selections`, () => {
  const f = progressionFixture(), s = f.scene;
  // These are choices, never the old medium/deep fixture's pre-granted passives.
  s.beginStartingUpgradeDraft(); let selected = 0, selectedSkills = 0, selectedPassives = 0;
  const passivePlan = ["evasiveFirmware", "evasiveFirmware", "evasiveFirmware", "vitalBloom", "staminaCore"].slice(0, passiveCount);
  while (selected < 27) {
    if (!s.pendingLevelUps) { s.survivalTime = 1; s.gainExperience(s.stats.nextLevelXp); }
    let option;
    if (s.isOpeningBoostDraftActive() || selectedPassives >= passiveCount) {
      option = s.getAvailableSkillChoices()[0]; selectedSkills++;
    } else {
      option = s.getPassiveUpgradeChoices({ openingBoost: false }).find(candidate => candidate.id === passivePlan[selectedPassives]); selectedPassives++;
    }
    f.choose(option); selected++;
  }
  assert.equal(s.stats.level, 25); assert.equal(s.pendingLevelUps, 0); assert.equal(s.startingUpgradeSelectionsRemaining, 0);
  assert.equal(selectedSkills, 27 - passiveCount); assert.equal(selectedPassives, passiveCount);
  const remaining = ids.reduce((sum, id) => sum + 8 - (s.getUmbraActiveSkillStage(id)?.stage || 0), 0);
  assert.equal(remaining, passiveCount === 4 ? 0 : 1);
  const beforeStages = ids.map(id => s.getUmbraActiveSkillStage(id)?.stage || 0);
  s.gainExperience(s.stats.nextLevelXp); assert.equal(s.stats.level, 26); assert.equal(s.pendingLevelUps, 0);
  assert.deepEqual(ids.map(id => s.getUmbraActiveSkillStage(id)?.stage || 0), beforeStages);
  assert.deepEqual(plain(s.skillMutationState.pendingQueue), []);
});

test("Opening +1 Ticket changes the first candidate count to four, never the three acquisition grants", () => {
  const f = progressionFixture(), s = f.scene;
  s.runAnjuMemoryState.openingBoostExtraChoiceActive = true;
  assert.equal(s.getOpeningBoostChoiceLimit(true), 4);
  assert.equal(s.buildLevelUpUpgradeChoices({ openingBoost: true }).length, 4);
  assert.ok(s.buildLevelUpUpgradeChoices({ openingBoost: true }).filter(choice => choice.type === "skill").length <= 2);
  assert.ok(!s.buildLevelUpUpgradeChoices({ openingBoost: true }).some(choice => choice.id === "evasiveFirmware"));
  s.beginStartingUpgradeDraft(); assert.equal(s.pendingLevelUps, 3);
  f.choose(s.getAvailableSkillChoices()[0]);
  assert.equal(s.pendingLevelUps, 2); assert.equal(s.startingUpgradeSelectionsRemaining, 2);
  assert.equal(s.runAnjuMemoryState.openingBoostExtraChoiceActive, false);
  assert.equal(s.getOpeningBoostChoiceLimit(true), 3);
});

for (const depth of [1, 5, 6, 10, 20, 30]) test(`RAM Depth${depth} start: Lv25 final pending survives subsequent ${depth >= 6 ? "Deep" : "normal"} XP`, () => {
  const f = progressionFixture(depth), s = f.scene;
  assert.equal(s.stats.level, 1); assert.equal(s.getUmbraActiveSkillStage(MOON).stage, 1);
  assert.equal(s.getUmbraActiveSkillStage(SPIKE), null); assert.equal(s.getUmbraActiveSkillStage(NOVA), null);
  assert.deepEqual(plain(s.passiveLevels), {});
  s.beginStartingUpgradeDraft(); while (s.pendingLevelUps) f.choose(s.getAvailableSkillChoices()[0]);
  s.survivalTime = 1;
  let xpTotal = 0;
  for (let level = 2; level <= 25; level++) { const xp = s.stats.nextLevelXp; xpTotal += xp; s.gainExperience(xp); }
  assert.equal(xpTotal, 72996); assert.equal(s.stats.level, 25); assert.equal(s.pendingLevelUps, 24);
  const deferredBefore = plain(s.umbraGrowthRun.deferredMilestones);
  s.gainExperience(s.stats.nextLevelXp);
  assert.equal(s.stats.level, 26); assert.equal(s.pendingLevelUps, depth >= 6 ? 24 : 25);
  assert.deepEqual(plain(s.umbraGrowthRun.deferredMilestones), deferredBefore);
  assert.equal(s.startingUpgradeSelectionsRemaining, 0);
  assert.equal(f.overflowInputs.length, depth >= 6 ? 1 : 0);
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});

test("Depth5→6 switches Lv25 to Deep without erasing the final unhandled normal card", () => {
  const f = progressionFixture(5), s = f.scene;
  s.pendingLevelUps = 0; s.startingUpgradeSelectionsRemaining = 0; s.survivalTime = 1;
  s.stats.level = 24; s.stats.xp = 0; s.stats.nextLevelXp = 22651;
  s.gainExperience(22651); assert.equal(s.stats.level, 25); assert.equal(s.pendingLevelUps, 1); assert.equal(s.stats.nextLevelXp, 32843);
  s.stageDepth = 6; s.syncPlayerLevelXpRequirement(); assert.equal(s.stats.nextLevelXp, 420);
  s.gainExperience(420); assert.equal(s.stats.level, 26); assert.equal(s.pendingLevelUps, 1);
  f.choose(s.getAvailableSkillChoices()[0]); assert.equal(s.pendingLevelUps, 0);
  assert.deepEqual(plain(s.skillMutationState.pendingQueue), []);
});
