"use strict";
// The local integration entry accepts debugOpenWorld=0/1 as a map choice only.
// It stays local-only and keeps rejecting every other debug query.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const test = require("node:test"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const entry = "http://127.0.0.1:4173/umbra-integration.html";

// The real bootstrap with minimal element doubles and no native Storage or network.
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
  const window = { location: { href, assign(url) { navigations.push(url); } }, addEventListener() {}, removeEventListener() {} };
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

test("debugOpenWorld=1 starts the local entry and is shown in the settings label", () => {
  const f = controls(`${entry}?fixture=baseline&moonReach=extended&moonGlide=1&novaField=lane&debugOpenWorld=1`);
  assert.ok(f.env);
  assert.deepEqual([f.env.moonReach, f.env.moonGlide, f.env.novaFieldShape], ["extended", true, "lane"]);
  assert.match(f.nodes.get("umbra-integration-reach-label").textContent, /MAP 広域/);
  assert.deepEqual(f.calls, { native: 0, outward: 0 });
});

test("debugOpenWorld=0 or no switch keeps the Tokyo-stage label", () => {
  for (const query of ["fixture=baseline&debugOpenWorld=0", "fixture=baseline"]) {
    const f = controls(`${entry}?${query}`);
    assert.ok(f.env, query);
    assert.doesNotMatch(f.nodes.get("umbra-integration-reach-label").textContent, /MAP/, query);
  }
});

test("malformed switches, other debug queries and non-local entries are still refused", () => {
  for (const href of [
    `${entry}?debugOpenWorld=2`, `${entry}?debugOpenWorld=true`, `${entry}?debugOpenWorld=`,
    `${entry}?debugOpenWorld=1&debugOpenWorld=1`, `${entry}?debugOpenWorld=1&debugStartDepth=10`,
    `${entry}?debugOpenWorld=1&stage=openWorldCity`,
    "https://example.invalid/umbra-integration.html?debugOpenWorld=1", "http://127.0.0.1:4173/?debugOpenWorld=1"
  ]) {
    const f = controls(href);
    assert.equal(f.env, undefined, href);
    assert.match(f.nodes.get("umbra-integration-status").textContent, /起動拒否/, href);
    assert.deepEqual(f.calls, { native: 0, outward: 0 });
  }
});

test("a fixture change keeps the open-world choice and does not add it otherwise", () => {
  const open = controls(`${entry}?fixture=baseline&novaField=lane&debugOpenWorld=1`);
  open.change("umbra-integration-fixture", "relay20");
  const destination = new URL(open.navigations[0]);
  assert.equal(destination.searchParams.get("fixture"), "relay20");
  assert.equal(destination.searchParams.get("debugOpenWorld"), "1");
  assert.equal(destination.searchParams.get("novaField"), "lane");
  const tokyo = controls(`${entry}?fixture=baseline`);
  tokyo.change("umbra-integration-fixture", "medium");
  assert.equal(new URL(tokyo.navigations[0]).searchParams.has("debugOpenWorld"), false);
});
