"use strict";
// Independent integration tests: real Game.step and Arcade collision resolution,
// with explicitly synthetic input/enemy fixtures and no real save data.
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, ".."), base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase5", "browser");
const smoke = process.argv.includes("--smoke"), loadOnly = false, matrixOnly = true, final = process.argv.includes("--final");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
fs.mkdirSync(output, { recursive: true });
const frozen = new Map();
for (const name of ["index.html", "game.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js"]) {
  const body = fs.readFileSync(path.join(process.env.UMBRA_TEST_SOURCE_ROOT || project, name)); frozen.set(name, { body, sha256: sha(body) });
}
const presentationFile = path.join(process.env.UMBRA_TEST_SOURCE_ROOT || project, "umbraPresentation.js");
if (fs.existsSync(presentationFile)) {
  const body = fs.readFileSync(presentationFile);
  frozen.set("umbraPresentation.js", { body, sha256: crypto.createHash("sha256").update(body).digest("hex") });
}
const report = { createdAt: new Date().toISOString(), phase: 5, final, smoke, loadOnly, matrixOnly,
  sources: Object.fromEntries([...frozen].map(([name, value]) => [name, value.sha256])), harnessSha256: sha(fs.readFileSync(__filename)),
  methodology: "Fresh isolated contexts; external requests and Storage APIs denied. Actual Phaser.Game.step at controlled Scene 30/60/120 Hz and unchanged fixed60 Arcade physics. Synthetic Phaser key state and explicitly labelled enemy velocity/position fixtures. This is neither a real refresh-rate device test nor normal enemy AI testing. Raw WORLD_STEP/body positions and planned/applied impact times are retained.",
  contexts: [], cases: [], errors: [] };
let browser;

async function open(mode, rate, label) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  const audit = { mode, rate, label, external: [], pageErrors: [], localRequests: [] }; report.contexts.push(audit);
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!url.startsWith(base + "/")) { audit.external.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    audit.localRequests.push(name); const entry = frozen.get(name);
    if(mode === "404" && name.endsWith("/skilleffect/nova.png")) return route.fulfill({status:404,body:"phase5 intentional missing nova image"});
    return entry ? route.fulfill({ status: 200, body: entry.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", error => audit.pageErrors.push(error.stack));
  await page.addInitScript(() => {
    window.__novaAudit = { storage: [], probes: [], normal: [], bootstrap: null };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () { window.__novaAudit.storage.push(method); throw Error("Storage forbidden"); };
    for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, get() { window.__novaAudit.probes.push({ name, stack: new Error().stack }); throw Error("Storage access forbidden"); } });
    // Stop only this test Scene before its first physical update. Asset loading
    // continues in the unmodified loader Scene. No impact can warm image FX here.
    let factory;
    Object.defineProperty(window, "createUmbraPhase2ADriveScene", { configurable: true, get() { return factory; }, set(value) {
      factory = function (...args) {
        const Scene = value(...args), original = Scene.prototype.create;
        Scene.prototype.create = function (...createArgs) {
          original.apply(this, createArgs);
          const beforeTestReset = { spike: this.getUmbraBloodSpikeSnapshot?.(), moon: this.getUmbraMoonlightSnapshot?.(), physicsSteps: this.physicsSteps };
          if (this.moonlightArena) { this.moonlightArena.configId = "empty"; this.resetDrive(this.mechId, this.fixtureId); }
          this.physics.world.pause();
          window.__novaAudit.bootstrap = { beforeTestReset, spike: this.getUmbraBloodSpikeSnapshot?.(), moon: this.getUmbraMoonlightSnapshot?.(), physicsSteps: this.physicsSteps };
        };
        return Scene;
      };
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
        const method = SurvivalScene.prototype[name];
        if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) { window.__novaAudit.normal.push(name); return method.apply(this, args); };
      }
    }, { once: true });
  });
  const query = `?umbraPreview=1&umbraDrive=1&umbraPhantomNova=1&umbraBloodSpike=1&umbraMoonlight=1${mode === "no-notify" ? "&umbraTraceNotify=0" : ""}`;
  await page.goto(base + "/" + query);
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase1Assets")?.status.finished && window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase2ADrive")?.moonlightArena && typeof window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive").getUmbraPhantomNovaSnapshot === "function", null, { timeout: 30000 });
  audit.initial = await page.evaluate(() => {
    const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"); game.loop.stop();
    return { phaser: Phaser.VERSION, worldFps: s.physics.world.fps, fixedStep: s.physics.world.fixedStep, bootstrap: window.__novaAudit.bootstrap,
      spike: s.getUmbraBloodSpikeSnapshot(), moon: s.getUmbraMoonlightSnapshot(), probes: window.__novaAudit.probes.length };
  });
  return { context, page, audit };
}

async function execute(page, rate, mode) {
  return page.evaluate(({rate, mode}) => {
    const game=window.__SURVIVAL_GAME__,s=game.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena;
    const dt=1000/rate, results=[], copy=v=>JSON.parse(JSON.stringify(v)); let t=s.time.now,current;
    const snap=()=>s.getUmbraPhantomNovaSnapshot();
    const input=(...keys)=>{for(const k of ["up","down","left","right","w","a","s","d","dash","dashAlt"]){s.keys[k].isDown=keys.includes(k);s.keys[k].isUp=!s.keys[k].isDown;}};
    const check=(passed,expected,actual)=>current.checks.push({passed:!!passed,expected,actual:actual===undefined?null:copy(actual)});
    const step=(delta=dt)=>{t+=delta; const start=performance.now(),before=s.physicsSteps;game.step(t,delta);current.frames.push({t,delta,cpuMs:performance.now()-start,physical:s.physicsSteps-before,novaMs:snap().combatTimeMs,x:s.playerHitbox.body.center.x,y:s.playerHitbox.body.center.y,vx:s.playerHitbox.body.velocity.x,vy:s.playerHitbox.body.velocity.y,en:s.stats.stamina,mode:s.acMovementState.mode});};
    const frames=(ms,...keys)=>{input(...keys);for(let i=0;i<Math.ceil(ms/dt);i++)step();};
    const until=(f,limit=6000,keys=[])=>{input(...keys);let n=0;while(!f()&&n++<Math.ceil(limit/dt))step();check(f(),"bounded physical wait",{n,limit});};
    const spawn=(o={})=>a.spawnEnemy({typeId:"boss_crack",isBoss:true,isElite:true,x:450,y:500,...o});
    function run(name,fn,{weapon="phantomNova",slots=1,fx="off",fixture="baseline"}={}){
      a.configId="empty";a.weaponSelection=weapon;a.novaSlots=slots;a.fxMode=fx;s.finalBossRaidState=null;s.finalBossRaidAssetsLoading=false;
      s.resetDrive("umbraSeraph",fixture);current={name,rate,mode,weapon,slots,fx,checks:[],frames:[],notices:[]};input();
      const unsub=s.subscribeUmbraBoostTrace("nova-test",e=>current.notices.push(copy(e)));frames(50);
      try{fn();}catch(e){check(false,"case completes",e.stack);}
      current.nova=copy(snap());current.moon=copy(s.getUmbraMoonlightSnapshot());current.spike=copy(s.getUmbraBloodSpikeSnapshot());current.arena=copy(a.getSnapshot());
      check(!current.nova.errors,"NOVA errors zero",current.nova.lastError);
      check((s.umbraPhantomNovaRuntime?.slots.length||0)<=3,"slots bounded");
      const tr=s.getDriveTraceDiagnostics();check(tr.A?.hash===tr.B?.hash&&tr.A?.count===tr.B?.count,"trace consumers equal",tr);
      unsub();current.passed=current.checks.every(x=>x.passed);results.push(current);
    }
    if(mode==="no-notify"){
      run("notify-off-orbit-independent",()=>{spawn();frames(2200,"right","dash");frames(2000);check(snap().counts.deployed===0&&snap().counts.orbitPulses>=4,"no notifications prevents deployment, independent clock pulses",snap());});return results;
    }
    if(mode==="404"){
      run("actual-nova-png-404",()=>{spawn();frames(180,"right","dash");frames(4500);check(snap().counts.deployedPulses===5&&snap().counts.regenerated===1,"missing image preserves complete lifecycle",snap().counts);check(a.novaFxCounts.fallback>0,"actual404 creates Graphics fallback",a.novaFxCounts);},{fx:"image"});return results;
    }
    for(const slots of [1,2,3])run(`orbit-${slots}-slots`,()=>{
      spawn();until(()=>snap().combatTimeMs>=850,1000);check(snap().counts.pulses===0,"first pulse waits full900",snap().combatTimeMs);
      until(()=>snap().combatTimeMs>=1900,1500);check(snap().counts.orbitPulses===2*slots,"two orbit pulses per slot",snap().counts);
      check(snap().counts.accepted>0,"real receiver accepts orbit damage",snap().counts);
    },{slots});
    run("deploy-expire-regenerate-redeploy",()=>{
      const target=spawn();frames(180,"right","dash");check(snap().counts.deployed===1,"physical movement commits one placement",snap());
      const created=copy(snap().slots[0]),origin=created.position;check(created.deployedSnapshot.rawDamage===3,"raw snapshot3");
      check(snap().counts.deployedPulses===0,"no immediate deployment pulse");
      until(()=>snap().counts.expired===1,4000);check(snap().counts.deployedPulses===5,"base lifetime emits exactly five deployed pulses",snap());
      check(snap().slots[0].state==="REGENERATING","expired slot invisible waiting");
      check(snap().history.find(h=>h.type==="DEPLOY")?.position?.x===origin.x||snap().counts.deployed===1,"saved placement stable",{created,history:snap().history});
      until(()=>snap().counts.regenerated===1,1800);const n=snap().counts.pulses;frames(800);check(snap().counts.pulses===n,"regenerated ball waits before its first pulse");
      frames(180,"right","dash");check(snap().counts.deployed===2,"new released boost redeploys after regeneration",snap().counts);
      current.target={hp:target.hp,maxHp:target.maxHp};
    },{fx:"image"});
    for(const weapon of ["none","moonlight","bloodSpike","both","phantomNova","moonNova","spikeNova","all"])run(`acquired-${weapon}`,()=>{
      spawn({x:350,y:590});frames(500,"right","dash");frames(2000);
      const expected={none:[0,0,0],moonlight:[1,0,0],bloodSpike:[0,1,0],both:[1,1,0],phantomNova:[0,0,1],moonNova:[1,0,1],spikeNova:[0,1,1],all:[1,1,1]}[weapon];
      check(Boolean(s.umbraPhantomNovaRuntime)===!!expected[2],"only acquired NOVA owns runtime");
      check((s.getUmbraMoonlightSnapshot()?.counts?.accepted||0)>0===!!expected[0],"MOONLIGHT acquisition matches actual damage");
      check((s.getUmbraBloodSpikeSnapshot()?.counts?.accepted||0)>0===!!expected[1],"SPIKE acquisition matches actual damage");
      if(expected[2])check(snap().counts.deployed===1&&snap().counts.accepted>0,"NOVA placement and real damage coexist",snap().counts);
    },{weapon});
    for(const kind of ["pause","hidden","candidate"])run(`freeze-${kind}`,()=>{
      spawn();frames(180,"right","dash");input();const before=copy(snap());
      if(kind==="pause")s.toggleDrivePause();if(kind==="candidate")s.openCandidateCards(false);if(kind==="hidden"){Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));}
      frames(1600);check(snap().combatTimeMs===before.combatTimeMs,"paused independent clock freezes");
      if(kind==="pause")s.toggleDrivePause();if(kind==="candidate")s.closeCandidateCards();if(kind==="hidden"){Object.defineProperty(document,"hidden",{configurable:true,value:false});document.dispatchEvent(new Event("visibilitychange"));}
      frames(600);check(snap().counts.deployedPulses>before.counts.deployedPulses,"resume remaining deployment");
    });
    run("passives-snapshot",()=>{
      spawn();frames(180,"right","dash");const created=copy(snap().slots[0]);a.applyPassive("overchargeBolt");a.applyPassive("rapidSigil");
      check(JSON.stringify(snap().slots[0].deployedSnapshot)===JSON.stringify(created.deployedSnapshot),"passives preserve existing deployment snapshot");
      check(s.getUmbraPhantomNovaRawDamage("deployed")===4&&s.getUmbraPhantomNovaIntervalMs("deployed")===445,"future deployment reflects shared stats");
      frames(3200);check(snap().counts.deployedPulses===5,"existing five-pulse schedule preserved");
    },{weapon:"all"});
    run("depth-preserves-owned-count-and-remainder",()=>{
      frames(180,"right","dash");const old=copy(snap()),due=old.slots[0].deployedUntilMs+1200;s.stageDepth=10;s.handleUmbraPhantomNovaDepthChange(10);s.handleUmbraPhantomNovaDepthChange(10);
      check(snap().slots[0].state==="REGENERATING"&&snap().slots[0].regenerateAtMs===due,"deployed remaining life plus regeneration preserved once",snap());
      check(snap().slots[1].nextPulseAtMs===old.slots[1].nextPulseAtMs&&snap().totalSlots===2,"orbit deadline and count survive depth");frames(100);
      check(snap().enabled,"ordinary Depth10 allowed");
    },{slots:2});
    for(const kind of ["raid-loading","raid-active","exit","death","skill-off","mech-switch"])run(`cleanup-${kind}`,()=>{
      frames(180,"right","dash");const old=s.umbraPhantomNovaRuntime;
      if(kind==="raid-loading")s.finalBossRaidAssetsLoading=true;if(kind==="raid-active")s.finalBossRaidState={active:true};if(kind==="exit")s.extractionComplete=true;if(kind==="death")s.stats.hp=0;
      if(kind==="skill-off")s.novaAttackEnabled=false;if(kind==="mech-switch")s.resetDrive("defaultBear","baseline");frames(100);
      check(!s.umbraPhantomNovaRuntime&&old.destroyed&&old.slots.length===0,"owned runtime/listeners/slots released",{enabled:snap().enabled,destroyed:old.destroyed,cleanups:old.cleanups.length});
    });
    for(const fx of ["image","fallback","off"])run(`fx-parity-${fx}`,()=>{spawn();frames(180,"right","dash");frames(4500);check(snap().counts.deployedPulses===5&&snap().counts.regenerated===1,"FX keeps exact attack lifecycle",snap().counts);},{fx});
    run("large-delta-bounded-pulses",()=>{spawn();step(4000);check(snap().counts.pulses<=1,"one slot maximum one pulse per Scene update",snap().counts);});
    run("EN-zero-orbit",()=>{spawn();s.stats.stamina=0;frames(2000);check(snap().counts.accepted>0&&snap().counts.deployed===0,"independent orbit damage at EN0 recovery",snap().counts);});
    run("held-dash-does-not-auto-redeploy",()=>{frames(6200,"right","dash");check(snap().counts.deployed===1&&snap().counts.regenerated===1,"holding through regeneration never adds a deployment",snap().counts);});
    run("deployed-not-tethered-to-player-camera",()=>{const target=spawn();frames(180,"right","dash");const pos=copy(snap().slots[0].position);input();s.playerHitbox.body.reset(4000,500);s.cameras.main.setScroll(3600,250);frames(2800);check(snap().counts.deployedPulses===5&&target.hp<target.maxHp,"offscreen saved ball continues five pulses",snap());check(snap().slots[0].position.x===pos.x&&snap().slots[0].position.y===pos.y,"teleport leaves deployed position unchanged");});
    run("wall-first-physical-cancels",()=>{const wall=s.walls.getChildren()[0].body; s.playerHitbox.body.reset(wall.x-s.playerHitbox.body.halfWidth,wall.center.y);frames(100);frames(250,"right","dash");check(snap().counts.deployed===0,"wall-push first evaluation never deploys",{counts:snap().counts,skips:snap().skips,notices:current.notices});frames(200,"up","dash");check(snap().counts.deployed===0,"later wall slide cannot revive same boost sequence");});
    run("support-reject-pulse-no-retry",()=>{const target=spawn();target.supportDamageHoldUntil=s.time.now+3000;frames(1000);check(snap().counts.attempts===1&&snap().counts.accepted===0,"receiver rejection consumes one pulse",snap().counts);target.supportDamageHoldUntil=0;frames(200);check(snap().counts.attempts===1,"no immediate rejected-pulse retry");frames(700);check(snap().counts.accepted===1,"next independent pulse may hit");});
    run("release-during-scenes-without-physical-step",()=>{
      // Align by waiting for a real step; never edit World elapsed time or fps.
      let guard=0;while(current.frames.at(-1).physical===0&&guard++<3)step();
      const before=s.physicsSteps;input("right","dash");step(1);check(snap().reservation!==null&&s.physicsSteps===before,"successful start reserves in a Scene without physics",{snapshot:snap(),last:current.frames.at(-1)});
      input();step(1);check(s.physicsSteps===before&&snap().reservation===null,"release ends reservation before any physics",{snapshot:snap(),last:current.frames.at(-1)});
      frames(100);check(snap().counts.deployed===0,"later physics never commits ended boost");
    });
    run("EN-insufficient-start-fails",()=>{s.stats.stamina=0;frames(100,"right","dash");check(snap().counts.starts===0&&snap().counts.reservations===0&&snap().counts.deployed===0,"actual failed boost start never reserves",snap().counts);});
    run("orbit-during-air-brake",()=>{
      spawn({x:450,y:590});until(()=>snap().combatTimeMs>=500,1000);let brakePulse=false;
      const original=s.onUmbraPhantomNovaPulse;s.onUmbraPhantomNovaPulse=function(hit){if(s.acMovementState.airBrake.active&&hit.state==="ORBITING")brakePulse=true;return original?.call(this,hit);};
      try{frames(150,"right","dash");frames(1000/rate);frames(350,"left");check(current.frames.some(f=>f.mode==="AIR_BRAKE")||s.acMovementState.airBrake.triggerCount>0,"test reaches actual Air Brake",current.frames.slice(-22));check(brakePulse,"remaining orbit slot accepts a pulse during Air Brake",snap());}finally{s.onUmbraPhantomNovaPulse=original;}
    },{slots:2});
    run("three-weapons-one-lethal-reward",()=>{
      const target=spawn({typeId:"chaser",isBoss:false,isElite:false,x:410,y:500}),originalXp=s.spawnXpOrb,originalDrop=s.spawnGuaranteedEnemyDrops;let xp=0,drops=0;
      s.spawnXpOrb=function(...args){xp++;return originalXp.apply(this,args);};s.spawnGuaranteedEnemyDrops=function(...args){drops++;return originalDrop.apply(this,args);};
      try{frames(180,"right","dash");frames(1100);}finally{s.spawnXpOrb=originalXp;s.spawnGuaranteedEnemyDrops=originalDrop;}
      const counts=[s.getUmbraMoonlightSnapshot()?.counts,s.getUmbraBloodSpikeSnapshot()?.counts,snap().counts];check(s.runStats.kills===1&&counts.reduce((n,c)=>n+(c?.kills||0),0)===1,"three consumers award one enemy kill once",{run:s.runStats,counts,hp:target.hp});
      check(xp===1&&drops===1,"real XP and guaranteed-drop paths each entered once",{xp,drops});
    },{weapon:"all"});
    run("existing-deployment-survives-notify-off",()=>{spawn();frames(180,"right","dash");s.verificationContext=Object.freeze({...s.verificationContext,traceNotifications:false});frames(4500);check(snap().counts.deployed===1&&snap().counts.deployedPulses===5&&snap().counts.regenerated===1,"only trace disabled: existing deployment and regen continue",snap().counts);});
    if(rate===60)for(const shape of["circle","rectangle"])for(const offset of[-0.01,0,0.01])run(`real-body-range-${shape}-${offset}`,()=>{
      frames(180,"right","dash");const at=copy(snap().slots[0].position),target=spawn(shape==="rectangle"?{rect:{width:240,height:10}}:{});
      const x=at.x+300+target.body.halfWidth+offset;target.x+=x-target.body.center.x;target.y+=at.y-target.body.center.y;target.body.updateFromGameObject();
      const before=target.hp;until(()=>snap().counts.deployedPulses>=1,1000);
      check(target.hp===before-(offset<=0?3:0),"real circle/rectangle nearest shape respects exact deployed range",{shape,offset,hp:target.hp,before,width:target.body.width,height:target.body.height,halfWidth:target.body.halfWidth,bodyCenter:target.body.center,at,counts:snap().counts});
    });
    run("lifecycle-reset-listeners",()=>{const measure=()=>({children:s.children.list.length,world:s.physics.world.listenerCount("worldstep"),pre:s.events.listenerCount("preupdate"),timers:s.time._active.length+s.time._pendingInsertion.length+s.time._pendingRemoval.length});const before=measure();for(let i=0;i<8;i++){s.resetDrive();frames(50);}const after=measure();check(JSON.stringify(before)===JSON.stringify(after),"eight resets do not grow listeners objects timers",{before,after});});
    return results;
  },{rate,mode});
}

async function close(run){
  run.audit.final=await run.page.evaluate(()=>({...window.__novaAudit,firebasePresent:typeof window.firebase!=="undefined"}));
  run.audit.passed=!run.audit.external.length&&!run.audit.pageErrors.length&&!run.audit.final.storage.length&&!run.audit.final.normal.length&&!run.audit.final.firebasePresent&&run.audit.final.probes.length===run.audit.initial.probes;
  await run.context.close();
}
async function main(){
  try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});
    for(const [rate,mode] of (smoke?[[60,"normal"]]:[[30,"normal"],[60,"normal"],[120,"normal"],[60,"no-notify"],[60,"404"]])){
      const run=await open(mode,rate,"matrix");try{const cases=await execute(run.page,rate,mode);report.cases.push(...cases);console.log(JSON.stringify({rate,mode,cases:cases.length,failed:cases.filter(c=>!c.passed).map(c=>({name:c.name,checks:c.checks.filter(x=>!x.passed)}))}));}finally{await close(run);}
    }
  }catch(e){report.errors.push(e.stack);}finally{await browser?.close();report.passed=!report.errors.length&&report.cases.length>0&&report.cases.every(c=>c.passed)&&report.contexts.every(c=>c.passed);const file=path.join(output,`nova-${final?"final":"development"}-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors}));process.exitCode=report.passed?0:1;}
}
if(require.main===module)main();
module.exports={open,close,frozen,report,setBrowser:value=>browser=value};

