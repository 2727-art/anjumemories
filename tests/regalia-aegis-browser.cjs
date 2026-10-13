"use strict";
// Browser check for REGALIA's own skills, Aegis Wall (R2) and Counter Pulse (R3)
// (docs/regalia-kit-design.md 12-13).
//
//   python -m http.server 4173 --bind 127.0.0.1        (another terminal, repository root)
//   node tests/regalia-aegis-browser.cjs
//
// Fresh browser profile; requests to other origins are blocked, so no save data, auth or ranking
// traffic is touched. REGALIA and the new skill are selected with debug flags only. XP gain is
// switched off inside the page so level-up cards do not cover the screenshots.
// Uses playwright-core and a local Chrome (OW_CHROME / REGALIA_TEST_URL override).
// Writes screenshots and report.json to .tmp_regalia_kit/ (git-ignored).

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("playwright-core");

const BASE_URL = process.env.REGALIA_TEST_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.OW_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.join(__dirname, "..", ".tmp_regalia_kit");
const NORMAL_QUERY = [
  "mobileGate=0", "mobileControls=0", "debugSkipOpeningBoost=1",
  "debugOpenWorld=1", "debugOpenWorldSeed=pilot",
  "debugPlayerMech=regaliaBastion", "debugPlayerMechUnlock=1"
].join("&");
const QUERY = `${NORMAL_QUERY}&debugRegaliaKit=1`;
const SORTIE_BUTTON = { x: 1015, y: 660 };

async function snapshot(page, file) {
  const src = await page.evaluate(() => new Promise((resolve) => {
    window.__SURVIVAL_GAME__.scene.getScene("survival-scene").commsState?.container?.setVisible(false);
    window.__SURVIVAL_GAME__.renderer.snapshot((image) => resolve(image.src));
  }));
  fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(src.split(",")[1], "base64"));
}

function sceneState(page) {
  return page.evaluate(() => {
    const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    const state = scene.regaliaAegisWallState;
    const center = scene.playerHitbox;
    const shields = state?.shields || [];
    const radius = shields[0] ? Math.hypot(shields[0].x - shields[0].centerX, shields[0].y - shields[0].centerY) : 0;
    const enemies = scene.enemies.getChildren().filter((enemy) => enemy.active && !enemy.isDying);
    return {
      slots: scene.getPlayerSkillSlotIds(),
      skills: Object.keys(scene.playerSkills || {}),
      aegisStage: scene.playerSkills?.regaliaAegisWall?.currentStage?.stage || 0,
      shields: shields.length,
      bodies: scene.regaliaAegisBodies?.getChildren?.().length || 0,
      territory: Boolean(state?.territory?.active),
      shieldVisual: shields[0]?.sprite?.type || "",
      radius: Math.round(radius),
      durability: shields.map((shield) => Math.round(shield.durability * 10) / 10),
      maxDurability: shields[0]?.maxDurability || 0,
      enemiesNearRing: shields.length ? enemies.filter((enemy) => {
        const distance = Math.hypot(enemy.x - shields[0].centerX, enemy.y - shields[0].centerY);
        return Math.abs(distance - radius) < 60;
      }).length : 0,
      enemies: enemies.length,
      hudChips: scene.getCompactHudSkillChipModels?.().map((chip) => chip.text) || [],
      player: center ? { x: Math.round(center.x), y: Math.round(center.y) } : null
    };
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const report = { url: `${BASE_URL}?${QUERY}`, steps: [], pageErrors: [], consoleErrors: [], blockedExternal: [], requests: [] };
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ["--disable-background-networking", "--autoplay-policy=no-user-gesture-required"] });
  const startRun = async (query) => {
    const context = await browser.newContext({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1, serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const url = route.request().url();
      if (new URL(url).origin !== new URL(BASE_URL).origin) {
        report.blockedExternal.push(url);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => requests.push(decodeURIComponent(request.url())));
    page.on("pageerror", (error) => report.pageErrors.push(String(error)));
    page.on("console", (message) => { if (message.type() === "error") report.consoleErrors.push(message.text()); });
    await page.goto(`${BASE_URL}?${query}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene?.("survival-scene")?.shopActive, null, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const box = await (await page.$("#game-root canvas")).boundingBox();
    await page.mouse.click(box.x + (SORTIE_BUTTON.x * box.width) / 1280, box.y + (SORTIE_BUTTON.y * box.height) / 720);
    await page.waitForFunction(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return Boolean(scene && !scene.shopActive && scene.playerHitbox?.active);
    }, null, { timeout: 90000 });
    await page.evaluate(() => {
      window.__SURVIVAL_GAME__.scene.getScene("survival-scene").gainExperience = () => {};
    });
    return { context, page, requests };
  };
  try {
    // Normal play: no debug flag, REGALIA keeps its slots and never fetches the shield images.
    const normal = await startRun(NORMAL_QUERY);
    await normal.page.waitForTimeout(1500);
    const normalState = await sceneState(normal.page);
    report.steps.push({ step: "normal REGALIA run", slots: normalState.slots, hudChips: normalState.hudChips });
    assert.deepEqual(normalState.slots, ["regaliaBastionCannon", "tornadoSkill", "rabbitThunderSkill"]);
    assert.equal(normal.requests.some((url) => /regalia_(aegis_wall|counter_pulse)/.test(url)), false, "no REGALIA kit images in normal play");
    await normal.context.close();

    const { context, page, requests } = await startRun(QUERY);
    const start = await sceneState(page);
    report.steps.push({ step: "run started", ...start });
    assert.deepEqual(start.slots, ["regaliaBastionCannon", "regaliaAegisWall", "regaliaCounterPulse"]);
    assert.ok(start.hudChips.includes("AGS --"), `HUD chips: ${start.hudChips}`);

    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").unlockSkill("regaliaAegisWall"));
    await page.waitForTimeout(600);
    const s1 = await sceneState(page);
    report.steps.push({ step: "S1 deployed", ...s1 });
    assert.equal(s1.aegisStage, 1);
    assert.equal(s1.shields, 4);
    assert.equal(s1.bodies, 12);
    assert.equal(s1.radius, 200);
    assert.equal(s1.territory, true);
    assert.equal(s1.shieldVisual, "Image", "the R1 shield image is ready for the first ring");
    report.requests = requests.filter((url) => /regalia_(aegis_wall|counter_pulse)/.test(url));
    await snapshot(page, "s1-deployed.png");

    await page.waitForTimeout(3500);
    const s1Later = await sceneState(page);
    report.steps.push({ step: "S1 after 4 s", ...s1Later });
    await snapshot(page, "s1-after-4s.png");

    await page.waitForTimeout(2000); // lifetime 5 s, cooldown 7 s: the ring has sunk
    const s1Gone = await sceneState(page);
    report.steps.push({ step: "S1 after 6 s", ...s1Gone });
    assert.equal(s1Gone.shields, 0);
    assert.equal(s1Gone.bodies, 0);

    await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      for (let index = 0; index < 7; index += 1) scene.upgradeSkill("regaliaAegisWall");
      scene.playerSkills.regaliaAegisWall.regaliaAegisCooldownMs = 0;
    });
    await page.waitForTimeout(1500);
    const s8 = await sceneState(page);
    report.steps.push({ step: "S8 deployed", ...s8 });
    assert.equal(s8.aegisStage, 8);
    assert.equal(s8.shields, 10);
    assert.equal(s8.bodies, 30);
    assert.equal(s8.radius, 300);
    await snapshot(page, "s8-deployed.png");

    await page.waitForTimeout(3500);
    const s8Later = await sceneState(page);
    report.steps.push({ step: "S8 after 5 s", ...s8Later });
    await snapshot(page, "s8-after-5s.png");

    // Counter Pulse (R3): owned at S8, then a hit through the real damage path fires a counter wave.
    const pulse = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      scene.unlockSkill("regaliaCounterPulse");
      for (let index = 0; index < 7; index += 1) scene.upgradeSkill("regaliaCounterPulse");
      const state = scene.playerSkills.regaliaCounterPulse;
      scene.invincibleUntil = 0;
      const before = scene.stats.hp;
      const accepted = scene.applyDamageToPlayer(5, { source: "regaliaKitBrowserCheck" });
      return {
        stage: state?.currentStage?.stage || 0,
        accepted,
        hpLost: before - scene.stats.hp,
        counterFired: (state?.regaliaPulseCounterReadyAt || 0) > scene.time.now,
        timerMs: Math.round(state?.regaliaPulseTimerMs || 0),
        echoes: scene.regaliaCounterPulseState?.echoes?.length || 0,
        rings: scene.regaliaPulseFxObjects?.size || 0,
        ringImage: scene.textures.exists("regalia-counter-pulse-r1"),
        hudChips: scene.getCompactHudSkillChipModels().map((chip) => chip.text)
      };
    });
    report.steps.push({ step: "Counter Pulse S8 hit", ...pulse });
    assert.equal(pulse.stage, 8);
    assert.equal(pulse.accepted, true);
    assert.equal(pulse.counterFired, true);
    assert.equal(pulse.timerMs, 1800, "the counter restarts the automatic timer");
    assert.equal(pulse.echoes, 1, "S8 queues the half-damage echo");
    assert.ok(pulse.rings >= 1);
    assert.equal(pulse.ringImage, true, "the R1 pulse image is loaded for this sortie");
    assert.ok(pulse.hudChips.includes("PLS S8"), `HUD chips: ${pulse.hudChips}`);
    await page.waitForTimeout(90);
    await snapshot(page, "s8-counter-wave.png");
    await page.waitForTimeout(2500);
    const afterWaves = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return { echoes: scene.regaliaCounterPulseState?.echoes?.length || 0, kills: scene.killCount ?? null };
    });
    report.steps.push({ step: "Counter Pulse after 2.5 s", ...afterWaves });
    assert.equal(afterWaves.echoes <= 1, true);

    // On PC the shop return reloads the page, so the run-end cleanup is checked on game over.
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").triggerGameOver({}));
    await page.waitForTimeout(800);
    const afterGameOver = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      return {
        shields: scene.regaliaAegisWallState?.shields?.length || 0,
        bodies: scene.regaliaAegisBodies?.getChildren?.().length || 0,
        fx: scene.regaliaAegisFxObjects?.size || 0,
        echoes: scene.regaliaCounterPulseState?.echoes?.length || 0,
        rings: scene.regaliaPulseFxObjects?.size || 0
      };
    });
    report.steps.push({ step: "after game over", ...afterGameOver });
    assert.deepEqual(afterGameOver, { shields: 0, bodies: 0, fx: 0, echoes: 0, rings: 0 });
    assert.deepEqual(report.pageErrors, []);
    report.result = "pass";
    await context.close();
  } catch (error) {
    report.result = "fail";
    report.error = String(error?.stack || error);
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
}

main().then(() => console.log("regalia-aegis-browser: pass")).catch((error) => {
  console.error(error);
  process.exit(1);
});
