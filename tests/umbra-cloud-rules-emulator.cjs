"use strict";
// Local emulator only. Start the already installed Firestore jar with the
// repository rules on 127.0.0.1:8189; this script never contacts a Firebase host.
const assert = require("node:assert/strict");
const project = "demo-umbra-save-test", base = "http://127.0.0.1:8189";
const db = `projects/${project}/databases/(default)`;
const capabilities = ["umbra-owned-v1", "umbra-atlas-v1", "umbra-archive-v2", "progression-journal-v1"];
function token(uid, provider = "google.com") {
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ aud: project, iss: `https://securetoken.google.com/${project}`, sub: uid, user_id: uid, iat: now, exp: now + 3600, firebase: { sign_in_provider: provider } })}.`;
}
function field(value) {
  if (typeof value === "number") return { integerValue: String(value) };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, field(entry)])) } };
}
async function commit({ owner, actor = owner, provider = "google.com", schema = 2, revision = 1, caps = capabilities, omit = "", segmentSchema = schema }) {
  const root = `${db}/documents/playerCloudSaves/${owner}`;
  const documents = [[root, { schemaVersion: schema, revision, clientUpdatedAt: Date.now(), ...(schema === 2 ? { minWriterVersion: 2, requiredCapabilities: caps } : {}) }],
    ...["core", "equipment", "archive"].filter(id => id !== omit).map(id => [`${root}/segments/${id}`, { schemaVersion: segmentSchema, revision, data: { marker: id } }])];
  const writes = documents.map(([name, data]) => ({ update: { name, fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, field(value)])) }, updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }] }));
  const response = await fetch(`${base}/v1/${db}/documents:commit`, { method: "POST", headers: { Authorization: `Bearer ${token(actor, provider)}`, "Content-Type": "application/json" }, body: JSON.stringify({ writes }) });
  return { status: response.status, body: await response.json() };
}
(async () => {
  const owner = `synthetic-${Date.now()}`;
  const cases = [
    ["old schema1 initial create", { schema: 1 }, 200],
    ["schema1 to schema2 atomic migration", { schema: 2, revision: 2 }, 200],
    ["old writer schema2 to schema1 downgrade denied", { schema: 1, revision: 3 }, 403],
    ["schema2 next revision", { schema: 2, revision: 3 }, 200],
    ["required capability omitted", { revision: 4, caps: capabilities.slice(1) }, 403],
    ["mixed segment schema", { revision: 4, segmentSchema: 1 }, 403],
    ["partial three-segment write", { revision: 4, omit: "archive" }, 403],
    ["stale revision", { revision: 3 }, 403],
    ["different account denied", { revision: 4, actor: "another-synthetic-user" }, 403],
    ["anonymous account denied", { revision: 4, provider: "anonymous" }, 403]
  ];
  const results = [];
  for (const [name, options, expected] of cases) {
    const actual = await commit({ owner, ...options });
    assert.equal(actual.status, expected, `${name}: ${JSON.stringify(actual.body)}`);
    results.push({ name, status: actual.status });
  }
  process.stdout.write(JSON.stringify({ project, endpoint: base, rules: "firestore.rules", results, passed: results.length }, null, 2) + "\n");
})().catch(error => { console.error(error); process.exitCode = 1; });
