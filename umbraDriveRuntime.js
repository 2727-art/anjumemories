(function () {
  "use strict";

  // Function references only: the production movement/EN/Evade algorithms stay in
  // SurvivalScene. This allowlist excludes scene boot, saves, auth, combat and rewards.
  const methods = Object.freeze([
    "isUmbraBoostTraceEnabled", "getUmbraBoostTraceBlockReason", "getUmbraBoostTraceBodyPoint",
    "ensureUmbraBoostTrace", "subscribeUmbraBoostTrace", "emitUmbraBoostTrace", "getUmbraBoostTraceSnapshot",
    "beginUmbraBoostTrace", "endUmbraBoostTrace", "invalidateUmbraBoostTrace", "destroyUmbraBoostTrace",
    "prepareUmbraBoostTraceFrame", "submitUmbraBoostTraceCommand", "doesUmbraBoostTraceCrossWall", "isUmbraBoostTraceKnownContact", "observeUmbraBoostTraceStep",
    "getUmbraAirBrakeCalibration", "applyUmbraAirBrakeVelocity", "retainUmbraAirBrakePhysicalVelocity",
    "addAcHeat", "applyAcAirBrakeRegenBlock", "applyAcAirBrakeVelocity", "applyAcEvasionPassiveDebugStartLevel",
    "applyAcMovementWallDamping", "applyAcQuickBoostImpulse", "applyAcVelocitySteeringTowardInput",
    "canStartAcContinuousBoost", "canTriggerAcEvadeWindow", "clampAcMovementDelta", "clearAcEvadeWindow",
    "clearAcFullOverheat", "clearAcQuickBoostFailReason", "consumeAcVariableQuickBoostCostDelta",
    "createAcAirBrakeState", "createAcContinuousBoostState", "createAcEvadeWindowState", "createAcFullOverheatState",
    "createAcMovementLeanState", "createAcQuickBoostSeState", "createAcTargetFireState", "createAcVariableQuickBoostState",
    "createGamepadState", "dampAcVelocityAboveLimit", "endAcAirBrake", "endAcContinuousBoost", "endAcVariableQuickBoost",
    "ensureAcMovementState", "ensureAcMovementVisualState", "getAcAirBrakeBlockReason", "getAcAirBrakeComponents",
    "getAcAirBrakeEffectiveEnabled", "getAcBoostAvailabilityState", "getAcBoostLockoutRemainingMs", "getAcBoostRegenPerSecond",
    "getAcContinuousBoostDrainPerSecond", "getAcContinuousBoostMinStartStamina", "getAcContinuousBoostRampRatio",
    "getAcContinuousBoostRestartStaminaThreshold", "getAcContinuousBoostStartCost", "getAcContinuousBoostTerminalSpeed",
    "getAcContinuousBoostTimeToEmptyMs", "getAcDashDrainMultiplier", "getAcEvadeWindowBaseDurationMs",
    "getAcEvadeWindowDurationBreakdown", "getAcEvadeWindowDurationMs", "getAcEvadeWindowEffectiveEnabled",
    "getAcEvadeWindowMaxDurationMs", "getAcEvadeWindowRemainingMs", "getAcEvasionPassiveStartLevelOverride",
    "getAcEvasiveFirmwareCurrentDurationMs", "getAcEvasiveFirmwareDurationMsForLevel", "getAcEvasiveFirmwareDurationTable",
    "getAcFacingFallbackDirection", "getAcFullOverheatBlockReason", "getAcFullOverheatRechargeEpsilon",
    "getAcFullOverheatRegenMultiplier", "getAcFullOverheatStateName", "getAcInputDirection", "getAcLocomotionVisualMode",
    "getAcMovementActivationSource", "getAcMovementBaseSpeed", "getAcMovementModeSpeedLimit", "getAcMovementSpeedRatio",
    "getAcMovementVisualDirection", "getAcOverheatRecoveryProgress", "getAcQuickBoostCost", "getAcQuickBoostDirection",
    "getAcQuickBoostHardLockRemainingMs", "getAcQuickBoostInputState", "getAcSpriteModeForVisualMode", "getAcSteeringAngleInfo",
    "getAcThrusterVisualState", "getAcVariablePostBoostGlideDuration", "getAcVariableQuickBoostCostRatio",
    "getAcVariableQuickBoostCurveRatio", "getAcVariableQuickBoostGlideRatio", "getAcVariableQuickBoostHoldRatio",
    "getAcVariableQuickBoostInitialImpulseRatio", "getAcVariableQuickBoostMaxCost", "getAcVariableQuickBoostMinCost",
    "getAcVariableQuickBoostPowerRatio", "getAcVariableQuickBoostSmoothedRatio", "getAcVariableQuickBoostSpeedRatio",
    "getAcVariableQuickBoostSustainRatio", "getAcVariableQuickBoostTargetCost", "getAcVariableQuickBoostVisualRatio",
    "getActiveGamepad", "getBoostEnergyBaseRegenPerSecond", "getEquipmentBoostEnergyRegenMultiplier",
    "getEvasiveFirmwareLevel", "getEvasiveFirmwareMaxLevel", "getGamepadAxisValue", "getGamepadButtonPressed",
    "getGamepadMoveVector", "getMobileMoveVector", "getPlayerDashInputDown", "getPlayerMechAdjustedEvadeWindowDurationMs",
    "getPlayerMechBoostDrainMultiplier", "getPlayerMechBoostRegenMultiplier", "getPlayerMechBoostTerminalSpeedMultiplier",
    "getPlayerMechEvadeWindowMultiplier", "getPlayerMechPostBoostFrictionMultiplier", "getPlayerMechPostBoostGlideDurationMultiplier",
    "getPlayerMechPostBoostInputSpeedMultiplier", "getPlayerMechQuickBoostExitSpeedMultiplier", "getPlayerMechQuickBoostImpulseMultiplier",
    "getPlayerMechQuickBoostMaxSpeedMultiplier", "getPlayerMechQuickBoostSustainAccelerationMultiplier", "getPlayerMoveInputVector",
    "getPlayerRobotDirectionKeyForAngle", "getTotalBoostEnergyRegenMultiplier", "initializeAcMovementState",
    "initializeAcMovementVisualState", "isAcAirBrakeBoostBlocked", "isAcAirBrakeDefaultEnabled",
    "isAcAirBrakeExplicitlyDisabled", "isAcAirBrakeExplicitlyEnabled", "isAcContinuousBoostEnabled",
    "isAcEvadeWindowActive", "isAcEvadeWindowDebugEnabled", "isAcEvasionPassiveDebugEnabled", "isAcFullOverheatActive",
    "isAcFullOverheatEnabled", "isAcHeatEnabled", "isAcMovementPresetEnabled", "isAcMovementQueryFlagDisabled",
    "isAcMovementQueryFlagEnabled", "isAcMovementReleaseCandidateEnabled", "isAcReleaseCandidateFeatureEnabled",
    "isAcV3MovementPreset", "isAcVariableQuickBoostEnabled", "isDashKeyDown", "isGamepadButtonDown", "isGamepadDashDown",
    "isLegacyMovementForced", "isQueryFlagValueDisabled", "isQueryFlagValueEnabled", "limitAcMovementVelocity",
    "moveAcVelocityTowards", "normalizeAcAirBrakeState", "normalizeAcAngleDelta", "normalizeAcEvadeWindowState",
    "normalizeAcTargetFireState", "normalizeGamepadAxis", "recoverAcBoostEnergy", "resetAcEvadeWindowForNextBoost",
    "resetAcMovementState", "resetAcRobotLeanVisual", "setAcQuickBoostFailReason", "setAcSteeringDiagnostics",
    "shouldUseAcAirBrake", "shouldUseAcBoostSpriteVariant", "shouldUseAcEvadeWindow", "shouldUseAcEvasionPassive",
    "shouldUseAcMovementReleaseCandidate", "shouldUseAcV3DefaultBundle", "startAcAirBrake", "startAcContinuousBoost",
    "startAcFullOverheat", "startAcVariableQuickBoost", "triggerAcEvadeWindow", "tryStartAcQuickBoost",
    "updateAcAirBrake", "updateAcAirBrakeOpposingInput", "updateAcContinuousBoost", "updateAcEvadeWindow",
    "updateAcFullOverheatRecovery", "updateAcHeatState", "updateAcMovementDirectionFromVelocity", "updateAcPlayerMovement",
    "updateAcRobotLeanVisual", "updateAcRobotLocomotionVisualState", "updateAcTargetFacingDirection", "updateAcVariableQuickBoost",
    "updateGamepadState", "updatePlayerRobotMotion", "getPlayerMechDefinition", "getUmbraPhase2AVerifiedMechId",
    "getRunPlayerMechId", "getActivePlayerMechIdForRuntime", "getActiveAcMovementTuning",
    "getRegaliaBastionLandingImpactVisualState", "isPlayerRobotMechTextureKey", "getPlayerRobotTextureVisualScaleMultiplier",
    "getPlayerRobotTextureOwnerMechId", "getPlayerMechVisualScaleMultiplier", "isAcReactorCoolingShopDebugEnabled"
  ]);

  // Pure presentation and audio entry points. None of these adapters replace
  // EN consumption/recovery, boost start/end, wall damping, or Evade state logic.
  const omittedPresentation = Object.freeze([
    "logAcMovementDebugBranchEnabled", "logAcQuickBoostEvent", "cleanupAcMovementVisuals", "destroyAcMovementDebugHud",
    "triggerAcEvadeWindowVisual", "triggerAcEvadeNegateVisual", "updateAcEvadeWindowVisuals", "cleanupAcEvadeWindowFx",
    "triggerAcQuickBoostVisuals", "triggerAcQuickBoostSe", "triggerAcGroundSkidFx", "triggerAcOverheatVisual",
    "triggerAcBoostEmptyOverheatVisual", "triggerAcFullOverheatStartVisual", "triggerAcFullOverheatRecoveredVisual",
    "triggerAcAirBrakeFx", "updatePlayerRobotBoostVisuals", "updateAcMovementVisuals",
    "updateRegaliaBastionLandingFxTrigger", "updateRegaliaBastionMovementSe", "updateDashStaminaGauge",
    "constrainPlayerToMovementBounds"
  ]);

  window.installUmbraPhase2ADriveRuntime = function (scene, bridge) {
    if (scene?.isUmbraPhase2ADrive !== true || scene.sys?.settings?.key !== "UmbraPhase2ADrive") {
      throw new Error("Movement adapter is restricted to the Phase 2A verification Scene");
    }
    const source = bridge.sourcePrototype;
    for (const name of methods) {
      if (typeof source?.[name] !== "function") throw new Error(`Missing production movement function: ${name}`);
      if (typeof scene[name] !== "function") scene[name] = source[name];
    }
    if (bridge.attackArena === true || bridge.moonlightArena === true) {
      const combatMethods = [
        "getUmbraRunContext", "isUmbraRunContextCurrent", "hasUmbraRunCapability",
        "isUmbraMoonlightVerificationEnabled", "getUmbraMoonlightBlockReason", "initializeUmbraMoonlightRuntime",
        "destroyUmbraMoonlightRuntime", "registerUmbraMoonlightEnemyLife", "snapshotUmbraMoonlightEnemy",
        "snapshotUmbraMoonlightTargets", "recordUmbraMoonlightSkip", "invalidateUmbraMoonlightPasses",
        "receiveUmbraMoonlightTrace", "processUmbraMoonlightStep", "applyUmbraMoonlightHit", "getUmbraMoonlightSnapshot",
        "clearUmbraMoonlightGlide", "updateUmbraMoonlightGlideTrace", "getUmbraMoonlightGlideStepLimit", "getUmbraMobilityTrialSettings",
        "sweepUmbraMoonlightTarget", "isUmbraMoonlightLineBlocked", "isUmbraMoonlightBroadPhaseCandidate",
        "getUmbraMoonlightGeometryEpsilon", "getUmbraMoonlightShapeHalfExtents", "getUmbraMoonlightSegmentCircleInterval",
        "getUmbraMoonlightSegmentRectInterval", "getUmbraMoonlightRelativeShapeInterval", "getUmbraMoonlightNearestTargetPoint",
        "getUmbraMoonlightStage1Config", "getUmbraMoonlightRawDamage", "getUmbraMoonlightRehitIntervalMs", "getUmbraMoonlightReachMultiplier", "getUmbraMoonlightEffectiveStats",
        "getUmbraVerificationPassiveWeapons", "getUmbraBloodSpikeStage1Config", "getUmbraSkillStatsConfig", "getUmbraSkillCoreProfile"
      ];
      for (const name of combatMethods) {
        if (typeof source[name] !== "function") throw new Error(`Missing production MOONLIGHT function: ${name}`);
        scene[name] = source[name];
      }
    }
    if (bridge.bloodSpikeArena === true || bridge.phantomNovaArena === true) {
      const spikeMethods = [
        "isUmbraBloodSpikeVerificationEnabled", "observeUmbraBloodSpikeStep", "snapshotUmbraBloodSpikeEnemy",
        "getUmbraBloodSpikeTargets", "findUmbraBloodSpikePlacement", "createUmbraBloodSpikeCast", "applyUmbraBloodSpikeImpact",
        "initializeUmbraBloodSpikeRuntime", "destroyUmbraBloodSpikeRuntime", "registerUmbraBloodSpikeEnemyLife",
        "getUmbraBloodSpikeSnapshot", "getUmbraBloodSpikeCombatBlockReason", "getUmbraBloodSpikeBlockReason",
        "prepareUmbraBloodSpikeFrame", "recordUmbraBloodSpikeSkip", "getUmbraBloodSpikeCastSnapshot",
        "getUmbraBloodSpikeStage1Config", "getUmbraBloodSpikeRawDamage", "getUmbraBloodSpikeIntervalMs",
        "getUmbraBloodSpikeEffectiveStats", "getUmbraVerificationPassiveWeapons"
      ];
      for (const name of spikeMethods) {
        if (typeof source[name] !== "function") throw new Error(`Missing production BLOOD SPIKE function: ${name}`);
        scene[name] = source[name];
      }
    }
    if (bridge.phantomNovaArena === true) {
      const novaMethods = [
        "isUmbraPhantomNovaVerificationEnabled", "getUmbraPhantomNovaCombatBlockReason", "getUmbraPhantomNovaBlockReason",
        "initializeUmbraPhantomNovaRuntime", "destroyUmbraPhantomNovaRuntime", "prepareUmbraPhantomNovaFrame",
        "handleUmbraPhantomNovaDepthChange", "registerUmbraPhantomNovaEnemyLife", "snapshotUmbraPhantomNovaEnemy",
        "getUmbraPhantomNovaTargets", "receiveUmbraPhantomNovaTrace", "observeUmbraPhantomNovaStep",
        "getUmbraPhantomNovaSnapshot", "getUmbraPhantomNovaVisualState", "cancelUmbraPhantomNovaReservation",
        "connectUmbraPhantomNovaTrace", "recordUmbraPhantomNovaSkip", "recordUmbraPhantomNovaTransition",
        "getUmbraPhantomNovaPlacementBlockReason", "commitUmbraPhantomNovaReservation", "updateUmbraPhantomNovaPositions",
        "applyUmbraPhantomNovaPulse",
        "advanceUmbraNovaProtectionClock", "createUmbraNovaProtectionField", "clearUmbraNovaProtectionFields",
        "isUmbraNovaProtectionFieldCurrent", "isPointInsideUmbraNovaProtectionField", "getUmbraNovaProtectionVisualState", "isPlayerProtectedByUmbraNovaField",
        "getUmbraPhantomNovaStage1Config", "getUmbraPhantomNovaRawDamage", "getUmbraPhantomNovaIntervalMs",
        "getUmbraPhantomNovaEffectiveStats", "getUmbraVerificationPassiveWeapons"
      ];
      for (const name of novaMethods) {
        if (typeof source[name] !== "function") throw new Error(`Missing production PHANTOM NOVA function: ${name}`);
        scene[name] = source[name];
      }
    }
    if (bridge.umbraGrowth === true) {
      const growthMethods = [
        "isUmbraGrowthContextActive", "isUmbraGrowthSkillDefinition", "initializeUmbraGrowthRun", "getUmbraActiveSkillStage",
        "applyUmbraSkillStageChange", "reconcileUmbraPhantomNovaSlots", "recordUmbraDeferredMilestones",
        "getUmbraSkillStatsConfig", "buildUmbraSkillGrowthChoice", "buildUmbraSkillGrowthCard",
        "buildInitialSkillStates", "createSkillState", "applySkillStage", "isSkillRuntimeBehaviorImplemented",
        "getPlayerSkillSlotIds", "isSkillAvailableForPlayerMech", "getAvailableSkillChoices", "buildSkillChoice",
        "buildSkillUpgradeChoice", "buildSkillUnlockChoice", "unlockSkill", "upgradeSkill", "handleSkillStageMutationUnlock",
        "shuffleArray", "gainExperience", "beginStartingUpgradeDraft", "showLevelUpChoices",
        "consumeOpeningBoostExtraChoiceTicketIfNeeded", "selectLevelUpCard", "completeLevelUpCardSelection"
      ];
      for (const name of growthMethods) {
        if (typeof source[name] !== "function") throw new Error(`Missing production growth function: ${name}`);
        scene[name] = source[name];
      }
      // Presentation and isolated progression leaves only. In particular this
      // does not install Mutation, Atlas, TRIAD, save or purchase lifecycle.
      scene.consumeAnjuMemoryConsumable = () => false;
      scene.cancelActiveEnemyBeamCharges = () => {};
      scene.addOverdriveFromXp = function (value) {
        this.umbraGrowthSuppressedOverflowXp = (this.umbraGrowthSuppressedOverflowXp || 0) + Math.max(0, Number(value) || 0);
      };
      scene.updateHud = function () { this.moonlightArena?.refreshHud(); };
      scene.hideOverlay = function () { this.closeCandidateCards(); };
      scene.resumeGameplayAfterBlockingOverlay = function () {
        if (this.startingUpgradeSelectionsRemaining <= 0) this.survivalTime = Math.max(1, this.survivalTime || 0);
        this.driveResumePending = !this.drivePaused && !this.driveHidden && !this.driveShuttingDown;
      };
      scene.tryOpenPendingPostOverlaySelections = () => false;
      if (bridge.umbraCore === true) {
        // Dedicated Core branches reuse the production selection transaction.
        // Generic save/Atlas/TRIAD initialization is deliberately not installed.
        const coreMethods = [
          "isUmbraCoreContextActive", "isUmbraCoreSkillOwnerValid", "getUmbraSelectedCoreId", "getUmbraCoreSelectionState", "syncUmbraCoreMilestones",
          "queueUmbraCoreMilestone", "buildUmbraCoreChoices", "applyUmbraCoreChoice", "closeUmbraCoreSelection",
          "getUmbraSkillCoreProfile", "buildUmbraCoreCard", "queueSkillMutationSelect", "canOpenSkillMutationSelection",
          "tryOpenPendingSkillMutationSelection", "buildSkillMutationChoices", "showSkillMutationSelect", "applySkillMutationChoice",
          "finishSkillMutationSelectionOverlay", "tryOpenPendingPostOverlaySelections",
          "getEnemySpeedMultiplier", "applyUmbraControlMovementMultiplier", "getUmbraControlSpeedMultiplier",
          "getUmbraControlOwner", "isUmbraControlOwnerActive", "initializeUmbraControlOwner", "isUmbraControlBossTarget",
          "isUmbraControlRecordValid", "pruneUmbraControlContributions", "applyUmbraControlHit",
          "getUmbraTriadSlowMultiplier", "getUmbraControlEffectStats",
          "recordUmbraBossDashCommand", "isUmbraBossDashCommandActive", "updateUmbraBossDashCommand",
          "getEnemyLostArmsSlowMultiplier", "getEnemyCleaningRobotSlowMultiplier", "getEnemySkillMutationSlowMultiplier",
          "updateEnemies", "updateDashEnemy", "updateRangedEnemy", "updateBossSpecialEnemy", "updateEnemySupportStatusLock",
          "constrainEnemyToMovementBounds", "getStageMovementBounds", "clampPointToBounds"
        ];
        for (const name of coreMethods) {
          if (typeof source[name] !== "function") throw new Error(`Missing production Core function: ${name}`);
          scene[name] = source[name];
        }
        if (bridge.umbraFinal === true) {
          const finalMethods = [
            "isUmbraFinalContextActive", "isUmbraFinalSkillEligible", "getUmbraSelectedFinalId", "getUmbraSkillFinalProfile", "buildUmbraFinalCard",
            "queueUmbraFinalMilestone", "getUmbraNextMutationRequest", "buildUmbraFinalChoices", "applyUmbraFinalChoice",
            "getEnemyHpRatio", "isHighValueMutationTarget", "getUmbraFinalMainRawDamage", "isUmbraFinalOwnerActive", "ensureUmbraFinalState",
            "recordUmbraFinalSkip", "clearUmbraFinalFields", "endUmbraFinalField", "isUmbraFinalFieldLive", "pruneUmbraFinalFields",
            "snapshotUmbraFinalEnemy", "findUmbraFinalTargets", "getUmbraFinalMoonParent", "reserveUmbraFinalDispatch",
            "isUmbraFinalDispatchLive", "getUmbraFinalSecondaryRawDamage", "dispatchUmbraFinalSecondary", "getUmbraFinalFieldSettings", "createUmbraFinalField", "updateUmbraFinalFieldMembership",
            "updateUmbraFinalFields", "getUmbraFinalFieldSpeedMultiplier", "getUmbraFinalVisualState", "getUmbraFinalSnapshot"
          ];
          for (const name of finalMethods) {
            if (typeof source[name] !== "function") throw new Error(`Missing production Final function: ${name}`);
            scene[name] = source[name];
          }
          if (bridge.umbraTriad === true) {
            const triadMethods = [
              "isUmbraTriadContextActive", "getUmbraTriadTargetSkillIds", "initializeUmbraTriadRun", "refreshUmbraTriadSnapshot",
              "getUmbraTriadSnapshot", "getUmbraTriadCombatProfile", "getUmbraTriadModifier", "destroyUmbraTriadRun",
              "createUmbraTriadSnapshot", "bindUmbraTriadOwner", "createTriadMatrixSnapshot",
              "resolveTriadMatrixAxis", "buildTriadMatrixCombatModifiers", "getMutationAtlasBuildMeta", "getValidMutationAtlasBuildId",
              "isTriadMatrixFinalRaidSuppressed", "getTriadMatrixModifier", "getTriadSkillDamageMultiplier",
              "getTriadControlMultiplier", "getTriadPrismDamageMultiplier", "getTriadSingularityMultiplier",
              "getTriadOverdriveGaugeMultiplier", "getTriadRobotSyncGaugeMultiplier", "getTriadDashStaminaDrainMultiplier"
            ];
            for (const name of triadMethods) {
              if (typeof source[name] !== "function") throw new Error(`Missing production TRIAD function: ${name}`);
              scene[name] = source[name];
            }
            if (bridge.umbraEquipment === true) {
              const equipmentMethods = [
                "isUmbraEquipmentContextActive", "isUmbraEquipmentScope", "getEquipmentCombatLinkTargetSkillIds",
                "initializeUmbraEquipmentRun", "getUmbraEquipmentSnapshot", "getUmbraEquipmentCombatProfile", "destroyUmbraEquipmentRun",
                "canUpgradeUmbraEquipmentOverlimit", "buildUmbraEquipmentOverlimitChoice", "getUmbraEquipmentOverlimitCardDifference", "applyUmbraEquipmentOverlimitChoice",
                "queueUmbraEquipmentFinalCommit", "queueUmbraFinalOverlimitBonus", "queueUmbraDeepOverlimitBonus",
                "canOpenUmbraEquipmentOverlimitBonusSelection", "tryOpenUmbraEquipmentOverlimitBonusSelection",
                "closeUmbraEquipmentOverlimitSelection", "rejectUmbraEquipmentOverlimitSelection",
                "createDefaultRunEquipmentCombatLinkState", "createDefaultRunEquipmentOverlimitLevels",
                "normalizeRunEquipmentCombatLinkState", "normalizeRunEquipmentOverlimitLevels", "getEquipmentCombatLinkTierConfig",
                "resolveRunEquipmentCombatLinkSnapshot", "getRunEquipmentCombatLinkState", "createDefaultRunEquipmentOverlimitBonusState",
                "ensureRunEquipmentOverlimitBonusState", "shouldSuppressRunEquipmentCombatLink", "getRunEquipmentCombatLinkLevel",
                "getRunEquipmentOverlimitCap", "isEquipmentCombatLinkSkillId", "getRunEquipmentSkillOverlimitCap",
                "getRunEquipmentSkillOverlimitLevel", "getRunEquipmentSkillOverlimitDamageMultiplier", "hasAvailableRunEquipmentOverlimitUpgrade",
                "canUpgradeRunEquipmentSkillOverlimit", "buildEquipmentOverlimitChoice", "getAvailableEquipmentOverlimitChoices",
                "countAvailableEquipmentOverlimitUpgradeSteps", "queueFinalMutationEquipmentOverlimitBonus", "queueDeepLevelEquipmentOverlimitBonus",
                "canOpenEquipmentOverlimitBonusSelection", "tryOpenPendingEquipmentOverlimitBonusSelection",
                "openEquipmentOverlimitBonusSelection", "finishEquipmentOverlimitBonusSelectionOverlay",
                "formatEquipmentOverlimitLevelLabel", "formatEquipmentOverlimitHudLabel", "getRunEquipmentSkillOverlimitHudPresentation",
                "getUmbraEquipmentAttackDamage", "getUmbraEquipmentDamageBreakdown", "getUmbraEquipmentReactorCardDisplay", "applyRunEquipmentPlayerSkillDamageBonus",
                "getRunEquipmentAdjustedSkillIntervalMs", "isRunEquipmentSkillBonusTarget"
              ];
              for (const name of equipmentMethods) {
                if (typeof source[name] !== "function") throw new Error(`Missing production equipment function: ${name}`);
                scene[name] = source[name];
              }
            }
          }
        }
      }
      scene.playLevelUpSelectAnimation = function (selected, others, onComplete) {
        const owner = this.umbraGrowthOverlayOwner, run = this.umbraGrowthRun, context = this.verificationContext;
        source.playLevelUpSelectAnimation.call(this, selected, others, () => {
          if (owner !== this.umbraGrowthOverlayOwner || run !== this.umbraGrowthRun || context !== this.verificationContext
            || !this.isUmbraGrowthContextActive() || !this.levelUpActive || !this.levelUpSelectionLocked) return;
          onComplete();
        });
      };
    }
    for (const name of omittedPresentation) {
      if (typeof scene[name] !== "function") scene[name] = function () {};
    }
    const adapters = {
      // Existing presets only. The actual production tuning getter is installed
      // above, so no copied/partially merged tuning table is used here.
      getAcMovementPresetName() { return ["v1", "acV2", "acV3"].includes(this.driveMovementPreset) ? this.driveMovementPreset : "acV3"; },
      getUrlStageParam() { return null; },
      shouldUseAcMovement() { return true; },
      isAcMovementActivationRequested() { return true; },
      isAcMovementDebugEnabled() { return false; },
      isFinalBossRaidActive() { return false; },
      isDepth10HumanPlayerVisualActive() { return false; },
      isStageCollisionEditorAdjustingSelection() { return false; },
      shouldUseAcTargetFacing() { return false; },
      isAcFacingTargetValid() { return false; },
      findNearestAcFacingEnemy() { return null; },
      getAcFacingTargetLabel() { return ""; },
      shouldUseAcMovementVisuals() { return false; },
      isControllerInputEnabled() { return this.optionsState?.controllerEnabled !== false; },
      getOverdriveMoveSpeedMultiplier() { return 1; },
      getFinalBossRaidPlayerMoveMultiplier() { return 1; },
      getTriadDashStaminaDrainMultiplier() { return 1; }
    };
    for (const [name, implementation] of Object.entries(adapters)) {
      if (typeof scene[name] !== "function") scene[name] = implementation;
    }

    scene.resetUmbraDriveMotion = function (reason = "newVerificationRun") {
      if (!this.getUmbraPhase2AVerifiedMechId()) throw new Error("Missing Phase 2A verification context");
      if (!this.stats || !this.playerHitbox?.body || !this.playerSprite) throw new Error("Create fixture and separate physics body/sprite before resetting movement");
      this.invalidateUmbraBoostTrace(reason);
      for (const name of ["getRunPlayerMechStatProfile", "getPassiveLevel", "getReactorCoolingRegenMultiplier", "getRunEquipmentStaminaRegenMultiplier", "setPlayerRobotPose", "syncPlayerVisuals"]) {
        if (typeof this[name] !== "function") throw new Error(`Missing fixture/display adapter: ${name}`);
      }
      this.mobileMoveVector = { x: 0, y: 0 };
      this.mobileDashHeld = false;
      this.gamepadState = this.createGamepadState();
      for (const key of Object.values(this.keys || {})) key?.reset?.();
      this.playerHitbox.body.setVelocity(0, 0);
      this.playerRobotMotion = { directionKey: "down", angle: Math.PI / 2, hoverMs: 0, lift: 0, tiltAngle: 0, shadowScale: 1 };
      this.playerAimAngle = Math.PI / 2;
      this.invincibleUntil = 0;
      this.isDashing = false;
      this.dashLockedUntilRelease = false;
      this.dashRegenBlockedUntil = 0;
      this.acEvasionPassiveStartLevelApplied = true;
      this.umbraDriveMotionPaused = false;
      this.umbraDrivePausedAt = null;
      this.resetAcMovementState(reason);
      // A physically held controller must be released after fixture switches.
      this.acMovementState.mustReleaseDashBeforeBoost = true;
      this.lastUmbraDriveResetReason = reason;
      this.playerSprite.setAlpha(1);
      return this.acMovementState;
    };

    scene.cancelUmbraDriveMotion = function (reason = "verificationControl") {
      this.invalidateUmbraBoostTrace(reason);
      const state = this.ensureAcMovementState();
      const now = Math.max(0, Number(this.time?.now) || 0);
      // A control panel is an interruption, never an EN refill or overheat reset.
      if (state.continuousBoost?.active) this.endAcContinuousBoost(state, now, "RELEASE");
      else if (state.variableQuickBoost?.active) this.endAcVariableQuickBoost(state, now, "RELEASE");
      if (state.airBrake?.active) this.endAcAirBrake(state, now, reason);
      this.resetAcEvadeWindowForNextBoost(reason, state);
      state.quickBoostUntil = Math.min(state.quickBoostUntil, now);
      state.postBoostGlideUntil = Math.min(state.postBoostGlideUntil, now);
      state.velocity.x = 0;
      state.velocity.y = 0;
      state.mode = bridge.movementConfig.idleMode;
      state.lastDashDown = this.getPlayerDashInputDown();
      state.mustReleaseDashBeforeBoost = true;
      this.mobileMoveVector = { x: 0, y: 0 };
      this.mobileDashHeld = false;
      this.isDashing = false;
      this.playerHitbox?.body?.setVelocity(0, 0);
      this.lastUmbraDriveInterruptReason = reason;
      return state;
    };

    scene.pauseUmbraDriveMotion = function (reason = "pause") {
      if (this.umbraDriveMotionPaused) return false;
      this.cancelUmbraDriveMotion(reason);
      this.umbraDrivePausedAt = Math.max(0, Number(this.time?.now) || 0);
      this.umbraDriveMotionPaused = true;
      this.physics.world.pause();
      return true;
    };

    scene.resumeUmbraDriveMotion = function () {
      if (!this.umbraDriveMotionPaused) return false;
      this.invalidateUmbraBoostTrace("RESUME");
      const pausedAt = this.umbraDrivePausedAt;
      const now = Math.max(0, Number(this.time?.now) || 0);
      const elapsed = Math.max(0, now - pausedAt);
      const state = this.ensureAcMovementState();
      const shift = (object, keys) => {
        for (const key of keys) if (Number(object?.[key]) > pausedAt) object[key] += elapsed;
      };
      // Shift outstanding deadlines only. Values, EN, full-recharge requirement,
      // and must-release state survive the pause. The Phaser Clock is not modified.
      shift(state, ["cooldownUntil", "boostRegenBlockedUntil", "boostLockoutUntil", "quickBoostHardLockUntil"]);
      shift(state.airBrake, ["cooldownUntil", "regenBlockedUntil"]);
      shift(state.fullOverheat, ["regenDelayUntil", "minimumVisualUntil"]);
      shift(state.heat, ["warningUntil", "overheatUntil"]);
      shift(this, ["dashRegenBlockedUntil"]);
      this.umbraDriveMotionPaused = false;
      this.umbraDrivePausedAt = null;
      this.physics.world.resume();
      return true;
    };
    return { productionMethods: methods, omittedPresentation };
  };
}());
