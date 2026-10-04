"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

function fixture({ mechId = "umbraSeraph", enabled = true, weapon = 0, cdIds = ["anju"] } = {}) {
  const calls = { storage: 0, network: 0 };
  const forbiddenStorage = () => { calls.storage += 1; assert.fail("Storage must not be accessed"); };
  const forbiddenNetwork = () => { calls.network += 1; assert.fail("Network must not be accessed"); };
  const window = { location: { search: "" }, fetch: forbiddenNetwork };
  Object.defineProperties(window, {
    localStorage: { get: forbiddenStorage }, sessionStorage: { get: forbiddenStorage },
    firebase: { get: forbiddenNetwork }
  });
  const context = vm.createContext({
    window, console, URLSearchParams, fetch: forbiddenNetwork, XMLHttpRequest: forbiddenNetwork,
    WebSocket: forbiddenNetwork,
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
  scene.isUmbraPhase2ADrive = true;
  scene.sys = { settings: { key: "UmbraPhase2ADrive" } };
  scene.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId });
  // The parent-owned combat gate is an explicit input to this calculation test.
  // Its URL, lifecycle and access checks are exercised by the combat/browser suite.
  scene.isUmbraMoonlightVerificationEnabled = () => enabled && mechId === "umbraSeraph";
  scene.getUrlStageParam = () => null;
  scene.getDebugPlayerMechIdOverride = () => null;
  scene.getSelectedPlayerMechDefinition = () => context.api.mechs[mechId];
  scene.getSelectedPlayerMechId = () => mechId;
  scene.getOwnedCdDefinitions = () => context.api.cds.filter(cd => cdIds.includes(cd.id));
  scene.isFinalBossRaidActive = () => false;
  scene.shouldUseAcEvasionPassive = () => true;
  scene.getActiveAcMovementTuning = () => ({});
  scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
  scene.getRunEquipmentCombatLinkState = () => ({ snapshotCaptured: false });
  scene.getRunEquipmentSkillOverlimitCap = () => 0;
  scene.getRunPlayerMechStatProfile = () => scene.normalizePlayerMechStatProfile(context.api.mechs[mechId].statProfile);
  scene.shopState = { upgrades: { weapon, armor: 0, shoes: 0 } };
  scene.stats = scene.createBasePlayerStats();
  scene.applyPermanentUpgradesToStats();
  scene.applySelectedPlayerMechStatProfile();
  scene.passiveLevels = {};
  scene.playerSkills = enabled && mechId === "umbraSeraph" ? {
    umbraMoonlight: { verificationOnly: true, currentStage: context.api.skills.umbraMoonlight.verificationStage1 }
  } : {};
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0;
  scene.levelUpOpeningBoostActive = false;
  scene.survivalTime = 1;
  scene.time = { now: 10000, delayedCall() {} };
  scene.resetLevelUpCandidatePresentationState();
  return { scene, api: context.api, calls };
}

const passive = (scene, id) => scene.getPassiveUpgradeChoices({ openingBoost: false }).find(c => c.id === id);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test("provisional Stage 1 has a separate immutable record and no ordinary playable stages", () => {
  const { scene, api } = fixture();
  const config = scene.getUmbraMoonlightStage1Config();
  assert.deepEqual(plain(config), {
    stage: 1, behavior: "umbraMoonlight", damage: 4, passageRadius: 60, leaveMargin: 12,
    rehitBaseMs: 750, rehitMinMs: 200, fireIntervalBaseMs: 540, fireIntervalFloorMs: 160, maxImpactFx: 12
  });
  assert.ok(Object.isFrozen(config));
  for (const id of ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]) {
    assert.equal(api.skills[id].previewOnly, true);
    assert.equal(api.skills[id].startsUnlocked, false);
    assert.equal(api.skills[id].stages.length, 8);
    assert.equal(api.skills[id].stages[0], api.skills[id].verificationStage1);
    assert.equal(api.skills[id].behavior, "displayOnly");
  }
  assert.equal(api.skills.umbraBloodSpike.verificationStage1?.behavior, "umbraBloodSpike");
  assert.equal(api.skills.umbraPhantomNova.verificationStage1.behavior, "umbraPhantomNova");
  assert.equal(scene.getResolvedPlayerMechStartingSkillDefinition("umbraSeraph"), null);
  assert.deepEqual(plain(scene.getAvailableSkillChoices({ mechId: "umbraSeraph" })), []);
});

test("raw damage adds Reactor once and carries no permanent, CD, mech or OVERDRIVE multiplier", () => {
  const { scene } = fixture({ weapon: 25, cdIds: ["anju", "nandeyanen", "kotokoto"] });
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  for (const [bullet, expected] of [[1, 4], [2, 5], [11, 14], [0, 4], [-5, 4], [NaN, 4], [Infinity, 4]]) {
    scene.stats.bulletDamage = bullet;
    assert.equal(scene.getUmbraMoonlightRawDamage(), expected);
  }
});

test("existing global scaling remains a single reception application", () => {
  for (const [weapon, cds, expected, withReactor] of [
    [0, ["anju"], 4, 5], [10, ["anju", "miraiwoikiteru"], 6.4, 8],
    [25, ["anju", "nandeyanen", "kotokoto", "miraiwoikiteru"], 10.64, 13.3]
  ]) {
    const { scene, calls } = fixture({ weapon, cdIds: cds });
    const enemy = { active: true, isDying: false, hp: 500, setTint() {} };
    const beforeStats = plain(scene.stats);
    // Presentation is omitted; the production HP reception and all its damage
    // multipliers run. The deliberately nonlethal target never enters kill.
    scene.spawnEnemyDamageNumber = () => {};
    scene.playEnemyHitReaction = () => {};
    scene.killEnemy = () => assert.fail("This reception test must remain nonlethal");
    scene.applyDamageToEnemy(enemy, scene.getUmbraMoonlightRawDamage());
    near(500 - enemy.hp, expected);
    near(scene.getUmbraMoonlightEffectiveStats().damageBeforeTargetModifiers, expected);
    assert.deepEqual(plain(scene.stats), beforeStats);
    passive(scene, "overchargeBolt").onSelect();
    const hp = enemy.hp;
    scene.applyDamageToEnemy(enemy, scene.getUmbraMoonlightRawDamage());
    near(hp - enemy.hp, withReactor);
    assert.deepEqual(calls, { storage: 0, network: 0 });
  }
});

test("enemy-specific vulnerable and HUNTER modifiers remain in the existing reception", () => {
  const { scene } = fixture();
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  scene.overdriveModState = { activeModId: "hunterMode" };
  const enemy = {
    active: true, isDying: false, isBoss: true, hp: 500,
    lostArmsVulnerableUntil: 11000, lostArmsVulnerableMult: 1.1, setTint() {}
  };
  scene.spawnEnemyDamageNumber = () => {};
  scene.playEnemyHitReaction = () => {};
  scene.applyDamageToEnemy(enemy, scene.getUmbraMoonlightRawDamage());
  near(500 - enemy.hp, 4 * 1.15 * 1.1 * 1.25);
  near(scene.getUmbraMoonlightEffectiveStats().damageBeforeTargetModifiers, 4 * 1.15);
});

test("effective display uses body-center radius plus leave margin, not extra player body radius", () => {
  const { scene } = fixture();
  assert.deepEqual(plain(scene.getUmbraMoonlightEffectiveStats()), {
    stage: 1, baseDamage: 4, reactorBonus: 0, rawDamage: 4, damageBeforeTargetModifiers: 4,
    rehitMs: 750, passageRadius: 60, exitRadius: 72, leaveMargin: 12, maxImpactFx: 12
  });
});

test("Fire Control follows existing 70ms reductions to the real 200ms rehit floor", () => {
  const { scene } = fixture();
  const expected = [750, 649, 547, 446, 345, 243, 200];
  const intervals = [540, 470, 400, 330, 260, 190, 160];
  for (let index = 0; index < expected.length; index += 1) {
    assert.equal(scene.stats.fireInterval, intervals[index]);
    assert.equal(scene.getUmbraMoonlightRehitIntervalMs(), expected[index]);
    const choice = passive(scene, "rapidSigil");
    if (index === expected.length - 1) { assert.equal(choice, undefined); break; }
    const card = scene.buildLevelUpCardModel(choice, 0);
    assert.equal(card.chips[0].label, `再命中 -${expected[index] - expected[index + 1]}ms`);
    assert.match(card.description, /離脱・再進入が必要/);
    assert.match(card.description, /下限 200ms/);
    const before = plain(scene.stats);
    choice.onSelect();
    assert.deepEqual(plain(scene.stats), { ...before, fireInterval: intervals[index + 1] });
  }
  assert.equal(scene.passiveLevels.rapidSigil, 6);
});

test("CD-adjusted fire interval changes rehit while OVERDRIVE speed never changes rehit or FX", () => {
  for (const [cdIds, expectedInterval, expectedRehit] of [
    [["anju"], 540, 750], [["anju", "miraiwoikiteru"], 513, 711],
    [["anju", "miraiwoikiteru", "nandeyanen"], 482, 666]
  ]) {
    const { scene } = fixture({ cdIds });
    assert.equal(scene.stats.fireInterval, expectedInterval);
    assert.equal(scene.getUmbraMoonlightRehitIntervalMs(), expectedRehit);
    scene.overflowRewardState = { overdriveRemainingMs: 1000 };
    scene.overdriveModState = { activeModId: "cooldownReactor" };
    assert.equal(scene.getUmbraMoonlightRehitIntervalMs(), expectedRehit);
    assert.equal(scene.getUmbraMoonlightEffectiveStats().maxImpactFx, 12);
  }
});

test("clamps, fractional rounding and ineffective candidates obey the same interval helper", () => {
  const { scene } = fixture();
  for (const [interval, expected] of [[0, 200], [120, 200], [160, 200], [160.1, 200], [540, 750], [800, 750], [NaN, 750], [undefined, 750]]) {
    assert.equal(scene.getUmbraMoonlightRehitIntervalMs(interval), expected);
  }
  scene.stats.fireInterval = 160.1;
  assert.equal(passive(scene, "rapidSigil"), undefined, "rounding has already reached the effective floor");
  scene.stats.fireInterval = 1000;
  assert.equal(passive(scene, "rapidSigil"), undefined, "no-effect reductions above the calibrated range are absent");
  scene.stats.fireInterval = 540;
  scene.passiveLevels.rapidSigil = 10;
  assert.equal(passive(scene, "rapidSigil"), undefined, "existing passive rank cap remains active");
});

test("Reactor card reports actual global-scaled gain, while only bulletDamage changes", () => {
  const { scene } = fixture({ weapon: 10 });
  const choice = passive(scene, "overchargeBolt");
  const card = scene.buildLevelUpCardModel(choice, 0);
  assert.equal(card.chips[0].label, "MOON +1.6");
  assert.match(card.description, /6\.4 → 8/);
  assert.match(card.description, /対象固有補正前/);
  const before = plain(scene.stats);
  choice.onSelect();
  assert.deepEqual(plain(scene.stats), { ...before, bulletDamage: 2 });
  assert.equal(scene.passiveLevels.overchargeBolt, 1);
  scene.passiveLevels.overchargeBolt = 10;
  assert.equal(passive(scene, "overchargeBolt"), undefined);
});

test("released mechs and attack-off drive preserve original passive effects and descriptions", () => {
  for (const options of [{ mechId: "defaultBear" }, { mechId: "regaliaBastion" }, { enabled: false }]) {
    const { scene } = fixture(options);
    const reactor = passive(scene, "overchargeBolt"), fire = passive(scene, "rapidSigil");
    assert.equal(scene.buildLevelUpCardModel(reactor, 0).description, "雷撃ダメージ +1");
    assert.equal(scene.buildLevelUpCardModel(reactor, 0).chips[0].label, "雷撃 +1");
    assert.equal(scene.buildLevelUpCardModel(fire, 0).description, "放電間隔短縮");
    assert.equal(scene.buildLevelUpCardModel(fire, 0).chips[0].label, "間隔短縮");
    reactor.onSelect(); fire.onSelect();
    assert.equal(scene.stats.bulletDamage, 2);
    assert.equal(scene.stats.fireInterval, 470);
    scene.stats.fireInterval = 160.1;
    assert.ok(passive(scene, "rapidSigil"), "legacy availability is not narrowed by MOONLIGHT rounding");
  }
});

test("queries and Opening Boost previews never consume Evasive presentation guarantee", () => {
  const { scene, calls } = fixture();
  for (let count = 0; count < 10; count += 1) {
    scene.getUmbraMoonlightEffectiveStats();
    scene.getPassiveUpgradeChoices({ openingBoost: false });
    scene.getPassiveUpgradeChoices({ openingBoost: true });
    assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  }
  assert.deepEqual(calls, { storage: 0, network: 0 });
});
