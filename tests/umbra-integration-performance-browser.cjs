"use strict";
const fs=require("node:fs"),path=require("node:path");
const h=require("./umbra-integration-browser-harness.cjs"),ui=require("./umbra-integration-initialization-browser.cjs");
const {installSceneObserver}=require("./umbra-integration-scene-observer.cjs");
const out=process.env.UMBRA_TEST_OUTPUT;
const report={sourceRoot:h.sourceRoot,sources:h.sources,harnessSha256:h.sha(fs.readFileSync(__filename)),
  methodology:"Single browser, normal rAF, actual SurvivalScene natural enemy spawn/AI/HP/attacks. Complete synthetic start fixture, Opening three actual passive cards, then explicitly logged normal boundary S8 application with real Core/Final/OVL UI. No manual Game.step, no changed attack/physics/spawn/HP/EN values. Detailed functional observer removed before measuring. Numeric Game.step CPU times and independent rAF intervals include first interval and outliers; no GPU inference. No screenshot, JSON export or full snapshot during measured intervals. One-second numeric samples and input polling add observer cost. Boundary selection holds first card for 8 seconds, separately from post-selection battle. No parallel browser tests.",selections:[],segments:[],inputs:[]};
function installTiming(label){
 const game=window.__SURVIVAL_GAME__,s=game.scene.getScene("survival-scene");
 window.__NORMAL_SCENE_OBSERVER__?.cleanup();delete window.__NORMAL_SCENE_OBSERVER__;
 const started=performance.now(),cpus=[],intervals=[],states=[],outliers=[];
 let sceneUpdates=0,physicsSteps=0,rafId=0,lastRaf=started,stopped=false;
 const ids=["Moonlight","BloodSpike","PhantomNova"];
 const sample=()=>({realMs:performance.now(),sceneMs:s.time.now,depth:s.stageDepth,survivalTime:s.survivalTime,sceneUpdates,physicsSteps,
   player:{x:s.playerHitbox?.body?.center.x,y:s.playerHitbox?.body?.center.y,ap:s.stats?.hp,en:s.stats?.stamina},
   enemies:s.enemies?.countActive(true)||0,gameObjects:s.children?.list?.length||0,timers:s.time?._active?.length||0,
   listeners:s.events?.eventNames().reduce((n,e)=>n+s.events.listenerCount(e),0)||0,
   selection:s.levelUpActive,worldPaused:s.physics.world.isPaused,gameOver:s.gameOver,
   owners:ids.map(n=>{const r=s[`umbra${n}Runtime`];return r?{clock:r.combatTimeMs,counts:{...r.counts},finalCounts:{...r.finalState?.counts},fields:r.finalState?.fields?.size||0,
     casts:r.casts?.length||0,slots:r.slots?.map(o=>({state:o.state,until:o.deployedUntilMs,regen:o.regenerateAtMs}))||[]}:null;})});
 // Phaser TimeStep captured Game.step.bind(game) at boot. Replacing game.step
 // later cannot instrument that already-bound callback. Wrap the actual loop
 // callback, preserving its receiver, arguments and return value.
 const initial=sample(),original=game.loop.callback,callbackName=original.name;
 game.loop.callback=function(...args){const start=performance.now(),su=sceneUpdates,ps=physicsSteps;try{return original.apply(this,args);}finally{const end=performance.now(),cpu=end-start;cpus.push({at:start,ms:cpu});if(cpu>=100)outliers.push({at:start,ms:cpu,sceneUpdatesBefore:su,physicsStepsBefore:ps,after:sample()});}};
 const pre=()=>sceneUpdates++,world=()=>physicsSteps++;
 s.events.on("preupdate",pre);s.physics.world.on("worldstep",world);
 function raf(now){if(stopped)return;intervals.push({at:now,ms:now-lastRaf});lastRaf=now;rafId=requestAnimationFrame(raf);}
 rafId=requestAnimationFrame(raf);const timer=setInterval(()=>states.push(sample()),1000);
 window.__NORMAL_TIMING__={finish(){stopped=true;cancelAnimationFrame(rafId);clearInterval(timer);game.loop.callback=original;s.events.off("preupdate",pre);s.physics.world.off("worldstep",world);return{label,callbackName,cpuScope:"TimeStep.callback bound Game.step, entire callback including Scene/physics/render",started,ended:performance.now(),initial,final:sample(),cpus,intervals,states,outliers};}};
}
function summary(values){const sorted=[...values].sort((a,b)=>a-b),n=values.length,p=q=>n?sorted[Math.max(0,Math.ceil(n*q)-1)]:null;return{samples:n,mean:n?values.reduce((a,b)=>a+b,0)/n:null,median:p(.5),p95:p(.95),p99:p(.99),max:n?sorted[n-1]:null,atLeast100:values.filter(x=>x>=100).length};}
async function measure(page,label,ms){
 await page.evaluate(installTiming,label);const start=Date.now();let index=0;
 while(Date.now()-start<ms){
  const state=await page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{dead:s.gameOver,selection:s.levelUpActive,inputEnabled:s.levelUpInputEnabled,locked:s.levelUpSelectionLocked,x:s.playerHitbox?.x,y:s.playerHitbox?.y};});
  if(state.dead){report.stoppedForDeath=true;break;}
  // Fixed timed square: same published input sequence on every full cycle.
  const direction=["ArrowRight","ArrowDown","ArrowLeft","ArrowUp"][Math.floor(index/10)%4],boost=index%10<3;
  for(const k of ["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Shift"])await page.keyboard.up(k);
  if(state.selection){if(state.inputEnabled&&!state.locked)await page.keyboard.press("1");}
  else {await page.keyboard.down(direction);if(boost)await page.keyboard.down("Shift");}
  report.inputs.push({segment:label,elapsedMs:Date.now()-start,direction,boost,selection:state.selection});
  await page.waitForTimeout(400);index++;
 }
 for(const k of ["ArrowRight","ArrowDown","ArrowLeft","ArrowUp","Shift"])await page.keyboard.up(k);
 const result=await page.evaluate(()=>window.__NORMAL_TIMING__.finish());result.cpuSummary=summary(result.cpus.map(x=>x.ms));result.rafSummary=summary(result.intervals.map(x=>x.ms));report.segments.push(result);
}
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await h.launch();let r;
 report.browserVersion=browser.version();report.host={platform:process.platform,node:process.version,cpu:require("node:os").cpus()[0]?.model,logicalCpuCount:require("node:os").cpus().length};
 fs.mkdirSync(path.join(out,"harness"));for(const name of ["umbra-integration-performance-browser.cjs","umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs","umbra-integration-scene-observer.cjs"])fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
 try{
  r=await h.open(browser,"normal-performance",{path:"/umbra-integration.html?fixture=complete"});await ui.waitHub(r.page);await r.page.evaluate(installSceneObserver);await ui.clickPhaserText(r.page,"SORTIE PREP");
  for(let i=0;i<3;i++){const s=await ui.enabledCards(r.page);await ui.chooseCard(r.page,Math.max(0,s.cards.findIndex(c=>c.type==="passive")));}
  await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state==="ACTIVE");
  report.fixture=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{inputs:s.umbraRunContext.inputs,stats:s.stats,phaser:Phaser.VERSION,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};});
  await measure(r.page,"after-sortie",5000);
  await r.page.evaluate(installSceneObserver);
  await r.page.locator("#umbra-integration-details > summary").click();await r.page.locator("#umbra-integration-boundary").click();await r.page.locator("#umbra-integration-details > summary").click();
  await ui.enabledCards(r.page);report.longCardPause={durationMs:8000,before:await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot())};
  await r.page.waitForTimeout(8000);report.longCardPause.after=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());
  for(let n=0;n<15;n++){
   await r.page.waitForFunction(()=>{const s=window.__NORMAL_SCENE_OBSERVER__.snapshot();return(s.selectionActive&&s.inputEnabled&&!s.selectionLocked)||(!s.selectionActive&&!s.worldPaused&&s.normalContext?.state==="ACTIVE");},null,{timeout:15000});
   const s=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());if(!s.selectionActive)break;
   const idx=s.cards.findIndex(c=>["control","singularity"].includes(c.choiceId));report.selections.push(await ui.chooseCard(r.page,Math.max(0,idx)));
  }
  report.build=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{skills:Object.fromEntries(Object.entries(s.playerSkills).map(([id,k])=>[id,k.stageIndex])),mutations:s.skillMutationState.entries,triad:s.getUmbraTriadSnapshot(),equipment:s.getUmbraEquipmentSnapshot()};});
  await measure(r.page,"post-long-card-repeated-combat",45000);
  await r.page.screenshot({path:path.join(out,"normal-combat-after-measurement.png"),fullPage:true});
 }catch(e){report.error=e.stack;process.exitCode=1;}
 finally{if(r){await r.page.evaluate(()=>{window.__NORMAL_TIMING__?.finish?.();window.__NORMAL_SCENE_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("PERFORMANCE_END");}).catch(()=>{});await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:10000}).catch(e=>report.endError=String(e));report.context=await h.audit(r);await r.context.close();}await browser.close();
  const battle=report.segments.find(s=>s.label==="post-long-card-repeated-combat");
  report.battleCoverage={spikeImpacts:battle?.final.owners[1]?.counts.impacts||0,fieldsCreated:battle?.final.owners[1]?.finalCounts.fieldsCreated||0,
    novaDeployments:battle?.final.owners[2]?.counts.deployed||0,novaRegenerations:battle?.final.owners[2]?.counts.regenerated||0,
    sceneUpdates:battle?.final.sceneUpdates||0,physicsSteps:battle?.final.physicsSteps||0};
  report.passed=!report.error&&!report.endError&&report.context?.isolationPassed&&!report.context.pageErrors.length&&report.segments.length===2
    &&report.segments.every(s=>s.cpus.length>0)&&report.battleCoverage.spikeImpacts>0&&report.battleCoverage.fieldsCreated>0&&report.battleCoverage.novaDeployments>0&&report.battleCoverage.novaRegenerations>0;
  fs.writeFileSync(path.join(out,"integration-performance.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,error:report.error,segments:report.segments.map(s=>({label:s.label,cpu:s.cpuSummary,raf:s.rafSummary,final:s.final}))}));if(!report.passed)process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
