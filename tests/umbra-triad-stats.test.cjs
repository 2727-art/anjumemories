"use strict";
// Phase6D1 pure production aggregation/selection/EN/gauge tests. Numeric RAM
// records are explicit inputs, not a claim of natural XP or live robot behavior.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), crypto = require("node:crypto");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", ids = [M, B, N];
const cores = ["assault", "control", "reactor"], finals = ["execution", "prism", "singularity"];
const plain = value => JSON.parse(JSON.stringify(value));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const file = path.join(__dirname, "umbra-final-stats.test.cjs"), source = fs.readFileSync(file, "utf8");
const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
const fixtureSource = source.slice(0, source.indexOf('\ntest("')).replace('  if (old) source =',
  `  source = source.replace('Math: { Clamp:', 'Math: { Linear: (a, b, t) => a + (b - a) * t, Clamp:');\n  if (old) source =`);
mod._compile(fixtureSource + "\nmodule.exports={numeric,live,finalRuntime,pick,runtime};", file);
const base = mod.exports;
function triad(coreValues = [], finalValues = [], options = {}) {
  const f = base.numeric({ coreId: null, ...options }), s = f.scene;
  s.verificationContext = Object.freeze({ ...s.verificationContext, triadEnabled: true }); s.umbraGrowthRun.context = s.verificationContext;
  const forbid = () => { f.calls.storage++; assert.fail("Atlas/save/research/reward entry called"); };
  for (const name of ["startTriadMatrixRun", "refreshTriadMatrixSnapshot", "getTriadMatrixSnapshot", "loadMutationAtlasState",
    "normalizeMutationAtlasState", "updateMutationAtlasProgressFromSnapshot", "grantMutationAtlasExtractionRewards", "scheduleCloudSave"]) s[name] = forbid;
  for (const id of ids) if (s.playerSkills[id]) s[{ [M]: "umbraMoonlightRuntime", [B]: "umbraBloodSpikeRuntime", [N]: "umbraPhantomNovaRuntime" }[id]].cleanups = [];
  setSelections(s, coreValues, finalValues);
  s.initializeUmbraTriadRun();
  return f;
}
function setSelections(s, coreValues, finalValues = []) {
  for (const [i, id] of ids.entries()) {
    const entry = s.skillMutationState.entries[id]; if (!entry) continue;
    entry.core = coreValues[i] ?? null; entry.stage4Selected = entry.core !== null;
    entry.final = finalValues[i] ?? null; entry.stage8Selected = entry.final !== null;
  }
}
const product = choices => choices.flatMap(a => choices.flatMap(b => choices.map(c => [a, b, c])));
function expectedLevel(values) {
  const counts = new Map(); for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return Math.max(0, ...counts.values()) === 3 || counts.size === 3 ? 2 : Math.max(0, ...counts.values()) === 2 ? 1 : 0;
}

test("Phase6D1 baseline retains completed6C2 source; Stage bytes differ only by the requested SPIKE S8 radius", () => {
  const dir = path.join(root, ".tmp_umbra_phase6d1/2026-09-08-start/baseline");
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(dir, "game.js"))).digest("hex"), "5d7cdaa03fa7f47eac63cfab5a93d1bfb9eedd0c1764e6a2c11c78c266d365d4");
  const old = fs.readFileSync(path.join(dir, "skillDefinitions.js"), "utf8");
  const radiusRow = "impactRadius: [90, 100, 110, 122, 135, 147, 160]";
  assert.equal(old.split(radiusRow).length, 2);
  assert.equal(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), old.replace(radiusRow, radiusRow.replace("160]", "240]")));
});

for (const axis of ["core", "final"]) test(`${axis}: all64 null-inclusive three-slot arrangements match STANDBY/LINK/MATRIX`, () => {
  const f = triad(), s = f.scene, kinds = axis === "core" ? cores : finals;
  for (const values of product([null, ...kinds])) {
    setSelections(s, axis === "core" ? values : ["assault", "assault", "assault"], axis === "final" ? values : []);
    const snapshot = s.refreshUmbraTriadSnapshot("NUMERIC_CASE", { notify: false });
    assert.equal(snapshot[axis].level, expectedLevel(values), JSON.stringify(values));
    assert.equal(snapshot.selectedCounts[axis], values.filter(Boolean).length);
    assert.equal(snapshot.targetSkillIds.length, 3); assert.equal(new Set(snapshot.targetSkillIds).size, 3);
    assert.ok(Object.isFrozen(snapshot)); assert.ok(Object.isFrozen(snapshot.modifiers)); assert.ok(Object.isFrozen(snapshot[axis].counts));
    const prior = plain(snapshot), revision = snapshot.revision;
    for (let repeat = 0; repeat < 5; repeat++) {
      assert.equal(s.getUmbraTriadSnapshot(), snapshot); assert.equal(s.refreshUmbraTriadSnapshot("SAME"), snapshot);
    }
    assert.equal(s.umbraTriadState.revision, revision); assert.deepEqual(plain(snapshot), prior);
  }
  assert.deepEqual(f.calls, { storage: 0, network: 0 });
});

test("all16 complete build IDs use existing static names; a singleII or2:1 never completes", () => {
  const s = triad().scene;
  const coreRows = [["assault", "assault_array"], ["control", "control_grid"], ["reactor", "reactor_loop"], ["mixed", "trinity_core"]];
  const finalRows = [["execution", "execution_protocol"], ["prism", "prism_cascade"], ["singularity", "singularity_domain"], ["mixed", "adaptive_form"]];
  for (const [c, cid] of coreRows) for (const [f, fid] of finalRows) {
    setSelections(s, c === "mixed" ? cores : [c, c, c], f === "mixed" ? finals : [f, f, f]);
    const snap = s.refreshUmbraTriadSnapshot("SYNTHETIC16", { notify: false });
    assert.equal(snap.buildId, `${cid}__${fid}`); assert.equal(snap.displayName, `${snap.completeBuild.coreName} / ${snap.completeBuild.finalName}`);
    assert.ok(snap.core.complete && snap.final.complete);
  }
  for (const values of [["execution", null, null], ["execution", "execution", "prism"]]) {
    setSelections(s, ["assault", "assault", "assault"], values);
    assert.equal(s.refreshUmbraTriadSnapshot("INCOMPLETE").buildId, null);
  }
});

test("existing coefficients start from identity once; dedicated skill IDs are recognized for production records", () => {
  const cases = [
    [["assault", "assault"], [], { skillDamageMultiplier: 1.04 }],
    [["assault", "assault", "assault"], [], { skillDamageMultiplier: 1.08 }],
    [["control", "control"], [], { controlMultiplier: 1.06 }],
    [["control", "control", "control"], [], { controlMultiplier: 1.12 }],
    [["reactor", "reactor"], [], { overdriveGaugeMultiplier: 1.06, robotSyncGaugeMultiplier: 1.06, dashStaminaDrainMultiplier: .97 }],
    [["reactor", "reactor", "reactor"], [], { overdriveGaugeMultiplier: 1.12, robotSyncGaugeMultiplier: 1.12, dashStaminaDrainMultiplier: .94 }],
    [cores, [], { skillDamageMultiplier: 1.03, controlMultiplier: 1.05, overdriveGaugeMultiplier: 1.05, robotSyncGaugeMultiplier: 1.05, dashStaminaDrainMultiplier: .97 }],
    [cores, ["execution", "execution"], { executionDamageMultiplier: 1.06 }],
    [cores, ["execution", "execution", "execution"], { executionDamageMultiplier: 1.12 }],
    [cores, ["prism", "prism"], { prismDamageMultiplier: 1.08 }],
    [cores, ["prism", "prism", "prism"], { prismDamageMultiplier: 1.15 }],
    [cores, ["singularity", "singularity"], { singularityMultiplier: 1.06 }],
    [cores, ["singularity", "singularity", "singularity"], { singularityMultiplier: 1.12 }],
    [cores, finals, { executionDamageMultiplier: 1.05, prismDamageMultiplier: 1.06, singularityMultiplier: 1.06 }]
  ];
  for (const [cv, fv, expected] of cases) {
    const f = triad(cv, fv), s = f.scene;
    for (const [key, value] of Object.entries(expected)) near(s.getUmbraTriadModifier(key), value);
    assert.ok(ids.every(id => s.getAllSkillMutationSkillIds().includes(id)));
    assert.equal(s.getUmbraTriadCombatProfile("basicSkill"), null); assert.equal(s.getTriadSkillDamageMultiplier("basicSkill"), 1);
    assert.deepEqual(f.calls, { storage: 0, network: 0 });
  }
});

test("unacquired/forged Stage/Core prerequisite/foreign and duplicate IDs cannot count; S1 third receives other two's LINK", () => {
  const f = triad(["assault", "assault", null], ["execution", "execution", null]), s = f.scene;
  base.live.selectStage(s, f.api, N, 1); s.refreshUmbraTriadSnapshot("THIRD_S1");
  assert.equal(s.getUmbraTriadSnapshot().core.level, 1); near(s.getTriadSkillDamageMultiplier(N), 1.04);
  near(s.getTriadSkillDamageMultiplier(N, { enemy: { hp: 10, maxHp: 10 } }), 1.04 * 1.06);
  assert.equal(s.getUmbraSelectedCoreId(N), null); assert.equal(s.getUmbraSelectedFinalId(N), null);
  const saved = s.playerSkills[B].currentStage; s.playerSkills[B].currentStage = { ...saved };
  const removedOwner = s.umbraBloodSpikeRuntime, oldBinding = s.umbraTriadState.bindings.get(removedOwner);
  assert.equal(s.getUmbraTriadCombatProfile(N), null, "Invalid captured owner eligibility neutralizes until an explicit refresh");
  s.refreshUmbraTriadSnapshot("INVALID_STAGE"); assert.equal(s.getUmbraTriadSnapshot().core.level, 0);
  assert.equal(removedOwner.umbraTriadRun, null); assert.equal(s.umbraTriadState.bindings.has(removedOwner), false);
  assert.equal(removedOwner.cleanups.includes(oldBinding), false, "A live but no-longer-canonical runtime cannot retain the old binding");
  s.playerSkills[B].currentStage = saved; s.refreshUmbraTriadSnapshot("RESTORED");
  assert.equal(removedOwner.umbraTriadRun, s.umbraGrowthRun); assert.equal(s.umbraTriadState.bindings.has(removedOwner), true);
  s.skillMutationState.entries[B].stage4Selected = false; s.refreshUmbraTriadSnapshot("CORE_LOST");
  assert.equal(s.getUmbraTriadSnapshot().selections[B].final, null);
  s.playerSkills.fake = s.playerSkills[M]; s.skillMutationState.entries.fake = s.skillMutationState.entries[M];
  assert.deepEqual(plain(s.refreshUmbraTriadSnapshot("FOREIGN").targetSkillIds), ids);
  delete s.playerSkills[M]; s.refreshUmbraTriadSnapshot("UNACQUIRED"); assert.equal(s.getUmbraTriadSnapshot().selectedCounts.core, 0);
});

test("live context checks oldrun/body/world/mech/Raid while pause/hidden/normalDepth10 preserve snapshot", () => {
  const f = triad(cores, finals), s = f.scene, original = s.getUmbraTriadSnapshot();
  for (const key of ["drivePaused", "levelUpActive", "hidden"]) { s[key] = true; assert.equal(s.getUmbraTriadSnapshot(), original); s[key] = false; }
  s.stageDepth = 10; assert.equal(s.getUmbraTriadSnapshot(), original);
  for (const key of ["finalBossRaidAssetsLoading", "gameOver", "extractionComplete", "restartInProgress", "shopActive"]) {
    s[key] = true; assert.equal(s.getUmbraTriadCombatProfile(M), null); assert.equal(s.getTriadDashStaminaDrainMultiplier(), 1); s[key] = false;
  }
  s.finalBossRaidState = { active: true }; assert.equal(s.getUmbraTriadCombatProfile(M), null); s.finalBossRaidState = null;
  s.finalBossRaidAssetsLoading = true;
  for (const name of ["getTriadControlMultiplier", "getTriadPrismDamageMultiplier", "getTriadSingularityMultiplier",
    "getTriadOverdriveGaugeMultiplier", "getTriadRobotSyncGaugeMultiplier", "getTriadDashStaminaDrainMultiplier"]) assert.equal(s[name](), 1);
  assert.equal(s.getTriadSkillDamageMultiplier(M, { enemy: { hp: 10, maxHp: 10 } }), 1);
  s.finalBossRaidAssetsLoading = false;
  const run = s.umbraGrowthRun; s.umbraGrowthRun = { ...run }; assert.equal(s.getUmbraTriadSnapshot(), null); s.umbraGrowthRun = run;
  const body = s.playerHitbox.body; s.playerHitbox.body = { ...body }; assert.equal(s.getUmbraTriadSnapshot(), null); s.playerHitbox.body = body;
  const world = s.physics.world; s.physics.world = {}; assert.equal(s.getUmbraTriadSnapshot(), null); s.physics.world = world;
  const context = s.verificationContext; s.verificationContext = Object.freeze({ ...context, mechId: "defaultBear" });
  assert.equal(s.getUmbraTriadSnapshot(), null); s.verificationContext = context;
  assert.equal(s.getUmbraTriadSnapshot(), original);
});

test("commits publish once after successful Core/Final application; false/throw/double callbacks and queries never pre-publish", () => {
  const f = base.finalRuntime([B, N]), s = f.scene;
  s.verificationContext = { ...s.verificationContext, triadEnabled: true }; s.umbraGrowthRun.context = s.verificationContext;
  s.initializeUmbraTriadRun(); for (const id of ids) base.runtime.stage(s, id, 8);
  const before = s.getUmbraTriadSnapshot(), preserved = [s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, s.umbraPhantomNovaRuntime];
  const apply = s.applyUmbraSkillStageChange, notifications = [];
  s.onUmbraTriadSnapshotChanged = (...args) => notifications.push(args);
  s.applyUmbraSkillStageChange = function (...args) {
    assert.equal(this.getUmbraTriadSnapshot().revision, this.umbraTriadState.revision);
    const previous = this.getUmbraTriadSnapshot(); const result = apply.apply(this, args);
    assert.equal(this.getUmbraTriadSnapshot(), previous, "In-flight Stage refresh cannot publish pending Core/Final"); return result;
  };
  for (let i = 0; i < 6; i++) {
    const prior = s.getUmbraTriadSnapshot(); base.pick(s, "assault", "execution");
    assert.equal(s.getUmbraTriadSnapshot().revision, prior.revision + 1);
  }
  assert.equal(s.getUmbraTriadSnapshot().revision, before.revision + 6); assert.equal(notifications.length, 4);
  assert.deepEqual([s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, s.umbraPhantomNovaRuntime], preserved);
  for (const mode of ["false", "throw"]) {
    const t = base.finalRuntime(), q = t.scene; q.verificationContext = { ...q.verificationContext, triadEnabled: true }; q.umbraGrowthRun.context = q.verificationContext;
    q.initializeUmbraTriadRun(); base.runtime.stage(q, M, 4); const old = q.getUmbraTriadSnapshot();
    q.applyUmbraSkillStageChange = () => { if (mode === "throw") throw Error("INTENDED_TRIAD_APPLY_FAILURE"); return false; };
    q.tryOpenPendingSkillMutationSelection(); const choices = q.levelUpCardRecords.map(x => x.model.option);
    q.selectLevelUpCard(0); q.testConfirm(); assert.equal(q.getUmbraTriadSnapshot(), old); assert.equal(q.umbraTriadState.notifications, 0);
    assert.equal(q.getUmbraSelectedCoreId(M), null); assert.equal(choices[0].onSelect(), false);
  }
});

test("owner cleanup recomputes remaining eligible links and terminal destroy releases references with display-only end snapshot", () => {
  const f = triad(["assault", "assault", "assault"]), s = f.scene, state = s.umbraTriadState, owner = s.umbraPhantomNovaRuntime;
  const old = s.getUmbraTriadCombatProfile(M); owner.destroyed = true;
  assert.equal(s.getUmbraTriadCombatProfile(M), null); for (const cleanup of owner.cleanups.splice(0)) cleanup();
  assert.equal(s.getUmbraTriadSnapshot().core.level, 1); assert.equal(old.skillDamageMultiplier, 1.08);
  const ended = s.destroyUmbraTriadRun("AP0"); assert.ok(Object.isFrozen(ended)); assert.equal(ended.ended, true);
  assert.equal(s.getUmbraTriadSnapshot(), null); assert.equal(s.getTriadDashStaminaDrainMultiplier(), 1);
  assert.equal(state.run, null); assert.equal(state.owners.size, 0); assert.equal(state.bindings.size, 0);
  assert.ok(ids.every(id => !s[{ [M]: "umbraMoonlightRuntime", [B]: "umbraBloodSpikeRuntime", [N]: "umbraPhantomNovaRuntime" }[id]].umbraTriadRun));
});

test("DASH existing start/sustain/max formulas consume TRIAD once, with fixed min8/restart24 and no EN refund", () => {
  const tuning = { boostStartCost: 6, boostMinStaminaToStart: 8, boostRestartStaminaThreshold: 24,
    boostSustainDrainPerSecond: 58, boostSustainDrainMaxMultiplier: 1.15 };
  for (const [values, multiplier] of [[[], 1], [["reactor", "reactor"], .97], [["reactor", "reactor", "reactor"], .94], [cores, .97]]) {
    const f = triad(values), s = f.scene, before = s.stats.stamina;
    near(s.getAcDashDrainMultiplier(), .75 * multiplier); near(s.getAcContinuousBoostStartCost(tuning), 4.5 * multiplier);
    near(s.getAcContinuousBoostDrainPerSecond(0, tuning), 43.5 * multiplier);
    near(s.getAcContinuousBoostDrainPerSecond(1, tuning), 50.025 * multiplier);
    assert.equal(s.getAcContinuousBoostMinStartStamina(tuning), 8); assert.equal(s.getAcContinuousBoostRestartStaminaThreshold(tuning), 24);
    assert.equal(s.stats.stamina, before); assert.equal(s.stats.hp, f.scene.stats.hp);
  }
});

test("production OD/Robot gauge entries apply input10 once; threshold/invalid checks remain while reward/activation leaves are isolated", () => {
  for (const [values, multiplier] of [[[], 1], [["reactor", "reactor"], 1.06], [["reactor", "reactor", "reactor"], 1.12], [cores, 1.05]]) {
    const s = triad(values).scene, calls = { od: 0, sync: 0, geek: 0 }, state = { overdriveGauge: 0 };
    s.ensureOverflowRewardState = () => state;
    s.setLastPickupNotice = s.showOverflowRewardText = s.updateOverflowHud = s.updateHudRobotPanel = () => {};
    s.triggerOverdriveFromGauge = () => { calls.od++; return { triggered: true }; };
    s.activateRobotSyncDrive = () => { calls.sync++; }; s.isRobotSyncDebugEnabled = () => false;
    s.getRobotSyncGaugeMultiplier = () => 1; s.robotState = { syncGauge: 0 };
    near(s.addDepthDirectiveOverdriveGauge(10).gaugeAdded, 10 * multiplier); near(state.overdriveGauge, 10 * multiplier);
    near(s.addRobotSyncGauge(10).gaugeAdded, 10 * multiplier); near(s.robotState.syncGauge, 10 * multiplier);
    assert.deepEqual(calls, { od: 0, sync: 0, geek: 0 });
    s.getAnomalyOverdriveGainMultiplier = () => 1.2; s.getOverflowGeekAmount = value => value;
    s.addOverflowUnsecuredGeek = () => { calls.geek++; return 0; }; state.overdriveGauge = 0;
    s.addOverdriveFromXp(10); near(state.overdriveGauge, 10 * 1.2 * multiplier); assert.equal(calls.geek, 1, "Reward leaf counted and blocked, not opened in arena");
    s.getRobotSyncGaugeMultiplier = () => 1.5; s.robotState.syncGauge = 0;
    near(s.addRobotSyncGauge(10).gaugeAdded, 10 * 1.5 * multiplier);
    state.overdriveGauge = 99; s.robotState.syncGauge = 99;
    s.addDepthDirectiveOverdriveGauge(10); s.addRobotSyncGauge(10);
    assert.equal(calls.od, 1); assert.equal(calls.sync, 1); assert.ok(state.overdriveGauge < 100 && s.robotState.syncGauge < 100);
    s.gameOver = true; const before = s.robotState.syncGauge; assert.equal(s.addRobotSyncGauge(10).gaugeAdded, 0); assert.equal(s.robotState.syncGauge, before);
    assert.equal(s.addDepthDirectiveOverdriveGauge(0).gaugeAdded, 0);
  }
});

test("TRIAD card values reuse actual main/secondary/control/field helpers; percentage/current revision differ from future combination preview", () => {
  let s = triad(["assault", "assault", "assault"], ["execution", "execution", "execution"]).scene;
  for (const [id, strong, ordinary] of [[M, 23, 16], [B, 9, 7], [N, 6, 4]]) {
    const card = s.buildUmbraFinalCard(id, "execution");
    assert.ok(card.chips.some(chip => chip.label.includes(`raw 強対象 ${strong} / その他 ${ordinary}`)));
    assert.match(card.description, /現在確定済み/); assert.match(card.description, /今回選択後の組合せ予測ではありません/);
  }
  s = triad(["assault", "assault", "assault"], ["prism", "prism", "prism"]).scene;
  for (const [id, value] of [[M, 6], [B, 3], [N, 2]]) assert.ok(s.buildUmbraFinalCard(id, "prism").chips.some(chip => chip.label.includes(`強${value}・他${value}`)));
  s = triad(["control", "control", "control"], ["singularity", "singularity", "singularity"]).scene;
  for (const [id, radius, duration] of [[M, 100.8, 672], [B, 200, 1120], [N, 89.6, 3000]]) {
    const card = s.buildUmbraFinalCard(id, "singularity"), labels = card.chips.map(chip => chip.label).join("|");
    assert.match(labels, new RegExp(`半径${radius}`)); assert.ok(labels.includes(`${duration}ms`)); assert.match(labels, /通常0.832・Boss系0.944/);
  }
  const coreCard = s.buildUmbraCoreCard(B, "control"), labels = coreCard.chips.map(chip => chip.label).join("|");
  assert.match(labels, /通常敵 移動速度 -28% \/ 672ms/); assert.match(labels, /主CONTROL 倍率 通常0.72/);
  const previous = s.getUmbraTriadSnapshot(), state = s.umbraTriadState, counts = [state.revision, state.notifications];
  for (let i = 0; i < 10; i++) { s.buildUmbraCoreCard(B, "reactor"); s.buildUmbraFinalCard(M, "prism"); }
  assert.equal(s.getUmbraTriadSnapshot(), previous); assert.deepEqual([state.revision, state.notifications], counts);
});
