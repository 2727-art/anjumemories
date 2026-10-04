"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const h=require("./umbra-integration-browser-harness.cjs"),ui=require("./umbra-integration-initialization-browser.cjs");
const {installSceneObserver}=require("./umbra-integration-scene-observer.cjs");
const out=process.env.UMBRA_TEST_OUTPUT,report={sourceRoot:h.sourceRoot,sources:h.sources,harnessSha256:h.sha(fs.readFileSync(__filename)),
 methodology:"Actual normal Scene, synthetic RAM baseline, actual Opening inputs. Explicit 123 unsecured GEEK via original addRunCoin, real chooseExtract/serializers. RAM wallet failure before/after setItem only; never native Storage. Repeated extraction and same-session HUB/newrun are lifecycle boundary operations, not natural reward acquisition.",cases:[]};
(async()=>{fs.mkdirSync(out,{recursive:true});const browser=await h.launch();
 try{for(const phase of ["before","after"]){const c={phase,checks:[]};report.cases.push(c);let r;
  const check=(p,label,detail)=>{c.checks.push({passed:!!p,label,detail});assert.ok(p,label);};
  try{r=await h.open(browser,`ram-failure-${phase}`,{path:"/umbra-integration.html?fixture=baseline"});await ui.waitHub(r.page);await r.page.evaluate(installSceneObserver);await ui.clickPhaserText(r.page,"SORTIE PREP");
   for(let i=0;i<3;i++){const s=await ui.enabledCards(r.page);await ui.chooseCard(r.page,Math.max(0,s.cards.findIndex(c=>c.type==="passive")));}
   await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state==="ACTIVE");
   c.result=await r.page.evaluate(phase=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),env=s.runEnvironmentIO;
    env.record("explicit-boundary-unsecured-reward",{amount:123,method:"addRunCoin"});s.addRunCoin(123);env.injectStorageFailure({key:"lastmemoVansabaCoins",phase});s.chooseExtract();
    const first={coins:s.coins,state:s.umbraRunContext.state,uncertain:s.umbraRamResultUncertain,snapshot:s.umbraNormalEndSnapshot,env:env.snapshot()};
    s.chooseExtract();s.completeExtraction({secured:123,lost:0,rate:1},false,"");
    return{first,second:{coins:s.coins,state:s.umbraRunContext.state,env:env.snapshot()},status:document.getElementById("umbra-integration-status")?.textContent,
      owners:[s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime,s.umbraBoostTrace].map(Boolean)};
   },phase);
   check(c.result.first.state==="ENDED"&&c.result.first.uncertain&&c.result.owners.every(v=>!v),"failed RAM result cannot resume combat");
   check(c.result.first.coins===123&&c.result.second.coins===123,"repeated result callbacks cannot add currency twice");
   const results=c.result.second.env.records.filter(r=>r.type==="ram-run-result");check(results.length===1&&results[0].detail.status==="RAM_RESULT_UNCERTAIN","RAM result is explicitly uncertain, recorded once",results);
   check(c.result.first.snapshot.unsecuredGeek===123,"pre-cleanup snapshot retained unsecured result");
   const saved=c.result.first.env.ram.localStorage.lastmemoVansabaCoins;check(phase==="before"?saved!=="123":saved==="123","before and after failures retain their actual distinct RAM states",saved);
   await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").returnToOpeningShop("RAM結果失敗の境界試験"));
   await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").shopActive,null,{timeout:20000});
   c.hub=await r.page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return{coins:s.coins,env:s.runEnvironmentIO.snapshot()};});
   check(c.hub.coins===(phase==="before"?0:123),"HUB reload reads actual RAM through normal loader",c.hub.coins);
   await ui.clickPhaserText(r.page,"SORTIE PREP");const next=await ui.enabledCards(r.page);c.next=next;
   check(next.normalContext.runId!==c.result.first.snapshot.runId&&next.skills.umbraMoonlight?.stageIndex===0,"failure does not retain old run into next sortie");
  }catch(e){c.error=e.stack;}
  finally{if(r){await r.page.evaluate(()=>{window.__NORMAL_SCENE_OBSERVER__?.cleanup();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("RESULT_FAILURE_TEST_END");}).catch(()=>{});await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:10000}).catch(e=>c.endError=String(e));c.context=await h.audit(r);await r.context.close();}c.passed=!c.error&&!c.endError&&c.context?.isolationPassed&&!c.context.pageErrors.length;}
 }}finally{await browser.close();report.passed=report.cases.length===2&&report.cases.every(c=>c.passed);fs.writeFileSync(path.join(out,"integration-result-failure.json"),JSON.stringify(report,null,2),{flag:"wx"});console.log(JSON.stringify({passed:report.passed,cases:report.cases.map(c=>({phase:c.phase,passed:c.passed,error:c.error,pageErrors:c.context?.pageErrors}))}));if(!report.passed)process.exitCode=1;}
})().catch(e=>{console.error(e);process.exitCode=1;});
