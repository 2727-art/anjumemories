"use strict";
// Isolated bootstrap/control and production profile/card checks. These fixtures
// are not browser movement evidence or approval of the provisional lane size.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), plain = value => JSON.parse(JSON.stringify(value));
function fixtureExports(name, expression) {
  const file = path.join(__dirname, name), text = fs.readFileSync(file, "utf8"), mod = new Module(file, module);
  mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(text.slice(0, text.indexOf('\ntest("')) + `\nmodule.exports = ${expression};`, file);
  return mod.exports;
}
const { bootstrap, fixture } = fixtureExports("umbra-mobility-config.test.cjs", "{ bootstrap, fixture }");
const { growth } = fixtureExports("umbra-player-cards.test.cjs", "{ growth }");
const laneOptions = { novaField: true, novaFieldShape: "lane" };
const laneKeys = ["novaFieldShape", "novaFieldForwardLength", "novaFieldRearLength", "novaFieldHalfWidth"];
function assertNoLane(value, label) {
  for (const key of laneKeys) assert.equal(Object.hasOwn(value, key), false, `${label}: ${key} stays absent`);
}

// Real DOM callbacks from the production bootstrap, with minimal element
// doubles. Navigation is observed only after env.end() has discarded its RAM.
function controls(href) {
  const calls = { native: 0, outward: 0 }, navigations = [], nodes = new Map();
  for (const id of ["umbra-integration-fixture", "umbra-integration-field", "umbra-integration-glide",
    "umbra-integration-reach", "umbra-integration-reach-label", "umbra-integration-status"]) {
    const listeners = new Map();
    nodes.set(id, { id, dataset: {}, options: [], value: "", style: {}, textContent: "", listeners,
      append(option) { this.options.push(option); },
      addEventListener(event, handler) { listeners.set(event, handler); },
      removeEventListener(event) { listeners.delete(event); } });
  }
  const window = { location: { href, assign(url) {
    const snapshot = window.__UMBRA_INTEGRATION_ENVIRONMENT__?.snapshot();
    navigations.push({ url, snapshot });
  } }, addEventListener() {}, removeEventListener() {} };
  for (const key of ["localStorage", "sessionStorage"]) Object.defineProperty(window, key,
    { get() { calls.native++; throw Error("native Storage forbidden"); } });
  const document = { getElementById: id => nodes.get(id) || null, createElement: () => ({}),
    documentElement: { style: { setProperty() {} } } };
  const context = vm.createContext({ window, document, URL, console, setTimeout,
    fetch() { calls.outward++; throw Error("outward IO forbidden"); } });
  vm.runInContext(fs.readFileSync(path.join(root, "umbraIntegrationBootstrap.js"), "utf8"), context);
  return { env: window.__UMBRA_INTEGRATION_ENVIRONMENT__, nodes, calls, navigations,
    change(id, value) { const node = nodes.get(id); node.value = value; node.listeners.get("change")({ target: node }); } };
}

test("lane is a strict independent opt-in while circle, OFF and malformed query shapes retain compatibility", () => {
  for (const [query, enabled, lane] of [
    ["novaField=lane", true, true], ["novaField=1", true, false], ["", false, false],
    ["novaField=0", false, false], ["novaField=", false, false], ["novaField=true", false, false],
    ["novaField=LANE", false, false], ["novaField=lane%20", false, false], ["novaField=2", false, false],
    ["novaField=lane&novaField=lane", false, false], ["novaField=lane&novaField=1", false, false],
    ["novaField=1&novaField=lane", false, false], ["novaField=lane&novaField=0", false, false]
  ]) {
    const f = bootstrap(query); assert.ok(f.env, query); assert.ok(Object.isFrozen(f.env));
    assert.equal(f.env.novaField, enabled, query); assert.equal(f.env.snapshot().novaField, enabled, query);
    assert.equal(f.env.moonReach, "current", query); assert.equal(f.env.moonGlide, false, query);
    if (lane) {
      assert.equal(f.env.novaFieldShape, "lane"); assert.equal(f.env.snapshot().novaFieldShape, "lane");
    } else { assertNoLane(f.env, query); assertNoLane(f.env.snapshot(), `${query} snapshot`); }
    assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
  const all = bootstrap("moonReach=extended&moonGlide=1&novaField=lane");
  assert.deepEqual([all.env.moonReach, all.env.moonGlide, all.env.novaField, all.env.novaFieldShape], ["extended", true, true, "lane"]);
  const malformed = bootstrap("moonReach=extended&moonGlide=1&novaField=lane&novaField=1");
  assert.deepEqual([malformed.env.moonReach, malformed.env.moonGlide, malformed.env.novaField], ["extended", true, false]);
});

test("lane remains unavailable to existing mechs, ordinary routes and non-local entries", () => {
  for (const id of ["standard", "regalia"]) {
    const f = bootstrap(`fixture=${id}&moonReach=extended&moonGlide=1&novaField=lane`);
    assert.ok(f.env); assert.equal(f.env.novaField, false); assertNoLane(f.env, id);
    assert.equal(f.env.moonGlide, false); assert.equal(f.env.moonReach, "current");
    assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
  for (const href of [
    "http://127.0.0.1:4173/?novaField=lane", "http://127.0.0.1:4173/index.html?novaField=lane",
    "https://example.invalid/umbra-integration.html?novaField=lane",
    "http://127.0.0.1:4173/umbra-integration.html?novaField=lane&startDepth=20"
  ]) {
    const f = controls(href); assert.equal(f.env, undefined, href); assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
});

test("the immutable run owner carries the provisional lane geometry without reading HUB or mutable URL state", () => {
  const f = fixture({ ...laneOptions, moonGlide: true }), s = f.scene, c = s.umbraRunContext;
  for (const input of [c.request, c.inputs]) {
    assert.ok(Object.isFrozen(input)); assert.equal(input.novaField, true); assert.equal(input.novaFieldShape, "lane");
    assert.throws(() => { input.novaFieldShape = "circle"; }, TypeError);
  }
  const settings = s.getUmbraMobilityTrialSettings();
  assert.deepEqual(plain(settings), { moonGlideMs: 250, novaFieldRadius: 180, novaFieldDurationMs: 2000,
    novaFieldShape: "lane", novaFieldForwardLength: 1800, novaFieldRearLength: 120, novaFieldHalfWidth: 120 });
  assert.ok(Object.isFrozen(settings)); assert.throws(() => { settings.novaFieldForwardLength = Infinity; }, TypeError);
  assert.throws(() => { c.mobilityTrialSettings = {}; }, TypeError);
  s.shopState.playerMechs.selectedId = "defaultBear"; s.getUrlStageParam = () => "0";
  assert.equal(s.getUmbraMobilityTrialSettings(), settings);
  s.umbraNormalLaunchRequest = { ...c.request }; assertNoLane(s.getUmbraMobilityTrialSettings(), "stale launch");
  assert.equal(s.getUmbraMobilityTrialSettings().novaFieldDurationMs, 0);
  s.umbraNormalLaunchRequest = c.request; assert.equal(s.getUmbraMobilityTrialSettings(), settings);
  f.invalidate(); assertNoLane(s.getUmbraMobilityTrialSettings(), "ended owner");
  assert.equal(s.getUmbraMobilityTrialSettings().novaFieldRadius, 0);
});

test("circle and OFF run inputs stay free of lane metadata, including invalid synthetic shape flags", () => {
  for (const options of [{}, { novaField: true }, { novaField: false, novaFieldShape: "lane" },
    { novaField: true, novaFieldShape: "LANE" }, { novaField: true, novaFieldShape: "invalid" }]) {
    const f = fixture(options), c = f.scene.umbraRunContext, settings = f.scene.getUmbraMobilityTrialSettings();
    assertNoLane(c.request, "request"); assertNoLane(c.inputs, "inputs"); assertNoLane(settings, "settings");
    assert.deepEqual(plain(settings), { moonGlideMs: 0, novaFieldRadius: options.novaField ? 180 : 0,
      novaFieldDurationMs: options.novaField ? 3000 : 0 });
  }
});

test("lane geometry changes no canonical Stage profile or NOVA discharge/range/regeneration values", () => {
  const circle = fixture({ novaField: true }), lane = fixture(laneOptions);
  for (const f of [circle, lane]) { f.scene.unlockSkill("umbraBloodSpike"); f.scene.unlockSkill("umbraPhantomNova"); }
  for (const [id, getter] of [["umbraMoonlight", "getUmbraMoonlightEffectiveStats"],
    ["umbraBloodSpike", "getUmbraBloodSpikeEffectiveStats"], ["umbraPhantomNova", "getUmbraPhantomNovaEffectiveStats"]]) {
    const canonical = plain(lane.scene.playerSkills[id].definition.stages);
    for (let index = 0; index < 8; index++) {
      const a = circle.scene[getter](circle.scene.playerSkills[id].definition.stages[index]);
      const b = lane.scene[getter](lane.scene.playerSkills[id].definition.stages[index]);
      assert.deepEqual(plain(a), plain(b), `${id} S${index + 1}`);
    }
    assert.deepEqual(plain(lane.scene.playerSkills[id].definition.stages), canonical);
  }
});

test("the three field choices destroy the current RAM session before navigating and preserve independent switches", () => {
  const html = fs.readFileSync(path.join(root, "umbra-integration.html"), "utf8");
  const select = html.match(/<select\b[^>]*id="umbra-integration-field"[^>]*>([\s\S]*?)<\/select>/);
  assert.ok(select); assert.deepEqual([...select[1].matchAll(/<option\b[^>]*value="([^"]+)"/g)].map(match => match[1]), ["0", "1", "lane"]);
  assert.match(select[1], /辻斬り/);
  for (const next of ["0", "1", "lane"]) {
    const f = controls("http://127.0.0.1:4173/umbra-integration.html?fixture=relay20&moonReach=extended&moonGlide=1&novaField=lane");
    assert.equal(f.nodes.get("umbra-integration-field").value, "lane");
    f.env.localStorage.setItem("lastmemoVansabaCoins", "7");
    f.change("umbra-integration-field", next);
    assert.equal(f.navigations.length, 1); const navigation = f.navigations[0], destination = new URL(navigation.url);
    assert.equal(navigation.snapshot.closed, true); assert.deepEqual(plain(navigation.snapshot.ram), { localStorage: {}, sessionStorage: {} });
    assert.equal(destination.searchParams.get("novaField"), next);
    assert.equal(destination.searchParams.get("fixture"), "relay20");
    assert.equal(destination.searchParams.get("moonReach"), "extended"); assert.equal(destination.searchParams.get("moonGlide"), "1");
    assert.equal(f.env.novaFieldShape, "lane"); assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
  const f = controls("http://127.0.0.1:4173/umbra-integration.html?fixture=baseline&novaField=lane");
  f.change("umbra-integration-fixture", "complete");
  assert.equal(new URL(f.navigations[0].url).searchParams.get("novaField"), "lane");
  assert.equal(f.navigations[0].snapshot.closed, true);
});

test("NOVA card explains fixed-direction tsujigiri protection separately from discharge and keeps its real selection callback", () => {
  const f = fixture(laneOptions), s = f.scene; s.unlockSkill("umbraPhantomNova"); s.levelUpActive = true;
  s.game.canvas = { getBoundingClientRect: () => ({ width: 1280, height: 720 }) };
  const row = growth(s, "umbraPhantomNova", 0, 1), copy = row.view.detailLines.join("\n");
  assert.equal(row.model.option.onSelect, row.old.option.onSelect);
  assert.match(`${row.view.summary}\n${copy}`, /辻斬り/); assert.match(copy, /方向[^\n]*固定|固定[^\n]*方向/);
  assert.match(copy, /辻斬り[^\n]*2秒/); assert.match(copy, /前方1800px／後方120px／幅240px/); assert.match(copy, /放電/);
  assert.doesNotMatch(copy, /半径180pxにアルティメットフィールド/);
  const circle = fixture({ novaField: true }); circle.scene.unlockSkill("umbraPhantomNova"); circle.scene.levelUpActive = true;
  circle.scene.game.canvas = s.game.canvas;
  const oldCopy = growth(circle.scene, "umbraPhantomNova", 0, 1).view.detailLines.join("\n");
  assert.match(oldCopy, /半径180px.*3秒/); assert.doesNotMatch(oldCopy, /辻斬り/);
});
