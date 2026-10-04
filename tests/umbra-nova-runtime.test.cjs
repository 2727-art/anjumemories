"use strict";
// Pure production runtime/receiver tests. Numeric bodies and explicit worldstep
// events are not evidence of Phaser collision integration or real browser Hz.
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
const plain = value => JSON.parse(JSON.stringify(value));
function fixture(slots = 1, fireInterval = 540) {
  const scene = Object.create(context.proto), world = new EventEmitter(), enemies = [], calls = [], hits = [], pending = [];
  world.bounds = { x: -2000, y: -2000, width: 4000, height: 4000 };
  world.bodies = { contains: body => body.world === world };
  const bodyAt = (x, y, r = 10) => ({ world, enable: true, isCircle: true, width: r * 2, height: r * 2,
    halfWidth: r, halfHeight: r, position: { x: x - r, y: y - r }, velocity: { x: 0, y: 0 } });
  let traceGeneration = 0;
  const emit = (type, detail = {}) => {
    const trace = scene.umbraBoostTrace;
    const event = Object.freeze({ type, order: ++trace.order, boostSequence: trace.boostSequence,
      physicalStep: trace.physicalStep, sceneUpdates: 0, runGeneration: trace.runGeneration,
      depthGeneration: trace.depthGeneration, basisGeneration: trace.basisGeneration,
      firstPhysicalEvaluation: false, valid: false, reason: "", fixedStart: trace.fixedStart,
      from: { x: 0, y: 0 }, to: { x: 10, y: 0 }, ...detail });
    for (const fn of trace.consumers.values()) fn(event);
    return event;
  };
  Object.assign(scene, { getRunPlayerMechId: () => "umbraSeraph", getUmbraPhase2AVerifiedMechId: () => "umbraSeraph",
    verificationContext: { kind: "umbra-phase2a", mechId: "umbraSeraph", phantomNovaArena: true, novaSlots: slots },
    isFinalBossRaidActive() { return Boolean(this.finalBossRaidState?.active); }, stats: { hp: 40, bulletDamage: 1, fireInterval, damageMultiplier: 1 },
    stageDepth: 1, events: new EventEmitter(), physics: { world }, game: { events: new EventEmitter() },
    playerHitbox: { body: bodyAt(0, 0, 22) }, time: { now: 1000, delayedCall() {} }, enemies: { getChildren: () => enemies },
    walls: { getChildren: () => [] }, getOverdriveDamageMultiplier: () => 1,
    applyOverdriveModHunterDamageModifier: (e, d) => d, spawnEnemyDamageNumber() {}, playEnemyHitReaction() {},
    killEnemy(enemy) { enemy.isDying = true; enemy.killCalls = (enemy.killCalls || 0) + 1; this.umbraPhantomNovaRuntime?.targets.delete(enemy); },
    onUmbraPhantomNovaPulse(hit) { hits.push(hit); },
    ensureUmbraBoostTrace() {
      if (!this.isUmbraBoostTraceEnabled()) return null;
      if (this.umbraBoostTrace) return this.umbraBoostTrace;
      const trace = this.umbraBoostTrace = { runGeneration: ++traceGeneration, depthGeneration: 1, basisGeneration: 1,
        order: 0, boostSequence: 0, physicalStep: 0, consumers: new Map(), fixedStart: null };
      trace.handler = () => { trace.physicalStep++; if (pending.length) emit("step", pending.shift()); };
      world.on("worldstep", trace.handler); return trace;
    },
    subscribeUmbraBoostTrace(id, fn) {
      const trace = this.ensureUmbraBoostTrace(); trace.consumers.set(id, fn);
      return () => { if (trace.consumers.get(id) === fn) trace.consumers.delete(id); };
    }
  });
  scene.playerSkills = { umbraPhantomNova: { verificationOnly: true, currentStage: scene.getUmbraPhantomNovaStage1Config() } };
  const receiver = scene.applyDamageToEnemy;
  scene.applyDamageToEnemy = function (enemy, damage, tint, impact) {
    calls.push({ enemy, damage, impact, applying: this.umbraPhantomNovaRuntime.applyingPulse,
      current: { ...this.umbraPhantomNovaRuntime.currentPulse } });
    return receiver.call(this, enemy, damage, tint, impact);
  };
  scene.initializeUmbraPhantomNovaRuntime();
  const add = (x = 0, y = 0, hp = 1000, r = 10) => {
    const e = { active: true, hp, body: bodyAt(x, y, r), setTint() {}, clearTint() {} };
    enemies.push(e); scene.registerUmbraPhantomNovaEnemyLife(e); return e;
  };
  const move = (e, x, y) => { e.body.position.x = x - e.body.halfWidth; e.body.position.y = y - e.body.halfHeight; };
  const tick = (ms = 1000 / 60, physicalSteps = 1) => { scene.events.emit("preupdate"); for (let i = 0; i < physicalSteps; i++) world.emit("worldstep", ms / 1000); };
  const start = (x = 0, y = 0) => { const trace = scene.umbraBoostTrace; trace.boostSequence++; trace.fixedStart = { x, y }; return emit("start"); };
  const physical = (valid = true, detail = {}) => pending.push({ firstPhysicalEvaluation: true, valid, reason: valid ? "" : "ZERO_DISPLACEMENT", ...detail });
  const deploy = (x = 0, y = 0, ms = 10) => { start(x, y); physical(); tick(ms); return scene.umbraPhantomNovaRuntime.slots.find(s => s.state === "DEPLOYED"); };
  const replaceTrace = () => { const old = scene.umbraBoostTrace; world.off("worldstep", old.handler); old.destroyed = true; scene.umbraBoostTrace = null; pending.length = 0; };
  const snapshot = () => scene.getUmbraPhantomNovaSnapshot();
  const invariant = () => { const s = snapshot(); assert.equal(s.slots.length, s.totalSlots); assert.equal(new Set(s.slots.map(x => x.slotId)).size, s.totalSlots);
    assert.equal(s.slots.filter(x => ["ORBITING", "DEPLOYED", "REGENERATING"].includes(x.state)).length, s.totalSlots); };
  return { scene, world, enemies, calls, hits, add, move, tick, start, physical, deploy, emit, replaceTrace, snapshot, invariant, bodyAt };
}

test("verified acquisition has one/two/three stable slots, no instant pulse, no public leak", () => {
  for (const slots of [1, 2, 3]) {
    const f = fixture(slots); f.add(); f.invariant(); assert.equal(f.snapshot().combatTimeMs, 0); assert.equal(f.calls.length, 0);
    assert.deepEqual(plain(f.snapshot().slots.map(s => s.slotId)), [1, 2, 3].slice(0, slots));
    f.scene.destroyUmbraPhantomNovaRuntime(); assert.equal(f.scene.umbraPhantomNovaRuntime, null);
    f.scene.verificationContext.phantomNovaArena = false; assert.equal(f.scene.initializeUmbraPhantomNovaRuntime(), null);
    f.scene.verificationContext.phantomNovaArena = true; f.scene.playerSkills = {}; assert.equal(f.scene.initializeUmbraPhantomNovaRuntime(), null);
  }
});

test("normal and accelerated acquisition delays; orbit phase uses only the allowed physical clock", () => {
  for (const [fire, interval] of [[540, 900], [160, 300]]) {
    const f = fixture(3, fire); f.add(); f.tick(interval - 1); assert.equal(f.calls.length, 0); f.tick(1); assert.equal(f.calls.length, 3);
    const slots = f.snapshot().slots;
    for (const slot of slots) assert.ok(Math.abs(Math.hypot(slot.position.x, slot.position.y) - 80) < 1e-9);
    assert.ok(Math.abs(Math.hypot(slots[0].position.x - slots[1].position.x, slots[0].position.y - slots[1].position.y) - 80 * Math.sqrt(3)) < 1e-9);
    assert.ok(f.calls.every(call => call.impact === null && call.applying)); assert.equal(f.scene.umbraPhantomNovaRuntime.applyingPulse, false);
    assert.equal(f.scene.umbraPhantomNovaRuntime.currentPulse, null);
  }
});

test("successful start reserves without time or slot consumption until first physical evaluation", () => {
  const f = fixture(3); f.start(35, 45); f.scene.events.emit("preupdate"); f.scene.events.emit("preupdate");
  assert.equal(f.snapshot().combatTimeMs, 0); assert.equal(f.snapshot().reservation.slotId, 1); f.invariant();
  assert.ok(f.snapshot().slots.every(s => s.state === "ORBITING")); f.physical(); f.tick(10);
  assert.equal(f.snapshot().counts.deployed, 1); assert.equal(f.snapshot().lastDeployAtMs, 10);
  assert.deepEqual(plain(f.snapshot().slots[0].position), { x: 35, y: 45 }); assert.equal(f.snapshot().reservation, null);
});

test("first physical commit precedes a coincident due orbit pulse and uses immutable fixed start", () => {
  const f = fixture(); f.add(); f.tick(899); const event = f.start(23, 46); f.scene.umbraBoostTrace.fixedStart.x = 900;
  f.move(f.scene.playerHitbox, 500, 500); f.physical(true); f.tick(1);
  assert.equal(f.calls.length, 0); assert.equal(f.snapshot().slots[0].nextPulseAtMs, 1400);
  assert.deepEqual(plain(f.snapshot().slots[0].position), { x: 23, y: 46 }); assert.equal(event.fixedStart.x, 900);
});

test("first rejected physical evaluation cancels permanently; later valid Moon-compatible motion cannot revive Nova", () => {
  for (const reason of ["ZERO_DISPLACEMENT", "WALL_CHORD", "EXTERNAL_MOTION", "UNKNOWN_CORRECTION"]) {
    const f = fixture(); f.start(); f.physical(false, { reason }); f.tick();
    f.physical(true, { firstPhysicalEvaluation: false }); f.tick(); assert.equal(f.snapshot().counts.deployed, 0);
    assert.equal(f.snapshot().counts.reservations, 1); assert.equal(f.snapshot().skips[reason], 1); assert.equal(f.snapshot().lastDeployAtMs, null);
  }
});

test("release before physics, invalidation, stale generation and repeated event never recreate a reservation", () => {
  for (const type of ["end", "invalidate"]) {
    const f = fixture(); const start = f.start(); f.emit(type, { reason: "TEST_STOP" }); f.physical(); f.tick();
    f.scene.receiveUmbraPhantomNovaTrace(start); f.emit("start"); f.tick(); assert.equal(f.snapshot().counts.reservations, 1); assert.equal(f.snapshot().counts.deployed, 0);
  }
  const f = fixture(); f.start(); f.scene.umbraBoostTrace.basisGeneration++; f.physical(); f.tick(); assert.equal(f.snapshot().counts.deployed, 0);
});

test("unavailable reserved slot cannot be replaced by another orbiting slot", () => {
  const f = fixture(3); f.start(); const slot = f.scene.umbraPhantomNovaRuntime.slots[0];
  slot.state = "REGENERATING"; slot.position = null; slot.regenerateAtMs = 1000;
  f.physical(); f.tick(); assert.equal(f.snapshot().counts.deployed, 0); assert.equal(f.snapshot().skips.RESERVED_SLOT_UNAVAILABLE, 1);
  assert.equal(f.snapshot().slots[1].state, "ORBITING"); assert.equal(f.snapshot().lastDeployAtMs, null); f.invariant();
});

test("old-generation high-order terminal/start events cannot consume current cursor or reservation", () => {
  for (const type of ["end", "invalidate", "start", "step"]) {
    const f = fixture(); const current = f.start(); const before = f.snapshot().reservation;
    f.scene.receiveUmbraPhantomNovaTrace({ ...current, type, order: 100000, runGeneration: current.runGeneration - 1,
      boostSequence: current.boostSequence + 100, valid: true, firstPhysicalEvaluation: true });
    assert.equal(f.scene.umbraPhantomNovaRuntime.lastEventOrder, current.order);
    assert.deepEqual(plain(f.snapshot().reservation), plain(before)); f.physical(); f.tick(10);
    assert.equal(f.snapshot().counts.deployed, 1);
  }
  const f = fixture(); f.start(); f.scene.umbraBoostTrace.basisGeneration++;
  f.emit("invalidate", { reason: "CURRENT_BASIS_CHANGED" });
  assert.equal(f.snapshot().reservation, null); assert.equal(f.snapshot().skips.CURRENT_BASIS_CHANGED, 1);
});

test("acquiring during an already active boost does not retroactively reserve that boost", () => {
  const f = fixture(); f.scene.destroyUmbraPhantomNovaRuntime("FIXTURE"); f.start();
  f.scene.initializeUmbraPhantomNovaRuntime(); f.physical(true); f.tick(10);
  f.emit("start"); f.physical(true); f.tick(10); assert.equal(f.snapshot().counts.reservations, 0);
  f.start(); f.physical(true); f.tick(10); assert.equal(f.snapshot().counts.deployed, 1);
});

test("global deployment cooldown and live-only minimum distance are checked once per start", () => {
  const f = fixture(3); f.deploy(); f.start(500, 0); f.physical(); f.tick(800);
  assert.equal(f.snapshot().counts.deployed, 1); assert.equal(f.snapshot().skips.DEPLOY_COOLDOWN, 1);
  f.emit("start"); f.physical(); f.tick(10); assert.equal(f.snapshot().counts.deployed, 1);
  f.start(119.99, 0); f.physical(); f.tick(10); assert.equal(f.snapshot().skips.DEPLOY_TOO_CLOSE, 1);
  f.deploy(120, 0); assert.equal(f.snapshot().slots[1].state, "DEPLOYED");
  f.tick(3500); f.deploy(0, 0); assert.equal(f.snapshot().counts.deployed, 3); f.invariant();
});

test("placement recheck rejects walls or bounds changed after reservation without consuming cooldown", () => {
  for (const kind of ["wall", "bounds"]) {
    const f = fixture(); f.start();
    if (kind === "wall") f.scene.walls = { getChildren: () => [{ body: { enable: true, left: -5, right: 5, top: -5, bottom: 5 } }] };
    else f.world.bounds.x = 100;
    f.physical(); f.tick(); assert.equal(f.snapshot().counts.deployed, 0); assert.equal(f.snapshot().lastDeployAtMs, null);
  }
});

test("normal deployment yields exactly five pulses in [start,start+3000), then 1200 regen and a new orbit wait", () => {
  const f = fixture(); const e = f.add(); f.deploy();
  for (let i = 0; i < 5; i++) { f.tick(499); assert.equal(f.calls.length, i); f.tick(1); assert.equal(f.calls.length, i + 1); }
  f.tick(500); assert.equal(f.calls.length, 5); assert.equal(f.snapshot().slots[0].state, "REGENERATING");
  assert.equal(f.snapshot().skips.EXPIRED_UNCONSUMED_PULSES || 0, 0);
  assert.equal(f.snapshot().slots[0].position, null); f.tick(1199); f.invariant(); assert.equal(f.snapshot().slots[0].state, "REGENERATING");
  f.tick(1); assert.equal(f.snapshot().slots[0].state, "ORBITING"); assert.equal(f.calls.length, 5);
  f.tick(899); assert.equal(f.calls.length, 5); f.tick(1); assert.equal(f.calls.length, 6); assert.equal(e.hp, 983);
});

test("pure 30/60/120 allowed clocks have five deployed pulses and a single exact expiry", () => {
  for (const hz of [30, 60, 120]) {
    const f = fixture(); f.add(); f.deploy(0, 0, 1000 / hz);
    for (let i = 0; i < hz * 3; i++) f.tick(1000 / hz);
    assert.equal(f.snapshot().counts.deployedPulses, 5); assert.equal(f.snapshot().counts.expired, 1);
    assert.equal(f.snapshot().slots[0].state, "REGENERATING"); assert.equal(f.snapshot().errors, 0);
  }
});

test("orbit uses next-pulse live stats without pulling its pending deadline forward; deploy stats remain frozen", () => {
  const orbit = fixture(); orbit.add(); orbit.tick(200); const due = orbit.snapshot().slots[0].nextPulseAtMs;
  orbit.scene.stats.bulletDamage = 8; orbit.scene.stats.fireInterval = 160; orbit.tick(699); assert.equal(orbit.calls.length, 0);
  assert.equal(orbit.snapshot().slots[0].nextPulseAtMs, due); orbit.tick(1);
  assert.equal(orbit.calls[0].damage, 9); assert.equal(orbit.snapshot().slots[0].nextPulseAtMs, 1200);
  const deployed = fixture(); const e = deployed.add(); deployed.deploy();
  const frozen = plain(deployed.snapshot().slots[0].deployedSnapshot); deployed.scene.stats.bulletDamage = 8; deployed.scene.stats.fireInterval = 160;
  deployed.scene.getOverdriveDamageMultiplier = () => 2; deployed.tick(500);
  assert.equal(deployed.calls[0].damage, 3); assert.equal(e.hp, 994); assert.deepEqual(plain(deployed.snapshot().slots[0].deployedSnapshot), frozen);
  assert.equal(deployed.snapshot().slots[0].nextPulseAtMs, 1010);
});

test("missing enemies consume due pulses with no backlog; same-frame catchup permits at most one pulse per slot", () => {
  const f = fixture(3); f.tick(900); assert.equal(f.snapshot().counts.pulses, 3); f.add(); f.tick(100); assert.equal(f.calls.length, 0);
  f.tick(100, 20); assert.equal(f.calls.length, 3); assert.equal(f.snapshot().counts.skippedCatchup, 3);
  assert.ok(f.snapshot().slots.every(s => s.nextPulseAtMs > f.snapshot().combatTimeMs));
  f.tick(1); assert.equal(f.calls.length, 3);
});

test("one giant physical step expires without a pulse; multiple real-size catchup steps allow only one before expiry", () => {
  const single = fixture(); single.add(); single.deploy(); single.tick(4000); assert.equal(single.calls.length, 0); assert.equal(single.snapshot().slots[0].state, "REGENERATING");
  assert.equal(single.snapshot().skips.EXPIRED_UNCONSUMED_PULSES, 5); assert.equal(single.snapshot().counts.skippedCatchup, 5);
  const many = fixture(); many.add(); many.deploy(); many.tick(100, 40); assert.equal(many.calls.length, 1); assert.equal(many.snapshot().counts.skippedCatchup, 4);
  assert.equal(many.snapshot().slots[0].state, "REGENERATING");
});

test("current nearest real circle/rectangle shape, stable ties and static bodies determine one target", () => {
  const f = fixture(); const first = f.add(310, 0), second = f.add(-310, 0); f.enemies.reverse(); first.body.moves = false; first.body.directControl = true;
  f.deploy(); f.tick(500); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].enemy, first); assert.equal(second.hp, 1000);
  const rect = fixture(); const target = rect.add(400, 0); Object.assign(target.body, { isCircle: false, width: 200, height: 20, halfWidth: 100, halfHeight: 10, position: { x: 300, y: -10 } });
  rect.deploy(); rect.tick(500); assert.equal(rect.calls.length, 1);
  const corner = fixture(); const miss = corner.add(); Object.assign(miss.body, { isCircle: false, width: 200, height: 200, halfWidth: 100, halfHeight: 100, position: { x: 250, y: 250 } });
  corner.deploy(); corner.tick(500); assert.equal(corner.calls.length, 0);
});

test("fractional circle uses Phaser halfWidth center and exact nearest-shape boundary", () => {
  const f = fixture(), e = f.add(); Object.assign(e.body, { width: 42.48, height: 42.48, halfWidth: 21, halfHeight: 21, position: { x: 300, y: -21 } });
  const target = f.scene.snapshotUmbraPhantomNovaEnemy(e); assert.equal(target.position.x, 321); assert.equal(target.shape.radius, 21);
  f.deploy(); f.tick(500); assert.equal(f.calls.length, 1); e.body.position.x += 0.01; f.tick(500); assert.equal(f.calls.length, 1);
});

test("current-position pulses ignore crossed paths and sprite offsets; dead, reused, disabled and raid targets are excluded", () => {
  const f = fixture(); const e = f.add(1000); f.deploy(); e.x = 0; e.y = 0; e.body.prev = { x: -300, y: 0 }; f.tick(500); assert.equal(f.calls.length, 0);
  f.move(e, 0, 0); e.body.enable = false; f.tick(500); assert.equal(f.calls.length, 0); e.body.enable = true; e.isFinalBossRaidBoss = true;
  f.tick(500); assert.equal(f.calls.length, 0); e.isFinalBossRaidBoss = false; f.scene.umbraPhantomNovaRuntime.targets.delete(e); f.tick(500); assert.equal(f.calls.length, 0);
  f.scene.registerUmbraPhantomNovaEnemyLife(e); f.tick(500); assert.equal(f.calls.length, 1);
});

test("wall-blocked nearest target does not prevent selection of a reachable farther target", () => {
  const f = fixture(), near = f.add(100, 0), far = f.add(0, 200); f.deploy();
  f.scene.walls = { getChildren: () => [{ body: { enable: true, left: 40, right: 60, top: -30, bottom: 30 } }] };
  f.tick(500); assert.equal(f.calls.length, 1); assert.equal(f.calls[0].enemy, far); assert.equal(near.hp, 1000);
});

test("orbit needs player-to-ball LOS and safe ball center; deployed pulses need no player tether", () => {
  const f = fixture(); f.add(); f.scene.walls = { getChildren: () => [{ body: { enable: true, left: -100, right: 100, top: 20, bottom: 30 } }] };
  f.tick(900); assert.equal(f.calls.length, 0); assert.equal(f.snapshot().skips.ORBIT_LINK_LOS, 1);
  const deployed = fixture(); deployed.add(); deployed.deploy(); deployed.move(deployed.scene.playerHitbox, 1500, 1500);
  deployed.scene.walls = { getChildren: () => [{ body: { enable: true, left: 300, right: 400, top: -2000, bottom: 2000 } }] };
  deployed.tick(500); assert.equal(deployed.calls.length, 1);
});

test("orbit center inside a wall or outside play bounds skips that due pulse without touching movement", () => {
  for (const kind of ["wall", "bounds"]) {
    const f = fixture(); f.add(); const bodyBefore = plain(f.scene.playerHitbox.body.position), statsBefore = plain(f.scene.stats);
    if (kind === "wall") f.scene.walls = { getChildren: () => [{ body: { enable: true, left: -100, right: 100, top: 60, bottom: 100 } }] };
    else f.world.bounds = { x: -50, y: -50, width: 100, height: 100 };
    f.tick(900); assert.equal(f.calls.length, 0); assert.equal(f.snapshot().counts.pulses, 1);
    assert.equal(f.snapshot().skips[kind === "wall" ? "IN_WALL" : "OUT_OF_BOUNDS"], 1);
    assert.deepEqual(plain(f.scene.playerHitbox.body.position), bodyBefore); assert.deepEqual(plain(f.scene.stats), statsBefore);
  }
});

test("receiver rejection consumes a pulse without alternate retry; accepted overkill uses real receiver once", () => {
  const f = fixture(); const held = f.add(), alternate = f.add(100); held.supportDamageHoldUntil = 2000; f.deploy(); f.tick(500);
  assert.equal(f.calls.length, 1); assert.equal(held.hp, 1000); assert.equal(alternate.hp, 1000); assert.equal(f.hits.length, 0);
  const lethal = fixture(3); const e = lethal.add(0, 0, 1); lethal.tick(900);
  assert.equal(lethal.calls.length, 1); assert.equal(e.killCalls, 1); assert.equal(lethal.snapshot().counts.kills, 1);
  assert.equal(lethal.hits[0].hpDelta, 2); assert.equal(lethal.hits[0].effectiveHealthLoss, 1);
});

test("each slot can independently hit one surviving life but synchronous reentry cannot duplicate its pulse", () => {
  const f = fixture(3), e = f.add(); const actual = f.scene.applyDamageToEnemy;
  f.scene.applyDamageToEnemy = function (...args) {
    const slot = this.umbraPhantomNovaRuntime.slots.find(s => s.slotId === this.umbraPhantomNovaRuntime.currentPulse.slotId);
    this.applyUmbraPhantomNovaPulse(slot, this.getUmbraPhantomNovaTargets(), { rawDamage: 2, range: 220, intervalMs: 900 });
    return actual.apply(this, args);
  };
  f.tick(900); assert.equal(f.calls.length, 3); assert.equal(e.hp, 994); assert.equal(new Set(f.hits.map(h => `${h.slotId}:${h.cycleGeneration}:${h.pulseSerial}:${h.lifeId}`)).size, 3);
});

test("pause, overlay and visibility cancel pending only and freeze orbit/deploy/regeneration/deploy cooldown", () => {
  for (const flag of ["drivePaused", "driveHidden", "levelUpActive", "gateChoiceActive"]) {
    const f = fixture(3); f.deploy(); f.tick(800); f.start(500, 0); const before = f.snapshot();
    f.scene[flag] = true; f.tick(100000); assert.equal(f.snapshot().combatTimeMs, before.combatTimeMs);
    assert.equal(f.snapshot().reservation, null); assert.equal(f.snapshot().slots[0].deployedUntilMs, before.slots[0].deployedUntilMs);
    assert.equal(f.snapshot().lastDeployAtMs, before.lastDeployAtMs); f.scene[flag] = false; f.tick(10); assert.equal(f.snapshot().counts.deployed, 1);
  }
  const f = fixture(); f.deploy(); f.tick(3000); f.scene.game.events.emit("hidden"); const wait = f.snapshot().slots[0].regenerateAtMs;
  f.tick(9999); assert.equal(f.snapshot().slots[0].regenerateAtMs, wait); f.scene.game.events.emit("visible"); f.tick(1200); assert.equal(f.snapshot().slots[0].state, "ORBITING");
});

test("notification OFF preserves attacks and timers; recreated source puts only Nova after the new trace", () => {
  const f = fixture(3); f.add(); f.deploy(); const count = f.world.listenerCount("worldstep"); f.scene.verificationContext.traceNotifications = false;
  f.tick(500); assert.equal(f.calls.length, 1); assert.equal(f.snapshot().counts.deployed, 1);
  f.replaceTrace(); f.scene.verificationContext.traceNotifications = true; f.scene.events.emit("preupdate");
  assert.equal(f.world.listenerCount("worldstep"), count); f.tick(300); f.start(500, 0); f.physical(); f.tick(10);
  assert.equal(f.snapshot().counts.deployed, 2); assert.equal(f.snapshot().slots[1].deployedAtMs, f.snapshot().combatTimeMs);
  assert.equal(f.scene.umbraBoostTrace.consumers.size, 1);
});

test("same-Depth warp rebases orbit only; Depth converts deployed remaining+regen and preserves other remainders once", () => {
  const f = fixture(3); f.deploy(); f.tick(800); f.deploy(500, 0); f.tick(100);
  const rt = f.scene.umbraPhantomNovaRuntime; rt.slots[1].state = "REGENERATING"; rt.slots[1].regenerateAtMs = rt.combatTimeMs + 777; rt.slots[1].position = null;
  const before = f.snapshot(), deadline = before.slots[0].deployedUntilMs + before.slots[0].deployedSnapshot.regenerationMs;
  f.move(f.scene.playerHitbox, 1000, 1000); f.emit("invalidate", { reason: "WARP" }); f.tick(1);
  assert.deepEqual(plain(f.snapshot().slots[0].position), { x: 0, y: 0 }); assert.ok(f.snapshot().slots[2].position.x > 900);
  const enemy = f.add(); f.scene.stageDepth = 2; f.scene.handleUmbraPhantomNovaDepthChange(2); const changed = f.snapshot();
  assert.equal(changed.slots[0].state, "REGENERATING"); assert.equal(changed.slots[0].regenerateAtMs, deadline); assert.equal(changed.slots[0].position, null);
  assert.equal(changed.slots[1].regenerateAtMs, before.slots[1].regenerateAtMs); assert.equal(changed.slots[2].nextPulseAtMs, before.slots[2].nextPulseAtMs);
  assert.equal(changed.lastDeployAtMs, before.lastDeployAtMs); assert.equal(changed.liveTargets, 0);
  assert.equal(f.scene.handleUmbraPhantomNovaDepthChange(2), false); assert.equal(f.snapshot().counts.depthChanges, 1);
  assert.equal(f.scene.snapshotUmbraPhantomNovaEnemy(enemy).reason, "TARGET_UNREGISTERED"); f.scene.registerUmbraPhantomNovaEnemyLife(enemy);
  assert.equal(f.scene.snapshotUmbraPhantomNovaEnemy(enemy).reason, ""); f.invariant();
});

test("pooled new life and living body resize remain distinct without object-only suppression", () => {
  const f = fixture(); const e = f.add(); const original = f.scene.umbraPhantomNovaRuntime.targets.get(e).lifeId;
  f.deploy(); f.tick(500); Object.assign(e.body, { width: 80, height: 40, halfWidth: 40, halfHeight: 20, isCircle: false });
  f.tick(500); assert.equal(f.scene.umbraPhantomNovaRuntime.targets.get(e).lifeId, original);
  const reused = f.scene.registerUmbraPhantomNovaEnemyLife(e); assert.notEqual(reused, original); f.tick(500); assert.equal(f.hits[2].lifeId, reused);
});

test("terminal lifecycle, removed acquisition and Raid destroy only Nova references/listeners", () => {
  for (const reason of ["gameOver", "extractionComplete", "restartInProgress", "shopActive", "finalBossRaidAssetsLoading", "dead", "skill", "player", "context"]) {
    const f = fixture(); const rt = f.scene.umbraPhantomNovaRuntime; f.deploy(); const other = { untouched: true }; f.scene.umbraBloodSpikeRuntime = other;
    if (reason === "dead") f.scene.stats.hp = 0; else if (reason === "skill") f.scene.playerSkills = {};
    else if (reason === "player") f.scene.playerHitbox = { body: f.bodyAt(0, 0) }; else if (reason === "context") f.scene.verificationContext.phantomNovaArena = false;
    else f.scene[reason] = true;
    f.tick(1000); assert.equal(f.scene.umbraPhantomNovaRuntime, null); assert.equal(f.scene.umbraBloodSpikeRuntime, other);
    assert.equal(rt.slots.length, 0); assert.equal(rt.targets.size, 0); assert.equal(rt.cleanups.length, 0); assert.equal(rt.player, null);
    assert.equal(f.scene.umbraBoostTrace.consumers.size, 0); assert.equal(f.world.listenerCount("worldstep"), 1);
  }
  const f = fixture(); f.scene.events.emit("shutdown"); f.scene.events.emit("destroy"); assert.equal(f.scene.umbraPhantomNovaRuntime, null);
  assert.equal(f.scene.events.listenerCount("preupdate"), 0); assert.equal(f.scene.game.events.listenerCount("hidden"), 0);
});

test("bounded history and enemy scan reuse; diagnostic views never advance clocks or attack", () => {
  const f = fixture(3, 160); for (let i = 0; i < 512; i++) f.add(i % 16, Math.floor(i / 16));
  let snapshots = 0; const actual = f.scene.getUmbraPhantomNovaTargets;
  f.scene.getUmbraPhantomNovaTargets = function () { snapshots++; return actual.call(this); };
  for (let i = 0; i < 150; i++) { f.tick(300); f.snapshot(); f.scene.getUmbraPhantomNovaVisualState(); f.invariant(); }
  assert.equal(snapshots, 150); assert.equal(f.snapshot().counts.pulses, 450); assert.equal(f.snapshot().pulseHistory.length, 128);
  assert.equal(f.snapshot().combatTimeMs, 45000); assert.equal(f.snapshot().errors, 0);
  assert.ok(f.hits.every(h => !Object.hasOwn(h, "enemy"))); assert.ok(f.snapshot().history.length <= 128);
});

test("old emitter-copy callbacks cannot advance, cancel or destroy a replacement runtime", () => {
  const f = fixture(), old = f.scene.umbraPhantomNovaRuntime;
  const oldStep = old.worldStepHandler, oldFrame = f.scene.events.listeners("preupdate")[0];
  const oldPause = f.scene.events.listeners("pause")[0], oldShutdown = f.scene.events.listeners("shutdown")[0];
  const oldHidden = f.scene.game.events.listeners("hidden")[0], oldTrace = f.scene.umbraBoostTrace.consumers.get("umbra-phantom-nova");
  f.scene.destroyUmbraPhantomNovaRuntime("RESET"); f.scene.initializeUmbraPhantomNovaRuntime(); f.add();
  const current = f.scene.umbraPhantomNovaRuntime; const start = f.start();
  oldStep(0.9); oldFrame(); oldPause(); oldHidden(); oldShutdown();
  oldTrace({ ...start, type: "end", order: start.order + 100 });
  assert.equal(f.scene.umbraPhantomNovaRuntime, current); assert.equal(current.combatTimeMs, 0); assert.equal(current.sceneUpdates, 0);
  assert.equal(current.hidden, false); assert.equal(f.calls.length, 0); assert.ok(current.reservation);
  f.physical(); f.tick(10); assert.equal(current.counts.deployed, 1); assert.equal(current.combatTimeMs, 10);
});

test("receiver exception always clears applying tag and never permits same-frame repeat", () => {
  const f = fixture(); f.add(); f.scene.applyDamageToEnemy = () => { throw new Error("intentional receiver fault"); };
  assert.throws(() => f.tick(900), /intentional receiver fault/);
  assert.equal(f.scene.umbraPhantomNovaRuntime.applyingPulse, false); assert.equal(f.scene.umbraPhantomNovaRuntime.currentPulse, null);
  assert.equal(f.snapshot().errors, 1); assert.equal(f.snapshot().counts.pulses, 1);
  f.world.emit("worldstep", 0.001); assert.equal(f.snapshot().counts.pulses, 1);
});
