"use strict";

// Bounded normal-Scene component checks. This harness is not a product entry.
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT required");

async function closeWithin(promise,label,ms=10000){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${label} exceeded ${ms}ms`)),ms);})]);}
  finally{clearTimeout(timer);}
}

function installCoverageProbe() {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), env = s.runEnvironmentIO;
  if (!env.ownsScene(s) || env.getFixture(s).mode !== "boundary" || !s.hasUmbraRunCapability("moonlight", { purpose: "combat" })) throw Error("Active normal boundary run required");
  const ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"], tags = new Map(), events = [], calls = {}, originals = new Map();
  const objects = new WeakMap(); let serial = 0, sceneUpdates = 0, physicalSteps = 0, time = window.__UMBRA_PREP_CONTROL__?.time ?? s.time.now;
  const identity = value => { if (!value || typeof value !== "object") return null; if (!objects.has(value)) objects.set(value, ++serial); return objects.get(value); };
  const owner = id => id === ids[0] ? s.umbraMoonlightRuntime : id === ids[1] ? s.umbraBloodSpikeRuntime : s.umbraPhantomNovaRuntime;
  const presentation=()=>{const f=s.umbraNormalPresentation.fx,live=o=>o?.active&&o?.visible!==false;
    return {mode:f.fxMode,counts:{moon:{...f.fxCounts},spike:{...f.spikeFxCounts},nova:{...f.novaFxCounts},final:{...f.finalFxCounts}},
      live:{moon:f.effects.filter(x=>live(x.object)).length,spike:[...f.spikeEffects.values()].filter(x=>live(x.object)).length,
        nova:[...f.novaEffects.values()].filter(x=>live(x.object)).length,fields:[...f.finalFields.values()].filter(x=>live(x.object)).length,
        marks:f.finalMarks.filter(x=>live(x.object)).length,rays:f.novaRays.filter(x=>live(x.object)).length}};};
  const body = value => value ? { identity:identity(value), x:value.center.x, y:value.center.y, vx:value.velocity.x, vy:value.velocity.y, radius:value.radius, width:value.width, height:value.height, enabled:value.enable } : null;
  const actor = enemy => ({ tag:tags.get(enemy) || null, identity:identity(enemy), body:body(enemy.body), type:enemy.enemyTypeId, behavior:enemy.aiBehavior,
    active:enemy.active, dying:enemy.isDying, hp:enemy.hp, maxHp:enemy.maxHp, scale:[enemy.scaleX,enemy.scaleY], baseScale:enemy.baseScale,
    bossDashing:enemy.isBossDashing || false, burstUntil:enemy.burstUntil || 0,
    normalLife:s.umbraRunContext?.enemyLives?.get(enemy)?.id, records:ids.map(id=>{const r=owner(id)?.targets.get(enemy);return r ? {identity:identity(r),lifeId:r.lifeId,normalLife:r.normalLife?.id,lastHitAt:r.lastHitAt,depth:r.depth} : null;}) });
  const snapshot = () => ({ realMs:performance.now(), sceneMs:s.time.now, sceneUpdates, physicalSteps, context:s.umbraRunContext.state,
    player:body(s.playerHitbox.body), hp:s.stats.hp, en:s.stats.stamina,
    actors:[...tags.keys()].map(actor), counts:Object.fromEntries(ids.map(id=>[id,{...owner(id)?.counts}])),
    clocks:ids.map(id=>owner(id)?.combatTimeMs), errors:ids.map(id=>owner(id)?.errors), calls:{...calls},
    final:s.getUmbraFinalVisualState(), nova:s.getUmbraPhantomNovaVisualState(), spike:s.getUmbraBloodSpikeSnapshot(),
    movement:{pose:s.umbraNormalPose,angle:s.playerSprite.angle,tilt:s.playerRobotMotion?.tiltAngle,lift:s.playerRobotMotion?.lift,shadowScale:s.playerRobotMotion?.shadowScale,
      afterimages:s.acMovementState?.visuals?.activeAfterimages?.filter(o=>o?.active).length || 0,targetFire:s.getAcTargetFireVisualCount(),shadowActive:s.playerShadow?.active || false},
    options:{...s.optionsState}, fxMode:s.umbraNormalPresentation.fx.fxMode, presentation:presentation(),stats:{...s.stats} });
  for (const name of ["updateDashEnemy","updateRangedEnemy","updateBossSpecialEnemy","updateVoidHunterBossEnemy","applyDamageToEnemy","playEnemyHitReaction","fireAcTargetTracerShot","spawnAcQuickBoostAfterimages"]) {
    const old = s[name]; originals.set(name,old); s[name]=function(...args){calls[name]=(calls[name]||0)+1;return old.apply(this,args);};
  }
  const pre=()=>sceneUpdates++, world=()=>physicalSteps++;
  s.events.on("preupdate",pre); s.physics.world.on("worldstep",world);
  s.game.loop.stop();
  const record=(operation,input,fn)=>{env.record("normal-presentation-boundary",{operation,input,natural:false});const before=snapshot(),result=fn();const row={operation,input,before,result,after:snapshot()};events.push(row);return row;};
  const step=n=>{if(!Number.isInteger(n)||n<1||n>600)throw Error("Bounded timeline required");for(let i=0;i<n;i++)s.game.step(time+=1000/60,1000/60);return snapshot();};
  const combatRow=()=>({player:{x:s.playerHitbox.body.center.x,y:s.playerHitbox.body.center.y,vx:s.playerHitbox.body.velocity.x,vy:s.playerHitbox.body.velocity.y,hp:s.stats.hp,en:s.stats.stamina},
    targets:[...tags.keys()].map(e=>({tag:tags.get(e),hp:e.hp,maxHp:e.maxHp,active:e.active,dying:e.isDying,x:e.body?.center.x,y:e.body?.center.y,slow:s.getEnemySpeedMultiplier(e)})),
    weapons:ids.map(id=>{const r=owner(id),clock=r.combatTimeMs;return{clock,accepted:r.counts.accepted||0,casts:r.counts.casts||0,impacts:r.counts.impacts||0,deployed:r.counts.deployed||0,regenerated:r.counts.regenerated||0,
      nextCast:r.nextCastAtMs==null?null:r.nextCastAtMs-clock,castTimes:r.casts?.map(c=>({impact:c.impactDueAtMs-clock,created:c.createdCombatTimeMs-clock,applied:c.appliedAtMs==null?null:c.appliedAtMs-clock,radius:c.radius}))||[],
      slots:r.slots?.map(q=>({state:q.state,until:q.deployedUntilMs==null?null:q.deployedUntilMs-clock,regen:q.regenerateAtMs==null?null:q.regenerateAtMs-clock,pulse:q.nextPulseAtMs-clock}))||[],
      fields:[...(r.finalState?.fields?.values()||[])].map(f=>({radius:f.radius,remaining:f.expiresAtMs-clock,created:f.createdAtMs-clock,position:f.position})),errors:r.errors};})});
  const actions = {
    step,
    row:combatRow,
    sampleSteps:n=>{const rows=[];for(let i=0;i<n;i++){step(1);rows.push(combatRow());}return rows;},
    seed:()=>{Phaser.Math.RND.sow(["phase7b-normal-controlled-comparison-v1"]);window.__UMBRA_COMPARISON_RNG__?.reset(0x7b000003,"comparison-start");return window.__UMBRA_COMPARISON_RNG__?.state() || null;},
    spawn:({type,tag,dx=150,dy=0,boss=false})=>record("actual-spawn-with-explicit-position",{type,tag,dx,dy,boss,noHpChange:true},()=>{
      const e=s.spawnEnemy(type,{isElite:boss,isBoss:boss}); if(!e)throw Error("Actual spawn refused"); e.body.reset(s.playerHitbox.x+dx,s.playerHitbox.y+dy); tags.set(e,tag);return actor(e);
    }),
    normalAi:()=>record("native-enemy-update",{delta:1000/60,noPhaseOrAttackTimeEdits:true},()=>{s.updateEnemies(1000/60);return [...tags.keys()].map(actor);}),
    bossDash:tag=>record("native-Lightning-Dash-effect-start",{tag,unchangedCanonicalDash:true,beamAwayFromPlayer:true},()=>{
      const e=[...tags].find(([,value])=>value===tag)?.[0];if(!e?.active)throw Error("Live Boss required");
      const angle=Math.PI/2,start={x:e.x,y:e.y},end={x:e.x,y:e.y+e.dashRange};
      s.fireBossLightningDash(e,start,end,angle,e.dashRange,Math.max(118,e.lightningRadius*1.24),e.lightningRadius,[]);
      return {dashSpeed:e.dashSpeed,dashDurationMs:e.dashDurationMs,currentCommand:s.isUmbraBossDashCommandActive(e),actor:actor(e),
        limitation:"Explicit attack effect boundary with zero secondary strike points; normal full telegraph sequence is not claimed"};
    }),
    nemesis:()=>record("native-NEMESIS-Brute-spawn-and-resize",{depth:6,qualification:"explicit spawn component, not natural probability/delay"},()=>{
      const original=s.spawnEnemy;let created=null;
      s.spawnEnemy=function(...args){const e=original.apply(this,args);if(e)created=actor(e);return e;};
      let e;try{e=s.spawnNemesisBoss(6,NEMESIS_BOSS_CONFIG.bosses[0],{x:s.playerHitbox.x+400,y:s.playerHitbox.y-140});}finally{s.spawnEnemy=original;}
      if(!e)throw Error("NEMESIS spawn refused");tags.set(e,"nemesis");return{beforeResize:created,afterResize:actor(e)};
    }),
    voidHunter:()=>record("native-VOID-HUNTER-spawn",{depth:11,qualification:"explicit spawn component, not natural stationary qualification"},()=>{
      const e=s.spawnVoidHunterBoss(11,{x:s.playerHitbox.x-350,y:s.playerHitbox.y+150});if(!e)throw Error("VOID spawn refused");tags.set(e,"void");return actor(e);
    }),
    damageTween:tag=>record("native-enemy-damage-and-hit-Tween",{tag,raw:1,notDedicatedTraversal:true},()=>{
      const e=[...tags].find(([,value])=>value===tag)?.[0];if(!e?.active||e.isDying)throw Error("Live enemy required");
      const before=actor(e);s.applyDamageToEnemy(e,1,0xffffff,null);return{before,after:actor(e),tween:!!e.hitScaleTween};
    }),
    poses:()=>record("normal-presentation-24-pose-entries",{directDisplayEntry:true,noMovementClaim:true},()=>{
      const a=window.umbraPreviewAssets, before=body(s.playerHitbox.body), rows=[];
      for(const direction of a.directionOrder)for(const mode of a.modeOrder){
        s.setPlayerRobotPose(direction,mode!=="idle",mode==="boost");s.updateUmbraNormalPresentation();const expected=a.getPose(direction,mode),p=s.playerSprite;
        rows.push({direction,mode,key:p.texture.key,expectedKey:expected.key,visible:p.visible,origin:[p.originX,p.originY],expectedOrigin:[expected.origin.x,expected.origin.y],
          scale:[p.scaleX,p.scaleY],expectedScale:expected.displayScale,body:body(s.playerHitbox.body)});
      }return{before,rows,after:body(s.playerHitbox.body)};
    }),
    motion:()=>record("normal-shared-motion-shadow-afterimage-entry",{directDisplayEntry:true},()=>{
      const before=body(s.playerHitbox.body);s.updatePlayerRobotMotion(1000/60,new Phaser.Math.Vector2(1,0),true,true,true,true);s.syncPlayerVisuals();s.updateUmbraNormalPresentation();
      s.spawnAcQuickBoostAfterimages(new Phaser.Math.Vector2(1,0),s.time.now,1);
      const list=s.acMovementState?.visuals?.activeAfterimages || [];
      return{before,after:body(s.playerHitbox.body),motion:{...s.playerRobotMotion},images:list.filter(o=>o?.active).map(o=>({texture:o.texture?.key,origin:[o.originX,o.originY],scale:[o.scaleX,o.scaleY],angle:o.angle,body:!!o.body})),
        player:{texture:s.playerSprite.texture.key,origin:[s.playerSprite.originX,s.playerSprite.originY],angle:s.playerSprite.angle},shadow:s.playerShadow ? {active:s.playerShadow.active,scaleX:s.playerShadow.scaleX,scaleY:s.playerShadow.scaleY} : null};
    }),
    targetFire:tag=>record("native-Target-Fire-visual-shot",{tag,directVisualEntry:true,noTraversalClaim:true},()=>{
      const e=[...tags].find(([,value])=>value===tag)?.[0];if(!e)throw Error("Target required");
      const before={hp:e.hp,counts:Object.fromEntries(ids.map(id=>[id,{...owner(id)?.counts}]))},n=calls.applyDamageToEnemy||0;
      const fired=s.fireAcTargetTracerShot(s.time.now,e,s.ensureAcMovementState());
      return{fired,before,after:{hp:e.hp,counts:Object.fromEntries(ids.map(id=>[id,{...owner(id)?.counts}]))},receiverCalls:(calls.applyDamageToEnemy||0)-n,visuals:s.getAcTargetFireVisualCount()};
    }),
    config:({fx="image",audio=true})=>record("presentation-options-only",{fx,audio},()=>{
      s.setUmbraNormalPresentationFxMode(fx);s.updateOptionsState({bgmEnabled:audio,sfxEnabled:audio},"explicit-normal-presentation-boundary");
      return{fx:s.umbraNormalPresentation.fx.fxMode,bgm:s.isBgmEnabled(),sfx:s.isSfxEnabled()};
    }),
    restore:()=>{for(const[name,old]of originals)s[name]=old;s.events.off("preupdate",pre);s.physics.world.off("worldstep",world);}
  };
  window.__UMBRA_PRESENTATION_COVERAGE__={actions,snapshot,export:()=>({events,final:snapshot()})};return snapshot();
}

function installComparisonRandom() {
  const original=Math.random, resets=[];let value=0, calls=0;
  const originalDateNow=Date.now, epoch=1800000000000,dateQuantumMs=1/4096,dateIncrementMs=Math.round((1000/60)/dateQuantumMs)*dateQuantumMs;let dateSteps=0,dateRestored=false;
  Date.now=()=>epoch+dateSteps*dateIncrementMs;
  window.__UMBRA_EXTERNAL_DATE__={advance(){dateSteps++;},
    state:()=>({epoch,steps:dateSteps,now:Date.now(),realPerformanceMs:performance.now(),incrementMs:dateIncrementMs,dateQuantumMs,
      extraMsPer300Steps:(dateIncrementMs-1000/60)*300,restored:dateRestored,
      scope:"Test-only Date.now advances by an exactly representable binary tick before each original Game.step; Scene delta and physical step unchanged"}),
    restore(){Date.now=originalDateNow;dateRestored=Date.now===originalDateNow;}};
  const reset=(seed,phase)=>{value=seed>>>0;calls=0;resets.push({seed:value,phase});};
  reset(0x7b000001,"entry-before-code");
  Math.random=()=>{calls++;value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  window.__UMBRA_COMPARISON_RNG__={reset,state:()=>({algorithm:"LCG-1664525-1013904223-uint32",value,calls,resets:[...resets]}),restore:()=>{Math.random=original;}};
}

function installPreparationControl() {
  const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), env=s.runEnvironmentIO;
  const oldChoices=s.showLevelUpChoices, oldOverlay=s.showLevelUpCardOverlay;
  let entered=false, time=null, steps=0, selections=0, firstOpening=null;
  const conditions=()=>({stageId:s.currentStage?.id,depth:s.stageDepth,inputs:s.umbraRunContext?.inputs,
    camera:{scrollX:s.worldCamera?.scrollX,scrollY:s.worldCamera?.scrollY,zoom:s.worldCamera?.zoom,
      width:s.worldCamera?.width,height:s.worldCamera?.height},
    obstacles:(s.stageObstacleBodies?.getChildren()||[]).map(o=>({x:o.body?.x,y:o.body?.y,width:o.body?.width,height:o.body?.height})),
    body:s.playerHitbox?.body?{x:s.playerHitbox.body.center.x,y:s.playerHitbox.body.center.y,vx:s.playerHitbox.body.velocity.x,vy:s.playerHitbox.body.velocity.y,radius:s.playerHitbox.body.radius}:null,
    equipment:s.getUmbraEquipmentSnapshot?.()});
  const state=()=>({entered,time,steps,selections,sceneTime:s.time.now,worldPaused:s.physics.world.isPaused,
    clocks:[s.umbraMoonlightRuntime?.combatTimeMs,s.umbraBloodSpikeRuntime?.combatTimeMs,s.umbraPhantomNovaRuntime?.combatTimeMs],
    opening:s.startingUpgradeSelectionsRemaining,firstOpening,conditions:conditions(),externalDate:window.__UMBRA_EXTERNAL_DATE__?.state(),rng:window.__UMBRA_COMPARISON_RNG__?.state(),normal:window.__NORMAL_SCENE_OBSERVER__.snapshot()});
  s.showLevelUpChoices=function(...args){
    // Seed immediately before the original first Opening candidate generation.
    // No candidate, choice ID, stage, or numeric result is substituted.
    if(!entered&&this.startingUpgradeSelectionsRemaining===3){
      Phaser.Math.RND.sow(["phase7b-first-opening-v1"]);
      window.__UMBRA_COMPARISON_RNG__?.reset(0x7b000002,"first-opening-before-original-candidates");
    }
    return oldChoices.apply(this,args);
  };
  s.showLevelUpCardOverlay=function(...args){
    const result=oldOverlay.apply(this,args);
    if(!entered&&this.startingUpgradeSelectionsRemaining===3&&this.levelUpActive){
      entered=true;time=this.time.now;this.game.loop.stop();
      firstOpening={conditions:conditions(),normal:window.__NORMAL_SCENE_OBSERVER__.snapshot()};
      env.record("controlled-preparation-start",{source:"first actual Opening overlay",time,hz:60,worldPaused:this.physics.world.isPaused,
        limitation:"Loading and HUB wall time are not performance measurements; all combat is still blocked"});
    }
    return result;
  };
  window.__UMBRA_PREP_CONTROL__={
    get time(){return time;},state,
    step(n=1){if(!entered||!Number.isInteger(n)||n<1||n>120)throw Error("Bounded preparation steps required");
      for(let i=0;i<n;i++){s.game.step(time+=1000/60,1000/60);steps++;}return state();},
    markSelection(){selections++;},
    restore(){s.showLevelUpChoices=oldChoices;s.showLevelUpCardOverlay=oldOverlay;}
  };
}

async function controlledUntil(page,predicate,maxSteps=180) {
  for(let n=0;n<=maxSteps;n++){
    const state=await page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.state());
    if(predicate(state))return state;
    if(n<maxSteps)await page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.step(1));
  }
  throw Error(`Preparation condition not reached in ${maxSteps} unchanged Game.step calls`);
}

async function controlledChoose(page,index) {
  const before=await controlledUntil(page,state=>state.normal.selectionActive&&state.normal.inputEnabled&&!state.normal.selectionLocked);
  await page.keyboard.down(String(index+1));
  // Phaser's normal input queue consumes the real DOM key during this step.
  await page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.step(1));
  const locked=await page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.state());
  await page.keyboard.up(String(index+1));
  if(!locked.normal.selectionLocked)throw Error("Actual key did not acquire the card selection lock");
  const after=await controlledUntil(page,state=>state.normal.cardsIdentity!==before.normal.cardsIdentity);
  await page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.markSelection());
  return{index,before,locked,after,selected:before.normal.cards[index]};
}

async function start(browser,name,{build=false,openingPlan=null,onOpen=()=>{}}={}) {
  const r=await h.open(browser,name,{path:"/umbra-integration.html?fixture=complete",...(build?{init:installComparisonRandom}:{})});onOpen(r);
  if(build)await r.page.evaluate(()=>{
    // RND is null before Phaser's actual Game constructor. Use its public
    // seed config, passing every other option and the original Scene unchanged.
    const Original=Phaser.Game, seed=["phase7b-before-actual-start-v1"];
    window.__UMBRA_GAME_SEED__={seed,applied:false,restored:false};
    Phaser.Game=new Proxy(Original,{construct(target,args){
      Phaser.Game=Original;window.__UMBRA_GAME_SEED__.restored=true;
      const config={...args[0],seed};Object.assign(window.__UMBRA_GAME_SEED__,{applied:true,sceneRetained:config.scene===args[0].scene,
        otherOptionsUnchanged:Object.keys(args[0]).filter(key=>key!=="seed").every(key=>config[key]===args[0][key])});
      const game=Reflect.construct(target,[config,...args.slice(1)],target), originalStep=game.step;
      game.step=function(...stepArgs){window.__UMBRA_EXTERNAL_DATE__.advance();return originalStep.apply(this,stepArgs);};
      window.__UMBRA_GAME_SEED__.originalGameInstance=game instanceof Original;return game;
    }});
  });
  await ui.waitHub(r.page);await r.page.evaluate(installSceneObserver);
  await r.page.evaluate(()=>{Phaser.Math.RND.sow(["phase7b-presentation-boundary-v1"]);});
  if(build)await r.page.evaluate(installPreparationControl);
  await ui.clickPhaserText(r.page,"SORTIE PREP");r.selections=[];
  if(build)await r.page.waitForFunction(()=>window.__UMBRA_PREP_CONTROL__?.state().entered);
  r.openingPlan=[];
  for(let n=0;n<3;n++){
    const state=build?(await controlledUntil(r.page,q=>q.normal.selectionActive&&q.normal.inputEnabled&&!q.normal.selectionLocked)).normal:await ui.enabledCards(r.page);
    let index=openingPlan?state.cards.findIndex(c=>c.id===openingPlan[n].id&&c.skillId===openingPlan[n].skillId&&c.type===openingPlan[n].type)
      :state.cards.findIndex(c=>["umbraBloodSpike","umbraPhantomNova"].includes(c.skillId)&&!state.skills[c.skillId]);
    if(index<0&&!openingPlan)index=state.cards.findIndex(c=>c.type==="passive");
    if(index<0)throw Error("The same legal Opening card ID is unavailable; comparison initial condition differs");
    const selected=state.cards[index];r.openingPlan.push({id:selected.id,skillId:selected.skillId,type:selected.type});
    r.selections.push(build?await controlledChoose(r.page,index):await ui.chooseCard(r.page,index));
  }
  if(build)await controlledUntil(r.page,state=>state.normal.normalContext?.state==="ACTIVE"&&!state.normal.selectionActive);
  else await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state==="ACTIVE");
  if(build){
    await r.page.locator("#umbra-integration-details > summary").click();await r.page.locator("#umbra-integration-boundary").click();await r.page.locator("#umbra-integration-details > summary").click();
    for(let n=0;n<15;n++){
      const state=(await controlledUntil(r.page,q=>(q.normal.selectionActive&&q.normal.inputEnabled&&!q.normal.selectionLocked)||(!q.normal.selectionActive&&!q.normal.worldPaused&&q.normal.normalContext?.state==="ACTIVE"))).normal;
      if(!state.selectionActive)break;
      const index=state.cards.findIndex(c=>["control","singularity"].includes(c.choiceId));r.selections.push(await controlledChoose(r.page,Math.max(0,index)));
    }
    r.preparation=await r.page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.state());
    if(r.preparation.normal.cards.length||r.preparation.normal.selectionActive||r.preparation.normal.worldPaused)throw Error("Boundary cards did not complete; no comparison was started");
    await r.page.evaluate(()=>window.__UMBRA_PREP_CONTROL__.restore());
  }
  if(build)await controlledUntil(r.page,q=>q.normal.normalContext?.state==="ACTIVE"&&!q.normal.selectionActive);
  else await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return s.umbraRunContext?.state==="ACTIVE"&&!s.levelUpActive&&!s.overlayContainer.visible;});
  await r.page.evaluate(installCoverageProbe);return r;
}

async function main(){
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,"harness"));
  for(const name of[path.basename(__filename),"umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs","umbra-integration-scene-observer.cjs"])
    fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
  const report={sourceRoot:h.sourceRoot,sources:h.sources,harnessSha256:h.sha(fs.readFileSync(__filename)),cases:[],errors:[],
    methodology:"Serial actual SurvivalScene boundary components; real HUB/Opening cards, native spawn/AI/damage and display functions. The two component cases switch to controlled Game.step60Hz after ACTIVE. The three FX/audio comparisons stop rAF at the first actual Opening overlay and use unchanged Game.step60Hz, real DOM card keys and the existing 680ms/360ms timers from there through actual mutation/OVL cards. Their legal Opening card IDs must match, including the passive ID. Phaser RND/config.seed and an explicit test-only Math.random LCG are seeded. The original Game constructor/Scene execute; a transparent Game.step wrapper advances only an external test Date.now on a 1/4096ms grid (16.666748046875ms/step, about 0.024414ms extra over 300 steps) before delegating unchanged arguments; Scene delta remains 1000/60ms. This controls the vendor TweenManager wall-clock dependency and avoids epoch-size floating rounding phase differences. No product clock or combat state is assigned/aligned; vendor/physics unchanged. External Date and original performance.now, Scene and physical counts are recorded separately; original Date.now is restored at session end. Loading/HUB wall time and initial render are not performance measurements. Explicit placements, spawn qualification bypasses and direct effect/display entries are logged. No enemy HP/damage edits. This is not normal rAF/real-Date performance, natural spawn qualification, complete Boss/Support AI, phone readability, audio audibility or a guarantee for every real-time environment. Initial-condition mismatch is distinguished from a row difference and never normalized away."};
  const browser=await h.launch();report.browserVersion=browser.version();
  const only=process.env.UMBRA_TEST_CASES?.split(",");let comparisonOpeningPlan=null;
  const run=async(name,fn,options={})=>{
    if(only&&!only.includes(name))return;
    const c={name,checks:[]};report.cases.push(c);let r;
    const check=(passed,label,actual=null)=>{c.checks.push({passed:!!passed,label,actual});if(!passed)throw Error(label);};
    try{r=await start(browser,name,{...options,openingPlan:options.build?comparisonOpeningPlan:null,onOpen:opened=>{r=opened;}});c.selections=r.selections;c.openingPlan=r.openingPlan;c.preparation=r.preparation;
      if(options.build&&!comparisonOpeningPlan)comparisonOpeningPlan=r.openingPlan;
      const op=(name,arg)=>r.page.evaluate(({name,arg})=>window.__UMBRA_PRESENTATION_COVERAGE__.actions[name](arg),{name,arg});
      await fn(r,c,check,op);c.probe=await r.page.evaluate(()=>window.__UMBRA_PRESENTATION_COVERAGE__.export());
    }catch(error){c.error=error.stack;if(r){c.selections=r.selections;c.openingPlan=r.openingPlan;c.failure=await r.page.evaluate(()=>({probe:window.__UMBRA_PRESENTATION_COVERAGE__?.export(),preparation:window.__UMBRA_PREP_CONTROL__?.state(),normal:window.__NORMAL_SCENE_OBSERVER__?.snapshot()})).catch(()=>null);await r.page.screenshot({path:path.join(out,`${name}-failure.png`),fullPage:true}).catch(()=>{});}}
    finally{if(r){c.externalDate=await r.page.evaluate(()=>window.__UMBRA_EXTERNAL_DATE__?.state()).catch(()=>null);
        await r.page.evaluate(()=>{try{window.__UMBRA_PREP_CONTROL__?.restore();window.__UMBRA_PRESENTATION_COVERAGE__?.actions.restore();window.__NORMAL_SCENE_OBSERVER__?.cleanup();const g=window.__SURVIVAL_GAME__;window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("PRESENTATION_COVERAGE_END");if(g?.pendingDestroy)g.runDestroy();}finally{window.__UMBRA_EXTERNAL_DATE__?.restore();window.__UMBRA_COMPARISON_RNG__?.restore();}}).catch(e=>c.endError=String(e));
        await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:15000}).catch(e=>c.endError=String(e));
        c.testSetup=await r.page.evaluate(()=>({gameSeed:window.__UMBRA_GAME_SEED__,externalDateRestored:window.__UMBRA_EXTERNAL_DATE__?.state().restored}));
        c.audit=await h.audit(r);await closeWithin(r.context.close(),"Context close").catch(e=>c.endError=String(e));
        if(options.build)c.checks.push({passed:c.testSetup.gameSeed?.originalGameInstance&&c.testSetup.gameSeed?.sceneRetained&&c.testSetup.gameSeed?.otherOptionsUnchanged&&c.testSetup.gameSeed?.restored&&c.testSetup.externalDateRestored,label:"original Game/Scene/options retained and original constructor/Date restored"});
        c.checks.push({passed:c.audit.isolationPassed,label:"native Storage data and external requests zero"},{passed:c.audit.pageErrors.length===0,label:"uncaught product errors zero"});}
      c.passed=!c.error&&!c.endError&&c.checks.length>0&&c.checks.every(x=>x.passed);fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify(c,null,2),{flag:"wx"});console.log(JSON.stringify({name,passed:c.passed,error:c.error}));}
  };
  try{
    await run("native-enemy-shape-ai",async(r,c,check,op)=>{
      for(const[type,tag,dx,dy,boss]of[["chaser","chaser",200,0,false],["dash","dash",350,100,false],["ranged","ranged",420,-200,false],["boss_lightning_dash","boss",650,0,true]])await op("spawn",{type,tag,dx,dy,boss});
      c.ai=await op("normalAi");check(c.ai.after.calls.updateDashEnemy>0&&c.ai.after.calls.updateRangedEnemy>0&&c.ai.after.calls.updateBossSpecialEnemy>0,"actual normal AI dispatch reaches dash/ranged/Boss helpers");
      check(c.ai.result.every(e=>e.normalLife&&e.records.every(record=>record?.normalLife===e.normalLife)),"actual normal spawns register three weapon records with their existing normal life");
      c.dash=await op("bossDash","boss");c.dashMoving=await op("step",6);
      const boss=c.dashMoving.actors.find(e=>e.tag==="boss");check(boss.bossDashing&&Math.abs(Math.hypot(boss.body.vx,boss.body.vy)-c.dash.result.dashSpeed)<1e-6,"retained native Boss dash keeps its command magnitude without repeated factor",boss);
      c.nemesis=await op("nemesis");const n=c.nemesis.result;
      check(n.beforeResize.normalLife===n.afterResize.normalLife&&n.beforeResize.records.every((x,i)=>x?.identity===n.afterResize.records[i]?.identity),"NEMESIS post-spawn resize preserves same existing target records/life",n);
      check(n.beforeResize.body.width!==n.afterResize.body.width||n.beforeResize.body.height!==n.afterResize.body.height,"actual NEMESIS modifies its generated body shape",n);
      c.void=await op("voidHunter");check(c.void.result.records.every(Boolean)&&c.void.result.normalLife&&c.void.result.behavior==="voidHunter","native VOID spawn registers normal and all three dedicated lives");
      await op("normalAi");c.afterVoid=await op("step",2);check(c.afterVoid.calls.updateVoidHunterBossEnemy>0,"normal AI dispatch reaches VOID handler");
      c.hit=await op("damageTween","nemesis");check(c.hit.result.after.hp<c.hit.result.before.hp&&c.hit.result.tween,"actual damage receiver starts native hit reaction");
      check(c.hit.result.before.records.every((x,i)=>x.identity===c.hit.result.after.records[i].identity),"hit reaction does not replace dedicated life");
      c.afterTween=await op("step",16);const after=c.afterTween.actors.find(e=>e.tag==="nemesis");
      check(after.active&&!after.dying&&after.records.every((x,i)=>x.identity===c.hit.result.before.records[i].identity),"live hit-Tween target retains identities after controlled updates",after);
      await r.page.screenshot({path:path.join(out,"normal-enemies-shapes.png"),fullPage:true});
    });
    await run("normal-poses-motion-targetfire",async(r,c,check,op)=>{
      c.poses=await op("poses");check(c.poses.result.rows.length===24&&c.poses.result.rows.every(p=>p.visible&&p.key===p.expectedKey&&JSON.stringify(p.origin)===JSON.stringify(p.expectedOrigin)&&p.scale.every(x=>x===p.expectedScale)),"normal display entry applies all 24 exact keys/pivots/scales");
      check(c.poses.result.rows.every(p=>JSON.stringify(p.body)===JSON.stringify(c.poses.result.before)&&p.body.radius===22),"24 presentation entries leave physical body and velocity unchanged");
      c.motion=await op("motion");check(c.motion.result.images.length>0&&c.motion.result.images.every(p=>!p.body&&p.texture===c.motion.result.player.texture),"normal native afterimages copy UMBRA current pose without physical bodies",c.motion.result);
      check(c.motion.result.motion.tiltAngle!==0&&c.motion.result.motion.lift!==0&&c.motion.result.motion.shadowScale!==1,"native motion retains lean/lift/shadow adjustments");
      await op("spawn",{type:"tank",tag:"visual-target",dx:280});c.targetFire=await op("targetFire","visual-target");
      check(c.targetFire.result.fired&&c.targetFire.result.visuals>0&&c.targetFire.result.receiverCalls===0&&JSON.stringify(c.targetFire.result.before)===JSON.stringify(c.targetFire.result.after),"actual Target Fire creates visuals with zero damage and zero dedicated acceptance");
      await r.page.screenshot({path:path.join(out,"normal-pose-afterimages-targetfire.png"),fullPage:true});
    });
    for(const variant of[{id:"image-audio-on",fx:"image",audio:true},{id:"off-audio-on",fx:"off",audio:true},{id:"image-audio-off",fx:"image",audio:false}]){
      await run(`normal-comparison-${variant.id}`,async(r,c,check,op)=>{
        c.variant=variant;c.config=await op("config",variant);c.comparisonSeed=await op("seed");
        for(let i=0;i<4;i++)await op("spawn",{type:"boss_crack",tag:`target-${i}`,dx:95+(i%2)*90,dy:-55+Math.floor(i/2)*110,boss:true});
        c.initial=await op("row");c.rows=[];c.inputs=[];
        for(let chunk=0;chunk<10;chunk++){
          const held=chunk===0?["ArrowRight","Shift"]:chunk===3?["ArrowLeft","Shift"]:[];
          for(const key of held)await r.page.keyboard.down(key);
          c.rows.push(...await op("sampleSteps",30));
          for(const key of held)await r.page.keyboard.up(key);
          c.inputs.push({fromStep:chunk*30,steps:30,held});
        }
        c.final=await op("row");
        check(c.final.weapons.every(w=>w.accepted>0&&w.errors===0),"all three real attack runtimes accept damage in this comparison",c.final.weapons);
        check(c.final.weapons[1].impacts>0&&c.rows.some(row=>row.weapons.some(w=>w.fields.length>0)),"real SPIKE impacts and Final fields occur in this mode");
        check(c.final.weapons[2].deployed>0&&c.final.weapons[2].regenerated>0,"NOVA actually deploys and regenerates under this mode");
        const shown=(await r.page.evaluate(()=>window.__UMBRA_PRESENTATION_COVERAGE__.snapshot())).presentation;c.presentation=shown;
        check(variant.fx==="off"?Object.values(shown.live).every(n=>n===0):shown.counts.moon.shown>0&&shown.counts.spike.image>0&&shown.counts.nova.image>0,
          variant.fx==="off"?"FX OFF has zero live shared attack/field display objects":"image mode actually creates all three weapon image effects",shown);
        await r.page.screenshot({path:path.join(out,`${c.name}.png`),fullPage:true});
      },{build:true});
    }
    const base=report.cases.find(c=>c.name==="normal-comparison-image-audio-on");report.comparisons=[];
    for(const name of["normal-comparison-off-audio-on","normal-comparison-image-audio-off"]){
      const candidate=report.cases.find(c=>c.name===name);if(!base||!candidate)continue;
      const preparationKey=c=>c.preparation?{steps:c.preparation.steps,selections:c.preparation.selections,openingPlan:c.openingPlan,
        firstOpening:c.preparation.firstOpening.conditions,conditions:c.preparation.conditions,
        clocks:c.preparation.clocks,stats:c.preparation.normal.stats,stage:c.preparation.normal.stageId,
        build:c.selections.map(x=>({id:x.selected?.id??x.before.normal?.cards[x.index]?.id,skillId:x.selected?.skillId,choiceId:x.selected?.choiceId,phase:x.selected?.phase}))}:null;
      const preparationEqual=!!base.preparation&&!!candidate.preparation&&JSON.stringify(preparationKey(base))===JSON.stringify(preparationKey(candidate));
      const initialEqual=!!base.initial&&!!candidate.initial&&JSON.stringify(base.initial)===JSON.stringify(candidate.initial),rowsEqual=!!base.rows&&!!candidate.rows&&JSON.stringify(base.rows)===JSON.stringify(candidate.rows);
      report.comparisons.push({name,preparationEqual,initialEqual,rowsEqual,
        classification:!preparationEqual||!initialEqual?"INITIAL_CONDITION_MISMATCH":!rowsEqual?"CONTROLLED_ROW_DIFFERENCE":"SAME_ROWS",
        passed:base.passed&&candidate.passed&&preparationEqual&&initialEqual&&rowsEqual,
        scope:"Unchanged controlled Game.step60Hz, four explicit native-HP bosses, same key timeline; exact real HP/body/deadline rows. Different initial timing or rows remains a failure requiring diagnosis, not normalized away."});
    }
  }catch(error){report.errors.push(error.stack);}finally{await closeWithin(browser.close(),"Browser close").catch(error=>report.errors.push(error.stack));report.passed=report.errors.length===0&&report.cases.length>0&&report.cases.every(c=>c.passed);
    if(report.comparisons?.some(pair=>!pair.passed))report.passed=false;
    fs.writeFileSync(path.join(out,"integration-presentation-coverage.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,checks:report.cases.reduce((sum,c)=>sum+c.checks.length,0)}));if(!report.passed)process.exitCode=1;
    // A closed/disconnected Chromium transport must not keep this completed job alive.
    setTimeout(()=>process.exit(process.exitCode||0),2000).unref();}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={installCoverageProbe,start};
