// Captures the current game with REGALIA BASTION on the open world, for the R1 style mock
// (docs/regalia-kit-design.md 11 and 12).
//
//   python -m http.server 4173 --bind 127.0.0.1        (in another terminal, repository root)
//   node tools/blender/regalia_kit/capture_regalia.cjs
//
// Uses playwright-core from the repository's node_modules and a local Chrome
// (override with OW_CHROME=<path to chrome.exe>, OW_GAME_URL=<base url>).
// Runs in a fresh browser profile, so no saved game data is read or changed. REGALIA is
// selected with the existing debug flags (debugPlayerMech / debugPlayerMechUnlock).
// Writes a 1280x720 frame to preview/game-regalia.png, the same paused frame without the mech to
// preview/game-regalia-nomech.png (their difference is the mech mask), and the player's screen position and
// display size to preview/game-regalia.json.

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright-core");

const BASE_URL = process.env.OW_GAME_URL || "http://127.0.0.1:4173/";
const CHROME = process.env.OW_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT_DIR = path.join(__dirname, "preview");
const QUERY = [
  "mobileGate=0", "mobileControls=0", "debugSkipOpeningBoost=1",
  "debugOpenWorld=1", "debugOpenWorldSeed=pilot",
  "debugPlayerMech=regaliaBastion", "debugPlayerMechUnlock=1"
].join("&");
const SORTIE_BUTTON = { x: 1015, y: 660 }; // game pixels (1280x720), as in tools/blender/openworld/capture_game.cjs

async function waitForRun(page) {
  await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene?.getScene?.("survival-scene")?.shopActive, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const box = await (await page.$("#game-root canvas")).boundingBox();
  await page.mouse.click(box.x + (SORTIE_BUTTON.x * box.width) / 1280, box.y + (SORTIE_BUTTON.y * box.height) / 720);
  await page.waitForFunction(() => {
    const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    return Boolean(scene && !scene.shopActive && scene.playerHitbox?.active);
  }, null, { timeout: 90000 });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ["--disable-background-networking", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${BASE_URL}?${QUERY}`, { waitUntil: "load" });
    await waitForRun(page);
    await page.waitForTimeout(3500); // a few enemies close in; before the first level-up
    // Pause the scene (rendering continues) so the two frames below differ only by the mech.
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").scene.pause());
    await page.waitForTimeout(300);
    const hidden = await page.evaluate(() => new Promise((resolve) => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      scene.commsState?.container?.setVisible(false);
      scene.playerSprite?.setVisible(false);
      window.__SURVIVAL_GAME__.renderer.snapshot((image) => {
        scene.playerSprite?.setVisible(true);
        resolve(image.src);
      });
    }));
    fs.writeFileSync(path.join(OUT_DIR, "game-regalia-nomech.png"), Buffer.from(hidden.split(",")[1], "base64"));
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => new Promise((resolve) => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      scene.commsState?.container?.setVisible(false);
      const camera = scene.cameras.main;
      const toScreen = (x, y) => ({ x: (x - camera.worldView.x) * camera.zoom, y: (y - camera.worldView.y) * camera.zoom });
      const sprite = scene.playerSprite;
      const info = {
        mechId: scene.getRunPlayerMechId(),
        zoom: camera.zoom,
        player: toScreen(scene.playerHitbox.x, scene.playerHitbox.y),
        playerSprite: sprite ? { ...toScreen(sprite.x, sprite.y), width: sprite.displayWidth, height: sprite.displayHeight, originY: sprite.originY } : null,
        enemies: scene.enemies.getChildren().filter((enemy) => enemy.active).map((enemy) => ({ ...toScreen(enemy.x, enemy.y), radius: enemy.body?.radius || 0 }))
      };
      window.__SURVIVAL_GAME__.renderer.snapshot((image) => resolve({ info, src: image.src }));
    }));
    fs.writeFileSync(path.join(OUT_DIR, "game-regalia.png"), Buffer.from(result.src.split(",")[1], "base64"));
    fs.writeFileSync(path.join(OUT_DIR, "game-regalia.json"), JSON.stringify(result.info, null, 2));
    console.log(`game-regalia.png: saved (${result.info.mechId}, ${result.info.enemies.length} enemies${errors.length ? `, page errors: ${errors.length}` : ""})`);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
