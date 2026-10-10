// Screenshots of the current game for the pilot comparison (WORLD_DESIGN.md 6.9).
//
//   python -m http.server 4173 --bind 127.0.0.1        (in another terminal, repository root)
//   node tools/blender/openworld/capture_game.cjs
//
// Uses playwright-core from the repository's node_modules and a local Chrome
// (override with OW_CHROME=<path to chrome.exe>, OW_GAME_URL=<base url>).
// Writes 1280x720 canvas captures to tools/blender/openworld/preview/current-*.png.
// Runs in a fresh browser profile, so no saved game data is read or changed.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE_URL = process.env.OW_GAME_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.OW_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.join(__dirname, "preview");
const COMMON = "mobileGate=0&mobileControls=0&debugSkipOpeningBoost=1";

const SHOTS = [
  { file: "current-openworld-1a.png", query: `${COMMON}&debugOpenWorld=1&debugOpenWorldSeed=pilot`, intersection: true },
  { file: "current-tokyo-stage.png", query: `${COMMON}&stage=tokyo_stage_08_residential_arterial` },
];

// Start a run the way a player does: click SORTIE PREP on the Operations Hub
// (debugSkipOpeningBoost=1 skips the Opening Boost draft).
const SORTIE_BUTTON = { x: 1015, y: 660 }; // game pixels (1280x720)

async function waitForRun(page) {
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene?.("survival-scene")?.shopActive, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const box = await (await page.$("#game-root canvas")).boundingBox();
  await page.mouse.click(box.x + (SORTIE_BUTTON.x * box.width) / 1280, box.y + (SORTIE_BUTTON.y * box.height) / 720);
  await page.waitForFunction(() => {
    const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    return Boolean(scene && !scene.shopActive && scene.playerHitbox?.active);
  }, null, { timeout: 60000 });
}

// Exact 1280x720 frame from the renderer (not the CSS-scaled element).
async function snapshot(page) {
  const dataUrl = await page.evaluate(() => new Promise((resolve) => {
    // Hide the comms message box so it does not cover the ground in the comparison.
    window.__SURVIVAL_GAME__.scene.getScene("survival-scene").commsState?.container?.setVisible(false);
    window.__SURVIVAL_GAME__.renderer.snapshot((image) => resolve(image.src));
  }));
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

// Frame the nearest arterial (N-S, 680 px) / side road (E-W) crossing the same way as the pilot mock:
// camera centre 164 px west of the arterial and 288 px north of the side road (make_pilot_mock.py LAYOUT).
async function moveToIntersection(page) {
  return page.evaluate(() => {
    const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    const player = scene.playerHitbox;
    if (typeof scene.getOpenWorldRoadsInRange !== "function") {
      return null;
    }
    const nearest = (roads, value) => roads.reduce((best, road) => (Math.abs(road.center - value) < Math.abs(best.center - value) ? road : best));
    const vertical = scene.getOpenWorldRoadsInRange("x", player.x - 8000, player.x + 8000).filter((road) => road.arterial);
    const horizontal = scene.getOpenWorldRoadsInRange("y", player.y - 4000, player.y + 4000).filter((road) => !road.arterial);
    if (!vertical.length || !horizontal.length) {
      return null;
    }
    const rx = nearest(vertical, player.x);
    const ry = nearest(horizontal.filter((road) => road.width === 420).length ? horizontal.filter((road) => road.width === 420) : horizontal, player.y);
    const x = rx.start - 164;
    const y = ry.start - 288;
    player.setPosition(x, y);
    if (player.body?.reset) {
      player.body.reset(x, y);
    }
    return { x, y, roadX: rx, roadY: ry };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ["--disable-background-networking", "--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const shot of SHOTS) {
      const context = await browser.newContext({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      await page.goto(`${BASE_URL}?${shot.query}`, { waitUntil: "load" });
      await waitForRun(page);
      if (shot.intersection) {
        const moved = await moveToIntersection(page);
        console.log(`${shot.file}: intersection ${moved ? JSON.stringify({ x: Math.round(moved.x), y: Math.round(moved.y) }) : "not found (kept spawn point)"}`);
      }
      await page.waitForTimeout(3000); // camera settled, before the first level-up
      fs.writeFileSync(path.join(OUT_DIR, shot.file), await snapshot(page));
      console.log(`${shot.file}: saved${errors.length ? ` (page errors: ${errors.length})` : ""}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
