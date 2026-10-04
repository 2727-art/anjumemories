"use strict";
// Production launch/owner contract on the existing numeric-body fixture. Real
// browser IO and presentation are verified separately, not simulated as passes.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-normal-context.test.cjs"), source = fs.readFileSync(filename, "utf8");
const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(source.slice(0, source.indexOf('\ntest("')) + "\nmodule.exports = fixture;", filename);
function fixture(options = {}) {
  const f = mod.exports(options), s = f.scene;
  s.runEnvironmentIO = null;
  s.getSelectedPlayerMechId = () => "umbraSeraph";
  s.isPlayerMechReleased = id => id === "umbraSeraph";
  s.isPlayerMechOwned = id => id === "umbraSeraph";
  s.isProgressionWriteBlocked = () => false;
  return f;
}
const plain = value => JSON.parse(JSON.stringify(value));

test("saved UMBRA selection boots a quiet HUB before its issued run creates Moon S1", () => {
  const f = fixture(), s = f.scene;
  s.shopState.playerMechs.ownedIds.push("umbraSeraph");
  s.shopState.playerMechs.selectedId = "umbraSeraph";
  s.runPlayerMechSnapshotActive = false;
  s.shopActive = false; // createState builds pre-HUB data before opening its UI.
  const initial = s.buildInitialSkillStates();
  assert.deepEqual(Object.keys(initial), []);
  assert.equal(s.umbraRunContext, undefined);
  assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), false);
  for (const key of ["umbraMoonlightRuntime", "umbraBloodSpikeRuntime", "umbraPhantomNovaRuntime"]) assert.ok(s[key] == null);
  s.shopActive = true; s.prepareUmbraNormalRunContext(); f.bind();
  assert.deepEqual(Object.keys(s.playerSkills), ["umbraMoonlight"]);
  assert.equal(s.playerSkills.umbraMoonlight.currentStage.stage, 1);
  assert.ok(s.umbraMoonlightRuntime);
  assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), false);
});

test("production prepares one immutable accepted build without installing a RAM IO environment", () => {
  const f = fixture({ equipped: true }), s = f.scene, c = s.prepareUmbraNormalRunContext("production-test");
  assert.equal(c.mode, "production-run"); assert.equal(s.runEnvironmentIO, null);
  assert.equal(s.isUmbraProductionRunContext(), true); assert.equal(s.isUmbraIntegrationRunScope(), false);
  assert.equal(c.state, "PREPARED"); assert.ok(Object.isFrozen(c.request)); assert.ok(Object.isFrozen(c.inputs.equipment));
  assert.deepEqual(Object.keys(s.playerSkills), ["umbraMoonlight"]);
  assert.equal(s.getUmbraMoonlightReachMultiplier(), 2);
  assert.deepEqual(plain(s.getUmbraMobilityTrialSettings()), { moonGlideMs: 250, novaFieldRadius: 180,
    novaFieldDurationMs: 2000, novaFieldShape: "lane", novaFieldForwardLength: 1800, novaFieldRearLength: 120, novaFieldHalfWidth: 120 });
  const settings = s.getUmbraMobilityTrialSettings(), equipment = c.inputs.equipment;
  s.getSelectedPlayerMechId = () => "regaliaBastion";
  s.equipmentState.bestBySlot.head = null;
  assert.equal(s.prepareUmbraNormalRunContext(), c); assert.equal(c.inputs.equipment, equipment);
  assert.equal(s.getUmbraMobilityTrialSettings(), settings);
  assert.equal(s.applyUmbraIntegrationBoundaryBuild(), false);
});

test("production launch requires owned released mech, writable progression and a live HUB", () => {
  for (const fail of [s => { s.isPlayerMechOwned = () => false; }, s => { s.isPlayerMechReleased = () => false; },
    s => { s.isProgressionWriteBlocked = () => true; }, s => { s.shopActive = false; },
    s => { s.gameOver = true; }, s => { s.restartInProgress = true; }]) {
    const { scene: s } = fixture(); fail(s);
    assert.throws(() => s.prepareUmbraNormalRunContext(), /requires/);
    assert.equal(s.umbraRunContext, undefined); assert.equal(s.runEnvironmentIO, null);
  }
  const { scene: s } = fixture(); s.getSelectedPlayerMechId = () => "regaliaBastion";
  assert.equal(s.prepareUmbraNormalRunContext(), null); assert.equal(s.umbraRunContext, undefined);
});

test("production bind applies stats once; Opening blocks all three attack clocks before ACTIVE", () => {
  const f = fixture({ equipped: true }), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind();
  const stats = plain(s.stats), moon = s.umbraMoonlightRuntime;
  f.bind(); assert.deepEqual(plain(s.stats), stats); assert.equal(s.umbraMoonlightRuntime, moon);
  assert.equal(s.stats.maxHp, 134); assert.equal(s.stats.maxStamina, 165); assert.equal(s.stats.moveSpeed, 403);
  s.shopActive = false; s.umbraRunContext.launchConsumed = true; s.levelUpActive = true;
  s.unlockSkill("umbraBloodSpike"); s.unlockSkill("umbraPhantomNova");
  for (let i = 0; i < 5; i++) { s.events.emit("preupdate", 0, 16); s.physics.world.emit("worldstep", .016); }
  assert.equal(s.umbraBloodSpikeRuntime.combatTimeMs, 0); assert.equal(s.umbraPhantomNovaRuntime.combatTimeMs, 0);
  f.activate(); assert.equal(s.hasUmbraRunCapability("moonlight", { purpose: "combat" }), true);
  assert.equal(s.getUmbraAirBrakeCalibration().retainedSpeedRatio, .4);
});

test("production rejects a replaced request, body, environment or Scene rather than granting combat from flags", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  const c = s.umbraRunContext, environment = s.umbraProductionEnvironment, body = s.playerHitbox.body;
  const active = () => s.hasUmbraRunCapability("moonlight", { purpose: "combat" }); assert.equal(active(), true);
  s.umbraNormalLaunchRequest = { ...c.request }; assert.equal(active(), false); s.umbraNormalLaunchRequest = c.request;
  s.playerHitbox.body = { ...body }; assert.equal(active(), false); s.playerHitbox.body = body;
  s.umbraProductionEnvironment = { ...environment }; assert.equal(active(), false); s.umbraProductionEnvironment = environment;
  s.runEnvironmentIO = environment; assert.equal(active(), false); s.runEnvironmentIO = null;
  s.umbraRunContext = { ...c }; assert.equal(active(), false);
  s.umbraRunContext = { ...c, scene: {} }; assert.equal(active(), false); s.umbraRunContext = c;
  s.levelUpActive = true; assert.equal(active(), false); s.levelUpActive = false; assert.equal(active(), true);
});

test("production end captures Evasive and mech before cleanup; ended owner cannot regain combat", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  s.unlockSkill("umbraBloodSpike"); s.unlockSkill("umbraPhantomNova"); s.passiveLevels.evasiveFirmware = 2;
  const c = s.umbraRunContext, snapshot = s.endUmbraNormalRun("EXTRACT");
  assert.equal(snapshot.mechId, "umbraSeraph"); assert.equal(snapshot.passives.evasiveFirmware, 2);
  assert.equal(snapshot.archivePersistence, "PRODUCTION_RESULT_PENDING");
  assert.equal(s.isUmbraProductionRunContext(c), true); assert.equal(s.getRunPlayerMechId(), "umbraSeraph");
  assert.equal(c.state, "ENDED"); assert.equal(s.isUmbraRunContextCurrent(c), false);
  assert.equal(s.hasUmbraRunCapability("growth", { purpose: "select" }), false);
  for (const key of ["umbraMoonlightRuntime", "umbraBloodSpikeRuntime", "umbraPhantomNovaRuntime", "umbraBoostTrace"]) assert.equal(s[key], null);
  assert.equal(s.endUmbraNormalRun("OTHER"), snapshot); assert.equal(s.setUmbraNormalRunState("ACTIVE", "STALE"), false);
});

test("production shutdown listeners and explicit retry create no duplicate owner and preserve ordinary mech starts", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  const first = s.umbraRunContext; s.events.emit("shutdown");
  assert.equal(first.state, "ENDED"); assert.equal(s.umbraNormalEndListeners, null);
  assert.equal(s.events.listenerCount("destroy"), 0);
  s.shopActive = true; s.umbraPresentationAssetRecords = new Map([["code:failed", { status: "failed" }], ["pose:ready", { status: "ready" }]]);
  const next = s.prepareUmbraNormalRunContext("retry"); assert.notEqual(next, first);
  assert.equal(s.umbraPresentationAssetRecords.has("code:failed"), false); assert.equal(s.umbraPresentationAssetRecords.has("pose:ready"), true);
  assert.equal(s.events.listenerCount("shutdown"), 1); assert.equal(s.events.listenerCount("destroy"), 1);
  s.endUmbraNormalRun("LOAD_FAILED"); s.getSelectedPlayerMechId = () => "regaliaBastion";
  assert.equal(s.prepareUmbraNormalRunContext(), null); assert.equal(s.umbraRunContext, null);
});

test("Final Raid entry ends the dedicated owner before its unchanged asynchronous raid loader", () => {
  const f = fixture(), s = f.scene; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  s.unlockSkill("umbraPhantomNova"); s.areFinalBossRaidAssetsLoaded = () => false;
  let requested = false; s.loadFinalBossRaidAssetsThenBegin = (transition, options) => {
    requested = true; assert.equal(s.umbraRunContext.state, "ENDED"); assert.equal(s.umbraPhantomNovaRuntime, null);
    assert.equal(transition.targetDepth, 10); assert.equal(options.dataCacheCount, 1); return "existing-loader";
  };
  assert.equal(s.beginFinalBossRaid({ targetDepth: 10 }, { dataCacheCount: 1 }), "existing-loader");
  assert.equal(requested, true); assert.equal(s.getRunPlayerMechId(), "umbraSeraph");
});
