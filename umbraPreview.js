/* Local, display-only Phase 1 scenes. Loaded only by ?umbraPreview=1. */
window.createUmbraPhase1Scenes = function createUmbraPhase1Scenes(bridge) {
  "use strict";
  const assets = window.umbraPreviewAssets;
  const TITLE = "PHASE 1 PREVIEW／攻撃未実装／進行保存なし";
  const SIGNAL = "umbra-phase1-assets-changed";
  const FONT = "Segoe UI, Yu Gothic UI, sans-serif";
  const MODE_LABELS = { idle: "停止", move: "通常移動", boost: "ブースト" };
  const ANGLES = { down: 90, downLeft: 135, left: 180, upLeft: -135, up: -90, upRight: -45, right: 0, downRight: 45 };
  const effectDisplayScale = (effect, scale) => [
    scale * (effect.resolutionScale?.x ?? 1),
    scale * (effect.resolutionScale?.y ?? 1)
  ];
  const text = (scene, x, y, label, size = 16, color = "#bdd7e5") => scene.add.text(x, y, label, {
    fontFamily: FONT, fontSize: `${size}px`, color, lineSpacing: 3
  }).setDepth(40);
  const button = (scene, x, y, width, label, action) => {
    const box = scene.add.rectangle(x, y, width, 34, 0x112b3d).setStrokeStyle(1, 0x46809e, 0.8)
      .setDepth(40).setInteractive({ useHandCursor: true });
    const caption = text(scene, x, y, label, 14, "#dcf5ff").setOrigin(0.5);
    box.on("pointerdown", action);
    box.on("pointerover", () => box.setFillStyle(0x23465a));
    box.on("pointerout", () => box.setFillStyle(0x112b3d));
    return { box, caption };
  };

  // This scene owns the loader for the lifetime of the preview Game. Display scenes
  // can stop/restart while requests are in flight without reusing an old Loader.
  class UmbraPhase1Assets extends Phaser.Scene {
    constructor() { super("UmbraPhase1Assets"); }
    create() {
      this.status = { total: 27, loaded: 0, failed: [], finished: false };
      this.alive = true;
      this.scene.launch(bridge.startDrive ? "UmbraPhase2ADrive" : "UmbraPhase1Preview");
      const changed = () => { if (this.alive) this.game.events.emit(SIGNAL); };
      this.fileComplete = (key) => {
        if (!this.alive) return;
        this.registerFrames(key);
        this.status.loaded += 1;
        changed();
      };
      this.fileError = (file) => {
        if (!this.alive) return;
        this.status.failed.push(file.key);
        changed();
      };
      this.complete = () => { if (this.alive) { this.status.finished = true; changed(); } };
      this.load.on("filecomplete", this.fileComplete);
      this.load.on("loaderror", this.fileError);
      this.load.once("complete", this.complete);
      this.events.once("shutdown", () => {
        this.alive = false;
        this.load.off("filecomplete", this.fileComplete);
        this.load.off("loaderror", this.fileError);
        this.load.off("complete", this.complete);
      });
      const images = assets.directionOrder.flatMap((direction) => assets.modeOrder.map((mode) => assets.getPose(direction, mode)))
        .concat(Object.values(assets.effects));
      images.forEach(({ key, path }) => {
        if (this.textures.exists(key)) {
          this.registerFrames(key);
          this.status.loaded += 1;
        } else {
          this.load.image(key, `${path}?v=umbra-assets-compressed-v3`, { timeout: 10000 });
        }
      });
      if (this.load.list.size > 0) this.load.start();
      else this.complete();
    }
    registerFrames(key) {
      const effect = Object.values(assets.effects).find((entry) => entry.key === key);
      if (!effect || !this.textures.exists(key)) return;
      const texture = this.textures.get(key);
      effect.frames.forEach((frame) => {
        if (!texture.has(frame.name)) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height);
      });
    }
  }

  class UmbraPhase1Preview extends Phaser.Scene {
    constructor() { super("UmbraPhase1Preview"); }
    create() {
      this.isUmbraPhase1Preview = true;
      this.direction = "down";
      this.mode = "idle";
      this.effectId = bridge.skillSlots[0];
      this.frameIndex = 0;
      this.playing = false;
      this.frameElapsed = 0;
      this.guides = true;
      this.motionEnabled = false;
      this.trailsEnabled = false;
      this.galleryOpen = false;
      this.forceFallback = false;
      this.owned = new Set(bridge.skillSlots.filter((id) => bridge.skillDefinitions[id]?.previewStartsUnlocked));
      this.playerRobotMotion = { directionKey: "down", angle: Math.PI / 2, hoverMs: 0, lift: 0, tiltAngle: 0 };
      this.afterimages = [];
      this.add.rectangle(640, 360, 1280, 720, 0x050b13);
      text(this, 28, 18, TITLE, 21, "#9ee6ff");
      text(this, 28, 52, "KGK-02 UMBRA SERAPH  /  VISUAL INSPECTION", 28, "#effaff");
      button(this, 1053, 37, 112, "再起動 [R]", () => this.scene.restart());
      button(this, 866, 37, 224, "移動通知 PHASE 2B [D]", () => this.scene.start("UmbraPhase2ADrive"));
      button(this, 1190, 37, 112, "検証終了", () => this.scene.start("UmbraPhase1Stopped"));
      this.loadLabel = text(this, 790, 83, "素材を読み込み中", 13);
      this.add.rectangle(305, 308, 566, 410, 0x0a1723).setStrokeStyle(1, 0x2c566b);
      this.add.rectangle(935, 308, 650, 410, 0x0a1723).setStrokeStyle(1, 0x2c566b);
      this.poseLabel = text(this, 40, 116, "", 18, "#eef8ff");
      this.effectLabel = text(this, 630, 116, "", 18, "#eef8ff");
      this.add.ellipse(305, 444, 175, 28, 0x000000, 0.4);
      this.playerHitbox = this.add.circle(305, 301, bridge.hitboxRadius, 0x88ffcc, 0);
      this.physics.add.existing(this.playerHitbox);
      this.playerHitbox.body.setCircle(bridge.hitboxRadius);
      this.playerHitbox.body.setImmovable(true);
      this.playerSprite = this.add.image(305, 312, "__WHITE").setDepth(20).setVisible(false);
      this.poseFallback = this.add.container(305, 312, [
        this.add.rectangle(0, 0, 56, 82, 0x102e45).setStrokeStyle(2, 0x69b8d8),
        this.add.triangle(0, -53, 0, 22, 20, 0, 40, 22, 0x7e548f),
        text(this, 0, 67, "素材未読込 / FALLBACK", 14).setOrigin(0.5)
      ]).setDepth(20);
      this.effectSprite = this.add.image(934, 319, "__WHITE").setVisible(false);
      this.effectFallback = text(this, 934, 310, "素材未読込\n表示のみの FALLBACK", 20, "#8daac0").setOrigin(0.5);
      this.guideGraphics = this.add.graphics().setDepth(25);
      this.poseInfo = text(this, 40, 465, "", 12);
      this.frameInfo = text(this, 630, 465, "", 12);
      this.gallery = this.add.container(0, 0).setDepth(45);
      this.skillButtons = bridge.skillSlots.map((id, i) => button(this, 725 + i * 204, 542, 194,
        bridge.skillDefinitions[id].hudLabel || assets.effects[id].label, () => this.selectEffect(id)));
      this.directionButtons = assets.directionOrder.map((direction, i) => button(this, 55 + i * 69, 541, 64,
        assets.directions[direction].label, () => this.selectPose(direction, this.mode)));
      this.modeButtons = assets.modeOrder.map((mode, i) => button(this, 113 + i * 186, 586, 172,
        `${i + 1}  ${MODE_LABELS[mode]}`, () => this.selectPose(this.direction, mode)));
      button(this, 660, 586, 56, "← [", () => this.stepFrame(-1));
      this.playButton = button(this, 798, 586, 202, "再生 / 停止 [Space]", () => this.togglePlayback());
      button(this, 938, 586, 56, "] →", () => this.stepFrame(1));
      this.ownButton = button(this, 1117, 586, 274, "取得 / 未取得 [U]", () => this.toggleOwned());
      button(this, 110, 634, 166, "8方向一覧 [G]", () => { this.galleryOpen = !this.galleryOpen; this.refreshGallery(); });
      button(this, 287, 634, 166, "基準点・判定 [H]", () => { this.guides = !this.guides; this.refreshGuides(); this.refreshGallery(); });
      button(this, 464, 634, 166, "傾き・浮遊 [M]", () => { this.motionEnabled = !this.motionEnabled; this.refreshPose(); });
      button(this, 650, 634, 182, "残像表示 [T]", () => { this.trailsEnabled = !this.trailsEnabled; this.refreshTrails(); });
      button(this, 849, 634, 192, "欠損表示テスト [F]", () => { this.forceFallback = !this.forceFallback; this.refresh(); });
      button(this, 1120, 634, 272, "8コマ一覧 [V]", () => { this.galleryOpen = this.galleryOpen === "effects" ? false : "effects"; this.refreshGallery(); });
      this.summaryLabel = text(this, 28, 675, "", 14, "#c3cbe1");
      this.keyHandler = (event) => {
        if (event.repeat || this.lastKeyEvent === event) return;
        this.lastKeyEvent = event;
        const key = event.key.toLowerCase();
        const actions = {
          r: () => this.scene.restart(), escape: () => this.scene.start("UmbraPhase1Stopped"),
          d: () => this.scene.start("UmbraPhase2ADrive"),
          "1": () => this.selectPose(this.direction, "idle"), "2": () => this.selectPose(this.direction, "move"), "3": () => this.selectPose(this.direction, "boost"),
          arrowleft: () => this.rotatePose(-1), arrowright: () => this.rotatePose(1),
          "[": () => this.stepFrame(-1), "]": () => this.stepFrame(1), " ": () => this.togglePlayback(),
          u: () => this.toggleOwned(), g: () => { this.galleryOpen = !this.galleryOpen; this.refreshGallery(); },
          v: () => { this.galleryOpen = this.galleryOpen === "effects" ? false : "effects"; this.refreshGallery(); },
          h: () => { this.guides = !this.guides; this.refreshGuides(); this.refreshGallery(); },
          m: () => { this.motionEnabled = !this.motionEnabled; this.refreshPose(); },
          t: () => { this.trailsEnabled = !this.trailsEnabled; this.refreshTrails(); },
          f: () => { this.forceFallback = !this.forceFallback; this.refresh(); }
        };
        if (actions[key]) { event.preventDefault(); actions[key](); }
      };
      this.input.keyboard.on("keydown", this.keyHandler);
      this.assetHandler = () => { if (this.sys.isActive()) this.refresh(); };
      this.game.events.on(SIGNAL, this.assetHandler);
      this.events.once("shutdown", () => {
        this.playing = false;
        this.input.keyboard.off("keydown", this.keyHandler);
        this.game.events.off(SIGNAL, this.assetHandler);
        this.afterimages = [];
      });
      this.refresh();
    }
    isDepth10HumanPlayerVisualActive() { return false; }
    isAcV3MovementPreset() { return false; }
    getActiveAcMovementTuning() { return bridge.afterimageTuning; }
    updateRegaliaBastionLandingFxTrigger() { /* Preview has no Regalia FX or combat runtime. */ }
    updateRegaliaBastionMovementSe() { /* Audio is disabled for the preview Game. */ }
    getPlayerRobotDirectionKeyForAngle(angle) { return bridge.getPlayerRobotDirectionKeyForAngle.call(this, angle); }
    setPlayerRobotPose(direction, moving, boost) { bridge.setPlayerRobotPose.call(this, direction, moving, boost); }
    renderUmbraPreviewPose(direction, mode) {
      const y = this.playerHitbox.y + bridge.spriteOffsetY + (this.motionEnabled ? this.playerRobotMotion.lift : 0);
      const present = !this.forceFallback && assets.applyPose(this.playerSprite, direction, mode, this.playerHitbox.x, y, 1.05);
      this.playerSprite.setVisible(Boolean(present)).setAngle(this.motionEnabled ? this.playerRobotMotion.tiltAngle : 0);
      this.poseFallback.setVisible(!present).setPosition(this.playerHitbox.x, y);
    }
    refreshPose() {
      const angle = Phaser.Math.DegToRad(ANGLES[this.direction]);
      bridge.updatePlayerRobotMotion.call(this, 0, { x: Math.cos(angle), y: Math.sin(angle) }, this.mode !== "idle", this.mode === "boost", true, this.mode === "boost");
      const pose = assets.getPose(this.direction, this.mode);
      this.poseLabel.setText(`${assets.directions[this.direction].angleLabel} / ${assets.directions[this.direction].label}   ${MODE_LABELS[this.mode]}`);
      this.poseInfo.setText(`胴体基準 (${pose.pivotPx.x}, ${pose.pivotPx.y})  倍率 ${pose.displayScale.toFixed(3)} × 表示拡大1.05\norigin (${pose.origin.x.toFixed(3)}, ${pose.origin.y.toFixed(3)})  hitbox R${bridge.hitboxRadius}`);
      this.refreshTrails();
      this.refreshGuides();
    }
    refreshTrails() {
      this.afterimages.forEach((image) => image.destroy());
      this.afterimages = [];
      if (!this.trailsEnabled || !this.playerSprite.visible) return;
      for (let i = 1; i <= 3; i += 1) {
        this.afterimages.push(bridge.createAcAfterimageObject.call(this, this.playerSprite.x - i * 20, this.playerSprite.y + i * 4, i, 3, 1));
      }
    }
    selectPose(direction, mode) {
      if (!assets.directionOrder.includes(direction) || !assets.modeOrder.includes(mode)) return;
      this.direction = direction;
      this.mode = mode;
      this.refreshPose();
      this.refreshGallery();
    }
    rotatePose(step) {
      this.selectPose(assets.directionOrder[(assets.directionOrder.indexOf(this.direction) + step + 8) % 8], this.mode);
    }
    selectEffect(id) {
      if (!bridge.skillSlots.includes(id)) return;
      this.effectId = id;
      this.frameIndex = 0;
      this.playing = false;
      this.frameElapsed = 0;
      this.refreshEffect();
      this.refreshGallery();
    }
    stepFrame(step) {
      this.playing = false;
      this.frameElapsed = 0;
      this.frameIndex = (this.frameIndex + step + 8) % 8;
      this.refreshEffect();
    }
    togglePlayback() {
      this.playing = !this.playing;
      this.frameElapsed = 0;
      if (this.playing) this.frameIndex = 0;
      this.refreshEffect();
    }
    toggleOwned() {
      if (this.owned.has(this.effectId)) this.owned.delete(this.effectId);
      else this.owned.add(this.effectId);
      this.refreshEffect();
    }
    refreshEffect() {
      const effect = assets.effects[this.effectId];
      const frame = effect.frames[this.frameIndex];
      const present = !this.forceFallback && this.textures.exists(effect.key) && this.textures.get(effect.key).has(frame.name);
      const anchorY = this.effectId === "umbraBloodSpike" ? 409 : 316;
      if (present) this.effectSprite.setTexture(effect.key, frame.name).setOrigin(frame.origin.x, frame.origin.y)
        .setScale(...effectDisplayScale(effect, effect.displayScale)).setPosition(934, anchorY);
      this.effectSprite.setVisible(Boolean(present));
      this.effectFallback.setVisible(!present);
      this.effectLabel.setText(`${effect.label}   ${this.frameIndex + 1}/8   ${this.playing ? "再生中" : "静止"}`);
      this.frameInfo.setText(`rect (${frame.x}, ${frame.y}, ${frame.width}, ${frame.height})  pivot (${frame.pivotPx.x}, ${frame.pivotPx.y})\n順序 ${this.frameIndex + 1} → ${this.frameIndex === 7 ? (effect.repeat === -1 ? "1" : "停止") : this.frameIndex + 2}  /  確認用 ${effect.frameRate} fps・${effect.repeat === -1 ? "ループ" : "1回"}`);
      this.skillButtons.forEach((item, i) => {
        const id = bridge.skillSlots[i];
        item.caption.setText(`${bridge.skillDefinitions[id].hudLabel || assets.effects[id].label}\n${this.owned.has(id) ? "取得表示" : "未取得表示"}`).setFontSize(12);
        item.box.setStrokeStyle(id === this.effectId ? 2 : 1, id === this.effectId ? 0xad88ef : 0x46809e);
      });
      const candidates = bridge.skillSlots.filter((id) => !this.owned.has(id)).map((id) => assets.effects[id].label);
      this.summaryLabel.setText(`表示用 Unlock 候補: ${candidates.join(" / ") || "なし"}   ｜ Stage成長・効果・ダメージなし   ｜ 倍率・再生速度は検証用`);
      this.refreshGuides();
    }
    refreshGuides() {
      if (!this.guideGraphics) return;
      const g = this.guideGraphics.clear().setVisible(this.guides);
      if (!this.guides) return;
      g.lineStyle(1, 0x75edb7, 0.85).strokeCircle(this.playerHitbox.x, this.playerHitbox.y, bridge.hitboxRadius);
      const crosses = [[this.playerHitbox.x, this.playerHitbox.y + bridge.spriteOffsetY], [934, this.effectId === "umbraBloodSpike" ? 409 : 316]];
      crosses.forEach(([x, y]) => {
        g.lineStyle(1, 0x76d6ff, 0.7).lineBetween(x - 18, y, x + 18, y).lineBetween(x, y - 18, x, y + 18);
      });
    }
    refreshGallery() {
      this.gallery.removeAll(true);
      if (!this.galleryOpen) return;
      this.gallery.add(this.add.rectangle(640, 311, 1240, 418, 0x091724).setStrokeStyle(1, 0x52869d));
      const effects = this.galleryOpen === "effects";
      this.gallery.add(text(this, 40, 112, effects ? `${assets.effects[this.effectId].label}  /  8 FRAMES・同一縮尺` : `KGK-02  /  ${MODE_LABELS[this.mode]}・8 DIRECTIONS`, 17, "#e4f4ff"));
      const effect = assets.effects[this.effectId];
      for (let i = 0; i < 8; i += 1) {
        const x = 173 + (i % 4) * 308;
        const y = (effects ? 230 : 218) + Math.floor(i / 4) * 184;
        const direction = assets.directionOrder[i];
        const record = effects ? effect.frames[i] : assets.getPose(direction, this.mode);
        const key = effects ? effect.key : record.key;
        const anchorY = effects && this.effectId === "umbraBloodSpike" ? y + 48 : y;
        if (!this.forceFallback && this.textures.exists(key)) {
          const image = this.add.image(x, anchorY, key, effects ? record.name : undefined);
          if (effects) image.setOrigin(record.origin.x, record.origin.y).setScale(...effectDisplayScale(effect, 0.35));
          else assets.applyPose(image, direction, this.mode, x, y, 0.58);
          this.gallery.add(image);
        } else this.gallery.add(text(this, x, y, "FALLBACK", 14).setOrigin(0.5));
        if (this.guides) {
          this.gallery.add(this.add.rectangle(x, anchorY, 20, 1, 0x7efac0));
          this.gallery.add(this.add.rectangle(x, anchorY, 1, 20, 0x7efac0));
        }
        this.gallery.add(text(this, x, y + (effects ? 73 : 91), effects ? `FRAME ${i + 1}  (${record.width}×${record.height})` : `${assets.directions[direction].angleLabel}  ${assets.directions[direction].label}`, 13).setOrigin(0.5));
      }
    }
    refresh() {
      const status = this.scene.get("UmbraPhase1Assets").status;
      this.loadLabel.setText(`素材 ${status.loaded}/${status.total}  ${status.failed.length ? `欠損 ${status.failed.length} → FALLBACK` : status.finished ? "読み込み完了" : "読み込み中・操作可能"}`);
      this.refreshPose();
      this.refreshEffect();
      this.refreshGallery();
    }
    update(time, delta) {
      if (this.motionEnabled) {
        const angle = Phaser.Math.DegToRad(ANGLES[this.direction]);
        bridge.updatePlayerRobotMotion.call(this, Math.min(delta, 100), { x: Math.cos(angle), y: Math.sin(angle) }, this.mode !== "idle", this.mode === "boost", true, this.mode === "boost");
        this.afterimages.forEach((image, index) => image.setAngle(this.playerSprite.angle).setPosition(this.playerSprite.x - (index + 1) * 20, this.playerSprite.y + (index + 1) * 4));
      }
      if (!this.playing) return;
      const effect = assets.effects[this.effectId];
      this.frameElapsed += Math.min(delta, 100);
      if (this.frameElapsed < 1000 / effect.frameRate) return;
      this.frameElapsed -= 1000 / effect.frameRate;
      if (this.frameIndex === 7 && effect.repeat !== -1) this.playing = false;
      else this.frameIndex = (this.frameIndex + 1) % 8;
      this.refreshEffect();
    }
  }

  class UmbraPhase1Stopped extends Phaser.Scene {
    constructor() { super("UmbraPhase1Stopped"); }
    create() {
      text(this, 640, 260, TITLE, 24, "#9ee6ff").setOrigin(0.5);
      text(this, 640, 320, "検証を終了しました。表示用状態は破棄されました。", 22).setOrigin(0.5);
      text(this, 640, 365, "通常ゲームを開く操作で、通常の保存・通信処理が始まります。", 16).setOrigin(0.5);
      button(this, 465, 430, 280, "Preview を新しく開く", () => this.scene.start("UmbraPhase1Preview"));
      button(this, 815, 430, 280, "通常ゲームを開く", () => window.location.assign(`${window.location.pathname}?mobileGate=0&mobileControls=0`));
    }
  }
  return [UmbraPhase1Assets, UmbraPhase1Preview, UmbraPhase1Stopped, window.createUmbraPhase2ADriveScene(bridge)];
};
