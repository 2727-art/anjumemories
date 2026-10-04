"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

function fixture({ mechId = "umbraSeraph", phase4 = true, weapons = ["umbraBloodSpike"],
  weapon = 0, cdIds = ["anju"], traceNotifications = true } = {}) {
  const calls = { storage: 0, network: 0 };
  const forbiddenStorage = () => { calls.storage++; assert.fail("Storage must not be accessed"); };
  const forbiddenNetwork = () => { calls.network++; assert.fail("Network must not be accessed"); };
  const window = { location: { search: "" }, fetch: forbiddenNetwork };
  Object.defineProperties(window, {
    localStorage: { get: forbiddenStorage }, sessionStorage: { get: forbiddenStorage },
    firebase: { get: forbiddenNetwork }
  });
  const context = vm.createContext({ window, console, URLSearchParams, fetch: forbiddenNetwork,
    XMLHttpRequest: forbiddenNetwork, WebSocket: forbiddenNetwork,
    Phaser: { Scene: class {}, Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) },
      Utils: { Array: { Shuffle: values => values } } }
  });
  vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
  const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const laterDeclarationsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
  assert.ok(declarationsEnd > 0 && laterDeclarationsStart > declarationsEnd && classEnd > laterDeclarationsStart);
  vm.runInContext(source.slice(0, declarationsEnd) + "\n" + source.slice(laterDeclarationsStart, classEnd)
    + "\nthis.api = { Scene: SurvivalScene, skills: SKILL_DEFINITIONS, mechs: PLAYER_MECH_DEFINITIONS, cds: CD_CATALOG };", context);
  const scene = Object.create(context.api.Scene.prototype);
  scene.isUmbraPhase2ADrive = true;
  scene.sys = { settings: { key: "UmbraPhase2ADrive" } };
  scene.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId,
    moonlightArena: phase4, bloodSpikeArena: phase4, traceNotifications });
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
  scene.applyPermanentUpgradesToStats(); scene.applySelectedPlayerMechStatProfile();
  scene.passiveLevels = {};
  scene.playerSkills = Object.fromEntries(weapons.map(id => [id, {
    id, definition: context.api.skills[id], stageIndex: 0,
    currentStage: context.api.skills[id].verificationStage1, verificationOnly: true
  }]));
  scene.moonlightAttackEnabled = true; scene.bloodSpikeAttackEnabled = true;
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0; scene.levelUpOpeningBoostActive = false;
  scene.survivalTime = 1; scene.time = { now: 10000, delayedCall() {} };
  scene.resetLevelUpCandidatePresentationState();
  return { scene, api: context.api, calls };
}

const passive = (scene, id) => scene.getPassiveUpgradeChoices({ openingBoost: false }).find(choice => choice.id === id);
const effectiveIds = scene => plain(scene.getUmbraVerificationPassiveWeapons()?.map(weapon => weapon.id) ?? null);

test("BLOOD SPIKE provisional metadata is immutable and remains outside public Stage growth", () => {
  const { scene, api } = fixture();
  const config = scene.getUmbraBloodSpikeStage1Config();
  assert.deepEqual(plain(config), {
    stage: 1, behavior: "umbraBloodSpike", damage: 5, searchRange: 600, impactRadius: 80,
    intervalBaseMs: 1800, intervalMinMs: 500, fireIntervalBaseMs: 540, fireIntervalFloorMs: 160,
    searchRetryMs: 150, maxActiveCasts: 3, frameCount: 8, frameRate: 10,
    impactFrameIndex: 2, impactOffsetMs: 200, lifetimeMs: 800
  });
  assert.ok(Object.isFrozen(config));
  assert.equal(config.impactOffsetMs, config.impactFrameIndex * 1000 / config.frameRate);
  assert.equal(config.lifetimeMs, config.frameCount * 1000 / config.frameRate);
  for (const id of ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]) {
    assert.equal(api.skills[id].previewOnly, true);
    assert.equal(api.skills[id].startsUnlocked, false);
    assert.equal(api.skills[id].behavior, "displayOnly");
    assert.equal(api.skills[id].stages.length, 8);
    assert.equal(api.skills[id].stages[0], api.skills[id].verificationStage1);
  }
  assert.equal(api.skills.umbraPhantomNova.verificationStage1.behavior, "umbraPhantomNova");
  assert.equal(scene.getResolvedPlayerMechStartingSkillDefinition("umbraSeraph"), null);
  assert.deepEqual(plain(scene.getAvailableSkillChoices({ mechId: "umbraSeraph" })), []);
});

test("raw SPIKE damage adds only the Reactor portion and is finite under invalid stats", () => {
  const { scene } = fixture({ weapon: 25, cdIds: ["anju", "nandeyanen", "kotokoto"] });
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  for (const [bullet, expected] of [[1, 5], [2, 6], [11, 15], [0, 5], [-5, 5], [NaN, 5], [Infinity, 5]]) {
    scene.stats.bulletDamage = bullet;
    assert.equal(scene.getUmbraBloodSpikeRawDamage(), expected);
  }
});

test("existing production HP reception applies permanent/CD/OVERDRIVE/target modifiers once", () => {
  for (const [weapon, cdIds, expected, reactor] of [
    [0, ["anju"], 5, 6], [10, ["anju", "miraiwoikiteru"], 8, 9.6],
    [25, ["anju", "nandeyanen", "kotokoto", "miraiwoikiteru"], 13.3, 15.96]
  ]) {
    const { scene, calls } = fixture({ weapon, cdIds });
    const enemy = { active: true, isDying: false, hp: 10000, setTint() {} };
    scene.spawnEnemyDamageNumber = () => {}; scene.playEnemyHitReaction = () => {};
    scene.killEnemy = () => assert.fail("This calculation test is deliberately nonlethal");
    const beforeStats = plain(scene.stats);
    scene.applyDamageToEnemy(enemy, scene.getUmbraBloodSpikeRawDamage(), 0xffdddd, null);
    near(10000 - enemy.hp, expected);
    near(scene.getUmbraBloodSpikeEffectiveStats().damageBeforeTargetModifiers, expected);
    assert.deepEqual(plain(scene.stats), beforeStats);
    const choice = passive(scene, "overchargeBolt");
    assert.match(choice.cardDescription, /BLOOD SPIKE/); assert.doesNotMatch(choice.cardDescription, /MOON|雷撃|電撃/);
    choice.onSelect();
    const beforeHp = enemy.hp;
    scene.applyDamageToEnemy(enemy, scene.getUmbraBloodSpikeRawDamage(), 0xffdddd, null);
    near(beforeHp - enemy.hp, reactor);
    scene.overflowRewardState = { overdriveRemainingMs: 1000 };
    scene.overdriveModState = { activeModId: "hunterMode" };
    enemy.isBoss = true; enemy.lostArmsVulnerableUntil = 11000; enemy.lostArmsVulnerableMult = 1.1;
    const beforeModifiers = enemy.hp;
    scene.applyDamageToEnemy(enemy, scene.getUmbraBloodSpikeRawDamage(), 0xffdddd, null);
    near(beforeModifiers - enemy.hp, reactor * 1.15 * 1.1 * 1.25);
    near(scene.getUmbraBloodSpikeEffectiveStats().damageBeforeTargetModifiers, reactor * 1.15);
    assert.deepEqual(calls, { storage: 0, network: 0 });
  }
});

test("Fire Control maps 540 to 160 onto 1800 to 500 without changing cast timing metadata", () => {
  const { scene } = fixture();
  const expected = [1800, 1561, 1321, 1082, 842, 603, 500];
  const fire = [540, 470, 400, 330, 260, 190, 160];
  const immutableTiming = plain(scene.getUmbraBloodSpikeStage1Config());
  for (let index = 0; index < expected.length; index++) {
    assert.equal(scene.stats.fireInterval, fire[index]);
    assert.equal(scene.getUmbraBloodSpikeIntervalMs(), expected[index]);
    const choice = passive(scene, "rapidSigil");
    if (index === expected.length - 1) { assert.equal(choice, undefined); break; }
    assert.equal(choice.bloodSpikeIntervalReductionMs, expected[index] - expected[index + 1]);
    const card = scene.buildLevelUpCardModel(choice, 0);
    assert.equal(card.chips[0].label, `発動 -${expected[index] - expected[index + 1]}ms`);
    assert.match(card.description, /下限 500ms/); assert.match(card.description, /突き上げ・再生速度は不変/);
    assert.doesNotMatch(card.description, /MOON|再命中|放電/);
    const before = plain(scene.stats); choice.onSelect();
    assert.deepEqual(plain(scene.stats), { ...before, fireInterval: fire[index + 1] });
    assert.deepEqual(plain(scene.getUmbraBloodSpikeStage1Config()), immutableTiming);
    const effective = scene.getUmbraBloodSpikeEffectiveStats();
    assert.deepEqual([effective.searchRange, effective.impactRadius, effective.searchRetryMs, effective.maxActiveCasts,
      effective.frameRate, effective.impactOffsetMs, effective.lifetimeMs], [600, 80, 150, 3, 10, 200, 800]);
  }
  assert.equal(scene.passiveLevels.rapidSigil, 6);
});

test("CD normalization, monotonic intervals, finite clamping and OVERDRIVE speed remain separate", () => {
  for (const [cdIds, interval, expected] of [
    [["anju"], 540, 1800], [["anju", "miraiwoikiteru"], 513, 1708],
    [["anju", "miraiwoikiteru", "nandeyanen"], 482, 1602]
  ]) {
    const { scene } = fixture({ cdIds });
    assert.equal(scene.stats.fireInterval, interval); assert.equal(scene.getUmbraBloodSpikeIntervalMs(), expected);
    scene.overflowRewardState = { overdriveRemainingMs: 1000 };
    scene.overdriveModState = { activeModId: "cooldownReactor" };
    assert.equal(scene.getUmbraBloodSpikeIntervalMs(), expected);
  }
  const { scene } = fixture();
  let previous = -Infinity;
  for (let interval = 0; interval <= 800; interval += 0.25) {
    const value = scene.getUmbraBloodSpikeIntervalMs(interval);
    assert.ok(value >= previous && value >= 500 && value <= 1800); previous = value;
  }
  for (const [interval, expected] of [[-100, 500], [120, 500], [160.1, 500], [160.2, 501], [NaN, 1800], [Infinity, 1800], [undefined, 1800]]) {
    assert.equal(scene.getUmbraBloodSpikeIntervalMs(interval), expected);
  }
});

test("four acquired weapon configurations display only effective changes and apply each passive once", () => {
  for (const weapons of [[], ["umbraMoonlight"], ["umbraBloodSpike"], ["umbraMoonlight", "umbraBloodSpike"]]) {
    const { scene } = fixture({ weapons, weapon: 10 });
    assert.deepEqual(effectiveIds(scene), weapons);
    for (const id of ["overchargeBolt", "rapidSigil"]) {
      const choice = passive(scene, id);
      if (!weapons.length) { assert.equal(choice, undefined); continue; }
      const description = scene.buildLevelUpCardModel(choice, 0).description;
      for (const [weaponId, label] of [["umbraMoonlight", "MOONLIGHT"], ["umbraBloodSpike", "BLOOD SPIKE"]]) {
        assert.equal(description.includes(label), weapons.includes(weaponId));
        assert.equal(choice.description.includes(label), weapons.includes(weaponId));
      }
      assert.doesNotMatch(description, /雷撃|電撃|放電/);
      const before = plain(scene.stats); choice.onSelect();
      assert.deepEqual(plain(scene.stats), { ...before, [id === "overchargeBolt" ? "bulletDamage" : "fireInterval"]:
        id === "overchargeBolt" ? before.bulletDamage + 1 : before.fireInterval - 70 });
      assert.equal(scene.passiveLevels[id], 1);
    }
  }
});

test("weapon flags, actual Stage identity and notification OFF govern effective weapon membership", () => {
  const { scene, api } = fixture({ weapons: ["umbraMoonlight", "umbraBloodSpike"] });
  scene.moonlightAttackEnabled = false;
  assert.deepEqual(effectiveIds(scene), ["umbraBloodSpike"]);
  scene.moonlightAttackEnabled = true; scene.bloodSpikeAttackEnabled = false;
  assert.deepEqual(effectiveIds(scene), ["umbraMoonlight"]);
  scene.bloodSpikeAttackEnabled = true;
  scene.verificationContext = Object.freeze({ ...scene.verificationContext, traceNotifications: false });
  assert.deepEqual(effectiveIds(scene), ["umbraBloodSpike"]);
  scene.playerSkills.umbraBloodSpike.currentStage = { ...api.skills.umbraBloodSpike.verificationStage1 };
  assert.deepEqual(effectiveIds(scene), [], "cloned or unsupported Stage metadata is not acquired verification S1");
  scene.playerSkills.umbraBloodSpike.currentStage = api.skills.umbraBloodSpike.verificationStage1;
  scene.playerSkills.umbraBloodSpike.verificationOnly = false;
  assert.deepEqual(effectiveIds(scene), []);
});

test("candidate pause, hidden state and empty EN never remove otherwise effective attack passives", () => {
  const { scene } = fixture({ weapons: ["umbraMoonlight", "umbraBloodSpike"] });
  const before = scene.getPassiveUpgradeChoices().map(choice => [choice.id, choice.description, choice.chipLabel]);
  scene.drivePaused = true; scene.driveHidden = true; scene.selectionObjects = [{}];
  scene.stats.stamina = 0; scene.acMovementState = { fullOverheat: true };
  scene.getUmbraMoonlightBlockReason = scene.getUmbraBloodSpikeBlockReason = () => "PAUSED";
  assert.deepEqual(scene.getPassiveUpgradeChoices().map(choice => [choice.id, choice.description, choice.chipLabel]), before);
  passive(scene, "rapidSigil").onSelect();
  assert.equal(scene.stats.fireInterval, 470); assert.equal(scene.stats.stamina, 0);
});

test("one weapon's rounded zero delta does not hide the other weapon's effective candidate", () => {
  const { scene } = fixture({ weapons: ["umbraMoonlight", "umbraBloodSpike"] });
  scene.stats.fireInterval = 160.2;
  const choice = passive(scene, "rapidSigil");
  assert.equal(choice.moonlightRehitReductionMs, 0); assert.equal(choice.bloodSpikeIntervalReductionMs, 1);
  assert.match(choice.description, /BLOOD SPIKE/); assert.doesNotMatch(choice.description, /MOONLIGHT/);
  assert.equal(choice.chipLabel, "発動 -1ms");
  for (const value of [160, 160.1, 1000]) { scene.stats.fireInterval = value; assert.equal(passive(scene, "rapidSigil"), undefined); }
  scene.stats.fireInterval = 540; scene.passiveLevels.rapidSigil = 10;
  assert.equal(passive(scene, "rapidSigil"), undefined);
  scene.passiveLevels.overchargeBolt = 10; assert.equal(passive(scene, "overchargeBolt"), undefined);
  scene.passiveLevels.overchargeBolt = 0; scene.stats.bulletDamage = 0;
  assert.equal(passive(scene, "overchargeBolt"), undefined, "a clamped raw value has no immediate Reactor gain");
});

test("standard, REGALIA and earlier trace-only drive preserve their legacy candidate effects", () => {
  for (const options of [{ mechId: "defaultBear" }, { mechId: "regaliaBastion" }, { phase4: false, weapons: [] }]) {
    const { scene } = fixture(options);
    assert.equal(scene.getUmbraVerificationPassiveWeapons(), null);
    const reactor = passive(scene, "overchargeBolt"), fire = passive(scene, "rapidSigil");
    assert.equal(scene.buildLevelUpCardModel(reactor, 0).description, "雷撃ダメージ +1");
    assert.equal(scene.buildLevelUpCardModel(fire, 0).description, "放電間隔短縮");
    reactor.onSelect(); fire.onSelect(); assert.equal(scene.stats.bulletDamage, 2); assert.equal(scene.stats.fireInterval, 470);
    scene.stats.fireInterval = 160.1; assert.ok(passive(scene, "rapidSigil"));
  }
});

test("queries and passive application leave runtime reservations, clock and Evasive offer flag untouched", () => {
  const { scene, calls } = fixture({ weapons: ["umbraMoonlight", "umbraBloodSpike"] });
  scene.umbraBloodSpikeRuntime = { clock: 1000, nextCastAt: 1800, casts: [{ castId: 1, rawDamage: 5, impactAt: 1200 }] };
  scene.umbraMoonlightRuntime = { combatTimeMs: 1000, history: [{ lifeId: 1, lastHitAt: 900 }] };
  const blood = plain(scene.umbraBloodSpikeRuntime), moon = plain(scene.umbraMoonlightRuntime);
  for (let i = 0; i < 10; i++) {
    scene.getUmbraBloodSpikeEffectiveStats(); scene.getUmbraVerificationPassiveWeapons();
    scene.getPassiveUpgradeChoices({ openingBoost: false }); scene.getPassiveUpgradeChoices({ openingBoost: true });
  }
  passive(scene, "overchargeBolt").onSelect(); passive(scene, "rapidSigil").onSelect();
  assert.deepEqual(plain(scene.umbraBloodSpikeRuntime), blood);
  assert.deepEqual(plain(scene.umbraMoonlightRuntime), moon);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("Phase 6B Stage-aware MOONLIGHT calculations preserve Phase 4 S1 outputs", () => {
  const baseline = fs.readFileSync(path.join(root, ".tmp_umbra_phase4", "baseline", "game.js"), "utf8").replace(/\r\n/g, "\n");
  const current = source.replace(/\r\n/g, "\n");
  const body = (text, name) => {
    const start = text.indexOf(`\n  ${name}(`); assert.ok(start >= 0, name);
    const end = text.indexOf("\n  }", start); assert.ok(end > start, name);
    return text.slice(start, end + 4);
  };
  const names = ["getUmbraMoonlightStage1Config", "getUmbraMoonlightRawDamage", "getUmbraMoonlightRehitIntervalMs", "getUmbraMoonlightEffectiveStats"];
  assert.equal(body(current, names[0]), body(baseline, names[0]));
  const { scene, api } = fixture({ weapons: ["umbraMoonlight"] });
  const legacy = Object.assign(Object.create(scene), vm.runInNewContext(`({${names.map(name => body(baseline, name)).join(",")}})`, {
    SKILL_DEFINITIONS: api.skills, UMBRA_MOONLIGHT_SKILL_ID: "umbraMoonlight",
    Phaser: { Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) } }
  }));
  for (const bullet of [0, 1, 4, 11, NaN]) for (const fire of [540, 513, 482, 400, 190, 160, 159, NaN]) {
    scene.stats.bulletDamage = bullet; scene.stats.fireInterval = fire;
    for (const name of names) assert.deepEqual(plain(scene[name]()), plain(legacy[name]()), `${name}/${bullet}/${fire}`);
  }
});
