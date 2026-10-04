"use strict";
// Production record boundaries with synthetic Storage only. No browser/account IO.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const registryFile = path.join(__dirname, "umbra-registry.test.cjs");
const prefix = fs.readFileSync(registryFile, "utf8").split('\ntest("')[0]
  .replace("return { scene, registry: context.registry, calls };", "return { scene, registry: context.registry, calls, fakeWindow };");
const mod = new Module(registryFile, module); mod.filename = registryFile; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(prefix + "\nmodule.exports = {createFixture};", registryFile);
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", U = "umbraSeraph";
const ATLAS = "lastmemoVansabaMutationAtlasState", MEMORY = "lastmemoVansabaAnjuMemoryState", ARCHIVE = "lastmemoVansabaRunArchive";
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const f = mod.exports.createFixture(), s = f.scene, data = new Map();
  let failure = "", writes = 0;
  f.fakeWindow.localStorage = {
    getItem(key) { if (failure === "readback" && writes) throw new Error("readback failure"); return data.get(key) ?? null; },
    setItem(key, value) { writes++; if (failure === "write") throw new Error("write failure"); data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
  s.isProgressionWriteBlocked = () => false; s.scheduleCloudSave = () => {};
  s.isRunArchiveDebugEnabled = () => false; s.isUmbraIntegrationRunScope = () => false;
  s.isUmbraProductionRunContext = () => true; s.isTriadMatrixFinalRaidSuppressed = () => false;
  s.getMutationAtlasRunMechId = () => U; s.isDepthRelayRun = () => false;
  s.showTriadMatrixNotice = () => {}; s.stageDepth = 8;
  s.triadMatrixState = s.createTriadMatrixRunState(); s.umbraRunContext = { runId: "production-test" };
  s.executeUmbraPersistenceOperation = async operation => {
    const prepared = operation.prepare();
    for (const entry of prepared.entries) assert.equal(data.get(entry.key) ?? null, entry.before);
    if (failure) return { ok: false, reason: "INJECTED_STORAGE_FAILURE" };
    for (const entry of prepared.entries) data.set(entry.key, entry.after);
    return { ok: true };
  };
  const build = "assault_array__execution_protocol";
  s.umbraNormalEndSnapshot = { mechId: U, skills: [{ skillId: M, stage: 8, core: "assault", final: "execution" },
    { skillId: B, stage: 8, core: "assault", final: "execution" }, { skillId: N, stage: 8, core: "assault", final: "execution" }],
    triad: { buildId: build, completeBuild: s.getMutationAtlasBuildMeta(build) },
    passives: { evasiveFirmware: 4 }, equipment: { qualification: { combatLinkLevel: 2, overlimitCap: 2 }, overlimitLevels: { [M]: 1, [B]: 2, [N]: 2 } } };
  s.umbraRunContext.atlasTargetSnapshot = { mechId: U, buildId: build };
  return { ...f, data, build, fail: kind => { failure = kind; writes = 0; } };
}

test("Atlas adds an empty UMBRA scope while preserving both existing frames and legacy mirror", () => {
  const { scene: s, build } = fixture();
  const old = s.createDefaultMutationAtlasState(); delete old.mechBuilds[U];
  old.mechBuilds.defaultBear.entries[build] = { discovered: true, preserved: true, preserveRewardClaimed: true, researchCompleted: true, researchRewardClaimed: true, bestDepth: 33 };
  old.mechBuilds.regaliaBastion.entries[build].researchRewardClaimed = true;
  const upgraded = s.normalizeMutationAtlasState(old);
  assert.deepEqual(plain(upgraded.mechBuilds.defaultBear), plain(old.mechBuilds.defaultBear));
  assert.deepEqual(plain(upgraded.mechBuilds.regaliaBastion), plain(old.mechBuilds.regaliaBastion));
  assert.equal(Object.keys(upgraded.mechBuilds[U].entries).length, 16);
  assert.equal(upgraded.mechBuilds[U].entries[build].discovered, false);
  assert.deepEqual(plain(upgraded.entries), plain(upgraded.mechBuilds.defaultBear.entries));
});

test("Archive v2 retains dedicated stages mutations OVL Evasive and explicit frame; old records infer their frame", () => {
  const { scene: s } = fixture();
  s.getPassiveLevel = () => 0;
  const entry = s.normalizeRunArchiveEntry({ id: "dedicated", mechId: U, skills: s.getRunArchiveSkillLevels(),
    skillMutations: s.getRunArchiveSkillMutationSnapshot(), equipmentCombatLink: s.createRunArchiveEquipmentCombatLinkSnapshot(),
    passives: s.getRunArchivePassiveLevels(), triadBuild: s.umbraNormalEndSnapshot.triad.completeBuild });
  assert.equal(entry.version, 2); assert.equal(entry.mechId, U);
  assert.deepEqual(plain(s.getRunArchiveSkillSlotIds(entry)), [M, B, N]);
  for (const id of [M, B, N]) { assert.equal(entry.skills[id], 8); assert.equal(entry.skillMutations[id].final, "execution"); }
  assert.equal(entry.equipmentCombatLink.overlimitLevels[N], 2); assert.equal(entry.passives.evasiveFirmware, 4);
  assert.equal(entry.triadBuild.buildId, s.umbraNormalEndSnapshot.triad.buildId);
  assert.equal(s.normalizeRunArchiveEntry({ version: 1, skills: { regaliaBastionCannon: 8 } }).mechId, "regaliaBastion");
  assert.equal(s.normalizeRunArchiveEntry({ version: 1, skills: { basicSkill: 4 } }).mechId, "defaultBear");
  assert.match(s.getRunArchiveSkillSummary(entry), /MOON 8/); assert.match(s.getRunArchiveSkillSummary(entry), /SPIKE 8/);
});

test("future Atlas and Archive versions remain opaque and cannot be overwritten", () => {
  const { scene: s, data } = fixture();
  const futureAtlas = { version: 99, secretFuture: { a: [1, 2, 3] } }, futureArchive = { version: 99, entries: [], future: true };
  assert.deepEqual(plain(s.normalizeMutationAtlasState(futureAtlas)), futureAtlas);
  assert.deepEqual(plain(s.normalizeRunArchive(futureArchive)), futureArchive);
  data.set(ATLAS, JSON.stringify(futureAtlas)); data.set(ARCHIVE, JSON.stringify(futureArchive));
  s.mutationAtlasState = s.createDefaultMutationAtlasState();
  assert.equal(s.saveMutationAtlasState(), null); assert.equal(s.saveRunArchive({ entries: [] }), null);
  assert.deepEqual(JSON.parse(data.get(ATLAS)), futureAtlas); assert.deepEqual(JSON.parse(data.get(ARCHIVE)), futureArchive);
  data.set(ARCHIVE, JSON.stringify({ version: 99, futureRecords: [{ result: "unknown" }] }));
  assert.equal(s.getRunArchiveDisplayEntries().length, 0);
  const futureEntry = { version: 99, id: "future", additional: ["preserve"] };
  assert.deepEqual(plain(s.normalizeRunArchiveEntry(futureEntry)), futureEntry);
  assert.equal(s.saveRunArchive({ version: 2, entries: [futureEntry] }), null);
});

test("Archive failed writes/readback keep the original result ID and retry without duplicates; limit stays twenty", () => {
  for (const kind of ["write", "readback"]) {
    const { scene: s, data, fail } = fixture(); let created = 0;
    s.runArchiveStarted = true; s.createRunArchiveEntry = () => ({ id: `fixed-${++created}`, skills: { [M]: 8 }, mechId: U });
    fail(kind); assert.equal(s.saveRunArchiveEntryOnce({ outcome: "normal_extract" }), null);
    assert.notEqual(s.runArchiveSaved, true); assert.equal(s.runArchivePendingEntry.id, "fixed-1");
    fail(""); assert.equal(s.saveRunArchiveEntryOnce({ outcome: "game_over" }).id, "fixed-1");
    assert.equal(s.runArchiveSaved, true); assert.equal(created, 1);
    assert.equal(JSON.parse(data.get(ARCHIVE)).entries.length, 1);
    for (let i = 0; i < 25; i++) s.appendRunArchiveEntry({ id: `extra-${i}` });
    assert.equal(s.loadRunArchive().entries.length, 20);
  }
});

test("new sortie retries a pending Archive result before creating another run", () => {
  const { scene: s, fail, data } = fixture(); let notices = 0;
  s.shopActive = true; s.runArchivePendingEntry = { id: "prior-run", mechId: U, skills: { [M]: 8 } };
  s.showPreGameShop = () => { notices++; };
  s.isCloudSaveSortieBlocked = () => true; // Stop immediately after the retry boundary.
  fail("write"); assert.equal(s.continueSortieFromHub(), false);
  assert.equal(s.runArchivePendingEntry.id, "prior-run"); assert.equal(data.has(ARCHIVE), false);
  fail(""); assert.equal(s.continueSortieFromHub(), false);
  assert.equal(s.runArchivePendingEntry, null); assert.equal(JSON.parse(data.get(ARCHIVE)).entries[0].id, "prior-run");
  assert.equal(notices, 2);
});

test("UMBRA normal return commits Atlas claim and AM/ticket together once per build", async () => {
  const { scene: s, data, build } = fixture();
  const result = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 8, rewardDepthReached: 8 });
  assert.equal(result.atlasBonusAnju, 1); assert.equal(result.researchRerollTicket, 1);
  const atlas = JSON.parse(data.get(ATLAS)), memory = JSON.parse(data.get(MEMORY));
  assert.equal(atlas.mechBuilds[U].entries[build].preserveRewardClaimed, true);
  assert.equal(atlas.mechBuilds[U].entries[build].researchRewardClaimed, true);
  assert.equal(memory.amount, 1); assert.equal(memory.consumables.openingBoostReroll, 1);
  assert.equal(await s.completeUmbraMutationAtlasExtractionProgress({}), result);
  delete s.umbraRunContext.atlasExtractionPromise;
  const repeated = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 9, rewardDepthReached: 9 });
  assert.equal(repeated.atlasBonusAnju, 0); assert.equal(repeated.researchRerollTicket, 0);
  assert.equal(JSON.parse(data.get(MEMORY)).amount, 1);
});

test("actual progression coordinator recovers interrupted Atlas plus AM commit without a second reward", async () => {
  const { scene: s, fakeWindow, data, build } = fixture();
  const vm = require("node:vm"), context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../umbraPersistence.js"), "utf8"), context);
  const api = context.window.umbraPersistence, storage = fakeWindow.localStorage;
  const write = storage.setItem; let interrupt = true, serial = 0;
  storage.setItem = (key, value) => { if (interrupt && key === MEMORY) throw new Error("interrupted before AM"); write(key, value); };
  const locks = { request: async (_name, _options, callback) => callback() };
  const create = () => api.create({ storage, locks, ownerId: "local", randomId: () => `records-${++serial}` });
  let coordinator = create(); coordinator.initialize();
  s.executeUmbraPersistenceOperation = operation => coordinator.execute(operation);
  const failed = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 8, rewardDepthReached: 8 });
  assert.equal(failed.persistencePending, true);
  assert.equal(JSON.parse(data.get(ATLAS)).mechBuilds[U].entries[build].preserveRewardClaimed, true);
  assert.equal(data.has(MEMORY), false); assert.ok(data.get(api.keys.journal));
  interrupt = false; coordinator = create(); coordinator.initialize();
  assert.equal((await coordinator.recoverAsync()).ok, true);
  assert.equal(JSON.parse(data.get(MEMORY)).amount, 1);
  assert.equal(JSON.parse(data.get(MEMORY)).consumables.openingBoostReroll, 1);
  assert.equal(data.has(api.keys.journal), false);
  delete s.umbraRunContext.atlasExtractionPromise;
  const retry = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 8, rewardDepthReached: 8 });
  assert.equal(retry.atlasBonusAnju, 0); assert.equal(retry.researchRerollTicket, 0);
  assert.equal(JSON.parse(data.get(MEMORY)).amount, 1);
});

test("emergency return and relay start depth alone do not award preserve or Research rewards", async () => {
  for (const options of [{ emergency: true, absoluteMaxDepthReached: 20, rewardDepthReached: 20 }, { absoluteMaxDepthReached: 20, rewardDepthReached: 1 }]) {
    const { scene: s, data, build } = fixture();
    const result = await s.completeUmbraMutationAtlasExtractionProgress(options);
    assert.equal(result.atlasBonusAnju, 0); assert.equal(result.researchRerollTicket, 0);
    const entry = JSON.parse(data.get(ATLAS)).mechBuilds[U].entries[build];
    assert.equal(entry.discovered, true); assert.equal(entry.bestDepth, 20); assert.equal(entry.preserved, false);
  }
});

test("Research uses the target captured for this run and failed transaction reports pending without RAM claims", async () => {
  const { scene: s, data, fail } = fixture();
  s.umbraRunContext.atlasTargetSnapshot = { mechId: U, buildId: "different" };
  const result = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 8, rewardDepthReached: 8 });
  assert.equal(result.atlasBonusAnju, 1); assert.equal(result.researchRerollTicket, 0);
  delete s.umbraRunContext.atlasExtractionPromise; data.clear(); fail("write");
  s.mutationAtlasState = s.createDefaultMutationAtlasState(); const before = plain(s.mutationAtlasState);
  const failed = await s.completeUmbraMutationAtlasExtractionProgress({ absoluteMaxDepthReached: 8, rewardDepthReached: 8 });
  assert.equal(failed.persistencePending, true); assert.equal(failed.atlasBonusAnju, 0);
  assert.deepEqual(plain(s.mutationAtlasState), before); assert.equal(data.size, 0);
  assert.match(s.formatMutationAtlasExtractionLines(failed).join(" "), /保存保留/);
});

test("Atlas discovery failure leaves the old RAM claim and can be retried", () => {
  const { scene: s, fail, build } = fixture();
  s.mutationAtlasState = s.createDefaultMutationAtlasState(); s.runAnjuMemoryState = { maxDepthReached: 8 };
  fail("write"); assert.equal(s.updateMutationAtlasProgressFromSnapshot({ buildId: build }), null);
  assert.equal(s.mutationAtlasState.mechBuilds[U].entries[build].discovered, false);
  fail(""); const result = s.updateMutationAtlasProgressFromSnapshot({ buildId: build });
  assert.equal(result.discovered, true); assert.equal(s.mutationAtlasState.mechBuilds[U].entries[build].discovered, true);
});

test("Atlas renders three distinct tabs while ordinary combat equipment IDs remain unchanged", () => {
  const { scene: s, registry } = fixture(), tabs = [];
  s.createMutationAtlasMechTab = (...args) => tabs.push(args); s.renderMutationAtlasMechTabs();
  assert.deepEqual(tabs.map(args => args[3]), ["defaultBear", "regaliaBastion", U]);
  assert.ok(tabs[0][0] + tabs[0][2] / 2 < tabs[1][0] - tabs[1][2] / 2);
  assert.deepEqual(plain(registry.equipmentSkills), ["basicSkill", "tornadoSkill", "rabbitThunderSkill"]);
});
