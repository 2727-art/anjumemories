"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."), dir = process.env.UMBRA_MOBILITY_EVIDENCE;
if (!dir) throw Error("UMBRA_MOBILITY_EVIDENCE must name this trial's baseline directory");
const sha = v => crypto.createHash("sha256").update(v).digest("hex");
const start = JSON.parse(fs.readFileSync(path.join(dir, "start-manifest.json"), "utf8").replace(/^\uFEFF/, ""));
const files = start.map(row => ({ path: row.path, before: row.sha256.toLowerCase(),
  after: sha(fs.readFileSync(path.join(root, row.path))) }));
const changed = files.filter(row => row.before !== row.after);
const expected = new Set(["README.md", "game.js", "umbraIntegrationBootstrap.js", "umbra-integration.html", "umbraDriveRuntime.js"]);
for (const row of changed) assert.ok(expected.has(row.path), `Unintended baseline file change: ${row.path}`);
const old = fs.readFileSync(path.join(dir, "baseline/game.js"), "utf8"), current = fs.readFileSync(path.join(root, "game.js"), "utf8");
function methods(source) {
  const result = new Map();
  for (const m of source.matchAll(/^  (?:async )?(\w+)\([^\n]*\) \{\r?\n/gm)) {
    const end = source.indexOf("\n  }", m.index + m[0].length);
    if (end < 0) throw Error(`No method end: ${m[1]}`);
    result.set(m[1], source.slice(m.index, end + 4).replace(/\r\n/g, "\n"));
  }
  return result;
}
const before = methods(old), after = methods(current), methodChanges = [];
for (const [name, body] of before) if (after.get(name) !== body) methodChanges.push(name);
const allowed = new Set([
  "updateUmbraNormalPresentation", "drawUmbraMoonReachGuide", "prepareUmbraNormalRunContext", "captureUmbraNormalEndSnapshot",
  "initializeUmbraPhantomNovaRuntime", "prepareUmbraPhantomNovaFrame", "handleUmbraPhantomNovaDepthChange", "commitUmbraPhantomNovaReservation", "observeUmbraPhantomNovaStep",
  "initializeUmbraMoonlightRuntime", "destroyUmbraMoonlightRuntime", "receiveUmbraMoonlightTrace", "processUmbraMoonlightStep", "applyUmbraMoonlightHit", "getUmbraMoonlightSnapshot",
  "applyDamageToPlayer", "getUmbraMoonlightReachMultiplier", "buildUmbraPlayerCardModel"
]);
for (const name of methodChanges) assert.ok(allowed.has(name), `Unintended method change: ${name}`);
const receiver = body => body.replace("    if (this.isPlayerProtectedByUmbraNovaField?.()) return false;\n\n", "");
assert.equal(receiver(after.get("applyDamageToPlayer")), before.get("applyDamageToPlayer"), "All old damage/EN/Evade/barrier/AP logic unchanged below guard");
const movement = [...before.keys()].filter(n => /AcAirBrake|AcPlayerMovement|AcContinuousBoost|AcEvade|BoostTrace/.test(n));
for (const name of movement) assert.equal(after.get(name), before.get(name), `${name}: movement and shared trace unchanged`);
const output = { passed: true, recordedBaselineFiles: files.length, unchangedFiles: files.length - changed.length, changed,
  examinedMethods: before.size, unchangedMethods: before.size - methodChanges.length, methodChanges,
  movementAndTraceMethodsUnchanged: movement, newMethods: [...after.keys()].filter(n => !before.has(n)),
  limitations: "Method extraction uses method-indent boundaries and complements code review, not an AST equivalence proof. Stage, vendor and assets are not modified by this patch; baseline file coverage is explicitly listed." };
fs.writeFileSync(path.join(dir, "preservation.json"), JSON.stringify(output, null, 2));
console.log(JSON.stringify({ passed: true, files: output.recordedBaselineFiles, unchanged: output.unchangedFiles, changed: changed.map(r => r.path), methods: before.size, methodChanges, movementAndTrace: movement.length }));
