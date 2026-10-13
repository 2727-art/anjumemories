"use strict";
// Shared test fixture for REGALIA's own skills (docs/regalia-kit-design.md): a SurvivalScene built
// from the real game.js / skillDefinitions.js declarations, with Phaser's scene parts replaced by
// small fakes. No storage or network access is allowed.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const plain = value => JSON.parse(JSON.stringify(value));

// Any Phaser display object: every method returns the object itself.
function fakeDisplayObject(extra = {}) {
  const target = { active: true, alpha: 1, scaleX: 1, scaleY: 1, x: 0, y: 0, ...extra };
  target.destroy = () => { target.active = false; };
  target.once = () => target;
  const proxy = new Proxy(target, {
    get(object, key) {
      if (key in object) return object[key];
      if (key === "then") return undefined;
      return () => proxy;
    }
  });
  return proxy;
}

function fixture({ debug = false, mechId = "regaliaBastion" } = {}) {
  const forbidden = () => assert.fail("Storage and network must not be accessed");
  const window = { location: { search: "" }, fetch: forbidden };
  Object.defineProperties(window, {
    localStorage: { get: forbidden }, sessionStorage: { get: forbidden }, firebase: { get: forbidden }
  });
  const context = vm.createContext({
    window, console, URLSearchParams, fetch: forbidden, XMLHttpRequest: forbidden, WebSocket: forbidden,
    Phaser: {
      Scene: class {},
      Scenes: { Events: { SHUTDOWN: "shutdown" } },
      BlendModes: { ADD: 1 },
      Math: {
        Clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
        Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }
      },
      Utils: { Array: { Shuffle: values => values } }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(root, "skillDefinitions.js"), "utf8"), context);
  const declarationsEnd = source.indexOf("function isCommsStoryDebugResetRequested()");
  const laterDeclarationsStart = source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS");
  const classEnd = source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends"));
  vm.runInContext(source.slice(0, declarationsEnd) + "\n" + source.slice(laterDeclarationsStart, classEnd) +
    "\nthis.api = { Scene: SurvivalScene, skills: SKILL_DEFINITIONS, config: REGALIA_AEGIS_WALL_CONFIG," +
    " pulseConfig: REGALIA_COUNTER_PULSE_CONFIG };", context);
  const api = context.api;
  const scene = Object.create(api.Scene.prototype);
  const calls = { damage: [], loads: [], visuals: [] };
  scene.getUrlStageParam = (key) => (debug && key === "debugRegaliaKit" ? "1" : "");
  scene.getDebugPlayerMechIdOverride = () => null;
  scene.getSelectedPlayerMechId = () => mechId;
  scene.shopState = scene.normalizeShopState({ playerMechs: { ownedIds: ["defaultBear", mechId], selectedId: mechId } });
  scene.runPlayerMechSnapshotActive = false;
  scene.stats = { maxHp: 200 };
  scene.time = { now: 0 };
  scene.game = { loop: { delta: 1000 } };
  scene.enemyList = [];
  scene.enemies = { children: { each: (fn) => scene.enemyList.slice().forEach(fn) } };
  scene.playerHitbox = { active: true, x: 1000, y: 1000 };
  scene.playerRobotMotion = { angle: 0 };
  scene.events = { once() {} };
  scene.tweens = { add(config) { config.onComplete?.(); return {}; }, killTweensOf() {} };
  scene.textures = { exists: () => false };
  scene.load = {};
  scene.loadImageAssetOnDemand = (key) => { calls.loads.push(key); return true; };
  scene.add = {
    zone: (x, y) => fakeDisplayObject({ x, y }),
    graphics: () => { const object = fakeDisplayObject(); calls.visuals.push("graphics"); return object; },
    image: (x, y, key) => { const object = fakeDisplayObject({ x, y }); calls.visuals.push(key); return object; }
  };
  const group = {
    children: new Set(),
    add(zone) {
      zone.body = { setCircle(radius) { this.radius = radius; }, updateFromGameObject() {} };
      this.children.add(zone);
    },
    contains(zone) { return this.children.has(zone); },
    remove(zone, fromScene, destroy) { this.children.delete(zone); if (destroy) zone.destroy(); }
  };
  scene.physics = { add: { staticGroup: () => group, collider: () => ({}) }, world: { fps: 60 } };
  scene.isFinalBossRaidActive = () => false;
  scene.getEnemyOutgoingDamage = (enemy, amount) => amount;
  scene.getMutatedSkillDamage = (skillId, damage) => damage;
  scene.applyRunEquipmentPlayerSkillDamageBonus = (skillId, damage) => damage;
  scene.getSkillMutationCooldownMultiplier = () => 1;
  scene.getRunEquipmentAttackIntervalMultiplier = () => 1;
  scene.findClosestEnemiesFrom = () => [];
  scene.applyDamageToEnemy = (enemy, damage, tint, impact) => calls.damage.push({ enemy: enemy.name, damage, impact: plain(impact) });
  scene.playerSkills = {};
  return { scene, api, calls, group };
}

const enemy = (name, x, y, extra = {}) => ({ name, x, y, active: true, isDying: false, contactDamage: 13, ...extra });

// A skill state at the given stage, built with the game's own createSkillState.
function skillStateAt(scene, api, skillId, number = 1) {
  const state = scene.createSkillState(api.skills[skillId]);
  state.stageIndex = number - 1;
  state.currentStage = api.skills[skillId].stages[number - 1];
  return state;
}

module.exports = { fixture, fakeDisplayObject, plain, enemy, skillStateAt };
