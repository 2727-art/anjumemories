"use strict";
// Pure production-helper tests with numeric bodies and explicit physical events.
// These do not certify Phaser collision integration or browser refresh rates.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const { EventEmitter } = require("node:events");
const assert = require("node:assert/strict"), test = require("node:test");
const root = path.resolve(__dirname, ".."), source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const context = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, console, performance, URLSearchParams,
  Phaser: { Scene: class {}, Math: { Clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)) } } });
vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
vm.runInContext(source.slice(0, source.indexOf("function isCommsStoryDebugResetRequested()"))
  + source.slice(source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS"), source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends")))
  + "\nthis.proto = SurvivalScene.prototype;", context);
function fixture() {
  const scene = Object.create(context.proto), world = new EventEmitter(), enemies = [], calls = [], hits = [];
  world.bounds = { x: -2000, y: -2000, width: 4000, height: 4000 };
  world.bodies = { contains: body => body.world === world };
  const bodyAt = (x, y, r = 10) => ({ world, enable: true, isCircle: true, width: r * 2, height: r * 2,
    halfWidth: r, halfHeight: r, position: { x: x - r, y: y - r }, velocity: { x: 0, y: 0 } });
  Object.assign(scene, { getRunPlayerMechId: () => "umbraSeraph", getUmbraPhase2AVerifiedMechId: () => "umbraSeraph",
    verificationContext: { kind: "umbra-phase2a", mechId: "umbraSeraph", bloodSpikeArena: true, traceNotifications: false },
    isFinalBossRaidActive() { return Boolean(this.finalBossRaidState?.active); }, stats: { hp: 40, bulletDamage: 1, fireInterval: 540, damageMultiplier: 1 },
    stageDepth: 1, events: new EventEmitter(), physics: { world }, game: { events: new EventEmitter() },
    playerHitbox: { body: bodyAt(0, 0, 22) }, time: { now: 1000, delayedCall() {} }, enemies: { getChildren: () => enemies },
    walls: { getChildren: () => [] }, getOverdriveDamageMultiplier: () => 1,
    applyOverdriveModHunterDamageModifier: (e, d) => d, spawnEnemyDamageNumber() {}, playEnemyHitReaction() {},
    killEnemy(enemy) { enemy.isDying = true; enemy.killCalls = (enemy.killCalls || 0) + 1; this.umbraBloodSpikeRuntime?.targets.delete(enemy); },
    onUmbraBloodSpikeAcceptedHit(hit) { hits.push(hit); } });
  scene.playerSkills = { umbraBloodSpike: { verificationOnly: true, currentStage: scene.getUmbraBloodSpikeStage1Config() } };
  const receiver = scene.applyDamageToEnemy;
  scene.applyDamageToEnemy = function (e, damage, tint, impact) { calls.push({ e, damage, impact }); return receiver.call(this, e, damage, tint, impact); };
  scene.initializeUmbraBloodSpikeRuntime();
  const add = (x = 100, y = 0, hp = 100, r = 10) => {
    const e = { active: true, hp, body: bodyAt(x, y, r), setTint() {}, clearTint() {} };
    enemies.push(e); scene.registerUmbraBloodSpikeEnemyLife(e); return e;
  };
  const move = (e, x, y) => { e.body.position.x = x - e.body.halfWidth; e.body.position.y = y - e.body.halfHeight; };
  const tick = (ms = 1000 / 60, physicalSteps = 1) => { scene.events.emit("preupdate"); for (let i = 0; i < physicalSteps; i++) world.emit("worldstep", ms / 1000); };
  const snapshot = () => scene.getUmbraBloodSpikeSnapshot();
  return { scene, world, enemies, calls, hits, add, move, tick, snapshot };
}

test("initialization is harmless; independent clock hits once at frame 3 then expires", () => {
  const f = fixture(), e = f.add(); assert.equal(e.hp, 100); assert.equal(f.calls.length, 0);
  f.tick(10); assert.equal(f.snapshot().counts.casts, 1); assert.equal(e.hp, 100);
  f.tick(199); assert.equal(e.hp, 100); f.tick(1); assert.equal(e.hp, 95);
  assert.equal(f.snapshot().lastImpact.frameIndex, 2); assert.equal(f.snapshot().lastImpact.quantizationMs, 0);
  f.tick(600); assert.equal(f.snapshot().casts.length, 0); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].impact, null);
  assert.equal(f.scene.umbraBoostTrace, undefined);
});

test("30/60/120 pure physical clocks preserve cast-to-cast period and record actual quantization", () => {
  for (const hz of [30, 60, 120]) {
    const f = fixture(); f.add(); for (let i = 0; i < hz * 4; i++) f.tick(1000 / hz);
    const s = f.snapshot(); assert.equal(s.counts.casts, 3); assert.equal(s.counts.impacts, 3);
    for (const impact of s.impactHistory) { assert.ok(impact.quantizationMs < 1000 / hz + 1e-7); assert.equal(impact.accepted, 1); }
    for (let i = 1; i < s.castHistory.length; i++) assert.ok(Math.abs(s.castHistory[i].createdCombatTimeMs - s.castHistory[i - 1].createdCombatTimeMs - 1800) < 1e-6);
  }
});

test("fixed cast survives target death and player displacement, using current entrants only", () => {
  const f = fixture(), original = f.add(100), fleeing = f.add(115), entrant = f.add(500);
  f.tick(10); original.isDying = true; original.hp = 0; f.move(fleeing, 500, 0); f.move(entrant, 100, 0);
  f.move(f.scene.playerHitbox, -1500, -1500); f.tick(200);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].e, entrant); assert.equal(fleeing.hp, 100);
  assert.deepEqual(JSON.parse(JSON.stringify(f.snapshot().lastImpact.position)), { x: 100, y: 0 });
});

test("nearest stable registered life wins, ignoring group order and invalid placements", () => {
  const f = fixture(), a = f.add(100), b = f.add(-100); f.enemies.reverse();
  assert.equal(f.scene.findUmbraBloodSpikePlacement().enemy, a);
  f.world.bounds = { x: -200, y: -200, width: 250, height: 400 };
  assert.equal(f.scene.findUmbraBloodSpikePlacement().enemy, b);
  f.world.bounds.width = 400; f.scene.walls = { getChildren: () => [{ body: { enable: true, left: 40, top: -30, right: 60, bottom: 30 } }] };
  assert.equal(f.scene.findUmbraBloodSpikePlacement().enemy, b);
});

test("instant circle/rectangle distance is exact, with no player radius or path prerequisite", () => {
  const f = fixture(), anchor = f.add(100), circle = f.add(190), miss = f.add(190.01);
  const rect = f.add(180, 60); Object.assign(rect.body, { isCircle: false, width: 40, height: 40, halfWidth: 20, halfHeight: 20, position: { x: 160, y: 40 } });
  const cornerMiss = f.add(180, 80); Object.assign(cornerMiss.body, { isCircle: false, width: 40, height: 40, halfWidth: 20, halfHeight: 20, position: { x: 160, y: 60 } });
  circle.body.moves = false; circle.body.directControl = true; f.enemies.push(circle);
  f.tick(10); f.tick(200); assert.equal(anchor.hp, 95); assert.equal(circle.hp, 95); assert.equal(miss.hp, 100); assert.equal(rect.hp, 95); assert.equal(cornerMiss.hp, 100);
  assert.equal(f.calls.filter(c => c.e === circle).length, 1);
});

test("fractional circle dimensions use Phaser half-width center, not width/2", () => {
  const f = fixture(), e = f.add(); Object.assign(e.body, { width: 42.48, height: 42.48, halfWidth: 21, halfHeight: 21, position: { x: 79, y: -21 } });
  const s = f.scene.snapshotUmbraBloodSpikeEnemy(e); assert.equal(s.position.x, 100); assert.equal(s.position.y, 0); assert.equal(s.shape.radius, 21);
});

test("impact LOS blocks current in-radius target behind an actual wall", () => {
  const f = fixture(), a = f.add(100), b = f.add(160); f.tick(10);
  f.scene.walls = { getChildren: () => [{ body: { enable: true, left: 125, top: -40, right: 130, bottom: 40 } }] };
  f.tick(200); assert.equal(a.hp, 95); assert.equal(b.hp, 100); assert.equal(f.snapshot().lastImpact.skips.IMPACT_LOS, 1);
});

test("frozen raw/radius/lifetime and next deadline survive passive changes; receiver multiplier remains impact-time", () => {
  const f = fixture(), e = f.add(); f.tick(10); const cast = f.snapshot().casts[0];
  f.scene.stats.bulletDamage = 8; f.scene.stats.fireInterval = 160; f.scene.getOverdriveDamageMultiplier = () => 2;
  f.tick(200); assert.equal(e.hp, 90); assert.equal(f.calls[0].damage, 5); assert.equal(f.snapshot().nextCastAtMs, 1810);
  f.tick(1599); assert.equal(f.snapshot().counts.casts, 1); f.tick(1);
  const next = f.snapshot().casts[0]; assert.equal(next.rawDamage, 12); assert.equal(next.intervalMs, 500);
  assert.equal(next.radius, cast.radius); assert.equal(next.durationMs, cast.durationMs); assert.equal(next.impactDueAtMs - next.createdCombatTimeMs, 200);
});

test("rejected receiver is attempted once per life/cast and overkill differs from effective loss", () => {
  const f = fixture(), held = f.add(), fragile = f.add(130, 0, 2); held.supportDamageHoldUntil = 2000;
  f.tick(10); f.tick(200); f.tick(599); assert.equal(f.calls.filter(c => c.e === held).length, 1); assert.equal(held.hp, 100);
  const hit = f.hits.find(h => h.killed); assert.equal(hit.hpDelta, 5); assert.equal(hit.effectiveHealthLoss, 2); assert.equal(fragile.killCalls, 1);
});

test("pause/overlay/hidden/Raid stop combat time and preserve remaining lifetime", () => {
  for (const state of ["drivePaused", "levelUpActive", "driveHidden", "finalBossRaidAssetsLoading"]) {
    const f = fixture(); f.add(); f.tick(10); f.scene[state] = true; f.tick(10000);
    assert.equal(f.snapshot().combatTimeMs, 10); assert.equal(f.snapshot().casts.length, 1);
    f.scene[state] = false; f.tick(200); assert.equal(f.snapshot().counts.impacts, 1);
  }
  const f = fixture(); f.add(); f.tick(10); f.scene.game.events.emit("hidden"); f.tick(10000); assert.equal(f.snapshot().combatTimeMs, 10);
  f.scene.game.events.emit("visible"); f.tick(200); assert.equal(f.snapshot().counts.impacts, 1);
});

test("empty time and large catch-up do not accumulate automatic cast queues", () => {
  const f = fixture(); f.tick(6000, 2); assert.equal(f.snapshot().counts.casts, 0); f.add(); f.tick(150); assert.equal(f.snapshot().counts.casts, 1);
  f.tick(1000 / 60, 360); assert.equal(f.snapshot().counts.casts, 2); assert.ok(f.snapshot().counts.impacts <= 2);
  const before = f.snapshot().counts.casts; f.tick(); assert.ok(f.snapshot().counts.casts - before <= 1);
});

test("three active cast cap neither replaces live casts nor stores queue", () => {
  const f = fixture(); f.add(); const p = f.scene.findUmbraBloodSpikePlacement();
  const ids = []; for (let i = 0; i < 3; i++) ids.push(f.scene.createUmbraBloodSpikeCast(p).castId);
  assert.equal(f.scene.createUmbraBloodSpikeCast(p), null); assert.equal(f.snapshot().casts.map(c => c.castId).join(), ids.join());
  f.scene.umbraBloodSpikeRuntime.nextCastAtMs = 0; f.tick(10); assert.equal(f.snapshot().counts.casts, 3);
  assert.equal(f.snapshot().skips.CAST_CAP, 1); f.tick(900); assert.equal(f.snapshot().counts.casts, 4);
});

test("Depth cleans old cast/targets and explicit reuse gets independent life", () => {
  const f = fixture(), e = f.add(); const oldLife = f.scene.umbraBloodSpikeRuntime.targets.get(e).lifeId;
  f.tick(10); f.scene.stageDepth = 2; f.tick(200); assert.equal(e.hp, 100); assert.equal(f.snapshot().casts.length, 0); assert.equal(f.snapshot().liveTargets, 0);
  const newLife = f.scene.registerUmbraBloodSpikeEnemyLife(e); assert.notEqual(oldLife, newLife); f.tick(150); f.tick(200); assert.equal(e.hp, 95);
});

test("synchronous death/Depth change in damage callback stops subsequent targets safely", () => {
  for (const mode of ["death", "depth"]) {
    const f = fixture(); f.add(); const second = f.add(120);
    f.scene.onUmbraBloodSpikeAcceptedHit = () => { if (mode === "death") f.scene.stats.hp = 0; else f.scene.stageDepth++; };
    f.tick(10); f.tick(200); assert.equal(f.calls.length, 1); assert.equal(second.hp, 100); assert.equal(f.snapshot().casts.length, 0);
  }
});

test("destroy releases only owned observer and references, not another skill clock", () => {
  const f = fixture(); f.add(); let other = 0; const observer = () => other++; f.world.on("worldstep", observer);
  f.tick(10); f.scene.destroyUmbraBloodSpikeRuntime("SKILL_EXIT"); f.tick(200);
  assert.equal(other, 2); assert.equal(f.world.listenerCount("worldstep"), 1); assert.equal(f.scene.umbraBloodSpikeRuntime, null);
});
