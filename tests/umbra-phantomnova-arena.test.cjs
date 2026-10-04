"use strict";

// Presentation-only VM tests. No browser, real save, network, or combat replacement.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const plain = value => JSON.parse(JSON.stringify(value));

function fixture({ phase = 5, moon = false, spike = false, novaSlots = 1, missingImage = false, growth = false, core = false, final = false } = {}) {
  const objects = [], calls = { reset: 0, physicsObjects: 0, snapshots: 0, data: 0, network: 0 };
  const forbidden = () => { calls.data++; throw new Error("Real data API forbidden"); };
  const window = {};
  Object.defineProperties(window, { localStorage: { get: forbidden }, sessionStorage: { get: forbidden } });
  const context = vm.createContext({ window, console });
  vm.runInContext(fs.readFileSync(path.join(root, "umbraPreviewAssets.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "umbraPresentation.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "umbraMoonlightArena.js"), "utf8"), context);
  const object = (type, x = 0, y = 0, texture, frame) => {
    const item = { type, x, y, texture, frame, active: true, visible: true, alpha: 1, writes: 0, commands: [] };
    item.scene = scene;
    for (const name of ["setDepth", "setStrokeStyle", "setInteractive", "setScrollFactor", "setWordWrapWidth", "setFontSize", "setLineSpacing", "setAlign", "setTint", "clearTint", "setRotation", "setBlendMode", "setSize"])
      item[name] = (...args) => { item[name.slice(3)] = args; return item; };
    item.setVisible = value => { item.visible = value; return item; };
    item.setAlpha = value => { item.alpha = value; return item; };
    item.setPosition = (a, b) => { item.x = a; item.y = b; return item; };
    item.setY = y => { item.y = y; return item; };
    item.setText = text => { item.text = String(text); item.writes++; return item; };
    item.setFrame = value => { item.frame = value; return item; };
    item.setOrigin = (x, y = x) => { item.origin = { x, y }; return item; };
    item.setScale = (x, y = x) => { item.scale = { x, y }; return item; };
    item.setTexture = (key, value) => { item.texture = key; if (value !== undefined) item.frame = value; return item; };
    item.clear = () => { item.commands = []; return item; };
    for (const name of ["lineStyle", "fillStyle", "lineBetween", "fillCircle", "strokeCircle", "fillEllipse", "strokeEllipse", "fillRect", "strokeRect", "fillTriangle", "strokeTriangle"])
      item[name] = (...args) => { item.commands.push([name, ...args]); return item; };
    item.generateTexture = () => item;
    item.on = (name, fn) => { item[name] = fn; return item; };
    item.once = item.on;
    item.destroy = () => { item.active = false; item.scene = null; };
    objects.push(item); return item;
  };
  const group = () => ({ children: { entries: [] }, getChildren() { return this.children.entries; }, add(item) { this.children.entries.push(item); }, getLength() { return this.children.entries.length; }, destroy() {} });
  const scene = {
    isUmbraPhase2ADrive: true, sys: { settings: { key: "UmbraPhase2ADrive" } }, mechId: "umbraSeraph",
    uiCamera: { ignore() {} }, uiObjects: [], selectionObjects: [], time: { now: 0, removeAllEvents() {} },
    tweens: { killAll() {} }, stats: { hp: 40, maxHp: 40, stamina: 100, maxStamina: 100 },
    passiveLevels: {}, playerSkills: {}, verificationContext: { kind: "umbra-phase2a", mechId: "umbraSeraph", traceNotifications: true },
    children: { list: objects }, guides: true,
    clearDriveInput() {}, pauseUmbraDriveMotion() {}, resetDrive() { calls.reset++; },
    getUmbraMoonlightBlockReason: () => "", getUmbraBloodSpikeCombatBlockReason: () => "", getUmbraPhantomNovaCombatBlockReason: () => "",
    getUmbraMoonlightStage1Config: () => ({ maxImpactFx: 12 }), getUmbraMoonlightEffectiveStats: () => ({}),
    getUmbraBloodSpikeEffectiveStats: () => ({}), getUmbraMoonlightSnapshot: () => ({ counts: {}, targets: [] }),
    getUmbraBloodSpikeSnapshot: () => ({ counts: {}, casts: [] }),
    getUmbraPhantomNovaEffectiveStats: () => ({ orbitRawDamage: 2, deployedRawDamage: 3, orbitIntervalMs: 900, deployedIntervalMs: 500 }),
    getActiveDropObjects: () => [], runStats: { kills: 0 },
    playerHitbox: { body: { center: { x: 350, y: 500 }, reset() {} } },
    initializeUmbraMoonlightRuntime() {}, initializeUmbraBloodSpikeRuntime() {}, initializeUmbraPhantomNovaRuntime() {},
    registerUmbraMoonlightEnemyLife() {}, registerUmbraBloodSpikeEnemyLife() {}, registerUmbraPhantomNovaEnemyLife() {},
    destroyUmbraMoonlightRuntime() {}, destroyUmbraBloodSpikeRuntime() {}, destroyUmbraPhantomNovaRuntime() {},
    getUmbraPhantomNovaSnapshot() { calls.snapshots++; return this.umbraPhantomNovaRuntime; },
    getUmbraPhantomNovaVisualState() { return this.umbraPhantomNovaRuntime; },
    getUmbraFinalVisualState() { return this.finalView || { owners: [], fields: [] }; }
  };
  scene.add = {
    image: (...args) => object("image", ...args), text: (...args) => object("text", ...args),
    rectangle: (...args) => object("rectangle", ...args), graphics: () => object("graphics"),
    layer: () => Object.assign(object("layer"), { removeAll() {} })
  };
  scene.physics = { world: { isPaused: false }, add: { group, collider: () => ({ world: null }), overlap: () => ({ world: null }),
    sprite() { calls.physicsObjects++; throw new Error("Test must not spawn enemies or FX bodies"); } } };
  scene.textures = { exists: key => key.startsWith("umbra-phase1") ? !missingImage : true, get: () => ({ has: () => !missingImage }) };
  scene.ui = item => { scene.uiObjects.push(item); return item; };
  scene.label = (x, y, text) => scene.ui(object("text", x, y).setText(text));
  scene.button = (x, y, width, text, fn) => ({ box: scene.ui(object("rectangle", x, y).on("pointerdown", fn)), caption: scene.label(x, y, text) });
  for (const name of ["statLabel", "energyLabel", "stateLabel", "evasionLabel"]) scene[name] = object("text");
  const source = new Proxy({}, { get: () => function () {} });
  const skillDefinitions = Object.fromEntries(["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"].map(id => [id, { id, verificationStage1: { id } }]));
  const bridge = { sourcePrototype: source, skillDefinitions, enemyDefinitions: {}, attackArena: true,
    moonlightArena: phase === 3 || moon, bloodSpikeArena: phase === 4 || spike, phantomNovaArena: phase === 5, novaSlots, umbraGrowth: growth, umbraCore: core, umbraFinal: final };
  const arena = window.createUmbraMoonlightArena(scene, bridge);
  scene.refreshDriveHud = () => arena.refreshHud();
  arena.configId = "empty";
  scene.umbraPhantomNovaRuntime = { enabled: true, combatTimeMs: 0, totalSlots: novaSlots, counts: {}, skips: {}, errors: 0,
    slots: Array.from({ length: novaSlots }, (_, index) => ({ slotId: index + 1, state: "ORBITING", cycleGeneration: 1,
      position: { x: 430, y: 500 + index * 40 }, nextPulseAtMs: 900, reservation: null, deployedUntilMs: null, regenerateAtMs: null })) };
  return { scene, arena, objects, calls, assets: window.umbraPreviewAssets, skillDefinitions };
}

test("AP-zero HUD shows retained acquisition records without authorizing a dead run", () => {
  const f = fixture({ growth: true, core: true }), s = f.scene, a = f.arena;
  s.umbraGrowthRun = {};
  s.playerSkills = { umbraMoonlight: { stageIndex: 3 }, umbraBloodSpike: { stageIndex: 7 } };
  s.skillMutationState = { umbraGrowthRun: s.umbraGrowthRun, entries: { umbraMoonlight: { stage4Selected: true, core: "control" } }, pendingQueue: [] };
  s.getUmbraActiveSkillStage = () => { throw Error("Dead HUD must not authorize combat"); };
  s.getUmbraSelectedCoreId = s.getUmbraActiveSkillStage;
  const retained = JSON.stringify([s.playerSkills, s.skillMutationState]), objectCount = f.objects.length;
  s.stats.hp = 0; s.triggerGameOver();
  for (let n = 0; n < 20; n++) a.refreshHud();
  assert.match(a.info.text, /MOON S4 CONTROL/); assert.match(a.info.text, /SPIKE S8/);
  assert.match(a.info.text, /NOVA 未取得/); assert.match(a.endNotice.text, /試走終了/);
  assert.equal(a.endNotice.visible, true); assert.equal(f.objects.length, objectCount);
  assert.equal(JSON.stringify([s.playerSkills, s.skillMutationState]), retained);
  s.gameOver = false; s.drivePaused = false;
  s.getUmbraActiveSkillStage = s.getUmbraSelectedCoreId = () => null;
  a.refreshHud(); assert.equal(a.endNotice.visible, false);
});

test("Phase 5 alone exposes eight exact acquisitions and 1/2/3 reset controls", () => {
  const f = fixture();
  const ids = { none: [], moonlight: ["umbraMoonlight"], bloodSpike: ["umbraBloodSpike"], phantomNova: ["umbraPhantomNova"],
    both: ["umbraMoonlight", "umbraBloodSpike"], moonNova: ["umbraMoonlight", "umbraPhantomNova"],
    spikeNova: ["umbraBloodSpike", "umbraPhantomNova"], all: ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"] };
  for (const [selection, expected] of Object.entries(ids)) {
    f.arena.setWeaponSelection(selection); f.arena.afterDriveReset();
    assert.deepEqual(Object.keys(f.scene.playerSkills), expected);
    for (const id of expected) assert.equal(f.scene.playerSkills[id].currentStage, f.skillDefinitions[id].verificationStage1);
  }
  assert.equal(f.calls.reset, 8);
  for (const slots of [1, 2, 3, 4, -1, NaN]) {
    f.arena.setNovaSlots(slots); f.arena.afterDriveReset();
    assert.equal(f.scene.verificationContext.novaSlots, [1, 2, 3].includes(slots) ? slots : 1);
  }
  f.scene.mechId = "defaultBear"; f.arena.afterDriveReset();
  assert.deepEqual(Object.keys(f.scene.playerSkills), []);
  assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0);
});

test("Phase 3/4 retain previous selection gates and do not expose NOVA slots", () => {
  for (const phase of [3, 4]) {
    const f = fixture({ phase });
    const selection = f.arena.weaponSelection;
    f.arena.setWeaponSelection("phantomNova"); f.arena.setNovaSlots(3);
    assert.equal(f.arena.weaponSelection, selection); assert.equal(f.calls.reset, 0);
    f.arena.afterDriveReset();
    assert.equal(f.scene.playerSkills.umbraPhantomNova, undefined);
    assert.equal(f.scene.verificationContext.phantomNovaArena, undefined);
    assert.equal(f.arena.novaSlotsButton, undefined);
  }
});

test("NOVA presentation keeps exact eight authored frames, pivots, and one object per slot", () => {
  const f = fixture({ novaSlots: 3 }), before = plain(f.scene.umbraPhantomNovaRuntime);
  const metadata = f.assets.effects.umbraPhantomNova;
  for (let index = 0; index < 8; index++) {
    f.scene.umbraPhantomNovaRuntime.combatTimeMs = index * 125;
    f.arena.updateNovaFx();
    assert.equal(f.arena.novaEffects.size, 3);
    for (const fx of f.arena.novaEffects.values()) {
      assert.equal(fx.object.frame, metadata.frames[index].name);
      assert.deepEqual(plain(fx.object.origin), plain(metadata.frames[index].origin));
      assert.equal(fx.object.body, undefined);
    }
  }
  assert.equal(f.calls.physicsObjects, 0);
  assert.deepEqual(plain(f.scene.umbraPhantomNovaRuntime.slots), before.slots);
  const created = f.arena.novaFxCounts.created;
  f.arena.updateNovaFx(); assert.equal(f.arena.novaFxCounts.created, created);
  f.scene.umbraPhantomNovaRuntime.slots[0].state = "DEPLOYED";
  f.scene.umbraPhantomNovaRuntime.slots[0].position = { x: 350, y: 500 };
  f.arena.updateNovaFx();
  assert.equal(f.arena.novaEffects.get(1).object.x, 350);
  f.scene.umbraPhantomNovaRuntime.slots[0].state = "REGENERATING";
  f.scene.umbraPhantomNovaRuntime.slots[0].position = null;
  f.arena.updateNovaFx();
  assert.equal(f.arena.novaEffects.get(1)?.object?.visible ?? false, false);
});

test("FX OFF, fallback, missing art, and NOVA-only cleanup never mutate combat slots", () => {
  for (const missingImage of [false, true]) {
    const f = fixture({ missingImage });
    f.arena.updateNovaFx();
    const runtime = f.scene.umbraPhantomNovaRuntime, before = plain(runtime);
    for (const mode of ["off", "fallback", "image"]) {
      f.arena.setFxMode(mode); f.arena.updateNovaFx();
      assert.deepEqual(plain(runtime), before); assert.equal(f.calls.reset, 0);
      for (const fx of f.arena.novaEffects.values()) assert.equal(fx.object?.body, undefined);
    }
    const marker = { object: { destroy() { throw new Error("NOVA cleanup touched Moon"); } } };
    f.arena.effects.push(marker);
    f.scene.onUmbraPhantomNovaRuntimeCleared("TEST");
    assert.equal(f.arena.effects[0], marker); assert.equal(f.arena.novaEffects.size, 0);
  }
});

test("regeneration shrink uses the previous displayed position for 150 combat ms without changing a logical slot", () => {
  for (const mode of ["image", "fallback"]) {
    const f = fixture(), runtime = f.scene.umbraPhantomNovaRuntime, slot = runtime.slots[0];
    f.scene.time.delayedCall = f.scene.tweens.add = () => assert.fail("Shrink must not allocate a timer or tween");
    f.arena.fxMode = mode;
    slot.state = "DEPLOYED"; slot.position = { x: 321, y: 456 }; slot.deployedUntilMs = 3000;
    runtime.combatTimeMs = 2999; f.arena.updateNovaFx();
    const fx = f.arena.novaEffects.get(1), object = fx.object;
    const original = { scale: plain(object.scale || null), origin: plain(object.origin || null), frame: object.frame,
      radius: object.commands.find(command => command[0] === "fillCircle")?.[3] };
    const originalScale = f.assets.effects.umbraPhantomNova.displayScale * 0.62;
    if (mode === "image") assert.equal(object.scale.x, originalScale);
    slot.state = "REGENERATING"; slot.position = null; slot.deployedUntilMs = null; slot.regenerateAtMs = 4200;
    runtime.combatTimeMs = 3000;
    const before = plain(runtime), created = f.arena.novaFxCounts.created;
    f.arena.updateNovaFx();
    assert.equal(object.visible, true); assert.equal(fx.ground.visible, false);
    assert.deepEqual(plain(runtime), before);
    runtime.combatTimeMs = 3075; f.arena.updateNovaFx();
    if (mode === "image") {
      assert.equal(object.scale.x, original.scale.x / 2); assert.equal(object.scale.y, original.scale.y / 2);
      assert.equal(object.alpha, 0.5); assert.equal(object.frame, original.frame);
      assert.deepEqual(plain(object.origin), original.origin);
      assert.equal(object.x, 321); assert.equal(object.y, 456);
    } else {
      const circle = object.commands.find(command => command[0] === "fillCircle");
      assert.deepEqual(circle.slice(1), [321, 456, original.radius / 2]);
    }
    const paused = plain({ scale: object.scale, commands: object.commands, alpha: object.alpha });
    f.scene.drivePaused = true; f.scene.time.now = 12000; f.arena.updateNovaFx();
    assert.deepEqual(plain({ scale: object.scale, commands: object.commands, alpha: object.alpha }), paused);
    assert.equal(slot.position, null); assert.equal(slot.regenerateAtMs, 4200);
    f.scene.drivePaused = false; runtime.combatTimeMs = 3149; f.arena.updateNovaFx(); assert.equal(object.visible, true);
    runtime.combatTimeMs = 3150; f.arena.updateNovaFx(); assert.equal(object.visible, false);
    assert.equal(slot.state, "REGENERATING"); assert.equal(slot.regenerateAtMs, 4200);
    assert.equal(f.arena.novaFxCounts.created, created); assert.equal(f.calls.physicsObjects, 0);
    assert.deepEqual(plain(runtime.counts), {});
    // Reusing this same slot after regeneration must restore normal orbit scale.
    slot.state = "ORBITING"; slot.position = { x: 430, y: 500 }; slot.regenerateAtMs = null;
    runtime.combatTimeMs = 4200; f.arena.updateNovaFx();
    assert.equal(object.visible, true);
    if (mode === "image") assert.equal(object.scale.x, f.assets.effects.umbraPhantomNova.displayScale * 0.45);
  }
});

test("late or first observation of REGENERATING never creates or delays a shrink visual", () => {
  const first = fixture(), slot = first.scene.umbraPhantomNovaRuntime.slots[0];
  slot.state = "REGENERATING"; slot.position = null; slot.regenerateAtMs = 4200;
  first.scene.umbraPhantomNovaRuntime.combatTimeMs = 3000; first.arena.updateNovaFx();
  assert.equal(first.arena.novaEffects.size, 0); assert.equal(first.arena.novaFxCounts.created, 0);
  const late = fixture(), runtime = late.scene.umbraPhantomNovaRuntime, old = runtime.slots[0];
  old.state = "DEPLOYED"; old.deployedUntilMs = 3000;
  runtime.combatTimeMs = 2900; late.arena.updateNovaFx();
  old.state = "REGENERATING"; old.position = null; old.deployedUntilMs = null; old.regenerateAtMs = 4200;
  runtime.combatTimeMs = 3200; late.arena.updateNovaFx();
  assert.equal(late.arena.novaEffects.get(1).object.visible, false);
  assert.equal(old.regenerateAtMs, 4200);
});

test("Depth cleanup and FX OFF discard shrink presentation without recreating a sphere", () => {
  for (const exit of ["depth", "off", "cleanup"]) {
    const f = fixture(), runtime = f.scene.umbraPhantomNovaRuntime, slot = runtime.slots[0];
    slot.state = "DEPLOYED"; slot.deployedUntilMs = 3000; runtime.combatTimeMs = 2999;
    f.arena.updateNovaFx();
    slot.state = "REGENERATING"; slot.position = null; slot.deployedUntilMs = null; slot.regenerateAtMs = 4200;
    runtime.combatTimeMs = 3020; f.arena.updateNovaFx();
    assert.equal(f.arena.novaEffects.get(1).object.visible, true);
    const before = plain(runtime);
    if (exit === "depth") f.scene.onUmbraPhantomNovaDepthChanged("DEPTH_CHANGED");
    else if (exit === "off") { f.arena.setFxMode("off"); f.arena.setFxMode("image"); }
    else f.scene.onUmbraPhantomNovaRuntimeCleared("SKILL_REMOVED");
    f.arena.updateNovaFx();
    assert.equal(f.arena.novaEffects.size, 0); assert.deepEqual(plain(runtime), before);
    assert.equal(f.calls.reset, 0); assert.equal(f.calls.physicsObjects, 0);
  }
});

test("NOVA diagnostics are rate limited independently of existing HUD updates", () => {
  const f = fixture(); f.arena.afterDriveReset(); f.calls.snapshots = 0;
  for (let now = 0; now < 100; now++) { f.scene.time.now = now; f.arena.refreshHud(); }
  assert.ok(f.calls.snapshots <= 1, `Unexpected detailed snapshots: ${f.calls.snapshots}`);
  f.scene.time.now = 100; f.arena.refreshHud(); assert.ok(f.calls.snapshots <= 2);
  const before = f.calls.snapshots;
  f.arena.updateNovaFx(); f.arena.updateNovaFx();
  assert.equal(f.calls.snapshots, before, "Visual updates must not request full diagnostic snapshots");
});

test("Successful pulse rays are bounded and use the combat clock; pause and slot state stay independent", () => {
  const f = fixture(), runtime = f.scene.umbraPhantomNovaRuntime;
  const hit = { slotId: 1, cycleGeneration: 1, pulseSerial: 1, sourcePosition: { x: 430, y: 500 },
    position: { x: 540, y: 500 }, combatTimeMs: 0 };
  const before = plain(runtime);
  for (let index = 0; index < 20; index++) f.scene.onUmbraPhantomNovaPulse({ ...hit, pulseSerial: index + 1 });
  assert.equal(f.arena.novaRays.length, 12); assert.equal(f.arena.novaFxCounts.rayCapped, 8);
  assert.deepEqual(plain(runtime), before);
  f.scene.drivePaused = true; f.scene.time.now = 5000;
  f.arena.updateNovaFx(); assert.equal(f.arena.novaRays.length, 12);
  assert.equal(f.arena.novaRays[0].object.alpha, 1);
  f.scene.drivePaused = false; runtime.combatTimeMs = 180;
  f.arena.updateNovaFx(); assert.equal(f.arena.novaRays.length, 0);
  assert.equal(f.calls.physicsObjects, 0);
});

test("Reserved fixed start and all-regenerating explanation use the core snapshot", () => {
  const f = fixture({ novaSlots: 3 }); f.arena.afterDriveReset();
  const runtime = f.scene.umbraPhantomNovaRuntime;
  runtime.reservation = { slotId: 2, boostSequence: 7, fixedStart: { x: 321, y: 456 } };
  f.scene.time.now = 100; f.arena.refreshHud();
  assert.match(f.arena.targetInfo.text, /#2 ORBITING 予約seq 7\n開始\(321,456\)/);
  runtime.reservation = null;
  runtime.slots.forEach(slot => { slot.state = "REGENERATING"; slot.position = null; slot.regenerateAtMs = 1200; });
  f.scene.time.now = 200; f.arena.refreshHud();
  assert.match(f.arena.totals.text, /全枠再生成待ち/);
  assert.match(f.arena.targetInfo.text, /再1\.20s/);
  assert.doesNotMatch(f.arena.targetInfo.text, /321,456/);
});

test("Growth SPIKE footprint follows each frozen cast circle with diagnostic guides off", () => {
  const f = fixture({ growth: true });
  f.scene.guides = false;
  const casts = [80, 110, 135, 240].map((radius, index) => ({ castId: `cast-${index}`, radius,
    position: { x: 700 + index * 10, y: 500 }, createdCombatTimeMs: 0, frameIndex: 2 }));
  const snapshot = { casts, combatTimeMs: 200 };
  f.scene.getUmbraBloodSpikeSnapshot = () => snapshot;
  const before = plain(snapshot);
  f.arena.updateSpikeFx();
  for (const cast of casts) {
    const fx = f.arena.spikeEffects.get(cast.castId);
    const circles = fx.ground.commands.filter(command => command[0] === "fillCircle" || command[0] === "strokeCircle");
    assert.equal(circles.length, cast.radius > 80 ? 2 : 0, "Confirmed S1 ground stays unchanged");
    for (const circle of circles) assert.deepEqual(circle.slice(1), [cast.position.x, cast.position.y, cast.radius]);
    assert.deepEqual(fx.object.scale, { x: f.assets.effects.umbraBloodSpike.displayScale * f.assets.effects.umbraBloodSpike.resolutionScale.x * (cast.radius / 80),
      y: f.assets.effects.umbraBloodSpike.displayScale * f.assets.effects.umbraBloodSpike.resolutionScale.y * (cast.radius / 80) });
  }
  assert.deepEqual(plain(snapshot), before); assert.equal(f.calls.physicsObjects, 0);
  const oldGround = f.arena.spikeEffects.get("cast-0").ground;
  casts.shift(); f.arena.updateSpikeFx();
  assert.equal(oldGround.active, false, "Cast expiration destroys its ground only");
  assert.equal(f.arena.spikeEffects.size, 3);
});

test("giant SPIKE image, fallback horn and glow scale from each cast with the same fixed ground pivot through all eight frames", () => {
  for (const mode of ["image", "fallback", "missing-image", "off"]) {
    const f = fixture({ growth: true, missingImage: mode === "missing-image" });
    f.scene.guides = false;
    if (mode !== "missing-image") f.arena.setFxMode(mode);
    const casts = [80, 147, 240].map((radius, index) => ({ castId: `size-${index}`, radius,
      position: { x: 700 + index * 10, y: 500 }, createdCombatTimeMs: 0, frameIndex: 0 }));
    const snapshot = { casts, combatTimeMs: 0 }, asset = f.assets.effects.umbraBloodSpike;
    f.scene.getUmbraBloodSpikeSnapshot = () => snapshot;
    for (let index = 0; index < 8; index++) {
      snapshot.combatTimeMs = index * 100;
      casts.forEach(cast => { cast.frameIndex = index; });
      const before = plain(snapshot); f.arena.updateSpikeFx();
      for (const cast of casts) {
        const fx = f.arena.spikeEffects.get(cast.castId), scale = cast.radius / 80, { x, y } = cast.position;
        assert.equal(fx.scaleMultiplier, scale);
        if (mode === "off") { assert.equal(fx.object, null); assert.equal(fx.ground, null); continue; }
        const ellipse = fx.ground.commands.find(command => command[0] === "fillEllipse");
        assert.deepEqual(ellipse.slice(1), [x, y, 94 * scale, 27 * scale]);
        if (mode === "image") {
          assert.deepEqual(fx.object.scale, { x: asset.displayScale * asset.resolutionScale.x * scale,
            y: asset.displayScale * asset.resolutionScale.y * scale });
          assert.deepEqual(fx.object.origin, plain(asset.frames[index].origin));
          assert.equal(fx.object.frame, asset.frames[index].name);
          assert.equal(fx.object.x, x); assert.equal(fx.object.y, y);
        } else {
          const height = [10, 37, 104, 115, 103, 76, 42, 12][index] * scale;
          const triangle = fx.object.commands.find(command => command[0] === "fillTriangle");
          assert.deepEqual(triangle.slice(1), [x - 42 * scale, y, x + 13 * scale, y - height, x + 34 * scale, y]);
        }
      }
      assert.deepEqual(plain(snapshot), before);
    }
    const objects = [...f.arena.spikeEffects.values()].flatMap(fx => [fx.object, fx.ground]).filter(Boolean);
    snapshot.casts = []; f.arena.updateSpikeFx();
    assert.equal(f.arena.spikeEffects.size, 0); assert.ok(objects.every(object => !object.active));
    assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.reset, 0); assert.equal(f.calls.data, 0);
  }
});

test("Growth FX modes leave cast snapshots and other weapon presentation untouched", () => {
  const f = fixture({ growth: true }), snapshot = { casts: [{ castId: "old", radius: 110, position: { x: 700, y: 500 }, createdCombatTimeMs: 0, frameIndex: 3 }], combatTimeMs: 300 };
  f.scene.getUmbraBloodSpikeSnapshot = () => snapshot; f.scene.guides = false;
  const before = plain(snapshot);
  for (const mode of ["image", "fallback", "off"]) {
    f.arena.setFxMode(mode); f.arena.updateSpikeFx();
    const fx = f.arena.spikeEffects.get("old");
    assert.equal(Boolean(fx.object), mode !== "off");
    if (mode !== "off") assert.ok(fx.ground.commands.some(command => command[0] === "strokeCircle" && command[3] === 110));
    assert.deepEqual(plain(snapshot), before);
  }
  assert.equal(f.calls.reset, 0); assert.equal(f.calls.physicsObjects, 0);
});

test("Core SPIKE and MOON colors belong to the attack snapshot without changing geometry", () => {
  const f = fixture({ growth: true, core: true });
  const cast = { castId: "before", radius: 110, position: { x: 700, y: 500 }, createdCombatTimeMs: 0, frameIndex: 2,
    coreProfile: { coreId: "assault" } };
  const snapshot = { casts: [cast], combatTimeMs: 200 }, before = plain(snapshot);
  f.scene.getUmbraBloodSpikeSnapshot = () => snapshot;
  f.scene.getUmbraSelectedCoreId = () => "control";
  f.arena.updateSpikeFx();
  const fx = f.arena.spikeEffects.get("before");
  assert.deepEqual(fx.object.Tint, [0xffd1a3]);
  assert.equal(fx.coreProfile, cast.coreProfile);
  assert.deepEqual(fx.object.scale, { x: f.assets.effects.umbraBloodSpike.displayScale * f.assets.effects.umbraBloodSpike.resolutionScale.x * (cast.radius / 80),
    y: f.assets.effects.umbraBloodSpike.displayScale * f.assets.effects.umbraBloodSpike.resolutionScale.y * (cast.radius / 80) });
  f.scene.onUmbraMoonlightAcceptedHit({ position: { x: 710, y: 500 }, coreProfile: { coreId: "reactor" } });
  assert.deepEqual(f.arena.effects[0].object.Tint, [0xb6f5ff]);
  assert.deepEqual(plain(snapshot), before); assert.equal(f.calls.physicsObjects, 0);
});

test("Core NOVA keeps deployed color while orbit follows the supplied latest profile", () => {
  const f = fixture({ growth: true, core: true, novaSlots: 2 });
  const runtime = f.scene.umbraPhantomNovaRuntime, [orbit, deployed] = runtime.slots;
  orbit.coreProfile = { coreId: "reactor" };
  deployed.state = "DEPLOYED"; deployed.deployedUntilMs = 3000; deployed.coreProfile = { coreId: "assault" };
  deployed.deployedSnapshot = { coreProfile: deployed.coreProfile, rawDamage: 4, regenerationMs: 1200 };
  f.arena.updateNovaFx();
  assert.deepEqual(f.arena.novaEffects.get(1).object.Tint, [0xb6f5ff]);
  assert.deepEqual(f.arena.novaEffects.get(2).object.Tint, [0xffd1a3]);
  orbit.coreProfile = { coreId: "control" }; runtime.combatTimeMs = 100;
  f.arena.updateNovaFx();
  assert.deepEqual(f.arena.novaEffects.get(1).object.Tint, [0xc2bcff]);
  assert.deepEqual(f.arena.novaEffects.get(2).object.Tint, [0xffd1a3]);
  const before = plain(runtime);
  for (const mode of ["fallback", "off", "image"]) { f.arena.setFxMode(mode); f.arena.updateNovaFx(); }
  assert.deepEqual(plain(runtime), before); assert.equal(f.calls.reset, 0);
});

test("CONTROL footprint only queries an effective contribution and has no lifetime side effects", () => {
  const f = fixture({ growth: true, core: true });
  const graphic = f.scene.add.graphics(), caption = f.scene.add.text(0, 0, "");
  const enemy = { active: true, hp: 10, maxHp: 10, body: { enable: true, position: { x: 100, y: 100 }, halfWidth: 18, halfHeight: 18, isCircle: true } };
  const record = { enemy, graphic, caption, label: "test", visualScale: 1 };
  let multiplier = 1, queries = 0;
  f.scene.getUmbraControlSpeedMultiplier = () => { queries++; return multiplier; };
  const marks = () => graphic.commands.filter(command => command[0] === "strokeEllipse");
  f.scene.guides = false; f.arena.renderEnemy(record); assert.equal(marks().length, 0);
  multiplier = .75; f.arena.renderEnemy(record); assert.equal(marks().length, 1);
  assert.deepEqual(marks()[0].slice(-2), [22, 7]);
  f.arena.fxMode = "off"; f.arena.renderEnemy(record); assert.equal(marks().length, 0);
  multiplier = 1; f.arena.fxMode = "image"; f.arena.renderEnemy(record); assert.equal(marks().length, 0);
  assert.equal(queries, 3); assert.equal(f.scene.time.now, 0); assert.equal(f.calls.physicsObjects, 0);
});

test("Final NOVA presentation retains the old deployed and shrinking profile while orbit takes the current profile", () => {
  const f = fixture({ growth: true, core: true, final: true, novaSlots: 2 });
  const runtime = f.scene.umbraPhantomNovaRuntime, [orbit, deployed] = runtime.slots;
  orbit.coreProfile = deployed.coreProfile = { coreId: "reactor" };
  orbit.finalProfile = { finalId: "prism", coreId: "reactor" };
  deployed.finalProfile = { finalId: "execution", coreId: "reactor" };
  deployed.state = "DEPLOYED"; deployed.deployedUntilMs = 3000;
  f.arena.updateNovaFx();
  const oldImage = f.arena.novaEffects.get(2).object, oldProfile = deployed.finalProfile;
  const oldScale = plain(oldImage.scale), oldOrigin = plain(oldImage.origin);
  orbit.finalProfile = { finalId: "singularity", coreId: "reactor" }; runtime.combatTimeMs = 100;
  f.arena.updateNovaFx();
  assert.equal(f.arena.novaEffects.get(1).finalProfile, orbit.finalProfile);
  assert.equal(f.arena.novaEffects.get(2).finalProfile, oldProfile);
  assert.deepEqual(plain(oldImage.scale), oldScale); assert.deepEqual(plain(oldImage.origin), oldOrigin);
  deployed.state = "REGENERATING"; deployed.finalProfile = null; runtime.combatTimeMs = 3000;
  f.arena.updateNovaFx();
  assert.equal(f.arena.novaEffects.get(2).finalProfile, oldProfile, "Shrink retains the last displayed DEP snapshot");
  assert.equal(f.arena.novaEffects.get(2).object, oldImage);
  assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.reset, 0);
});

test("Final fields use only the immutable read-only view, one fill and ring per field, with a finite display cap", () => {
  const f = fixture({ growth: true, core: true, final: true });
  f.scene.finalView = { owners: [{ skillId: "umbraBloodSpike", generation: 1, combatTimeMs: 300 }],
    fields: Array.from({ length: 7 }, (_, i) => ({ fieldId: `field-${i}`, skillId: "umbraBloodSpike", ownerGeneration: 1,
      position: { x: 600 + i * 20, y: 500 }, radius: 160, createdAtMs: 200, expiresAtMs: 1200,
      combatTimeMs: 300, membershipCount: 6, coreProfile: { coreId: "reactor" }, finalProfile: { finalId: "singularity", coreId: "reactor" } })) };
  const before = plain(f.scene.finalView);
  f.arena.updateFinalFx();
  assert.equal(f.arena.finalFields.size, 6, "Visual cap cannot mutate the supplied logical field collection");
  for (const fx of f.arena.finalFields.values()) {
    assert.equal(fx.object.commands.filter(c => c[0] === "fillCircle").length, 1);
    assert.equal(fx.object.commands.filter(c => c[0] === "strokeCircle").length, 1);
    assert.equal(fx.object.commands.find(c => c[0] === "strokeCircle")[3], 160);
  }
  f.scene.drivePaused = true; f.scene.time.now = 100000;
  f.arena.updateFinalFx(); assert.deepEqual(plain(f.scene.finalView), before);
  const oldObject = f.arena.finalFields.get("field-0").object;
  f.scene.finalView.fields.shift(); f.arena.updateFinalFx();
  assert.equal(oldObject.active, false); assert.equal(f.arena.finalFields.size, 6);
  f.arena.setFxMode("off"); assert.equal(f.arena.finalFields.size, 0);
  assert.equal(f.scene.finalView.fields.length, 6);
  f.arena.setFxMode("fallback"); assert.equal(f.arena.finalFields.size, 6);
  assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.reset, 0);
});

test("Final PRISM draws only accepted notifications with bounded lines and the matching owner clock", () => {
  const f = fixture({ growth: true, core: true, final: true });
  const owner = { skillId: "umbraMoonlight", generation: 11, combatTimeMs: 200 };
  f.scene.finalView = { owners: [owner], fields: [] };
  assert.equal(f.arena.finalMarks.length, 0, "A selected Final or display update alone makes no successful branch");
  const hit = { skillId: owner.skillId, ownerGeneration: 11, position: { x: 740, y: 570 }, sourcePosition: { x: 640, y: 570 },
    finalProfile: { finalId: "prism", coreId: "control" }, coreProfile: { coreId: "control" }, combatTimeMs: 200 };
  for (let i = 0; i < 20; i++) f.scene.onUmbraFinalSecondaryAcceptedHit({ ...hit, attackId: `secondary-${i}` });
  assert.equal(f.arena.finalMarks.length, 12); assert.equal(f.arena.finalFxCounts.capped, 8);
  for (const fx of f.arena.finalMarks) assert.equal(fx.object.commands.filter(c => c[0] === "lineBetween").length, 1);
  f.scene.drivePaused = true; f.scene.time.now = 100000; f.arena.updateFinalFx();
  assert.equal(f.arena.finalMarks.length, 12);
  owner.combatTimeMs = 380; f.arena.updateFinalFx(); assert.equal(f.arena.finalMarks.length, 0);
  f.scene.drivePaused = false; f.scene.onUmbraFinalSecondaryAcceptedHit({ ...hit, ownerGeneration: 10 });
  assert.equal(f.arena.finalMarks.length, 0, "Old generation cannot attach a visual to a replacement owner");
  assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.reset, 0);
});

test("Execution cast shape and successful hit marks retain their snapshot without changing authored image geometry", () => {
  const f = fixture({ growth: true, core: true, final: true });
  f.scene.finalView = { owners: [{ skillId: "umbraMoonlight", generation: 2, combatTimeMs: 200 }], fields: [] };
  const cast = { castId: "old-execution", radius: 160, position: { x: 700, y: 500 }, createdCombatTimeMs: 0, frameIndex: 2,
    coreProfile: { coreId: "assault" }, finalProfile: { finalId: "execution", coreId: "assault" } };
  const snapshot = { casts: [cast], combatTimeMs: 200 }, before = plain(snapshot);
  f.scene.getUmbraBloodSpikeSnapshot = () => snapshot;
  f.arena.updateSpikeFx();
  const fx = f.arena.spikeEffects.get(cast.castId), scale = { ...fx.object.scale };
  assert.ok(fx.ground.commands.some(c => c[0] === "lineBetween"));
  f.scene.getUmbraSelectedFinalId = () => "singularity";
  f.arena.updateSpikeFx(); assert.equal(fx.finalProfile, cast.finalProfile);
  assert.deepEqual(fx.object.scale, scale); assert.deepEqual(plain(snapshot), before);
  f.scene.onUmbraMoonlightAcceptedHit({ position: { x: 640, y: 560 }, coreProfile: { coreId: "assault" }, finalProfile: { finalId: "execution", coreId: "assault" } });
  assert.equal(f.arena.finalMarks.length, 1); assert.equal(f.arena.finalMarks[0].kind, "execution");
  f.arena.clearFinalFx(); assert.equal(f.arena.finalMarks.length, 0); assert.deepEqual(plain(snapshot), before);
});

test("AP-zero Final HUD reads retained completed choices while a dead run stays unauthorized", () => {
  const f = fixture({ growth: true, core: true, final: true });
  f.scene.gameOver = true; f.scene.umbraGrowthRun = {};
  f.scene.playerSkills = { umbraMoonlight: { stageIndex: 7 }, umbraBloodSpike: { stageIndex: 7 } };
  f.scene.skillMutationState = { umbraGrowthRun: f.scene.umbraGrowthRun, entries: {
    umbraMoonlight: { core: "assault", stage4Selected: true, final: "execution", stage8Selected: true },
    umbraBloodSpike: { core: "control", stage4Selected: true, final: "prism", stage8Selected: false }
  } };
  f.scene.isUmbraFinalContextActive = () => false;
  f.arena.refreshGrowthHud();
  assert.match(f.arena.info.text, /ASSAULT \+ EXECUTION/);
  assert.doesNotMatch(f.arena.info.text, /PRISM/);
  assert.match(f.arena.info.text, /NOVA 未取得/);
  assert.equal(f.scene.isUmbraFinalContextActive(), false); assert.equal(f.calls.reset, 0);
});

test("Final HUD derives effect values from current card calculations while showing old deployed ownership separately", () => {
  const f = fixture({ growth: true, core: true, final: true }), s = f.scene;
  const selected = { umbraMoonlight: "execution", umbraBloodSpike: "prism", umbraPhantomNova: "singularity" };
  s.getUmbraActiveSkillStage = () => ({ stage: 8 });
  s.getUmbraSelectedCoreId = () => "control"; s.getUmbraSelectedFinalId = id => selected[id];
  s.getUmbraMoonlightEffectiveStats = () => ({ rawDamage: 12, coreProfile: { controlSettings: { normalMultiplier: .78, durationMs: 420 } } });
  s.buildUmbraFinalCard = (id, finalId) => ({ umbraFinalCard: { finalId, chips: (id === "umbraMoonlight"
    ? [`主 raw 強対象 ${s.hudProbeRaw || 19} / その他 15`, "主強対象 ×1.25 / 一段丸め"]
    : id === "umbraBloodSpike" ? ["副raw 主2 / 各40%", "最大2本 / 成功点から140px", "1castに1試行 / 追加ICDなし"]
      : ["ダメージ0 / 半径80px / 同時3", "寿命 DEP期限3000ms未満", "各field最大6体 / 通常0.85・Boss系0.95"])
    .map(label => ({ label })) } });
  const slot = s.umbraPhantomNovaRuntime.slots[0];
  Object.assign(slot, { state: "DEPLOYED", deployedUntilMs: 3000,
    deployedSnapshot: { coreProfile: { coreId: "assault" }, finalProfile: { finalId: "prism" }, rawDamage: 4 } });
  const before = plain(s.umbraPhantomNovaRuntime); f.arena.refreshGrowthHud();
  assert.match(f.arena.targetInfo.text, /DEP assault\+prism raw4/);
  assert.match(f.arena.targetInfo.text, /M EXEC 主raw強対象19\/その他15/);
  assert.match(f.arena.targetInfo.text, /HP比≥62% または最大HP≥36/);
  assert.match(f.arena.targetInfo.text, /各40%/); assert.match(f.arena.targetInfo.text, /最大2本\/R140px/);
  assert.match(f.arena.targetInfo.text, /ICDなし/); assert.match(f.arena.targetInfo.text, /N SING dmg0\/R80px\/同時3/);
  assert.match(f.arena.targetInfo.text, /field上限6体/); assert.match(f.arena.info.text, /主CONTROL 通常 M0.78\/420ms/);
  s.hudProbeRaw = 77; s.time.now = 1000; f.arena.refreshGrowthHud();
  assert.match(f.arena.targetInfo.text, /主raw強対象77/);
  assert.deepEqual(plain(s.umbraPhantomNovaRuntime), before);
  assert.equal(f.calls.reset, 0); assert.equal(f.calls.physicsObjects, 0);
});
