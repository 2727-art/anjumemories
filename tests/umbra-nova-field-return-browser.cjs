"use strict";

// One fixed keyboard round trip through the original 60 Hz Game.step. The
// initial boundary placement is explicit; measured movement is never reset.
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const { setup, read, op, steps, inputs, until, check } = require("./umbra-mobility-browser.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT is required");
const expectedMs = Number(process.env.UMBRA_EXPECT_NOVA_FIELD_MS || 3000);
if (![1000, 3000].includes(expectedMs)) throw Error("UMBRA_EXPECT_NOVA_FIELD_MS must be 1000 or 3000");
if (process.env.UMBRA_MOBILITY_FIXTURE && process.env.UMBRA_MOBILITY_FIXTURE !== "relay20") throw Error("This fixed return trial requires relay20");
process.env.UMBRA_MOBILITY_FIXTURE = "relay20";
const mode = Object.freeze({ id: "nova-return", reach: "extended", glide: true, nova: true });
const protocol = Object.freeze([
  Object.freeze({ id: "outbound-boost", held: ["ArrowRight", "Shift"], steps: 18 }),
  Object.freeze({ id: "released-right", held: ["ArrowRight"], steps: 6 }),
  Object.freeze({ id: "reverse-left", held: ["ArrowLeft"], steps: 42 }),
  Object.freeze({ id: "return-boost-left", held: ["ArrowLeft", "Shift"], steps: 42 })
]);

function analyseReturn(observation, start) {
  const all = observation.samples.filter(s => s.physicsSteps > start.physicsSteps && s.label.startsWith("nova-return:"));
  const oldSlots = new Set(start.slots.map(slot => `${slot.slotId}:${slot.cycle}`));
  const deployment = all.find(s => s.slots.some(slot => slot.state === "DEPLOYED" && !oldSlots.has(`${slot.slotId}:${slot.cycle}`)));
  if (!deployment) return { samples: all, deployment: null, exit: null, reentry: null };
  const slot = deployment.slots.find(q => q.state === "DEPLOYED" && !oldSlots.has(`${q.slotId}:${q.cycle}`));
  const radius = 180, x = slot.position.x, y = slot.position.y;
  const track = all.filter(s => s.physicsSteps >= deployment.physicsSteps).map(s => {
    const distance = Math.hypot(s.body.x - x, s.body.y - y);
    const field = s.novaFields.fields.find(f => f.slotId === slot.slotId && f.cycleGeneration === slot.cycle);
    return { sceneMs: s.sceneMs, physicsSteps: s.physicsSteps, label: s.label,
      elapsedSceneMs: s.sceneMs - deployment.sceneMs, elapsedCombatMs: s.novaClock - slot.deployedAtMs,
      body: s.body, distance, inside: distance <= radius + 1e-7,
      protected: s.novaFields.protected, originalField: field || null,
      hp: s.hp, en: s.en, invincibleUntil: s.invincibleUntil, evade: s.evade,
      boostActive: s.boostActive, mode: s.mode, trace: s.trace };
  });
  const exitIndex = track.findIndex(p => !p.inside);
  const reentryIndex = exitIndex < 0 ? -1 : track.findIndex((p, index) => index > exitIndex && p.inside);
  return { samples: all, deployment, slot, circle: { x, y, radius }, track,
    exit: exitIndex < 0 ? null : track[exitIndex], reentry: reentryIndex < 0 ? null : track[reentryIndex],
    beforeReentry: reentryIndex > 0 ? track[reentryIndex - 1] : null,
    maxDistance: Math.max(...track.map(p => p.distance)),
    originalFieldObservedDurationMs: track.filter(p => p.originalField).at(-1)?.elapsedCombatMs ?? null };
}

async function runReturn(r, c) {
  const page = r.page;
  // Waiting and the single synthetic placement happen before measurement.
  await until(page, s => s.state === "ACTIVE" && !s.paused && !s.selection && !s.block
    && !s.boostActive && s.slots.some(q => q.state === "ORBITING") && s.sceneMs > s.invincibleUntil + 50, 600);
  c.placement = await op(page, "prepare", "nova-return:prepared");
  await steps(page, 3);
  c.measurementStart = await read(page);
  check(c, c.measurementStart.depth === 20 && c.measurementStart.slots.length === 1
    && c.measurementStart.slots[0].state === "ORBITING", "actual S1 NOVA starts as one orbiting slot in relay20", c.measurementStart);
  check(c, Math.hypot(c.measurementStart.body.vx, c.measurementStart.body.vy) < 1,
    "fixed keyboard protocol begins at a physically settled body", c.measurementStart.body);
  check(c, c.measurementStart.settings.novaFieldDurationMs === expectedMs,
    "source snapshot uses the explicitly expected field duration", c.measurementStart.settings);

  // The same held-key/step sequence is run on both source snapshots. No
  // adaptive turn, teleport, enemy placement, direct damage, HP or EN write
  // occurs between measurementStart and measurementEnd.
  for (const phase of protocol) {
    await op(page, "label", `nova-return:${phase.id}`);
    const after = await inputs(page, phase.held, phase.steps, c);
    c.phases.push({ ...phase, after });
  }
  c.measurementEnd = await read(page);
  c.observation = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  c.return = analyseReturn(c.observation, c.measurementStart);
  const result = c.return;
  check(c, !!result.deployment && !!result.slot?.position, "fixed keyboard boost produced a real first DEP", result.deployment);
  check(c, result.deployment.boostActive && result.deployment.trace?.valid === true,
    "DEP followed actual powered physical movement", result.deployment.trace);
  check(c, !!result.exit && result.maxDistance > result.circle.radius,
    "actual body center left the original fixed circle", { exit: result.exit, maxDistance: result.maxDistance });
  check(c, result.track.some(p => !p.boostActive && p.mode === "POST_BOOST_GLIDE"),
    "keyboard release ended boost through the native glide transition");
  check(c, !!result.reentry && result.beforeReentry?.inside === false && result.reentry.body.vx < 0,
    "left input returned the actual body across the same circle boundary", result.reentry);
  check(c, result.reentry.elapsedCombatMs > 1000 && result.reentry.elapsedCombatMs < 3000,
    "physical reentry happened after 1 second and before 3 seconds of DEP", result.reentry);
  check(c, result.reentry.boostActive && result.reentry.trace?.valid === true,
    "actual return into the circle was powered by valid physical boost", result.reentry);
  check(c, !result.reentry.evade.active && result.reentry.sceneMs > result.reentry.invincibleUntil,
    "reentry is outside the existing Evade window and hit grace", result.reentry);
  if (expectedMs === 1000) {
    check(c, !result.reentry.originalField && !result.reentry.protected,
      "old 1-second field had expired before this actual return", result.reentry);
  } else {
    check(c, result.reentry.originalField?.containsPlayer === true && result.reentry.protected
      && result.reentry.originalField.remainingMs > 0,
    "new 3-second field still protects on actual return into its original circle", result.reentry);
  }
  check(c, result.samples.every(s => s.state === "ACTIVE" && !s.paused && !s.selection && !s.block),
    "all measured physical steps stayed in active gameplay without a blocking overlay");
  check(c, result.samples.every(s => s.runtimeErrors.every(n => n === 0)), "all dedicated runtimes retained zero errors");
  check(c, result.samples.filter(s => s.physicsSteps >= result.deployment.physicsSteps)
    .every(s => s.slots.every(slot => slot.slotId !== result.slot.slotId || slot.cycle === result.slot.cycle)),
    "return was measured against one DEP cycle without a replacement field");
  c.graphicsAtEnd = await page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), graphic = s.umbraNormalPresentation?.control;
    return { active: graphic?.active, visible: graphic?.visible, commands: graphic?.commandBuffer?.length || 0,
      fields: s.getUmbraNovaProtectionVisualState() };
  });
  await page.screenshot({ path: path.join(out, "nova-return-end.png"), fullPage: true });
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const c = { mode, expectedMs, checks: [], selections: [], inputs: [], phases: [] };
  const report = { createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
    harnessSha256: h.sha(fs.readFileSync(__filename)), expectedNovaFieldMs: expectedMs,
    protocol: { hz: 60, phases: protocol, totalSteps: protocol.reduce((n, p) => n + p.steps, 0) },
    methodology: "Single relay20 combined normal Scene boundary fixture. Existing setup and real Opening selections; first lawful NOVA acquisition is recorded. After one declared boundary placement, the fixed 18-frame right boost, 6-frame released right motion, 42-frame reverse input and 42-frame left boost return use real keyboard input and unchanged original 60 Hz Game.step. No measured teleport, enemy spawn, direct damage, player HP/EN write or attack/physics override. The same original DEP slot/cycle/circle is reconstructed from each physical body sample even after its field expires. Frozen 1000/3000ms sources can run the exact same harness.",
    limitations: ["Synthetic relay20 preparation; not natural depth progression", "One input schedule and native desktop fixture", "Protection on return is read from production field geometry/state; this trial does not inject an attack", "No phone, controller, all-enemy or long-run performance claim"],
    cases: [c], errors: [] };
  let browser, r;
  try {
    const harnessDir = path.join(out, "harness"); fs.mkdirSync(harnessDir, { recursive: true });
    for (const name of [path.basename(__filename), "umbra-mobility-browser.cjs", "umbra-integration-browser-harness.cjs",
      "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs", "umbra-moonreach-controlled-helpers.cjs"]) {
      fs.copyFileSync(path.join(__dirname, name), path.join(harnessDir, name), fs.constants.COPYFILE_EXCL);
    }
    browser = await h.launch(); report.browser = browser.version();
    r = await setup(browser, mode, c, value => { r = value; });
    await runReturn(r, c);
  } catch (error) {
    c.error = String(error.stack || error);
    if (r) c.failure = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export()
      || window.__NORMAL_SCENE_OBSERVER__?.snapshot()).catch(e => ({ error: String(e) }));
  } finally {
    if (r) {
      c.final = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export()).catch(() => null);
      await r.page.evaluate(() => {
        window.__UMBRA_MOBILITY_PROBE__?.cleanup(); window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_PREP_CONTROL__?.restore();
        window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("NOVA_RETURN_CASE_END");
        const game = window.__SURVIVAL_GAME__; if (game?.pendingDestroy) game.step(performance.now(), 1000 / 60);
        window.__UMBRA_EXTERNAL_DATE__?.restore();
      }).catch(e => { c.endError = String(e); });
      c.audit = await h.audit(r).catch(e => ({ error: String(e) }));
      await r.context.close().catch(e => { c.contextCloseError = String(e); });
    }
    if (browser) {
      let timer;
      await Promise.race([browser.close(), new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error("browser close timeout")), 10000);
      })]).catch(e => { report.cleanupError = String(e); }); clearTimeout(timer);
    }
    c.passed = !c.error && !c.endError && !c.contextCloseError && c.checks.length > 0 && c.checks.every(q => q.passed)
      && c.audit?.isolationPassed === true && c.audit.pageErrors.length === 0;
    report.passed = c.passed && !report.errors.length && !report.cleanupError;
    fs.writeFileSync(path.join(out, "nova-return.json"), JSON.stringify(c, null, 2), { flag: "wx" });
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    process.stdout.write(JSON.stringify({ passed: report.passed, expectedMs, checks: c.checks.filter(q => q.passed).length,
      total: c.checks.length, exitMs: c.return?.exit?.elapsedCombatMs, reentryMs: c.return?.reentry?.elapsedCombatMs,
      protectedAtReturn: c.return?.reentry?.protected, error: c.error, cleanupError: report.cleanupError }) + "\n");
    process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
module.exports = { analyseReturn, protocol };
