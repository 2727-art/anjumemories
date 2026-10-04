"use strict";

// Pure IO routing tests. The fake Storage below is a Map, never browser data.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const baseline = path.resolve(process.env.UMBRA_7B_BASELINE_ROOT
  || path.join(root, ".tmp_umbra_phase7b/2026-09-09-133732-start/baseline"));
const plain = value => JSON.parse(JSON.stringify(value));

function storage(calls, name, fail = false) {
  const data = new Map();
  return {
    data,
    getItem(key) { calls.push([name, "get", key]); return data.get(key) ?? null; },
    setItem(key, value) { calls.push([name, "set", key, String(value)]); if (fail) throw Error("synthetic write failure"); data.set(key, String(value)); },
    removeItem(key) { calls.push([name, "remove", key]); if (fail) throw Error("synthetic removal failure"); data.delete(key); }
  };
}

function harness(sourceRoot = root, { fail = false, integration = false, invalid = false } = {}) {
  const calls = [], native = [], remote = [];
  const ramLocal = storage(calls, "local", fail), ramSession = storage(calls, "session", fail);
  const normalLocal = storage(native, "local", fail), normalSession = storage(native, "session", fail);
  const win = { location: { pathname: integration ? "/umbra-integration.html" : "/", search: "" } };
  const environment = Object.freeze({ version: "umbra-phase7b-v1", mode: "normal-integration", id: "unit-only",
    isValid: () => !invalid, localStorage: ramLocal, sessionStorage: ramSession,
    record: (type, detail) => remote.push([type, detail]), attachScene() {} });
  if (integration) win.__UMBRA_INTEGRATION_ENVIRONMENT__ = environment;
  Object.defineProperties(win, {
    localStorage: { get() { if (integration) { native.push(["local", "unexpected"]); throw Error("real IO forbidden"); } return normalLocal; } },
    sessionStorage: { get() { if (integration) { native.push(["session", "unexpected"]); throw Error("real IO forbidden"); } return normalSession; } }
  });
  const context = vm.createContext({ window: win, console, URLSearchParams,
    Phaser: { Scene: class {}, Math: { Clamp: (v, min, max) => Math.min(max, Math.max(min, v)) } } });
  for (const file of ["skillDefinitions.js", "equipmentDefinitions.js"])
    vm.runInContext(fs.readFileSync(path.join(sourceRoot, file), "utf8"), context, { filename: file });
  const s = fs.readFileSync(path.join(sourceRoot, "game.js"), "utf8");
  const before = s.indexOf("function isCommsStoryDebugResetRequested()");
  const after = s.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const end = s.indexOf("\nconst config =", s.indexOf("class SurvivalScene extends"));
  vm.runInContext(s.slice(0, before) + "\n" + s.slice(after, end)
    + "\nthis.proto = SurvivalScene.prototype;", context, { filename: "game-io-declarations.js" });
  const scene = Object.create(context.proto);
  scene.runEnvironmentIO = integration ? environment : null;
  scene.scheduleCloudSave = (...a) => remote.push(["schedule", ...a]);
  scene.shopState = scene.normalizeShopState({ playerMechs: { ownedIds: ["defaultBear", "regaliaBastion"], selectedId: "regaliaBastion" } });
  scene.optionsState = scene.normalizeOptionsState({});
  scene.finalBossState = scene.normalizeFinalBossState({ cleared: true });
  scene.coins = 12345;
  return { scene, calls, native, remote, context, ramLocal, ramSession, normalLocal, normalSession, win };
}

for (const fail of [false, true]) {
  test("normal IO retains existing serializers except the explicit verified Shop v2 contract; fail=" + fail, () => {
    const before = harness(baseline, { fail }), after = harness(root, { fail });
    const execute = h => {
      const out = [h.scene.loadCoinWallet(), h.scene.persistCoinWalletAmount(23456),
        h.scene.saveOptionsState(), h.scene.saveFinalBossState(),
        h.scene.loadOptionsState(), h.scene.loadFinalBossState()];
      return plain({ out, calls: h.native, remote: h.remote, data: [...h.normalLocal.data] });
    };
    assert.deepEqual(execute(after), execute(before));
    assert.equal(after.scene.saveShopState(), !fail);
    assert.equal(after.remote.filter(row => row[1] === "shopState").length, fail ? 0 : 1);
    if (!fail) {
      const saved = JSON.parse(after.normalLocal.data.get("lastmemoVansabaShopState"));
      assert.equal(saved.version, 2);
      assert.equal(saved.playerMechs.selectedId, "regaliaBastion");
      assert.deepEqual(saved.playerMechs.ownedIds, ["defaultBear", "regaliaBastion"]);
      assert.deepEqual(saved.playerMechs.purchaseReceipts, {});
    }
  });
}

test("integration calls the real normal serializers and readback through RAM, with native IO zero", () => {
  const h = harness(root, { integration: true });
  assert.equal(h.scene.persistCoinWalletAmount(12345), true);
  h.scene.saveShopState();
  h.scene.saveOptionsState();
  h.scene.saveFinalBossState();
  assert.equal(h.scene.loadCoinWallet(), 12345);
  assert.equal(h.scene.loadShopState().playerMechs.selectedId, "regaliaBastion");
  assert.equal(h.scene.loadFinalBossState().cleared, true);
  assert.ok(h.calls.some(row => row[1] === "set"));
  assert.ok(h.calls.some(row => row[1] === "get"));
  assert.equal(h.native.length, 0);
});

test("invalid environment cannot fall through to native Storage even when a legacy catch absorbs the error", () => {
  const h = harness(root, { integration: true, invalid: true });
  assert.throws(() => vm.runInContext('getSurvivalStorage("local")', h.context), /Invalid or ended/);
  h.scene.loadCoinWallet();
  h.scene.saveShopState();
  assert.equal(h.native.length, 0);
  assert.equal(h.calls.length, 0);
});

test("URL alone cannot authorize a test environment", () => {
  const h = harness();
  h.win.location.search = "?umbraIntegration=1";
  assert.throws(() => vm.runInContext('getSurvivalStorage("local")', h.context), /Invalid or ended/);
  assert.equal(h.native.length, 0);
});

test("SDK/auth/cloud/remote ranking are explicitly disabled without contacting a network", async () => {
  const h = harness(root, { integration: true });
  h.scene.initializeCloudSaveRuntime();
  assert.equal(h.scene.cloudSaveState.status, "disabled");
  assert.equal(h.scene.cloudSaveState.blocking, false);
  for (const [method, args] of [
    ["beginCloudSaveBootstrap", []], ["startGoogleCloudLink", []], ["signOutCloudSaveAccount", []],
    ["flushCloudSave", []], ["applyCloudSavePayload", [{}]], ["resolveCloudSaveConflict", ["local"]],
    ["loadRemoteKillRanking", []], ["submitRemoteKillRankingEntry", [{ id: "synthetic" }]]
  ]) assert.equal(await h.scene[method](...args), false, method);
  await assert.rejects(h.scene.getFirebaseLeaderboardClient(), /Network disabled/);
  assert.equal(h.native.length, 0);
  assert.equal(h.calls.length, 0);
  assert.ok(h.remote.filter(row => row[0] === "remoteDisabled").length >= 9);
});
