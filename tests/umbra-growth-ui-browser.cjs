"use strict";
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const h=require("./umbra-growth-browser.cjs"),out=process.env.UMBRA_TEST_OUTPUT||path.resolve(__dirname,"../.tmp_umbra_phase6b/growth-ui");fs.mkdirSync(out,{recursive:true});
const report={createdAt:new Date().toISOString(),sources:h.report.sources,harnessSha256:crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),bootstrapHarnessSha256:h.report.harnessSha256,
 methodology:"Actual Phaser card records and real keyboard/pointer selectors; production select and360ms confirmation. Synthetic pending/Opening active ticket flags are RAM-only inputs, not purchased tickets or natural progression. Desktop and narrowviewport screenshots use canvas FIT. Lifecycle callback probes deliberately replay captured old callbacks. No browser load measurements in this file.",cases:[],errors:[]};
(async()=>{let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});h.setBrowser(browser);
 for(const [name,viewport,four]of[["desktop-three",{width:1280,height:800},false],["narrow-four",{width:740,height:420},true]]){
  const r=await h.open(name,undefined,viewport);try{
   const prepared=await r.page.evaluate(four=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive"),a=s.moonlightArena; a.configId="empty";a.resetGrowthPreset(null);s.closeCandidateCards();if(four)s.runAnjuMemoryState={openingBoostExtraChoiceActive:true,openingBoostExtraChoiceUsed:true};
    // Force a representative long NOVA Unlock using real candidate models,
    // without changing production shuffle policy or choosing any upgrade.
    const skill=s.getAvailableSkillChoices({openingBoost:true}),nova=skill.find(c=>c.skillId==="umbraPhantomNova"),spike=skill.find(c=>c.skillId==="umbraBloodSpike"),passives=s.getPassiveUpgradeChoices({openingBoost:true});
    s.showLevelUpCardOverlay("Opening Boost","表示試験：選択回数3、候補数だけ+1",[nova,spike,...passives.slice(0,four?2:1)],"level",{openingBoost:true});
    let t=s.time.now;g.step(t+=1000/60,1000/60);
    return{pending:s.pendingLevelUps,remaining:s.startingUpgradeSelectionsRemaining,choiceLimit:s.getOpeningBoostChoiceLimit(true),cards:s.levelUpCardRecords.map(r=>({id:r.model.option.id,container:r.container.getBounds(),background:r.background.getBounds(),texts:r.container.list.filter(o=>o.type==="Text").map(o=>({text:o.text,bounds:o.getBounds()}))})),canvas:{width:g.scale.gameSize.width,height:g.scale.gameSize.height},evasive:s.levelUpCandidatePresentationState};
   },four);
   await r.page.screenshot({path:path.join(out,`growth-${name}.png`)});
   const overflow=prepared.cards.flatMap(c=>c.texts.filter(t=>t.bounds.x<c.background.x-1||t.bounds.x+t.bounds.width>c.background.x+c.background.width+1||t.bounds.y<c.background.y-1||t.bounds.y+t.bounds.height>c.background.y+c.background.height+1).map(t=>({id:c.id,text:t.text,bounds:t.bounds,card:c.background})));
   report.cases.push({name,passed:prepared.cards.length===(four?4:3)&&prepared.pending===3&&prepared.remaining===3&&prepared.choiceLimit===(four?4:3)&&!overflow.length,prepared,overflow});
   if(!four){const life=await r.page.evaluate(()=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive");const checks=[],check=(ok,label,v)=>checks.push({passed:!!ok,label,actual:v});let t=s.time.now;const steps=ms=>{for(let n=0;n<Math.ceil(ms/(1000/60));n++)g.step(t+=1000/60,1000/60);};
     s.resetDrive("umbraSeraph","baseline");s.closeCandidateCards();s.startingUpgradeSelectionsRemaining=0;s.survivalTime=1;s.pendingLevelUps=1;s.resetLevelUpCandidatePresentationState();
     for(let n=0;n<20;n++)s.buildLevelUpUpgradeChoices({openingBoost:false});check(!s.levelUpCandidatePresentationState.evasiveFirmwarePresented,"queries do not consume Evasive guarantee");
     s.showLevelUpChoices();const oldPresent=s.drivePresentationHandler;s.closeCandidateCards();oldPresent?.();check(!s.levelUpCandidatePresentationState.evasiveFirmwarePresented,"destroy before real render does not consume guarantee");
     s.showLevelUpChoices();steps(20);check(s.levelUpCandidatePresentationState.evasiveFirmwarePresented,"real current presentation consumes guarantee once");
     const i=s.levelUpCardRecords.findIndex(r=>r.model.option.skillId),r=s.levelUpCardRecords[i],id=r.model.option.skillId,oldStage=s.playerSkills[id]?.stageIndex??-1,oldOption=r.model.option;
     r.background.emit("pointerdown");s.input.keyboard.emit("keydown",{key:String(i+1),preventDefault(){},stopPropagation(){}});const callback=s.levelUpSelectTimer.callback;check(s.levelUpSelectionLocked,"pointer then key locks immediately");steps(300);check((s.playerSkills[id]?.stageIndex??-1)===oldStage,"no confirmation before360ms");steps(100);const newStage=s.playerSkills[id]?.stageIndex??-1;check(newStage===oldStage+1&&s.pendingLevelUps===0,"one effect and one pending after360ms",{id,oldStage,newStage,pending:s.pendingLevelUps});
     callback();oldOption.onSelect();check((s.playerSkills[id]?.stageIndex??-1)===newStage,"old overlay callback and old option do not reapply");
     s.resetDrive("umbraSeraph","baseline");const states=JSON.stringify(Object.fromEntries(Object.entries(s.playerSkills).map(([id,x])=>[id,x.stageIndex])));callback();oldOption.onSelect();check(states===JSON.stringify(Object.fromEntries(Object.entries(s.playerSkills).map(([id,x])=>[id,x.stageIndex]))),"old run callback cannot grow new run");
     return{checks,passed:checks.every(c=>c.passed)};
    });report.cases.push({name:"card-lifecycle",...life});}
  }finally{await h.close(r);}
 }
}catch(e){report.errors.push(e.stack);}finally{await browser?.close();report.contexts=h.report.contexts;report.passed=!report.errors.length&&report.cases.length>0&&report.cases.every(c=>c.passed)&&report.contexts.every(c=>c.passed);const file=path.join(out,`growth-ui-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors,failed:report.cases.filter(c=>!c.passed)}));process.exitCode=report.passed?0:1;}})();
