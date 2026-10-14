// Captures a crowded REGALIA frame for the V1 counter-wave mock (docs/regalia-kit-design.md 12.5).
//
//   python -m http.server 4173 --bind 127.0.0.1        (in another terminal, repository root)
//   node tools/blender/regalia_kit/capture_counter.cjs
//
// Uses playwright-core from the repository's node_modules and a local Chrome
// (override with OW_CHROME=<path to chrome.exe>, OW_GAME_URL=<base url>).
// Runs in a fresh browser profile with requests to other origins blocked, so no saved game data,
// auth or ranking traffic is touched. REGALIA is selected with the existing debug flags.
// About 40 enemies are placed around the mech, as in a deep Depth, and the scene is paused. Four
// frames of the same moment go to preview/: v1-game.png (all), v1-game-nomech.png,
// v1-game-noenemy.png and v1-game-ground.png (neither). Their differences are the mech and enemy
// masks, so the mock can draw ground effects under the enemies as the game does. The player's
// screen position and the camera zoom go to preview/v1-game.json.

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
const SORTIE_BUTTON = { x: 1015, y: 660 }; // game pixels (1280x720), as in capture_regalia.cjs

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

function snapshot(page, hide) {
  return page.evaluate((hide) => new Promise((resolve) => {
    const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    const enemies = scene.enemies.getChildren().filter((enemy) => enemy.active);
    scene.commsState?.container?.setVisible(false);
    scene.playerSprite?.setVisible(!hide.mech);
    enemies.forEach((enemy) => enemy.setVisible(!hide.enemies));
    window.__SURVIVAL_GAME__.renderer.snapshot((image) => {
      scene.playerSprite?.setVisible(true);
      enemies.forEach((enemy) => enemy.setVisible(true));
      resolve(image.src);
    });
  }), hide);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: CHROME, args: ["--disable-background-networking", "--autoplay-policy=no-user-gesture-required"] });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 800 }, deviceScaleFactor: 1, serviceWorkers: "block" });
    await context.route("**/*", (route) => (new URL(route.request().url()).origin !== new URL(BASE_URL).origin ? route.abort() : route.continue()));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(`${BASE_URL}?${QUERY}`, { waitUntil: "load" });
    await waitForRun(page);
    await page.waitForTimeout(1500);
    // A ring of enemies pressing in (golden-angle spiral, 110-330 world px), as at a deep Depth.
    await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      scene.gainExperience = () => {};
      const types = ["chaser", "chaser", "dash", "chaser", "tank", "chaser", "ranged"];
      const center = { x: scene.playerHitbox.x, y: scene.playerHitbox.y };
      for (let i = 0; i < 42; i += 1) {
        const enemy = scene.spawnEnemy(types[i % types.length], {});
        const angle = i * 2.39996;
        const radius = 110 + 220 * Math.sqrt((i + 0.5) / 42);
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;
        enemy.setPosition(x, y);
        enemy.body?.reset(x, y);
      }
    });
    await page.waitForTimeout(250);
    // Pause the scene (rendering continues) so the four frames differ only by what is hidden.
    await page.evaluate(() => window.__SURVIVAL_GAME__.scene.getScene("survival-scene").scene.pause());
    await page.waitForTimeout(300);
    const frames = {
      "v1-game.png": { mech: false, enemies: false },
      "v1-game-nomech.png": { mech: true, enemies: false },
      "v1-game-noenemy.png": { mech: false, enemies: true },
      "v1-game-ground.png": { mech: true, enemies: true }
    };
    for (const [file, hide] of Object.entries(frames)) {
      const src = await snapshot(page, hide);
      fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(src.split(",")[1], "base64"));
      await page.waitForTimeout(200);
    }
    const info = await page.evaluate(() => {
      const scene = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      const camera = scene.cameras.main;
      const toScreen = (x, y) => ({ x: (x - camera.worldView.x) * camera.zoom, y: (y - camera.worldView.y) * camera.zoom });
      const sprite = scene.playerSprite;
      return {
        mechId: scene.getRunPlayerMechId(),
        zoom: camera.zoom,
        player: toScreen(scene.playerHitbox.x, scene.playerHitbox.y),
        playerSprite: sprite ? { ...toScreen(sprite.x, sprite.y), width: sprite.displayWidth, height: sprite.displayHeight } : null,
        enemies: scene.enemies.getChildren().filter((enemy) => enemy.active).length
      };
    });
    fs.writeFileSync(path.join(OUT_DIR, "v1-game.json"), JSON.stringify(info, null, 2));
    console.log(`v1-game*.png: saved (${info.mechId}, ${info.enemies} enemies${errors.length ? `, page errors: ${errors.length}` : ""})`);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
