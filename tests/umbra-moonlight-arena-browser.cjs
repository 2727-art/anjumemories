const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const project = path.resolve(__dirname, '..');
const out = process.env.UMBRA_TEST_OUTPUT || path.join(project, '.tmp_umbra_phase3', 'output');
fs.mkdirSync(out, { recursive: true });
const reportPath=path.join(out,'arena-ui-validation.json');
if(fs.existsSync(reportPath)) fs.copyFileSync(reportPath,path.join(out,`arena-ui-validation.previous-${Date.now()}.json`));
let browser, report;
(async () => {
  browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  report = { pass: false, external: [], errors: [], sourceHashes: Object.fromEntries(['game.js', 'skillDefinitions.js', 'umbraDrive.js', 'umbraDriveRuntime.js', 'umbraMoonlightArena.js', 'umbraDriveFixtures.js'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(project, name))).digest('hex')])), methodology: 'Fresh context; Storage and external requests blocked; real browser keyboard followed by synthetic Key states with actual Game.step/Arcade fixed60 at controlled60. No production saves. Direct receiver tests are separately labelled and do not claim a geometric MOONLIGHT passage.' };
  await context.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:4173/') ? route.continue() : (report.external.push(route.request().url()), route.abort()));
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.stack));
  await page.addInitScript(() => {
    window.__audit = { storage: 0, probes: 0 };
    for (const method of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) Storage.prototype[method] = function () { window.__audit.storage++; throw Error('Storage blocked'); };
    for (const name of ['localStorage', 'sessionStorage']) Object.defineProperty(window, name, { configurable: true, get() { window.__audit.probes++; throw Error('Storage probe blocked'); } });
  });
  await page.goto('http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1');
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase1Assets')?.status.finished && window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase2ADrive')?.moonlightArena);
  await page.screenshot({ path: path.join(out, 'arena-ui-initial.png') });
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('Shift'); await page.waitForTimeout(750);
  await page.keyboard.up('Shift'); await page.keyboard.up('ArrowRight');
  await page.screenshot({ path: path.join(out, 'arena-ui-keyboard-hit.png') });
  report.keyboard = await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').moonlightArena.getSnapshot());
  report.controlled = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene('UmbraPhase2ADrive'), arena = scene.moonlightArena;
    game.loop.stop(); let timestamp = Math.max(scene.time.now, 1000); const records = [];
    const input = (right = false, dash = false) => {
      for (const key of Object.values(scene.keys)) { key.isDown = false; key.isUp = true; }
      scene.keys.right.isDown = right; scene.keys.right.isUp = !right; scene.keys.dash.isDown = dash; scene.keys.dash.isUp = !dash;
    };
    const step = () => { timestamp += 1000 / 60; game.step(timestamp, 1000 / 60); };
    for (const mode of ['image', 'fallback', 'off']) {
      arena.configId = 'group'; scene.resetDrive('umbraSeraph', 'baseline'); arena.setFxMode(mode);
      input(); for (let i = 0; i < 3; i++) step(); input(true, true);
      let peak = 0, firstFx = null; const frames = new Set();
      for (let i = 0; i < 100; i++) {
        step(); peak = Math.max(peak, arena.effects.length);
        if (!firstFx && arena.effects.length) firstFx = arena.effects[0];
        if (firstFx?.object.scene) frames.add(firstFx.lastFrame);
        if (i === 45) input();
      }
      const diag = scene.getDriveTraceDiagnostics();
      records.push({ mode, peak, frames: [...frames], snapshot: arena.getSnapshot(), A: diag.A?.count, B: diag.B?.count,
        Ahash: diag.A?.hash, Bhash: diag.B?.hash, sourceErrors: diag.source?.consumerErrors });
    }
    arena.configId = 'side'; scene.resetDrive('umbraSeraph', 'baseline'); arena.setFxMode('image');
    const before = scene.getUmbraMoonlightEffectiveStats(); arena.applyPassive('overchargeBolt'); arena.applyPassive('rapidSigil');
    const after = scene.getUmbraMoonlightEffectiveStats();
    const configurations = [];
    for (const config of arena.configurations) { arena.setConfiguration(config.id); step(); configurations.push({ id: config.id, hp: arena.getSnapshot().enemies.map(enemy => enemy.maxHp) }); }
    return { records, passives: { before, after }, configurations };
  });
  report.lifecycle = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, scene = game.scene.getScene('UmbraPhase2ADrive'), arena = scene.moonlightArena;
    let timestamp = scene.time.now, currentStep = 0;
    const input = (right = false, dash = false) => {
      for (const key of Object.values(scene.keys)) { key.isDown = false; key.isUp = true; }
      scene.keys.right.isDown = right; scene.keys.right.isUp = !right; scene.keys.dash.isDown = dash; scene.keys.dash.isUp = !dash;
    };
    const step = (count = 1) => { for (let i = 0; i < count; i++) { timestamp += 1000 / 60; game.step(timestamp, 1000 / 60); currentStep++; } };
    const reset = (config = 'empty', mech = 'umbraSeraph') => { arena.configId = config; scene.resetDrive(mech, 'baseline'); arena.setContactEnabled(false); arena.setFxMode('image'); input(); step(3); };
    const atPlayer = () => arena.spawnEnemy({ x: scene.playerHitbox.body.center.x, y: scene.playerHitbox.body.center.y });
    reset(); let enemy = atPlayer(); const contactBefore = scene.stats.hp; step(10);
    const contactOff = { before: contactBefore, after: scene.stats.hp, ...arena.contact };
    arena.setContactEnabled(true); step(); const contactOn = { hp: scene.stats.hp, invincibleMs: scene.invincibleUntil - scene.time.now, ...arena.contact }; step(10); contactOn.afterTenFrames = scene.stats.hp;
    reset(); arena.setContactEnabled(true); input(true, true); step(2); enemy = atPlayer();
    const evadeBefore = scene.stats.hp, evadeWasActive = scene.isAcEvadeWindowActive(scene.time.now); step();
    const evade = { before: evadeBefore, after: scene.stats.hp, wasActive: evadeWasActive, negated: scene.acMovementState.evadeWindow.negatedDamageCount };
    reset(); const deaths = [];
    // Source receiver/kill/drop dependency coverage; these calls bypass geometry intentionally.
    for (const options of [{typeId:'chaser'}, {typeId:'chaser',isElite:true}, {typeId:'boss_crack',isElite:true,isBoss:true}, {typeId:'gold_slime'}]) {
      enemy = arena.spawnEnemy({...options,x:1000,y:600}); const startHp=enemy.hp, beforeKills=scene.runStats.kills, beforeXp=scene.xpOrbs.getLength();
      let calls=0; while (!enemy.isDying && calls<100) { scene.applyDamageToEnemy(enemy, 4, 0xffffff, null); calls++; }
      scene.applyDamageToEnemy(enemy,4,0xffffff,null);
      deaths.push({options,startHp,calls,dying:enemy.isDying,killDelta:scene.runStats.kills-beforeKills,xpDelta:scene.xpOrbs.getLength()-beforeXp,drops:arena.getSnapshot().drops}); step(12);
    }
    const deathSummary=arena.getSnapshot();
    const specialBosses=[],forbiddenCalls={};
    for(const method of ['markVoidHunterDefeated','grantNemesisBossRewards','saveVoidHunterState','saveRunArchiveState','scheduleCloudSave'])scene[method]=()=>{forbiddenCalls[method]=(forbiddenCalls[method]||0)+1;throw Error(`Forbidden progression ${method}`);};
    for(const kind of ['Nemesis','VoidHunter']) {
      reset();enemy=arena.spawnEnemy({typeId:'boss_crack',isElite:true,isBoss:true,x:700,y:575,kind});
      enemy[`is${kind}Boss`]=true;const before=enemy.hp;input(true,true);step(35);input();
      const passage={before,after:enemy.hp,combat:scene.getUmbraMoonlightSnapshot(),recognized:scene[`is${kind}Boss`](enemy)};
      // Dedicated defeat branch test; damage still passes through real receiver/kill.
      scene.applyDamageToEnemy(enemy,1000,0xffffff,null);
      specialBosses.push({kind,passage,dying:enemy.isDying,blocked:{...arena.blocked},runStats:{...scene.runStats},forbiddenCalls:{...forbiddenCalls}});step(12);
    }
    const finalRaidTargets=[];
    for(const flag of ['isFinalBossRaidBoss','isFinalBossRaidMinion','isFinalBossRaidGiantWeapon']) {
      reset();enemy=arena.spawnEnemy({typeId:'tank',x:700,y:550});enemy[flag]=true;const before=enemy.hp;
      input(true,true);step(35);input();finalRaidTargets.push({flag,before,after:enemy.hp,combat:scene.getUmbraMoonlightSnapshot()});
    }
    reset(); enemy=arena.spawnEnemy({typeId:'tank',x:700,y:550}); enemy.supportDamageHoldUntil=scene.time.now+5000;
    const protectionHp=enemy.hp; scene.applyDamageToEnemy(enemy,4,0xffffff,null);
    input(true,true); step(35); input();
    const protection={before:protectionHp,after:enemy.hp,combat:scene.getUmbraMoonlightSnapshot()};
    reset('side'); input(true,true); let safety=0;
    while (!arena.effects.length && safety++<100) step(); input();
    const fx=arena.effects[0]; const pauseTests=[];
    const sample = () => ({clock:scene.getUmbraMoonlightSnapshot()?.combatTimeMs,age:fx?.age,accepted:scene.getUmbraMoonlightSnapshot()?.counts.accepted,block:scene.getUmbraMoonlightSnapshot()?.blockReason,fxPresent:!!fx?.object.scene});
    for (const kind of ['pause','candidate','raidLoading','raidActive']) {
      const before=sample();
      if(kind==='pause')scene.toggleDrivePause(); else if(kind==='candidate')scene.openCandidateCards(false); else if(kind==='raidLoading')scene.finalBossRaidAssetsLoading=true; else scene.finalBossRaidState={active:true};
      step(30); const held=sample();
      if(kind==='pause')scene.toggleDrivePause(); else if(kind==='candidate')scene.closeCandidateCards(); else if(kind==='raidLoading')scene.finalBossRaidAssetsLoading=false; else scene.finalBossRaidState=null;
      step(2); pauseTests.push({kind,before,held,resumed:sample()});
    }
    const oldRuntime=scene.umbraMoonlightRuntime, oldEnemies=[...arena.enemies.keys()], oldFx=[...arena.effects];
    reset(); const resetState={oldRuntimeDestroyed:oldRuntime.destroyed,oldTargets:oldRuntime.targets.size,oldEnemiesDestroyed:oldEnemies.every(e=>!e.scene),oldFxDestroyed:oldFx.every(f=>!f.object.scene),newAccepted:scene.getUmbraMoonlightSnapshot().counts.accepted};
    const comparisons=[];
    for(const mech of ['defaultBear','regaliaBastion']) {reset('side',mech);input(true,true);step(20);comparisons.push({mech,skills:Object.keys(scene.playerSkills),combat:scene.getUmbraMoonlightSnapshot()});}
    reset(); const applied=scene.applyDamageToPlayer(1000,{source:'arenaReceiverTest'}); const apZero={ap:scene.stats.hp,applied,paused:scene.drivePaused,worldPaused:scene.physics.world.isPaused,gameOver:scene.gameOver};
    reset('group'); input(true,true);step(20); const beforeExit={runtime:scene.umbraMoonlightRuntime,arena,fx:[...arena.effects],enemies:[...arena.enemies.keys()]};
    scene.scene.start('UmbraPhase1Stopped'); step(2);
    const exit={arenaCleared:scene.moonlightArena===null,contextCleared:scene.verificationContext===null,runtimeDestroyed:beforeExit.runtime.destroyed,targets:beforeExit.runtime.targets.size,fxDestroyed:beforeExit.fx.every(f=>!f.object.scene),enemiesDestroyed:beforeExit.enemies.every(e=>!e.scene),callbackCleared:scene.onUmbraMoonlightAcceptedHit===null};
    return {contactOff,contactOn,evade,deaths,deathSummary,specialBosses,finalRaidTargets,forbiddenCalls,protection,pauseTests,resetState,comparisons,apZero,exit,steps:currentStep};
  });
  report.isolation = await page.evaluate(() => window.__audit);
  const missingContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  const missing = { blockedImages: 0, external: [], errors: [] };
  await missingContext.route('**/*', route => {
    const url = route.request().url();
    if (!url.startsWith('http://127.0.0.1:4173/')) { missing.external.push(url); return route.abort(); }
    if (decodeURIComponent(url).includes('/skilleffect/MOONLIGHT.png')) { missing.blockedImages++; return route.fulfill({status:404,body:'Intentional missing image test'}); }
    return route.continue();
  });
  const missingPage=await missingContext.newPage(); missingPage.on('pageerror', error=>missing.errors.push(error.stack));
  await missingPage.addInitScript(() => {
    window.__audit={storage:0,probes:0};
    for(const method of ['getItem','setItem','removeItem','clear','key']) Storage.prototype[method]=function(){window.__audit.storage++;throw Error('Storage blocked');};
    for(const name of ['localStorage','sessionStorage']) Object.defineProperty(window,name,{configurable:true,get(){window.__audit.probes++;throw Error('Storage probe blocked');}});
  });
  await missingPage.goto('http://127.0.0.1:4173/?umbraPreview=1&umbraDrive=1&umbraMoonlight=1');
  await missingPage.waitForFunction(()=>window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase1Assets')?.status.finished&&window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase2ADrive')?.moonlightArena);
  missing.result=await missingPage.evaluate(()=>{
    const game=window.__SURVIVAL_GAME__,scene=game.scene.getScene('UmbraPhase2ADrive'),arena=scene.moonlightArena;
    game.loop.stop();arena.configId='group';scene.resetDrive('umbraSeraph','baseline');let timestamp=scene.time.now,peak=0;
    const step=()=>{timestamp+=1000/60;game.step(timestamp,1000/60);peak=Math.max(peak,arena.effects.length);};
    for(let i=0;i<3;i++)step();scene.keys.right.isDown=true;scene.keys.right.isUp=false;scene.keys.dash.isDown=true;scene.keys.dash.isUp=false;
    for(let i=0;i<42;i++)step();
    return {peak,snapshot:arena.getSnapshot(),onlyGraphics:arena.effects.every(fx=>!fx.image),isolation:window.__audit};
  });
  await missingPage.screenshot({path:path.join(out,'arena-ui-missing-image-fallback.png')});
  report.missingImage=missing; await missingContext.close();
  console.log(JSON.stringify({ external: report.external, errors: report.errors, keyboard: report.keyboard.combat?.counts,
    controlled: report.controlled.records.map(result => ({ mode: result.mode, peak: result.peak, frames: result.frames,
      counts: result.snapshot.combat?.counts, error: result.snapshot.combat?.lastError, A: result.A, B: result.B,
      equal: result.Ahash === result.Bhash })), passives: report.controlled.passives, configurations: report.controlled.configurations, isolation: report.isolation }, null, 2));
  assert.equal(report.external.length, 0); assert.equal(report.errors.length, 0); assert.equal(report.isolation.storage, 0);
  for (const result of report.controlled.records) { assert.equal(result.snapshot.combat.errors, 0); assert.equal(result.Ahash, result.Bhash); assert.equal(result.snapshot.combat.counts.accepted, 16); }
  assert.deepEqual(report.controlled.records[0].frames, [0,1,2,3,4,5,6,7]);
  assert.equal(report.controlled.records[0].peak, 12);
  assert.equal(report.lifecycle.contactOff.after,40); assert.equal(report.lifecycle.contactOn.hp,27); assert.equal(report.lifecycle.contactOn.afterTenFrames,27);
  assert.equal(report.lifecycle.evade.wasActive,true); assert.equal(report.lifecycle.evade.before,report.lifecycle.evade.after); assert.ok(report.lifecycle.evade.negated>=1);
  report.lifecycle.deaths.forEach(result=>{assert.equal(result.killDelta,1);assert.equal(result.xpDelta,1);assert.equal(result.dying,true);});
  assert.equal(report.lifecycle.protection.before,report.lifecycle.protection.after); assert.equal(report.lifecycle.protection.combat.counts.accepted,0);
  report.lifecycle.pauseTests.forEach(result=>{assert.equal(result.before.clock,result.held.clock,result.kind);assert.equal(result.before.age,result.held.age,result.kind);assert.equal(result.before.accepted,result.held.accepted,result.kind);});
  for(const [key,value] of Object.entries(report.lifecycle.resetState)) assert.ok(key==='oldTargets'||key==='newAccepted'?value===0:value,key);
  report.lifecycle.comparisons.forEach(result=>{assert.deepEqual(result.skills,[]);assert.ok(!result.combat?.enabled);});
  assert.deepEqual(report.lifecycle.apZero,{ap:0,applied:true,paused:true,worldPaused:true,gameOver:true});
  for(const [key,value] of Object.entries(report.lifecycle.exit)) assert.ok(key==='targets'?value===0:value,key);
  assert.ok(report.lifecycle.deathSummary.drops.some(drop=>drop.category==='value'&&drop.xp===38&&drop.geek===3000));
  for(const result of report.lifecycle.specialBosses){assert.equal(result.passage.recognized,true);assert.equal(result.passage.before-result.passage.after,4);assert.equal(result.passage.combat.counts.accepted,1);assert.equal(result.passage.combat.errors,0);assert.equal(result.blocked[`handle${result.kind==='VoidHunter'?'VoidHunter':'NemesisBoss'}Defeated`],1);assert.equal(result.dying,true);assert.deepEqual(result.forbiddenCalls,{});}
  for(const result of report.lifecycle.finalRaidTargets){assert.equal(result.before,result.after);assert.equal(result.combat.counts.attempts,0);assert.ok(result.combat.skips.TARGET_FINAL_RAID>0);}
  assert.deepEqual(report.lifecycle.forbiddenCalls,{});
  assert.equal(missing.blockedImages,1);assert.deepEqual(missing.external,[]);assert.deepEqual(missing.errors,[]);assert.equal(missing.result.isolation.storage,0);
  assert.equal(missing.result.snapshot.combat.counts.accepted,16);assert.equal(missing.result.snapshot.combat.counts.hpDamage,64);assert.equal(missing.result.snapshot.combat.errors,0);
  assert.equal(missing.result.peak,12);assert.equal(missing.result.onlyGraphics,true);assert.equal(missing.result.snapshot.fx.fallback,12);
  report.pass=true;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  console.log('MOONLIGHT arena UI / receiver / FX / lifecycle PASS');
})().catch(error => { console.error(error);process.exitCode=1;report={...report,pass:false,error:error.stack||String(error)};fs.writeFileSync(reportPath,JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,`arena-ui-validation.failed-${Date.now()}.json`),JSON.stringify(report,null,2)); }).finally(async () => { if (browser) await browser.close(); });
