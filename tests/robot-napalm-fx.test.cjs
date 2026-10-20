"use strict";
// Robot missile / napalm particle effects: palette coverage, palette-driven burn flashes, and the
// particle reset after clearing the shared emitters (Phaser 3.70 killAll keeps old positions).
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");

function load() {
  const context = vm.createContext({
    window: { location: { search: "" } }, console, URLSearchParams,
    Phaser: { Scene: class {}, Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) } }
  });
  vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
  const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const laterDeclarationsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
  assert.ok(declarationsEnd > 0 && laterDeclarationsStart > declarationsEnd && classEnd > laterDeclarationsStart);
  vm.runInContext(source.slice(0, declarationsEnd) + "\n" + source.slice(laterDeclarationsStart, classEnd) +
    "\nthis.api = { Scene: SurvivalScene, palettes: ROBOT_NAPALM_FX_PALETTES, napalm: ROBOT_NAPALM_CONFIG };", context);
  return context.api;
}

function sceneWithPalette(api, paletteParam) {
  const scene = Object.create(api.Scene.prototype);
  scene.getUrlStageParam = (name) => (name === "debugNapalmFxPalette" ? paletteParam : null);
  return scene;
}

function burnFlashTint(api, paletteParam) {
  const scene = sceneWithPalette(api, paletteParam);
  const enemy = { active: true, isDying: false, x: 0, y: 0 };
  const tints = [];
  scene.isFinalBossRaidEnemyTargetable = () => true;
  scene.applyDamageToEnemy = (target, damage, tint) => tints.push(tint);
  scene.robotState = { napalmBurns: [{ enemy, remainingMs: 2000, tickTimerMs: 0, tickDamage: 1 }] };
  scene.updateRobotNapalmBurns(api.napalm.burnTickMs);
  assert.equal(tints.length, 1);
  return tints[0];
}

test("every napalm palette defines the same colour keys", () => {
  const { palettes } = load();
  const keys = Object.keys(palettes.pink).sort();
  ["marker", "markerGlow", "shock", "burnFlash", "fieldFlash"].forEach((key) => assert.ok(keys.includes(key), key));
  Object.entries(palettes).forEach(([name, palette]) => assert.deepEqual(Object.keys(palette).sort(), keys, name));
});

test("burn flashes follow the selected palette, pink by default and the old orange on request", () => {
  const api = load();
  assert.equal(burnFlashTint(api, null), api.palettes.pink.burnFlash);
  assert.equal(burnFlashTint(api, "orange"), 0xff8a4c);
  assert.equal(burnFlashTint(api, "unknown"), api.palettes.pink.burnFlash);
});

test("clearing the shared emitters resets particle positions so recycled puffs land where emitted", () => {
  const api = load();
  const scene = sceneWithPalette(api, null);
  const particle = () => ({ x: 300, y: 200, setPosition(x = 0, y = 0) { this.x = x; this.y = y; } });
  // Mirrors Phaser 3.70: killAll() moves alive particles to the dead pool without touching their position.
  const emitter = {
    active: true, scene: {}, alive: [particle(), particle()], dead: [particle()],
    killAll() { while (this.alive.length) this.dead.push(this.alive.pop()); },
    forEachDead(callback) { this.dead.forEach((entry) => callback(entry, this)); }
  };
  scene.robotFxEmitters = { missileSmoke: emitter };
  scene.clearRobotFxParticles();
  assert.equal(emitter.alive.length, 0);
  assert.equal(emitter.dead.length, 3);
  emitter.dead.forEach((entry) => assert.deepEqual([entry.x, entry.y], [0, 0]));
});
