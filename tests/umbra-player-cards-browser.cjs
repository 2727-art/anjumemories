"use strict";
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs"), ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw new Error("Fresh UMBRA_TEST_OUTPUT required");
const report = { createdAt: new Date().toISOString(), sources: h.sources, sourceRoot: h.sourceRoot,
  harnessSha256: h.sha(fs.readFileSync(__filename)), cases: [],
  methodology: "Serial actual SurvivalScene UI, normal rAF. Actual START/SORTIE/Opening, then the existing explicit complete boundary and normal Core/Final/OVL cards. No combat, HP, input candidates, clock or physics substitution. Gamepad input uses an explicitly synthetic navigator.getGamepads device through the original Phaser/game polling and overlay action path; physical-controller readability is not claimed. CSS font sizes and Text intersection bounds include real camera and canvas transforms. Screenshots and model JSON are taken outside performance measurement. Existing strict native-Storage and external-network audit runs before/after each session." };
function initPad() {
  const pad = window.__PLAYER_CARD_TEST_PAD__ = { id: "Explicit synthetic UI pad", index: 0, connected: true, mapping: "standard", timestamp: 0,
    axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
}
async function pad(page, index) {
  await page.evaluate(i => { const p = window.__PLAYER_CARD_TEST_PAD__; Object.assign(p.buttons[i], { pressed: true, touched: true, value: 1 }); p.timestamp = performance.now(); }, index);
  await page.waitForTimeout(90);
  const held = await page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), p = s.getActiveGamepad(); return { state: structuredClone(s.gamepadState), padKind: p.constructor.name, padButton0: p.buttons[0].value, rawButton0: window.__PLAYER_CARD_TEST_PAD__.buttons[0],
    focused: s.overlayActions.findIndex(a => a.panel === s.overlayFocusedPanel), detail: Boolean(s.umbraPlayerCardDetail) }; });
  await page.evaluate(i => { const p = window.__PLAYER_CARD_TEST_PAD__; Object.assign(p.buttons[i], { pressed: false, touched: false, value: 0 }); p.timestamp = performance.now(); }, index);
  await page.waitForTimeout(90);
  return held;
}
async function inspect(page) {
  return page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("survival-scene"), camera = s.worldCamera || s.cameras.main;
    const rect = game.canvas.getBoundingClientRect(), canvas = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    const contains = (a, b) => b.x >= a.x - 0.5 && b.y >= a.y - 0.5 && b.x + b.width <= a.x + a.width + 0.5 && b.y + b.height <= a.y + a.height + 0.5;
    const bounds = object => {
      const b = object.getBounds(), points = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]
        .map(([x, y]) => camera.matrix.transformPoint(x, y, {})).map(p => ({ x: rect.x + p.x * rect.width / game.config.width, y: rect.y + p.y * rect.height / game.config.height }));
      const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
      return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y };
    };
    const text = object => { const matrix = object.getWorldTransformMatrix(), font = parseFloat(object.style.fontSize); return { text: object.text,
      bounds: bounds(object), internalFontSize: font, cssFontPx: font * Math.hypot(matrix.c, matrix.d) * camera.zoom * rect.height / game.config.height,
      visible: object.visible, wrapped: object.getWrappedText(object.text), player: object.umbraPlayerText === true }; };
    const texts = container => (container?.list || []).flatMap(child => child.visible === false || child.active === false ? [] : child.type === "Text" ? [text(child)] : child.list ? texts(child) : []);
    const intersections = list => list.flatMap((a, i) => list.slice(i + 1).filter(b => Math.min(a.bounds.x + a.bounds.width, b.bounds.x + b.bounds.width) > Math.max(a.bounds.x, b.bounds.x) + 0.5 && Math.min(a.bounds.y + a.bounds.height, b.bounds.y + b.bounds.height) > Math.max(a.bounds.y, b.bounds.y) + 0.5).map(b => ({ first: a.text, second: b.text })));
    const cards = (s.levelUpCardRecords || []).map(record => {
      const b = bounds(record.hitZone), list = texts(record.container), view = record.model.umbraPlayerCard;
      return { index: record.index, model: { originalTitle: record.model.title, player: view, type: record.model.option.type, skillId: record.model.option.skillId,
        choiceId: record.model.option.choiceId, actionType: record.model.option.actionType }, bounds: b, texts: list,
        inCanvas: contains(canvas, b), outOfCard: list.filter(t => !contains(b, t.bounds)), intersections: intersections(list),
        bodyFonts: list.filter(t => t.text === view?.summary).map(t => t.cssFontPx) };
    });
    const detail = s.umbraPlayerCardDetail, detailTexts = detail ? texts(detail.container) : [];
    return { viewport: { width: innerWidth, height: innerHeight }, canvas, canvasInViewport: contains({ x: 0, y: 0, width: innerWidth, height: innerHeight }, canvas),
      measurement: { sceneFrame: s.sys.game.loop.frame, cameraId: camera.id, cameraName: camera.name, cameraZoom: camera.zoom,
        cameras: s.cameras.cameras.map(c => ({ id: c.id, name: c.name, zoom: c.zoom })), uiScale: { x: s.uiContainer?.scaleX, y: s.uiContainer?.scaleY },
        uiScrollFactor: { x: s.uiContainer?.scrollFactorX, y: s.uiContainer?.scrollFactorY }, uiCameraFilter: s.uiContainer?.cameraFilter,
        method: "getWorldTransformMatrix includes normal UI inverse-zoom compensation; then the single rendering camera matrix/zoom and actual canvas CSS dimensions are applied" },
      selectionMode: s.levelUpSelectionMode, cards, details: detail ? { page: detail.page, pages: detail.pages.length, texts: detailTexts,
        outOfCanvas: detailTexts.filter(t => !contains(canvas, t.bounds)), intersections: intersections(detailTexts), bodyFont: text(detail.body).cssFontPx } : null,
      paused: s.physics.world.isPaused, pending: s.pendingLevelUps, opening: s.startingUpgradeSelectionsRemaining,
      locked: s.levelUpSelectionLocked, runId: s.umbraRunContext?.runId, contextState: s.umbraRunContext?.state,
      clocks: [s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, s.umbraPhantomNovaRuntime].map(r => r?.combatTimeMs ?? null),
      novaReservations: (s.umbraPhantomNovaRuntime?.slots || []).map(slot => ({ slotId: slot.slotId, state: slot.state, cycleGeneration: slot.cycleGeneration, regenerateAtMs: slot.regenerateAtMs, deployedUntilMs: slot.deployedUntilMs })),
      pendingQueue: (s.skillMutationState?.pendingQueue || []).map(item => ({ skillId: item.skillId, phase: item.phase })),
      equipmentPending: s.getUmbraEquipmentSnapshot()?.currentSelection || null,
      controller: { enabled: s.isControllerInputEnabled(), available: s.gamepadState?.available },
      moonRuntime: s.getUmbraMoonlightEffectiveStats?.() };
  });
}
const invariant = value => JSON.stringify([value.pending, value.opening, value.locked, value.runId, value.clocks, value.novaReservations, value.pendingQueue, value.equipmentPending]);
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await h.launch(); report.browserVersion = browser.version();
  try {
    for (const size of [[1280, 800, "desktop", "current", false], [844, 390, "narrow", "wide", false], [844, 390, "touch", "current", true]]) {
      if (process.env.UMBRA_TEST_CASES && !process.env.UMBRA_TEST_CASES.split(",").includes(size[2])) continue;
      const c = { name: size[2], reach: size[3], checks: [], screens: [], views: [], selections: [] }; report.cases.push(c); let r;
      const check = (passed, label, value) => c.checks.push({ passed: !!passed, label, value });
      async function capture(name) {
        const v = await inspect(r.page); c.views.push({ name, ...v });
        if (v.details) {
          check(v.details.outOfCanvas.length === 0, `${name}: detail text in Canvas`, v.details.outOfCanvas);
          check(v.details.intersections.length === 0, `${name}: no detail Text overlap`, v.details.intersections);
          check(v.details.bodyFont >= 13.99, `${name}: detail body at least 14 CSS px`, v.details.bodyFont);
        } else for (const card of v.cards) {
          check(card.inCanvas && card.outOfCard.length === 0, `${name}/${card.index}: card/text in bounds`, { inCanvas: card.inCanvas, out: card.outOfCard });
          check(card.intersections.length === 0, `${name}/${card.index}: no Text overlap`, card.intersections);
          check(card.bodyFonts.length === 1 && card.bodyFonts[0] >= 13.99, `${name}/${card.index}: body at least 14 CSS px`, card.bodyFonts);
        }
        const image = `${size[2]}-${name}.png`; await r.page.screenshot({ path: path.join(out, image), fullPage: true }); c.screens.push(image); return v;
      }
      try {
        r = await h.open(size[4] ? { newContext: options => browser.newContext({ ...options, hasTouch: true }) } : browser, c.name, { path: `/umbra-integration.html?fixture=complete&moonReach=${size[3]}`, init: initPad });
        await r.page.setViewportSize({ width: size[0], height: size[1] });
        await ui.waitHub(r.page); await r.page.evaluate(installSceneObserver); await ui.clickPhaserText(r.page, "SORTIE PREP");
        await ui.enabledCards(r.page); const opening = await capture("opening");
        check(opening.canvasInViewport, "Canvas stays within viewport with TEST strip", opening.canvas);
        await r.page.keyboard.press("d"); await r.page.waitForTimeout(100); const detail = await capture("opening-details");
        check(!!detail.details && invariant(detail) === invariant(opening) && detail.paused, "D opens details without pending/clock/reservation change");
        await r.page.keyboard.press("1"); check(invariant(await inspect(r.page)) === invariant(opening), "numeric key inside details does not select");
        await r.page.keyboard.press("Escape"); check(!(await inspect(r.page)).details && invariant(await inspect(r.page)) === invariant(opening), "Escape closes details only");
        // Navigate through the existing overlay focus path to the detail button,
        // then use the original polled controller A and B buttons.
        await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); s.setOverlayFocusedAction(s.overlayActions.find(a => a.panel === s.levelUpCardRecords[0].detailButton)); });
        c.padA = await pad(r.page, 0); const viaPad = await inspect(r.page); check(!!viaPad.details && viaPad.controller.available, "synthetic polled pad A opens focused details", c.padA);
        c.padB = await pad(r.page, 1); check(!(await inspect(r.page)).details && invariant(await inspect(r.page)) === invariant(opening), "pad B closes details without selecting parent", c.padB);
        if (process.env.UMBRA_TEST_PAD_ONLY) continue;
        const targetPoint = async close => r.page.evaluate(close => {
          const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("survival-scene"), b = (close ? s.umbraPlayerCardDetail.closeButton : s.levelUpCardRecords[0].detailButton).getBounds(), rect = game.canvas.getBoundingClientRect();
          const p = (s.worldCamera || s.cameras.main).matrix.transformPoint(b.centerX, b.centerY, {});
          return { x: rect.x + p.x * rect.width / game.config.width, y: rect.y + p.y * rect.height / game.config.height };
        }, close);
        const buttonPoint = await targetPoint(false);
        await r.page.mouse.click(buttonPoint.x, buttonPoint.y); await r.page.waitForTimeout(90); const pointerDetail = await inspect(r.page);
        check(!!pointerDetail.details && invariant(pointerDetail) === invariant(opening), "actual pointer details button does not propagate into card selection", { before: invariant(opening), after: invariant(pointerDetail), detail: Boolean(pointerDetail.details), buttonPoint });
        if (pointerDetail.details) {
          const close = await targetPoint(true); await r.page.mouse.click(close.x, close.y); await r.page.waitForTimeout(90);
          const after = await inspect(r.page); check(!after.details && invariant(after) === invariant(opening), "pointer Back does not propagate into restored parent cards", { before: invariant(opening), after: invariant(after) });
        }
        if (size[4]) {
          const buttonPoint = await targetPoint(false); await r.page.touchscreen.tap(buttonPoint.x, buttonPoint.y); await r.page.waitForTimeout(90); const touchDetail = await inspect(r.page);
          check(!!touchDetail.details && invariant(touchDetail) === invariant(opening), "Chrome emulated touch opens details without selecting", { before: invariant(opening), after: invariant(touchDetail), detail: Boolean(touchDetail.details) });
          if (touchDetail.details) {
            const close = await targetPoint(true); await r.page.touchscreen.tap(close.x, close.y); await r.page.waitForTimeout(90);
            const after = await inspect(r.page); check(!after.details && invariant(after) === invariant(opening), "touch Back does not propagate into restored parent cards", { before: invariant(opening), after: invariant(after) });
          }
          continue; // Touch is a separately labelled input-only Opening check.
        }
        await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); window.__OLD_PLAYER_CARD_ACTIONS__ = [...s.overlayActions]; window.__OLD_PLAYER_CARD_KEY__ = s.levelUpKeyHandler; });
        for (let i = 0; i < 3; i++) { const view = await ui.enabledCards(r.page); c.selections.push(await ui.chooseCard(r.page, Math.max(0, view.cards.findIndex(card => card.type === "passive")))); }
        await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state === "ACTIVE");
        await r.page.locator("#umbra-integration-details > summary").click(); await r.page.locator("#umbra-integration-boundary").click(); await r.page.locator("#umbra-integration-details > summary").click();
        for (let sequence = 0; sequence < 12; sequence++) {
          await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.levelUpActive && s.levelUpInputEnabled && !s.levelUpSelectionLocked || !s.levelUpActive && s.umbraRunContext.state === "ACTIVE"; });
          const state = await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return { active: s.levelUpActive, skillId: s.levelUpCardRecords[0]?.model.option.skillId, mode: s.levelUpSelectionMode, phase: s.skillMutationState?.currentSelection?.phase }; });
          if (!state.active) break;
          const name = `${sequence}-${state.skillId}-${state.phase || state.mode}`, before = await capture(name);
          await r.page.evaluate(() => { for (const action of window.__OLD_PLAYER_CARD_ACTIONS__) action.onSelect(); window.__OLD_PLAYER_CARD_KEY__({ key: "1" }); });
          check(invariant(await inspect(r.page)) === invariant(before) && !(await inspect(r.page)).details, "old overlay pointer/pad/key actions do not affect new ticket");
          for (let index = 0; index < before.cards.length; index++) {
            await r.page.evaluate(index => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); s.umbraPlayerCardFocusIndex = index; s.overlayFocusedPanel = null; }, index);
            await r.page.keyboard.press("d");
            const first = await capture(`${name}-card${index}-detail0`);
            for (let p = 1; p < first.details.pages; p++) { await r.page.keyboard.press("ArrowRight"); await capture(`${name}-card${index}-detail${p}`); }
            await r.page.keyboard.press("Escape"); check(invariant(await inspect(r.page)) === invariant(before), `${name}/${index}: all detail pages preserve selection and combat state`);
          }
          const cards = await ui.enabledCards(r.page), wanted = cards.cards.findIndex(card => ["reactor", "prism"].includes(card.choiceId));
          c.selections.push(await ui.chooseCard(r.page, wanted >= 0 ? wanted : 0));
        }
        await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); s.runEnvironmentIO.record("ui-close-boundary", { reason: "DETAIL_OWNER_TEST" }); s.endUmbraNormalRun("DETAIL_OWNER_TEST"); for (const action of window.__OLD_PLAYER_CARD_ACTIONS__) action.onSelect(); });
        check(await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.umbraRunContext.state === "ENDED" && !s.umbraPlayerCardDetail; }), "ENDED rejects saved actions and retains no details");
      } catch (error) { c.error = error.stack; if (r) c.failure = await inspect(r.page).catch(() => null); }
      finally {
        if (r) {
          await r.page.evaluate(() => { window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("PLAYER_CARD_UI_END"); }).catch(() => {});
          await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed, null, { timeout: 10000 }).catch(e => c.endError = String(e));
          c.audit = await h.audit(r); c.endEnvironment = await r.page.evaluate(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot()).catch(() => null);
          check(c.audit.isolationPassed, "native Storage and external APIs/requests stay 0", c.audit.isolationPassed); check(c.audit.pageErrors.length === 0, "no uncaught product error", c.audit.pageErrors);
          await r.context.close();
        }
        c.passed = !c.error && !c.endError && c.checks.every(check => check.passed);
        fs.writeFileSync(path.join(out, `${c.name}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
        console.log(JSON.stringify({ name: c.name, passed: c.passed, checks: c.checks.length, error: c.error, failed: c.checks.filter(check => !check.passed).slice(0, 8) }));
      }
    }
  } finally {
    await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 10000))]);
    report.passed = report.cases.every(c => c.passed); fs.writeFileSync(path.join(out, "player-cards-browser.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    if (!report.passed) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
