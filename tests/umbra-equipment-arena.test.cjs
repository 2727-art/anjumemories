"use strict";

// Presentation/fixture tests reuse the historical harness declarations only.
// Their old tests and the product calculations are not replaced or modified.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), plain = value => JSON.parse(JSON.stringify(value));
function loadFactory(filename, exported, adapt = source => source) {
  const source = fs.readFileSync(path.join(__dirname, filename), "utf8");
  const end = source.indexOf("\ntest("); assert.ok(end > 0);
  const context = vm.createContext({ require, __dirname, console, URLSearchParams });
  vm.runInContext(adapt(source.slice(0, end)) + `\nglobalThis.factory = ${exported};`, context);
  return context.factory;
}
const oldStats = loadFactory("umbra-phase2a-stats.test.cjs", "createHarness");
const newStats = loadFactory("umbra-phase2a-stats.test.cjs", "createHarness", source => source.replace(
  "this.fixtureApi = window.createUmbraDriveFixtures(this.bridge);",
  "Object.assign(this.bridge,{umbraGrowth:true,umbraCore:true,umbraFinal:true,umbraTriad:true,umbraEquipment:true}); this.fixtureApi = window.createUmbraDriveFixtures(this.bridge);"));
const arenaFactory = loadFactory("umbra-phantomnova-arena.test.cjs", "fixture", source => source
  .replace("final = false }", "final = false, triad = false, equipment = false }")
  .replace("umbraFinal: final }", "umbraFinal: final, umbraTriad: triad, umbraEquipment: equipment }"));
function arenaFixture() {
  const f = arenaFactory({ growth: true, core: true, final: true, triad: true, equipment: true });
  f.scene.getUmbraTriadSnapshot = () => null;
  f.scene.getUmbraEquipmentSnapshot = () => null;
  f.scene.getActiveDropObjects = () => [];
  return f;
}

test("seven equipment starts use the real normalizer, refinement bonuses and set tiers", () => {
  const f = newStats(), expected = {
    none: [1, 1, null], sensor: [0.96, 1, null], armament: [1, 1.186, null],
    medium: [0.96, 1.186, null], ssr: [0.9275, 1.33, "ssrPlusFive"],
    legend: [0.9075, 1.42, "legendFive"], incomplete: [0.9075, 1.42, null]
  };
  assert.equal(f.api.equipmentFixtures.length, 7);
  for (const id of Object.keys(expected)) {
    const state = f.api.createEquipmentFixtureState(id), bonus = f.equipment.getEquipmentBonusesFromState(state);
    const tier = f.equipment.evaluateEquipmentSetStatus(state).highestCompletedTierId;
    assert.deepEqual([bonus.attackIntervalMultiplier, bonus.playerSkillDamageMultiplier, tier], expected[id], id);
    assert.equal(Object.values(state.legendResonanceBySlot).reduce((a, b) => a + b, 0), 0);
  }
  assert.equal(f.api.createEquipmentFixtureState("incomplete").bestBySlot.accessory, null);
  assert.equal(f.api.createEquipmentFixtureState("legend").refinementLimitUnlockedBySlot.head, true);
  assert.equal(f.api.createEquipmentFixtureState("ssr").refinementLimitUnlockedBySlot.head, false);
  assert.equal(f.calls.storage, 0); assert.equal(f.calls.network, 0);
});

test("same original equipment inputs preserve starting stats without a second FRAME or CORE application", () => {
  const old = oldStats(), current = newStats();
  for (const [fixture, equipment] of [["baseline", "none"], ["medium", "medium"], ["deep", "legend"]]) {
    current.scene.equipmentFixtureId = equipment;
    const original = old.api.resetFixture(old.scene, fixture, "umbraSeraph");
    const first = current.api.resetFixture(current.scene, fixture, "umbraSeraph");
    assert.deepEqual(plain(first.startingStats), plain(original.startingStats), fixture);
    const second = current.api.resetFixture(current.scene, fixture, "umbraSeraph");
    assert.deepEqual(plain(second.startingStats), plain(first.startingStats));
    const saved = plain(current.scene.runEquipmentLoadoutSnapshot);
    current.scene.equipmentState.refinementBySlot.head = 0;
    current.scene.equipmentState.bestBySlot.head = null;
    assert.deepEqual(plain(current.scene.runEquipmentLoadoutSnapshot), saved);
  }
  assert.equal(current.calls.storage, 0); assert.equal(current.calls.network, 0);
});

test("Deep initial-depth fixture keeps Lv1 and the production Deep bonus function while old entry remains blocked", () => {
  const f = newStats(), marker = () => ({ queued: 7 });
  f.scene.queueDeepLevelEquipmentOverlimitBonus = marker;
  f.api.install(f.scene); assert.equal(f.scene.queueDeepLevelEquipmentOverlimitBonus, marker);
  f.scene.equipmentStartDepth = 6; f.api.resetFixture(f.scene, "baseline", "umbraSeraph");
  assert.equal(f.scene.stageDepth, 6); assert.equal(f.scene.stats.level, 1);
  assert.equal(f.scene.verificationContext.equipmentEnabled, true);
  const old = oldStats(); old.scene.equipmentStartDepth = 6; old.api.resetFixture(old.scene);
  assert.equal(old.scene.stageDepth, 1); assert.equal(old.scene.verificationContext.equipmentEnabled, undefined);
  assert.equal(old.scene.queueDeepLevelEquipmentOverlimitBonus().queued, 0);
});

test("human equipment and initial Depth controls reset only for valid choices and never assign OVL", () => {
  const f = arenaFixture(), s = f.scene, a = f.arena;
  a.equipmentFixtures = [{ id: "none", label: "なし" }, { id: "legend", label: "LEGEND" }];
  assert.equal(a.setEquipmentFixture("legend"), true); assert.equal(f.calls.reset, 1);
  assert.equal(s.equipmentFixtureId, "legend"); assert.equal(s.umbraEquipmentState, undefined);
  assert.equal(a.setEquipmentFixture("invalid"), false); assert.equal(f.calls.reset, 1);
  assert.equal(a.setEquipmentStartDepth(6), true); assert.equal(f.calls.reset, 2);
  assert.equal(s.equipmentStartDepth, 6); assert.equal(a.setEquipmentStartDepth(99), false);
  assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0);
});

test("the explicit runtime allowlist resolves production methods and survives the later fixture installation", () => {
  const f = newStats(), context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, "umbraDriveRuntime.js"), "utf8"), context);
  context.window.installUmbraPhase2ADriveRuntime(f.scene, { ...f.bridge, attackArena: true, bloodSpikeArena: true, phantomNovaArena: true });
  f.api.install(f.scene);
  for (const name of ["queueDeepLevelEquipmentOverlimitBonus", "getUmbraEquipmentDamageBreakdown", "getUmbraEquipmentReactorCardDisplay",
    "getUmbraEquipmentOverlimitCardDifference", "tryOpenPendingEquipmentOverlimitBonusSelection"]) {
    assert.equal(f.scene[name], f.bridge.sourcePrototype[name], name);
  }
  assert.equal(f.calls.storage, 0); assert.equal(f.calls.network, 0);
});

test("AP0 equipment HUD retains only the completed end snapshot and does not query live combat", () => {
  const f = arenaFixture(), s = f.scene, a = f.arena;
  s.gameOver = true; s.umbraEquipmentEndSnapshot = Object.freeze({ equipmentSnapshotId: "umbra-equipment-7",
    sensorMultiplier: 0.9075, armamentMultiplier: 1.42, combatLinkLevel: 2, overlimitCap: 2,
    overlimitLevels: { umbraMoonlight: 2, umbraBloodSpike: 1, umbraPhantomNova: 0 }, overlimitRevision: 3,
    lastSelectionSource: "deepLevelOverlimitBonus", pendingFinalSkillIds: [], pendingDeepCount: 0 });
  s.getUmbraEquipmentSnapshot = s.getUmbraTriadSnapshot = () => { throw Error("No live getter after AP0"); };
  a.refreshEquipmentHud();
  assert.match(a.equipmentInfo.text, /終了時 装備E7/); assert.match(a.equipmentInfo.text, /MII SI N0 r3/);
  assert.match(a.equipmentInfo.text, /取得源 Deep/); assert.match(a.equipmentInfo.text, /攻撃は停止/);
  assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.reset, 0);
});

test("Execution HUD retains conditional A and E for current equipment cards and the old raw labels otherwise", () => {
  for (const equipment of [false, true]) {
    const f = arenaFactory({ growth: true, core: true, final: true, triad: true, equipment }), s = f.scene;
    s.getUmbraTriadSnapshot = () => ({ revision: 7 });
    s.getUmbraEquipmentSnapshot = () => null;
    s.getUmbraActiveSkillStage = () => ({ stage: 8 });
    s.getUmbraSelectedCoreId = () => "assault";
    s.getUmbraSelectedFinalId = () => "execution";
    s.buildUmbraFinalCard = (id, finalId) => ({ umbraFinalCard: { finalId, chips:
      (id === "umbraPhantomNova" ? ["周回", "残留"] : ["主"]).map(label => ({ label: equipment
        ? `${label} A 強19・他15 / E 強27・他21` : `${label} raw 強対象 19 / その他 15` })) } });
    const before = plain(s.umbraPhantomNovaRuntime);
    f.arena.refreshGrowthHud();
    const text = f.arena.targetInfo.text;
    assert.match(text, /M EXEC/); assert.match(text, /S EXEC/); assert.match(text, /N EXEC/);
    for (const label of ["主", "周回", "残留"]) assert.ok(text.includes(equipment
      ? `${label}A強19・他15/E強27・他21` : `${label}raw強対象19/その他15`), label);
    assert.match(text, /HP比≥62%/);
    if (!equipment) assert.equal(text.includes("E強"), false);
    assert.deepEqual(plain(s.umbraPhantomNovaRuntime), before);
    assert.equal(f.calls.physicsObjects, 0); assert.equal(f.calls.data, 0); assert.equal(f.calls.network, 0);
  }
});
