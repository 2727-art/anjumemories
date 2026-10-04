"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const h=require("./umbra-integration-browser-harness.cjs"),ui=require("./umbra-integration-initialization-browser.cjs");
const {installSceneObserver}=require("./umbra-integration-scene-observer.cjs");
const out=process.env.UMBRA_TEST_OUTPUT;
const report={sources:h.sources,sourceRoot:h.sourceRoot,harnessSha256:h.sha(fs.readFileSync(__filename)),
  methodology:"Boundary functional test, regular rAF. Real HUB/SORTIE/Opening and normal mutation cards. Explicit boundary S8 button uses normal upgrade functions. Gate creation is an explicitly logged diagnostic spawnStageGate call, not a natural 120-second Gate. Rewards use real addRunCoins and extraction serializers into RAM; no real Storage, HP/attack/clock/physics replacement.",checks:[],selections:[]};
function check(p,label,detail){report.checks.push({passed:!!p,label,detail});assert.ok(p,label);}
async function snapshot(page){return page.evaluate(()=>window.__NORMAL_SCENE_OBSERVER__.snapshot());}
async function opening(page){for(let i=0;i<3;i++){const s=await ui.enabledCards(page);await ui.chooseCard(page,s.cards.findIndex(c=>c.type==="passive"));}}
async function active(page){await page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state==="ACTIVE",null,{timeout:15000});}
(async()=>{
  fs.mkdirSync(out,{recursive:true}); const browser=await h.launch(); let r;
  try{
    r=await h.open(browser,"normal-lifecycle",{path:"/umbra-integration.html?fixture=complete"});
    await ui.waitHub(r.page);await r.page.evaluate(installSceneObserver);await ui.clickPhaserText(r.page,"SORTIE PREP");
    await opening(r.page);await active(r.page);report.beforeBuild=await snapshot(r.page);
    await r.page.locator("#umbra-integration-details > summary").click();
    await r.page.locator("#umbra-integration-boundary").click();
    await r.page.locator("#umbra-integration-details > summary").click();
    for(let count=0;count<15;count++){
      await r.page.waitForFunction(()=>{const s=window.__NORMAL_SCENE_OBSERVER__.snapshot();return(s.selectionActive&&s.inputEnabled&&!s.selectionLocked)||(!s.selectionActive&&!s.worldPaused&&s.normalContext?.state==="ACTIVE");},null,{timeout:15000});
      const s=await snapshot(r.page);
      if(!s.selectionActive&&!s.worldPaused&&s.normalContext?.state==="ACTIVE")break;
      const card=await ui.enabledCards(r.page);
      await r.page.screenshot({path:path.join(out,`boundary-card-${count}-${card.selectionMode}.png`),fullPage:true});
      const choice=card.cards.findIndex(c=>["control","singularity"].includes(c.choiceId));
      const selection=await ui.chooseCard(r.page,choice>=0?choice:0);report.selections.push(selection);
      await r.page.waitForTimeout(30);
    }
    await active(r.page);report.built=await snapshot(r.page);
    const build=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{gear:s.getUmbraEquipmentSnapshot(),triad:s.getUmbraTriadSnapshot(),mutations:s.skillMutationState.entries};});
    report.build=build;check(Object.values(report.built.skills).every(s=>s.stageIndex===7),"explicit boundary build reached all S8 via normal functions");
    check(Object.values(build.mutations).every(e=>e.stage4Selected&&e.stage8Selected),"actual Core and Final cards committed for all three skills",build.mutations);
    const firstRun=report.built.normalContext.runId;
    await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");s.runEnvironmentIO.record("explicit-boundary-gate",{method:"spawnStageGate",natural:false});s.spawnStageGate();});
    await r.page.waitForTimeout(500);
    await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");if(s.gateGuidanceOverlayActive)s.closeGateGuidanceOverlay("boundary-test");s.handleGateEnter();});
    await ui.clickPhaserText(r.page,"NEXT STAGE");
    await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").stageDepth===2,null,{timeout:10000});
    report.afterGate=await snapshot(r.page);
    check(report.afterGate.normalContext.runId===firstRun,"Gate retained current run and immutable inputs");
    const adoption=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().records.filter(e=>e.type==="umbra-gate-adopt").at(-1));
    report.adoption=adoption;check(!!adoption,"actual Gate completion executed explicit survivor adoption",adoption);
    // Explicit reward amount only in this boundary scenario. The native wallet
    // math and serializer remain responsible for the result.
    await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");s.runEnvironmentIO.record("explicit-boundary-reward",{amount:123,method:"addRunCoin"});s.addRunCoin(123);s.gateChoiceLocked=false;s.chooseExtract();});
    report.result=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{snapshot:s.umbraNormalEndSnapshot,state:s.umbraRunContext.state,coins:s.coins,environment:s.runEnvironmentIO.snapshot(),owners:[s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime,s.umbraBoostTrace].map(Boolean)};});
    check(report.result.state==="ENDED"&&report.result.owners.every(v=>!v),"extraction snapshot precedes full dedicated owner cleanup");
    check(report.result.snapshot.skills.every(s=>s.stage===8&&s.core&&s.final),"end snapshot preserves all three completed growth selections");
    check(report.result.coins>=123,"real extraction calculation credited synthetic RAM wallet",report.result.coins);
    const wallet=report.result.environment.ram.localStorage.lastmemoVansabaCoins;
    await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").returnToOpeningShop("境界抽出後の同session確認"));
    await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return s.shopActive&&!s.restartInProgress;},null,{timeout:20000});
    report.hub=await snapshot(r.page);report.ramAfterHub=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().ram.localStorage.lastmemoVansabaCoins);
    check(report.ramAfterHub===wallet,"HUB Scene restart preserved the same RAM wallet");
    await ui.clickPhaserText(r.page,"SORTIE PREP");const first=await ui.enabledCards(r.page);report.secondOpening=first;
    check(first.normalContext.runId!==firstRun,"second sortie allocated a new run ID");
    check(first.skills.umbraMoonlight?.stageIndex===0&&!first.skills.umbraBloodSpike&&!first.skills.umbraPhantomNova,"new run starts Moon S1 only");
    check(first.owners.filter(Boolean).length===1,"new run has no old SPIKE/NOVA owner or debt");
    await r.page.screenshot({path:path.join(out,"second-run-opening.png"),fullPage:true});
  }catch(e){report.error=e.stack;process.exitCode=1;if(r)report.failure=await snapshot(r.page).catch(()=>null);}
  finally{
    if(r){await r.page.evaluate(()=>{window.__NORMAL_SCENE_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("LIFECYCLE_TEST_END");}).catch(()=>{});
      await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:10000}).catch(e=>report.endError=String(e));
      report.context=await h.audit(r);report.finalEnvironment=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot()).catch(()=>null);await r.context.close();}
    await browser.close();report.passed=!report.error&&!report.endError&&report.checks.every(c=>c.passed)&&report.context?.isolationPassed&&report.context.pageErrors.length===0;
    fs.writeFileSync(path.join(out,"integration-lifecycle.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,error:report.error,pageErrors:report.context?.pageErrors}));if(!report.passed)process.exitCode=1;
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
