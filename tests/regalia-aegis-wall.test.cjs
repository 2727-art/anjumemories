"use strict";
// REGALIA Aegis Wall (docs/regalia-kit-design.md 4): stage table, the ?debugRegaliaKit=1 slot swap,
// the wall layout (8 directions, straight line, no gaps, S8 wings), the image per direction,
// durability worn by the number of pushing enemies, bosses breaking shields, thorns, the plant
// impact, lifetime, pausing, redeploy/cleanup, and the level-up card text.
const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, plain, enemy, skillStateAt } = require("./regalia-kit-fixture.cjs");
const AEGIS = "regaliaAegisWall";

const stage = (api, number) => api.skills[AEGIS].stages[number - 1];
const skillState = (scene, api, number = 1) => skillStateAt(scene, api, AEGIS, number);
const near = (a, b) => Math.abs(a - b) < 1e-6;

test("the stage table follows the approved wall values", () => {
  const { api, scene } = fixture();
  const definition = api.skills[AEGIS];
  assert.equal(definition.exclusiveToMechId, "regaliaBastion");
  assert.equal(scene.isSkillRuntimeBehaviorImplemented(definition), true);
  assert.deepEqual(plain(definition.stages.map(s => [s.shieldCount, s.wallDistance, s.wingCount])),
    [[5, 190, 0], [5, 195, 0], [6, 200, 0], [7, 205, 0], [8, 210, 0], [9, 215, 0], [10, 220, 0], [11, 225, 2]]);
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

test("the wall stands on a straight line ahead, its facing snapped to the 8 directions", () => {
  const { scene, api } = fixture();
  const center = { x: 0, y: 0 };
  // facing slightly off south still builds a south wall (direction 2, screen angle 90 deg)
  const s1 = scene.getRegaliaAegisWallLayout(stage(api, 1), center, Math.PI / 2 + 0.3);
  assert.equal(s1.length, 5);
  assert.deepEqual(plain(s1.map(spot => Math.round(spot.x))), [152, 76, 0, -76, -152]);
  assert.ok(s1.every(spot => near(spot.y, 190) && spot.direction === 2 && near(spot.angle, Math.PI / 2)));
  // north-east (screen angle -45 deg) is direction 7
  const ne = scene.getRegaliaAegisWallLayout(stage(api, 1), center, -Math.PI / 4 - 0.2);
  assert.ok(ne.every(spot => spot.direction === 7));
  const middle = ne[2];
  assert.ok(near(Math.hypot(middle.x, middle.y), 190) && middle.x > 0 && middle.y < 0);
  assert.equal(scene.getRegaliaAegisShieldDurability(stage(api, 1)), 60, "30% of 200 max AP");
  assert.equal(scene.getRegaliaAegisShieldDurability(stage(api, 8)), 160);
});

test("the wall has no gap enemies can pass, and S8 bends both ends back towards the mech", () => {
  const { scene, api } = fixture({ debug: true });
  const { bodyRadius } = api.config;
  scene.deployRegaliaAegisWall(skillState(scene, api, 7), stage(api, 7));
  const circles = scene.regaliaAegisWallState.shields.flatMap(shield => shield.bodies.map(zone => [zone.x, zone.y]))
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const widestGap = Math.max(...circles.slice(1).map((c, i) => Math.hypot(c[0] - circles[i][0], c[1] - circles[i][1]))) - bodyRadius * 2;
  assert.ok(widestGap <= 0, `circles overlap along the wall (widest gap ${widestGap.toFixed(1)} px)`);

  const center = { x: 0, y: 0 };
  const s8 = scene.getRegaliaAegisWallLayout(stage(api, 8), center, -Math.PI / 2); // facing north
  assert.equal(s8.length, 11 + 4);
  const wings = s8.slice(11);
  assert.deepEqual(plain(wings.map(spot => spot.direction)), [7, 7, 5, 5], "wings face north-east and north-west");
  for (const spot of wings) assert.ok(spot.y > -225 && Math.abs(spot.x) > 380, "behind the front line, beyond its ends");
  const end = s8[10]; // right end of the front line, where the first (right) wing starts
  const firstWing = wings[0];
  assert.ok(near(Math.hypot(firstWing.x - end.x, firstWing.y - end.y), api.config.shieldPitch));
});

test("each shield uses the image for its direction; the strip marks the inside of the wall", () => {
  const { scene, api, calls } = fixture({ debug: true });
  scene.textures = { exists: () => true, getFrame: () => ({ width: 256, height: 320 }) };
  scene.playerRobotMotion.angle = -Math.PI / 2; // facing north: the shields show their backs
  scene.deployRegaliaAegisWall(skillState(scene, api, 8), stage(api, 8));
  const shieldImages = calls.visuals.filter(key => key.startsWith("regalia-aegis-shield-r2-"));
  assert.equal(shieldImages.length, 15);
  assert.deepEqual([...new Set(shieldImages)].sort(), ["regalia-aegis-shield-r2-n", "regalia-aegis-shield-r2-ne", "regalia-aegis-shield-r2-nw"]);
  assert.ok(scene.regaliaAegisWallState.territory, "territory strip");
});

test("a deployment plants three static circles per shield and replaces the previous wall", () => {
  const { scene, api, calls, group } = fixture({ debug: true });
  const state = skillState(scene, api, 1);
  assert.equal(scene.deployRegaliaAegisWall(state, stage(api, 1)), true);
  assert.equal(scene.regaliaAegisWallState.shields.length, 5);
  assert.equal(group.children.size, 15);
  for (const zone of group.children) assert.equal(zone.body.radius, api.config.bodyRadius);
  assert.deepEqual(calls.loads.sort(), [
    api.config.crack.key,
    ...["e", "n", "ne", "nw", "s", "se", "sw", "w"].map(name => `regalia-aegis-shield-r2-${name}`)
  ].sort(), "images load on demand, one per direction");

  const first = scene.regaliaAegisWallState.shields.slice();
  scene.deployRegaliaAegisWall(state, stage(api, 3));
  assert.equal(scene.regaliaAegisWallState.shields.length, 6);
  assert.equal(group.children.size, 18, "the old wall's bodies are gone");
  assert.ok(first.every(shield => shield.broken && shield.bodies.length === 0));

  scene.clearRegaliaAegisWall("test");
  assert.equal(group.children.size, 0);
  assert.equal(scene.regaliaAegisWallState.shields.length, 0);
});

test("each pushing enemy wears a shield down by the same amount at any depth, once per frame", () => {
  const { scene, api } = fixture();
  scene.deployRegaliaAegisWall(skillState(scene, api, 1), stage(api, 1));
  const shield = scene.regaliaAegisWallState.shields[0];
  const [zoneA, zoneB] = shield.bodies;
  const deepChaser = enemy("deep chaser", shield.x, shield.y - 20, { contactDamage: 90 });
  assert.equal(scene.shouldRegaliaAegisBlockEnemy(deepChaser, zoneA), true);
  scene.handleRegaliaAegisContact(deepChaser, zoneA);
  scene.handleRegaliaAegisContact(deepChaser, zoneB); // same frame, another circle of the same shield
  assert.ok(near(shield.pendingErosion, api.config.erosionPerEnemy), "8 per second, not the contact damage");
  scene.handleRegaliaAegisContact(enemy("elite", shield.x, shield.y + 20, { isElite: true }), zoneB);
  assert.ok(near(shield.pendingErosion, 8 + 16), "elites wear twice as fast");
  scene.updateRegaliaAegisShields(16);
  assert.ok(near(shield.durability, 60 - 24));

  shield.durability = 1;
  scene.time.now += 16;
  scene.handleRegaliaAegisContact(deepChaser, zoneA);
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
  assert.equal(scene.regaliaAegisWallState.shields.length, 4);
});

test("the plant impact hits enemies near each shield and pushes them away from the mech", () => {
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
  assert.deepEqual([hits[0].impact.sourceX, hits[0].impact.sourceY], [1000, 1000], "knockback away from the mech");
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
  assert.equal(scene.regaliaAegisWallState.shields.length, 5, "first wall right after acquiring");
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

test("the level-up cards name the shield count, durability, lifetime and the S8 wings", () => {
  const { scene, api } = fixture({ debug: true });
  const definition = api.skills[AEGIS];
  const card = (from, to) => scene.buildLevelUpCardModel({
    type: "skill", skillId: AEGIS, definition, actionType: from ? "upgrade" : "unlock",
    currentStage: from ? stage(api, from) : null, nextStage: stage(api, to)
  }, 0);
  const unlock = card(0, 1);
  assert.equal(unlock.title, "Aegis Wall");
  assert.equal(unlock.description, "機体が向いている方向に盾の壁を築き、内側をテリトリーにする");
  assert.deepEqual(plain(unlock.chips.map(chip => chip.label)), ["威力 8", "盾の数 5", "盾の耐久 30%", "持続 5秒"]);

  const s6 = card(5, 6);
  assert.equal(s6.description, "威力 18 → 22\n盾の数 8 → 9");
  assert.deepEqual(plain(s6.newEffects), ["棘盾：盾を押す敵に継続ダメージ"]);
  // A card with a new effect keeps four chips; the thorns are named by the new-effect line.
  assert.deepEqual(plain(s6.chips.map(chip => chip.label)), ["威力 +4", "盾の数 +1", "盾の耐久 +10%", "持続 +0.2秒"]);
  assert.deepEqual(plain(card(7, 8).newEffects), ["城壁の袖：壁の両端が後ろへ折れて側面を守る"]);
});
