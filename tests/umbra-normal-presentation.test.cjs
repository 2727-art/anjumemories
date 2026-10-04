"use strict";

// VM-only presentation/asset ownership checks. No browser, native IO or combat substitute.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), plain = value => JSON.parse(JSON.stringify(value));
function loadFactory(filename, exported, adapt = source => source) {
  const source = fs.readFileSync(path.join(__dirname, filename), "utf8"), end = source.indexOf("\ntest(");
  assert.ok(end > 0);
  const context = vm.createContext({ require, __dirname, console, URLSearchParams });
  vm.runInContext(adapt(source.slice(0, end)) + `\nglobalThis.factory = ${exported};`, context);
  return context.factory;
}
const makeStats = loadFactory("umbra-phase2a-stats.test.cjs", "createHarness", source => source.replace(
  "return { scene, api, bridge: context.bridge, calls, equipment: fakeWindow.EquipmentSystem };",
  "return { scene, api, bridge: context.bridge, calls, equipment: fakeWindow.EquipmentSystem, window: fakeWindow, context };"));
const makeVisual = loadFactory("umbra-phantomnova-arena.test.cjs", "fixture", source => source.replace(
  "return { scene, arena, objects, calls, assets: window.umbraPreviewAssets, skillDefinitions };",
  "return { scene, arena, objects, calls, assets: window.umbraPreviewAssets, skillDefinitions, createPresentation: window.createUmbraPresentation };"));
function normal() {
  const f = makeStats(), scene = Object.create(f.bridge.sourcePrototype), records = [];
  const context = { mode: "normal-integration", mechId: "umbraSeraph", runId: "normal-run-1", state: "PREPARED" };
  scene.getUmbraRunContext = () => context;
  scene.isUmbraRunContextCurrent = candidate => candidate === context && context.state !== "ENDED";
  scene.runEnvironmentIO = { ownsScene: candidate => candidate === scene, record: (...args) => records.push(args) };
  scene.showUmbraPresentationRetryControl = () => {};
  const timers = new Map(); let nextTimer = 0;
  f.window.setTimeout = callback => { const id = ++nextTimer; timers.set(id, callback); return id; };
  f.window.clearTimeout = id => timers.delete(id);
  for (const file of ["umbraPreviewAssets.js", "umbraPresentation.js"]) vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), f.context);
  return { ...f, scene, runContext: context, records, timers };
}

test("presentation initial readiness requests the exact 24 poses and Moon only", async () => {
  const f = normal(), requested = [], modules = [];
  f.scene.loadUmbraPresentationModule = async (file, expected, context) => { assert.equal(context, f.runContext); modules.push([file, expected]); };
  f.scene.requestUmbraPresentationAsset = async (asset, context) => { assert.equal(context, f.runContext); requested.push(asset.key); return { status: "ready" }; };
  await f.scene.prepareUmbraPresentationAssets(f.runContext);
  assert.equal(modules.length, 2); assert.equal(requested.length, 25); assert.equal(new Set(requested).size, 25);
  assert.ok(requested.includes(f.window.umbraPreviewAssets.effects.umbraMoonlight.key));
  assert.ok(!requested.includes(f.window.umbraPreviewAssets.effects.umbraBloodSpike.key));
  assert.ok(!requested.includes(f.window.umbraPreviewAssets.effects.umbraPhantomNova.key));
  for (const skillId of ["umbraBloodSpike", "umbraPhantomNova"]) await f.scene.requestUmbraSkillPresentationAssets(skillId);
  assert.equal(requested.length, 27); assert.deepEqual(plain(f.calls), { storage: 0, network: 0 });
});

test("same image joins one load, failure remains failed until explicit retry, stale callbacks create no owner", async () => {
  const f = normal(), scene = f.scene, asset = f.window.umbraPreviewAssets.effects.umbraBloodSpike;
  const pending = [], cached = new Set(); let loads = 0;
  scene.textures = { exists: key => cached.has(key), get: () => ({ has: () => true }) };
  scene.load = { image() { loads++; } };
  scene.loadAssetOnDemand = (kind, key, load, ready, failed) => { load(); pending.push({ ready, failed }); };
  const first = scene.requestUmbraPresentationAsset(asset, f.runContext), duplicate = scene.requestUmbraPresentationAsset(asset, f.runContext);
  assert.equal(first, duplicate); assert.equal(loads, 1);
  pending.shift().failed(); assert.equal((await first).status, "failed");
  await scene.requestUmbraPresentationAsset(asset, f.runContext); assert.equal(loads, 1);
  const retry = scene.retryUmbraPresentationAssets(); assert.equal(loads, 2);
  f.runContext.state = "ENDED"; cached.add(asset.key); pending.shift().ready(); await retry;
  assert.equal(scene.umbraNormalPresentation, undefined);
  assert.equal(scene.getUmbraPresentationAssetState()[0].status, "ready");
  assert.equal(f.records.at(-1)[1].staleConsumer, true); assert.equal(f.timers.size, 0);
  assert.deepEqual(plain(f.calls), { storage: 0, network: 0 });
});

test("expired preparation rejects before starting a later asset stage", async () => {
  const f = normal(); let modules = 0, images = 0;
  f.scene.loadUmbraPresentationModule = async () => { modules++; f.runContext.state = "ENDED"; };
  f.scene.requestUmbraPresentationAsset = async () => { images++; };
  await assert.rejects(f.scene.prepareUmbraPresentationAssets(f.runContext), /expired/);
  assert.equal(modules, 1); assert.equal(images, 0);
});

test("shared presentation cleanup owns its objects only and FX modes leave runtime bytes unchanged", () => {
  const f = makeVisual({ growth: true, core: true, final: true, novaSlots: 3 });
  const untouched = f.scene.add.text(0, 0, "world HUD");
  const fx = f.createPresentation(f.scene, { assets: f.assets, growth: true, core: true, final: true, spike: true, nova: true, isActive: () => true });
  const before = plain(f.scene.umbraPhantomNovaRuntime);
  for (const mode of ["image", "fallback", "off", "image"]) { fx.setFxMode(mode); fx.update(); }
  fx.spawnHitFx({ position: { x: 1, y: 2 } });
  const own = [...fx.novaEffects.values()].map(item => item.object).filter(Boolean).concat(fx.effects.map(item => item.object));
  fx.clearDepth(); fx.destroy(); fx.destroy();
  assert.ok(own.every(item => !item.active)); assert.equal(untouched.active, true);
  assert.deepEqual(plain(f.scene.umbraPhantomNovaRuntime), before); assert.equal(f.calls.physicsObjects, 0);
  assert.equal(f.calls.reset, 0); assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0);
});

test("Arena reset zeroes all shared FX counters without replacing the presentation-owned objects", () => {
  const f = makeVisual({ growth: true, core: true, final: true, novaSlots: 3 }), arena = f.arena;
  const names = ["fxCounts", "spikeFxCounts", "novaFxCounts", "finalFxCounts"];
  const references = Object.fromEntries(names.map(name => [name, arena[name]]));
  for (const reference of Object.values(references)) for (const key of Object.keys(reference)) reference[key] = 7;
  arena.refreshHud = () => {};
  f.scene.initializeUmbraGrowthRun = () => {};
  arena.afterDriveReset();
  for (const name of names) {
    assert.equal(arena[name], references[name], `${name} must retain the shared owner reference`);
    assert.ok(Object.values(arena[name]).every(value => value === 0), `${name} resets each value`);
  }
  arena.spawnHitFx({ position: { x: 1, y: 2 } });
  assert.equal(arena.fxCounts.requested, 1);
  assert.equal(arena.fxCounts.shown, 1);
  f.scene.finalView = { owners: [{ skillId: "umbraMoonlight", generation: 1, combatTimeMs: 0 }], fields: [] };
  arena.spawnFinalMark("prism", "umbraMoonlight", { position: { x: 5, y: 6 }, sourcePosition: { x: 1, y: 2 }, combatTimeMs: 0,
    finalProfile: { finalId: "prism", coreId: "control" } });
  assert.equal(arena.finalFxCounts.secondaryRequested, 1);
  assert.equal(arena.finalFxCounts.secondaryShown, 1);
});

test("normal detail HUD finds older cast and DEP after a current first slot without changing snapshots", () => {
  const f = normal(), scene = f.scene;
  const current = { coreId: "control", triadProfile: { revision: 3 }, equipmentProfile: { overlimitLevel: 1 } };
  const old = { coreId: "control", triadProfile: { revision: 2 }, equipmentProfile: { overlimitLevel: 0 } };
  const nova = { combatTimeMs: 150, slots: [{ state: "DEPLOYED", finalProfile: current }, { state: "DEPLOYED", finalProfile: old }, { state: "REGENERATING", regenerateAtMs: 1150 }] };
  const casts = [{ finalProfile: current }, { finalProfile: old }];
  scene.playerSkills = { umbraMoonlight: { currentStage: { stage: 1 } } };
  scene.skillMutationState = { entries: { umbraBloodSpike: { core: "control" }, umbraPhantomNova: { core: "control" } } };
  scene.getSkillMutationHudLine = () => "";
  scene.getUmbraEquipmentSnapshot = () => ({ combatLinkLevel: 2, overlimitLevels: { umbraBloodSpike: 1, umbraPhantomNova: 1 } });
  scene.getUmbraTriadSnapshot = () => ({ revision: 3, core: { shortLabel: "CONTROL II" }, final: { shortLabel: "SINGULARITY II" } });
  scene.getUmbraPhantomNovaVisualState = () => nova;
  scene.getUmbraBloodSpikeSnapshot = () => ({ casts });
  const before = JSON.stringify({ nova, casts, skills: scene.playerSkills, mutation: scene.skillMutationState });
  const view = scene.getUmbraNormalHudView();
  assert.deepEqual(plain(view.oldSnapshots), ["SPIKE旧 OVL0/r2", "DEP旧 OVL0/r2"]);
  assert.equal(scene.getUmbraNormalSystemsHudLine(view), "CL II / NOVA O0 D2 R1 1.0s");
  assert.equal(view.skills[1].acquired, false);
  scene.getDetailLostArmDiagnosticLine = id => `${id} --`;
  const lines = scene.getDetailBuildDiagnosticsLines();
  assert.equal(lines.length, 7);
  assert.equal(lines[3], "TRIAD C:CONTROL II / F:SINGULARITY II / r3");
  assert.equal(scene.getStandardHudDetailPanelLayout().build.height, 120);
  assert.equal(JSON.stringify({ nova, casts, skills: scene.playerSkills, mutation: scene.skillMutationState }), before);
});

test("normal card renderer keeps all explicit Core metadata and legacy narrow layout stays vertical", () => {
  const f = normal(), scene = f.scene, chips = [{ label: "条件付き実効 E 2 → 3", priority: 100 }];
  scene.isUmbraCoreContextActive = () => true;
  const model = scene.buildSkillMutationCardModel({ skillId: "umbraMoonlight", title: "MOONLIGHT\nCONTROL CORE", themeColor: 123,
    accentColor: 456, umbraCoreCard: { coreId: "control", description: "現在の確定 TRIAD / CONTROL", chips } }, 0);
  assert.equal(model.chips, chips); assert.equal(model.description, "現在の確定 TRIAD / CONTROL"); assert.match(model.stageLabel, /Stage4 \/ CONTROL/);
  scene.game = { canvas: { getBoundingClientRect: () => ({ width: 740, height: 430 }) } };
  assert.equal(scene.getLevelUpCardLayout(3).orientation, "horizontal");
  f.runContext.state = "ENDED";
  assert.equal(scene.getLevelUpCardLayout(3).orientation, "vertical");
});

test("only normal UMBRA cards rise above sibling HUD/COMMS and teardown restores prior child order", () => {
  const f = normal(), scene = f.scene;
  const backdrop = {}, overlay = {}, hud = {}, comms = {}, other = {};
  const parent = { scene, list: [other, backdrop, overlay, hud, comms],
    moveTo(object, index) { this.list.splice(this.list.indexOf(object), 1); this.list.splice(index, 0, object); },
    bringToTop(object) { this.moveTo(object, this.list.length - 1); } };
  scene.uiContainer = parent; scene.overlayBackdrop = backdrop; scene.overlayContainer = overlay;
  const before = [...parent.list]; scene.raiseUmbraNormalCardOverlay();
  assert.deepEqual(parent.list, [other, hud, comms, backdrop, overlay]);
  scene.raiseUmbraNormalCardOverlay();
  assert.deepEqual(parent.list, [other, hud, comms, backdrop, overlay]);
  f.runContext.state = "ENDED";
  scene.tweens = { killTweensOf() {} }; scene.levelUpCardRecords = [];
  scene.teardownLevelUpOverlay(); assert.deepEqual(parent.list, before);
  assert.equal(scene.umbraNormalCardOverlayOrder, null);
  scene.raiseUmbraNormalCardOverlay(); assert.deepEqual(parent.list, before);
});

test("normal OVL card translates its actual normal/Final/Deep source IDs without changing chips or option", () => {
  const f = normal(), scene = f.scene;
  scene.isUmbraEquipmentContextActive = () => true;
  scene.getSkillUiMeta = () => ({ displayName: "PHANTOM NOVA" });
  for (const [source, label] of [["levelUp", "通常選択"], ["finalMutationOverlimitBonus", "Final追加"], ["deepLevelOverlimitBonus", "Deep追加"]]) {
    const option = { type: "equipmentOverlimit", skillId: "umbraPhantomNova", definition: { stages: Array(8).fill({}) },
      nextOverlimitLevel: 1, multiplier: 1.1, umbraEquipmentCard: { source, description: "整数丸めで差0", chips: [{ label: "E 6 → 6 (+0)" }] } };
    const model = scene.buildLevelUpCardModel(option, 0);
    assert.equal(model.stageLabel, `OVERLIMIT I / ${label}`);
    assert.equal(model.option, option); assert.equal(model.chips, option.umbraEquipmentCard.chips);
    assert.equal(model.description, "整数丸めで差0");
  }
});

test("stale normal gameplay complete/error closures leave a newer run's loader flags, queue and owners untouched", () => {
  const f = normal(), scene = f.scene, callbacks = {};
  vm.runInContext("globalThis.showShopLoadingScreen = () => {};", f.context);
  let current = f.runContext, runtimeCreates = 0, sorties = 0;
  scene.getUmbraRunContext = () => current;
  scene.isUmbraRunContextCurrent = candidate => candidate === current && candidate.state !== "ENDED";
  scene.shopActive = true; scene.gameplayAssetsLoading = false;
  scene.preloadGameplayAssets = () => { scene.assetLoadQueuedCount = 1; };
  scene.load = { once(name, callback) { callbacks[name] = callback; }, start() {} };
  scene.createGameplayRuntime = () => runtimeCreates++;
  scene.continueSortieFromHub = () => sorties++;
  scene.loadGameplayAssetsThenContinueSortie();
  const oldComplete = callbacks.complete, oldError = callbacks.loaderror;
  f.runContext.state = "ENDED";
  current = { ...f.runContext, runId: "normal-run-2", state: "PREPARED" };
  const queue = new Set(["new-run-image"]), owner = {}, errors = [];
  scene.gameplayAssetsLoading = true; scene.assetLoadQueueKeys = queue; scene.assetLoadQueuedCount = 7;
  scene.pendingSortieAfterGameplayAssets = true; scene.pendingSortieFromHub = true;
  scene.pendingGameplayAssetsLoadErrors = errors; scene.umbraNormalPresentation = owner;
  oldComplete(); oldError({ key: "old-run-error" }); oldComplete();
  assert.equal(scene.gameplayAssetsLoading, true); assert.equal(scene.assetLoadQueueKeys, queue);
  assert.equal(scene.assetLoadQueuedCount, 7); assert.equal(scene.pendingSortieAfterGameplayAssets, true);
  assert.equal(scene.pendingSortieFromHub, true); assert.equal(scene.pendingGameplayAssetsLoadErrors, errors);
  assert.equal(errors.length, 0); assert.equal(scene.umbraNormalPresentation, owner);
  assert.equal(runtimeCreates, 0); assert.equal(sorties, 0);
  scene.gameplayAssetsLoading = false; scene.loadGameplayAssetsThenContinueSortie();
  callbacks.complete();
  assert.equal(runtimeCreates, 1); assert.equal(sorties, 1); assert.equal(scene.gameplayAssetsLoading, false);
  assert.equal(scene.pendingSortieAfterGameplayAssets, false); assert.equal(scene.assetLoadQueueKeys, null);
});
