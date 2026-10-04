"use strict";
// Read-only preservation audit against the exact Phase 6B worktree saved before 6C1.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const evidence = process.env.UMBRA_TEST_OUTPUT || path.join(root, ".tmp_umbra_phase6c1", "2026-09-07T11-44-31-241Z");
const baseline = process.env.UMBRA_CORE_BASELINE || path.join(evidence, "baseline");
const hash = b => crypto.createHash("sha256").update(b).digest("hex");
function methods(dir) {
  const c = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, URLSearchParams, console, Phaser: { Scene: class {} } });
  vm.runInContext(fs.readFileSync(path.join(dir, "skillDefinitions.js"), "utf8"), c);
  const source = fs.readFileSync(path.join(dir, "game.js"), "utf8");
  vm.runInContext(source.slice(0, source.indexOf("function isCommsStoryDebugResetRequested()"))
    + source.slice(source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS"), source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends")))
    + "\nthis.prototypeForAudit = SurvivalScene.prototype;", c);
  return new Map(Object.getOwnPropertyNames(c.prototypeForAudit).filter(n => n !== "constructor")
    .map(n => [n, c.prototypeForAudit[n].toString().replace(/\r\n/g, "\n")]));
}
const before = methods(baseline), after = methods(root), changed = [], same = [], removed = [], added = [];
for (const [name, content] of before) (after.has(name) ? after.get(name) === content ? same : changed : removed).push(name);
for (const name of after.keys()) if (!before.has(name)) added.push(name);
const protectedGroups = {
  movementAirBrakeEvade: /Ac.*(?:Movement|Velocity|Steering|Boost|Brake|Evade|Evasiv|Heat|Overheat|Glide)|UmbraAirBrake|UmbraAirBrakeVelocity|PlayerMoveInput/,
  energy: /(?:BoostEnergy|DashStamina|Boost.*(?:Drain|Regen|Cost)|Stamina.*Multiplier)/,
  trace: /UmbraBoostTrace/,
  enemyMovement: /^(?:updateEnemies|updateDashEnemy|updateRangedEnemy|updateBossSpecialEnemy|updateVoidHunterBossEnemy|beginBossLightningDashAttack|fireBossLightningDash|getEnemyLostArmsSlowMultiplier|getEnemyCleaningRobotSlowMultiplier|getEnemySkillMutationSlowMultiplier|updateEnemySupportStatusLock|constrainEnemyToMovementBounds)$/,
  receivers: /^(?:applyDamageToEnemy|scalePlayerDamage|applyOverdriveModHunterDamageModifier|killEnemy)$/,
  progression: /^(?:gainExperience|gainDeepLevelExperience|beginStartingUpgradeDraft|isDeepLevelProgressionActive|isXpProgressionCapped|selectLevelUpCard|completeLevelUpCardSelection)$/
};
const protectedMethods = Object.fromEntries(Object.entries(protectedGroups).map(([group, re]) => {
  const names = [...before.keys()].filter(n => re.test(n));
  return [group, { count: names.length, changed: names.filter(n => after.get(n) !== before.get(n)) }];
}));
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, "start-manifest.json"), "utf8"));
const files = Object.entries(manifest.hashes).map(([name, expected]) => ({ name, expected,
  current: fs.existsSync(path.join(root, name)) ? hash(fs.readFileSync(path.join(root, name))) : null }));
const allowed = new Set(["README.md", "game.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "index.html", "docs/umbra-phase6b-report.md"]);
const protectedFiles = files.filter(x => !allowed.has(x.name) && !x.name.startsWith("tests/"));
const result = {
  at: new Date().toISOString(), baseline, head: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  startHead: manifest.head, harnessSha256: hash(fs.readFileSync(__filename)),
  methods: { old: before.size, current: after.size, identical: same.length, changed, added, removed, protected: protectedMethods },
  files, changedExistingTests: files.filter(x => x.name.startsWith("tests/") && x.current !== x.expected).map(x => x.name),
  protectedFileCount: protectedFiles.length, protectedFileChanges: protectedFiles.filter(x => x.current !== x.expected),
  expectedEnemyAdapters: ["updateEnemies", "updateBossSpecialEnemy", "fireBossLightningDash"],
  indexOnlyChangedScriptVersions: fs.readFileSync(path.join(baseline, "index.html"), "utf8").replace("./game.js?v=umbra-phase6b-v1", "./game.js?v=umbra-phase6c1-v1") === fs.readFileSync(path.join(root, "index.html"), "utf8")
};
result.passed = result.head === result.startHead && !removed.length && !result.protectedFileChanges.length
  && Object.entries(protectedMethods).every(([group, x]) => group === "enemyMovement" ? x.changed.every(name => result.expectedEnemyAdapters.includes(name)) : !x.changed.length) && result.indexOnlyChangedScriptVersions;
fs.mkdirSync(evidence, { recursive: true });
const filename = path.join(evidence, `preservation-${Date.now()}.json`); fs.writeFileSync(filename, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ file: filename, passed: result.passed, methods: result.methods, protectedFileCount: result.protectedFileCount,
  protectedFileChanges: result.protectedFileChanges, changedExistingTests: result.changedExistingTests }, null, 2));
if (!result.passed) process.exitCode = 1;
