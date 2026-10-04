"use strict";
// Read-only byte audit. No game/browser execution, storage access or source writes.
// Re-run after source freeze: node tests/umbra-triad-preservation.cjs
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const start = path.join(root, ".tmp_umbra_phase6d1", "2026-09-08-start");
const baseline = process.env.UMBRA_TRIAD_BASELINE || path.join(start, "baseline");
const evidence = process.env.UMBRA_TEST_OUTPUT || path.join(start, "preservation");
const expectedGame = "5d7cdaa03fa7f47eac63cfab5a93d1bfb9eedd0c1764e6a2c11c78c266d365d4";
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const normalizedPath = name => name.replace(/\\/g, "/");
const read = (dir, name) => fs.readFileSync(path.join(dir, name));
const manifest = JSON.parse(read(start, "start-manifest.json"));
const frozen = Object.entries(manifest.hashes).map(([name, expected]) => ({ name: normalizedPath(name), expected }));
// Capture source bytes once for this audit, including the files being actively edited.
const currentBytes = new Map(frozen.map(({ name }) => [name, fs.existsSync(path.join(root, name)) ? read(root, name) : null]));
const baselineBytes = new Map(frozen.map(({ name }) => [name, read(baseline, name)]));
function loadMethods(bytes) {
  const c = vm.createContext({ window: { location: { search: "?umbraPreview=1" } }, URLSearchParams, console, Phaser: { Scene: class {} } });
  vm.runInContext(bytes.get("skillDefinitions.js").toString("utf8"), c);
  const source = bytes.get("game.js").toString("utf8");
  vm.runInContext(source.slice(0, source.indexOf("function isCommsStoryDebugResetRequested()"))
    + source.slice(source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS"), source.indexOf("\nconst config =", source.indexOf("class SurvivalScene extends")))
    + "\nthis.auditPrototype = SurvivalScene.prototype;", c);
  // Function#toString preserves the exact source spelling, comments and CR/LF.
  // Do not normalize line endings: the reported equality is byte equality.
  return new Map(Object.getOwnPropertyNames(c.auditPrototype).filter(n => n !== "constructor")
    .map(n => [n, Buffer.from(c.auditPrototype[n].toString(), "utf8")]));
}
function declaration(source, name) {
  const startAt = source.indexOf(`const ${name} =`);
  if (startAt < 0) throw new Error(`Missing constant ${name}`);
  let quote = null, comment = null, depth = 0;
  for (let i = startAt; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (comment === "line") { if (ch === "\n") comment = null; continue; }
    if (comment === "block") { if (ch === "*" && next === "/") { comment = null; i++; } continue; }
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === "/" && next === "/") { comment = "line"; i++; continue; }
    if (ch === "/" && next === "*") { comment = "block"; i++; continue; }
    if (["\"", "'", "`"].includes(ch)) { quote = ch; continue; }
    if ("([{ ".includes(ch) && ch !== " ") depth++;
    if (")]}".includes(ch)) depth--;
    if (ch === ";" && depth === 0) return Buffer.from(source.slice(startAt, i + 1));
  }
  throw new Error(`Unclosed constant ${name}`);
}
const before = loadMethods(baselineBytes), after = loadMethods(currentBytes);
const identical = [], changed = [], removed = [], added = [];
for (const [name, value] of before) (after.has(name) ? value.equals(after.get(name)) ? identical : changed : removed).push(name);
for (const name of after.keys()) if (!before.has(name)) added.push(name);
const authorizedChanges = {
  isolatedModifierAdapters: ["getTriadMatrixModifier", "getTriadSkillDamageMultiplier"],
  commitAndEligibilityPublication: ["applyUmbraCoreChoice", "applyUmbraFinalChoice", "initializeUmbraControlOwner", "applyUmbraSkillStageChange"],
  capturedCombatCoefficients: ["applyUmbraControlHit", "getUmbraControlSpeedMultiplier", "getUmbraFinalMainRawDamage",
    "dispatchUmbraFinalSecondary", "createUmbraFinalField", "getUmbraFinalFieldSpeedMultiplier", "getUmbraFinalVisualState",
    "applyUmbraPhantomNovaPulse", "applyUmbraMoonlightHit", "getUmbraSkillCoreProfile", "getUmbraSkillFinalProfile"],
  effectiveCardsAndSubtitle: ["showSkillMutationSelect", "buildUmbraFinalCard", "buildUmbraCoreCard"]
};
const allowedNames = new Set(Object.values(authorizedChanges).flat());
const allowedAdded = ["isUmbraTriadContextActive", "getUmbraTriadTargetSkillIds", "createUmbraTriadSnapshot", "initializeUmbraTriadRun",
  "bindUmbraTriadOwner", "refreshUmbraTriadSnapshot", "getUmbraTriadSnapshot", "getUmbraTriadCombatProfile", "getUmbraTriadModifier",
  "destroyUmbraTriadRun", "getUmbraTriadSlowMultiplier", "getUmbraControlEffectStats", "getUmbraFinalSecondaryRawDamage", "getUmbraFinalFieldSettings"];
const protectedGroups = {
  movementAirBrakeEvade: /Ac.*(?:Movement|Velocity|Steering|Boost|Brake|Evade|Evasiv|Heat|Overheat|Glide)|UmbraAirBrake|PlayerMoveInput/,
  energyOperations: /(?:BoostEnergy|DashStamina|Boost.*(?:Drain|Regen|Cost)|Stamina.*Multiplier)/,
  apAndInvulnerability: /^(?:applyDamageToPlayer|shouldNegatePlayerDamageByAcEvade|healPlayer|applyPlayerMechStatProfile|applyRunPlayerMechStatProfile|recalculatePlayerStats)$|ApReinforce|Evasive|EvadeWindow|Invincib/,
  boostTrace: /UmbraBoostTrace/,
  enemyAiAndMovement: /^(?:updateEnemies|update.*Enemy|beginBossLightningDashAttack|fireBossLightningDash|getEnemy.*SlowMultiplier|getEnemySpeedMultiplier|updateEnemySupportStatusLock|constrainEnemyToMovementBounds|.*UmbraBossDash.*|applyUmbraControlMovementMultiplier)$/,
  receivers: /^(?:applyDamageToEnemy|scalePlayerDamage|applyOverdriveModHunterDamageModifier|killEnemy)$/,
  xpAndChoiceBudget: /^(?:gainExperience|gainDeepLevelExperience|beginStartingUpgradeDraft|isDeepLevelProgressionActive|isXpProgressionCapped|selectLevelUpCard|completeLevelUpCardSelection)$/,
  saveStorageCloudRanking: /Save|Storage|Cloud|Firebase|Ranking|^(?:save|load|persist|normalize).*(?:State|Record|Wallet|Coins|CoinAmount)/,
  publicMechAllowlistAndHangar: /PlayerMech|MechHangar|MutationAtlas/,
  existingTriadAndGaugeOperations: /TriadMatrix|TriadSkill|TriadControl|TriadPrism|TriadSingularity|TriadOverdrive|TriadRobot|TriadDash|^(?:addDepthDirectiveOverdriveGauge|addOverdriveFromXp|addRobotSyncGauge|triggerOverdriveFromGauge|activateRobotSyncDrive)$/,
  coreOwnerAndMovementIntegration: /^(?:isUmbraCoreContextActive|isUmbraCoreSkillOwnerValid|getUmbraSelectedCoreId|getUmbraControlOwner|isUmbraControlOwnerActive|initializeUmbraControlOwner|isUmbraControlRecordValid|pruneUmbraControlContributions|applyUmbraControlHit|getUmbraControlSpeedMultiplier)$/
};
const permittedProtected = {
  existingTriadAndGaugeOperations: authorizedChanges.isolatedModifierAdapters,
  coreOwnerAndMovementIntegration: ["initializeUmbraControlOwner", "applyUmbraControlHit", "getUmbraControlSpeedMultiplier"]
};
const protectedMethods = Object.fromEntries(Object.entries(protectedGroups).map(([group, re]) => {
  const names = [...before.keys()].filter(name => re.test(name));
  const differences = names.filter(name => !after.get(name)?.equals(before.get(name)));
  const allowed = permittedProtected[group] || [];
  return [group, { count: names.length, names, differences, authorizedDifferences: differences.filter(name => allowed.includes(name)),
    unexpectedDifferences: differences.filter(name => !allowed.includes(name)) }];
}));
const methodText = (map, name) => map.get(name).toString("utf8");
function insertedLine(name, anchor, line) {
  const old = methodText(before, name), current = methodText(after, name);
  const newline = old.includes("\r\n") ? "\r\n" : "\n";
  return old.replace(anchor, `${line}${newline}${anchor}`) === current;
}
// The two generic adapters replace only their initial prefix. Require the
// complete old remainder, including original CR/LF, to remain byte identical.
function prefixedAdapter(name, marker, expectedPrefix) {
  const old = methodText(before, name), current = methodText(after, name);
  const oldTail = old.slice(old.indexOf(marker) + marker.length).replace(/^\r?\n/, "");
  return current === expectedPrefix + marker + "\n" + oldTail;
}
const exactIntegrationEdits = {
  modifierAddsOnlyIsolatedBranch: prefixedAdapter("getTriadMatrixModifier", "    const snapshot = this.getTriadMatrixSnapshot();",
    "getTriadMatrixModifier(key, fallbackValue = 1) {\n"
    + "    if (this.verificationContext?.triadEnabled === true || this.umbraTriadState || this.umbraTriadWasEnabled) {\n"
    + "      return this.getUmbraTriadModifier?.(key, fallbackValue) ?? fallbackValue;\n    }\n"),
  skillDamageAddsOnlyIsolatedBranch: prefixedAdapter("getTriadSkillDamageMultiplier", "    if (!this.isSkillMutationTargetSkill(skillId)) {",
    "getTriadSkillDamageMultiplier(skillId, context = {}) {\n"
    + "    if (this.verificationContext?.triadEnabled === true || this.umbraTriadState || this.umbraTriadWasEnabled) {\n"
    + "      const profile = this.getUmbraTriadCombatProfile?.(skillId);\n"
    + "      return profile ? profile.skillDamageMultiplier * (context.enemy && this.isHighValueMutationTarget(context.enemy)\n"
    + "        ? profile.executionDamageMultiplier : 1) : 1;\n    }\n"),
  corePublishesOnlyAfterSuccessfulCommit: insertedLine("applyUmbraCoreChoice", "    this.updateHud?.();", "    this.refreshUmbraTriadSnapshot?.(`CORE_COMMIT:${skillId}`);"),
  finalPublishesOnlyAfterSuccessfulCommit: insertedLine("applyUmbraFinalChoice", "    this.updateHud?.();", "    this.refreshUmbraTriadSnapshot?.(`FINAL_COMMIT:${skillId}`);"),
  ownerBindingAddsOnlyEligibilityRefresh: insertedLine("initializeUmbraControlOwner", "  }", "    this.refreshUmbraTriadSnapshot?.(`OWNER_BOUND:${skillId}`, { notify: false });"),
  stageAddsOnlyEligibilityRefresh: insertedLine("applyUmbraSkillStageChange", "    return true;", "    this.refreshUmbraTriadSnapshot?.(`STAGE_ELIGIBILITY:${skill.id}`, { notify: false });"),
  controlGetterAddsOnlyExplicitTriadInactiveGuard: insertedLine("getUmbraControlSpeedMultiplier", "    let multiplier = 1;",
    "    if (this.verificationContext?.triadEnabled === true && !this.isUmbraTriadContextActive?.()) return 1;")
};
const oldSource = baselineBytes.get("game.js").toString("utf8"), newSource = currentBytes.get("game.js").toString("utf8");
// Audit every existing top-level uppercase constant, including all TRIAD,
// Mutation Atlas, storage, movement and Final settings; no old allowlist reuse.
const constantNames = [...oldSource.matchAll(/^const ([A-Z][A-Z0-9_]*) =/gm)].map(match => match[1]);
const constants = constantNames.map(name => {
  const old = declaration(oldSource, name), current = declaration(newSource, name);
  return { name, baselineSha256: hash(old), currentSha256: hash(current), equal: old.equals(current) };
});
const addedConstants = [...newSource.matchAll(/^const ([A-Z][A-Z0-9_]*) =/gm)].map(match => match[1]).filter(name => !constantNames.includes(name));
const privateRegistryOnly = addedConstants.length === 1 && addedConstants[0] === "UMBRA_TRIAD_COMBAT_SKILL_IDS"
  && declaration(newSource, addedConstants[0]).toString() === 'const UMBRA_TRIAD_COMBAT_SKILL_IDS = Object.freeze(["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"]);';
const globalBootSection = source => Buffer.from(source.slice(source.indexOf("function isCommsStoryDebugResetRequested()"), source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS")));
const globalBootStorageUnchanged = globalBootSection(oldSource).equals(globalBootSection(newSource));
const fixtureConstants = [["umbraDriveFixtures.js", "FIXTURES"], ["umbraDriveFixtures.js", "MECH_IDS"], ["umbraDriveRuntime.js", "methods"]]
  .map(([file, name]) => {
    const old = declaration(baselineBytes.get(file).toString("utf8"), name), current = declaration(currentBytes.get(file).toString("utf8"), name);
    return { file, name, baselineSha256: hash(old), currentSha256: hash(current), equal: old.equals(current) };
  });
const mutableFiles = new Set(["README.md", "game.js", "index.html", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "docs/umbra-phase6c2-report.md"]);
// No existing test is exempted. New Phase6D1 tests are separate files.
const files = frozen.map(({ name, expected }) => ({ name, expected, baselineSha256: hash(baselineBytes.get(name)),
  currentSha256: currentBytes.get(name) ? hash(currentBytes.get(name)) : null, authorizedFileScope: mutableFiles.has(name) }));
const protectedFiles = files.filter(file => !file.authorizedFileScope), pngs = files.filter(file => /\.png$/i.test(file.name));
const currentIndex = currentBytes.get("index.html").toString("utf8"), oldIndex = baselineBytes.get("index.html").toString("utf8");
const indexOnlyScriptVersionChanged = oldIndex.replace("./game.js?v=umbra-phase6c2-v1", "./game.js?v=umbra-phase6d1-v1") === currentIndex;
const previousReport = "docs/umbra-phase6c2-report.md", oldReport = baselineBytes.get(previousReport), newReport = currentBytes.get(previousReport);
const previousReportAppendOnly = newReport.subarray(0, oldReport.length).equals(oldReport);
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const finalManifestPath = process.env.UMBRA_TRIAD_FINAL_MANIFEST || path.join(start, "final-sources-v1.json");
const finalFreeze = fs.existsSync(finalManifestPath) ? Object.entries(JSON.parse(fs.readFileSync(finalManifestPath, "utf8")))
  .map(([name, expected]) => ({ name, expected, current: hash(currentBytes.get(name) || read(root, name)) })) : [];
const result = {
  at: new Date().toISOString(), baseline, sourceRoot: root, head, startHead: manifest.head,
  harnessSha256: hash(read(root, "tests/umbra-triad-preservation.cjs")), manifestSha256: hash(read(start, "start-manifest.json")),
  baselineGameSha256: hash(baselineBytes.get("game.js")), sourceGameSha256: hash(currentBytes.get("game.js")),
  methodology: "Byte comparison against the 135-file Phase6D1 start manifest, completed Phase6C2 game 5d7cdaa. Capture files once; VM defines classes/constants without starting any game or reading storage. Function source retains comments and CR/LF. Every old uppercase constant is compared. Generic TRIAD modifiers permit exactly the isolated branch; commit/owner/Stage methods permit only the specified refresh call. Full files protect old tests/docs, 24 Stage definitions, 27 PNGs, vendor, AGENTS, rules and equipment. This static audit does not establish runtime/performance/browser behavior.",
  behaviorScope: "Existing movement, Air Brake, EN consumption/recovery operations, gauge operations and receiver bodies remain unchanged. The deliberate TRIAD input modifier can reduce valid UMBRA boost consumption and increase existing qualifying gauge gains; unchanged operation bytes do not mean those resulting values are unchanged. Core/control and Final attack helper differences are the authorized new numerical/snapshot connections.",
  methods: { beforeCount: before.size, currentCount: after.size, identicalCount: identical.length, changed, removed, added,
    classifications: Object.fromEntries(Object.entries(authorizedChanges).map(([group, names]) => [group, changed.filter(name => names.includes(name))])),
    unexpectedChanged: changed.filter(name => !allowedNames.has(name)), unexpectedAdded: added.filter(name => !allowedAdded.includes(name)),
    protected: protectedMethods, hashes: Object.fromEntries([...before].map(([name, value]) => [name, { baseline: hash(value), current: after.has(name) ? hash(after.get(name)) : null }])) },
  exactIntegrationEdits, constants, addedConstants, privateRegistryOnly, fixtureConstants, globalBootStorageUnchanged,
  indexOnlyScriptVersionChanged, previousReportAppendOnly, finalFreeze, files,
  baselineFileCount: files.length, protectedFileCount: protectedFiles.length,
  protectedFileChanges: protectedFiles.filter(file => file.currentSha256 !== file.expected),
  baselineIntegrityFailures: files.filter(file => file.baselineSha256 !== file.expected),
  pngCount: pngs.length, pngChanges: pngs.filter(file => file.currentSha256 !== file.expected),
  changedExistingTests: files.filter(file => file.name.startsWith("tests/") && file.currentSha256 !== file.expected).map(file => file.name),
  stageDefinitionsByteIdentical: currentBytes.get("skillDefinitions.js").equals(baselineBytes.get("skillDefinitions.js"))
};
result.passed = head === manifest.head && result.baselineGameSha256 === expectedGame && result.baselineFileCount === 135
  && !result.baselineIntegrityFailures.length && !result.protectedFileChanges.length && result.pngCount === 27 && !result.pngChanges.length
  && !removed.length && !result.methods.unexpectedChanged.length && !result.methods.unexpectedAdded.length
  && Object.values(protectedMethods).every(group => group.count > 0 && !group.unexpectedDifferences.length)
  && Object.values(exactIntegrationEdits).every(Boolean) && constants.every(item => item.equal) && privateRegistryOnly && globalBootStorageUnchanged
  && fixtureConstants.every(item => item.equal) && finalFreeze.every(item => item.expected === item.current)
  && result.stageDefinitionsByteIdentical && indexOnlyScriptVersionChanged && previousReportAppendOnly;
fs.mkdirSync(evidence, { recursive: true });
const output = path.join(evidence, `preservation-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: "wx" });
console.log(JSON.stringify({ output, passed: result.passed, sourceGameSha256: result.sourceGameSha256,
  methods: { before: before.size, current: after.size, identical: identical.length, changed: changed.length, added: added.length,
    unexpectedChanged: result.methods.unexpectedChanged, unexpectedAdded: result.methods.unexpectedAdded,
    protected: Object.fromEntries(Object.entries(protectedMethods).map(([name, group]) => [name, { count: group.count, differences: group.differences, unexpected: group.unexpectedDifferences }])) },
  exactIntegrationEdits, constantCount: constants.length, constantChanges: constants.filter(item => !item.equal), addedConstants,
  privateRegistryOnly, globalBootStorageUnchanged, baselineFileCount: files.length, protectedFileCount: protectedFiles.length,
  protectedFileChanges: result.protectedFileChanges, baselineIntegrityFailures: result.baselineIntegrityFailures,
  pngCount: pngs.length, pngChanges: result.pngChanges, indexOnlyScriptVersionChanged, previousReportAppendOnly,
  fixtureConstants, finalFreezeMatches: finalFreeze.length > 0 && finalFreeze.every(item => item.expected === item.current),
  changedExistingTests: result.changedExistingTests }, null, 2));
if (!result.passed) process.exitCode = 1;
