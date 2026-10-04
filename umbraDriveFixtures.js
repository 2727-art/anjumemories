(function () {
  "use strict";

  // Synthetic, session-only inputs. These are comparison cases, not depth rewards.
  const FIXTURES = Object.freeze([
    Object.freeze({
      id: "baseline", label: "基礎値のみ", shopLevel: 0, coolingLevel: 0,
      cdIds: Object.freeze(["anju"]), equipment: null, refinement: 0,
      passives: Object.freeze({ vitalBloom: 0, swiftStep: 0, staminaCore: 0, evasiveFirmware: 0 })
    }),
    Object.freeze({
      id: "medium", label: "中程度の永続強化", shopLevel: 10, coolingLevel: 10,
      cdIds: Object.freeze(["anju", "hanseikai", "miraiwoikiteru"]),
      equipment: Object.freeze({ rarity: "SR", rank: 3 }), refinement: 5,
      passives: Object.freeze({ vitalBloom: 3, swiftStep: 2, staminaCore: 2, evasiveFirmware: 1 })
    }),
    Object.freeze({
      id: "deep", label: "上限内の深層向け強化", shopLevel: 25, coolingLevel: 25,
      cdIds: "all", equipment: Object.freeze({ rarity: "LEGEND", rank: 5 }), refinement: 20,
      passives: Object.freeze({ vitalBloom: 10, swiftStep: 5, staminaCore: 5, evasiveFirmware: 3 })
    })
  ]);

  // Authored RAM inputs only; all bonuses and set qualification are calculated
  // by EquipmentSystem. Refinement unlock flags describe an existing start item.
  const EQUIPMENT_FIXTURES = Object.freeze([
    Object.freeze({ id: "none", label: "装備なし", rarity: null, rank: 1, refinement: 0 }),
    Object.freeze({ id: "sensor", label: "SENSORのみ SR★3 +5", rarity: "SR", rank: 3, refinement: 5, onlySlot: "head" }),
    Object.freeze({ id: "armament", label: "ARMAMENTのみ SR★3 +5", rarity: "SR", rank: 3, refinement: 5, onlySlot: "weapon" }),
    Object.freeze({ id: "medium", label: "5SR★3 +5", rarity: "SR", rank: 3, refinement: 5 }),
    Object.freeze({ id: "ssr", label: "5SSR★5 +15", rarity: "SSR", rank: 5, refinement: 15 }),
    Object.freeze({ id: "legend", label: "5LEGEND★5 +20", rarity: "LEGEND", rank: 5, refinement: 20 }),
    Object.freeze({ id: "incomplete", label: "4LEGEND★5 +20 / COREなし", rarity: "LEGEND", rank: 5, refinement: 20, missingSlot: "accessory" })
  ]);

  // Only calculation/candidate functions are borrowed. No lifecycle, purchase,
  // save-schema, storage, authentication, reward or combat entry is installed.
  const METHOD_NAMES = Object.freeze([
    "createBasePlayerStats", "rebuildStartingStats", "applyPermanentUpgradesToStats",
    "getPermanentUpgradeLevel", "applyOwnedCdBonusesToStats", "getOwnedCdDefinitions",
    "normalizePlayerMechStatProfile", "getRunPlayerMechStatProfile",
    "getPlayerMechMaxHpForBase", "getApReinforceBaseMaxHp", "getApReinforceHpGain", "getBoosterTuningSpeedGain",
    "applyApReinforceUpgrade", "applySelectedPlayerMechStatProfile",
    "getPlayerMechDefinition", "getDefaultPlayerMechDefinition", "isPlayerMechReleased",
    "getUmbraPhase2AVerifiedMechId", "getRunPlayerMechId", "getRunPlayerMechDefinition",
    "getSkillSelectionPlayerMechId", "getSelectedPlayerMechPassiveWeights",
    "normalizePlayerMechPassiveWeights", "getPlayerMechEvadeWindowMultiplier",
    "getPlayerMechAdjustedEvadeWindowDurationMs",
    "getEquipmentSystem", "normalizeEquipmentState", "createEmptyEquipmentBonuses",
    "cloneEquipmentBonuses", "getActiveRunEquipmentBonuses", "shouldSuppressRunEquipmentOffenseBonuses",
    "applyRunEquipmentStartingStatBonuses", "getRunEquipmentStaminaRegenMultiplier",
    "getRunEquipmentDamageTakenMultiplier", "getCdBonusSummary", "getOpeningShopAggregateBonusSummary",
    "getReactorCoolingStoredLevel", "getReactorCoolingLevel", "getReactorCoolingRegenMultiplier",
    "shouldApplyReactorCoolingBoostRegen", "getEquipmentBoostEnergyRegenMultiplier",
    "getTotalBoostEnergyRegenMultiplier", "getCleaningRobotLevel", "getRobotCustomState",
    "getSupportLinkLevel", "isSupportLinkInstalled", "getSupportLinkCombatBonus",
    "getPassiveLevel", "getPassiveMaxLevel", "incrementPassiveLevel", "isPassiveUpgradeAvailable",
    "buildPassiveUpgradeChoice", "getPassiveUpgradeChoices", "createEvasiveFirmwarePassiveChoice",
    "isOpeningBoostDraftActive", "getOpeningBoostChoiceLimit", "isEvasiveFirmwareCandidateAllowed",
    "resetLevelUpCandidatePresentationState", "buildLevelUpUpgradeChoices", "markLevelUpChoicesPresented",
    "weightedShuffleUpgradeChoices", "prioritizeEvasiveFirmwareChoice", "hasAvailableLevelUpUpgrade",
    "isXpProgressionCapped", "getEvasiveFirmwareMaxLevel", "getEvasiveFirmwareLevel",
    "applyAcEvasionPassiveDebugStartLevel", "getAcEvasionPassiveStartLevelOverride",
    "getAcEvadeWindowDurationBreakdown", "getAcEvadeWindowBaseDurationMs", "getAcEvadeWindowMaxDurationMs",
    "getAcEvasiveFirmwareDurationMsForLevel", "getAcEvasiveFirmwareDurationTable",
    "getDeepLevelXpRequirement", "isDeepLevelUnlocked", "isDeepLevelProgressionActive",
    "isPlayerLevelCapped", "syncPlayerLevelXpRequirement", "applyDeepLevelHpGain", "gainDeepLevelExperience"
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const MECH_IDS = Object.freeze(["defaultBear", "regaliaBastion", "umbraSeraph"]);

  window.createUmbraDriveFixtures = function (bridge) {
    const source = bridge.sourcePrototype;
    const equipmentSystem = window.EquipmentSystem;
    const equipmentEnabled = bridge.umbraGrowth === true && bridge.umbraCore === true && bridge.umbraFinal === true
      && bridge.umbraTriad === true && bridge.umbraEquipment === true;
    if (!source || !equipmentSystem?.getEquipmentBonusesFromState || !bridge.cdCatalog?.length) {
      throw new Error("Drive fixture calculation dependencies are unavailable");
    }

    function install(scene) {
      if (scene?.isUmbraPhase2ADrive !== true || scene.sys?.settings?.key !== "UmbraPhase2ADrive") {
        throw new Error("Calculation adapter is restricted to the isolated drive scene");
      }
      METHOD_NAMES.forEach((name) => {
        if (typeof source[name] !== "function") {
          throw new Error(`Missing drive calculation: ${name}`);
        }
        scene[name] = source[name];
      });
      scene.getUrlStageParam = () => null;
      scene.getDebugPlayerMechIdOverride = () => null;
      scene.getReactorCoolingDebugLevelOverride = () => null;
      scene.getEquipmentBonusPresetName = () => null;
      scene.isAcEvasionPassiveForceCandidateDebugEnabled = () => false;
      scene.getAnjuMemoryConsumableCount = () => 0;
      scene.isFinalBossRaidActive = () => false;
      if (bridge.umbraGrowth !== true) scene.getAvailableSkillChoices = () => []; // Legacy S1 entries never offer growth.
      scene.getSelectedPlayerMechDefinition = function () {
        return bridge.mechDefinitions[this.getUmbraPhase2AVerifiedMechId()] || bridge.mechDefinitions.defaultBear;
      };
      scene.getSelectedPlayerMechId = function () { return this.getSelectedPlayerMechDefinition().id; };
      scene.logEquipmentBonusDebug = () => {};
      scene.logEquipmentBonusSuppressionDebug = () => {};
      ["spawnPlayerHealNumber", "updateDashStaminaGauge", "setLastPickupNotice", "showOverflowRewardText"].forEach((name) => {
        if (!Object.hasOwn(scene, name)) scene[name] = () => {};
      });
      if (!equipmentEnabled) scene.queueDeepLevelEquipmentOverlimitBonus = () => ({ queued: 0, pendingCount: 0 });
      return scene;
    }

    function createEquipmentFixtureState(id) {
      const fixture = EQUIPMENT_FIXTURES.find(entry => entry.id === id);
      if (!fixture) return equipmentSystem.createDefaultEquipmentState();
      const state = equipmentSystem.createDefaultEquipmentState();
      for (const slot of equipmentSystem.SLOTS) {
        const equipped = fixture.rarity && (!fixture.onlySlot || fixture.onlySlot === slot) && fixture.missingSlot !== slot;
        state.bestBySlot[slot] = equipped ? { id: `drive-equipment-${id}-${slot}`, slot,
          rarity: fixture.rarity, rank: fixture.rank, sourceType: "debug", sourceDepth: 1 } : null;
        state.refinementBySlot[slot] = equipped ? fixture.refinement : 0;
        state.refinementLimitUnlockedBySlot[slot] = Boolean(equipped && fixture.refinement >= 16);
        state.legendResonanceBySlot[slot] = 0;
      }
      return equipmentSystem.normalizeEquipmentState(state);
    }

    function resetFixture(scene, fixtureId = "baseline", mechId = "umbraSeraph", airBrakeVariant = scene.airBrakeVariant ?? bridge.airBrakeVariant) {
      const fixture = FIXTURES.find((entry) => entry.id === fixtureId);
      if (!fixture || !MECH_IDS.includes(mechId)) throw new Error("Unknown drive fixture or mech");
      if (!scene.isUmbraPhase2ADrive || scene.sys?.settings?.key !== "UmbraPhase2ADrive") {
        throw new Error("Synthetic fixtures are restricted to the isolated drive scene");
      }
      scene.invalidateUmbraBoostTrace?.("FIXTURE_REBUILD");
      scene.airBrakeVariant = airBrakeVariant === "legacy" ? "legacy" : "tuned";
      const traceNotifications = (scene.verificationContext?.traceNotifications ?? bridge.traceNotifications) !== false;
      scene.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId, airBrakeVariant: scene.airBrakeVariant, traceNotifications,
        ...(bridge.umbraGrowth === true ? { growthEnabled: true } : {}),
        ...(bridge.umbraGrowth === true && bridge.umbraCore === true ? { coreEnabled: true } : {}),
        ...(bridge.umbraGrowth === true && bridge.umbraCore === true && bridge.umbraFinal === true ? { finalEnabled: true,
          ...(bridge.umbraTriad === true ? { triadEnabled: true,
            ...(equipmentEnabled ? { equipmentEnabled: true } : {}) } : {}) } : {}) });
      scene.runPlayerMechId = mechId;
      scene.runPlayerMechDefinition = bridge.mechDefinitions[mechId];
      scene.runPlayerMechStatProfile = scene.normalizePlayerMechStatProfile(scene.runPlayerMechDefinition.statProfile);
      scene.runPlayerMechSnapshotActive = true;
      const cdIds = fixture.cdIds === "all" ? bridge.cdCatalog.map((cd) => cd.id) : [...fixture.cdIds];
      scene.shopState = {
        upgrades: { weapon: fixture.shopLevel, armor: fixture.shopLevel, shoes: fixture.shopLevel },
        reactorCoolingLevel: fixture.coolingLevel, ownedCdIds: cdIds,
        robotCustom: {}, cleaningRobotLevel: 0
      };
      scene.equipmentState = equipmentSystem.createDefaultEquipmentState();
      equipmentSystem.SLOTS.forEach((slot) => {
        scene.equipmentState.bestBySlot[slot] = fixture.equipment ? {
          id: `drive-${fixtureId}-${slot}`, slot, ...fixture.equipment, sourceType: "debug", sourceDepth: 1
        } : null;
        scene.equipmentState.refinementBySlot[slot] = fixture.refinement;
        scene.equipmentState.refinementLimitUnlockedBySlot[slot] = fixture.refinement >= 16;
      });
      scene.equipmentState = equipmentSystem.normalizeEquipmentState(scene.equipmentState);
      if (equipmentEnabled) {
        if (!EQUIPMENT_FIXTURES.some(entry => entry.id === scene.equipmentFixtureId)) {
          scene.equipmentFixtureId = { baseline: "none", medium: "medium", deep: "legend" }[fixtureId];
        }
        scene.equipmentState = createEquipmentFixtureState(scene.equipmentFixtureId);
      }
      scene.runEquipmentLoadoutSnapshot = clone(scene.equipmentState);
      scene.runEquipmentBonuses = equipmentSystem.getEquipmentBonusesFromState(scene.runEquipmentLoadoutSnapshot);
      scene.supportLinkState = { installed: false, level: 0 };
      scene.anjuMemoryState = { ownedRewardIds: [] };
      scene.runAnjuMemoryState = {};
      scene.playerSkills = {};
      scene.passiveLevels = {};
      scene.acEvasionPassiveStartLevelApplied = true;
      scene.startingUpgradeSelectionsRemaining = 0;
      scene.levelUpOpeningBoostActive = false;
      scene.levelUpActive = false;
      if (bridge.umbraGrowth === true && bridge.umbraCore === true) {
        // A dead/closed previous run cannot pass its resolver during cleanup.
        // Explicit fresh fixtures still discard its isolated selection owner.
        scene.skillMutationSelectionActive = false;
        scene.skillMutationState = null;
      }
      scene.pendingLevelUps = 0;
      scene.survivalTime = 1;
      scene.stageDepth = equipmentEnabled && scene.equipmentStartDepth === 6 ? 6 : 1;
      scene.finalBossRaidState = null;
      scene.rebuildStartingStats({ applyPlayerMech: true });
      const startingStats = clone(scene.stats);
      const hubSummary = scene.getOpeningShopAggregateBonusSummary();
      // Growth budgets start from zero run passives. Keep the original three
      // fixtures immutable: their permanent/CD/equipment inputs are still shared.
      const runPassives = bridge.umbraGrowth === true ? {} : fixture.passives;
      for (const [passiveId, level] of Object.entries(runPassives)) {
        for (let index = 0; index < level; index += 1) {
          const choice = scene.getPassiveUpgradeChoices({ openingBoost: false }).find((entry) => entry.id === passiveId);
          if (!choice) throw new Error(`Fixture exceeds effective passive cap: ${fixtureId}/${passiveId}`);
          choice.onSelect();
        }
      }
      scene.resetLevelUpCandidatePresentationState();
      scene.resetUmbraDriveMotion?.("fixture-reset");
      scene.umbraDriveFixtureSummary = {
        fixtureId, mechId, label: fixture.label,
        ...(bridge.umbraGrowth === true ? { growthBudget: true, runPassiveStart: 0, legacyFixturePassives: clone(fixture.passives) } : {}),
        ...(equipmentEnabled ? { equipmentFixtureId: scene.equipmentFixtureId, equipmentStartDepth: scene.stageDepth,
          equipmentFixtureLabel: EQUIPMENT_FIXTURES.find(entry => entry.id === scene.equipmentFixtureId).label } : {}),
        composition: {
          shop: clone(scene.shopState.upgrades), coolingLevel: fixture.coolingLevel,
          cdIds, equipment: clone(scene.equipmentState.bestBySlot),
          refinementBySlot: clone(scene.equipmentState.refinementBySlot),
          ...(equipmentEnabled ? { refinementLimitUnlockedBySlot: clone(scene.equipmentState.refinementLimitUnlockedBySlot),
            legendResonanceBySlot: clone(scene.equipmentState.legendResonanceBySlot), legendDiscovered: scene.equipmentState.legendDiscovered } : {}),
          passives: clone(scene.passiveLevels), overchargeBolt: 0, rapidSigil: 0,
          robot: "none", support: "none", deepCd: "none", overdrive: "none",
          triad: bridge.umbraGrowth === true && bridge.umbraCore === true && bridge.umbraFinal === true && bridge.umbraTriad === true ? "RAM selections after start" : "none"
        },
        startingStats, hubMaxHp: scene.createBasePlayerStats().maxHp + hubSummary.effective.hpAdd,
        hubSummary, stats: clone(scene.stats), apReinforceGain: scene.getApReinforceHpGain()
      };
      return scene.umbraDriveFixtureSummary;
    }

    function measureDeepLevels(fixtureId = "baseline", mechId = "umbraSeraph") {
      const scene = install({ isUmbraPhase2ADrive: true, sys: { settings: { key: "UmbraPhase2ADrive" } } });
      // Numeric measurement has no renderer or physics step. It reuses the same
      // AP/passive/Deep methods; active acV3 Evasive availability is the fixture policy.
      scene.getActiveAcMovementTuning = () => bridge.movementPresets?.acV3 || bridge.movementConfig || {};
      scene.shouldUseAcEvasionPassive = () => true;
      resetFixture(scene, fixtureId, mechId);
      scene.stageDepth = 6;
      scene.stats.level = 25;
      scene.stats.xp = 0;
      scene.syncPlayerLevelXpRequirement();
      const rows = [{ level: 25, maxHp: scene.stats.maxHp, baseMaxHp: scene.stats.maxHp, hpGain: 0 }];
      while (scene.stats.level < 99) {
        const result = scene.gainDeepLevelExperience(scene.stats.nextLevelXp);
        if (result.levels !== 1) throw new Error("Deep level fixture did not advance exactly one level");
        if ([26, 50, 99].includes(scene.stats.level)) {
          rows.push({ level: scene.stats.level, maxHp: scene.stats.maxHp, baseMaxHp: scene.deepLevelBaseMaxHp, hpGain: result.hpGain });
        }
      }
      return rows;
    }

    return Object.freeze({ fixtures: FIXTURES, methodNames: METHOD_NAMES, install, resetFixture, measureDeepLevels,
      ...(equipmentEnabled ? { equipmentFixtures: EQUIPMENT_FIXTURES, createEquipmentFixtureState } : {}) });
  };
})();
