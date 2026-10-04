"use strict";
// Actual legacy isolated passive cards and HUD. Normal SurvivalScene startup,
// shop/save ownership, and released-mech skill cards are deliberately outside
// this fixture's adapter; those are not claimed as browser coverage here.
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const h=require("./umbra-growth-browser.cjs"),out=process.env.UMBRA_TEST_OUTPUT||path.resolve(__dirname,"../.tmp_umbra_phase6b/oldmech-cards");fs.mkdirSync(out,{recursive:true});
const report={createdAt:new Date().toISOString(),sources:h.report.sources,harnessSha256:crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"),bootstrapHarnessSha256:h.report.harnessSha256,
 methodology:"Two actual isolated legacy Phase5 scenes: standardBear and REGALIA baselinefixture, no growth query. Actual old passive cards, pointer event to existing chooseCandidate, real existing passive application and displayed AP/HUD. getAvailableSkillChoices remains the existing empty adapter; normal released-mech skill card policy and actual production HUB startup are not claimed. Controlled real Game.step only to render/apply HUD, unchanged physics. Fresh context, no normalScene/account/save/external requests.",cases:[],errors:[]};
(async()=>{let browser,ctx;try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});h.setBrowser(browser);ctx=await h.open("oldmech-passive-cards","&umbraPhantomNova=1");
 for(const mech of["defaultBear","regaliaBastion"]){
  const shown=await ctx.page.evaluate(mech=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive");s.moonlightArena.configId="empty";s.resetDrive(mech,"baseline");s.openCandidateCards(false);g.step(s.time.now+1000/60,1000/60);
   const allowed=s.getPassiveUpgradeChoices().map(c=>c.id),choices=s.candidateChoices.map(c=>({id:c.id,title:c.title,description:c.description}));
   const rectangles=s.selectionObjects.filter(o=>o.type==="Rectangle"&&o.input?.enabled&&Math.abs(o.width-270)<.1);
   window.__oldMechCard={before:{stats:{...s.stats},passives:{...s.passiveLevels}},choices,rectangles};
   return{mech,allowed,choices,cardCount:rectangles.length,selectionObjects:s.selectionObjects.length,growth:s.isUmbraGrowthContextActive?.()||false,moon:!!s.umbraMoonlightRuntime,spike:!!s.umbraBloodSpikeRuntime,nova:!!s.umbraPhantomNovaRuntime};
  },mech);
  await ctx.page.screenshot({path:path.join(out,`${mech}-passive-cards.png`)});
  const applied=await ctx.page.evaluate(()=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive"),old=window.__oldMechCard;const index=Math.max(0,old.choices.findIndex(c=>c.id==="vitalBloom")),choice=old.choices[index],expectedApGain=s.getApReinforceHpGain();
   old.rectangles[index].emit("pointerdown");for(let n=0;n<10;n++)g.step(s.time.now+1000/60,1000/60);s.refreshDriveHud();s.moonlightArena.refreshNovaHud();
   const beforeLevel=old.before.passives[choice.id]||0,afterLevel=s.passiveLevels[choice.id]||0,hud=s.moonlightArena.info.text;
   return{choice:choice.id,before:old.before,after:{stats:{...s.stats},passives:{...s.passiveLevels}},expectedApGain,selectionObjects:s.selectionObjects.length,hud,
    passed:afterLevel===beforeLevel+1&&s.selectionObjects.length===0&&hud.includes(`AP ${Math.round(s.stats.hp)}/${Math.round(s.stats.maxHp)}`)&&(choice.id!=="vitalBloom"||s.stats.maxHp-old.before.stats.maxHp===expectedApGain)};
  });
  await ctx.page.screenshot({path:path.join(out,`${mech}-hud-after-passive.png`)});
  report.cases.push({mech,shown,applied,passed:shown.choices.length===3&&new Set(shown.choices.map(c=>c.id)).size===3&&shown.choices.every(c=>shown.allowed.includes(c.id))&&shown.cardCount===3&&!shown.growth&&!shown.moon&&!shown.spike&&!shown.nova&&applied.passed});
 }
}catch(e){report.errors.push(e.stack);}finally{if(ctx)await h.close(ctx);await browser?.close();report.contexts=h.report.contexts;report.passed=!report.errors.length&&report.cases.length===2&&report.cases.every(c=>c.passed)&&report.contexts.every(c=>c.passed);const file=path.join(out,`oldmech-cards-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors,cases:report.cases.map(c=>({mech:c.mech,passed:c.passed,shown:c.shown,applied:c.applied}))}));process.exitCode=report.passed?0:1;}})();
