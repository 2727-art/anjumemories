"use strict";
// Read-only byte audit against Phase6D2 start. Reuse the existing VM/class and
// balanced declaration readers; no Scene, storage or network entry is executed.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."), start = path.join(root, ".tmp_umbra_phase6d2/2026-09-08-start");
const file = path.join(__dirname, "umbra-triad-preservation.cjs"), mod = new Module(file, module);
mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
let code = fs.readFileSync(file, "utf8").split("const before = loadMethods")[0]
  .replace('".tmp_umbra_phase6d1"', '".tmp_umbra_phase6d2"')
  .replace("process.env.UMBRA_TRIAD_BASELINE ||", "process.env.UMBRA_EQUIPMENT_BASELINE ||");
mod._compile(code + "\nmodule.exports={loadMethods,declaration,baselineBytes,currentBytes,manifest,frozen};", file);
const { loadMethods, declaration, baselineBytes, currentBytes, manifest, frozen } = mod.exports;
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const before = loadMethods(baselineBytes), after = loadMethods(currentBytes);
const allowedChanges = new Set([
  "getRunEquipmentCombatLinkState", "ensureRunEquipmentOverlimitBonusState", "shouldSuppressRunEquipmentCombatLink",
  "isEquipmentCombatLinkSkillId", "canUpgradeRunEquipmentSkillOverlimit", "hasAvailableRunEquipmentOverlimitUpgrade",
  "applyRunEquipmentSkillOverlimitUpgrade", "buildEquipmentOverlimitChoice", "getAvailableEquipmentOverlimitChoices",
  "countAvailableEquipmentOverlimitUpgradeSteps", "queueFinalMutationEquipmentOverlimitBonus", "queueDeepLevelEquipmentOverlimitBonus",
  "canOpenEquipmentOverlimitBonusSelection", "tryOpenPendingEquipmentOverlimitBonusSelection", "finishEquipmentOverlimitBonusSelectionOverlay",
  "applyRunEquipmentPlayerSkillDamageBonus", "getRunEquipmentAdjustedSkillIntervalMs", "showSkillMutationSelect",
  "tryOpenPendingPostOverlaySelections", "initializeUmbraGrowthRun", "applyUmbraFinalChoice", "dispatchUmbraFinalSecondary",
  "applyUmbraPhantomNovaPulse", "applyUmbraBloodSpikeImpact", "applyUmbraMoonlightHit", "getUmbraSkillFinalProfile",
  "getUmbraMoonlightRehitIntervalMs", "getUmbraBloodSpikeIntervalMs", "getUmbraPhantomNovaIntervalMs", "getPassiveUpgradeChoices",
  "buildSkillChoice", "buildUmbraFinalCard", "buildUmbraCoreCard", "completeLevelUpCardSelection"
]);
const allowedAdded = new Set([
  "isUmbraEquipmentContextActive", "isUmbraEquipmentScope", "getEquipmentCombatLinkTargetSkillIds", "initializeUmbraEquipmentRun",
  "getUmbraEquipmentSnapshot", "getUmbraEquipmentCombatProfile", "destroyUmbraEquipmentRun", "canUpgradeUmbraEquipmentOverlimit",
  "buildUmbraEquipmentOverlimitChoice", "getUmbraEquipmentOverlimitCardDifference", "applyUmbraEquipmentOverlimitChoice",
  "queueUmbraEquipmentFinalCommit", "queueUmbraFinalOverlimitBonus", "queueUmbraDeepOverlimitBonus",
  "canOpenUmbraEquipmentOverlimitBonusSelection", "tryOpenUmbraEquipmentOverlimitBonusSelection", "closeUmbraEquipmentOverlimitSelection",
  "rejectUmbraEquipmentOverlimitSelection", "getUmbraEquipmentAttackDamage", "getUmbraEquipmentDamageBreakdown", "getUmbraEquipmentReactorCardDisplay"
]);
const changed = [...before].filter(([name, bytes]) => after.has(name) && !bytes.equals(after.get(name))).map(([name]) => name);
const removed = [...before.keys()].filter(name => !after.has(name)), added = [...after.keys()].filter(name => !before.has(name));
const oldSource = baselineBytes.get("game.js").toString(), newSource = currentBytes.get("game.js").toString();
const oldConstants = [...oldSource.matchAll(/^const ([A-Z][A-Z0-9_]*) =/gm)].map(match => match[1]);
const constantChanges = oldConstants.filter(name => !declaration(oldSource, name).equals(declaration(newSource, name)));
const addedConstants = [...newSource.matchAll(/^const ([A-Z][A-Z0-9_]*) =/gm)].map(match => match[1]).filter(name => !oldConstants.includes(name));
const allowedFiles = new Set(["README.md", "game.js", "index.html", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "docs/umbra-phase6d1-report.md"]);
const files = frozen.map(({ name, expected }) => ({ name, expected, baseline: hash(baselineBytes.get(name)),
  current: currentBytes.get(name) ? hash(currentBytes.get(name)) : null, protected: !allowedFiles.has(name) }));
const priorReport = baselineBytes.get("docs/umbra-phase6d1-report.md"), currentReport = currentBytes.get("docs/umbra-phase6d1-report.md");
const protectedGroups = {
  movementBrakeEvadeTrace: /Ac.*(?:Movement|Velocity|Steering|Boost|Brake|Evade|Evasiv|Heat|Overheat|Glide)|UmbraAirBrake|PlayerMoveInput|UmbraBoostTrace/,
  energyAPReceiver: /^(?:applyDamageToPlayer|applyDamageToEnemy|scalePlayerDamage|applyOverdriveModHunterDamageModifier|killEnemy|gainExperience|gainDeepLevelExperience|selectLevelUpCard)$|ApReinforce|EvadeWindow|Invincib|BoostEnergy|DashStamina|Boost.*(?:Drain|Regen|Cost)/,
  coreFinalTriadSettingsAndLifecycle: /^(?:getUmbraFinalMainRawDamage|getUmbraFinalSecondaryRawDamage|getUmbraSkillCoreProfile|applyUmbraSkillStageChange|applyUmbraCoreChoice|refreshUmbraTriadSnapshot|initializeUmbraTriadRun|destroyUmbraTriadRun|createUmbraFinalField|updateUmbraFinalFields|commitUmbraPhantomNovaReservation|observeUmbraPhantomNovaStep|observeUmbraBloodSpikeStep)$/,
  savesNormalizersCloud: /^(?:save|load|persist|normalize)|Storage|Cloud|Firebase|Ranking|MutationAtlas/
};
const groups = Object.fromEntries(Object.entries(protectedGroups).map(([group, pattern]) => {
  const names = [...before.keys()].filter(name => pattern.test(name));
  return [group, { count: names.length, changed: names.filter(name => changed.includes(name) || removed.includes(name)) }];
}));
const frozenManifest = process.env.UMBRA_EQUIPMENT_FINAL_MANIFEST || path.join(start, "final-sources-v2.json");
const finalSources = fs.existsSync(frozenManifest) ? Object.entries(JSON.parse(fs.readFileSync(frozenManifest)))
  .map(([name, expected]) => ({ name, expected, current: hash(fs.readFileSync(path.join(root, name))) })) : [];
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const result = { at: new Date().toISOString(), head, startHead: manifest.head, harnessSha256: hash(fs.readFileSync(__filename)),
  parserHarnessSha256: hash(fs.readFileSync(file)), sourceGameSha256: hash(currentBytes.get("game.js")), baselineGameSha256: hash(baselineBytes.get("game.js")),
  methodology: "Byte-exact148-file start comparison and all previous class methods/constants. Authorized equipment adapters/card connections are named explicitly. Unchanged bytes establish limited preservation, not whole production Scene or runtime performance acceptance.",
  methods: { beforeCount: before.size, afterCount: after.size, identicalCount: before.size - changed.length - removed.length,
    changed, added, removed, unexpectedChanged: changed.filter(name => !allowedChanges.has(name)), unexpectedAdded: added.filter(name => !allowedAdded.has(name)), groups },
  constantCount: oldConstants.length, constantChanges, addedConstants, files, finalSources,
  fileCount: files.length, protectedFileCount: files.filter(item => item.protected).length,
  baselineIntegrityFailures: files.filter(item => item.expected !== item.baseline), protectedFileChanges: files.filter(item => item.protected && item.current !== item.expected),
  pngCount: files.filter(item => /\.png$/i.test(item.name)).length,
  previousReportAppendOnly: currentReport.subarray(0, priorReport.length).equals(priorReport),
  indexOnlyVersion: baselineBytes.get("index.html").toString().replace("./game.js?v=umbra-phase6d1-v1", "./game.js?v=umbra-phase6d2-v1") === currentBytes.get("index.html").toString(),
  baselineFixtureConstantEqual: ["FIXTURES", "MECH_IDS"].every(name => declaration(baselineBytes.get("umbraDriveFixtures.js").toString(), name).equals(declaration(currentBytes.get("umbraDriveFixtures.js").toString(), name))) };
result.passed = head === manifest.head && result.baselineGameSha256 === manifest.expectedGame && result.fileCount === 148 && result.pngCount === 27
  && !removed.length && !result.methods.unexpectedChanged.length && !result.methods.unexpectedAdded.length
  && !constantChanges.length && !addedConstants.length && !result.baselineIntegrityFailures.length && !result.protectedFileChanges.length
  && Object.values(groups).every(group => !group.changed.length) && result.previousReportAppendOnly && result.indexOnlyVersion && result.baselineFixtureConstantEqual
  && finalSources.every(source => source.current === source.expected);
const output = path.join(process.env.UMBRA_TEST_OUTPUT || path.join(start, "preservation"), `equipment-preservation-${Date.now()}.json`);
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: "wx" });
console.log(JSON.stringify({ output, passed: result.passed, methods: result.methods, protectedFileChanges: result.protectedFileChanges,
  constantChanges, previousReportAppendOnly: result.previousReportAppendOnly }, null, 2));
if (!result.passed) process.exitCode = 1;
