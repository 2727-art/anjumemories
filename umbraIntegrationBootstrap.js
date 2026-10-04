(function () {
  "use strict";

  // This file is loaded only by the dedicated local integration entry, before
  // Phaser and game.js. It never reads or replaces the browser's Storage APIs.
  const VERSION = "umbra-phase7b-v1";
  const ENVIRONMENT_KEY = "__UMBRA_INTEGRATION_ENVIRONMENT__";
  const ENTRY_PATH = "/umbra-integration.html";
  const RECORD_LIMIT = 5000;
  const FIXTURES = Object.freeze({
    baseline: Object.freeze({ id: "baseline", mechId: "umbraSeraph", startDepth: 1, mode: "natural", label: "UMBRA / 基礎値 / Depth 1", syntheticDescription: "試験permitのみでUMBRAを指定。合成進行はanjuのみ・永続強化0・装備なし・確定GEEK 0。" }),
    standard: Object.freeze({ id: "standard", mechId: "defaultBear", startDepth: 1, mode: "natural", label: "標準機 / 基礎値 / Depth 1", syntheticDescription: "合成進行は標準機所有・anjuのみ・永続強化0・装備なし・確定GEEK 0。" }),
    regalia: Object.freeze({ id: "regalia", mechId: "regaliaBastion", startDepth: 1, mode: "natural", label: "REGALIA / 基礎値 / Depth 1", syntheticDescription: "既存schema内のREGALIA所有を合成。実購入ではありません。anjuのみ・永続強化0・装備なし・確定GEEK 0。" }),
    medium: Object.freeze({ id: "medium", mechId: "umbraSeraph", startDepth: 1, mode: "natural", shopLevel: 10, equipment: "medium", label: "UMBRA / 中程度の開始強化 / 通常進行", syntheticDescription: "合成開始条件：武器・装甲・脚・Cooling各10、anju/hanseikai/miraiwoikiteru、5SR★3 +5、GEEK 0。ラン内Stage・XP・パッシブの無料付与なし。" }),
    complete: Object.freeze({ id: "complete", mechId: "umbraSeraph", startDepth: 1, mode: "boundary", shopLevel: 25, equipment: "legend", label: "境界 / 完成構成の手動適用 / D1", syntheticDescription: "境界専用：開始強化各25、3CD、5LEGEND★5 +20。Opening後の明示ボタンで全S8を合成、Core/Finalは実カードで選択。自然到達ではありません。" }),
    depth5: Object.freeze({ id: "depth5", mechId: "umbraSeraph", startDepth: 5, mode: "boundary", shopLevel: 25, equipment: "legend", label: "境界 / D5開始 → 契約・D6", syntheticDescription: "合成D5開始。開始強化各25、3CD、5LEGEND★5 +20。スキップしたDepth報酬なし。自然到達ではありません。" }),
    relay10: Object.freeze({ id: "relay10", mechId: "umbraSeraph", startDepth: 10, requestedRelayDepth: 10, mode: "boundary", shopLevel: 25, equipment: "legend", label: "境界 / D10 Relay", syntheticDescription: "討伐・Relay利用資格をRAMで合成。D10から正規Relay出撃。開始強化各25、3CD、5LEGEND★5 +20。実討伐・実購入・自然到達ではありません。" }),
    relay20: Object.freeze({ id: "relay20", mechId: "umbraSeraph", startDepth: 20, requestedRelayDepth: 20, mode: "boundary", shopLevel: 25, equipment: "legend", label: "境界 / D20 Relay", syntheticDescription: "討伐・Relay利用資格をRAMで合成。D20から正規Relay出撃。開始強化各25、3CD、5LEGEND★5 +20。スキップ報酬なし。" }),
    relay30: Object.freeze({ id: "relay30", mechId: "umbraSeraph", startDepth: 30, requestedRelayDepth: 30, mode: "boundary", shopLevel: 25, equipment: "legend", label: "境界 / D30 Relay → D31", syntheticDescription: "討伐・Relay利用資格をRAMで合成。D30から正規Relay出撃。開始強化各25、3CD、5LEGEND★5 +20。スキップ報酬なし。" })
  });
  const node = id => document.getElementById(id);
  const showStatus = (message, error = false) => {
    const status = node("umbra-integration-status");
    if (status) { status.textContent = message; status.style.color = error ? "#ffb4bd" : "#c5e9f5"; }
    if (error && node("umbra-integration-details")) node("umbra-integration-details").open = true;
  };
  function isLocalEntry(url) {
    return ["http:", "https:"].includes(url.protocol)
      && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
      && url.pathname === ENTRY_PATH;
  }
  const originalUrl = new URL(window.location.href);
  const fixtureValues = originalUrl.searchParams.getAll("fixture");
  const fixtureId = fixtureValues.length === 0 ? "baseline" : fixtureValues[0];
  // These two optional switches only control the existing mobile presentation.
  // Debug progression, startDepth and opening-skip queries are never forwarded.
  const trialQueryKeys = ["moonReach", "moonGlide", "novaField"];
  const allowedQueryKeys = ["fixture", "mobileGate", "mobileControls", ...trialQueryKeys];
  const validQuery = [...originalUrl.searchParams.keys()].every(key => allowedQueryKeys.includes(key)
    && (trialQueryKeys.includes(key) || originalUrl.searchParams.getAll(key).length === 1)
    && (key === "fixture" || trialQueryKeys.includes(key) || ["0", "1"].includes(originalUrl.searchParams.get(key))));
  if (!isLocalEntry(originalUrl) || fixtureValues.length > 1 || !Object.hasOwn(FIXTURES, fixtureId)
    || !validQuery || Object.hasOwn(window, ENVIRONMENT_KEY)) {
    showStatus("起動拒否：ローカル専用ページと既知fixtureが必要です。通常ゲームへ自動切替しません。", true);
    return;
  }

  const fixture = FIXTURES[fixtureId];
  // Comparison only: immutable entry input, copied into each launch request.
  // Missing, malformed and duplicate choices all retain current performance.
  const reachValues = originalUrl.searchParams.getAll("moonReach");
  const moonReach = fixture.mechId === "umbraSeraph" && reachValues.length === 1 && ["wide", "extended"].includes(reachValues[0]) ? reachValues[0] : "current";
  const enabledTrial = key => fixture.mechId === "umbraSeraph" && originalUrl.searchParams.getAll(key).length === 1 && originalUrl.searchParams.get(key) === "1";
  const moonGlide = enabledTrial("moonGlide");
  const fieldValues = originalUrl.searchParams.getAll("novaField");
  const novaFieldMode = fixture.mechId === "umbraSeraph" && fieldValues.length === 1 && ["1", "lane"].includes(fieldValues[0]) ? fieldValues[0] : "0";
  const novaField = novaFieldMode !== "0";
  const novaFieldShape = novaFieldMode === "lane" ? { novaFieldShape: "lane" } : {};
  const environmentId = `${VERSION}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const scenes = new WeakSet();
  const records = [];
  const maps = { localStorage: new Map(), sessionStorage: new Map() };
  const counts = { localStorage: {}, sessionStorage: {}, rejectedStorage: 0, injectedFailures: 0 };
  const failures = [];
  let env, bridge = null, game = null, currentScene = null, closing = false, closed = false, starting = false, started = false;
  let recordSerial = 0, recordsDropped = 0, endReason = null;
  let reachGuideVisible = false;
  let releaseViewportListeners = null;

  function copyDetail(value, depth = 0, seen = new WeakSet()) {
    if (value === null || typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value === "string") return value.slice(0, 2000);
    if (typeof value !== "object") return String(value);
    if (depth >= 7 || seen.has(value)) return "[bounded]";
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 256).map(item => copyDetail(item, depth + 1, seen));
    return Object.fromEntries(Object.keys(value).slice(0, 80).map(key => [key, copyDetail(value[key], depth + 1, seen)]));
  }
  function record(type, detail = {}) {
    const item = { sequence: ++recordSerial, atMs: Date.now(), type: String(type), detail: copyDetail(detail) };
    if (records.length < RECORD_LIMIT) records.push(item); else recordsDropped++;
    return item.sequence;
  }
  function isValid() {
    if (closed || window[ENVIRONMENT_KEY] !== env) return false;
    const current = new URL(window.location.href);
    return isLocalEntry(current) && current.origin === originalUrl.origin
      && current.pathname === originalUrl.pathname && current.search === originalUrl.search;
  }
  function requireValid(operation) {
    if (isValid()) return;
    record("environment-rejected", { operation, closed });
    throw new Error(`UMBRA integration environment is unavailable: ${operation}`);
  }
  function requireOpen(operation) {
    requireValid(operation);
    if (!closing) return;
    record("environment-rejected", { operation, closing });
    throw new Error(`UMBRA integration environment is ending: ${operation}`);
  }
  function injectIfMatched(area, operation, key, phase, call) {
    const rule = failures.find(item => item.remaining > 0 && item.area === area && item.operation === operation
      && (item.key === null || item.key === key) && item.phase === phase && call >= item.atCall);
    if (!rule) return;
    rule.remaining--;
    counts.injectedFailures++;
    record("ram-storage-injected-failure", { area, operation, key, phase, call, ruleId: rule.id });
    throw new Error(`Injected RAM ${area}.${operation} failure (${phase})`);
  }
  function access(area, operation, key, value, action) {
    counts[area][operation] = (counts[area][operation] || 0) + 1;
    const call = counts[area][operation];
    record("ram-storage-request", { area, operation, key, valueLength: typeof value === "string" ? value.length : null, call });
    if (!isValid()) { counts.rejectedStorage++; requireValid(`${area}.${operation}`); }
    injectIfMatched(area, operation, key, "before", call);
    const result = action();
    injectIfMatched(area, operation, key, "after", call);
    return result;
  }
  function makeStorage(area) {
    const map = maps[area];
    return Object.freeze({
      getItem(key) { const name = String(key); return access(area, "getItem", name, null, () => map.has(name) ? map.get(name) : null); },
      setItem(key, value) { const name = String(key), text = String(value); return access(area, "setItem", name, text, () => { map.set(name, text); }); },
      removeItem(key) { const name = String(key); return access(area, "removeItem", name, null, () => { map.delete(name); }); },
      clear() { return access(area, "clear", null, null, () => { map.clear(); }); },
      key(index) { return access(area, "key", null, null, () => Array.from(map.keys())[Number(index) >>> 0] ?? null); },
      get length() { return access(area, "length", null, null, () => map.size); }
    });
  }

  // Seed only existing formats. UMBRA never enters the persistent owned list.
  const shop = {
    ownedCdIds: fixture.shopLevel ? ["anju", "hanseikai", "miraiwoikiteru"] : ["anju"], selectedCdId: "anju",
    upgrades: { weapon: fixture.shopLevel || 0, armor: fixture.shopLevel || 0, shoes: fixture.shopLevel || 0 },
    reactorCoolingLevel: fixture.shopLevel || 0, cleaningRobotLevel: 0,
    playerMechs: { ownedIds: fixture.mechId === "regaliaBastion" ? ["defaultBear", "regaliaBastion"] : ["defaultBear"],
      selectedId: fixture.mechId === "regaliaBastion" ? "regaliaBastion" : "defaultBear" }
  };
  maps.localStorage.set("lastmemoVansabaShopState", JSON.stringify(shop));
  maps.localStorage.set("lastmemoVansabaCoins", "0");
  maps.localStorage.set("lastmemoVansabaOperatorId", "P7B-RAM-ONLY");
  maps.localStorage.set("lastmemoVansabaOptionsState", JSON.stringify({ version: 1, bgmEnabled: true, sfxEnabled: true, controllerEnabled: true }));
  if (fixture.requestedRelayDepth) {
    maps.localStorage.set("lastmemoVansabaFinalBossState", JSON.stringify({ version: 2, cleared: true, clearedAt: 1 }));
    maps.localStorage.set("lastmemoVansabaDepthRelayState", JSON.stringify({ version: 1, unlockedDepths: [10, 20, 30] }));
  }
  function seedEquipment() {
    if (!fixture.equipment) return;
    const system = window.EquipmentSystem;
    if (!system?.createDefaultEquipmentState || !system?.normalizeEquipmentState) throw new Error("Equipment definitions are missing");
    const state = system.createDefaultEquipmentState(), legend = fixture.equipment === "legend";
    for (const slot of system.SLOTS) {
      state.bestBySlot[slot] = { id: `phase7b-${fixture.id}-${slot}`, slot, rarity: legend ? "LEGEND" : "SR",
        rank: legend ? 5 : 3, sourceType: "debug", sourceDepth: 1 };
      state.refinementBySlot[slot] = legend ? 20 : 5;
      state.refinementLimitUnlockedBySlot[slot] = legend;
      state.legendResonanceBySlot[slot] = 0;
    }
    maps.localStorage.set("lastmemoVansabaEquipmentState", JSON.stringify(system.normalizeEquipmentState(state)));
    record("fixture-equipment-seeded", { fixtureId, equipment: fixture.equipment, source: "synthetic-start-only" });
  }

  function renderControls() {
    const select = node("umbra-integration-fixture");
    if (select && !select.options.length) {
      Object.values(FIXTURES).forEach(item => {
        const option = document.createElement("option");
        option.value = item.id; option.textContent = item.label; select.append(option);
      });
      select.value = fixtureId;
      select.addEventListener("change", () => {
        const next = select.value;
        if (!Object.hasOwn(FIXTURES, next)) { showStatus("不明なfixtureです。", true); return; }
        env.end("FIXTURE_RESET");
        const destination = new URL(originalUrl.href);
        destination.search = ""; destination.hash = "";
        destination.searchParams.set("fixture", next);
        destination.searchParams.set("moonReach", moonReach);
        destination.searchParams.set("moonGlide", moonGlide ? "1" : "0");
        destination.searchParams.set("novaField", novaFieldMode);
        window.location.assign(destination.href);
      });
    }
    const description = node("umbra-integration-description");
    if (description) description.textContent = fixture.syntheticDescription;
    const reachSelect = node("umbra-integration-reach");
    if (reachSelect && !reachSelect.dataset.bound) {
      reachSelect.dataset.bound = "true";
      reachSelect.value = moonReach;
      reachSelect.addEventListener("change", () => {
        const next = ["wide", "extended"].includes(reachSelect.value) ? reachSelect.value : "current";
        env.end("MOON_REACH_RESET");
        const destination = new URL(originalUrl.href);
        destination.searchParams.set("moonReach", next);
        window.location.assign(destination.href);
      });
    }
    for (const [id, key, value] of [["umbra-integration-glide", "moonGlide", moonGlide ? "1" : "0"], ["umbra-integration-field", "novaField", novaFieldMode]]) {
      const select = node(id);
      if (!select || select.dataset.bound) continue;
      select.dataset.bound = "true"; select.value = value;
      select.addEventListener("change", () => {
        const next = select.value === "1" ? "1" : key === "novaField" && select.value === "lane" ? "lane" : "0";
        env.end("MOBILITY_TRIAL_RESET");
        const destination = new URL(originalUrl.href);
        destination.searchParams.set(key, next);
        window.location.assign(destination.href);
      });
    }
    const reachLabel = node("umbra-integration-reach-label");
    if (reachLabel) reachLabel.textContent = `MOON ${moonReach === "extended" ? "extended ×2.0・比較案" : moonReach === "wide" ? "wide ×1.5・比較案" : "current"} / 解除後 ${moonGlide ? "250ms" : "OFF"} / NOVA保護 ${novaFieldMode === "lane" ? "辻斬り・前方の保護帯・2秒" : novaField ? "180px・3秒" : "OFF"} / BRAKE tuned`;
    const startButton = node("umbra-integration-start");
    if (startButton) startButton.disabled = closing || closed || !bridge || starting || started;
  }
  function launch() {
    requireOpen("start");
    if (started || starting) return game;
    if (!bridge) { showStatus("通常Sceneのコードを準備しています。", false); return null; }
    starting = true; renderControls();
    try {
      if (typeof window.Phaser?.Game !== "function") throw new Error("Phaser module is missing");
      if (window.__SURVIVAL_GAME__) throw new Error("Another game already owns this page");
      record("game-start-request", { fixtureId, sceneClass: bridge.Scene.name, gameWidth: bridge.gameWidth, gameHeight: bridge.gameHeight });
      game = new window.Phaser.Game(bridge.config);
      window.__SURVIVAL_GAME__ = game;
      started = true;
      if (node("umbra-integration-details")) node("umbra-integration-details").open = false;
      record("game-created", { fixtureId });
      showStatus(`${fixture.label} / 同じsessionのHUB帰還・再出撃ではRAM進行を保持します。`);
      return game;
    } catch (error) {
      record("game-start-failed", { message: error?.message || String(error) });
      env.end("BOOT_FAILED");
      showStatus(`起動失敗：${error?.message || String(error)}。通常起動へ切替しません。`, true);
      throw error;
    } finally { starting = false; renderControls(); }
  }
  function end(reason = "EXPLICIT_END") {
    if (closing || closed) return false;
    endReason = String(reason); closing = true;
    releaseViewportListeners?.();
    record("environment-ending", { reason: endReason });
    // Stop combat/selection first, while the existing owner may still read its
    // final snapshot and finish the ordinary RAM serializers.
    try { currentScene?.endUmbraNormalRun?.(endReason); }
    catch (error) { record("run-end-error", { message: error?.message || String(error) }); }
    try { currentScene?.prepareUmbraIntegrationSceneShutdown?.(); }
    catch (error) { record("scene-layer-cleanup-error", { message: error?.message || String(error) }); }
    // Refuse new Scene/run requests first. Existing shutdown may still complete
    // its normal RAM I/O. Phaser.Game.destroy is deferred until its next step.
    const finish = () => {
      if (closed) return;
      closed = true; currentScene = null; maps.localStorage.clear(); maps.sessionStorage.clear(); failures.length = 0;
      record("environment-ended", { reason: endReason });
      showStatus(`試験終了：${endReason}。RAM進行を破棄しました。通常ゲームへは下の明示リンクから移動します。`);
      renderControls();
    };
    showStatus("試験終了処理中。新規出撃と古いcallbackを停止し、RAMの終了処理を完了します。");
    renderControls();
    if (!game) finish();
    else {
      game.events.once("destroy", finish);
      try { game.destroy(true); } catch (error) { record("game-destroy-error", { message: error?.message || String(error) }); finish(); }
    }
    return true;
  }

  env = Object.freeze({
    version: VERSION, mode: "normal-integration", id: environmentId, moonReach, moonGlide, novaField, ...novaFieldShape,
    isValid, isClosing: () => closing || closed, isReachGuideVisible: () => !closing && !closed && reachGuideVisible, record, end,
    localStorage: makeStorage("localStorage"), sessionStorage: makeStorage("sessionStorage"),
    attachScene(scene) {
      requireOpen("attachScene");
      if (!bridge || !(scene instanceof bridge.Scene) || scene.constructor !== bridge.Scene) throw new Error("Only this entry's actual SurvivalScene may attach");
      if (scene.runEnvironmentIO !== env) throw new Error("Scene environment identity does not match");
      scenes.add(scene); currentScene = scene; record("scene-attached", { sceneKey: scene.sys?.settings?.key || null }); return true;
    },
    ownsScene(scene) { return isValid() && Boolean(scene && scenes.has(scene) && scene.runEnvironmentIO === env); },
    getFixture(scene) {
      requireOpen("getFixture");
      if (!env.ownsScene(scene)) throw new Error("Fixture requires this environment's registered Scene");
      return fixture;
    },
    start(value) {
      requireOpen("prepare-start");
      if (!value || typeof value.Scene !== "function" || !value.config || !Array.isArray(value.config.scene)
        || !value.config.scene.includes(value.Scene)) throw new Error("Actual SurvivalScene and game config are required");
      if (bridge && (bridge.Scene !== value.Scene || bridge.config !== value.config)) throw new Error("Integration boot bridge cannot be replaced");
      if (!bridge) { seedEquipment(); bridge = Object.freeze({ Scene: value.Scene, config: value.config, gameWidth: value.gameWidth, gameHeight: value.gameHeight }); record("boot-ready", { fixtureId }); }
      renderControls();
      if (!started) showStatus("準備完了。STARTで実SurvivalSceneのHUBを開始します。");
      return game;
    },
    injectStorageFailure(rule = {}) {
      requireOpen("injectStorageFailure");
      const area = rule.area || "localStorage", operation = rule.operation || "setItem", phase = rule.phase || "before";
      if (!Object.hasOwn(maps, area) || !["getItem", "setItem", "removeItem", "clear", "key", "length"].includes(operation)
        || !["before", "after"].includes(phase) || failures.length >= 32) throw new Error("Invalid RAM storage failure rule");
      const atCall = rule.atCall == null ? (counts[area][operation] || 0) + 1 : Number(rule.atCall);
      const remaining = rule.count == null ? 1 : Number(rule.count);
      if (!Number.isInteger(atCall) || atCall < 1 || !Number.isInteger(remaining) || remaining < 1 || remaining > 100) throw new Error("Invalid RAM failure count");
      const item = { id: failures.length + 1, area, operation, key: rule.key == null ? null : String(rule.key), phase, atCall, remaining };
      failures.push(item); record("ram-failure-rule", item); return item.id;
    },
    clearStorageFailures() { requireValid("clearStorageFailures"); failures.length = 0; record("ram-failure-rules-cleared"); },
    getStorageFailureCount() { return counts.injectedFailures + counts.rejectedStorage; },
    reportResult(value) {
      requireValid("reportResult");
      if (value?.status === "RAM_RESULT_UNCERTAIN") {
        showStatus("RAMへの結果反映を確認できません。戦闘は終了済みです。永続保存は行っていません。", true);
      } else showStatus("結果はこの試験sessionのRAMだけに反映しました。HUBから次runへ再出撃できます。");
    },
    applyBoundaryBuild() {
      requireOpen("applyBoundaryBuild");
      if (fixture.mode !== "boundary" || !env.ownsScene(currentScene)) return false;
      return currentScene.applyUmbraIntegrationBoundaryBuild?.() === true;
    },
    snapshot() {
      return {
        version: VERSION, mode: "normal-integration", id: environmentId, fixture: { ...fixture }, moonReach, moonGlide, novaField, ...novaFieldShape, closing, closed, started, starting, endReason,
        counts: copyDetail(counts), ram: { localStorage: Object.fromEntries(maps.localStorage), sessionStorage: Object.fromEntries(maps.sessionStorage) },
        records: records.map(item => copyDetail(item)), recordLimit: RECORD_LIMIT, recordSerial, recordsDropped,
        failureRules: failures.map(item => ({ ...item })),
        auditScope: "RAM API requests only. Real Storage/network zero must be proved by the independent browser throw/spy audit."
      };
    }
  });
  Object.defineProperty(window, ENVIRONMENT_KEY, { value: env, writable: false, configurable: false });
  window.addEventListener("error", event => {
    const target = event.target;
    if (target?.tagName !== "SCRIPT" || closing || closed) return;
    const failedPath = new URL(target.src, originalUrl.href).pathname;
    record("required-code-failed", { path: failedPath });
    env.end("REQUIRED_CODE_MISSING");
    showStatus(`起動失敗：必要コード ${failedPath} を読み込めません。通常起動へ切替しません。`, true);
  }, true);
  record("environment-prepared", { fixtureId, seededKeys: [...maps.localStorage.keys()], source: "synthetic-fixture" });
  node("umbra-integration-start")?.addEventListener("click", () => { try { launch(); } catch (_) { /* Already shown; never start the normal environment. */ } });
  node("umbra-integration-end")?.addEventListener("click", () => env.end("EXPLICIT_END"));
  const boundaryButton = node("umbra-integration-boundary");
  if (boundaryButton) {
    boundaryButton.hidden = fixture.mode !== "boundary";
    boundaryButton.addEventListener("click", () => {
      const applied = env.applyBoundaryBuild();
      showStatus(applied ? "合成完成構成を適用しました。自然進行の到達結果ではありません。" : "Openingと選択を完了してから使用してください。同runへの適用は1回です。", !applied);
    });
  }
  node("umbra-integration-normal")?.addEventListener("click", () => env.end("EXPLICIT_NORMAL_NAVIGATION"));
  node("umbra-integration-fx")?.addEventListener("change", event => {
    if (!env.ownsScene(currentScene) || !currentScene?.setUmbraNormalPresentationFxMode?.(event.target.value)) {
      event.target.value = "image";
      showStatus("UMBRA出撃後にFX表示を切り替えられます。攻撃・期限は変更しません。");
    }
  });
  node("umbra-integration-reach-guide")?.addEventListener("change", event => {
    reachGuideVisible = event.target.checked === true;
  });
  const resizePage = () => {
    const height = Math.ceil(node("umbra-integration-panel")?.getBoundingClientRect().height || 0);
    document.documentElement.style.setProperty("--umbra-integration-toolbar-height", `${height}px`);
    if (!closing && !closed && game?.canvas && game.scale?.canvas) game.scale.refresh();
  };
  let viewportObserver = null;
  if (typeof window.ResizeObserver === "function") {
    viewportObserver = new window.ResizeObserver(resizePage);
    viewportObserver.observe(node("umbra-integration-panel"));
  }
  node("umbra-integration-details")?.addEventListener("toggle", resizePage);
  window.addEventListener("resize", resizePage);
  releaseViewportListeners = () => {
    viewportObserver?.disconnect();
    node("umbra-integration-details")?.removeEventListener("toggle", resizePage);
    window.removeEventListener("resize", resizePage);
  };
  resizePage();
  window.addEventListener("pagehide", () => env.end("PAGEHIDE"), { once: true });
  renderControls();
  showStatus("専用コードを読込中。実保存・認証は開始しません。");
}());
