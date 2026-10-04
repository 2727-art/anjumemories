"use strict";

// Local, serial, controlled functional comparison. A declared initial body
// placement is followed by native keyboard boost/release/braking movement.
// Passage and injected native-contact reception are separate fresh contexts.
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const { setup, read, op, steps, inputs, until, check } = require("./umbra-mobility-browser.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT is required");
if (process.env.UMBRA_MOBILITY_FIXTURE && process.env.UMBRA_MOBILITY_FIXTURE !== "relay20") throw Error("This protocol requires relay20");
process.env.UMBRA_MOBILITY_FIXTURE = "relay20";

const protocol = Object.freeze([
  Object.freeze({ id: "forward-boost", held: ["ArrowRight", "Shift"], steps: 30 }),
  Object.freeze({ id: "release", held: ["ArrowRight"], steps: 1 }),
  Object.freeze({ id: "reverse-hold", held: ["ArrowLeft"], steps: 7 }),
  Object.freeze({ id: "braking-contact-window", held: ["ArrowLeft"], steps: 1 }),
  Object.freeze({ id: "finish-braking", held: ["ArrowLeft"], steps: 12 }),
  Object.freeze({ id: "exit-coast", held: [], steps: 6 })
]);
// The main passage uses side targets, so accepting Moon hits and reaching the
// departure side are not conflated with the separate forced-overlap test.
const group = Object.freeze([
  Object.freeze({ tag: "flank-1", dx: 180, edgeGap: 100, type: "tank" }),
  Object.freeze({ tag: "flank-2", dx: 310, edgeGap: 100, type: "tank" }),
  Object.freeze({ tag: "flank-3", dx: 440, edgeGap: 100, type: "tank" })
]);
const modes = Object.freeze([
  Object.freeze({ id: "circle", reach: "extended", glide: true, nova: true }),
  Object.freeze({ id: "lane", reach: "extended", glide: true, nova: true, novaFieldShape: "lane" })
]);
const magnitude = body => Math.hypot(body.vx, body.vy);
const isBraking = state => state.mode === "AIR_BRAKE" || state.trace?.reason === "AIR_BRAKE";

function analysePassage(observation, start) {
  const samples = observation.samples.filter(s => s.physicsSteps > start.physicsSteps && s.label.startsWith("tsujigiri:"));
  const oldSlots = new Set(start.slots.map(slot => `${slot.slotId}:${slot.cycle}`));
  const deployed = samples.find(s => s.slots.some(q => q.state === "DEPLOYED" && !oldSlots.has(`${q.slotId}:${q.cycle}`)));
  if (!deployed) return { samples, deployment: null, track: [], moonHits: [], contacts: [], receiverEvents: [] };
  const slot = deployed.slots.find(q => q.state === "DEPLOYED" && !oldSlots.has(`${q.slotId}:${q.cycle}`));
  const field = deployed.novaFields.fields.find(q => q.slotId === slot.slotId && q.cycleGeneration === slot.cycle);
  const direction = field?.shape === "lane" ? { x: field.dirX, y: field.dirY } : { x: 1, y: 0 };
  const track = samples.filter(s => s.physicsSteps >= deployed.physicsSteps).map(s => {
    const dx = s.body.x - slot.position.x, dy = s.body.y - slot.position.y;
    const original = s.novaFields.fields.find(q => q.slotId === slot.slotId && q.cycleGeneration === slot.cycle);
    return { sceneMs: s.sceneMs, physicsSteps: s.physicsSteps, label: s.label,
      elapsedCombatMs: s.novaClock - slot.deployedAtMs, body: s.body, speed: magnitude(s.body),
      forward: dx * direction.x + dy * direction.y, lateral: -dx * direction.y + dy * direction.x,
      distance: Math.hypot(dx, dy), protected: s.novaFields.protected, originalField: original || null,
      hp: s.hp, en: s.en, invincibleUntil: s.invincibleUntil, evade: s.evade,
      boostActive: s.boostActive, mode: s.mode, trace: s.trace };
  });
  const afterInitialCircleExit = track.findIndex(q => q.distance > 180 + 1e-7);
  const records = observation.records.filter(q => q.physicsSteps > start.physicsSteps && q.label.startsWith("tsujigiri:"));
  return { samples, deployment: deployed, slot, initialField: field || null, direction, track,
    leftInitialCircle: afterInitialCircleExit < 0 ? null : track[afterInitialCircleExit],
    returnedToInitialCircle: afterInitialCircleExit >= 0 && track.slice(afterInitialCircleExit + 1).some(q => q.distance <= 180),
    maxForward: track.length ? Math.max(...track.map(q => q.forward)) : 0,
    maxLateral: track.length ? Math.max(...track.map(q => Math.abs(q.lateral))) : 0,
    braking: track.filter(isBraking),
    moonHits: records.filter(q => q.type === "moon-hit" && group.some(enemy => enemy.tag === q.tag)),
    targetDamage: records.filter(q => q.type === "target-damage"),
    contacts: records.filter(q => q.type === "native-contact-callback"),
    receiverEvents: records.filter(q => q.type === "player-damage") };
}

async function inspectPresentation(page) {
  return page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), owner = s.umbraNormalPresentation;
    const snapshot = () => ({ mode: owner.fx.fxMode, visible: owner.control.visible, active: owner.control.active,
      commands: owner.control.commandBuffer?.length || 0, fields: s.getUmbraNovaProtectionVisualState() });
    const before = snapshot(), oldMode = owner.fx.fxMode;
    owner.fx.setFxMode("off"); s.updateUmbraNormalPresentation(); const fxOff = snapshot();
    owner.fx.setFxMode(oldMode); s.updateUmbraNormalPresentation();
    const select = document.getElementById("umbra-integration-field");
    return { before, fxOff, selection: select ? { value: select.value,
      options: Array.from(select.options, q => ({ value: q.value, text: q.textContent })) } : null };
  });
}

async function runTrial(r, c) {
  const page = r.page;
  await until(page, s => s.state === "ACTIVE" && !s.paused && !s.selection && !s.block && !s.boostActive
    && s.slots.some(q => q.state === "ORBITING") && s.sceneMs > s.invincibleUntil + 50, 600);
  c.placement = await op(page, "prepare", "tsujigiri:prepared");
  await steps(page, 3);
  c.targets = [];
  if (c.scenario === "passage") for (const enemy of group) c.targets.push(await op(page, "spawn", enemy));
  c.measurementStart = await read(page);
  const start = c.measurementStart;
  check(c, start.depth === 20 && start.slots.length === 1 && start.slots[0].state === "ORBITING",
    "native S1 NOVA begins with one orbiting slot in synthetic relay20", start.slots);
  check(c, start.evade.level === 0 && start.settings.novaFieldDurationMs === (c.mode.novaFieldShape === "lane" ? 2000 : 3000),
    "zero Evasive and explicit lane/circle field duration", { evade: start.evade, settings: start.settings });
  check(c, magnitude(start.body) < 1, "fixed input begins at a physically settled body", start.body);
  c.initialConditions = { hp: start.hp, maxHp: start.maxHp, en: start.en, evadeLevel: start.evade.level,
    body: start.body, depth: start.depth, area: c.placement.area, targets: c.targets };

  for (const phase of protocol) {
    await op(page, "label", `tsujigiri:${phase.id}`);
    if (c.scenario === "braking-contact" && phase.id === "braking-contact-window") {
      c.beforeContact = await read(page);
      check(c, isBraking(c.beforeContact) && !c.beforeContact.boostActive,
        "fixed timeline reached native Air Brake before contact fixture", c.beforeContact);
      check(c, !c.beforeContact.evade.active && c.beforeContact.sceneMs > c.beforeContact.invincibleUntil,
        "forced native overlap is outside Evasive and previous hit grace", c.beforeContact);
      // Explicit native-enemy placement is confined to this reception case.
      // The player has reached this point through the unchanged input path.
      c.contactTarget = await op(page, "spawn", { tag: "braking-native-contact", dx: 0, dy: 0, type: "tank" });
    }
    const after = await inputs(page, phase.held, phase.steps, c);
    c.phases.push({ ...phase, after });
  }
  c.measurementEnd = await read(page);
  const observation = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  c.analysis = analysePassage(observation, start);
  const a = c.analysis;
  check(c, !!a.deployment && a.deployment.boostActive && a.deployment.trace?.valid === true,
    "actual forward powered physical movement created the first DEP", a.deployment?.trace);
  check(c, !!a.leftInitialCircle && !a.returnedToInitialCircle,
    "body advanced beyond original 180px circle and did not return during this pass", { exit: a.leftInitialCircle, returned: a.returnedToInitialCircle });
  check(c, a.track.some(q => !q.boostActive && q.mode === "POST_BOOST_GLIDE"), "actual release entered native glide");
  check(c, a.braking.length > 0, "reverse input activated native Air Brake");
  check(c, a.samples.every(q => q.state === "ACTIVE" && !q.paused && !q.selection && !q.block),
    "every measured physical step remained active without a blocking overlay");
  check(c, a.samples.every(q => q.runtimeErrors.every(n => n === 0)), "dedicated runtimes stayed error-free");
  check(c, a.track.every(q => q.originalField?.expiresAtMs === a.initialField.expiresAtMs),
    "first DEP field retained one fixed deadline throughout the short pass");

  const arrival = a.track.at(-1), release = c.phases.find(q => q.id === "release").after;
  c.metrics = { nativeMoonAcceptedHits: a.moonHits.length, acceptedTargetTags: [...new Set(a.moonHits.map(q => q.tag))],
    maxForwardPx: a.maxForward, arrivalForwardPx: arrival.forward, arrivalLateralPx: arrival.lateral,
    arrivalMsFromDEP: arrival.elapsedCombatMs, arrivalProtected: arrival.protected,
    brakeSamples: a.braking.length, protectedBrakeSamples: a.braking.filter(q => q.protected).length,
    releaseSpeed: magnitude(release.body), minimumBrakeSpeed: Math.min(...a.braking.map(q => q.speed)),
    hpBefore: start.hp, hpAfter: c.measurementEnd.hp, enBefore: start.en, enAfter: c.measurementEnd.en,
    nativeContacts: a.contacts.length, acceptedPlayerDamage: a.receiverEvents.filter(q => q.accepted).length,
    sceneDeltaMs: c.measurementEnd.sceneMs - start.sceneMs,
    physicalSteps: c.measurementEnd.physicsSteps - start.physicsSteps };

  if (c.scenario === "passage") {
    // Moon's production acceptance supplies HP before/after its own receiver;
    // it does not have to pass through the generic applyDamageToEnemy hook.
    const directHpLoss = c.initialConditions.targets.filter(enemy =>
      c.measurementEnd.targets.some(now => now.tag === enemy.tag && now.hp < enemy.hp));
    c.nativeTargetHpLoss = directHpLoss.map(enemy => ({ tag: enemy.tag, before: enemy.hp,
      after: c.measurementEnd.targets.find(now => now.tag === enemy.tag).hp }));
    check(c, a.moonHits.length > 0 && a.moonHits.every(q => q.hit.hpAfter < q.hit.hpBefore)
      && directHpLoss.length > 0,
      "side group received actual Moon acceptance and native enemy HP loss", a.moonHits);
    check(c, arrival.forward > Math.max(...group.map(q => q.dx)) + 30,
      "native body reached the departure side beyond the initial group extent", arrival);
    check(c, c.metrics.minimumBrakeSpeed < c.metrics.releaseSpeed * .85,
      "native braking materially reduced speed during departure", c.metrics);
  } else {
    const contacts = a.contacts.filter(q => q.tag === "braking-native-contact");
    c.nativeReception = contacts;
    check(c, contacts.length > 0 && contacts.some(q => isBraking(q.before)),
      "spawned native tank actually overlapped the braking physical body", contacts);
    const initial = contacts[0];
    if (c.mode.novaFieldShape === "lane") {
      check(c, initial.before.novaFields.protected && initial.before.hp === initial.after.hp
        && initial.before.invincibleUntil === initial.after.invincibleUntil && initial.before.barrier === initial.after.barrier,
      "lane protects native braking contact without AP, barrier or hit-grace consumption", initial);
      check(c, a.receiverEvents.some(q => q.source === "enemyContact" && !q.accepted && isBraking(q.before)
        && q.before.novaFields.protected && q.before.hp === q.after.hp), "native damage receiver reached the lane guard during Air Brake");
    } else {
      check(c, !initial.before.novaFields.protected && initial.after.hp < initial.before.hp,
        "same circle fixture receives native contact damage at the departure side", initial);
    }
  }

  if (c.mode.novaFieldShape === "lane") {
    check(c, a.initialField?.shape === "lane" && a.initialField.forwardLength === 1800 && a.initialField.rearLength === 120
      && a.initialField.halfWidth === 120 && Math.abs(a.initialField.durationMs - 2000) < 1e-7,
    "normal DEP owns the configured fixed lane geometry", a.initialField);
    check(c, a.initialField.dirX > .99 && Math.abs(a.initialField.dirY) < .01,
      "rightward first valid physical movement fixed the lane direction", a.initialField);
    check(c, a.braking.some(q => q.distance > 180 && q.protected) && arrival.protected,
      "departure and deceleration stay protected without returning to the DEP origin", { braking: a.braking, arrival });
    c.presentation = await inspectPresentation(page);
    check(c, c.presentation.before.active && c.presentation.before.visible && c.presentation.before.commands > 0,
      "normal Graphics has visible gameplay lane commands", c.presentation.before);
    check(c, c.presentation.fxOff.mode === "off" && c.presentation.fxOff.commands > 0 && c.presentation.fxOff.fields.protected,
      "lane remains visible and protective with decorative FX disabled", c.presentation.fxOff);
    check(c, c.presentation.selection?.value === "lane" && c.presentation.selection.options.some(q => q.value === "lane" && q.text.includes("2秒"))
      && c.presentation.selection.options.some(q => q.value === "1" && q.text.includes("3秒")),
      "comparison UI identifies lane and retains the separate circle option", c.presentation.selection);
  } else {
    check(c, a.initialField?.radius === 180 && Math.abs(a.initialField.durationMs - 3000) < 1e-7 && !arrival.protected,
      "three-second circle stays at DEP and does not protect the reached departure side", { field: a.initialField, arrival });
  }
  // Screenshot and JSON export follow the controlled movement interval.
  await page.screenshot({ path: path.join(out, `${c.id}-arrival.png`), fullPage: true });
}

function compareCases(cases) {
  return ["passage", "braking-contact"].map(scenario => {
    const circle = cases.find(c => c.scenario === scenario && c.mode.id === "circle");
    const lane = cases.find(c => c.scenario === scenario && c.mode.id === "lane");
    const values = c => c?.initialConditions ? { hp: c.initialConditions.hp, maxHp: c.initialConditions.maxHp,
      en: c.initialConditions.en, evadeLevel: c.initialConditions.evadeLevel, depth: c.initialConditions.depth,
      body: c.initialConditions.body, area: c.initialConditions.area,
      targets: c.initialConditions.targets.map(t => ({ tag: t.tag, type: t.type, hp: t.hp, maxHp: t.maxHp,
        contactDamage: t.contactDamage, body: t.body })) } : null;
    const inputsFor = c => (c?.phases || []).map(q => ({ id: q.id, held: q.held, steps: q.steps }));
    const beforeCircle = values(circle), beforeLane = values(lane);
    return { scenario, complete: !!circle?.metrics && !!lane?.metrics,
      sameInitialFixture: beforeCircle !== null && JSON.stringify(beforeCircle) === JSON.stringify(beforeLane),
      sameInputSchedule: JSON.stringify(inputsFor(circle)) === JSON.stringify(protocol) && JSON.stringify(inputsFor(lane)) === JSON.stringify(protocol),
      circle: circle?.metrics || null, lane: lane?.metrics || null,
      initialCircle: beforeCircle, initialLane: beforeLane,
      note: "Post-contact AP/EN/trajectory are recorded outcomes, not forced to match. Native damage can change later movement." };
  });
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const report = { createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
    harnessSha256: h.sha(fs.readFileSync(__filename)), cases: [], errors: [],
    protocol: { hz: 60, phases: protocol, totalSteps: protocol.reduce((n, p) => n + p.steps, 0) }, group,
    methodology: "Four serial fresh relay20 normal Scene contexts: circle/lane side-group passage, then circle/lane native contact during braking. The same native S1 Moon/NOVA acquisition and Opening preparation, equipment, zero Evasive and fixed keyboard schedule are used per pair. One initial player body placement is explicit; no player relocation occurs during measurement. Passage targets use three native tanks with unchanged HP, contact damage and AI. The separate reception case creates one native tank at the actual braking body's reached position at the same protocol phase. No player HP/EN, enemy HP, attack count, movement setting, physics update or collision callback is replaced. Observations are bounded by the existing 600-record/900-sample/8-target probe. Screenshot and JSON generation follow movement. This is controlled original Game.step functional evidence, not rAF or performance measurement.",
    limitations: ["Synthetic Relay20 and recorded Opening selection; not natural progression", "S1 Moon/NOVA, zero Evasive and one fixed keyboard timeline", "S8 overlapping lanes and prolonged immunity coverage are not measured here", "Native enemies move after initial placement; initial layouts are identical per pair", "No physical phone/gamepad, long-run performance, all Boss actions or final balance claim"] };
  let browser;
  try {
    const harnessDir = path.join(out, "harness"); fs.mkdirSync(harnessDir, { recursive: true });
    for (const name of [path.basename(__filename), "umbra-mobility-browser.cjs", "umbra-integration-browser-harness.cjs",
      "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs", "umbra-moonreach-controlled-helpers.cjs"])
      fs.copyFileSync(path.join(__dirname, name), path.join(harnessDir, name), fs.constants.COPYFILE_EXCL);
    browser = await h.launch(); report.browser = browser.version();
    const selected = process.env.UMBRA_TSUJIGIRI_CASES?.split(",");
    for (const scenario of ["passage", "braking-contact"]) for (const mode of modes) {
      const id = `${mode.id}-${scenario}`; if (selected && !selected.includes(id)) continue;
      const c = { id, scenario, mode, checks: [], selections: [], inputs: [], phases: [] }; report.cases.push(c);
      let r;
      process.stdout.write(`START tsujigiri ${id}\n`);
      try { r = await setup(browser, mode, c, value => { r = value; }); await runTrial(r, c); }
      catch (error) {
        c.error = String(error.stack || error);
        if (r) c.failure = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export()
          || window.__NORMAL_SCENE_OBSERVER__?.snapshot()).catch(e => ({ error: String(e) }));
      } finally {
        if (r) {
          c.final = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export()).catch(() => null);
          await r.page.evaluate(() => {
            window.__UMBRA_MOBILITY_PROBE__?.cleanup(); window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_PREP_CONTROL__?.restore();
            window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("TSUJIGIRI_CASE_END");
            const game = window.__SURVIVAL_GAME__; if (game?.pendingDestroy) game.step(performance.now(), 1000 / 60);
            window.__UMBRA_EXTERNAL_DATE__?.restore();
          }).catch(e => { c.endError = String(e); });
          c.audit = await h.audit(r).catch(e => ({ error: String(e) }));
          await r.context.close().catch(e => { c.contextCloseError = String(e); });
        }
        c.passed = !c.error && !c.endError && !c.contextCloseError && c.checks.length > 0 && c.checks.every(q => q.passed)
          && c.audit?.isolationPassed === true && c.audit.pageErrors.length === 0;
        fs.writeFileSync(path.join(out, `${id}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
        process.stdout.write(`END tsujigiri ${id} ${c.passed ? "PASS" : "FAIL"} ${c.error || ""}\n`);
      }
    }
    report.comparisons = compareCases(report.cases);
    report.fullComparison = !selected;
  } catch (error) { report.errors.push(String(error.stack || error)); }
  finally {
    if (browser) {
      let timer;
      await Promise.race([browser.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("browser close timeout")), 10000); })])
        .catch(e => { report.cleanupError = String(e); }); clearTimeout(timer);
    }
    report.passed = report.cases.length > 0 && report.cases.every(c => c.passed) && !report.errors.length && !report.cleanupError
      && (!report.fullComparison || report.comparisons?.every(c => c.complete && c.sameInitialFixture && c.sameInputSchedule));
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    process.stdout.write(JSON.stringify({ passed: report.passed, checks: report.cases.map(c => ({ id: c.id,
      passed: c.checks.filter(q => q.passed).length, total: c.checks.length, metrics: c.metrics, error: c.error })), errors: report.errors }) + "\n");
    process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
module.exports = { protocol, group, analysePassage, compareCases };
