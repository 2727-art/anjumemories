"use strict";
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase3", "browser");
const smoke = process.argv.includes("--smoke"), supplement = process.argv.includes("--supplement"), rates = smoke ? [60] : [30, 60, 120];
fs.mkdirSync(output, { recursive: true });
const frozen = new Map();
for (const name of ["index.html", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js"]) {
  const body = fs.readFileSync(path.join(project, name));
  frozen.set(name, { body, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
const report = { createdAt: new Date().toISOString(), smoke, supplement, sources: Object.fromEntries([...frozen].map(([name, value]) => [name, value.sha256])),
  methodology: "Actual Phaser.Game.step/Arcade World and production MOONLIGHT consumer/receiver, synthetic Phaser key states, controlled 30/60/120 Hz timestamps with unchanged fixed 60 Hz physics. Enemy velocity fixtures are explicitly identified and use real Body integration. Pure identical-trajectory geometry is recorded separately in moonlight-geometry-report.json. No device refresh-rate or physical-input claim.",
  cases: [], contexts: [], errors: [] };
let browser;

async function open(rate) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const audit = { rate, external: [], pageErrors: [] }; report.contexts.push(audit);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { audit.external.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    const entry = frozen.get(name);
    return entry ? route.fulfill({ status: 200, body: entry.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => audit.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__moonlightAudit = { probes: [], storage: [], normal: [] };
    for (const name of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[name] = function () { window.__moonlightAudit.storage.push(name); throw new Error("Storage forbidden"); };
    for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() { window.__moonlightAudit.probes.push({ area, stack: new Error().stack }); throw new Error("Storage capability denied"); } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) { window.__moonlightAudit.normal.push(name); return method.apply(this, args); };
      }
    }, { once: true });
  });
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1`);
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase2ADrive")?.moonlightArena && window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase1Assets").status.finished, null, { timeout: 30000 });
  audit.initial = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    return { phaser: Phaser.VERSION, fps: s.physics.world.fps, fixedStep: s.physics.world.fixedStep, probes: window.__moonlightAudit.probes.length, arena: s.moonlightArena.getSnapshot() };
  });
  return { context, page, audit };
}

async function matrix(page, rate) {
  return page.evaluate(({ rate, smoke, supplement }) => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"), arena = s.moonlightArena;
    let time = s.time.now, current = null; const dt = 1000 / rate, results = [];
    const clone = value => JSON.parse(JSON.stringify(value));
    const input = (...keys) => { for (const name of ["up", "down", "left", "right", "w", "a", "s", "d", "dash", "dashAlt"]) { s.keys[name].isDown = keys.includes(name); s.keys[name].isUp = !s.keys[name].isDown; } };
    const center = body => ({ x: body.position.x + (body.isCircle ? body.halfWidth : body.width / 2), y: body.position.y + (body.isCircle ? body.halfHeight : body.height / 2) });
    const step = (delta = dt) => {
      time += delta; const before = s.physicsSteps;
      game.step(time, delta);
      if (current) current.frames.push({ time: s.time.now, delta, physicsSteps: s.physicsSteps - before, player: center(s.playerHitbox.body), mode: s.acMovementState.mode, en: s.stats.stamina, boost: !!s.acMovementState.continuousBoost.active, evade: s.isAcEvadeWindowActive(s.time.now, s.acMovementState), airBrake: !!s.acMovementState.airBrake.active });
    };
    const frames = (ms, ...keys) => { input(...keys); for (let i = 0; i < Math.ceil(ms / dt); i++) step(); };
    const check = (passed, expectation, actual) => current.checks.push({ expectation, passed: !!passed, ...(actual === undefined ? {} : { actual: clone(actual) }) });
    const combat = () => s.getUmbraMoonlightSnapshot();
    const accepted = () => combat().counts.accepted;
    const hooks = [];
    const listen = (event, callback) => { s.events.on(event, callback); hooks.push(() => s.events.off(event, callback)); };
    const place = (x, y) => { s.invalidateUmbraBoostTrace("TEST_SETUP_POSITION"); s.playerHitbox.body.reset(x, y); frames(50); };
    const enemy = (options = {}) => { const target = arena.spawnEnemy(options); current.enemyFixtures.push({ id: target.moonlightArenaId, hp: target.hp, type: target.enemyTypeId, radius: target.body.halfWidth, width: target.body.width, height: target.body.height, options }); return target; };
    const follow = (target, drift = { x: 0, y: 0 }) => {
      listen("preupdate", () => { if (target.body?.enable && !target.isDying) target.body.setVelocity(s.playerHitbox.body.velocity.x + drift.x, s.playerHitbox.body.velocity.y + drift.y); });
      current.enemyMotionFixture = "Test-owned preupdate velocity follows player plus an explicit relative drift; real Body.update integrates every step, without position setters.";
      return drift;
    };
    const historyTarget = () => { place(350, 180); const target = enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 350, y: 280 }); follow(target); return target; };
    function run(name, action, options = {}) {
      if (supplement && !name.startsWith("supplement-")) return;
      arena.configId = options.configuration || "empty"; arena.attackEnabled = options.attack !== false; arena.contactEnabled = false;
      arena.fxMode = options.fx || "off";
      s.finalBossRaidAssetsLoading = false; s.finalBossRaidState = null;
      s.resetDrive("umbraSeraph", options.fixture || "baseline"); input(); step(); step();
      current = { name, rate, options, checks: [], frames: [], physical: [], notices: [], enemyFixtures: [] };
      const off = s.subscribeUmbraBoostTrace("moonlight-browser-observer", notice => current.notices.push(clone(notice)));
      const observer = delta => current.physical.push({ deltaMs: delta * 1000, sceneTime: s.time.now, player: center(s.playerHitbox.body),
        enemies: Array.from(arena.enemies.keys()).filter(e => e.body && e.active).map(e => ({ id: e.moonlightArenaId, hp: e.hp, dying: !!e.isDying, from: { x: e.body.prev.x + (e.body.isCircle ? e.body.halfWidth : e.body.width / 2), y: e.body.prev.y + (e.body.isCircle ? e.body.halfHeight : e.body.height / 2) }, to: center(e.body), planned: { ...e.body.newVelocity }, shape: { circle: e.body.isCircle, width: e.body.width, height: e.body.height } })) });
      s.physics.world.on("worldstep", observer);
      try { action(); } catch (error) { check(false, "case completes without an exception", error.stack); }
      current.arena = clone(arena.getSnapshot()); current.trace = clone(s.getDriveTraceDiagnostics());
      check(current.arena.combat.errors === 0, "attack consumer errors are zero", current.arena.combat.lastError);
      check((current.trace.source?.consumerErrors || 0) === 0, "source consumer errors are zero", current.trace.source?.consumerErrors);
      check(current.trace.A?.hash === current.trace.B?.hash && current.trace.A?.count === current.trace.B?.count && current.trace.A?.duplicates === 0 && current.trace.B?.duplicates === 0, "diagnostic A/B receive identical ordered source notifications");
      check((current.trace.source?.events.length || 0) <= 256 && current.arena.combat.hitHistory.length <= 128, "diagnostic histories are bounded");
      off(); s.physics.world.off("worldstep", observer); hooks.splice(0).forEach(remove => remove());
      current.passed = current.checks.every(c => c.passed); results.push(current); current = null;
    }
    run("stationary-side-pass", () => {
      const target = enemy({ x: 650, y: 560, isElite: true }), hp = target.hp;
      frames(700, "right", "dash"); frames(100, "right");
      check(accepted() === 1, "one side pass causes one accepted hit", combat());
      check(target.hp < hp, "actual existing receiver reduces HP", { before: hp, after: target.hp });
      check(arena.contact.hpDamage === 0, "observation configuration has no contact HP damage");
      check(current.frames.some(f => f.boost && !f.evade), "boost continues after Evasive expires");
    });
    for (const offset of [-0.01, 0, 0.01]) run(`circle-range-${offset}`, () => {
      const target = enemy({ x: 600, y: 650, isElite: true });
      target.y += 500 + 60 + target.body.halfWidth + offset - target.body.center.y; target.body.updateFromGameObject();
      s.registerUmbraMoonlightEnemyLife(target);
      frames(650, "right", "dash"); frames(80, "right");
      check(accepted() === (offset <= 0 ? 1 : 0), "radius boundary matches actual circle halfWidth without an extra 22px", { offset, radius: target.body?.halfWidth, accepted: accepted() });
    });
    run("crossing-moving-enemy", () => {
      const target = enemy({ x: 440, y: 100, isElite: true }); target.body.setVelocity(0, 1800);
      frames(450, "right", "dash"); frames(100, "right");
      check(accepted() >= 1, "enemy crossing during the same step is accepted", combat());
    });
    run("crossing-paths-different-times", () => {
      const target = enemy({ x: 560, y: 100, isElite: true }); target.body.setVelocity(0, 1800);
      frames(450, "right", "dash"); frames(100, "right");
      check(accepted() === 0, "paths crossing at different times are correctly out of range", combat());
    });
    run("single-physics-step-fast-enemy-pass", () => {
      frames(120, "right", "dash"); const at = center(s.playerHitbox.body);
      const target = enemy({ x: at.x + 250, y: at.y + 30, isElite: true });
      target.body.setMaxVelocity(40000, 40000).setVelocity(-30000, 0);
      current.enemyMotionFixture = "One synthetic high-speed enemy has maxVelocity40000 and velocity-30000 px/s; the global World configuration and player movement are unchanged.";
      const before = current.physical.length;
      do { step(); } while (current.physical.length === before);
      const first = current.physical[before], sampled = first.enemies.find(e => e.id === target.moonlightArenaId);
      const source = current.notices.filter(n => n.type === "step").slice(-(current.physical.length - before))[0];
      check(accepted() === 1, "one physics step with entry and exit still accepts one hit", combat());
      check(Math.hypot(source.from.x - sampled.from.x, source.from.y - sampled.from.y) > 60 + target.body.halfWidth
        && Math.hypot(source.to.x - sampled.to.x, source.to.y - sampled.to.y) > 60 + target.body.halfWidth,
      "both same-step endpoints are outside, proving a sweep rather than endpoint detection", { source, sampled });
    });
    run("same-velocity-same-pass", () => {
      historyTarget(); frames(1100, "right", "dash");
      const before = accepted(); frames(120, "right"); frames(350, "right", "dash");
      check(before === 1 && accepted() === 1, "remaining nearby beyond cooldown and pressing DASH again does not rehit", combat());
      check(combat().skips.SAME_PASS > 0, "same-pass suppression is diagnosed");
    });
    run("departure-reentry-and-early-reentry", () => {
      place(350, 180); const target = enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 350, y: 280 }); const drift = follow(target);
      frames(120, "right", "dash"); check(accepted() === 1, "initial near enemy first valid movement hits once");
      drift.y = 1800; frames(120, "right", "dash"); drift.y = -1800; frames(120, "right", "dash"); drift.y = 0;
      check(accepted() === 1 && combat().skips.REHIT_WAIT > 0, "early new pass is consumed without damage", combat());
      frames(520, "right", "dash"); check(accepted() === 1, "waiting inside cannot complete an early rejected pass later");
      drift.y = 1800; frames(120, "right", "dash"); drift.y = -1800; frames(120, "right", "dash"); drift.y = 0;
      check(accepted() === 2, "same held boost can hit on a later distinct pass after exit and cooldown", combat());
    });
    run("nonboost-departure-then-new-boost-pass", () => {
      place(350, 180); const target = enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 350, y: 280 }); const drift = follow(target);
      frames(120, "right", "dash"); drift.y = 1800; frames(120, "right"); drift.y = 0; frames(700, "right");
      check(accepted() === 1, "normal/glide departure advances history without attacking");
      drift.y = -1800; frames(120, "right", "dash"); drift.y = 0;
      check(accepted() === 2, "confirmed nonboost departure permits a later eligible boost entry", combat());
    });
    for (const kind of ["normal", "glide", "brake", "zero-step"]) run(`non-attack-${kind}`, () => {
      if (kind === "zero-step") { enemy({ x: 350, y: 560, isElite: true }); input("right", "dash"); step(0); input("right"); step(0); }
      else if (kind === "normal") { enemy({ x: 460, y: 560, isElite: true }); frames(900, "right"); }
      else { frames(400, "right", "dash"); frames(40, "right"); const c = center(s.playerHitbox.body); enemy({ x: c.x + 35, y: c.y + 55, isElite: true }); frames(400, kind === "brake" ? "left" : "right"); if (kind === "brake") check(current.frames.some(f => f.airBrake), "actual adopted Air Brake activates"); }
      check(accepted() === 0, "non-powered or absent physical movement cannot attack", combat());
    });
    run("attack-off-with-real-trace", () => {
      enemy({ x: 600, y: 560, isElite: true }); frames(600, "right", "dash");
      check(accepted() === 0, "explicit MOONLIGHT OFF blocks damage");
      check(current.notices.some(n => n.valid), "source still emits real powered movement while attack is off");
    }, { attack: false });
    run("notifications-off-no-fallback", () => {
      enemy({ x: 600, y: 560, isElite: true });
      s.verificationContext = Object.freeze({ ...s.verificationContext, traceNotifications: false });
      s.destroyUmbraBoostTrace("TEST_NOTIFICATIONS_OFF"); frames(600, "right", "dash");
      check(accepted() === 0 && s.umbraBoostTrace === null, "disabled notification source has no independent movement attack fallback");
    });
    run("display-only-scale", () => {
      const target = enemy({ x: 600, y: 650, isElite: true }); const width = target.body.width;
      arena.enemies.get(target).visualScale = 8; frames(650, "right", "dash");
      check(accepted() === 0 && target.body.width === width, "large display alone does not enlarge body or MOONLIGHT range");
    });
    run("rectangular-boss-relative-sweep", () => {
      const target = enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 650, y: 600, rect: { width: 240, height: 110 } });
      frames(700, "right", "dash");
      check(accepted() === 1 && target.hp < target.maxHp, "actual rectangular boss body accepts one rounded-rectangle side pass");
    });
    run("rectangular-boss-circumcircle-exclusion", () => {
      enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 650, y: 605, rect: { width: 240, height: 10 } });
      frames(700, "right", "dash"); check(accepted() === 0, "thin rectangle cannot be replaced by a large circumscribed circle");
    });
    run("wall-same-side-and-occlusion", () => {
      place(1643, 1100);
      const near = enemy({ x: 1595, y: 995, isElite: true });
      const far = enemy({ x: 1700, y: 995, isElite: true });
      // The opposite target deliberately overlaps a thin test wall-free pocket in
      // the existing solid wall. Disable enemy/wall resolution only for this target
      // fixture via a separate body collision mask; LOS must still reject it.
      far.body.checkCollision.none = true;
      frames(350, "up", "dash");
      check(near.hp < near.maxHp, "same-side enemy is hittable during valid tangent motion");
      check(far.hp === far.maxHp && combat().counts.losBlocked > 0, "in-range target behind actual wall is rejected by LOS", combat());
    });
    run("wall-push-zero-movement", () => {
      place(1643, 1040); enemy({ x: 1590, y: 1050, isElite: true });
      frames(400, "right", "dash");
      check(current.notices.some(n => n.reason === "ZERO_MOVEMENT"), "actual wall push produces zero displacement steps");
      check(accepted() === 0, "boosting in place against a wall is not an attack");
    });
    run("inner-corner-conservative-exclusion", () => {
      place(1600, 1300); enemy({ x: 1660, y: 1360, isElite: true }); frames(700, "right", "down", "dash");
      const bad = current.notices.filter(n => n.type === "step" && ["WALL_CHORD_UNVERIFIED", "UNEXPLAINED_CORRECTION"].includes(n.reason));
      check(bad.length > 0, "actual corner produces conservative excluded player steps");
      check(combat().hitHistory.every(hit => !bad.some(n => n.physicalStep === hit.physicalStep)), "excluded corner steps produce no accepted attacks");
    });
    if (supplement) run("supplement-outer-corner", () => {
      place(2880, 895); enemy({ x: 3040, y: 920, isElite: true });
      frames(380, "right", "down", "dash"); frames(400, "right", "dash");
      const valid = current.notices.filter(n => n.type === "step" && n.valid);
      const obstacles = s.walls.getChildren().map(wall => ({ left: wall.body.left, right: wall.body.right, top: wall.body.top, bottom: wall.body.bottom }));
      const unsafe = valid.filter(n => obstacles.some(rect => {
        const hit = s.getUmbraMoonlightSegmentRectInterval(n.from, n.to, rect.left + 1e-6, rect.top + 1e-6, rect.right - 1e-6, rect.bottom - 1e-6);
        return !!hit;
      }));
      current.wallBounds = obstacles;
      check(s.collisionCount > 0 && valid.length > 0, "outer corner scenario includes actual collisions and valid sliding movement", { collisions: s.collisionCount, valid: valid.length });
      check(unsafe.length === 0, "every valid source segment avoids every actual obstacle interior", unsafe);
      const excluded = current.notices.filter(n => n.type === "step" && !n.valid);
      check(combat().hitHistory.every(hit => !excluded.some(n => n.physicalStep === hit.physicalStep)), "outer corner excluded movement never produces accepted attacks");
    });
    for (const kind of ["pause", "candidate", "hidden"]) run(`history-preserved-${kind}`, () => {
      historyTarget(); frames(180, "right", "dash"); const before = clone(combat()), lastHitAt = before.targets[0]?.lastHitAt;
      if (kind === "pause") s.toggleDrivePause();
      if (kind === "candidate") s.openCandidateCards(false);
      if (kind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); }
      frames(900); check(combat().combatTimeMs === before.combatTimeMs, "paused real physics does not advance combat cooldown");
      if (kind === "pause") s.toggleDrivePause();
      if (kind === "candidate") s.closeCandidateCards();
      if (kind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); }
      frames(80, "right"); frames(350, "right", "dash");
      check(accepted() === 1 && combat().targets[0]?.lastHitAt === lastHitAt, "resume keeps the same living enemy hit history", combat());
    });
    run("one-warped-target-does-not-block-another", () => {
      frames(120, "right", "dash"); const c = center(s.playerHitbox.body);
      const warped = enemy({ x: c.x + 600, y: c.y + 50, isElite: true }); const other = enemy({ x: c.x + 25, y: c.y + 50, isElite: true });
      const firstStep = s.umbraBoostTrace.physicalStep + 1, before = current.physical.length;
      warped.x -= 600; warped.body.updateFromGameObject();
      do { step(); } while (current.physical.length === before);
      const first = current.physical[before], warpAtFirst = first.enemies.find(e => e.id === warped.moonlightArenaId), otherAtFirst = first.enemies.find(e => e.id === other.moonlightArenaId);
      check(combat().skips.TARGET_DISCONTINUITY > 0, "enemy discontinuity is diagnosed");
      check(warpAtFirst.hp === warped.maxHp && otherAtFirst.hp < other.maxHp, "only the warped enemy is excluded in that physical step", { firstStep, warped: warpAtFirst.hp, other: otherAtFirst.hp });
    });
    run("shape-change-keeps-living-history", () => {
      const target = historyTarget(); frames(180, "right", "dash"); const life = combat().targets[0]?.lifeId, hitAt = combat().targets[0]?.lastHitAt;
      target.body.setCircle(target.body.halfWidth + 1); frames(100, "right", "dash");
      check(combat().skips.TARGET_BODY_CHANGED > 0, "changed body shape is excluded and rebased");
      check(combat().targets[0]?.lifeId === life && combat().targets[0]?.lastHitAt === hitAt && accepted() === 1, "shape changes do not grant a new life or clear rehit time");
    });
    run("same-object-new-life", () => {
      const target = historyTarget(); frames(180, "right", "dash"); const oldLife = combat().targets[0]?.lifeId;
      target.isDying = true; target.body.enable = false; step();
      target.isDying = false; target.body.enable = true; target.hp = target.maxHp;
      s.registerUmbraMoonlightEnemyLife(target); frames(100, "right", "dash");
      check(accepted() === 2 && combat().targets[0]?.lifeId !== oldLife, "explicit synthetic pool reuse grants only the new living generation a new initial pass", combat());
    });
    for (const flag of ["finalBossRaidAssetsLoading", "raid", "gameOver", "extractionComplete"]) run(`guard-${flag}`, () => {
      enemy({ x: 600, y: 560, isElite: true });
      if (flag === "raid") s.finalBossRaidState = { active: true }; else s[flag] = true;
      frames(600, "right", "dash"); check(accepted() === 0, "blocked combat context accepts no damage");
    });
    run("same-scene-time-multiple-physics-steps", () => {
      enemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 600, y: 570 });
      frames(100, "right", "dash"); const previous = combat().combatTimeMs, offset = current.notices.length;
      input("right", "dash"); step(1000 / 30);
      const notices = current.notices.slice(offset).filter(n => n.type === "step");
      check(notices.length >= 2 && new Set(notices.map(n => n.timeMs)).size === 1, "actual catch-up notifications share Scene time but retain separate physics order", notices);
      check(Math.abs(combat().combatTimeMs - previous - notices.reduce((sum, n) => sum + n.deltaMs, 0)) < 1e-6, "combat clock counts each physical delta once, not each start/end notification");
    });
    if (!smoke && rate === 60) for (const count of [16, 128, 512]) run(`load-${count}-targets`, () => {
      for (let i = 0; i < count; i++) enemy({ x: 650 + Math.floor(i / 16) * 70, y: i < 16 ? 470 + (i % 4) * 20 : 1200 + (i % 8) * 35, isElite: true });
      frames(600, "right", "dash");
      check(combat().counts.targets >= count, "snapshot and candidate search are measured for the requested target population");
      check(arena.effects.length <= 12 && combat().hitHistory.length <= 128, "load does not grow FX or history without a bound");
      current.load = { targetCount: count, counts: combat().counts, processing: { maxMs: combat().maxProcessingMs, totalMs: combat().totalProcessingMs }, fx: arena.getSnapshot().fx };
    }, { fx: "image" });
    if (supplement && rate === 60) for (const fx of ["off", "image"]) for (let repeat = 0; repeat < 3; repeat++) for (const count of [16, 128, 512]) run(`supplement-load-${fx}-${repeat}-${count}`, () => {
      for (let i = 0; i < count; i++) enemy({ x: 650 + Math.floor(i / 16) * 70, y: i < 16 ? 470 + (i % 4) * 20 : 1200 + (i % 8) * 35, isElite: true });
      frames(600, "right", "dash");
      check(accepted() === 16, "render mode and repeated target population preserve 16 physical hits");
      current.load = { targetCount: count, repeat, fx, counts: combat().counts, processing: { maxMs: combat().maxProcessingMs, totalMs: combat().totalProcessingMs, averagePerPhysicsStepMs: combat().totalProcessingMs / Math.max(1, combat().counts.steps) }, effects: arena.getSnapshot().fx };
    }, { fx });
    return results;
  }, { rate, smoke, supplement });
}

(async () => {
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER });
    for (const rate of rates) {
      const { context, page, audit } = await open(rate);
      try {
        const cases = await matrix(page, rate); report.cases.push(...cases);
        console.log(JSON.stringify({ rate, cases: cases.length, failed: cases.filter(c => !c.passed).map(c => ({ name: c.name, failures: c.checks.filter(x => !x.passed) })) }));
        if (rate === 60) await page.screenshot({ path: path.join(output, supplement ? "moonlight-browser-supplement-hud.png" : "moonlight-browser-final-hud.png") });
      } finally {
        audit.final = await page.evaluate(() => ({ ...window.__moonlightAudit, firebase: typeof window.firebase !== "undefined" }));
        audit.passed = !audit.external.length && !audit.pageErrors.length && !audit.final.storage.length && !audit.final.normal.length && !audit.final.firebase && audit.final.probes.length === audit.initial.probes;
        await context.close();
      }
    }
  } catch (error) { report.errors.push(error.stack); }
  finally {
    await browser?.close();
    report.passed = !report.errors.length && report.cases.length > 0 && report.cases.every(c => c.passed) && report.contexts.every(c => c.passed);
    const file = path.join(output, supplement ? "moonlight-browser-supplement-report.json" : smoke ? "moonlight-browser-smoke-report.json" : "moonlight-browser-report.json");
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, errors: report.errors, file }));
    process.exitCode = report.passed ? 0 : 1;
  }
})();
