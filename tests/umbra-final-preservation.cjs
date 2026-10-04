"use strict";
// Read-only byte audit. No game/browser execution, storage access or source writes.
// Re-run after source freeze: node tests/umbra-final-preservation.cjs
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const start = path.join(root, ".tmp_umbra_phase6c2", "2026-09-08-start");
const baseline = process.env.UMBRA_FINAL_BASELINE || path.join(start, "baseline");
const evidence = process.env.UMBRA_TEST_OUTPUT || path.join(start, "preservation");
const expectedGame = "b04b8be5c048f991cb73ee748f01af385aff797d270ec86607685ab885485d3c";
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
  finalSelection: ["queueSkillMutationSelect", "tryOpenPendingSkillMutationSelection", "buildSkillMutationChoices", "showSkillMutationSelect",
    "applySkillMutationChoice", "syncUmbraCoreMilestones", "applyUmbraCoreChoice"],
  coreFinalIntegration: ["pruneUmbraControlContributions", "getUmbraControlSpeedMultiplier"],
  finalSnapshotAndAttackHooks: ["commitUmbraPhantomNovaReservation", "applyUmbraPhantomNovaPulse", "observeUmbraPhantomNovaStep",
    "getUmbraPhantomNovaVisualState", "createUmbraBloodSpikeCast", "applyUmbraBloodSpikeImpact", "observeUmbraBloodSpikeStep",
    "getUmbraBloodSpikeCastSnapshot", "receiveUmbraMoonlightTrace", "processUmbraMoonlightStep", "applyUmbraMoonlightHit"],
  finalNumericsAndCards: ["getUmbraMoonlightEffectiveStats", "getUmbraBloodSpikeEffectiveStats", "getUmbraPhantomNovaEffectiveStats", "buildSkillMutationCardModel"]
};
const allowedNames = new Set(Object.values(authorizedChanges).flat());
const protectedGroups = {
  movementAirBrakeEvade: /Ac.*(?:Movement|Velocity|Steering|Boost|Brake|Evade|Evasiv|Heat|Overheat|Glide)|UmbraAirBrake|PlayerMoveInput/,
  energy: /(?:BoostEnergy|DashStamina|Boost.*(?:Drain|Regen|Cost)|Stamina.*Multiplier)/,
  apAndInvulnerability: /^(?:applyDamageToPlayer|shouldNegatePlayerDamageByAcEvade|healPlayer|applyPlayerMechStatProfile|applyRunPlayerMechStatProfile|recalculatePlayerStats)$|ApReinforce|Evasive|EvadeWindow|Invincib/,
  boostTrace: /UmbraBoostTrace/,
  enemyAiAndMovement: /^(?:updateEnemies|update.*Enemy|beginBossLightningDashAttack|fireBossLightningDash|getEnemy.*SlowMultiplier|getEnemySpeedMultiplier|updateEnemySupportStatusLock|constrainEnemyToMovementBounds|.*UmbraBossDash.*|applyUmbraControlMovementMultiplier)$/,
  receivers: /^(?:applyDamageToEnemy|scalePlayerDamage|applyOverdriveModHunterDamageModifier|killEnemy)$/,
  xpAndChoiceBudget: /^(?:gainExperience|gainDeepLevelExperience|beginStartingUpgradeDraft|isDeepLevelProgressionActive|isXpProgressionCapped|selectLevelUpCard|completeLevelUpCardSelection)$/,
  saveStorageCloudRanking: /Save|Storage|Cloud|Firebase|Ranking|^(?:save|load|persist|normalize).*(?:State|Record|Wallet|Coins|CoinAmount)/,
  publicMechAllowlistAndHangar: /PlayerMech|MechHangar|MutationAtlas/,
  coreOwnerAndMovementIntegration: /^(?:isUmbraCoreContextActive|isUmbraCoreSkillOwnerValid|getUmbraSelectedCoreId|getUmbraControlOwner|isUmbraControlOwnerActive|initializeUmbraControlOwner|isUmbraControlRecordValid|pruneUmbraControlContributions|applyUmbraControlHit|getUmbraControlSpeedMultiplier)$/
};
const protectedMethods = Object.fromEntries(Object.entries(protectedGroups).map(([group, re]) => {
  const names = [...before.keys()].filter(name => re.test(name));
  const differences = names.filter(name => !after.get(name)?.equals(before.get(name)));
  const allowed = group === "coreOwnerAndMovementIntegration" ? authorizedChanges.coreFinalIntegration : [];
  return [group, { count: names.length, names, differences, authorizedDifferences: differences.filter(name => allowed.includes(name)),
    unexpectedDifferences: differences.filter(name => !allowed.includes(name)) }];
}));
// Check the two allowed Core changes as exact edits, not merely by function name.
const text = (map, name) => map.get(name).toString("utf8");
const nl = text(before, "pruneUmbraControlContributions").includes("\r\n") ? "\r\n" : "\n";
const expectedPrune = text(before, "pruneUmbraControlContributions").replace(`{${nl}`,
  `{${nl}    this.pruneUmbraFinalFields?.(skillId, runtime);${nl}`);
const expectedControlGetter = text(before, "getUmbraControlSpeedMultiplier")
  .replace(`      if (!owner?.controlContributions?.has(enemy)) continue;${nl}`, "")
  .replace(`      }${nl}    }${nl}    return multiplier;`,
    `      }${nl}      multiplier = Math.min(multiplier, this.getUmbraFinalFieldSpeedMultiplier?.(skillId, owner, enemy) ?? 1);${nl}    }${nl}    return multiplier;`);
const coreExactEdits = {
  pruneAddsOnlyFinalFieldPrune: expectedPrune === text(after, "pruneUmbraControlContributions"),
  getterRemovesMainOnlyEarlyExitAndAddsIndependentFieldMin: expectedControlGetter === text(after, "getUmbraControlSpeedMultiplier")
};
const oldSource = baselineBytes.get("game.js").toString("utf8"), newSource = currentBytes.get("game.js").toString("utf8");
const constantNames = [...oldSource.matchAll(/^const ([A-Z][A-Z0-9_]*) =/gm)].map(match => match[1]).filter(name =>
  /^(?:AC_|PLAYER_MECH_|DEFAULT_PLAYER_MECH_|REGALIA_BASTION_|SKILL_MUTATION_|MUTATION_ATLAS_|UMBRA_AIR_BRAKE_|UMBRA_BOOST_TRACE_|UMBRA_SKILL_CORE_)/.test(name)
  || /(?:STORAGE|SESSION)_KEYS?$/.test(name));
const constants = constantNames.map(name => {
  const old = declaration(oldSource, name), current = declaration(newSource, name);
  return { name, beforeSha256: hash(old), currentSha256: hash(current), equal: old.equals(current) };
});
const globalBootSection = source => Buffer.from(source.slice(source.indexOf("function isCommsStoryDebugResetRequested()"), source.indexOf("const LEVEL_UP_RAPID_SIGIL_MIN_INTERVAL_MS")));
const globalBootStorageUnchanged = globalBootSection(oldSource).equals(globalBootSection(newSource));
const fixtureConstants = [["umbraDriveFixtures.js", "FIXTURES"], ["umbraDriveFixtures.js", "MECH_IDS"], ["umbraDriveRuntime.js", "methods"]]
  .map(([file, name]) => {
    const old = declaration(baselineBytes.get(file).toString("utf8"), name), current = declaration(currentBytes.get(file).toString("utf8"), name);
    return { file, name, baselineSha256: hash(old), currentSha256: hash(current), equal: old.equals(current) };
  });
const mutableFiles = new Set(["README.md", "game.js", "index.html", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "docs/umbra-phase6c1-report.md"]);
// The UI agent extends this existing fixture for Final presentation tests. Keep
// every original test/assertion verbatim; permit only these three fixture edits
// and appended tests. Do not exempt the whole existing test file from review.
const arenaTest = "tests/umbra-phantomnova-arena.test.cjs";
const oldArena = baselineBytes.get(arenaTest).toString("utf8");
const arenaNl = oldArena.includes("\r\n") ? "\r\n" : "\n";
const expectedArenaPrefix = oldArena
  .replace("missingImage = false, growth = false, core = false } = {})", "missingImage = false, growth = false, core = false, final = false } = {})")
  .replace("    getUmbraPhantomNovaVisualState() { return this.umbraPhantomNovaRuntime; }",
    `    getUmbraPhantomNovaVisualState() { return this.umbraPhantomNovaRuntime; },${arenaNl}    getUmbraFinalVisualState() { return this.finalView || { owners: [], fields: [] }; }`)
  .replace("novaSlots, umbraGrowth: growth, umbraCore: core };", "novaSlots, umbraGrowth: growth, umbraCore: core, umbraFinal: final };");
const currentArena = currentBytes.get(arenaTest).toString("utf8");
const authorizedArenaExtension = currentArena.startsWith(expectedArenaPrefix)
  && /^\s*test\("Final NOVA presentation/.test(currentArena.slice(expectedArenaPrefix.length));
const testExtensionAudit = { name: arenaTest, originalTestsAndAssertionsRetained: authorizedArenaExtension,
  allowedFixtureEdits: ["optional final=false fixture flag", "read-only getUmbraFinalVisualState stub", "umbraFinal bridge flag"],
  appendedTests: authorizedArenaExtension ? [...currentArena.slice(expectedArenaPrefix.length).matchAll(/^test\("([^"]+)"/gm)].map(match => match[1]) : [] };
if (authorizedArenaExtension) mutableFiles.add(arenaTest);
const files = frozen.map(({ name, expected }) => ({ name, expected, baselineSha256: hash(baselineBytes.get(name)),
  currentSha256: currentBytes.get(name) ? hash(currentBytes.get(name)) : null, authorizedFileScope: mutableFiles.has(name) }));
const protectedFiles = files.filter(file => !file.authorizedFileScope);
const pngs = files.filter(file => /\.png$/i.test(file.name));
const currentIndex = currentBytes.get("index.html").toString("utf8"), oldIndex = baselineBytes.get("index.html").toString("utf8");
const indexOnlyScriptVersionChanged = oldIndex.replace("./game.js?v=umbra-phase6c1-ap-zero-v1", "./game.js?v=umbra-phase6c2-v1") === currentIndex;
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const finalManifestPath = path.join(start, "final-sources-v1.json");
const finalFreeze = fs.existsSync(finalManifestPath) ? Object.entries(JSON.parse(fs.readFileSync(finalManifestPath, "utf8")))
  .map(([name, expected]) => ({ name, expected, current: hash(currentBytes.get(name) || read(root, name)) })) : [];
const result = {
  at: new Date().toISOString(), baseline, sourceRoot: root, head, startHead: manifest.head,
  harnessSha256: hash(read(root, "tests/umbra-final-preservation.cjs")), manifestSha256: hash(read(start, "start-manifest.json")),
  baselineGameSha256: hash(baselineBytes.get("game.js")), sourceGameSha256: hash(currentBytes.get("game.js")),
  methodology: "Byte comparison against the 117-file Phase6C2 start manifest (6C1 plus AP0 correction b04b8). Capture files once; VM only defines classes/constants and never starts a game. Method source includes original comments and CR/LF; no whitespace normalization. Full files protect Stage definitions, assets, vendor, AGENTS, rules, historical tests/docs. Only the two exact Core Final integration edits are allowed within protected functions. This does not establish runtime or browser behavior.",
  methods: { beforeCount: before.size, currentCount: after.size, identicalCount: identical.length, changed, removed, added,
    classifications: Object.fromEntries(Object.entries(authorizedChanges).map(([group, names]) => [group, changed.filter(name => names.includes(name))])),
    unexpectedChanged: changed.filter(name => !allowedNames.has(name)), unexpectedAdded: added.filter(name => !/Umbra.*Final|^getUmbraNextMutationRequest$/.test(name)),
    protected: protectedMethods, hashes: Object.fromEntries([...before].map(([name, value]) => [name, { baseline: hash(value), current: after.has(name) ? hash(after.get(name)) : null }])) },
  coreExactEdits, constants, fixtureConstants, globalBootStorageUnchanged, indexOnlyScriptVersionChanged, testExtensionAudit, finalFreeze, files,
  baselineFileCount: files.length, protectedFileCount: protectedFiles.length,
  protectedFileChanges: protectedFiles.filter(file => file.currentSha256 !== file.expected),
  baselineIntegrityFailures: files.filter(file => file.baselineSha256 !== file.expected),
  pngCount: pngs.length, pngChanges: pngs.filter(file => file.currentSha256 !== file.expected),
  changedExistingTests: files.filter(file => file.name.startsWith("tests/") && file.currentSha256 !== file.expected).map(file => file.name),
  stageDefinitionsByteIdentical: currentBytes.get("skillDefinitions.js").equals(baselineBytes.get("skillDefinitions.js"))
};
result.passed = head === manifest.head && result.baselineGameSha256 === expectedGame && result.baselineFileCount === 117
  && !result.baselineIntegrityFailures.length && !result.protectedFileChanges.length && result.pngCount === 27 && !result.pngChanges.length
  && !removed.length && !result.methods.unexpectedChanged.length && !result.methods.unexpectedAdded.length
  && Object.values(protectedMethods).every(group => group.count > 0 && !group.unexpectedDifferences.length)
  && Object.values(coreExactEdits).every(Boolean) && constants.every(item => item.equal) && globalBootStorageUnchanged
  && fixtureConstants.every(item => item.equal) && finalFreeze.every(item => item.expected === item.current)
  && result.stageDefinitionsByteIdentical && indexOnlyScriptVersionChanged && authorizedArenaExtension;
fs.mkdirSync(evidence, { recursive: true });
const output = path.join(evidence, `preservation-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(output, JSON.stringify(result, null, 2), { flag: "wx" });
console.log(JSON.stringify({ output, passed: result.passed, sourceGameSha256: result.sourceGameSha256,
  methods: { before: before.size, current: after.size, identical: identical.length, changed: changed.length, added: added.length,
    unexpectedChanged: result.methods.unexpectedChanged, unexpectedAdded: result.methods.unexpectedAdded,
    protected: Object.fromEntries(Object.entries(protectedMethods).map(([name, group]) => [name, { count: group.count, differences: group.differences, unexpected: group.unexpectedDifferences }])) },
  coreExactEdits, constantCount: constants.length, constantChanges: constants.filter(item => !item.equal), globalBootStorageUnchanged,
  baselineFileCount: files.length, protectedFileCount: protectedFiles.length, protectedFileChanges: result.protectedFileChanges,
  baselineIntegrityFailures: result.baselineIntegrityFailures, pngCount: pngs.length, pngChanges: result.pngChanges,
  indexOnlyScriptVersionChanged, fixtureConstants, finalFreezeMatches: finalFreeze.length > 0 && finalFreeze.every(item => item.expected === item.current),
  testExtensionAudit, changedExistingTests: result.changedExistingTests }, null, 2));
if (!result.passed) process.exitCode = 1;
