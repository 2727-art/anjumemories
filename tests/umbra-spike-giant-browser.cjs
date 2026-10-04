"use strict";
// Synthetic, isolated real-Phaser comparison. Never a natural progression or
// production-account test. Root runs this harness serially with other browsers.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { chromium } = require("playwright");
const project = path.resolve(__dirname, "..");
const output = process.env.UMBRA_TEST_OUTPUT;
if (!output || !process.env.UMBRA_TEST_SOURCE_ROOT) throw Error("Fresh UMBRA_TEST_OUTPUT and frozen UMBRA_TEST_SOURCE_ROOT are required");
if (fs.existsSync(output) && fs.readdirSync(output).length) throw Error("Output must be empty; preserve previous results");
fs.mkdirSync(output, { recursive: true });
const h = require("./umbra-growth-browser.cjs");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const artName = "画像/monster/boss_crack/sprite_0.png";
const art = fs.readFileSync(path.join(project, artName));
// The bootstrap helper freezes code and denies non-local requests. Freeze the
// comparison art as well; PNG requests need an image MIME type instead of its
// generic JavaScript branch, so provide a more specific route in each context.
const report = {
  createdAt: new Date().toISOString(), sourceRoot: process.env.UMBRA_TEST_SOURCE_ROOT,
  sources: h.report.sources, harnessSha256: sha(fs.readFileSync(__filename)),
  bootstrapHarnessSha256: h.report.harnessSha256, art: { name: artName, sha256: sha(art) },
  methodology: "Six fresh isolated contexts: S1/S8 x image/fallback/OFF. Each explicitly acquires SPIKE and sets its Stage through applySkillStage; this is synthetic and does not prove natural progression. Same baseline, camera, no movement input, seven existing boss_crack enemies with supported synthetic 10x10 rectangular bodies at nearest-body distances 0/79/81/159/161/239/241px from the selected cast center. Native HP/damage/receiver and fixed60 Arcade step are unchanged. Initial MOON is owned but receives no boost; NOVA is unowned. Real Game.step60Hz records first cast for its full800ms; impact remains200ms, animation8 frames at10fps. One non-physical existing Crack Boss image uses the production elite display-scale helper, solely as a labelled same-world-scale comparison. Screenshots and JSON serialization occur between controlled steps, outside measured intervals. No CPU/GPU performance or normal-rAF smoothness claim.",
  cases: [], comparisons: [], errors: []
};

async function prepare(page, stage, mode) {
  return page.evaluate(async ({ stage, mode }) => {
    const g = window.__SURVIVAL_GAME__, s = g.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
    a.configId = "empty"; a.growthPresetStage = null; s.resetDrive("umbraSeraph", "baseline");
    s.closeCandidateCards(); s.guides = false; s.clearDriveInput(); a.setFxMode(mode);
    s.unlockSkill("umbraBloodSpike");
    const skill = s.playerSkills.umbraBloodSpike; skill.stageIndex = stage - 1; s.applySkillStage(skill);
    g.loop.stop(); s.physics.world.resume();
    s.worldCamera.stopFollow().setZoom(0.57).centerOn(870, 460);
    const art = MONSTER_IMAGE_ASSETS.bossCrack, def = ENEMY_DEFINITIONS.boss_crack;
    if (!s.textures.exists(art.textureKey)) {
      await new Promise((resolve, reject) => {
        const failed = file => { if (file.key === art.textureKey) reject(Error("Existing boss comparison art failed to load")); };
        s.load.once("loaderror", failed);
        s.load.once("complete", () => { s.load.off("loaderror", failed); resolve(); });
        s.load.image(art.textureKey, art.imagePath); s.load.start();
      });
    }
    const base = { x: 500, y: 660 };
    const bossScale = SurvivalScene.prototype.getEnemyDisplayScale.call(s, def, true, false);
    const boss = s.add.image(1120, base.y, art.textureKey).setOrigin(0.5, 1).setScale(bossScale).setDepth(19.5);
    const labels = [
      s.add.text(800, 160, `合成・同じ縮尺の比較 / SPIKE S${stage} / ${mode}`, { fontSize: "27px", color: "#f4edff", backgroundColor: "#071820" }).setOrigin(0.5).setDepth(29),
      s.add.text(base.x, base.y + 75, `SPIKE S${stage} / 半径${stage === 8 ? 240 : 80}px`, { fontSize: "23px", color: "#ffbed6", backgroundColor: "#071820" }).setOrigin(0.5).setDepth(29),
      s.add.text(1120, base.y + 75, "通常Crack Bossの画像 / 攻撃対象外", { fontSize: "20px", color: "#d9f6ff", backgroundColor: "#071820" }).setOrigin(0.5).setDepth(29)
    ];
    s.uiCamera.ignore([boss, ...labels]);
    let time = s.time.now;
    for (let i = 0; i < 3; i++) g.step(time += 1000 / 60, 1000 / 60);
    const distances = [0, 79, 81, 159, 161, 239, 241];
    const enemies = distances.map(distance => a.spawnEnemy({ typeId: "boss_crack", isBoss: true, isElite: true,
      x: base.x + (distance ? distance + 5 : 0), y: base.y, rect: { width: 10, height: 10 }, label: `端 ${distance}px` }));
    const enemyState = enemy => ({ hp: enemy.hp, maxHp: enemy.maxHp, contactDamage: enemy.contactDamage,
      x: enemy.body.center.x, y: enemy.body.center.y, width: enemy.body.width, height: enemy.body.height });
    const hits = [], old = s.onUmbraBloodSpikeAcceptedHit;
    s.onUmbraBloodSpikeAcceptedHit = function (hit) { hits.push({ ...hit }); return old?.call(this, hit); };
    const samples = [], geometry = [], instrumented = new WeakSet();
    let cast = null, attemptedBeforeExpiry = null;
    function instrument(fx) {
      if (fx?.ground && !instrumented.has(fx.ground)) {
        instrumented.add(fx.ground);
        const draw = fx.ground.fillEllipse;
        fx.ground.fillEllipse = function (x, y, width, height, ...args) {
          geometry.push({ kind: "ellipse", frame: fx.lastFrame, width, height });
          return draw.call(this, x, y, width, height, ...args);
        };
      }
      if (fx?.object && !fx.image && !instrumented.has(fx.object)) {
        instrumented.add(fx.object);
        const draw = fx.object.fillTriangle;
        fx.object.fillTriangle = function (...args) {
          geometry.push({ kind: "triangle", frame: fx.lastFrame, points: args.slice(0, 6) });
          return draw.apply(this, args);
        };
      }
    }
    function state() {
      const rt = s.umbraBloodSpikeRuntime;
      cast ||= rt.casts[0] || null;
      const snapshot = cast && rt.casts.includes(cast) ? s.getUmbraBloodSpikeCastSnapshot(cast) : null;
      const fx = cast ? a.spikeEffects.get(cast.castId) : null;
      instrument(fx);
      if (cast && rt.casts.includes(cast)) attemptedBeforeExpiry = [...cast.attempted];
      return { sceneMs: s.time.now, clockMs: rt.combatTimeMs, elapsed: cast ? rt.combatTimeMs - cast.createdCombatTimeMs : null,
        sceneUpdates: s.sceneUpdates, physicsSteps: s.physicsSteps, counts: { ...rt.counts }, cast: snapshot,
        image: fx?.image || false, visible: !!fx?.object, ground: !!fx?.ground,
        scaleX: fx?.object?.scaleX ?? null, scaleY: fx?.object?.scaleY ?? null,
        frame: fx?.object?.frame?.name ?? null,
        displayWidth: fx?.image ? fx.object.displayWidth : null, displayHeight: fx?.image ? fx.object.displayHeight : null,
        originX: fx?.image ? fx.object.originX : null, originY: fx?.image ? fx.object.originY : null };
    }
    const initial = { stage, mode, distances, enemies: enemies.map(enemyState), hp: s.stats.hp, en: s.stats.stamina,
      stats: s.getUmbraBloodSpikeEffectiveStats(), acquired: Object.keys(s.playerSkills),
      body: { x: s.playerHitbox.body.center.x, y: s.playerHitbox.body.center.y },
      physics: { fixedStep: s.physics.world.fixedStep, fps: s.physics.world.fps },
      sourceAsset: window.umbraPreviewAssets.effects.umbraBloodSpike,
      boss: { texture: boss.texture.key, scale: boss.scaleX, width: boss.width, height: boss.height,
        displayWidth: boss.displayWidth, displayHeight: boss.displayHeight, hasBody: !!boss.body },
      sceneUpdates: s.sceneUpdates, physicsSteps: s.physicsSteps };
    window.__SPIKE_GIANT_PROBE__ = {
      initial,
      step(n = 1) {
        if (!Number.isInteger(n) || n < 1 || n > 120) throw Error("Bounded unchanged Game.step required");
        for (let i = 0; i < n; i++) {
          g.step(time += 1000 / 60, 1000 / 60); samples.push(state());
          if (samples.length > 180) throw Error("Diagnostic frame bound exceeded");
        }
        return samples.at(-1);
      },
      export() { return { initial, samples, geometry, hits, attemptedBeforeExpiry,
        final: { ...state(), enemies: enemies.map(enemyState), hp: s.stats.hp, en: s.stats.stamina,
          moon: s.getUmbraMoonlightSnapshot().counts, nova: s.getUmbraPhantomNovaSnapshot().counts,
          errors: s.getUmbraBloodSpikeSnapshot().errors, fxCounts: { ...a.spikeFxCounts },
          activeFx: a.spikeEffects.size, timers: Array.isArray(s.time._active) ? s.time._active.length : null,
          listeners: s.physics.world.listenerCount("worldstep") } }; },
      cleanup() { s.onUmbraBloodSpikeAcceptedHit = old; boss.destroy(); labels.forEach(o => o.destroy()); }
    };
    return initial;
  }, { stage, mode });
}

function verify(result) {
  const c = { stage: result.initial.stage, mode: result.initial.mode, checks: [], result };
  const check = (passed, label, detail = null) => c.checks.push({ passed: !!passed, label, detail });
  const radius = c.stage === 8 ? 240 : 80, factor = radius / 80;
  const samples = result.samples.filter(x => x.cast), first = samples[0], peak = samples.find(x => x.cast.frameIndex === 2);
  const last = result.final, expectedHits = result.initial.distances.filter(x => x <= radius).length;
  const losses = last.enemies.map((enemy, i) => result.initial.enemies[i].hp - enemy.hp);
  const expectedDamage = result.initial.stats.rawDamage;
  check(result.initial.physics.fixedStep && result.initial.physics.fps === 60, "unchanged fixed60 physics");
  check(first?.cast.radius === radius && result.initial.stats.impactRadius === radius, "real scheduled cast uses expected radius", first?.cast.radius);
  check(Math.abs(first?.cast.impactDueAtMs - first?.cast.createdCombatTimeMs - 200) < 1e-7 && first?.cast.durationMs === 800,
    "impact200ms and lifetime800ms preserved", { impactOffsetMs: first?.cast.impactDueAtMs - first?.cast.createdCombatTimeMs, durationMs: first?.cast.durationMs });
  check(first?.cast.rawDamage === 5 && first?.cast.intervalMs === 1800, "baseline damage5 and cadence1800ms preserved", first?.cast);
  check(new Set(samples.map(x => x.cast.frameIndex)).size === 8, "all eight frames observed", [...new Set(samples.map(x => x.cast.frameIndex))]);
  check(result.hits.length === expectedHits && losses.every((loss, i) => loss === (result.initial.distances[i] <= radius ? expectedDamage : 0)), "nearest-body boundary inside/outside and native HP losses", losses);
  check(new Set(result.hits.map(x => `${x.castId}:${x.lifeId}`)).size === result.hits.length && result.attemptedBeforeExpiry?.length === expectedHits, "each enemy receives at most one attempt in same cast");
  check(last.counts.casts === 1 && last.counts.impacts === 1 && last.counts.expired === 1 && last.activeFx === 0, "first cast expires once without residual presentation", last.counts);
  check((last.moon?.accepted || 0) === 0 && (last.nova?.accepted || 0) === 0 && last.errors === 0, "no other-weapon damage or runtime errors");
  check(last.hp === result.initial.hp, "stationary attack does not damage player", { before: result.initial.hp, after: last.hp });
  const impact = samples.find(x => x.cast.appliedAtMs !== null);
  check(impact && Math.abs(impact.cast.appliedAtMs - impact.cast.impactDueAtMs) < 1e-6, "actual impact occurs at200ms on this controlled60Hz timeline", impact?.elapsed);
  if (c.mode === "image") {
    const art = result.initial.sourceAsset, frame = art.frames[2];
    check(peak?.image && Math.abs(peak.scaleX - art.displayScale * art.resolutionScale.x * factor) < 1e-9
      && Math.abs(peak.scaleY - art.displayScale * art.resolutionScale.y * factor) < 1e-9, "actual Image uses radius-proportional scale", peak);
    check(peak?.frame === frame.name && peak?.originX === frame.origin.x && peak?.originY === frame.origin.y, "unchanged source frame and ground pivot");
  } else if (c.mode === "fallback") {
    const triangle = result.geometry.find(x => x.kind === "triangle" && x.frame === 2);
    check(peak?.visible && !peak.image && triangle && Math.abs(triangle.points[4] - triangle.points[0] - 76 * factor) < 1e-9
      && Math.abs(triangle.points[1] - triangle.points[3] - 104 * factor) < 1e-9, "actual fallback triangle scales proportionally", triangle);
  } else check(samples.every(x => !x.visible && !x.ground), "OFF removes presentation while keeping attack");
  if (c.mode !== "off") check(result.geometry.some(x => x.kind === "ellipse" && Math.abs(x.width - 94 * factor) < 1e-9 && Math.abs(x.height - 27 * factor) < 1e-9), "ground glow scales with the same factor");
  c.passed = c.checks.every(x => x.passed); return c;
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER }); h.setBrowser(browser);
    for (const stage of [1, 8]) for (const mode of ["image", "fallback", "off"]) {
      const run = await h.open(`spike-giant-S${stage}-${mode}`, "&umbraGrowth=1&umbraBloodSpike=1&umbraTrace=0", { width: 1440, height: 900 });
      try {
        // Percent-encoded Japanese asset paths do not reliably match glob routes.
        const localOrigin = new URL(process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").origin;
        await run.context.route(url => url.origin === localOrigin && decodeURIComponent(url.pathname).endsWith("/" + artName), route => route.fulfill({ status: 200, body: art, contentType: "image/png" }));
        await prepare(run.page, stage, mode);
        let peakSaved = false, current;
        for (let n = 0; n < 120; n++) {
          current = await run.page.evaluate(() => window.__SPIKE_GIANT_PROBE__.step());
          if (!peakSaved && current.cast?.frameIndex === 2) {
            if (mode !== "off") await run.page.screenshot({ path: path.join(output, `spike-S${stage}-${mode}-frame2-boss-comparison.png`) });
            peakSaved = true;
          }
          if (current.counts.expired >= 1) break;
        }
        const result = await run.page.evaluate(() => window.__SPIKE_GIANT_PROBE__.export());
        const c = verify(result); report.cases.push(c);
        fs.writeFileSync(path.join(output, `S${stage}-${mode}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
        console.log(JSON.stringify({ stage, mode, passed: c.passed, failures: c.checks.filter(x => !x.passed) }));
        await run.page.evaluate(() => window.__SPIKE_GIANT_PROBE__.cleanup());
      } catch (error) { report.errors.push({ stage, mode, error: error.stack }); }
      finally { await h.close(run); }
    }
    for (const stage of [1, 8]) {
      const cases = report.cases.filter(c => c.stage === stage);
      const semantics = c => JSON.stringify({ losses: c.result.final.enemies.map((e, i) => c.result.initial.enemies[i].hp - e.hp),
        counts: ["casts", "impacts", "attempts", "accepted", "kills", "expired"].map(k => c.result.final.counts[k]),
        at: c.result.hits.map(hit => [hit.combatTimeMs, hit.rawDamage, hit.hpDelta]),
        physics: c.result.final.physicsSteps - c.result.initial.physicsSteps, scene: c.result.final.sceneUpdates - c.result.initial.sceneUpdates });
      report.comparisons.push({ stage, passed: cases.length === 3 && cases.every(c => semantics(c) === semantics(cases[0])), label: "image/fallback/OFF same attacks, HP losses, scene and physical counts" });
    }
  } catch (error) { report.errors.push({ error: error.stack }); }
  finally {
    await browser?.close(); report.contexts = h.report.contexts;
    report.passed = !report.errors.length && report.cases.length === 6 && report.cases.every(c => c.passed)
      && report.comparisons.every(c => c.passed) && report.contexts.length === 6 && report.contexts.every(c => c.passed);
    const file = path.join(output, "report.json"); fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: "wx" });
    fs.copyFileSync(__filename, path.join(output, path.basename(__filename)), fs.constants.COPYFILE_EXCL);
    console.log(JSON.stringify({ passed: report.passed, file, checks: report.cases.reduce((n, c) => n + c.checks.length, 0), errors: report.errors, comparisons: report.comparisons }));
    process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
