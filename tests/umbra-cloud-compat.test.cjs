"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const caps = ["umbra-owned-v1", "umbra-atlas-v1", "umbra-archive-v2", "progression-journal-v1"];
function fixture() {
  const values = new Map(); let writeCount = 0;
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, String(value)); if (++writeCount === storage.failAfterWrite) throw new Error("interrupted-restore"); }, removeItem: key => values.delete(key) };
  const window = { localStorage: storage, sessionStorage: storage, location: { search: "", hostname: "127.0.0.1" } };
  const context = vm.createContext({ window, console, URLSearchParams, TextEncoder, Phaser: { Scene: class {}, Math: { Clamp: (value, min, max) => Math.min(max, Math.max(min, value)) } } });
  vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "umbraPersistence.js"), "utf8"), context);
  const end = source.indexOf("function isCommsStoryDebugResetRequested()"), start = source.indexOf("class SurvivalScene extends"), classEnd = source.indexOf("\nconst config =", start);
  vm.runInContext(source.slice(0, end) + source.slice(start, classEnd) + "\nthis.Scene = SurvivalScene;", context);
  const scene = Object.create(context.Scene.prototype);
  const coordinator = window.umbraPersistence.create({ storage, locks: { request: (_key, _options, callback) => Promise.resolve().then(callback) } }); coordinator.initialize();
  scene.umbraPersistenceCoordinator = coordinator;
  scene.executeUmbraPersistenceOperation = operation => coordinator.execute(operation);
  scene.isProgressionWriteBlocked = () => coordinator.status().blocked || coordinator.status().pending;
  scene.normalizeCloudSavePayload = value => value;
  scene.splitCloudSavePayload = value => ({ core: value, equipment: {}, archive: {} });
  scene.joinCloudSaveSegments = value => value.core;
  const documents = new Map(); let writes = 0;
  const snapshot = id => ({ exists: () => documents.has(id), data: () => documents.get(id) });
  const client = { db: {}, firestore: { doc: (_db, ...parts) => parts.join("/"), getDoc: async id => snapshot(id), serverTimestamp: () => 42,
    runTransaction: async (_db, callback) => { const pending = []; const result = await callback({ get: async id => snapshot(id), set: (id, data) => pending.push([id, data]) }); pending.forEach(([id, data]) => documents.set(id, data)); writes += pending.length; return result; } } };
  function seed(schema, revision = 1) {
    documents.set("playerCloudSaves/test", { schemaVersion: schema, revision, clientUpdatedAt: 100, ...(schema === 2 ? { minWriterVersion: 2, requiredCapabilities: caps } : {}) });
    for (const id of ["core", "equipment", "archive"]) documents.set(`playerCloudSaves/test/segments/${id}`, { schemaVersion: schema, revision, data: id === "core" ? { coins: 100, shopState: { retained: "raw" } } : {} });
  }
  return { scene, client, documents, storage, values, seed, writes: () => writes, prototype: context.Scene.prototype,
    resetWrites: () => { writeCount = 0; }, api: window.umbraPersistence };
}
test("legacy raw backup precedes normalization and schema2 atomically replaces all four docs", async () => {
  const f = fixture(); f.seed(1);
  const record = await f.scene.loadCloudSaveRecord(f.client, "test");
  const backup = JSON.parse(f.storage.getItem("lastmemoVansabaCloudMigrationBackup"));
  assert.equal(backup.ownerUid, "test"); assert.equal(backup.payload.shopState.retained, "raw"); assert.equal(record.schemaVersion, 1);
  const saved = await f.scene.writeCloudSaveRecord(f.client, "test", { coins: 90 }, 1);
  assert.equal(saved.revision, 2); assert.equal(f.writes(), 4);
  for (const doc of f.documents.values()) { assert.equal(doc.schemaVersion, 2); assert.equal(doc.revision, 2); }
  assert.deepEqual(Array.from(f.documents.get("playerCloudSaves/test").requiredCapabilities), caps);
});
test("migration without verified prior backup refuses before writes", async () => {
  const f = fixture(); f.seed(1);
  await assert.rejects(f.scene.writeCloudSaveRecord(f.client, "test", {}, 1), /preserve the legacy/); assert.equal(f.writes(), 0);
});
test("schema2 read, unknown schema/capability and mixed revisions", async () => {
  const f = fixture(); f.seed(2); assert.equal((await f.scene.loadCloudSaveRecord(f.client, "test")).schemaVersion, 2);
  f.documents.get("playerCloudSaves/test").requiredCapabilities = [...caps, "future"];
  await assert.rejects(f.scene.loadCloudSaveRecord(f.client, "test"), /Unsupported/);
  await assert.rejects(f.scene.writeCloudSaveRecord(f.client, "test", {}, 1), /newer compatible/);
  f.seed(99); await assert.rejects(f.scene.loadCloudSaveRecord(f.client, "test"), /Unsupported/);
  f.seed(2); f.documents.get("playerCloudSaves/test/segments/archive").revision = 9;
  await assert.rejects(f.scene.loadCloudSaveRecord(f.client, "test"), /incomplete/); assert.equal(f.writes(), 0);
});
test("revision conflict and local recovery refuse cloud writes", async () => {
  const f = fixture(); f.seed(2);
  await assert.rejects(f.scene.writeCloudSaveRecord(f.client, "test", {}, 0), /revision conflict/);
  f.scene.umbraPersistenceCoordinator.block("pending");
  await assert.rejects(f.scene.writeCloudSaveRecord(f.client, "test", {}, 1), /Resolve local recovery/); assert.equal(f.writes(), 0);
});
test("unknown cloud payload fields are rejected before dropping them", () => {
  const f = fixture(); assert.throws(() => f.prototype.normalizeCloudSavePayload.call(f.scene, { futureProgress: { keep: true } }), /Unknown cloud payload/);
});
test("foreign backup is retained and migration refuses", async () => {
  const f = fixture(); f.seed(1); const raw = JSON.stringify({ version: 1, ownerUid: "someone-else", revision: 1, payload: {} });
  f.storage.setItem("lastmemoVansabaCloudMigrationBackup", raw);
  await assert.rejects(f.scene.loadCloudSaveRecord(f.client, "test"), /owner-conflict/); assert.equal(f.storage.getItem("lastmemoVansabaCloudMigrationBackup"), raw);
});
test("15-key cloud restore plus sync metadata resumes a verified partial prefix, without rollback", async () => {
  const f = fixture(), s = f.scene;
  const payload = { coins: 90, shopState: { playerMechs: { ownedIds: ["defaultBear", "umbraSeraph"], selectedId: "umbraSeraph" } }, anjuMemoryState: {}, lostArmsState: {}, supportLinkState: {}, finalBossState: {}, depthRelayState: {}, depth20ClearCodeState: {}, mutationAtlasState: {}, bestRecord: {}, supplyRedeemedIds: [], equipmentState: {}, killRanking: [], runArchive: { version: 2, entries: [] }, commsStoryState: {} };
  s.cloudSaveState = { uid: "test", revision: 1, requestId: 7 };
  s.isCloudSaveRequestCurrent = () => true;
  s.getCloudSavePayloadFingerprint = value => JSON.stringify(value);
  s.setCloudSaveReady = () => true;
  f.storage.setItem("lastmemoVansabaCoins", "100");
  f.resetWrites(); f.storage.failAfterWrite = 3;
  await assert.rejects(s.applyCloudSavePayload(payload, { revision: 2, restart: false }), /interrupted-restore/);
  assert.equal(f.storage.getItem("lastmemoVansabaCoins"), "90");
  const journal = JSON.parse(f.storage.getItem(f.api.keys.journal)); assert.equal(journal.entries.length, 17);
  f.storage.failAfterWrite = 0;
  const fresh = f.api.create({ storage: f.storage, locks: { request: (_key, _options, callback) => Promise.resolve().then(callback) } }); fresh.initialize();
  assert.equal((await fresh.recoverAsync()).ok, true);
  assert.equal(JSON.parse(f.storage.getItem("lastmemoVansabaShopState")).playerMechs.selectedId, "umbraSeraph");
  const meta = JSON.parse(f.storage.getItem("lastmemoVansabaCloudSaveMeta")); assert.equal(meta.uid, "test"); assert.equal(meta.revision, 2);
  assert.equal(f.storage.getItem(f.api.keys.journal), null);
});
