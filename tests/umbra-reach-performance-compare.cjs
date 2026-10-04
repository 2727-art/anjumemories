"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
const baseline = process.env.UMBRA_REACH_BASELINE_SOURCE, current = process.env.UMBRA_REACH_CURRENT_SOURCE, out = process.env.UMBRA_TEST_OUTPUT;
if (!baseline || !current || !out || fs.existsSync(out)) throw Error("Explicit two source roots and fresh output required");
fs.mkdirSync(out, { recursive: true });
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex"), worker = path.join(__dirname, "umbra-reach-performance-browser.cjs");
const report = { createdAt: new Date().toISOString(), runnerSha256: sha(fs.readFileSync(__filename)), workerSha256: sha(fs.readFileSync(worker)),
  methodology: "Three sequential normal-rAF workers with identical intentional preparation/input/display settings. Baseline/current versus new/current separates UI revision from explicit reach expansion; held-card intervals isolate paused card work. Current versus wide uses the same new UI. Start state, real Opening selections, fixed and natural enemy placement, logical canvas and clocks are compared strictly, without a new coordinate tolerance. Ending hit/kill/work counts may differ, especially for wide. Measured CPU differences are not attributed solely to text or reach when preparation or actual battle workload differs. First rAF-start offset remains outside adjacent-frame statistics. Old results never overwritten.",
  runs: [], comparisons: [], errors: [] };
function slimSelection(r) {
  return r.selections.map(c => { const v = c.before.cards[c.index]; return { type: v.type, id: v.id ?? null, skillId: v.skillId ?? null, choiceId: v.choiceId ?? null }; });
}
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])]));
  return v;
}
const equal = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
function initial(r) {
  const s = r.preBattle, effective = { ...s.effective }; delete effective.passageRadius; delete effective.exitRadius;
  return { stage: s.stage, depth: s.depth, player: s.player, stats: s.stats, skills: s.skills, clock: s.clock,
    pending: s.pending, opening: s.opening, worldPaused: s.worldPaused, effectiveExceptReach: effective,
    choices: slimSelection(r), fixedEnemies: r.fixedEnemies, initialEnemies: r.initialEnemies };
}
function compare(a, b, meaning) {
  const left = a.result, right = b.result, ai = initial(left), bi = initial(right), lseg = left.segments[1], rseg = right.segments[1];
  const sharedStartFields = Object.keys(ai).map(key => ({ key, equal: equal(ai[key], bi[key]) }));
  const inputIntent = r => r.inputs.map(i => ({ nominalMs: i.nominalMs, direction: i.direction, boost: i.boost }));
  return { left: a.mode, right: b.mode, meaning, sharedStartFields, strictInitialMatch: sharedStartFields.every(x => x.equal),
    sameIntentionalInput: equal(inputIntent(left), inputIntent(right)), sameLogicalCanvas: equal(left.preBattle.display.logical, right.preBattle.display.logical),
    sameDisplaySettings: equal(left.preBattle.display, right.preBattle.display), leftDisplay: left.preBattle.display, rightDisplay: right.preBattle.display,
    radius: [left.preBattle.effective.passageRadius, right.preBattle.effective.passageRadius], exitRadius: [left.preBattle.effective.exitRadius, right.preBattle.effective.exitRadius],
    combat: { left: { cpu: lseg.cpuSummary, raf: lseg.rafSummary, firstRaf: lseg.firstRafOffset, initial: lseg.initial, final: lseg.final },
      right: { cpu: rseg.cpuSummary, raf: rseg.rafSummary, firstRaf: rseg.firstRafOffset, initial: rseg.initial, final: rseg.final } },
    card: { left: left.segments[0].cpuSummary, right: right.segments[0].cpuSummary,
      sameOptions: equal(left.firstCard.cards.map(c => ({ type:c.type,id:c.id,skillId:c.skillId })), right.firstCard.cards.map(c => ({ type:c.type,id:c.id,skillId:c.skillId }))) },
    endCountsEqual: equal(lseg.final.counts, rseg.final.counts), actualInputTimes: { left: left.inputs.map(i => i.actualMs), right: right.inputs.map(i => i.actualMs) },
    interpretation: "No outlier removal and no CPU/FPS/GPU or human balance acceptance. Initial equivalence and actual workload/timing must be considered before causal attribution." };
}
(async () => {
  for (const [mode, sourceRoot] of [["baseline", baseline], ["current", current], ["wide", current]]) {
    const folder = path.join(out, mode), env = { ...process.env, UMBRA_TEST_SOURCE_ROOT: sourceRoot, UMBRA_TEST_OUTPUT: folder, UMBRA_REACH_MODE: mode };
    for (const key of ["UMBRA_TEST_FIXTURE", "UMBRA_TEST_STRATEGY", "UMBRA_TEST_MODE"]) delete env[key];
    const log = fs.createWriteStream(path.join(out, `${mode}.execution.log`), { flags: "wx" });
    const record = { mode, sourceRoot, startedAt: new Date().toISOString() }; console.log(JSON.stringify({ starting: mode }));
    const status = await new Promise((resolve, reject) => {
      const child = cp.spawn(process.execPath, [worker], { cwd: path.resolve(__dirname, ".."), env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
      record.ownedWorkerPid = child.pid;
      const deadline = setTimeout(() => {
        record.termination = { reason: "150s worker deadline; preserve reports and stop this owned process tree only", at: new Date().toISOString(), pid: child.pid };
        fs.writeFileSync(path.join(out, `${mode}.deadline.json`), JSON.stringify(record.termination, null, 2), { flag: "wx" });
        if (process.platform === "win32") cp.spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, encoding: "utf8" });
        else child.kill("SIGTERM");
      }, 150000);
      child.stdout.on("data", b => { log.write(b); process.stdout.write(b); }); child.stderr.on("data", b => { log.write(b); process.stderr.write(b); });
      child.on("error", error => { clearTimeout(deadline); reject(error); }); child.on("close", (code, signal) => { clearTimeout(deadline); resolve({ code, signal }); });
    });
    await new Promise(resolve => log.end(resolve)); Object.assign(record, { endedAt: new Date().toISOString(), ...status });
    const file = path.join(folder, "reach-performance.json");
    if (fs.existsSync(file)) { const bytes = fs.readFileSync(file); record.file = file; record.reportSha256 = sha(bytes); record.result = JSON.parse(bytes); }
    report.runs.push(record); fs.appendFileSync(path.join(out, "queue.jsonl"), JSON.stringify({ ...record, result: undefined }) + "\n");
    if (status.code !== 0 || !record.result?.passed) { report.errors.push(`Worker ${mode} failed; no further workers run automatically`); break; }
  }
  if (report.runs.length === 3) {
    report.comparisons.push(compare(report.runs[0], report.runs[1], "UI revision with current radius"));
    report.comparisons.push(compare(report.runs[1], report.runs[2], "Explicit wide proposal with identical new UI"));
  }
  report.functionalPassed = report.runs.length === 3 && report.runs.every(r => r.code === 0 && r.result?.passed);
  report.matchedPreparation = report.comparisons.length === 2 && report.comparisons.every(c => c.strictInitialMatch && c.sameIntentionalInput && c.sameLogicalCanvas
    && (c.left !== "current" || c.right !== "wide" || c.sameDisplaySettings));
  report.passed = report.functionalPassed && report.matchedPreparation && !report.errors.length;
  const output = path.join(out, "reach-performance-comparison.json"); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: "wx" });
  console.log(JSON.stringify({ passed: report.passed, functionalPassed: report.functionalPassed, matchedPreparation: report.matchedPreparation,
    comparisons: report.comparisons.map(c => ({ left: c.left, right: c.right, initial: c.strictInitialMatch, mismatches: c.sharedStartFields.filter(f => !f.equal), display: c.sameDisplaySettings })), output }));
  if (!report.passed) process.exitCode = 1;
})().catch(error => { fs.writeFileSync(path.join(out, "runner-error.txt"), error.stack, { flag: "wx" }); console.error(error); process.exitCode = 1; });
