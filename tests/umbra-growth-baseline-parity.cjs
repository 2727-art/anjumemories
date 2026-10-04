"use strict";
// Reuse the audited Phase 5 physical timeline and bounded comparator verbatim.
// Expose its module-local functions only in this test module instance, leaving
// the historical harness file and its baseline paths unchanged.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),Module=require("node:module");
const {chromium}=require("playwright"),project=path.resolve(__dirname,".."),sha=v=>crypto.createHash("sha256").update(v).digest("hex");
const sourcePath=path.join(__dirname,"umbra-nova-baseline-parity.cjs"),source=fs.readFileSync(sourcePath,"utf8");
const loaded=new Module(sourcePath,module);loaded.filename=sourcePath;loaded.paths=module.paths;
loaded._compile(source+"\nObject.assign(module.exports,{freezeSources,open,measure,validate,close});\n",sourcePath);
const h=loaded.exports,baselineRoot=process.env.UMBRA_TEST_BASELINE_ROOT||path.join(project,".tmp_umbra_phase6b/2026-09-07T10-12-15-846Z/baseline"),currentRoot=process.env.UMBRA_TEST_SOURCE_ROOT||project;
const {firstDifference}=require("./umbra-nova-parity-offline.cjs");
const out=process.env.UMBRA_TEST_OUTPUT||path.join(project,".tmp_umbra_phase6b/parity");fs.mkdirSync(out,{recursive:true});
const baseline=h.freezeSources(baselineRoot),current=h.freezeSources(project),expected="fd27f20c159682ae7363654b238e49f29b8327e2703900205ccbf129a9e0a451";
// The final source snapshot holds scripts; independently freeze and verify all
// 27 unchanged current PNGs against the saved start snapshot before any run.
for(const[name,image]of baseline.images)if(current.images.get(name)?.sha256!==image.sha256)throw Error(`Protected image changed: ${name}`);
if(currentRoot!==project)for(const name of current.sources.keys()){const file=path.join(currentRoot,name),body=fs.readFileSync(file);current.sources.set(name,{body,sha256:sha(body),file});}
if(baseline.sources.get("game.js").sha256!==expected)throw Error("Expected Phase5 completion baseline, never HEAD or Phase4");
const report={createdAt:new Date().toISOString(),baselineRoot,currentRoot,sources:Object.fromEntries([["baseline",baseline],["current",current]].map(([k,v])=>[k,Object.fromEntries([...v.sources].map(([n,x])=>[n,x.sha256]))])),harnessSha256:sha(fs.readFileSync(__filename)),timelineHarnessSha256:sha(source),comparatorSha256:sha(fs.readFileSync(path.join(__dirname,"umbra-nova-parity-offline.cjs"))),
 methodology:"Twelve serial pairs: nine empty same-input mech×fixture cases at60Hz, then UMBRA three-weapon S1 combat at Scene30/60/120Hz baselinefixture. No growth query. Baseline exact Phase5+AirBrake tuned. Both versions use same legacy three-weapon query. Actual unchanged fixed60 Phaser physics, Scene seed10000 and initial World accumulator0 only in test. Combat Tween Date.now is aligned to Scene only inside original TweenManager.getDelta as explicitly recorded by reused harness; product clock is unchanged. Native movement/EN/AirBrake/Evade/trace compare exactly; owner generation normalized and wallprocessing durations excluded by existing comparator. Original rows saved; one pair in memory and bounded firstdifference only. Synthetic sentinel Storage written only during fresh harness setup, all subsequent product data API calls denied and expected0; no real profile/account/external request.",contexts:[],pairs:[],errors:[]};
const settings=[... ["defaultBear","regaliaBastion","umbraSeraph"].flatMap(mech=>["baseline","medium","deep"].map(fixture=>({kind:"empty",mech,fixture,rate:60}))),...[30,60,120].map(rate=>({kind:"combat",mech:"umbraSeraph",fixture:"baseline",rate}))];
(async()=>{let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});
 for(const [index,setting]of settings.entries()){
  const pair={index,...setting,files:{},passed:false};const pairData={};
  for(const [variant,src]of[["baseline",baseline],["current",current]]){
   const ctx=await h.open(browser,"current-on",src,report);ctx.record.sourceVariant=variant;
   try{const run=await h.measure(ctx.page,{...setting,variant:"current-on",combatAligned:true});h.validate(run);const file=path.join(out,`${index}-${variant}.json`);fs.writeFileSync(file,JSON.stringify(run),{flag:"wx"});pair.files[variant]=file;pairData[variant]=run;}finally{await h.close(ctx);}
  }
  try{h.compareRuns(pairData.baseline,pairData.current);const novaDifference=firstDifference(pairData.baseline.finalWeaponDiagnostics.nova,pairData.current.finalWeaponDiagnostics.nova,"finalNova",true);if(novaDifference)throw Error(JSON.stringify(novaDifference));pair.passed=true;}catch(e){pair.error=e.message;report.errors.push({index,error:e.message});}
  report.pairs.push(pair);console.log(JSON.stringify({index,kind:setting.kind,mech:setting.mech,fixture:setting.fixture,rate:setting.rate,passed:pair.passed,error:pair.error}));
  await new Promise(resolve=>setImmediate(resolve));if(global.gc)global.gc();
 }
}catch(e){report.errors.push(e.stack);}finally{await browser?.close();report.passed=!report.errors.length&&report.pairs.length===settings.length&&report.pairs.every(p=>p.passed)&&report.contexts.every(c=>c.pass);const file=path.join(out,`growth-parity-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors}));process.exitCode=report.passed?0:1;}})();
