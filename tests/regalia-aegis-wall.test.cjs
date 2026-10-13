"use strict";
// REGALIA Aegis Wall (docs/regalia-kit-design.md 4, R2): stage table, the ?debugRegaliaKit=1 slot
// swap, the territory ring layout, shield durability and erosion, bosses breaking shields, thorns,
// the plant impact, lifetime, pausing, redeploy/cleanup, and the level-up card text.
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, plain, enemy, skillStateAt } = require("./regalia-kit-fixture.cjs");
const AEGIS = "regaliaAegisWall";

const stage = (api, number) => api.skills[AEGIS].stages[number - 1];
const skillState = (scene, api, number = 1) => skillStateAt(scene, api, AEGIS, number);

test("the stage table follows the approved territory values", () => {
  const { api, scene } = fixture();
  const definition = api.skills[AEGIS];
  assert.equal(definition.exclusiveToMechId, "regaliaBastion");
  assert.equal(scene.isSkillRuntimeBehaviorImplemented(definition), true);
  assert.deepEqual(plain(definition.stages.map(s => [s.shieldCount, s.territoryRadius])),
    [[4, 200], [4, 210], [5, 220], [5, 235], [6, 250], [7, 265], [8, 280], [10, 300]]);
  assert.deepEqual(plain(definition.stages.map(s => s.thornDamage)), [0, 0, 0, 0, 0, 3, 4, 6]);
  for (const s of definition.stages) assert.equal(s.textureKey, undefined, "no sortie preload for the shield images");
});

test("Aegis Wall and Counter Pulse take REGALIA's slots only with ?debugRegaliaKit=1", () => {
  const normal = fixture().scene;
  assert.deepEqual(plain(normal.getPlayerSkillSlotIds("regaliaBastion")), ["regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"]);
  assert.equal(normal.isSkillAvailableForPlayerMech(AEGIS, "regaliaBastion"), false);

  const debug = fixture({ debug: true }).scene;
  assert.deepEqual(plain(debug.getPlayerSkillSlotIds("regaliaBastion")), ["regaliaBastionCannon", AEGIS, "regaliaCounterPulse"]);
  assert.equal(debug.isSkillAvailableForPlayerMech("rabbitThunderSkill", "regaliaBastion"), false);
  assert.equal(debug.isSkillAvailableForPlayerMech(AEGIS, "regaliaBastion"), true);
  assert.equal(debug.isSkillAvailableForPlayerMech("tornadoSkill", "regaliaBastion"), false);
  assert.deepEqual(plain(debug.getPlayerSkillSlotIds("defaultBear")), ["basicSkill", "tornadoSkill", "rabbitThunderSkill"]);
  assert.equal(debug.isSkillAvailableForPlayerMech(AEGIS, "defaultBear"), false);
});

test("shields ring the mech evenly, the first one towards the facing direction", () => {
  const { scene, api } = fixture();
  const center = { x: 0, y: 0 };
  const s1 = scene.getRegaliaAegisWallLayout(stage(api, 1), center, Math.PI / 2);
  assert.equal(s1.length, 4);
  assert.ok(Math.abs(s1[0].x) < 1e-9 && Math.abs(s1[0].y - 200) < 1e-9, "first shield straight down the facing");
  for (const spot of s1) assert.ok(Math.abs(Math.hypot(spot.x, spot.y) - 200) < 1e-9);
  const s8 = scene.getRegaliaAegisWallLayout(stage(api, 8), center, 0);
  assert.equal(s8.length, 10);
  assert.ok(Math.abs(s8[1].angle - s8[0].angle - Math.PI / 5) < 1e-9);
  assert.equal(scene.getRegaliaAegisShieldDurability(stage(api, 1)), 60, "30% of 200 max AP");
  assert.equal(scene.getRegaliaAegisShieldDurability(stage(api, 8)), 160);
});

test("a deployment plants three static circles per shield and replaces the previous ring", () => {
  const { scene, api, calls, group } = fixture({ debug: true });
  const state = skillState(scene, api, 1);
  assert.equal(scene.deployRegaliaAegisWall(state, stage(api, 1)), true);
  assert.equal(scene.regaliaAegisWallState.shields.length, 4);
  assert.equal(group.children.size, 12);
  for (const zone of group.children) assert.equal(zone.body.radius, api.config.bodyRadius);
  assert.deepEqual(calls.loads.sort(), [api.config.crack.key, api.config.shield.key].sort(), "images load on demand");

  const first = scene.regaliaAegisWallState.shields.slice();
  scene.deployRegaliaAegisWall(state, stage(api, 3));
  assert.equal(scene.regaliaAegisWallState.shields.length, 5);
  assert.equal(group.children.size, 15, "the old ring's bodies are gone");
  assert.ok(first.every(shield => shield.broken && shield.bodies.length === 0));

  scene.clearRegaliaAegisWall("test");
  assert.equal(group.children.size, 0);
  assert.equal(scene.regaliaAegisWallState.shields.length, 0);
});

test("pushing enemies wear the shield down by contact damage x 0.4 per second, once per frame", () => {
  const { scene, api } = fixture();
  const state = skillState(scene, api, 1);
  scene.deployRegaliaAegisWall(state, stage(api, 1));
  const shield = scene.regaliaAegisWallState.shields[0];
  const [zoneA, zoneB] = shield.bodies;
  const chaser = enemy("chaser", shield.x, shield.y - 20);
  assert.equal(scene.shouldRegaliaAegisBlockEnemy(chaser, zoneA), true);
  scene.handleRegaliaAegisContact(chaser, zoneA);
  scene.handleRegaliaAegisContact(chaser, zoneB); // same frame, another circle of the same shield
  assert.ok(Math.abs(shield.pendingErosion - 13 * 0.4) < 1e-9);
  scene.updateRegaliaAegisShields(16);
  assert.ok(Math.abs(shield.durability - (60 - 5.2)) < 1e-9);

  shield.durability = 1;
  scene.time.now += 16;
  scene.handleRegaliaAegisContact(chaser, zoneA);
  scene.updateRegaliaAegisShields(16);
  assert.equal(shield.broken, true);
  assert.equal(scene.regaliaAegisWallState.shields.includes(shield), false);
});

test("bosses are not blocked and break the shield they touch", () => {
  const { scene, api } = fixture();
  scene.deployRegaliaAegisWall(skillState(scene, api, 1), stage(api, 1));
  const shield = scene.regaliaAegisWallState.shields[0];
  const boss = enemy("boss", shield.x, shield.y, { isBoss: true });
  assert.equal(scene.shouldRegaliaAegisBlockEnemy(boss, shield.bodies[0]), false);
  assert.equal(shield.broken, true);
  assert.equal(shield.bodies.length, 3, "removed outside the physics step");
  scene.updateRegaliaAegisShields(16);
  assert.equal(shield.bodies.length, 0);
  assert.equal(scene.regaliaAegisWallState.shields.length, 3);
});

test("the plant impact hits enemies near each shield and pushes them out of the territory", () => {
  const { scene, api, calls } = fixture();
  scene.deployRegaliaAegisWall(skillState(scene, api, 1), stage(api, 1));
  const [shield] = scene.regaliaAegisWallState.shields;
  scene.enemyList.push(enemy("near", shield.x + 30, shield.y), enemy("far", shield.x + 200, shield.y + 200));
  scene.updateRegaliaAegisShields(100);
  assert.equal(calls.damage.length, 0, "not before the shield lands");
  scene.updateRegaliaAegisShields(100);
  const hits = calls.damage.filter(hit => hit.enemy === "near");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].damage, 8);
  assert.deepEqual([hits[0].impact.sourceX, hits[0].impact.sourceY], [1000, 1000], "knockback from the territory centre");
  assert.equal(calls.damage.some(hit => hit.enemy === "far"), false);
});

test("from S6 the shield hurts enemies pushing it every 0.5 s", () => {
  const { scene, api, calls } = fixture();
  scene.deployRegaliaAegisWall(skillState(scene, api, 6), stage(api, 6));
  const shield = scene.regaliaAegisWallState.shields[0];
  scene.updateRegaliaAegisShields(api.config.plantDelayMs);
  calls.damage.length = 0;
  const tank = enemy("tank", shield.x, shield.y - 30);
  scene.time.now = 1000;
  scene.handleRegaliaAegisContact(tank, shield.bodies[0]);
  scene.time.now = 1200;
  scene.handleRegaliaAegisContact(tank, shield.bodies[0]);
  scene.time.now = 1500;
  scene.handleRegaliaAegisContact(tank, shield.bodies[0]);
  assert.deepEqual(calls.damage.map(hit => hit.damage), [3, 3]);
});

test("shields sink at the end of their lifetime and nothing advances while paused", () => {
  const { scene, api } = fixture();
  const state = skillState(scene, api, 1);
  scene.updateRegaliaAegisWallSkill(state, stage(api, 1), 16);
  assert.equal(scene.regaliaAegisWallState.shields.length, 4, "first ring right after acquiring");
  assert.equal(state.regaliaAegisCooldownMs, 7000);

  scene.levelUpActive = true;
  scene.updateRegaliaAegisWallSkill(state, stage(api, 1), 6000);
  assert.equal(scene.regaliaAegisWallState.shields[0].lifetimeMs, 5000, "paused during the level-up cards");
  assert.equal(state.regaliaAegisCooldownMs, 7000);

  scene.levelUpActive = false;
  scene.updateRegaliaAegisWallSkill(state, stage(api, 1), 5000);
  assert.equal(scene.regaliaAegisWallState.shields.length, 0);
  assert.equal(scene.regaliaAegisWallState.territory, null);
  assert.equal(state.regaliaAegisCooldownMs, 2000);
});

test("the level-up cards name the shield count, territory and durability", () => {
  const { scene, api } = fixture({ debug: true });
  const definition = api.skills[AEGIS];
  const unlock = scene.buildLevelUpCardModel({ type: "skill", skillId: AEGIS, definition, actionType: "unlock", currentStage: null, nextStage: stage(api, 1) }, 0);
  assert.equal(unlock.title, "Aegis Wall");
  assert.equal(unlock.description, "盾を突き立てて機体を囲み、内側をテリトリーにする");
  assert.deepEqual(plain(unlock.chips.map(chip => chip.label)), ["威力 8", "盾の数 4", "テリトリー 200", "盾の耐久 30%"]);

  const upgrade = scene.buildLevelUpCardModel({ type: "skill", skillId: AEGIS, definition, actionType: "upgrade", currentStage: stage(api, 5), nextStage: stage(api, 6) }, 0);
  assert.equal(upgrade.description, "威力 18 → 22\n盾の数 6 → 7");
  assert.deepEqual(plain(upgrade.newEffects), ["棘盾：盾を押す敵に継続ダメージ"]);
  // A card with a new effect keeps four chips; the thorns are named by the new-effect line.
  assert.deepEqual(plain(upgrade.chips.map(chip => chip.label)), ["威力 +4", "盾の数 +1", "テリトリー +15", "盾の耐久 +10%"]);
});
