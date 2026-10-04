"use strict";

// Three independent invocations: baseline, current, wide. This worker measures
// one frozen source only; the parent comparison retains differences and failures.
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const out = process.env.UMBRA_TEST_OUTPUT, mode = process.env.UMBRA_REACH_MODE || "current";
if (!out || fs.existsSync(out)) throw Error("A fresh UMBRA_TEST_OUTPUT is required");
if (!["baseline", "current", "wide"].includes(mode)) throw Error("Unknown reach measurement mode");
fs.mkdirSync(out, { recursive: true });
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const report = {
  createdAt: new Date().toISOString(), mode, sourceRoot: h.sourceRoot, sources: h.sources,
  harnessSha256: h.sha(fs.readFileSync(__filename)), host: { platform: process.platform, node: process.version, cpu: os.cpus()[0]?.model },
  methodology: "Serial single-context normal-rAF observation. Test-only seeded random streams before START and SORTIE; no wall-clock or physics replacement. Complete D1 start fixture; actual first Opening card held for4s, then3 actual passive choices. Eight real chasers are additionally spawned and placed during BOUND, without HP/AI/contact changes; original natural enemies and future natural spawning remain. A delegated final Opening commit pauses the real world before its first active step; measurement resumes that world without moving or refilling anything. This is an explicit workload fixture, not natural/deep safety proof. Same image FX and compact HUD. Normal Moon S1 combat for20s with published200ms input schedule; real random cards are selected without changing effects. CPU wraps the actual TimeStep callback. First rAF-start offset is preserved separately from genuine adjacent-rAF intervals. No screenshot, huge snapshot, JSON export or concurrent browser during measurement. Small1s records and delegated hit counters add observation cost.",
  checks: [], selections: [], segments: [], errors: [], inputs: []
};
const check = (passed, label, detail = null) => { report.checks.push({ passed: !!passed, label, detail }); if (!passed) throw Error(label); };
function seedMathRandom() {
  let value = 0x71b5cafe;
  Math.random = () => { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; return (value >>> 0) / 4294967296; };
}
function compactState() {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
  const p = s.playerHitbox?.body, r = s.umbraMoonlightRuntime;
  return {
    at: performance.now(), sceneMs: s.time.now, stage: s.currentStage?.id, depth: s.stageDepth,
    state: s.umbraRunContext?.state, reach: s.umbraRunContext?.request?.moonReach || "current",
    player: { x: p?.center.x, y: p?.center.y, vx: p?.velocity.x, vy: p?.velocity.y, radius: p?.radius },
    stats: { ...s.stats }, skills: Object.fromEntries(Object.entries(s.playerSkills || {}).map(([k, v]) => [k, v.stageIndex])),
    pending: s.pendingLevelUps, opening: s.startingUpgradeSelectionsRemaining, selected: s.levelUpActive,
    worldPaused: s.physics.world.isPaused, clock: r?.combatTimeMs, counts: { ...r?.counts }, skips: { ...r?.skips },
    effective: s.getUmbraMoonlightEffectiveStats(), enemies: s.enemies.countActive(true), objects: s.children.list.length,
    timers: s.time._active.length, listeners: s.events.eventNames().reduce((n, e) => n + s.events.listenerCount(e), 0),
    display: { viewport: [innerWidth, innerHeight, devicePixelRatio], logical: [s.game.config.width, s.game.config.height],
      canvas: { width: s.game.canvas.getBoundingClientRect().width, height: s.game.canvas.getBoundingClientRect().height },
      fx: document.getElementById("umbra-integration-fx")?.value, detail: s.hudDetailVisible ?? null },
    gameOver: s.gameOver
  };
}
function installTiming(label) {
  const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("survival-scene");
  window.__NORMAL_SCENE_OBSERVER__?.cleanup(); delete window.__NORMAL_SCENE_OBSERVER__;
  const started = performance.now(), cpus = [], intervals = [], states = [], outliers = [], hitHistory = [];
  let updates = 0, physics = 0, lastRaf = null, firstRafOffset = null, rafId = 0, stopped = false;
  const sample = () => {
    const r = s.umbraMoonlightRuntime, p = s.playerHitbox.body;
    return { at: performance.now(), sceneMs: s.time.now, updates, physics, clock: r?.combatTimeMs, counts: { ...r?.counts },
      hp: s.stats.hp, maxHp: s.stats.maxHp, en: s.stats.stamina, maxEn: s.stats.maxStamina,
      x: p.center.x, y: p.center.y, vx: p.velocity.x, vy: p.velocity.y,
      enemies: s.enemies.countActive(true), selected: !!s.levelUpActive, paused: s.physics.world.isPaused,
      objects: s.children.list.length, timers: s.time._active.length, listeners: s.events.eventNames().reduce((n, e) => n + s.events.listenerCount(e), 0), gameOver: s.gameOver };
  };
  const original = game.loop.callback, initial = sample(), pre = () => updates++, world = () => physics++;
  game.loop.callback = function (...args) {
    const start = performance.now();
    try { return original.apply(this, args); }
    finally { const ms = performance.now() - start; cpus.push({ at: start, ms }); if (ms >= 100) outliers.push({ at: start, ms, state: sample() }); }
  };
  const hit = s.onUmbraMoonlightAcceptedHit;
  s.onUmbraMoonlightAcceptedHit = function (event) {
    if (hitHistory.length < 256) hitHistory.push({ at: performance.now(), lifeId: event.lifeId, clock: event.combatTimeMs,
      damage: event.damage, hpBefore: event.hpBefore, hpAfter: event.hpAfter });
    return hit?.call(this, event);
  };
  s.events.on("preupdate", pre); s.physics.world.on("worldstep", world);
  function raf(at) {
    if (stopped) return;
    if (lastRaf === null) firstRafOffset = { at, ms: at - started, classification: "rafTimestamp-minus-observerStart-not-a-frame-interval" };
    else intervals.push({ at, ms: at - lastRaf });
    lastRaf = at; rafId = requestAnimationFrame(raf);
  }
  rafId = requestAnimationFrame(raf); const timer = setInterval(() => states.push(sample()), 1000);
  let finished = null;
  window.__REACH_TIMING__ = { finish() {
    if (finished) return finished;
    stopped = true; cancelAnimationFrame(rafId); clearInterval(timer); game.loop.callback = original;
    s.onUmbraMoonlightAcceptedHit = hit; s.events.off("preupdate", pre); s.physics.world.off("worldstep", world);
    finished = { label, started, ended: performance.now(), initial, final: sample(), cpus, firstRafOffset, intervals, states, outliers, hitHistory,
      cpuScope: "entire bound TimeStep Game.step callback, including delegated hit-counter work; array push after callback timestamp excluded" };
    return finished;
  } };
}
function summary(values) {
  const sorted = [...values].sort((a, b) => a - b), n = sorted.length, p = q => n ? sorted[Math.max(0, Math.ceil(n * q) - 1)] : null;
  return { count: n, mean: n ? values.reduce((a, b) => a + b, 0) / n : null, median: p(.5), p95: p(.95), p99: p(.99), min: p(0), max: p(1), atLeast100: values.filter(x => x >= 100).length };
}
async function finishMeasure(page) {
  const data = await page.evaluate(() => window.__REACH_TIMING__.finish());
  data.cpuSummary = summary(data.cpus.map(x => x.ms)); data.rafSummary = summary(data.intervals.map(x => x.ms)); report.segments.push(data); return data;
}
const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Shift"];
async function release(page) { for (const key of keys) await page.keyboard.up(key); }
async function timedBattle(page) {
  await page.evaluate(installTiming, "normal-Moon-S1-combat");
  await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").physics.world.resume());
  const started = Date.now();
  for (let index = 0; index < 100; index++) {
    const targetMs = index * 200, remaining = started + targetMs - Date.now(); if (remaining > 0) await page.waitForTimeout(remaining);
    const state = await page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return { dead: s.gameOver, selection: s.levelUpActive, enabled: s.levelUpInputEnabled, locked: s.levelUpSelectionLocked }; });
    if (state.dead) { report.deathAtMs = Date.now() - started; break; }
    const direction = keys[Math.floor(index / 5) % 4], boost = index % 5 < 2;
    await release(page);
    if (state.selection) { if (state.enabled && !state.locked) await page.keyboard.press("1"); }
    else { await page.keyboard.down(direction); if (boost) await page.keyboard.down("Shift"); }
    report.inputs.push({ index, nominalMs: targetMs, actualMs: Date.now() - started, direction, boost, selection: state.selection });
  }
  const remaining = started + 20000 - Date.now(); if (remaining > 0 && report.deathAtMs == null) await page.waitForTimeout(remaining);
  await release(page); return finishMeasure(page);
}

(async () => {
  let browser, r;
  fs.mkdirSync(path.join(out, "harness"));
  for (const name of [path.basename(__filename), "umbra-integration-browser-harness.cjs", "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs"])
    fs.copyFileSync(path.join(__dirname, name), path.join(out, "harness", name), fs.constants.COPYFILE_EXCL);
  try {
    browser = await h.launch(); report.browserVersion = browser.version();
    const query = mode === "baseline" ? "" : `&moonReach=${mode}`;
    r = await h.open(browser, `reach-performance-${mode}`, { path: `/umbra-integration.html?fixture=complete${query}`, init: seedMathRandom });
    await r.page.waitForFunction(() => typeof window.Phaser?.Game === "function");
    await ui.waitHub(r.page); await r.page.evaluate(installSceneObserver);
    await r.page.evaluate(seedMathRandom); await r.page.evaluate(() => Phaser.Math.RND.sow(["moon-reach-performance-sortie-v1"]));
    await ui.clickPhaserText(r.page, "SORTIE PREP");
    report.firstCard = await ui.enabledCards(r.page); report.cardBefore = await r.page.evaluate(compactState);
    await r.page.evaluate(installTiming, "first-Opening-card-held"); await r.page.waitForTimeout(4000);
    await finishMeasure(r.page); report.cardAfter = await r.page.evaluate(compactState);
    check(report.cardBefore.clock === report.cardAfter.clock && report.cardBefore.pending === report.cardAfter.pending
      && report.cardBefore.opening === report.cardAfter.opening && JSON.stringify(report.cardBefore.player) === JSON.stringify(report.cardAfter.player)
      && JSON.stringify(report.cardBefore.stats) === JSON.stringify(report.cardAfter.stats), "card observation does not consume combat, selection, AP/EN or motion");
    await r.page.screenshot({ path: path.join(out, "opening-after-measurement.png") });
    await r.page.evaluate(installSceneObserver);
    for (let n = 0; n < 3; n++) {
      const state = await ui.enabledCards(r.page);
      if (n === 2) report.fixedEnemies = await r.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), p = s.playerHitbox.body.center;
        const offsets = [[220,95],[340,95],[220,-95],[340,-95],[-220,95],[-340,95],[-220,-95],[-340,-95]];
        s.runEnvironmentIO.record("explicit-reach-performance-workload", { type: "chaser", offsets, hpEdited: false, aiEdited: false, naturalSpawnContinues: true });
        const placed = offsets.map(([dx, dy]) => { const enemy = s.spawnEnemy("chaser"); enemy.body.reset(p.x + dx, p.y + dy); return { typeId: enemy.enemyTypeId, x: enemy.body.center.x, y: enemy.body.center.y, hp: enemy.hp, maxHp: enemy.maxHp,
          radius: enemy.body.radius, circle: enemy.body.isCircle, width: enemy.body.width, height: enemy.body.height, speed: enemy.moveSpeed, contactDamage: enemy.contactDamage }; });
        const original = s.completeLevelUpCardSelection;
        let restored = false;
        window.__REACH_PREPARATION__ = { paused: false, restore() { if (!restored) { s.completeLevelUpCardSelection = original; restored = true; } } };
        s.completeLevelUpCardSelection = function (...args) {
          const result = original.apply(this, args);
          if (this.startingUpgradeSelectionsRemaining === 0 && !this.levelUpActive) {
            this.physics.world.pause(); window.__REACH_PREPARATION__.paused = true;
            this.runEnvironmentIO.record("explicit-reach-performance-start-pause", { reason: "same pre-combat comparison boundary", physicsSettingsChanged: false });
          }
          return result;
        };
        return placed;
      });
      const index = state.cards.findIndex(c => c.type === "passive"); check(index >= 0, "actual Opening contains a passive choice");
      report.selections.push(await ui.chooseCard(r.page, index));
    }
    await r.page.waitForFunction(() => window.__REACH_PREPARATION__?.paused);
    await r.page.evaluate(() => window.__REACH_PREPARATION__.restore());
    report.preBattle = await r.page.evaluate(compactState);
    report.initialEnemies = await r.page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").enemies.getChildren().map(e => ({ typeId: e.enemyTypeId, x: e.body?.center.x, y: e.body?.center.y, hp: e.hp, maxHp: e.maxHp, active: e.active,
      radius: e.body?.radius, circle: e.body?.isCircle, width: e.body?.width, height: e.body?.height, speed: e.moveSpeed, contactDamage: e.contactDamage })));
    check(report.preBattle.effective.passageRadius === (mode === "wide" ? 90 : 60), "S1 uses intended effective radius");
    check(report.preBattle.skills.umbraMoonlight === 0 && Object.keys(report.preBattle.skills).length === 1, "combat starts with real Moon S1 only");
    await timedBattle(r.page); report.postBattle = await r.page.evaluate(compactState);
    await r.page.screenshot({ path: path.join(out, "combat-after-measurement.png") });
    check(report.segments.every(s => s.cpus.length > 0 && s.intervals.length > 0), "actual callback and adjacent-rAF coverage present");
  } catch (error) { report.errors.push(error.stack); }
  finally {
    if (r) {
      await r.page.evaluate(() => { window.__REACH_TIMING__?.finish(); window.__REACH_PREPARATION__?.restore(); window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("REACH_PERFORMANCE_END"); }).catch(e => report.errors.push(String(e)));
      await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed, null, { timeout: 10000 }).catch(e => report.errors.push(String(e)));
      report.context = await h.audit(r); await r.context.close();
    }
    report.passed = !report.errors.length && report.context?.isolationPassed && !report.context.pageErrors.length
      && report.checks.every(c => c.passed) && report.segments.length === 2 && report.deathAtMs == null;
    fs.writeFileSync(path.join(out, "pre-browser-close.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    if (browser) {
      let timer;
      try { await Promise.race([browser.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("Browser close timeout")), 10000); })]); }
      catch (e) { report.cleanupError = String(e); report.passed = false; }
      finally { clearTimeout(timer); }
    }
    fs.writeFileSync(path.join(out, "reach-performance.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ passed: report.passed, mode, errors: report.errors, cleanupError: report.cleanupError,
      segments: report.segments.map(s => ({ label: s.label, cpu: s.cpuSummary, raf: s.rafSummary, firstRafOffset: s.firstRafOffset, final: s.final })) }));
    if (!report.passed) process.exitCode = 1;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
