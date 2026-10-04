"use strict";

// Read-only audit of already captured browser data. No Playwright, server,
// browser, product source edits, or write access to any input run is used.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, "..");
const sourceNames = ["index.html", "game.js", "skillDefinitions.js", "stageDefinitions.js", "equipmentDefinitions.js",
  "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js", "vendor/phaser.min.js"];
const combatExcluded = new Set(["lastProcessingMs", "maxProcessingMs", "totalProcessingMs"]);
const idFields = new Set(["lifeId", "targetLifeId", "castId"]);
const sha = buffer => crypto.createHash("sha256").update(buffer).digest("hex");
const hashFile = file => sha(fs.readFileSync(file));
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function normalizedLeaf(value, key, combat) {
  if (!combat) return value;
  if (key === "runGeneration") return 0;
  if (idFields.has(key) && typeof value === "string" && /^\d+:\d+(?::\d+)?$/.test(value)) return value.replace(/^\d+:/, "0:");
  return value;
}

function small(value) {
  if (value === undefined) return { type: "undefined" };
  if (typeof value === "string") return value.length > 240 ? { type: "string", length: value.length, prefix: value.slice(0, 240) } : value;
  if (!value || typeof value !== "object") return value;
  return Array.isArray(value) ? { type: "array", length: value.length }
    : { type: "object", keys: Object.keys(value).slice(0, 10), keyCount: Object.keys(value).length };
}

// Same JSON equality/normalization as the original harness. Stop at the first
// actual leaf difference; never hand a large tree to AssertionError's formatter.
function firstDifference(before, after, at = "$", combat = false, key = "") {
  const left = normalizedLeaf(before, key, combat), right = normalizedLeaf(after, key, combat);
  if (Object.is(left, right)) return null;
  const mismatch = reason => ({ path: at, reason, baseline: small(left), current: small(right) });
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return mismatch("value");
  if (Array.isArray(left) !== Array.isArray(right)) return mismatch("type");
  if (Array.isArray(left)) {
    if (left.length !== right.length) return { path: `${at}.length`, reason: "length", baseline: left.length, current: right.length };
    for (let i = 0; i < left.length; i++) {
      const difference = firstDifference(left[i], right[i], `${at}[${i}]`, combat, String(i));
      if (difference) return difference;
    }
    return null;
  }
  const keys = Object.keys(left).filter(name => !combat || !combatExcluded.has(name));
  for (const name of keys) {
    if (!own(right, name)) return { path: `${at}.${name}`, reason: "missing-current-key", baseline: small(left[name]), current: { type: "undefined" } };
    const difference = firstDifference(left[name], right[name], `${at}.${name}`, combat, name);
    if (difference) return difference;
  }
  for (const name of Object.keys(right)) if ((!combat || !combatExcluded.has(name)) && !own(left, name))
    return { path: `${at}.${name}`, reason: "extra-current-key", baseline: { type: "undefined" }, current: small(right[name]) };
  return null;
}

function compareRunsLimited(before, after) {
  const fields = ["inputs", "rows", "physicsRows", "normalizedTrace", "counters", "fixtureComposition"];
  if (before.kind === "combat") fields.push("combatRows", "combatFinal");
  return fields.map(field => ({ field, difference: firstDifference(before[field], after[field], field, field.startsWith("combat")) }));
}

function assertRunParity(before, after) {
  const sections = compareRunsLimited(before, after), failure = sections.find(section => section.difference);
  if (failure) throw new Error(`${after.key}: ${JSON.stringify(failure.difference)}`);
}

// Extra diagnosis never changes the original all-fields verdict above.
function diagnoseCombat(before, after) {
  if (before.kind !== "combat") return null;
  const projections = {
    moonSnapshots: row => row.moon.snapshot,
    moonLivingRecords: row => row.moon.lives,
    spikeDamageCounts: row => row.spike.snapshot.counts,
    spikeLivingRecords: row => row.spike.lives,
    aliveEnemyHpAndBodies: row => row.enemies.filter(enemy => enemy.active && !enemy.dying && enemy.hp > 0),
    runStats: row => row.runStats,
    xpDrops: row => row.xpDrops,
    spikeSchedule: row => {
      const s = row.spike.snapshot;
      const cast = value => value && Object.fromEntries(Object.entries(value).filter(([key]) => key !== "skips"));
      return { combatTimeMs: s.combatTimeMs, nextCastAtMs: s.nextCastAtMs, nextCastRemainingMs: s.nextCastRemainingMs,
        casts: s.casts.map(cast), lastCast: cast(s.lastCast), lastImpact: cast(s.lastImpact),
        castHistory: s.castHistory.map(cast), impactHistory: s.impactHistory.map(cast) };
    }
  };
  const comparison = Object.fromEntries(Object.entries(projections).map(([name, projectRow]) => [name,
    firstDifference(before.combatRows.map(projectRow), after.combatRows.map(projectRow), name, true)]));
  const deathTimeline = run => {
    const deaths = new Map();
    run.combatRows.forEach((row, index) => {
      for (const enemy of row.enemies) if ((enemy.dying || enemy.hp <= 0) && !deaths.has(enemy.id))
        deaths.set(enemy.id, { id: enemy.id, deathRow: index, deathTimeMs: run.rows[index].timelineMs, hp: enemy.hp,
          removedRow: null, removedTimeMs: null });
      for (const death of deaths.values()) if (death.removedRow === null && !row.enemies.some(enemy => enemy.id === death.id)) {
        death.removedRow = index; death.removedTimeMs = run.rows[index].timelineMs;
      }
    });
    return [...deaths.values()];
  };
  return { note: "Supplemental projections identify causes only; skips/dead-object lifetime remain strict failures in the original sections.", comparison,
    deaths: { baseline: deathTimeline(before), current: deathTimeline(after) },
    finalSpikeSkips: { baseline: before.combatFinal.spike.snapshot.skips, current: after.combatFinal.spike.snapshot.skips } };
}

function verifySourceEvidence() {
  const root = path.join(project, ".tmp_umbra_phase5"), archive = path.join(root, "parity-offline-audit", "umbra-nova-baseline-parity.original-6a1e41eb.cjs");
  const manifestPath = path.join(root, "final-source-hashes.json"), testedPath = path.join(root, "final-tested-file-hashes.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")), tested = JSON.parse(fs.readFileSync(testedPath, "utf8"));
  const sourceEvidence = sourceNames.map(name => {
    const baseline = hashFile(path.join(root, "baseline", name)), current = hashFile(path.join(project, name));
    const frozen = hashFile(path.join(root, "final-source", name));
    const before = manifest.find(entry => entry.path === name)?.sha256, after = tested.find(entry => entry.path === name)?.sha256;
    return { name, baseline, current, frozen, preMeasurementManifest: before, postMeasurementManifest: after ?? null,
      postMeasurementEvidence: after ? "Recorded manifest plus independent current read" : "Independent current read (file absent from partial post manifest)",
      pass: !!before && before === frozen && frozen === current && (!after || after === current) };
  });
  const originalHarnessSha256 = hashFile(archive);
  return { sourceEvidence, pass: sourceEvidence.every(item => item.pass)
      && originalHarnessSha256 === "6a1e41eb748169ebf69a5e048e86b9a08a39ad89dc2b696f51932e9dd5b978cb",
    originalHarness: { file: archive, sha256: originalHarnessSha256 },
    currentBrowserHarnessSha256: hashFile(path.join(project, "tests", "umbra-nova-baseline-parity.cjs")),
    manifests: [manifestPath, testedPath].map(file => ({ file, sha256: hashFile(file) })),
    interpretation: "Raw run files do not individually embed source hashes because the original process stopped before its final report. The source claim is therefore based on the independent pre/post measurement manifests, preserved final-source bytes, current bytes, and the archived original harness, whose hashes are explicitly cross-checked here." };
}

async function main() {
  const input = process.env.UMBRA_PARITY_INPUT || path.join(project, ".tmp_umbra_phase5", "baseline-parity");
  const prefix = process.env.UMBRA_PARITY_PREFIX || "2026-09-06T10-32-52-166Z";
  const output = process.env.UMBRA_PARITY_AUDIT_OUTPUT || path.join(project, ".tmp_umbra_phase5", "parity-offline-audit");
  fs.mkdirSync(output, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-"), progress = path.join(output, `${stamp}-pairs.jsonl`);
  fs.writeFileSync(progress, "", { flag: "wx" });
  const interruption = path.join(project, ".tmp_umbra_phase5", "parity-comparison-interruption.json");
  const started = performance.now();
  const report = { createdAt: new Date().toISOString(), input, prefix, progress, browserStarted: false,
    comparatorSha256: hashFile(__filename), interruption: { file: interruption, sha256: hashFile(interruption), ...JSON.parse(fs.readFileSync(interruption, "utf8")) },
    methodology: "Read exactly one baseline/current pair at a time. Preserve the original field list and combat normalization. Exact numbers, lengths, keys, sequence and timestamps; no epsilon, rounding, added exclusions or expected-value changes. For each section record only its first difference. Full input JSON is never rewritten. No giant assert diff formatting.",
    sourceEvidence: verifySourceEvidence(), pairs: [], errors: [], peakObservedRssBytes: 0, peakObservedHeapUsedBytes: 0 };
  try {
    const files = fs.readdirSync(input).filter(name => name.startsWith(prefix + "-") && /-(baseline|current-off|current-on)-(empty|combat)-/.test(name));
    report.rawFileCount = files.length;
    if (files.length !== 99) throw Error(`Expected all 99 raw runs, found ${files.length}`);
    const current = files.filter(name => name.includes("-current-off-") || name.includes("-current-on-")).sort();
    if (current.length !== 63) throw Error(`Expected 63 current comparisons, found ${current.length}`);
    for (const name of current) {
      // The function boundary makes only the bounded summary survive this pair.
      const result = (() => {
        const baselineName = name.replace(/-current-(?:off|on)-/, "-baseline-");
        const oldFile = path.join(input, baselineName), newFile = path.join(input, name);
        const oldBytes = fs.readFileSync(oldFile), newBytes = fs.readFileSync(newFile);
        const before = JSON.parse(oldBytes.toString("utf8")), after = JSON.parse(newBytes.toString("utf8"));
        const sections = compareRunsLimited(before, after), first = sections.find(section => section.difference)?.difference || null;
        return { key: after.key, variant: after.variant,
          files: { baseline: { file: oldFile, sha256: sha(oldBytes), bytes: oldBytes.length }, current: { file: newFile, sha256: sha(newBytes), bytes: newBytes.length } },
          browserValidation: { baseline: before.pass, current: after.pass, baselineError: before.error?.slice(0, 500), currentError: after.error?.slice(0, 500) },
          parityPass: !first, pass: !first && before.pass === true && after.pass === true, firstDifference: first, sections,
          combatDiagnosis: diagnoseCombat(before, after),
          coverageDiagnosis: before.pass === true && after.pass === true ? null : {
            baselineFirstCollision: before.rows?.find(row => row.collisionCount > 0),
            currentFirstCollision: after.rows?.find(row => row.collisionCount > 0),
            baselineAirBrakeSeen: before.rows?.some(row => row.airBrake.active),
            currentAirBrakeSeen: after.rows?.some(row => row.airBrake.active) },
          rows: { baseline: before.rows?.length, current: after.rows?.length, baselinePhysics: before.physicsRows?.length, currentPhysics: after.physicsRows?.length } };
      })();
      report.pairs.push(result); fs.appendFileSync(progress, JSON.stringify(result) + "\n");
      const usage = process.memoryUsage();
      report.peakObservedRssBytes = Math.max(report.peakObservedRssBytes, usage.rss);
      report.peakObservedHeapUsedBytes = Math.max(report.peakObservedHeapUsedBytes, usage.heapUsed);
      await new Promise(resolve => setImmediate(resolve));
      if (global.gc) global.gc();
    }
  } catch (error) { report.errors.push(String(error.stack).slice(0, 1600)); }
  report.durationMs = performance.now() - started;
  report.summary = { total: report.pairs.length, parityPass: report.pairs.filter(pair => pair.parityPass).length,
    passedPairs: report.pairs.filter(pair => pair.pass).length, different: report.pairs.filter(pair => !pair.parityPass).length,
    browserInvalid: report.pairs.filter(pair => pair.browserValidation.baseline !== true || pair.browserValidation.current !== true).length,
    mismatchFields: {} };
  for (const pair of report.pairs) for (const section of pair.sections) if (section.difference)
    report.summary.mismatchFields[section.field] = (report.summary.mismatchFields[section.field] || 0) + 1;
  report.pass = report.sourceEvidence.pass && !report.errors.length && report.summary.passedPairs === 63;
  const file = path.join(output, `${stamp}-offline-parity-report.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ pass: report.pass, ...report.summary, sourceEvidencePass: report.sourceEvidence.pass,
    durationMs: report.durationMs, peakObservedRssBytes: report.peakObservedRssBytes, file }));
  process.exitCode = report.pass ? 0 : 1;
}

if (require.main === module) {
  if (process.argv.includes("--self-test")) {
    const assert = require("node:assert/strict");
    assert.equal(firstDifference({ values: [1, 2] }, { values: [1, 2] }), null);
    assert.deepEqual(firstDifference({ values: [1, 2] }, { values: [1, 2.0000000001] }),
      { path: "$.values[1]", reason: "value", baseline: 2, current: 2.0000000001 });
    assert.equal(firstDifference({ castId: "4:2:3", lifeId: "4:2", runGeneration: 4, lastProcessingMs: 999 },
      { castId: "9:2:3", lifeId: "9:2", runGeneration: 9, lastProcessingMs: 1 }, "$", true), null);
    assert.equal(firstDifference({ hp: 4 }, { hp: 3 }, "$", true).path, "$.hp");
    assert.equal(firstDifference({ passId: 2 }, { passId: 3 }, "$", true).path, "$.passId");
    assert.equal(firstDifference({ castId: "4:2:3" }, { castId: "9:2:4" }, "$", true).path, "$.castId");
    assert.equal(firstDifference({ x: 1 }, { x: 1, extra: 1 }).reason, "extra-current-key");
    console.log(JSON.stringify({ selfTest: true, browserStarted: false }));
  } else main().catch(error => { console.error(String(error.stack).slice(0, 2000)); process.exitCode = 1; });
}
module.exports = { firstDifference, compareRunsLimited, assertRunParity };
