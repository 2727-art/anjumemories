"use strict";

const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw new Error("Fresh UMBRA_TEST_OUTPUT required");
const metadataContext = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(h.sourceRoot, "umbraPreviewAssets.js"), "utf8"), metadataContext);
const assets = metadataContext.window.umbraPreviewAssets;
const pose = assets.getPose("down", "idle"), moon = assets.effects.umbraMoonlight;
const missingImages = Object.values(assets.directions).flatMap(direction => Object.values(direction.poses)).concat(moon);
const relative = value => String(value).replace(/^\.\//, "");
const report = {
  createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
  harnessSha256: h.sha(fs.readFileSync(__filename)), bootstrapHarnessSha256: h.harnessSha256,
  observerSha256: h.sha(fs.readFileSync(path.join(__dirname, "umbra-integration-scene-observer.cjs"))),
  initializationHarnessSha256: h.sha(fs.readFileSync(path.join(__dirname, "umbra-integration-initialization-browser.cjs"))),
  methodology: "Serial functional normal-rAF asset tests, not performance or device-readability measurement. Actual DOM START, Phaser SORTIE PREP and initial real Opening overlay. HTTP 404/delayed loopback responses are the only asset fault source. Ordinary combat/HP/Stage/clock/physics are not substituted. Delayed-load return is an explicitly labelled lifecycle boundary, and captured original load completion closures are replayed only after their run has ended to test rejection. Native Storage/API and external networking remain denied by the shared harness; vendor Storage existence probes are reported separately. Resource Timing bytes are browser observations, not disk-size or GPU-cost estimates. Legacy Preview/Drive cases do not execute the normal game page or claim natural progression. HUD/card bounds and actual hardware readability are covered separately by the lifecycle/UI harness.",
  cases: [], errors: []
};

async function snapshot(page) {
  return page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, scene = game?.scene?.getScene("survival-scene"), env = window.__UMBRA_INTEGRATION_ENVIRONMENT__;
    const context = scene?.umbraRunContext, owner = scene?.umbraNormalPresentation;
    return { environment: env?.snapshot() || null, state: window.__NORMAL_SCENE_OBSERVER__?.snapshot() || null,
      normal: scene ? { shopActive: scene.shopActive, pendingSortie: scene.pendingSortieFromHub, gameplayRuntimeCreated: scene.gameplayRuntimeCreated,
        runId: context?.runId || null, contextState: context?.state || null, current: context ? scene.isUmbraRunContextCurrent(context) : false,
        bodyExists: Boolean(scene.playerHitbox?.active && scene.playerHitbox?.body?.enable),
        fallbackVisible: owner?.fallback?.visible ?? null, playerSpriteVisible: scene.playerSprite?.visible ?? null,
        currentPose: scene.umbraNormalPose || null, playerTextureKey: scene.playerSprite?.texture?.key || null,
        presentationOwner: Boolean(owner), presentationRunId: owner?.context?.runId || null,
        fxMode: owner?.fx?.fxMode || null, assetRecords: scene.getUmbraPresentationAssetState?.() || [],
        assets: Object.fromEntries(Object.values(window.umbraPreviewAssets?.effects || {}).map(asset => [asset.key, scene.textures.exists(asset.key)])),
        coreOwners: [scene.umbraMoonlightRuntime, scene.umbraBloodSpikeRuntime, scene.umbraPhantomNovaRuntime].map(Boolean),
        physicalRadius: scene.playerHitbox?.body?.radius ?? null, shopStatus: scene.shopStatusMessage || "" } : null,
      resourceTiming: performance.getEntriesByType("resource").filter(entry => /KGK-02_UMBRA_SERAPH|umbraPresentation|umbraPreviewAssets/.test(decodeURIComponent(entry.name))).map(entry => ({
        name: decodeURIComponent(entry.name), startTime: entry.startTime, duration: entry.duration,
        transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize, initiatorType: entry.initiatorType })),
      retry: { visible: Boolean(document.getElementById("umbra-integration-asset-retry") && !document.getElementById("umbra-integration-asset-retry").hidden),
        text: document.getElementById("umbra-integration-asset-retry")?.textContent || "" } };
  });
}

async function readNarrowPresentation(page) {
  return page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("survival-scene"), camera = s.worldCamera || s.cameras.main;
    const rect = game.canvas.getBoundingClientRect(), viewport = { width: innerWidth, height: innerHeight };
    const canvas = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const contains = (outer, inner, epsilon = 1) => inner.x >= outer.x - epsilon && inner.y >= outer.y - epsilon
      && inner.x + inner.width <= outer.x + outer.width + epsilon && inner.y + inner.height <= outer.y + outer.height + epsilon;
    const uiBounds = object => {
      const b = object.getBounds(), vertices = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => camera.matrix.transformPoint(x, y, {}))
        .map(p => ({ x: rect.x + p.x * rect.width / game.config.width, y: rect.y + p.y * rect.height / game.config.height }));
      const x = Math.min(...vertices.map(p => p.x)), y = Math.min(...vertices.map(p => p.y));
      return { x, y, width: Math.max(...vertices.map(p => p.x)) - x, height: Math.max(...vertices.map(p => p.y)) - y };
    };
    const viewRect = { x: 0, y: 0, ...viewport };
    const text = object => {
      const matrix = object.getWorldTransformMatrix(), bounds = uiBounds(object), font = parseFloat(object.style?.fontSize) || 0;
      return { text: object.text, bounds, fontSize: object.style?.fontSize, lines: object.getWrappedText?.(object.text).length || 0,
        cssFontHeightPx: font * Math.hypot(matrix.c, matrix.d) * camera.zoom * rect.height / game.config.height,
        inViewport: contains(viewRect, bounds), inCanvas: contains(canvas, bounds) };
    };
    const visitText = object => { const values = []; for (const child of object?.list || []) {
      if (child.active !== false && child.visible !== false && child.type === "Text") values.push(text(child));
      if (child.active !== false && child.visible !== false && child.list) values.push(...visitText(child));
    } return values; };
    const cards = (s.levelUpCardRecords || []).map(record => {
      // Graphics has no getBounds in this Phaser build; the production input
      // Zone has exactly the drawn card rectangle and shares its transform.
      const bounds = uiBounds(record.hitZone), texts = visitText(record.container);
      return { title: record.model.title, bounds, inViewport: contains(viewRect, bounds), inCanvas: contains(canvas, bounds), texts,
        outOfCard: texts.filter(value => !contains(bounds, value.bounds)), intersections: texts.flatMap((a, index) => texts.slice(index + 1)
          .filter(b => Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) > Math.max(a.bounds.x, b.bounds.x) + 0.5
            && Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) > Math.max(a.bounds.y, b.bounds.y) + 0.5)
          .map(b => ({ first: a.text, second: b.text }))) };
    });
    const overlay = s.overlayContainer?.visible ? { bounds: uiBounds(s.overlayPanel), title: text(s.overlayTitle), subtitle: text(s.overlayBody) } : null;
    const build = s.hudDetailLayer?.buildText;
    const detail = build?.visible ? { ...text(build), configuredPanel: s.hudDetailLayer.panels.build } : null;
    const allTexts = cards.flatMap(card => card.texts).concat(overlay ? [overlay.title, overlay.subtitle] : [], detail ? [detail] : []);
    return { viewport, canvas, canvasInViewport: contains(viewRect, canvas), mode: s.standardHudMode,
      actualNormalScene: s.constructor.name === "SurvivalScene", worldCameraZoom: camera.zoom,
      coordinateMethod: "UI getBounds includes parent transform; apply current camera.matrix (UI effective scrollFactor0) then actual canvas CSS dimensions",
      overlay, overlayInViewport: !overlay || contains(viewRect, overlay.bounds), cards, detail,
      compactChipModels: s.getCompactHudSkillChipModels().map(chip => ({ ...chip })),
      compactChipLabels: s.getCompactHudSkillChipModels().map(chip => chip.text),
      smallestObservedCssFontHeightPx: allTexts.length ? Math.min(...allTexts.map(value => value.cssFontHeightPx)) : null,
      readabilityNote: "Bounds and computed CSS font size only; readable on an actual phone is not established. Small text is retained as observed, with no test-only scale or UI redesign." };
  });
}

async function setup(browser, name, fixture = "baseline") {
  const r = await h.open(browser, name, { path: `/umbra-integration.html?fixture=${fixture}` });
  await ui.waitHub(r.page);
  await r.page.evaluate(installSceneObserver);
  return r;
}

// Page routes precede the frozen-source context route. Passing responses call
// fallback(), so they are still served and audited by the original harness.
async function faultRoute(r, paths, kind = "missing") {
  const selected = new Set(paths.map(relative)), controller = { enabled: true, held: [], requests: [] };
  await r.page.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url()), pathname = decodeURIComponent(url.pathname).replace(/^\//, "");
    if (url.origin !== h.base || !selected.has(pathname) || !controller.enabled) return route.fallback();
    const entry = { path: pathname, kind, at: new Date().toISOString(), resourceType: req.resourceType(), status: "intercepted" };
    controller.requests.push(entry);
    r.record.requests.push({ path: pathname, type: req.resourceType(), method: req.method(), injected: kind });
    if (kind === "missing") {
      entry.status = 404;
      return route.fulfill({ status: 404, contentType: "text/plain", body: "Intentional integration asset 404" });
    }
    await new Promise(resolve => controller.held.push(resolve));
    entry.status = "released";
    try { await route.fallback(); } catch (error) { entry.status = "request-cancelled-after-release"; entry.error = String(error); }
  });
  controller.release = () => { controller.enabled = false; controller.held.splice(0).forEach(resolve => resolve()); };
  return controller;
}

async function finish(r, c, check) {
  if (!r) return;
  c.beforeTeardown = await snapshot(r.page).catch(error => ({ error: String(error) }));
  await r.page.evaluate(() => {
    window.__NORMAL_SCENE_OBSERVER__?.cleanup();
    window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("ASSET_TEST_END");
  }).catch(error => c.teardownError = String(error));
  if (c.beforeTeardown.environment) await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed, null, { timeout: 15000 })
    .catch(error => check(false, "environment finishes normal cleanup", String(error)));
  c.context = await h.audit(r);
  c.afterTeardownEnvironment = await r.page.evaluate(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot() || null).catch(() => null);
  check(c.context.isolationPassed, "native Storage data 0 / nonvendor probes 0 / external API and requests 0", {
    native: c.context.audit.nativeStorage, nonVendorProbes: c.context.nonVendorStorageProbes,
    APIs: c.context.audit.networkApis, external: c.context.blockedExternal });
  check(c.context.pageErrors.length === 0, "no uncaught page errors", c.context.pageErrors);
  await r.context.close();
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(path.join(out, "harness"), { recursive: true });
  for (const name of ["umbra-integration-assets-browser.cjs", "umbra-integration-browser-harness.cjs",
    "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs"])
    fs.copyFileSync(path.join(__dirname, name), path.join(out, "harness", name), fs.constants.COPYFILE_EXCL);
  const only = process.env.UMBRA_TEST_CASES?.split(",");
  const browser = await h.launch(); report.browserVersion = browser.version();
  async function run(name, fn) {
    if (only && !only.includes(name)) return;
    const c = { name, checks: [] }; report.cases.push(c);
    const check = (passed, label, actual = null) => { c.checks.push({ passed: Boolean(passed), label, actual }); if (!passed) throw Error(`Failfast: ${label}`); };
    let r, fault;
    try { await fn(c, check, value => { r = value; }, value => { fault = value; }); }
    catch (error) {
      c.error = error.stack; c.checks.push({ passed: false, label: "case completes", actual: error.stack });
      if (r) await r.page.screenshot({ path: path.join(out, `${name}-failure.png`), fullPage: true }).catch(() => {});
    } finally {
      fault?.release(); if (fault) c.faultRequests = fault.requests;
      try { await finish(r, c, (p, label, actual) => c.checks.push({ passed: Boolean(p), label, actual })); }
      catch (error) { c.checks.push({ passed: false, label: "audit/teardown completes", actual: error.stack }); await r?.context.close().catch(() => {}); }
      c.passed = c.checks.length > 0 && c.checks.every(check => check.passed);
      fs.writeFileSync(path.join(out, `${name}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
      console.log(JSON.stringify({ name, passed: c.passed, failed: c.checks.filter(check => !check.passed) }));
    }
  }
  try {
    await run("images-missing-fallback-retry", async (c, check, setRun, setFault) => {
      const r = await setup(browser, c.name); setRun(r);
      const faults = await faultRoute(r, missingImages.map(asset => asset.path)); setFault(faults);
      c.imageFaultScope = "All 24 poses plus MOONLIGHT; card/pointer-facing changes cannot silently select a different available pose. No skill image or pose metadata is changed.";
      c.sortie = await ui.clickPhaserText(r.page, "SORTIE PREP");
      await ui.enabledCards(r.page); c.failed = await snapshot(r.page);
      const failedKeys = c.failed.normal.assetRecords.filter(record => record.status === "failed").map(record => record.key);
      check(missingImages.every(asset => failedKeys.includes(asset.key)), "25 image failures are explicit asset-key failures", failedKeys);
      check(c.failed.normal.contextState === "BOUND" && c.failed.normal.physicalRadius === 22 && c.failed.normal.coreOwners[0], "missing images retain actual bound Moon runtime and radius22");
      check(c.failed.normal.presentationOwner, "missing image still creates its dedicated presentation owner");
      check(c.failed.retry.visible && /再読込/.test(c.failed.retry.text), "explicit image retry is available");
      c.openingSelections = [];
      for (let n = 0; n < 3; n++) {
        const cards = await ui.enabledCards(r.page), index = cards.cards.findIndex(card => card.type === "passive");
        check(index >= 0, "actual Opening contains a legal passive choice");
        c.openingSelections.push(await ui.chooseCard(r.page, index));
      }
      await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state === "ACTIVE", null, { timeout: 15000 });
      await r.page.waitForFunction(() => window.__NORMAL_SCENE_OBSERVER__.snapshot().physicsSteps > 0, null, { timeout: 10000 });
      c.activeMissing = await snapshot(r.page);
      check(c.activeMissing.normal.fallbackVisible && !c.activeMissing.normal.playerSpriteVisible, "active missing current pose uses Graphics instead of another mech image", c.activeMissing.normal);
      c.beforeDuplicateRequests = faults.requests.length;
      c.duplicateCalls = await r.page.evaluate(async () => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), before = s.getUmbraPresentationAssetState();
        for (let n = 0; n < 4; n++) await s.requestUmbraSkillPresentationAssets("umbraMoonlight");
        return { before, after: s.getUmbraPresentationAssetState(), source: "explicit duplicate display request; no card or growth mutation" };
      });
      check(faults.requests.length === c.beforeDuplicateRequests, "repeated failed-key requests do not automatically retry");
      faults.enabled = false;
      await r.page.locator("#umbra-integration-asset-retry").click();
      await r.page.waitForFunction(keys => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), records = s.getUmbraPresentationAssetState();
        return keys.every(key => records.find(record => record.key === key)?.status === "ready");
      }, missingImages.map(asset => asset.key), { timeout: 30000 });
      await r.page.waitForFunction(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        return s.playerSprite?.visible && !s.umbraNormalPresentation?.fallback?.visible;
      }, null, { timeout: 10000 });
      c.retried = await snapshot(r.page);
      check(c.retried.normal.runId === c.failed.normal.runId && c.retried.state.currentBodyIdentity === c.failed.state.currentBodyIdentity, "image retry preserves current run and body identity");
      check(c.retried.normal.assetRecords.filter(record => missingImages.some(asset => asset.key === record.key)).every(record => record.attempts === 2), "each of 25 failed images has exactly one explicit retry");
      check(c.retried.state.opening === c.activeMissing.state.opening && c.retried.state.skills.umbraMoonlight.identity === c.activeMissing.state.skills.umbraMoonlight.identity, "retry adds no card budget or skill replacement");
      check(!c.retried.retry.visible, "retry control hides when all requests are ready");
      await r.page.screenshot({ path: path.join(out, `${c.name}.png`), fullPage: true });
    });

    await run("code-missing-explicit-new-entry", async (c, check, setRun, setFault) => {
      let r = await setup(browser, c.name); setRun(r);
      const faults = await faultRoute(r, ["umbraPresentation.js"]); setFault(faults);
      c.beforeCodeFailure = await snapshot(r.page);
      await ui.clickPhaserText(r.page, "SORTIE PREP");
      await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed, null, { timeout: 30000 });
      c.failed = await r.page.evaluate(() => {
        const scene = window.__SURVIVAL_GAME__?.scene?.getScene?.("survival-scene");
        return { environment: window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot(),
        sceneReferenceRemaining: Boolean(scene), sceneActive: scene?.sys?.isActive?.() === true,
        sceneStatus: scene?.sys?.settings?.status ?? null,
        liveBody: Boolean(scene?.playerHitbox?.active && scene?.playerHitbox?.body?.enable),
        livePresentation: Boolean(scene?.umbraNormalPresentation && !scene.umbraNormalPresentation.destroyed),
        runState: scene?.umbraRunContext?.state || null,
        startDisabled: document.getElementById("umbra-integration-start")?.disabled,
        location: location.href }; });
      check(c.failed.environment.endReason === "REQUIRED_CODE_MISSING" && c.failed.environment.closed,
        "required presentation script failure closes its entire test session", c.failed.environment);
      check(Object.values(c.failed.environment.ram).every(area => Object.keys(area).length === 0) && !c.failed.sceneActive && !c.failed.liveBody && !c.failed.livePresentation,
        "code failure stops the Scene/body/presentation and clears both RAM stores; disposed references may remain", c.failed);
      check(c.failed.startDisabled && c.failed.location.endsWith("/umbra-integration.html?fixture=baseline"),
        "closed entry cannot restart automatically or navigate to normal play");
      check(c.failed.environment.records.some(record => record.type === "required-code-failed" && /umbraPresentation\.js$/.test(record.detail?.path)),
        "failure audit identifies the exact required presentation script");
      check(faults.requests.length === 1, "failed code did not retry automatically");
      c.failedSession = {};
      await finish(r, c.failedSession, check); setRun(null);
      // Explicitly open a fresh entry and browser context. The closed environment
      // is immutable and is never revived or replaced in its original window.
      r = await setup(browser, `${c.name}-explicit-reopen`); setRun(r);
      await ui.clickPhaserText(r.page, "SORTIE PREP"); await ui.enabledCards(r.page); c.newRun = await snapshot(r.page);
      check(c.newRun.environment.id !== c.failed.environment.id && !c.newRun.environment.closed && c.newRun.normal.contextState === "BOUND",
        "explicit fresh entry and actual START/SORTIE bind a new environment and run");
      check(c.newRun.normal.coreOwners[0] && c.newRun.normal.assetRecords.find(record => record.key === "code:./umbraPresentation.js")?.status === "ready", "new run uses required ready presentation module and Moon owner");
      c.narrowSource = "fresh browser context and explicit reopened entry after failed-code session destruction; normal START/SORTIE, all requested images ready";
      await r.page.setViewportSize({ width: 844, height: 390 });
      await r.page.waitForTimeout(200);
      c.narrowOpening = await readNarrowPresentation(r.page);
      check(c.narrowOpening.canvasInViewport && c.narrowOpening.overlayInViewport && c.narrowOpening.cards.every(card => card.inViewport && card.inCanvas && card.outOfCard.length === 0),
        "844x390 actual resize: canvas, Opening overlay and card Text are contained", c.narrowOpening);
      check(c.narrowOpening.cards.every(card => card.intersections.length === 0), "narrow Opening card Text do not intersect", c.narrowOpening.cards.map(card => card.intersections));
      await r.page.screenshot({ path: path.join(out, "narrow-opening-844x390.png"), fullPage: true });
      c.openingSelections = [];
      for (let n = 0; n < 3; n++) {
        const cards = await ui.enabledCards(r.page), index = cards.cards.findIndex(card => card.type === "passive");
        check(index >= 0, "actual Opening contains a legal passive choice");
        c.openingSelections.push(await ui.chooseCard(r.page, index));
      }
      await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state === "ACTIVE", null, { timeout: 15000 });
      c.narrowCompact = await readNarrowPresentation(r.page);
      check(c.narrowCompact.mode === "compact" && c.narrowCompact.canvasInViewport, "narrow run keeps default compact HUD within actual viewport");
      await r.page.screenshot({ path: path.join(out, "narrow-compact-844x390.png"), fullPage: true });
      await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").canToggleStandardHudMode(), null, { timeout: 10000 });
      await r.page.keyboard.press("h", { delay: 120 });
      await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").standardHudMode === "detail", null, { timeout: 10000 });
      c.narrowDetail = await readNarrowPresentation(r.page);
      check(c.narrowDetail.canvasInViewport && c.narrowDetail.detail?.inViewport && /TRIAD C:/.test(c.narrowDetail.detail.text), "actual H key opens contained dedicated detail HUD with both TRIAD axes", c.narrowDetail);
      await r.page.screenshot({ path: path.join(out, "narrow-detail-844x390.png"), fullPage: true });
      await r.page.keyboard.press("h", { delay: 120 });
      await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").standardHudMode === "compact", null, { timeout: 10000 });
      c.narrowReturnedCompact = await readNarrowPresentation(r.page);
      check(JSON.stringify(c.narrowReturnedCompact.compactChipLabels) === JSON.stringify(c.narrowCompact.compactChipLabels), "H returns to compact with the same skill labels");
      await r.page.setViewportSize({ width: 1280, height: 800 });
      await r.page.waitForTimeout(100);

    });

    await run("delayed-pose-return-old-callback", async (c, check, setRun, setFault) => {
      const r = await setup(browser, c.name); setRun(r);
      const faults = await faultRoute(r, [pose.path], "delay"); setFault(faults);
      await ui.clickPhaserText(r.page, "SORTIE PREP");
      await r.page.waitForFunction(key => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        return s.getUmbraPresentationAssetState().some(record => record.key === key && record.status === "loading");
      }, pose.key, { timeout: 20000 });
      c.loading = await snapshot(r.page);
      c.sharedLoading = await r.page.evaluate(key => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), asset = window.umbraPreviewAssets.getPose("down", "idle");
        const first = s.requestUmbraPresentationAsset(asset, s.umbraRunContext), second = s.requestUmbraPresentationAsset(asset, s.umbraRunContext);
        return { samePromise: first === second, attempts: s.getUmbraPresentationAssetState().find(record => record.key === key)?.attempts };
      }, pose.key);
      check(c.sharedLoading.samePromise && c.sharedLoading.attempts === 1, "real in-flight duplicate display requests share one asset promise", c.sharedLoading);
      c.savedCallback = await r.page.evaluate(key => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), pending = s.onDemandAssetLoads.get(`image:${key}`);
        window.__OLD_UMBRA_ASSET_CALLBACK_TEST__ = { context: s.umbraRunContext, completed: [...pending.completeCallbacks], failed: [...pending.errorCallbacks] };
        s.runEnvironmentIO.record("explicit-test-load-return", { method: "returnUmbraIntegrationToHub", from: "PREPARED image loading", natural: false });
        const returned = s.returnUmbraIntegrationToHub("遅延load中の明示帰還試験");
        return { returned, completeCallbacks: pending.completeCallbacks.length, errorCallbacks: pending.errorCallbacks.length };
      }, pose.key);
      check(c.savedCallback.returned && c.savedCallback.completeCallbacks > 0, "captured original callbacks before explicit same-session HUB return", c.savedCallback);
      await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.shopActive && !s.restartInProgress; }, null, { timeout: 30000 });
      c.returned = await snapshot(r.page);
      c.replayed = await r.page.evaluate(() => {
        const saved = window.__OLD_UMBRA_ASSET_CALLBACK_TEST__, s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        const before = { body: !!s.playerHitbox?.active, runtime: !!s.umbraMoonlightRuntime, owner: !!s.umbraNormalPresentation, pending: s.pendingSortieFromHub };
        saved.completed.forEach(callback => callback()); saved.failed.forEach(callback => callback({ error: "expired callback diagnostic" }));
        return { oldContextState: saved.context.state, oldCurrent: s.isUmbraRunContextCurrent(saved.context), before,
          after: { body: !!s.playerHitbox?.active, runtime: !!s.umbraMoonlightRuntime, owner: !!s.umbraNormalPresentation, pending: s.pendingSortieFromHub } };
      });
      faults.release(); await r.page.waitForTimeout(250);
      c.afterRelease = await snapshot(r.page);
      check(c.replayed.oldContextState === "ENDED" && !c.replayed.oldCurrent, "old loader consumer is expired after HUB return");
      check(JSON.stringify(c.replayed.before) === JSON.stringify(c.replayed.after) && !c.afterRelease.normal.bodyExists && !c.afterRelease.normal.presentationOwner, "late original closure and response cannot create old body/runtime/FX or change pending launch", c.replayed);
      check(c.afterRelease.environment.id === c.loading.environment.id, "boundary return preserved the same RAM environment");
      check(c.afterRelease.environment.records.some(record => record.type === "presentation-image-result" && record.detail?.staleConsumer === true), "actual image completion records an expired consumer", c.afterRelease.environment.records.filter(record => record.type === "presentation-image-result" && record.detail?.staleConsumer));
      await ui.clickPhaserText(r.page, "SORTIE PREP"); await ui.enabledCards(r.page); c.nextRun = await snapshot(r.page);
      check(c.nextRun.normal.runId !== c.loading.normal.runId && c.nextRun.normal.contextState === "BOUND" && c.nextRun.normal.presentationOwner,
        "new same-session sortie can load the formerly delayed key and bind a fresh owner");
      c.replayedDuringNewRun = await r.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), saved = window.__OLD_UMBRA_ASSET_CALLBACK_TEST__;
        const context = s.umbraRunContext, body = s.playerHitbox.body, owner = s.umbraNormalPresentation, runtime = s.umbraMoonlightRuntime;
        saved.completed.forEach(callback => callback()); saved.failed.forEach(callback => callback({ error: "expired replay after new run" }));
        return { contextSame: context === s.umbraRunContext, bodySame: body === s.playerHitbox.body,
          presentationSame: owner === s.umbraNormalPresentation, runtimeSame: runtime === s.umbraMoonlightRuntime, oldCurrent: s.isUmbraRunContextCurrent(saved.context) };
      });
      check(Object.entries(c.replayedDuringNewRun).every(([key, value]) => key === "oldCurrent" ? !value : value),
        "old completion cannot replace the new run body, runtime or presentation", c.replayedDuringNewRun);
      await r.page.evaluate(() => { delete window.__OLD_UMBRA_ASSET_CALLBACK_TEST__; });
    });

    for (const fixture of ["standard", "regalia"]) await run(`${fixture}-no-umbra-load`, async (c, check, setRun) => {
      const r = await setup(browser, c.name, fixture); setRun(r);
      await ui.clickPhaserText(r.page, "SORTIE PREP"); await ui.enabledCards(r.page); c.opening = await snapshot(r.page);
      const unwanted = r.record.requests.filter(request => /KGK-02_UMBRA_SERAPH|umbraPreviewAssets|umbraPresentation|umbraDrive|umbraMoonlightArena/.test(request.path));
      check(unwanted.length === 0, "released mech HUB and actual Opening request no UMBRA 27 images or dedicated modules", unwanted);
      check(c.opening.normal.contextState === null && !c.opening.normal.presentationOwner && c.opening.normal.coreOwners.every(value => !value), "released mech keeps its original run/presentation route");
      check(c.opening.state.runMechId === (fixture === "standard" ? "defaultBear" : "regaliaBastion"), "actual captured legacy mech matches fixture");
    });

    for (const legacy of [
      { name: "legacy-preview-flag", query: "?umbraPreview=1", key: "UmbraPhase1Preview" },
      { name: "legacy-drive-equipment-flags", query: "?umbraPreview=1&umbraDrive=1&umbraGrowth=1&umbraCore=1&umbraFinal=1&umbraTriad=1&umbraEquipment=1", key: "UmbraPhase2ADrive" }
    ]) await run(legacy.name, async (c, check, setRun) => {
      const r = await h.open(browser, c.name, { path: `/${legacy.query}` }); setRun(r);
      await r.page.waitForFunction(key => window.__SURVIVAL_GAME__?.scene?.getScene(key)?.sys?.isActive(), legacy.key, { timeout: 60000 });
      c.legacy = await r.page.evaluate(key => {
        const game = window.__SURVIVAL_GAME__, s = game.scene.getScene(key);
        return { sceneKey: s.sys.settings.key, actualClass: s.constructor.name, integrationEnvironment: !!window.__UMBRA_INTEGRATION_ENVIRONMENT__,
          normalContext: !!s.umbraRunContext, verificationContext: s.verificationContext ? { kind: s.verificationContext.kind, growthEnabled: s.verificationContext.growthEnabled,
            coreEnabled: s.verificationContext.coreEnabled, finalEnabled: s.verificationContext.finalEnabled, triadEnabled: s.verificationContext.triadEnabled, equipmentEnabled: s.verificationContext.equipmentEnabled } : null,
          arena: !!s.moonlightArena, sharedPresentation: !!window.umbraPresentation,
          skills: Object.keys(s.playerSkills || {}), normalScene: game.scene.scenes.some(scene => scene.sys.settings.key === "survival-scene" && scene.sys.isActive()) };
      }, legacy.key);
      check(c.legacy.sceneKey === legacy.key && !c.legacy.integrationEnvironment && !c.legacy.normalContext && !c.legacy.normalScene, "old URL remains isolated from new normal environment", c.legacy);
      if (legacy.key === "UmbraPhase2ADrive") check(c.legacy.arena && c.legacy.sharedPresentation && ["growthEnabled", "coreEnabled", "finalEnabled", "triadEnabled", "equipmentEnabled"].every(key => c.legacy.verificationContext?.[key] === true), "legacy full-equipment flags retain their original bounded Arena context");
    });
  } catch (error) { report.errors.push(error.stack); }
  finally {
    await browser.close();
    report.passed = report.errors.length === 0 && report.cases.length > 0 && report.cases.every(c => c.passed);
    fs.writeFileSync(path.join(out, "integration-assets.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, checks: report.cases.reduce((sum, c) => sum + c.checks.length, 0), errors: report.errors }));
    if (!report.passed) process.exitCode = 1;
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { main, snapshot };
