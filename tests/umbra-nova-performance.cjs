"use strict";
// Serial normal-rAF measurements. No timing changes to Phaser or product code.
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const harness=require("./umbra-nova-browser.cjs"),out=process.env.UMBRA_TEST_OUTPUT||path.resolve(__dirname,"../.tmp_umbra_phase5/performance");fs.mkdirSync(out,{recursive:true});
const smoke=process.argv.includes("--smoke"),durationMs=smoke?10000:40000;
const summary=(a)=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);const p=q=>a[Math.max(0,Math.ceil(a.length*q)-1)]??null;return{count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,median:a.length%2?p(.5):(a[a.length/2-1]+a[a.length/2])/2,p95:p(.95),p99:p(.99),max:p(1),over100:a.filter(x=>x>=100).length};};
const report={date:new Date().toISOString(),sources:harness.report.sources,harnessSha256:crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),bootstrapHarnessSha256:harness.report.harnessSha256,durationMs,
 methodology:"Sequential fresh contexts; normal Phaser TimeStep rAF including unchanged startup120 cooldown/smoothing. Baseline, one slot, image FX, diagnostics ON, identical fixed camera, enemy layout and wall-time input schedule across none/old-two/NOVA/all. 40 real seconds each. First deployment is cold and later cycles loaded repetitions in the SAME runtime; no player/NOVA resets. Fresh-life replacements only for defeated fixture enemies preserve population; cost measured separately outside Game.step. Numeric frame rows outside Game.step; no snapshots/stringification/export/screenshots in measurement. Inclusive wrappers cannot be summed. CPU elapsed time is not GPU duration. All outliers retained.",cases:[],errors:[]};
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});harness.setBrowser(browser);
 for(const n of(smoke?[16]:[16,128]))for(const weapon of(smoke?["all"]:["none","both","phantomNova","all"])){
  const ctx=await harness.open("normal",60,`raf-${n}-${weapon}`);
  try{
   const result=await ctx.page.evaluate(async({n,weapon,durationMs})=>{
    const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena;
    s.time.now=performance.now();a.configId="empty";a.weaponSelection=weapon;a.novaSlots=1;a.fxMode="image";s.resetDrive("umbraSeraph","baseline");s.cameras.main.stopFollow();s.cameras.main.setScroll(0,250);
    const input=(keys)=>{for(const k of["up","down","left","right","w","a","s","d","dash","dashAlt"]){s.keys[k].isDown=keys.includes(k);s.keys[k].isUp=!s.keys[k].isDown;}};input([]);
    const listeners=e=>Object.fromEntries(e.eventNames().map(k=>[k,e.listenerCount(k)]));
    const inv=()=>({realMs:performance.now(),scene:s.sceneUpdates,physical:s.physicsSteps,children:s.children.list.length,bodies:s.physics.world.bodies.size,timers:s.time._active.length+s.time._pendingInsertion.length+s.time._pendingRemoval.length,tweens:s.tweens.getTweens().length,listeners:{world:listeners(s.physics.world),scene:listeners(s.events),game:listeners(g.events)},novaFx:a.novaEffects.size,novaRays:a.novaRays.length,numbers:a.numbers.length});
    const r={n,weapon,fx:"image",hud:"on",durationMs,frames:[],rafIntervals:[],inputChanges:[],spawns:[],before:inv(),environment:{phaser:Phaser.VERSION,fps:s.physics.world.fps,fixedStep:s.physics.world.fixedStep,renderer:g.renderer.type},firstAndRepeated:[]};
    const gl=g.renderer.gl,ext=gl?.getExtension("WEBGL_debug_renderer_info");r.environment.glRenderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
    const positions=Array.from({length:n},(_,i)=>({x:350+(i%8)*34,y:590+Math.floor(i/8)*34})),targets=new Array(n);let spawnCount=0;
    const refill=elapsed=>{let count=0;const at=performance.now();positions.forEach((p,i)=>{if(!targets[i]?.active||targets[i].isDying){targets[i]=a.spawnEnemy({typeId:"boss_crack",isBoss:true,isElite:true,...p});count++;}});if(count){r.spawns.push({elapsed,count,ms:performance.now()-at});spawnCount+=count;}};
    refill(0);let metrics=null;const restore=[];
    for(const[obj,key,label]of[[g.scene,"update","sceneUpdate"],[g.scene,"render","sceneRender"],[g.renderer,"preRender","preRender"],[g.renderer,"postRender","postRender"],[a,"refreshHud","arenaHud"],[a,"update","arenaUpdate"],[s,"observeUmbraPhantomNovaStep","novaEntry"],[s,"observeUmbraBloodSpikeStep","spikeEntry"],[s,"receiveUmbraMoonlightTrace","moonEntry"],[s,"observeUmbraBoostTraceStep","traceEntry"]]){const original=obj[key];obj[key]=function(...args){const at=performance.now();try{return original.apply(this,args);}finally{if(metrics)metrics[label]=(metrics[label]||0)+performance.now()-at;}};restore.push(()=>obj[key]=original);}
    let previousKeys="",oldDeploy=0;
    function applyInput(elapsed){const cycle=Math.floor(Math.max(0,elapsed-1000)/8000),phase=elapsed-1000-cycle*8000,dir=cycle%2?"left":"right",reverse=cycle%2?"right":"left";
     const keys=elapsed<1000?[]:phase<180?[dir,"dash"]:phase<650?[reverse]:[];const text=keys.join();if(text!==previousKeys){r.inputChanges.push({elapsed,keys});previousKeys=text;}input(keys);}
    await new Promise((resolve,reject)=>{let origin=null,lastRaf=null,watch;const done=e=>{g.loop.stop();cancelAnimationFrame(watch);clearTimeout(watchdog);e?reject(e):resolve();};const watchdog=setTimeout(()=>done(Error("rAF watchdog")),durationMs+20000);
     const observe=t=>{if(lastRaf!==null)r.rafIntervals.push(t-lastRaf);lastRaf=t;watch=requestAnimationFrame(observe);};watch=requestAnimationFrame(observe);
     g.loop.start((t,delta)=>{try{if(origin===null)origin=t;const elapsed=t-origin;applyInput(elapsed);refill(elapsed);const beforePhysics=s.physicsSteps,beforeScene=s.sceneUpdates;metrics={};const at=performance.now();g.step(t,delta);const end=performance.now(),row=metrics;metrics=null;
      const capture=performance.now(),rt=s.umbraPhantomNovaRuntime,sp=s.umbraBloodSpikeRuntime,mo=s.umbraMoonlightRuntime;
      Object.assign(row,{elapsed,startMs:at,endMs:end,wallMs:end-at,delta,rawDelta:g.loop.rawDelta,coolDown:g.loop._coolDown,sceneBefore:beforeScene,sceneAfter:s.sceneUpdates,physicsBefore:beforePhysics,physicsAfter:s.physicsSteps,combatMs:rt?.combatTimeMs||0,x:s.playerHitbox.body.center.x,y:s.playerHitbox.body.center.y,en:s.stats.stamina,mode:s.acMovementState.mode,deploy:rt?.counts.deployed||0,expire:rt?.counts.expired||0,regen:rt?.counts.regenerated||0,pulses:rt?.counts.pulses||0,novaAccepted:rt?.counts.accepted||0,novaKills:rt?.counts.kills||0,casts:sp?.counts.casts||0,impacts:sp?.counts.impacts||0,spikeAccepted:sp?.counts.accepted||0,spikeKills:sp?.counts.kills||0,moonAccepted:mo?.counts.accepted||0,moonKills:mo?.counts.kills||0,children:s.children.list.length,timers:s.time._active.length+s.time._pendingInsertion.length+s.time._pendingRemoval.length,novaRays:a.novaRays.length});row.captureMs=performance.now()-capture;r.frames.push(row);
      if(row.deploy>oldDeploy){r.firstAndRepeated.push({deployment:row.deploy,elapsed,combatMs:row.combatMs,cold:oldDeploy===0});oldDeploy=row.deploy;}
      if(elapsed>=durationMs)done();
     }catch(e){done(e);}});
    });
    input([]);r.after=inv();restore.reverse().forEach(f=>f());r.nova=s.getUmbraPhantomNovaSnapshot();r.spike=s.getUmbraBloodSpikeSnapshot();r.moon=s.getUmbraMoonlightSnapshot();r.trace=s.getDriveTraceDiagnostics();r.spawnCount=spawnCount;
    r.valid=r.frames.length>0&&(!(weapon==="phantomNova"||weapon==="all")||(r.nova.counts.deployed>=3&&r.nova.counts.expired>=3&&r.nova.counts.regenerated>=3&&r.nova.counts.deployedPulses>=15))&&!r.nova.errors;
    return r;
   },{n,weapon,durationMs});
   result.summary=summary(result.frames.map(x=>x.wallMs));result.rafSummary=summary(result.rafIntervals);result.outliers=result.frames.filter(x=>x.wallMs>=100);result.early=summary(result.frames.filter(x=>x.elapsed<8000).map(x=>x.wallMs));result.repeated=summary(result.frames.filter(x=>x.elapsed>=8000).map(x=>x.wallMs));report.cases.push(result);
   console.log(JSON.stringify({n,weapon,valid:result.valid,step:result.summary,raf:result.rafSummary,nova:result.nova.counts}));
  }finally{await harness.close(ctx);}
 }
 }catch(e){report.errors.push(e.stack);}finally{await browser?.close();report.contexts=harness.report.contexts;report.passed=!report.errors.length&&report.cases.length>0&&report.cases.every(x=>x.valid)&&report.contexts.every(x=>x.passed);const file=path.join(out,`nova-performance-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors}));process.exitCode=report.passed?0:1;}
})();
