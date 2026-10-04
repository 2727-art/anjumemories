/* Shared explicit Phase 3/4/5 arena. No storage, auth, normal Scene boot or asset requests. */
(function () {
  "use strict";
  const FX = Object.freeze({ numberLimit: 12, numberDurationMs: 650 });
  const NOVA_DISPLAY = window.umbraPresentation.NOVA_DISPLAY;
  const NOVA_WEAPONS = Object.freeze({
    none: { label: "なし", skills: [] }, moonlight: { label: "MOON", skills: ["umbraMoonlight"] },
    bloodSpike: { label: "SPIKE", skills: ["umbraBloodSpike"] },
    phantomNova: { label: "NOVA", skills: ["umbraPhantomNova"] },
    both: { label: "MOON+SPIKE", skills: ["umbraMoonlight", "umbraBloodSpike"] },
    moonNova: { label: "MOON+NOVA", skills: ["umbraMoonlight", "umbraPhantomNova"] },
    spikeNova: { label: "SPIKE+NOVA", skills: ["umbraBloodSpike", "umbraPhantomNova"] },
    all: { label: "3武装", skills: ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"] }
  });
  const NOVA_CONFIGURATIONS = Object.freeze([
    { id: "nova_orbit", label: "NOVA 周回放電", hint: "静止したまま周回球の放電を確認。球は接触攻撃ではなく、白い射程ガイドは本体サイズと別。", start: [350, 500] },
    { id: "nova_chase", label: "NOVA 開始点へ後から接近", hint: "右へブーストして球を切り離す。敵は保存開始地点へ後から接近し、機体の現在位置には追従しない。", start: [350, 500] },
    { id: "nova_leave", label: "NOVA 残留から離脱 / 耐久円・矩形", hint: "右へブーストし、残留球から離れる。画面外でも残留3000ms→再生成1200msは継続。", start: [350, 500] }
  ]);
  const CORE_CONFIGURATIONS = Object.freeze([
    { id: "core_moving", label: "Core 移動16体 / 同じ往復進路", hint: "進路は試験用。新しい速度指令へ本番の既存slow＋CONTROL合成を適用。足元の小印は有効CONTROLのみ。", start: [350, 500] },
    { id: "core_ai", label: "Core 本番AI移動 / 4種", hint: "本番の通常追跡・dash・ranged・Boss移動。次の攻撃開始だけfixtureで保留。全AI経路の確認ではありません。", start: [350, 500] }
  ]);
  const CORE_TINTS = window.umbraPresentation.CORE_TINTS;
  const FINAL_DISPLAY = window.umbraPresentation.FINAL_DISPLAY;
  const TRIAD_SKILL_IDS = Object.freeze(["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]);
  // Recommendations describe choices only. Changing one starts a new run;
  // every Core/Final still goes through its production card transaction.
  const TRIAD_COMPARISONS = Object.freeze([
    { id: "standby", label: "未成立 / 自由S8", stages: [8, 8, 8], core: ["未選択", "未選択", "未選択"], final: ["未選択", "未選択", "未選択"] },
    { id: "two_one", label: "2:1 LINK I", stages: [8, 8, 8], core: ["assault", "assault", "reactor"], final: ["execution", "execution", "prism"] },
    { id: "assault_execution", label: "ASSAULT / EXECUTION II", stages: [8, 8, 8], core: ["assault", "assault", "assault"], final: ["execution", "execution", "execution"] },
    { id: "control_singularity", label: "CONTROL / SINGULARITY II", stages: [8, 8, 8], core: ["control", "control", "control"], final: ["singularity", "singularity", "singularity"] },
    { id: "reactor", label: "REACTOR EN / S4", stages: [4, 4, 4], core: ["reactor", "reactor", "reactor"], final: ["—", "—", "—"] },
    { id: "mixed", label: "TRINITY / ADAPTIVE", stages: [8, 8, 8], core: ["assault", "control", "reactor"], final: ["execution", "prism", "singularity"] },
    { id: "moon_s1", label: "MOON S1＋他2 LINK", stages: [1, 8, 8], core: ["—", "assault", "assault"], final: ["—", "execution", "execution"] },
    { id: "spike_s1", label: "SPIKE S1＋他2 LINK", stages: [8, 1, 8], core: ["assault", "—", "assault"], final: ["execution", "—", "execution"] },
    { id: "nova_s1", label: "NOVA S1＋他2 LINK", stages: [8, 8, 1], core: ["assault", "assault", "—"], final: ["execution", "execution", "—"] }
  ]);
  const TRIAD_CONFIGURATIONS = Object.freeze([
    { id: "triad_final_cap", label: "TRIAD / 6field上限補足16体", hint: "既存上限補足の16体。3REACTOR/S8・Fire Control6・1秒ごと右下左上、各220ms DASH。自然成長の証明ではありません。", start: [350, 500] }
  ]);
  const FINAL_CONFIGURATIONS = Object.freeze([
    { id: "final_branch", label: "Final 分岐候補 / MOON・NOVA", hint: "右の進路脇に主対象、その外側に別敵。PRISMは成功した副受付だけ線を描く。単武装比較も使用。", start: [350, 500] },
    { id: "final_spike_branch", label: "Final SPIKE主範囲外の候補", hint: "近い敵へ設置。先に登録した外縁の主成功点から、角の範囲外の2敵へ分岐できる配置。", start: [350, 500] },
    { id: "final_field", label: "Final field候補 9体 / 交代", hint: "9体の往復移動。fieldは最大6体を選出、主impactは6体上限なし。主CONTROLとfieldの解除を比較。", start: [350, 500] },
    { id: "final_walls", label: "Final 壁の両側 / LOS", hint: "主起点から副対象・field対象までの壁遮断。細線の途中へ追加damageはない。", start: [1510, 1010] }
  ]);
  const CONFIGURATIONS = Object.freeze([
    { id: "side", label: "側面・通常 / Elite", hint: "右へ進み、敵の側面をブーストで通過。接触半径と斬撃半径は別。", start: [350, 500] },
    { id: "cross", label: "横切る移動敵", hint: "青い敵は上下移動。判定は同じ物理stepの相対移動。", start: [350, 500] },
    { id: "group", label: "小集団 16体", hint: "16体への受付と、同時12個までのFX表示を比較。", start: [350, 500] },
    { id: "boss", label: "通常Boss / 大矩形", hint: "通常Wave Boss相当HP。右側の矩形は専用の形状検証対象。", start: [350, 500] },
    { id: "walls", label: "壁手前 / 向こう側", hint: "縦壁の左右の敵。壁沿いの有効移動でも壁越しには攻撃しない。", start: [1510, 1010] },
    { id: "corners", label: "内角 / 外角", hint: "安全性未確認の角区間は攻撃せず、見送り理由に記録。", start: [1570, 1300] },
    { id: "empty", label: "敵なし・性能比較", hint: "敵・接触なし。武装の有無で元の移動性能を比較。", start: [350, 500] },
    { id: "spike_single", label: "SPIKE 静止単体", hint: "静止したまま自動設置。接地点と半径80、3コマ目の単発攻撃を確認。", start: [350, 500] },
    { id: "spike_escape", label: "SPIKE 範囲から脱出", hint: "選定後に敵が右へ脱出。角は固定地点に残り、空振りでも8コマを完了。", start: [350, 500] },
    { id: "spike_enter", label: "SPIKE 別の敵が進入", hint: "下側の敵が突き上げ範囲へ進入。命中時点の位置を使う。", start: [350, 500] },
    { id: "spike_moonlight_first", label: "MOONLIGHT 先行撃破", hint: "右へboostして近い敵を先に斬る。SPIKEは元標的が死んでも固定地点で完了。", start: [350, 500] }
  ]);
  const PRODUCTION_METHODS = Object.freeze([
    "configureEnemyBody", "applyDamageToEnemy", "scalePlayerDamage", "applyEnemyImpact", "killEnemy",
    "handlePlayerHit", "applyDamageToPlayer", "shouldNegatePlayerDamageByAcEvade", "getEnemyOutgoingDamage", "getRunEquipmentDamageTakenMultiplier",
    "applyRobotBarrierToIncomingDamage", "isOverdriveActive", "getOverdriveDamageMultiplier",
    "getOverdriveFireIntervalMultiplier", "getOverdriveModDamageTakenMultiplier", "applyOverdriveModHunterDamageModifier",
    "getActiveOverdriveMod", "getOverdriveModDefinition", "hasActiveOverdriveMod", "getOverdriveModModifier",
    "isNemesisBoss", "isVoidHunterBoss", "advanceWaveAfterBossKill",
    "clearDashEnemyWarning", "clearDashEnemyTelegraph", "destroyEnemyBeamTelegraph", "cancelBossAttack", "clearBossAttackObjects",
    "getCurrentWaveDefinition", "buildWaveDefinition", "getCurrentEnemyScaling", "getDepthScaling", "getInstabilityScaling",
    "getEnemyDurabilityHpMultiplier", "getBossDurabilityHpMultiplier", "getDeepDurabilityMultiplier",
    "getActiveAnomalyContract", "getAnomalyContractModifier", "getAnomalyEnemyHpMultiplier", "getAnomalyEnemyDamageMultiplier",
    "getAnomalyEnemySpeedMultiplier", "getAnomalyBossHpMultiplier", "getAnomalyBossDamageMultiplier", "getAnomalyRareSlimeChanceMultiplier",
    "getAnomalyGeekMultiplierAdd", "getAnomalyValueDropGeekMultiplier", "getGeekMultiplierBreakdown", "getGeekMilestoneForDepth",
    "getGeekMilestoneBonusAdd", "getNextGeekMilestone", "normalizeCoinAmount", "calculateUnsecuredGeekReward",
    "recordRunPeakGeekMultiplier", "isGeekMilestoneDebugEnabled", "scaleValueDropCoinReward",
    "spawnXpOrb", "spawnGuaranteedEnemyDrops", "trySpawnRareItem", "spawnRareItem", "tryMergeIncomingValueDrop",
    "createIncomingValueDropMergeSource", "getSafeDropPoint", "clampPointToBounds", "prepareDropObject",
    "isDropActive", "isDataCacheDrop", "getActiveDropObjects", "getDropCategory", "getDropGroupName", "getDropTweenTargets",
    "getDeepDropCompressionTier", "getEffectiveDropLimits", "getValueDropVisualCompression", "isDeepDropCompressionActive",
    "enforceDropLimits", "enforceCategoryDropLimit", "enforceTotalDropLimit", "getDropLimitRemovalPriority",
    "getDropRewardEstimate", "compareDropsForLimitRemoval", "canMergeDropReward", "findMergeTarget", "mergeDropReward",
    "getMergedDropSourceCount", "removeDropSafely", "destroyRareItem", "destroySpecialItem", "destroyDropStackLabel", "updateDropStackLabel"
  ]);
  const BLOCKED_LEAVES = Object.freeze([
    "trySpawnProductionEquipmentBox", "trySpawnRobotBossDrop", "trySpawnLostArmDrop", "spawnRobotItem",
    "trySpawnSpecialItem", "handleNemesisBossDefeated", "handleVoidHunterDefeated"
  ]);
  const OMITTED_LEAVES = Object.freeze([
    "releaseRobotMissileLockTarget", "handleDepthDirectiveEnemyKilled", "handleDepthDirectivePlayerDamage",
    "handleGenericCommsHpThresholds", "spawnEnemyDefeatEffect"
  ]);
  const fmt = (value, places = 0) => Number.isFinite(Number(value)) ? Number(value).toFixed(places) : "—";

  window.createUmbraMoonlightArena = function (scene, bridge) {
    if (!(bridge.attackArena === true || bridge.moonlightArena === true) || !scene.isUmbraPhase2ADrive || scene.sys?.settings?.key !== "UmbraPhase2ADrive") {
      throw new Error("MOONLIGHT arena requires the explicit isolated Phase 3 entry");
    }
    const source = bridge.sourcePrototype, assets = window.umbraPreviewAssets;
    const growth = bridge.umbraGrowth === true;
    const core = growth && bridge.umbraCore === true;
    const final = core && bridge.umbraFinal === true;
    const triad = final && bridge.umbraTriad === true;
    const equipment = triad && bridge.umbraEquipment === true;
    const phase5 = bridge.phantomNovaArena === true, phase4 = bridge.bloodSpikeArena === true || phase5;
    const effect = assets.effects.umbraMoonlight;
    const spikeEffect = assets.effects.umbraBloodSpike;
    const novaEffect = assets.effects.umbraPhantomNova;
    const initialNovaSelection = bridge.moonlightArena === true ? (bridge.bloodSpikeArena === true ? "all" : "moonNova")
      : bridge.bloodSpikeArena === true ? "spikeNova" : "phantomNova";
    const arena = {
      configurations: triad ? [...TRIAD_CONFIGURATIONS, ...FINAL_CONFIGURATIONS, ...CORE_CONFIGURATIONS, ...NOVA_CONFIGURATIONS, ...CONFIGURATIONS]
        : final ? [...FINAL_CONFIGURATIONS, ...CORE_CONFIGURATIONS, ...NOVA_CONFIGURATIONS, ...CONFIGURATIONS]
        : core ? [...CORE_CONFIGURATIONS, ...NOVA_CONFIGURATIONS, ...CONFIGURATIONS] : phase5 ? [...NOVA_CONFIGURATIONS, ...CONFIGURATIONS] : phase4 ? CONFIGURATIONS : CONFIGURATIONS.slice(0, 7),
      configId: growth ? "group" : phase5 ? "nova_orbit" : phase4 ? "spike_single" : "side",
      weaponSelection: growth ? "moonlight" : phase5 ? initialNovaSelection : phase4 ? (bridge.moonlightArena === true ? "both" : "bloodSpike") : "moonlight",
      growthPresetStage: null,
      ...(core ? { coreComparisonWeapons: "all" } : {}),
      ...(final ? { finalFields: new Map(), finalMarks: [], finalFxCounts: { secondaryRequested: 0, secondaryShown: 0, executionRequested: 0, executionShown: 0, capped: 0, hidden: 0, completed: 0 } } : {}),
      ...(triad ? { triadComparisons: TRIAD_COMPARISONS, triadComparisonId: null, triadNotice: null, triadNoticeCount: 0, triadHudKey: "" } : {}),
      ...(equipment ? { equipmentFixtures: scene.umbraEquipmentFixtures || [], equipmentHudKey: "" } : {}),
      novaSlots: [1, 2, 3].includes(bridge.novaSlots) ? bridge.novaSlots : 1, novaAttackEnabled: true,
      novaEffects: new Map(), novaRays: [], novaFxCounts: { created: 0, destroyed: 0, image: 0, fallback: 0, rayRequested: 0, rayShown: 0, rayCapped: 0, rayHidden: 0 },
      novaHudNextAt: 0, novaHudStateKey: "", novaHudUpdates: 0,
      contactEnabled: false, attackEnabled: true, spikeAttackEnabled: true, fxMode: "image", hitReactionMode: "graphics",
      spikeEffects: new Map(), spikeFxCounts: { created: 0, image: 0, fallback: 0, hidden: 0, destroyed: 0 },
      enemies: new Map(), effects: [], numbers: [], ui: [], serial: 0, elapsedMs: 0, destroyed: false,
      blocked: {}, omitted: {}, fxCounts: { requested: 0, shown: 0, fallback: 0, capped: 0, hidden: 0, completed: 0 },
      damageNumberCounts: { requested: 0, shown: 0, capped: 0 }, contact: { overlaps: 0, hpDamage: 0 },
      adapterManifest: { productionMethods: [...PRODUCTION_METHODS], blocked: [...BLOCKED_LEAVES],
        presentation: [...OMITTED_LEAVES, "playEnemyHitReaction", "spawnEnemyDamageNumber"],
        worldAdapters: ["getStageWorldBounds", "getStageMovementBounds", "isPointNearStageObstacle"],
        runExitAdapter: "triggerGameOver: close RAM combat and pause; never normal game-over/save" }
    };
    const count = (map, id) => { map[id] = (map[id] || 0) + 1; };
    const coreTint = profile => core ? CORE_TINTS[profile?.coreId] : null;
    const combatClock = () => Math.max(0, Number(scene.umbraMoonlightRuntime?.combatTimeMs) || 0);
    const spikeClock = () => Math.max(0, Number(scene.umbraBloodSpikeRuntime?.combatTimeMs) || 0);
    const novaClock = () => Math.max(0, Number(scene.umbraPhantomNovaRuntime?.combatTimeMs) || 0);
    const numberClock = () => phase5 ? Math.max(novaClock(), spikeClock(), combatClock()) : phase4 ? Math.max(spikeClock(), combatClock()) : combatClock();
    const maxImpactFx = () => Math.max(0, Math.floor(Number(scene.getUmbraMoonlightStage1Config()?.maxImpactFx) || 0));
    const active = () => {
      const reason = (phase5 ? scene.getUmbraPhantomNovaCombatBlockReason?.()
        : phase4 ? scene.getUmbraBloodSpikeCombatBlockReason?.() : scene.getUmbraMoonlightBlockReason?.()) || "";
      return !arena.destroyed && !scene.driveShuttingDown && !scene.drivePaused && !scene.driveHidden
        && !scene.selectionObjects?.length && !scene.gameOver && !scene.extractionComplete && !scene.physics.world.isPaused
        && (!reason || (reason === "CONTEXT_DISABLED" && scene.mechId !== "umbraSeraph"));
    };
    const ignore = (object) => { scene.uiCamera.ignore(object); return object; };
    const presentation = window.createUmbraPresentation(scene, { assets, growth, core, final, spike: phase4, nova: phase5,
      isActive: active, ignoreWorldObject: ignore, isGuidesVisible: () => scene.guides === true });
    for (const name of ["effects", "fxCounts", "spikeEffects", "spikeFxCounts", "novaEffects", "novaRays", "novaFxCounts",
      "finalFields", "finalMarks", "finalFxCounts", "spawnHitFx", "drawFx", "updateSpikeFx", "updateNovaFx", "spawnNovaPulseFx",
      "clearFinalFx", "spawnFinalMark", "updateFinalFx", "updateMoonFx"]) {
      if (Object.hasOwn(presentation, name)) arena[name] = presentation[name];
    }
    Object.defineProperty(arena, "fxMode", { get: () => presentation.fxMode, set: value => { presentation.fxMode = value; }, enumerable: true });

    const ownUi = (object) => { arena.ui.push(object); return object; };
    const label = (x, y, text, size = 13, color = "#bfe6e8") => ownUi(scene.label(x, y, text, size, color));
    const button = (x, y, width, text, action) => {
      const value = scene.button(x, y, width, text, action); ownUi(value.box); ownUi(value.caption); return value;
    };

    PRODUCTION_METHODS.forEach(name => {
      if (typeof source[name] !== "function") throw new Error(`Missing production arena function: ${name}`);
      scene[name] = source[name];
    });
    BLOCKED_LEAVES.forEach(name => { scene[name] = () => { count(arena.blocked, name); return false; }; });
    OMITTED_LEAVES.forEach(name => { scene[name] = () => { count(arena.omitted, name); }; });
    scene.isRobotBarrierUnlocked = () => false; // This fixture has no Robot/Barrier installation.
    scene.isFinalBossRaidActive = () => Boolean(scene.finalBossRaidState?.active);
    scene.getStageWorldBounds = () => ({ left: 0, top: 0, right: 6000, bottom: 2000, width: 6000, height: 2000 });
    if (!core) scene.getStageMovementBounds = (_stage, pad = 0) => ({ left: pad, top: pad, right: 6000 - pad, bottom: 2000 - pad });
    scene.isPointNearStageObstacle = (_stage, x, y, pad = 0) => (scene.walls?.getChildren() || []).some(wall => {
      const b = wall.body;
      return b?.enable && x >= b.x - pad && x <= b.right + pad && y >= b.y - pad && y <= b.bottom + pad;
    });
    scene.triggerGameOver = () => {
      if (equipment) scene.destroyUmbraEquipmentRun?.("ARENA_AP_ZERO");
      if (triad) scene.destroyUmbraTriadRun?.("ARENA_AP_ZERO");
      scene.gameOver = true; scene.drivePaused = true; scene.clearDriveInput(); scene.pauseUmbraDriveMotion("ARENA_AP_ZERO");
      if (phase4) { scene.destroyUmbraBloodSpikeRuntime?.("ARENA_AP_ZERO"); arena.clearSpikeEffects(); }
      if (phase5) scene.destroyUmbraPhantomNovaRuntime?.("ARENA_AP_ZERO");
      if (final) arena.clearFinalFx();
      scene.refreshDriveHud();
    };
    const graphicsHitReaction = enemy => {
      const record = arena.enemies.get(enemy);
      if (record) record.flashUntil = arena.elapsedMs + 130;
    };
    arena.setHitReactionMode = mode => {
      arena.hitReactionMode = mode === "productionBody" ? "productionBody" : "graphics";
      scene.playEnemyHitReaction = arena.hitReactionMode === "productionBody" ? source.playEnemyHitReaction : graphicsHitReaction;
    };
    arena.setHitReactionMode("graphics");
    scene.spawnEnemyDamageNumber = (enemy, damage) => {
      arena.damageNumberCounts.requested++;
      if (arena.fxMode === "off" || damage <= 0) return;
      if (arena.numbers.length >= FX.numberLimit) { arena.damageNumberCounts.capped++; return; }
      const body = enemy.body, x = body.position.x + body.halfWidth, y = body.position.y + body.halfHeight;
      const text = ignore(scene.add.text(x, y - 34, fmt(damage, damage % 1 ? 1 : 0), {
        fontFamily: "Segoe UI, sans-serif", fontSize: "20px", color: "#e4ffe9", stroke: "#061622", strokeThickness: 3
      }).setDepth(31).setOrigin(0.5));
      const novaOwned = phase5 && scene.umbraPhantomNovaRuntime?.applyingPulse === true;
      arena.numbers.push({ text, x, y: y - 34, age: 0, owner: novaOwned ? "nova" : "shared",
        createdCombatTimeMs: novaOwned ? novaClock() : numberClock() }); arena.damageNumberCounts.shown++;
    };
    // Preserve the real spawn and amount calculations; only assign new world visuals to the world camera.
    ["spawnXpOrb", "spawnRareItem"].forEach(name => {
      scene[name] = function (...args) {
        const before = new Set(this.children.list);
        const result = source[name].apply(this, args);
        this.children.list.forEach(object => { if (!before.has(object)) ignore(object); });
        return result;
      };
    });
    function createFallbackTextures() {
      ["umbra-arena-body", "xp-orb", "rare-token", "skill-hit-ring", "skill-hit-glow"].forEach(key => {
        if (scene.textures.exists(key)) return;
        const graphic = scene.add.graphics();
        graphic.fillStyle(0xffffff, 1).fillCircle(16, 16, key === "xp-orb" ? 7 : 14);
        graphic.generateTexture(key, 32, 32); graphic.destroy();
      });
    }
    createFallbackTextures();
    scene.enemies = scene.physics.add.group();
    scene.xpOrbs = scene.physics.add.group(); scene.rareItems = scene.physics.add.group();
    scene.pickupEffectsLayer = ignore(scene.add.layer());
    scene.damageFlash = ownUi(scene.ui(scene.add.rectangle(458, 437, 916, 565, 0xff2f3f, 0).setAlpha(0)));
    arena.enemyWallCollider = scene.physics.add.collider(scene.enemies, scene.walls);
    arena.contactCollider = scene.physics.add.overlap(scene.playerHitbox, scene.enemies, (player, enemy) => {
      if (!arena.contactEnabled || !active()) return;
      arena.contact.overlaps++;
      const before = scene.stats.hp;
      source.handlePlayerHit.call(scene, player, enemy);
      arena.contact.hpDamage += Math.max(0, before - scene.stats.hp);
    });

    arena.spawnEnemy = function (options = {}) {
      const definition = bridge.enemyDefinitions[options.typeId || "chaser"];
      if (!definition) throw new Error("Unknown arena enemy definition");
      const wave = scene.getCurrentWaveDefinition(), scaling = scene.getCurrentEnemyScaling();
      const elite = options.isElite === true, boss = options.isBoss === true;
      const x = Number.isFinite(Number(options.x)) ? Number(options.x) : 650;
      const y = Number.isFinite(Number(options.y)) ? Number(options.y) : 560;
      const enemy = ignore(scene.physics.add.sprite(x, y, "umbra-arena-body").setVisible(false));
      enemy.body.setAllowGravity(false).setCollideWorldBounds(true);
      scene.enemies.add(enemy);
      Object.assign(enemy, { enemyTypeId: definition.id, enemyDefinition: definition, baseTint: definition.tint,
        baseScale: 1, effectScale: 1, isElite: elite, isBoss: boss, isWaveBoss: boss,
        hp: Math.round(definition.hp * wave.hpScale * (elite ? (boss ? 5 : 4) : 1) * scaling.enemyHp * (boss ? scaling.bossHp : 1)),
        contactDamage: Math.round(definition.contactDamage * wave.damageScale * (elite ? 1.4 : 1) * scaling.enemyDamage),
        xpValue: Math.round(definition.xpValue * (elite ? 6 : 1)), anomalyBossDamageMultiplier: boss ? scaling.bossDamage : 1,
        knockbackResist: definition.knockbackResist || 0, isDying: false, supportDamageHoldUntil: 0,
        lostArmsVulnerableUntil: 0, lostArmsWeakenUntil: 0, bossAttackObjects: [], bossAttackEvents: [],
        moonlightArenaId: `arena-${++arena.serial}`, moonlightArenaKind: options.kind || (boss ? "waveBoss" : elite ? "elite" : "normal") });
      enemy.maxHp = enemy.hp;
      if (core && options.movement?.productionAi) {
        // Only the isolated input fixture postpones attack starts. Production
        // AI velocity, existing status locks and slow composition run unchanged.
        const wait = Number(scene.time.now) + 3600000;
        Object.assign(enemy, { moveSpeed: definition.speed, burstSpeed: definition.dashSpeed || definition.speed,
          aiBehavior: definition.aiBehavior, nextDashAt: wait, nextAttackAt: wait, nextBossAttackAt: wait,
          nextStrafeFlipAt: wait, nextBossStrafeFlipAt: wait, strafeDirection: 1, bossStrafeDirection: 1,
          burstUntil: 0, isBossDashing: false, isChargingBossAttack: false, isChargingBeam: false });
      }
      if (options.rect) {
        enemy.body.setSize(options.rect.width, options.rect.height, true).updateFromGameObject();
      } else {
        scene.configureEnemyBody(enemy, definition, elite);
      }
      // Requested fixture coordinates are actual body centers, independent of authored image pivots.
      enemy.x += x - enemy.body.center.x; enemy.y += y - enemy.body.center.y;
      enemy.body.updateFromGameObject();
      enemy.body.prev.copy(enemy.body.position); enemy.body.prevFrame.copy(enemy.body.position);
      const graphic = ignore(scene.add.graphics().setDepth(18));
      const caption = ignore(scene.add.text(x, y - 40, "", { fontFamily: "Segoe UI, sans-serif", fontSize: "17px", color: "#cfe5ef", stroke: "#08151c", strokeThickness: 3 }).setDepth(19).setOrigin(0.5));
      const record = { enemy, graphic, caption, x, y, label: options.label || `${definition.label}${boss ? " BOSS" : elite ? " ELITE" : ""}`,
        visualScale: 1, movement: options.movement || null, flashUntil: 0 };
      arena.enemies.set(enemy, record);
      enemy.once("destroy", () => { graphic.destroy(); caption.destroy(); arena.enemies.delete(enemy); });
      if (scene.umbraMoonlightRuntime) scene.registerUmbraMoonlightEnemyLife(enemy);
      if (scene.umbraBloodSpikeRuntime) scene.registerUmbraBloodSpikeEnemyLife(enemy);
      if (phase5 && scene.umbraPhantomNovaRuntime) scene.registerUmbraPhantomNovaEnemyLife(enemy);
      arena.renderEnemy(record);
      return enemy;
    };
    arena.renderEnemy = function (record) {
      const { enemy, graphic, caption } = record;
      if (!enemy.active || enemy.isDying || !enemy.body?.enable) { graphic.clear(); caption.setVisible(false); return; }
      const b = enemy.body, x = b.position.x + b.halfWidth, y = b.position.y + b.halfHeight;
      const tint = record.flashUntil > arena.elapsedMs ? 0xeefff0 : enemy.isBoss ? 0xb389e7 : enemy.isElite ? 0xe8b070 : record.movement ? 0x64b8e3 : 0x77a795;
      graphic.clear().fillStyle(tint, 0.45).lineStyle(2, tint, 1);
      const scale = record.visualScale;
      if (b.isCircle) graphic.fillCircle(x, y, b.halfWidth * scale).strokeCircle(x, y, b.halfWidth * scale);
      else graphic.fillRect(x - b.halfWidth * scale, y - b.halfHeight * scale, b.width * scale, b.height * scale).strokeRect(x - b.halfWidth * scale, y - b.halfHeight * scale, b.width * scale, b.height * scale);
      if (scene.guides) {
        graphic.lineStyle(1, 0xc7faff, 0.7);
        if (b.isCircle) graphic.strokeCircle(x, y, b.halfWidth);
        else graphic.strokeRect(b.x, b.y, b.width, b.height);
      }
      if (core && arena.fxMode !== "off" && scene.getUmbraControlSpeedMultiplier?.(enemy) < 1) {
        // A small status mark, never a damage field or a lifetime owner.
        window.umbraPresentation.drawControlMark(graphic, x, y, b.halfHeight);
      }
      caption.setVisible(true).setPosition(x, y - b.halfHeight - 19).setText(`${record.label}  HP ${fmt(Math.max(0, enemy.hp))}/${fmt(enemy.maxHp)}`);
    };
    arena.clearEffects = function () {
      presentation.clearEffects();
      arena.numbers.splice(0).forEach(number => number.text.destroy());
    };
    arena.clearSpikeEffects = function () {
      presentation.clearSpikeEffects();
    };
    arena.clearNovaEffects = function () {
      presentation.clearNovaEffects();
      for (const number of arena.numbers.slice()) if (number.owner === "nova") {
        number.text.destroy(); arena.numbers.splice(arena.numbers.indexOf(number), 1);
      }
    };
    arena.beforeDriveReset = function () {
      if (equipment) scene.destroyUmbraEquipmentRun?.("NEW_ARENA_RUN");
      if (triad) scene.destroyUmbraTriadRun?.("NEW_ARENA_RUN");
      if (growth) { scene.closeCandidateCards?.(); scene.umbraGrowthRun = null; }
      scene.destroyUmbraMoonlightRuntime?.("NEW_ARENA_RUN");
      if (phase4) scene.destroyUmbraBloodSpikeRuntime?.("NEW_ARENA_RUN");
      if (phase5) scene.destroyUmbraPhantomNovaRuntime?.("NEW_ARENA_RUN");
      arena.clearNovaEffects();
      arena.clearSpikeEffects();
      arena.clearEffects();
      if (final) arena.clearFinalFx();
      // A new fixture is a complete isolated run. This Scene has no production
      // timers or movement tweens: its timers are damage tint/death presentation.
      // Drop these pending callbacks before destroying their old enemy objects.
      scene.time.removeAllEvents(); scene.tweens.killAll();
      Array.from(arena.enemies.keys()).forEach(enemy => enemy.destroy()); arena.enemies.clear();
      // Physics may have already destroyed its groups before the Scene shutdown
      // callback. Fresh-run resets still pass live drops through real cleanup.
      if (scene.xpOrbs?.children && scene.rareItems?.children) {
        scene.getActiveDropObjects().slice().forEach(drop => scene.removeDropSafely(drop));
      }
      if (scene.pickupEffectsLayer?.scene) scene.pickupEffectsLayer.removeAll(true);
    };
    arena.afterDriveReset = function () {
      scene.verificationContext = Object.freeze({ ...scene.verificationContext, moonlightArena: true,
        ...(phase4 ? { bloodSpikeArena: true } : {}), ...(phase5 ? { phantomNovaArena: true, novaSlots: growth ? 1 : arena.novaSlots } : {}),
        ...(growth ? { growthEnabled: true } : {}), ...(core ? { coreEnabled: true } : {}),
        ...(final ? { finalEnabled: true } : {}), ...(triad ? { triadEnabled: true } : {}),
        ...(equipment ? { equipmentEnabled: true } : {}) });
      scene.isUmbraPhantomNovaTest = phase5;
      scene.playerSkills = {};
      const acquired = phase5 ? (NOVA_WEAPONS[arena.weaponSelection]?.skills || []) : arena.weaponSelection === "both" ? ["umbraMoonlight", "umbraBloodSpike"]
        : arena.weaponSelection === "moonlight" ? ["umbraMoonlight"] : arena.weaponSelection === "bloodSpike" ? ["umbraBloodSpike"] : [];
      if (!growth && scene.mechId === "umbraSeraph") for (const id of acquired) {
        const definition = bridge.skillDefinitions[id];
        scene.playerSkills[id] = { id, definition, stageIndex: 0, currentStage: definition.verificationStage1, verificationOnly: true, orbitals: [] };
      }
      scene.moonlightAttackEnabled = arena.attackEnabled;
      scene.bloodSpikeAttackEnabled = arena.spikeAttackEnabled;
      scene.novaAttackEnabled = arena.novaAttackEnabled;
      scene.gameOver = false; scene.extractionComplete = false; scene.restartInProgress = false;
      scene.currentWaveId = 1; scene.gateInstabilityStacks = 0; scene.currentStage = { id: "moonlight-arena" };
      scene.runStats = { kills: 0, eliteKills: 0, bossKills: 0, peakGeekMultiplier: 1 };
      scene.robotState = null; scene.anomalyContractState = null;
      scene.overflowRewardState = { overdriveRemainingMs: 0 }; scene.overdriveModState = null;
      arena.blocked = {}; arena.omitted = {}; arena.elapsedMs = 0; arena.serial = 0; arena.lastHit = null;
      Object.assign(arena.fxCounts, { requested: 0, shown: 0, fallback: 0, capped: 0, hidden: 0, completed: 0 });
      Object.assign(arena.spikeFxCounts, { created: 0, image: 0, fallback: 0, hidden: 0, destroyed: 0 });
      Object.assign(arena.novaFxCounts, { created: 0, destroyed: 0, image: 0, fallback: 0, rayRequested: 0, rayShown: 0, rayCapped: 0, rayHidden: 0 });
      arena.novaHudNextAt = 0; arena.novaHudStateKey = ""; arena.novaHudUpdates = 0;
      arena.damageNumberCounts = { requested: 0, shown: 0, capped: 0 }; arena.contact = { overlaps: 0, hpDamage: 0 };
      if (final) Object.assign(arena.finalFxCounts, { secondaryRequested: 0, secondaryShown: 0, executionRequested: 0, executionShown: 0, capped: 0, hidden: 0, completed: 0 });
      if (triad) { arena.triadNotice = null; arena.triadNoticeCount = 0; arena.triadHudKey = ""; }
      const configuration = arena.configurations.find(c => c.id === arena.configId) || arena.configurations[0];
      scene.playerHitbox.body.reset(...configuration.start);
      if (triad && arena.configId === "triad_final_cap") {
        for (let n = 0; n < 16; n++) {
          const row = Math.floor(n / 4), cap = n >= 14;
          arena.spawnEnemy({ typeId: "boss_crack", x: 480 + (n % 4) * 115,
            y: cap ? 1220 : 440 + row * 115, isBoss: true, isElite: true, rect: { width: 30, height: 30 },
            movement: { axis: "y", min: cap ? 1170 : 390 + row * 115, max: cap ? 1290 : 510 + row * 115, speed: 70, sign: n % 2 ? 1 : -1 },
            label: `上限補足 ${n + 1}` });
        }
      } else if (final && arena.configId === "final_branch") {
        arena.spawnEnemy({ typeId: "tank", x: 610, y: 560, isElite: true, label: "主の進路脇" });
        arena.spawnEnemy({ x: 640, y: 665, isElite: true, label: "進路の外 / 分岐候補" });
        arena.spawnEnemy({ x: 695, y: 650, isElite: true, label: "別の分岐候補" });
      } else if (final && arena.configId === "final_spike_branch") {
        arena.spawnEnemy({ x: 740, y: 500, isElite: true, label: "最初の主成功 / 外縁" });
        arena.spawnEnemy({ typeId: "tank", x: 600, y: 500, isElite: true, label: "最寄りの設置点" });
        arena.spawnEnemy({ x: 850, y: 480, isElite: true, label: "主範囲外 / 分岐候補A" });
        arena.spawnEnemy({ x: 850, y: 530, isElite: true, label: "主範囲外 / 分岐候補B" });
      } else if (final && arena.configId === "final_field") {
        for (let i = 0; i < 9; i++) arena.spawnEnemy({ typeId: "tank", x: 600 + Math.floor(i / 3) * 75, y: 425 + i % 3 * 75,
          isElite: true, movement: { axis: "y", min: 350, max: 680, speed: 95, sign: i % 2 ? -1 : 1 }, label: `field候補 ${i + 1}` });
      } else if (final && arena.configId === "final_walls") {
        arena.spawnEnemy({ typeId: "tank", x: 1620, y: 1035, isElite: true, label: "壁手前の主候補" });
        arena.spawnEnemy({ x: 1760, y: 1035, isElite: true, label: "壁向こう / LOS拒否" });
        arena.spawnEnemy({ x: 1610, y: 1140, isElite: true, label: "壁手前 / 分岐候補" });
      } else if (core && arena.configId === "core_moving") {
        for (let i = 0; i < 16; i++) arena.spawnEnemy({ typeId: "tank", isElite: true,
          x: 580 + Math.floor(i / 4) * 60, y: 430 + (i % 4) * 46,
          movement: { axis: "y", min: 380, max: 640, speed: 110, sign: i % 2 ? -1 : 1 } });
      } else if (core && arena.configId === "core_ai") {
        for (const [index, behavior] of ["chase", "dash", "ranged", "bossSpecial"].entries()) {
          const typeId = Object.values(bridge.enemyDefinitions).find(definition => behavior === "chase"
            ? definition.id === "chaser" : definition.aiBehavior === behavior)?.id;
          if (typeId) arena.spawnEnemy({ typeId, x: 700 + index * 65, y: 410 + index * 65,
            isElite: true, isBoss: behavior === "bossSpecial", movement: { productionAi: true }, label: `本番AI ${behavior}` });
        }
      } else if (arena.configId === "side") {
        arena.spawnEnemy({ x: 650, y: 560 }); arena.spawnEnemy({ typeId: "tank", x: 1050, y: 585 });
        arena.spawnEnemy({ x: 1470, y: 560, isElite: true });
      } else if (arena.configId === "cross") {
        arena.spawnEnemy({ typeId: "tank", x: 760, y: 500, movement: { axis: "y", min: 330, max: 720, speed: 160, sign: 1 } });
        arena.spawnEnemy({ x: 1320, y: 560, isElite: true, movement: { axis: "x", min: 1100, max: 2100, speed: 140, sign: 1 } });
      } else if (arena.configId === "group") {
        for (let i = 0; i < 16; i++) arena.spawnEnemy({ x: 740 + Math.floor(i / 4) * 25, y: 463 + (i % 4) * 25 });
      } else if (arena.configId === "boss") {
        arena.spawnEnemy({ typeId: "boss_crack", x: 780, y: 625, isBoss: true, isElite: true });
        arena.spawnEnemy({ typeId: "boss_crack", x: 1450, y: 600, isBoss: true, isElite: true, rect: { width: 240, height: 110 }, label: "RECT BODY / BOSS HP" });
      } else if (arena.configId === "walls") {
        arena.spawnEnemy({ x: 1620, y: 1050, isElite: true, label: "壁の手前" });
        arena.spawnEnemy({ x: 1770, y: 1050, isElite: true, label: "壁の向こう" });
      } else if (arena.configId === "corners") {
        arena.spawnEnemy({ x: 1620, y: 1320, isElite: true, label: "内角付近" });
        arena.spawnEnemy({ x: 1735, y: 1300, isElite: true, label: "外角付近" });
        arena.spawnEnemy({ x: 2935, y: 930, isElite: true, label: "四隅・接線" });
      } else if (arena.configId === "spike_single") {
        arena.spawnEnemy({ typeId: "tank", x: 700, y: 500, label: "静止標的" });
      } else if (arena.configId === "spike_escape") {
        arena.spawnEnemy({ typeId: "tank", x: 700, y: 500, movement: { axis: "x", min: 700, max: 1350, speed: 700, sign: 1 }, label: "範囲を離れる" });
      } else if (arena.configId === "spike_enter") {
        arena.spawnEnemy({ typeId: "tank", x: 700, y: 500, label: "初期標的" });
        arena.spawnEnemy({ typeId: "tank", x: 700, y: 710, movement: { axis: "y", min: 430, max: 710, speed: 650, sign: -1 }, label: "後から進入" });
      } else if (arena.configId === "spike_moonlight_first") {
        arena.spawnEnemy({ x: 450, y: 560, label: "先に斬る標的" });
      } else if (phase5 && arena.configId === "nova_orbit") {
        arena.spawnEnemy({ typeId: "tank", x: 540, y: 500, isElite: true, label: "周回放電 / 静止Elite" });
      } else if (phase5 && arena.configId === "nova_chase") {
        arena.spawnEnemy({ typeId: "tank", x: 900, y: 500, isElite: true,
          movement: { target: { x: 350, y: 500 }, speed: 110 }, label: "保存開始点へ接近" });
      } else if (phase5 && arena.configId === "nova_leave") {
        arena.spawnEnemy({ typeId: "boss_crack", x: 620, y: 520, isBoss: true, isElite: true, label: "残留 / 耐久円" });
        arena.spawnEnemy({ typeId: "boss_crack", x: 900, y: 560, isBoss: true, isElite: true,
          rect: { width: 240, height: 110 }, label: "耐久矩形" });
      }
      if (growth) {
        scene.umbraGrowthSyntheticXp = 0; scene.umbraGrowthSuppressedOverflowXp = 0;
        if (equipment) scene.initializeUmbraGrowthRun(scene.runEquipmentLoadoutSnapshot);
        else scene.initializeUmbraGrowthRun();
        if (arena.growthPresetStage && scene.isUmbraGrowthContextActive()) {
          const wanted = core ? NOVA_WEAPONS[arena.coreComparisonWeapons].skills : NOVA_WEAPONS.all.skills;
          if (core && !wanted.includes("umbraMoonlight")) {
            // Remove initial S1 before reaching S4; never leave a Core request
            // for a weapon excluded by this explicit fresh-run comparison.
            scene.destroyUmbraMoonlightRuntime("CORE_SINGLE_WEAPON_FIXTURE"); delete scene.playerSkills.umbraMoonlight;
          }
          for (const id of wanted) if (!scene.playerSkills[id]) scene.unlockSkill(id);
          for (const state of Object.values(scene.playerSkills)) {
            const plan = triad ? TRIAD_COMPARISONS.find(item => item.id === arena.triadComparisonId) : null;
            state.stageIndex = (plan?.stages[TRIAD_SKILL_IDS.indexOf(state.id)] ?? arena.growthPresetStage) - 1; scene.applySkillStage(state);
          }
          if (core) scene.syncUmbraCoreMilestones();
        }
        if (triad) scene.initializeUmbraTriadRun();
      }
      arena.refreshHud();
    };
    arena.connect = function () {
      if (!growth || (scene.playerSkills.umbraMoonlight && !scene.umbraMoonlightRuntime)) scene.initializeUmbraMoonlightRuntime();
      for (const enemy of arena.enemies.keys()) scene.registerUmbraMoonlightEnemyLife(enemy);
      if (phase4) {
        if (!growth || (scene.playerSkills.umbraBloodSpike && !scene.umbraBloodSpikeRuntime)) scene.initializeUmbraBloodSpikeRuntime();
        for (const enemy of arena.enemies.keys()) scene.registerUmbraBloodSpikeEnemyLife(enemy);
      }
      if (phase5) {
        if (!growth || (scene.playerSkills.umbraPhantomNova && !scene.umbraPhantomNovaRuntime)) scene.initializeUmbraPhantomNovaRuntime();
        for (const enemy of arena.enemies.keys()) scene.registerUmbraPhantomNovaEnemyLife(enemy);
        arena.updateNovaFx();
        arena.novaHudNextAt = 0;
      }
      arena.refreshHud();
    };
    arena.setConfiguration = function (id) {
      if (!arena.configurations.some(c => c.id === id)) throw new Error("Unknown arena configuration");
      arena.configId = id; scene.resetDrive();
    };
    arena.setContactEnabled = value => { arena.contactEnabled = value === true; arena.refreshHud(); };
    arena.setAttackEnabled = value => { arena.attackEnabled = value === true; scene.resetDrive(); };
    arena.setSpikeAttackEnabled = value => { arena.spikeAttackEnabled = value === true; scene.resetDrive(); };
    arena.setWeaponSelection = selection => {
      if (growth) return;
      if (phase5 ? !Object.hasOwn(NOVA_WEAPONS, selection) : !phase4 || !["moonlight", "bloodSpike", "both", "none"].includes(selection)) return;
      arena.weaponSelection = selection; scene.resetDrive();
    };
    arena.setNovaSlots = value => {
      if (growth) return;
      if (!phase5) return;
      arena.novaSlots = [1, 2, 3].includes(value) ? value : 1;
      scene.resetDrive();
    };
    arena.resetGrowthPreset = stage => {
      if (!growth || (stage !== null && ![1, 4, 6, 8].includes(stage))) return false;
      arena.growthPresetStage = stage;
      if (triad) arena.triadComparisonId = null;
      scene.resetDrive();
      return true;
    };
    arena.setCoreComparisonWeapons = selection => {
      if (!core || !["all", "moonlight", "bloodSpike", "phantomNova"].includes(selection)) return false;
      arena.coreComparisonWeapons = selection;
      if (triad) arena.triadComparisonId = null;
      if (!arena.growthPresetStage) arena.growthPresetStage = 4;
      scene.resetDrive();
      return true;
    };
    arena.setTriadComparison = id => {
      if (!triad) return false;
      const plan = TRIAD_COMPARISONS.find(item => item.id === id);
      if (!plan) return false;
      arena.triadComparisonId = id; arena.coreComparisonWeapons = "all";
      arena.growthPresetStage = Math.max(...plan.stages);
      scene.resetDrive();
      return true;
    };
    arena.setEquipmentFixture = id => {
      if (!equipment || !arena.equipmentFixtures.some(entry => entry.id === id)) return false;
      scene.equipmentFixtureId = id;
      scene.resetDrive();
      return true;
    };
    arena.setEquipmentStartDepth = depth => {
      if (!equipment || ![1, 6].includes(depth)) return false;
      scene.equipmentStartDepth = depth;
      scene.resetDrive();
      return true;
    };
    arena.setNovaAttackEnabled = value => {
      if (!phase5) return;
      arena.novaAttackEnabled = value === true; scene.resetDrive();
    };
    arena.setFxMode = mode => {
      arena.fxMode = ["image", "fallback", "off"].includes(mode) ? mode : "image";
      arena.effects.forEach(fx => fx.object.setVisible(arena.fxMode !== "off"));
      for (const fx of arena.spikeEffects.values()) { fx.object?.destroy(); fx.ground?.destroy(); }
      arena.spikeEffects.clear(); // Rebuild presentation only from live casts, without resetting attacks.
      if (phase5) { arena.clearNovaEffects(); arena.updateNovaFx(); }
      if (final) { arena.clearFinalFx(); arena.updateFinalFx(); }
      if (core) for (const record of arena.enemies.values()) arena.renderEnemy(record);
      arena.numbers.forEach(number => number.text.setVisible(arena.fxMode !== "off")); arena.refreshHud();
    };


    scene.onUmbraMoonlightAcceptedHit = hit => {
      arena.lastHit = hit; arena.spawnHitFx(hit);
      if (final && hit.finalProfile?.finalId === "execution") arena.spawnFinalMark("execution", "umbraMoonlight", hit);
    };
    scene.onUmbraBloodSpikeRuntimeCleared = () => arena.clearSpikeEffects();


    // Read the bounded numeric view only. Presentation never advances the clock,
    // searches targets, creates physics bodies, or decides a slot's combat state.






    if (final) scene.onUmbraFinalSecondaryAcceptedHit = hit => arena.spawnFinalMark("prism", hit.skillId, hit);
    if (phase5) {
      scene.onUmbraPhantomNovaPulse = hit => {
        arena.spawnNovaPulseFx(hit);
        if (final && hit.finalProfile?.finalId === "execution") arena.spawnFinalMark("execution", "umbraPhantomNova", hit);
      };
      scene.onUmbraPhantomNovaRuntimeCleared = () => { arena.clearNovaEffects(); arena.novaHudNextAt = 0; };
      scene.onUmbraPhantomNovaDepthChanged = () => { arena.clearNovaEffects(); arena.novaHudNextAt = 0; };
    }

    [scene.statLabel, scene.energyLabel, scene.stateLabel, scene.evasionLabel].forEach(object => object.setVisible(false));
    arena.info = label(933, 165, "", 14);
    arena.totals = label(933, 261, "", 13);
    arena.targetInfo = label(933, 332, "", 13);
    arena.reasonInfo = label(933, 411, "", 12, "#e9cf9d").setWordWrapWidth(329);
    arena.contactButton = button(1019, phase5 ? 475 : 463, 170, "", () => arena.setContactEnabled(!arena.contactEnabled));
    arena.attackButton = button(1191, phase5 ? 475 : 463, 157, "", () => {
      if (growth) { arena.resetGrowthPreset(null); return; }
      if (!phase4) arena.setAttackEnabled(!arena.attackEnabled);
      else { const modes = phase5 ? Object.keys(NOVA_WEAPONS) : ["bloodSpike", "moonlight", "both", "none"]; arena.setWeaponSelection(modes[(modes.indexOf(arena.weaponSelection) + 1) % modes.length]); }
    });
    arena.fxButton = button(1019, phase5 ? 514 : 502, 170, "", () => arena.setFxMode({ image: "fallback", fallback: "off", off: "image" }[arena.fxMode]));
    button(1191, phase5 ? 514 : 502, 157, "配置切替", () => {
      const next = (arena.configurations.findIndex(c => c.id === arena.configId) + 1) % arena.configurations.length;
      arena.setConfiguration(arena.configurations[next].id);
    });
    arena.configurationLabel = label(155, 610, "", 14, "#bbeddc").setWordWrapWidth(560);
    arena.configurationHint = label(155, 637, "", 12).setWordWrapWidth(560);
    if (growth) {
      arena.endPanel = ownUi(scene.ui(scene.add.rectangle(455, 405, 640, 174, 0x08151f, 0.97)
        .setStrokeStyle(2, 0xffb38c))).setDepth(110).setVisible(false);
      arena.endNotice = label(455, 358, "試走終了（AP 0）", 27, "#ffd0ad").setOrigin(0.5).setDepth(111).setVisible(false);
      arena.endHint = label(455, 416, "接触被弾でAPが尽きたため、戦闘を停止しました。\n[R] または上部リセットで新規試験\n攻撃の観測を続ける場合は、接触被弾OFF → リセット", 16)
        .setOrigin(0.5).setAlign("center").setDepth(111).setVisible(false);
    }
    arena.passiveButtons = growth ? [
      button(244, 574, 172, "新規比較 S1 / リセット", () => arena.resetGrowthPreset(1)),
      button(428, 574, 172, "新規比較 S4 / リセット", () => arena.resetGrowthPreset(4)),
      button(612, 574, 172, "新規比較 S6 / リセット", () => arena.resetGrowthPreset(6)),
      button(796, 574, 172, "新規比較 S8 / リセット", () => arena.resetGrowthPreset(8))
    ] : [
      button(246, 574, 185, "Reactor Overcharge +", () => arena.applyPassive("overchargeBolt")),
      button(447, 574, 185, "Fire Control Link +", () => arena.applyPassive("rapidSigil"))
    ];
    if (core) arena.coreWeaponsButton = button(768, 536, 226, "比較武装: 3武装 / 新規リセット", () => {
      const selections = ["all", "moonlight", "bloodSpike", "phantomNova"];
      arena.setCoreComparisonWeapons(selections[(selections.indexOf(arena.coreComparisonWeapons) + 1) % selections.length]);
    });
    if (phase5) {
      arena.info.setFontSize(11).setLineSpacing(0);
      arena.totals.setY(245).setFontSize(11).setLineSpacing(0);
      arena.targetInfo.setY(306).setFontSize(10).setLineSpacing(0);
      arena.reasonInfo.setY(core ? 416 : 429).setFontSize(10).setLineSpacing(0);
      arena.novaSlotsButton = growth ? arena.passiveButtons[2]
        : button(646, 574, 184, "", () => arena.setNovaSlots(arena.novaSlots % 3 + 1));
    }
    if (triad) {
      arena.triadPanel = ownUi(scene.ui(scene.add.rectangle(680, 218, 432, 114, 0x071622, 0.9).setStrokeStyle(1, 0x63a8b5)));
      arena.triadInfo = label(475, 166, "", 10).setWordWrapWidth(410).setLineSpacing(0);
      arena.triadComparisonButton = button(449, 499, 690, "TRIAD比較: 自由 / 新規リセット", () => {
        const index = TRIAD_COMPARISONS.findIndex(item => item.id === arena.triadComparisonId);
        arena.setTriadComparison(TRIAD_COMPARISONS[(index + 1) % TRIAD_COMPARISONS.length].id);
      });
      const signature = snapshot => [snapshot?.core?.id, snapshot?.final?.id, snapshot?.buildId, snapshot?.suppressed].join("|");
      scene.onUmbraTriadSnapshotChanged = (snapshot, previous) => {
        if (!snapshot || !previous || signature(snapshot) === signature(previous) || snapshot.suppressed
          || arena.triadNotice?.revision === snapshot.revision || snapshot !== scene.getUmbraTriadSnapshot?.()) return;
        arena.triadNotice = { revision: snapshot.revision, until: arena.elapsedMs + 1400 };
        arena.triadNoticeCount++;
      };
    }
    if (equipment) {
      arena.equipmentInfo = label(29, 188, "", 10).setWordWrapWidth(412).setLineSpacing(0);
      arena.equipmentButton = button(343, 536, 578, "RAM装備 / 新規リセット", () => {
        const index = arena.equipmentFixtures.findIndex(entry => entry.id === scene.equipmentFixtureId);
        arena.setEquipmentFixture(arena.equipmentFixtures[(index + 1) % arena.equipmentFixtures.length]?.id);
      });
      arena.equipmentDepthButton = button(316, 686, 330, "開始Depth 1 / 新規リセット", () => {
        arena.setEquipmentStartDepth(scene.equipmentStartDepth === 6 ? 1 : 6);
      });
    }
    arena.refreshEquipmentHud = function () {
      if (!equipment || !arena.equipmentInfo) return;
      const snapshot = scene.gameOver ? scene.umbraEquipmentEndSnapshot : scene.getUmbraEquipmentSnapshot?.();
      const config = arena.equipmentFixtures.find(entry => entry.id === scene.equipmentFixtureId);
      const set = (object, value) => { if (object.text !== value) object.setText(value); };
      set(arena.equipmentButton.caption, `RAM装備: ${config?.label || "なし"} / 切替は新規リセット`);
      set(arena.equipmentDepthButton.caption, `開始Depth ${scene.equipmentStartDepth === 6 ? 6 : 1} / 新規リセット`);
      if (!snapshot) { set(arena.equipmentInfo, "装備・OVL攻撃補正 / 非作動\n現在UMBRAの明示Contextが必要\n開始FRAME・BOOSTER・COREは既存計算"); return; }
      const now = Number(scene.time?.now) || 0;
      const key = [snapshot.equipmentSnapshotId, snapshot.overlimitRevision, snapshot.lastSelectionSource, scene.gameOver,
        scene.stats?.bulletDamage, scene.stats?.fireInterval, snapshot.pendingFinalSkillIds?.join(","), snapshot.pendingDeepCount,
        snapshot.currentSelection?.id, ...TRIAD_SKILL_IDS.map(id => scene.playerSkills?.[id]?.stageIndex),
        (scene.gameOver ? scene.umbraTriadEndSnapshot : scene.getUmbraTriadSnapshot?.())?.revision].join("|");
      if (key === arena.equipmentHudKey && now < arena.equipmentHudNextAt) return;
      arena.equipmentHudKey = key; arena.equipmentHudNextAt = now + NOVA_DISPLAY.hudIntervalMs;
      const level = value => ["0", "I", "II"][value] || "0";
      const source = value => ({ normal: "通常", levelUp: "通常", finalMutationOverlimitBonus: "Final", deepLevelOverlimitBonus: "Deep" }[value] || value || "—");
      const names = TRIAD_SKILL_IDS.map((id, index) => `${["M", "S", "N"][index]}${level(snapshot.overlimitLevels?.[id])}`).join(" ");
      const rows = [`${scene.gameOver ? "終了時 " : ""}装備${String(snapshot.equipmentSnapshotId).replace(/^umbra-equipment-/, "E")} SENSOR×${fmt(snapshot.sensorMultiplier, 4)} ARM×${fmt(snapshot.armamentMultiplier, 3)}`,
        `COMBAT LINK ${level(snapshot.combatLinkLevel)} / OVL上限${level(snapshot.overlimitCap)} / ${names} r${snapshot.overlimitRevision}`,
        `取得源 ${source(snapshot.lastSelectionSource)} / 待機 Final${snapshot.pendingFinalSkillIds?.length || 0} Deep${snapshot.pendingDeepCount || 0}`];
      if (!scene.gameOver) {
        const stats = [scene.getUmbraMoonlightEffectiveStats?.(), scene.getUmbraBloodSpikeEffectiveStats?.(), scene.getUmbraPhantomNovaEffectiveStats?.()];
        stats.forEach((value, index) => {
          if (!value) { rows.push(`${["M", "S", "N"][index]} 未取得`); return; }
          const raw = index === 2 ? value.orbitRawDamage : value.rawDamage;
          const profile = index === 2 ? value.orbitFinalProfile : value.finalProfile;
          const pipeline = (base, captured) => {
            const main = scene.getUmbraFinalMainRawDamage(captured, { hp: 10, maxHp: 10 }, base);
            const stages = scene.getUmbraEquipmentDamageBreakdown(main, captured?.equipmentProfile);
            return `${stages.inputRaw}→${stages.overlimitRaw}→${stages.equipmentRaw}`;
          };
          const period = index === 0 ? value.rehitMs : index === 1 ? value.intervalMs : `${value.orbitIntervalMs}/${value.deployedIntervalMs}`;
          rows.push(index === 2
            ? `N 強 周${pipeline(raw, profile)} 残${pipeline(value.deployedRawDamage, value.deployedFinalProfile)} T${period}ms`
            : `${["M", "S"][index]} 強 主→OVL→ARM ${pipeline(raw, profile)} T${period}ms`);
        });
      } else rows.push("攻撃は停止 / Rで新規run・OVL0", "取得済み段階は終了記録だけ", "Deep合成XP・自然到達の証明ではありません");
      set(arena.equipmentInfo, rows.join("\n"));
    };
    arena.refreshTriadHud = function () {
      if (!triad || !arena.triadInfo) return;
      const snapshot = scene.gameOver ? scene.umbraTriadEndSnapshot : scene.getUmbraTriadSnapshot?.();
      const notice = Boolean(!scene.gameOver && arena.triadNotice && snapshot
        && arena.triadNotice.revision === snapshot.revision && arena.elapsedMs < arena.triadNotice.until);
      const key = [snapshot?.revision, snapshot?.reason, snapshot?.suppressed, scene.gameOver, notice, arena.triadComparisonId].join("|");
      if (key === arena.triadHudKey) return;
      arena.triadHudKey = key;
      const plan = TRIAD_COMPARISONS.find(item => item.id === arena.triadComparisonId);
      arena.triadComparisonButton.caption.setText(`TRIAD比較: ${plan?.label || "自由"} / 切替は新規リセット`);
      arena.triadPanel.setStrokeStyle(notice ? 2 : 1, notice ? 0xbaf3d8 : 0x63a8b5);
      if (!snapshot) { arena.triadInfo.setText("TRIAD / 非作動\n専用Context・実行中UMBRAが必要\n保存・Atlas・報酬は未接続"); return; }
      const axis = (value, count) => `${value?.type === "standby" ? "STANDBY" : value?.level === 1 ? "LINK I" : value?.sourceId === "mixed" ? "MATRIX II / 混成" : "MATRIX II"} ${count || 0}/3 ${value?.displayName || ""}`;
      const m = snapshot.modifiers || {}, number = key => fmt(m[key] ?? 1, 3);
      const title = snapshot.completeBuild ? `TRIAD完成 ${snapshot.completeBuild.displayName || snapshot.displayName}` : "TRIAD / ラン内自動集計";
      arena.triadInfo.setText(`${scene.gameOver ? "終了時 " : notice ? "成立更新 " : ""}${title} / rev${snapshot.revision}${snapshot.suppressed ? " 抑止中" : ""}\nCore ${axis(snapshot.core, snapshot.selectedCounts?.core)}\nFinal ${axis(snapshot.final, snapshot.selectedCounts?.final)}\n対象 ${snapshot.targetSkillIds.join(" / ")}\n主×${number("skillDamageMultiplier")} 強対象×${number("executionDamageMultiplier")} 副×${number("prismDamageMultiplier")}\n制御量/主期限×${number("controlMultiplier")} 領域R/寿命×${number("singularityMultiplier")}\nDASH×${number("dashStaminaDrainMultiplier")} OD×${number("overdriveGaugeMultiplier")} Sync×${number("robotSyncGaugeMultiplier")}`);
    };
    arena.applyPassive = function (id) {
      if (growth) return;
      if (!active()) return;
      const candidate = scene.getPassiveUpgradeChoices().find(choice => choice.id === id);
      if (candidate) candidate.onSelect(); arena.refreshHud();
    };
    arena.refreshHud = function () {
      if (!arena.info || arena.destroyed || !scene.stats) return;
      if (triad) arena.refreshTriadHud();
      if (equipment) arena.refreshEquipmentHud();
      for (const object of [arena.endPanel, arena.endNotice, arena.endHint]) object?.setVisible(Boolean(scene.gameOver));
      if (growth) { arena.refreshGrowthHud(); return; }
      if (phase5) { arena.refreshNovaHud(); return; }
      const stats = scene.getUmbraMoonlightEffectiveStats?.() || {};
      const snapshot = scene.getUmbraMoonlightSnapshot?.();
      const counts = snapshot?.counts || {}, hit = snapshot?.lastHit || arena.lastHit;
      const target = hit ? snapshot?.targets?.find(entry => entry.lifeId === hit.lifeId) : snapshot?.targets?.[0];
      arena.info.setText(`${scene.mechId === "umbraSeraph" ? "MOONLIGHT 検証S1 / 性能は仮値" : "比較機体 / MOONLIGHT未取得"}\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)}  EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\n威力 ${fmt(stats.damageBeforeTargetModifiers, 2)}  再命中 ${fmt(stats.rehitMs)} ms\n半径60 + body / 離脱余白12\nReactor Lv${scene.passiveLevels.overchargeBolt || 0} / Fire Control Lv${scene.passiveLevels.rapidSigil || 0}`);
      arena.totals.setText(`幾何候補 ${counts.candidates || 0} / 受付 ${counts.attempts || 0}\n成功 ${counts.accepted || 0} / HP減少 ${fmt(counts.hpDamage, 1)} / 撃破 ${counts.kills || 0}\nFX ${arena.fxCounts.shown}（同時 ${arena.effects.length}/${maxImpactFx()}）省略 ${arena.fxCounts.capped + arena.fxCounts.hidden}`);
      arena.targetInfo.setText(`対象 ${target?.lifeId ?? hit?.lifeId ?? "—"}  HP ${fmt(target?.hp ?? hit?.hpAfter)}\n最終DMG ${fmt(hit?.damage, 1)}  通過 ${target?.passId ?? hit?.passId ?? "—"}\n再命中待ち ${fmt(target?.waitMs)} ms / ${target?.reason || (hit?.killed ? "撃破済み" : "未判定")}\n接触HP減少 ${fmt(arena.contact.hpDamage)} / 実kill ${scene.runStats?.kills || 0} / XP個 ${scene.xpOrbs?.getLength?.() || 0}`);
      const skips = Object.entries(snapshot?.skips || {}).filter(([, value]) => value > 0).slice(-3).map(([key, value]) => `${key}:${value}`).join(" / ");
      arena.reasonInfo.setText(`${scene.gameOver ? "AP 0・戦闘停止 / Rで新規試験" : snapshot?.blockReason || skips || "見送り理由: まだなし"}\nconsumer errors ${snapshot?.errors || 0}`);
      arena.contactButton.caption.setText(`接触被弾 ${arena.contactEnabled ? "ON（既存受付）" : "OFF（観測）"}`);
      arena.attackButton.caption.setText(phase4 ? `武装: ${{bloodSpike:"SPIKE",moonlight:"MOON",both:"両方",none:"なし"}[arena.weaponSelection]}` : `MOONLIGHT ${arena.attackEnabled ? "ON" : "OFF"}`);
      arena.fxButton.caption.setText(`FX ${arena.fxMode === "image" ? "画像" : arena.fxMode === "fallback" ? "簡易" : "OFF"}`);
      const configuration = arena.configurations.find(c => c.id === arena.configId);
      arena.configurationLabel.setText(`配置: ${configuration.label}`); arena.configurationHint.setText(configuration.hint);
      if (phase4) {
        const spike = scene.getUmbraBloodSpikeSnapshot?.(), spikeStats = scene.getUmbraBloodSpikeEffectiveStats?.() || {};
        const sc = spike?.counts || {}, liveCast = spike?.casts?.[spike.casts.length - 1], cast = liveCast || spike?.lastCast;
        const spikeLabel = scene.playerSkills.umbraBloodSpike ? (scene.bloodSpikeAttackEnabled !== false
          ? `SPIKE 威力${fmt(spikeStats.damageBeforeTargetModifiers, 2)} / ${fmt(spikeStats.intervalMs)}ms` : "SPIKE 攻撃OFF") : "SPIKE 未取得";
        const moonLabel = scene.playerSkills.umbraMoonlight ? (scene.moonlightAttackEnabled !== false && scene.verificationContext.traceNotifications !== false
          ? `MOON 威力${fmt(stats.damageBeforeTargetModifiers, 2)} / ${fmt(stats.rehitMs)}ms` : "MOON 攻撃/通知OFF") : "MOON 未取得";
        arena.info.setText(`${scene.mechId === "umbraSeraph" ? "専用武装 検証S1 / 性能は仮値" : "比較機体 / 専用武装未取得"}\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)}  EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\n${spikeLabel}\n${moonLabel}\nReactor Lv${scene.passiveLevels.overchargeBolt || 0} / Fire Control Lv${scene.passiveLevels.rapidSigil || 0}`);
        arena.totals.setText(`SPIKE cast ${sc.casts || 0} / 存在 ${spike?.casts?.length || 0}/${spikeStats.maxActiveCasts || 3}\n有効対象 ${sc.eligible || 0} / 受付成功 ${sc.accepted || 0} / 撃破 ${sc.kills || 0}\nMOON 成功 ${counts.accepted || 0} / FX ${arena.effects.length}/${maxImpactFx()}`);
        arena.targetInfo.setText(`cast ${cast?.castId ?? "—"} / 対象 ${cast?.targetLifeId ?? "—"}\n固定 (${fmt(cast?.position?.x, 1)}, ${fmt(cast?.position?.y, 1)}) / コマ ${liveCast ? liveCast.frameIndex + 1 : cast ? "終了" : "—"}\n突上 ${fmt(cast?.impactDueAtMs)} → ${cast?.appliedAtMs == null ? "—" : fmt(cast.appliedAtMs)} ms\n次castまで ${fmt(spike?.nextCastRemainingMs)} ms / 接触減少${fmt(arena.contact.hpDamage)}`);
        const spikeSkips = Object.entries(spike?.skips || {}).filter(([, value]) => value > 0).slice(-2).map(([key,value])=>`${key}:${value}`).join(" / ");
        arena.reasonInfo.setText(`${scene.gameOver ? "AP 0・戦闘停止 / Rで新規試験" : spike?.blockReason || spikeSkips || "探索可能"}\nerrors S${spike?.errors || 0} / M${snapshot?.errors || 0}${arena.hitReactionMode === "productionBody" ? " / 本番body反応" : ""}`);
      }
    };
    arena.refreshGrowthHud = function () {
      if (scene.gameOver) {
        // End-of-test presentation reads the retained acquisition records only.
        // The live combat resolver must still reject dead runs and owners.
        const ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"], names = ["MOON", "SPIKE", "NOVA"];
        const selected = scene.skillMutationState?.umbraGrowthRun === scene.umbraGrowthRun ? scene.skillMutationState?.entries : null;
        const acquired = ids.map((id, i) => {
          const state = scene.playerSkills[id], entry = selected?.[id];
          return `${names[i]} ${state ? `S${state.stageIndex + 1}${core && entry?.stage4Selected ? ` ${entry.core.toUpperCase()}` : ""}${final && entry?.stage8Selected ? ` + ${entry.final.toUpperCase()}` : ""}` : "未取得"}`;
        });
        const set = (object, value) => { if (object.text !== value) object.setText(value); };
        set(arena.info, `試走終了 / AP 0\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)} EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\n終了時の取得状態（攻撃は停止）\n${acquired.join("\n")}`);
        set(arena.totals, `Lv${scene.stats.level} / D${scene.stageDepth}\nこの試走は終了しています。\n[R]で同じ配置から新規試験`);
        set(arena.targetInfo, "接触被弾ONでは敵への接触でAPが減ります。\n観測用: 接触被弾OFF → リセット\nOFFへの切替だけではAPは回復しません。\n新規試験ではStage/Coreも初期化します。");
        if (final) set(arena.targetInfo, "接触被弾ONでは敵への接触でAPが減ります。\n観測用: 接触被弾OFF → リセット\nOFFへの切替だけではAPは回復しません。\n新規試験ではStage/Core/Finalも初期化します。");
        set(arena.reasonInfo, "AP0による試走終了\n停止/再開では復帰しません。[R]で新規試験");
        set(arena.contactButton.caption, `接触被弾 ${arena.contactEnabled ? "ON（既存受付）" : "OFF（観測）"}`);
        return;
      }
      const now = Number(scene.time.now) || 0;
      const ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"];
      const stages = ids.map(id => scene.getUmbraActiveSkillStage?.(id)?.stage || 0);
      const coreNames = core ? ids.map(id => scene.getUmbraSelectedCoreId?.(id) || "none") : [];
      const finalNames = final ? ids.map(id => scene.getUmbraSelectedFinalId?.(id) || "none") : [];
      const key = [stages.join(","), scene.pendingLevelUps, scene.stats.level, scene.drivePaused, scene.selectionObjects?.length,
        arena.fxMode, arena.growthPresetStage, scene.mechId, scene.gameOver, scene.passiveLevels.overchargeBolt, scene.passiveLevels.rapidSigil,
        ...(core ? [coreNames.join(","), scene.skillMutationState?.pendingQueue?.length] : []), ...(final ? [finalNames.join(",")] : []),
        ...(equipment ? [scene.getUmbraEquipmentSnapshot?.()?.overlimitRevision] : [])].join("|");
      if (now < arena.novaHudNextAt && key === arena.novaHudStateKey) return;
      arena.novaHudNextAt = now + NOVA_DISPLAY.hudIntervalMs; arena.novaHudStateKey = key; arena.novaHudUpdates++;
      const set = (object, value) => { if (object.text !== value) object.setText(value); };
      const moon = scene.getUmbraMoonlightEffectiveStats?.() || {}, spike = scene.getUmbraBloodSpikeEffectiveStats?.() || {};
      const ns = scene.getUmbraPhantomNovaEffectiveStats?.() || {}, nova = scene.getUmbraPhantomNovaSnapshot?.();
      const slots = nova?.slots || [], clock = Number(nova?.combatTimeMs) || 0;
      const remain = value => Number.isFinite(value) ? fmt(Math.max(0, value - clock) / 1000, 2) : "—";
      const nextStage = (index, text) => stages[index] ? `S${stages[index]}${core ? ` ${coreNames[index].toUpperCase()}` : ""} ${text}` : "未取得 / Unlock候補";
      set(arena.info, `${arena.growthPresetStage ? `比較用 ${core ? NOVA_WEAPONS[arena.coreComparisonWeapons].label : "全"}S${arena.growthPresetStage}直接指定 / 到達証明ではありません` : "連続成長 / 初期MOON S1・他はUnlock"}\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)} EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\nMOON ${nextStage(0, `raw${fmt(moon.rawDamage)} R${fmt(moon.passageRadius)} / ${fmt(moon.rehitMs)}ms`)}\nSPIKE ${nextStage(1, `次cast raw${fmt(spike.rawDamage)} R${fmt(spike.impactRadius)} / ${fmt(spike.intervalMs)}ms`)}\nNOVA ${nextStage(2, `周回 raw${fmt(ns.orbitRawDamage)} 射程${fmt(ns.orbitRange)} / ${fmt(ns.orbitIntervalMs)}ms`)}\nNOVA 次設置 raw${fmt(ns.deployedRawDamage)} 射程${fmt(ns.deployedRange)} / ${fmt(ns.deployedIntervalMs)}ms`);
      const countState = name => slots.filter(slot => slot.state === name).length;
      const milestones = scene.umbraGrowthRun?.deferredMilestones || [];
      const skillSelections = Math.max(0, stages[0] - 1) + stages[1] + stages[2];
      const passiveSelections = Object.values(scene.passiveLevels || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      set(arena.totals, `Lv${scene.stats.level} / D${scene.stageDepth} / pending ${scene.pendingLevelUps} / Opening残${scene.startingUpgradeSelectionsRemaining}\n技能 ${skillSelections}/23 / パッシブ ${passiveSelections} / 基準27選択\n枠${slots.length}/${stages[2] ? ns.slotCount : 0}: 周回${countState("ORBITING")} 残留${countState("DEPLOYED")} 再生${countState("REGENERATING")}\nMutation接続待ち ${milestones.length}/6 / Reactor ${scene.passiveLevels.overchargeBolt || 0} Fire ${scene.passiveLevels.rapidSigil || 0}`);
      if (core) set(arena.totals, `Lv${scene.stats.level} D${scene.stageDepth} pending ${scene.pendingLevelUps} Opening残${scene.startingUpgradeSelectionsRemaining}\n技能${skillSelections}/23 パッシブ${passiveSelections} / Core${coreNames.filter(id => id !== "none").length}/3\nCore待ち${scene.skillMutationState?.pendingQueue?.length || 0} / Final未実装${milestones.filter(item => item.phase === "final").length}\n枠${slots.length}/${stages[2] ? ns.slotCount : 0}: 周回${countState("ORBITING")} 残留${countState("DEPLOYED")} 再生${countState("REGENERATING")}`);
      set(arena.targetInfo, slots.length ? slots.map(slot => {
        const saved = slot.deployedSnapshot;
        const detail = slot.state === "DEPLOYED" ? `保存${core ? ` ${(saved?.coreProfile?.coreId || "none").toUpperCase()}` : ""} raw${fmt(saved?.rawDamage)} 射程${fmt(saved?.range)} ${fmt(saved?.intervalMs)}ms`
          : core ? slot.state === "REGENERATING" ? "配置時の再生成期限を保持 / 現Coreへ遡及なし"
            : `最新周回 ${coreNames[2].toUpperCase()} / 次pulse時刻を保持` : `最新周回 射程${fmt(ns.orbitRange)} / 新枠も初回待ち`;
        return `#${slot.slotId} ${slot.state} / cycle ${slot.cycleGeneration}\n${detail}\n次${remain(slot.nextPulseAtMs)}s 残${remain(slot.deployedUntilMs)}s 再${remain(slot.regenerateAtMs)}s`;
      }).join("\n") : "NOVA未取得 / 枠・予約なし\n基本Stage成長のみ\nMutationはPhase 6C接続待ち\nMOON: 拡大時は新外縁への再離脱が必要\nSPIKE: 単体威力・周期は固定、次castから拡大");
      const ignores = [bridge.ignoredNovaSlots ? "旧novaSlotsは無視・Stage枠数優先" : "", bridge.ignoredWeaponFlags ? "旧武装指定は無視・初期Moonのみ" : ""].filter(Boolean);
      set(arena.reasonInfo, `${scene.gameOver ? "AP0・停止 / Rで新規試験" : ignores.join(" / ") || "合成XPはRAMのみ / MutationはPhase 6C接続待ち"}\nerrors M${scene.umbraMoonlightRuntime?.errors || 0} S${scene.umbraBloodSpikeRuntime?.errors || 0} N${nova?.errors || 0}`);
      if (core) {
        const cast = scene.getUmbraBloodSpikeSnapshot?.()?.casts?.slice(-1)[0];
        set(arena.reasonInfo, `${scene.gameOver ? "AP0・停止 / Rで新規試験" : "L: 通常pending → Core FIFO → 次Lv"}\n${cast ? `旧/現cast #${cast.castId} ${(cast.coreProfile?.coreId || "none").toUpperCase()} raw${fmt(cast.rawDamage)} R${fmt(cast.radius)}` : "SPIKE存在なし / 次castから最新Core"}\nerrors M${scene.umbraMoonlightRuntime?.errors || 0} S${scene.umbraBloodSpikeRuntime?.errors || 0} N${nova?.errors || 0}`);
        if (!slots.length) set(arena.targetInfo, `NOVA未取得 / 枠・予約なし\nCoreはS4以上の到達後に選択\n最新Coreと既存cast/球は別profile\nFinal未実装 / 減速は完全停止ではありません\nReactor Overcharge ${scene.passiveLevels.overchargeBolt || 0}\nFire Control ${scene.passiveLevels.rapidSigil || 0}`);
        set(arena.coreWeaponsButton.caption, `比較武装: ${NOVA_WEAPONS[arena.coreComparisonWeapons].label} / 新規リセット`);
      }
      if (final) {
        const view = scene.getUmbraFinalVisualState?.() || { fields: [] }, fields = view.fields || [];
        const cast = scene.getUmbraBloodSpikeSnapshot?.()?.casts?.slice(-1)[0];
        const comparisonPlan = triad ? TRIAD_COMPARISONS.find(item => item.id === arena.triadComparisonId) : null;
        const comparisonStages = comparisonPlan ? comparisonPlan.stages.map(stage => `S${stage}`).join("/") : `S${arena.growthPresetStage}`;
        const form = (index, prefix) => stages[index] ? `${prefix} S${stages[index]} ${coreNames[index].toUpperCase()} + ${finalNames[index].toUpperCase()}` : `${prefix} 未取得 / Unlock候補`;
        const mainControl = [moon, spike, ns].map((stats, index) => {
          const setting = stats.coreProfile?.controlSettings;
          const effective = triad && setting ? scene.getUmbraControlEffectStats?.(stats.coreProfile) : null;
          return setting ? `${["M", "S", "N"][index]}${effective ? `${Number(fmt(effective.multiplier, 3))}/${Number(fmt(effective.durationMs, 2))}` : `${setting.normalMultiplier}/${setting.durationMs}`}` : null;
        }).filter(Boolean);
        set(arena.info, `${arena.growthPresetStage ? `新規比較 ${comparisonStages} / 到達証明ではありません` : "連続成長 / Moon S1＋Opening3から"}\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)} EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\n${form(0, "MOON")}\n${form(1, "SPIKE")}\n${form(2, "NOVA")}\n${mainControl.length ? `主CONTROL 通常 ${mainControl.join(" ")}ms${triad ? "" : " / field別期限"}` : `強対象補正前raw M${fmt(moon.rawDamage)} S${fmt(spike.rawDamage)} N${fmt(ns.orbitRawDamage)}/${fmt(ns.deployedRawDamage)}`}`);
        set(arena.totals, `Lv${scene.stats.level} D${scene.stageDepth} pending ${scene.pendingLevelUps} Opening残${scene.startingUpgradeSelectionsRemaining}\n技能${skillSelections}/23 / パッシブ${passiveSelections} / 基準33操作\nCore${coreNames.filter(id => id !== "none").length}/3 Final${finalNames.filter(id => id !== "none").length}/3 選択待ち${scene.skillMutationState?.pendingQueue?.length || 0}\nfield ${fields.length}/6 / PRISM成功線${arena.finalFxCounts.secondaryShown}（表示省略${arena.finalFxCounts.capped + arena.finalFxCounts.hidden}）`);
        const slotLines = slots.map(slot => {
          const saved = slot.deployedSnapshot;
          const short = value => equipment ? (value || "none").slice(0, 3).toUpperCase() : value || "none";
          const profile = slot.state === "DEPLOYED" ? `${short(saved?.coreProfile?.coreId)}+${short(saved?.finalProfile?.finalId)}` : `${short(coreNames[2])}+${short(finalNames[2])}`;
          const equipProfile = slot.state === "DEPLOYED" ? saved?.finalProfile?.equipmentProfile : ns.orbitFinalProfile?.equipmentProfile;
          const ovl = equipment ? ` O${equipProfile?.overlimitLevel ?? 0}r${equipProfile?.overlimitRevision ?? "—"}` : "";
          return slot.state === "REGENERATING" ? `#${slot.slotId} REGEN 旧期限保持 / 再${remain(slot.regenerateAtMs)}s`
            : `#${slot.slotId} ${slot.state === "DEPLOYED" ? "DEP" : "ORB"} ${profile}${triad ? ` T${slot.state === "DEPLOYED" ? saved?.finalProfile?.triadProfile?.revision ?? saved?.coreProfile?.triadProfile?.revision ?? "—" : scene.getUmbraTriadSnapshot?.()?.revision ?? "—"}` : ""}${ovl} ${slot.state === "DEPLOYED" ? `raw${fmt(saved?.rawDamage)} 残${remain(slot.deployedUntilMs)}s` : `次${remain(slot.nextPulseAtMs)}s`}`;
        });
        const compact = value => String(value || "").replace(/ /g, "").replace(/ダメージ/g, "dmg").replace(/半径/g, "R")
          .replace(/成功点から/g, "R").replace(/寿命/g, "寿").replace(/各field最大/g, "field上限").replace(/Boss系/g, "Boss")
          .replace(/全slot共有待ち/g, "全slot ICD").replace(/武装待ち/g, "ICD").replace(/追加ICDなし/g, "ICDなし");
        const finalLines = ids.flatMap((id, index) => {
          const data = scene.buildUmbraFinalCard?.(id, finalNames[index])?.umbraFinalCard;
          const prefix = ["M", "S", "N"][index];
          if (!data) return [`${prefix} Final未選択 / S8＋Coreの後に正規3択`];
          const chips = data.chips.map(chip => compact(chip.label));
          if (data.finalId === "execution") return [`${prefix} EXEC ${chips.filter(chip => chip.includes("raw") || (equipment && /^(主|周回|残留)A強/.test(chip))).join(" / ")}`,
            "強:B/E/N またはHP比≥62% または最大HP≥36"];
          if (data.finalId === "prism") return [`${prefix} PRISM ${chips[0]}`, `${chips[1]} / ${chips[2]}`];
          return [`${prefix} SING ${chips[0]} / ${chips[1]}`, `${chips[2]} / 主CONTROLとは独立`];
        });
        set(arena.targetInfo, [...(slotLines.length ? slotLines : ["NOVA未取得 / 枠・予約なし"]), ...finalLines].join("\n"));
        set(arena.reasonInfo, `L: 通常pending → Core/Final FIFO → 次Lv\n${cast ? `cast #${cast.castId} ${cast.coreProfile?.coreId || "none"}+${cast.finalProfile?.finalId || "none"} R${fmt(cast.radius)}` : "SPIKE存在なし / 新castから最新profile"}\nerrors M${scene.umbraMoonlightRuntime?.errors || 0} S${scene.umbraBloodSpikeRuntime?.errors || 0} N${nova?.errors || 0}`);
        if (triad) {
          const revisions = [...new Set(fields.map(field => field.finalProfile?.triadProfile?.revision ?? "—"))];
          set(arena.reasonInfo, `最新T${scene.getUmbraTriadSnapshot?.()?.revision ?? "—"} / 既存field T${revisions.join(",") || "なし"}\n${cast ? `cast #${cast.castId} T${cast.finalProfile?.triadProfile?.revision ?? cast.coreProfile?.triadProfile?.revision ?? "—"} raw${fmt(cast.rawDamage)} 主R${fmt(cast.radius)}` : "SPIKEなし / Lで正規カード"}\n装備未接続 / errors M${scene.umbraMoonlightRuntime?.errors || 0} S${scene.umbraBloodSpikeRuntime?.errors || 0} N${nova?.errors || 0}`);
          if (equipment) {
            const eq = scene.getUmbraEquipmentSnapshot?.(), castEq = cast?.finalProfile?.equipmentProfile;
            const counts = eq?.selectionCounts || {};
            set(arena.totals, `Lv${scene.stats.level} D${scene.stageDepth} pending ${scene.pendingLevelUps} Opening残${scene.startingUpgradeSelectionsRemaining}\n技能${skillSelections}/23 パッシブ${passiveSelections} 通常OVL${counts.normal || 0}\nCore${coreNames.filter(id => id !== "none").length}/3 Final${finalNames.filter(id => id !== "none").length}/3 / OVL源 F${counts.final || 0} D${counts.deep || 0}\nfield ${fields.length}/6 / 通常OVL分は通常選択枠を消費`);
            set(arena.reasonInfo, `最新T${scene.getUmbraTriadSnapshot?.()?.revision ?? "—"} / 既存field T${revisions.join(",") || "なし"}\n${cast ? `cast#${cast.castId} T${cast.finalProfile?.triadProfile?.revision ?? "—"} O${castEq?.overlimitLevel ?? 0}r${castEq?.overlimitRevision ?? "—"} raw${fmt(cast.rawDamage)} R${fmt(cast.radius)}` : "SPIKEなし / 旧castへOVL遡及なし"}\nL: pending→変異→OVL→XP / err M${scene.umbraMoonlightRuntime?.errors || 0}S${scene.umbraBloodSpikeRuntime?.errors || 0}N${nova?.errors || 0}`);
          }
        }
      }
      set(arena.contactButton.caption, `接触被弾 ${arena.contactEnabled ? "ON（既存受付）" : "OFF（観測）"}`);
      set(arena.attackButton.caption, "連続成長へ新規リセット");
      set(arena.fxButton.caption, `FX ${arena.fxMode === "image" ? "画像" : arena.fxMode === "fallback" ? "簡易" : "OFF"}`);
      const configuration = arena.configurations.find(c => c.id === arena.configId);
      set(arena.configurationLabel, `配置: ${configuration.label}`);
      set(arena.configurationHint, `${arena.growthPresetStage ? "比較初期化: 全3武装を直接指定。通常ランの取得証明ではありません。" : "Lで合成XP→取得／Stage＋1カード。敵・既存cast・球の時計を保持。"}\n地面円はcast範囲の見た目。壁越し命中を保証しません。`);
      if (core) set(arena.configurationHint, `${arena.growthPresetStage ? `新規比較 S${arena.growthPresetStage}・${NOVA_WEAPONS[arena.coreComparisonWeapons].label} / Core未選択から開始。Lで順番に選択。` : "連続成長 Moon S1開始 / S4到達後、通常pendingの次にCore選択。"}\n${configuration.hint}`);
      if (final) set(arena.configurationHint, `${arena.growthPresetStage ? `新規比較 S${arena.growthPresetStage}・${NOVA_WEAPONS[arena.coreComparisonWeapons].label} / Core・Final未選択。Lで順番に選択。` : "連続成長 / S4 Core → S8 Final / 合成XPはRAMのみ。"}\n${configuration.hint}`);
      if (triad) {
        const plan = TRIAD_COMPARISONS.find(item => item.id === arena.triadComparisonId);
        set(arena.configurationHint, plan
          ? `推奨 M/S/N Core: ${plan.core.join(" / ")}\nFinal: ${plan.final.join(" / ")} / S${plan.stages.join("/S")}・未選択からLで取得`
          : `${arena.growthPresetStage ? `新規比較S${arena.growthPresetStage}` : "連続成長"} / Core・Finalの正規確定後にTRIAD自動集計。\n${configuration.hint}`);
      }
    };
    arena.refreshNovaHud = function () {
      const now = Number(scene.time.now) || 0;
      const key = [scene.drivePaused, scene.driveHidden, scene.selectionObjects?.length, scene.gameOver,
        arena.fxMode, arena.weaponSelection, arena.contactEnabled, arena.novaSlots, scene.mechId].join("|");
      if (now < arena.novaHudNextAt && key === arena.novaHudStateKey) return;
      arena.novaHudNextAt = now + NOVA_DISPLAY.hudIntervalMs; arena.novaHudStateKey = key; arena.novaHudUpdates++;
      const set = (object, value) => { if (object.text !== value) object.setText(value); };
      const nova = scene.getUmbraPhantomNovaSnapshot?.(), ns = scene.getUmbraPhantomNovaEffectiveStats?.() || {};
      const moon = scene.umbraMoonlightRuntime, spike = scene.umbraBloodSpikeRuntime;
      const nc = nova?.counts || {}, mc = moon?.counts || {}, sc = spike?.counts || {};
      const clock = Number(nova?.combatTimeMs) || 0, slots = nova?.slots || [];
      const point = value => Number.isFinite(value?.x) && Number.isFinite(value?.y) ? `(${fmt(value.x)},${fmt(value.y)})` : "—";
      const remain = value => Number.isFinite(value) ? fmt(Math.max(0, value - clock) / 1000, 2) : "—";
      const acquired = scene.playerSkills?.umbraPhantomNova;
      set(arena.info, `${scene.mechId === "umbraSeraph" ? "PHANTOM NOVA 検証S1 / 性能は仮値" : "比較機体 / 専用武装未取得"}\nAP ${fmt(scene.stats.hp)}/${fmt(scene.stats.maxHp)}  EN ${fmt(scene.stats.stamina)}/${fmt(scene.stats.maxStamina)}\n${acquired ? `次の周回 DMG ${fmt(ns.orbitDamageBeforeTargetModifiers, 2)} / ${fmt(ns.orbitIntervalMs)}ms` : "NOVA 未取得"}\n${acquired ? `次の設置 DMG ${fmt(ns.deployedDamageBeforeTargetModifiers, 2)} / ${fmt(ns.deployedIntervalMs)}ms` : "周回・残留・再生成なし"}\nReactor ${scene.passiveLevels.overchargeBolt || 0} / Fire Control ${scene.passiveLevels.rapidSigil || 0}`);
      const stateCount = name => slots.filter(slot => slot.state === name).length;
      set(arena.totals, `枠 ${slots.length}/${acquired ? arena.novaSlots : 0}: 周回${stateCount("ORBITING")} / 残留${stateCount("DEPLOYED")} / 再生成${stateCount("REGENERATING")}\nNOVA pulse ${nc.pulses || 0} / 成功 ${nc.accepted || 0} / 撃破 ${nc.kills || 0}\nMOON ${mc.accepted || 0} / SPIKE ${sc.accepted || 0} / 接触減少 ${fmt(arena.contact.hpDamage)}\n${slots.length && stateCount("REGENERATING") === slots.length ? "全枠再生成待ち：球が見えない間も正常" : "予約は周回枠の一部 / 1ブースト最大1基"}`);
      set(arena.targetInfo, slots.length ? slots.slice(0, 3).map(slot => {
        const reservation = nova.reservation?.slotId === slot.slotId ? nova.reservation : null;
        const start = reservation?.fixedStart || (slot.state === "DEPLOYED" ? slot.position : null);
        const fixed = slot.state === "DEPLOYED" ? slot.position : null;
        const saved = slot.deployedSnapshot;
        const damage = slot.state === "DEPLOYED" ? ` raw${fmt(saved?.rawDamage)}/${fmt(saved?.intervalMs)}ms` : "";
        return `#${slot.slotId} ${slot.state} 予約seq ${reservation?.boostSequence ?? "—"}${damage}\n開始${point(start)} 固定${point(fixed)}\n次${remain(slot.nextPulseAtMs)}s 残${remain(slot.deployedUntilMs)}s 再${remain(slot.regenerateAtMs)}s`;
      }).join("\n") : "NOVA枠なし / 武装切替で新規試験\n既存2武装のみ・攻撃なしも比較可能");
      const lastSkip = Object.entries(nova?.skips || {}).filter(([, n]) => n > 0).slice(-1).map(([reason, n]) => `${reason}:${n}`).join("");
      const reason = scene.gameOver ? "AP 0・停止 / Rで新規試験" : nova?.blockReason || nova?.lastSkip?.reason || lastSkip
        || (scene.verificationContext.traceNotifications === false ? "通知OFF: 新規設置なし / 放電時計は継続" : "設置判定は正常boost開始時だけ");
      set(arena.reasonInfo, `${reason}\nerrors N${nova?.errors || 0} / M${moon?.errors || 0} / S${spike?.errors || 0}`);
      set(arena.contactButton.caption, `接触被弾 ${arena.contactEnabled ? "ON（既存受付）" : "OFF（観測）"}`);
      set(arena.attackButton.caption, `武装: ${NOVA_WEAPONS[arena.weaponSelection]?.label || "なし"}`);
      set(arena.fxButton.caption, `FX ${arena.fxMode === "image" ? "画像" : arena.fxMode === "fallback" ? "簡易" : "OFF"}`);
      set(arena.novaSlotsButton.caption, `NOVA ${arena.novaSlots}枠 / 切替でリセット`);
      const configuration = arena.configurations.find(c => c.id === arena.configId);
      set(arena.configurationLabel, `配置: ${configuration.label}`); set(arena.configurationHint, configuration.hint);
    };
    arena.update = function (_time, delta) {
      arena.updateSpikeFx();
      if (phase5) arena.updateNovaFx();
      if (final) arena.updateFinalFx();
      if (!active()) { arena.refreshHud(); return; }
      const dt = Math.max(0, Number(delta) || 0); arena.elapsedMs += dt;
      // Production AI owns every velocity in this dedicated fixture. Scripted
      // input paths below never add a second multiplier in the same update.
      const productionAi = core && [...arena.enemies.values()].some(record => record.movement?.productionAi);
      if (productionAi) scene.updateEnemies(dt);
      for (const record of arena.enemies.values()) {
        const enemy = record.enemy, move = record.movement;
        if (!productionAi && enemy.active && !enemy.isDying && enemy.body?.enable && move) {
          const locked = core && (scene.updateEnemySupportStatusLock(enemy) || scene.time.now < (enemy.hitRecoverUntil || 0));
          const speedMultiplier = core && !locked ? scene.getEnemySpeedMultiplier(enemy) : 1;
          if (locked) { arena.renderEnemy(record); continue; }
          if (phase5 && move.target) {
            const dx = move.target.x - enemy.body.center.x, dy = move.target.y - enemy.body.center.y;
            const distance = Math.hypot(dx, dy), speed = distance <= 3 ? 0 : Math.min(move.speed, distance / Math.max(0.001, dt / 1000));
            enemy.body.setVelocity(distance ? dx / distance * speed * speedMultiplier : 0, distance ? dy / distance * speed * speedMultiplier : 0);
          } else {
            const coordinate = enemy.body.center[move.axis];
            if (coordinate >= move.max) move.sign = -1; else if (coordinate <= move.min) move.sign = 1;
            enemy.body.setVelocity(move.axis === "x" ? move.speed * move.sign * speedMultiplier : 0, move.axis === "y" ? move.speed * move.sign * speedMultiplier : 0);
          }
        }
        arena.renderEnemy(record);
      }
      arena.updateMoonFx();
      for (const number of arena.numbers.slice()) {
        number.age = Math.max(0, (number.owner === "nova" ? novaClock() : numberClock()) - number.createdCombatTimeMs);
        if (number.age >= FX.numberDurationMs) { number.text.destroy(); arena.numbers.splice(arena.numbers.indexOf(number), 1); }
        else number.text.setPosition(number.x, number.y - number.age * 0.04).setAlpha(1 - number.age / FX.numberDurationMs);
      }
      arena.refreshHud();
    };
    arena.getSnapshot = function () {
      return { configuration: arena.configId, contactEnabled: arena.contactEnabled, attackEnabled: arena.attackEnabled,
        ...(growth ? { growth: { presetStage: arena.growthPresetStage, stages: Object.fromEntries(Object.keys(scene.playerSkills || {}).map(id => [id, scene.getUmbraActiveSkillStage?.(id)?.stage || null])),
          pendingLevelUps: scene.pendingLevelUps, openingRemaining: scene.startingUpgradeSelectionsRemaining,
          deferredMilestones: (scene.umbraGrowthRun?.deferredMilestones || []).map(item => ({ ...item })),
          syntheticXp: scene.umbraGrowthSyntheticXp || 0, suppressedOverflowXp: scene.umbraGrowthSuppressedOverflowXp || 0,
          ignoredNovaSlots: !!bridge.ignoredNovaSlots, ignoredWeaponFlags: !!bridge.ignoredWeaponFlags } } : {}),
        weaponSelection: arena.weaponSelection, hitReactionMode: arena.hitReactionMode,
        ...(final ? { final: scene.getUmbraFinalVisualState?.() || null,
          finalFx: { ...arena.finalFxCounts, fields: arena.finalFields.size, marks: arena.finalMarks.length } } : {}),
        ...(triad ? { triad: { snapshot: scene.gameOver ? scene.umbraTriadEndSnapshot : scene.getUmbraTriadSnapshot?.() || null,
          comparisonId: arena.triadComparisonId, noticeCount: arena.triadNoticeCount } } : {}),
        ...(equipment ? { equipment: { snapshot: scene.gameOver ? scene.umbraEquipmentEndSnapshot : scene.getUmbraEquipmentSnapshot?.() || null,
          fixtureId: scene.equipmentFixtureId, startDepth: scene.equipmentStartDepth === 6 ? 6 : 1 } } : {}),
        ...(phase5 ? { novaSlots: arena.novaSlots, nova: scene.getUmbraPhantomNovaSnapshot?.() || null,
          novaFx: { ...arena.novaFxCounts, active: arena.novaEffects.size, visible: [...arena.novaEffects.values()].filter(fx => fx.object?.visible).length,
            rays: arena.novaRays.length, rayLimit: NOVA_DISPLAY.rayLimit, hudUpdates: arena.novaHudUpdates } } : {}),
        spike: phase4 ? scene.getUmbraBloodSpikeSnapshot?.() || null : null,
        spikeFx: { ...arena.spikeFxCounts, active: arena.spikeEffects.size, visible: [...arena.spikeEffects.values()].filter(fx => fx.object).length },
        fxMode: arena.fxMode, fx: { ...arena.fxCounts, active: arena.effects.length }, numbers: { ...arena.damageNumberCounts, active: arena.numbers.length },
        contact: { ...arena.contact }, blocked: { ...arena.blocked }, omitted: { ...arena.omitted },
        runStats: { ...scene.runStats }, combat: scene.getUmbraMoonlightSnapshot?.() || null,
        enemies: Array.from(arena.enemies.keys()).filter(enemy => enemy.active).map(enemy => ({ id: enemy.moonlightArenaId,
          hp: enemy.hp, maxHp: enemy.maxHp, dying: enemy.isDying, kind: enemy.moonlightArenaKind,
          x: enemy.body?.center.x, y: enemy.body?.center.y, width: enemy.body?.width, height: enemy.body?.height, circle: enemy.body?.isCircle })),
        drops: scene.getActiveDropObjects().map(drop => ({ category: drop.dropCategory, value: drop.value, xp: drop.xpValue, geek: drop.coinValue })),
        adapterManifest: arena.adapterManifest };
    };
    arena.destroy = function () {
      if (arena.destroyed) return;
      arena.beforeDriveReset(); arena.destroyed = true; presentation.destroy();
      if (triad) scene.onUmbraTriadSnapshotChanged = null;
      for (const collider of [arena.contactCollider, arena.enemyWallCollider]) if (collider?.world) collider.destroy();
      arena.ui.splice(0).forEach(object => {
        const index = scene.uiObjects.indexOf(object); if (index >= 0) scene.uiObjects.splice(index, 1); object.destroy();
      });
      [scene.enemies, scene.xpOrbs, scene.rareItems].forEach(group => { if (group?.children) group.destroy(true); });
      if (scene.pickupEffectsLayer?.scene) scene.pickupEffectsLayer.destroy();
      scene.onUmbraMoonlightAcceptedHit = null; scene.onUmbraBloodSpikeRuntimeCleared = null; arena.lastHit = null;
      if (final) scene.onUmbraFinalSecondaryAcceptedHit = null;
      if (phase5) {
        scene.onUmbraPhantomNovaPulse = null; scene.onUmbraPhantomNovaRuntimeCleared = null;
        scene.onUmbraPhantomNovaDepthChanged = null; scene.isUmbraPhantomNovaTest = false;
      }
    };
    return arena;
  };
}());
