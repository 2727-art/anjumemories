"use strict";

const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw new Error("Fresh UMBRA_TEST_OUTPUT required");
fs.mkdirSync(out, { recursive: true });
const report = {
  createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
  harnessSha256: h.sha(fs.readFileSync(__filename)), bootstrapHarnessSha256: h.harnessSha256,
  observerSha256: h.sha(fs.readFileSync(path.join(__dirname, "umbra-integration-scene-observer.cjs"))),
  methodology: "Functional normal-rAF initialization, not load/performance measurement. Explicit synthetic RAM fixture. Actual DOM START, actual Phaser SORTIE PREP pointer input, normal Opening card keyboard input, real 680ms enable and 360ms commit timers. Observer wrappers call original methods with unchanged arguments/return values; they do not substitute spawn/AI/attack/physics/XP/IO/candidates. No manual Game.step, free stages, synthetic XP, invulnerability, HP adjustment, or clock alteration. Initial smoke selects current legal passive cards to retain initial dedicated skill ownership; natural full combat/Gate is separate.",
  cases: [], errors: []
};

async function clickPhaserText(page, title) {
  async function point() {
    return page.evaluate(title => {
      const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene("survival-scene");
      const matches = [];
      function visit(object, ancestorVisible = true) {
        if (!object) return;
        const visible = ancestorVisible && object.visible !== false && object.active !== false && object.alpha !== 0;
        if (visible && object.type === "Text" && object.text === title) matches.push(object);
        for (const child of object.list || []) visit(child, visible);
      }
      for (const child of scene.children.list) visit(child);
      const object = matches.at(-1); if (!object) throw new Error(`Visible Phaser text not found: ${title}`);
      const bounds = object.getBounds(), canvas = game.canvas.getBoundingClientRect();
      return { x: canvas.left + bounds.centerX * canvas.width / game.config.width,
        y: canvas.top + bounds.centerY * canvas.height / game.config.height,
        bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }, canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height }, matches: matches.length,
        viewport: { width: innerWidth, height: innerHeight } };
    }, title);
  }
  let p = await point();
  if (p.y > p.viewport.height - 20 || p.y < 20) {
    await page.evaluate(y => window.scrollBy(0, y - innerHeight / 2), p.y); p = await point();
  }
  if (p.x < 0 || p.x >= p.viewport.width || p.y < 0 || p.y >= p.viewport.height) throw Error(`Phaser target outside viewport: ${JSON.stringify(p)}`);
  await page.mouse.click(p.x, p.y);
  return p;
}

async function waitHub(page) {
  await page.waitForFunction(() => document.getElementById("umbra-integration-start")?.disabled === false, null, { timeout: 30000 });
  await page.locator("#umbra-integration-start").click();
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene")?.shopActive === true, null, { timeout: 60000 });
}
async function read(page) { return page.evaluate(() => window.__NORMAL_SCENE_OBSERVER__.snapshot()); }
async function enabledCards(page) {
  await page.waitForFunction(() => {
    const scene = window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene");
    return scene?.levelUpActive && scene.levelUpInputEnabled && !scene.levelUpSelectionLocked && scene.levelUpCardRecords?.length > 0;
  }, null, { timeout: 90000 });
  return read(page);
}
async function chooseCard(page, index) {
  const before = await read(page);
  await page.keyboard.press(String(index + 1));
  const locked = await read(page);
  await page.waitForFunction(identity => window.__NORMAL_SCENE_OBSERVER__.snapshot().cardsIdentity !== identity, before.cardsIdentity, { timeout: 15000 });
  return { index, before, locked, after: await read(page) };
}

async function runInitialization(browser, fixture, strategy = "passive") {
  const name = `${fixture}-${strategy}-opening`;
  const c = { name, fixture, strategy, checks: [], selections: [], inputs: [] }; report.cases.push(c);
  const check = (passed, label, actual = null) => {
    c.checks.push({ passed: !!passed, label, actual });
    if (!passed) throw Error(`Failfast: ${label}`);
  };
  let r;
  try {
    r = await h.open(browser, name, { path: `/umbra-integration.html?fixture=${fixture}` });
    await waitHub(r.page); c.hub = await r.page.evaluate(installSceneObserver);
    c.startInputs = await r.page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return { base: s.createBasePlayerStats(), ownedCds: s.getOwnedCdDefinitions().map(cd => ({ id: cd.id, bonus: cd.statBonus })),
        upgrades: Object.fromEntries(["weapon","armor","shoes"].map(id => [id,s.getPermanentUpgradeLevel(id)])),
        mech: s.getPlayerMechDefinition("umbraSeraph").statProfile };
    });
    c.inputs.push({ operation: "actual-SORTIE-PREP-pointer", point: await clickPhaserText(r.page, "SORTIE PREP") });
    c.firstOpening = await enabledCards(r.page);
    check(c.firstOpening.opening === 3, "actual Opening starts with three confirmations", c.firstOpening.opening);
    check(c.firstOpening.selectionActive && c.firstOpening.worldPaused, "Opening pauses normal world");
    if (fixture === "baseline") {
      const state = c.firstOpening, context = state.normalContext;
      check(!!context && context.mechId === "umbraSeraph" && state.runMechId === "umbraSeraph", "first body belongs to captured UMBRA run", context);
      check(context.current && context.state === "BOUND" && context.inputsFrozen, "valid bound immutable input context before first card", context);
      check(context.bodyIdentity === state.currentBodyIdentity && context.playerIdentity === state.currentPlayerIdentity && context.worldIdentity === state.currentWorldIdentity, "Context binds current numeric body/player/world identities once");
      check(state.body.radius === 22 && state.body.enabled, "normal physical radius22 independent of sprite dimensions", state.body);
      const hpBeforeMech = Math.round(c.startInputs.base.maxHp + c.startInputs.upgrades.armor * 10 + c.startInputs.ownedCds.reduce((n,cd) => n+(Number(cd.bonus?.maxHpAdd)||0),0));
      const enBeforeMech = Math.round(c.startInputs.base.maxStamina + c.startInputs.ownedCds.reduce((n,cd) => n+(Number(cd.bonus?.maxStaminaAdd)||0),0));
      c.expectedStartingStats = { maxHp: Math.round((hpBeforeMech+c.startInputs.mech.maxHpAdd)*c.startInputs.mech.maxHpMultiplier), maxStamina: enBeforeMech+c.startInputs.mech.maxStaminaAdd };
      check(state.stats.maxHp === c.expectedStartingStats.maxHp && state.stats.maxStamina === c.expectedStartingStats.maxStamina, "baseline real owned-CD and neutral-gear starting HP/EN apply once", { expected:c.expectedStartingStats, actual:state.stats });
      check(state.skills.umbraMoonlight?.stageIndex === 0 && !state.skills.umbraBloodSpike && !state.skills.umbraPhantomNova, "initial Moon S1 only; SPIKE/NOVA unacquired", state.skills);
      check(!!state.owners[0] && !state.owners[1] && !state.owners[2], "only acquired Moon runtime owns body", state.owners);
      check(context.selectAllowed && !context.combatAllowed, "BOUND allows actual growth but rejects combat");
    }
    for (let opening = 3; opening > 0; opening--) {
      const state = await enabledCards(r.page);
      check(state.opening === opening, "Opening remaining budget decrements once", { expected: opening, actual: state.opening });
      if (fixture === "baseline") {
        check(!state.normalContext.combatAllowed && state.owners.every(o => !o || (o.combatTimeMs === 0 && (o.counts.accepted || 0) === 0)), "normal Opening never advances dedicated attack clocks/acceptance", state.owners);
      }
      let index = -1;
      if (strategy === "passive") index = state.cards.findIndex(card => card.type === "passive");
      else if (strategy === "moon") index = state.cards.findIndex(card => card.skillId === "umbraMoonlight" || card.id === "umbraMoonlight");
      else if (strategy === "unlock") index = state.cards.findIndex(card => ["umbraBloodSpike", "umbraPhantomNova"].includes(card.skillId || card.id) && !state.skills[card.skillId || card.id]);
      if (index < 0 && strategy !== "moon") index = state.cards.findIndex(card => card.type === "passive");
      check(index >= 0, "requested current legal Opening option exists", { strategy, cards: state.cards });
      const selection = await chooseCard(r.page, index); c.selections.push(selection);
      check(selection.locked.selectionLocked, "real keyboard selection locks immediately");
      check(selection.after.opening === opening - 1, "real delayed commit consumes exactly one Opening", selection.after.opening);
    }
    if (strategy === "moon") {
      const core = await enabledCards(r.page); c.core = core;
      check(core.opening === 0 && core.cards.every(card => card.phase === "stage4"), "third Opening S4 produces actual Core overlay", core.cards);
      check(!core.normalContext.combatAllowed && core.owners.every(o => !o || o.combatTimeMs === 0), "Core pending after Opening keeps attack gate closed");
      c.selections.push(await chooseCard(r.page, 0));
    }
    await r.page.waitForFunction(isUmbra => {
      const s = window.__NORMAL_SCENE_OBSERVER__.snapshot();
      return !s.selectionActive && !s.worldPaused && (isUmbra ? s.normalContext?.state === "ACTIVE" && s.normalContext.combatAllowed : true);
    }, fixture === "baseline", { timeout: 15000 });
    c.active = await read(r.page);
    check(c.active.opening === 0 && c.active.pending === 0, "normal Opening budget fully consumed; no free pending");
    if (fixture === "baseline") {
      check(c.active.normalContext.inputsIdentity === c.firstOpening.normalContext.inputsIdentity && c.active.currentBodyIdentity === c.firstOpening.currentBodyIdentity, "same fixed input/body through three real choices");
      check(c.active.owners[0].identity === c.firstOpening.owners[0].identity, "Moon owner not rebuilt by Opening confirmations");
      if (strategy === "passive") check(c.active.skills.umbraMoonlight.stageIndex === 0 && !c.active.owners[1] && !c.active.owners[2], "passive-only smoke retains initial dedicated ownership");
      if (strategy === "unlock") {
        c.unlockCoverage = { spike: !!c.active.owners[1], nova: !!c.active.owners[2] };
        check(c.unlockCoverage.spike && c.unlockCoverage.nova, "both actual Opening Unlock paths exercised in this candidate sequence", c.unlockCoverage);
      }
    } else {
      const expected = fixture === "regalia" ? "regaliaBastion" : "defaultBear";
      check(!c.active.normalContext && c.active.runMechId === expected, "released mech remains on its normal legacy run route", { expected, actual:c.active.runMechId });
      check(c.active.owners.every(owner => !owner), "released mech does not initialize dedicated UMBRA owners");
      check(Object.keys(c.active.skills).length > 0 && Object.keys(c.active.skills).every(id => !id.startsWith("umbra")), "released mech has its legitimate starting skill", c.active.skills);
      check(!r.record.requests.some(req => /KGK-02_UMBRA|umbraPresentation|umbraPreviewAssets|umbraDrive|umbraMoonlightArena/.test(req.path)), "released mech does not request UMBRA art or isolated/presentation modules");
    }
    await r.page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    c.observer = await r.page.evaluate(() => window.__NORMAL_SCENE_OBSERVER__.export());
    const prepared = c.observer.events.find(e => e.kind === "prepareUmbraNormalRunContext:after" && e.state.normalContext);
    if (fixture === "baseline") {
      check(prepared?.state.normalContext.state === "PREPARED" && !prepared.state.currentBodyIdentity && !!prepared.state.growth, "PREPARED records bodyless growth model before loader/body", prepared?.state);
      const startingStats = c.observer.events.filter(e => e.kind === "rebuildStartingStats:after");
      check(startingStats.length === 1, "starting FRAME/AP and CORE/EN rebuild once after observer attachment", startingStats.map(e => e.state.stats));
      check(c.observer.events.filter(e => e.kind === "applyDamageToEnemy:before").every(e => !e.state.normalContext || e.state.normalContext.combatAllowed), "all observed damage receipts occur outside UMBRA blocked state");
    }
    check(c.observer.errors.length === 0, "observation did not throw", c.observer.errors);
  } catch (error) {
    c.error = error.stack; c.checks.push({ passed: false, label: "case completed", actual: error.stack });
    if (r) {
      c.failureSnapshot = await read(r.page).catch(e => ({ error: String(e) }));
      c.observer ??= await r.page.evaluate(() => window.__NORMAL_SCENE_OBSERVER__?.export()).catch(e => ({ error: String(e) }));
      await r.page.screenshot({ path: path.join(out, `${name}-failure.png`), fullPage: true }).catch(() => {});
    }
  } finally {
    if (r) {
      c.environment = await r.page.evaluate(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot()).catch(() => null);
      await r.page.evaluate(() => { window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("TEST_CASE_END"); }).catch(() => {});
      await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot().closed, null, { timeout: 10000 }).catch(e => c.checks.push({ passed: false, label: "environment closes after case", actual: String(e) }));
      await h.close(r); c.context = r.record;
      c.checks.push({ passed: r.record.isolationPassed, label: "strict real Storage / external IO isolation", actual: r.record.audit });
      c.checks.push({ passed: r.record.pageErrors.length === 0, label: "no uncaught page errors", actual: r.record.pageErrors });
    }
    c.passed = c.checks.length > 0 && c.checks.every(x => x.passed);
    fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ name, passed: c.passed, failed: c.checks.filter(x => !x.passed).map(x => ({ label: x.label, actual: x.actual })) }));
  }
  return c.passed;
}

async function main() {
  let browser;
  try {
    fs.mkdirSync(path.join(out,"harness"), {recursive:true});
    for (const name of ["umbra-integration-initialization-browser.cjs","umbra-integration-scene-observer.cjs","umbra-integration-browser-harness.cjs"]) fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
    browser = await h.launch(); report.browserVersion = browser.version();
    const first = await runInitialization(browser, process.env.UMBRA_TEST_FIXTURE || "baseline", process.env.UMBRA_TEST_STRATEGY || "passive");
    if (!first) report.errors.push("Failfast first normal sortie did not complete; further scenarios not run.");
  } catch (e) { report.errors.push(e.stack); }
  finally {
    await browser?.close(); report.passed = report.errors.length === 0 && report.cases.length > 0 && report.cases.every(c => c.passed);
    const file = path.join(out, "integration-initialization.json"); fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ passed: report.passed, file, errors: report.errors })); process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
module.exports = { clickPhaserText, waitHub, enabledCards, chooseCard, runInitialization };
