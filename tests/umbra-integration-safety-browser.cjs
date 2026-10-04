"use strict";

const fs = require("node:fs"), path = require("node:path");
const h = require("./umbra-integration-browser-harness.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw new Error("Fresh UMBRA_TEST_OUTPUT required");
fs.mkdirSync(out, { recursive: true });
const report = {
  createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
  harnessSha256: h.sha(fs.readFileSync(__filename)), bootstrapHarnessSha256: h.harnessSha256,
  methodology: "Stage A functional startup only. Actual SurvivalScene createState and HUB; no SORTIE or combat. Each case owns a fresh isolated browser context. Before any page script, native Storage data APIs throw without delegation or sentinel writes; window Storage existence probes throw and are recorded separately. External requests and network APIs denied and counted. Product RAM adapter remains independent of test spies. All code served from frozen sourceRoot; protected vendor/media from loopback server. Native Storage zero applies only to this audited process, not persistence correctness. Screenshots and JSON outside any performance measurement. No normal-page authentication or real saves.",
  cases: [], errors: []
};

async function snapshot(page) {
  return page.evaluate(() => {
    const env = window.__UMBRA_INTEGRATION_ENVIRONMENT__, game = window.__SURVIVAL_GAME__;
    const scene = game?.scene?.getScene("survival-scene");
    const descriptor = Object.getOwnPropertyDescriptor(window, "__UMBRA_INTEGRATION_ENVIRONMENT__");
    return {
      url: location.href, marker: document.getElementById("umbra-integration-marker")?.textContent || document.querySelector(".umbra-integration-marker")?.textContent || document.querySelector("aside")?.textContent,
      status: document.getElementById("umbra-integration-status")?.textContent, startDisabled: document.getElementById("umbra-integration-start")?.disabled,
      environment: env?.snapshot?.() || null, environmentFrozen: env ? Object.isFrozen(env) : false,
      descriptor: descriptor ? { writable: descriptor.writable, configurable: descriptor.configurable } : null,
      gameExists: !!game, bootError: window.__UMBRA_INTEGRATION_BOOT_ERROR__ || null,
      firebaseExists: !!window.firebase,
      scene: scene ? { key: scene.sys.settings.key, className: scene.constructor.name, status: scene.sys.settings.status,
        owned: env?.ownsScene?.(scene) || false, sameEnvironment: scene.runEnvironmentIO === env,
        shopActive: scene.shopActive, preGameShopActive: scene.preGameShopActive,
        gameplayRuntimeCreated: scene.gameplayRuntimeCreated, playerExists: !!scene.player,
        pausedWorld: scene.physics?.world?.isPaused, cloudEnabled: scene.cloudSaveState?.enabled,
        mech: scene.runPlayerMechId, stats: scene.stats ? { health: scene.stats.health, maxHealth: scene.stats.maxHealth, dashStaminaMax: scene.stats.dashStaminaMax } : null
      } : null
    };
  });
}

async function ready(page) { await page.waitForFunction(() => document.getElementById("umbra-integration-start")?.disabled === false, { timeout: 30000 }); }
async function start(page) {
  await ready(page);
  await page.locator("#umbra-integration-start").click();
  await page.waitForFunction(() => {
    const env = window.__UMBRA_INTEGRATION_ENVIRONMENT__, game = window.__SURVIVAL_GAME__;
    const scene = game?.scene?.getScene("survival-scene");
    return !!scene && scene.gameplayRuntimeCreated === false && env.snapshot().records.some(r => r.type === "createState");
  }, { timeout: 90000 });
}

async function main() {
  let browser;
  async function run(name, options, fn) {
    const only = process.env.UMBRA_TEST_CASES?.split(",");
    if (only && !only.includes(name)) return;
    const c = { name, checks: [] }; report.cases.push(c);
    const check = (passed, label, actual) => c.checks.push({ passed: !!passed, label, actual: actual ?? null });
    let r;
    try {
      r = await h.open(browser, name, options);
      await fn(r, c, check);
    } catch (e) { c.error = e.stack; check(false, "case completes", e.stack); }
    finally {
      if (r) {
        c.final = await snapshot(r.page).catch(e => ({ error: String(e) }));
        await h.close(r);
        c.context = r.record;
        check(r.record.isolationPassed, "Native Storage data APIs 0; nonvendor probes 0; external/API requests 0", { data: r.record.audit.nativeStorage.length, probes: r.record.audit.storageProbes.length, nonVendorProbes: r.record.nonVendorStorageProbes, networkApis: r.record.audit.networkApis, external: r.record.blockedExternal });
        if (!options.expectedErrors) check(r.record.pageErrors.length === 0, "no uncaught page errors", r.record.pageErrors);
      }
      c.passed = c.checks.length > 0 && c.checks.every(v => v.passed);
      const file = path.join(out, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(c, null, 2), { flag: "wx" });
      console.log(JSON.stringify({ name, passed: c.passed, failed: c.checks.filter(x => !x.passed), file }));
    }
  }
  try {
    browser = await h.launch(); report.browserVersion = browser.version();
    await run("standard-hub-and-end", {}, async (r, c, check) => {
      await ready(r.page); c.beforeStart = await snapshot(r.page);
      check(c.beforeStart.environmentFrozen && !c.beforeStart.descriptor.writable && !c.beforeStart.descriptor.configurable, "bootstrap permit immutable before Game");
      check(!c.beforeStart.gameExists && !c.beforeStart.environment.records.some(v => v.type === "createState"), "before explicit START: Game and createState absent");
      await start(r.page); c.hub = await snapshot(r.page);
      check(c.hub.scene?.className === "SurvivalScene" && c.hub.scene.owned && c.hub.scene.sameEnvironment, "actual owned SurvivalScene");
      check(c.hub.environment.records.filter(v => v.type === "createState").length === 1, "actual createState executes exactly once");
      check(c.hub.scene.gameplayRuntimeCreated === false && !c.hub.scene.playerExists && c.hub.scene.pausedWorld, "HUB before SORTIE: no gameplay body or combat");
      check(Object.values(c.hub.environment.counts.localStorage).reduce((a,b) => a+b,0) > 0, "actual normal loads target RAM storage", c.hub.environment.counts);
      check(!c.hub.firebaseExists, "Firebase SDK not initialized");
      await r.page.screenshot({ path: path.join(out, "standard-hub.png") });
      await r.page.evaluate(() => document.getElementById("umbra-integration-start").dispatchEvent(new MouseEvent("click")));
      c.afterDuplicate = await snapshot(r.page);
      check(c.afterDuplicate.environment.records.filter(v => v.type === "game-created").length === 1 && c.afterDuplicate.environment.records.filter(v => v.type === "createState").length === 1, "duplicate START does not create another Game or Scene");
      await r.page.locator("#umbra-integration-details > summary").click();
      await r.page.locator("#umbra-integration-end").click();
      await r.page.waitForFunction(() => window.__UMBRA_INTEGRATION_ENVIRONMENT__.snapshot().closed, null, { timeout: 15000 });
      c.afterEnd = await snapshot(r.page);
      check(c.afterEnd.environment.closed && c.afterEnd.environment.closing && Object.keys(c.afterEnd.environment.ram.localStorage).length === 0 && Object.keys(c.afterEnd.environment.ram.sessionStorage).length === 0, "explicit session end destroys Game then empties both RAM maps");
      check(c.afterEnd.url === c.hub.url, "session end never navigates automatically to normal URL");
      c.late = await r.page.evaluate(() => {
        const e = window.__UMBRA_INTEGRATION_ENVIRONMENT__; let error = null;
        try { e.localStorage.setItem("test-after-end", "blocked"); } catch (x) { error = String(x.message); }
        document.getElementById("umbra-integration-start").dispatchEvent(new MouseEvent("click"));
        return { error, state: e.snapshot() };
      });
      check(!!c.late.error && c.late.state.records.filter(v => v.type === "game-created").length === 1, "ended callback cannot write RAM or restart Game");
    });
    if (!process.argv.includes("--smoke")) {
      for (const [name, suffix] of [["unknown-fixture", "fixture=unknown"], ["duplicate-fixture", "fixture=standard&fixture=standard"], ["forbidden-query", "fixture=standard&debugCommsStoryReset=1"]]) {
        await run(name, { path: `/umbra-integration.html?${suffix}`, expectedErrors: true }, async (r,c,check) => {
          c.state = await snapshot(r.page);
          check(!c.state.environment && !c.state.gameExists && !!c.state.bootError, "invalid entry fails closed before Game and real IO", c.state);
        });
      }
      await run("bootstrap-missing", { missing: ["umbraIntegrationBootstrap.js"], expectedErrors: true }, async (r,c,check) => {
        c.state = await snapshot(r.page); check(!c.state.environment && !c.state.gameExists && !!c.state.bootError, "missing bootstrap blocks normal fallback", c.state);
      });
      await run("game-code-missing", { missing: ["game.js"], expectedErrors: true }, async (r,c,check) => {
        c.state = await snapshot(r.page); check(!!c.state.environment && !c.state.gameExists && c.state.startDisabled, "missing game code leaves START disabled; no automatic fallback", c.state);
        check(/失敗|拒否|停止|error/i.test(c.state.status || ""), "missing required game code is visibly an error, not indefinite loading", c.state.status);
        await r.page.locator("#umbra-integration-end").click();
        check((await snapshot(r.page)).environment.closed, "unstarted environment can end");
      });
      await run("constructor-startup-failure", { expectedErrors: true }, async (r,c,check) => {
        await ready(r.page);
        await r.page.evaluate(() => { Phaser.Game = class { constructor() { throw Error("TEST_INJECTED_GAME_CONSTRUCTOR_FAILURE"); } }; });
        await r.page.locator("#umbra-integration-start").click(); c.state = await snapshot(r.page);
        check(!c.state.gameExists && c.state.environment.closed && c.state.environment.records.some(v => v.type === "game-start-failed"), "constructor failure closes RAM environment without normal fallback", c.state);
        check(Object.keys(c.state.environment.ram.localStorage).length === 0, "failed startup clears RAM");
      });
      await run("explicit-normal-navigation", { navigationTarget: true }, async (r,c,check) => {
        await ready(r.page); c.before = await snapshot(r.page);
        await r.page.locator("#umbra-integration-normal").click();
        await r.page.waitForURL(h.base + "/");
        c.destination = { url: r.page.url(), title: await r.page.title() };
        check(c.destination.title === "Explicit normal navigation intercepted", "normal navigation occurs only on explicit anchor; destination intentionally inert", c.destination);
        check(r.record.navigationExit?.environment?.closed && r.record.navigationExit.environment.endReason === "EXPLICIT_NORMAL_NAVIGATION", "old environment closes before explicit normal navigation", r.record.navigationExit?.environment);
      });
    }
  } catch (e) { report.errors.push(e.stack); }
  finally {
    await browser?.close();
    report.passed = report.errors.length === 0 && report.cases.length > 0 && report.cases.every(c => c.passed);
    report.nativeStorageScope = "Prototype data methods and length were spied before scripts; window Storage object probes were separately blocked. No real save/sentinel/reload/readback occurred. RAM get/set/remove success is not persistent saving success.";
    const file = path.join(out, "integration-safety.json");
    fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, file, errors: report.errors }));
    process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
module.exports = { snapshot, ready, start };
