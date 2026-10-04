"use strict";

// VM tests of the production calculations and passive callbacks. No Phaser
// rendering, live browser, account, storage, or network is used by this file.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const MOON = "umbraMoonlight", SPIKE = "umbraBloodSpike", NOVA = "umbraPhantomNova";
const weaponIds = [MOON, SPIKE, NOVA];
const labels = { [MOON]: "MOONLIGHT", [SPIKE]: "BLOOD SPIKE", [NOVA]: "NOVA" };
const novaConfig = {
  stage: 1, behavior: NOVA, slotCount: 1, maxVerificationSlots: 3,
  orbitRadius: 80, orbitPeriodMs: 4000, orbitDamage: 2, orbitRange: 220,
  orbitIntervalBaseMs: 900, orbitIntervalMinMs: 300,
  deployedDamage: 3, deployedRange: 300, deployedIntervalBaseMs: 500, deployedIntervalMinMs: 200,
  deployedDurationMs: 3000, regenerationMs: 1200, deployIntervalMs: 800, minDeployDistance: 120,
  fireIntervalBaseMs: 540, fireIntervalFloorMs: 160, frameCount: 8, frameRate: 8
};

function fixture({ mechId = "umbraSeraph", phase5 = true, phase4 = true,
  weapons = [NOVA], weapon = 0, cdIds = ["anju"], traceNotifications = true } = {}) {
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
    moonlightArena: phase4, bloodSpikeArena: phase4, phantomNovaArena: phase5, traceNotifications });
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
  scene.moonlightAttackEnabled = true; scene.bloodSpikeAttackEnabled = true; scene.novaAttackEnabled = true;
  scene.acEvasionPassiveStartLevelApplied = true;
  scene.startingUpgradeSelectionsRemaining = 0; scene.levelUpOpeningBoostActive = false;
  scene.survivalTime = 1; scene.time = { now: 10000, delayedCall() {} };
  scene.resetLevelUpCandidatePresentationState();
  return { scene, api: context.api, calls };
}

const passive = (scene, id) => scene.getPassiveUpgradeChoices({ openingBoost: false }).find(choice => choice.id === id);
const effectiveIds = scene => plain(scene.getUmbraVerificationPassiveWeapons()?.map(weapon => weapon.id) ?? null);
function productionDamage(scene, rawDamage) {
  const enemy = { active: true, isDying: false, hp: 10000, setTint() {} };
  scene.spawnEnemyDamageNumber = () => {}; scene.playEnemyHitReaction = () => {};
  scene.killEnemy = () => assert.fail("This calculation test is deliberately nonlethal");
  scene.applyDamageToEnemy(enemy, rawDamage, 0xddddff, null);
  return 10000 - enemy.hp;
}

test("NOVA keeps immutable historical S1 metadata and no normal skill candidate", () => {
  const { scene, api, calls } = fixture();
  const config = scene.getUmbraPhantomNovaStage1Config();
  assert.deepEqual(plain(config), novaConfig); assert.ok(Object.isFrozen(config));
  for (const id of weaponIds) {
    assert.equal(api.skills[id].previewOnly, true);
    assert.equal(api.skills[id].startsUnlocked, false);
    assert.equal(api.skills[id].behavior, "displayOnly");
    assert.equal(api.skills[id].stages.length, 8);
    assert.equal(api.skills[id].stages[0], api.skills[id].verificationStage1);
  }
  assert.equal(scene.getResolvedPlayerMechStartingSkillDefinition("umbraSeraph"), null);
  assert.deepEqual(plain(scene.getAvailableSkillChoices({ mechId: "umbraSeraph" })), []);
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("orbit and deployed raw damage add only the finite nonnegative Reactor contribution", () => {
  const { scene } = fixture({ weapon: 25, cdIds: ["anju", "nandeyanen", "kotokoto"] });
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  for (const [bullet, orbit, deployed] of [
    [1, 2, 3], [2, 3, 4], [11, 12, 13], [0, 2, 3], [-5, 2, 3], [1.5, 2.5, 3.5],
    [NaN, 2, 3], [Infinity, 2, 3]
  ]) {
    scene.stats.bulletDamage = bullet;
    assert.equal(scene.getUmbraPhantomNovaRawDamage(), orbit);
    assert.equal(scene.getUmbraPhantomNovaRawDamage("orbit"), orbit);
    assert.equal(scene.getUmbraPhantomNovaRawDamage("deployed"), deployed);
  }
});

test("missing provisional metadata cannot create attack damage or an effective Nova passive", () => {
  const { scene, api } = fixture();
  delete api.skills[NOVA].verificationStage1;
  assert.equal(scene.getUmbraPhantomNovaStage1Config(), null);
  assert.equal(scene.getUmbraPhantomNovaRawDamage("orbit"), 0);
  assert.equal(scene.getUmbraPhantomNovaRawDamage("deployed"), 0);
  assert.equal(scene.getUmbraPhantomNovaIntervalMs("orbit"), Infinity);
  assert.equal(scene.getUmbraPhantomNovaIntervalMs("deployed"), Infinity);
  assert.equal(scene.getUmbraPhantomNovaEffectiveStats(), null);
  assert.deepEqual(effectiveIds(scene), []);
  assert.equal(passive(scene, "overchargeBolt"), undefined);
  assert.equal(passive(scene, "rapidSigil"), undefined);
});

test("effective stats return independent values while fixed S1 dimensions and timers remain unchanged", () => {
  const { scene } = fixture();
  const before = scene.getUmbraPhantomNovaEffectiveStats();
  assert.deepEqual(plain(before), { ...novaConfig, orbitRawDamage: 2, deployedRawDamage: 3,
    orbitIntervalMs: 900, deployedIntervalMs: 500,
    orbitDamageBeforeTargetModifiers: 2, deployedDamageBeforeTargetModifiers: 3 });
  before.orbitRange = 999; before.regenerationMs = 0;
  assert.deepEqual(plain(scene.getUmbraPhantomNovaStage1Config()), novaConfig);
  passive(scene, "overchargeBolt").onSelect(); passive(scene, "rapidSigil").onSelect();
  const after = scene.getUmbraPhantomNovaEffectiveStats();
  assert.equal(after.orbitRawDamage, 3); assert.equal(after.deployedRawDamage, 4);
  assert.equal(after.orbitIntervalMs, 789); assert.equal(after.deployedIntervalMs, 445);
  for (const [key, value] of Object.entries(novaConfig)) assert.equal(after[key], value, key);
});

test("NOVA raw reaches real production HP reception with permanent and CD multipliers once", () => {
  for (const [weapon, cdIds, multiplier, fire, orbitMs, deployedMs] of [
    [0, ["anju"], 1, 540, 900, 500],
    [10, ["anju", "miraiwoikiteru"], 1.6, 513, 857, 479],
    [25, ["anju", "nandeyanen", "kotokoto", "miraiwoikiteru"], 2.66, 482, 808, 454]
  ]) {
    const { scene, calls } = fixture({ weapon, cdIds });
    assert.equal(scene.stats.fireInterval, fire);
    assert.equal(scene.getUmbraPhantomNovaIntervalMs("orbit"), orbitMs);
    assert.equal(scene.getUmbraPhantomNovaIntervalMs("deployed"), deployedMs);
    near(productionDamage(scene, scene.getUmbraPhantomNovaRawDamage("orbit")), 2 * multiplier);
    near(productionDamage(scene, scene.getUmbraPhantomNovaRawDamage("deployed")), 3 * multiplier);
    const stats = scene.getUmbraPhantomNovaEffectiveStats();
    near(stats.orbitDamageBeforeTargetModifiers, 2 * multiplier);
    near(stats.deployedDamageBeforeTargetModifiers, 3 * multiplier);
    passive(scene, "overchargeBolt").onSelect();
    near(productionDamage(scene, scene.getUmbraPhantomNovaRawDamage("orbit")), 3 * multiplier);
    near(productionDamage(scene, scene.getUmbraPhantomNovaRawDamage("deployed")), 4 * multiplier);
    assert.deepEqual(calls, { storage: 0, network: 0 });
  }
});

test("a fixed deployed raw value still receives current OVERDRIVE and target modifiers at reception", () => {
  const { scene } = fixture({ weapon: 10 });
  const snapshotRaw = scene.getUmbraPhantomNovaRawDamage("deployed");
  passive(scene, "overchargeBolt").onSelect();
  assert.equal(snapshotRaw, 3); assert.equal(scene.getUmbraPhantomNovaRawDamage("deployed"), 4);
  near(productionDamage(scene, snapshotRaw), 3 * 1.6);
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  scene.overdriveModState = { activeModId: "hunterMode" };
  const enemy = { active: true, isDying: false, hp: 10000, isBoss: true,
    lostArmsVulnerableUntil: 11000, lostArmsVulnerableMult: 1.1, setTint() {} };
  scene.applyDamageToEnemy(enemy, snapshotRaw, 0xddddff, null);
  near(10000 - enemy.hp, 3 * 1.6 * 1.15 * 1.1 * 1.25);
  near(scene.getUmbraPhantomNovaEffectiveStats().deployedDamageBeforeTargetModifiers, 4 * 1.6 * 1.15);
});

test("Fire Control follows the requested orbit and deployed interpolation through all six upgrades", () => {
  const { scene } = fixture();
  const rows = [[540, 900, 500], [470, 789, 445], [400, 679, 389], [330, 568, 334],
    [260, 458, 279], [190, 347, 224], [160, 300, 200]];
  for (let index = 0; index < rows.length; index++) {
    const [fire, orbit, deployed] = rows[index];
    assert.equal(scene.stats.fireInterval, fire);
    assert.equal(scene.getUmbraPhantomNovaIntervalMs(), orbit);
    assert.equal(scene.getUmbraPhantomNovaIntervalMs("deployed"), deployed);
    const choice = passive(scene, "rapidSigil");
    if (index === rows.length - 1) { assert.equal(choice, undefined); break; }
    const [, nextOrbit, nextDeployed] = rows[index + 1];
    assert.equal(choice.novaOrbitIntervalReductionMs, orbit - nextOrbit);
    assert.equal(choice.novaDeployedIntervalReductionMs, deployed - nextDeployed);
    assert.equal(choice.verificationIntervalReductionMs, orbit - nextOrbit + deployed - nextDeployed);
    const card = scene.buildLevelUpCardModel(choice, 0);
    assert.match(card.description, new RegExp(`周回[^\\n]*${orbit} → ${nextOrbit}ms`));
    assert.match(card.description, new RegExp(`残留[^\\n]*${deployed} → ${nextDeployed}ms[^\\n]*次の設置から`));
    assert.match(card.description, /周回[^\n]*次の放電後の待ちから/);
    assert.match(card.description, /下限 300ms/); assert.match(card.description, /下限 200ms/);
    assert.doesNotMatch(card.description, /MOONLIGHT|BLOOD SPIKE/);
    const before = plain(scene.stats); choice.onSelect();
    assert.deepEqual(plain(scene.stats), { ...before, fireInterval: rows[index + 1][0] });
    assert.deepEqual(plain(scene.getUmbraPhantomNovaStage1Config()), novaConfig);
  }
  assert.equal(scene.passiveLevels.rapidSigil, 6);
});

test("intervals are finite, bounded, monotonic and independent of OVERDRIVE speed", () => {
  const { scene } = fixture();
  for (const mode of ["orbit", "deployed"]) {
    const min = mode === "orbit" ? 300 : 200, max = mode === "orbit" ? 900 : 500;
    let previous = -Infinity;
    for (let fire = 0; fire <= 800; fire += 0.25) {
      const value = scene.getUmbraPhantomNovaIntervalMs(mode, fire);
      assert.ok(value >= previous && value >= min && value <= max); previous = value;
    }
    for (const fire of [-100, 120, 160]) assert.equal(scene.getUmbraPhantomNovaIntervalMs(mode, fire), min);
    for (const fire of [NaN, Infinity, undefined]) assert.equal(scene.getUmbraPhantomNovaIntervalMs(mode, fire), max);
  }
  scene.overflowRewardState = { overdriveRemainingMs: 1000 };
  scene.overdriveModState = { activeModId: "cooldownReactor" };
  assert.equal(scene.getUmbraPhantomNovaIntervalMs(), 900);
  assert.equal(scene.getUmbraPhantomNovaIntervalMs("deployed"), 500);
  assert.deepEqual(plain(scene.getUmbraPhantomNovaStage1Config()), novaConfig);
});

test("all eight ownership combinations show only active weapons and change shared stats once", () => {
  for (let mask = 0; mask < 8; mask++) {
    const weapons = weaponIds.filter((id, index) => mask & (1 << index));
    const { scene } = fixture({ weapons, weapon: 10 });
    assert.deepEqual(effectiveIds(scene), weapons);
    for (const id of ["overchargeBolt", "rapidSigil"]) {
      const choice = passive(scene, id);
      if (!weapons.length) { assert.equal(choice, undefined); continue; }
      const card = scene.buildLevelUpCardModel(choice, 0);
      for (const weaponId of weaponIds) {
        assert.equal(card.description.includes(labels[weaponId]), weapons.includes(weaponId), `${mask}/${id}/${weaponId}`);
        assert.equal(choice.description.includes(labels[weaponId]), weapons.includes(weaponId));
      }
      assert.equal(card.description.includes("周回"), weapons.includes(NOVA));
      assert.equal(card.description.includes("次の設置から"), weapons.includes(NOVA));
      if (weapons.includes(NOVA) && id === "overchargeBolt") {
        assert.match(card.description, /周回[^\n]*3\.2 → 4\.8/);
        assert.match(card.description, /残留（次の設置から）[^\n]*4\.8 → 6\.4/);
        assert.match(card.description, /周回（次の放電から）/);
      }
      const before = plain(scene.stats); choice.onSelect();
      assert.deepEqual(plain(scene.stats), { ...before, [id === "overchargeBolt" ? "bulletDamage" : "fireInterval"]:
        id === "overchargeBolt" ? before.bulletDamage + 1 : before.fireInterval - 70 });
      assert.equal(scene.passiveLevels[id], 1);
    }
  }
});

test("NOVA remains an effective acquired weapon with notifications OFF and no other weapon runtime", () => {
  const { scene } = fixture({ phase4: false, weapons: [NOVA], traceNotifications: false });
  assert.equal(scene.umbraBloodSpikeRuntime, undefined); assert.equal(scene.umbraMoonlightRuntime, undefined);
  assert.deepEqual(effectiveIds(scene), [NOVA]);
  assert.ok(passive(scene, "overchargeBolt")); assert.ok(passive(scene, "rapidSigil"));
  const all = fixture({ weapons: weaponIds, traceNotifications: false }).scene;
  assert.deepEqual(effectiveIds(all), [SPIKE, NOVA]);
  assert.doesNotMatch(passive(all, "rapidSigil").cardDescription, /MOONLIGHT/);
});

test("weapon toggle, exact Stage identity, verification marker and context control membership", () => {
  const { scene, api } = fixture();
  scene.novaAttackEnabled = false; assert.deepEqual(effectiveIds(scene), []);
  scene.novaAttackEnabled = true;
  scene.playerSkills[NOVA].currentStage = { ...api.skills[NOVA].verificationStage1 };
  assert.deepEqual(effectiveIds(scene), []);
  scene.playerSkills[NOVA].currentStage = api.skills[NOVA].verificationStage1;
  scene.playerSkills[NOVA].verificationOnly = false; assert.deepEqual(effectiveIds(scene), []);
  scene.playerSkills[NOVA].verificationOnly = true;
  scene.verificationContext = Object.freeze({ ...scene.verificationContext, phantomNovaArena: false });
  assert.deepEqual(effectiveIds(scene), []);
});

test("all REGENERATING slots, candidate pause, hidden and EN0 retain future passive effects", () => {
  const { scene } = fixture();
  scene.umbraPhantomNovaRuntime = { combatTimeMs: 1300, slots: [
    { slotId: 0, state: "REGENERATING", regenerateAtMs: 2200, nextPulseAtMs: 3000 }
  ] };
  const before = scene.getPassiveUpgradeChoices().map(choice => [choice.id, choice.description, choice.chipLabel]);
  scene.drivePaused = true; scene.driveHidden = true; scene.selectionObjects = [{}];
  scene.stats.stamina = 0; scene.acMovementState = { fullOverheat: true };
  scene.getUmbraPhantomNovaBlockReason = () => "PAUSED";
  assert.deepEqual(scene.getPassiveUpgradeChoices().map(choice => [choice.id, choice.description, choice.chipLabel]), before);
  passive(scene, "overchargeBolt").onSelect(); passive(scene, "rapidSigil").onSelect();
  assert.equal(scene.stats.bulletDamage, 2); assert.equal(scene.stats.fireInterval, 470); assert.equal(scene.stats.stamina, 0);
});

test("rounding hides only ineffective modes and preserves another weapon's positive interval delta", () => {
  const { scene } = fixture();
  scene.stats.fireInterval = 160.4;
  const choice = passive(scene, "rapidSigil");
  assert.equal(choice.novaOrbitIntervalReductionMs, 1); assert.equal(choice.novaDeployedIntervalReductionMs, 0);
  assert.match(choice.cardDescription, /周回/); assert.doesNotMatch(choice.cardDescription, /残留|次の設置から/);
  for (const value of [160, 160.1, 160.2, 1000]) {
    scene.stats.fireInterval = value; assert.equal(passive(scene, "rapidSigil"), undefined);
  }
  const combined = fixture({ weapons: weaponIds }).scene;
  combined.stats.fireInterval = 160.2;
  const other = passive(combined, "rapidSigil");
  assert.match(other.cardDescription, /BLOOD SPIKE/); assert.doesNotMatch(other.cardDescription, /NOVA|MOONLIGHT/);
  assert.equal(other.bloodSpikeIntervalReductionMs, 1); assert.equal(other.verificationIntervalReductionMs, 1);
  scene.stats.fireInterval = 540; scene.passiveLevels.rapidSigil = 10;
  assert.equal(passive(scene, "rapidSigil"), undefined);
  scene.passiveLevels.overchargeBolt = 10; assert.equal(passive(scene, "overchargeBolt"), undefined);
  scene.passiveLevels.overchargeBolt = 0; scene.stats.bulletDamage = 0;
  assert.equal(passive(scene, "overchargeBolt"), undefined);
});

test("queries and passive callbacks leave existing reservations, pending pulse and deployed snapshots untouched", () => {
  const { scene, calls } = fixture({ weapons: weaponIds });
  // These are deliberately RAM sentinels, not a synthetic implementation of the
  // Nova state machine. Core tests separately verify actual pulse/commit paths.
  scene.umbraPhantomNovaRuntime = { combatTimeMs: 1000, lastDeployedAtMs: 700, slots: [
    { slotId: 0, state: "ORBITING", nextPulseAtMs: 1800,
      reservation: { sequence: 3, position: { x: 100, y: 200 } } },
    { slotId: 1, state: "DEPLOYED", nextPulseAtMs: 1200, position: { x: 20, y: 30 },
      snapshot: { rawDamage: 3, range: 300, intervalMs: 500, durationMs: 3000, regenerationMs: 1200 } }
  ] };
  scene.umbraBloodSpikeRuntime = { clock: 1000, nextCastAt: 1800, casts: [{ rawDamage: 5, impactAt: 1200 }] };
  scene.umbraMoonlightRuntime = { combatTimeMs: 1000, history: [{ lifeId: 1, lastHitAt: 900 }] };
  const runtimeKeys = ["umbraPhantomNovaRuntime", "umbraBloodSpikeRuntime", "umbraMoonlightRuntime"];
  const before = runtimeKeys.map(key => plain(scene[key]));
  for (let i = 0; i < 10; i++) {
    scene.getUmbraPhantomNovaEffectiveStats(); scene.getUmbraVerificationPassiveWeapons();
    scene.getPassiveUpgradeChoices({ openingBoost: false }); scene.getPassiveUpgradeChoices({ openingBoost: true });
  }
  passive(scene, "overchargeBolt").onSelect(); passive(scene, "rapidSigil").onSelect();
  assert.equal(scene.getUmbraPhantomNovaRawDamage("orbit"), 3);
  assert.equal(scene.getUmbraPhantomNovaIntervalMs("orbit"), 789);
  assert.deepEqual(runtimeKeys.map(key => plain(scene[key])), before);
  assert.equal(scene.levelUpCandidatePresentationState.evasiveFirmwarePresented, false);
  assert.deepEqual(calls, { storage: 0, network: 0 });
});

test("standard, REGALIA and earlier trace-only drive retain their existing candidate text and effect", () => {
  for (const options of [{ mechId: "defaultBear" }, { mechId: "regaliaBastion" },
    { phase5: false, phase4: false, weapons: [] }]) {
    const { scene } = fixture(options);
    assert.equal(scene.getUmbraVerificationPassiveWeapons(), null);
    const reactor = passive(scene, "overchargeBolt"), fire = passive(scene, "rapidSigil");
    assert.equal(scene.buildLevelUpCardModel(reactor, 0).description, "雷撃ダメージ +1");
    assert.equal(scene.buildLevelUpCardModel(fire, 0).description, "放電間隔短縮");
    reactor.onSelect(); fire.onSelect();
    assert.equal(scene.stats.bulletDamage, 2); assert.equal(scene.stats.fireInterval, 470);
    scene.stats.fireInterval = 160.1; assert.ok(passive(scene, "rapidSigil"));
  }
});

test("Phase 6B Stage-aware MOONLIGHT and SPIKE calculations preserve Phase 5 S1 outputs", () => {
  const baseline = fs.readFileSync(path.join(root, ".tmp_umbra_phase5", "baseline", "game.js"), "utf8").replace(/\r\n/g, "\n");
  const current = source.replace(/\r\n/g, "\n");
  const body = (text, name) => {
    const start = text.indexOf(`\n  ${name}(`); assert.ok(start >= 0, name);
    const end = text.indexOf("\n  }", start); assert.ok(end > start, name);
    return text.slice(start, end + 4);
  };
  const names = ["getUmbraMoonlightStage1Config", "getUmbraMoonlightRawDamage", "getUmbraMoonlightRehitIntervalMs", "getUmbraMoonlightEffectiveStats",
    "getUmbraBloodSpikeStage1Config", "getUmbraBloodSpikeRawDamage", "getUmbraBloodSpikeIntervalMs", "getUmbraBloodSpikeEffectiveStats"];
  for (const name of names.filter(name => name.endsWith("Stage1Config"))) assert.equal(body(current, name), body(baseline, name), name);
  const { scene, api } = fixture({ weapons: [MOON, SPIKE] });
  const legacy = Object.assign(Object.create(scene), vm.runInNewContext(`({${names.map(name => body(baseline, name)).join(",")}})`, {
    SKILL_DEFINITIONS: api.skills, UMBRA_MOONLIGHT_SKILL_ID: MOON, UMBRA_BLOOD_SPIKE_SKILL_ID: SPIKE,
    Phaser: { Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) } }
  }));
  for (const bullet of [0, 1, 4, 11, NaN]) for (const fire of [540, 513, 482, 400, 190, 160, 159, NaN]) {
    scene.stats.bulletDamage = bullet; scene.stats.fireInterval = fire;
    for (const name of names) assert.deepEqual(plain(scene[name]()), plain(legacy[name]()), `${name}/${bullet}/${fire}`);
  }
});
