"use strict";

// Phase7B bounded functional diagnostics. Never used by a product entry.
// Deliberate boundary inputs are logged below; no natural-progression claim.
const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const init = require("./umbra-integration-initialization-browser.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT required");

function installCoexistenceProbe() {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), env = s.runEnvironmentIO;
  if (!env?.ownsScene(s) || env.getFixture(s).mode !== "boundary" || !s.hasUmbraRunCapability("growth", { purpose: "select" })) {
    throw Error("Live explicit boundary fixture required");
  }
  const log = [], calls = {}, originals = new Map();
  let target = null;
  const scalar = value => Object.fromEntries(Object.entries(value || {}).filter(([,v]) => v == null || ["number","string","boolean"].includes(typeof v)));
  const snapshot = () => ({ realMs: performance.now(), sceneMs: s.time.now, depth: s.stageDepth,
    hp: s.stats.hp, maxHp: s.stats.maxHp, stats: scalar(s.stats), robot: scalar(s.robotState),
    overflow: scalar(s.overflowRewardState), unsecuredGeek: s.runUnsecuredCoins, confirmedGeek: s.coins,
    clocks: [s.umbraMoonlightRuntime?.combatTimeMs, s.umbraBloodSpikeRuntime?.combatTimeMs, s.umbraPhantomNovaRuntime?.combatTimeMs],
    worldPaused: s.physics.world.isPaused, contextState: s.umbraRunContext.state,
    gate: { status:s.gateState?.status, instability:s.gateInstabilityStacks, choice:s.gateChoiceActive },
    contract: { active: s.getActiveAnomalyContract()?.id || null, storedActive:s.anomalyContractState?.active?.id || null, activeDepth: s.anomalyContractState?.activeDepth,
      pending: s.anomalyContractState?.pending?.id || null, pendingDepth: s.anomalyContractState?.pendingDepth },
    target: target ? { hp: target.hp, maxHp: target.maxHp, active: target.active, isDying: target.isDying,
      x: target.x, y: target.y, vx: target.body?.velocity.x, vy: target.body?.velocity.y,
      supportDamageHoldUntil: target.supportDamageHoldUntil, timeStopUntil: target.timeStopUntil } : null,
    lostArms: { pending: { ...s.lostArmsState?.pendingLevels }, runtime: { ...s.lostArmsState?.runtimeLevels },
      permanent: { ...s.lostArmsState?.permanentLevels }, picked: s.lostArmsState?.pickedThisRun },
    moonCounts: { ...s.umbraMoonlightRuntime?.counts }, calls: { ...calls }, objects: s.children.list.length,
    timers: s.time.getAllEvents?.().length ?? null, eventNames: s.events.eventNames().map(String) });
  for (const name of ["applyDamageToPlayer", "applyRobotBarrierToIncomingDamage", "updateRobotHealing", "rechargeRobotBarrierFromFieldPulse",
    "spawnRobotHealPulse", "addRobotSyncGauge", "activateRobotSyncDrive", "pullEnemiesTowardSupport", "updateEnemySupportStatusLock",
    "updateTimingCoinTimeStopField", "applyDamageToEnemy", "applyUmbraMoonlightHit", "pickupLostArmCore", "beginAbyssRailCharge", "fireAbyssRail",
    "spawnGravitySeedField", "applyGravitySeedFieldForces", "tickGravitySeedField", "updateOverdrive", "clearActiveOverdriveMod",
    "addOverdriveFromXp", "triggerOverdriveFromGauge", "activateOverdrive", "handleRobotItemPickup", "convertRobotOverflowReward",
    "addStabilizeGauge", "consumeStabilizeChargesForGate", "cleanupDropsOnDepthTransition", "selectAnomalyContract", "activatePendingAnomalyContract", "clearActiveAnomalyContract"]) {
    const original = s[name]; originals.set(name, original);
    s[name] = function(...args) {
      calls[name] = (calls[name] || 0) + 1;
      const before = ["cleanupDropsOnDepthTransition","activatePendingAnomalyContract","clearActiveAnomalyContract"].includes(name) ? snapshot() : null;
      const result = original.apply(this, args);
      if (before) log.push({ type: "original-boundary-method", method: name, before, after: snapshot() });
      return result;
    };
  }
  const run = (type, input, operation) => {
    if (!env.ownsScene(s) || s.umbraRunContext.ending) throw Error("Expired coexistence operation");
    const before = snapshot(); env.record("coexistence-boundary-operation", { type, input });
    const result = operation(); const row = { type, input, before, result, after: snapshot() }; log.push(row); return row;
  };
  const actions = {
    damageAndRecovery: () => run("actual-player-damage-and-recovery-pulse", { inputDamage: 20, pulse: "one explicit native interval delta; not rAF timing" }, () => {
      const damageAccepted = s.applyDamageToPlayer(20, { source: "phase7b-boundary-diagnostic" });
      const damagedHp = s.stats.hp;
      s.updateRobotHealing(s.getRobotHealInterval());
      return { damageAccepted, damagedHp, healedHp: s.stats.hp };
    }),
    grantBarrier: () => run("synthetic-RAM-Robot-qualification", { barrierUnlocked: true, noPlayerStatsRebuild: true }, () => {
      // A separate, recorded boundary prerequisite. Not a purchase or natural drop.
      s.shopState = s.normalizeShopState({ ...s.shopState, robotCustom: { ...s.shopState.robotCustom, barrierUnlocked: true } });
      s.rechargeRobotBarrierFromFieldPulse(0);
      return { unlocked: s.isRobotBarrierUnlocked(), maxHp: s.getRobotBarrierMaxHp() };
    }),
    barrierDamage: () => run("actual-player-damage-Barrier-absorption", { inputDamage: 2 }, () => {
      const accepted = s.applyDamageToPlayer(2, { source: "phase7b-boundary-barrier" });
      return { accepted };
    }),
    supportProtection: () => run("actual-Support-pull-and-dedicated-receiver", { spawn: "existing actual normal spawn inside definition screen bounds; unchanged HP", support: "actual pullBurst definition; effect-stage input only" }, () => {
      const definition = s.getAvailableSupportAttackDefinitions().find(d => d.type === "pullBurst");
      if (!definition) throw Error("Actual pullBurst definition unavailable");
      const view=s.cameras.main.worldView, padding=definition.suctionScreenPadding || 0;
      target=s.enemies.getChildren().find(enemy=>enemy.active && !enemy.isDying && enemy.body
        && enemy.x>=view.left-padding && enemy.x<=view.right+padding && enemy.y>=view.top-padding && enemy.y<=view.bottom+padding);
      if (!target) throw Error("No actual live spawn is in the existing Support screen target area");
      const support = { definition, centerX: target.x + 40, centerY: target.y, tickTimerMs: 0 };
      s.pullEnemiesTowardSupport(support, definition, 16.6667);
      const hpBefore = target.hp;
      const record = s.umbraMoonlightRuntime.targets.get(target), body = target.body;
      const hit = { targetAtHit: { x: target.x, y: target.y }, playerAtHit: { x: s.playerHitbox.x, y: s.playerHitbox.y } };
      // Receiver boundary input bypasses traversal geometry. The actual receiver,
      // raw calculation, suppression and bookkeeping run unchanged.
      s.applyUmbraMoonlightHit({ enemy: target, record, body }, hit,
        { physicalStep: s.umbraBoostTrace.physicalStep, timeMs: s.time.now }, s.umbraMoonlightRuntime.combatTimeMs,
        s.getUmbraMoonlightEffectiveStats().rawDamage);
      return { supportId: definition.id, hpBefore, hpAfter: target.hp, protectedUntil: target.supportDamageHoldUntil };
    }),
    supportRelease: () => run("dedicated-receiver-after-Support-expiry", { receiverOnly: true, noSecondTraversalClaim: true }, () => {
      if (!target?.active || target.isDying || s.time.now < target.supportDamageHoldUntil) throw Error("Support target not ready for expiry check");
      const hpBefore = target.hp, record = s.umbraMoonlightRuntime.targets.get(target);
      s.applyUmbraMoonlightHit({ enemy: target, record, body: target.body },
        { targetAtHit: { x: target.x, y: target.y }, playerAtHit: { x: s.playerHitbox.x, y: s.playerHitbox.y } },
        { physicalStep: s.umbraBoostTrace.physicalStep, timeMs: s.time.now }, s.umbraMoonlightRuntime.combatTimeMs,
        s.getUmbraMoonlightEffectiveStats().rawDamage);
      return { hpBefore, hpAfter: target.hp };
    }),
    enemyTimeStop: () => run("actual-enemy-only-TimeStop", { definition: "timingCoin", effectStageInput: true }, () => {
      if (!target?.active || target.isDying) target = s.spawnEnemy("chaser", { isElite: true });
      const definition = s.getAvailableSupportAttackDefinitions().find(d => d.type === "timingCoin");
      if (!definition) throw Error("Actual timingCoin definition unavailable");
      const support = { definition, centerX: target.x, centerY: target.y, x: target.x, y: target.y, tickTimerMs: 0 };
      s.updateTimingCoinTimeStopField(support, definition.tickMs || 80);
      return { locked: s.updateEnemySupportStatusLock(target), worldPaused: s.physics.world.isPaused, definitionId: definition.id };
    }),
    worldPause: () => run("explicit-world-pause", {}, () => { s.physics.world.pause(); return true; }),
    worldResume: () => run("explicit-world-resume", {}, () => { s.physics.world.resume(); return true; }),
    gravitySeedEffect: () => run("actual-GravitySeed-Lv3-effect-boundary", {
      level: 3, config: "unchanged canonical Lv3; Lv1/2 have no pull", acquisition: "not granted or claimed",
      source: "explicit effect-stage field request, native force delta16.6667 and tick entry"
    }, () => {
      target = s.spawnEnemy("chaser", { isElite: true });
      const record = s.umbraMoonlightRuntime.targets.get(target), body = target.body;
      if (!record || !body) throw Error("Actual spawn did not bind Moon life");
      const config = s.getGravitySeedResonanceConfig(GRAVITY_SEED_LEVELS[3]);
      const before = { x:target.x, y:target.y, hp:target.hp, lifeId:record.lifeId, lastHitAt:record.lastHitAt };
      s.spawnGravitySeedField(target.x + 40, target.y, 3, config);
      const field = s.gravitySeedState.fields.at(-1);
      if (!field?.active || field.config !== config) throw Error("Actual Gravity field was not created");
      s.applyGravitySeedFieldForces(field, 16.6667);
      const afterPull = { x:target.x, y:target.y, hp:target.hp, slow:target.lostArmsSlowMult,
        sameRecord:s.umbraMoonlightRuntime.targets.get(target) === record, sameBody:target.body === body,
        lifeId:record.lifeId, lastHitAt:record.lastHitAt };
      s.tickGravitySeedField(field);
      const afterTick = { hp:target.hp, active:target.active, isDying:target.isDying,
        sameRecord:s.umbraMoonlightRuntime.targets.get(target) === record, sameBody:target.body === body, lifeId:record.lifeId };
      const moonBefore = s.umbraMoonlightRuntime.counts.accepted;
      if (target.active && !target.isDying) s.applyUmbraMoonlightHit({ enemy:target, record, body },
        { targetAtHit:{x:target.x,y:target.y}, playerAtHit:{x:s.playerHitbox.x,y:s.playerHitbox.y} },
        { physicalStep:s.umbraBoostTrace.physicalStep, timeMs:s.time.now },s.umbraMoonlightRuntime.combatTimeMs,
        s.getUmbraMoonlightEffectiveStats().rawDamage);
      return { config:{...config}, before, afterPull, afterTick, moonBefore, moonAfter:s.umbraMoonlightRuntime.counts.accepted,
        receiverOnly:true, noTraversalClaim:true };
    }),
    lostArmsAndOverflow: () => run("actual-lostArms-and-overflow-entries", {
      lostArm: "explicit abyssRail core", overflowXp: 2000, robotRewards: "explicit heal upgrades to existing cap, then one real pickup"
    }, () => {
      const picked = s.pickupLostArmCore("abyssRail");
      // One explicit elapsed callback reaches the real targeting/charge path;
      // target absence is reported and is not a fake successful shot.
      s.updateLostArmsCombat(10000);
      const overdrive = s.addOverdriveFromXp(2000);
      let upgrades = 0;
      while (s.robotState.healLevel < s.getRobotLevelCap("field") && upgrades < 32) { s.upgradeRobotHealLevel(); upgrades++; }
      const definition = ROBOT_DROP_DEFINITIONS.healChest;
      if (s.canApplyRobotReward(definition)) throw Error("Robot reward did not reach its actual cap");
      const before = new Set(s.robotItems.getChildren());
      s.spawnRobotItem(s.playerHitbox.x, s.playerHitbox.y, definition);
      const item = s.robotItems.getChildren().find(item => !before.has(item));
      if (!item) throw Error("Actual robot pickup was not created");
      s.handleRobotItemPickup(s.playerHitbox, item);
      return { picked, overdrive, robotUpgrades: upgrades, robotItemDestroyed: item.active === false,
        lostArmCharged: (calls.beginAbyssRailCharge || 0) > 0, lostArmFired: (calls.fireAbyssRail || 0) > 0 };
    }),
    overdriveEnd: () => {
      const remainingMs = s.overflowRewardState.overdriveRemainingMs;
      return run("actual-OVERDRIVE-expiry-boundary", { deltaMs:remainingMs, notNaturalElapsedTiming:true }, () => {
        if (!(remainingMs > 0)) throw Error("No active OVERDRIVE to expire");
        s.updateOverdrive(remainingMs);
        return { active:s.isOverdriveActive(), multiplier:s.getOverdriveDamageMultiplier(), remainingMs:s.overflowRewardState.overdriveRemainingMs };
      });
    },
    stageGate: () => run("explicit-boundary-Gate-spawn-and-enter", { noClockRewrite: true, notNaturalGate: true }, () => {
      s.spawnStageGate();
      if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("phase7b-boundary-diagnostic");
      s.handleGateEnter(); return { gateChoice: s.gateChoiceActive, stableDurationMs: s.gateState.stableDurationMs };
    }),
    forceGate: () => run("explicit-Depth6-unstable-Gate", { noClockRewrite:true, notNaturalGate:true, instability:"actual collapseGate" }, () => {
      if (s.stageDepth !== 6 || s.levelUpActive || s.physics.world.isPaused) throw Error("Depth6 must finish its actual queued cards first");
      s.spawnStageGate();
      if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("phase7b-force-boundary");
      s.collapseGate(); s.handleGateEnter();
      return { gateChoice:s.gateChoiceActive, status:s.gateState.status, instability:s.gateInstabilityStacks };
    })
  };
  window.__UMBRA_COEXISTENCE_PROBE__ = { actions, snapshot, log,
    read: () => ({ state: snapshot(), log: [...log] }),
    restore: () => { for (const [name, original] of originals) s[name] = original; } };
  return snapshot();
}

async function startBoundary(browser, name, fixture) {
  const r = await h.open(browser, name, { path: `/umbra-integration.html?fixture=${fixture}` });
  await init.waitHub(r.page); await r.page.evaluate(installSceneObserver);
  await init.clickPhaserText(r.page, "SORTIE PREP");
  const selections = [];
  for (let n = 0; n < 3; n++) {
    const state = await init.enabledCards(r.page), index = state.cards.findIndex(c => c.type === "passive");
    if (index < 0) throw Error("No legal passive Opening choice");
    selections.push(await init.chooseCard(r.page, index));
  }
  await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext?.state === "ACTIVE", null, { timeout: 20000 });
  await r.page.evaluate(installCoexistenceProbe);
  return { ...r, selections };
}

async function settleDepthCards(page, selections) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return { cards:s.levelUpActive && !!s.levelUpCardRecords?.length,
        ready:s.umbraRunContext?.state === "ACTIVE" && !s.physics.world.isPaused && !s.levelUpActive
          && !s.depthDirectiveState?.pendingSelection && !s.depthDirectiveSelectionActive };
    });
    if (state.ready) return;
    if (state.cards) { await init.enabledCards(page); selections.push(await init.chooseCard(page,0)); }
    else await page.waitForTimeout(50);
  }
  throw Error("Depth6 actual queued selection did not settle before FORCE boundary");
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const report = { createdAt: new Date().toISOString(), sources: h.sources, sourceRoot: h.sourceRoot,
    harnessHash: h.sha(fs.readFileSync(__filename)), bootstrapHarnessHash: h.harnessSha256,
    initializationHarnessHash: h.sha(fs.readFileSync(path.join(__dirname, "umbra-integration-initialization-browser.cjs"))),
    methodology: "Functional normal-rAF with explicit effect-stage and reward boundary inputs; not performance or natural progression. Actual bodies, attack receivers, numeric settings, normal robot objects, real IO adapter and native timers. No player stats, enemy HP, attack method, physical step or vendor replacement. TimeStop and Support components execute actual definitions/functions, but full Support cutin/BGM/timing minigame is outside this harness. All manual timer deltas are recorded. No real save/network.",
    cases: [], errors: [], unconfirmed: ["Full Support cutin/minigame lifecycle and all Support characters", "All Robot levels/last-stand/napalm", "All LOST ARMS evolutions and natural rare-drop acquisition", "Depth1 natural Gate proof", "Emergency branch is in separate boundary harness", "Performance and physical devices"] };
  let browser;
  try {
    fs.mkdirSync(path.join(out, "harness"), { recursive: true });
    for (const name of ["umbra-integration-coexistence-browser.cjs", "umbra-integration-browser-harness.cjs", "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs"]) {
      fs.copyFileSync(path.join(__dirname, name), path.join(out, "harness", name), fs.constants.COPYFILE_EXCL);
    }
    browser = await h.launch(); report.browserVersion = browser.version();
    for (const fixture of (process.env.UMBRA_TEST_COEXISTENCE_FIXTURES || "complete,depth5").split(",")) {
      const c = { fixture, checks: [], operations: [] }; report.cases.push(c); let r;
      const check = (passed, label, actual = null) => { c.checks.push({ passed: !!passed, label, actual }); if (!passed) throw Error(label); };
      try {
        r = await startBoundary(browser, `coexistence-${fixture}`, fixture); c.selections = r.selections;
        const op = async name => { const row = await r.page.evaluate(name => window.__UMBRA_COEXISTENCE_PROBE__.actions[name](), name); c.operations.push(row); return row; };
        if (fixture === "complete") {
          await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.time.now >= s.invincibleUntil; });
          const healing = await op("damageAndRecovery");
          check(healing.result.damageAccepted && healing.result.damagedHp < healing.before.hp && healing.result.healedHp > healing.result.damagedHp, "real AP damage and Recovery pulse change actual HP", healing);
          const grant = await op("grantBarrier"); check(grant.result.unlocked && grant.after.robot.barrierHp > 0, "RAM qualification enables actual Barrier recharge", grant);
          await r.page.waitForFunction(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return s.time.now >= s.invincibleUntil; });
          const barrier = await op("barrierDamage"); check(barrier.result.accepted && barrier.after.hp === barrier.before.hp && barrier.after.robot.barrierHp < barrier.before.robot.barrierHp, "real incoming damage is absorbed before AP", barrier);
          await r.page.waitForFunction(() => {
            const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), d=s.getAvailableSupportAttackDefinitions().find(d=>d.type === "pullBurst"),v=s.cameras.main.worldView,p=d.suctionScreenPadding || 0;
            return s.enemies.getChildren().some(e=>e.active && !e.isDying && e.body && e.x>=v.left-p && e.x<=v.right+p && e.y>=v.top-p && e.y<=v.bottom+p);
          },null,{timeout:30000});
          const protection = await op("supportProtection"); check(protection.result.hpBefore === protection.result.hpAfter && protection.result.protectedUntil > protection.before.sceneMs, "Support pull protection rejects dedicated receiver", protection);
          await r.page.waitForFunction(() => { const p = window.__UMBRA_COEXISTENCE_PROBE__.snapshot(); return p.sceneMs >= p.target.supportDamageHoldUntil; });
          const release = await op("supportRelease"); check(release.result.hpAfter < release.result.hpBefore, "same live target accepts actual damage after protection expiry", release);
          const stop = await op("enemyTimeStop"); check(stop.result.locked && !stop.result.worldPaused && stop.after.target.vx === 0 && stop.after.target.vy === 0, "enemy TimeStop locks velocity without world pause", stop);
          await r.page.waitForTimeout(120);
          const afterStop = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.snapshot());
          check(afterStop.clocks[0] > stop.after.clocks[0], "dedicated combat clock continues during enemy-only TimeStop", afterStop);
          const paused = await op("worldPause"); await r.page.waitForTimeout(220);
          const afterPause = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.snapshot());
          check(JSON.stringify(afterPause.clocks) === JSON.stringify(paused.after.clocks), "world pause freezes dedicated clocks", afterPause);
          await op("worldResume");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").umbraRunContext.state === "ACTIVE");
          const gravity = await op("gravitySeedEffect");
          check(gravity.result.afterPull.x > gravity.result.before.x && gravity.result.afterPull.hp === gravity.result.before.hp
            && gravity.result.afterPull.sameRecord && gravity.result.afterPull.sameBody
            && gravity.result.afterPull.lifeId === gravity.result.before.lifeId && gravity.result.afterPull.lastHitAt === gravity.result.before.lastHitAt,
            "actual Gravity pull moves the body without new dedicated life or free rehit reset",gravity);
          check(gravity.result.afterTick.hp < gravity.result.before.hp && gravity.result.afterTick.sameRecord
            && gravity.result.afterTick.sameBody && gravity.result.moonAfter === gravity.result.moonBefore + 1,
            "actual Gravity damage and dedicated receiver share the same living target",gravity);
          const overflow = await op("lostArmsAndOverflow");
          check(overflow.result.picked && overflow.after.lostArms.pending.abyssRail === 1, "real LOST ARMS pickup remains pending within run", overflow);
          check(overflow.result.overdrive.triggered && overflow.after.overflow.overdriveRemainingMs > 0 && overflow.after.calls.activateOverdrive > 0, "real overflow crosses threshold and activates OVERDRIVE", overflow);
          check(overflow.after.calls.handleRobotItemPickup > 0 && overflow.after.calls.convertRobotOverflowReward > 0 && (overflow.after.overflow.stabilizeGauge > overflow.before.overflow.stabilizeGauge || overflow.after.overflow.stabilizeCharges > overflow.before.overflow.stabilizeCharges), "actual capped Robot pickup produces STABILIZE", overflow);
          check(overflow.after.confirmedGeek === overflow.before.confirmedGeek, "overflow leaves confirmed GEEK unchanged", overflow);
          c.lostArmsAttackCoverage = { chargeReached: overflow.result.lostArmCharged, shotNotYetRequired: true };
          const expired = await op("overdriveEnd");
          check(!expired.result.active && expired.result.multiplier === 1 && expired.result.remainingMs === 0
            && expired.after.calls.clearActiveOverdriveMod > (expired.before.calls.clearActiveOverdriveMod || 0),
            "actual OVERDRIVE expiry clears active modifier and restores neutral damage",expired);
        } else if (fixture === "depth5") {
          const before = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.snapshot()); check(before.depth === 5, "declared Depth5 fixture uses actual run start", before);
          await op("stageGate"); await r.page.keyboard.press("1");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").anomalyContractState.selectionOpen);
          c.contractBefore = await r.page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return { state: window.__UMBRA_COEXISTENCE_PROBE__.snapshot(), cards: s.anomalyContractCardRecords.map(r => ({ id:r.contract.id, targetDepth:r.targetDepth })) }; });
          check(c.contractBefore.state.depth === 5 && c.contractBefore.cards.length === 3 && c.contractBefore.cards.every(x => x.targetDepth === 6), "actual Gate opens three targetDepth6 contracts before transition", c.contractBefore);
          await r.page.keyboard.press("1");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").stageDepth === 6, null, { timeout: 20000 });
          const after = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.read());
          check(after.state.contract.activeDepth === 6 && after.state.contract.active === c.contractBefore.cards[0].id && !after.state.contract.pending, "selected contract activates only on Depth6", after.state);
          const compression = after.log.find(x => x.method === "cleanupDropsOnDepthTransition");
          check(compression?.before.depth === 5 && !compression.before.contract.active && !compression.before.contract.pending, "old Depth compression ran before next contract selection", compression);
          c.contractAfter = after;
          await settleDepthCards(r.page,c.selections);
          const force = await op("forceGate");
          check(force.result.gateChoice && force.result.status === "unstable" && force.result.instability === 1,
            "actual Depth6 collapse produces unstable Gate before FORCE input",force);
          c.forceInput = await init.clickPhaserText(r.page,"FORCE BREAKTHROUGH");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").anomalyContractState.selectionOpen);
          c.forceContractBefore = await r.page.evaluate(() => {
            const s=window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
            return {state:window.__UMBRA_COEXISTENCE_PROBE__.snapshot(),cards:s.anomalyContractCardRecords.map(r=>({id:r.contract.id,targetDepth:r.targetDepth}))};
          });
          check(c.forceContractBefore.state.depth === 6 && c.forceContractBefore.cards.length === 3
            && c.forceContractBefore.cards.every(card=>card.targetDepth === 7),"real FORCE opens targetDepth7 contract choices before transition",c.forceContractBefore);
          await r.page.keyboard.press("1");
          await r.page.waitForFunction(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").stageDepth === 7,null,{timeout:20000});
          c.forceContractAfter = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.read());
          const forceAfter=c.forceContractAfter.state;
          check(forceAfter.gate.instability === 1 && forceAfter.contract.activeDepth === 7
            && forceAfter.contract.active === c.forceContractBefore.cards[0].id && !forceAfter.contract.pending,
            "FORCE keeps instability and applies the chosen contract only on Depth7",forceAfter);
          const forceCompression=c.forceContractAfter.log.find(row=>row.method === "cleanupDropsOnDepthTransition" && row.before.depth === 6);
          check(forceCompression?.before.contract.active === c.contractBefore.cards[0].id && !forceCompression.before.contract.pending,
            "Depth6 compression uses its old active contract before the new selection",forceCompression);
          const expiredContract=c.forceContractAfter.log.find(row=>row.method === "clearActiveAnomalyContract"
            && row.before.depth === 6 && row.before.contract.storedActive === c.contractBefore.cards[0].id);
          check(!!expiredContract && !expiredContract.after.contract.storedActive && expiredContract.after.contract.pendingDepth === 7,
            "old contract is cleared while the lawful Depth7 pending contract is preserved",expiredContract);
        } else throw Error(`Unsupported bounded fixture: ${fixture}`);
        c.probe = await r.page.evaluate(() => window.__UMBRA_COEXISTENCE_PROBE__.read());
        c.observer = await r.page.evaluate(() => window.__NORMAL_SCENE_OBSERVER__.export());
      } catch (error) { c.error = error.stack; }
      finally {
        if (r) {
          await r.page.evaluate(() => {
            window.__UMBRA_COEXISTENCE_PROBE__?.restore?.(); window.__NORMAL_SCENE_OBSERVER__?.cleanup?.();
            window.__UMBRA_INTEGRATION_ENVIRONMENT__.end("COEXISTENCE_CASE_END");
          }).catch(error => c.endError = String(error));
          await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed,null,{timeout:15000}).catch(error => c.endError=String(error));
          await h.close(r); c.audit = r.record;
          c.checks.push({ passed: r.record.isolationPassed, label: "real Storage and external IO remain zero" });
          c.checks.push({ passed:r.record.pageErrors.length === 0, label:"no uncaught product error" });
        }
        c.passed = !c.error && !c.endError && c.checks.length > 0 && c.checks.every(x => x.passed);
        fs.writeFileSync(path.join(out, `coexistence-${fixture}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
      }
      if (!c.passed) { report.errors.push(`Failfast: ${fixture}`); break; }
    }
  } catch (error) { report.errors.push(error.stack); }
  finally {
    await browser?.close(); report.passed = report.errors.length === 0 && report.cases.length > 0 && report.cases.every(c => c.passed);
    fs.writeFileSync(path.join(out, "integration-coexistence.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.map(c => ({ fixture:c.fixture, passed:c.passed, error:c.error })), errors: report.errors }));
    process.exitCode = report.passed ? 0 : 1;
  }
}

if (require.main === module) main();
module.exports = { installCoexistenceProbe, startBoundary };
