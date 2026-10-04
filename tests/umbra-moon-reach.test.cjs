"use strict";
// Bounded numerical profiles and real receiver geometry; not deep-play safety evidence.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), M = "umbraMoonlight";
const plain = v => JSON.parse(JSON.stringify(v));
function fixture(reach = "current") {
  const name = path.join(__dirname, "umbra-normal-context.test.cjs"), text = fs.readFileSync(name, "utf8");
  const mod = new Module(name, module); mod.filename = name; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(text.slice(0, text.indexOf('\ntest("')) + "\nmodule.exports = fixture;", name);
  const f = mod.exports(), s = f.scene;
  const env = Object.freeze({ ...f.env, moonReach: reach,
    ownsScene: scene => scene === s && s.runEnvironmentIO === env && f.env.isValid() });
  s.runEnvironmentIO = env; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  return f;
}
function bootstrap(query, entry = "/umbra-integration.html") {
  const calls = { native: 0, outward: 0 };
  const location = { href: `http://127.0.0.1:4173${entry}?${query}` };
  const window = { location, addEventListener() {}, removeEventListener() {} };
  for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(window, key, { get() { calls.native++; throw Error("native IO forbidden"); } });
  const document = { getElementById: () => null, documentElement: { style: { setProperty() {} } } };
  const context = vm.createContext({ window, document, URL, console, setTimeout,
    fetch() { calls.outward++; throw Error("outward IO forbidden"); } });
  vm.runInContext(fs.readFileSync(path.join(root, "umbraIntegrationBootstrap.js"), "utf8"), context);
  return { env: window.__UMBRA_INTEGRATION_ENVIRONMENT__, calls };
}
test("dedicated query defaults, rejects unrelated unsafe queries and never enables wide for older mechs", () => {
  for (const [q, expected] of [["", "current"], ["moonReach=current", "current"], ["moonReach=wide", "wide"],
    ["moonReach=invalid", "current"], ["moonReach=", "current"], ["moonReach=wide&moonReach=wide", "current"],
    ["fixture=standard&moonReach=wide", "current"], ["fixture=regalia&moonReach=wide", "current"]]) {
    const f = bootstrap(q); assert.equal(f.env.moonReach, expected, q); assert.ok(Object.isFrozen(f.env));
    assert.equal(f.env.snapshot().moonReach, expected); assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
  assert.equal(bootstrap("moonReach=wide", "/").env, undefined);
  assert.equal(bootstrap("moonReach=wide&debugCommsStoryReset=1").env, undefined);
});
test("wide changes only the eight main/exit radii once; canonical Stages and S1 identity remain unchanged", () => {
  const current = fixture(), wide = fixture("wide"), expected = [60,60,62,64,64,66,68,70];
  const defs = wide.scene.playerSkills[M].definition, canonical = plain(defs.stages);
  assert.equal(defs.stages[0], defs.verificationStage1);
  for (let i = 0; i < 8; i++) {
    const a = current.scene.getUmbraMoonlightEffectiveStats(current.scene.playerSkills[M].definition.stages[i]);
    const b = wide.scene.getUmbraMoonlightEffectiveStats(defs.stages[i]);
    assert.equal(a.passageRadius, expected[i]); assert.equal(b.passageRadius, expected[i] * 1.5);
    assert.equal(b.exitRadius, b.passageRadius + b.leaveMargin); assert.equal(b.leaveMargin, a.leaveMargin);
    delete a.passageRadius; delete a.exitRadius; delete b.passageRadius; delete b.exitRadius;
    assert.deepEqual(plain(a), plain(b));
  }
  for (let n = 0; n < 20; n++) assert.equal(wide.scene.getUmbraMoonlightEffectiveStats().passageRadius, 90);
  assert.deepEqual(plain(defs.stages), canonical);
});
test("reach is fixed in the launch request, fails closed for stale Context and cannot use HUB/query state", () => {
  const f = fixture("wide"), s = f.scene, context = s.umbraRunContext;
  assert.ok(Object.isFrozen(context.request)); assert.equal(context.inputs.moonReach, "wide");
  assert.throws(() => { context.request.moonReach = "current"; }, TypeError);
  s.shopState.playerMechs.selectedId = "defaultBear"; s.getUrlStageParam = () => "current";
  assert.equal(s.getUmbraMoonlightReachMultiplier(), 1.5);
  s.umbraNormalLaunchRequest = { ...context.request }; assert.equal(s.getUmbraMoonlightReachMultiplier(), 1);
  s.umbraNormalLaunchRequest = context.request; assert.equal(s.getUmbraMoonlightReachMultiplier(), 1.5);
  f.invalidate(); assert.equal(s.getUmbraMoonlightReachMultiplier(), 1);
});
test("REACTOR retains margin8 and timing while only main radius widens", () => {
  const profiles = [];
  for (const reach of ["current", "wide"]) {
    const f = fixture(reach), s = f.scene;
    for (let n = 0; n < 3; n++) s.upgradeSkill(M);
    const profile = s.getUmbraMoonlightEffectiveStats(undefined, "reactor");
    assert.equal(profile.coreProfile.coreId, "reactor");
    assert.equal(profile.leaveMargin, 8); assert.equal(profile.exitRadius, profile.passageRadius + 8);
    assert.equal(profile.passageRadius, reach === "wide" ? 96 : 64); profiles.push(profile);
  }
  for (const p of profiles) { delete p.passageRadius; delete p.exitRadius; }
  assert.deepEqual(plain(profiles[0]), plain(profiles[1]));
});
test("wide broad phase and exact sweep hit an outer target current excludes; remaining inside is not an aura", () => {
  for (const reach of ["current", "wide"]) {
    const f = fixture(reach); f.add(0, 85); f.step(0);
    assert.equal(f.count(), reach === "wide" ? 1 : 0);
    for (let n = 0; n < 8; n++) f.step(n * 0.01, 0, { dt: 1000 });
    assert.equal(f.count(), reach === "wide" ? 1 : 0); f.assertClean();
  }
});
test("wide retains trusted exit, cooldown, rebase life/cursor and excluded paths", () => {
  const f = fixture("wide"), s = f.scene, enemy = f.add(0, 0); f.step(0);
  const record = s.umbraMoonlightRuntime.targets.get(enemy), last = record.lastHitAt, cursor = record.cursor;
  s.upgradeSkill(M); s.upgradeSkill(M); // S3 grows 90 -> 93, using the production Stage path.
  assert.equal(record.lastHitAt, last); assert.equal(record.cursor, cursor); assert.equal(record.radiusRebasePending, true);
  assert.equal(record.initialEligible, false); assert.equal(f.count(), 1);
  f.step(1, 0, { dt: 1000 }); assert.equal(f.count(), 1);
  f.step(200, 0, { valid: false, reason: "UNKNOWN_CORRECTION" }); assert.equal(record.radiusRebasePending, true);
  f.step(201, 0, { valid: false, reason: "NORMAL" }); assert.equal(record.radiusRebasePending, false);
  f.step(0); assert.equal(f.count(), 2);
  f.step(200, 0, { dt: 1 }); f.step(0, 0, { dt: 1 }); assert.equal(f.count(), 2);
  assert.ok(s.getUmbraMoonlightSnapshot().skips.REHIT_WAIT); f.assertClean();
});
test("wide retains wall LOS rejection and normal/glide/brake entry exclusions", () => {
  for (const reason of ["NORMAL", "POST_BOOST_GLIDE", "AIR_BRAKE", "WALL_CHORD_UNVERIFIED", "POSITION_DISCONTINUITY"]) {
    const f = fixture("wide"); f.add(0, 85); f.step(0, 0, { valid: false, reason }); assert.equal(f.count(), 0, reason);
  }
  const f = fixture("wide"); f.add(0, 85);
  f.scene.isUmbraMoonlightLineBlocked = () => true; // Isolated rejection branch; real walls are exercised in browser trials.
  f.step(0); assert.equal(f.count(), 0); assert.ok(f.scene.getUmbraMoonlightSnapshot().skips.WALL_OCCLUDED);
});
