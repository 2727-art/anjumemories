"use strict";
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const file = path.join(__dirname, "umbra-moon-reach.test.cjs"), mod = new Module(file, module);
mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
const source = fs.readFileSync(file, "utf8");
mod._compile(source.slice(0, source.indexOf('\ntest("')) + "\nmodule.exports={bootstrap,fixture};", file);
const { bootstrap, fixture: reachFixture } = mod.exports;
function fixture(options = {}) {
  const baseFile = path.join(__dirname, "umbra-normal-context.test.cjs"), m = new Module(baseFile, module);
  m.filename = baseFile; m.paths = Module._nodeModulePaths(__dirname);
  const content = fs.readFileSync(baseFile, "utf8");
  m._compile(content.slice(0, content.indexOf('\ntest("')) + "\nmodule.exports=fixture;", baseFile);
  const f = m.exports(), s = f.scene;
  const env = Object.freeze({ ...f.env, ...options, ownsScene: scene => scene === s && s.runEnvironmentIO === env && f.env.isValid() });
  s.runEnvironmentIO = env; s.prepareUmbraNormalRunContext(); f.bind(); f.activate();
  return f;
}
test("trial queries are independent, strict, local-only and off for existing mechs", () => {
  for (const [query, reach, glide, field] of [
    ["moonReach=extended", "extended", false, false], ["moonGlide=1", "current", true, false],
    ["novaField=1", "current", false, true], ["moonReach=extended&moonGlide=1&novaField=1", "extended", true, true],
    ["moonReach=extended&moonReach=wide&moonGlide=1&moonGlide=1&novaField=1&novaField=0", "current", false, false],
    ["moonGlide=true&novaField=yes", "current", false, false],
    ...["standard", "regalia"].map(id => [`fixture=${id}&moonReach=extended&moonGlide=1&novaField=1`, "current", false, false])
  ]) {
    const f = bootstrap(query); assert.ok(f.env); assert.equal(f.env.moonReach, reach, query);
    assert.equal(f.env.moonGlide, glide, query); assert.equal(f.env.novaField, field, query);
    assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
  assert.equal(bootstrap("moonGlide=1&novaField=1", "/").env, undefined);
  assert.equal(bootstrap("moonGlide=1&debug=1").env, undefined);
});
test("2.0 reach changes just passage and exit geometry at every canonical Stage", () => {
  const a = reachFixture(), b = reachFixture("extended"), id = "umbraMoonlight";
  const expected = [120,120,124,128,128,132,136,140];
  const canonical = JSON.stringify(b.scene.playerSkills[id].definition.stages);
  for (let i = 0; i < 8; i++) {
    const p = a.scene.getUmbraMoonlightEffectiveStats(a.scene.playerSkills[id].definition.stages[i]);
    const q = b.scene.getUmbraMoonlightEffectiveStats(b.scene.playerSkills[id].definition.stages[i]);
    assert.equal(q.passageRadius, expected[i]); assert.equal(q.exitRadius, expected[i] + p.leaveMargin);
    delete p.passageRadius; delete p.exitRadius; delete q.passageRadius; delete q.exitRadius;
    assert.deepEqual(JSON.parse(JSON.stringify(p)), JSON.parse(JSON.stringify(q)));
  }
  assert.equal(JSON.stringify(b.scene.playerSkills[id].definition.stages), canonical);
});
test("immutable owner request controls trials and stale/ended/wrong body contexts fail closed", () => {
  const f = fixture({ moonGlide: true, novaField: true, moonReach: "extended" }), s = f.scene, c = s.umbraRunContext;
  assert.equal(c.inputs.moonGlide, true); assert.equal(c.inputs.novaField, true);
  const p = s.getUmbraMobilityTrialSettings();
  assert.deepEqual(JSON.parse(JSON.stringify(p)), { moonGlideMs: 250, novaFieldRadius: 180, novaFieldDurationMs: 3000 });
  assert.ok(Object.isFrozen(p)); assert.throws(() => { c.request.moonGlide = false; }, TypeError);
  assert.throws(() => { c.mobilityTrialSettings = {}; }, TypeError);
  s.shopState.playerMechs.selectedId = "defaultBear";
  assert.equal(s.getUmbraMobilityTrialSettings(), p);
  s.umbraNormalLaunchRequest = { ...c.request }; assert.equal(s.getUmbraMobilityTrialSettings().moonGlideMs, 0);
  s.umbraNormalLaunchRequest = c.request; assert.equal(s.getUmbraMobilityTrialSettings(), p);
  f.invalidate(); assert.equal(s.getUmbraMobilityTrialSettings().novaFieldRadius, 0);
});
test("default and individually enabled profiles do not enable other trial effects", () => {
  for (const [options, values] of [[{}, [0,0]], [{moonGlide:true},[250,0]], [{novaField:true},[0,180]]]) {
    const f = fixture(options), p = f.scene.getUmbraMobilityTrialSettings();
    assert.deepEqual([p.moonGlideMs,p.novaFieldRadius],values);
    assert.equal(f.scene.getUmbraMoonlightReachMultiplier(), 1);
  }
});
test("trial cards disclose glide and field conditions without changing selection callbacks", () => {
  const file = path.join(__dirname, "umbra-player-cards.test.cjs"), m = new Module(file, module);
  m.filename = file; m.paths = Module._nodeModulePaths(__dirname);
  const text = fs.readFileSync(file, "utf8");
  m._compile(text.slice(0, text.indexOf('\ntest("')) + "\nmodule.exports={growth};", file);
  for (const enabled of [false, true]) {
    const f = fixture({ moonGlide: enabled, novaField: enabled }), s = f.scene;
    s.unlockSkill("umbraPhantomNova"); s.levelUpActive = true;
    s.game.canvas = { getBoundingClientRect: () => ({ width: 1280, height: 720 }) };
    for (const id of ["umbraMoonlight", "umbraPhantomNova"]) {
      const row = m.exports.growth(s, id, 0, 1);
      assert.equal(row.model.option.onSelect, row.old.option.onSelect);
      const copy = row.view.detailLines.join("\n");
      if (enabled) assert.match(copy, id === "umbraMoonlight" ? /最大250ms/ : /半径180px.*3秒/);
      else assert.doesNotMatch(copy, /試験設定：/);
    }
  }
});
