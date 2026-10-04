"use strict";
// Phase 6B: bounded, independent real-Phaser state and card checks.
// Synthetic XP / direct boundary Stage changes are labelled; this does not
// establish normal-run attainability or real-device refresh-rate performance.
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, ".."), sourceRoot = process.env.UMBRA_TEST_SOURCE_ROOT || project;
const base = (process.env.UMBRA_TEST_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const output = process.env.UMBRA_TEST_OUTPUT || path.join(project, ".tmp_umbra_phase6b", "growth-browser");
const smoke = process.argv.includes("--smoke"), noRaf = process.argv.includes("--no-raf");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const names = ["index.html", "game.js", "skillDefinitions.js", "stageDefinitions.js", "equipmentDefinitions.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js", "vendor/phaser.min.js"];
if (fs.existsSync(path.join(sourceRoot, "umbraPresentation.js"))) names.push("umbraPresentation.js");
const frozen = new Map(names.map(name => { const body = fs.readFileSync(path.join(sourceRoot, name)); return [name, { body, sha256: sha(body) }]; }));
fs.mkdirSync(output, { recursive: true });
const report = { createdAt: new Date().toISOString(), sourceRoot, smoke, sources: Object.fromEntries([...frozen].map(([n, v]) => [n, v.sha256])), harnessSha256: sha(fs.readFileSync(__filename)),
  methodology: "Fresh isolated contexts, frozen product sources, Storage and external requests denied. Actual Phaser.Game.step at Scene-controlled 30/60/120 Hz with unchanged fixed60 Arcade physics. State boundaries use explicitly synthetic direct Stage changes without reset. Cards use real selectLevelUpCard immediate lock and Scene timer confirmation. XP tests are synthetic, not natural enemy progression. Normal rAF observation is separate; no claim of GPU duration or device Hz.", contexts: [], suites: [], errors: [] };
let browser;
async function open(label, query = "&umbraGrowth=1&umbraMoonlight=1&umbraBloodSpike=1&umbraPhantomNova=1&umbraNovaSlots=3", viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block" });
  const audit = { label, query, external: [], pageErrors: [], requests: [] }; report.contexts.push(audit);
  await context.route("**/*", route => {
    const url = route.request().url(); if (!url.startsWith(base + "/")) { audit.external.push(url); return route.abort(); }
    const pathname = decodeURIComponent(new URL(url).pathname), name = pathname === "/" ? "index.html" : pathname.slice(1);
    audit.requests.push(name); const entry = frozen.get(name);
    return entry ? route.fulfill({ status: 200, body: entry.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
  });
  const page = await context.newPage(); page.on("pageerror", e => audit.pageErrors.push(e.stack));
  await page.addInitScript(() => {
    window.__growthAudit = { storage: [], probes: [], normal: [] };
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () { window.__growthAudit.storage.push(method); throw Error("Storage denied"); };
    for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, get() { window.__growthAudit.probes.push(name); throw Error("Storage denied"); } });
    let factory;
    Object.defineProperty(window, "createUmbraPhase2ADriveScene", { configurable: true, get() { return factory; }, set(value) {
      factory = function (...args) { const Scene = value(...args), create = Scene.prototype.create;
        Scene.prototype.create = function (...a) { create.apply(this, a); this.physics.world.pause(); this.game.loop.stop(); };
        return Scene; };
    } });
    window.addEventListener("load", () => {
      for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry", "startTriadMatrixRun", "refreshTriadMatrixSnapshot"]) {
        const original = SurvivalScene.prototype[name];
        if (typeof original === "function") SurvivalScene.prototype[name] = function (...args) { window.__growthAudit.normal.push(name); return original.apply(this, args); };
      }
    }, { once: true });
  });
  await page.goto(base + "/?umbraPreview=1&umbraDrive=1" + query);
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase2ADrive")?.moonlightArena, null, { timeout: 30000 });
  audit.initial = await page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"); window.__SURVIVAL_GAME__.loop.stop();
    return { phaser: Phaser.VERSION, fps: s.physics.world.fps, fixedStep: s.physics.world.fixedStep, stages: Object.fromEntries(Object.entries(s.playerSkills || {}).map(([id, st]) => [id, st.stageIndex + 1])), probes: window.__growthAudit.probes.length, growth: s.isUmbraGrowthContextActive?.(), pending: s.pendingLevelUps }; });
  return { context, page, audit };
}
async function close(run) {
  run.audit.final = await run.page.evaluate(() => ({ ...window.__growthAudit, firebase: typeof window.firebase !== "undefined" }));
  run.audit.passed = !run.audit.external.length && !run.audit.pageErrors.length && !run.audit.final.storage.length && !run.audit.final.normal.length && !run.audit.final.firebase && run.audit.final.probes.length === run.audit.initial.probes;
  await run.context.close();
}
async function controlled(page, rate) {
  return page.evaluate(rate => {
    const g = window.__SURVIVAL_GAME__, s = g.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena, dt = 1000 / rate;
    const ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"], results = []; let now = s.time.now, c;
    const copy = v => JSON.parse(JSON.stringify(v, (_k, x) => x instanceof Set ? [...x] : x instanceof Map ? [...x.values()].map(v => ({lifeId:v.lifeId,lastHitAt:v.lastHitAt,passId:v.passId})) : x));
    const check = (ok, expected, actual = null) => c.checks.push({ passed: !!ok, expected, actual: copy(actual) });
    const input = (...keys) => { for (const k of ["up", "down", "left", "right", "w", "a", "s", "d", "dash", "dashAlt"]) { s.keys[k].isDown = keys.includes(k); s.keys[k].isUp = !s.keys[k].isDown; } };
    const step = (delta = dt) => { now += delta; const at = performance.now(), physical = s.physicsSteps; g.step(now, delta); c.frames.push({ at: now, delta, cpuMs: performance.now() - at, physical: s.physicsSteps - physical, scene: s.sceneUpdates, spikeMs: s.umbraBloodSpikeRuntime?.combatTimeMs, novaMs: s.umbraPhantomNovaRuntime?.combatTimeMs }); };
    const frames = (ms, ...keys) => { input(...keys); for (let n = 0; n < Math.ceil(ms / dt); n++) step(); };
    const until = (fn, limit = 2500, keys = []) => { input(...keys); let n = 0; while (!fn() && n++ < Math.ceil(limit / dt)) step(); check(fn(), "bounded physical wait", {n, limit}); };
    const stage = (id, value) => { if (!s.playerSkills[id]) s.unlockSkill(id); const state = s.playerSkills[id]; state.stageIndex = value - 1; s.applySkillStage(state); return state; };
    const spawn = (o = {}) => a.spawnEnemy({ typeId: "boss_crack", isBoss: true, isElite: true, x: 450, y: 500, ...o });
    const snap = () => ({ moon:s.getUmbraMoonlightSnapshot(), spike:s.getUmbraBloodSpikeSnapshot(), nova:s.getUmbraPhantomNovaSnapshot() });
    function run(name, fn, fixture = "baseline") { c = { name, rate, fixture, checks: [], frames: [] };
      try { a.configId = "empty"; s.resetDrive("umbraSeraph", fixture); s.closeCandidateCards(); s.pendingLevelUps = 0; s.startingUpgradeSelectionsRemaining = 0; s.levelUpActive = false; s.physics.world.resume(); input(); frames(50); fn(); c.final = copy(snap());
        check(ids.every(id => !s.playerSkills[id] || !!s.getUmbraActiveSkillStage(id)), "every acquired Stage remains canonical");
        check(!c.final.moon.errors && !c.final.spike.errors && !c.final.nova.errors, "weapon errors zero");
      } catch (e) { check(false, "case completes", e.stack); }
      c.passed = c.checks.every(x => x.passed); results.push(c); }
    run("initial-and-query-purity", () => { const before = {states:Object.keys(s.playerSkills),pending:s.pendingLevelUps,run:s.umbraGrowthRun,moon:s.umbraMoonlightRuntime}, stageBefore = s.playerSkills.umbraMoonlight.stageIndex;
      for(let i=0;i<20;i++) { s.getAvailableSkillChoices(); s.buildLevelUpUpgradeChoices({openingBoost:false}); ids.forEach(id=>s.getUmbraActiveSkillStage(id)); }
      check(before.states.join() === "umbraMoonlight" && stageBefore === 0, "legacy all+slots3 query does not grant weapons");
      check(s.playerSkills.umbraMoonlight.stageIndex===0 && s.umbraGrowthRun===before.run && s.umbraMoonlightRuntime===before.moon && s.pendingLevelUps===before.pending,"queries do not acquire/reset/change pending");
    });
    for (const boundary of [0, 100, 190, 220]) run(`spike-existing-cast-at-${boundary}ms`, () => {
      s.unlockSkill("umbraBloodSpike"); spawn(); until(()=>s.umbraBloodSpikeRuntime.casts.length>0);
      const rt=s.umbraBloodSpikeRuntime,cast=rt.casts[0]; until(()=>rt.combatTimeMs>=cast.createdCombatTimeMs+boundary);
      const saved=copy(cast), clock=rt.combatTimeMs, due=rt.nextCastAtMs, state=s.playerSkills.umbraBloodSpike;
      stage("umbraBloodSpike",8); check(rt===s.umbraBloodSpikeRuntime && rt.casts[0]===cast,"growth preserves runtime and existing cast references");
      check(JSON.stringify(copy(cast))===JSON.stringify(saved)&&clock===rt.combatTimeMs&&due===rt.nextCastAtMs,"position/radius/impact/lifetime/attempted/clock/deadline unchanged",{saved,after:copy(cast)});
      check(s.getUmbraBloodSpikeEffectiveStats().impactRadius===240&&cast.radius===80,"old R80 and next R240 separated");
      until(()=>rt.counts.casts>=2,2200); check(rt.casts.some(x=>x.radius===240),"next real scheduled cast uses R240",rt.casts.map(x=>({radius:x.radius,due:x.impactDueAtMs})));
      check(s.playerSkills.umbraBloodSpike===state,"skill identity preserved");
    });
    run("nova-deployed-additional-slots",()=>{stage("umbraPhantomNova",3);frames(180,"right","dash");input();const rt=s.umbraPhantomNovaRuntime,slot=rt.slots[0],saved=copy(slot),clock=rt.combatTimeMs,deployed=rt.counts.deployed;
      check(slot.state==="DEPLOYED","test owns a real deployed slot",slot.state);stage("umbraPhantomNova",4);
      check(rt===s.umbraPhantomNovaRuntime&&rt.slots[0]===slot&&JSON.stringify(copy(slot))===JSON.stringify(saved),"S3→4 preserves existing DEP snapshot and identity");
      check(rt.slots.length===2&&rt.slots[1].state==="ORBITING"&&rt.slots[1].nextPulseAtMs===clock+s.getUmbraPhantomNovaIntervalMs("orbit"),"only new slot waits full interval",rt.slots.map(x=>({id:x.slotId,phase:x.phaseOffset,next:x.nextPulseAtMs})));
      stage("umbraPhantomNova",7);const second=copy(rt.slots[1]);stage("umbraPhantomNova",8);stage("umbraPhantomNova",8);
      check(rt.slots.length===3&&JSON.stringify(copy(rt.slots[1]))===JSON.stringify(second),"S7→8 and repeatedS8 preserve existing ORBIT");
      check(rt.slots.map(x=>x.phaseOffset).every((x,i)=>Math.abs(x-[0,Math.PI,Math.PI/2][i])<1e-9),"growth phase offsets 0 π π/2",rt.slots.map(x=>x.phaseOffset));
      check(rt.counts.deployed===deployed&&rt.combatTimeMs===clock,"growth neither deploys nor advances clock");frames(200,"right","dash");check(rt.counts.deployed===deployed,"still-held boost does not reserve new slot",rt.counts);
    });
    run("nova-regen-capacity-and-depth",()=>{s.unlockSkill("umbraPhantomNova");frames(180,"right","dash");input();const rt=s.umbraPhantomNovaRuntime;until(()=>rt.slots[0].state==="REGENERATING",4000);const old=copy(rt.slots[0]);stage("umbraPhantomNova",4);
      check(rt.slots.length===2&&JSON.stringify(copy(rt.slots[0]))===JSON.stringify(old),"S4 adds only new slot while old slot remains REGEN");
      const before=copy(rt.slots);s.stageDepth=10;s.handleUmbraPhantomNovaDepthChange(10);check(s.playerSkills.umbraPhantomNova.stageIndex===3&&rt.totalSlots===2&&rt.slots[0].regenerateAtMs===before[0].regenerateAtMs,"Depth keeps Stage/total/old regen deadline");
    });
    run("nova-pending-reservation-growth-and-overlay",()=>{s.unlockSkill("umbraPhantomNova");until(()=>c.frames.at(-1).physical>0,100);
      input("right","dash");step(1);const rt=s.umbraPhantomNovaRuntime,reservation=rt.reservation;
      check(reservation!==null,"start before next physical step reserves one slot",rt.reservation);
      stage("umbraPhantomNova",4);check(rt.reservation===reservation&&rt.counts.reservations===1,"pause-free growth preserves the original reservation only",rt.counts);
      const clock=rt.combatTimeMs;s.openCandidateCards(false);frames(100);
      check(rt.reservation===null&&rt.combatTimeMs===clock,"real selection overlay cancels reservation and freezes clock",{reservation:rt.reservation,clock:rt.combatTimeMs});
    });
    run("moon-damage-versus-radius-growth",()=>{const enemy=spawn();frames(50);const rt=s.umbraMoonlightRuntime,r=rt.targets.get(enemy),cursor=r.cursor,life=r.lifeId,pass=r.passId,last=r.lastHitAt,armed=r.armed;
      stage("umbraMoonlight",2);check(r.armed===armed&&r.cursor===cursor&&r.lifeId===life&&r.passId===pass&&r.lastHitAt===last,"damage-only Stage preserves exit and target history");
      stage("umbraMoonlight",3);check(r.radiusRebasePending&&r.armed===false&&r.initialEligible===false&&r.cursor===cursor&&r.lifeId===life&&r.lastHitAt===last,"radius Stage gates entry while keeping cursor/history");
      check(rt===s.umbraMoonlightRuntime,"Moon growth preserves runtime");
    });
    for(const fx of ["image","fallback","off"])run(`grown-three-weapons-${fx}`,()=>{ids.forEach(id=>stage(id,8));a.setFxMode(fx);spawn({x:450,y:580});frames(180,"right","dash");frames(3200);const end=snap();
      check(end.spike.counts.casts>0&&end.spike.counts.accepted>0&&end.nova.counts.pulses>0&&end.nova.counts.accepted>0,"S8 SPIKE/NOVA actually damage at normal deadlines",{spike:end.spike.counts,nova:end.nova.counts});
      c.combat={spike:end.spike.counts,nova:end.nova.counts,moon:end.moon.counts};
    });
    for(const fixture of ["baseline","medium","deep"])run(`effective-profile-${fixture}`,()=>{const expected={baseline:[750,725,650],medium:[711,688,618],deep:[666,645,581]}[fixture],actual=[];
      for(const st of [1,4,8]){stage("umbraMoonlight",st);actual.push(s.getUmbraMoonlightRehitIntervalMs());}
      check(JSON.stringify(actual)===JSON.stringify(expected),"currentStage rehit profile",{actual,expected});stage("umbraBloodSpike",1);const raw=s.getUmbraBloodSpikeRawDamage();stage("umbraBloodSpike",8);check(s.getUmbraBloodSpikeRawDamage()===raw&&s.getUmbraBloodSpikeEffectiveStats().impactRadius===240,"SPIKE growth changes radius only");
    },fixture);
    if(rate===60)for(const depth of [1,5,10,20,30])run(`synthetic-xp-depth-${depth}`,()=>{s.stageDepth=depth;s.levelUpActive=true;const initial={level:s.stats.level,passives:copy(s.passiveLevels),stages:Object.keys(s.playerSkills)};let supplied=0;
      for(let n=0;n<24;n++){const xp=s.stats.nextLevelXp-s.stats.xp;supplied+=xp;s.gainExperience(xp);}
      const at25={level:s.stats.level,pending:s.pendingLevelUps,next:s.stats.nextLevelXp,deep:s.isDeepLevelProgressionActive()};
      s.gainExperience(s.stats.nextLevelXp-s.stats.xp);const after={level:s.stats.level,pending:s.pendingLevelUps,next:s.stats.nextLevelXp};
      check(initial.level===1&&Object.values(initial.passives).every(x=>x===0)&&initial.stages.join()==="umbraMoonlight","new RAM start has no gratis passives or extra weapons",initial);
      check(at25.level===25&&at25.pending===24&&supplied===72996,"last Lv25 normal pending remains",{at25,supplied});
      check(after.level===26&&after.pending===(depth>=6?24:25),"Deep first only Depth>=6; shallow continues normal",{depth,at25,after});
      if(depth===5){s.stageDepth=6;const pending=s.pendingLevelUps;s.syncPlayerLevelXpRequirement();s.gainExperience(s.stats.nextLevelXp-s.stats.xp);check(s.pendingLevelUps===pending,"D5→6 Deep does not delete older normal pending");}
    });
    const fxCases=results.filter(x=>x.name.startsWith("grown-three-weapons-"));
    const semantic=entry=>JSON.stringify(Object.fromEntries(Object.entries(entry.combat||{}).map(([id,v])=>[id,Object.fromEntries(["casts","impacts","attempts","accepted","kills","pulses","orbitPulses","deployedPulses","deployed","expired","regenerated"].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))])));
    c={name:"FX-mode-attack-equivalence",rate,checks:[],frames:[]};check(fxCases.length===3&&fxCases.every(x=>semantic(x)===semantic(fxCases[0])),"image/simple/OFF same action counts",fxCases.map(x=>({name:x.name,combat:x.combat})));c.passed=c.checks.every(x=>x.passed);results.push(c);
    return results;
  },rate);
}
async function cardAndBudget(page) {
  // Every card confirmation stays in the browser's normal rAF loop. This
  // intentionally costs real time; no direct complete-selection shortcut.
  await page.evaluate(()=>{const g=window.__SURVIVAL_GAME__,s=g.scene.getScene("UmbraPhase2ADrive");s.moonlightArena.configId="empty";s.resetDrive("umbraSeraph","baseline");g.loop.start((t,d)=>g.step(t,d));});
  const results=[];
  async function chooseSkill() {
    await page.waitForFunction(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");return s.levelUpInputEnabled&&s.levelUpCardRecords?.some(r=>r.model.option.skillId);},null,{timeout:5000});
    const before=await page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"),i=s.levelUpCardRecords.findIndex(r=>r.model.option.skillId),r=s.levelUpCardRecords[i],id=r.model.option.skillId;
      const v={id,stage:s.playerSkills[id]?.stageIndex??-1,pending:s.pendingLevelUps,kind:r.model.typeLabel,progress:r.model.stageProgress,opened:s.levelUpOpeningBoostActive};
      s.chooseCandidate(i);s.input.keyboard.emit("keydown",{key:String(i+1),preventDefault(){},stopPropagation(){}});r.background?.emit?.("pointerdown");s.chooseCandidate(i);v.locked=s.levelUpSelectionLocked;return v;});
    await page.waitForFunction(before=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");return (s.playerSkills[before.id]?.stageIndex??-1)!==before.stage;},before,{timeout:5000});
    const after=await page.evaluate(id=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");return {stage:s.playerSkills[id].stageIndex,pending:s.pendingLevelUps};},before.id);
    results.push({name:"real-card-confirmation",passed:before.locked&&after.stage===before.stage+1&&after.pending===before.pending-1,before,after});
  }
  for(let n=0;n<23;n++){
    if(n>=3)await page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");if(!s.pendingLevelUps)s.openCandidateCards(false);});
    await chooseSkill();
  }
  const final=await page.evaluate(()=>{const s=window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive");return {stages:Object.fromEntries(Object.entries(s.playerSkills).map(([id,v])=>[id,v.stageIndex+1])),choices:s.getAvailableSkillChoices().map(c=>c.id),runMilestones:s.umbraGrowthRun?.deferredMilestones,normalMutation:s.skillMutationState,pending:s.pendingLevelUps,level:s.stats.level};});
  results.push({name:"23-real-skill-selections",passed:Object.values(final.stages).length===3&&Object.values(final.stages).every(x=>x===8)&&final.choices.length===0,final});
  await page.screenshot({path:path.join(output,"growth-after-23-cards.png")});
  await page.evaluate(()=>window.__SURVIVAL_GAME__.loop.stop());
  return results;
}
async function main(){try{
  browser=await chromium.launch({headless:true,executablePath:process.env.UMBRA_TEST_BROWSER});
  for(const rate of (smoke?[60]:[30,60,120])){const run=await open(`controlled-${rate}`);try{const cases=await controlled(run.page,rate);report.suites.push({name:`controlled-${rate}`,cases,passed:cases.every(c=>c.passed)});console.log(JSON.stringify({rate,failed:cases.filter(c=>!c.passed).map(c=>({name:c.name,checks:c.checks.filter(x=>!x.passed)}))}));}finally{await close(run);}}
  if(!smoke){const run=await open("real-cards");try{const cases=await cardAndBudget(run.page);report.suites.push({name:"real-cards",cases,passed:cases.every(c=>c.passed)});}finally{await close(run);}}
}catch(e){report.errors.push(e.stack);}finally{await browser?.close();report.passed=!report.errors.length&&report.suites.length>0&&report.suites.every(s=>s.passed)&&report.contexts.every(c=>c.passed);const file=path.join(output,`growth-browser-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,file,errors:report.errors}));process.exitCode=report.passed?0:1;}}
if(require.main===module)main();
module.exports={open,close,controlled,report,frozen,setBrowser:value=>browser=value};
