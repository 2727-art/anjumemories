"use strict";
// REGALIA Counter Pulse (docs/regalia-kit-design.md 5, R3): stage table, the automatic wave, the
// counter wave on an accepted hit, pausing, the S5 shield-break wave, the S8 echo, cleanup and the
// level-up card text. The hit -> counter path through applyDamageToPlayer is checked in the
// browser test (tests/regalia-aegis-browser.cjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, plain, enemy, skillStateAt } = require("./regalia-kit-fixture.cjs");
const PULSE = "regaliaCounterPulse";
const AEGIS = "regaliaAegisWall";

const stage = (api, number) => api.skills[PULSE].stages[number - 1];
// Owns Counter Pulse at `number` (and optionally Aegis Wall) the way a run does.
function owned(scene, api, number, withAegis = 0) {
  scene.playerSkills[PULSE] = skillStateAt(scene, api, PULSE, number);
  if (withAegis) scene.playerSkills[AEGIS] = skillStateAt(scene, api, AEGIS, withAegis);
  return scene.playerSkills[PULSE];
}

test("the stage table follows the design values", () => {
  const { api, scene } = fixture();
  const definition = api.skills[PULSE];
  assert.equal(definition.exclusiveToMechId, "regaliaBastion");
  assert.equal(scene.isSkillRuntimeBehaviorImplemented(definition), true);
  assert.deepEqual(plain(definition.stages.map(s => [s.autoIntervalMs, s.pulseRadius, s.damage, s.counterMultiplier, s.knockback])), [
    [3200, 120, 4, 1.5, 160], [3000, 128, 5, 1.5, 170], [2800, 136, 7, 1.6, 180], [2600, 146, 9, 1.6, 190],
    [2400, 156, 11, 1.7, 200], [2200, 168, 14, 1.8, 220], [2000, 182, 17, 1.9, 240], [1800, 200, 22, 2.0, 280]
  ]);
  assert.deepEqual(plain(definition.stages.map(s => s.shieldBreakRadiusRatio)), [0, 0, 0, 0, 0.7, 0.7, 0.7, 0.7]);
  assert.deepEqual(plain(definition.stages.map(s => s.echoDamageRatio)), [0, 0, 0, 0, 0, 0, 0, 0.5]);
  for (const s of definition.stages) assert.equal(s.textureKey, undefined, "no sortie preload for the pulse image");
});

test("the automatic wave hits enemies inside its radius and repeats on its interval", () => {
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 1);
  scene.enemyList.push(enemy("inside", 1100, 1000), enemy("outside", 1200, 1000));
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 16);
  assert.deepEqual(calls.damage.map(hit => [hit.enemy, hit.damage]), [["inside", 4]]);
  assert.deepEqual([calls.damage[0].impact.sourceX, calls.damage[0].impact.sourceY, calls.damage[0].impact.force], [1000, 1000, 160]);
  assert.equal(state.regaliaPulseTimerMs, 3200);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 3100);
  assert.equal(calls.damage.length, 1);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 100);
  assert.equal(calls.damage.length, 2);
});

test("an accepted hit fires a stronger wave at once and restarts the timer", () => {
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 1);
  state.regaliaPulseTimerMs = 500;
  scene.enemyList.push(enemy("near", 1050, 1000));
  scene.time.now = 5000;
  assert.equal(scene.triggerRegaliaCounterPulse("enemyContact"), true);
  assert.deepEqual(calls.damage.map(hit => hit.damage), [6], "4 x 1.5");
  assert.equal(state.regaliaPulseTimerMs, 3200);
  scene.time.now = 5200;
  assert.equal(scene.triggerRegaliaCounterPulse("enemyContact"), false, "300 ms gap between counters");
  scene.time.now = 5300;
  assert.equal(scene.triggerRegaliaCounterPulse("enemyContact"), true);
  assert.equal(calls.damage.length, 2);
});

test("no wave while the game is paused, and nothing without the skill", () => {
  const { scene, api, calls } = fixture();
  assert.equal(scene.triggerRegaliaCounterPulse(), false, "other mechs and REGALIA without the skill");
  const state = owned(scene, api, 1);
  scene.enemyList.push(enemy("near", 1050, 1000));
  for (const flag of ["levelUpActive", "gateChoiceActive", "shopActive", "gameOver", "extractionComplete"]) {
    scene[flag] = true;
    assert.equal(scene.triggerRegaliaCounterPulse(), false, flag);
    scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 5000);
    scene[flag] = false;
  }
  assert.equal(calls.damage.length, 0);
  assert.equal(state.regaliaPulseTimerMs, 0, "the timer does not run while paused");
});

test("from S5 a breaking Aegis Wall shield sends out a smaller wave where it stood", () => {
  for (const [pulseStage, expected] of [[4, 0], [5, 1]]) {
    const { scene, api, calls } = fixture();
    owned(scene, api, pulseStage, 1);
    scene.deployRegaliaAegisWall(scene.playerSkills[AEGIS], api.skills[AEGIS].stages[0]);
    const shield = scene.regaliaAegisWallState.shields[0];
    scene.updateRegaliaAegisShields(api.config.plantDelayMs); // plant first
    calls.damage.length = 0;
    // 100 px from the shield: inside 156 x 0.7 = 109, but 300 px from the mech
    scene.enemyList.push(enemy("by the shield", shield.x + 100, shield.y));
    scene.shouldRegaliaAegisBlockEnemy(enemy("boss", shield.x, shield.y, { isBoss: true }), shield.bodies[0]);
    scene.updateRegaliaAegisShields(16);
    const hits = calls.damage.filter(hit => hit.enemy === "by the shield");
    assert.equal(hits.length, expected, `pulse S${pulseStage}`);
    if (expected) {
      assert.equal(hits[0].damage, 11);
      assert.deepEqual([hits[0].impact.sourceX, hits[0].impact.sourceY], [shield.x, shield.y], "centred on the broken shield");
    }
  }
});

test("at S8 each wave around the mech repeats 0.15 s later at half damage", () => {
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 8);
  scene.enemyList.push(enemy("near", 1100, 1000));
  scene.time.now = 1000;
  scene.triggerRegaliaCounterPulse();
  assert.deepEqual(calls.damage.map(hit => hit.damage), [44], "22 x 2.0");
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 100);
  assert.equal(calls.damage.length, 1);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 60);
  assert.deepEqual(calls.damage.map(hit => hit.damage), [44, 22], "the echo, half of the counter wave");
  assert.equal(calls.damage[1].impact.force, 168);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 400);
  assert.equal(calls.damage.length, 2, "an echo does not echo");
  assert.equal(scene.regaliaCounterPulseState.echoes.length, 0);
});

test("cleanup drops pending echoes and wave visuals", () => {
  const { scene, api, calls } = fixture();
  owned(scene, api, 8);
  scene.tweens = { add() { return {}; }, killTweensOf() {} }; // keep the rings alive
  scene.triggerRegaliaCounterPulse();
  assert.equal(scene.regaliaCounterPulseState.echoes.length, 1);
  assert.equal(scene.regaliaPulseFxObjects.size, 1);
  assert.deepEqual(calls.visuals, ["graphics"], "Graphics without the pulse image");
  scene.clearRegaliaKitEffects("test");
  assert.equal(scene.regaliaCounterPulseState.echoes.length, 0);
  assert.equal(scene.regaliaPulseFxObjects.size, 0);
});

test("the level-up cards name range, interval and counter multiplier", () => {
  const { scene, api } = fixture();
  const definition = api.skills[PULSE];
  const card = (from, to) => scene.buildLevelUpCardModel({
    type: "skill", skillId: PULSE, definition, actionType: from ? "upgrade" : "unlock",
    currentStage: from ? stage(api, from) : null, nextStage: stage(api, to)
  }, 0);
  const unlock = card(0, 1);
  assert.equal(unlock.title, "Counter Pulse");
  assert.equal(unlock.description, "衝撃波を放ち、被弾すると反撃波を返す");
  assert.deepEqual(plain(unlock.chips.map(chip => chip.label)), ["威力 4", "範囲 120", "自動間隔 3.2秒", "反撃倍率 ×1.5"]);
  assert.ok(card(2, 3).chips.some(chip => chip.label === "反撃倍率 +0.1"));
  const s5 = card(4, 5);
  assert.equal(s5.description, "威力 9 → 11\n範囲 146 → 156");
  assert.deepEqual(plain(s5.newEffects), ["盾連動：砕けた盾からも反撃波"]);
  assert.deepEqual(plain(card(7, 8).newEffects), ["二重波：直後に威力50%の追撃波"]);
});
