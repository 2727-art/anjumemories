"use strict";
// Local HTTP bytes against the frozen delivery manifest plus the 27 unchanged
// starting PNGs. No public route, authentication or persistent game data.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."), out = process.env.UMBRA_TEST_OUTPUT || path.join(root, ".tmp_umbra_phase6c2/2026-09-08-start");
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const read = name => JSON.parse(fs.readFileSync(name, "utf8").replace(/^\uFEFF/, ""));
const manifestPath = process.env.UMBRA_TEST_MANIFEST || path.join(out, "final-sources-v1.json");
const expected = read(manifestPath), start = read(path.join(root, ".tmp_umbra_phase6c2/2026-09-08-start/start-manifest.json"));
for (const [name, hash] of Object.entries(start.hashes)) {
  const normalized = name.replaceAll("\\", "/");
  if (normalized.startsWith("画像/player/KGK-02_UMBRA_SERAPH/") && normalized.endsWith(".png")) expected[normalized] = hash;
}
(async () => {
  fs.mkdirSync(out, { recursive: true }); const rows = [];
  for (const [name, hash] of Object.entries(expected)) {
    const local = fs.readFileSync(path.join(root, name));
    const response = await fetch("http://127.0.0.1:4173/" + name.split("/").map(encodeURIComponent).join("/") + "?audit=umbra-phase6c2-v1");
    const served = Buffer.from(await response.arrayBuffer());
    rows.push({ name, expected: hash, local: sha(local), served: sha(served), status: response.status, bytes: local.length,
      passed: response.status === 200 && sha(local) === hash && local.equals(served) });
  }
  const result = { at: new Date().toISOString(), harnessSha256: sha(fs.readFileSync(__filename)), manifestSha256: sha(fs.readFileSync(manifestPath)),
    rows, passed: rows.every(row => row.passed) };
  const file = path.join(out, `http-${Date.now()}.json`); fs.writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ file, passed: result.passed, count: rows.length, failures: rows.filter(row => !row.passed) }));
  if (!result.passed) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
