"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const sourceRoot = process.env.UMBRA_TEST_SOURCE_ROOT;
if (!sourceRoot) throw new Error("An explicit frozen UMBRA_TEST_SOURCE_ROOT is required");
const base = "http://127.0.0.1:4173";
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const sources = Object.fromEntries(fs.readdirSync(sourceRoot).filter(n => /\.(js|html|css)$/.test(n)).map(n => [n, sha(fs.readFileSync(path.join(sourceRoot, n)))]));

function installAudit() {
  const audit = window.__INTEGRATION_TEST_AUDIT__ = { nativeStorage: [], storageProbes: [], networkApis: [], dialogs: [] };
  const stack = () => String(new Error().stack || "");
  // No sentinel, native get, enumeration, or readback. Every native data API
  // throws before delegating. Vendor existence probes are counted separately.
  for (const operation of ["getItem", "setItem", "removeItem", "clear", "key"]) {
    Object.defineProperty(Storage.prototype, operation, { configurable: true, value(...args) {
      audit.nativeStorage.push({ operation, key: args.length ? String(args[0]) : null, stack: stack() });
      throw new Error("Native Storage data API forbidden by integration audit");
    } });
  }
  Object.defineProperty(Storage.prototype, "length", { configurable: true, get() {
    audit.nativeStorage.push({ operation: "length", stack: stack() });
    throw new Error("Native Storage enumeration forbidden by integration audit");
  } });
  for (const area of ["localStorage", "sessionStorage"]) Object.defineProperty(window, area, { configurable: true, get() {
    audit.storageProbes.push({ area, stack: stack() });
    throw new Error("Storage existence probe: native object unavailable in integration audit");
  } });
  const local = value => { try { const u = new URL(String(value), location.href); return u.origin === "http://127.0.0.1:4173"; } catch { return false; } };
  const originalFetch = window.fetch;
  window.fetch = function(input, options) {
    const url = input instanceof Request ? input.url : String(input);
    if (!local(url)) { audit.networkApis.push({ kind: "fetch", url }); return Promise.reject(new Error("External fetch forbidden")); }
    return originalFetch.call(this, input, options);
  };
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    if (!local(url)) { audit.networkApis.push({ kind: "XHR", method, url: String(url) }); throw new Error("External XHR forbidden"); }
    return originalOpen.call(this, method, url, ...rest);
  };
  for (const name of ["WebSocket", "EventSource"]) if (window[name]) window[name] = class {
    constructor(url) { audit.networkApis.push({ kind: name, url: String(url) }); throw new Error(`${name} forbidden`); }
  };
  navigator.sendBeacon = function(url) { audit.networkApis.push({ kind: "beacon", url: String(url) }); return false; };
  window.open = function(url) { audit.networkApis.push({ kind: "popup", url: String(url) }); return null; };
}

async function launch() {
  return chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER, args: ["--disable-background-networking"] });
}

async function open(browser, name, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
  await context.addInitScript(installAudit);
  if (options.init) await context.addInitScript(options.init);
  const record = { name, sourceRoot, sources, requests: [], blockedExternal: [], servedSources: [], pageErrors: [], consoleErrors: [], requestFailures: [] };
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin !== base) { record.blockedExternal.push(req.url()); return route.abort("blockedbyclient"); }
    const relative = decodeURIComponent(url.pathname).replace(/^\//, "") || "index.html";
    record.requests.push({ path: relative, type: req.resourceType(), method: req.method() });
    if ((options.missing || []).includes(relative)) return route.fulfill({ status: 404, contentType: "text/plain", body: "Intentional missing test source" });
    if (options.navigationTarget && relative === "index.html") {
      return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Explicit normal navigation intercepted</title><p>Inert destination. Normal save/network boot not executed.</p>" });
    }
    const file = path.join(sourceRoot, relative);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const body = fs.readFileSync(file);
      const contentType = relative.endsWith(".js") ? "text/javascript" : relative.endsWith(".css") ? "text/css" : "text/html";
      record.servedSources.push({ path: relative, sha256: sha(body), bytes: body.length });
      return route.fulfill({ status: 200, contentType, body });
    }
    // Frozen application code; only protected vendor/media are read from the
    // local project server. Never request another machine or production URL.
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", e => record.pageErrors.push(e.stack || String(e)));
  page.on("console", msg => { if (msg.type() === "error") record.consoleErrors.push(msg.text()); });
  page.on("requestfailed", r => record.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on("dialog", async d => { record.dialogs ??= []; record.dialogs.push({ type: d.type(), message: d.message() }); await d.dismiss(); });
  await page.goto(`${base}${options.path || "/umbra-integration.html?fixture=standard"}`, { waitUntil: "load", timeout: 90000 });
  if (options.navigationTarget) {
    await page.exposeBinding("__recordIntegrationExit", (_, payload) => { record.navigationExit = payload; });
    await page.evaluate(() => document.getElementById("umbra-integration-normal").addEventListener("click", () => {
      // Registered after the product's END handler. Snapshot is sent before
      // document navigation without evaluating a navigation-blocked context.
      window.__recordIntegrationExit({ audit: structuredClone(window.__INTEGRATION_TEST_AUDIT__), environment: window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot() });
    }));
  }
  return { context, page, record };
}

async function audit(r) {
  const value = await r.page.evaluate(() => structuredClone(window.__INTEGRATION_TEST_AUDIT__));
  r.record.audit = value;
  const audits = [value, r.record.navigationExit?.audit].filter(Boolean);
  r.record.nonVendorStorageProbes = audits.flatMap(v => v.storageProbes).filter(v => !/vendor\/phaser\.min\.js/.test(v.stack));
  r.record.isolationPassed = audits.every(v => v.nativeStorage.length === 0 && v.networkApis.length === 0) && r.record.blockedExternal.length === 0 && r.record.nonVendorStorageProbes.length === 0;
  return r.record;
}

async function close(r) { await audit(r); await r.context.close(); }
module.exports = { root, sourceRoot, base, sources, sha, launch, open, audit, close, harnessSha256: sha(fs.readFileSync(__filename)) };
