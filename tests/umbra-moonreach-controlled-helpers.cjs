"use strict";
// Test-only functions copied unchanged from prior controlled presentation coverage.
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


module.exports={installComparisonRandom,installPreparationControl,controlledUntil,controlledChoose};
