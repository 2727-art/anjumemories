"use strict";
// Run sequentially. Fresh Chromium contexts contain synthetic saves only;
// every non-local request is aborted before networking and no account is used.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, ".."), sourceRoot = process.env.UMBRA_TEST_SOURCE_ROOT, out = process.env.UMBRA_TEST_OUTPUT;
if (!sourceRoot || !out) throw Error("Explicit frozen UMBRA_TEST_SOURCE_ROOT and fresh UMBRA_TEST_OUTPUT required");
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:4173", ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"];
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const report = { createdAt: new Date().toISOString(), sourceRoot, sources: Object.fromEntries(fs.readdirSync(sourceRoot).filter(n => /\.(js|html|css)$/.test(n)).map(n => [n, sha(fs.readFileSync(path.join(sourceRoot,n)))])),
  harnessSha256: sha(fs.readFileSync(__filename)), methodology: "Functional normal rAF, not performance measurement. Ordinary index with no integration environment. New synthetic browser storage: 20 million GEEK, cleared Final Raid and owned REGALIA. HANGER uses its real handler; reloading does not reseed storage. SORTIE and all Opening/growth/Mutation choices use real product paths and card keyboard input. Full-growth boundary supplies 24 explicit gainExperience(nextLevelXp) calls; it is not natural XP or natural S8 arrival. Combat target placement uses native spawned tanks repositioned with body.reset; HP, speed, attack, physics and damage remain native. Manual EXTRACT invokes its real handler without waiting 120 seconds. Screenshots/JSON are taken outside combat observation. External requests abort; no real account or profile.", cases: [] };
function check(c, value, label, detail) { c.checks.push({ passed: !!value, label, detail }); assert.ok(value, label); }
function checkpoint(c, phase) { console.log(JSON.stringify({ case:c.name, phase, checks:c.checks.length })); }
async function read(page) { return page.evaluate(() => {
  const s = window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene"); if (!s) return null;
  const c = s.umbraRunContext;
  return { shop: s.shopActive, over: s.gameOver, extracted:s.extractionComplete, io:s.runEnvironmentIO?.mode || null,
    mech:s.getRunPlayerMechId(), selected:s.getSelectedPlayerMechId(), coins:s.coins, owned:s.shopState?.playerMechs?.ownedIds,
    context:c ? { mode:c.mode, state:c.state, current:s.isUmbraRunContextCurrent(c), inputsFrozen:Object.isFrozen(c.inputs), request:c.request } : null,
    opening:s.startingUpgradeSelectionsRemaining, pending:s.pendingLevelUps, mutationPending:s.skillMutationState?.pendingQueue?.length || 0,
    selection:s.levelUpActive, mode:s.levelUpSelectionMode, enabled:s.levelUpInputEnabled, locked:s.levelUpSelectionLocked,
    cards:(s.levelUpCardRecords || []).map(r=>({ title:r.model?.title, type:r.model?.option?.type, skillId:r.model?.option?.skillId, choiceId:r.model?.option?.choiceId })),
    skills:Object.fromEntries(Object.entries(s.playerSkills || {}).map(([id,v])=>[id,{stage:v.currentStage?.stage,core:s.skillMutationState?.entries?.[id]?.core,final:s.skillMutationState?.entries?.[id]?.final}])),
    stats:{ap:s.stats?.hp,maxAp:s.stats?.maxHp,en:s.stats?.stamina,maxEn:s.stats?.maxStamina}, paused:s.physics?.world?.isPaused,
    reach:s.getUmbraMoonlightReachMultiplier(), mobility:s.getUmbraMobilityTrialSettings(),
    owners:[s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime].map(r=>r?{counts:{...r.counts},errors:r.errors,clock:r.combatTimeMs}:null),
    end:s.umbraNormalEndSnapshot || null,
    persisted:{coins:localStorage.getItem("lastmemoVansabaCoins"),shop:JSON.parse(localStorage.getItem("lastmemoVansabaShopState") || "null"),
      archive:JSON.parse(localStorage.getItem("lastmemoVansabaRunArchive") || "null"),atlas:JSON.parse(localStorage.getItem("lastmemoVansabaMutationAtlasState") || "null")},
    blocked:!!s.isProgressionWriteBlocked?.(), cloud:s.cloudSaveState?.status || null };
}); }
async function waitHub(page) { await page.waitForFunction(()=>{
  const s=window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene");
  return s?.shopActive === true && !s.isProgressionWriteBlocked() && !s.cloudSaveState?.busy && !s.isCloudSaveSortieBlocked();
},null,{timeout:90000}); }
async function readyCards(page) { await page.waitForFunction(()=>{
  const s=window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene");
  return s?.levelUpActive && s.levelUpInputEnabled && !s.levelUpSelectionLocked && s.levelUpCardRecords?.length;
},null,{timeout:30000}); return read(page); }
async function selectCard(page,index) {
  await page.evaluate(()=>{window.__PRODUCTION_PREVIOUS_CARDS__=window.__SURVIVAL_GAME__.scene.getScene("survival-scene").levelUpCardRecords;});
  await page.keyboard.press(String(index+1));
  await page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").levelUpCardRecords!==window.__PRODUCTION_PREVIOUS_CARDS__,null,{timeout:15000});
}
async function screenshot(r,name) { await r.page.screenshot({path:path.join(out,name),fullPage:true}); r.record.screenshots.push(name); }
async function open(browser,name,options={}) {
  const c={name,checks:[],pageErrors:[],consoleErrors:[],blockedExternal:[],served:[],screenshots:[],selections:[]}; report.cases.push(c);
  const context=await browser.newContext({viewport:options.mobile?{width:844,height:390}:{width:1440,height:900},isMobile:!!options.mobile,hasTouch:!!options.mobile,deviceScaleFactor:1,serviceWorkers:"block"});
  await context.addInitScript(()=>{
    // A reload retains product writes. Never reseed after the first navigation.
    if(localStorage.getItem("umbra-production-synthetic-fixture")!=="v1") {
      localStorage.setItem("lastmemoVansabaCoins","20000000");
      localStorage.setItem("lastmemoVansabaShopState",JSON.stringify({playerMechs:{ownedIds:["defaultBear","regaliaBastion"],selectedId:"defaultBear"}}));
      localStorage.setItem("lastmemoVansabaFinalBossState",JSON.stringify({version:2,cleared:true,clearedAt:1}));
      localStorage.setItem("umbra-production-synthetic-fixture","v1");
    }
    window.open=()=>null;
  });
  await context.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==base){c.blockedExternal.push(url.href);return route.abort("blockedbyclient");}
    const relative=decodeURIComponent(url.pathname).replace(/^\//,"")||"index.html", file=path.resolve(sourceRoot,relative);
    if(file.startsWith(path.resolve(sourceRoot)+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()) {
      const body=fs.readFileSync(file);c.served.push({path:relative,sha256:sha(body)});
      return route.fulfill({status:200,contentType:relative.endsWith(".js")?"text/javascript":relative.endsWith(".css")?"text/css":"text/html",body});
    }
    return route.continue();
  });
  const page=await context.newPage();page.on("pageerror",e=>c.pageErrors.push(e.stack||String(e)));
  page.on("console",m=>{if(m.type()==="error")c.consoleErrors.push(m.text());});
  page.on("dialog",d=>d.dismiss());
  const query=options.mobile?"?mobileGate=0&mobileControls=1":"?mobileGate=0&mobileControls=0";
  await page.goto(base+"/"+query+"&moonReach=current&moonGlide=0&novaField=0",{waitUntil:"domcontentloaded",timeout:30000});
  await waitHub(page);return {context,page,record:c};
}
async function hanger(r) {
  const c=r.record;
  c.hanger=await r.page.evaluate(()=>{
    const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),drawn=[],original=s.renderPlayerMechHangarCard;
    s.renderPlayerMechHangarCard=function(id,x,y,width,height,...rest){drawn.push({id,x,y,width,height});return original.call(this,id,x,y,width,height,...rest);};
    s.shopViewMode="geek";s.geekShopSubView="hanger";s.showPreGameShop();s.renderPlayerMechHangarCard=original;
    return {drawn,released:s.getReleasedPlayerMechIds(),canPurchase:s.canPurchasePlayerMech("umbraSeraph"),cost:s.getPlayerMechPurchaseCost("umbraSeraph"),environment:s.runEnvironmentIO||null,
      canvas:(()=>{const b=s.game.canvas.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};})()};
  });
  check(c,JSON.stringify(c.hanger.drawn.map(d=>d.id))===JSON.stringify(["defaultBear","regaliaBastion","umbraSeraph"]),"HANGER draws exactly three released mech cards",c.hanger.drawn);
  check(c,c.hanger.environment===null,"ordinary route has no synthetic integration adapter");
  for(let i=0;i<c.hanger.drawn.length;i++)for(let j=i+1;j<c.hanger.drawn.length;j++){
    const a=c.hanger.drawn[i],b=c.hanger.drawn[j];check(c,a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,"HANGER card rectangles do not overlap",{a,b});
  }
}
async function start(r,mech) {
  const c=r.record;
  await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").continueSortieFromHub());
  c.firstOpening=await readyCards(r.page); const initial=c.firstOpening;
  check(c,initial.mech===mech&&initial.opening===3&&initial.paused,"normal SORTIE starts the selected mech with three paused Opening choices",initial);
  check(c,Object.keys(initial.skills).length===1&&initial.skills[mech==="umbraSeraph"?"umbraMoonlight":mech==="regaliaBastion"?"regaliaBastionCannon":"basicSkill"]?.stage===1,"new run owns only its correct S1 starter",initial.skills);
  if(mech==="umbraSeraph") {
    check(c,initial.context?.mode==="production-run"&&initial.context.current&&initial.context.inputsFrozen,"production owner binds canonical immutable inputs",initial.context);
    check(c,initial.reach===2&&initial.mobility.moonGlideMs===250&&initial.mobility.novaFieldShape==="lane"&&initial.mobility.novaFieldDurationMs===2000&&initial.mobility.novaFieldForwardLength===1800&&initial.mobility.novaFieldHalfWidth===120,"ordinary URL ignores legacy comparison overrides and applies accepted balance",{reach:initial.reach,mobility:initial.mobility});
  } else check(c,initial.context===null&&initial.reach===1&&initial.mobility.novaFieldDurationMs===0,"existing mech retains legacy combat without a dedicated owner");
  for(let i=0;i<3;i++) {
    const before=await readyCards(r.page);let index=before.cards.findIndex(card=>card.type==="passive");if(index<0)index=0;
    c.selections.push({source:"Opening",index,cards:before.cards});await selectCard(r.page,index);
  }
  await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return !s.levelUpActive&&s.startingUpgradeSelectionsRemaining===0&&!s.physics.world.isPaused;},null,{timeout:30000});
}
async function fullGrowth(r) {
  const c=r.record;c.syntheticXp=await r.page.evaluate(()=>{
    const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),rows=[];
    for(let i=0;i<24;i++){const xp=s.stats.nextLevelXp;rows.push({level:s.stats.level,xp});s.gainExperience(xp);}return rows;
  });
  for(let i=0;i<30;i++) {
    const before=await read(r.page);
    if(!before.selection&&before.pending===0&&before.mutationPending===0)break;
    const cards=await readyCards(r.page);let index=cards.cards.findIndex(card=>ids.includes(card.skillId)&&card.type==="skill");
    if(index<0)index=cards.cards.findIndex(card=>["assault","execution"].includes(card.choiceId));if(index<0)index=0;
    c.selections.push({source:"synthetic-XP-normal-card",index,cards:cards.cards,mode:cards.mode});await selectCard(r.page,index);
  }
  await r.page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");return !s.levelUpActive&&!s.pendingLevelUps&&!s.skillMutationState.pendingQueue.length&&!s.physics.world.isPaused;},null,{timeout:30000});
  c.growth=await read(r.page);
  check(c,ids.every(id=>c.growth.skills[id]?.stage===8&&c.growth.skills[id].core&&c.growth.skills[id].final),"real card commits after declared synthetic XP produce all three S8/Core/Final skills",c.growth.skills);
  check(c,c.growth.owners.every(Boolean),"all three dedicated runtime owners coexist");
  c.spike=await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").getUmbraBloodSpikeEffectiveStats());
  check(c,c.spike.impactRadius===240,"S8 SPIKE retains adopted radius 240",c.spike);
}
async function combat(r) {
  const c=r.record;
  c.targetFixture=await r.page.evaluate(()=>{
    const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),p=s.playerHitbox.body.center,rows=[];
    for(const [dx,dy] of [[140,105],[260,100],[380,110],[300,-110]]) {
      const e=s.spawnEnemy("tank");e.body.reset(p.x+dx,p.y+dy);rows.push({x:e.body.center.x,y:e.body.center.y,hp:e.hp,radius:e.body.radius,type:e.enemyTypeId});
    }
    return rows;
  });
  await r.page.keyboard.down("ArrowRight");await r.page.keyboard.down("Shift");
  await r.page.waitForTimeout(520);await r.page.keyboard.up("Shift");await r.page.keyboard.up("ArrowRight");
  await r.page.waitForTimeout(1800);
  c.combat=await read(r.page);
  check(c,!c.combat.over,"short native three-weapon exercise remains live",c.combat.stats);
  check(c,c.combat.owners.every(r=>r&&r.errors===0&&r.clock>0),"all three native clocks advance without handler errors",c.combat.owners);
  check(c,c.combat.owners[0].counts.accepted>0,"native boost passage produces a MOONLIGHT accepted hit",c.combat.owners[0]);
  check(c,c.combat.owners[1].counts.impacts>0,"native SPIKE impact occurs",c.combat.owners[1]);
  check(c,c.combat.owners[2].counts.deployed>0&&c.combat.owners[2].counts.pulses>0,"native boost commits NOVA and its discharge pulses",c.combat.owners[2]);
}
async function production(browser) {
  const r=await open(browser,"purchase-reload-growth-extraction"),c=r.record;
  try {
    await hanger(r);check(c,c.hanger.canPurchase&&c.hanger.cost===10000000,"cleared Final Raid plus synthetic wallet permits the published price");
    c.purchase=await r.page.evaluate(async()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");const result=await s.handlePlayerMechHangarAction("umbraSeraph");return{result,coins:s.coins,owned:s.isPlayerMechOwned("umbraSeraph"),selected:s.getSelectedPlayerMechId()};});
    check(c,c.purchase.result===true&&c.purchase.coins===10000000&&c.purchase.owned&&c.purchase.selected==="umbraSeraph","actual HANGER purchase commits cost, ownership and auto-selection",c.purchase);
    await screenshot(r,"production-hanger-purchased.png");await r.page.reload({waitUntil:"domcontentloaded"});await waitHub(r.page);c.reloaded=await read(r.page);
    check(c,c.reloaded.coins===10000000&&c.reloaded.selected==="umbraSeraph"&&c.reloaded.owned.includes("umbraSeraph"),"real localStorage ownership and wallet survive page reload without reseeding",c.reloaded);
    checkpoint(c,"purchased-reloaded");await start(r,"umbraSeraph");await fullGrowth(r);checkpoint(c,"growth-complete");
    await combat(r);await screenshot(r,"production-three-skills.png");
    await r.page.evaluate(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").chooseExtract());
    await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").extractionComplete===true,null,{timeout:30000});c.result=await read(r.page);
    check(c,c.result.context?.state==="ENDED"&&c.result.mech==="umbraSeraph"&&c.result.owners.every(r=>r===null),"EXTRACT captures UMBRA identity then clears all combat owners",c.result.end);
    check(c,JSON.stringify(c.result.persisted.archive).includes("umbraSeraph")&&ids.every(id=>JSON.stringify(c.result.persisted.archive).includes(id)),"Archive persisted dedicated mech and all three skill IDs",c.result.persisted.archive);
    check(c,JSON.stringify(c.result.persisted.atlas).includes("umbraSeraph"),"Atlas persists the separate UMBRA scope",c.result.persisted.atlas);
    await screenshot(r,"production-extraction.png");
    await r.page.reload({waitUntil:"domcontentloaded"});await waitHub(r.page);c.resultReload=await read(r.page);
    check(c,JSON.stringify(c.resultReload.persisted.archive)===JSON.stringify(c.result.persisted.archive),"Archive survives real reload exactly");
    check(c,JSON.stringify(c.resultReload.persisted.atlas)===JSON.stringify(c.result.persisted.atlas),"Atlas survives real reload exactly");
    await start(r,"umbraSeraph");c.restart=await read(r.page);check(c,c.restart.skills.umbraMoonlight?.stage===1&&!c.restart.skills.umbraBloodSpike&&!c.restart.skills.umbraPhantomNova,"next sortie restarts from Moon S1 without restoring last run growth",c.restart.skills);
    check(c,c.pageErrors.length===0,"no browser exceptions",c.pageErrors);c.passed=true;
  } catch(error){c.failure=error.stack;c.failureState=await read(r.page).catch(()=>null);await screenshot(r,"production-failure.png").catch(()=>{});}
  finally{await r.context.close();}return c;
}
async function regression(browser,mech,mobile=false) {
  const r=await open(browser,`${mech}-${mobile?"mobile-landscape":"desktop"}`,{mobile}),c=r.record;
  try {
    await hanger(r);
    if(mech!=="defaultBear")await r.page.evaluate(id=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").handlePlayerMechHangarAction(id),mech);
    await screenshot(r,`${c.name}-hanger.png`);await start(r,mech);
    await screenshot(r,`${c.name}-hud.png`);check(c,c.pageErrors.length===0,"no browser exceptions",c.pageErrors);c.passed=true;
  }catch(error){c.failure=error.stack;c.failureState=await read(r.page).catch(()=>null);await screenshot(r,`${c.name}-failure.png`).catch(()=>{});}
  finally{await r.context.close();}return c;
}
async function main(){let browser;const selected=(process.env.UMBRA_PRODUCTION_CASES||"production,standard,regalia,mobile").split(",");
  try{browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER,args:["--disable-background-networking"]});
    if(selected.includes("production"))await production(browser);
    if(selected.includes("standard"))await regression(browser,"defaultBear");
    if(selected.includes("regalia"))await regression(browser,"regaliaBastion");
    if(selected.includes("mobile"))await regression(browser,"umbraSeraph",true);
  }catch(error){report.error=error.stack;}finally{await browser?.close();report.passed=!report.error&&report.cases.length>0&&report.cases.every(c=>c.passed);
    fs.writeFileSync(path.join(out,"production-browser.json"),JSON.stringify(report,null,2),{flag:"wx"});
    console.log(JSON.stringify({passed:report.passed,cases:report.cases.map(c=>({name:c.name,passed:c.passed,checks:c.checks.length,failure:c.failure})),error:report.error}));process.exitCode=report.passed?0:1;}}
if(require.main===module)main();
module.exports={main,read,readyCards,selectCard,open,start,hanger,production,regression};
