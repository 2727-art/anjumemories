"use strict";

// Normal-flow regression in fresh synthetic browser contexts only.
// External requests are recorded and blocked; normal bootstrap attempts are
// expected here and are not evidence about the separate preview isolation test.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173";
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, "..", ".tmp_umbra_phase1");
const report = { base, scope: "Fresh synthetic contexts; normal bootstrap external attempts blocked; no real user profile", cases: [] };
const expected = {
  defaultBear: ["basicSkill", "tornadoSkill", "rabbitThunderSkill"],
  regaliaBastion: ["regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"]
};
fs.mkdirSync(output, { recursive: true });
let browser;

async function runCase(name, query, mechId, takeHudScreenshot, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const record = { name, query, expectedMech: mechId, requests: [], blockedExternal: [], pageErrors: [], consoleErrors: [] };
  report.cases.push(record);
  await context.route("**/*", async route => {
    const url = route.request().url();
    if (new URL(url).origin !== new URL(base).origin) {
      record.blockedExternal.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push({ url: request.url(), type: request.resourceType() }));
  page.on("pageerror", error => record.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") record.consoleErrors.push(message.text()); });
  await page.addInitScript(options => {
    const original = Object.fromEntries(["getItem", "setItem", "removeItem", "clear", "key"].map(key => [key, Storage.prototype[key]]));
    const lengthGet = Object.getOwnPropertyDescriptor(Storage.prototype, "length").get;
    const local = window.localStorage, session = window.sessionStorage;
    // These fixtures are created inside this brand-new context, never copied from a user save.
    original.setItem.call(local, "lastmemoVansabaCoins", "314159");
    original.setItem.call(local, "umbra-normal-audit-sentinel", "synthetic-only");
    original.setItem.call(session, "umbra-normal-audit-sentinel", "synthetic-only");
    if (options.ownedRegaliaFixture) {
      original.setItem.call(local, "lastmemoVansabaShopState", JSON.stringify({
        playerMechs: { ownedIds: ["defaultBear", "regaliaBastion"], selectedId: "defaultBear" }
      }));
    }
    const one = storage => {
      const result = {};
      for (let i = 0; i < lengthGet.call(storage); i++) {
        const key = original.key.call(storage, i);
        result[key] = original.getItem.call(storage, key);
      }
      return result;
    };
    window.__normalAudit = { mutations: [], snapshot: () => ({ local: one(local), session: one(session) }) };
    for (const method of ["setItem", "removeItem", "clear"]) {
      Storage.prototype[method] = function (...args) {
        window.__normalAudit.mutations.push({ area: this === local ? "local" : "session", method, key: args[0] });
        return original[method].apply(this, args);
      };
    }
  }, options);
  try {
    await page.goto(base + "/?mobileGate=0&mobileControls=0" + query, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene")?.shopActive === true, null, { timeout: 60000 });
    record.hub = await page.evaluate(options => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      const selectedViaHangerHandler = options.ownedRegaliaFixture ? scene.handlePlayerMechHangarAction("regaliaBastion") : null;
      const drawnIds = [];
      const original = scene.renderPlayerMechHangarCard;
      scene.renderPlayerMechHangarCard = function (id, ...args) { drawnIds.push(id); return original.call(this, id, ...args); };
      scene.shopViewMode = "geek";
      scene.geekShopSubView = "hanger";
      scene.showPreGameShop();
      scene.renderPlayerMechHangarCard = original;
      return {
        drawnIds,
        selectedViaHangerHandler,
        releasedIds: scene.getReleasedPlayerMechIds(),
        selected: scene.getSelectedPlayerMechId(),
        debugOverride: scene.getDebugPlayerMechIdOverride(),
        skillSlots: scene.getPlayerSkillSlotIds(),
        persistedMechs: scene.shopState.playerMechs,
        gameplayRuntimeCreated: Boolean(scene.gameplayRuntimeCreated)
      };
    }, options);
    assert.deepEqual(record.hub.drawnIds, ["defaultBear", "regaliaBastion"], name + ": HANGER cards");
    assert.deepEqual(record.hub.releasedIds, ["defaultBear", "regaliaBastion"]);
    assert.deepEqual(record.hub.skillSlots, expected[mechId]);
    assert.equal(record.hub.gameplayRuntimeCreated, false);
    if (options.ownedRegaliaFixture) {
      assert.equal(record.hub.selectedViaHangerHandler, true);
      assert.equal(record.hub.selected, "regaliaBastion");
      assert.equal(record.hub.persistedMechs.selectedId, "regaliaBastion");
    }
    record.publicationGuards = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      const before = window.__normalAudit.snapshot();
      const shopBefore = JSON.stringify(scene.shopState);
      const coinsBefore = scene.coins;
      const mutationStart = window.__normalAudit.mutations.length;
      const results = {
        owned: scene.isPlayerMechOwned("umbraSeraph"),
        unlockRequirement: scene.isPlayerMechUnlockRequirementMet("umbraSeraph"),
        canPurchase: scene.canPurchasePlayerMech("umbraSeraph"),
        purchase: scene.purchasePlayerMech("umbraSeraph"),
        select: scene.selectPlayerMech("umbraSeraph"),
        handler: scene.handlePlayerMechHangarAction("umbraSeraph"),
        presentation: scene.getPlayerMechHangarActionPresentation("umbraSeraph")
      };
      return { before, after: window.__normalAudit.snapshot(), shopBefore, shopAfter: JSON.stringify(scene.shopState),
        coinsBefore, coinsAfter: scene.coins, results, mutations: window.__normalAudit.mutations.slice(mutationStart) };
    });
    const guards = record.publicationGuards;
    for (const key of ["owned", "unlockRequirement", "canPurchase", "purchase", "select", "handler"]) assert.equal(guards.results[key], false, name + ": guard " + key);
    assert.equal(guards.results.presentation.interactive, false);
    assert.deepEqual(guards.after, guards.before, name + ": rejected UMBRA handlers changed storage");
    assert.equal(guards.shopAfter, guards.shopBefore, name + ": rejected handlers changed in-memory shop");
    assert.equal(guards.coinsAfter, guards.coinsBefore);
    assert.deepEqual(guards.mutations, [], name + ": rejected handlers attempted persistence");

    record.continueSortieResult = await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").continueSortieFromHub());
    assert.equal(record.continueSortieResult, true);
    await page.waitForFunction(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return scene.gameplayRuntimeCreated && !scene.shopActive && scene.levelUpActive && scene.hudSkillSlots?.length === 5;
    }, null, { timeout: 90000 });
    record.sortie = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      scene.updateHud();
      return {
        runMech: scene.getRunPlayerMechId(),
        playerTexture: scene.playerSprite?.texture?.key,
        slots: scene.getPlayerSkillSlotIds(),
        ownedSkillIds: Object.keys(scene.playerSkills),
        skills: scene.getOrderedSkillStates().map(skill => ({ id: skill.id, stage: skill.currentStage?.stage, behavior: skill.definition?.behavior })),
        hud: scene.hudSkillSlots.map(slot => ({ label: slot.label.text, icon: slot.icon.texture.key, visible: slot.icon.visible, alpha: slot.icon.alpha })),
        compactHud: scene.hudCompact.skillChips.map(chip => ({ text: chip.text.text, visible: chip.text.visible })),
        hudTitle: scene.hudObjectiveText?.text,
        levelUpActive: scene.levelUpActive,
        openingBoostActive: scene.isOpeningBoostDraftActive(),
        openingSelectionsRemaining: scene.startingUpgradeSelectionsRemaining,
        worldPaused: scene.physics.world.isPaused,
        survivalTime: scene.survivalTime,
        persistedMechs: scene.shopState.playerMechs,
        currentStorage: window.__normalAudit.snapshot()
      };
    });
    assert.equal(record.sortie.runMech, mechId);
    assert.deepEqual(record.sortie.slots, expected[mechId]);
    assert.deepEqual(record.sortie.ownedSkillIds, [expected[mechId][0]]);
    assert.equal(record.sortie.skills[0].stage, 1);
    assert.deepEqual(record.sortie.hud.slice(0, 3).map(slot => slot.label), ["Lv.1", "LOCK", "LOCK"]);
    assert.deepEqual(record.sortie.compactHud.slice(0, 3).map(chip => chip.text), [mechId === "regaliaBastion" ? "REG S1" : "ORB S1", "TND --", "RBT --"]);
    assert.equal(record.sortie.compactHud.slice(0, 3).every(chip => chip.visible), true);
    assert.equal(record.sortie.openingBoostActive, true);
    assert.equal(record.sortie.openingSelectionsRemaining, 3);
    assert.equal(record.sortie.worldPaused, true);
    assert.equal(record.sortie.survivalTime, 0);
    assert.ok(!record.sortie.persistedMechs.ownedIds.includes("umbraSeraph"));
    assert.notEqual(record.sortie.persistedMechs.selectedId, "umbraSeraph");
    if (takeHudScreenshot) {
      // Hide only the blocking overlay's visuals for the screenshot. The genuine
      // Opening Boost state remains active and its physics pause is preserved.
      await page.evaluate(() => {
        const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        scene.overlayBackdrop.setVisible(false);
        scene.overlayContainer.setVisible(false);
        scene.physics.world.pause();
        scene.updateHud();
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: path.join(output, takeHudScreenshot) });
      record.screenshot = takeHudScreenshot;
      record.screenshotNote = "Opening Boost visuals hidden only; draft active, physics paused, no progression applied";
    }
    record.umbraRequests = record.requests.filter(request => /umbra(?:Preview|Drive)|KGK-02_UMBRA_SERAPH/i.test(decodeURIComponent(request.url)));
    assert.deepEqual(record.umbraRequests, [], name + ": normal flow loaded preview modules or UMBRA images");
    assert.deepEqual(record.pageErrors, [], name + ": browser exception");
    record.passed = true;
  } catch (error) {
    record.failure = error.stack;
    await page.screenshot({ path: path.join(output, "normal-failure-" + name + ".png") }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

async function runPreviewReturnCase() {
  // No addInitScript fixture is installed: navigation cannot erase or overwrite
  // any carryover before the normal page is inspected.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: "block" });
  const record = { name: "preview-return-same-context-no-fixture", requests: [], blockedExternal: [], pageErrors: [], consoleErrors: [], fixture: "none" };
  report.cases.push(record);
  let phase = "preview";
  await context.route("**/*", async route => {
    const url = route.request().url();
    if (new URL(url).origin !== new URL(base).origin) { record.blockedExternal.push({ phase, url }); return route.abort(); }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("request", request => record.requests.push({ phase, url: request.url(), type: request.resourceType() }));
  page.on("pageerror", error => record.pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") record.consoleErrors.push({ phase, message: message.text() }); });
  try {
    await page.goto(base + "/?umbraPreview=1", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene("UmbraPhase1Assets")?.status?.finished, null, { timeout: 30000 });
    record.preview = await page.evaluate(() => {
      const snapshot = () => ({ local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])) });
      const before = snapshot();
      const scene = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase1Preview");
      const ownedBefore = [...scene.owned];
      scene.selectEffect("umbraBloodSpike"); scene.toggleOwned();
      scene.selectEffect("umbraPhantomNova"); scene.toggleOwned();
      scene.selectPose("upLeft", "boost"); scene.stepFrame(6);
      return { before, after: snapshot(), ownedBefore, ownedAfter: [...scene.owned], effect: scene.effectId, frameIndex: scene.frameIndex };
    });
    assert.deepEqual(record.preview.before, { local: {}, session: {} });
    assert.deepEqual(record.preview.after, record.preview.before);
    assert.deepEqual(record.preview.ownedAfter, ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.isActive("UmbraPhase1Stopped"));
    const canvas = await page.locator("canvas").boundingBox();
    phase = "normal";
    await page.mouse.click(canvas.x + canvas.width * 815 / 1280, canvas.y + canvas.height * 430 / 720);
    await page.waitForURL(url => !url.searchParams.has("umbraPreview"), { timeout: 30000 });
    await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene")?.shopActive, null, { timeout: 60000 });
    record.normalHub = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return {
        url: window.location.href, selected: scene.getSelectedPlayerMechId(), runMech: scene.getRunPlayerMechId(),
        slots: scene.getPlayerSkillSlotIds(), owned: scene.shopState.playerMechs.ownedIds,
        selectedSaved: scene.shopState.playerMechs.selectedId,
        previewGlobalPresent: typeof window.umbraPreviewAssets !== "undefined" || typeof window.createUmbraPhase1Scenes !== "undefined",
        storage: { local: Object.fromEntries(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).map(key => [key, sessionStorage.getItem(key)])) }
      };
    });
    assert.equal(record.normalHub.selected, "defaultBear");
    assert.equal(record.normalHub.runMech, "defaultBear");
    assert.deepEqual(record.normalHub.owned, ["defaultBear"]);
    assert.equal(record.normalHub.selectedSaved, "defaultBear");
    assert.deepEqual(record.normalHub.slots, expected.defaultBear);
    assert.equal(record.normalHub.previewGlobalPresent, false);
    assert.equal(/umbra/i.test(JSON.stringify(record.normalHub.storage)), false);
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").continueSortieFromHub());
    await page.waitForFunction(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return scene.gameplayRuntimeCreated && !scene.shopActive && scene.levelUpActive;
    }, null, { timeout: 90000 });
    record.normalSortie = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return { runMech: scene.getRunPlayerMechId(), slots: scene.getPlayerSkillSlotIds(), ownedSkills: Object.keys(scene.playerSkills), openingBoostActive: scene.isOpeningBoostDraftActive(), worldPaused: scene.physics.world.isPaused };
    });
    assert.equal(record.normalSortie.runMech, "defaultBear");
    assert.deepEqual(record.normalSortie.ownedSkills, ["basicSkill"]);
    assert.deepEqual(record.normalSortie.slots, expected.defaultBear);
    record.normalUmbraRequests = record.requests.filter(request => request.phase === "normal" && /umbra(?:Preview|Drive)|KGK-02_UMBRA_SERAPH/i.test(decodeURIComponent(request.url)));
    assert.deepEqual(record.normalUmbraRequests, []);
    assert.deepEqual(record.blockedExternal.filter(request => request.phase === "preview"), []);
    assert.deepEqual(record.pageErrors, []);
    record.passed = true;
  } catch (error) {
    record.failure = error.stack;
    await page.screenshot({ path: path.join(output, "normal-failure-preview-return.png") }).catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
    await runCase("defaultBear", "", "defaultBear", "hud-default.png");
    await runCase("regaliaBastion", "&debugPlayerMech=regaliaBastion", "regaliaBastion", "hud-regalia-debug.png");
    await runCase("regalia-selected-through-hanger", "", "regaliaBastion", "hud-regalia.png", { ownedRegaliaFixture: true });
    await runCase("rejected-umbra-debug", "&debugPlayerMech=umbraSeraph&debugPlayerMechUnlock=1", "defaultBear", null);
    await runPreviewReturnCase();
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(output, "normal-report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(item => ({ name: item.name, passed: item.passed, externalAttemptsBlocked: item.blockedExternal.length, pageErrors: item.pageErrors, failure: item.failure })), report: path.join(output, "normal-report.json") }, null, 2));
  }
})();
