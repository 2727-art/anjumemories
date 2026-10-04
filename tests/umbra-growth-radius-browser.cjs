"use strict";
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const h=require("./umbra-growth-browser.cjs"),out=process.env.UMBRA_TEST_OUTPUT||path.resolve(__dirname,"../.tmp_umbra_phase6b/growth-radius");fs.mkdirSync(out,{recursive:true});
const report={createdAt:new Date().toISOString(),sources:h.report.sources,harnessSha256:crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),bootstrapHarnessSha256:h.report.harnessSha256,
 methodology:"Bounded real-Phaser60Hz, unchanged fixed60 physics. Four explicit fresh highStage comparison presets S1/S4/S6/S8, not normal progression. Same four static existing boss enemies using supported10x10 rectangular synthetic bodies, untouched standard HP/damage/receiver. From the chosen cast center their nearest body distances are0/95/120/150px. No movement input; first SPIKE impact occurs before any900ms NOVA pulse. Each mode resets all fixture state intentionally. Image FX, diagnostics OFF; current damage compared at first impact only. No enemyHP edits, physicalorder/vendor changes, or target removal to improve performance.",cases:[],errors:[]};
(async()=>{let browser,ctx;try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});h.setBrowser(browser);ctx=await h.open("radius-same-layout");
 report.cases=await ctx.page.evaluate(()=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena,dt=1000/60,results=[];let t=s.time.now;
  for(const[stage,radius,expected]of[[1,80,1],[4,110,2],[6,135,3],[8,240,4]]){
   a.configId="empty";a.resetGrowthPreset(stage);s.closeCandidateCards();s.guides=false;a.setFxMode("image");s.clearDriveInput();s.physics.world.resume();for(let n=0;n<3;n++)g.step(t+=dt,dt);
   const targets=[0,95,120,150].map(distance=>a.spawnEnemy({typeId:"boss_crack",isBoss:true,isElite:true,x:450+(distance?distance+5:0),y:500,rect:{width:10,height:10},label:`edge ${distance}`}));
   const before=targets.map(e=>({hp:e.hp,maxHp:e.maxHp,x:e.body.center.x,y:e.body.center.y,width:e.body.width,height:e.body.height}));
   let n=0;while((s.umbraBloodSpikeRuntime.counts.impacts||0)<1&&n++<100)g.step(t+=dt,dt);
   const cast=s.umbraBloodSpikeRuntime.casts[0],after=targets.map(e=>({hp:e.hp,x:e.body.center.x,y:e.body.center.y}));
   const changed=after.filter((e,i)=>e.hp<before[i].hp).length,loss=after.map((e,i)=>before[i].hp-e.hp),first=s.getUmbraBloodSpikeSnapshot();
   results.push({stage,radius,expected,changed,loss,before,after,source:{x:cast?.position.x,y:cast?.position.y},actualRadius:cast?.radius,attempts:cast?.attempted.size,raw:cast?.rawDamage,appliedAt:cast?.appliedAtMs,dueAt:cast?.impactDueAtMs,spikeClock:first.combatTimeMs,sceneUpdates:s.sceneUpdates,physicsSteps:s.physicsSteps,novaPulses:s.umbraPhantomNovaRuntime.counts.pulses,moonAccepted:s.umbraMoonlightRuntime.counts.accepted,
    passed:changed===expected&&cast?.radius===radius&&cast.rawDamage===5&&cast.attempted.size===expected&&loss.every((v,i)=>v===(i<expected?5:0))&&s.umbraPhantomNovaRuntime.counts.pulses===0&&s.umbraMoonlightRuntime.counts.accepted===0});
  }
  return results;
 });
 await ctx.page.screenshot({path:path.join(out,"spike-s8-four-targets-ground.png")});
}catch(e){report.errors.push(e.stack);}finally{if(ctx)await h.close(ctx);await browser?.close();report.contexts=h.report.contexts;report.passed=!report.errors.length&&report.cases.length===4&&report.cases.every(c=>c.passed)&&report.contexts.every(c=>c.passed);const file=path.join(out,`growth-radius-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors,cases:report.cases.map(c=>({stage:c.stage,radius:c.radius,changed:c.changed,loss:c.loss,passed:c.passed}))}));process.exitCode=report.passed?0:1;}})();
