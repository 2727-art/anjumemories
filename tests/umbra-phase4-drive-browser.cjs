// Phase 4: unmodified old rAF assertions with all source bytes frozen for explicit baseline comparison.
// Uses an already installed Playwright runtime. No dependency installation required.
// Every run creates fresh browser contexts; no user's profile or save is opened.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.UMBRA_TEST_URL || 'http://127.0.0.1:4173';
const output = process.env.UMBRA_TEST_OUTPUT || path.join(__dirname, '..', '.tmp_umbra_phase1');
fs.mkdirSync(output, { recursive: true });
const sourceRoot = process.env.UMBRA_TEST_SOURCE_ROOT || path.resolve(__dirname, '..');
const crypto = require('node:crypto');
const sourceNames = ['index.html','game.js','skillDefinitions.js','stageDefinitions.js','equipmentDefinitions.js','umbraDrive.js','umbraDriveRuntime.js','umbraDriveFixtures.js','umbraMoonlightArena.js','umbraPreview.js','umbraPreviewAssets.js'];
const frozen = Object.fromEntries(sourceNames.map(n => [n, fs.readFileSync(path.join(sourceRoot,n))]));
const report = { base, sourceRoot, sources: Object.fromEntries(sourceNames.map(n => [n,crypto.createHash('sha256').update(frozen[n]).digest('hex')])), checks: [], cases: [] };
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
    const sourceName = decoded === '/' ? 'index.html' : decoded.slice(1);
    if (frozen[sourceName]) return route.fulfill({status:200,body:frozen[sourceName],contentType:sourceName.endsWith('.html')?'text/html':'application/javascript'});
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

(async () => {
  browser = await chromium.launch({ headless: true, ...(process.env.UMBRA_TEST_BROWSER ? { executablePath: process.env.UMBRA_TEST_BROWSER } : {}) });
  const main = await makeCase('drive-input-stats-isolation');
  await main.page.goto(base + '/?umbraPreview=1&umbraDrive=1&debugPlayerMech=umbraSeraph&debugCommsStoryReset=1');
  await waitDrive(main.page);
  report.measurements = [];
  for (const fixture of ['baseline', 'medium', 'deep']) {
    for (const mech of ['defaultBear', 'regaliaBastion', 'umbraSeraph']) {
      await reset(main.page, mech, fixture);
      const initial = await main.page.evaluate(`${drive}.umbraDriveFixtureSummary`);
      const normal = await pressFor(main.page, ['ArrowRight'], 1300);
      await reset(main.page, mech, fixture);
      const boost = await pressFor(main.page, ['ArrowRight', 'Shift'], 600);
      await main.page.waitForTimeout(750);
      const release = await sample(main.page);
      report.measurements.push({ fixture, mech, initial, input: 'right 1300ms; fresh reset right+SHIFT 600ms; release all 750ms', normal, boost, release });
      assert.ok(normal.speed > 0 && Number.isFinite(boost.speed), mech + '/' + fixture + ': invalid physics speed');
      assert.ok(normal.x > 350 && boost.x > 350, 'Physics body did not move');
      assert.equal(release.invulnerable, false);
      assert.ok(initial.hubMaxHp === initial.startingStats.maxHp, 'HUB AP differs from starting stats');
    }
    const rows = report.measurements.filter(r => r.fixture === fixture);
    const standard = rows.find(r => r.mech === 'defaultBear'), umbra = rows.find(r => r.mech === 'umbraSeraph');
    assert.ok(Math.abs(umbra.normal.speed / standard.normal.speed - 1.3) < 0.02, fixture + ': move ratio');
    assert.ok(Math.abs(umbra.boost.allowedSpeed / standard.boost.allowedSpeed - 1.4) < 0.02, fixture + ': boost cap ratio');
  }
  report.checks.push('9 same-fixture comparisons: actual keyboard/body motion, AP HUB parity, normal 1.30 and boost cap 1.40 within rounding');
  await reset(main.page);
  report.reinforce = await main.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
    s.stats.hp = 7; const before = { ...s.stats }; s.applyDriveApUpgrade(); return { before, after: { ...s.stats }, result: s.lastApUpgrade };
  });
  assert.equal(report.reinforce.after.maxHp - report.reinforce.before.maxHp, 8);
  assert.equal(report.reinforce.after.hp, 15);
  await main.page.evaluate(`${drive}.openCandidateCards(false)`); await tick(main.page);
  report.candidates = await main.page.evaluate(`({ids:${drive}.candidateChoices.map(c=>c.id),state:${drive}.levelUpCandidatePresentationState})`);
  assert.equal(report.candidates.ids.length, 3);
  assert.ok(report.candidates.ids.includes('evasiveFirmware'));
  assert.equal(new Set(report.candidates.ids).size, 3);
  assert.equal(report.candidates.state.evasiveFirmwarePresented, true);
  await screenshot(main.page, 'drive-candidates');
  await main.page.keyboard.press('Escape');
  await main.page.evaluate(`${drive}.openCandidateCards(true)`); await tick(main.page);
  assert.equal(await main.page.evaluate(`${drive}.candidateChoices.some(c=>c.id==='evasiveFirmware')`), false);
  await main.page.keyboard.press('Escape');

  await reset(main.page);
  await main.page.evaluate(`${drive}.playerHitbox.body.reset(1520, 1000)`);
  report.wall = await pressFor(main.page, ['ArrowRight', 'Shift'], 1100);
  assert.ok(report.wall.x <= 1643.01, 'Wall penetrated');
  assert.ok(await main.page.evaluate(`${drive}.collisionCount > 0`));
  await reset(main.page);
  await main.page.evaluate(`${drive}.playerHitbox.body.reset(1840, 1250)`);
  report.corner = await pressFor(main.page, ['ArrowLeft', 'ArrowDown', 'Shift'], 1100);
  assert.ok(report.corner.x >= 1756.9 && report.corner.y <= 1333.1, 'Inner corner penetrated');
  report.cornerEscape = await pressFor(main.page, ['ArrowUp', 'ArrowRight'], 700);
  assert.ok(report.cornerEscape.y < report.corner.y, 'Cannot move out of corner');

  await reset(main.page);
  await main.page.keyboard.down('ArrowRight'); await main.page.keyboard.down('Shift');
  await main.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').isAcFullOverheatActive(), null, { timeout: 20000 });
  report.overheat = await sample(main.page);
  assert.equal(report.overheat.invulnerable, false);
  await main.page.keyboard.up('ArrowRight');
  await main.page.waitForTimeout(300);
  await main.page.evaluate(`${drive}.toggleDrivePause()`);
  const paused = await sample(main.page);
  await main.page.waitForTimeout(650);
  const pausedEnd = await sample(main.page);
  assert.equal(pausedEnd.en, paused.en, 'Paused EN changed');
  assert.equal(pausedEnd.fullOverheat, true, 'Pause cleared overheat');
  await main.page.evaluate(`${drive}.toggleDrivePause()`);
  await main.page.keyboard.up('Shift');
  await main.page.waitForFunction(() => { const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');return s.stats.stamina >= s.stats.maxStamina - 0.01 && !s.isAcFullOverheatActive(); }, null, { timeout: 20000 });
  report.recovered = await sample(main.page);
  report.overheatTransitions = await main.page.evaluate(`${drive}.transitions`);
  assert.equal(report.recovered.invulnerable, false);

  await reset(main.page);
  for(let i=0;i<8;i++) { await pressFor(main.page,['ArrowRight','Shift'],80); await main.page.waitForTimeout(120); }
  report.repeatedTaps = await main.page.evaluate(`({samples:${drive}.samples,transitions:${drive}.transitions})`);
  assert.ok(report.repeatedTaps.transitions.some(x=>x.invulnerable));
  assert.equal((await sample(main.page)).invulnerable, false);

  await reset(main.page);
  const canvas = await main.page.locator('canvas').boundingBox();
  const point=(x,y)=>({x:canvas.x+x/1280*canvas.width,y:canvas.y+y/720*canvas.height});
  const touchStart=point(88,638),touchEnd=point(123,638);
  await main.page.mouse.move(touchStart.x,touchStart.y); await main.page.mouse.down(); await main.page.mouse.move(touchEnd.x,touchEnd.y); await main.page.waitForTimeout(500); await main.page.mouse.up();
  report.touchMouseSimulation = await sample(main.page);
  assert.ok(report.touchMouseSimulation.x > 350, 'Pointer joystick did not reach original input aggregator');
  await reset(main.page);
  await main.page.evaluate(() => {
    const pad = { connected:true,index:0,id:'Synthetic pad',axes:[1,0],buttons:Array.from({length:18},()=>({pressed:false,value:0})) };
    pad.buttons[0]={pressed:true,value:1};
    window.__driveSyntheticPad=pad;
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[window.__driveSyntheticPad]});
  });
  await main.page.waitForTimeout(500);
  report.gamepadSimulation = await sample(main.page);
  assert.ok(report.gamepadSimulation.x > 350, 'Synthetic gamepad did not reach original input aggregator');
  await main.page.evaluate(() => { window.__driveSyntheticPad=null; });
  await reset(main.page);
  await screenshot(main.page, 'drive-overview');
  await audit(main, 'Phase 2A drive controls, candidates, wall/corner, EN/overheat and pause');

  const cleanup = await main.page.evaluate(() => {
    const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');
    s.scene.start('UmbraPhase1Stopped'); return true;
  });
  await tick(main.page);
  report.cleanup = await main.page.evaluate(() => {
    const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive'),g=window.__SURVIVAL_GAME__;
    return { signal:g.events.listenerCount('umbra-phase1-assets-changed'),keydown:s.input.keyboard.listenerCount('keydown'),timers:['_active','_pendingInsertion','_pendingRemoval'].reduce((n,key)=>n+(s.time[key]?.length||0),0),tweens:s.tweens.getTweens().length,context:s.verificationContext };
  });
  assert.deepEqual(report.cleanup, {signal:0,keydown:0,timers:0,tweens:0,context:null});
  await audit(main, 'Drive exit cleanup');
  await main.context.close();

  report.frameRates = [];
  for (const fps of [30,60,120]) {
    const item=await makeCase('drive-clock-'+fps);
    await item.page.goto(base+`/?umbraPreview=1&umbraDrive=1&driveFps=${fps}`); await waitDrive(item.page); await reset(item.page);
    const before=await sample(item.page), result=await pressFor(item.page,['ArrowRight','Shift'],1700);
    const elapsed=result.at-before.at;
    report.frameRates.push({targetFps:fps,condition:'Browser Phaser Game TimeStep setTimeout target; Arcade fixedStep default 60 Hz; actual ordering unchanged',sceneHz:(result.updates-before.updates)*1000/elapsed,physicsHz:(result.physicsSteps-before.physicsSteps)*1000/elapsed,renderHz:(result.renderFrames-before.renderFrames)*1000/elapsed,elapsed,before,result});
    assert.ok(Number.isFinite(result.speed) && result.x > 350); assert.ok(result.en >= 0);
    await audit(item,'Browser configured clock '+fps); await item.context.close();
  }
  report.passed=true;
})().catch(error=>{report.passed=false;report.failure=error.stack;process.exitCode=1;console.error(error);}).finally(async()=>{
  if(browser)await browser.close();
  fs.writeFileSync(path.join(output,'drive-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,checks:report.checks,failure:report.failure||null,report:path.join(output,'drive-report.json')},null,2));
});
