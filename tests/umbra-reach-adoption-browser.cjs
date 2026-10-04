"use strict";
// New adjustment supplement: preserve the original adoption harness unchanged.
// Natural XP cards are committed after waits and before controlled movement.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const h=require("./umbra-integration-browser-harness.cjs"),ui=require("./umbra-integration-initialization-browser.cjs");
const {installSceneObserver}=require("./umbra-integration-scene-observer.cjs");
const out=process.env.UMBRA_TEST_OUTPUT;if(!out)throw Error("Fresh UMBRA_TEST_OUTPUT required");
const reach=process.env.UMBRA_ADOPTION_REACH||"current";
if(!["current","wide"].includes(reach))throw Error("Unknown explicit adoption reach mode");
const entryPath=`/umbra-integration.html?fixture=complete&moonReach=${reach}`;

function installAdoptionProbe(){
  const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),env=s.runEnvironmentIO;
  if(!env.ownsScene(s)||env.getFixture(s).mode!=="boundary")throw Error("Live boundary fixture required");
  const tags=new Map(),events=[],gateEvents=[],operations=[],originals=new Map(),identities=new WeakMap();let sceneUpdates=0,physicsSteps=0,stepTime=performance.now(),controlled=false,lastTicket=null,nextIdentity=1;
  const identity=value=>{if(!value||typeof value!=="object")return null;if(!identities.has(value))identities.set(value,nextIdentity++);return identities.get(value);};
  const ids=["umbraMoonlight","umbraBloodSpike","umbraPhantomNova"],runtimes=()=>[s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime];
  const snapshot=()=>({realMs:performance.now(),sceneMs:s.time.now,sceneUpdates,physicsSteps,depth:s.stageDepth,runId:s.umbraRunContext.runId,state:s.umbraRunContext.state,
    level:s.stats.level,pending:s.pendingLevelUps,selectionMode:s.levelUpSelectionMode,hp:s.stats.hp,maxHp:s.stats.maxHp,en:s.stats.stamina,worldPaused:s.physics.world.isPaused,block:s.getUmbraNormalCombatBlockReason(),player:{x:s.playerHitbox.x,y:s.playerHitbox.y,vx:s.playerHitbox.body.velocity.x,vy:s.playerHitbox.body.velocity.y},
    actors:[...tags].map(([enemy,tag])=>({tag,enemyIdentity:identity(enemy),bodyIdentity:identity(enemy.body),x:enemy.x,y:enemy.y,bodyX:enemy.body?.center.x,bodyY:enemy.body?.center.y,bodyWidth:enemy.body?.width,bodyHeight:enemy.body?.height,hp:enemy.hp,maxHp:enemy.maxHp,active:enemy.active,dying:enemy.isDying,
      enemyLife:s.getUmbraNormalEnemyLife(enemy)?.id,ids:runtimes().map(r=>{const q=r?.targets.get(enemy);return q?{lifeId:q.lifeId,depth:q.depth,lastHitAt:q.lastHitAt,armed:q.armed,initialEligible:q.initialEligible,reason:q.reason,passConsumed:q.passConsumed}:null;})})),
    weapons:runtimes().map((r,i)=>r?{id:ids[i],time:r.combatTimeMs,counts:{...r.counts},skips:{...r.skips},casts:r.casts?.map(c=>({id:c.castId,position:c.position,impactAtMs:c.impactAtMs}))||[],errors:r.errors,
      slots:r.slots?.map(q=>({slotId:q.slotId,state:q.state,cycle:q.cycleGeneration,deployedAtMs:q.deployedAtMs,deployedUntilMs:q.deployedUntilMs,regenerateAtMs:q.regenerateAtMs,
        regenerationMs:q.deployedSnapshot?.regenerationMs,nextPulseAtMs:q.nextPulseAtMs,position:q.position}))||[]}:null),events:events.length});
  for(const [name,id]of[["onUmbraMoonlightAcceptedHit",ids[0]],["onUmbraBloodSpikeAcceptedHit",ids[1]],["onUmbraPhantomNovaPulse",ids[2]]]){
    const old=s[name];originals.set(name,old);s[name]=function(hit){const runtime=runtimes()[ids.indexOf(id)],tag=[...tags].find(([enemy])=>runtime.targets.get(enemy)?.lifeId===hit.lifeId)?.[1]||null;
      events.push({id,tag,depth:s.stageDepth,lifeId:hit.lifeId,time:hit.combatTimeMs,damage:hit.damage??hit.hpDelta,hpBefore:hit.hpBefore,hpAfter:hit.hpAfter,state:hit.state,slotId:hit.slotId});return old?.call(this,hit);};
  }
  for(const name of["captureUmbraGateSurvivors","adoptUmbraGateSurvivors"]){const old=s[name];originals.set(name,old);s[name]=function(arg){const before=snapshot(),value=old.call(this,arg);if(name==="captureUmbraGateSurvivors"&&value)lastTicket=value;gateEvents.push({name,before,after:snapshot(),accepted:!!value});return value;};}
  const pre=()=>sceneUpdates++,post=()=>physicsSteps++;s.events.on("preupdate",pre);s.physics.world.on("worldstep",post);
  function record(type,input,fn){env.record("explicit-adoption-boundary",{type,input,natural:false});const before=snapshot(),result=fn();const row={type,input,before,result,after:snapshot()};operations.push(row);return row;}
  const actions={
    control:()=>record("stop-rAF-use-controlled-Game.step",{hz:60},()=>{s.game.loop.stop();stepTime=performance.now();controlled=true;return true;}),
    spawn:({tag,relativeTo=null,dx=150,dy=0})=>record("actual-spawn-and-explicit-body-placement",{tag,type:"boss_crack",elite:true,boss:true,relativeTo,dx,dy,noHpEdit:true},()=>{
      const reference=relativeTo?[...tags].find(([,t])=>t===relativeTo)?.[0]:s.playerHitbox;if(!reference)throw Error("No placement reference");
      const enemy=s.spawnEnemy("boss_crack",{isElite:true,isBoss:true});enemy.body.reset(reference.x+dx,reference.y+dy);tags.set(enemy,tag);return {tag,hp:enemy.hp,maxHp:enemy.maxHp};}),
    position:({mode,tag="survivor"})=>record("explicit-player-body-placement",{mode,tag,bodyResetIncludesVelocityReset:true,movementConfigurationUnchanged:true},()=>{
      const enemy=[...tags].find(([,t])=>t===tag)?.[0];if(!enemy?.active||enemy.isDying)throw Error("Position reference is not a live target");
      const targets=[...tags.keys()].filter(e=>e.active&&!e.isDying);
      const center=enemy.body.center;
      const x=mode==="far"?center.x-1250:mode==="cross"?center.x-450:center.x-200;
      const y=center.y;
      s.playerHitbox.body.reset(x,y);s.invalidateUmbraBoostTrace("EXPLICIT_BOUNDARY_PLACEMENT");return{x,y};}),
    step:n=>{if(!controlled)throw Error("Controlled timeline not selected");if(!Number.isInteger(n)||n<1||n>900)throw Error("Bounded step count required");for(let k=0;k<n;k++)s.game.step(stepTime+=1000/60,1000/60);return snapshot();},
    gate:()=>record("actual-Gate-overlay-after-explicit-spawn",{noDeadlineClaim:true},()=>{s.spawnStageGate();if(s.gateGuidanceOverlayActive)s.closeGateGuidanceOverlay("adoption-boundary");s.handleGateEnter();return s.gateChoiceActive;}),
    repeatAdopt:()=>record("repeat-consumed-actual-ticket",{},()=>s.adoptUmbraGateSurvivors(lastTicket)),
    restore:()=>{for(const[name,value]of originals)s[name]=value;s.events.off("preupdate",pre);s.physics.world.off("worldstep",post);}
  };
  window.__UMBRA_ADOPTION_PROBE__={actions,snapshot,export:()=>({snapshot:snapshot(),events,gateEvents,operations})};return snapshot();
}

async function main(){fs.mkdirSync(out,{recursive:true});const report={sources:h.sources,sourceRoot:h.sourceRoot,harnessSha256:h.sha(fs.readFileSync(__filename)),
  methodology:"Normal SurvivalScene functional boundary. Actual HUB/SORTIE/Opening Unlock controls. Thereafter rAF is stopped and unchanged Game.step runs a declared60Hz timeline. Existing boss_crack is spawned with existing options/HP; body positions are explicitly set and Trace invalidation is recorded. Normal input/AI/attack/physical step functions remain active. Real Gate keyboard selection performs adoption. New supplement settles naturally generated XP cards through their actual controls after debt/near waits and before passage input, asserting ACTIVE/unpaused first. Original failed harness and raw are retained. No HP, damage/period, attack flags, invincibility, Stage grants, or physics/vendor setting changes. This is not a natural combat, natural Gate, or performance test.",checks:[],selections:[],inputs:[],unconfirmed:["Natural traversal of this exact fixture","All enemy types and Boss actions","Long-run performance"]};
  report.originalHarnessSha256=h.sha(fs.readFileSync(path.join(__dirname,"umbra-integration-adoption-browser.cjs")));
  report.query=entryPath;report.requestedReach=reach;
  const check=(p,label,detail)=>{report.checks.push({passed:!!p,label,detail});assert.ok(p,label);};let browser,r;
  try{fs.mkdirSync(path.join(out,"harness"),{recursive:true});for(const name of[path.basename(__filename),"umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs","umbra-integration-scene-observer.cjs"])fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
    browser=await h.launch();r=await h.open(browser,"normal-adoption-actual-hits",{path:entryPath});await ui.waitHub(r.page);await r.page.evaluate(installSceneObserver);await ui.clickPhaserText(r.page,"SORTIE PREP");
    for(let n=0;n<3;n++){const state=await ui.enabledCards(r.page);const i=state.cards.findIndex(c=>["umbraBloodSpike","umbraPhantomNova"].includes(c.skillId)&&!state.skills[c.skillId]);const choice=i>=0?i:state.cards.findIndex(c=>c.type==="passive");if(choice<0)throw Error("No current legal Opening option");report.selections.push(await ui.chooseCard(r.page,choice));}
    await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext.state==="ACTIVE");
    report.opening=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());check(report.opening.owners.every(Boolean),"real Opening Unlock created all three S1 owners",report.opening.skills);
    report.openingReach=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{stageIndex:s.playerSkills.umbraMoonlight.stageIndex,request:s.umbraRunContext.request.moonReach,stats:s.getUmbraMoonlightEffectiveStats()};});
    check(report.openingReach.stageIndex===0&&report.openingReach.request===reach&&report.openingReach.stats.passageRadius===(reach==="wide"?90:60)&&report.openingReach.stats.exitRadius===(reach==="wide"?102:72),"initial S1 retains explicit effective reach and unchanged leave margin",report.openingReach);
    await r.page.evaluate(installAdoptionProbe);const op=async(name,arg)=>r.page.evaluate(({name,arg})=>window.__UMBRA_ADOPTION_PROBE__.actions[name](arg),{name,arg});
    const settleGeneratedCards=async()=>{for(let attempts=0;attempts<8;attempts++){
      const state=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());
      if(!state.selectionActive)return;
      await op("step",45);const enabled=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());
      if(!enabled.inputEnabled||enabled.selectionLocked)throw Error("Controlled timer did not enable natural XP card");
      const index=enabled.cards.findIndex(c=>c.type==="passive");if(index<0)throw Error("No legal passive on natural XP card");
      await r.page.keyboard.press(String(index+1));await op("step",25);const after=await r.page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());
      report.selections.push({source:"natural-XP-generated-during-explicit-boundary",index,before:enabled,after});
      if(after.cardsIdentity===enabled.cardsIdentity)throw Error("Natural XP card did not complete its actual commit");
    }throw Error("Unexpected excessive normal card queue during bounded combat");};
    const keys=async(held,n)=>{for(const k of held)await r.page.keyboard.down(k);const result=await op("step",n);for(const k of held)await r.page.keyboard.up(k);report.inputs.push({keys:held,steps:n,after:result});return result;};
    await op("control");await op("spawn",{tag:"survivor"});await op("step",2);report.firstBoost=await keys(["ArrowRight","Shift"],8);await op("step",1);
    report.beforeGate=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.snapshot());
    check(report.beforeGate.weapons[2].slots.some(q=>q.state==="DEPLOYED"),"actual boost produced a live DEP before Gate",report.beforeGate.weapons[2]);
    check(report.beforeGate.actors[0].hp>0,"unchanged native-HP survivor remains alive before Gate",report.beforeGate.actors[0]);
    await op("gate");await r.page.keyboard.press("1");await op("step",2);report.afterGate=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.export());
    check(report.afterGate.snapshot.depth===2,"actual Gate input reached Depth2",report.afterGate.snapshot);
    report.afterGateReach=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{stageIndex:s.playerSkills.umbraMoonlight.stageIndex,request:s.umbraRunContext.request.moonReach,stats:s.getUmbraMoonlightEffectiveStats()};});
    check(report.afterGateReach.stageIndex===0&&report.afterGateReach.request===reach&&report.afterGateReach.stats.passageRadius===(reach==="wide"?90:60)&&report.afterGateReach.stats.exitRadius===(reach==="wide"?102:72),"real Gate preserves explicit S1 effective reach and leave margin",report.afterGateReach);
    const adoption=report.afterGate.gateEvents.find(e=>e.name==="adoptUmbraGateSurvivors"&&e.accepted),capture=report.afterGate.gateEvents.find(e=>e.name==="captureUmbraGateSurvivors"&&e.accepted);
    check(!!adoption&&!!capture,"actual Gate created and consumed one ticket");
    const oldA=capture.before.actors.find(a=>a.tag==="survivor"),newA=adoption.after.actors.find(a=>a.tag==="survivor");
    check(oldA.enemyIdentity===newA.enemyIdentity&&oldA.bodyIdentity===newA.bodyIdentity&&oldA.enemyLife===newA.enemyLife&&oldA.ids.every((q,i)=>q.lifeId===newA.ids[i].lifeId)&&oldA.ids[0].lastHitAt===newA.ids[0].lastHitAt,
      "real survivor keeps each weapon life and Moon last-hit time",{oldA,newA});
    for(const slot of capture.before.weapons[2].slots.filter(q=>q.state==="DEPLOYED")){const after=adoption.after.weapons[2].slots.find(q=>q.slotId===slot.slotId),expected=slot.deployedUntilMs+slot.regenerationMs;
      check(after.state==="REGENERATING"&&Math.abs(after.regenerateAtMs-expected)<1e-6,"actual DEP residual plus captured regeneration becomes one deadline",{slot,after,clock:capture.before.weapons[2].time,expected});}
    check(adoption.after.weapons[1].casts.length===0,"Gate discards any old Spike cast",{before:capture.before.weapons[1].casts,after:adoption.after.weapons[1].casts});
    const repeated=await op("repeatAdopt");check(repeated.result===null&&JSON.stringify(repeated.before.weapons[2].slots)===JSON.stringify(repeated.after.weapons[2].slots),"duplicate real ticket adds no DEP debt");
    const moonHitsBefore=report.afterGate.events.filter(e=>e.id==="umbraMoonlight"&&e.tag==="survivor").length;await op("step",2);
    const near=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.export());check(near.events.filter(e=>e.id==="umbraMoonlight"&&e.tag==="survivor").length===moonHitsBefore,"Gate proximity without new movement grants no free Moon hit");
    await op("spawn",{tag:"newspawn",relativeTo:"survivor",dx:0,dy:600});await op("position",{mode:"far"});await op("step",2);
    let state=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.snapshot());const remaining=Math.max(...state.weapons[2].slots.map(q=>(q.regenerateAtMs||state.weapons[2].time)-state.weapons[2].time));
    if(remaining>0)await op("step",Math.min(900,Math.ceil(remaining/(1000/60))+2));
    await settleGeneratedCards();
    for(const tag of["survivor","newspawn"]){
      const current=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.snapshot()),nova=current.weapons[2];
      const debt=Math.max(0,...nova.slots.map(q=>q.state==="DEPLOYED"?q.deployedUntilMs+q.regenerationMs-nova.time:q.state==="REGENERATING"?q.regenerateAtMs-nova.time:0));
      if(debt>0){await op("position",{mode:"far",tag});await op("step",Math.ceil(debt/(1000/60))+2);}
      await settleGeneratedCards();
      await op("position",{mode:"near",tag});await op("step",110);
      await settleGeneratedCards();
      await op("position",{mode:"cross",tag});await op("step",3);await settleGeneratedCards();
      const ready=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.snapshot());
      check(ready.state==="ACTIVE"&&!ready.worldPaused&&!ready.block,`${tag} passage begins ACTIVE with the real world unpaused`,ready);
      const moved=await keys(["ArrowRight","Shift"],45);
      check(moved.physicsSteps>ready.physicsSteps&&(moved.player.x!==ready.player.x||moved.player.y!==ready.player.y),`${tag} passage input actually advances physics and player position`,{ready,moved});
      await op("step",2);await settleGeneratedCards();
    }
    report.final=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__.export());
    for(const tag of["survivor","newspawn"])for(const id of["umbraMoonlight","umbraBloodSpike","umbraPhantomNova"]){const hits=report.final.events.filter(e=>e.depth===2&&e.tag===tag&&e.id===id);check(hits.length>0,`Gate後 ${tag} receives actual ${id} damage`,hits);}
    check(report.final.snapshot.weapons.every(w=>w.errors===0),"all dedicated handlers retain zero errors");
  }catch(error){report.error=error.stack;if(r)report.failure=await r.page.evaluate(()=>window.__UMBRA_ADOPTION_PROBE__?.export?.()||window.__NORMAL_SCENE_OBSERVER__?.snapshot?.()).catch(()=>null);}
  finally{if(r){await r.page.evaluate(()=>{window.__UMBRA_ADOPTION_PROBE__?.actions.restore();window.__NORMAL_SCENE_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("ADOPTION_TEST_END");const game=window.__SURVIVAL_GAME__;if(game?.pendingDestroy)game.step(performance.now(),1000/60);}).catch(e=>report.endError=String(e));
      await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:15000}).catch(e=>report.endError=String(e));report.audit=await h.audit(r);await r.context.close();}
    await browser?.close();report.passed=!report.error&&!report.endError&&report.checks.length>0&&report.checks.every(c=>c.passed)&&report.audit?.isolationPassed&&report.audit.pageErrors.length===0;
    fs.writeFileSync(path.join(out,"integration-adoption.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,error:report.error,endError:report.endError,pageErrors:report.audit?.pageErrors}));process.exitCode=report.passed?0:1;}
}
if(require.main===module)main();module.exports={installAdoptionProbe};
