"use strict";

// Pure numeric tests of the actual Scene geometry methods. No Phaser loop,
// browser, storage, image, or independently reimplemented attack is involved.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const start = source.indexOf("  // UMBRA MOONLIGHT geometry:");
const end = source.indexOf("  isUmbraBoostTraceEnabled()", start);
assert.ok(start > 0 && end > start);
const block = source.slice(start, end);
const context = vm.createContext({});
vm.runInContext(`class Geometry { ${block} } this.geometry = new Geometry();`, context);
const geometry = context.geometry;
const zero = Object.freeze({ x: 0, y: 0 });
const p = (x, y) => ({ x, y });
const circle = radius => ({ kind: "circle", radius });
const rect = (halfWidth, halfHeight) => ({ kind: "rect", halfWidth, halfHeight });
const plain = value => JSON.parse(JSON.stringify(value));
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const observations = [];
const sweep = (name, P0, P1, E0, E1, shape, radius = 60) => {
  const result = geometry.sweepUmbraMoonlightTarget(P0, P1, E0, E1, shape, radius);
  observations.push({ name, P0, P1, E0, E1, shape, radius, result: plain(result) });
  return result;
};

test("circle side pass, exact range boundary and outside range", () => {
  const inside = sweep("side-pass-no-body-contact", p(-200, 70), p(200, 70), zero, zero, circle(20));
  assert.equal(inside.hit, true);
  assert.equal(inside.startInside, false); assert.equal(inside.endInside, false);
  close(inside.enter, (200 - Math.sqrt(1500)) / 400);
  close(inside.exit, (200 + Math.sqrt(1500)) / 400);
  assert.ok(70 > 22 + 20, "fixture never contacts the player/enemy physical circles");
  const boundary = sweep("circle-exact-boundary", p(-200, 80), p(200, 80), zero, zero, circle(20));
  assert.equal(boundary.hit, true); close(boundary.enter, 0.5); close(boundary.exit, 0.5);
  assert.equal(sweep("circle-just-outside", p(-200, 80.0001), p(200, 80.0001), zero, zero, circle(20)).hit, false);
});

test("radius 60 and departure radius 72 stay independent of player radius 22", () => {
  const hit = sweep("outside-hit-radius", p(90, 0), p(91, 0), zero, zero, circle(20), 60);
  const exit = sweep("still-inside-departure-radius", p(90, 0), p(91, 0), zero, zero, circle(20), 72);
  assert.equal(hit.hit, false); assert.equal(exit.startInside, true); assert.equal(exit.endInside, true);
  const outside = sweep("confirmed-beyond-departure", p(93, 0), p(100, 0), zero, zero, circle(20), 72);
  assert.equal(outside.hit, false);
});

test("same-step relative crossing includes fast moving targets with distant endpoints", () => {
  const result = sweep("fast-moving-enemy-crossing", p(-1, 0), p(1, 0), p(-1000, 0), p(1000, 0), circle(20));
  assert.equal(result.hit, true); assert.equal(result.startInside, false); assert.equal(result.endInside, false);
  close(result.enter, (999 - 80) / 1998); close(result.exit, (999 + 80) / 1998);
  assert.equal(geometry.isUmbraMoonlightBroadPhaseCandidate(p(-1, 0), p(1, 0), p(-1000, 0), p(1000, 0), circle(20), 60), true);
  const cross = sweep("simultaneous-crossing", p(-100, 0), p(100, 0), p(0, -100), p(0, 100), circle(5), 10);
  assert.equal(cross.hit, true);
  const differentTimes = sweep("geometric-path-crossing-at-different-times", p(-100, 0), p(100, 0), p(0, -10), p(0, 190), circle(5), 10);
  assert.equal(differentTimes.hit, false);
});

test("equal velocities preserve relative separation, including an initial inside state", () => {
  const outside = sweep("equal-velocity-outside", zero, p(500, 0), p(0, 90), p(500, 90), circle(20));
  assert.equal(outside.hit, false);
  const inside = sweep("equal-velocity-inside", zero, p(500, 0), p(0, 70), p(500, 70), circle(20));
  assert.equal(inside.hit, true); close(inside.enter, 0); close(inside.exit, 1);
  assert.equal(inside.startInside, true); assert.equal(inside.endInside, true);
});

test("rounded rectangle corners reject expanded-AABB and circumscribed-circle false positives", () => {
  assert.equal(sweep("rect-expanded-box-corner-miss", p(79, 69), p(79.1, 69), zero, zero, rect(20, 10)).hit, false);
  assert.equal(sweep("large-thin-boss-circumcircle-miss", p(0, 100), p(1, 100), zero, zero, rect(100, 5)).hit, false);
  const top = sweep("rect-flat-top-tangent", p(-200, 70), p(200, 70), zero, zero, rect(20, 10));
  assert.equal(top.hit, true); close(top.enter, 0.45); close(top.exit, 0.55);
  const diagonal = 60 / Math.sqrt(2);
  assert.equal(sweep("rect-rounded-corner-boundary", p(20 + diagonal, 10 + diagonal), p(20 + diagonal, 10 + diagonal), zero, zero, rect(20, 10)).hit, true);
  assert.equal(sweep("rect-rounded-corner-outside", p(20 + diagonal + 0.001, 10 + diagonal + 0.001), p(20 + diagonal + 0.001, 10 + diagonal + 0.001), zero, zero, rect(20, 10)).hit, false);
  const odd = sweep("rect-fractional-half-extents", p(70.5, 0), p(70.5, 0), zero, zero, rect(10.5, 7.25));
  assert.equal(odd.hit, true);
});

test("first candidate positions use the common hit time and closest target surface", () => {
  const P0 = p(-200, 0), P1 = p(200, 0), E0 = p(0, 100), E1 = p(0, -100);
  const result = sweep("moving-hit-position", P0, P1, E0, E1, circle(20));
  assert.equal(result.hit, true);
  close(result.playerAtHit.x, -200 + 400 * result.enter);
  const center = p(0, 100 - 200 * result.enter);
  close(Math.hypot(result.targetAtHit.x - center.x, result.targetAtHit.y - center.y), 20);
  close(Math.hypot(result.playerAtHit.x - result.targetAtHit.x, result.playerAtHit.y - result.targetAtHit.y), 60);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.playerAtHit) && Object.isFrozen(result.targetAtHit));
  const r = sweep("rectangle-nearest-face-hit", p(-200, 0), p(200, 0), zero, zero, rect(20, 10));
  close(r.targetAtHit.x, -20); close(r.targetAtHit.y, 0);
});

test("invalid snapshots fail closed without image fallbacks or mutable references", () => {
  for (const args of [
    [null, zero, zero, zero, circle(20), 60],
    [p(NaN, 0), zero, zero, zero, circle(20), 60],
    [zero, zero, zero, zero, { kind: "sprite", width: 1000 }, 60],
    [zero, zero, zero, zero, rect(-1, 10), 60],
    [zero, zero, zero, zero, circle(20), -1]
  ]) {
    const result = geometry.sweepUmbraMoonlightTarget(...args);
    assert.deepEqual(plain(result), { hit: false, enter: null, exit: null, startInside: false, endInside: false, playerAtHit: null, targetAtHit: null });
    assert.equal(geometry.isUmbraMoonlightBroadPhaseCandidate(...args), false);
  }
});

test("LOS uses real wall bounds without an attack-radius expansion", () => {
  const solid = { active: true, visible: false, body: { enable: true, left: 0, top: 0, right: 10, bottom: 100 } };
  geometry.stageObstacleBodies = { getChildren: () => [solid] };
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 50), p(30, 50)), true);
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-70, 50), p(-40, 50)), false);
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 0), p(30, 0)), true);
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, -0.001), p(30, -0.001)), false);
  solid.body.enable = false;
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 50), p(30, 50)), false);
  solid.body.enable = true; solid.active = false;
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 50), p(30, 50)), true, "inactive display object still has an enabled physical wall");
  solid.body.checkCollision = { none: true };
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 50), p(30, 50)), false);
  solid.body.checkCollision.none = false;
  solid.active = true;
  geometry.walls = geometry.stageObstacleBodies; delete geometry.stageObstacleBodies;
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(-30, 50), p(30, 50)), true);
  assert.equal(geometry.isUmbraMoonlightLineBlocked(p(NaN, 0), zero), true);
  delete geometry.walls;
});

function distanceToShape(point, shape) {
  return shape.kind === "circle" ? Math.max(0, Math.hypot(point.x, point.y) - shape.radius)
    : Math.hypot(Math.max(0, Math.abs(point.x) - shape.halfWidth), Math.max(0, Math.abs(point.y) - shape.halfHeight));
}

test("2500 deterministic trajectories agree with independent convex distance minimization", () => {
  let seed = 0x510e527f;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
  for (let i = 0; i < 2500; i++) {
    const from = p(random() * 1000 - 500, random() * 1000 - 500), to = p(random() * 1000 - 500, random() * 1000 - 500);
    const shape = i % 2 ? rect(1 + random() * 150, 1 + random() * 80) : circle(1 + random() * 80);
    const radius = i % 3 ? 60 : 72;
    const at = t => p(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    let left = 0, right = 1;
    // Convex point-to-shape distance is independent of the analytic interval code.
    for (let n = 0; n < 90; n++) {
      const a = (left * 2 + right) / 3, b = (left + right * 2) / 3;
      if (distanceToShape(at(a), shape) <= distanceToShape(at(b), shape)) right = b; else left = a;
    }
    const minimum = Math.min(distanceToShape(from, shape), distanceToShape(to, shape), distanceToShape(at((left + right) / 2), shape));
    const result = geometry.sweepUmbraMoonlightTarget(from, to, zero, zero, shape, radius);
    if (Math.abs(minimum - radius) > 1e-6) assert.equal(result.hit, minimum < radius, `trajectory ${i}`);
    if (result.hit) {
      assert.ok(result.enter >= 0 && result.exit <= 1 && result.enter <= result.exit + 1e-9);
      assert.ok(distanceToShape(at((result.enter + result.exit) / 2), shape) <= radius + 1e-6);
      assert.equal(geometry.isUmbraMoonlightBroadPhaseCandidate(from, to, zero, zero, shape, radius), true, `broad phase dropped hit ${i}`);
    }
  }
  observations.push({ name: "deterministic-independent-oracle", trajectories: 2500, seed: "0x510e527f", passed: true });
});

test("identical continuous trajectories retain entry/exit when partitioned at 30/60/120 Hz", () => {
  const cases = [
    { shape: circle(20), P0: p(-300, 10), P1: p(300, 10), E0: p(0, -100), E1: p(0, 100) },
    { shape: rect(80, 12), P0: p(-300, 60), P1: p(300, -40), E0: p(0, 40), E1: p(30, -30) }
  ];
  const lerp = (a, b, t) => p(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  for (const scenario of cases) {
    const full = geometry.sweepUmbraMoonlightTarget(scenario.P0, scenario.P1, scenario.E0, scenario.E1, scenario.shape, 60);
    assert.equal(full.hit, true);
    const results = [];
    for (const hz of [30, 60, 120]) {
      const intervals = [];
      for (let i = 0; i < hz; i++) {
        const result = geometry.sweepUmbraMoonlightTarget(lerp(scenario.P0, scenario.P1, i / hz), lerp(scenario.P0, scenario.P1, (i + 1) / hz), lerp(scenario.E0, scenario.E1, i / hz), lerp(scenario.E0, scenario.E1, (i + 1) / hz), scenario.shape, 60);
        if (result.hit) intervals.push({ enter: (i + result.enter) / hz, exit: (i + result.exit) / hz });
      }
      const entry = Math.min(...intervals.map(value => value.enter)), exit = Math.max(...intervals.map(value => value.exit));
      close(entry, full.enter); close(exit, full.exit);
      results.push({ partitionHz: hz, entry, exit });
    }
    observations.push({ name: "same-trajectory-partition", scenario, full: plain(full), results });
  }
});

test.after(() => {
  const output = process.env.UMBRA_TEST_OUTPUT || path.join(root, ".tmp_umbra_phase3", "geometry");
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, "moonlight-geometry-report.json"), JSON.stringify({
    methodology: "Pure actual Scene geometry methods with numeric snapshots. Identical trajectories partitioned at 30/60/120 are not actual Phaser or device frame-rate measurements.",
    source: "game.js", sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
    geometryBlockSha256: crypto.createHash("sha256").update(block).digest("hex"), observations
  }, null, 2));
});
