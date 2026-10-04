"use strict";
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const test = require("node:test"), assert = require("node:assert/strict");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../umbraPersistence.js"), "utf8"), context);
const api = context.window.umbraPersistence;
class Storage {
  constructor() { this.values = new Map(); this.writes = 0; this.fail = 0; this.after = false; this.failRead = false; }
  getItem(key) { if (this.failRead) { this.failRead = false; throw new Error("read-failure"); } return this.values.get(key) ?? null; }
  setItem(key, value) { this.change(key, String(value)); }
  removeItem(key) { this.change(key, null); }
  change(key, value) {
    this.writes++;
    if (this.writes === this.fail && !this.after) throw new Error("quota-before");
    if (value === null) this.values.delete(key); else this.values.set(key, value);
    if (this.writes === this.fail && this.after === "read") this.failRead = true;
    if (this.writes === this.fail && this.after === true) throw new Error("interrupted-after-write");
  }
}
function serialLocks() {
  let tail = Promise.resolve();
  return { request: (_name, _options, callback) => { const operation = tail.then(callback); tail = operation.catch(() => {}); return operation; } };
}
function fixture(storage = new Storage(), locks = serialLocks(), ownerId = "local") {
  let sequence = 0;
  const coordinator = api.create({ storage, locks, ownerId, now: () => 1000, randomId: () => `tx-${++sequence}` });
  coordinator.initialize();
  return { storage, locks, coordinator };
}
const entries = [{ key: "wallet", before: "100", after: "90" }, { key: "shop", before: "old", after: "owned" }];
const seed = f => { f.storage.values.set("wallet", "100"); f.storage.values.set("shop", "old"); f.storage.writes = 0; return f; };
test("import has no IO; durable ordered commit returns prepare transaction identity and value", async () => {
  const f = seed(fixture());
  const result = await f.coordinator.execute({ kind: "purchase", prepare: tx => ({ entries, metadata: tx, value: "selected" }) });
  assert.equal(result.ok, true); assert.equal(result.value, "selected"); assert.equal(f.storage.getItem("wallet"), "90");
  assert.equal(f.storage.getItem("shop"), "owned"); assert.equal(f.storage.getItem(api.keys.journal), null);
  assert.equal(JSON.parse(f.storage.getItem(api.keys.backups)).records[0].transactionId, result.transactionId);
});
test("production read-only initialization defers new profile creation to the bootstrap lock", async () => {
  const storage = new Storage(), locks = serialLocks();
  const first = api.create({ storage, locks }), second = api.create({ storage, locks });
  assert.equal(first.initialize({ readOnly: true }).pending, true);
  assert.equal(second.initialize({ readOnly: true }).pending, true);
  assert.equal(storage.writes, 0);
  const results = await Promise.all([first.recoverAsync(), second.recoverAsync()]);
  assert.equal(results.every(result => result.ok), true);
  assert.equal(first.status().profileId, second.status().profileId);
  assert.equal(storage.writes, 1);
});
for (const mode of [false, true, "read"]) for (let write = 1; write <= 6; write++) {
  test(`interruption at write ${write} / ${mode}: preserve, cancel untouched or roll forward without second debit`, async () => {
    const f = seed(fixture()); f.storage.fail = write; f.storage.after = mode;
    const result = await f.coordinator.execute({ kind: "purchase", entries });
    assert.equal(result.ok, false);
    f.storage.fail = 0; f.storage.failRead = false;
    const next = fixture(f.storage, f.locks);
    const recovered = await next.coordinator.recoverAsync();
    assert.equal(recovered.ok, true);
    const wallet = f.storage.getItem("wallet"), shop = f.storage.getItem("shop");
    assert.ok((wallet === "100" && shop === "old") || (wallet === "90" && shop === "owned"));
    assert.equal(f.storage.getItem(api.keys.journal), null);
  });
}
test("unexpected target change is preserved with journal; never roll whole progress back", async () => {
  const f = seed(fixture()); f.storage.fail = 3; f.storage.after = true;
  await f.coordinator.execute({ entries }); f.storage.fail = 0;
  f.storage.values.set("shop", "other-progress");
  const next = fixture(f.storage, f.locks), result = await next.coordinator.recoverAsync();
  assert.equal(result.ok, false); assert.equal(f.storage.getItem("wallet"), "90"); assert.equal(f.storage.getItem("shop"), "other-progress");
  assert.ok(f.storage.getItem(api.keys.journal));
});
test("COMMITTED cleanup preserves later legitimate wallet and selection", async () => {
  const f = seed(fixture()); f.storage.fail = 6;
  await f.coordinator.execute({ entries }); f.storage.fail = 0;
  f.storage.values.set("wallet", "75"); f.storage.values.set("shop", "selected-other");
  const next = fixture(f.storage, f.locks); assert.equal((await next.coordinator.recoverAsync()).ok, true);
  assert.equal(f.storage.getItem("wallet"), "75"); assert.equal(f.storage.getItem("shop"), "selected-other");
});
test("foreign owner, corrupted and future journal are retained", async () => {
  for (const raw of ["{broken", JSON.stringify({ version: 99 }), JSON.stringify({ version: 1, ownerId: "foreign" })]) {
    const f = seed(fixture()); f.storage.values.set(api.keys.journal, raw);
    assert.equal((await fixture(f.storage, f.locks).coordinator.recoverAsync()).ok, false);
    assert.equal(f.storage.getItem(api.keys.journal), raw); assert.equal(f.storage.getItem("wallet"), "100");
  }
  const f = fixture(); const other = fixture(f.storage, f.locks, "other"); assert.equal(other.coordinator.status().blocked, true);
});
test("locks unavailable blocks transaction; no-op succeeds and prepare rejects without writes", async () => {
  const f = seed(fixture(new Storage(), null));
  assert.equal((await f.coordinator.execute({ entries })).reason, "exclusive-lock-unavailable"); assert.equal(f.storage.writes, 0);
  const good = seed(fixture()); assert.equal((await good.coordinator.execute({ prepare: () => ({ entries: [], value: 4 }) })).value, 4);
  assert.equal((await good.coordinator.execute({ prepare: () => ({ ok: false, reason: "not-owned" }) })).reason, "not-owned");
  assert.equal(good.storage.writes, 0);
});
test("two same-profile coordinators run prepare under one lock and do not double debit", async () => {
  const f = seed(fixture()), other = fixture(f.storage, f.locks);
  const request = { prepare: () => f.storage.getItem("shop") === "owned" ? { entries: [] } : { entries } };
  const results = await Promise.all([f.coordinator.execute(request), other.coordinator.execute(request)]);
  assert.equal(results.every(result => result.ok), true); assert.equal(f.storage.getItem("wallet"), "90");
});
test("backup retains only two recent operations and backup failure prevents wallet writes", async () => {
  const f = seed(fixture());
  for (let i = 0; i < 4; i++) await f.coordinator.execute({ entries: [{ key: "counter", before: f.storage.getItem("counter"), after: String(i) }] });
  assert.equal(JSON.parse(f.storage.getItem(api.keys.backups)).records.length, 2);
  f.storage.values.set(api.keys.backups, "invalid");
  assert.equal((await f.coordinator.execute({ entries })).ok, false); assert.equal(f.storage.getItem("wallet"), "100");
});
test("committed ownership stamp detects old local writer after the modern tab closed", async () => {
  const f = seed(fixture()), key = "lastmemoVansabaShopState";
  const modern = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["defaultBear", "umbraSeraph"] } });
  assert.equal((await f.coordinator.execute({ kind: "purchase", entries: [{ key, before: null, after: modern }] })).ok, true);
  assert.ok(f.storage.getItem(api.keys.compatibility));
  const old = JSON.stringify({ playerMechs: { ownedIds: ["defaultBear"] } }); f.storage.values.set(key, old);
  const next = fixture(f.storage, f.locks); assert.equal(next.coordinator.validateProtectedRecords().ok, false);
  assert.equal(next.coordinator.status().blocked, true); assert.equal(f.storage.getItem(key), old);
});
test("same-version old Atlas scope loss is detected, Archive normal rolloff remains valid", async () => {
  const f = fixture(), atlas = "lastmemoVansabaMutationAtlasState", archive = "lastmemoVansabaRunArchive";
  await f.coordinator.execute({ entries: [
    { key: atlas, before: null, after: JSON.stringify({ version: 2, mechBuilds: { defaultBear: {}, umbraSeraph: {} } }) },
    { key: archive, before: null, after: JSON.stringify({ version: 2, entries: [{ id: "umbra" }] }) }
  ] });
  f.storage.values.set(archive, JSON.stringify({ version: 2, entries: [] }));
  assert.equal(f.coordinator.validateProtectedRecords().ok, true);
  f.storage.values.set(atlas, JSON.stringify({ version: 2, mechBuilds: { defaultBear: {} } }));
  assert.equal(fixture(f.storage, f.locks).coordinator.validateProtectedRecords().ok, false);
});
test("explicit cloud whole-progress restore may replace ownership requirements", async () => {
  const f = fixture(), key = "lastmemoVansabaShopState";
  const owned = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["defaultBear", "umbraSeraph"] } });
  const selected = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["defaultBear"] } });
  await f.coordinator.execute({ kind: "purchase", entries: [{ key, before: null, after: owned }] });
  assert.equal((await f.coordinator.execute({ kind: "cloudRestore", entries: [{ key, before: owned, after: selected }] })).ok, true);
  assert.equal(fixture(f.storage, f.locks).coordinator.validateProtectedRecords().ok, true);
});
test("standalone marker follows verified write; quota failure retains modern main record", () => {
  const f = fixture(), key = "lastmemoVansabaShopState", modern = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["umbraSeraph"] } });
  f.storage.values.set(key, modern); f.storage.writes = 0; f.storage.fail = 1;
  assert.throws(() => f.coordinator.recordProtectedWrite(key, modern), /quota/);
  assert.equal(f.storage.getItem(key), modern); assert.equal(f.storage.getItem(api.keys.compatibility), null);
  f.storage.fail = 0;
  const next = fixture(f.storage, f.locks); assert.equal(next.coordinator.recordProtectedWrite(key, modern), true);
  assert.equal(next.coordinator.validateProtectedRecords().ok, true);
});
test("compatibility stamp is in the recovery prefix of ownership purchase", async () => {
  const f = fixture(), key = "lastmemoVansabaShopState", modern = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["umbraSeraph"] } });
  f.storage.writes = 0; f.storage.fail = 4; // backup, journal, Shop, guard
  assert.equal((await f.coordinator.execute({ kind: "purchase", entries: [{ key, before: null, after: modern }] })).ok, false);
  f.storage.fail = 0;
  const next = fixture(f.storage, f.locks); assert.equal((await next.coordinator.recoverAsync()).ok, true);
  assert.ok(f.storage.getItem(api.keys.compatibility)); assert.equal(next.coordinator.validateProtectedRecords().ok, true);
});
test("read-only write guard refuses a downgrade before the normal storage write", async () => {
  const f = fixture(), key = "lastmemoVansabaShopState", modern = JSON.stringify({ version: 2, playerMechs: { ownedIds: ["umbraSeraph"] } });
  await f.coordinator.execute({ kind: "purchase", entries: [{ key, before: null, after: modern }] });
  const beforeMarker = f.storage.getItem(api.keys.compatibility), count = f.storage.writes;
  assert.throws(() => f.coordinator.validateProtectedWrite(key, JSON.stringify({ playerMechs: { ownedIds: [] } })), /downgrade/);
  assert.equal(f.storage.getItem(key), modern); assert.equal(f.storage.getItem(api.keys.compatibility), beforeMarker); assert.equal(f.storage.writes, count);
});
