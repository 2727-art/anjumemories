"use strict";
// Independent integration tests: real Game.step and Arcade collision resolution,
// with explicitly synthetic input/enemy fixtures and no real save data.
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, ".."), base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase4", "browser");
const smoke = process.argv.includes("--smoke"), loadOnly = process.argv.includes("--load-only"), matrixOnly = process.argv.includes("--matrix-only"), final = process.argv.includes("--final");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
fs.mkdirSync(output, { recursive: true });
const frozen = new Map();
for (const name of ["index.html", "game.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js"]) {
  const body = fs.readFileSync(path.join(process.env.UMBRA_TEST_SOURCE_ROOT || project, name)); frozen.set(name, { body, sha256: sha(body) });
}
const presentationFile = path.join(process.env.UMBRA_TEST_SOURCE_ROOT || project, "umbraPresentation.js");
if (fs.existsSync(presentationFile)) {
  const body = fs.readFileSync(presentationFile);
  frozen.set("umbraPresentation.js", { body, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
const report = { createdAt: new Date().toISOString(), phase: 4, final, smoke, loadOnly, matrixOnly,
  sources: Object.fromEntries([...frozen].map(([name, value]) => [name, value.sha256])), harnessSha256: sha(fs.readFileSync(__filename)),
  methodology: "Fresh isolated contexts; external requests and Storage APIs denied. Actual Phaser.Game.step at controlled Scene 30/60/120 Hz and unchanged fixed60 Arcade physics. Synthetic Phaser key state and explicitly labelled enemy velocity/position fixtures. This is neither a real refresh-rate device test nor normal enemy AI testing. Raw WORLD_STEP/body positions and planned/applied impact times are retained.",
  contexts: [], cases: [], errors: [] };
let browser;

async function open(mode, rate, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const audit = { mode, rate, label, external: [], pageErrors: [], localRequests: [] }; report.contexts.push(audit);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { audit.external.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    audit.localRequests.push(name); const entry = frozen.get(name);
    return entry ? route.fulfill({ status: 200, body: entry.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => audit.pageErrors.push(error.stack));
  await page.addInitScript(() => {
    window.__spikeAudit = { storage: [], probes: [], normal: [], bootstrap: null };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () { window.__spikeAudit.storage.push(method); throw Error("Storage forbidden"); };
    for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, get() { window.__spikeAudit.probes.push({ name, stack: new Error().stack }); throw Error("Storage access forbidden"); } });
    // Stop only this test Scene before its first physical update. Asset loading
    // continues in the unmodified loader Scene. No impact can warm image FX here.
    let factory;
    Object.defineProperty(window, "createUmbraPhase2ADriveScene", { configurable: true, get() { return factory; }, set(value) {
      factory = function (...args) {
        const Scene = value(...args), original = Scene.prototype.create;
        Scene.prototype.create = function (...createArgs) {
          original.apply(this, createArgs);
          const beforeTestReset = { spike: this.getUmbraBloodSpikeSnapshot?.(), moon: this.getUmbraMoonlightSnapshot?.(), physicsSteps: this.physicsSteps };
          if (this.moonlightArena) { this.moonlightArena.configId = "empty"; this.resetDrive(this.mechId, this.fixtureId); }
          this.physics.world.pause();
          window.__spikeAudit.bootstrap = { beforeTestReset, spike: this.getUmbraBloodSpikeSnapshot?.(), moon: this.getUmbraMoonlightSnapshot?.(), physicsSteps: this.physicsSteps };
        };
        return Scene;
      };
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) { window.__spikeAudit.normal.push(name); return method.apply(this, args); };
      }
    }, { once: true });
  });
  const query = `?umbraPreview=1&umbraDrive=1&umbraBloodSpike=1${mode !== "spike" ? "&umbraMoonlight=1" : ""}${mode === "no-notify" ? "&umbraTraceNotify=0" : ""}`;
  await page.goto(base + "/" + query);
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase1Assets")?.status.finished && window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase2ADrive")?.moonlightArena && typeof window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive").getUmbraBloodSpikeSnapshot === "function", null, { timeout: 30000 });
  audit.initial = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    return { phaser: Phaser.VERSION, worldFps: s.physics.world.fps, fixedStep: s.physics.world.fixedStep, bootstrap: window.__spikeAudit.bootstrap,
      spike: s.getUmbraBloodSpikeSnapshot(), moon: s.getUmbraMoonlightSnapshot(), probes: window.__spikeAudit.probes.length };
  });
  return { context, page, audit };
}

async function execute(page, rate, mode, suite = "matrix", population = 0) {
  return page.evaluate(({ rate, mode, suite, population }) => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"), arena = s.moonlightArena;
    let time = s.time.now, current = null; const dt = 1000 / rate, results = [], cleanups = [];
    const copy = value => value === undefined ? null : JSON.parse(JSON.stringify(value));
    const spike = () => s.getUmbraBloodSpikeSnapshot(), moon = () => s.getUmbraMoonlightSnapshot();
    const center = body => ({ x: body.position.x + (body.isCircle ? body.halfWidth : body.width / 2), y: body.position.y + (body.isCircle ? body.halfHeight : body.height / 2) });
    const input = (...keys) => { for (const name of ["up", "down", "left", "right", "w", "a", "s", "d", "dash", "dashAlt"]) { s.keys[name].isDown = keys.includes(name); s.keys[name].isUp = !s.keys[name].isDown; } };
    const check = (value, expectation, actual) => current.checks.push({ expectation, passed: !!value, actual: copy(actual) });
    const step = (delta = dt) => {
      time += delta; const before = s.physicsSteps; const start = performance.now(); game.step(time, delta);
      if (current) current.frames.push({ sceneTime: s.time.now, delta, wallMs: performance.now() - start, physicsSteps: s.physicsSteps - before,
        position: center(s.playerHitbox.body), velocity: { x: s.playerHitbox.body.velocity.x, y: s.playerHitbox.body.velocity.y },
        en: s.stats.stamina, mode: s.acMovementState.mode, airBrake: !!s.acMovementState.airBrake.active, evade: s.isAcEvadeWindowActive(s.time.now), spikeTime: spike()?.combatTimeMs, moonTime: moon()?.combatTimeMs });
    };
    const frames = (ms, ...keys) => { input(...keys); for (let i = 0; i < Math.ceil(ms / dt); i++) step(); };
    const until = (predicate, limitMs = 2500, keys = []) => { input(...keys); let guard = 0; while (!predicate() && guard++ < Math.ceil(limitMs / dt)) step(); check(predicate(), "bounded wait reaches the requested physical state", { limitMs, iterations: guard }); };
    const cast = () => s.umbraBloodSpikeRuntime?.casts?.[0];
    const life = target => s.umbraBloodSpikeRuntime?.targets.get(target)?.lifeId;
    const spawn = (options = {}) => { const target = arena.spawnEnemy({ isElite: true, x: 600, y: 500, ...options }); current.enemies.push({ id: target.moonlightArenaId, lifeId: life(target), hp: target.hp, body: { position: center(target.body), width: target.body.width, height: target.body.height, radius: target.body.halfWidth }, options }); return target; };
    const move = (target, x, y) => { const c = center(target.body); target.x += x - c.x; target.y += y - c.y; target.body.updateFromGameObject(); };
    const listener = (emitter, event, callback) => { emitter.on(event, callback); cleanups.push(() => emitter.off(event, callback)); };
    function run(name, action, options = {}) {
      arena.configId = "empty"; arena.fxMode = options.fx || "off"; arena.contactEnabled = false;
      s.finalBossRaidAssetsLoading = false; s.finalBossRaidState = null;
      s.resetDrive("umbraSeraph", options.fixture || "baseline"); input();
      current = { name, rate, mode, options, checks: [], frames: [], physical: [], notices: [], enemies: [] };
      const unsubscribe = s.subscribeUmbraBoostTrace("bloodspike-browser-observer", n => current.notices.push(copy(n)));
      cleanups.push(unsubscribe);
      listener(s.physics.world, "worldstep", delta => {
        const targetList = Array.from(arena.enemies.keys()).filter(e => e.active && e.body);
        const state = spike(), moonState = moon();
        current.physical.push({ deltaMs: delta * 1000, sceneTime: s.time.now, player: center(s.playerHitbox.body),
          spike: suite === "load" ? { combatTimeMs: state.combatTimeMs, counts: state.counts, lastProcessingMs: state.lastProcessingMs } : copy(state),
          moon: suite === "load" ? { combatTimeMs: moonState?.combatTimeMs, counts: moonState?.counts, lastProcessingMs: moonState?.lastProcessingMs } : copy(moonState),
          targetCount: targetList.length, targets: (suite === "load" ? targetList.slice(0, 16) : targetList).map(e => ({ id: e.moonlightArenaId, lifeId: life(e), hp: e.hp, dying: !!e.isDying, position: center(e.body), shape: { circle: e.body.isCircle, width: e.body.width, height: e.body.height } })) });
      });
      // Reset deliberately requires a real release update before DASH. These
      // neutral updates have no targets/casts and cannot warm attack images.
      frames(50);
      try { action(); } catch (error) { check(false, "case completes without an exception", error.stack); }
      current.spike = copy(spike()); current.moon = copy(moon()); current.arena = copy(arena.getSnapshot()); current.trace = copy(s.getDriveTraceDiagnostics());
      check((current.spike?.errors || 0) === 0, "SPIKE consumer errors are zero", current.spike?.lastError);
      check((current.moon?.errors || 0) === 0 && (current.trace.source?.consumerErrors || 0) === 0, "MOONLIGHT and source consumer errors are zero");
      check(current.trace.A?.hash === current.trace.B?.hash && current.trace.A?.count === current.trace.B?.count && (current.trace.A?.duplicates || 0) === 0 && (current.trace.B?.duplicates || 0) === 0, "A/B receive identical ordered notifications");
      check((s.umbraBloodSpikeRuntime?.casts.length || 0) <= 3, "active attack instances never exceed three");
      check((current.spike?.impactHistory || []).every(impact => impact.quantizationMs >= 0 && impact.quantizationMs <= 1000 / 60 + 1e-6), "impact timing quantization stays within one actual fixed physical step", current.spike?.impactHistory?.map(impact => ({ planned: impact.impactDueAtMs, applied: impact.appliedAtMs, quantization: impact.quantizationMs })));
      cleanups.splice(0).forEach(fn => fn()); current.passed = current.checks.every(c => c.passed); results.push(current); current = null;
    }
    if (suite === "load") {
      for (let repeat = 0; repeat < 3; repeat++) run(`load-${population}-${repeat === 0 ? "cold-first-cast" : "warm-" + repeat}`, () => {
        for (let i = 0; i < population; i++) spawn({ x: 600 + (i < 16 ? (i % 4) * 10 : Math.floor(i / 16) * 70), y: i < 16 ? 490 + Math.floor(i / 4) * 10 : 1200 + (i % 8) * 30 });
        frames(900, ...(mode === "both" ? ["right", "dash"] : []));
        current.load = { population, repeat, cold: repeat === 0, spike: copy(spike()), moon: copy(moon()), frameWallMs: current.frames.map(f => f.wallMs) };
        check((spike()?.impactHistory?.length || 0) > 0, "fresh/warm load reaches at least one physical impact");
      }, { fx: "image" });
      return results;
    }
    run("stationary-independent-period", () => {
      const target = spawn({ typeId: "boss_crack", isBoss: true }); frames(2150);
      check(spike().castHistory.length === 2 && spike().impactHistory.length === 2, "stationary player creates two casts with two impacts in 2150 ms", spike());
      check(target.hp === target.maxHp - 10, "two different casts independently apply raw5", { hp: target.hp, maxHp: target.maxHp });
      check((moon()?.counts.accepted || 0) === 0, "MOONLIGHT does not attack while stationary");
    });
    run("no-enemy-no-backlog", () => {
      frames(6000); const before = copy(spike()); spawn(); frames(450);
      check(before.castHistory.length === 0 && before.combatTimeMs >= 5900, "enemy-free allowed combat advances clock without accumulating casts", before);
      check(spike().castHistory.length === 1 && spike().impactHistory.length === 1, "new target causes only one ready cast");
    });
    run("large-scene-delta-no-burst", () => {
      spawn({ typeId: "boss_crack", isBoss: true }); step(6000);
      check(spike().castHistory.length <= 1, "one large Scene gap does not replay several past casts", spike());
      check(spike().impactHistory.length <= 1, "skipped render frames do not multiply impacts");
    });
    run("fixed-position-and-current-targets", () => {
      const original = spawn(); until(() => !!cast()); const fixed = copy(cast().position);
      original.body.setVelocity(1800, 0); const incoming = spawn({ x: fixed.x, y: fixed.y + 200 }); incoming.body.setVelocity(0, -1000);
      frames(250, "left", "dash"); incoming.body.setVelocity(0, 0);
      check(original.hp === original.maxHp, "selected enemy leaving before impact is not hit");
      check(incoming.hp === incoming.maxHp - 5, "different enemy inside at impact is hit");
      check(spike().castHistory[0].position.x === fixed.x && spike().castHistory[0].position.y === fixed.y, "cast position never follows player or original enemy", spike().castHistory[0]);
    });
    run("selected-target-death-does-not-cancel", () => {
      const original = spawn({ isElite: false }); until(() => !!cast()); const fixed = copy(cast().position);
      s.applyDamageToEnemy(original, 1000, 0xffffff, null); const replacement = spawn({ x: fixed.x + 25, y: fixed.y }); frames(300);
      check(replacement.hp === replacement.maxHp - 5 && spike().impactHistory.length === 1, "cast survives original target death and hits another current target");
    });
    for (const offset of [-0.01, 0, 0.01]) run(`circle-impact-boundary-${offset}`, () => {
      const original = spawn(); until(() => !!cast()); const at = copy(cast().position); move(original, at.x + 400, at.y);
      const target = spawn({ x: at.x, y: at.y + 200 }); move(target, at.x, at.y + 80 + target.body.halfWidth + offset); frames(300);
      check(target.hp === target.maxHp - (offset <= 0 ? 5 : 0), "current circle boundary uses radius80 plus actual enemy radius, without player22", { offset, hp: target.hp, radius: target.body.halfWidth });
    });
    for (const offset of [-0.01, 0, 0.01]) run(`rect-impact-boundary-${offset}`, () => {
      const original = spawn(); until(() => !!cast()); const at = copy(cast().position); move(original, at.x + 400, at.y);
      const target = spawn({ x: at.x, y: at.y + 200, rect: { width: 240, height: 10 } }); move(target, at.x, at.y + 85 + offset); frames(300);
      check(target.hp === target.maxHp - (offset <= 0 ? 5 : 0), "thin rectangle uses real bounds distance rather than circumscribed radius", { offset, hp: target.hp });
    });
    run("warp-current-body-still-valid", () => {
      const original = spawn(); until(() => !!cast()); const at = copy(cast().position); move(original, at.x + 500, at.y);
      const other = spawn({ x: at.x + 500, y: at.y });
      until(() => spike().combatTimeMs >= cast().impactDueAtMs - Math.max(dt, 1000 / 30) - 1e-6);
      check(spike().impactHistory.length === 0, "test warp is injected before impact, including multi-step Scene frames");
      move(other, at.x, at.y); until(() => spike().impactHistory.length > 0);
      check(other.hp === other.maxHp - 5, "unknown past path does not exclude a currently valid body at instantaneous impact", spike());
    });
    run("same-distance-stable-selection", () => {
      const first = spawn({ x: 600, y: 550 }), second = spawn({ x: 600, y: 450 }); until(() => !!cast());
      check(cast().targetLifeId === life(first) && cast().targetLifeId !== life(second), "equal-distance valid candidates select the first stable living id", copy(cast()));
    });
    for (const distance of [599.99, 600, 600.01]) run(`placement-range-${distance}`, () => {
      spawn({ x: 350 + distance, y: 500 }); frames(250);
      check(spike().castHistory.length === (distance <= 600 ? 1 : 0), "placement600 measures body-center to ground point", { distance, spike: spike() });
    });
    run("wall-placement-skips-to-next-candidate", () => {
      s.playerHitbox.body.reset(1600, 1100); const invalid = spawn({ x: 1680, y: 1100 }); invalid.body.checkCollision.none = true;
      const valid = spawn({ x: 1500, y: 1250 }); until(() => !!cast());
      check(cast().targetLifeId === life(valid), "wall-internal candidate is skipped without moving its point", copy(cast()));
    });
    run("impact-wall-occlusion", () => {
      s.playerHitbox.body.reset(1580, 1100); const selected = spawn({ x: 1640, y: 1100 }); until(() => !!cast());
      const far = spawn({ x: 1700, y: 1100 }); far.body.checkCollision.none = true; frames(300);
      check(selected.hp === selected.maxHp - 5 && far.hp === far.maxHp, "impact origin to shape LOS rejects in-range target beyond actual wall", spike());
    });
    for (const state of ["normal", "boost", "glide", "air-brake", "full-overheat"]) run(`movement-independent-${state}`, () => {
      if (state === "glide" || state === "air-brake") { frames(500, "right", "dash"); frames(50, "right"); }
      if (state === "air-brake") until(() => s.acMovementState.airBrake.active, 400, ["left"]);
      if (state === "full-overheat") { s.stats.stamina = 0; s.startAcFullOverheat(s.acMovementState, s.time.now); check(s.acMovementState.fullOverheat.active, "fixture uses actual FULL_OVERHEAT state"); }
      const at = center(s.playerHitbox.body); spawn({ x: at.x, y: at.y + 130 });
      frames(450, ...(state === "boost" ? ["right", "dash"] : state === "normal" ? ["right"] : []));
      check(spike().castHistory.length === 1 && spike().impactHistory.length === 1, "automatic cast and impact do not require valid boost movement", spike());
    });
    for (const kind of ["pause", "candidate", "hidden", "raid-loading", "raid-active"]) run(`clock-freeze-${kind}`, () => {
      spawn(); until(() => !!cast()); frames(50); const before = copy(spike());
      if (kind === "pause") s.toggleDrivePause();
      if (kind === "candidate") s.openCandidateCards(false);
      if (kind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); }
      if (kind === "raid-loading") s.finalBossRaidAssetsLoading = true;
      if (kind === "raid-active") s.finalBossRaidState = { active: true };
      frames(1500); const held = copy(spike());
      check(held.combatTimeMs === before.combatTimeMs && held.casts[0]?.frameIndex === before.casts[0]?.frameIndex && held.impactHistory.length === 0, "stop preserves cast and freezes clock/frame/impact", { before, held });
      if (kind === "pause") s.toggleDrivePause();
      if (kind === "candidate") s.closeCandidateCards();
      if (kind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); }
      s.finalBossRaidAssetsLoading = false; s.finalBossRaidState = null; frames(300);
      check(spike().impactHistory.length === 1 && spike().castHistory.length === 1, "resume uses remaining time without a backlog", spike());
    });
    run("passive-change-freezes-existing-cast", () => {
      spawn({ typeId: "boss_crack", isBoss: true }); until(() => !!cast()); const created = copy(cast()), due = spike().nextCastAtMs;
      arena.applyPassive("overchargeBolt"); arena.applyPassive("rapidSigil");
      check(cast().rawDamage === created.rawDamage && cast().radius === created.radius && cast().durationMs === created.durationMs && spike().nextCastAtMs === due, "new passives do not rewrite cast payload or scheduled next start");
      frames(2100);
      check(spike().castHistory.length === 2 && spike().castHistory[0].rawDamage === 5 && spike().castHistory[1].rawDamage === 6, "new raw damage begins with the next cast", spike().castHistory);
    });
    run("support-rejection-no-retry", () => {
      const target = spawn(); target.supportDamageHoldUntil = s.time.now + 2000; until(() => spike().impactHistory.length > 0);
      const attempts = spike().counts.attempts; target.supportDamageHoldUntil = 0; frames(450);
      check(target.hp === target.maxHp && spike().counts.attempts === attempts, "protected target is not retried in later frames of the same cast", spike());
    });
    run("depth-clears-casts-and-old-life", () => {
      const target = spawn(); until(() => !!cast()); s.stageDepth++;
      frames(1200); check(target.hp === target.maxHp && (spike()?.casts.length || 0) === 0, "Depth transition discards old cast and does not relabel old target", spike());
      s.registerUmbraBloodSpikeEnemyLife(target); frames(450);
      check(target.hp === target.maxHp - 5, "explicitly registered current-Depth life is attackable");
    });
    run("same-object-new-life-at-impact", () => {
      const target = spawn(); until(() => !!cast()); const oldLife = life(target);
      target.isDying = true; target.body.enable = false; step(); target.isDying = false; target.body.enable = true; target.hp = target.maxHp;
      s.registerUmbraBloodSpikeEnemyLife(target); frames(300);
      check(life(target) !== oldLife && target.hp === target.maxHp - 5, "same GameObject new living generation receives only one current impact", spike());
    });
    run("catchup-physical-clock", () => {
      spawn(); frames(50); const before = spike().combatTimeMs, index = current.physical.length;
      step(1000 / 30); const physical = current.physical.slice(index);
      check(physical.length >= 2 && new Set(physical.map(p => p.sceneTime)).size === 1, "actual catch-up has separate steps at the same Scene time");
      check(Math.abs(spike().combatTimeMs - before - physical.reduce((sum, p) => sum + p.deltaMs, 0)) < 1e-6, "SPIKE adds each physics delta exactly once");
    });
    run("current-body-moves-false", () => {
      const target = spawn(); target.body.moves = false; frames(450);
      check(target.hp === target.maxHp - 5, "enemy-only motion stop retains a valid current target", spike());
    });
    run("duplicate-membership-once", () => {
      const target = spawn(), original = s.enemies.getChildren;
      s.enemies.getChildren = function () { const list = original.call(this); return list.concat(target, target); };
      cleanups.push(() => { s.enemies.getChildren = original; }); frames(450);
      check(target.hp === target.maxHp - 5 && spike().counts.attempts === 1, "one living target repeated in the enumerated group list is applied once", spike());
    });
    run("world-correction-current-position", () => {
      const target = spawn(); until(() => !!cast()); const fixed = copy(cast().position);
      move(target, fixed.x + 500, fixed.y); target.body.setVelocity(0, 0);
      // A test-owned overlap callback executes after Body.update and before the
      // WORLD_STEP observers, proving that impact reads collision-resolved data.
      const marker = s.physics.add.image(fixed.x + 500, fixed.y, "umbra-arena-body").setVisible(false);
      marker.body.setCircle(30); let injected = false;
      const collider = s.physics.add.overlap(target, marker, () => {
        if (!injected && spike().combatTimeMs + 1000 / 60 + 1e-6 >= cast().impactDueAtMs) { injected = true; target.body.position.set(fixed.x - target.body.halfWidth, fixed.y - target.body.halfHeight); target.body.updateCenter(); }
      });
      cleanups.push(() => { collider.destroy(); marker.destroy(); }); frames(300);
      check(injected && target.hp === target.maxHp - 5, "resolved current position is eligible despite unknown previous correction", spike());
    });
    if (mode === "both") run("independent-moon-runtime-destruction", () => {
      const target = spawn({ typeId: "boss_crack", isBoss: true }); until(() => !!cast()); const before = copy(spike());
      s.destroyUmbraMoonlightRuntime("TEST_SINGLE_WEAPON_DESTROY"); frames(300);
      check(target.hp === target.maxHp - 5 && spike().runGeneration === before.runGeneration && spike().combatTimeMs > before.combatTimeMs, "destroying MOONLIGHT does not reset SPIKE cast or clock", spike());
    });
    if (mode === "both") run("moon-kills-selected-target-first", () => {
      const original = spawn({ x: 410, y: 500, isElite: false }); until(() => !!cast());
      const point = copy(cast().position); frames(70, "right", "dash");
      check(original.isDying || !original.active, "real MOONLIGHT kills the chosen ordinary enemy before spike impact", moon());
      const other = spawn({ x: point.x, y: point.y + 90 }); frames(250, "left");
      check(spike().counts.impacts === 1 && other.hp < other.maxHp, "SPIKE still impacts fixed point after MOONLIGHT kills its original target", spike());
      check(s.runStats.kills === 1, "two weapons do not award the selected enemy kill twice", s.runStats);
    });
    if (mode === "both") run("production-hit-reaction-keeps-moon-history", () => {
      arena.setHitReactionMode("productionBody"); const target = spawn({ typeId: "boss_crack", isBoss: true, x: 350, y: 590 });
      listener(s.events, "preupdate", () => { if (target.body.enable) target.body.setVelocity(s.playerHitbox.body.velocity.x, s.playerHitbox.body.velocity.y); });
      frames(150, "right", "dash"); const before = copy(moon()); frames(350, "right", "dash");
      const beforeLife = before.targets?.[0]; const afterLife = moon()?.targets?.[0];
      check((spike().counts.accepted || 0) > 0 && (moon()?.counts.accepted || 0) > 0, "both skills apply independent damage");
      check(beforeLife?.lifeId === afterLife?.lifeId && beforeLife?.lastHitAt === afterLife?.lastHitAt, "production body scaling preserves MOONLIGHT life and rehit time", { beforeLife, afterLife, moon: moon() });
      arena.setHitReactionMode("graphics");
    });
    return results;
  }, { rate, mode, suite, population });
}

async function close(run) {
  const { page, context, audit } = run;
  audit.final = await page.evaluate(() => ({ ...window.__spikeAudit, firebasePresent: typeof window.firebase !== "undefined" }));
  audit.coldBootstrapVerified = audit.initial.bootstrap?.beforeTestReset?.spike?.counts?.casts === 0
    && audit.initial.bootstrap?.beforeTestReset?.spike?.counts?.impacts === 0 && audit.initial.bootstrap?.beforeTestReset?.spike?.combatTimeMs === 0;
  audit.passed = !audit.external.length && !audit.pageErrors.length && !audit.final.storage.length && !audit.final.normal.length && !audit.final.firebasePresent && audit.final.probes.length === audit.initial.probes && audit.coldBootstrapVerified;
  await context.close();
}
(async () => {
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER });
    const suites = loadOnly ? [] : (smoke ? [[Number(process.env.UMBRA_TEST_RATE) || 60, process.env.UMBRA_TEST_MODE || "spike"]] : [30, 60, 120].flatMap(rate => [[rate, "spike"], [rate, "both"]]).concat([[60, "no-notify"]]));
    for (const [rate, mode] of suites) {
      const run = await open(mode, rate, "controlled-matrix");
      try { const cases = await execute(run.page, rate, mode); report.cases.push(...cases); console.log(JSON.stringify({ rate, mode, cases: cases.length, failed: cases.filter(c => !c.passed).map(c => ({ name: c.name, failed: c.checks.filter(x => !x.passed) })) })); }
      finally { await close(run); }
    }
    if (!smoke && !matrixOnly) for (const mode of ["spike", "both"]) for (const count of [16, 128, 512]) {
      const run = await open(mode, 60, `load-fresh-${count}`);
      try { const cases = await execute(run.page, 60, mode, "load", count); report.cases.push(...cases); console.log(JSON.stringify({ mode, count, loadCases: cases.length, failed: cases.filter(c => !c.passed).map(c => c.name) })); }
      finally { await close(run); }
    }
  } catch (error) { report.errors.push(error.stack); }
  finally {
    await browser?.close(); report.passed = !report.errors.length && report.cases.length > 0 && report.cases.every(c => c.passed) && report.contexts.every(c => c.passed);
    const name = `bloodspike-browser-${final ? "final" : "development"}${loadOnly ? "-load" : smoke ? "-smoke" : ""}-report.json`, file = path.join(output, name);
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(output, name.replace(/\.json$/, `.previous-${Date.now()}.json`)));
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, errors: report.errors, file })); process.exitCode = report.passed ? 0 : 1;
  }
})();
