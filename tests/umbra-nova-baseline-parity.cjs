"use strict";

// Functional parity only, not a performance or real refresh-rate measurement.
// Actual Game.step keeps the shipped Scene/Arcade/collider/render ordering.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { assertRunParity } = require("./umbra-nova-parity-offline.cjs");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const baselineRoot = path.join(project, ".tmp_umbra_phase5", "baseline");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase5", "baseline-parity");
const referenceHash = "85093a6d5121846fc3988854ec5737f98808e3f4b1862efdb4edcb94194db96e";
const sourceNames = ["index.html", "game.js", "skillDefinitions.js", "stageDefinitions.js", "equipmentDefinitions.js",
  "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js", "vendor/phaser.min.js"];
const mechs = ["defaultBear", "regaliaBastion", "umbraSeraph"];
const smoke = process.argv.includes("--smoke");
const combatAligned = process.argv.includes("--combat-aligned");
const rates = smoke ? [60] : [30, 60, 120];
const fixtures = smoke ? ["baseline"] : ["baseline", "medium", "deep"];
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const clone = value => JSON.parse(JSON.stringify(value));

function normalizeCombat(value) {
  if (Array.isArray(value)) return value.map(normalizeCombat);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["lastProcessingMs", "maxProcessingMs", "totalProcessingMs"].includes(key)).map(([key, entry]) => {
    if (key === "runGeneration") return [key, 0];
    // Only the first run-owner component changes. Keep depth, spawn sequence,
    // passId, cast sequence, ordering, every deadline and all actual input times.
    // SPIKE castId uses the same run:depth:sequence ownership prefix as lifeId.
    if (["lifeId", "targetLifeId", "castId"].includes(key) && typeof entry === "string" && /^\d+:\d+(?::\d+)?$/.test(entry))
      return [key, entry.replace(/^\d+:/, "0:")];
    return [key, normalizeCombat(entry)];
  }));
}

function compareRuns(old, current) {
  assertRunParity(old, current);
}

function freezeSources(root) {
  const sources = new Map(sourceNames.map(name => {
    const file = path.join(root, name);
    assert.ok(fs.existsSync(file), `Required frozen source missing: ${file}`);
    const body = fs.readFileSync(file); return [name, { body, sha256: sha(body), file }];
  }));
  const images = new Map();
  for (const directory of ["character", "skilleffect"]) {
    const relative = `画像/player/KGK-02_UMBRA_SERAPH/${directory}`;
    for (const name of fs.readdirSync(path.join(root, relative)).filter(name => name.toLowerCase().endsWith(".png"))) {
      const key = `${relative}/${name}`, body = fs.readFileSync(path.join(root, key));
      images.set(key, { body, sha256: sha(body), file: path.join(root, key) });
    }
  }
  assert.equal(images.size, 27, "Every existing supplied PNG is frozen; no baseline fallback to live sources");
  return { sources, images };
}

async function open(browser, variant, frozen, report) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { variant, external: [], pageErrors: [], requests: [] }; report.contexts.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { record.external.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    record.requests.push(name);
    const file = frozen.sources.get(name) || frozen.images.get(name);
    if (file) return route.fulfill({ status: 200, body: file.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8"
      : name.endsWith(".png") ? "image/png" : "application/javascript; charset=utf-8" });
    return route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => record.pageErrors.push(error.stack));
  await page.addInitScript(() => {
    const raw = Object.fromEntries(["getItem", "setItem", "removeItem", "clear", "key"].map(name => [name, Storage.prototype[name]]));
    const length = Object.getOwnPropertyDescriptor(Storage.prototype, "length").get;
    const local = window.localStorage, session = window.sessionStorage;
    raw.setItem.call(local, "nova-parity-local-sentinel", "synthetic-only");
    raw.setItem.call(session, "nova-parity-session-sentinel", "synthetic-only");
    const one = storage => {
      const result = {};
      for (let i = 0; i < length.call(storage); i++) { const key = raw.key.call(storage, i); result[key] = raw.getItem.call(storage, key); }
      return result;
    };
    window.__novaParityAudit = { storage: [], probes: [], entries: [], bootstrap: null,
      before: { local: one(local), session: one(session) }, snapshot: () => ({ local: one(local), session: one(session) }) };
    for (const name of Object.keys(raw)) Storage.prototype[name] = function () {
      window.__novaParityAudit.storage.push(name); throw Error("Real data access forbidden in parity fixture");
    };
    for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() {
      window.__novaParityAudit.probes.push({ area, stack: new Error().stack }); throw Error("Storage presence probe denied");
    } });
    let factory;
    Object.defineProperty(window, "createUmbraPhase2ADriveScene", { configurable: true, get() { return factory; }, set(value) {
      factory = function (...args) {
        const Scene = value(...args), create = Scene.prototype.create;
        Scene.prototype.create = function (...values) {
          create.apply(this, values);
          this.moonlightArena.configId = "empty"; this.moonlightArena.contactEnabled = false;
          this.resetDrive(this.mechId, this.fixtureId);
          this.physics.world.pause();
          window.__novaParityAudit.bootstrap = { physicsSteps: this.physicsSteps, enemies: this.moonlightArena.enemies.size };
        };
        return Scene;
      };
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const original = SurvivalScene.prototype[name];
        if (typeof original === "function") SurvivalScene.prototype[name] = function (...args) {
          window.__novaParityAudit.entries.push(name); return original.apply(this, args);
        };
      }
    }, { once: true });
  });
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1&umbraBloodSpike=1&umbraBrake=tuned${variant === "baseline" ? "" : "&umbraPhantomNova=1"}`);
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase1Assets")?.status.finished
    && window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive")?.moonlightArena, null, { timeout: 30000 });
  record.engine = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    return { phaser: Phaser.VERSION, fixedStep: s.physics.world.fixedStep, physicsFps: s.physics.world.fps,
      bootstrap: window.__novaParityAudit.bootstrap, probes: window.__novaParityAudit.probes.length };
  });
  assert.equal(record.engine.fixedStep, true); assert.equal(record.engine.physicsFps, 60);
  assert.deepEqual(record.engine.bootstrap, { physicsSteps: 0, enemies: 0 });
  return { context, page, record };
}

async function measure(page, settings) {
  return page.evaluate(({ variant, kind, mech, fixture, rate, combatAligned }) => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
    const copy = value => JSON.parse(JSON.stringify(value)), delta = 1000 / rate, seedTime = 10000;
    a.configId = "empty"; a.weaponSelection = variant === "current-on" ? "all" : "both";
    a.contactEnabled = false; a.fxMode = "off";
    if ("novaSlots" in a) a.novaSlots = 1;
    s.time.now = seedTime; s.resetDrive(mech, fixture, "tuned");
    if (a.enemies.size || a.contactEnabled) throw Error("Initial arena must be empty and contact OFF");
    // Measured configurations use the unchanged world and its real walls.
    // Actual collisions are observed, not forced to zero. Only the initial fixed
    // accumulator and test clock are aligned; physical fps/step/order stay intact.
    s.physics.world._elapsed = 0;
    // Separate controlled-condition experiment. The shipped TweenManager uses
    // Date.now(), not Game.step's supplied delta, so its original getDelta reads
    // the Scene clock only in this new mode. Its formula, callers, ordering,
    // lag/gap behavior and onComplete remain unchanged. No product code changes.
    const tweenManager = s.tweens, originalTweenGetDelta = tweenManager.getDelta;
    const originalTweenClock = Object.fromEntries(["startTime", "prevTime", "time", "nextTime"].map(key => [key, tweenManager[key]]));
    if (combatAligned) {
      tweenManager.startTime = seedTime; tweenManager.prevTime = seedTime;
      tweenManager.time = 0; tweenManager.nextTime = tweenManager.gap;
      tweenManager.getDelta = function (force) {
        const realDateNow = Date.now;
        Date.now = () => s.time.now;
        try { return originalTweenGetDelta.call(this, force); }
        finally { Date.now = realDateNow; }
      };
    }
    for (const key of Object.values(s.keys)) { key.isDown = false; key.isUp = true; }
    const state = s.ensureAcMovementState(), runtimePresence = {
      trace: !!s.umbraBoostTrace, moon: !!s.umbraMoonlightRuntime, spike: !!s.umbraBloodSpikeRuntime, nova: !!s.umbraPhantomNovaRuntime
    };
    const counters = { gameSteps: 0, sceneUpdates: 0, physicalSteps: 0, renders: 0 };
    const rows = [], physicsRows = [], inputs = [], combatRows = [], trace = { A: [], B: [] }, normalizedTrace = { A: [], B: [] };
    const hashes = { A: 2166136261, B: 2166136261 }, traceOrigin = s.umbraBoostTrace?.runGeneration;
    const oldReceiver = s.receiveDriveTraceNotification;
    s.receiveDriveTraceNotification = function (id, notice) {
      const result = oldReceiver.call(this, id, notice);
      if (trace[id]) {
        const raw = copy(notice), normalized = { ...raw, runGeneration: raw.runGeneration - traceOrigin };
        trace[id].push(raw); normalizedTrace[id].push(normalized);
        const text = JSON.stringify(normalized);
        for (let i = 0; i < text.length; i++) hashes[id] = Math.imul(hashes[id] ^ text.charCodeAt(i), 16777619) >>> 0;
      }
      return result;
    };
    const countersFor = consumer => consumer ? {
      count: consumer.count, lastOrder: consumer.lastOrder, duplicates: consumer.duplicates, droppedStale: consumer.droppedStale,
      droppedStopped: consumer.droppedStopped, firstPhysics: consumer.firstPhysics, excluded: consumer.excluded, typeCounts: { ...consumer.typeCounts }
    } : null;
    const read = () => ({
      timeMs: s.time.now, timelineMs: s.time.now - seedTime,
      body: { x: s.playerHitbox.body.center.x, y: s.playerHitbox.body.center.y, vx: s.playerHitbox.body.velocity.x,
        vy: s.playerHitbox.body.velocity.y, width: s.playerHitbox.body.width, height: s.playerHitbox.body.height },
      stateVelocity: { ...state.velocity }, allowedSpeed: state.lastAllowedSpeed, mode: state.mode, boostMode: state.boostMode,
      hp: s.stats.hp, maxHp: s.stats.maxHp, en: s.stats.stamina, maxEn: s.stats.maxStamina,
      fullOverheat: s.isAcFullOverheatActive(state), mustRelease: !!state.mustReleaseDashBeforeBoost,
      continuousBoost: copy(state.continuousBoost), airBrake: copy(state.airBrake),
      boostRegenBlockedUntil: state.boostRegenBlockedUntil, evadeWindow: copy(state.evadeWindow),
      invulnerable: s.isAcEvadeWindowActive(s.time.now, state), evadeRemainingMs: s.getAcEvadeWindowRemainingMs(s.time.now, state),
      input: { ...state.lastInputVector, dash: !!state.lastDashInput?.isDown },
      counts: { ...counters }, sceneUpdates: s.sceneUpdates, physicsSteps: s.physicsSteps, collisionCount: s.collisionCount,
      traceSourceCounts: s.umbraBoostTrace ? { ...s.umbraBoostTrace.counts } : null,
      A: countersFor(s.driveTraceConsumers?.A), B: countersFor(s.driveTraceConsumers?.B),
      normalizedTraceHashes: s.driveTraceConsumers ? { ...hashes } : null
    });
    const targetLives = runtime => runtime ? Array.from(runtime.targets, ([enemy, record]) => ({
      arenaId: enemy.moonlightArenaId, lifeId: record.lifeId, hp: enemy.hp, alive: !!enemy.active && !enemy.isDying && enemy.hp > 0,
      depth: record.depth, depthGeneration: record.depthGeneration, passId: record.passId, passConsumed: record.passConsumed,
      armed: record.armed, lastHitAt: record.lastHitAt, initialEligible: record.initialEligible,
      registeredAtStep: record.registeredAtStep, cursor: record.cursor, shapeKey: record.shapeKey,
      sequence: record.sequence, reason: record.reason
    })) : [];
    const combatState = () => ({
      moon: { snapshot: s.getUmbraMoonlightSnapshot(), lives: targetLives(s.umbraMoonlightRuntime) },
      spike: { snapshot: s.getUmbraBloodSpikeSnapshot(), lives: targetLives(s.umbraBloodSpikeRuntime) },
      enemies: [...a.enemies.keys()].map(enemy => ({ id: enemy.moonlightArenaId, hp: enemy.hp, maxHp: enemy.maxHp,
        dying: !!enemy.isDying, active: !!enemy.active, enabled: !!enemy.body?.enable,
        x: enemy.body?.center.x, y: enemy.body?.center.y, width: enemy.body?.width, height: enemy.body?.height })),
      runStats: { ...s.runStats }, xpDrops: s.xpOrbs.getChildren().map(drop => ({ value: drop.value, xp: drop.xpValue, x: drop.x, y: drop.y }))
    });
    const listeners = [];
    const listen = (emitter, event, fn) => { emitter.on(event, fn); listeners.push([emitter, event, fn]); };
    listen(game.events, "step", () => counters.gameSteps++);
    listen(s.events, "update", () => counters.sceneUpdates++);
    listen(game.events, "postrender", () => counters.renders++);
    listen(s.physics.world, "worldstep", () => { counters.physicalSteps++; physicsRows.push(copy(read())); });
    const step = keys => {
      for (const [name, key] of Object.entries(s.keys)) { key.isDown = keys.includes(name); key.isUp = !key.isDown; }
      const frame = counters.gameSteps + 1, time = seedTime + frame * delta;
      game.step(time, delta); rows.push(copy(read()));
      if (s.driveTraceConsumers && s.driveTraceConsumers.A.hash !== s.driveTraceConsumers.B.hash) throw Error("Native A/B delivery hash mismatch");
      if (kind === "combat") combatRows.push(copy(combatState()));
    };
    const segment = (durationMs, keys, label) => {
      const frames = Math.round(durationMs * rate / 1000);
      if (Math.abs(frames * delta - durationMs) > 1e-7) throw Error("Timeline segment must divide all selected Scene rates exactly");
      inputs.push({ label, durationMs, keys, nextFrame: counters.gameSteps + 1, plannedMs: counters.gameSteps * delta });
      for (let i = 0; i < frames; i++) step(keys);
    };
    try {
      // A real neutral step activates deferred Arcade group membership before
      // enemies are created. Bootstrap/memory setup is not counted as combat.
      segment(100, [], "neutral");
      if (kind === "combat") {
        for (const [x, y, rect] of [[650, 555, null], [1000, 555, { width: 180, height: 90 }]])
          a.spawnEnemy({ typeId: "boss_crack", isBoss: true, isElite: true, x, y, ...(rect ? { rect } : {}) });
        a.spawnEnemy({ x: 650, y: 560, label: "normal lethal receipt" });
        segment(600, ["right", "dash"], "first right boost");
        segment(1000, ["left"], "right release and reverse");
        segment(600, ["left", "dash"], "left return boost");
        segment(1000, ["right"], "left release and reverse");
        segment(600, ["right", "dash"], "second right boost");
        segment(1000, ["left"], "second right release");
        segment(600, ["left", "dash"], "second left boost");
        segment(1000, [], "neutral tail");
      } else {
        segment(300, ["right"], "normal cruise");
        segment(1200, ["right", "dash"], "long right boost");
        segment(1000, ["left"], "release and Air Brake");
        segment(200, ["left", "dash"], "short left boost");
        segment(400, [], "post boost glide");
        segment(300, ["up"], "normal turn");
      }
      const result = {
        key: `${kind}/${mech}/${fixture}/${rate}`, variant, kind, mech, fixture, rate, clockSeed: seedTime,
        tweenClockMode: combatAligned ? "ORIGINAL_GET_DELTA_WITH_SCENE_CLOCK_READ" : "ORIGINAL_WALL_CLOCK",
        physicsAccumulatorSeed: 0, runtimePresence, variantLabel: s.snapshot().airBrakeVariant,
        fixtureComposition: copy(s.umbraDriveFixtureSummary.composition), inputs, rows, physicsRows, trace,
        normalizedTrace, traceOrigin, counters, combatRows, combatFinal: kind === "combat" ? copy(combatState()) : null,
        finalWeaponDiagnostics: { moon: copy(s.getUmbraMoonlightSnapshot()), spike: copy(s.getUmbraBloodSpikeSnapshot()),
          nova: s.getUmbraPhantomNovaSnapshot ? copy(s.getUmbraPhantomNovaSnapshot()) : null },
        nativeTraceHashes: s.driveTraceConsumers ? { A: s.driveTraceConsumers.A.hash, B: s.driveTraceConsumers.B.hash } : null
      };
      result.coverageObservations = { maxCollisionCount: Math.max(...rows.map(row => row.collisionCount)),
        airBrakeSeen: rows.some(row => row.airBrake.active),
        note: "Collision zero and universal Air Brake activation were harness assumptions, not product requirements. Original baseline/current both failed these assumptions on the same ten configurations. Their exact state/counter rows still compare without exclusions." };
      if (kind === "combat") {
        const hitGroups = {};
        for (const hit of result.combatFinal.moon.snapshot.hitHistory) (hitGroups[hit.lifeId] ||= []).push({ passId: hit.passId, combatTimeMs: hit.combatTimeMs });
        result.combatCoverage = { moonHitsByLife: hitGroups,
          repeatedLives: Object.entries(hitGroups).filter(([, hits]) => hits.length > 1).map(([lifeId, hits]) => ({ lifeId, hits })) };
      }
      return result;
    } finally {
      if (combatAligned) { tweenManager.getDelta = originalTweenGetDelta; Object.assign(tweenManager, originalTweenClock); }
      for (const key of Object.values(s.keys)) { key.isDown = false; key.isUp = true; }
      s.receiveDriveTraceNotification = oldReceiver;
      for (const [emitter, event, fn] of listeners.reverse()) emitter.off(event, fn);
    }
  }, settings);
}

function validate(run) {
  assert.equal(run.rows.length, run.counters.gameSteps);
  assert.equal(run.counters.sceneUpdates, run.counters.gameSteps); assert.equal(run.counters.renders, run.counters.gameSteps);
  assert.equal(run.physicsRows.length, run.counters.physicalSteps);
  assert.ok(Math.abs(run.counters.physicalSteps - run.rows.at(-1).timelineMs * 0.06) <= 1);
  assert.deepEqual(run.normalizedTrace.A, run.normalizedTrace.B);
  for (const row of [...run.rows, ...run.physicsRows]) {
    assert.ok([row.body.x, row.body.y, row.body.vx, row.body.vy, row.en, row.evadeRemainingMs].every(Number.isFinite));
    assert.ok(Number.isInteger(row.collisionCount) && row.collisionCount >= 0);
    assert.deepEqual(row.A, row.B); assert.equal(row.hp, row.maxHp, "Contact OFF never damages the player");
  }
  const umbra = run.mech === "umbraSeraph";
  assert.equal(run.runtimePresence.nova, umbra && run.variant === "current-on");
  assert.equal(run.runtimePresence.trace, umbra);
  assert.equal(run.variantLabel, umbra ? "tuned" : "legacy");
  assert.ok(run.rows.some(row => row.continuousBoost.active), "Timeline includes a successful boost");
  // Air Brake availability/activation depends on the actual mechanism and EN.
  // Observe it and compare every row; do not invent a universal activation rule.
  if (run.kind === "empty") {
    assert.equal(run.finalWeaponDiagnostics.moon?.counts?.attempts || 0, 0);
    assert.equal(run.finalWeaponDiagnostics.spike.counts?.attempts || 0, 0);
    assert.equal(run.finalWeaponDiagnostics.nova?.counts?.attempts || 0, 0);
  } else {
    assert.ok(run.combatFinal.moon.snapshot.counts.accepted > 0, "Enemy fixture exercises MOONLIGHT");
    assert.ok(run.combatFinal.spike.snapshot.counts.accepted > 0, "Enemy fixture exercises SPIKE");
    assert.ok(run.combatFinal.runStats.kills > 0, "Enemy fixture includes a lethal receipt");
    assert.ok(run.combatCoverage.repeatedLives.length > 0, "Enemy fixture includes an actual MOONLIGHT re-hit on a surviving life");
  }
  for (const value of Object.values(run.finalWeaponDiagnostics)) if (value) assert.equal(value.errors || 0, 0);
}

async function close(item) {
  try {
    item.record.audit = await item.page.evaluate(() => {
      const audit = window.__novaParityAudit;
      return { before: audit.before, after: audit.snapshot(), storage: audit.storage, probes: audit.probes, entries: audit.entries,
        firebase: !!window.__LASTMEMO_FIREBASE_LEADERBOARD__, loopRunning: window.__SURVIVAL_GAME__.loop.running };
    });
    const audit = item.record.audit;
    assert.deepEqual(audit.before, audit.after); assert.deepEqual(audit.storage, []); assert.deepEqual(audit.entries, []);
    assert.equal(audit.firebase, false); assert.equal(audit.loopRunning, false);
    assert.equal(audit.probes.length, item.record.engine.probes);
    assert.ok(audit.probes.every(probe => probe.stack.includes("/vendor/phaser.min.js")));
    assert.deepEqual(item.record.external, []); assert.deepEqual(item.record.pageErrors, []);
    item.record.pass = true;
  } finally { await item.context.close(); }
}

async function main() {
  const baseline = freezeSources(baselineRoot), current = freezeSources(project);
  assert.equal(baseline.sources.get("game.js").sha256, referenceHash, "Baseline must be Phase 4 completion, never git HEAD");
  for (const [name, image] of baseline.images) assert.equal(current.images.get(name)?.sha256, image.sha256, `Protected PNG changed: ${name}`);
  assert.equal(current.sources.get("vendor/phaser.min.js").sha256, baseline.sources.get("vendor/phaser.min.js").sha256);
  fs.mkdirSync(output, { recursive: true });
  const report = { createdAt: new Date().toISOString(), smoke, combatAligned, base, sourceRoots: { baseline: baselineRoot, current: project },
    sources: Object.fromEntries([["baseline", baseline], ["current", current]].map(([key, value]) => [key, Object.fromEntries([...value.sources].map(([name, file]) => [name, file.sha256]))])),
    images: Object.fromEntries([...current.images].map(([name, file]) => [name, file.sha256])), harnessSha256: sha(fs.readFileSync(__filename)),
    comparatorSha256: sha(fs.readFileSync(path.join(__dirname, "umbra-nova-parity-offline.cjs"))),
    methodology: "Functional controlled real Phaser.Game.step at Scene 30/60/120Hz and unchanged fixed60 Arcade physics. Synthetic Key states, seeded Scene time10000ms/World accumulator0. Actual engine ordering, original movement formulas and walls retained. Contact OFF; FX OFF for every compared version. Not wall-clock latency, rAF smoothness, audible playback, or a device input test.",
    normalization: "All numeric motion fields and Scene timestamps compare exactly. Only trace runGeneration is made relative to its newly reset owner; native A/B equality is independently asserted. Combat runGeneration and the leading run component of life/cast IDs are normalized, preserving depth/life/cast sequence/pass IDs. Wall-clock processing-duration fields are excluded. No HP/position/deadline/interval/count rounding or tolerance is used for parity. Full original trace and combat snapshots remain in case JSON.",
    scope: combatAligned ? "Separate aligned-Tween condition: UMBRA only with enemies and NOVA OFF, baseline/current OFF, three fixtures and three rates:18 runs/9 comparisons. Earlier 99 wall-clock raw runs and their strict failures remain unchanged. Empty movement comparisons are not repeated."
      : "27 empty configurations each in baseline/current OFF(both)/current ON(all):54 comparisons. UMBRA only, same3fixtures/3rates with enemies and NOVA OFF:9 further comparisons. No NOVA damage count parity claim against two older weapons.",
    tweenClock: combatAligned ? "Only original TweenManager.getDelta's synchronous Date.now read receives Scene.time.now. Fresh-fixture Tween startTime/prevTime/time/nextTime aligned, then restored with original method in finally. Original getDelta/step/gap/lag/Tween/update/onComplete execute normally. Movement, attack clocks, HP receipts, target eligibility, Phaser TimerEvents and physics are untouched."
      : "Unmodified vendor Tween wall clock. Controlled Game.step time does not imply a controlled Tween lifetime.",
    coverageCorrection: "Removed two incorrect harness-only universal assertions (collisionCount===0 and every fixture must activate Air Brake). Saved 2026-09-06T10-32-52-166Z raw baseline/current both failed the same ten configurations; old raw pass flags are unchanged. These fields remain exact parity targets and are additionally retained as observations.",
    contexts: [], runs: [], comparisons: [], errors: [] };
  let browser;
  const runs = new Map(); // Only small file descriptors; never retain all raw runs.
  const save = (name, data) => { const file = path.join(output, `${stamp}-${name}.json`); fs.writeFileSync(file, JSON.stringify(data), { flag: "wx" }); return file; };
  try {
    const manifestPath = process.env.UMBRA_TEST_MANIFEST || path.join(project, ".tmp_umbra_phase5", "final-source-hashes.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const manifestEntries = Array.isArray(manifest) ? manifest.map(entry => [entry.path, entry.sha256]) : Object.entries(manifest.sources);
      for (const [name, entry] of manifestEntries) {
        const expected = typeof entry === "string" ? entry : entry.sha256;
        assert.equal(current.sources.get(name)?.sha256, expected, `Final manifest mismatch: ${name}`);
      }
      report.manifest = { file: manifestPath, verified: true, sha256: sha(fs.readFileSync(manifestPath)) };
    }
    report.startMetadataFile = save("start-metadata", report);
    const { chromium } = require("playwright");
    browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
    for (const variant of combatAligned ? ["baseline", "current-off"] : ["baseline", "current-off", "current-on"]) {
      const item = await open(browser, variant, variant === "baseline" ? baseline : current, report);
      try {
        for (const kind of combatAligned ? ["combat"] : variant === "current-on" ? ["empty"] : ["empty", "combat"]) {
          for (const mech of kind === "combat" ? ["umbraSeraph"] : mechs) for (const fixture of fixtures) for (const rate of rates) {
            let run;
            try {
              run = await measure(item.page, { variant, kind, mech, fixture, rate, combatAligned }); validate(run); run.pass = true;
            } catch (error) {
              run ||= { key: `${kind}/${mech}/${fixture}/${rate}`, variant };
              run.pass = false; run.error = error.stack; report.errors.push({ variant, key: run.key, error: error.stack });
            }
            const file = save(`${variant}-${kind}-${mech}-${fixture}-${rate}`, run);
            if (run.pass) runs.set(`${variant}/${run.key}`, { key: run.key, variant, file });
            report.runs.push({ variant, key: run.key, pass: run.pass, file, rows: run.rows?.length, physicalRows: run.physicsRows?.length });
          }
        }
      } finally { await close(item); }
    }
    for (const [key, run] of runs) if (!key.startsWith("baseline/")) {
      const old = runs.get(`baseline/${run.key}`), comparison = { variant: run.variant, key: run.key, pass: false };
      report.comparisons.push(comparison);
      try {
        assert.ok(old, "Matching baseline absent or failed");
        compareRuns(JSON.parse(fs.readFileSync(old.file, "utf8")), JSON.parse(fs.readFileSync(run.file, "utf8")));
        comparison.pass = true;
      }
      catch (error) { comparison.error = error.message; report.errors.push({ comparison: `${run.variant}/${run.key}`, error: error.message }); }
      await new Promise(resolve => setImmediate(resolve)); if (global.gc) global.gc();
    }
  } catch (error) { report.errors.push({ error: error.stack }); }
  finally {
    await browser?.close();
    const expectedComparisons = rates.length * fixtures.length * (combatAligned ? 1 : mechs.length * 2 + 1);
    report.expectedComparisons = expectedComparisons;
    report.pass = !report.errors.length && report.comparisons.length === expectedComparisons
      && report.comparisons.every(value => value.pass) && report.contexts.length === (combatAligned ? 2 : 3) && report.contexts.every(value => value.pass);
    const file = save("nova-baseline-parity-report", report);
    console.log(JSON.stringify({ pass: report.pass, comparisons: report.comparisons.length, expectedComparisons,
      failed: report.comparisons.filter(value => !value.pass).map(value => ({ variant: value.variant, key: value.key })),
      errors: report.errors.length, file }));
    process.exitCode = report.pass ? 0 : 1;
  }
}

if (process.argv.includes("--self-test")) {
  assert.deepEqual(normalizeCombat({ lifeId: "7:2", targetLifeId: "9:1:3", castId: "9:1:4", runGeneration: 8, passId: 4, nextCastAtMs: 1800, lastProcessingMs: 9 }),
    { lifeId: "0:2", targetLifeId: "0:1:3", castId: "0:1:4", runGeneration: 0, passId: 4, nextCastAtMs: 1800 });
  const run = { key: "test", kind: "combat", inputs: [], rows: [{ x: 1 }], physicsRows: [], normalizedTrace: {}, counters: {}, fixtureComposition: {},
    combatRows: [{ lifeId: "7:2", hp: 40 }], combatFinal: { passId: 2 } };
  compareRuns(run, { ...clone(run), combatRows: [{ lifeId: "9:2", hp: 40 }] });
  assert.throws(() => compareRuns(run, { ...clone(run), rows: [{ x: 1.0000000001 }] }));
  assert.throws(() => compareRuns(run, { ...clone(run), combatFinal: { passId: 3 } }));
  console.log(JSON.stringify({ selfTest: true, browserStarted: false }));
} else if (require.main === module) main().catch(error => { console.error(error.stack); process.exitCode = 1; });

module.exports = { normalizeCombat, compareRuns };
