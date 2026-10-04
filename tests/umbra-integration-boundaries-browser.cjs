"use strict";

// Separate from the natural run and from the all-S8 lifecycle scenario.
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT required");

function installBoundaryObserver() {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), env = s.runEnvironmentIO;
  if (!env?.ownsScene(s) || env.getFixture(s).mode !== "boundary") throw Error("Known live boundary fixture required");
  const history = [], original = new Map();
  const scalar = value => Object.fromEntries(Object.entries(value || {}).filter(([,v]) => v == null || ["number","string","boolean"].includes(typeof v)));
  const state = () => ({ realMs: performance.now(), sceneMs: s.time?.now, depth: s.stageDepth,
    runStart: { ...s.runStartContext }, depthProgress: { ...s.runDepthProgressState }, level: s.stats?.level, xp: s.stats?.xp,
    coins: s.coins, unsecuredGeek: s.runUnsecuredCoins, hp: s.stats?.hp, maxHp: s.stats?.maxHp,
    environmentId: env.id, runId: s.umbraRunContext?.runId, state: s.umbraRunContext?.state, ending: s.umbraRunContext?.ending,
    current: s.isUmbraRunContextCurrent?.(s.umbraRunContext), combatAllowed: s.hasUmbraRunCapability?.("moonlight", { purpose: "combat" }),
    worldPaused: s.physics?.world?.isPaused, gameOver: s.gameOver, extracted: s.extractionComplete, shop: s.shopActive,
    owners: [s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, s.umbraPhantomNovaRuntime, s.umbraBoostTrace].map(Boolean),
    clocks: [s.umbraMoonlightRuntime?.combatTimeMs, s.umbraBloodSpikeRuntime?.combatTimeMs, s.umbraPhantomNovaRuntime?.combatTimeMs],
    gate: scalar(s.gateState), gateChoiceActive: s.gateChoiceActive, instability: s.gateInstabilityStacks,
    contract: { id: s.getActiveAnomalyContract()?.id || null, activeDepth: s.anomalyContractState?.activeDepth,
      pendingDepth: s.anomalyContractState?.pendingDepth, open: s.anomalyContractState?.selectionOpen },
    raid: { active: s.isFinalBossRaidActive(), loading: s.finalBossRaidAssetsLoading, cleared: s.isFinalBossRaidCleared(),
      elapsedMs: s.finalBossRaidState?.elapsedMs, phase: s.finalBossRaidState?.currentPhaseId,
      pseudoDamageCounter: s.finalBossRaidState?.pseudoDamageCounter, supportSchedule: s.finalBossRaidState?.supportSchedule?.length || 0,
      rescueHud: Boolean(s.finalRaidRescueLinkState?.container?.active), bgmMode: s.activeRunBgmMode,
      bossTarget: Boolean(s.finalBossRaidState?.bossHitTarget?.active) },
    endSnapshot: s.umbraNormalEndSnapshot || null, lastGameOverReason: scalar(s.lastGameOverReason),
    mutationQueue: s.skillMutationState?.pendingQueue?.length || 0, objectCount: s.children?.list?.length || 0 });
  const names = ["beginGateDepthTransition", "completeGateDepthTransition", "captureUmbraGateSurvivors", "adoptUmbraGateSurvivors",
    "loadFinalBossRaidAssetsThenBegin", "beginFinalBossRaid", "endUmbraNormalRun", "triggerGameOver", "collapseGate",
    "chooseEmergencyExtract", "completeExtraction", "recordUmbraIntegrationResult"];
  for (const name of names) {
    original.set(name, s[name]);
    s[name] = function(...args) {
      const before = state();
      try { const result = original.get(name).apply(this, args); history.push({ method:name, before, after:state() }); return result; }
      catch (error) { history.push({ method:name, before, after:state(), error:String(error.stack || error) }); throw error; }
    };
  }
  const record = (operation, detail = {}) => env.record("explicit-boundary-operation", { operation, ...detail, naturalProgression:false });
  window.__UMBRA_BOUNDARY_OBSERVER__ = { state, history, record,
    export: () => ({ state:state(), history:[...history], environment:env.snapshot() }),
    cleanup: () => { for (const [name, value] of original) s[name] = value; } };
  return state();
}

async function read(page) { return page.evaluate(() => window.__UMBRA_BOUNDARY_OBSERVER__.state()); }
async function settleCards(page, selections) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return { active:s.umbraRunContext?.state === "ACTIVE", ended:s.umbraRunContext?.state === "ENDED",
        cards:s.levelUpActive && !!s.levelUpCardRecords?.length, mode:s.levelUpSelectionMode,
        guidance:s.gateGuidanceOverlayActive, code:s.depth20ClearCodeOverlayActive, calibration:s.baseCalibrationCapUnlockOverlayActive };
    });
    if (s.active || s.ended) return;
    if (s.cards) { await ui.enabledCards(page); selections.push(await ui.chooseCard(page, 0)); }
    else if (s.guidance || s.code || s.calibration) {
      await page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
        window.__UMBRA_BOUNDARY_OBSERVER__.record("existing-notice-continue", {});
        if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("boundary-notice");
        if (s.depth20ClearCodeOverlayActive) s.closeDepth20ClearCodeUnlockOverlay("boundary-notice");
        if (s.baseCalibrationCapUnlockOverlayActive) s.closeBaseCalibrationCapUnlockOverlay?.("boundary-notice");
      });
    } else await page.waitForTimeout(50);
  }
  throw Error("Normal queued selection did not settle");
}

async function start(browser, caseId, fixture, c) {
  const r = await h.open(browser, caseId, { path:`/umbra-integration.html?fixture=${fixture}` });
  await ui.waitHub(r.page);
  c.hub = await r.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    return { environment:s.runEnvironmentIO.snapshot(), depth:s.stageDepth, start:s.runStartContext, level:s.stats.level, coins:s.coins, xp:s.stats.xp };
  });
  c.sortie = await ui.clickPhaserText(r.page, "SORTIE PREP");
  // Relay SORTIE invokes the real Scene.restart. Observe its new world only.
  await r.page.waitForFunction(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    return s.levelUpActive && s.levelUpCardRecords?.length > 0;
  }, null, { timeout:90000 });
  await r.page.evaluate(installSceneObserver); await r.page.evaluate(installBoundaryObserver);
  c.firstOpening = await read(r.page);
  for (let count = 0; count < 3; count++) {
    const state = await ui.enabledCards(r.page), index = state.cards.findIndex(card => card.type === "passive");
    if (index < 0) throw Error("No legal Opening passive card");
    c.selections.push(await ui.chooseCard(r.page, index));
  }
  await settleCards(r.page, c.selections); c.active = await read(r.page);
  return r;
}

async function gate(page, { unstable = false, enter = true } = {}) {
  return page.evaluate(({ unstable, enter }) => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), probe = window.__UMBRA_BOUNDARY_OBSERVER__;
    probe.record("spawnStageGate", { noClockRewrite:true, depth:s.stageDepth }); s.spawnStageGate();
    if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("boundary-gate");
    if (unstable) { probe.record("collapseGate", { purpose:"actual-instability-transition" }); s.collapseGate(); }
    if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("boundary-gate");
    if (enter) s.handleGateEnter(); return probe.state();
  }, { unstable, enter });
}

async function next(page, c) {
  const before = await read(page); c.gates.push(await gate(page));
  await ui.clickPhaserText(page, "NEXT STAGE");
  if (before.depth + 1 >= 6) {
    await page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").anomalyContractState.selectionOpen, null, { timeout:12000 });
    const cards = await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").anomalyContractCardRecords.map(r => ({ id:r.contract.id, depth:r.targetDepth })));
    c.contracts.push(cards); await page.keyboard.press("1");
  }
  await page.waitForFunction(depth => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").stageDepth === depth, before.depth + 1, { timeout:25000 });
  await settleCards(page, c.selections); return read(page);
}

async function verifyEndAndHub(r, c, check) {
  c.result = await r.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), snapshot = s.umbraNormalEndSnapshot;
    const repeated = s.endUmbraNormalRun("REPEATED_BOUNDARY_END");
    return { state:window.__UMBRA_BOUNDARY_OBSERVER__.state(), sameSnapshot:repeated === snapshot,
      staleSelection:s.completeLevelUpCardSelection({ onSelect() { throw Error("Invalid ended selection executed"); } }),
      environment:s.runEnvironmentIO.snapshot() };
  });
  check(c.result.state.state === "ENDED" && c.result.state.owners.every(x => !x), "result closes all dedicated owners", c.result.state);
  check(c.result.sameSnapshot && c.result.staleSelection === false, "end snapshot is idempotent and old selection cannot resume", c.result);
  const wallet = c.result.environment.ram.localStorage.lastmemoVansabaCoins, id = c.result.state.runId;
  c.endObservation = await r.page.evaluate(() => window.__UMBRA_BOUNDARY_OBSERVER__.export());
  await r.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    window.__UMBRA_BOUNDARY_OBSERVER__.cleanup(); window.__NORMAL_SCENE_OBSERVER__.cleanup();
    delete window.__UMBRA_BOUNDARY_OBSERVER__; delete window.__NORMAL_SCENE_OBSERVER__;
    s.returnToOpeningShop("Phase7B 境界結果後の同session HUB");
  });
  await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.shopActive && !s.restartInProgress; }, null, { timeout:25000 });
  c.returnedHub = await r.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    return { environment:s.runEnvironmentIO.snapshot(), oldRunId:s.umbraRunContext?.runId, shop:s.shopActive, owners:[s.umbraMoonlightRuntime,s.umbraBloodSpikeRuntime,s.umbraPhantomNovaRuntime].map(Boolean) };
  });
  check(c.returnedHub.environment.ram.localStorage.lastmemoVansabaCoins === wallet && c.returnedHub.environment.id === c.result.environment.id,
    "same-session HUB preserves the RAM wallet and environment", { wallet, oldRunId:id, hub:c.returnedHub });
}

async function main() {
  fs.mkdirSync(out, { recursive:true });
  const report = { createdAt:new Date().toISOString(), sourceRoot:h.sourceRoot, sources:h.sources,
    harnessSha256:h.sha(fs.readFileSync(__filename)), baseHarnessSha256:h.harnessSha256,
    methodology:"Explicit boundary functional scenarios with regular rAF, real HUB/SORTIE/Opening/Relay Scene.restart, actual Gate and contract controls, actual lethal damage/collapse/instability/extraction. Each synthetic Gate and input reward is recorded. No direct stageDepth or HP assignment, spawn/AI/attack replacement, invincibility, clock acceleration, physical-step or vendor change. Raid is entered through five real Gate transitions from an explicitly seeded Depth5 start; no claim of natural Depth1 arrival or full Raid completion.",
    unconfirmed:["Natural arrival at Relay depths", "Full Raid timeline/rescue/reward completion", "All emergency instability coefficients", "Device readability/audio audibility", "Long-run performance"], cases:[], errors:[] };
  let browser;
  try {
    fs.mkdirSync(path.join(out,"harness"),{recursive:true});
    for (const name of ["umbra-integration-boundaries-browser.cjs","umbra-integration-browser-harness.cjs","umbra-integration-initialization-browser.cjs","umbra-integration-scene-observer.cjs"]) fs.copyFileSync(path.join(__dirname,name),path.join(out,"harness",name),fs.constants.COPYFILE_EXCL);
    browser = await h.launch(); report.browserVersion = browser.version();
    for (const caseId of (process.env.UMBRA_TEST_BOUNDARY_CASES || "relay10-emergency,relay20-death,relay30-next,depth5-collapse,depth5-raid").split(",")) {
      const fixture = caseId.split("-")[0], c = { caseId, fixture, checks:[], selections:[], gates:[], contracts:[] }; report.cases.push(c); let r;
      const check = (passed,label,detail=null) => { c.checks.push({passed:!!passed,label,detail}); if (!passed) throw Error(label); };
      try {
        r = await start(browser,caseId,fixture,c);
        check(c.active.state === "ACTIVE" && c.active.combatAllowed && !c.active.raid.active, "normal boundary run is active after real selections", c.active);
        if (fixture.startsWith("relay")) {
          const depth = Number(fixture.slice(5));
          check(c.firstOpening.depth === depth && c.firstOpening.runStart.usedDepthRelay && c.firstOpening.runStart.runStartDepth === depth, "actual Relay restart binds requested depth", c.firstOpening);
          check(c.firstOpening.level === 1 && c.firstOpening.xp === 0 && c.firstOpening.depthProgress.rewardDepthReached === 1 && c.firstOpening.unsecuredGeek === 0,
            "Relay skips no XP/GEEK or reward-Depth grants", c.firstOpening);
        }
        if (caseId === "relay10-emergency") {
          check(c.active.depth === 10 && c.active.combatAllowed && !c.active.raid.loading, "ordinary D10 Relay is not a Raid stop", c.active);
          await r.page.waitForTimeout(150); const live = await read(r.page);
          check(live.clocks[0] > c.active.clocks[0], "D10 dedicated clock advances under normal rAF", live);
          await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); window.__UMBRA_BOUNDARY_OBSERVER__.record("addRunCoin",{amount:123}); s.addRunCoin(123); });
          c.gates.push(await gate(r.page,{unstable:true}));
          c.beforeEmergency = await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return { state:window.__UMBRA_BOUNDARY_OBSERVER__.state(), rate:s.getCurrentCoinScaling().emergencyExtractRate }; });
          check(c.beforeEmergency.state.instability === 1 && c.beforeEmergency.state.gate.status === "unstable", "actual Deep collapse becomes one instability stack", c.beforeEmergency);
          await ui.clickPhaserText(r.page,"EMERGENCY EXTRACT");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").extractionComplete);
          await verifyEndAndHub(r,c,check);
          check(c.result.state.endSnapshot.reason === "EMERGENCY_EXTRACT", "emergency end reason preserved");
          check(c.result.state.coins === c.beforeEmergency.state.coins + Math.floor(c.beforeEmergency.state.unsecuredGeek * c.beforeEmergency.rate), "actual emergency fraction credited RAM wallet once", c.result.state);
        } else if (caseId === "relay20-death") {
          await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return !s.overlayContainer.visible && s.time.now >= s.invincibleUntil; });
          c.lethalInput = await r.page.evaluate(() => {
            const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), incoming = s.stats.maxHp * 10;
            window.__UMBRA_BOUNDARY_OBSERVER__.record("applyDamageToPlayer",{incoming,purpose:"explicit-lethal-input"});
            s.addRunCoin(123); return { accepted:s.applyDamageToPlayer(incoming,{source:"phase7b-boundary-lethal"}), state:window.__UMBRA_BOUNDARY_OBSERVER__.state() };
          });
          check(c.lethalInput.accepted && c.lethalInput.state.hp === 0 && c.lethalInput.state.gameOver, "real receiver reaches AP0 and game over", c.lethalInput);
          await verifyEndAndHub(r,c,check); check(c.result.state.coins === c.active.coins && c.result.state.unsecuredGeek === 0, "death loses unsecured GEEK only",c.result.state);
        } else if (caseId === "relay30-next") {
          const after = await next(r.page,c); c.after31 = after;
          check(after.depth === 31 && after.runStart.runStartDepth === 30 && after.runStart.usedDepthRelay && after.depthProgress.rewardDepthReached === 2,
            "real D30 Gate reaches D31 while keeping start30 and rewardDepth2", after);
          check(after.runId === c.active.runId && after.combatAllowed && !after.raid.active, "D31 keeps the same lawful normal run",after);
        } else if (caseId === "depth5-collapse") {
          await r.page.evaluate(() => { const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); window.__UMBRA_BOUNDARY_OBSERVER__.record("addRunCoin",{amount:123});s.addRunCoin(123); });
          c.gates.push(await gate(r.page,{enter:false}));
          c.collapse = await r.page.evaluate(() => {
            const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), attempts=[];
            for(let n=0;n<2&&!s.gameOver;n++) {
              window.__UMBRA_BOUNDARY_OBSERVER__.record("collapseGate",{attempt:n+1,purpose:"explicit-collapse-boundary; no elapsed deadline claim"});
              s.collapseGate(); attempts.push(window.__UMBRA_BOUNDARY_OBSERVER__.state());
              if(s.gateGuidanceOverlayActive)s.closeGateGuidanceOverlay("boundary-rescue-continue");
            }
            return attempts;
          });
          check(c.collapse.at(-1).gameOver && c.collapse.at(-1).lastGameOverReason.reason === "gateCollapse", "Depth5 collapse honors first rescue then reaches actual failure",c.collapse);
          await verifyEndAndHub(r,c,check); check(c.result.state.coins === c.active.coins && c.result.state.unsecuredGeek === 0, "collapse leaves confirmed wallet and loses run reward",c.result.state);
        } else if (caseId === "depth5-raid") {
          check(!c.active.raid.cleared && !c.active.runStart.usedDepthRelay, "Raid branch starts from explicitly seeded uncleared non-Relay fixture",c.active);
          for (let depth=6;depth<=10;depth++) { c.lastDepth = await next(r.page,c); check(c.lastDepth.depth===depth,"actual Gate advanced exactly one Depth",c.lastDepth); }
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").isFinalBossRaidActive(),null,{timeout:180000});
          c.raidActive = await read(r.page);
          c.raidHistory = await r.page.evaluate(() => window.__UMBRA_BOUNDARY_OBSERVER__.history.filter(row => ["loadFinalBossRaidAssetsThenBegin","beginFinalBossRaid"].includes(row.method)));
          check(c.raidActive.state === "ENDED" && c.raidActive.owners.every(x=>!x) && !c.raidActive.combatAllowed, "Raid begins after all dedicated owners and capability end",c.raidActive);
          const loading = c.raidHistory.find(x => x.after.raid.loading);
          check(!!loading && loading.after.owners.every(x=>!x), "actual Raid asset waiting already has dedicated cleanup",loading);
          await r.page.waitForTimeout(300); c.raidLater = await read(r.page);
          check(c.raidLater.raid.elapsedMs > c.raidActive.raid.elapsedMs && c.raidLater.raid.supportSchedule > 0 && c.raidLater.raid.bossTarget,
            "existing Raid timeline, support schedule and target remain live",c.raidLater);
          c.pseudo = await r.page.evaluate(() => {
            const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), target=s.finalBossRaidState.bossHitTarget;
            window.__UMBRA_BOUNDARY_OBSERVER__.record("applyFinalBossRaidDamageToBoss",{input:1,pseudoOnly:true});
            const before=s.finalBossRaidState.pseudoDamageCounter||0; s.applyFinalBossRaidDamageToBoss(target,1);
            return {before,after:s.finalBossRaidState.pseudoDamageCounter||0,hp:target.hp,maxHp:target.maxHp};
          });
          check(c.pseudo.after > c.pseudo.before && c.pseudo.hp === c.pseudo.maxHp, "existing Raid pseudo damage remains pseudo",c.pseudo);
        } else throw Error(`Unknown bounded case ${caseId}`);
        if (!c.endObservation) c.observation = await r.page.evaluate(() => window.__UMBRA_BOUNDARY_OBSERVER__.export());
      } catch (error) { c.error=error.stack; if(r)c.failure=await r.page.evaluate(()=>window.__UMBRA_BOUNDARY_OBSERVER__?.export?.()||null).catch(()=>null); }
      finally {
        if(r) {
          await r.page.evaluate(()=>{window.__UMBRA_BOUNDARY_OBSERVER__?.cleanup?.();window.__NORMAL_SCENE_OBSERVER__?.cleanup?.();window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("BOUNDARY_CASE_END");}).catch(error=>c.endError=String(error));
          await r.page.waitForFunction(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:15000}).catch(error=>c.endError=String(error));
          c.audit=await h.audit(r); c.finalEnvironment=await r.page.evaluate(()=>window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot()).catch(()=>null); await r.context.close();
        }
        c.passed=!c.error&&!c.endError&&c.checks.length>0&&c.checks.every(x=>x.passed)&&c.audit?.isolationPassed&&c.audit.pageErrors.length===0;
        fs.writeFileSync(path.join(out,`${caseId}.json`),JSON.stringify(c,null,2),{flag:"wx"});
      }
      if(!c.passed){report.errors.push(`Failfast ${caseId}`);break;}
    }
  } catch(error){report.errors.push(error.stack);}
  finally {
    await browser?.close();report.passed=report.errors.length===0&&report.cases.length>0&&report.cases.every(c=>c.passed);
    fs.writeFileSync(path.join(out,"integration-boundaries.json"),JSON.stringify(report,null,2),{flag:"wx"});
    console.log(JSON.stringify({passed:report.passed,cases:report.cases.map(c=>({id:c.caseId,passed:c.passed,error:c.error})),errors:report.errors}));
    process.exitCode=report.passed?0:1;
  }
}
if(require.main===module)main();
module.exports={installBoundaryObserver,start,settleCards,next,gate};
