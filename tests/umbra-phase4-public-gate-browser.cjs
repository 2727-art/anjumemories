"use strict";

// Reuses the normal-browser test's fresh synthetic storage, blocked external
// requests, publication-handler checks, and actual HUB -> Opening Boost flow.
// Normal bootstrap attempts are expected, not the attack-arena isolation count.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, ".."), base = process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173";
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase4", "gate-output");
const names = ["index.html", "game.js", "skillDefinitions.js", "stageDefinitions.js", "equipmentDefinitions.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js"];
const frozen = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(project, name))]));
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const report = { pass: false, sourceHashes: Object.fromEntries(names.map(name => [name, hash(frozen[name])])), cases: [],
  methodology: "Fresh synthetic browser contexts only; no real save/profile. Every selected source is fulfilled from one immutable buffer. Normal bootstrap external attempts are recorded and blocked; these counts are separate from the attack-arena isolation test." };
fs.mkdirSync(output, { recursive: true });
const reportPath = path.join(output, "bloodspike-public-gate-report.json");
if (fs.existsSync(reportPath)) fs.copyFileSync(reportPath, path.join(output, `bloodspike-public-gate-previous-${Date.now()}.json`));
let browser;

async function runCase(name, query) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const record = { name, query, requests: [], blockedExternal: [], pageErrors: [], consoleErrors: [] };
  report.cases.push(record);
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) { record.blockedExternal.push(url.href); return route.abort(); }
    const leaf = decodeURIComponent(url.pathname).split("/").pop() || "index.html";
    if (frozen[leaf]) return route.fulfill({ status: 200, body: frozen[leaf], contentType: leaf.endsWith(".html") ? "text/html" : "application/javascript" });
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push({ url: request.url(), type: request.resourceType() }));
  page.on("pageerror", error => record.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") record.consoleErrors.push(message.text()); });
  await page.addInitScript(() => {
    const original = Object.fromEntries(["getItem", "setItem", "removeItem", "clear", "key"].map(key => [key, Storage.prototype[key]]));
    const lengthGet = Object.getOwnPropertyDescriptor(Storage.prototype, "length").get;
    const local = window.localStorage, session = window.sessionStorage;
    original.setItem.call(local, "lastmemoVansabaCoins", "314159");
    original.setItem.call(local, "umbra-public-gate-audit-sentinel", "synthetic-only");
    original.setItem.call(session, "umbra-public-gate-audit-sentinel", "synthetic-only");
    const one = storage => {
      const result = {};
      for (let i = 0; i < lengthGet.call(storage); i++) { const key = original.key.call(storage, i); result[key] = original.getItem.call(storage, key); }
      return result;
    };
    window.__normalAudit = { mutations: [], snapshot: () => ({ local: one(local), session: one(session) }) };
    for (const method of ["setItem", "removeItem", "clear"]) Storage.prototype[method] = function (...args) {
      window.__normalAudit.mutations.push({ area: this === local ? "local" : "session", method, key: args[0] });
      return original[method].apply(this, args);
    };
  });
  try {
    await page.goto(`${base}/?mobileGate=0&mobileControls=0&${query}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene")?.shopActive === true, null, { timeout: 60000 });
    record.hub = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), drawnIds = [];
      const original = scene.renderPlayerMechHangarCard;
      scene.renderPlayerMechHangarCard = function (id, ...args) { drawnIds.push(id); return original.call(this, id, ...args); };
      scene.shopViewMode = "geek"; scene.geekShopSubView = "hanger"; scene.showPreGameShop();
      scene.renderPlayerMechHangarCard = original;
      return { drawnIds, releasedIds: scene.getReleasedPlayerMechIds(), selected: scene.getSelectedPlayerMechId(), slots: scene.getPlayerSkillSlotIds(), persisted: scene.shopState.playerMechs,
        gameplayRuntimeCreated: Boolean(scene.gameplayRuntimeCreated), spikeEnabled: scene.isUmbraBloodSpikeVerificationEnabled(), moonEnabled: scene.isUmbraMoonlightVerificationEnabled(),
        spikeRuntime: Boolean(scene.umbraBloodSpikeRuntime), moonRuntime: Boolean(scene.umbraMoonlightRuntime), previewGlobal: typeof window.createUmbraPhase1Scenes !== "undefined" || typeof window.umbraPreviewAssets !== "undefined" };
    });
    assert.deepEqual(record.hub.drawnIds, ["defaultBear", "regaliaBastion"]);
    assert.deepEqual(record.hub.releasedIds, ["defaultBear", "regaliaBastion"]);
    assert.equal(record.hub.selected, "defaultBear");
    assert.deepEqual(record.hub.slots, ["basicSkill", "tornadoSkill", "rabbitThunderSkill"]);
    for (const key of ["gameplayRuntimeCreated", "spikeEnabled", "moonEnabled", "spikeRuntime", "moonRuntime", "previewGlobal"]) assert.equal(record.hub[key], false, `${name}: ${key}`);
    record.guards = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      const before = window.__normalAudit.snapshot(), shopBefore = JSON.stringify(scene.shopState), coinsBefore = scene.coins, mutationStart = window.__normalAudit.mutations.length;
      const results = { owned: scene.isPlayerMechOwned("umbraSeraph"), unlockRequirement: scene.isPlayerMechUnlockRequirementMet("umbraSeraph"), canPurchase: scene.canPurchasePlayerMech("umbraSeraph"), purchase: scene.purchasePlayerMech("umbraSeraph"), select: scene.selectPlayerMech("umbraSeraph"), handler: scene.handlePlayerMechHangarAction("umbraSeraph"), presentation: scene.getPlayerMechHangarActionPresentation("umbraSeraph") };
      return { before, after: window.__normalAudit.snapshot(), shopBefore, shopAfter: JSON.stringify(scene.shopState), coinsBefore, coinsAfter: scene.coins, results, mutations: window.__normalAudit.mutations.slice(mutationStart) };
    });
    for (const key of ["owned", "unlockRequirement", "canPurchase", "purchase", "select", "handler"]) assert.equal(record.guards.results[key], false, `${name}: guard ${key}`);
    assert.equal(record.guards.results.presentation.interactive, false);
    assert.deepEqual(record.guards.after, record.guards.before);
    assert.equal(record.guards.shopAfter, record.guards.shopBefore); assert.equal(record.guards.coinsAfter, record.guards.coinsBefore);
    assert.deepEqual(record.guards.mutations, []);
    assert.equal(await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").continueSortieFromHub()), true);
    await page.waitForFunction(() => { const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return scene.gameplayRuntimeCreated && !scene.shopActive && scene.levelUpActive && scene.hudSkillSlots?.length === 5; }, null, { timeout: 90000 });
    record.sortie = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); scene.updateHud();
      return { runMech: scene.getRunPlayerMechId(), skills: Object.keys(scene.playerSkills), slots: scene.getPlayerSkillSlotIds(), firstStage: scene.getOrderedSkillStates()[0]?.currentStage?.stage,
        opening: scene.isOpeningBoostDraftActive(), selections: scene.startingUpgradeSelectionsRemaining, paused: scene.physics.world.isPaused, survivalTime: scene.survivalTime,
        hud: scene.hudSkillSlots.slice(0, 3).map(slot => slot.label.text), persisted: scene.shopState.playerMechs,
        spikeEnabled: scene.isUmbraBloodSpikeVerificationEnabled(), moonEnabled: scene.isUmbraMoonlightVerificationEnabled(), spikeRuntime: Boolean(scene.umbraBloodSpikeRuntime), moonRuntime: Boolean(scene.umbraMoonlightRuntime),
        storage: window.__normalAudit.snapshot(), normalFlowMutations: window.__normalAudit.mutations };
    });
    assert.equal(record.sortie.runMech, "defaultBear"); assert.deepEqual(record.sortie.skills, ["basicSkill"]);
    assert.deepEqual(record.sortie.slots, ["basicSkill", "tornadoSkill", "rabbitThunderSkill"]);
    assert.equal(record.sortie.firstStage, 1); assert.equal(record.sortie.opening, true); assert.equal(record.sortie.selections, 3); assert.equal(record.sortie.paused, true); assert.equal(record.sortie.survivalTime, 0);
    assert.deepEqual(record.sortie.hud, ["Lv.1", "LOCK", "LOCK"]);
    assert.ok(!record.sortie.persisted.ownedIds.includes("umbraSeraph")); assert.notEqual(record.sortie.persisted.selectedId, "umbraSeraph");
    for (const key of ["spikeEnabled", "moonEnabled", "spikeRuntime", "moonRuntime"]) assert.equal(record.sortie[key], false);
    record.umbraAssetRequests = record.requests.filter(item => /umbra(?:Preview|Drive|MoonlightArena)|KGK-02_UMBRA_SERAPH/i.test(decodeURIComponent(new URL(item.url).pathname)));
    assert.deepEqual(record.umbraAssetRequests, []); assert.deepEqual(record.pageErrors, []);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    record.pass = true;
  } catch (error) {
    record.pass = false; record.error = error.stack;
    await page.screenshot({ path: path.join(output, `${name}-failed-${Date.now()}.png`) }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

(async () => {
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(project, ".tmp_umbra_phase4", "final-sources.json"), "utf8"));
    assert.deepEqual(report.sourceHashes, manifest.sources); report.finalManifestMatched = true;
    browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
    await runCase("normal-spike-query", "umbraBloodSpike=1");
    await runCase("normal-spike-moon-query", "umbraBloodSpike=1&umbraMoonlight=1");
    report.currentSourceHashes = Object.fromEntries(names.map(name => [name, hash(fs.readFileSync(path.join(project, name)))]));
    assert.deepEqual(report.currentSourceHashes, report.sourceHashes); report.currentSourcesMatched = true; report.pass = true;
  } catch (error) { report.error = error.stack; process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (!report.pass) fs.writeFileSync(path.join(output, `bloodspike-public-gate-failed-${Date.now()}.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ pass: report.pass, finalManifestMatched: report.finalManifestMatched, currentSourcesMatched: report.currentSourcesMatched, cases: report.cases.map(item => ({ name: item.name, pass: item.pass, normalExternalAttemptsBlocked: item.blockedExternal.length, umbraRequests: item.umbraAssetRequests?.length, pageErrors: item.pageErrors, error: item.error })), reportPath, error: report.error }, null, 2));
  }
})();
