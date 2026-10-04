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

const drive = "window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive')";
async function waitDrive(page) {
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.isActive('UmbraPhase2ADrive') && window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').stats, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status.finished);
  await tick(page);
}
async function reset(page, mech = 'umbraSeraph', fixture = 'baseline') {
  await page.keyboard.up('Shift'); await page.keyboard.up('ArrowRight');
  await page.evaluate(({ mech, fixture }) => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').resetDrive(mech, fixture), { mech, fixture });
  await tick(page);
}
async function sample(page) { return page.evaluate(`${drive}.snapshot()`); }
async function pressFor(page, keys, duration) {
  for (const key of keys) await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  const result = await sample(page);
  for (const key of keys.slice().reverse()) await page.keyboard.up(key);
  return result;
}

function summarize(rows) {
  const start = rows.find(row => row.airBrake);
  if (!start) return { activated: false, reasons: [...new Set(rows.map(row => row.brake.lastBlockReason))] };
  const active = rows.filter(row => row.clock >= start.brake.startedAt);
  const end = active.find(row => !row.airBrake);
  // Original travel is rightward boost, not the already turning brake-start vector.
  const dir = { x: 1, y: 0 };
  const measured = row => row && ({ elapsedMs: row.clock - start.brake.startedAt, speed: row.speed,
    forwardVelocity: row.vx * dir.x + row.vy * dir.y, speedRatio: row.speed / start.speed,
    en: row.en, evade: row.invulnerable, updates: row.updates - start.updates, physicsSteps: row.physicsSteps - start.physicsSteps });
  const during = active.filter(row => !end || row.clock <= end.clock);
  let distance = 0;
  for (let i = 1; i < during.length; i++) distance += Math.hypot(during[i].x - during[i-1].x, during[i].y - during[i-1].y);
  const reverse = active.find((row, i) => i && (row.x - active[i-1].x) * dir.x + (row.y - active[i-1].y) * dir.y < -0.001);
  return { activated: true, start: measured(start), startClock: start.brake.startedAt,
    samples: [50, 100, 150, 200].map(ms => ({ requestedMs: ms, ...measured(active.find(row => row.clock - start.brake.startedAt >= ms - 1e-6)) })),
    end: measured(end), endReason: end?.brake.endReason, brakingDistance: distance,
    maxForwardDrift: Math.max(...active.map(row => (row.x - start.x) * dir.x + (row.y - start.y) * dir.y)),
    reverseMovementMs: reverse ? reverse.clock - start.brake.startedAt : null,
    reasons: [...new Set(rows.filter(row => row.clock < start.clock).map(row => row.brake.lastBlockReason))] };
}

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  report.kind = 'Actual Chromium loop and Playwright keyboard events; not a controlled Game.step timeline';
  report.measurements = [];
  for (const variant of ['legacy', 'tuned']) {
    const item = await makeCase('actual-keyboard-' + variant);
    await item.page.goto(base + '/?umbraPreview=1&umbraDrive=1&umbraBrake=' + variant);
    await waitDrive(item.page);
    for (const fixture of ['baseline', 'medium', 'deep']) for (const holdMs of [250, 1200]) {
      await item.page.evaluate(({ fixture, variant }) => {
        const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
        if (s.airBrakeObservation) s.events.off('postupdate', s.airBrakeObservation);
        if (s.airBrakeKeyObservation) { window.removeEventListener('keydown', s.airBrakeKeyObservation); window.removeEventListener('keyup', s.airBrakeKeyObservation); }
        s.resetDrive('umbraSeraph', fixture, variant);
        s.airBrakeObservedRows = []; s.airBrakeKeyRows = [];
        s.airBrakeObservation = () => { if (s.airBrakeObservedRows.length < 2000) s.airBrakeObservedRows.push({ ...s.snapshot(), clock: s.time.now, wall: performance.now(), x: s.playerHitbox.body.center.x, y: s.playerHitbox.body.center.y }); };
        s.airBrakeKeyObservation = e => s.airBrakeKeyRows.push({ type: e.type, key: e.key, clock: s.time.now, wall: performance.now() });
        s.events.on('postupdate', s.airBrakeObservation);
        window.addEventListener('keydown', s.airBrakeKeyObservation); window.addEventListener('keyup', s.airBrakeKeyObservation);
      }, { fixture, variant });
      await tick(item.page);
      await item.page.keyboard.down('ArrowRight'); await item.page.keyboard.down('Shift');
      await item.page.waitForTimeout(holdMs);
      await item.page.keyboard.up('Shift'); await item.page.keyboard.up('ArrowRight');
      await item.page.waitForTimeout(50);
      await item.page.keyboard.down('ArrowLeft');
      await item.page.waitForTimeout(1150);
      await item.page.keyboard.up('ArrowLeft');
      const raw = await item.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
        return { rows: s.airBrakeObservedRows, keys: s.airBrakeKeyRows };
      });
      const summary = summarize(raw.rows);
      const reverseInput = raw.keys.find(row => row.type === 'keydown' && row.key === 'ArrowLeft');
      summary.reverseInput = reverseInput;
      summary.startDelayMs = summary.activated ? summary.startClock - reverseInput.clock : null;
      const span = raw.rows.at(-1).wall - raw.rows[0].wall;
      summary.observedSceneHz = (raw.rows.at(-1).updates - raw.rows[0].updates) * 1000 / span;
      report.measurements.push({ fixture, variant, requestedBoostHoldMs: holdMs, summary, ...raw });
      assert.equal(summary.activated, true, `${variant}/${fixture}/${holdMs}: no actual Air Brake`);
      assert.equal(summary.endReason, 'DURATION');
      if (variant === 'tuned') {
        const sample200 = summary.samples.find(row => row.requestedMs === 200);
        assert.ok(sample200.speedRatio >= 0.35 && sample200.speedRatio <= 0.45, JSON.stringify(summary));
      }
      console.log(`${variant}/${fixture}/${holdMs}: brake after ${summary.startDelayMs.toFixed(1)}ms; sample ${summary.samples.at(-1).elapsedMs.toFixed(2)}ms ${summary.samples.at(-1).speedRatio.toFixed(4)}`);
    }
    await screenshot(item.page, 'airbrake-' + variant);
    await audit(item, variant);
    await item.context.close();
  }
  report.status = 'PASS';
})().catch(error => { report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1; })
  .finally(async () => {
    fs.writeFileSync(path.join(output, 'airbrake-realtime-report.json'), JSON.stringify(report, null, 2));
    await browser?.close();
    console.log(JSON.stringify({ status: report.status, cases: report.measurements?.length, error: report.error }));
  });
