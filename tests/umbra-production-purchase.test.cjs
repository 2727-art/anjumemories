"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const SHOP = "lastmemoVansabaShopState", COINS = "lastmemoVansabaCoins", RAID = "lastmemoVansabaFinalBossState";
function fixture(options = {}) {
  const data = new Map(Object.entries({ [COINS]: "20000000", [RAID]: JSON.stringify({ cleared: true }),
    lastmemoVansabaProfileCompatibility: JSON.stringify({ version:1, profileId:"synthetic-profile",epoch:1,ownerId:"local",createdAt:1 }), ...options.data }));
  const writes = [];
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i] || null,
    getItem: key => data.get(key) ?? null, setItem(key, value) {
      if (options.fail?.(key, value)) throw new Error("simulated-quota");
      data.set(key, String(value)); writes.push([key, String(value)]);
    }, removeItem(key) { if (options.fail?.(key, null)) throw new Error("simulated-quota"); data.delete(key); writes.push([key, null]); } };
  let tail = Promise.resolve();
  const locks = { request(_name, _options, action) { const next = tail.then(action); tail = next.catch(() => {}); return next; } };
  const window = { localStorage: storage, sessionStorage: storage, navigator: { locks }, location: { search: "", pathname: "/" },
    addEventListener() {}, removeEventListener() {} };
  const context = vm.createContext({ window, console, URLSearchParams, Phaser: { Scene: class {}, Math: { Clamp: (x,a,b) => Math.min(b, Math.max(a,x)) } } });
  vm.runInContext(fs.readFileSync(path.join(root,"skillDefinitions.js"),"utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root,"umbraPersistence.js"),"utf8"), context);
  vm.runInContext(game.slice(0,game.indexOf("function isCommsStoryDebugResetRequested()")) + game.slice(game.indexOf("class SurvivalScene extends"),game.indexOf("\nconst config =")) + "\nthis.Scene = SurvivalScene;",context);
  const scene = Object.create(context.Scene.prototype);
  scene.events = { once() {} };
  scene.scheduleCloudSave = () => {};
  scene.refreshPersistentWalletHud = () => {};
  scene.shopActive = true;
  scene.initializeUmbraPersistence();
  scene.shopState = scene.loadShopState();
  scene.coins = scene.loadCoinWallet();
  return { scene, storage, data, writes, window };
}
test("normal UMBRA purchase charges durable GEEK once and reloads selected ownership and receipt", async () => {
  const f = fixture();
  assert.equal(await f.scene.purchasePlayerMech("umbraSeraph"),true);
  assert.equal(f.storage.getItem(COINS),"10000000");
  const saved = JSON.parse(f.storage.getItem(SHOP));
  assert.equal(saved.version,2);
  assert.equal(saved.playerMechs.selectedId,"umbraSeraph");
  assert.ok(saved.playerMechs.purchaseReceipts.umbraSeraph.transactionId);
  const reload = fixture({data: Object.fromEntries(f.data)});
  assert.equal(reload.scene.getSelectedPlayerMechId(),"umbraSeraph");
  assert.equal(await reload.scene.purchasePlayerMech("umbraSeraph"),true);
  assert.equal(reload.storage.getItem(COINS),"10000000");
});
test("concurrent purchase and insufficient or absent durable raid clear cannot charge", async () => {
  const f = fixture();
  const results = await Promise.all([f.scene.purchasePlayerMech("umbraSeraph"),f.scene.purchasePlayerMech("umbraSeraph")]);
  assert.equal(results.filter(Boolean).length,1);
  assert.equal(f.storage.getItem(COINS),"10000000");
  for (const data of [{[RAID]: "{}"}, {[COINS]:"9999999"}]) {
    const blocked = fixture({data});
    blocked.scene.finalBossState = {cleared:true};
    blocked.scene.isDebugPlayerMechUnlockEnabled = () => true;
    assert.equal(await blocked.scene.purchasePlayerMech("umbraSeraph"),false);
    assert.equal(blocked.storage.getItem(SHOP),null);
    assert.equal(blocked.storage.getItem(COINS),data[COINS] || "20000000");
  }
});
test("wallet-first interruption holds all progression and recovery grants without a second charge", async () => {
  let fail = true;
  const f = fixture({fail: key => fail && key === SHOP});
  assert.equal(await f.scene.purchasePlayerMech("umbraSeraph"),false);
  assert.equal(f.storage.getItem(COINS),"10000000");
  assert.equal(f.scene.isPlayerMechOwned("umbraSeraph"),false);
  assert.equal(f.scene.isProgressionWriteBlocked(),true);
  assert.equal(f.scene.spendCoins(1),false);
  fail = false;
  const coordinator = f.window.umbraPersistence.create({storage:f.storage,locks:f.window.navigator.locks});
  coordinator.initialize();
  const result = await coordinator.recoverAsync();
  assert.equal(result.ok,true);
  assert.equal(f.storage.getItem(COINS),"10000000");
  assert.ok(JSON.parse(f.storage.getItem(SHOP)).playerMechs.ownedIds.includes("umbraSeraph"));
});
test("damaged and future records are held byte-for-byte instead of overwritten", () => {
  for (const raw of ["{broken", JSON.stringify({version:99, sentinel:"keep"})]) {
    const f = fixture({data:{[SHOP]:raw}});
    assert.equal(f.scene.isProgressionWriteBlocked(),true);
    assert.equal(f.scene.saveShopState(),false);
    assert.equal(f.storage.getItem(SHOP),raw);
  }
});
test("recognized ownership survives a release gate and unknown IDs remain opaque", () => {
  const f = fixture({data:{[SHOP]:JSON.stringify({playerMechs:{ownedIds:["defaultBear","umbraSeraph","futureMech"],selectedId:"umbraSeraph"}, future:{keep:true}})}});
  f.scene.getReleasedPlayerMechIds = () => ["defaultBear","regaliaBastion"];
  const normalized = f.scene.normalizeShopState(f.scene.shopState);
  assert.ok(normalized.playerMechs.ownedIds.includes("umbraSeraph"));
  assert.ok(normalized.playerMechs.ownedIds.includes("futureMech"));
  assert.equal(normalized.future.keep,true);
  assert.equal(f.scene.isPlayerMechReleased("futureMech"),false);
});
test("legacy Archive arrays remain readable without placing valid old users on hold", () => {
  const f = fixture({data:{lastmemoVansabaRunArchive:"[]"}});
  assert.equal(f.scene.isProgressionWriteBlocked(),false);
  assert.equal(f.scene.loadRunArchive().entries.length,0);
});
test("external storage change prevents stale purchases and selections", async () => {
  const f = fixture();
  f.storage.setItem(COINS,"21000000");
  assert.equal(await f.scene.purchasePlayerMech("umbraSeraph"),false);
  assert.equal(f.storage.getItem(COINS),"21000000");
  f.storage.setItem(SHOP,JSON.stringify({sentinel:"other-tab"}));
  assert.equal(f.scene.saveShopState(),false);
  assert.equal(JSON.parse(f.storage.getItem(SHOP)).sentinel,"other-tab");
});
test("selection changes RAM only after durable success", () => {
  const raw = JSON.stringify({playerMechs:{ownedIds:["defaultBear","umbraSeraph"],selectedId:"defaultBear"}});
  const f = fixture({data:{[SHOP]:raw},fail:key => key === SHOP});
  assert.equal(f.scene.selectPlayerMech("umbraSeraph"),false);
  assert.equal(f.scene.getSelectedPlayerMechId(),"defaultBear");
  assert.equal(f.storage.getItem(SHOP),raw);
});
