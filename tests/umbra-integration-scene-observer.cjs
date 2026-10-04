"use strict";

// Test-only observation. Every wrapped method executes the original receiver
// with unchanged arguments and return value. No attack, spawn, reward, IO,
// movement, clock, candidate, or equipment implementation is substituted.
function installSceneObserver() {
  const scene = window.__SURVIVAL_GAME__?.scene?.getScene("survival-scene");
  if (!scene) throw new Error("Actual SurvivalScene must exist before observation");
  if (window.__NORMAL_SCENE_OBSERVER__) throw new Error("Observer already installed");
  const identities = new WeakMap(), originals = new Map();
  const fixtureId = scene.runEnvironmentIO?.snapshot?.().fixture?.id || null;
  let nextIdentity = 0, sceneUpdates = 0, physicsSteps = 0, serial = 0;
  const events = [], samples = [], errors = [], calls = {}, limit = 16000;
  const id = value => {
    if (!value || !["object", "function"].includes(typeof value)) return null;
    if (!identities.has(value)) identities.set(value, ++nextIdentity);
    return identities.get(value);
  };
  const scalar = value => Object.fromEntries(Object.entries(value || {}).filter(([,v]) => v == null || ["string", "number", "boolean"].includes(typeof v)));
  const skillIds = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"];
  const names = ["Moonlight", "BloodSpike", "PhantomNova"];
  function snapshot() {
    const context = scene.umbraRunContext, body = scene.playerHitbox?.body;
    return {
      realMs: performance.now(), sceneMs: scene.time?.now, sceneUpdates, physicsSteps,
      sceneId: id(scene), environmentId: scene.runEnvironmentIO?.id || null, fixture: fixtureId,
      normalContext: context ? {
        identity: id(context), id: context.id, runId: context.runId, generation: context.generation, state: context.state, ending: context.ending,
        mechId: context.mechId, fixtureId: context.inputs?.fixtureId, environmentId: context.environmentId,
        inputsIdentity: id(context.inputs), inputsFrozen: Object.isFrozen(context.inputs), equipmentIdentity: id(context.inputs?.equipment),
        playerIdentity: id(context.player), bodyIdentity: id(context.body), worldIdentity: id(context.world),
        requestIdentity: id(context.request), assetsPrepared: context.assetsPrepared, statsApplied: context.statsApplied,
        skillsBound: context.skillsBound, launchConsumed: context.launchConsumed,
        current: scene.isUmbraRunContextCurrent?.(context) || false,
        combatAllowed: scene.hasUmbraRunCapability?.("moonlight", { purpose: "combat" }) || false,
        selectAllowed: scene.hasUmbraRunCapability?.("growth", { purpose: "select" }) || false,
        blockReason: scene.getUmbraNormalCombatBlockReason?.() || ""
      } : null,
      currentPlayerIdentity: id(scene.playerHitbox), currentBodyIdentity: id(body), currentWorldIdentity: id(scene.physics?.world),
      body: body ? { x: body.center?.x, y: body.center?.y, vx: body.velocity.x, vy: body.velocity.y, radius: body.radius, width: body.width, height: body.height, enabled: body.enable } : null,
      stats: scalar(scene.stats), runMechId: scene.runPlayerMechId, runMechSnapshotActive: scene.runPlayerMechSnapshotActive,
      movementProfile: scalar(scene.runPlayerMechStatProfile), equipmentIdentity: id(scene.runEquipmentLoadoutSnapshot),
      growth: scene.umbraGrowthRun ? { identity: id(scene.umbraGrowthRun), contextIdentity: id(scene.umbraGrowthRun.context), playerIdentity: id(scene.umbraGrowthRun.player), bodyIdentity: id(scene.umbraGrowthRun.body), closed: scene.umbraGrowthRun.closed } : null,
      owners: names.map((n,i) => {
        const r = scene[`umbra${n}Runtime`];
        return r ? { skillId: skillIds[i], identity: id(r), generation: r.generation, closed: r.closed,
          playerIdentity: id(r.player), bodyIdentity: id(r.body), worldIdentity: id(r.world), contextIdentity: id(r.context),
          combatTimeMs: r.combatTimeMs, counts: scalar(r.counts), casts: r.casts?.length || 0, slots: r.slots?.length || 0,
          slotStates: r.slots?.map(s => ({ id: s.id, state: s.state, generation: s.cycleGeneration })) || [] } : null;
      }),
      skills: Object.fromEntries(Object.entries(scene.playerSkills || {}).map(([key,s]) => [key, { stageIndex: s.stageIndex, identity: id(s), growthIdentity: id(s.umbraGrowthRun) }])),
      trace: scene.umbraBoostTrace ? { identity: id(scene.umbraBoostTrace), generation: scene.umbraBoostTrace.generation, sequence: scene.umbraBoostTrace.sequence, enabled: scene.umbraBoostTrace.enabled, events: scene.umbraBoostTrace.events?.length || 0 } : null,
      overlimit: scene.umbraEquipmentState ? scalar(scene.umbraEquipmentState) : null,
      shopActive: scene.shopActive, gameOver: scene.gameOver, extractionComplete: scene.extractionComplete,
      gameplayRuntimeCreated: scene.gameplayRuntimeCreated, worldPaused: scene.physics?.world?.isPaused,
      level: scene.stats?.level, pending: scene.pendingLevelUps, opening: scene.startingUpgradeSelectionsRemaining,
      selectionActive: scene.levelUpActive, selectionMode: scene.levelUpSelectionMode, inputEnabled: scene.levelUpInputEnabled, selectionLocked: scene.levelUpSelectionLocked,
      overlayIdentity: id(scene.overlayContainer), cardsIdentity: id(scene.levelUpCardRecords),
      cards: (scene.levelUpCardRecords || []).map(r => ({ optionIdentity: id(r.model?.option), title: r.model?.title,
        type: r.model?.option?.type, id: r.model?.option?.id, skillId: r.model?.option?.skillId, stageIndex: r.model?.option?.stageIndex,
        choiceId: r.model?.option?.choiceId, phase: r.model?.option?.phase })),
      survivalTime: scene.survivalTime, stageDepth: scene.stageDepth, stageId: scene.currentStage?.id,
      enemies: (scene.enemies?.children?.entries || []).filter(e => e.active).length,
      objectCount: scene.children?.list?.length || 0
    };
  }
  function record(kind, detail = null) {
    try {
      if (events.length >= limit) return;
      events.push({ serial: ++serial, kind, detail, state: snapshot() });
    } catch (error) { errors.push({ kind, error: String(error.stack || error) }); }
  }
  const methods = ["prepareUmbraNormalRunContext", "bindUmbraNormalRunContext", "setUmbraNormalRunState",
    "captureRunPlayerMechSnapshot", "captureRunEquipmentBonuses", "captureRunEquipmentCombatLinkSnapshot", "rebuildStartingStats",
    "initializeUmbraGrowthRun", "createPlayerSkills", "initializeUmbraMoonlightRuntime", "initializeUmbraBloodSpikeRuntime", "initializeUmbraPhantomNovaRuntime",
    "beginStartingUpgradeDraft", "showLevelUpCardOverlay", "selectLevelUpCard", "completeLevelUpCardSelection",
    "applySkillStage", "applyUmbraCoreChoice", "applyUmbraFinalChoice", "spawnEnemy", "killEnemy", "gainExperience",
    "applyUmbraMoonlightHit", "applyUmbraBloodSpikeImpact", "applyUmbraPhantomNovaPulse", "applyDamageToEnemy"];
  for (const name of methods) {
    const original = scene[name]; if (typeof original !== "function") continue;
    originals.set(name, original);
    scene[name] = function(...args) {
      calls[name] = (calls[name] || 0) + 1;
      const detail = { argumentIds: args.map(id), primitives: args.map(v => v == null || ["string","number","boolean"].includes(typeof v) ? v : null) };
      record(`${name}:before`, detail);
      try {
        const result = original.apply(this, args);
        record(`${name}:after`, { ...detail, returnIdentity: id(result), returnValue: result == null || ["string","number","boolean"].includes(typeof result) ? result : null });
        return result;
      } catch (error) { record(`${name}:throw`, { error: String(error.stack || error) }); throw error; }
    };
  }
  const beforeUpdate = () => { sceneUpdates++; };
  const afterUpdate = () => {
    if (sceneUpdates % 10 === 0 && samples.length < 4000) {
      try { samples.push(snapshot()); } catch (e) { errors.push({ kind: "sample", error: String(e) }); }
    }
  };
  const worldstep = () => { physicsSteps++; };
  scene.events.on("preupdate", beforeUpdate); scene.events.on("postupdate", afterUpdate); scene.physics.world.on("worldstep", worldstep);
  window.__NORMAL_SCENE_OBSERVER__ = {
    snapshot, record,
    export() { return { events, samples, calls, errors, limit, snapshot: snapshot() }; },
    cleanup() { for (const [name, original] of originals) scene[name] = original;
      scene.events.off("preupdate", beforeUpdate); scene.events.off("postupdate", afterUpdate); scene.physics?.world?.off("worldstep", worldstep); }
  };
  record("observer-installed");
  return snapshot();
}

module.exports = { installSceneObserver };
