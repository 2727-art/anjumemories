/* Isolated Phase 2B field. Physics/EN/evasion/candidates are existing method references. */
window.createUmbraPhase2ADriveScene = function createUmbraPhase2ADriveScene(bridge) {
  "use strict";
  const GROWTH = bridge.umbraGrowth === true;
  const CORE = GROWTH && bridge.umbraCore === true;
  const FINAL = CORE && bridge.umbraFinal === true;
  const TRIAD = FINAL && bridge.umbraTriad === true;
  const EQUIPMENT = TRIAD && bridge.umbraEquipment === true;
  const TITLE = EQUIPMENT
    ? "PHASE 6D2 TEST / 装備・OVERLIMIT統合 / 通常販売未実装 / 進行保存なし"
    : TRIAD
    ? "PHASE 6D1 TEST / TRIAD戦闘接続 / 装備対応未実装 / 進行保存なし"
    : FINAL
    ? "PHASE 6C2 TEST / Final変異 / TRIAD・装備対応未実装 / 進行保存なし"
    : CORE
    ? "PHASE 6C1 TEST / Core変異 / Final未実装 / 進行保存なし"
    : GROWTH
    ? "PHASE 6B TEST / 基本Stage成長 / Mutation未実装 / 進行保存なし"
    : bridge.phantomNovaArena === true
    ? "PHASE 5 TEST / PHANTOM NOVA基本攻撃 / 性能は仮値 / 進行保存なし"
    : bridge.bloodSpikeArena === true
    ? "PHASE 4 TEST / BLOOD SPIKE基本攻撃 / 性能は仮値 / 進行保存なし"
    : bridge.moonlightArena === true
    ? "PHASE 3 TEST / MOONLIGHT基本攻撃 / 性能は仮値 / 進行保存なし"
    : "PHASE 2B TEST / 移動通知のみ / 攻撃未実装 / 進行保存なし";
  const MECHS = ["defaultBear", "regaliaBastion", "umbraSeraph"];
  const LABELS = ["標準機", "REGALIA", "UMBRA"];
  const FIELD = { width: 6000, height: 2000, startX: 350, startY: 500 };
  const TRACE_DISPLAY = Object.freeze({ maxMarks: 120, lifetimeMs: 5000 });
  const fixtures = window.createUmbraDriveFixtures(bridge);
  const fmt = (n, places = 1) => Number.isFinite(Number(n)) ? Number(n).toFixed(places) : "—";
  return class UmbraPhase2ADrive extends Phaser.Scene {
    constructor() { super("UmbraPhase2ADrive"); }
    init(data = {}) { this.requestedFixture = data.fixtureId || "baseline"; this.requestedMech = data.mechId || "umbraSeraph"; }
    preload() {
      // Comparison art only; these requests never occur in normal play or material Preview.
      Object.values(bridge.mechDirectionAssets).forEach(directions => Object.values(directions).forEach(pose => {
        ["idle", "move", "boost"].forEach(mode => {
          if (pose[mode + "Key"] && !this.textures.exists(pose[mode + "Key"])) {
            this.load.image(pose[mode + "Key"], pose[mode + "Path"], { timeout: 10000 });
          }
        });
      }));
    }
    create() {
      this.isUmbraPhase2ADrive = true;
      if (EQUIPMENT) this.umbraEquipmentFixtures = fixtures.equipmentFixtures;
      this.airBrakeVariant = bridge.airBrakeVariant === "legacy" ? "legacy" : "tuned";
      this.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId: this.requestedMech, airBrakeVariant: this.airBrakeVariant, traceNotifications: bridge.traceNotifications !== false });
      window.installUmbraPhase2ADriveRuntime(this, bridge);
      fixtures.install(this);
      this.uiObjects = [];
      this.samples = []; this.transitions = []; this.collisionCount = 0;
      this.renderFrames = 0; this.physicsSteps = 0; this.sceneUpdates = 0;
      this.guides = true; this.drivePaused = false; this.driveHidden = document.hidden;
      this.driveTraceVisible = bridge.traceVisible !== false;
      this.driveTraceMarks = [];
      this.driveTraceView = null;
      this.driveShuttingDown = false;
      this.selectionObjects = []; this.sfxEnabled = false;
      this.worldCamera = this.cameras.main;
      this.worldCamera.setViewport(0, 155, 916, 565).setBounds(0, 0, FIELD.width, FIELD.height).setZoom(0.7);
      this.uiCamera = this.cameras.add(0, 0, 1280, 720, false, "drive-ui");
      this.physics.world.setBounds(0, 0, FIELD.width, FIELD.height);
      this.createField();
      this.playerHitbox = this.add.circle(FIELD.startX, FIELD.startY, bridge.hitboxRadius, 0x8effd5, 0);
      this.physics.add.existing(this.playerHitbox);
      this.playerHitbox.body.setCircle(bridge.hitboxRadius).setCollideWorldBounds(true);
      this.playerSprite = this.add.image(FIELD.startX, FIELD.startY, "__WHITE").setDepth(20);
      this.playerShadow = this.add.ellipse(FIELD.startX, FIELD.startY + 44, 108, 28, 0x000000, 0.28).setDepth(15);
      this.fallback = this.add.container(0, 0, [this.add.rectangle(0, 0, 48, 64, 0x274653).setStrokeStyle(2, 0x97f7ff)]).setDepth(20);
      this.hitboxGraphics = this.add.graphics().setDepth(30);
      this.driveTraceGraphics = this.add.graphics().setDepth(18);
      this.wallCollider = this.physics.add.collider(this.playerHitbox, this.walls, () => { this.collisionCount += 1; });
      this.worldCamera.startFollow(this.playerHitbox, true, 1, 1);
      this.uiCamera.ignore(this.children.list);
      this.keys = this.input.keyboard.addKeys({ up: "UP", down: "DOWN", left: "LEFT", right: "RIGHT", w: "W", a: "A", s: "S", d: "D", dash: "SHIFT", dashAlt: "SPACE" });
      this.createHud();
      this.createDriveTraceHud();
      this.moonlightArena = bridge.attackArena === true || bridge.moonlightArena === true
        ? window.createUmbraMoonlightArena(this, bridge) : null;
      this.setupDriveInput();
      this.assetHandler = () => { if (this.sys.isActive()) this.syncPlayerVisuals(); };
      this.game.events.on("umbra-phase1-assets-changed", this.assetHandler);
      this.physicsHandler = () => { this.physicsSteps += 1; };
      this.physics.world.on("worldstep", this.physicsHandler);
      this.renderHandler = () => { this.renderFrames += 1; };
      this.game.events.on("postrender", this.renderHandler);
      this.visibilityHandler = () => {
        this.driveHidden = document.hidden;
        this.clearDriveInput();
        if (this.driveHidden) this.pauseUmbraDriveMotion("TAB_HIDDEN");
        else this.driveResumePending = !this.drivePaused && !this.selectionObjects.length;
        this.playerHitbox.body.setVelocity(0, 0);
        this.driveHidden ? this.physics.world.pause() : (!this.drivePaused && !this.selectionObjects.length && this.physics.world.resume());
        this.recordTransition(this.driveHidden ? "TAB_HIDDEN" : "TAB_VISIBLE");
      };
      document.addEventListener("visibilitychange", this.visibilityHandler);
      this.events.once("shutdown", () => {
        this.driveShuttingDown = true;
        this.moonlightArena?.destroy(); this.moonlightArena = null;
        this.stopDriveTraceDiagnostics("SCENE_SHUTDOWN");
        this.driveTraceUi = []; this.driveTraceLabel = null; this.driveTraceButton = null; this.driveTraceGraphics = null;
        this.verificationContext = null;
        this.closeCandidateCards(); this.clearDriveInput();
        this.input.keyboard.off("keydown", this.driveKeyHandler);
        this.input.off("pointermove", this.touchMoveHandler);
        this.input.off("pointerup", this.touchUpHandler);
        document.removeEventListener("visibilitychange", this.visibilityHandler);
        this.game.events.off("umbra-phase1-assets-changed", this.assetHandler);
        this.game.events.off("postrender", this.renderHandler);
        this.physics.world?.off("worldstep", this.physicsHandler);
        if (this.wallCollider.world) this.wallCollider.destroy();
        this.time.removeAllEvents(); this.tweens.killAll();
        this.verificationContext = null;
        this.samples = []; this.transitions = [];
      });
      this.resetDrive(this.requestedMech, this.requestedFixture, bridge.airBrakeVariant);
    }
    ui(object) { object.setScrollFactor(0).setDepth(100); this.uiObjects.push(object); this.worldCamera.ignore(object); return object; }
    label(x, y, value, size = 15, color = "#c8e6ee") {
      return this.ui(this.add.text(x, y, value, { fontFamily: "Segoe UI, Yu Gothic UI, sans-serif", fontSize: size + "px", color, lineSpacing: 4 }));
    }
    button(x, y, width, label, action) {
      const box = this.ui(this.add.rectangle(x, y, width, 31, 0x173041).setStrokeStyle(1, 0x42829a).setInteractive({ useHandCursor: true }));
      const caption = this.label(x, y, label, 13, "#e4f6ff").setOrigin(0.5);
      box.on("pointerdown", action); return { box, caption };
    }
    createField() {
      const grid = this.add.graphics().fillStyle(0x071720).fillRect(0, 0, FIELD.width, FIELD.height);
      for (let x = 0; x <= FIELD.width; x += 100) {
        grid.lineStyle(x % 500 ? 1 : 2, x % 500 ? 0x16313d : 0x326675).lineBetween(x, 0, x, FIELD.height);
        if (x % 500 === 0) this.add.text(x + 5, 340, `${x} px`, { fontSize: "24px", color: "#80becb" });
      }
      for (let y = 0; y <= FIELD.height; y += 100) grid.lineStyle(1, y % 500 ? 0x16313d : 0x326675).lineBetween(0, y, FIELD.width, y);
      grid.lineStyle(3, 0x8cb378).lineBetween(FIELD.startX, 410, FIELD.startX, 590);
      this.add.text(180, 235, "直進レーン / 100 px grid  •  下側: 壁・内角・斜め進入", { fontSize: "24px", color: "#c0dbdc" });
      this.walls = this.physics.add.staticGroup();
      [[1700, 1100, 70, 650], [1930, 1390, 520, 70], [3100, 1100, 240, 240], [3900, 1470, 400, 70]].forEach(([x, y, w, h]) => {
        const wall = this.add.rectangle(x, y, w, h, 0x34424a).setStrokeStyle(4, 0x97bdc1);
        this.walls.add(wall); wall.body.updateFromGameObject();
      });
      this.add.text(1740, 1220, "内角", { fontSize: "28px", color: "#afdadf" });
      this.add.text(2860, 870, "斜め進入 / 四隅", { fontSize: "28px", color: "#afdadf" });
    }
    createHud() {
      this.ui(this.add.rectangle(640, 77, 1280, 155, 0x060e18));
      this.ui(this.add.rectangle(1098, 437, 364, 566, 0x081320).setStrokeStyle(1, 0x254757));
      this.label(18, 12, TITLE, 20, "#a9ebff");
      this.brakeVariantLabel = this.label(1012, 16, "", 16, "#ffe2aa");
      this.mechButtons = MECHS.map((id, i) => this.button(77 + i * 134, 62, 126, LABELS[i], () => this.resetDrive(id, this.fixtureId)));
      this.fixtureButtons = ["baseline", "medium", "deep"].map((id, i) => this.button(506 + i * 134, 62, 126, ["基礎のみ", "中程度", "深層向け上限"][i], () => this.resetDrive(this.mechId, id)));
      this.button(939, 62, 132, "リセット [R]", () => this.resetDrive());
      this.button(1081, 62, 132, "素材Preview", () => this.scene.start("UmbraPhase1Preview"));
      this.button(1214, 62, 118, "検証終了", () => this.scene.start("UmbraPhase1Stopped"));
      this.fixtureLabel = this.label(18, 89, "", 13);
      this.statLabel = this.label(933, 169, "", 15);
      this.energyLabel = this.label(933, 278, "", 14);
      this.stateLabel = this.label(933, 372, "", 14);
      this.evasionLabel = this.label(933, 471, "", 14);
      if (!GROWTH) {
        this.button(961, 552, 54, "EV −", () => this.setDriveEvasiveLevel(this.getEvasiveFirmwareLevel() - 1));
        this.button(1027, 552, 54, "EV +", () => this.setDriveEvasiveLevel(this.getEvasiveFirmwareLevel() + 1));
        this.button(1159, 552, 190, "AP Reinforce 強化", () => this.applyDriveApUpgrade());
      } else this.label(934, 547, "合成XPで次Lvへ / 自然到達の証明ではありません", 11, "#e4c68e");
      this.button(GROWTH ? 1005 : 999, 591, GROWTH ? 144 : 132, GROWTH ? "取得／Stage＋1 [L]" : "通常3択 [L]", () => this.openCandidateCards(false));
      this.button(1175, 591, 190, GROWTH ? "未処理カードを再表示" : "Opening候補確認", () => this.openCandidateCards(true));
      this.pauseButton = this.button(998, 630, 130, "停止/再開 [P]", () => this.toggleDrivePause());
      this.button(1175, 630, 190, "当たり判定 [H]", () => { this.guides = !this.guides; });
      this.label(934, 658, "WASD / 矢印 + SHIFT / SPACE\n逆入力: Air Brake   EV=回避Lv", 13);
      this.statusLabel = this.label(18, 132, "", 13, "#97bbcd");
      this.touchBase = this.ui(this.add.circle(88, 638, 53, 0x153b4c, 0.72).setStrokeStyle(1, 0x6296a6).setInteractive());
      this.touchKnob = this.ui(this.add.circle(88, 638, 17, 0x88d9e9, 0.72));
      this.touchDash = this.ui(this.add.circle(805, 638, 48, 0x224654, 0.8).setStrokeStyle(2, 0x9ce1e9).setInteractive());
      this.label(805, 638, "DASH", 17).setOrigin(0.5);
      this.touchBase.on("pointerdown", pointer => { this.touchPointer = pointer.id; this.setTouchVector(pointer); });
      this.touchDash.on("pointerdown", pointer => { this.dashPointer = pointer.id; this.mobileDashHeld = true; });
    }
    setupDriveInput() {
      this.driveKeyHandler = event => {
        if (event.repeat || this.lastDriveKeyEvent === event) return;
        this.lastDriveKeyEvent = event;
        const key = event.key.toLowerCase();
        if (this.selectionObjects.length && (GROWTH ? /^[1234]$/ : /^[123]$/).test(key)) { this.chooseCandidate(Number(key) - 1); return; }
        const actions = { r: () => this.resetDrive(), p: () => this.toggleDrivePause(), h: () => { this.guides = !this.guides; }, t: () => this.setDriveTraceVisible(!this.driveTraceVisible), l: () => this.openCandidateCards(false), escape: () => this.selectionObjects.length ? this.closeCandidateCards() : this.scene.start("UmbraPhase1Stopped") };
        if (actions[key]) { event.preventDefault(); actions[key](); }
      };
      this.input.keyboard.on("keydown", this.driveKeyHandler);
      this.touchMoveHandler = pointer => { if (pointer.id === this.touchPointer && pointer.isDown) this.setTouchVector(pointer); };
      this.touchUpHandler = pointer => {
        if (pointer.id === this.touchPointer) { this.touchPointer = null; this.mobileMoveVector = { x: 0, y: 0 }; this.touchKnob.setPosition(88, 638); }
        if (pointer.id === this.dashPointer) { this.dashPointer = null; this.mobileDashHeld = false; }
      };
      this.input.on("pointermove", this.touchMoveHandler); this.input.on("pointerup", this.touchUpHandler);
    }
    setTouchVector(pointer) {
      const dx = pointer.x - 88, dy = pointer.y - 638, length = Math.hypot(dx, dy), ratio = Math.min(length, 42) / Math.max(1, length);
      this.mobileMoveVector = { x: dx * ratio / 42, y: dy * ratio / 42 };
      this.touchKnob.setPosition(88 + dx * ratio, 638 + dy * ratio);
    }
    clearDriveInput() {
      this.input.keyboard.resetKeys();
      this.mobileMoveVector = { x: 0, y: 0 }; this.mobileDashHeld = false;
      this.touchPointer = null; this.dashPointer = null;
      this.touchKnob?.setPosition(88, 638);
      this.gamepadState = this.createGamepadState();
    }
    resetDrive(mechId = this.mechId, fixtureId = this.fixtureId, airBrakeVariant = this.airBrakeVariant ?? bridge.airBrakeVariant) {
      if (CORE) this.umbraCoreFixtureBuilding = true;
      this.moonlightArena?.beforeDriveReset();
      this.stopDriveTraceDiagnostics("NEW_DRIVE");
      this.closeCandidateCards(); this.clearDriveInput();
      if (EQUIPMENT && this.fixtureId !== fixtureId) this.equipmentFixtureId = null;
      this.mechId = MECHS.includes(mechId) ? mechId : "umbraSeraph";
      this.fixtureId = fixtureId || "baseline";
      this.airBrakeVariant = airBrakeVariant === "legacy" ? "legacy" : "tuned";
      this.verificationContext = Object.freeze({ kind: "umbra-phase2a", mechId: this.mechId, airBrakeVariant: this.airBrakeVariant, traceNotifications: bridge.traceNotifications !== false });
      fixtures.resetFixture(this, this.fixtureId, this.mechId, this.airBrakeVariant);
      this.resetLevelUpCandidatePresentationState();
      this.playerHitbox.body.reset(FIELD.startX, FIELD.startY);
      this.driveResumePending = false;
      this.resetUmbraDriveMotion("NEW_DRIVE");
      this.samples = []; this.transitions = []; this.collisionCount = 0; this.sceneUpdates = 0; this.physicsSteps = 0; this.renderFrames = 0;
      this.driveStartedAt = this.time.now; this.lastSampleAt = 0; this.previousStateKey = "";
      this.drivePaused = false; this.physics.world.resume();
      this.moonlightArena?.afterDriveReset();
      this.startDriveTraceDiagnostics();
      this.moonlightArena?.connect();
      this.refreshFixtureLabel(); this.syncPlayerVisuals(); this.refreshDriveHud();
      if (CORE) this.umbraCoreFixtureBuilding = false;
      if (GROWTH && this.isUmbraGrowthContextActive?.() && !this.moonlightArena?.growthPresetStage) {
        this.startingUpgradeSelectionsRemaining = 3;
        this.survivalTime = 0;
        this.beginStartingUpgradeDraft();
      }
    }
    refreshFixtureLabel() {
      const fixture = fixtures.fixtures.find?.(f => f.id === this.fixtureId) || fixtures.fixtures[this.fixtureId];
      const detail = this.umbraDriveFixtureSummary;
      const c = detail.composition, p = c.passives;
      const gear = EQUIPMENT ? `RAM装備 ${detail.equipmentFixtureLabel} / 開始Depth${detail.equipmentStartDepth}（到達証明ではありません）`
        : fixture.equipment ? `全5部位 ${fixture.equipment.rarity} R${fixture.equipment.rank} 精錬+${fixture.refinement}` : "装備なし / 精錬0";
      this.brakeVariantLabel.setText(this.getDriveAirBrakeLabel());
      this.fixtureLabel.setText(`${LABELS[MECHS.indexOf(this.mechId)]} / ${fixture.label}  •  BASE CALIBRATION 武器${c.shop.weapon} / 装甲${c.shop.armor} / 脚${c.shop.shoes}  •  Cooling ${c.coolingLevel}  •  CD: ${c.cdIds.join(" / ")}\n${gear}  •  Passive AP ${p.vitalBloom || 0} / Booster ${p.swiftStep || 0} / EN ${p.staminaCore || 0} / Evasive ${p.evasiveFirmware || 0}（他0）  •  ${TRIAD ? "Robot / Support / OVERDRIVEなし・TRIADは選択後RAM集計" : "Robot / Support / OVERDRIVE / TRIAD なし"}`).setWordWrapWidth(1240);
      this.mechButtons.forEach((b, i) => b.box.setStrokeStyle(2, MECHS[i] === this.mechId ? 0x99f2ff : 0x315668));
      this.fixtureButtons.forEach((b, i) => b.box.setStrokeStyle(2, ["baseline", "medium", "deep"][i] === this.fixtureId ? 0x99f2ff : 0x315668));
    }
    getDriveAirBrakeLabel() {
      if (this.getUmbraPhase2AVerifiedMechId() !== "umbraSeraph") return "BRAKE: 標準仕様";
      return this.getUmbraAirBrakeCalibration() ? "BRAKE: UMBRA採用版" : "BRAKE: 旧方式比較";
    }
    createDriveTraceHud() {
      const panel = this.ui(this.add.rectangle(456, 218, 880, 114, 0x04111b, 0.88).setStrokeStyle(1, 0x357486));
      this.driveTraceLabel = this.label(29, 170, "", 14);
      const legend = this.label(29, 249, "通知区間  有効: 緑 / 通常: 灰 / 滑走: 青 / 制動: 黄 / 除外: 赤 / 不連続: ×", 13, "#b8d4dc");
      if (TRIAD) {
        // Share the existing top diagnostic strip; do not cover the player's
        // center with another panel. T continues to control Trace alone.
        panel.setPosition(236, 218).setSize(440, 114);
        this.driveTraceLabel.setFontSize(11).setWordWrapWidth(412).setLineSpacing(0);
        legend.setFontSize(10).setWordWrapWidth(412).setY(247);
      }
      if (EQUIPMENT) {
        this.driveTraceLabel.setFontSize(10);
        legend.setVisible(false);
      }
      this.driveTraceUi = EQUIPMENT ? [this.driveTraceLabel] : [panel, this.driveTraceLabel, legend];
      this.driveTraceButton = this.button(596, 686, 210, "", () => this.setDriveTraceVisible(!this.driveTraceVisible));
      this.setDriveTraceVisible(this.driveTraceVisible);
    }
    setDriveTraceVisible(visible) {
      this.driveTraceVisible = visible === true;
      for (const object of this.driveTraceUi || []) object.setVisible(this.driveTraceVisible);
      this.driveTraceGraphics?.setVisible(this.driveTraceVisible);
      this.driveTraceButton?.caption.setText(`TRACE ${this.driveTraceVisible ? "ON" : "OFF"} [T]`);
      this.refreshDriveTraceHud();
    }
    clearDriveTraceDisplay() {
      this.driveTraceMarks = [];
      this.driveTraceView = null;
      this.driveTraceFixedStart = null;
      this.driveTraceGeneration = null;
      this.driveTraceGraphics?.clear();
    }
    startDriveTraceDiagnostics() {
      if (this.getUmbraPhase2AVerifiedMechId() !== "umbraSeraph" || this.verificationContext?.traceNotifications === false) return false;
      if (!this.ensureUmbraBoostTrace()) return false;
      const consumer = () => ({ count: 0, lastOrder: 0, duplicates: 0, droppedStale: 0, droppedStopped: 0, firstPhysics: 0, excluded: 0, hash: 2166136261, typeCounts: {}, events: [] });
      this.driveTraceConsumers = { A: consumer(), B: consumer() };
      const owner = this.driveTraceConsumers;
      this.driveTraceUnsubscribers = ["A", "B"].map(id => this.subscribeUmbraBoostTrace(`drive-diagnostic-${id}`, notice => {
        if (this.driveTraceConsumers === owner) this.receiveDriveTraceNotification(id, notice);
      }));
      return true;
    }
    stopDriveTraceDiagnostics(reason) {
      this.destroyUmbraBoostTrace?.(reason);
      for (const unsubscribe of this.driveTraceUnsubscribers || []) unsubscribe();
      this.driveTraceUnsubscribers = [];
      this.driveTraceConsumers = null;
      this.driveTraceLastNotification = null;
      this.clearDriveTraceDisplay();
    }
    receiveDriveTraceNotification(id, notice) {
      const consumer = this.driveTraceConsumers?.[id];
      if (!consumer || !notice) return;
      const generations = this.getUmbraBoostTraceSnapshot()?.generations;
      if (!generations || notice.runGeneration !== generations.run || notice.depthGeneration !== generations.depth || notice.basisGeneration !== generations.basis) {
        consumer.droppedStale += 1; return;
      }
      if ((notice.type === "start" || notice.type === "step") && (this.driveShuttingDown || this.drivePaused || this.driveHidden || this.umbraDriveMotionPaused || this.selectionObjects?.length)) {
        consumer.droppedStopped += 1; return;
      }
      consumer.count += 1;
      if (notice.firstPhysicalEvaluation) consumer.firstPhysics += 1;
      if (notice.type === "step" && !notice.valid) consumer.excluded += 1;
      if (notice.order <= consumer.lastOrder) consumer.duplicates += 1;
      consumer.lastOrder = notice.order;
      consumer.typeCounts[notice.type] = (consumer.typeCounts[notice.type] || 0) + 1;
      const text = JSON.stringify(notice);
      for (let i = 0; i < text.length; i += 1) consumer.hash = Math.imul(consumer.hash ^ text.charCodeAt(i), 16777619) >>> 0;
      consumer.events.push(notice);
      if (consumer.events.length > 256) consumer.events.splice(0, consumer.events.length - 256);
      if (id !== "A") {
        if (notice.type !== "step") this.refreshDriveTraceHud();
        return;
      }
      const generation = `${notice.runGeneration}/${notice.depthGeneration}/${notice.basisGeneration}`;
      if (generation !== this.driveTraceGeneration || notice.type === "invalidate") this.clearDriveTraceDisplay();
      this.driveTraceGeneration = generation;
      this.driveTraceLastNotification = notice;
      if (notice.type === "start" && notice.fixedStart) this.driveTraceFixedStart = { x: notice.fixedStart.x, y: notice.fixedStart.y, at: notice.timeMs };
      const from = notice.from, to = notice.to;
      if (notice.type === "invalidate" && to && [to.x, to.y].every(Number.isFinite)) {
        this.driveTraceMarks.push({ at: notice.timeMs, to: { x: to.x, y: to.y }, valid: false, discontinuous: true, color: 0xff7795 });
        return;
      }
      if (notice.type !== "step" || !from || !to || ![from.x, from.y, to.x, to.y].every(Number.isFinite)) return;
      const modeColor = { NORMAL: 0x78909c, POST_BOOST_GLIDE: 0x70acff, AIR_BRAKE: 0xffce68 };
      const discontinuous = !notice.valid && /DISCONT|WARP|CORRECTION|INVALID|RESET|REBASE|BODY|DESTROY|PATH|WALL_CHORD|EXTERNAL|UNKNOWN/.test(notice.reason || "");
      this.driveTraceMarks.push({
        at: notice.timeMs, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y },
        valid: notice.valid === true, discontinuous,
        color: notice.valid ? 0x81ffd0 : discontinuous ? 0xff7795 : modeColor[notice.mode] || 0xff7795
      });
      if (this.driveTraceMarks.length > TRACE_DISPLAY.maxMarks) this.driveTraceMarks.splice(0, this.driveTraceMarks.length - TRACE_DISPLAY.maxMarks);
    }
    getDriveTraceDiagnostics() {
      const copyConsumer = consumer => consumer ? {
        count: consumer.count, lastOrder: consumer.lastOrder, duplicates: consumer.duplicates,
        droppedStale: consumer.droppedStale, droppedStopped: consumer.droppedStopped,
        firstPhysics: consumer.firstPhysics, excluded: consumer.excluded,
        hash: consumer.hash, typeCounts: { ...consumer.typeCounts },
        orders: consumer.events.map(event => event.order), events: consumer.events.slice()
      } : null;
      return {
        visible: this.driveTraceVisible, notificationsEnabled: this.isUmbraBoostTraceEnabled(),
        subscribed: this.driveTraceUnsubscribers?.length || 0,
        display: { generation: this.driveTraceGeneration, fixedStart: this.driveTraceFixedStart ? { ...this.driveTraceFixedStart } : null, markCount: this.driveTraceMarks.length },
        source: this.driveTraceConsumers ? this.getUmbraBoostTraceSnapshot() : null,
        A: copyConsumer(this.driveTraceConsumers?.A), B: copyConsumer(this.driveTraceConsumers?.B)
      };
    }
    refreshDriveTraceHud() {
      if (!this.driveTraceLabel) return;
      if (this.driveTraceConsumers) {
        const source = this.getUmbraBoostTraceSnapshot();
        if (source) this.driveTraceView = {
          sequence: source.boostSequence, origin: this.driveTraceFixedStart,
          starts: source.counts.start, firstPhysics: this.driveTraceConsumers.A.firstPhysics,
          firstMoves: source.counts.firstMove, segments: source.counts.segment, ends: source.counts.end,
          excluded: this.driveTraceConsumers.A.excluded,
          consumerA: this.driveTraceConsumers.A.count, consumerB: this.driveTraceConsumers.B.count,
          reason: this.driveTraceLastNotification?.reason || "通知未発生"
        };
      }
      const view = this.driveTraceView;
      const body = this.playerHitbox?.body;
      const point = value => value ? `(${fmt(value.x, 1)}, ${fmt(value.y, 1)})` : "—";
      if (this.getUmbraPhase2AVerifiedMechId() !== "umbraSeraph") {
        this.driveTraceLabel.setText("BOOST TRACE / UMBRA専用\n標準機・REGALIAでは通知runtime・consumerは起動しません。");
      } else {
        this.driveTraceLabel.setText(EQUIPMENT
          ? `TRACE seq${view?.sequence ?? "—"} 開始${view?.starts || 0} 物理${view?.firstPhysics || 0} 有効${view?.segments || 0} / ${view?.reason || "未発生"}`
          : TRIAD
          ? `BOOST TRACE ${this.verificationContext?.traceNotifications === false ? "通知OFF" : ""} seq${view?.sequence ?? "—"} / body${point(body?.center)}\n固定開始${point(view?.origin)} / 開始${view?.starts || 0} 初回物理${view?.firstPhysics || 0}\n初移動${view?.firstMoves || 0} 有効${view?.segments || 0} 終了${view?.ends || 0} / A${view?.consumerA || 0} B${view?.consumerB || 0}\n除外${view?.excluded || 0} / ${view?.reason || "通知未発生"}`
          : `BOOST TRACE ${this.verificationContext?.traceNotifications === false ? "通知OFF" : ""}  sequence ${view?.sequence ?? "—"}  /  固定開始 ${point(view?.origin)}  /  body ${point(body?.center)}\n開始 ${view?.starts || 0} / 初回物理 ${view?.firstPhysics || 0} / 初回移動 ${view?.firstMoves || 0} / 有効 ${view?.segments || 0} / 終了 ${view?.ends || 0}\nconsumer A ${view?.consumerA || 0} / B ${view?.consumerB || 0}  /  除外 ${view?.excluded || 0}  /  ${view?.reason || "通知未発生"}`);
      }
      const now = Math.max(0, Number(this.time?.now) || 0);
      this.driveTraceMarks = this.driveTraceMarks.filter(mark => now - mark.at <= TRACE_DISPLAY.lifetimeMs).slice(-TRACE_DISPLAY.maxMarks);
      const graphics = this.driveTraceGraphics;
      if (!graphics) return;
      graphics.clear();
      if (!this.driveTraceVisible) return;
      for (const mark of this.driveTraceMarks) {
        const alpha = Math.max(0.15, 1 - (now - mark.at) / TRACE_DISPLAY.lifetimeMs);
        graphics.lineStyle(mark.valid ? 3 : 2, mark.color, alpha);
        if (mark.discontinuous) {
          graphics.lineBetween(mark.to.x - 8, mark.to.y - 8, mark.to.x + 8, mark.to.y + 8);
          graphics.lineBetween(mark.to.x - 8, mark.to.y + 8, mark.to.x + 8, mark.to.y - 8);
        } else if (mark.from.x === mark.to.x && mark.from.y === mark.to.y) {
          graphics.strokeCircle(mark.to.x, mark.to.y, 4);
        } else if (mark.from && mark.to) {
          graphics.lineBetween(mark.from.x, mark.from.y, mark.to.x, mark.to.y);
        }
      }
      if (view?.origin && now - view.origin.at <= TRACE_DISPLAY.lifetimeMs && Number.isFinite(view.origin.x) && Number.isFinite(view.origin.y)) {
        graphics.lineStyle(3, 0xb4ffdd, 1).strokeCircle(view.origin.x, view.origin.y, 13);
        graphics.lineBetween(view.origin.x - 18, view.origin.y, view.origin.x + 18, view.origin.y);
        graphics.lineBetween(view.origin.x, view.origin.y - 18, view.origin.x, view.origin.y + 18);
      }
    }
    setPlayerRobotPose(direction, moving, boost) {
      this.driveDirection = direction;
      this.driveSpriteMode = boost ? "boost" : moving ? "move" : "idle";
      if (this.mechId === "umbraSeraph") {
        window.umbraPreviewAssets.applyPose(this.playerSprite, direction, this.driveSpriteMode, this.playerHitbox.x, this.playerHitbox.y + bridge.spriteOffsetY);
      } else {
        const pose = bridge.mechDirectionAssets[this.mechId][direction] || bridge.mechDirectionAssets[this.mechId].down;
        const keys = [pose[this.driveSpriteMode + "Key"], pose.idleKey, pose.boostKey].filter(Boolean);
        const key = keys.find(k => this.textures.exists(k));
        if (key) { this.playerSprite.setTexture(key).setOrigin(0.5); bridge.sourcePrototype.scalePlayerRobotSprite.call(this); }
      }
    }
    syncPlayerVisuals() {
      if (!this.playerSprite) return;
      const motion = this.playerRobotMotion || {};
      this.setPlayerRobotPose(motion.directionKey || this.driveDirection || "down", !!motion.isMoving, this.driveSpriteMode === "boost");
      bridge.sourcePrototype.syncPlayerVisuals.call(this);
      const pose = window.umbraPreviewAssets.getPose(this.driveDirection || "down", this.driveSpriteMode || "idle");
      const present = this.mechId === "umbraSeraph" ? this.textures.exists(pose.key) : this.playerSprite.texture.key !== "__WHITE";
      this.playerSprite.setVisible(present);
      this.fallback.setVisible(!present).setPosition(this.playerHitbox.x, this.playerHitbox.y + bridge.spriteOffsetY);
      const g = this.hitboxGraphics.clear();
      if (this.guides) { g.lineStyle(2, this.isAcEvadeWindowActive?.() ? 0xe4a7ff : 0x66ffcd).strokeCircle(this.playerHitbox.x, this.playerHitbox.y, bridge.hitboxRadius); g.lineBetween(this.playerHitbox.x - 7, this.playerHitbox.y, this.playerHitbox.x + 7, this.playerHitbox.y); }
    }
    setDriveEvasiveLevel(level) {
      if (GROWTH) return;
      if (this.selectionObjects.length) return;
      this.passiveLevels.evasiveFirmware = Phaser.Math.Clamp(Math.floor(level), 0, this.getEvasiveFirmwareMaxLevel());
      this.clearDriveInput(); this.cancelUmbraDriveMotion("EVASIVE_LEVEL_CHANGE"); this.refreshDriveHud();
    }
    applyDriveApUpgrade() {
      if (GROWTH) return;
      if (this.selectionObjects.length) return;
      const choice = this.getPassiveUpgradeChoices().find(c => c.id === "vitalBloom");
      if (!choice) return;
      const before = this.stats.maxHp; choice.onSelect();
      this.lastApUpgrade = { before, after: this.stats.maxHp, delta: this.stats.maxHp - before, description: choice.description, chips: choice.chips };
      this.refreshDriveHud();
    }
    openCandidateCards(openingBoost = false) {
      if (this.selectionObjects.length) return;
      if (GROWTH) {
        if (!this.isUmbraGrowthContextActive?.()) return;
        if (this.pendingLevelUps > 0) { this.showLevelUpChoices(); return; }
        if (CORE) {
          this.syncUmbraCoreMilestones();
          if (this.tryOpenPendingSkillMutationSelection()) return;
        }
        if (EQUIPMENT && this.tryOpenPendingEquipmentOverlimitBonusSelection?.()) return;
        if (openingBoost) return;
        const xp = Math.max(0, this.stats.nextLevelXp - this.stats.xp);
        this.umbraGrowthSyntheticXp = (this.umbraGrowthSyntheticXp || 0) + xp;
        this.gainExperience(xp);
        this.moonlightArena?.refreshHud();
        return;
      }
      this.candidateChoices = this.buildLevelUpUpgradeChoices({ openingBoost, choiceLimit: 3 });
      this.candidateOpeningBoost = openingBoost;
      this.clearDriveInput(); this.pauseUmbraDriveMotion("CANDIDATE_OPEN"); this.physics.world.pause();
      const add = object => { this.selectionObjects.push(object); return object; };
      add(this.ui(this.add.rectangle(450, 425, 880, 440, 0x05121c, 0.98).setStrokeStyle(2, 0x83d4de)));
      add(this.label(40, 220, openingBoost ? "OPENING BOOST 候補確認 / Evasive対象外" : "通常レベルアップ候補 / 取得は任意", 22));
      this.candidateChoices.forEach((choice, i) => {
        const x = 163 + i * 287;
        const card = this.button(x, 371, 270, `${i + 1}  ${choice.title}`, () => this.chooseCandidate(i));
        const phase5Cards = bridge.phantomNovaArena === true;
        const phase4Cards = bridge.bloodSpikeArena === true;
        card.box.setSize(270, phase5Cards ? 290 : phase4Cards ? 230 : 170);
        if (phase5Cards) card.box.setY(420); else if (phase4Cards) card.box.setY(400);
        add(card.box); add(card.caption.setY(phase5Cards ? 291 : phase4Cards ? 303 : 311));
        add(this.label(x - 119, phase5Cards ? 315 : phase4Cards ? 335 : 342, choice.description || choice.subtitle || "", phase5Cards ? 13 : phase4Cards ? 14 : 15).setWordWrapWidth(240));
        if (choice.chipLabel) add(this.label(x - 119, phase5Cards ? 519 : phase4Cards ? 466 : 415, choice.chipLabel, phase5Cards ? 14 : 17, "#a9f4df").setWordWrapWidth(240));
      });
      const close = this.button(449, 596, 288, "取得せず閉じる [Esc]", () => this.closeCandidateCards()); add(close.box); add(close.caption);
      // The cards exist, are visible and belong to this active presentation before consumption.
      const presentationState = this.levelUpCandidatePresentationState;
      this.drivePresentationHandler = () => {
        if (this.sys.isActive() && this.selectionObjects.length && this.levelUpCandidatePresentationState === presentationState) {
          this.markLevelUpChoicesPresented(this.candidateChoices, { openingBoost, selectionMode: "level", presentationState });
        }
        this.drivePresentationHandler = null;
      };
      this.game.events.once("postrender", this.drivePresentationHandler);
    }
    chooseCandidate(index) {
      if (GROWTH) { this.selectLevelUpCard(index); return; }
      const choice = this.candidateChoices?.[index];
      if (!choice || !this.selectionObjects.length) return;
      const current = this.getPassiveUpgradeChoices({ openingBoost: this.candidateOpeningBoost }).find(c => c.id === choice.id);
      if (current) current.onSelect();
      this.closeCandidateCards();
    }
    closeCandidateCards(options = {}) {
      if (GROWTH) {
        if (CORE && options.preserveCoreSelection !== true && this.levelUpSelectionMode === "skillMutation") this.closeUmbraCoreSelection?.();
        if (EQUIPMENT && options.preserveEquipmentSelection !== true && this.levelUpSelectionMode === "equipmentOverlimitBonus") this.closeUmbraEquipmentOverlimitSelection?.();
        this.umbraGrowthOverlayOwner = null;
        this.levelUpOpenTimer?.remove(false); this.levelUpOpenTimer = null;
        this.levelUpSelectTimer?.remove(false); this.levelUpSelectTimer = null;
        for (const record of this.levelUpCardRecords || []) this.tweens?.killTweensOf(record.container);
        this.levelUpCardRecords = [];
        this.levelUpInputEnabled = false; this.levelUpSelectionLocked = true;
        this.levelUpActive = false;
        if (CORE) this.levelUpSelectionMode = null;
      }
      if (this.drivePresentationHandler) this.game.events.off("postrender", this.drivePresentationHandler);
      this.drivePresentationHandler = null;
      (this.selectionObjects || []).forEach(o => { const index = this.uiObjects?.indexOf(o); if (index >= 0) this.uiObjects.splice(index, 1); o.destroy(); });
      this.selectionObjects = []; this.candidateChoices = [];
      if (this.physics?.world && !this.driveShuttingDown && !this.drivePaused && !this.driveHidden) { this.driveResumePending = true; this.physics.world.resume(); }
    }
    showLevelUpCardOverlay(title, subtitle, choices, mode, options = {}) {
      if (!GROWTH || !this.isUmbraGrowthContextActive?.()) return;
      // The production mutation opener owns its new selection before it asks
      // presentation to replace the previous overlay. Keep that new FIFO head.
      this.closeCandidateCards({ preserveCoreSelection: CORE && mode === "skillMutation",
        preserveEquipmentSelection: EQUIPMENT && mode === "equipmentOverlimitBonus" });
      this.levelUpActive = true; this.levelUpSelectionMode = mode;
      this.levelUpOpeningBoostActive = options.openingBoost === true;
      this.candidateOpeningBoost = options.openingBoost === true;
      this.candidateChoices = choices;
      this.levelUpInputEnabled = false; this.levelUpSelectionLocked = false;
      const owner = { run: this.umbraGrowthRun, context: this.verificationContext };
      this.umbraGrowthOverlayOwner = owner;
      this.clearDriveInput(); this.pauseUmbraDriveMotion("GROWTH_CANDIDATE_OPEN"); this.physics.world.pause();
      this.driveResumePending = false;
      const add = object => { this.selectionObjects.push(object); return object; };
      add(this.ui(this.add.rectangle(640, 420, 1260, 580, 0x05121c, 0.98).setStrokeStyle(2, 0x83d4de).setInteractive()));
      const coreSelection = CORE && mode === "skillMutation";
      const finalSelection = FINAL && coreSelection && choices.every(option => option.phase === "stage8");
      const equipmentBonus = EQUIPMENT && mode === "equipmentOverlimitBonus";
      add(this.label(36, 142, `${title} / ${equipmentBonus ? `${choices.length}候補・通常成長の回数は消費しません` : coreSelection ? `${finalSelection ? "Final" : "Core"} 3択・通常成長の回数は消費しません` : options.openingBoost ? "Opening 3回" : "合成XP・本番成長計算"}`, 22));
      add(this.label(36, 178, `${subtitle}  •  ${EQUIPMENT ? "装備は開始時固定／通常OVLとFinal・Deep bonusは別機会" : TRIAD ? "TRIADは正規選択の確定後に集計／装備未接続" : FINAL ? "Core＋Finalは武装ごとに各1回／TRIAD・装備未接続" : CORE ? "Coreは武装ごとに1回選択／Final未実装" : "基本Stage成長のみ／MutationはPhase 6C接続待ち"}`, 14, "#a9d8dd"));
      const width = choices.length === 4 ? 288 : 380, gap = 16;
      const total = choices.length * width + (choices.length - 1) * gap;
      this.levelUpCardRecords = choices.map((option, index) => {
        const x = (1280 - total) / 2 + width / 2 + index * (width + gap), y = 423;
        const equipmentCard = EQUIPMENT ? option.umbraEquipmentCard : null;
        const coreCard = equipmentCard || (finalSelection ? option.umbraFinalCard : coreSelection ? option.umbraCoreCard : null);
        const coreColor = coreCard ? ({ assault: 0xedbe87, control: 0xafaaff, reactor: 0xa8edf0 }[coreCard.coreId] || 0x438998) : 0x438998;
        const background = this.add.rectangle(0, 0, width, 394, 0x123040).setStrokeStyle(2, coreColor).setInteractive({ useHandCursor: true });
        const text = (tx, ty, value, size, color = "#daf3f1") => this.add.text(tx, ty, value, {
          fontFamily: "Segoe UI, Yu Gothic UI, sans-serif", fontSize: `${size}px`, color,
          wordWrap: { width: width - 32, useAdvancedWrap: true }, lineSpacing: 3
        });
        const badge = equipmentCard ? "EQUIPMENT OVERLIMIT" : finalSelection ? "FINAL MUTATION" : coreCard ? "CORE MUTATION" : option.type === "skill" ? (option.actionType === "unlock" ? "NEW SKILL" : "SKILL UPGRADE") : "PASSIVE CHIP";
        const stage = option.nextStage?.stage;
        const progress = coreCard ? `現在 S${this.getUmbraActiveSkillStage(coreCard.skillId)?.stage || "—"} / Stageは変化しません`
          : stage ? `${"●".repeat(stage)}${"○".repeat(8 - stage)}  S${stage}` : "共通statは1選択につき1回だけ適用";
        const chips = (coreCard?.chips || option.umbraGrowthCard?.chips || option.chips || []).map(chip => typeof chip === "string" ? chip : chip.label).filter(Boolean).join(" / ") || option.chipLabel || "";
        const items = [background, text(-width / 2 + 16, -181, `${index + 1}  ${badge}`, 14, "#88e9db"),
          text(-width / 2 + 16, -148, option.title, choices.length === 4 || finalSelection ? 16 : 19),
          text(-width / 2 + 16, coreCard ? -86 : -98, progress, 14, "#eedca0"),
          text(-width / 2 + 16, coreCard ? -47 : -59, coreCard?.description || option.description || option.subtitle || "", choices.length === 4 ? 12 : 14),
          text(-width / 2 + 16, coreCard ? 108 : 135, chips, choices.length === 4 ? 12 : 14, "#a9f4df")];
        const container = add(this.ui(this.add.container(x, y, items)));
        const record = { container, background, model: { option }, selected: false, disabled: false, ...(coreCard ? { coreColor } : {}) };
        background.on("pointerdown", () => {
          if (this.umbraGrowthOverlayOwner === owner && this.levelUpCardRecords?.[index] === record) this.selectLevelUpCard(index);
        });
        return record;
      });
      const close = this.button(640, 672, 365, "保留して閉じる [Esc] / 選択回数は消費しません", () => this.closeCandidateCards());
      add(close.box); add(close.caption);
      const presentationState = this.levelUpCandidatePresentationState;
      this.drivePresentationHandler = () => {
        if (this.sys.isActive() && this.umbraGrowthOverlayOwner === owner && this.umbraGrowthRun === owner.run) {
          this.markLevelUpChoicesPresented(choices, { openingBoost: options.openingBoost, selectionMode: mode, presentationState });
          this.levelUpInputEnabled = true;
        }
        this.drivePresentationHandler = null;
      };
      this.game.events.once("postrender", this.drivePresentationHandler);
    }
    drawLevelUpCardBackground(record) {
      record.background?.setStrokeStyle(record.selected ? 3 : 2, record.selected ? 0xccfff1 : record.disabled ? 0x315568 : record.coreColor || 0x438998);
    }
    toggleDrivePause() {
      if (this.gameOver) { this.refreshDriveHud(); return; }
      this.drivePaused = !this.drivePaused; this.clearDriveInput();
      if (this.drivePaused) this.pauseUmbraDriveMotion("PAUSE");
      else this.driveResumePending = !this.selectionObjects.length;
      this.drivePaused ? this.physics.world.pause() : (!this.selectionObjects.length && this.physics.world.resume());
      this.recordTransition(this.drivePaused ? "PAUSE" : "RESUME");
    }
    snapshot() {
      const state = this.ensureAcMovementState(), now = this.time.now;
      const body = this.playerHitbox.body, continuous = state.continuousBoost || {}, evade = state.evadeWindow || {};
      return {
        at: now - this.driveStartedAt, mech: this.mechId, fixture: this.fixtureId, x: this.playerHitbox.x, y: this.playerHitbox.y,
        vx: body.velocity.x, vy: body.velocity.y, speed: body.velocity.length(), stateSpeed: Math.hypot(state.velocity.x, state.velocity.y), allowedSpeed: state.lastAllowedSpeed,
        en: this.stats.stamina, maxEn: this.stats.maxStamina, hp: this.stats.hp, maxHp: this.stats.maxHp,
        mode: state.mode, boostActive: !!continuous.active, boostMode: state.boostMode,
        endReason: continuous.endReason || state.variableQuickBoost?.endReason || "NONE", failReason: state.lastQuickBoostFailReason || "NONE",
        fullOverheat: this.isAcFullOverheatActive(state), mustRelease: !!state.mustReleaseDashBeforeBoost,
        evasiveLevel: this.getEvasiveFirmwareLevel(), invulnerable: this.isAcEvadeWindowActive(now, state), evadeRemainingMs: this.getAcEvadeWindowRemainingMs(now, state), evadeReason: evade.lastReason,
        startAt: state.lastQuickBoostSuccessAt, regenBlockedUntil: state.boostRegenBlockedUntil, airBrake: !!state.airBrake?.active,
        airBrakeVariant: this.getUmbraAirBrakeCalibration() ? "tuned" : "legacy",
        brake: { ...state.airBrake, direction: { ...state.airBrake.direction }, velocityBefore: { ...state.airBrake.velocityBefore } },
        collided: body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down || body.touching.left || body.touching.right || body.touching.up || body.touching.down,
        input: { ...state.lastInputVector, dash: !!state.lastDashInput?.isDown }, updates: this.sceneUpdates, physicsSteps: this.physicsSteps, renderFrames: this.renderFrames
      };
    }
    recordTransition(event) { if (this.stats && this.acMovementState) this.transitions.push({ event, ...this.snapshot() }); if (this.transitions.length > 1200) this.transitions.shift(); }
    refreshDriveHud() {
      const snap = this.snapshot(), profile = this.getRunPlayerMechStatProfile();
      const tuning = this.getActiveAcMovementTuning();
      this.statLabel.setText(`AP ${fmt(snap.hp, 0)} / ${fmt(snap.maxHp, 0)}\n実速度 ${fmt(snap.speed)} px/s\n通常上限 ${fmt(this.getAcMovementBaseSpeed() * tuning.maxCruiseSpeedMultiplier)} / 現上限 ${fmt(snap.allowedSpeed)}\n設定: AP ×${profile.maxHpMultiplier} / MOVE ×${profile.moveSpeedMultiplier}`);
      const regen = this.getAcBoostRegenPerSecond() * (snap.fullOverheat ? this.getAcFullOverheatRegenMultiplier() : 1);
      this.energyLabel.setText(`BOOST EN ${fmt(snap.en)} / ${fmt(snap.maxEn, 0)}\n消費 ${fmt(this.getAcContinuousBoostDrainPerSecond(0))} → ${fmt(this.getAcContinuousBoostDrainPerSecond(1))}/s\n開始 ${fmt(this.getAcContinuousBoostStartCost())} / 回復能力 ${fmt(regen)}/s\n${snap.fullOverheat ? "FULL_OVERHEAT" : snap.boostActive ? "消費中" : this.time.now < snap.regenBlockedUntil ? "回復待ち" : snap.en < snap.maxEn ? "回復中" : "満タン"}  ${snap.mustRelease ? "NEED_RELEASE" : ""}`);
      const startCheck = this.canStartAcContinuousBoost(this.acMovementState, this.time.now);
      this.stateLabel.setText(`${snap.mode}\n終了: ${snap.endReason}\n開始判定: ${snap.boostActive ? "BOOST継続中" : startCheck.allowed ? "READY" : startCheck.reason}\n物理step ${snap.physicsSteps} / 衝突 ${this.collisionCount}`);
      const upgrade = this.getPassiveUpgradeChoices().find(c => c.id === "vitalBloom");
      this.evasionLabel.setText(`Evasive Lv.${snap.evasiveLevel} / ${fmt(this.getAcEvadeWindowDurationMs(), 0)} ms\n無敵 ${snap.invulnerable ? "ON" : "OFF"} / 残 ${fmt(snap.evadeRemainingMs, 0)} ms\n${upgrade?.description || "AP Reinforce: 上限"}`);
      this.statusLabel.setText(`${this.gameOver ? "試走終了（AP0） / Rで新規試験" : this.drivePaused ? "停止中" : "試走中"}  •  x ${fmt(snap.x, 0)} / y ${fmt(snap.y, 0)}  •  ${this.getAcMovementPresetName?.() || "acV3"}  •  新規試走 R / 判定 H / 停止 P`);
      this.refreshDriveTraceHud();
      this.moonlightArena?.refreshHud();
    }
    update(time, delta) {
      if (!this.stats) return;
      if (this.drivePaused || this.driveHidden || this.selectionObjects.length) { this.refreshDriveTraceHud(); this.moonlightArena?.refreshHud(); return; }
      if (this.driveResumePending) { this.driveResumePending = false; this.resumeUmbraDriveMotion(); delta = 0; }
      this.sceneUpdates += 1;
      this.updateGamepadState(time, delta);
      this.updateAcPlayerMovement(delta);
      this.moonlightArena?.update(time, delta);
      const snap = this.snapshot();
      const stateKey = [snap.mode, snap.boostActive, snap.endReason, snap.failReason, snap.fullOverheat, snap.mustRelease, snap.invulnerable, snap.airBrake].join("|");
      if (stateKey !== this.previousStateKey) { this.previousStateKey = stateKey; this.recordTransition("STATE"); }
      if (time - this.lastSampleAt >= 40) { this.lastSampleAt = time; this.samples.push(snap); if (this.samples.length > 6000) this.samples.shift(); this.refreshDriveHud(); }
    }
  };
};
