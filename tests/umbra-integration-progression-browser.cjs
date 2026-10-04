"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const h=require("./umbra-integration-browser-harness.cjs"),ui=require("./umbra-integration-initialization-browser.cjs");
const boundary=require("./umbra-integration-boundaries-browser.cjs");
const out=process.env.UMBRA_TEST_OUTPUT;if(!out)throw Error("Fresh UMBRA_TEST_OUTPUT required");
const ids=["umbraMoonlight","umbraBloodSpike","umbraPhantomNova"];
async function read(page){return page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{...window.__NORMAL_SCENE_OBSERVER__.snapshot(),
  xp:s.stats.xp,nextLevelXp:s.stats.nextLevelXp,depth:s.stageDepth,deep:s.isDeepLevelProgressionActive(),gear:s.getUmbraEquipmentSnapshot(),
  mutationEntries:Object.fromEntries(Object.entries(s.skillMutationState.entries).map(([id,e])=>[id,{core:e.core,final:e.final,stage4Selected:e.stage4Selected,stage8Selected:e.stage8Selected}])),
  mutationPending:s.skillMutationState.pendingQueue.map(e=>({skillId:e.skillId,phase:e.phase})),environmentId:s.runEnvironmentIO.id};});}
async function main(){fs.mkdirSync(out,{recursive:true});const report={sourceRoot:h.sourceRoot,sources:h.sources,harnessSha256:h.sha(fs.readFileSync(__filename)),
  methodology:"Normal SurvivalScene at explicitly qualified Relay10 with real restart/Opening cards. All run growth comes from real gainExperience called with declared synthetic XP and real card input/680ms enable/360ms commit. No direct level, Stage, pending, Mutation, OVL or stats assignment. This isolates last-Lv25-pending and Deep/Final-bonus priority and is not natural XP collection or natural deep arrival. Normal rAF remains active; overlays pause combat normally. Existing OD MOD selections produced by synthetic Deep XP are selected through actual cards at their unchanged priority and are counted separately from weapon/normal/Mutation/OVL budgets.",checks:[],selections:[],xpInputs:[]};
  const checkpoint=(phase,detail={})=>{const row={at:new Date().toISOString(),phase,...detail};fs.appendFileSync(path.join(out,"checkpoints.jsonl"),JSON.stringify(row)+"\n");console.log(JSON.stringify(row));};
  const check=(p,label,detail)=>{report.checks.push({passed:!!p,label,detail});checkpoint("check",{passed:!!p,label,checks:report.checks.length});assert.ok(p,label);};let browser,r;
  const limit=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error(label)),ms);timer.unref();})]);
  const deadline=setTimeout(async()=>{report.deadlineError="Harness wall deadline120s exceeded";checkpoint("deadline",{checks:report.checks.length});fs.writeFileSync(path.join(out,"deadline-partial.json"),JSON.stringify(report,null,2),{flag:"wx"});await limit(browser?.close()||Promise.resolve(),5000,"deadline browser close timeout").catch(()=>{});process.exit(1);},120000);
  const gain=async(count,reason)=>{const input=await r.page.evaluate(({count,reason})=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),rows=[];
    for(let i=0;i<count;i++){const xp=s.stats.nextLevelXp,before={level:s.stats.level,pending:s.pendingLevelUps,xp:s.stats.xp};s.runEnvironmentIO.record("explicit-synthetic-XP-input",{reason,xp,before});s.gainExperience(xp);rows.push({xp,before,after:{level:s.stats.level,pending:s.pendingLevelUps,xp:s.stats.xp}});}return rows;},{count,reason});report.xpInputs.push({reason,rows:input});return read(r.page);};
  const settleExistingOverdrive=async()=>{for(let i=0;i<4;i++){const current=await ui.enabledCards(r.page);if(current.selectionMode!=="overdriveMod")return current;
    checkpoint("existing-OD-card",{mode:current.selectionMode,cards:current.cards.map(c=>c.title)});const picked=await ui.chooseCard(r.page,0);report.selections.push({...picked,source:"existing-normal-priority-overdrive-mod"});
  }throw Error("Unexpected OD MOD queue length");};
  try{fs.mkdirSync(path.join(out,"harness"),{recursive:true});for(const name of[path.basename(__filename),"umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs","umbra-integration-boundaries-browser.cjs","umbra-integration-scene-observer.cjs"])fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
    checkpoint("launch");browser=await h.launch();checkpoint("browser-launched");r=await boundary.start(browser,"normal-pending-deep","relay10",report);report.start=await read(r.page);checkpoint("relay-started");
    check(report.start.depth===10&&report.start.level===1&&report.start.deep===false,"real Relay starts Lv1 without deep XP grants",report.start);
    report.level25=await gain(24,"normal levels1-to25 while selection remains pending");
    check(report.level25.level===25&&report.level25.pending===24&&report.level25.deep,"real XP reaches Lv25 with24 unconsumed normal choices",report.level25);
    for(let i=0;i<23;i++){const current=await ui.enabledCards(r.page);const index=current.cards.findIndex(card=>ids.includes(card.skillId||card.id));
      check(index>=0,"remaining canonical skill choice exists before23rd weapon grant",{i,cards:current.cards});const selection=await ui.chooseCard(r.page,index);report.selections.push(selection);}
    await ui.enabledCards(r.page);report.lastPending=await read(r.page);
    check(report.lastPending.level===25&&report.lastPending.pending===1&&ids.every(id=>report.lastPending.skills[id]?.stageIndex===7),"all23 skill grants leave the final normal Lv25 card pending",report.lastPending);
    check(Object.values(report.lastPending.mutationEntries).every(e=>!e.stage4Selected&&!e.stage8Selected),"pending normal card still takes priority over queued Core/Final",report.lastPending.mutationEntries);
    report.afterFirstDeep=await gain(1,"actual Deep25-to26 with last normal card still open");
    check(report.afterFirstDeep.level===26&&report.afterFirstDeep.pending===1&&report.afterFirstDeep.cardsIdentity===report.lastPending.cardsIdentity,
      "Deep XP preserves the exact last normal card and its unconsumed opportunity",report.afterFirstDeep);
    check(report.afterFirstDeep.gear.pendingDeepCount===0,"Deep gain before any qualified Final grants no free OVL opportunity",report.afterFirstDeep.gear);
    report.selections.push(await ui.chooseCard(r.page,0));report.afterNormal=await read(r.page);
    check(report.afterNormal.pending===0,"the remaining normal card is consumed exactly once",report.afterNormal);
    for(let i=0;i<6;i++){const current=await ui.enabledCards(r.page);check(current.selectionMode==="skillMutation","all six Mutation selections precede equipment bonus",{i,mode:current.selectionMode,cards:current.cards});
      const index=current.cards.findIndex(c=>["control","singularity"].includes(c.choiceId));report.selections.push(await ui.chooseCard(r.page,index>=0?index:0));}
    await settleExistingOverdrive();report.afterMutations=await read(r.page);
    check(ids.every(id=>report.afterMutations.mutationEntries[id]?.stage4Selected&&report.afterMutations.mutationEntries[id]?.stage8Selected),"real six Core/Final commits finish all weapons",report.afterMutations.mutationEntries);
    check(report.afterMutations.selectionMode==="equipmentOverlimitBonus"&&report.afterMutations.gear.currentSelection?.source==="finalMutationOverlimitBonus",
      "matching Final bonus opens after Mutation FIFO",report.afterMutations.gear);
    checkpoint("gain-three-deep");report.afterThreeDeep=await gain(3,"actual Deep26-to29 while Final bonus tickets are reserved");
    check(report.afterThreeDeep.level===29&&report.afterThreeDeep.pending===0&&report.afterThreeDeep.gear.pendingDeepCount===3,
      "three qualified Deep gains reserve exactly three remaining opportunities",report.afterThreeDeep.gear);
    report.bonusModes=[];
    for(let i=0;i<6;i++){const current=await settleExistingOverdrive(),gear=(await read(r.page)).gear,expected=i<3?"finalMutationOverlimitBonus":"deepLevelOverlimitBonus";
      report.bonusModes.push({mode:current.selectionMode,source:gear.currentSelection?.source});check(current.selectionMode==="equipmentOverlimitBonus"&&gear.currentSelection?.source===expected,"Final bonus tickets precede Deep tickets without consuming normal pending",{i,mode:current.selectionMode,source:gear.currentSelection?.source,expected});report.selections.push(await ui.chooseCard(r.page,0));}
    report.final=await read(r.page);check(report.final.level===29&&report.final.pending===0&&ids.every(id=>report.final.gear.overlimitLevels[id]===2),"three Final I and three Deep II commits reach each actual cap once",report.final.gear);
    check(report.final.gear.selectionCounts.final===3&&report.final.gear.selectionCounts.deep===3&&report.final.gear.selectionCounts.normal===0,
      "source-specific OVL budget remains3 Final /3 Deep /0 normal",report.final.gear.selectionCounts);
    check(report.final.gear.pendingDeepCount===0&&report.final.gear.pendingFinalSkillIds.length===0&&!report.final.gear.currentSelection,"all six bonus tickets are consumed with no duplicate reservation",report.final.gear);
  }catch(error){report.error=error.stack;checkpoint("caught",{error:report.error});if(r)report.failure=await read(r.page).catch(()=>null);}
  finally{if(r){await r.page.evaluate(()=>{window.__UMBRA_BOUNDARY_OBSERVER__?.cleanup();window.__NORMAL_SCENE_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("PROGRESSION_TEST_END");}).catch(e=>report.endError=String(e));
      await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:15000}).catch(e=>report.endError=String(e));checkpoint("environment-ended");report.audit=await h.audit(r);checkpoint("audited",{isolation:report.audit.isolationPassed,pageErrors:report.audit.pageErrors});
      fs.writeFileSync(path.join(out,"pre-close-result.json"),JSON.stringify(report,null,2),{flag:"wx"});
      await limit(r.context.close(),10000,"Context close timeout").catch(e=>report.cleanupError=String(e));checkpoint("context-closed",{error:report.cleanupError});}
    await limit(browser?.close()||Promise.resolve(),10000,"Browser close timeout").catch(e=>report.cleanupError=String(e));checkpoint("browser-close-finished",{error:report.cleanupError});clearTimeout(deadline);report.passed=!report.error&&!report.endError&&!report.cleanupError&&report.checks.every(c=>c.passed)&&report.audit?.isolationPassed&&report.audit.pageErrors.length===0;
    fs.writeFileSync(path.join(out,"integration-progression.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,error:report.error,endError:report.endError,pageErrors:report.audit?.pageErrors}));process.exitCode=report.passed?0:1;}
}
if(require.main===module)main();
