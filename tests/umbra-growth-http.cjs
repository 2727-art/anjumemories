"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const root = path.resolve(__dirname, ".."), out = process.env.UMBRA_TEST_OUTPUT || path.join(root, ".tmp_umbra_phase6b/2026-09-07T10-12-15-846Z");
const manifest = JSON.parse(fs.readFileSync(process.env.UMBRA_TEST_MANIFEST || path.join(out, "final-sources-v3.json"), "utf8").replace(/^\uFEFF/, ""));
const start = JSON.parse(fs.readFileSync(path.join(out, "start-manifest.json"), "utf8"));
const names = [...Object.keys(manifest), ...Object.keys(start.hashes).filter(n => n.startsWith("画像/player/KGK-02_UMBRA_SERAPH/") && n.endsWith(".png"))];
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
(async () => {
  const rows = [];
  for (const name of names) {
    const expected = manifest[name] || start.hashes[name], local = sha(fs.readFileSync(path.join(root, name)));
    const url = "http://127.0.0.1:4173/" + name.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(url), body = Buffer.from(await response.arrayBuffer()), served = sha(body);
    rows.push({ name, status: response.status, expected, local, served, bytes: body.length,
      passed: response.status === 200 && expected === local && local === served });
  }
  const result = { at: new Date().toISOString(), harnessSha256: sha(fs.readFileSync(__filename)), rows, passed: rows.every(r => r.passed) };
  const filename = path.join(out, `http-${Date.now()}.json`); fs.writeFileSync(filename, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ filename, passed: result.passed, count: rows.length, failed: rows.filter(r => !r.passed) }));
  if (!result.passed) process.exitCode = 1;
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
