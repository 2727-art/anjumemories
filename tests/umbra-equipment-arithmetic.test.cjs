"use strict";
// Phase6D2 arithmetic is exercised through production methods with explicit RAM
// Stage/Mutation inputs. OVL overrides below are pure predictions, never grants.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), crypto = require("node:crypto");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), file = path.join(__dirname, "umbra-equipment-state.test.cjs");
const source = fs.readFileSync(file, "utf8"), mod = new Module(file, module);
mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(source.slice(0, source.indexOf('\ntest("')) + "\nmodule.exports={equipment,equipmentData,base,ids};", file);
const { equipment, equipmentData, base, ids } = mod.exports, [M, B, N] = ids;
const plain = value => JSON.parse(JSON.stringify(value));
const equip = { baseline: () => equipmentData(), medium: () => equipmentData("SR", 3, 5), deep: () => equipmentData("LEGEND", 5, 20) };
const stats = s => [s.getUmbraMoonlightEffectiveStats(), s.getUmbraBloodSpikeEffectiveStats(), s.getUmbraPhantomNovaEffectiveStats()];
const periods = s => { const [m, b, n] = stats(s); return [m.rehitMs, b.intervalMs, n.orbitIntervalMs, n.deployedIntervalMs]; };
const expectedPeriod = (period, floor, fire, reactor, sensor) => {
  const q = Math.max(0, Math.min(1, (fire - 160) / 380));
  const t0 = Math.max(floor, Math.round(floor + (period - floor) * q));
  return Math.max(floor, Math.round(t0 * reactor * sensor));
};
const nonAttackTimes = values => values.map(value => Object.fromEntries(Object.entries(value).filter(([key]) =>
  /(?:RetryMs|impactOffsetMs|lifetimeMs|regenerationMs|deployedDurationMs|deployIntervalMs|minDeployDistance|orbitPeriodMs|frameCount|frameRate)$/.test(key))));

test("accepted6D1 baseline remains intact; only the requested SPIKE S8 radius differs and equipment/Stage/vendor bytes stay unchanged", () => {
  const baseline = path.join(root, ".tmp_umbra_phase6d2/2026-09-08-start/baseline");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(baseline, "game.js"))).digest("hex"),
    "a61a85788ce07d2ac67124f9b9cedadc9a5306e8a2b8bc33b64e2084ee66f90c");
  const old = fs.readFileSync(path.join(baseline, "skillDefinitions.js"), "utf8");
  const radiusRow = "impactRadius: [90, 100, 110, 122, 135, 147, 160]";
  assert.equal(old.split(radiusRow).length, 2);
  assert.equal(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), old.replace(radiusRow, radiusRow.replace("160]", "240]")));
  for (const name of ["equipmentDefinitions.js", "stageDefinitions.js", "vendor/phaser.min.js"])
    assert.ok(fs.readFileSync(path.join(root, name)).equals(fs.readFileSync(path.join(baseline, name))));
});

for (const [fixtureId, expected] of [["baseline", [750, 725, 650]], ["medium", [683, 660, 593]], ["deep", [604, 585, 527]]])
test(`${fixtureId}: S1/S4/S8 Moon examples use the real fixture SENSOR once`, () => {
  const f = equipment({ fixtureId, loadout: equip[fixtureId]() }), s = f.scene;
  for (const [index, stage] of [1, 4, 8].entries()) {
    for (const id of ids) base.live.selectStage(s, f.api, id, stage);
    assert.equal(s.getUmbraMoonlightRehitIntervalMs(), expected[index]);
  }
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});

for (const fixtureId of ["baseline", "medium", "deep"]) test(`${fixtureId}: all stages/four periods use T0 then unrounded Core x SENSOR and each own floor`, () => {
  for (const core of [null, "assault", "control", "reactor"]) {
    const f = equipment({ fixtureId, cores: [core, core, core], loadout: equip[fixtureId]() }), s = f.scene;
    const sensor = s.getUmbraEquipmentSnapshot().sensorMultiplier;
    for (let stage = 1; stage <= 8; stage++) {
      for (const id of ids) base.live.selectStage(s, f.api, id, stage);
      const beforeTimes = nonAttackTimes(stats(s));
      for (const fire of [700, 540, 513, 482, 400, 333, 176, 163, 160, 0]) {
        s.stats.fireInterval = fire;
        const c = s.getUmbraActiveSkillStage(M), reactor = core === "reactor" && stage >= 4 ? .9 : 1;
        assert.deepEqual(periods(s), [expectedPeriod(c.rehitBaseMs, 200, fire, reactor, sensor),
          expectedPeriod(1800, 500, fire, reactor, sensor), expectedPeriod(900, 300, fire, 1, sensor),
          expectedPeriod(500, 200, fire, 1, sensor)]);
        assert.deepEqual(nonAttackTimes(stats(s)), beforeTimes, "SENSOR/Fire cannot change lifetimes, geometry or retry/regen/animation");
      }
    }
  }
});

test("SENSOR1 matches the old Core result; Core then SENSOR has no intermediate rounding", () => {
  const f = equipment({ cores: ["reactor", "reactor", "reactor"], loadout: equipmentData("SR", 3, 5) }), s = f.scene;
  s.stats.fireInterval = 400;
  const t0 = 484; // S8 Moon: round(200 + 450 * 240/380).
  assert.equal(s.getUmbraMoonlightRehitIntervalMs(), Math.round(t0 * .9 * .96));
  assert.notEqual(Math.round(t0 * .9 * .96), Math.round(Math.round(t0 * .9) * .96));
  const neutral = equipment({ cores: ["reactor", "reactor", "reactor"], loadout: equipmentData() }).scene;
  neutral.stats.fireInterval = 400;
  assert.deepEqual(periods(neutral), [Math.round(484 * .9), Math.round(1321 * .9), 679, 389]);
});

test("specified S8 ASSAULT/EXECUTION strong main path is A23/9/6 -> OVL28/11/7 -> ARM40/16/10", () => {
  const s = equipment({ cores: ["assault", "assault", "assault"], finals: ["execution", "execution", "execution"],
    loadout: equipmentData("LEGEND", 5, 20) }).scene;
  const enemy = { active: true, isBoss: true, hp: 100, maxHp: 100 };
  for (const [index, id] of ids.entries()) {
    const profile = s.getUmbraSkillFinalProfile(id), A = s.getUmbraFinalMainRawDamage(profile, enemy, 0);
    const gear = s.getUmbraEquipmentCombatProfile(id, 2), breakdown = s.getUmbraEquipmentDamageBreakdown(A, gear);
    assert.deepEqual(plain(breakdown), { inputRaw: [23, 9, 6][index], overlimitRaw: [28, 11, 7][index], equipmentRaw: [40, 16, 10][index] });
    assert.equal(s.applyRunEquipmentPlayerSkillDamageBonus(id, A, gear), breakdown.equipmentRaw);
    assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[id], 0);
  }
});

test("specified PRISM secondary path computes its own A then B6/3/2 -> OVL7/4/2 -> ARM10/6/3", () => {
  const s = equipment({ cores: ["assault", "assault", "assault"], finals: ["prism", "prism", "prism"],
    loadout: equipmentData("LEGEND", 5, 20) }).scene;
  for (const [index, id] of ids.entries()) {
    const profile = s.getUmbraSkillFinalProfile(id), raw = s.getUmbraFinalSecondaryRawDamage(profile, { hp: 1, maxHp: 10 }, [ .35, .40, .40 ][index]);
    const breakdown = s.getUmbraEquipmentDamageBreakdown(raw, s.getUmbraEquipmentCombatProfile(id, 2));
    assert.deepEqual(plain(breakdown), { inputRaw: [6, 3, 2][index], overlimitRaw: [7, 4, 2][index], equipmentRaw: [10, 6, 3][index] });
  }
});

test("mixed Execution TRIAD judges each secondary enemy before B and gear; parent HP loss is never its raw", () => {
  const s = equipment({ cores: ["assault", "assault", "assault"], finals: ["prism", "execution", "execution"],
    loadout: equipmentData("LEGEND", 5, 20) }).scene;
  s.stats.bulletDamage = 12;
  const profile = s.getUmbraSkillFinalProfile(M), gear = s.getUmbraEquipmentCombatProfile(M, 2);
  const weak = { hp: 1, maxHp: 10 }, strong = { hp: 100, maxHp: 100 };
  const results = [weak, strong].map(target => {
    const A = s.getUmbraFinalMainRawDamage(profile, target, 0), B = s.getUmbraFinalSecondaryRawDamage(profile, target, .35);
    assert.equal(B, Math.round(A * .35));
    return s.getUmbraEquipmentDamageBreakdown(B, gear).equipmentRaw;
  });
  assert.ok(results[1] > results[0]);
  assert.equal(profile.addedRaw, 23);
});

test("small raw grid preserves OVL I and II additive levels and both separate integer roundings", () => {
  const s = equipment().scene;
  for (let raw = 1; raw <= 50; raw++) for (const ovl of [1, 1.1, 1.2]) for (const arm of [1, 1.186, 1.42]) {
    const result = s.getUmbraEquipmentDamageBreakdown(raw, { overlimitMultiplier: ovl, armamentMultiplier: arm });
    assert.equal(result.overlimitRaw, Math.round(raw * ovl));
    assert.equal(result.equipmentRaw, Math.max(1, Math.round(Math.round(raw * ovl) * arm)));
  }
  assert.equal(s.getUmbraEquipmentDamageBreakdown(0, { overlimitMultiplier: 1.2, armamentMultiplier: 1.42 }).equipmentRaw, 0);
  assert.equal(s.getUmbraEquipmentDamageBreakdown(-1, { overlimitMultiplier: 1.2, armamentMultiplier: 1.42 }).equipmentRaw, 0);
  assert.equal(s.getUmbraEquipmentDamageBreakdown(3, { overlimitMultiplier: 1.1, armamentMultiplier: 1.42 }).equipmentRaw, 4);
  assert.equal(s.getUmbraEquipmentDamageBreakdown(3, { overlimitMultiplier: 1.2, armamentMultiplier: 1.42 }).equipmentRaw, 6);
});

test("medium Fire5 reaches all final floors at fire163, removes6th without rewriting raw fire or granting extra changes", () => {
  const s = equipment({ fixtureId: "medium", loadout: equip.medium() }).scene;
  for (let count = 0; count < 5; count++) {
    const before = s.stats.fireInterval, card = s.getPassiveUpgradeChoices().find(item => item.id === "rapidSigil");
    assert.ok(card); card.onSelect(); assert.equal(s.stats.fireInterval, before - 70);
  }
  assert.equal(s.stats.fireInterval, 163); assert.deepEqual(periods(s), [200, 500, 300, 200]);
  for (let read = 0; read < 5; read++) assert.equal(s.getPassiveUpgradeChoices().some(item => item.id === "rapidSigil"), false);
  assert.equal(s.stats.fireInterval, 163);
});

test("unowned Spike cannot justify ineffective Fire; its real Unlock eligibility restores a candidate", () => {
  const f = equipment({ loadout: equip.deep() }), s = f.scene;
  s.stats.fireInterval = 176;
  const spike = s.playerSkills[B], nova = s.playerSkills[N]; delete s.playerSkills[B]; delete s.playerSkills[N];
  s.refreshUmbraTriadSnapshot("NUMERIC_UNACQUIRED");
  assert.equal(s.getUmbraMoonlightRehitIntervalMs(), 200);
  assert.equal(s.getPassiveUpgradeChoices().some(item => item.id === "rapidSigil"), false);
  s.playerSkills[B] = spike; base.live.selectStage(s, f.api, B, 1); s.refreshUmbraTriadSnapshot("NUMERIC_UNLOCK");
  const fire = s.getPassiveUpgradeChoices().find(item => item.id === "rapidSigil");
  assert.ok(fire); assert.equal(s.getUmbraBloodSpikeIntervalMs(), 504);
  assert.equal(s.stats.fireInterval, 176); s.playerSkills[N] = nova;
});

test("all Nova REGEN still evaluates future regular pulse and next deployment, without changing any deadline", () => {
  const f = equipment({ acquired: [N], stage: 8, loadout: equip.medium() }), s = f.scene;
  s.umbraPhantomNovaRuntime.slots = [{ state: "REGENERATING", regenerateAtMs: 8765, nextPulseAtMs: 8888, phaseOffset: 1.5 }];
  const before = plain(s.umbraPhantomNovaRuntime.slots), stat = s.stats.fireInterval;
  const card = s.getPassiveUpgradeChoices().find(item => item.id === "rapidSigil");
  assert.ok(card); assert.ok(card.verificationIntervalReductionMs > 0); assert.equal(s.stats.fireInterval, stat);
  assert.deepEqual(plain(s.umbraPhantomNovaRuntime.slots), before);
});

test("canonical unowned Unlock predicts SENSOR periods without granting an attack profile or reading any saved equipment", () => {
  const f = equipment({ acquired: [M], stage: 1, loadout: equip.medium() }), s = f.scene;
  const spike = s.getUmbraBloodSpikeEffectiveStats(f.api.skills[B].stages[0]);
  const nova = s.getUmbraPhantomNovaEffectiveStats(f.api.skills[N].stages[0]);
  assert.equal(spike.intervalMs, 1728); assert.equal(nova.orbitIntervalMs, 864); assert.equal(nova.deployedIntervalMs, 480);
  assert.equal(s.getUmbraEquipmentCombatProfile(B), null); assert.equal(s.getUmbraEquipmentCombatProfile(N), null);
  assert.equal(s.getUmbraBloodSpikeIntervalMs(), Infinity); assert.equal(s.getUmbraPhantomNovaIntervalMs(), Infinity);
  assert.equal(s.getUmbraBloodSpikeEffectiveStats({ ...f.api.skills[B].stages[0] }), null);
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});

test("snapshot damage uses captured OVL after later state update and rejects a foreign run snapshot", () => {
  const s = equipment({ cores: ["assault", "assault", "assault"], finals: ["execution", "execution", "execution"], loadout: equip.deep() }).scene;
  const old = s.getUmbraSkillFinalProfile(M), oldValue = s.getUmbraEquipmentAttackDamage(M, 23, old);
  assert.ok(Object.isFrozen(old.equipmentProfile));
  s.umbraEquipmentState.overlimitLevels = Object.freeze({ [M]: 2, [B]: 0, [N]: 0 }); s.umbraEquipmentState.overlimitRevision++;
  assert.equal(s.getUmbraEquipmentAttackDamage(M, 23, old), oldValue);
  assert.equal(s.getUmbraEquipmentAttackDamage(M, 23, s.getUmbraSkillFinalProfile(M)), 40);
  assert.equal(s.getUmbraEquipmentAttackDamage(M, 0, old), 0);
  const forged = { ...old, equipmentProfile: { ...old.equipmentProfile, equipmentSnapshotId: "foreign-run" } };
  assert.equal(s.getUmbraEquipmentAttackDamage(M, 23, forged), 0);
});

test("new Reactor/Core/Final cards use the equipment rounding helper and preserve sharedstat single application", () => {
  const s = equipment({ cores: ["assault", "assault", "assault"], finals: ["execution", "execution", "execution"], loadout: equip.deep() }).scene;
  const before = s.stats.bulletDamage, snapshot = plain(s.getUmbraEquipmentSnapshot());
  const card = s.getPassiveUpgradeChoices().find(item => item.id === "overchargeBolt");
  assert.ok(card.cardDescription.includes("MOON E 強33→36"), card.cardDescription);
  assert.ok(card.cardDescription.includes("NOVA周回 E"));
  assert.deepEqual(plain(s.getUmbraEquipmentSnapshot()), snapshot); assert.equal(s.stats.bulletDamage, before);
  card.onSelect(); assert.equal(s.stats.bulletDamage, before + 1);
  assert.ok(s.buildUmbraCoreCard(M, "assault").chips.some(chip => chip.label.includes("受付前E")));
  assert.ok(s.buildUmbraFinalCard(M, "execution").chips.some(chip => /A 強.*E 強/.test(chip.label)));
  assert.ok(s.buildUmbraFinalCard(M, "prism").chips.some(chip => /副受付前.*E強/.test(chip.label)));
  assert.ok(s.buildUmbraFinalCard(M, "singularity").chips.some(chip => chip.label.includes("ダメージ0")));
});

test("6A upper composition is a separate pure input, never a naturalLv25 or freeReactor10 completion", () => {
  const s = equipment({ fixtureId: "deep", cores: ["assault", "assault", "assault"], finals: ["execution", "execution", "execution"], loadout: equip.deep() }).scene;
  s.stats.bulletDamage = 11; // Explicit arithmetic-only Reactor10 input; no XP/selection claim.
  const profile = s.getUmbraSkillFinalProfile(M), A = s.getUmbraFinalMainRawDamage(profile, { hp: 100, maxHp: 100 }, 0);
  const stages = s.getUmbraEquipmentDamageBreakdown(A, s.getUmbraEquipmentCombatProfile(M, 2));
  assert.equal(profile.addedRaw, 22); assert.deepEqual(plain(stages), { inputRaw: 42, overlimitRaw: 50, equipmentRaw: 71 });
  assert.ok(Math.abs(s.scalePlayerDamage(71) - 188.86) < 1e-9);
  assert.equal(s.getUmbraEquipmentSnapshot().overlimitLevels[M], 0);
});
