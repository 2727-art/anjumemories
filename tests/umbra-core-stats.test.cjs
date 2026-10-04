"use strict";

// Phase 6C1 pure production getter/card checks. Owner-bound Core records below
// are numerical inputs only; actual FIFO selection and enemy control/physics
// are covered by separate runtime and browser tests.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const crypto = require("node:crypto"), test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const baselineDirectory = process.env.UMBRA_CORE_BASELINE || ".tmp_umbra_phase6c1/2026-09-07T11-44-31-241Z/baseline";
const expectedBaselineHash = "55f0be42ed38414d9c7bf974b7a92fa3e9c42839d601225accbffb7c54f60ef6";
const MOON = "umbraMoonlight", SPIKE = "umbraBloodSpike", NOVA = "umbraPhantomNova", ids = [MOON, SPIKE, NOVA];
const getters = { [MOON]: "getUmbraMoonlightEffectiveStats", [SPIKE]: "getUmbraBloodSpikeEffectiveStats", [NOVA]: "getUmbraPhantomNovaEffectiveStats" };
const plain = value => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const interval = (base, floor, fire) => Math.max(floor, Math.round(floor + (base - floor) * Math.max(0, Math.min(1, (fire - 160) / 380))));
const noProfile = stats => { const copy = plain(stats); delete copy.coreProfile; return copy; };
function loadFixture(baseline = false) {
  const filename = path.join(__dirname, "umbra-growth-stats.test.cjs");
  let content = fs.readFileSync(filename, "utf8");
  const boundary = content.indexOf("\nfor (const id of ids) test("); assert.ok(boundary > 0);
  content = content.slice(0, boundary);
  if (baseline) {
    const oldGame = path.join(root, baselineDirectory, "game.js");
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(oldGame)).digest("hex"), expectedBaselineHash);
    content = content.replace('path.join(root, "game.js")', JSON.stringify(oldGame))
      .replace('path.join(root, "skillDefinitions.js")', JSON.stringify(path.join(root, baselineDirectory, "skillDefinitions.js")));
  }
  const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(content + "\nmodule.exports = { fixture, selectStage };", filename);
  return mod.exports;
}
const live = loadFixture(), legacy = loadFixture(true);
function coreFixture({ fixtureId = "baseline", stage = 4, coreId = null, passives = false, acquired = ids } = {}) {
  const f = live.fixture({ fixtureId, acquired }), s = f.scene;
  s.verificationContext = Object.freeze({ ...s.verificationContext, coreEnabled: true });
  s.umbraGrowthRun.context = s.verificationContext;
  s.skillMutationState = { umbraGrowthRun: s.umbraGrowthRun, entries: {}, pendingQueue: [], currentChoices: [], selectionOpen: false };
  for (const id of acquired) {
    live.selectStage(s, f.api, id, stage);
    s.skillMutationState.entries[id] = { core: coreId, stage4Selected: coreId !== null, stage4Queued: false };
    // Deliberately numerical owners: no timers, physical observers or attack
    // lifecycle are installed. Production ownership gates still run unchanged.
    s[{ [MOON]: "umbraMoonlightRuntime", [SPIKE]: "umbraBloodSpikeRuntime", [NOVA]: "umbraPhantomNovaRuntime" }[id]] = {
      umbraGrowthRun: s.umbraGrowthRun, destroyed: false, player: s.playerHitbox, body: s.playerHitbox.body
    };
  }
  if (passives) for (const [id, count] of [["overchargeBolt", 3], ["rapidSigil", 2]]) for (let i = 0; i < count; i++) {
    const choice = s.getPassiveUpgradeChoices().find(candidate => candidate.id === id); assert.ok(choice); choice.onSelect();
  }
  return f;
}

test("Phase 6B Stage definitions preserve all bytes except the explicitly requested SPIKE S8 radius160 to240", () => {
  const old = fs.readFileSync(path.join(root, baselineDirectory, "skillDefinitions.js"), "utf8");
  const radiusRow = "impactRadius: [90, 100, 110, 122, 135, 147, 160]";
  assert.equal(old.split(radiusRow).length, 2);
  assert.equal(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), old.replace(radiusRow, radiusRow.replace("160]", "240]")));
  const { api } = coreFixture();
  for (const id of ids) { assert.equal(api.skills[id].stages[0], api.skills[id].verificationStage1); assert.ok(api.skills[id].stages.every(Object.isFrozen)); }
});

for (const fixtureId of ["baseline", "medium", "deep"]) test(`${fixtureId}: Core absent preserves Phase 6B values and legacy output shape across all 24 Stages`, () => {
  const now = live.fixture({ fixtureId }), before = legacy.fixture({ fixtureId }), explicit = coreFixture({ fixtureId, stage: 1 });
  for (const [reactor, fireCount] of [[0, 0], [3, 2]]) {
    for (const f of [now, before, explicit]) {
      f.scene.stats.bulletDamage = reactor + 1;
      const initialFire = fixtureId === "baseline" ? 540 : fixtureId === "medium" ? 513 : 482;
      f.scene.stats.fireInterval = initialFire - fireCount * 70;
    }
    for (let stage = 1; stage <= 8; stage++) for (const id of ids) {
      live.selectStage(now.scene, now.api, id, stage); legacy.selectStage(before.scene, before.api, id, stage); live.selectStage(explicit.scene, explicit.api, id, stage);
      const result = now.scene[getters[id]](), old = plain(before.scene[getters[id]]()), coreEmpty = explicit.scene[getters[id]]();
      if (id === SPIKE && stage === 8) { assert.equal(old.impactRadius, 160); old.impactRadius = 240; }
      assert.deepEqual(plain(result), old);
      assert.equal(Object.hasOwn(result, "coreProfile"), false);
      assert.equal(coreEmpty.coreProfile.coreId, null); assert.deepEqual(noProfile(coreEmpty), old);
    }
  }
});

for (const coreId of ["assault", "control", "reactor"]) test(`${coreId}: S4/S8 × three fixtures × R0F0/R3F2 uses exactly the approved nine effects`, () => {
  for (const fixtureId of ["baseline", "medium", "deep"]) for (const stage of [4, 8]) for (const passives of [false, true]) {
    const { scene: s, api, calls } = coreFixture({ fixtureId, stage, coreId, passives });
    const bonus = passives ? 3 : 0, fire = s.stats.fireInterval;
    const raw = base => coreId === "assault" ? Math.max(1, Math.round((base + bonus) * 1.25)) : base + bonus;
    const reactorTime = (base, floor) => { const t0 = interval(base, floor, fire); return coreId === "reactor" ? Math.max(floor, Math.round(t0 * 0.9)) : t0; };
    const m = s.getUmbraMoonlightEffectiveStats(), b = s.getUmbraBloodSpikeEffectiveStats(), n = s.getUmbraPhantomNovaEffectiveStats();
    assert.equal(m.rawDamage, raw(stage === 4 ? 7 : 12)); assert.equal(m.reactorBonus, bonus);
    assert.equal(m.rehitMs, reactorTime(stage === 4 ? 725 : 650, 200));
    assert.equal(m.passageRadius, stage === 4 ? 64 : 70); assert.equal(m.leaveMargin, coreId === "reactor" ? 8 : 12);
    assert.equal(m.exitRadius, m.passageRadius + m.leaveMargin); assert.equal(m.maxImpactFx, 12);
    assert.equal(b.rawDamage, raw(5)); assert.equal(b.reactorBonus, bonus); assert.equal(b.intervalMs, reactorTime(1800, 500));
    assert.equal(b.searchRetryMs, coreId === "reactor" ? 100 : 150); assert.equal(b.searchRange, 600);
    assert.equal(b.impactRadius, stage === 4 ? 110 : 240); assert.equal(b.impactOffsetMs, 200); assert.equal(b.lifetimeMs, 800); assert.equal(b.maxActiveCasts, 3);
    assert.equal(n.orbitRawDamage, raw(stage === 4 ? 2 : 3)); assert.equal(n.deployedRawDamage, raw(3));
    assert.equal(n.orbitIntervalMs, interval(900, 300, fire)); assert.equal(n.deployedIntervalMs, interval(500, 200, fire));
    assert.equal(n.regenerationMs, coreId === "reactor" ? 1000 : 1200);
    for (const key of ["deployedDurationMs", "deployIntervalMs", "minDeployDistance", "orbitRadius", "orbitPeriodMs", "slotCount", "frameCount", "frameRate"])
      assert.equal(n[key], api.skills[NOVA].stages[stage - 1][key], key);
    for (const [id, stats, control] of [[MOON, m, [0.78, 0.92, 420]], [SPIKE, b, [0.75, 0.92, 600]], [NOVA, n, [0.85, 0.95, 250]]]) {
      assert.equal(stats.coreProfile.coreId, coreId); assert.ok(Object.isFrozen(stats.coreProfile));
      assert.equal(stats.coreProfile.coreDamageMultiplier, coreId === "assault" ? 1.25 : 1);
      assert.equal(stats.coreProfile.coreIntervalMultiplier, coreId === "reactor" && id !== NOVA ? 0.9 : 1);
      if (coreId === "control") {
        assert.deepEqual(plain(stats.coreProfile.controlSettings), { normalMultiplier: control[0], bossMultiplier: control[1], durationMs: control[2] });
        assert.ok(Object.isFrozen(stats.coreProfile.controlSettings));
      } else assert.equal(stats.coreProfile.controlSettings, null);
    }
    near(m.damageBeforeTargetModifiers, s.scalePlayerDamage(m.rawDamage)); near(b.damageBeforeTargetModifiers, s.scalePlayerDamage(b.rawDamage));
    near(n.orbitDamageBeforeTargetModifiers, s.scalePlayerDamage(n.orbitRawDamage)); near(n.deployedDamageBeforeTargetModifiers, s.scalePlayerDamage(n.deployedRawDamage));
    assert.deepEqual(calls, { storage: 0, network: 0 });
  }
});

test("baseline S4 raw rounds 7→9, 5→6, 2→3, 3→4 without a second coefficient", () => {
  const { scene: s } = coreFixture({ coreId: "assault" });
  assert.equal(s.getUmbraMoonlightRawDamage(), 9); assert.equal(s.getUmbraBloodSpikeRawDamage(), 6);
  assert.equal(s.getUmbraPhantomNovaRawDamage(), 3); assert.equal(s.getUmbraPhantomNovaRawDamage("deployed"), 4);
  const card = s.buildUmbraCoreCard(NOVA, "assault"), text = card.chips.map(chip => chip.label).join(" / ");
  assert.match(text, /\+25%/); assert.match(text, /周回 raw 2 → 3/); assert.match(text, /残留 raw 3 → 4/);
  assert.match(card.description, /整数丸め/); assert.match(card.description, /受付前値/);
  assert.doesNotMatch(card.description, /実ダメージ.*25%/);
});

test("REACTOR rounds T0 before ×0.90, respects floors, and never changes NOVA pulse timing", () => {
  const { scene: s } = coreFixture({ coreId: "reactor" });
  assert.equal(s.getUmbraMoonlightRehitIntervalMs(), 653); assert.equal(s.getUmbraBloodSpikeIntervalMs(), 1620);
  assert.equal(s.getUmbraMoonlightEffectiveStats().exitRadius, 72);
  for (const fire of [0, 159, 160, 160.1, 175, 190, 342, 373, 400, 482, 513, 540, 800]) {
    s.stats.fireInterval = fire;
    assert.equal(s.getUmbraMoonlightRehitIntervalMs(), Math.max(200, Math.round(interval(725, 200, fire) * 0.9)));
    assert.equal(s.getUmbraBloodSpikeIntervalMs(), Math.max(500, Math.round(interval(1800, 500, fire) * 0.9)));
    assert.equal(s.getUmbraPhantomNovaIntervalMs(), interval(900, 300, fire));
    assert.equal(s.getUmbraPhantomNovaIntervalMs("deployed"), interval(500, 200, fire));
  }
  s.stats.fireInterval = 160;
  for (const id of [MOON, SPIKE]) {
    const card = s.buildUmbraCoreCard(id, "reactor"), text = card.chips.map(chip => chip.label).join(" / ");
    assert.match(text, /下限・短縮なし/); assert.doesNotMatch(text, /-0ms/);
    assert.match(text, id === MOON ? /離脱余白 12 → 8px/ : /敵なし再探索 150 → 100ms/);
  }
  const n = s.buildUmbraCoreCard(NOVA, "reactor");
  assert.match(n.chips[0].label, /再生成 1200 → 1000ms/); assert.match(n.description, /既配置球は旧1200ms/);
  assert.match(n.description, /BOOST EN回復強化なし/);
});

test("Core IDs at S1–3, unknown IDs, old state owner and disabled Context cannot add effects", () => {
  for (const stage of [1, 2, 3]) for (const coreId of ["assault", "control", "reactor", "unknown"]) {
    const { scene: s } = coreFixture({ stage, coreId });
    for (const id of ids) {
      assert.equal(s.getUmbraSelectedCoreId(id), null);
      const stats = s[getters[id]](); assert.equal(stats.coreProfile.coreId, null);
      assert.equal(s.buildUmbraCoreCard(id, "assault"), null);
    }
  }
  const { scene: s, api } = coreFixture({ coreId: "unknown" });
  assert.equal(s.getUmbraMoonlightRawDamage(), 7); assert.equal(s.getUmbraMoonlightEffectiveStats().coreProfile.coreId, null);
  assert.equal(s.buildUmbraCoreCard(MOON, "unknown"), null);
  s.skillMutationState.entries[MOON] = { core: "assault", stage4Selected: true }; s.skillMutationState.umbraGrowthRun = {};
  assert.equal(s.getUmbraMoonlightRawDamage(), 7);
  assert.equal(s.getUmbraMoonlightEffectiveStats({ ...api.skills[MOON].stages[3] }, "assault"), null);
  const oldEntry = live.fixture();
  live.selectStage(oldEntry.scene, oldEntry.api, MOON, 4);
  assert.equal(oldEntry.scene.getUmbraMoonlightEffectiveStats(oldEntry.api.skills[MOON].stages[3], "assault").rawDamage, 7);
  assert.equal(Object.hasOwn(oldEntry.scene.getUmbraMoonlightEffectiveStats(), "coreProfile"), false);
  for (const invalidate of [owner => { owner.destroyed = true; }, owner => { owner.umbraGrowthRun = {}; },
    (_owner, scene) => { scene.umbraMoonlightRuntime = null; }]) {
    const f = coreFixture({ coreId: "assault" }), owner = f.scene.umbraMoonlightRuntime;
    invalidate(owner, f.scene);
    assert.equal(f.scene.getUmbraSelectedCoreId(MOON), null);
    assert.equal(f.scene.getUmbraMoonlightEffectiveStats().rawDamage, 7);
    assert.equal(f.scene.getUmbraMoonlightEffectiveStats(f.api.skills[MOON].stages[3], "assault").rawDamage, 7);
    assert.equal(f.scene.buildUmbraCoreCard(MOON, "assault"), null);
    assert.equal(f.scene.skillMutationState.entries[MOON].core, "assault", "A failed permission query does not rewrite RAM selection history");
  }
});

test("Core prediction and HUD queries are pure and preserve selected values, pending, milestones and Evasive state", () => {
  const { scene: s } = coreFixture();
  s.pendingLevelUps = 4; s.startingUpgradeSelectionsRemaining = 2;
  s.umbraGrowthRun.deferredMilestones = [{ skillId: MOON, phase: "core", order: 1 }];
  const before = JSON.stringify([s.stats, s.passiveLevels, s.skillMutationState.entries, s.skillMutationState.pendingQueue,
    s.umbraGrowthRun.deferredMilestones, s.levelUpCandidatePresentationState]);
  for (let n = 0; n < 20; n++) for (const id of ids) {
    for (const coreId of ["assault", "control", "reactor"]) assert.ok(s.buildUmbraCoreCard(id, coreId));
    s[getters[id]](); s.getPassiveUpgradeChoices(); s.buildSkillChoice(id);
  }
  assert.equal(JSON.stringify([s.stats, s.passiveLevels, s.skillMutationState.entries, s.skillMutationState.pendingQueue,
    s.umbraGrowthRun.deferredMilestones, s.levelUpCandidatePresentationState]), before);
  assert.equal(s.pendingLevelUps, 4); assert.equal(s.startingUpgradeSelectionsRemaining, 2);
});

test("ASSAULT Reactor Overcharge cards show rounded next raw changes and update the common stat exactly once", () => {
  for (const fixtureId of ["baseline", "medium", "deep"]) {
    const { scene: s } = coreFixture({ fixtureId, stage: 8, coreId: "assault" });
    for (let rank = 0; rank < 5; rank++) {
      const before = { m: s.getUmbraMoonlightEffectiveStats(), b: s.getUmbraBloodSpikeEffectiveStats(), n: s.getUmbraPhantomNovaEffectiveStats() };
      const option = s.getPassiveUpgradeChoices().find(choice => choice.id === "overchargeBolt"), bullet = s.stats.bulletDamage;
      assert.ok(option); option.onSelect(); assert.equal(s.stats.bulletDamage, bullet + 1);
      const after = { m: s.getUmbraMoonlightEffectiveStats(), b: s.getUmbraBloodSpikeEffectiveStats(), n: s.getUmbraPhantomNovaEffectiveStats() };
      const format = value => Number(value.toFixed(2));
      for (const [name, previous, next] of [["MOONLIGHT", before.m.damageBeforeTargetModifiers, after.m.damageBeforeTargetModifiers],
        ["BLOOD SPIKE", before.b.damageBeforeTargetModifiers, after.b.damageBeforeTargetModifiers],
        ["NOVA 周回", before.n.orbitDamageBeforeTargetModifiers, after.n.orbitDamageBeforeTargetModifiers],
        ["NOVA 残留", before.n.deployedDamageBeforeTargetModifiers, after.n.deployedDamageBeforeTargetModifiers]]) {
        assert.ok(option.description.includes(`${name}`));
        assert.ok(option.cardDescription.includes(`${format(previous)} → ${format(next)}`));
        assert.ok(option.description.includes(`威力 +${format(next - previous)}`));
      }
    }
  }
});

test("Fire Control cards include selected REACTOR in both current and next wait, while NOVA cadence stays ordinary", () => {
  const { scene: s } = coreFixture({ coreId: "reactor", stage: 8 });
  while (s.stats.fireInterval > 160) {
    const option = s.getPassiveUpgradeChoices().find(choice => choice.id === "rapidSigil"); assert.ok(option);
    const current = [s.getUmbraMoonlightRehitIntervalMs(), s.getUmbraBloodSpikeIntervalMs(), s.getUmbraPhantomNovaIntervalMs(), s.getUmbraPhantomNovaIntervalMs("deployed")];
    const oldFire = s.stats.fireInterval; option.onSelect(); assert.equal(s.stats.fireInterval, Math.max(160, oldFire - 70));
    const after = [s.getUmbraMoonlightRehitIntervalMs(), s.getUmbraBloodSpikeIntervalMs(), s.getUmbraPhantomNovaIntervalMs(), s.getUmbraPhantomNovaIntervalMs("deployed")];
    for (const [index, key] of ["moonlightRehitReductionMs", "bloodSpikeIntervalReductionMs", "novaOrbitIntervalReductionMs", "novaDeployedIntervalReductionMs"].entries())
      assert.equal(option[key], current[index] - after[index]);
  }
  assert.equal(s.getPassiveUpgradeChoices().find(choice => choice.id === "rapidSigil"), undefined);
});

test("CONTROL card reports weapon-specific normal/Boss rates and never calls a slow a stun or adds a target cap", () => {
  const { scene: s } = coreFixture();
  for (const [id, normal, boss, duration] of [[MOON, 22, 8, 420], [SPIKE, 25, 8, 600], [NOVA, 15, 5, 250]]) {
    const card = s.buildUmbraCoreCard(id, "control"), text = card.chips.map(chip => chip.label).join(" / ");
    assert.ok(text.includes(`通常敵 移動速度 -${normal}% / ${duration}ms`));
    assert.ok(text.includes(`Boss系 移動速度 -${boss}% / ${duration}ms`));
    assert.match(card.description, /完全停止・スタンなし/); assert.doesNotMatch(card.description, /6体|最大6/);
    if (id === SPIKE) assert.match(card.description, /命中した各敵が対象/);
  }
});

test("Stage growth cards retain selected Core rounding and REACTOR exit distance", () => {
  const { scene: assault } = coreFixture({ coreId: "assault", stage: 6 });
  const damageCard = assault.buildSkillChoice(MOON);
  assert.ok(damageCard.umbraGrowthCard.chips.some(chip => chip.label === "基礎威力 +2"));
  const { scene: reactor } = coreFixture({ coreId: "reactor", stage: 7 });
  const card = reactor.buildSkillChoice(MOON);
  assert.match(card.description, /離脱外縁 78px/);
  assert.ok(card.umbraGrowthCard.chips.some(chip => chip.label === "離脱外縁 +2px"));
});

function regularMutationFixture(loader, mechId) {
  const f = loader.fixture({ acquired: [], growth: false }), s = f.scene, events = [];
  delete s.verificationContext; s.isUmbraPhase2ADrive = false;
  s.runPlayerMechSnapshotActive = true; s.runPlayerMechId = mechId;
  s.getSelectedPlayerMechId = () => mechId; s.getSelectedPlayerMechDefinition = () => f.api.mechs[mechId];
  s.initializeSkillMutationState();
  for (const id of s.getSkillMutationTargetSkillIds()) {
    s.playerSkills[id] = s.createSkillState(f.api.skills[id]);
    s.playerSkills[id].stageIndex = 3; s.playerSkills[id].currentStage = f.api.skills[id].stages[3];
  }
  // Isolate candidates/choice state/numerical generic Core and slow handlers.
  // Generic attack recreation, HUD and impact visuals are recorded boundaries,
  // not a substitute for the existing two-mech browser/physical tests.
  s.applySkillStage = (skill, initial) => events.push(["applyStage", skill.id, initial]);
  s.updateHud = () => events.push(["hud"]);
  s.setLastPickupNotice = text => events.push(["notice", text]);
  s.showOverflowRewardText = (...args) => events.push(["text", ...args]);
  s.refreshTriadMatrixSnapshot = reason => events.push(["triadSnapshot", reason]);
  s.getTriadSkillDamageMultiplier = () => 1; s.getTriadControlMultiplier = () => 1;
  s.isOverdriveActive = () => false; s.isRobotSyncActive = () => false; s.isNemesisBoss = () => false;
  s.applyEnemyImpact = (enemy, options) => events.push(["impact", plain(options)]);
  s.spawnSkillMutationRing = (...args) => events.push(["ring", ...args]);
  return { ...f, events };
}

for (const mechId of ["defaultBear", "regaliaBastion"]) test(`${mechId}: generic Mutation choices, selected state, damage/cadence and control slow match Phase 6B`, () => {
  const current = regularMutationFixture(live, mechId), previous = regularMutationFixture(legacy, mechId);
  const currentIds = plain(current.scene.getSkillMutationTargetSkillIds());
  assert.deepEqual(currentIds, plain(previous.scene.getSkillMutationTargetSkillIds())); assert.equal(currentIds.length, 3);
  for (const skillId of currentIds) for (const coreId of ["assault", "control", "reactor"]) {
    const results = [];
    for (const loader of [live, legacy]) {
      const { scene: s, events, calls } = regularMutationFixture(loader, mechId);
      assert.equal(s.isUmbraCoreContextActive?.() || false, false);
      const choices = s.buildSkillMutationChoices(skillId, "stage4");
      assert.deepEqual(plain(choices.map(choice => choice.choiceId)), ["assault", "control", "reactor"]);
      const selected = choices.find(choice => choice.choiceId === coreId); assert.equal(selected.onSelect(), true);
      assert.equal(s.getSkillMutationCore(skillId), coreId); assert.equal(s.skillMutationState.selectionLocked, true);
      assert.equal(selected.onSelect(), false, "Existing duplicate selection lock is preserved");
      const values = [];
      for (const activeBoost of [false, true]) for (const isBoss of [false, true]) {
        s.isDashing = activeBoost;
        const enemy = { active: true, isDying: false, isBoss, hp: 5, maxHp: 10, x: 20, y: 30, body: {} };
        const damage = s.getSkillMutationDamageMultiplier(skillId, { enemy });
        const cooldown = s.getSkillMutationCooldownMultiplier(skillId);
        const expectedDamage = coreId === "assault" ? (isBoss ? 1.16 : 1.12)
          : coreId === "control" ? (isBoss ? 0.98 : 0.94) : activeBoost ? 1.14 : 1.04;
        near(damage, expectedDamage);
        near(cooldown, coreId === "assault" ? skillId === "tornadoSkill" ? 0.92 : 0.96 : coreId === "control" ? 1.04 : activeBoost ? 0.88 : 0.96);
        s.applySkillMutationOnHit(skillId, enemy, { x: 10, y: 15 }, 10);
        const slow = s.getEnemySkillMutationSlowMultiplier(enemy);
        if (coreId === "control") {
          near(slow, isBoss ? 0.9 : 0.78);
          assert.equal(enemy.skillMutationSlowUntil, s.time.now + (skillId === "tornadoSkill" ? 760 : 520));
          s.time.now = enemy.skillMutationSlowUntil; assert.equal(s.getEnemySkillMutationSlowMultiplier(enemy), 1); s.time.now = 10000;
        } else assert.equal(slow, 1);
        values.push({ activeBoost, isBoss, damage, cooldown, slow, enemy: plain(enemy) });
      }
      results.push({ choices: plain(choices), state: plain(s.skillMutationState), values, events: plain(events), calls });
    }
    assert.deepEqual(results[0], results[1]);
  }
});

test("existing Mutation axes and frame combat targets remain unchanged while production records recognize UMBRA", () => {
  const now = fs.readFileSync(path.join(root, "game.js"), "utf8").replace(/\r\n/g, "\n");
  const old = fs.readFileSync(path.join(root, baselineDirectory, "game.js"), "utf8").replace(/\r\n/g, "\n");
  for (const name of ["DEFAULT_PLAYER_MECH_SKILL_MUTATION_SKILL_IDS",
    "SKILL_MUTATION_SKILL_IDS", "SKILL_MUTATION_ARCHIVE_SKILL_IDS",
    "SKILL_MUTATION_CORE_IDS", "SKILL_MUTATION_FINAL_IDS", "MUTATION_ATLAS_CORE_ROWS", "MUTATION_ATLAS_FINAL_COLUMNS",
    "MUTATION_ATLAS_BUILD_IDS"]) {
    const expression = new RegExp(`const ${name} = [\\s\\S]*?(?=\\nconst )`);
    const current = now.match(expression)?.[0], previous = old.match(expression)?.[0];
    assert.ok(current, name); assert.equal(current, previous, name); assert.doesNotMatch(current, /umbra/i);
  }
  const current = regularMutationFixture(live, "defaultBear").scene;
  const previous = regularMutationFixture(legacy, "defaultBear").scene;
  assert.equal(current.getAllSkillMutationSkillIds().length, 7);
  assert.equal(previous.getAllSkillMutationSkillIds().length, 4);
  assert.deepEqual(plain(current.getSkillMutationTargetSkillIds()), plain(previous.getSkillMutationTargetSkillIds()));
  for (const id of ids) {
    assert.equal(current.getAllSkillMutationSkillIds().includes(id), true);
    assert.equal(previous.getAllSkillMutationSkillIds().includes(id), false);
  }
});
