"use strict";
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs"), ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const original = fs.readFileSync(path.join(__dirname, "umbra-player-cards-browser.cjs"), "utf8");
const inspect = new Function(`${original.slice(original.indexOf("async function inspect("), original.indexOf("const invariant ="))}; return inspect;`)();
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh output directory required");
fs.mkdirSync(out, { recursive: true });
const report = { createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
  harnessSha256: h.sha(fs.readFileSync(__filename)), geometryHarnessSha256: h.sha(Buffer.from(original)), cases: [],
  methodology: "Two serial Chrome PC 844x390 normal-rAF functional checks using frozen source. Complete is the existing explicit synthetic LEGEND/S8 boundary fixture, followed by actual Opening/Core/Final/OVL I callbacks. OVL II uses one explicitly recorded synthetic XP grant through the original gainExperience path. Four-choice Opening uses one explicitly synthetic RAM openingBoostPlusOne consumable, saved only through the environment RAM IO before actual SORTIE. No candidate override, direct OVL mutation, attack/HP/clock/physics substitution or performance claim. CSS bounds and font calculation are extracted unchanged from the prior UI harness. Native Storage and outside network audit remain active." };
const state = page => page.evaluate(() => {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
  return { pending: s.pendingLevelUps, opening: s.startingUpgradeSelectionsRemaining, locked: s.levelUpSelectionLocked,
    ticket: s.getAnjuMemoryConsumableCount("openingBoostPlusOne"), ticketUsed: s.runAnjuMemoryState?.openingBoostExtraChoiceUsed,
    ticketActive: s.runAnjuMemoryState?.openingBoostExtraChoiceActive, runId: s.umbraRunContext?.runId,
    contextState: s.umbraRunContext?.state, detail: !!s.umbraPlayerCardDetail,
    clocks: [s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime].map(r => r?.combatTimeMs ?? null),
    nova: (s.umbraPhantomNovaRuntime?.slots || []).map(x => ({ slotId:x.slotId,state:x.state,cycleGeneration:x.cycleGeneration,regenerateAtMs:x.regenerateAtMs,deployedUntilMs:x.deployedUntilMs })),
    equipment: s.getUmbraEquipmentSnapshot(), stats: { level:s.stats?.level,xp:s.stats?.xp,nextLevelXp:s.stats?.nextLevelXp } };
});
const invariant = x => JSON.stringify([x.pending,x.opening,x.ticket,x.ticketUsed,x.ticketActive,x.runId,x.clocks,x.nova,x.equipment]);
async function main() {
  const browser = await h.launch(); report.browserVersion = browser.version();
  try { for (const name of ["overlimit-ii", "four-opening"]) {
    const c = { name, checks: [], views: [], selections: [] }; report.cases.push(c); let r;
    const check = (passed,label,value) => { c.checks.push({passed:!!passed,label,value}); if (!passed) throw Error(label); };
    async function capture(label) {
      const v = await inspect(r.page); c.views.push({label,...v});
      check(v.canvasInViewport, `${label}: Canvas inside viewport`,v.canvas);
      if (v.details) {
        check(v.details.outOfCanvas.length === 0 && v.details.intersections.length === 0,`${label}: detail Text bounds/intersections`,v.details);
        check(v.details.bodyFont >= 13.99,`${label}: detail body 14 CSS px`,v.details.bodyFont);
      } else for (const card of v.cards) {
        check(card.inCanvas && !card.outOfCard.length && !card.intersections.length,`${label}/${card.index}: card Text bounds/intersections`,{out:card.outOfCard,intersections:card.intersections});
        check(card.bodyFonts.length === 1 && card.bodyFonts[0] >= 13.99,`${label}/${card.index}: body 14 CSS px`,card.bodyFonts);
      }
      await r.page.screenshot({path:path.join(out,`${label}.png`),fullPage:true}); return v;
    }
    try {
      r = await h.open(browser,name,{path:`/umbra-integration.html?fixture=${name === "overlimit-ii" ? "complete" : "baseline"}&moonReach=wide`});
      await r.page.setViewportSize({width:844,height:390}); await ui.waitHub(r.page); await r.page.evaluate(installSceneObserver);
      if (name === "four-opening") c.syntheticSetup = await r.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), before = s.getAnjuMemoryConsumableCount("openingBoostPlusOne");
        s.runEnvironmentIO.record("explicit-ui-ticket-fixture",{consumable:"openingBoostPlusOne",before,after:1,scope:"synthetic RAM only"});
        s.anjuMemoryState.consumables.openingBoostPlusOne = 1; s.saveAnjuMemoryState();
        return {before,after:s.getAnjuMemoryConsumableCount("openingBoostPlusOne"),environmentId:s.runEnvironmentIO.id};
      });
      await ui.clickPhaserText(r.page,"SORTIE PREP"); await ui.enabledCards(r.page);
      if (name === "overlimit-ii") {
        for(let n=0;n<3;n++) { const v=await ui.enabledCards(r.page); c.selections.push(await ui.chooseCard(r.page,Math.max(0,v.cards.findIndex(x=>x.type === "passive")))); }
        await r.page.waitForFunction(()=>window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state === "ACTIVE");
        await r.page.locator("#umbra-integration-details > summary").click(); await r.page.locator("#umbra-integration-boundary").click(); await r.page.locator("#umbra-integration-details > summary").click();
        for(let n=0;n<9;n++) {
          const v=await ui.enabledCards(r.page), wanted=v.cards.findIndex(x=>["reactor","prism"].includes(x.choiceId));
          c.selections.push(await ui.chooseCard(r.page,wanted>=0?wanted:0));
        }
        await r.page.waitForFunction(()=>!window.__SURVIVAL_GAME__.scene.getScene("survival-scene").levelUpActive);
        c.beforeXp=await state(r.page);
        check(c.beforeXp.equipment.overlimitCap===2 && Object.values(c.beforeXp.equipment.overlimitLevels).every(x=>x===1),"actual legal Core/Final bonus produces all OVL I at cap II",c.beforeXp.equipment);
        c.syntheticXp=await r.page.evaluate(()=> {
          const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),amount=s.stats.nextLevelXp-s.stats.xp;
          s.runEnvironmentIO.record("explicit-ui-xp-fixture",{amount,source:"synthetic XP for one normal OVL II card"}); s.gainExperience(amount); return amount;
        });
        const options=await ui.enabledCards(r.page),view=await capture("narrow-overlimit-ii");
        const index=view.cards.findIndex(x=>x.model.player?.title?.includes("OVERLIMIT") || x.model.actionType === "overlimit");
        const actualIndex=index>=0?index:options.cards.findIndex(x=>x.type === "equipmentOverlimit");
        check(actualIndex>=0,"normal candidate list contains legal OVL II",view.cards.map(x=>x.model));
        c.selectedOption=view.cards[actualIndex].model;
        await r.page.evaluate(i=>{ const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); s.umbraPlayerCardFocusIndex=i; s.overlayFocusedPanel=null; },actualIndex);
        const before=await state(r.page); await r.page.keyboard.press("d"); await capture("narrow-overlimit-ii-details"); await r.page.keyboard.press("Escape");
        check(invariant(before)===invariant(await state(r.page)),"OVL II details preserve ticket/clocks/reservations");
        c.selections.push(await ui.chooseCard(r.page,actualIndex)); c.afterOvl=await state(r.page);
        check(c.afterOvl.equipment.overlimitLevels[c.selectedOption.skillId]===2 && c.afterOvl.pending===before.pending-1,"actual delayed OVL II callback applies once and consumes one normal pending",c.afterOvl);
      } else {
        c.before=await state(r.page); const view=await capture("narrow-four-opening");
        check(view.cards.length===4 && c.before.opening===3 && c.before.ticket===0 && c.before.ticketUsed && c.before.ticketActive,"one real synthetic RAM +1 ticket yields four choices and still three confirmations",c.before);
        await r.page.keyboard.press("d"); await capture("narrow-four-opening-details"); await r.page.keyboard.press("Escape");
        check(invariant(c.before)===invariant(await state(r.page)),"four-choice detail cycle neither spends another ticket nor changes paused run");
        c.selections.push(await ui.chooseCard(r.page,3)); c.afterFourth=await state(r.page);
        check(c.afterFourth.opening===2 && c.afterFourth.ticket===0 && c.selections.at(-1).locked.selectionLocked,"actual key 4 selects once through existing 360ms commit",c.afterFourth);
        await ui.enabledCards(r.page); await r.page.keyboard.press("d");
        c.beforeEnd=await state(r.page); check(c.beforeEnd.detail,"details are open at real session shutdown");
        c.shutdown=await r.page.evaluate(()=> {
          const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"),context=s.umbraRunContext,oldActions=[...s.overlayActions],oldKey=s.levelUpKeyHandler;
          window.__NORMAL_SCENE_OBSERVER__.cleanup(); window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("OPEN_DETAILS_END");
          for(const action of oldActions) action.onSelect(); oldKey?.({key:"1"});
          return {contextState:context.state,detailsPresent:!!s.umbraPlayerCardDetail,closed:window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed};
        });
        check(c.shutdown.contextState==="ENDED" && !c.shutdown.detailsPresent,"shutdown clears open details and saved callbacks cannot revive them",c.shutdown);
      }
    } catch(error) { c.error=error.stack; c.failure= r ? await inspect(r.page).catch(()=>null):null; }
    finally {
      if(r) {
        await r.page.evaluate(()=> { window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("EXTRA_UI_END"); }).catch(()=>{});
        await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:10000}).catch(e=>c.endError=String(e));
        c.audit=await h.audit(r); c.end=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot()).catch(()=>null);
        c.checks.push({passed:c.audit.isolationPassed,label:"native Storage and external requests/APIs zero"},{passed:c.audit.pageErrors.length===0,label:"no uncaught product error",value:c.audit.pageErrors});
        await r.context.close();
      }
      c.passed=!c.error&&!c.endError&&c.checks.every(x=>x.passed); fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify(c,null,2),{flag:"wx"}); console.log(JSON.stringify({name,passed:c.passed,checks:c.checks.length,error:c.error,failed:c.checks.filter(x=>!x.passed)}));
    }
  } } finally { await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]); report.passed=report.cases.every(c=>c.passed); fs.writeFileSync(path.join(out,"extra-ui.json"),JSON.stringify(report,null,2),{flag:"wx"}); if(!report.passed) process.exitCode=1; }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
