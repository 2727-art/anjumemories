"use strict";

// Synthetic input and a controlled Game.step timeline, using the unmodified
// Phaser Arcade World, its production fixed step and the actual Drive walls.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase2b", "output");
const smoke = process.argv.includes("--smoke");
const realtimeOnly = process.argv.includes("--realtime");
const rates = smoke ? [60] : [30, 60, 120];
fs.mkdirSync(output, { recursive: true });
const frozenSources = new Map();
for (const name of ["index.html", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraPreview.js", "umbraPreviewAssets.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js"]) {
  const body = fs.readFileSync(path.join(project, name));
  frozenSources.set(name, { body, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
const report = {
  smoke, base, createdAt: new Date().toISOString(),
  methodology: "Fresh isolated Chromium contexts; synthetic Phaser Key states; actual Phaser.Game.step at controlled 30/60/120 Hz. Physics configuration, World/Body prototypes, update order and wall geometry are unchanged. Controlled timeline results are not claims of real display refresh or physical keyboard input. Separate real browser keyboard smoke is included.",
  sources: Object.fromEntries([...frozenSources].map(([name, value]) => [name, value.sha256])),
  contexts: [], cases: [], errors: []
};
let browser;
async function openContext(label, controlled = true) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const record = { label, externalRequests: [], pageErrors: [] };
  report.contexts.push(record);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { record.externalRequests.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname);
    const name = pathname === "/" ? "index.html" : pathname.slice(1);
    const source = frozenSources.get(name);
    return source ? route.fulfill({ status: 200, body: source.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", error => record.pageErrors.push(error.message));
  await page.addInitScript(() => {
    window.__traceAudit = { storageProbes: [], storageOperations: [], normalEntries: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () {
      window.__traceAudit.storageOperations.push(method); throw new Error("Storage forbidden in isolated trace test");
    };
    for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() {
      window.__traceAudit.storageProbes.push({ area, stack: new Error().stack }); throw new Error("Storage capability denied");
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) { window.__traceAudit.normalEntries.push(name); return method.apply(this, args); };
      }
    }, { once: true });
  });
  await page.goto(`${base}/?umbraPreview=1&umbraDrive=1`);
  await page.waitForFunction(() => {
    const game = window.__SURVIVAL_GAME__;
    return game?.scene.isActive("UmbraPhase2ADrive") && game.scene.getScene("UmbraPhase2ADrive").stats && game.scene.getScene("UmbraPhase1Assets").status.finished;
  }, null, { timeout: 30000 });
  record.engine = await page.evaluate(controlled => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    if (controlled) game.loop.stop();
    return { phaser: Phaser.VERSION, fixedStep: scene.physics.world.fixedStep, physicsFps: scene.physics.world.fps, storageProbeCount: window.__traceAudit.storageProbes.length, brake: scene.airBrakeVariant, trace: !!scene.ensureUmbraBoostTrace() };
  }, controlled);
  return { context, page, record };
}
async function finishContext(opened) {
  opened.record.isolation = await opened.page.evaluate(() => ({ ...window.__traceAudit, firebasePresent: typeof window.firebase !== "undefined" }));
  const r = opened.record;
  r.passed = r.externalRequests.length === 0 && r.pageErrors.length === 0 && r.isolation.storageOperations.length === 0 && r.isolation.normalEntries.length === 0 && !r.isolation.firebasePresent && r.isolation.storageProbes.length === r.engine.storageProbeCount;
  await opened.context.close();
}

async function runMatrix(page, rate) {
  return page.evaluate(rate => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("UmbraPhase2ADrive");
    const results = [];
    let timestamp = Math.max(scene.time.now, 1000);
    const frameDelta = 1000 / rate;
    const clone = value => JSON.parse(JSON.stringify(value));
    const point = body => ({ x: body.position.x + body.halfWidth, y: body.position.y + body.halfHeight });
    const input = (...names) => {
      for (const name of ["up", "down", "left", "right", "w", "a", "s", "d", "dash", "dashAlt"]) {
        scene.keys[name].isDown = names.includes(name); scene.keys[name].isUp = !scene.keys[name].isDown;
      }
      scene.mobileMoveVector = { x: 0, y: 0 }; scene.mobileDashHeld = false;
    };
    let current;
    const step = (delta = frameDelta) => {
      timestamp += delta;
      const before = scene.physicsSteps;
      game.step(timestamp, delta);
      if (current) {
        const body = scene.playerHitbox?.body;
        current.frames.push({ time: scene.time.now, delta, physicsSteps: scene.physicsSteps - before, body: body?.position ? point(body) : null, mode: scene.acMovementState?.mode, boost: !!scene.acMovementState?.continuousBoost?.active, airBrake: !!scene.acMovementState?.airBrake?.active, evade: scene.isAcEvadeWindowActive(scene.time.now, scene.acMovementState), en: scene.stats.stamina, inputX: scene.acMovementState?.lastInputVector?.normalizedX, inputY: scene.acMovementState?.lastInputVector?.normalizedY });
      }
    };
    const frames = (ms, ...keys) => { input(...keys); for (let i = 0; i < Math.ceil(ms / frameDelta); i++) step(); };
    const check = (value, name, detail) => current.checks.push({ name, passed: !!value, ...(detail === undefined ? {} : { detail }) });
    const events = type => current.A.filter(event => event.type === type);
    const valid = () => events("step").filter(event => event.valid);
    const reset = (fixture = "baseline", mech = "umbraSeraph") => {
      scene.isFinalBossRaidActive = () => false;
      scene.finalBossRaidAssetsLoading = false;
      scene.gameOver = false; scene.extractionComplete = false; scene.shopActive = false;
      scene.driveHidden = false;
      scene.resetDrive(mech, fixture);
      input(); step(); step();
    };
    const place = (x, y) => {
      scene.invalidateUmbraBoostTrace("TEST_SETUP_POSITION");
      scene.playerHitbox.body.reset(x, y);
      input(); step(); step();
    };
    function run(name, body, fixture = "baseline", mech = "umbraSeraph") {
      reset(fixture, mech);
      current = { name, rate, fixture, mech, checks: [], A: [], B: [], physical: [], frames: [], immutable: true };
      const offA = scene.subscribeUmbraBoostTrace("test-A", event => {
        const before = JSON.stringify(event);
        current.immutable &&= Object.isFrozen(event) && (!event.from || Object.isFrozen(event.from)) && (!event.to || Object.isFrozen(event.to)) && (!event.fixedStart || Object.isFrozen(event.fixedStart));
        try { event.valid = "corrupted-by-A"; if (event.from) event.from.x = -123456; } catch (_) { /* Frozen payload is expected. */ }
        current.immutable &&= before === JSON.stringify(event);
        current.A.push(clone(event));
      });
      const offB = scene.subscribeUmbraBoostTrace("test-B", event => current.B.push(clone(event)));
      const physical = delta => {
        const body = scene.playerHitbox?.body, snapshot = scene.getUmbraBoostTraceSnapshot();
        if (body?.position) current.physical.push({ physicalStep: snapshot?.physicalStep, delta, from: { x: body.prev.x + body.halfWidth, y: body.prev.y + body.halfHeight }, to: point(body), raw: { x: body.newVelocity.x, y: body.newVelocity.y }, velocity: { x: body.velocity.x, y: body.velocity.y }, blocked: { ...body.blocked }, touching: { ...body.touching } });
      };
      scene.physics.world.on("worldstep", physical);
      try { body(); } catch (error) { current.checks.push({ name: "case completed", passed: false, detail: error.stack }); }
      current.snapshot = clone(scene.getUmbraBoostTraceSnapshot());
      current.diagnostics = clone(scene.getDriveTraceDiagnostics());
      check(JSON.stringify(current.A) === JSON.stringify(current.B), "independent consumers receive identical ordered payloads");
      check(current.immutable, "consumer A cannot mutate events or numeric points seen by B");
      check(current.A.every((event, i) => i === 0 || event.order > current.A[i - 1].order), "monotonic unique notification order");
      const physicalEvents = events("step");
      check(new Set(physicalEvents.map(event => event.physicalStep)).size === physicalEvents.length, "one step notification per physicalStep");
      const measured = new Map(current.physical.map(sample => [sample.physicalStep, sample]));
      const mismatch = physicalEvents.filter(event => {
        const sample = measured.get(event.physicalStep);
        return event.valid && (!sample || Math.hypot(event.to.x - sample.to.x, event.to.y - sample.to.y) > 0.001 || Math.hypot(event.from.x - sample.from.x, event.from.y - sample.from.y) > 0.001);
      });
      check(mismatch.length === 0, "valid segment endpoints match post-collision body and step-local body.prev", mismatch.slice(0, 3));
      const wallCrossings = [];
      for (const event of physicalEvents.filter(event => event.valid)) {
        const line = new Phaser.Geom.Line(event.from.x, event.from.y, event.to.x, event.to.y);
        for (const wall of scene.walls.getChildren()) {
          const body = wall.body;
          if (!body?.enable) continue;
          // Independent vendor geometry checks the actual solid interior. The
          // producer uses a custom swept path check with expanded rectangles.
          const interior = new Phaser.Geom.Rectangle(body.left + 0.001, body.top + 0.001, body.width - 0.002, body.height - 0.002);
          if (Phaser.Geom.Intersects.LineToRectangle(line, interior)) wallCrossings.push({ event, wall: { left: body.left, top: body.top, width: body.width, height: body.height } });
        }
      }
      check(wallCrossings.length === 0, "all valid center segments avoid actual solid wall interiors using independent Phaser geometry", wallCrossings.slice(0, 3));
      current.reasonCounts = physicalEvents.reduce((counts, event) => { const key = `${event.valid ? "valid" : "excluded"}:${event.reason}`; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
      check(!current.snapshot || current.snapshot.events.length <= 256, "source diagnostic log remains bounded");
      if (current.diagnostics.A) check(current.diagnostics.A.count === current.diagnostics.B.count && current.diagnostics.A.hash === current.diagnostics.B.hash && current.diagnostics.A.duplicates === 0 && current.diagnostics.B.duplicates === 0, "UI consumers A/B remain equal without duplicates");
      offA?.(); offB?.(); scene.physics.world.off("worldstep", physical);
      current.passed = current.checks.every(check => check.passed);
      results.push(current); current = null;
    }
    run("successful-start-release-glide-brake", () => {
      frames(100, "right"); const cruiseEnd = current.A.length;
      frames(400, "right", "dash"); const heldEnd = current.A.length;
      frames(70, "right"); frames(420, "left"); frames(100);
      check(events("start").length === 1, "one accepted start, including nested start helpers", events("start"));
      check(events("end").length === 1, "one end on release", events("end"));
      check(current.A.slice(0, cruiseEnd).every(event => !event.valid), "ordinary movement is excluded");
      check(valid().length > 0, "powered physics produces valid movement");
      const heldFrames = current.frames.filter(frame => frame.boost && !frame.evade);
      check(heldFrames.length > 0, "powered movement persists after Evasive expires");
      check(events("step").filter(event => event.firstPhysicalEvaluation).length === 1, "first physical evaluation is distinct and once");
      check(events("step").filter(event => event.firstValidMovement).length === 1, "first valid movement is once");
      const starts = events("start"), end = events("end")[0];
      check(!end || current.A.filter(event => event.order > end.order).every(event => !event.valid), "no powered segment after release end");
      check(starts.length === 1 && current.A.filter(event => event.boostSequence === starts[0].boostSequence && event.fixedStart).every(event => JSON.stringify(event.fixedStart) === JSON.stringify(starts[0].fixedStart)), "start body center is an immutable per-boost origin");
      check(current.A.slice(heldEnd).some(event => event.type === "step" && !event.valid), "glide/brake observation is excluded");
      check(current.frames.some(frame => frame.airBrake), "actual Air Brake trigger exercised");
    });
    run("start-release-without-physics-step", () => {
      const before = scene.physicsSteps;
      input("right", "dash"); step(0); input("right"); step(0);
      check(scene.physicsSteps === before, "start and release occurred without an Arcade step");
      check(events("start").length === 1 && events("end").length === 1, "accepted zero-step boost has one start and one end", current.A);
      check(events("step").length === 0 && valid().length === 0, "zero-step boost produces no fabricated segment");
    });
    run("failed-start-empty-energy", () => {
      scene.stats.stamina = 0;
      frames(60, "right", "dash");
      check(events("start").length === 0 && valid().length === 0, "failed start has no start or powered segment", scene.snapshot().failReason);
    });
    run("held-long-and-retrigger-sequence", () => {
      frames(1500, "right", "dash"); frames(180, "right"); frames(400, "right", "dash"); frames(100, "right");
      const starts = events("start"), ends = events("end");
      check(starts.length === 2 && ends.length === 2, "long hold and next accepted press create exactly two sequences", { starts, ends });
      check(starts.length === 2 && starts[1].boostSequence > starts[0].boostSequence, "boost sequence increases between accepted starts");
      frames(2600);
      check(scene.getUmbraBoostTraceSnapshot().events.length <= 256 && current.A.length > 256, "long run preserves bounded producer history while consumers receive stream");
      if (rate === 30) check(current.frames.some(frame => frame.physicsSteps >= 2), "30 Hz produces multiple actual physics steps per scene update");
      if (rate === 120) check(current.frames.some(frame => frame.physicsSteps === 0), "120 Hz includes scene updates without a physics step");
    }, "deep");
    run("energy-exhaustion-ends-once", () => {
      frames(2700, "right", "dash");
      const starts = events("start"), ends = events("end");
      check(starts.length === 1 && ends.length === 1, "held input cannot restart after energy exhaustion", { starts, ends });
      check(scene.acMovementState.mustReleaseDashBeforeBoost, "full overheat retains the release requirement");
      check(ends.length === 1 && current.A.filter(event => event.order > ends[0].order).every(event => !event.valid), "no old powered segment after EN end");
    });
    run("diagonal-powered-straight", () => {
      frames(350, "right", "down", "dash"); frames(100, "right", "down");
      check(valid().length > 0, "diagonal boost produces real movement segments");
      check(valid().every(event => Math.abs((event.to.x - event.from.x) - (event.to.y - event.from.y)) < 0.01), "diagonal center path follows normalized movement input");
      check(events("start").length === 1 && events("end").length === 1, "diagonal hold remains one boost sequence");
    });
    for (const direction of ["down", "left"]) run(`powered-turn-${direction === "down" ? 90 : 180}`, () => {
      frames(250, "right", "dash"); const offset = current.A.length;
      frames(650, direction, "dash"); frames(100, direction);
      const turning = current.A.slice(offset).filter(event => event.valid);
      check(events("start").length === 1 && events("end").length === 1, "direction changes do not synthesize a new start");
      current.requestedInputTurnDegrees = direction === "down" ? 90 : 180;
      current.observedPoweredHeadingsDegrees = turning.map(event => Math.atan2(event.to.y - event.from.y, event.to.x - event.from.x) * 180 / Math.PI);
      check(current.frames.some(frame => frame.boost && (direction === "down" ? frame.inputY === 1 : frame.inputX === -1)), "changed 90/180 degree input reaches the actual powered movement update");
      check(turning.length > 0 && current.observedPoweredHeadingsDegrees.some(angle => Math.abs(angle) > 1), "existing limited steering starts turning and real curved movement remains observable");
      const sequence = events("start")[0]?.boostSequence;
      check(turning.every(event => event.boostSequence === sequence), "turning segments retain the original boost sequence");
    }, "deep");
    run("wall-blocked-start-then-tangent", () => {
      place(1643, 1040);
      const offset = current.A.length;
      frames(260, "right", "dash"); const blockedEnd = current.A.length;
      frames(650, "up", "dash"); frames(100, "up");
      const sequence = current.A.slice(offset).find(event => event.type === "start")?.boostSequence;
      const blocked = current.A.slice(offset, blockedEnd).filter(event => event.type === "step" && event.boostSequence === sequence);
      check(blocked.length > 0 && blocked.every(event => !event.valid), "zero displacement wall contact cannot become a movement hit", blocked);
      check(blocked.some(event => event.firstPhysicalEvaluation), "first physics is reported during immobile wall contact");
      const tangent = valid().filter(event => event.boostSequence === sequence && Math.abs(event.to.x - event.from.x) < 0.001 && Math.abs(event.to.y - event.from.y) > 0.001);
      check(tangent.length > 0, "same boost preserves actual tangent movement after blocked start", tangent.slice(0, 3));
      check(events("step").filter(event => event.firstValidMovement).length === 1, "delayed first valid movement occurs once");
    }, "deep");
    run("inner-corner-collision", () => {
      place(1600, 1300); frames(700, "right", "down", "dash"); frames(100);
      check(scene.collisionCount > 0, "actual static wall collider resolved the corner");
      check(valid().every(event => Math.hypot(event.to.x - event.from.x, event.to.y - event.from.y) <= 200), "corner never emits a warp-sized segment");
      check(events("step").some(event => !event.valid), "blocked or unsafe correction is excluded");
    }, "deep");
    run("high-speed-solid-wall", () => {
      place(2530, 1100); frames(700, "right", "dash"); frames(100);
      check(scene.collisionCount > 0, "high speed reaches actual square wall collider");
      const throughWall = valid().filter(event => event.from.x < 2958 - 0.001 && event.to.x > 2958 + 0.001 && Math.min(event.from.y, event.to.y) >= 958 && Math.max(event.from.y, event.to.y) <= 1242);
      check(throughWall.length === 0, "no valid straight segment crosses expanded solid wall", throughWall);
    }, "deep");
    run("outer-corner-collision", () => {
      place(2870, 880); frames(500, "right", "down", "dash"); frames(200, "right", "dash"); frames(100, "right");
      check(scene.collisionCount > 0, "actual circle/static-rectangle outer corner collision occurred");
      check(events("step").length > 0, "outer-corner physical observations remain available");
    }, "deep");
    for (const distance of [1, 700]) run(`unannounced-body-reset-${distance}px`, () => {
      frames(200, "right", "dash"); const offset = current.A.length, previous = point(scene.playerHitbox.body);
      scene.playerHitbox.body.reset(previous.x + distance, previous.y);
      frames(100, "right", "dash");
      const after = current.A.slice(offset);
      check(after.some(event => event.type === "invalidate" || /BODY|DISCONT|RESET|REBASE|POSITION|EXTERNAL/.test(event.reason)), "position discontinuity is identified even for a short reset", after.slice(0, 8));
      check(after.filter(event => event.valid).every(event => Math.hypot(event.to.x - event.from.x, event.to.y - event.from.y) < 100), "reset displacement never becomes a movement segment");
    });
    run("sprite-offset-only", () => {
      frames(100, "right", "dash");
      const offset = current.A.length;
      scene.playerSprite.setPosition(scene.playerSprite.x + 800, scene.playerSprite.y - 500).setScale(4).setRotation(1.3);
      frames(100, "right", "dash"); frames(100, "right");
      check(current.A.slice(offset).some(event => event.valid), "sprite placement does not suppress real body movement");
      check(current.A.slice(offset).filter(event => event.valid).every(event => Math.hypot(event.to.x - event.from.x, event.to.y - event.from.y) < 100), "sprite offset/scale never changes trace endpoints");
    });
    run("display-facing-fixed-lateral-motion", () => {
      const originalPose = scene.setPlayerRobotPose;
      // This is an explicit presentation-only stub: no real enemy is spawned.
      // It verifies that a fixed upward display pose cannot redirect trace data.
      scene.setPlayerRobotPose = function (_direction, moving, boost) { return originalPose.call(this, "up", moving, boost); };
      try {
        frames(350, "right", "dash"); frames(100, "right");
        check(scene.driveDirection === "up", "test presentation stub holds display facing upward");
        check(valid().length > 0 && valid().every(event => event.to.x > event.from.x && Math.abs(event.to.y - event.from.y) < 0.01), "lateral body movement remains horizontal despite fixed display facing");
      } finally { scene.setPlayerRobotPose = originalPose; }
    });
    run("body-replacement", () => {
      frames(180, "right", "dash"); const offset = current.A.length;
      const original = scene.playerHitbox, originalBody = original.body, at = point(originalBody);
      originalBody.enable = false;
      const replacement = scene.add.circle(at.x, at.y, 22, 0xffffff, 0);
      scene.physics.add.existing(replacement); replacement.body.setCircle(22);
      scene.playerHitbox = replacement;
      frames(100, "right", "dash");
      check(current.A.slice(offset).some(event => /BODY/.test(event.reason)), "body identity replacement invalidates the old movement basis");
      check(current.A.slice(offset).every(event => !event.valid), "replacement cannot inherit an active powered command");
      scene.playerHitbox = original; originalBody.enable = true; replacement.destroy();
    });
    run("body-disabled", () => {
      frames(180, "right", "dash"); const offset = current.A.length;
      scene.playerHitbox.body.enable = false;
      frames(100, "right", "dash");
      check(current.A.slice(offset).some(event => event.type === "invalidate"), "disabled body invalidates the old basis");
      check(current.A.slice(offset).every(event => !event.valid), "disabled body emits no valid movement");
      scene.playerHitbox.body.enable = true;
    });
    run("destroyed-body", () => {
      frames(180, "right", "dash"); const offset = current.A.length;
      const original = scene.playerHitbox, at = point(original.body);
      const replacement = scene.add.circle(at.x, at.y, 22, 0xffffff, 0);
      scene.physics.add.existing(replacement); replacement.body.setCircle(22);
      scene.playerHitbox = replacement;
      replacement.body.destroy();
      try {
        step();
        check(current.A.slice(offset).some(event => event.type === "invalidate"), "destroyed body cancels outstanding trace before a physical evaluation");
        check(current.A.slice(offset).every(event => !event.valid), "destroyed body never emits a valid segment");
      } finally { scene.playerHitbox = original; replacement.destroy(); }
    });
    run("external-velocity-two-catch-up-steps", () => {
      frames(180, "right", "dash"); const offset = current.A.length;
      // A test-owned preupdate observer injects an external velocity after the
      // trace's continuity check and before Arcade runs. No engine patch is used.
      scene.events.once("preupdate", () => scene.playerHitbox.body.setVelocity(0, -600));
      step(1000 / 30);
      const affected = current.A.slice(offset).filter(event => event.type === "step");
      check(affected.length >= 2, "external velocity test actually executes multiple physics steps", affected);
      check(affected.every(event => !event.valid), "same externally changed command stays excluded for all catch-up steps", affected);
      check(affected.some(event => /EXTERNAL_VELOCITY/.test(event.reason)), "external velocity is diagnosed explicitly");
      frames(100, "right", "dash");
      check(current.A.slice(offset + affected.length).some(event => event.valid), "fresh production velocity submission can resume valid movement");
    });
    run("post-overlap-velocity-change-catch-up", () => {
      frames(180, "right", "dash"); const offset = current.A.length;
      const at = point(scene.playerHitbox.body);
      const zone = scene.add.rectangle(at.x, at.y, 1000, 1000, 0xffffff, 0);
      scene.physics.add.existing(zone, true);
      let injected = false;
      const overlap = scene.physics.add.overlap(scene.playerHitbox, zone, () => {
        if (injected) return;
        injected = true;
        const body = scene.playerHitbox.body;
        current.postOverlapInjection = { before: { x: body.velocity.x, y: body.velocity.y }, alreadyIntegrated: { x: body.newVelocity.x, y: body.newVelocity.y }, point: point(body) };
        body.setVelocity(body.velocity.x * 2, body.velocity.y * 2);
        current.postOverlapInjection.after = { x: body.velocity.x, y: body.velocity.y };
      });
      try {
        step(1000 / 30);
        const affected = current.A.slice(offset).filter(event => event.type === "step");
        current.postOverlapSteps = affected;
        check(injected && affected.length >= 2, "actual overlap callback changes velocity between Body.update and WORLD_STEP with catch-up", current.postOverlapInjection);
        check(affected[0]?.valid === true && affected[0]?.nextCommandExcludedReason === "EXTERNAL_POST_COLLIDER_VELOCITY", "already completed first movement stays valid but marks the next command unsafe", affected.slice(0, 2));
        check(affected.slice(1).length > 0 && affected.slice(1).every(event => !event.valid && event.reason === "EXTERNAL_MOTION"), "later catch-up movement cannot inherit post-overlap external velocity", affected.slice(1));
        const first = affected[0], second = affected[1];
        if (first && second) check(Math.abs(Math.hypot(second.to.x - second.from.x, second.to.y - second.from.y) - 2 * Math.hypot(first.to.x - first.from.x, first.to.y - first.from.y)) < 0.001, "second real physical displacement reflects doubled external velocity, not just a synthetic notice");
      } finally { overlap.destroy(); zone.destroy(); }
      const resumeOffset = current.A.length;
      frames(100, "right", "dash");
      check(current.A.slice(resumeOffset).some(event => event.valid), "next production movement submission resumes normal trace attribution");
    });
    for (const pauseKind of ["pause", "candidate", "hidden"]) run(`interrupt-${pauseKind}`, () => {
      frames(200, "right", "dash");
      const before = point(scene.playerHitbox.body), offset = current.A.length, en = scene.stats.stamina;
      if (pauseKind === "pause") scene.toggleDrivePause();
      if (pauseKind === "candidate") scene.openCandidateCards(false);
      if (pauseKind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); }
      frames(500);
      check(Math.hypot(point(scene.playerHitbox.body).x - before.x, point(scene.playerHitbox.body).y - before.y) < 0.001, "body remains stationary while blocked");
      check(scene.stats.stamina === en, "interrupt does not refill energy");
      check(current.A.slice(offset).some(event => event.type === "invalidate"), "interrupt invalidates old basis");
      if (pauseKind === "pause") scene.toggleDrivePause();
      if (pauseKind === "candidate") scene.closeCandidateCards();
      if (pauseKind === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: false }); document.dispatchEvent(new Event("visibilitychange")); }
      frames(120, "right");
      check(current.A.slice(offset).every(event => !event.valid), "resume has no old powered segment or connecting line");
    });
    for (const flag of ["finalBossRaidAssetsLoading", "finalRaid", "gameOver", "extractionComplete", "shopActive"]) run(`boundary-${flag}`, () => {
      frames(150, "right", "dash"); const offset = current.A.length;
      if (flag === "finalRaid") scene.isFinalBossRaidActive = () => true; else scene[flag] = true;
      frames(100, "right", "dash");
      check(current.A.slice(offset).every(event => !event.valid), "boundary rejects outstanding and new powered motion");
      check(current.A.slice(offset).some(event => event.type === "invalidate" || event.type === "end"), "boundary cancels prior active sequence", current.A.slice(offset));
    });
    run("ordinary-depth-ten-is-not-final-raid", () => {
      scene.stageDepth = 10; frames(250, "right", "dash"); frames(100, "right");
      check(valid().length > 0, "normal Depth 10 keeps trace enabled without raid state");
      scene.stageDepth = 1;
    });
    run("movement-state-reset-invalidates", () => {
      frames(200, "right", "dash"); const offset = current.A.length;
      scene.resetAcMovementState("NEXT_DEPTH"); input(); step();
      check(current.A.slice(offset).some(event => event.type === "invalidate"), "production movement reset cancels old trace basis");
      check(current.A.slice(offset).every(event => !event.valid), "reset does not join old and new movement");
    });
    run("trace-display-toggle-keeps-broadcast", () => {
      frames(100, "right", "dash"); scene.setDriveTraceVisible(false); const offset = current.A.length;
      frames(150, "right", "dash");
      check(current.A.slice(offset).some(event => event.valid), "visual toggle does not disable the shared notification source");
      scene.setDriveTraceVisible(true); frames(100, "right");
    });
    for (const mech of ["defaultBear", "regaliaBastion"]) run(`normal-mech-${mech}`, () => {
      frames(200, "right", "dash"); frames(100, "right");
      check(scene.ensureUmbraBoostTrace() === null, "normal mech does not allocate trace runtime");
      check(current.A.length === 0 && !scene.getDriveTraceDiagnostics().A, "normal mech has no source/diagnostic consumers");
    }, "baseline", mech);
    return results;
  }, rate);
}

async function realKeyboardSmoke() {
  const opened = await openContext("real-browser-keyboard", false);
  const { page } = opened;
  report.keyboard = { methodology: "Playwright browser keyboard events with the normal requestAnimationFrame loop, separate from controlled Game.step. Captured DOM input timestamps are actual performance.now and Scene time in that browser. This is not a physical keyboard or a guaranteed monitor refresh-rate measurement.", cases: [] };
  for (const durationMs of [180, 1200]) {
    await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");
      s.resetDrive("umbraSeraph", "baseline");
      const capture = window.__realTrace = { inputEvents: [], physical: [], startRealMs: performance.now(), startSceneMs: s.time.now, startUpdates: s.sceneUpdates, startPhysics: s.physicsSteps, startFrames: s.renderFrames };
      capture.key = event => capture.inputEvents.push({ type: event.type, key: event.key, trusted: event.isTrusted, realMs: performance.now(), sceneMs: s.time.now, sceneUpdates: s.sceneUpdates, physicsSteps: s.physicsSteps });
      capture.world = delta => capture.physical.push({ realMs: performance.now(), sceneMs: s.time.now, deltaMs: delta * 1000, x: s.playerHitbox.body.center.x, y: s.playerHitbox.body.center.y, mode: s.acMovementState.mode, boost: !!s.acMovementState.continuousBoost.active });
      document.addEventListener("keydown", capture.key, true); document.addEventListener("keyup", capture.key, true);
      s.physics.world.on("worldstep", capture.world);
    });
    await page.keyboard.down("ArrowRight"); await page.waitForTimeout(120);
    await page.keyboard.down("Shift"); await page.waitForTimeout(durationMs);
    await page.keyboard.up("Shift"); await page.waitForTimeout(180); await page.keyboard.up("ArrowRight");
    await page.waitForTimeout(60);
    const captured = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), c = window.__realTrace;
      document.removeEventListener("keydown", c.key, true); document.removeEventListener("keyup", c.key, true); s.physics.world.off("worldstep", c.world);
      const endRealMs = performance.now();
      return { inputEvents: c.inputEvents, physical: c.physical, realElapsedMs: endRealMs - c.startRealMs, sceneElapsedMs: s.time.now - c.startSceneMs, sceneUpdates: s.sceneUpdates - c.startUpdates, physicsSteps: s.physicsSteps - c.startPhysics, renderFrames: s.renderFrames - c.startFrames, diagnostics: s.getDriveTraceDiagnostics() };
    });
    const d = captured.diagnostics;
    report.keyboard.cases.push({ requestedHoldMs: durationMs, fixture: "baseline", ...captured, observedRenderHz: captured.renderFrames * 1000 / captured.realElapsedMs, passed: d.A?.typeCounts.start === 1 && d.A?.typeCounts.end === 1 && d.A.events.some(event => event.valid) && d.A.hash === d.B.hash && d.A.duplicates === 0 && d.B.duplicates === 0 && captured.inputEvents.filter(event => event.key === "Shift").length === 2 });
  }
  report.keyboard.passed = report.keyboard.cases.every(item => item.passed);
  await page.screenshot({ path: path.join(output, "trace-keyboard-hud.png") });
  await finishContext(opened);
}

async function lifecycleSmoke() {
  const opened = await openContext("scene-restart-shutdown");
  report.lifecycle = await opened.page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__;
    let scene = game.scene.getScene("UmbraPhase2ADrive"), timestamp = scene.time.now;
    const run = count => { for (let i = 0; i < count; i++) game.step(timestamp += 1000 / 60, 1000 / 60); };
    const counts = () => ({ worldstep: scene.physics.world.listenerCount("worldstep"), worldPause: scene.physics.world.listenerCount("pause"), preupdate: scene.events.listenerCount("preupdate"), shutdown: scene.events.listenerCount("shutdown"), gameHidden: game.events.listenerCount("hidden") });
    const baseline = counts(), restarts = [];
    for (let i = 0; i < 3; i++) {
      const oldWorld = scene.physics.world;
      scene.scene.restart(); run(4);
      scene = game.scene.getScene("UmbraPhase2ADrive");
      scene.keys.right.isDown = true; scene.keys.right.isUp = false;
      scene.keys.dash.isDown = true; scene.keys.dash.isUp = false;
      run(12);
      scene.keys.dash.isDown = false; scene.keys.dash.isUp = true; run(4);
      const diagnostics = scene.getDriveTraceDiagnostics();
      restarts.push({ listeners: counts(), oldWorldListeners: oldWorld.listenerCount("worldstep"), active: scene.sys.isActive(), A: diagnostics.A, B: diagnostics.B, passed: JSON.stringify(counts()) === JSON.stringify(baseline) && oldWorld.listenerCount("worldstep") === 0 && diagnostics.A?.typeCounts.start === 1 && diagnostics.A?.typeCounts.end === 1 && diagnostics.A.hash === diagnostics.B.hash && diagnostics.A.duplicates === 0 });
    }
    const oldWorld = scene.physics.world;
    scene.scene.start("UmbraPhase1Stopped"); run(5);
    const shutdown = { stoppedActive: game.scene.isActive("UmbraPhase1Stopped"), oldWorldListeners: oldWorld.listenerCount("worldstep"), trace: scene.umbraBoostTrace || null };
    return { baseline, restarts, shutdown, passed: restarts.every(item => item.passed) && shutdown.stoppedActive && shutdown.oldWorldListeners === 0 && shutdown.trace === null };
  });
  await finishContext(opened);
}

(async () => {
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER });
    for (const rate of realtimeOnly ? [] : rates) {
      const opened = await openContext(`controlled-${rate}Hz`);
      try {
        const cases = await runMatrix(opened.page, rate);
        report.cases.push(...cases);
        console.log(JSON.stringify({ rate, cases: cases.length, failed: cases.filter(item => !item.passed).map(item => ({ name: item.name, checks: item.checks.filter(check => !check.passed) })) }));
      } finally { await finishContext(opened); }
    }
    if (!smoke) { await realKeyboardSmoke(); if (!realtimeOnly) await lifecycleSmoke(); }
  } catch (error) { report.errors.push(error.stack); }
  finally {
    if (browser) await browser.close();
    report.passed = report.errors.length === 0 && (realtimeOnly || report.cases.length > 0) && report.cases.every(item => item.passed) && report.contexts.every(item => item.passed) && (smoke || (report.keyboard?.passed === true && (realtimeOnly || report.lifecycle?.passed === true)));
    fs.writeFileSync(path.join(output, realtimeOnly ? "trace-keyboard-report.json" : smoke ? "trace-browser-smoke-report.json" : "trace-browser-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, errors: report.errors, output }));
    process.exitCode = report.passed ? 0 : 1;
  }
})();
