"use strict";
// A limited, serial normal-rAF observation of the new growth presentation.
// CPU wrappers measure inclusive Game.step; per-frame snapshots, JSON writes,
// and screenshots are deliberately outside the measurement interval.
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const h=require("./umbra-growth-browser.cjs"),out=process.env.UMBRA_TEST_OUTPUT||path.resolve(__dirname,"../.tmp_umbra_phase6b/growth-observation");
const sha=v=>crypto.createHash("sha256").update(v).digest("hex"),durationMs=12000;
fs.mkdirSync(out,{recursive:true});
const summary=values=>{const a=values.slice().sort((x,y)=>x-y),p=q=>a[Math.max(0,Math.ceil(a.length*q)-1)]??null;return{count:a.length,mean:a.reduce((x,y)=>x+y,0)/a.length,median:a.length%2?p(.5):(a[a.length/2-1]+a[a.length/2])/2,p95:p(.95),p99:p(.99),max:p(1),over100:a.filter(x=>x>=100).length};};
const report={createdAt:new Date().toISOString(),sources:h.report.sources,harnessSha256:sha(fs.readFileSync(__filename)),bootstrapHarnessSha256:h.report.harnessSha256,
 methodology:"One serial normal-rAF run, all three basic S8 weapons, 16 static high-HP enemies, image FX and visible diagnosis HUD. Explicit highStage fresh test, not normal progression. Fixed camera and scheduled synthetic key states, 12 real seconds. Numeric rows outside inclusive Game.step; no JSON/screenshots/full snapshots during measurement. All samples/outliers retained. Actual rAF callback intervals and CPU elapsed Game.step are separate; CPU does not measure GPU wait. No product/Phaser clock or enemy HP setting modification.",cases:[],errors:[]};
(async()=>{let browser,ctx;try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});h.setBrowser(browser);ctx=await h.open("growth-rAF");
 const result=await ctx.page.evaluate(async durationMs=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena;
  s.time.now=performance.now();a.configId="empty";a.resetGrowthPreset(8);s.closeCandidateCards();a.setFxMode("image");s.guides=false;s.cameras.main.stopFollow();s.cameras.main.setScroll(0,250);
  for(let n=0;n<16;n++)a.spawnEnemy({typeId:"boss_crack",isBoss:true,isElite:true,x:400+(n%8)*32,y:560+Math.floor(n/8)*70});
  const input=keys=>{for(const k of["up","down","left","right","w","a","s","d","dash","dashAlt"]){s.keys[k].isDown=keys.includes(k);s.keys[k].isUp=!s.keys[k].isDown;}};input([]);
  const listeners=e=>Object.fromEntries(e.eventNames().map(k=>[String(k),e.listenerCount(k)]));
  const inventory=()=>({realMs:performance.now(),scene:s.sceneUpdates,physics:s.physicsSteps,children:s.children.list.length,timers:s.time._active.length+s.time._pendingInsertion.length+s.time._pendingRemoval.length,listeners:{world:listeners(s.physics.world),scene:listeners(s.events),game:listeners(g.events)},spikeFx:a.spikeEffects.size,novaFx:a.novaEffects.size,rays:a.novaRays.length});
  const r={before:inventory(),frames:[],rafIntervals:[],inputs:[],world:{fps:s.physics.world.fps,fixedStep:s.physics.world.fixedStep},stages:Object.fromEntries(Object.entries(s.playerSkills).map(([id,v])=>[id,v.stageIndex+1]))};
  const gl=g.renderer.gl,ext=gl?.getExtension("WEBGL_debug_renderer_info");r.renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null;
  await new Promise((resolve,reject)=>{let origin=null,raf,lastRaf=null,previous="";const end=error=>{g.loop.stop();cancelAnimationFrame(raf);clearTimeout(watchdog);error?reject(error):resolve();};const watchdog=setTimeout(()=>end(Error("observation watchdog")),durationMs+15000);
   const observe=t=>{if(lastRaf!==null)r.rafIntervals.push(t-lastRaf);lastRaf=t;raf=requestAnimationFrame(observe);};raf=requestAnimationFrame(observe);
   g.loop.start((t,delta)=>{try{if(origin===null)origin=t;const elapsed=t-origin,phase=(elapsed-1000)%4000,dir=Math.floor((elapsed-1000)/4000)%2?"left":"right",opposite=dir==="left"?"right":"left";
    const keys=elapsed<1000?[]:phase<180?[dir,"dash"]:phase<650?[opposite]:[];if(keys.join()!==previous){r.inputs.push({elapsed,keys});previous=keys.join();}input(keys);
    const beforePhysics=s.physicsSteps,beforeScene=s.sceneUpdates,start=performance.now();g.step(t,delta);const cpuMs=performance.now()-start,capture=performance.now(),n=s.umbraPhantomNovaRuntime,b=s.umbraBloodSpikeRuntime,m=s.umbraMoonlightRuntime;
    const row={elapsed,delta,rawDelta:g.loop.rawDelta,coolDown:g.loop._coolDown,cpuMs,sceneBefore:beforeScene,sceneAfter:s.sceneUpdates,physicalBefore:beforePhysics,physicalAfter:s.physicsSteps,novaClock:n?.combatTimeMs,spikeClock:b?.combatTimeMs,x:s.playerHitbox.body.center.x,y:s.playerHitbox.body.center.y,en:s.stats.stamina,mode:s.acMovementState.mode,casts:b?.counts.casts,impacts:b?.counts.impacts,spikeAccepted:b?.counts.accepted,moonAccepted:m?.counts.accepted,novaAccepted:n?.counts.accepted,pulses:n?.counts.pulses,deployed:n?.counts.deployed,expired:n?.counts.expired,regenerated:n?.counts.regenerated,kills:s.runStats.kills,objects:s.children.list.length,timers:s.time._active.length+s.time._pendingInsertion.length+s.time._pendingRemoval.length,spikeFx:a.spikeEffects.size,novaFx:a.novaEffects.size,novaRays:a.novaRays.length};row.captureMs=performance.now()-capture;r.frames.push(row);if(elapsed>=durationMs)end();
   }catch(e){end(e);}});
  });
  input([]);r.after=inventory();r.nova=s.getUmbraPhantomNovaSnapshot();r.spike=s.getUmbraBloodSpikeSnapshot();r.moon=s.getUmbraMoonlightSnapshot();
  r.valid=r.frames.length>0&&r.nova.totalSlots===3&&r.nova.counts.pulses>0&&r.spike.counts.casts>0&&!r.nova.errors&&!r.spike.errors&&!r.moon.errors;
  return r;
 },durationMs);
 result.cpuSummary=summary(result.frames.map(x=>x.cpuMs));result.rafSummary=summary(result.rafIntervals);result.outliers=result.frames.filter(x=>x.cpuMs>=100);report.cases.push(result);
 await ctx.page.screenshot({path:path.join(out,"growth-s8-three-weapons.png")});
 await ctx.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena;a.configId="empty";a.resetGrowthPreset(8);s.closeCandidateCards();a.spawnEnemy({typeId:"boss_crack",isBoss:true,isElite:true,x:480,y:500});const g=s.game;let t=s.time.now;for(let n=0;n<7;n++){t+=1000/60;g.step(t,1000/60);}s.guides=false;a.updateSpikeFx();});
 report.ground=await ctx.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena;return{guides:s.guides,casts:s.umbraBloodSpikeRuntime.casts.map(c=>({id:c.castId,radius:c.radius})),fx:[...a.spikeEffects.values()].map(f=>({keys:Object.keys(f),groundVisible:f.ground?.visible,groundActive:f.ground?.active,displayRadius:f.growthRadius??f.radius??null}))};});
 await ctx.page.screenshot({path:path.join(out,"growth-spike-s8-ground-diagnostics-off.png")});
 console.log(JSON.stringify({valid:result.valid,cpu:result.cpuSummary,raf:result.rafSummary,counts:{spike:result.spike.counts,nova:result.nova.counts}}));
}catch(e){report.errors.push(e.stack);}finally{if(ctx)await h.close(ctx);await browser?.close();report.contexts=h.report.contexts;report.passed=!report.errors.length&&report.cases.length>0&&report.cases.every(c=>c.valid)&&report.contexts.every(c=>c.passed);const file=path.join(out,`growth-observation-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors}));process.exitCode=report.passed?0:1;}})();
