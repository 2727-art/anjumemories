"use strict";
// REGALIA Counter Pulse (docs/regalia-kit-design.md 5, R3): stage table, the automatic wave, the
// counter wave on an accepted hit, pausing, the S5 shield-break wave, the S8 echo, cleanup, the
// counter's own visuals and light camera shake (12.5), the guard shields (12.6) and the level-up
// card text. The hit -> counter path through applyDamageToPlayer is checked in the
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
  const { scene, api } = fixture();
  owned(scene, api, 8);
  scene.tweens = { add() { return {}; }, killTweensOf() {} }; // keep the visuals alive
  scene.triggerRegaliaCounterPulse();
  assert.equal(scene.regaliaCounterPulseState.echoes.length, 1);
  const objects = Array.from(scene.regaliaPulseFxObjects);
  assert.equal(objects.length, 5, "flash, crest, gold ring, second ring, COUNTER");
  scene.clearRegaliaKitEffects("test");
  assert.equal(scene.regaliaCounterPulseState.echoes.length, 0);
  assert.equal(scene.regaliaPulseFxObjects.size, 0);
  assert.ok(objects.every(object => object.active === false), "every object destroyed");
});

// Keeps every tween (and the objects they would destroy) so the visuals can be inspected.
function holdTweens(scene) {
  const tweens = [];
  scene.tweens = { add(config) { tweens.push(config); return {}; }, killTweensOf() {} };
  return tweens;
}

test("a counter shows the flash, the crest, the gold ring, a second ring and COUNTER; other waves keep the blue ring", () => {
  const { scene, api, calls } = fixture();
  owned(scene, api, 8);
  scene.textures = { exists: () => true, getFrame: () => ({ width: 128, height: 160 }) };
  const tweens = holdTweens(scene);
  const config = api.pulseConfig.counter;
  scene.time.now = 1000;
  scene.triggerRegaliaCounterPulse();
  assert.deepEqual(calls.visuals, ["graphics", config.emblem.key, config.ring.key, "graphics", "text:COUNTER"]);
  const [flash, emblem, ring, second, text] = Array.from(scene.regaliaPulseFxObjects);
  // On the ground under enemies (18) and the mech (20); the text above them, under the damage numbers (30).
  for (const object of [flash, emblem, ring, second]) assert.ok(object.sets.setDepth[0] < 18);
  assert.ok(emblem.sets.setDepth[0] < ring.sets.setDepth[0], "the crest under the ring");
  assert.equal(text.sets.setDepth[0], 29);
  // The crest is 150 px out to its rim (184 px in the image); the ring meets the S8 radius 200.
  const emblemGrow = tweens.find(tween => tween.targets === emblem && "scale" in tween);
  assert.equal(emblemGrow.scale, 150 / 184);
  const ringGrow = tweens.find(tween => tween.targets === ring && "scale" in tween);
  assert.deepEqual([ringGrow.scale, ringGrow.duration], [1, 450]);
  const secondGrow = tweens.find(tween => tween.targets === second && "scale" in tween);
  assert.equal(secondGrow.delay, 60, "the second ring follows 0.06 s later");
  assert.equal(second.sets.setAlpha[0], 0, "hidden until its delay ends");
  assert.equal(text.text, "COUNTER");

  // The automatic wave and the S8 echo keep the blue ring alone.
  calls.visuals.length = 0;
  scene.regaliaPulseFxObjects.clear();
  scene.regaliaCounterPulseState.echoes = []; // the counter's own echo is checked below
  scene.updateRegaliaCounterPulseSkill(scene.playerSkills[PULSE], stage(api, 8), 1800);
  const waves = () => calls.visuals.filter(key => key !== "graphics" && !key.startsWith("regalia-guard-v2-"));
  assert.deepEqual(waves(), [api.pulseConfig.ring.key], "the guard shields aside, only the blue ring");
  calls.visuals.length = 0;
  scene.updateRegaliaCounterPulseEchoes(200);
  assert.ok(waves().length >= 1 && waves().every(key => key === api.pulseConfig.ring.key));
});

test("without the images the counter draws its crest and rings with Graphics", () => {
  const { scene, api, calls } = fixture();
  owned(scene, api, 1);
  holdTweens(scene);
  let fallbackRadius = 0;
  const draw = scene.drawRegaliaCounterFallbackEmblem;
  scene.drawRegaliaCounterFallbackEmblem = function (graphics, radius, color) {
    fallbackRadius = radius;
    return draw.call(this, graphics, radius, color);
  };
  scene.triggerRegaliaCounterPulse();
  assert.deepEqual(calls.visuals, ["graphics", "graphics", "graphics", "graphics", "text:COUNTER"]);
  assert.equal(fallbackRadius, 150);
});

test("a counter that hits a crowd shakes the camera lightly; small counters and other waves do not", () => {
  const crowd = (count) => Array.from({ length: count }, (_, index) => enemy(`e${index}`, 1000 + 40 + index, 1000));
  for (const [count, shakes] of [[9, 0], [10, 1]]) {
    const { scene, api, calls } = fixture();
    owned(scene, api, 1);
    scene.enemyList.push(...crowd(count));
    scene.triggerRegaliaCounterPulse();
    assert.deepEqual(plain(calls.shakes), shakes ? [[90, 0.0011]] : [], `${count} hits`);
  }
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 8);
  scene.enemyList.push(...crowd(20));
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 16); // automatic wave
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 200); // its echo
  assert.ok(calls.damage.length >= 40);
  assert.deepEqual(plain(calls.shakes), [], "the automatic wave and its echo never shake");
});

test("a Counter Pulse sortie loads the counter ring and the crest with the other pulse images", () => {
  const { scene, api, calls } = fixture();
  scene.loadRegaliaCounterPulseAssets();
  const config = api.pulseConfig;
  const guards = ["se", "s", "sw"].map(facing => `${config.guard.image.keyPrefix}${facing}`);
  assert.deepEqual(calls.loads.sort(), [config.counter.emblem.key, config.counter.ring.key, config.icon.key, config.ring.key, ...guards].sort());
});

test("the level-up cards name the guard shields, range, interval and counter multiplier", () => {
  const { scene, api } = fixture();
  const definition = api.skills[PULSE];
  const card = (from, to) => scene.buildLevelUpCardModel({
    type: "skill", skillId: PULSE, definition, actionType: from ? "upgrade" : "unlock",
    currentStage: from ? stage(api, from) : null, nextStage: stage(api, to)
  }, 0);
  const unlock = card(0, 1);
  assert.equal(unlock.title, "Counter Pulse");
  assert.equal(unlock.description, "回る盾が攻撃を防ぎ、反撃波を返す");
  assert.deepEqual(plain(unlock.chips.map(chip => chip.label)), ["威力 4", "身代わり盾 1", "範囲 120", "自動間隔 3.2秒"]);
  const s3 = card(2, 3);
  assert.equal(s3.description, "威力 5 → 7\n身代わり盾 1 → 2");
  for (const label of ["身代わり盾 +1", "盾の復活 -0.5秒", "反撃倍率 +0.1"]) assert.ok(s3.chips.some(chip => chip.label === label), label);
  const s5 = card(4, 5);
  assert.equal(s5.description, "威力 9 → 11\n身代わり盾 2 → 3");
  assert.deepEqual(plain(s5.newEffects), ["盾連動：砕けた盾からも反撃波"]);
  assert.deepEqual(plain(card(7, 8).newEffects), ["二重波：直後に威力50%の追撃波"]);
});

// --- Guard shields (docs/regalia-kit-design.md 12.6) ---------------------------------------------

test("the guard shields grow from one to four and come back faster", () => {
  const { api } = fixture();
  const stages = api.skills[PULSE].stages;
  assert.deepEqual(plain(stages.map(s => s.guardShieldCount)), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.deepEqual(plain(stages.map(s => s.guardRegenMs)), [10000, 9500, 9000, 8500, 7500, 7000, 6000, 5000]);
});

test("a ready shield takes a hit instead of AP: i-frames, a counter wave, then it comes back", () => {
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 1);
  scene.enemyList.push(enemy("near", 1050, 1000));
  scene.time.now = 5000;
  assert.equal(scene.getReadyRegaliaGuardCount(), 1);
  assert.equal(scene.tryRegaliaGuardAbsorb("enemyContact"), true);
  assert.equal(scene.getReadyRegaliaGuardCount(), 0);
  assert.equal(scene.invincibleUntil, 5900, "the same 0.9 s as a hit");
  assert.deepEqual(calls.damage.map(hit => hit.damage), [6], "the counter wave (4 x 1.5)");
  assert.equal(scene.tryRegaliaGuardAbsorb("enemyContact"), false, "no shield left");
  // 10 s at S1 with no passives or gear
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 9999);
  assert.equal(scene.getReadyRegaliaGuardCount(), 0);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 1);
  assert.equal(scene.getReadyRegaliaGuardCount(), 1);
});

test("the hit path through applyDamageToPlayer leaves AP untouched while a shield is ready", () => {
  const { scene, api, calls } = fixture();
  owned(scene, api, 3);
  scene.time.now = 2000;
  scene.invincibleUntil = 0;
  scene.stats = { maxHp: 200, hp: 200 };
  scene.getOverdriveModDamageTakenMultiplier = () => 1;
  scene.getRunEquipmentDamageTakenMultiplier = () => 1;
  scene.shouldNegatePlayerDamageByAcEvade = () => false;
  scene.applyRobotBarrierToIncomingDamage = () => assert.fail("the hit must not reach the barrier or AP");
  assert.equal(scene.applyDamageToPlayer(150, { source: "enemyContact" }), false);
  assert.equal(scene.stats.hp, 200);
  assert.equal(scene.getReadyRegaliaGuardCount(), 1, "two shields at S3, one used");
  assert.equal(scene.applyDamageToPlayer(150, { source: "enemyContact" }), false, "inside the i-frames");
  assert.equal(scene.getReadyRegaliaGuardCount(), 1);
  assert.equal(calls.shakes.length, 0);
});

test("a stage up adds ready shields and keeps the used ones counting down", () => {
  const { scene, api } = fixture();
  const state = owned(scene, api, 2);
  scene.tryRegaliaGuardAbsorb();
  state.stageIndex = 2;
  state.currentStage = stage(api, 3);
  const slots = scene.getRegaliaGuardSlots(state);
  assert.deepEqual(plain(slots.map(slot => slot.ready)), [false, true]);
  assert.equal(slots[0].regenLeftMs, 9500, "the S2 timer it started with");
});

test("no guard and no regen while the game is paused or during the Final Raid", () => {
  const { scene, api } = fixture();
  const state = owned(scene, api, 1);
  scene.tryRegaliaGuardAbsorb();
  for (const flag of ["levelUpActive", "gateChoiceActive", "shopActive", "gameOver", "extractionComplete"]) {
    scene[flag] = true;
    scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 20000);
    scene[flag] = false;
  }
  assert.equal(scene.getReadyRegaliaGuardCount(), 0, "the timer does not run while paused");
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 1), 10000);
  assert.equal(scene.getReadyRegaliaGuardCount(), 1);
  scene.isFinalBossRaidActive = () => true;
  assert.equal(scene.tryRegaliaGuardAbsorb(), false);
});

test("ready shields push touching enemies away from the mech; bosses and used shields do not", () => {
  const { scene, api } = fixture();
  const state = owned(scene, api, 3);
  const impacts = [];
  scene.applyEnemyImpact = (target, impact) => impacts.push([target.name, impact.sourceX, impact.sourceY, impact.force]);
  const [first, second] = scene.getRegaliaGuardPoints(state, 2);
  scene.enemyList.push(
    enemy("at the first", first.x + 10, first.y),
    enemy("boss", first.x, first.y + 5, { isBoss: true }),
    enemy("at the second", second.x, second.y),
    enemy("far", 1000, 1400)
  );
  scene.getRegaliaGuardSlots(state);
  state.regaliaGuardSlots[1].ready = false;
  state.regaliaGuardSlots[1].regenLeftMs = state.regaliaGuardSlots[1].regenTotalMs = 9000;
  assert.equal(scene.pushEnemiesFromRegaliaGuards([first]), 1);
  assert.deepEqual(impacts, [["at the first", 1000, 1000, 160]], "outwards from the mech");
  scene.time.now = 100;
  assert.equal(scene.pushEnemiesFromRegaliaGuards([first]), 0, "0.3 s between pushes on the same enemy");
  scene.time.now = 400;
  assert.equal(scene.pushEnemiesFromRegaliaGuards([first]), 1);
  // the update pushes only from ready shields (the second is used)
  impacts.length = 0;
  scene.time.now = 2000;
  state.regaliaGuardAngle = 0;
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 3), 1);
  assert.ok(impacts.every(([name]) => name !== "at the second"));
});

test("the shields orbit with the cross showing, north behind the mech, used ones faint; cleanup clears them", () => {
  const { scene, api, calls } = fixture();
  const state = owned(scene, api, 8);
  scene.textures = { exists: () => true, getFrame: () => ({ width: 128, height: 160 }) };
  holdTweens(scene);
  scene.tryRegaliaGuardAbsorb();
  state.regaliaGuardAngle = 0;
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 1);
  const visuals = scene.regaliaGuardVisuals;
  assert.equal(visuals.length, 4);
  const config = api.pulseConfig.guard;
  // slot 0 sits east, 1 south, 2 west, 3 north (the orbit turned a little in this frame)
  assert.deepEqual(plain(visuals.map(visual => visual.facing)), ["se", "s", "sw", "s"]);
  assert.deepEqual(plain(visuals.map(visual => visual.sprite.sets.setDepth[0])), [config.depthFront, config.depthFront, config.depthBehind, config.depthBehind]);
  assert.ok(visuals[0].sprite.sets.setAlpha[0] < 0.5, "the used shield is faint");
  assert.equal(visuals[1].sprite.sets.setAlpha[0], 1);
  assert.equal(visuals[0].glow.sets.setVisible[0], false);
  assert.ok(calls.visuals.includes(`${config.image.keyPrefix}se`));
  const objects = visuals.flatMap(visual => [visual.sprite, visual.glow]);
  scene.clearRegaliaKitEffects("test");
  assert.ok(objects.every(object => object.active === false));
  assert.equal(scene.regaliaGuardVisuals, null);
  scene.updateRegaliaCounterPulseSkill(state, stage(api, 8), 1);
  assert.equal(scene.regaliaGuardVisuals.length, 4, "drawn again after a Depth change");
  assert.equal(scene.getReadyRegaliaGuardCount(), 3, "the used shield is still coming back");
});
