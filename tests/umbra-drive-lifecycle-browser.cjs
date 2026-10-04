// Uses an already installed Playwright runtime. No dependency installation required.
// Every run creates fresh browser contexts; no user's profile or save is opened.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.UMBRA_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, '..', 'phase2a-output');
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

const driveKey = 'UmbraPhase2ADrive';
const caseFilter = (process.env.UMBRA_LIFECYCLE_FILTER || '').split(',').filter(Boolean);
const selectedCase = name => !caseFilter.length || caseFilter.includes(name);
const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Space'];
async function release(page) { for (const key of keys) await page.keyboard.up(key); }
async function clickCanvas(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  assert.ok(box, 'Canvas is not visible');
  await page.mouse.click(box.x + x * box.width / 1280, box.y + y * box.height / 720);
}
async function snap(page) { return page.evaluate(() => {
  const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
  const state = s.ensureAcMovementState();
  return { ...s.snapshot(), continuous: { ...state.continuousBoost }, quickBoostUntil: state.quickBoostUntil,
    variable: { ...state.variableQuickBoost }, preset: s.getAcMovementPresetName(), paused: s.drivePaused,
    hidden: s.driveHidden, fullState: { ...state.fullOverheat }, sfxEnabled: s.sfxEnabled, seCalls: s.lifecycleSeCalls || 0 };
}); }
async function freshDrive(item, query = '') {
  await item.page.goto(base + '/?umbraPreview=1&umbraDrive=1' + query);
  await item.page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.isActive('UmbraPhase2ADrive') && window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').stats, null, { timeout: 30000 });
  await item.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase1Assets').status.finished);
  await tick(item.page);
}
async function resetDrive(page, mechId = 'umbraSeraph', fixtureId = 'baseline', preset = 'acV3') {
  await release(page);
  await page.evaluate(({ mechId, fixtureId, preset }) => {
    const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
    s.driveMovementPreset = preset; s.resetDrive(mechId, fixtureId);
  }, { mechId, fixtureId, preset });
  await tick(page);
}
async function history(page) { return page.evaluate(() => {
  const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
  return { samples: s.samples, transitions: s.transitions };
}); }
async function runCase(name, action) {
  if (!selectedCase(name)) return;
  const item = await makeCase(name);
  try {
    await freshDrive(item);
    await action(item);
    await audit(item, name);
    item.record.passed = true;
  } catch (error) {
    item.record.passed = false; item.record.failure = error.stack;
    console.error(name, error.message);
    try { item.record.final = await snap(item.page); await screenshot(item.page, name + '-failure'); } catch (_) {}
  } finally {
    try { item.record.history = await history(item.page); } catch (_) {}
    await item.context.close();
  }
}

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  report.scope = 'Fresh synthetic browser contexts; real Playwright keyboard; Phaser default browser/Arcade update order. No real user profile. Synthetic visibility and no-audio adapter cases explicitly labeled.';

  await runCase('lifecycle-turn-airbrake-glide', async ({ page, record }) => {
    await resetDrive(page);
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').setDriveEvasiveLevel(10));
    await tick(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(450);
    record.right = await snap(page);
    await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(650);
    record.turn90 = await snap(page);
    assert.ok(record.turn90.vy < 0, '90-degree keyboard turn did not change physical velocity');
    record.turn90History = await history(page);
    // Turning input by 90 degrees does not instantly rotate the velocity by 90.
    // Use a fresh straight boost for a true opposite input, then release DASH:
    // production Air Brake is deliberately blocked during an active boost.
    await resetDrive(page);
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').setDriveEvasiveLevel(10));
    await tick(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(450);
    await page.keyboard.up('ArrowRight'); await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(100); record.turn180 = await snap(page);
    await page.keyboard.up('Shift');
    await page.waitForTimeout(180); record.airBrake = await snap(page);
    await page.waitForTimeout(250); record.after180 = await snap(page);
    await release(page); await page.waitForTimeout(120); record.release = await snap(page);
    const h = await history(page);
    const brake = h.transitions.filter(s => s.airBrake);
    assert.ok(brake.length > 0, 'Reverse keyboard input did not activate Air Brake');
    assert.ok(brake.every(s => !s.invulnerable), 'Air Brake retained boost Evade');
    assert.equal(record.release.invulnerable, false);
    // A separate fresh boost/release measures POST_BOOST_GLIDE without a brake.
    await resetDrive(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(650);
    await release(page); await page.waitForTimeout(90); record.glide = await snap(page);
    assert.equal(record.glide.invulnerable, false);
    assert.ok(record.glide.mode.includes('GLIDE'), 'Release did not enter glide');
    await screenshot(page, 'lifecycle-glide');
    record.turnHistory = h;
  });

  await runCase('lifecycle-held-overheat-release', async ({ page, record }) => {
    await resetDrive(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift');
    await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').isAcFullOverheatActive(), null, { timeout: 20000 });
    record.empty = await snap(page);
    assert.equal(record.empty.invulnerable, false);
    await page.keyboard.up('ArrowRight');
    await page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive'); return s.stats.stamina >= s.stats.maxStamina - 0.01; }, null, { timeout: 25000 });
    record.fullWhileHeld = await snap(page);
    assert.equal(record.fullWhileHeld.boostActive, false);
    assert.equal(record.fullWhileHeld.mustRelease, true);
    assert.equal(record.fullWhileHeld.boostMode, 'READY_NEEDS_RELEASE');
    record.failureReasonNote = 'lastQuickBoostFailReason can retain FULL_OVERHEAT from the previous failed attempt; current boostMode and mustRelease report the full-recharge release requirement.';
    await page.waitForTimeout(350); record.stillHeld = await snap(page);
    assert.equal(record.stillHeld.boostActive, false, 'Held DASH restarted after full recharge');
    await screenshot(page, 'lifecycle-need-release');
    await page.keyboard.up('Shift'); await page.waitForTimeout(120);
    record.released = await snap(page);
    assert.equal(record.released.fullOverheat, false);
    await page.keyboard.down('ArrowLeft'); await page.keyboard.down('Shift'); await page.waitForTimeout(130);
    record.restarted = await snap(page);
    assert.equal(record.restarted.boostActive, true);
    await release(page);
  });

  await runCase('lifecycle-panel-pause-preserve-overheat', async ({ page, record }) => {
    await resetDrive(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift');
    await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').isAcFullOverheatActive(), null, { timeout: 20000 });
    record.beforePanel = await snap(page);
    await page.keyboard.press('l'); await tick(page);
    record.panel = await snap(page); await page.waitForTimeout(600); record.panelEnd = await snap(page);
    assert.equal(record.panel.fullOverheat, true, 'Candidate panel cleared overheat');
    assert.equal(record.panelEnd.en, record.panel.en, 'Candidate panel changed EN');
    await page.keyboard.press('Escape'); await page.keyboard.press('p'); await tick(page);
    record.pause = await snap(page); await page.waitForTimeout(600); record.pauseEnd = await snap(page);
    assert.equal(record.pause.fullOverheat, true, 'Pause cleared overheat');
    assert.equal(record.pauseEnd.en, record.pause.en, 'Pause changed EN');
    await page.keyboard.press('p'); await tick(page); record.resume = await snap(page);
    assert.equal(record.resume.fullOverheat, true, 'Resume cleared full recharge requirement');
    await release(page);
    await page.keyboard.press('r'); await tick(page); record.reset = await snap(page);
    assert.equal(record.reset.en, record.reset.maxEn, 'Explicit new-drive reset did not restore fixture EN');
    assert.equal(record.reset.fullOverheat, false);
    assert.equal(record.reset.invulnerable, false);
    assert.equal(record.reset.speed, 0);
    record.resetSemantics = 'R explicitly starts a fresh synthetic trial; panels/pause preserve EN and overheat.';
  });

  await runCase('lifecycle-en-minimum-start', async ({ page, record }) => {
    await resetDrive(page);
    record.fixture = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      const minimum = s.getAcContinuousBoostMinStartStamina();
      s.stats.stamina = Math.max(0.5, minimum - 0.5);
      s.acMovementState.boostRegenBlockedUntil = s.time.now + 1000;
      return { kind: 'explicit in-memory low-EN fixture', minimum, en: s.stats.stamina, regenDelayMs: 1000 };
    });
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(120);
    record.attempt = await snap(page);
    assert.equal(record.attempt.boostActive, false);
    assert.equal(record.attempt.invulnerable, false);
    assert.equal(record.attempt.en, record.fixture.en);
    await release(page);
  });

  await runCase('lifecycle-visibility-return', async ({ page, record, context }) => {
    await resetDrive(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(350);
    const alternate = await context.newPage(); await alternate.goto('about:blank'); await alternate.bringToFront();
    await page.waitForTimeout(150);
    record.actualBackgroundHidden = await page.evaluate(() => document.hidden);
    await page.bringToFront(); await alternate.close();
    if (record.actualBackgroundHidden) {
      record.visibilityMethod = 'Actual browser tab foreground switch';
      await tick(page); record.returned = await snap(page);
      assert.equal(record.returned.invulnerable, false);
    } else {
      record.visibilityMethod = 'Synthetic document.hidden + visibilitychange; headless tab switch kept document.visible. Browser listener tested, OS background throttling not tested.';
    }
    await resetDrive(page);
    await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift');
    await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').isAcFullOverheatActive(), null, { timeout: 20000 });
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    record.hidden = await snap(page); await page.waitForTimeout(600); record.hiddenEnd = await snap(page);
    assert.equal(record.hidden.fullOverheat, true);
    assert.equal(record.hiddenEnd.en, record.hidden.en);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await tick(page); record.visible = await snap(page);
    assert.equal(record.visible.fullOverheat, true);
    assert.equal(record.visible.invulnerable, false);
    await release(page);
    record.overheatVisibilityMethod = 'Synthetic visibility properties/event for repeatable EN preservation; not a claim about OS tab suspension.';
  });

  await runCase('lifecycle-sfx-adapter-parity', async ({ page, record }) => {
    record.conditions = 'Real keyboard / normal browser step; noAudio engine and presentation-only SE adapter. OFF/ON flag fixtures and call counts; actual audible playback is not exercised.';
    record.runs = [];
    for (const enabled of [false, true]) {
      await resetDrive(page);
      await page.evaluate(enabled => {
        const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
        s.sfxEnabled = enabled; s.optionsState = { ...(s.optionsState || {}), sfxEnabled: enabled };
        s.lifecycleSeCalls = 0;
        s.triggerAcQuickBoostSe = () => { s.lifecycleSeCalls += 1; };
      }, enabled);
      await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(1000);
      record.runs.push(await snap(page)); await release(page);
    }
    const [off, on] = record.runs;
    assert.ok(off.seCalls > 0 && on.seCalls > 0, 'SE entry was not exercised');
    assert.equal(off.allowedSpeed, on.allowedSpeed);
    assert.equal(off.continuous.drainPerSecond, on.continuous.drainPerSecond);
    assert.equal(off.invulnerable, on.invulnerable);
    assert.ok(Math.abs(off.speed - on.speed) / Math.max(1, off.speed) < 0.06, 'Audio flag affected physical speed beyond browser timing tolerance');
    const rate = s => s.continuous.consumedEnergy / Math.max(1, s.continuous.heldMs);
    assert.ok(Math.abs(rate(off) - rate(on)) < 0.001, 'Audio flag affected normalized EN drain');
  });

  await runCase('lifecycle-existing-quickboost-presets', async ({ page, record }) => {
    record.runs = [];
    for (const preset of ['v1', 'acV2']) for (const mech of ['defaultBear', 'umbraSeraph']) {
      await resetDrive(page, mech, 'baseline', preset);
      const before = await snap(page);
      await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(130);
      const early = await snap(page);
      await page.waitForTimeout(500); const held = await snap(page);
      await release(page); await page.waitForTimeout(100); const ended = await snap(page);
      record.runs.push({ preset, mech, input: 'right+SHIFT 630ms, release 100ms; default browser timestep', before, early, held, ended });
      assert.equal(early.preset, preset);
      assert.ok(early.x > before.x && early.speed > 0, 'Quick Boost preset did not move physical body');
      assert.ok(early.en < before.en, 'Quick Boost consumed no EN');
      assert.equal(ended.invulnerable, false);
    }
    await screenshot(page, 'lifecycle-quickboost-acV2');
  });

  await runCase('lifecycle-stale-candidate-cap', async ({ page, record }) => {
    await resetDrive(page);
    record.fixture = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      for (let i = 0; i < 9; i += 1) s.applyDriveApUpgrade();
      for (const id of ['overchargeBolt', 'swiftStep', 'staminaCore', 'rapidSigil', 'evasiveFirmware']) s.passiveLevels[id] = 10;
      s.lifecycleSideCalls = { ap: 0, evasive: 0 };
      const apAction = s.applyDriveApUpgrade, evasiveAction = s.setDriveEvasiveLevel;
      s.applyDriveApUpgrade = function (...args) { this.lifecycleSideCalls.ap += 1; return apAction.apply(this, args); };
      s.setDriveEvasiveLevel = function (...args) { this.lifecycleSideCalls.evasive += 1; return evasiveAction.apply(this, args); };
      return { purpose: 'AP Lv9 from nine real acquisitions; other passive caps are synthetic fixture inputs', maxHp: s.stats.maxHp, level: s.getPassiveLevel('vitalBloom'), evasive: s.getPassiveLevel('evasiveFirmware') };
    });
    await page.keyboard.press('l'); await tick(page);
    record.open = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      return { ids: s.candidateChoices.map(c => c.id), maxHp: s.stats.maxHp, level: s.getPassiveLevel('vitalBloom') };
    });
    assert.deepEqual(record.open.ids, ['vitalBloom']);
    // Convert logical canvas coordinates through its actual responsive CSS bounds.
    await clickCanvas(page, 1159, 552); // AP Reinforce right-side button.
    await clickCanvas(page, 961, 552); // EV minus: would change Lv10 to Lv9 without guard.
    record.blockedSideControls = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      return { maxHp: s.stats.maxHp, level: s.getPassiveLevel('vitalBloom'), evasive: s.getPassiveLevel('evasiveFirmware'), calls: s.lifecycleSideCalls };
    });
    assert.equal(record.blockedSideControls.maxHp, record.fixture.maxHp);
    assert.equal(record.blockedSideControls.level, 9);
    assert.equal(record.blockedSideControls.evasive, 10);
    assert.deepEqual(record.blockedSideControls.calls, { ap: 1, evasive: 1 }, 'Real pointer must reach both guarded handlers');
    // Model a stale UI after another legitimate in-memory acquisition, without
    // calling the blocked panel action or manipulating stored progression.
    record.concurrentAcquisition = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      s.applyApReinforceUpgrade(); s.incrementPassiveLevel('vitalBloom');
      return { maxHp: s.stats.maxHp, hp: s.stats.hp, level: s.getPassiveLevel('vitalBloom') };
    });
    await page.keyboard.press('1'); await tick(page);
    record.staleSelection = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
      return { maxHp: s.stats.maxHp, hp: s.stats.hp, level: s.getPassiveLevel('vitalBloom') };
    });
    assert.equal(record.staleSelection.level, 10);
    assert.equal(record.staleSelection.maxHp, record.concurrentAcquisition.maxHp);
    assert.equal(record.staleSelection.hp, record.concurrentAcquisition.hp);
    await screenshot(page, 'lifecycle-candidate-cap');
  });

  if (selectedCase('lifecycle-drive-to-normal')) {
  const normal = await makeCase('lifecycle-drive-to-normal');
  try {
    await freshDrive(normal); await resetDrive(normal.page, 'umbraSeraph', 'medium');
    await normal.page.keyboard.down('ArrowRight'); await normal.page.keyboard.down('Shift'); await normal.page.waitForTimeout(150);
    await release(normal.page);
    normal.record.drive = await snap(normal.page);
    await audit(normal, 'Drive before ordinary navigation');
    const requestCut = normal.record.requests.length, externalCut = normal.record.blockedExternal.length;
    await normal.page.goto(base + '/?mobileGate=0&mobileControls=0');
    await normal.page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene('survival-scene')?.shopActive, null, { timeout: 60000 });
    normal.record.normal = await normal.page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene('survival-scene');
      return { selected: s.getSelectedPlayerMechId(), run: s.getRunPlayerMechId(), released: s.getReleasedPlayerMechIds(),
        verificationContext: s.verificationContext || null, driveActive: Boolean(window.__SURVIVAL_GAME__.scene.isActive('UmbraPhase2ADrive')),
        stats: s.stats, pendingCandidateFlag: s.levelUpCandidatePresentationState?.evasiveFirmwarePresented || false };
    });
    normal.record.normalRequests = normal.record.requests.slice(requestCut);
    normal.record.normalExternalAttempts = normal.record.blockedExternal.slice(externalCut);
    assert.equal(normal.record.normal.selected, 'defaultBear');
    assert.equal(normal.record.normal.run, 'defaultBear');
    assert.equal(normal.record.normal.verificationContext, null);
    assert.equal(normal.record.normal.driveActive, false);
    assert.equal(normal.record.normal.released.includes('umbraSeraph'), false);
    assert.equal(normal.record.normal.pendingCandidateFlag, false);
    assert.equal(normal.record.normalRequests.some(r => /umbra(?:Preview|Drive)|KGK/i.test(decodeURIComponent(r.url))), false);
    assert.equal(normal.record.pageErrors.length, 0);
    await screenshot(normal.page, 'lifecycle-normal-return');
    normal.record.passed = true;
    report.checks.push('Fresh drive-to-normal navigation: default frame, no verification context, no UMBRA asset request. Normal bootstrap external attempts recorded separately and blocked.');
  } catch (error) { normal.record.passed = false; normal.record.failure = error.stack; }
  finally { await normal.context.close(); }
  }
  report.passed = report.cases.every(item => item.passed);
  if (!report.passed) process.exitCode = 1;
})().catch(error => { report.passed = false; report.failure = error.stack; process.exitCode = 1; console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  const reportName = caseFilter.length ? 'drive-lifecycle-supplement-report.json' : 'drive-lifecycle-report.json';
  report.filter = caseFilter;
  fs.writeFileSync(path.join(output, reportName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(c => ({ name: c.name, passed: c.passed, failure: c.failure })), report: path.join(output, reportName) }, null, 2));
});
