"use strict";
// Controlled notifications/physical coordinates: not evidence of Phaser integration.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { EventEmitter } = require("node:events");
const assert = require("node:assert/strict"), test = require("node:test");
const root = path.resolve(__dirname, ".."), source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const context = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, console, URLSearchParams,
  Phaser: { Scene: class {}, Math: { Clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)) } } });
vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf("function isCommsStoryDebugResetRequested()"))
  + source.slice(source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS"), source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends")))
  + "\nthis.proto = SurvivalScene.prototype;", context);

function fixture(options = {}) {
  const scene = Object.create(context.proto), world = new EventEmitter(), enemies = [], hits = [], receivers = [];
  world.bodies = { contains: body => body.world === world };
  const bodyAt = (x, y, r) => ({ world, enable: true, moves: true, isCircle: true,
    width: r * 2, height: r * 2, halfWidth: r, halfHeight: r,
    position: { x: x - r, y: y - r }, prev: { x: x - r, y: y - r }, velocity: { x: 1, y: 0 }, newVelocity: { x: 0, y: 0 } });
  const body = bodyAt(-200, 0, 22);
  Object.assign(scene, { getRunPlayerMechId: () => options.mech || "umbraSeraph",
    getUmbraPhase2AVerifiedMechId: () => options.mech || "umbraSeraph",
    verificationContext: { kind: "umbra-phase2a", mechId: options.mech || "umbraSeraph", moonlightArena: true, traceNotifications: options.notifications !== false },
    isFinalBossRaidActive() { return Boolean(this.finalBossRaidState?.active); },
    stats: { hp: 40, damageMultiplier: 1, bulletDamage: 1, fireInterval: 540 },
    stageDepth: 1, events: new EventEmitter(), physics: { world }, game: { events: new EventEmitter() },
    playerHitbox: { body }, time: { now: 1000, delayedCall() {} },
    enemies: { getChildren: () => enemies }, walls: { getChildren: () => [] },
    getOverdriveDamageMultiplier: () => 1, applyOverdriveModHunterDamageModifier: (e, d) => d,
    spawnEnemyDamageNumber() {}, playEnemyHitReaction() {},
    killEnemy(enemy) { enemy.isDying = true; enemy.killCalls = (enemy.killCalls || 0) + 1; },
    onUmbraMoonlightAcceptedHit(hit) { hits.push(hit); } });
  scene.playerSkills = { umbraMoonlight: { verificationOnly: true, currentStage: scene.getUmbraMoonlightStage1Config() } };
  const receive = scene.applyDamageToEnemy;
  scene.applyDamageToEnemy = function (enemy, damage, tint, impact) { receivers.push({ enemy, damage, impact }); return receive.call(this, enemy, damage, tint, impact); };
  scene.initializeUmbraMoonlightRuntime();
  const add = (x = 0, y = 50, hp = 100, r = 10) => {
    const enemy = { active: true, hp, body: bodyAt(x, y, r), setTint() {}, clearTint() {} };
    enemies.push(enemy); scene.registerUmbraMoonlightEnemyLife(enemy); return enemy;
  };
  const moveBody = (b, x, y) => {
    b.prev = { ...b.position }; b.position = { x: x - b.halfWidth, y: y - b.halfHeight };
    b.newVelocity = { x: b.position.x - b.prev.x, y: b.position.y - b.prev.y };
  };
  const step = (x, y = 0, { dt = 100, valid = true, reason = valid ? "VALID_BOOST" : "NORMAL", move = [], sceneTime } = {}) => {
    if (sceneTime !== undefined) scene.time.now = sceneTime;
    for (const enemy of enemies) { enemy.body.prev = { ...enemy.body.position }; enemy.body.newVelocity = { x: 0, y: 0 }; }
    for (const [enemy, ex, ey] of move) moveBody(enemy.body, ex, ey);
    const from = scene.getUmbraBoostTraceBodyPoint(body); moveBody(body, x, y);
    const trace = scene.umbraBoostTrace;
    if (!trace) return;
    trace.physicalStep++;
    scene.emitUmbraBoostTrace("step", { from, to: scene.getUmbraBoostTraceBodyPoint(body), deltaMs: dt, valid, reason, mode: valid ? "BOOST" : reason });
  };
  const count = () => scene.getUmbraMoonlightSnapshot()?.counts.accepted || 0;
  const assertClean = () => { assert.equal(scene.getUmbraMoonlightSnapshot()?.errors || 0, 0); assert.equal(scene.umbraBoostTrace?.consumerErrors || 0, 0); };
  return { scene, body, world, enemies, add, step, count, hits, receivers, assertClean };
}

test("start is harmless; initial near target first valid movement hits once and eight frames cannot attack", () => {
  const f = fixture(); f.add(-200, 50); f.scene.beginUmbraBoostTrace(1000, "CONTINUOUS");
  assert.equal(f.count(), 0); f.step(-199); assert.equal(f.count(), 1);
  for (let i = 0; i < 90; i++) f.step(-198 + i * 0.1);
  assert.equal(f.count(), 1); assert.equal(f.receivers.length, 1); assert.equal(f.receivers[0].impact, null);
  f.assertClean();
});

test("release/repress and cooldown alone never open a new pass", () => {
  const f = fixture(); f.add(); f.step(0); assert.equal(f.count(), 1);
  f.scene.endUmbraBoostTrace("RELEASE"); f.scene.beginUmbraBoostTrace(1000, "CONTINUOUS");
  for (let i = 0; i < 100; i++) f.step(i % 2 ? 1 : 0);
  assert.equal(f.count(), 1); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.SAME_PASS > 0); f.assertClean();
});

test("confirmed exit + new entry + elapsed interval can hit in the same boost sequence", () => {
  const f = fixture(); f.add(); f.scene.beginUmbraBoostTrace(1000, "CONTINUOUS");
  f.step(200); assert.equal(f.count(), 1);
  f.step(300, 0, { dt: 800 }); f.step(-200);
  assert.equal(f.count(), 2); assert.equal(f.scene.umbraBoostTrace.boostSequence, 1); f.assertClean();
});

test("early reentry is consumed, waiting inside cannot retry, and another pass is necessary", () => {
  const f = fixture(); f.add(); f.step(200); f.step(0);
  assert.equal(f.count(), 1); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.REHIT_WAIT);
  f.step(1, 0, { dt: 1000 }); assert.equal(f.count(), 1);
  f.step(-200); f.step(0); assert.equal(f.count(), 2); f.assertClean();
});

test("normal/glide can confirm exit but their entry consumes the pass without damage", () => {
  const f = fixture(); f.add(); f.step(0);
  f.step(200, 0, { valid: false, dt: 900 }); f.step(0, 0, { valid: false, reason: "POST_BOOST_GLIDE" });
  f.step(1); assert.equal(f.count(), 1);
  f.step(200, 0, { valid: false }); f.step(0); assert.equal(f.count(), 2); f.assertClean();
});

test("exit margin suppresses boundary jitter", () => {
  const f = fixture(); f.add(0, 0); f.step(69); assert.equal(f.count(), 1);
  for (let i = 0; i < 20; i++) { f.step(75); f.step(69); }
  assert.equal(f.count(), 1); f.step(83); f.step(69); assert.equal(f.count(), 2); f.assertClean();
});

test("pause/overlay invalidation preserves cooldown, pass state and stops combat clock", () => {
  const f = fixture(); f.add(); f.step(0); const clock = f.scene.getUmbraMoonlightSnapshot().combatTimeMs;
  f.scene.drivePaused = true; f.scene.invalidateUmbraBoostTrace("WORLD_PAUSE"); f.step(0, 0, { dt: 9000 });
  assert.equal(f.scene.getUmbraMoonlightSnapshot().combatTimeMs, clock);
  f.scene.drivePaused = false; f.scene.invalidateUmbraBoostTrace("WORLD_RESUME"); f.step(1);
  assert.equal(f.count(), 1); f.assertClean();
});

test("unknown player path cannot prove exit or create a connecting chord", () => {
  for (const reason of ["WALL_CHORD_UNVERIFIED", "UNEXPLAINED_CORRECTION", "POSITION_DISCONTINUITY", "EXTERNAL_VELOCITY"]) {
    const f = fixture(); f.add(); f.step(0); f.step(200, 0, { valid: false, reason, dt: 900 });
    f.step(0, 0, { valid: false, reason }); f.step(1);
    assert.equal(f.count(), 1, reason); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips[`PATH_${reason}`]); f.assertClean();
  }
});

test("body change/warp rebaseline one target and keep its living cooldown", () => {
  const f = fixture(), a = f.add(), b = f.add(200, 50);
  f.step(0); a.body.position.x += 5; f.step(200, 0, { dt: 900 });
  assert.equal(f.count(), 2); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.TARGET_DISCONTINUITY);
  const record = f.scene.umbraMoonlightRuntime.targets.get(a), lastHit = record.lastHitAt;
  a.body.width = 40; a.body.halfWidth = 20; f.step(0);
  assert.equal(record.lastHitAt, lastHit); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.TARGET_BODY_CHANGED); f.assertClean();
});

test("actual receiver suppression consumes one attempt and later release cannot rapid retry", () => {
  const f = fixture(), enemy = f.add(); enemy.supportDamageHoldUntil = 5000;
  f.step(0); assert.equal(f.count(), 0); assert.equal(f.receivers.length, 1);
  assert.equal(enemy.hp, 100); assert.equal(f.hits.length, 0);
  enemy.supportDamageHoldUntil = 0; f.step(1, 0, { dt: 6000 }); assert.equal(f.count(), 0);
  f.step(200); f.step(0); assert.equal(f.count(), 1); assert.equal(f.receivers.length, 2); f.assertClean();
});

test("raw damage is scaled once by real receiver; lethal receipt is separate from geometric candidates", () => {
  const f = fixture(), enemy = f.add(0, 50, 3); f.scene.stats.damageMultiplier = 1.6;
  f.step(200); assert.equal(f.count(), 1); assert.equal(f.receivers[0].damage, 4);
  assert.ok(Math.abs(enemy.hp - (3 - 6.4)) < 1e-9); assert.equal(enemy.killCalls, 1);
  f.step(-200, 0, { dt: 900 }); assert.equal(f.count(), 1);
  assert.equal(f.scene.getUmbraMoonlightSnapshot().counts.kills, 1);
  assert.ok(Object.isFrozen(f.hits[0]) && Object.isFrozen(f.hits[0].position)); f.assertClean();
});

test("explicit same-object new-life registration clears old history; body reconfiguration does not", () => {
  const f = fixture(), enemy = f.add(); f.step(0); const oldId = f.hits[0].lifeId;
  enemy.hp = 100; f.scene.registerUmbraMoonlightEnemyLife(enemy); f.step(1);
  assert.equal(f.count(), 2); assert.notEqual(f.hits[1].lifeId, oldId); f.assertClean();
});

test("Depth invalidation never relabels an old living enemy as a new current-Depth spawn", () => {
  const f = fixture(), enemy = f.add();
  f.step(0); assert.equal(f.count(), 1);
  f.scene.stageDepth = 2; f.scene.invalidateUmbraBoostTrace("DEPTH_CHANGED");
  f.step(200, 0, { dt: 1000 }); f.step(0);
  assert.equal(f.count(), 1); assert.equal(f.scene.umbraMoonlightRuntime.targets.has(enemy), false);
  assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.TARGET_UNREGISTERED);
  f.scene.registerUmbraMoonlightEnemyLife(enemy); f.step(1);
  assert.equal(f.count(), 2); f.assertClean();
});

test("same Scene.time.now physical steps have one combat delta each; duplicate event is ignored", () => {
  const f = fixture(); f.add(); f.scene.beginUmbraBoostTrace(1000, "CONTINUOUS");
  f.step(200, 0, { dt: 400, sceneTime: 1000 }); f.scene.endUmbraBoostTrace("RELEASE");
  f.step(300, 0, { dt: 400, sceneTime: 1000 });
  const event = f.scene.getUmbraBoostTraceSnapshot().events.at(-1); f.scene.receiveUmbraMoonlightTrace(event);
  assert.equal(f.scene.getUmbraMoonlightSnapshot().combatTimeMs, 800);
  assert.equal(f.scene.getUmbraMoonlightSnapshot().counts.steps, 2); f.assertClean();
});

test("wall occlusion consumes candidate and never displays successful FX", () => {
  const f = fixture(); f.add(0, 50);
  f.scene.walls = { getChildren: () => [{ body: { enable: true, x: -500, y: 20, width: 1000, height: 10 } }] };
  f.step(0); assert.equal(f.count(), 0); assert.equal(f.receivers.length, 0); assert.equal(f.hits.length, 0);
  assert.equal(f.scene.getUmbraMoonlightSnapshot().counts.losBlocked, 1); f.assertClean();
});

test("disabled notifications, unacquired skill, other mechs and run guards never fall back", () => {
  for (const opts of [{ notifications: false }, { mech: "defaultBear" }, { mech: "regaliaBastion" }]) {
    const f = fixture(opts); f.add(); f.step(200); assert.equal(f.count(), 0); f.assertClean();
  }
  for (const flag of ["driveHidden", "levelUpActive", "gateChoiceActive", "extractionComplete", "gameOver", "restartInProgress", "shopActive", "finalBossRaidAssetsLoading"]) {
    const f = fixture(); f.add(); f.scene[flag] = true; f.step(200); assert.equal(f.count(), 0, flag); f.assertClean();
  }
  const f = fixture(); f.add(); f.scene.playerSkills = {}; f.step(200); assert.equal(f.count(), 0); f.assertClean();
});

test("target snapshots precede damage and generation changes abort remaining delivery", () => {
  const f = fixture(), a = f.add(), b = f.add(1, 50);
  const original = f.scene.onUmbraMoonlightAcceptedHit;
  f.scene.onUmbraMoonlightAcceptedHit = function (hit) { original.call(this, hit); this.invalidateUmbraBoostTrace("CALLBACK_PAUSE"); };
  f.step(200); assert.equal(f.count(), 1); assert.equal(a.hp, 96); assert.equal(b.hp, 100); f.assertClean();
});

test("source and attack consumer errors remain observable; bounded histories and cleanup release references", () => {
  const f = fixture(); f.add(); f.scene.onUmbraMoonlightAcceptedHit = () => { throw new Error("test FX failure"); };
  f.step(200); assert.equal(f.scene.getUmbraMoonlightSnapshot().errors, 1); assert.equal(f.scene.umbraBoostTrace.consumerErrors, 1);
  assert.match(f.scene.getUmbraMoonlightSnapshot().lastError, /test FX failure/);
  const g = fixture(); const enemy = g.add(0, 50, 1e6);
  for (let i = 0; i < 280; i++) g.step(i % 2 ? -200 : 200, 0, { dt: 1000 });
  assert.equal(g.scene.getUmbraMoonlightSnapshot().hitHistory.length, 128);
  enemy.active = false; g.step(201); assert.equal(g.scene.umbraMoonlightRuntime.targets.has(enemy), false);
  const runtime = g.scene.umbraMoonlightRuntime; g.scene.destroyUmbraMoonlightRuntime();
  assert.equal(runtime.targets.size, 0); assert.equal(runtime.hitHistory.length, 0);
  assert.equal(g.scene.umbraBoostTrace.consumers.has("umbra-moonlight"), false);
});
