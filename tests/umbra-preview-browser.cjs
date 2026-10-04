// Uses an already installed Playwright runtime. No dependency installation required.
// Every run creates fresh browser contexts; no user's profile or save is opened.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.UMBRA_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, '..', '.tmp_umbra_phase1');
fs.mkdirSync(output, { recursive: true });
const report = { base, checks: [], cases: [] };
const previewQuery = '?umbraPreview=1&debugPlayerMech=umbraSeraph&debugCommsStoryReset=1&debugCommsEpilogueReset=1&debugCommsEpilogueForcePending=1&debugCommsEpilogueSequence=shop_depth6_return';
const scene = "window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Preview')";
let browser;

async function makeCase(name, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const record = { name, requests: [], blockedExternal: [], pageErrors: [], consoleErrors: [] };
  report.cases.push(record);
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (!url.startsWith(base + '/')) {
      record.blockedExternal.push(url);
      return route.abort();
    }
    const decoded = decodeURIComponent(new URL(url).pathname);
    if (options.hold && decoded.endsWith('/KGK_000.png')) await options.hold;
    if (options.missing && decoded.includes('/KGK-02_UMBRA_SERAPH/') && (options.missing === 'all' || /KGK_000\.png|MOONLIGHT\.png|nova\.png/.test(decoded))) {
      return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Intentional preview asset failure' });
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('request', request => record.requests.push({ method: request.method(), url: request.url(), type: request.resourceType() }));
  page.on('pageerror', error => record.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') record.consoleErrors.push(message.text()); });
  await page.addInitScript(() => {
    const original = Object.fromEntries(['getItem', 'setItem', 'removeItem', 'clear', 'key'].map(k => [k, Storage.prototype[k]]));
    const lengthGet = Object.getOwnPropertyDescriptor(Storage.prototype, 'length').get;
    const local = window.localStorage, session = window.sessionStorage;
    // Synthetic fixture values in this new context only. Never sourced from a user save.
    original.setItem.call(local, 'lastmemoVansabaCoins', '314159');
    original.setItem.call(local, 'lastmemoVansabaShopState', JSON.stringify({ version: 1, sentinel: 'synthetic-preserve', playerMech: { ownedIds: ['defaultBear'], selectedId: 'defaultBear' } }));
    original.setItem.call(local, 'lastmemoVansabaCommsStoryState', JSON.stringify({ version: 1, played: { shop_depth6_return: true } }));
    original.setItem.call(session, 'lastmemoVansabaExtractionMessage', 'synthetic-extraction-preserve');
    original.setItem.call(session, 'preview-audit-sentinel', 'synthetic-session-preserve');
    const snapshotOne = storage => {
      const values = {};
      for (let i = 0; i < lengthGet.call(storage); i++) {
        const key = original.key.call(storage, i);
        values[key] = original.getItem.call(storage, key);
      }
      return values;
    };
    const snapshot = () => ({ local: snapshotOne(local), session: snapshotOne(session) });
    window.__previewAudit = { storageCalls: [], entryCalls: [], snapshot, before: snapshot() };
    Object.keys(original).forEach(method => {
      Storage.prototype[method] = function (...args) {
        window.__previewAudit.storageCalls.push({ area: this === local ? 'local' : 'session', method, key: args[0] });
        return original[method].apply(this, args);
      };
    });
    window.addEventListener('load', () => {
      for (const method of ['init', 'preload', 'create', 'createState', 'initializeCloudSaveRuntime', 'beginCloudSaveBootstrap', 'getFirebaseLeaderboardClient', 'addKillRankingEntry']) {
        const originalMethod = SurvivalScene.prototype[method];
        if (typeof originalMethod !== 'function') continue;
        SurvivalScene.prototype[method] = function (...args) {
          window.__previewAudit.entryCalls.push(method);
          return originalMethod.apply(this, args);
        };
      }
    }, { once: true });
  });
  return { context, page, record };
}
async function waitPreview(page, finished = true) {
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.isActive('UmbraPhase1Preview'), null, { timeout: 30000 });
  if (finished) await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status.finished, null, { timeout: 30000 });
}
async function tick(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function audit(item, label) {
  const current = await item.page.evaluate(() => ({
    before: window.__previewAudit.before, after: window.__previewAudit.snapshot(),
    storageCalls: window.__previewAudit.storageCalls, entryCalls: window.__previewAudit.entryCalls,
    firebaseCacheCreated: Boolean(window.__LASTMEMO_FIREBASE_LEADERBOARD__),
    activeScenes: window.__SURVIVAL_GAME__.scene.getScenes(true).map(s => s.sys.settings.key)
  }));
  item.record.audit = current;
  assert.deepEqual(current.after, current.before, label + ': persisted data changed');
  assert.equal(current.storageCalls.length, 0, label + ': storage accessed');
  assert.equal(current.entryCalls.length, 0, label + ': normal runtime started');
  assert.equal(current.firebaseCacheCreated, false);
  assert.equal(item.record.blockedExternal.length, 0, label + ': external request attempted');
  assert.equal(item.record.pageErrors.length, 0, label + ': browser exception');
  report.checks.push(label + ': storage unchanged, zero data access, zero normal/auth/ranking starts, zero external requests');
}
async function screenshot(page, name) { await tick(page); await page.screenshot({ path: path.join(output, name + '.png') }); }

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  const main = await makeCase('preview-normal-and-mixed-debug');
  await main.page.goto(base + '/' + previewQuery);
  await waitPreview(main.page);
  main.record.assets = await main.page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status);
  assert.equal(main.record.assets.loaded, 27);
  assert.deepEqual(main.record.assets.failed, []);
  const initial = await main.page.evaluate(`({ owned: [...${scene}.owned], bodyRadius: ${scene}.playerHitbox.body.radius })`);
  assert.deepEqual(initial.owned, ['umbraMoonlight']);
  assert.equal(initial.bodyRadius, 22);
  await main.page.evaluate(`${scene}.selectEffect('umbraBloodSpike')`);
  await main.page.keyboard.press('u'); await tick(main.page);
  assert.equal(await main.page.evaluate(`${scene}.owned.has('umbraBloodSpike')`), true);
  await main.page.keyboard.press('u'); await tick(main.page);
  assert.equal(await main.page.evaluate(`${scene}.owned.has('umbraBloodSpike')`), false);
  await main.page.evaluate(`${scene}.selectEffect('umbraMoonlight')`);
  main.record.poses = [];
  for (const mode of ['idle', 'move', 'boost']) {
    for (const direction of ['down', 'downLeft', 'left', 'upLeft', 'up', 'upRight', 'right', 'downRight']) {
      const pose = await main.page.evaluate(({ mode, direction }) => {
        const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Preview');
        s.selectPose(direction, mode);
        const p = window.umbraPreviewAssets.getPose(direction, mode);
        return { mode, direction, expectedKey: p.key, key: s.playerSprite.texture.key, visible: s.playerSprite.visible,
          origin: [s.playerSprite.originX, s.playerSprite.originY], scale: s.playerSprite.scaleX, radius: s.playerHitbox.body.radius };
      }, { mode, direction });
      assert.equal(pose.key, pose.expectedKey);
      assert.equal(pose.visible, true);
      assert.equal(pose.radius, 22);
      main.record.poses.push(pose);
    }
    await main.page.evaluate(`{ const s = ${scene}; s.selectPose('down', '${mode}'); s.galleryOpen = false; s.refreshGallery(); }`);
    await screenshot(main.page, 'mech-' + mode);
    await main.page.evaluate(`${scene}.galleryOpen = true; ${scene}.refreshGallery();`);
    await screenshot(main.page, 'mech-eight-' + mode);
  }
  main.record.frames = [];
  for (const id of ['umbraMoonlight', 'umbraBloodSpike', 'umbraPhantomNova']) {
    const frames = await main.page.evaluate(id => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Preview');
      s.selectEffect(id);
      return window.umbraPreviewAssets.effects[id].frames.map((frame, i) => {
        s.frameIndex = i; s.refreshEffect();
        const actual = s.effectSprite.frame;
        const source = s.effectSprite.texture.getSourceImage();
        return { id, i, expected: frame, actual: { x: actual.cutX, y: actual.cutY, width: actual.cutWidth, height: actual.cutHeight }, visible: s.effectSprite.visible,
          sourceSize: [source.width, source.height], scale: [s.effectSprite.scaleX, s.effectSprite.scaleY] };
      });
    }, id);
    for (const frame of frames) {
      assert.equal(frame.visible, true);
      for (const key of ['x', 'y', 'width', 'height']) assert.equal(frame.actual[key], frame.expected[key]);
      assert.ok(frame.actual.x >= 0 && frame.actual.y >= 0);
      assert.ok(frame.actual.x + frame.actual.width <= frame.sourceSize[0]);
      assert.ok(frame.actual.y + frame.actual.height <= frame.sourceSize[1]);
      if (id === 'umbraBloodSpike') {
        // Preserve the pre-compression sheet's displayed size after the approved resize.
        assert.ok(Math.abs(frame.sourceSize[0] * frame.scale[0] - 2172 * 0.38) < 0.001);
        assert.ok(Math.abs(frame.sourceSize[1] * frame.scale[1] - 724 * 0.38) < 0.001);
      }
    }
    main.record.frames.push(...frames);
    await main.page.evaluate(`${scene}.galleryOpen = 'effects'; ${scene}.refreshGallery();`);
    if (id === 'umbraBloodSpike') {
      const widths = await main.page.evaluate(`${scene}.gallery.list.filter(item => item.type === 'Image').map(item => item.displayWidth)`);
      assert.equal(widths.length, 8);
      widths.forEach(width => assert.ok(Math.abs(width - 543 * 0.35) < 0.001));
    }
    await screenshot(main.page, 'effect-eight-' + id);
    await main.page.evaluate(`${scene}.galleryOpen = false; ${scene}.refreshGallery(); ${scene}.togglePlayback();`);
    if (id !== 'umbraPhantomNova') {
      await main.page.waitForFunction(() => !window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Preview').playing);
      assert.equal(await main.page.evaluate(`${scene}.frameIndex`), 7);
    } else {
      const loop = await main.page.evaluate(`{ const s = ${scene}; s.frameIndex = 7; s.frameElapsed = 1000; s.update(0, 1); ({ frame: s.frameIndex, playing: s.playing }); }`);
      assert.equal(loop.frame, 0); assert.equal(loop.playing, true);
      await main.page.evaluate(`${scene}.playing = false; ${scene}.refreshEffect();`);
    }
  }
  report.checks.push('24 poses and 24 registered frames; 2 one-shots stop on 8, Nova loops 8 to 1; radius 22 preserved');
  await main.page.evaluate(`${scene}.galleryOpen = false; ${scene}.refreshGallery();`);
  await main.page.keyboard.press('2'); await tick(main.page); await main.page.keyboard.press('ArrowLeft'); await tick(main.page);
  assert.equal(await main.page.evaluate(`${scene}.mode`), 'move');
  await main.page.keyboard.press('m'); await tick(main.page); await main.page.keyboard.press('t'); await tick(main.page);
  await main.page.evaluate(`${scene}.selectPose('right', 'boost');`);
  await screenshot(main.page, 'mech-motion-afterimages');
  assert.equal(await main.page.evaluate(`${scene}.afterimages.length`), 3);
  const baseline = await main.page.evaluate(`${scene}.children.length - ${scene}.afterimages.length`);
  await main.page.keyboard.press('r'); await tick(main.page);
  await waitPreview(main.page);
  const restarted = await main.page.evaluate(`({ count: ${scene}.children.length, listeners: window.__SURVIVAL_GAME__.events.listenerCount('umbra-phase1-assets-changed'), keys: ${scene}.input.keyboard.listenerCount('keydown'), owned: [...${scene}.owned] })`);
  assert.equal(restarted.count, baseline);
  assert.equal(restarted.listeners, 1); assert.equal(restarted.keys, 1);
  assert.deepEqual(restarted.owned, ['umbraMoonlight']);
  const imageRequests = main.record.requests.filter(r => decodeURIComponent(r.url).includes('/KGK-02_UMBRA_SERAPH/'));
  assert.equal(imageRequests.length, 27);
  report.checks.push('Keyboard controls and actual shared pose/motion/afterimage functions; restart object/listener counts stable; only 27 image requests');
  await audit(main, 'Preview + mixed debug + restart');
  await main.context.close();

  for (const missing of ['partial', 'all']) {
    const item = await makeCase('missing-' + missing, { missing });
    await item.page.goto(base + '/?umbraPreview=1'); await waitPreview(item.page);
    item.record.assets = await item.page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status);
    assert.equal(item.record.assets.failed.length, missing === 'all' ? 27 : 3);
    assert.equal(await item.page.evaluate(`${scene}.poseFallback.visible`), true);
    assert.equal(await item.page.evaluate(`${scene}.effectFallback.visible`), true);
    await item.page.keyboard.press('3'); await tick(item.page); await item.page.keyboard.press(']'); await tick(item.page);
    assert.equal(await item.page.evaluate(`${scene}.mode`), 'boost');
    assert.equal(await item.page.evaluate(`${scene}.frameIndex`), 1);
    await screenshot(item.page, 'missing-' + missing);
    await audit(item, 'Asset failure ' + missing + ': controls remain usable');
    await item.context.close();
  }

  let release;
  const hold = new Promise(resolve => { release = resolve; });
  const late = await makeCase('late-load-after-restart-and-exit', { hold });
  await late.page.goto(base + '/?umbraPreview=1'); await waitPreview(late.page, false);
  await late.page.keyboard.press('r'); await tick(late.page); await waitPreview(late.page, false);
  await late.page.keyboard.press('Escape'); await tick(late.page);
  assert.equal(await late.page.evaluate("window.__SURVIVAL_GAME__.scene.isActive('UmbraPhase1Stopped')"), true);
  release();
  await late.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status.finished);
  assert.equal(await late.page.evaluate("window.__SURVIVAL_GAME__.events.listenerCount('umbra-phase1-assets-changed')"), 0);
  await audit(late, 'Late image completes after display Scene restart and exit');
  await late.page.evaluate("window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Stopped').scene.start('UmbraPhase1Preview')");
  await waitPreview(late.page);
  assert.equal(late.record.requests.filter(r => decodeURIComponent(r.url).includes('/KGK-02_UMBRA_SERAPH/')).length, 27);
  await audit(late, 'Reopen after late load uses existing textures');
  await late.context.close();
})().catch(error => { report.failure = error.stack; process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close();
  console.log(JSON.stringify({ checks: report.checks, failure: report.failure || null, report: path.join(output, 'browser-report.json') }, null, 2));
});
