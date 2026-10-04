/* Fresh isolated Phaser contexts. No dependencies are installed by this test. */
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const project = path.resolve(__dirname, '..'), origin = process.env.UMBRA_TEST_ORIGIN || 'http://127.0.0.1:4173';
const out = process.env.UMBRA_TEST_OUTPUT || path.join(project, '.tmp_umbra_phase4', 'output');
fs.mkdirSync(out, { recursive: true });
const names = ['index.html','game.js','skillDefinitions.js','stageDefinitions.js','equipmentDefinitions.js','umbraDrive.js','umbraDriveRuntime.js','umbraDriveFixtures.js','umbraMoonlightArena.js','umbraPreview.js','umbraPreviewAssets.js'];
const frozen = Object.fromEntries(names.map(name => [name,fs.readFileSync(path.join(project,name))]));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const report = { pass:false, sourceHashes:Object.fromEntries(names.map(name=>[name,hash(frozen[name])])), methodology:'Every local source request is fulfilled from one immutable in-memory snapshot. Fresh Chromium contexts; real Phaser Game.step and fixed 60Hz Arcade, synthetic Key states identified separately from rAF keyboard. Storage data APIs and external requests blocked. No existing save/profile.' };
const reportPath=path.join(out,'bloodspike-arena-report.json');
if(fs.existsSync(reportPath))fs.copyFileSync(reportPath,path.join(out,`bloodspike-arena-previous-${Date.now()}.json`));
let browser;
async function openArena(query, missing=false) {
  const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'});
  const audit={external:[],errors:[],missingImages:0,requests:[]};
  await context.route('**/*',route=>{
    const url=route.request().url();audit.requests.push(url);
    if(!url.startsWith(origin+'/')){audit.external.push(url);return route.abort();}
    const leaf=decodeURIComponent(new URL(url).pathname).split('/').pop()||'index.html';
    if(missing&&leaf==='bloodspike.png'){audit.missingImages++;return route.fulfill({status:404,body:'Intentional SPIKE image omission'});}
    if(frozen[leaf])return route.fulfill({status:200,body:frozen[leaf],contentType:leaf.endsWith('.html')?'text/html':'application/javascript'});
    return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',error=>audit.errors.push(error.stack));
  await page.addInitScript(()=>{
    window.__arenaIsolation={storage:0,probes:0,entryCalls:[],installedEntries:[]};
    window.__arenaTiming={raf:[],longTasks:[]};let lastFrame=null;
    const sample=t=>{if(lastFrame!==null&&window.__arenaTiming.raf.length<600)window.__arenaTiming.raf.push({at:t,delta:t-lastFrame});lastFrame=t;if(window.__arenaTiming.raf.length<600)requestAnimationFrame(sample);};requestAnimationFrame(sample);
    try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(window.__arenaTiming.longTasks.length<128)window.__arenaTiming.longTasks.push({start:entry.startTime,duration:entry.duration});}).observe({type:'longtask',buffered:true});}catch{}
    for(const name of ['getItem','setItem','removeItem','clear','key'])Storage.prototype[name]=function(){window.__arenaIsolation.storage++;throw Error('Storage data API blocked');};
    for(const name of ['localStorage','sessionStorage'])Object.defineProperty(window,name,{configurable:true,get(){window.__arenaIsolation.probes++;throw Error('Storage capability probe blocked');}});
    window.addEventListener('load',()=>{
      for(const name of ['init','preload','create','createState','initializeCloudSaveRuntime','beginCloudSaveBootstrap','getFirebaseLeaderboardClient','addKillRankingEntry','scheduleCloudSave']){
        if(typeof SurvivalScene.prototype[name]!=='function')continue;
        window.__arenaIsolation.installedEntries.push(name);SurvivalScene.prototype[name]=function(){window.__arenaIsolation.entryCalls.push(name);throw Error(`Normal/save/auth/ranking entry blocked: ${name}`);};
      }
    },{once:true});
  });
  await page.goto(`${origin}/?umbraPreview=1&umbraDrive=1&${query}`);
  await page.waitForFunction(()=>window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase1Assets')?.status.finished&&window.__SURVIVAL_GAME__?.scene.getScene('UmbraPhase2ADrive')?.moonlightArena);
  audit.startup=await page.evaluate(()=>({snapshot:window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').moonlightArena.getSnapshot(),timing:window.__arenaTiming}));
  return {context,page,audit};
}
async function controlled(page) {
  return page.evaluate(()=>{
    const game=window.__SURVIVAL_GAME__,scene=game.scene.getScene('UmbraPhase2ADrive'),arena=scene.moonlightArena;
    game.loop.stop();scene.physics.world.fixedStep=true;scene.physics.world.setFPS(60);scene.physics.world._elapsed=0;
    let timestamp=scene.time.now, frame=0;
    const input=(right=false,dash=false)=>{for(const key of Object.values(scene.keys)){key.isDown=false;key.isUp=true;}scene.keys.right.isDown=right;scene.keys.right.isUp=!right;scene.keys.dash.isDown=dash;scene.keys.dash.isUp=!dash;};
    const step=(n=1)=>{for(let i=0;i<n;i++){timestamp+=1000/60;game.step(timestamp,1000/60);frame++;}};
    const reset=(selection='bloodSpike',config='empty',mode='image')=>{arena.weaponSelection=selection;arena.configId=config;arena.attackEnabled=true;arena.spikeAttackEnabled=true;scene.resetDrive('umbraSeraph','baseline');arena.setFxMode(mode);input();};
    const modes=[];
    for(const mode of ['image','fallback','off']){
      reset('bloodSpike','group',mode);const frames=new Set(),samples=[];let firstFx=null,peak=0;
      for(let i=0;i<55;i++){step();const snap=arena.getSnapshot();peak=Math.max(peak,snap.spikeFx.visible);firstFx ||= arena.spikeEffects.values().next().value;if(firstFx&&arena.spikeEffects.has(firstFx.castId))frames.add(firstFx.lastFrame);samples.push({frame:i,clock:snap.spike.combatTimeMs,casts:snap.spike.casts,fx:[...arena.spikeEffects.values()].map(fx=>({castId:fx.castId,frame:fx.lastFrame,age:fx.age,x:fx.x,y:fx.y,scaleX:fx.object?.scaleX,scaleY:fx.object?.scaleY,originX:fx.object?.originX,originY:fx.object?.originY,body:!!fx.object?.body}))});}
      modes.push({mode,peak,frames:[...frames],samples,snapshot:arena.getSnapshot(),trace:scene.getDriveTraceDiagnostics()});
    }
    const configurations=[];
    for(const config of arena.configurations){reset('bloodSpike',config.id);step(54);configurations.push({id:config.id,snapshot:arena.getSnapshot()});}
    const selections=[];
    for(const selection of ['bloodSpike','moonlight','both','none']){reset(selection,'spike_single');step(18);selections.push({selection,skills:Object.keys(scene.playerSkills),snapshot:arena.getSnapshot(),passives:scene.getPassiveUpgradeChoices().filter(c=>['rapidSigil','overchargeBolt'].includes(c.id)).map(c=>({id:c.id,description:c.description}))});}
    reset('both','boss');step(5);const pause=[];
    const measure=()=>({spikeClock:scene.getUmbraBloodSpikeSnapshot().combatTimeMs,moonClock:scene.getUmbraMoonlightSnapshot()?.combatTimeMs,casts:scene.getUmbraBloodSpikeSnapshot().casts.map(c=>({id:c.castId,at:c.createdCombatTimeMs,impact:c.appliedAtMs})),fx:[...arena.spikeEffects.values()].map(f=>({id:f.castId,age:f.age,frame:f.lastFrame}))});
    for(const kind of ['pause','candidate','hidden','raidLoading','raidActive']){
      const before=measure();if(kind==='pause')scene.toggleDrivePause();else if(kind==='candidate')scene.openCandidateCards(false);else if(kind==='hidden')scene.driveHidden=true;else if(kind==='raidLoading')scene.finalBossRaidAssetsLoading=true;else scene.finalBossRaidState={active:true};
      step(30);const during=measure();if(kind==='pause')scene.toggleDrivePause();else if(kind==='candidate')scene.closeCandidateCards();else if(kind==='hidden')scene.driveHidden=false;else if(kind==='raidLoading')scene.finalBossRaidAssetsLoading=false;else scene.finalBossRaidState=null;step(2);pause.push({kind,before,during,after:measure()});
    }
    reset('both','spike_moonlight_first');step(3);input(true,true);let wait=0;while(!arena.effects.length&&wait++<40)step();input();
    const moonFx=[...arena.effects], moonRuntime=scene.umbraMoonlightRuntime, moonBefore=scene.getUmbraMoonlightSnapshot();
    scene.destroyUmbraBloodSpikeRuntime('TEST_SINGLE_WEAPON_DESTROY');
    const destroySpike={hadMoonFx:moonFx.length,moonFxAlive:moonFx.every(fx=>!!fx.object.scene),moonRuntimeSame:moonRuntime===scene.umbraMoonlightRuntime,moonCountsBefore:moonBefore?.counts,moonCountsAfter:scene.getUmbraMoonlightSnapshot()?.counts,spikeFx:arena.spikeEffects.size};
    step(3);
    reset('both','boss');step(5);const spikeRuntime=scene.umbraBloodSpikeRuntime, spikeBefore=scene.getUmbraBloodSpikeSnapshot();scene.destroyUmbraMoonlightRuntime('TEST_OTHER_WEAPON_DESTROY');step(12);
    const destroyMoon={sameSpikeRuntime:spikeRuntime===scene.umbraBloodSpikeRuntime,before:spikeBefore,after:scene.getUmbraBloodSpikeSnapshot(),spikeFx:arena.spikeEffects.size};
    reset('bloodSpike','empty');step(3);const body=scene.playerHitbox.body;arena.spawnEnemy({typeId:'chaser',x:body.center.x,y:body.center.y});step(1);const offHp=scene.stats.hp;
    arena.setContactEnabled(true);step(1);const contact={offHp,onHp:scene.stats.hp,invincibleMs:scene.invincibleUntil-scene.time.now};
    reset('both','boss');step(5);const oldRuntime=scene.umbraBloodSpikeRuntime,oldFx=[...arena.spikeEffects.values()],oldEnemies=[...arena.enemies.keys()];scene.resetDrive();
    const resetResult={runtimeDestroyed:oldRuntime.destroyed,oldCasts:oldRuntime.casts.length,oldTargets:oldRuntime.targets.size,fxDestroyed:oldFx.every(f=>!f.object?.scene),enemiesDestroyed:oldEnemies.every(e=>!e.scene),newCasts:scene.getUmbraBloodSpikeSnapshot().casts.length};
    const standard=[];for(const mech of ['defaultBear','regaliaBastion']){scene.resetDrive(mech,'baseline');step(10);standard.push({mech,skills:Object.keys(scene.playerSkills),spike:scene.getUmbraBloodSpikeSnapshot(),moon:scene.getUmbraMoonlightSnapshot()});}
    scene.resetDrive('umbraSeraph','baseline');step(5);const leaving=scene.umbraBloodSpikeRuntime,leavingFx=[...arena.spikeEffects.values()];scene.scene.start('UmbraPhase1Stopped');step(2);
    const exit={arenaCleared:scene.moonlightArena===null,runtimeDestroyed:leaving.destroyed,casts:leaving.casts.length,targets:leaving.targets.size,fxDestroyed:leavingFx.every(f=>!f.object?.scene),callbackCleared:scene.onUmbraBloodSpikeRuntimeCleared===null,contextCleared:scene.verificationContext===null};
    return {modes,configurations,selections,pause,destroySpike,destroyMoon,contact,resetResult,standard,exit,frames:frame,frameMetadata:window.umbraPreviewAssets.effects.umbraBloodSpike.frames,isolation:window.__arenaIsolation};
  });
}
(async()=>{
  const manifestPath=path.join(project,'.tmp_umbra_phase4','final-sources.json');
  if(fs.existsSync(manifestPath)){report.finalManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')).sources;assert.deepEqual(report.sourceHashes,report.finalManifest);report.finalManifestMatched=true;}
  browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});
  const both=await openArena('umbraMoonlight=1&umbraBloodSpike=1');
  await both.page.screenshot({path:path.join(out,'bloodspike-arena-initial.png')});
  await both.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');s.moonlightArena.configId='spike_moonlight_first';s.resetDrive('umbraSeraph','baseline');window.__rafInput=[{action:'reset',at:performance.now()}];});
  await both.page.keyboard.down('ArrowRight');await both.page.keyboard.down('Shift');
  await both.page.evaluate(()=>window.__rafInput.push({action:'keyboard down complete',at:performance.now()}));await both.page.waitForTimeout(420);
  await both.page.keyboard.up('Shift');await both.page.keyboard.up('ArrowRight');
  await both.page.screenshot({path:path.join(out,'bloodspike-arena-raf-both.png')});
  report.raf=await both.page.evaluate(()=>({input:window.__rafInput.concat([{action:'keyboard released; screenshot complete',at:performance.now()}]),snapshot:window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').moonlightArena.getSnapshot(),timing:window.__arenaTiming}));
  // Card rendering uses the actual choice objects/onSelect. Restrict only the
  // candidate list for this screenshot, so both long descriptions are visible.
  report.cardLayout=await both.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');s.moonlightArena.configId='empty';s.resetDrive();const original=s.buildLevelUpUpgradeChoices;s.buildLevelUpUpgradeChoices=()=>s.getPassiveUpgradeChoices().filter(c=>['overchargeBolt','rapidSigil','vitalBloom'].includes(c.id));s.openCandidateCards(false);s.buildLevelUpUpgradeChoices=original;return {method:'Actual passive choices with an explicitly fixed visual-test candidate list; not a probability test',choices:s.candidateChoices.map(c=>({id:c.id,description:c.description,chipLabel:c.chipLabel})),text:s.selectionObjects.filter(o=>o.type==='Text').map(o=>({text:o.text,x:o.x,y:o.y,width:o.width,height:o.height}))};});
  await both.page.screenshot({path:path.join(out,'bloodspike-arena-both-candidates.png')});await both.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive').closeCandidateCards());
  report.controlled=await controlled(both.page);report.audit=both.audit;await both.context.close();
  report.entries=[];
  for(const [name,query,missing] of [['spike','umbraBloodSpike=1',false],['both','umbraMoonlight=1&umbraBloodSpike=1',false],['notifyOff','umbraMoonlight=1&umbraBloodSpike=1&umbraTraceNotify=0',false],['missingImage','umbraBloodSpike=1',true]]){
    const {context,page,audit}=await openArena(query,missing);
    const result=await page.evaluate(()=>{const game=window.__SURVIVAL_GAME__,s=game.scene.getScene('UmbraPhase2ADrive'),a=s.moonlightArena;game.loop.stop();a.configId='spike_single';s.resetDrive('umbraSeraph','baseline');let t=s.time.now;const samples=[];for(let i=0;i<30;i++){t+=1000/60;game.step(t,1000/60);samples.push({cast:s.getUmbraBloodSpikeSnapshot().casts,fx:[...a.spikeEffects.values()].map(f=>({frame:f.lastFrame,image:f.image,body:!!f.object?.body,scaleX:f.object?.scaleX,scaleY:f.object?.scaleY,originX:f.object?.originX,originY:f.object?.originY}))});}return {snapshot:a.getSnapshot(),samples,skills:Object.keys(s.playerSkills),isolation:window.__arenaIsolation};});
    await page.screenshot({path:path.join(out,`bloodspike-arena-${name}.png`)});report.entries.push({name,result,audit});
    if(name==='spike'){
      report.frameScreens=[];await page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene('UmbraPhase2ADrive');s.moonlightArena.configId='spike_single';s.resetDrive();window.__spikeFrameTime=s.time.now;});
      for(let frameIndex=0;frameIndex<8;frameIndex++){
        const sample=await page.evaluate(target=>{const game=window.__SURVIVAL_GAME__,s=game.scene.getScene('UmbraPhase2ADrive');let guard=0;while((s.getUmbraBloodSpikeSnapshot().casts[0]?.frameIndex??-1)<target&&guard++<12){window.__spikeFrameTime+=1000/60;game.step(window.__spikeFrameTime,1000/60);}return {cast:s.getUmbraBloodSpikeSnapshot().casts[0],fx:[...s.moonlightArena.spikeEffects.values()].map(f=>({frame:f.lastFrame,x:f.x,y:f.y}))};},frameIndex);
        const file=`bloodspike-frame-${frameIndex+1}.png`;await page.screenshot({path:path.join(out,file)});report.frameScreens.push({file,...sample});
      }
    }
    await context.close();
  }
  assert.deepEqual(report.audit.errors,[]);assert.deepEqual(report.audit.external,[]);assert.equal(report.controlled.isolation.storage,0);
  assert.equal(report.raf.snapshot.spike.counts.impacts,1);assert.equal(report.raf.snapshot.combat.counts.accepted,1);assert.equal(report.raf.snapshot.runStats.kills,1);
  assert.deepEqual(report.cardLayout.choices.map(c=>c.id).sort(),['overchargeBolt','rapidSigil','vitalBloom'].sort());
  for(const entry of report.cardLayout.text.filter(t=>t.y===335))assert.ok(entry.y+entry.height<466,`Candidate description overlaps chip: ${entry.text}`);
  assert.deepEqual(report.controlled.isolation.entryCalls,[]);assert.equal(report.controlled.isolation.installedEntries.length,9);
  for(const m of report.controlled.modes){assert.equal(m.snapshot.spike.errors,0);assert.equal(m.snapshot.spike.counts.casts,1);assert.equal(m.snapshot.spike.counts.accepted,16);assert.equal(m.snapshot.spike.counts.hpDelta,80);assert.equal(m.snapshot.spike.counts.effectiveHealthLoss,48);assert.deepEqual(m.frames,[0,1,2,3,4,5,6,7]);assert.equal(m.peak,m.mode==='off'?0:1);assert.equal(m.trace.A.hash,m.trace.B.hash);
    if(m.mode==='image')for(const sample of m.samples)for(const fx of sample.fx){assert.equal(fx.body,false);assert.ok(Math.abs(fx.scaleX-.38*2172/2048)<1e-12);assert.ok(Math.abs(fx.scaleY-.38*724/682)<1e-12);const c=sample.casts.find(c=>c.castId===fx.castId);assert.equal(fx.frame,c.frameIndex);assert.equal(fx.x,c.position.x);assert.equal(fx.y,c.position.y);assert.equal(fx.originX,report.controlled.frameMetadata[fx.frame].origin.x);assert.equal(fx.originY,report.controlled.frameMetadata[fx.frame].origin.y);}
  }
  for(const p of report.controlled.pause){assert.deepEqual(p.during,p.before,p.kind);assert.ok(p.after.spikeClock>p.during.spikeClock,p.kind);}
  assert.ok(report.controlled.destroySpike.hadMoonFx>0);assert.equal(report.controlled.destroySpike.moonFxAlive,true);assert.equal(report.controlled.destroySpike.moonRuntimeSame,true);assert.equal(report.controlled.destroySpike.spikeFx,0);assert.deepEqual(report.controlled.destroySpike.moonCountsBefore,report.controlled.destroySpike.moonCountsAfter);
  assert.equal(report.controlled.destroyMoon.sameSpikeRuntime,true);assert.ok(report.controlled.destroyMoon.after.combatTimeMs>report.controlled.destroyMoon.before.combatTimeMs);assert.equal(report.controlled.destroyMoon.after.counts.impacts,1);
  assert.deepEqual(report.controlled.contact,{offHp:40,onHp:27,invincibleMs:900});
  for(const [key,value] of Object.entries(report.controlled.resetResult))assert.ok(['oldCasts','oldTargets','newCasts'].includes(key)?value===0:value,key);
  for(const m of report.controlled.standard){assert.deepEqual(m.skills,[]);assert.equal(m.spike.enabled,false);assert.equal(m.moon,null);}
  for(const [key,value] of Object.entries(report.controlled.exit))assert.ok(['casts','targets'].includes(key)?value===0:value,key);
  assert.deepEqual(report.frameScreens.map(s=>s.cast.frameIndex),[0,1,2,3,4,5,6,7]);
  const expectedSkills={bloodSpike:['umbraBloodSpike'],moonlight:['umbraMoonlight'],both:['umbraMoonlight','umbraBloodSpike'],none:[]};
  for(const selection of report.controlled.selections)assert.deepEqual(selection.skills,expectedSkills[selection.selection]);
  assert.equal(report.controlled.configurations.find(c=>c.id==='spike_escape').snapshot.spike.counts.accepted,0);
  assert.equal(report.controlled.configurations.find(c=>c.id==='spike_enter').snapshot.spike.counts.accepted,2);
  for(const entry of report.entries){assert.deepEqual(entry.audit.errors,[]);assert.deepEqual(entry.audit.external,[]);assert.equal(entry.result.isolation.storage,0);assert.deepEqual(entry.result.isolation.entryCalls,[]);assert.equal(entry.result.isolation.installedEntries.length,9);assert.equal(entry.result.snapshot.spike.errors,0);assert.equal(entry.result.snapshot.spike.counts.accepted,1);assert.equal(entry.result.snapshot.spike.counts.hpDelta,5);if(entry.name==='notifyOff')assert.equal(entry.result.snapshot.combat.counts.accepted,0);if(entry.name==='missingImage'){assert.equal(entry.audit.missingImages,1);assert.equal(entry.result.snapshot.spikeFx.fallback,1);}}
  report.pass=true;fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({pass:true,sourceHashes:report.sourceHashes,modes:report.controlled.modes.map(m=>({mode:m.mode,counts:m.snapshot.spike.counts,frames:m.frames})),entries:report.entries.map(e=>({name:e.name,counts:e.result.snapshot.spike.counts,errors:e.audit.errors,storage:e.result.isolation})),lifecycle:report.controlled.exit},null,2));
})().catch(error=>{report.pass=false;report.error=error.stack||String(error);fs.writeFileSync(reportPath,JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,`bloodspike-arena-failed-${Date.now()}.json`),JSON.stringify(report,null,2));console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
