"use strict";

const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT required");
const fixture = process.env.UMBRA_TEST_FIXTURE || "medium";
if (!["medium", "complete"].includes(fixture)) throw Error("Natural progression fixture must be medium or complete");
fs.mkdirSync(out, { recursive: true });
const report = { createdAt: new Date().toISOString(), sourceRoot:h.sourceRoot, sources:h.sources,
  harnessSha256:h.sha(fs.readFileSync(__filename)), bootstrapHarnessSha256:h.harnessSha256,
  inputHarnessSha256:h.sha(fs.readFileSync(path.join(__dirname,"umbra-integration-initialization-browser.cjs"))),
  methodology:"Normal-rAF functional progression, not CPU/GPU performance measurement. Synthetic medium starting progression only. Actual DOM START, actual Phaser SORTIE pointer, normal 680ms card enable and 360ms commit, browser keyboard movement/boost and choices. Read-only player/enemy/drop coordinates guide finite input. No direct spawn, XP/Stage grant, HP/EN/invulnerability edit, Gate-clock change, physics step change, or arena stubs. Natural combat target is actual Opening3→natural spawn→real kill/drop/pickup→level-up card→120000ms natural Gate→actual Gate choice. Wall-clock budget210s includes loading and card pauses. Failure/unreached endpoints preserved without retries or combat changes. Sparse observation wrappers delegate every original method unchanged. Screenshots/JSON are after the progression interval.",
  fixture, fixtureClassification: fixture === "complete" ? "BOUNDARY_START_PROGRESSION_ONLY_NO_S8_BUTTON" : "NATURAL_MEDIUM_START",
  inputRevision: "clearance-heading-v3-gate-priority", inputNotes: "Previous medium run died at83.084s while greedily approaching drops. Complete v2 survived to normal Gate but its safety score avoided the Gate and the normal45s deadline collapsed it. V3 keeps eight-direction0.55s clearance planning before Gate, then uses direct legal keys toward the real Gate with short legal boost while far away. This is test input planning, not product movement/physics replacement. Complete uses its declared high starting gear/upgrades but never presses the boundary S8 button; all run Stage/XP/cards/Gate remain naturally generated.",
  wallClockLimitMs:210000, inputs:[], selections:[], samples:[], checks:[], errors:[] };
report.methodology = report.methodology.replace("Synthetic medium starting progression only.", `Synthetic ${fixture} starting progression only; ${report.fixtureClassification}.`);

function installNaturalObserver() {
  const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),events=[],counts={},originals=new Map();
  let updates=0,physics=0; const started=performance.now();
  const clock=()=>({realMs:performance.now(),sceneMs:s.time.now,survivalMs:s.survivalTime,depth:s.stageDepth,updates,physics});
  const summary=o=>({id:o?.id,typeId:o?.typeId,kind:o?.kind,value:o?.value,xpValue:o?.xpValue,coinValue:o?.coinValue,hp:o?.hp,x:o?.x,y:o?.y,active:o?.active});
  for(const name of ["spawnEnemy","killEnemy","handleXpPickup","handleRareItemPickup","handleDataCachePickup","gainExperience","showLevelUpCardOverlay","completeLevelUpCardSelection","spawnStageGate","handleGateEnter","chooseNextStage","chooseForceBreakthrough","gameOverPlayer"]){
    if(typeof s[name]!=="function")continue;const original=s[name];originals.set(name,original);
    s[name]=function(...args){counts[name]=(counts[name]||0)+1;
      const before={...clock(),name,arguments:args.map(v=>v==null||["string","number","boolean"].includes(typeof v)?v:summary(v)),stats:{...s.stats},unsecured:s.runUnsecuredCoins,wallet:s.coins};
      const result=original.apply(this,args);if(events.length<12000)events.push({...before,after:{level:s.stats?.level,xp:s.stats?.xp,pending:s.pendingLevelUps,unsecured:s.runUnsecuredCoins,wallet:s.coins,depth:s.stageDepth}});return result;};
  }
  const update=()=>updates++,worldstep=()=>physics++;
  s.events.on("preupdate",update);s.physics.world.on("worldstep",worldstep);
  function state(){
    const p=s.playerHitbox,b=s.getStageMovementBounds?.(s.currentStage,50),g=s.stageGate?.container;
    const objects=group=>(group?.getChildren?.()||[]).filter(o=>o.active).map(o=>({x:o.x,y:o.y,vx:o.body?.velocity.x||0,vy:o.body?.velocity.y||0,radius:o.body?.radius||18,value:o.value,xpValue:o.xpValue,type:o.typeId,hp:o.hp}));
    return {...clock(),started,context:s.umbraRunContext?{runId:s.umbraRunContext.runId,generation:s.umbraRunContext.generation,state:s.umbraRunContext.state,mechId:s.umbraRunContext.mechId,fixtureId:s.umbraRunContext.inputs.fixtureId,boundaryBuildApplied:!!s.umbraRunContext.boundaryBuildApplied}:null,
      stats:{...s.stats},player:p?{x:p.x,y:p.y,vx:p.body?.velocity.x,vy:p.body?.velocity.y}:null,bounds:b,
      gameOver:s.gameOver,endReason:s.umbraNormalEndSnapshot?.reason,extractionComplete:s.extractionComplete,shop:s.shopActive,worldPaused:s.physics.world.isPaused,
      opening:s.startingUpgradeSelectionsRemaining,pending:s.pendingLevelUps,levelUp:s.levelUpActive,inputEnabled:s.levelUpInputEnabled,locked:s.levelUpSelectionLocked,mode:s.levelUpSelectionMode,
      cards:(s.levelUpCardRecords||[]).map((r,i)=>({index:i,title:r.model.title,type:r.model.option.type,id:r.model.option.id,skillId:r.model.option.skillId,phase:r.model.option.phase,choiceId:r.model.option.choiceId})),
      skills:Object.fromEntries(Object.entries(s.playerSkills||{}).map(([id,st])=>[id,st.stageIndex+1])),
      enemies:objects(s.enemies),drops:[...objects(s.xpOrbs),...objects(s.rareItems)],
      gate:g?.active?{x:g.x,y:g.y,status:s.gateState?.status}:null,gateChoice:s.gateChoiceActive,gateGuidance:s.gateGuidanceOverlayActive,
      unsecured:s.runUnsecuredCoins,wallet:s.coins,kills:s.killCount,
      weapons:["Moonlight","BloodSpike","PhantomNova"].map(n=>{const r=s[`umbra${n}Runtime`];return r?{name:n,time:r.combatTimeMs,counts:{...r.counts},errors:r.errors}:null;}),counts:{...counts}};
  }
  window.__NATURAL_INTEGRATION_OBSERVER__={state,export:()=>({events,counts,snapshot:state(),limit:12000}),cleanup(){for(const[name,fn]of originals)s[name]=fn;s.events.off("preupdate",update);s.physics?.world?.off("worldstep",worldstep);}};
  return state();
}

async function main(){let browser,r;const held=new Set();
  const check=(passed,label,actual=null)=>report.checks.push({passed:!!passed,label,actual});
  async function keys(next,reason,state){
    const target=new Set(next);if([...held].every(k=>target.has(k))&&[...target].every(k=>held.has(k)))return;
    for(const key of [...held])if(!target.has(key)){await r.page.keyboard.up(key);held.delete(key);}
    for(const key of target)if(!held.has(key)){await r.page.keyboard.down(key);held.add(key);}
    report.inputs.push({realMs:Date.now(),survivalMs:state?.survivalMs,keys:[...held],reason,player:state?.player,stamina:state?.stats.stamina});
  }
  try{
    fs.mkdirSync(path.join(out,"harness"),{recursive:true});
    for(const name of [path.basename(__filename),"umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs"])fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
    browser=await h.launch();report.browserVersion=browser.version();
    r=await h.open(browser,`${fixture}-natural-progression`,{path:`/umbra-integration.html?fixture=${fixture}`});
    await ui.waitHub(r.page);report.hub=await r.page.evaluate(installNaturalObserver);
    report.startEnvironment=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot());
    report.sortiePointer=await ui.clickPhaserText(r.page,"SORTIE PREP");
    const deadline=Date.now()+report.wallClockLimitMs;let lastSample=0,lastProgress=0,origin=null,gateChosen=false,lastSelectionScene=-1;
    while(Date.now()<deadline){
      const state=await r.page.evaluate(()=>window.__NATURAL_INTEGRATION_OBSERVER__.state());report.latest=state;
      if(state.gameOver||state.extractionComplete){report.stopReason=state.gameOver?(state.endReason==="gateCollapse"?"NATURAL_GATE_COLLAPSE":"NATURAL_DEATH"):"EXTRACTION";break;}
      if(state.depth>1&&gateChosen){report.stopReason="NATURAL_GATE_NEXT_DEPTH_REACHED";break;}
      if(state.player&&!origin)origin={...state.player};
      if(Date.now()-lastSample>=1000){report.samples.push(state);lastSample=Date.now();}
      if(Date.now()-lastProgress>=10000){console.log(JSON.stringify({progress:true,survivalMs:state.survivalMs,depth:state.depth,hp:state.stats.hp,level:state.stats.level,enemies:state.enemies.length,dropCount:state.drops.length,counts:state.counts,gate:state.gate,selection:state.mode}));lastProgress=Date.now();}
      if(state.gateGuidance){await keys([],"gate-guidance",state);await r.page.keyboard.press("Enter");}
      else if(state.gateChoice){await keys([],"actual-gate-choice",state);if(!gateChosen){report.gateChoiceBefore=state;await r.page.keyboard.press("1");gateChosen=true;}}
      else if(state.levelUp){
        await keys([],"actual-card-pause",state);
        if(state.inputEnabled&&!state.locked&&state.cards.length&&state.sceneMs!==lastSelectionScene){
          let card;
          if(state.mode==="skillMutation")card=state.cards.find(c=>c.choiceId==="assault"||c.choiceId==="execution")||state.cards[0];
          else{
            card=state.cards.find(c=>c.skillId==="umbraBloodSpike"&&!state.skills.umbraBloodSpike)
              ||state.cards.find(c=>c.skillId==="umbraPhantomNova"&&!state.skills.umbraPhantomNova)
              ||(state.stats.hp<state.stats.maxHp*.65&&state.cards.find(c=>c.id==="vitalBloom"))
              ||state.cards.find(c=>c.skillId==="umbraBloodSpike")||state.cards.find(c=>c.skillId==="umbraPhantomNova")
              ||state.cards.find(c=>c.skillId==="umbraMoonlight")||state.cards.find(c=>c.id==="vitalBloom")||state.cards[0];
          }
          report.selections.push({before:state,chosen:card});lastSelectionScene=state.sceneMs;
          await r.page.keyboard.press(String(card.index+1));
        }
      }else if(state.player&&!state.worldPaused&&!state.shop){
        const p=state.player,elapsed=state.survivalMs||0,b=state.bounds;
        let target=state.gate,reason="gate-approach";
        if(!target){
          const drop=state.drops.map(d=>({...d,distance:Math.hypot(d.x-p.x,d.y-p.y),clearance:Math.min(...state.enemies.map(e=>Math.hypot(e.x-d.x,e.y-d.y)-(e.radius||18)))}))
            .filter(d=>d.distance<450&&d.clearance>150).sort((a,b)=>a.distance-b.distance)[0];
          if(drop){target=drop;reason="unguarded-actual-drop-approach";}
          else{const angle=Math.atan2((p.y-origin.y)/650,(p.x-origin.x)/800)+.6;target={x:origin.x+800*Math.cos(angle),y:origin.y+650*Math.sin(angle)};reason="wide-continuous-patrol";}
        }
        if(b)target={x:Math.max(b.left+50,Math.min(b.right-50,target.x)),y:Math.max(b.top+50,Math.min(b.bottom-50,target.y))};
        const dx=target.x-p.x,dy=target.y-p.y,length=Math.hypot(dx,dy),speed=state.stats.moveSpeed||500;
        if(state.gate){
          const next=[];
          if(length>25){if(Math.abs(dx)>length*.32)next.push(dx>0?"ArrowRight":"ArrowLeft");if(Math.abs(dy)>length*.32)next.push(dy>0?"ArrowDown":"ArrowUp");}
          if(length>350&&elapsed%1900<350&&state.stats.stamina>state.stats.maxStamina*.3)next.push("Shift");
          await keys(next,"direct-real-gate-priority",state);
          await r.page.waitForTimeout(120);
          continue;
        }
        const headings=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4,x=Math.cos(angle),y=Math.sin(angle);
          let clearance=1000,wall=false;
          for(const t of [.15,.35,.55]){const q={x:p.x+x*speed*t,y:p.y+y*speed*t};
            if(b&&(q.x<b.left+70||q.x>b.right-70||q.y<b.top+70||q.y>b.bottom-70))wall=true;
            for(const e of state.enemies)clearance=Math.min(clearance,Math.hypot(q.x-(e.x+e.vx*t),q.y-(e.y+e.vy*t))-22-(e.radius||18));}
          const toward=length?((dx*x+dy*y)/length):0,velocity=Math.hypot(p.vx,p.vy),continuity=velocity?(p.vx*x+p.vy*y)/velocity:0;
          const score=(wall?-10000:0)+Math.min(250,clearance)*3+(clearance<60?-2000:0)+toward*(state.gate?220:80)+continuity*45;
          return {x,y,clearance,wall,score};}).sort((a,b)=>b.score-a.score);
        const best=headings[0],next=[];
        if(length>18||best.clearance<120){if(Math.abs(best.x)>.3)next.push(best.x>0?"ArrowRight":"ArrowLeft");if(Math.abs(best.y)>.3)next.push(best.y>0?"ArrowDown":"ArrowUp");}
        if(next.length&&!state.gate&&best.clearance>180&&length>160&&elapsed%2200<400&&state.stats.stamina>state.stats.maxStamina*.4)next.push("Shift");
        await keys(next,reason,state);
      }else await keys([],"blocked-or-loading",state);
      await r.page.waitForTimeout(160);
    }
    report.stopReason ||= "WALL_CLOCK_LIMIT_UNREACHED";await keys([],"functional-interval-ended",report.latest);
    report.observation=await r.page.evaluate(()=>window.__NATURAL_INTEGRATION_OBSERVER__.export());
    const events=report.observation.events;
    const openingChoices=report.selections.filter(selection=>selection.before.opening>0);
    check(openingChoices.length===3&&openingChoices.map(selection=>selection.before.opening).join(",")==="3,2,1","actual three Opening confirmations occurred",openingChoices.map(selection=>({remaining:selection.before.opening,chosen:selection.chosen})));
    check(events.some(e=>e.name==="spawnEnemy"),"natural normal spawn executed");
    check(events.some(e=>e.name==="killEnemy"),"real enemy kill executed");
    check(events.some(e=>["handleXpPickup","handleRareItemPickup","handleDataCachePickup"].includes(e.name)),"real physics pickup executed");
    check(report.selections.some(s=>s.before.opening===0&&s.before.mode==="level"),"actual post-Opening natural level-up card chosen");
    check(events.filter(e=>["killEnemy","handleXpPickup","handleRareItemPickup","gainExperience"].includes(e.name)).every(e=>e.wallet===report.hub.wallet&&e.after.wallet===report.hub.wallet),"combat/pickup XP never directly increases confirmed wallet");
    const gate=events.find(e=>e.name==="spawnStageGate");check(!!gate&&gate.survivalMs>=120000,"Gate spawned after natural120000ms",gate?.survivalMs);
    check(gateChosen&&report.stopReason==="NATURAL_GATE_NEXT_DEPTH_REACHED","actual Gate choice reaches next Depth",report.stopReason);
    await r.page.screenshot({path:path.join(out,"natural-interval-ended.png"),fullPage:true});
    report.environment=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot());
    check(!report.latest.context?.boundaryBuildApplied&&!report.environment.records.some(e=>e.type==="explicit-boundary-build"),"boundary Stage8 action was never used");
    if(report.stopReason==="NATURAL_GATE_NEXT_DEPTH_REACHED"){
      report.lifecycleSupplement={classification:"BOUNDARY_EXTRACT_AFTER_NATURAL_GATE_NO_SECOND_NATURAL_GATE_CLAIM",firstRunId:report.latest.context.runId};
      await r.page.evaluate(()=>window.__NATURAL_INTEGRATION_OBSERVER__.cleanup());
      report.lifecycleSupplement.extraction=await r.page.evaluate(()=>{
        const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        const before={locked:s.gateChoiceLocked,depth:s.stageDepth,unsecured:s.runUnsecuredCoins,wallet:s.coins};
        s.runEnvironmentIO.record("explicit-boundary-extract-after-natural-gate",{method:"chooseExtract",naturalGateAtDepth:1,currentDepth:s.stageDepth,noSecondNaturalGateClaim:true});
        s.chooseExtract();return{before,end:s.umbraNormalEndSnapshot,state:s.umbraRunContext?.state,wallet:s.coins,environment:s.runEnvironmentIO.snapshot()};
      });
      check(report.lifecycleSupplement.extraction.state==="ENDED"&&report.lifecycleSupplement.extraction.end?.reason==="EXTRACT","separate boundary extraction uses real end and RAM result path");
      await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").returnToOpeningShop("自然Gate後の境界抽出・同session再出撃"));
      await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return s.shopActive&&!s.restartInProgress;},null,{timeout:20000});
      report.lifecycleSupplement.hub=await r.page.evaluate(()=>({shop:window.__SURVIVAL_GAME__.scene.getScene("survival-scene").shopActive,environment:window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot()}));
      await ui.clickPhaserText(r.page,"SORTIE PREP");
      await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return s.levelUpActive&&s.levelUpInputEnabled&&!s.levelUpSelectionLocked;},null,{timeout:15000});
      report.lifecycleSupplement.secondOpening=await r.page.evaluate(installNaturalObserver);
      const second=report.lifecycleSupplement.secondOpening;
      check(second.context.runId!==report.lifecycleSupplement.firstRunId&&second.opening===3&&second.skills.umbraMoonlight===1&&!second.skills.umbraBloodSpike&&!second.skills.umbraPhantomNova,"same-session second SORTIE gets a new run and initial MoonS1 Opening3");
      await r.page.screenshot({path:path.join(out,"natural-then-boundary-extract-second-opening.png"),fullPage:true});
    }
  }catch(error){report.errors.push(error.stack);}
  finally{
    if(r){await keys([],"test-end",report.latest).catch(()=>{});report.observation??=await r.page.evaluate(()=>window.__NATURAL_INTEGRATION_OBSERVER__?.export()).catch(()=>null);
      await r.page.evaluate(()=>{window.__NATURAL_INTEGRATION_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("NATURAL_TEST_END");}).catch(e=>report.errors.push(String(e)));
      await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot().closed,null,{timeout:10000}).catch(e=>report.errors.push(String(e)));
      report.endEnvironment=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot()).catch(()=>null);
      await h.close(r);report.context=r.record;check(r.record.isolationPassed,"native data/external API0");check(r.record.pageErrors.length===0,"no uncaught browser errors",r.record.pageErrors);}
    await browser?.close();report.passed=report.errors.length===0&&report.checks.length>0&&report.checks.every(c=>c.passed);
    const file=path.join(out,"integration-natural.json");fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,file,stopReason:report.stopReason,errors:report.errors}));process.exitCode=report.passed?0:1;
  }
}
if(require.main===module)main();
