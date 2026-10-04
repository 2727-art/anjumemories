"use strict";

// Local integration only. Application code is frozen by the existing harness;
// native Storage data APIs and external network remain forbidden by its audit.
const fs = require("node:fs"), path = require("node:path"), assert = require("node:assert/strict");
const h = require("./umbra-integration-browser-harness.cjs");
const ui = require("./umbra-integration-initialization-browser.cjs");
const ctrl = require("./umbra-moonreach-controlled-helpers.cjs");
const { installSceneObserver } = require("./umbra-integration-scene-observer.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Fresh UMBRA_TEST_OUTPUT is required");
const expectedNovaFieldMs = Number(process.env.UMBRA_EXPECT_NOVA_FIELD_MS || 3000);
if (![1000, 3000].includes(expectedNovaFieldMs)) throw Error("Known 1000 or 3000 ms comparison source required");
const MODES = [
  { id: "old-wide", reach: "wide", glide: false, nova: false },
  { id: "extended-only", reach: "extended", glide: false, nova: false },
  { id: "glide-only", reach: "wide", glide: true, nova: false },
  { id: "combined", reach: "extended", glide: true, nova: true }
];

function installMobilityProbe() {
  const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), env = s.runEnvironmentIO;
  if (!env?.ownsScene(s) || env.getFixture(s).mode !== "boundary") throw Error("Known live boundary fixture required");
  const records = [], samples = [], tags = new Map(), lifeTags = new Map(), restores = [];
  let damageWeapon = null;
  let time = window.__UMBRA_PREP_CONTROL__?.time ?? s.time.now, physicsSteps = 0, label = "setup", latestTrace = null;
  const scalar = value => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v == null || ["string", "number", "boolean"].includes(typeof v)));
  const ring = (array, value, limit) => { array.push(value); if (array.length > limit) array.shift(); };
  const position = (object, x, y) => {
    const body = object.body; body.updateFromGameObject();
    const dx = body.center.x - object.x, dy = body.center.y - object.y;
    body.reset(x - dx, y - dy); body.updateFromGameObject();
  };
  const enemyState = enemy => ({ tag: tags.get(enemy), type: enemy.enemyTypeId, active: enemy.active, dying: !!enemy.isDying,
    hp: enemy.hp, maxHp: enemy.maxHp, contactDamage: enemy.contactDamage,
    body: enemy.body ? { x: enemy.body.center.x, y: enemy.body.center.y, vx: enemy.body.velocity.x, vy: enemy.body.velocity.y,
      width: enemy.body.width, height: enemy.body.height, radius: enemy.body.radius, circle: enemy.body.isCircle } : null,
    life: s.umbraMoonlightRuntime?.targets.get(enemy)?.lifeId || null });
  const state = () => {
    const body = s.playerHitbox?.body, ac = s.acMovementState, nova = s.umbraPhantomNovaRuntime;
    return { label, sceneMs: s.time.now, physicsSteps, state: s.umbraRunContext?.state, depth: s.stageDepth,
      paused: s.physics.world.isPaused, selection: !!s.levelUpActive, pending: s.pendingLevelUps,
      block: s.getUmbraNormalCombatBlockReason(), hp: s.stats.hp, maxHp: s.stats.maxHp, en: s.stats.stamina,
      invincibleUntil: s.invincibleUntil, barrier: s.robotState?.barrierHp || 0,
      evade: { active: s.isAcEvadeWindowActive(), level: s.getEvasiveFirmwareLevel(), ...scalar(ac?.evadeWindow) },
      body: body ? { x: body.center.x, y: body.center.y, vx: body.velocity.x, vy: body.velocity.y, radius: body.radius } : null,
      mode: ac?.mode, boostActive: !!ac?.continuousBoost?.active, glideUntil: ac?.postBoostGlideUntil,
      settings: s.getUmbraMobilityTrialSettings(), moon: scalar(s.getUmbraMoonlightEffectiveStats()),
      moonClock: s.umbraMoonlightRuntime?.combatTimeMs, novaClock: nova?.combatTimeMs,
      trace: latestTrace, slots: (nova?.slots || []).map(slot => ({ slotId: slot.slotId, state: slot.state,
        cycle: slot.cycleGeneration, position: slot.position, deployedAtMs: slot.deployedAtMs,
        deployedUntilMs: slot.deployedUntilMs, regenerateAtMs: slot.regenerateAtMs })),
      novaFields: s.getUmbraNovaProtectionVisualState(),
      glide: s.getUmbraMoonlightSnapshot()?.glide ?? null,
      targets: [...tags.keys()].map(enemyState),
      runtimeErrors: [s.umbraMoonlightRuntime, s.umbraBloodSpikeRuntime, nova].map(r => r?.errors || 0) };
  };
  const record = (type, detail = {}) => ring(records, { type, label, sceneMs: s.time.now, physicsSteps, ...detail }, 600);
  const wrap = (name, callback) => {
    const old = s[name]; if (typeof old !== "function") return;
    s[name] = function(...args) { return callback.call(this, old, args); };
    restores.push(() => { s[name] = old; });
  };
  wrap("onUmbraMoonlightAcceptedHit", function(old, args) {
    const hit = args[0];
    record("moon-hit", { tag: lifeTags.get(hit.lifeId) || null, hit: { ...hit }, phase: s.acMovementState?.mode, trace: latestTrace });
    return old.apply(this, args);
  });
  for (const name of ["applyUmbraMoonlightHit", "applyUmbraPhantomNovaPulse", "applyUmbraBloodSpikeImpact"]) wrap(name, function(old, args) {
    const previous = damageWeapon; damageWeapon = name; try { return old.apply(this, args); } finally { damageWeapon = previous; }
  });
  wrap("applyDamageToEnemy", function(old, args) {
    const tagged = tags.has(args[0]), before = tagged ? enemyState(args[0]) : null;
    const source = tagged ? damageWeapon || String(new Error().stack).slice(0, 1400) : null;
    const result = old.apply(this, args);
    if (tagged) record("target-damage", { source, raw: args[1], before, after: enemyState(args[0]) });
    return result;
  });
  wrap("applyDamageToPlayer", function(old, args) {
    const before = state(), accepted = old.apply(this, args), after = state();
    record("player-damage", { amount: args[0], source: args[1]?.source, accepted, before, after }); return accepted;
  });
  wrap("endAcContinuousBoost", function(old, args) {
    const before = state(), result = old.apply(this, args); record("boost-end", { reason: args[2], before, after: state() }); return result;
  });
  for (const collider of s.physics.world.colliders.getActive()) {
    if (collider.object1 !== s.playerHitbox || collider.object2 !== s.enemies) continue;
    const old = collider.collideCallback;
    collider.collideCallback = function(player, enemy) {
      const before = state(), value = old.call(this, player, enemy);
      record("native-contact-callback", { tag: tags.get(enemy) || null, enemy: enemyState(enemy), before, after: state() }); return value;
    };
    restores.push(() => { collider.collideCallback = old; });
  }
  const unsubscribe = s.subscribeUmbraBoostTrace("mobility-test-observer", event => {
    latestTrace = { type: event.type, reason: event.reason, valid: event.valid, cancelled: event.cancelled,
      physicalStep: event.physicalStep, deltaMs: event.deltaMs, timeMs: event.timeMs,
      from: event.from, to: event.to, boostSequence: event.boostSequence,
      moonGlide: event.moonGlide, moonGlideValid: event.moonGlideValid };
    if (event.type !== "step") record("trace", { event: latestTrace });
  });
  restores.push(unsubscribe);
  const worldstep = () => { physicsSteps++; ring(samples, state(), 900); };
  s.physics.world.on("worldstep", worldstep);
  restores.push(() => s.physics.world.off("worldstep", worldstep));
  const getArea = () => {
    const b = s.getStagePlayBounds(s.currentStage);
    for (let y = b.top + 450; y < b.bottom - 450; y += 250) for (let x = b.left + 450; x < b.right - 1400; x += 250) {
      const points = [{ x: x - 150, y: y - 230 }, { x: x + 1050, y: y + 230 },
        { x: x - 150, y: y + 230 }, { x: x + 1050, y: y - 230 }];
      const hitsWall = (s.stageObstacleBodies?.getChildren() || []).some(o => {
        const w = o.body; return w?.enable && !w.checkCollision.none && w.right >= x - 150 && w.left <= x + 1050 && w.bottom >= y - 230 && w.top <= y + 230;
      });
      if (!hitsWall && !s.isUmbraMoonlightLineBlocked(points[0], points[1]) && !s.isUmbraMoonlightLineBlocked(points[2], points[3])) return { x, y, bounds: { ...b } };
    }
    throw Error("No unchanged obstacle-free comparison rectangle found");
  };
  const area = getArea();
  window.__UMBRA_MOBILITY_PROBE__ = {
    state, export: () => ({ state: state(), records, samples, limits: { records: 600, samples: 900, targets: 8 } }),
    label(value) { label = value; record("label"); return state(); },
    step(n = 1) {
      if (!Number.isInteger(n) || n < 1 || n > 120) throw Error("1..120 unchanged Game.step calls required");
      for (let i = 0; i < n; i++) s.game.step(time += 1000 / 60, 1000 / 60);
      return state();
    },
    prepare(value) {
      label = value;
      for (const enemy of tags.keys()) if (enemy.active && enemy.body) position(enemy, area.bounds.right - 150, area.bounds.bottom - 150);
      position(s.playerHitbox, area.x, area.y);
      s.invalidateUmbraBoostTrace("EXPLICIT_MOBILITY_BOUNDARY_PLACEMENT");
      env.record("explicit-mobility-boundary-placement", { label, area, nativeHpAiAndMovementUnchanged: true });
      return { area, state: state() };
    },
    spawn({ tag, dx, dy = 0, edgeGap = null, type = "tank" }) {
      if (tags.size >= 8) throw Error("Diagnostic target bound exceeded");
      const enemy = s.spawnEnemy(type, type === "boss_crack" ? { isElite: true, isBoss: true } : undefined), b = s.playerHitbox.body;
      if (edgeGap !== null) dy = enemy.body.height / 2 + edgeGap;
      position(enemy, b.center.x + dx, b.center.y + dy); tags.set(enemy, tag);
      lifeTags.set(s.umbraMoonlightRuntime.targets.get(enemy)?.lifeId, tag);
      env.record("explicit-mobility-native-enemy-placement", { tag, type, dx, dy, hp: enemy.hp, maxHp: enemy.maxHp });
      record("spawn", { enemy: enemyState(enemy) }); return enemyState(enemy);
    },
    positionPlayer({ x, y, invalidate = false }) {
      position(s.playerHitbox, x, y);
      if (invalidate) s.invalidateUmbraBoostTrace("EXPLICIT_MOBILITY_POSITION");
      env.record("explicit-mobility-player-position", { x, y, invalidate, nativeBody: true }); return state();
    },
    damage() { const before = state(), accepted = s.applyDamageToPlayer(5, { source: "enemyProjectile" }); return { before, accepted, after: state() }; },
    gate() {
      env.record("explicit-mobility-gate-boundary", { naturalGateWait: false }); s.spawnStageGate();
      if (s.gateGuidanceOverlayActive) s.closeGateGuidanceOverlay("mobility-test");
      s.handleGateEnter(); return state();
    },
    cleanup() { for (const restore of restores.reverse()) restore?.(); },
    resumeRaf() { window.__UMBRA_EXTERNAL_DATE__?.restore(); s.game.loop.start((t, d) => s.game.step(t, d)); return state(); },
    stopRaf() { s.game.loop.stop(); time = s.time.now; return state(); }
  };
  return state();
}

function check(c, passed, label, detail = null) {
  c.checks.push({ passed: !!passed, label, detail }); assert.ok(passed, label);
}
async function read(page) { return page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.state()); }
async function op(page, name, arg) { return page.evaluate(({ name, arg }) => window.__UMBRA_MOBILITY_PROBE__[name](arg), { name, arg }); }
async function steps(page, n) { let result; while (n > 0) { const take = Math.min(120, n); result = await op(page, "step", take); n -= take; } return result; }
async function inputs(page, held, n, c) {
  for (const key of held) await page.keyboard.down(key);
  const before = await read(page), after = await steps(page, n);
  for (const key of held) await page.keyboard.up(key);
  c.inputs.push({ held, steps: n, before, after }); return after;
}
async function until(page, predicate, bound = 240) {
  for (let n = 0; n <= bound; n++) { const value = await read(page); if (predicate(value)) return value; if (n < bound) await steps(page, 1); }
  throw Error(`Condition not reached in ${bound} unchanged Game.step calls`);
}
async function settle(page, c) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const s = await read(page);
    if (s.state === "ACTIVE" && !s.paused && !s.selection && !s.block) return s;
    if (s.selection) {
      for (let n = 0; n < 80; n++) {
        const card = await page.evaluate(() => { const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"); return { ready: s.levelUpInputEnabled && !s.levelUpSelectionLocked,
          cards: (s.levelUpCardRecords || []).map(r => ({ id: r.model.option.id, type: r.model.option.type })), records: s.levelUpCardRecords?.length }; });
        if (card.ready && card.records) {
          const index = Math.max(0, card.cards.findIndex(q => q.type === "passive"));
          await page.keyboard.down(String(index + 1)); await steps(page, 1); await page.keyboard.up(String(index + 1));
          await steps(page, 25); c.selections.push({ source: "actual-natural-pending-card", index, cards: card.cards }); break;
        }
        await steps(page, 1);
      }
    } else await steps(page, 1);
  }
  throw Error("ACTIVE/unpaused selection settle not reached");
}
async function setup(browser, mode, c, capture) {
  const fixture = process.env.UMBRA_MOBILITY_FIXTURE || "complete";
  const query = `fixture=${fixture}&moonReach=${mode.reach}&moonGlide=${mode.glide ? 1 : 0}&novaField=${mode.nova ? mode.novaFieldShape === "lane" ? "lane" : 1 : 0}`;
  const r = await h.open(browser, mode.id, { path: `/umbra-integration.html?${query}`, init: ctrl.installComparisonRandom }); capture(r);
  await r.page.evaluate(() => {
    const Original = Phaser.Game;
    Phaser.Game = new Proxy(Original, { construct(target, args) {
      Phaser.Game = Original;
      const game = Reflect.construct(target, [{ ...args[0], seed: ["mobility-browser-v1"] }, ...args.slice(1)], target), old = game.step;
      game.step = function(...a) { window.__UMBRA_EXTERNAL_DATE__.advance(); return old.apply(this, a); }; return game;
    } });
  });
  await ui.waitHub(r.page); await r.page.evaluate(installSceneObserver); await r.page.evaluate(ctrl.installPreparationControl);
  await ui.clickPhaserText(r.page, "SORTIE PREP");
  await r.page.waitForFunction(() => window.__UMBRA_PREP_CONTROL__?.state().entered, null, { timeout: 90000 });
  for (let n = 0; n < 3; n++) {
    const v = await ctrl.controlledUntil(r.page, state => state.normal.selectionActive && state.normal.inputEnabled && !state.normal.selectionLocked);
    const q = v.normal.cards, nova = q.findIndex(card => card.skillId === "umbraPhantomNova" && !v.normal.skills.umbraPhantomNova);
    const index = nova >= 0 ? nova : q.findIndex(card => card.type === "passive");
    check(c, index >= 0, "legal actual Opening option exists", q);
    const selection = await ctrl.controlledChoose(r.page, index);
    c.selections.push({ source: "actual-Opening", index, selected: selection.selected });
  }
  // Relay starts may offer a genuine Depth Directive after the three Opening
  // choices. Complete its existing card transaction before sending motion.
  for (let n = 0; n < 6; n++) {
    const ready = await ctrl.controlledUntil(r.page, state =>
      (state.normal.normalContext?.state === "ACTIVE" && !state.normal.worldPaused && !state.normal.selectionActive)
      || (state.normal.selectionActive && state.normal.inputEnabled && !state.normal.selectionLocked));
    if (!ready.normal.selectionActive) break;
    const selected = await ctrl.controlledChoose(r.page, 0);
    c.selections.push({ source: "actual-post-Opening-card", mode: ready.normal.selectionMode, index: 0, selected: selected.selected });
  }
  await ctrl.controlledUntil(r.page, state => state.normal.normalContext?.state === "ACTIVE" && !state.normal.worldPaused && !state.normal.selectionActive);
  c.novaAcquisition = await r.page.evaluate(() => {
    const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
    const before = !!s.playerSkills.umbraPhantomNova;
    if (!before) { const option = s.buildUmbraSkillGrowthChoice("umbraPhantomNova"); if (!option) throw Error("Legal NOVA unlock missing"); option.onSelect();
      s.runEnvironmentIO.record("explicit-mobility-legal-nova-unlock", { naturalXp: false }); }
    return { actualOpening: before, stage: s.getUmbraActiveSkillStage("umbraPhantomNova")?.stage };
  });
  await r.page.evaluate(() => window.__UMBRA_PREP_CONTROL__.restore());
  c.initial = await r.page.evaluate(installMobilityProbe);
  await r.page.evaluate(() => { window.__NORMAL_SCENE_OBSERVER__.cleanup(); delete window.__NORMAL_SCENE_OBSERVER__; });
  c.entryQuery = query;
  check(c, c.initial.settings.moonGlideMs === (mode.glide ? 250 : 0) && c.initial.settings.novaFieldRadius === (mode.nova ? 180 : 0)
    && c.initial.settings.novaFieldDurationMs === (mode.nova ? mode.novaFieldShape === "lane" ? 2000 : expectedNovaFieldMs : 0), "immutable explicit trial settings", c.initial.settings);
  check(c, c.initial.moon.passageRadius === (mode.reach === "extended" ? 120 : 90), "S1 effective reach selects old wide or extended", c.initial.moon);
  check(c, c.initial.body.radius === 22 && c.initial.evade.level === 0, "native body radius and zero Evasive fixture retained", c.initial);
  return r;
}

async function runMotion(r, mode, c) {
  const page = r.page;
  const prepare = async label => { await steps(page, 65); await settle(page, c); const p = await op(page, "prepare", label); await steps(page, 2); return p; };
  c.releasePlacement = await prepare("release");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift"); await steps(page, 12);
  await page.keyboard.up("Shift"); c.release = await steps(page, 1);
  check(c, !c.release.boostActive && c.release.mode === "POST_BOOST_GLIDE", "real release enters native post-boost glide", c.release);
  c.releaseTarget = await op(page, "spawn", { tag: "release", dx: 200, dy: 0 });
  c.releaseAfter = await steps(page, 12); await page.keyboard.up("ArrowRight");
  const releaseObs = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  const releaseHits = releaseObs.records.filter(q => q.type === "moon-hit" && q.tag === "release");
  c.releaseHits = releaseHits;
  check(c, mode.glide ? releaseHits.length > 0 : releaseHits.length === 0, "post-release actual Moon hit follows glide switch", releaseHits);
  c.releaseTargetPhysicalSamples = releaseObs.samples.filter(s => s.label === "release").map(s => ({ sceneMs: s.sceneMs, target: s.targets.find(t => t.tag === "release") })).filter(q => q.target?.body);
  check(c, c.releaseTargetPhysicalSamples.some(q => q.target.body.x !== c.releaseTarget.body.x), "release target moved through native AI and physics", { before: c.releaseTarget, samples: c.releaseTargetPhysicalSamples });
  if (mode.glide) check(c, releaseHits.every(q => q.sceneMs - c.release.sceneMs <= 250 + 1e-6 && q.phase === "POST_BOOST_GLIDE"), "release hits stay inside 250 ms and native glide phase", releaseHits);

  await page.keyboard.up("Shift"); await page.keyboard.up("ArrowRight");
  c.expiryPlacement = await prepare("expired");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift"); await steps(page, 12);
  await page.keyboard.up("Shift"); c.expiryRelease = await steps(page, 1); await steps(page, 17);
  c.expiryTarget = await op(page, "spawn", { tag: "expired", dx: 90, dy: 0 });
  c.expiryAfter = await steps(page, 12); await page.keyboard.up("ArrowRight");
  const expired = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  check(c, expired.records.filter(q => q.type === "moon-hit" && q.tag === "expired").length === 0, "new passage after 250 ms does not attack", { release: c.expiryRelease.sceneMs, end: c.expiryAfter.sceneMs });

  c.brakePlacement = await prepare("brake");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift"); await steps(page, 12);
  await page.keyboard.up("Shift"); await steps(page, 1); await page.keyboard.up("ArrowRight"); await page.keyboard.down("ArrowLeft");
  c.brakeStart = await steps(page, 2); c.brakeTarget = await op(page, "spawn", { tag: "brake", dx: 75, dy: 0 });
  c.brakeAfter = await steps(page, 10); await page.keyboard.up("ArrowLeft");
  const brake = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  check(c, brake.samples.some(s => s.label === "brake" && (s.mode === "AIR_BRAKE" || s.trace?.reason === "AIR_BRAKE")), "reverse input actually reached native Air Brake", c.brakeStart);
  check(c, brake.records.filter(q => q.type === "moon-hit" && q.tag === "brake").length === 0, "Air Brake passage does not attack");

  c.edgePlacement = await prepare("extended-edge");
  c.edgeTarget = await op(page, "spawn", { tag: "extended-edge", dx: 95, edgeGap: 112, type: "boss_crack" });
  await steps(page, 2); c.edgeAfter = await inputs(page, ["ArrowRight", "Shift"], 17, c); await steps(page, 1);
  const edge = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export());
  c.edgeHits = edge.records.filter(q => q.type === "moon-hit" && q.tag === "extended-edge");
  check(c, mode.reach === "extended" ? c.edgeHits.length > 0 : c.edgeHits.length === 0, "same outer fixture separates extended from wide", c.edgeHits);
  c.motion = edge;
}

async function runNova(r, mode, c) {
  const page = r.page;
  await steps(page, 90); await settle(page, c); c.novaPlacement = await op(page, "prepare", "nova"); await steps(page, 3);
  await until(page, s => s.slots.some(slot => slot.state === "ORBITING") && s.sceneMs > s.invincibleUntil + 50, 600);
  const before = await read(page), oldDeploys = before.slots.map(q => `${q.slotId}:${q.cycle}`);
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift");
  const deployed = await until(page, s => s.slots.some(q => q.state === "DEPLOYED" && !oldDeploys.includes(`${q.slotId}:${q.cycle}`)), 20);
  await page.keyboard.up("Shift"); await page.keyboard.up("ArrowRight");
  const slot = deployed.slots.find(q => q.state === "DEPLOYED" && !oldDeploys.includes(`${q.slotId}:${q.cycle}`));
  c.novaDeployment = { before, deployed, slot };
  check(c, !!slot?.position, "actual successful boost physical movement creates DEP", c.novaDeployment);
  await steps(page, 6);
  c.novaInsidePosition = await op(page, "positionPlayer", { x: slot.position.x, y: slot.position.y });
  c.novaInside = await op(page, "damage");
  check(c, mode.nova ? !c.novaInside.accepted : c.novaInside.accepted, "actual DEP center protection follows novaField switch", c.novaInside);
  if (mode.nova) {
    check(c, c.novaInside.after.hp === c.novaInside.before.hp && c.novaInside.after.invincibleUntil === c.novaInside.before.invincibleUntil
      && c.novaInside.after.barrier === c.novaInside.before.barrier && JSON.stringify(c.novaInside.after.evade) === JSON.stringify(c.novaInside.before.evade),
    "NOVA protection preserves HP and existing invincibility/barrier/evade state", c.novaInside);
    const field = c.novaInside.before.novaFields.fields.find(q => q.slotId === slot.slotId);
    check(c, field && field.radius === 180 && field.durationMs === expectedNovaFieldMs && field.x === slot.position.x && field.y === slot.position.y
      && field.expiresAtMs <= slot.deployedUntilMs, `field uses actual DEP center, 180 px radius and bounded ${expectedNovaFieldMs} ms lifetime`, field);
    c.novaVisual = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene");
      const g = s.umbraNormalPresentation.control;
      return { snapshot: s.getUmbraNovaProtectionVisualState(), control: { active: g.active, visible: g.visible, depth: g.depth, commands: g.commandBuffer?.length } };
    });
    check(c, c.novaVisual.control.active && c.novaVisual.control.visible && c.novaVisual.control.commands > 0, "existing normal presentation Graphics contains visible field commands", c.novaVisual);
    await page.screenshot({ path: path.join(out, `${mode.id}-nova-field.png`), fullPage: true });
    c.novaFxOff = await page.evaluate(() => {
      const s = window.__SURVIVAL_GAME__.scene.getScene("survival-scene"), owner = s.umbraNormalPresentation;
      const before = owner.fx.fxMode; owner.fx.setFxMode("off"); s.updateUmbraNormalPresentation();
      const value = { mode: owner.fx.fxMode, commands: owner.control.commandBuffer?.length, fields: s.getUmbraNovaProtectionVisualState() };
      owner.fx.setFxMode(before); s.updateUmbraNormalPresentation(); return value;
    });
    check(c, c.novaFxOff.mode === "off" && c.novaFxOff.commands > 0 && c.novaFxOff.fields.protected, "gameplay field stays visible and protective under FX OFF", c.novaFxOff);
    c.novaContactTarget = await op(page, "spawn", { tag: "nova-contact", dx: 0, dy: 0 });
    c.novaContactBefore = await read(page);
    check(c, !c.novaContactBefore.evade.active && c.novaContactBefore.sceneMs > c.novaContactBefore.invincibleUntil,
      "native field contact starts after existing Evade and hit grace", c.novaContactBefore);
    await steps(page, 1);
    c.novaContact = await page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__.export().records.filter(q => q.type === "native-contact-callback" && q.tag === "nova-contact"));
    check(c, c.novaContact.length > 0 && c.novaContact.every(q => q.before.hp === q.after.hp && q.before.invincibleUntil === q.after.invincibleUntil
      && q.before.novaFields.protected && q.after.barrier === q.before.barrier), "actual native tank overlap is protected without changing AP or hit grace", c.novaContact);
    await op(page, "positionPlayer", { x: slot.position.x + 181, y: slot.position.y });
    c.novaOutside = await op(page, "damage");
    check(c, c.novaOutside.accepted && c.novaOutside.after.hp < c.novaOutside.before.hp, "body center 181 px outside actual DEP receives native damage", c.novaOutside);
    await until(page, s => s.novaClock > slot.deployedAtMs + expectedNovaFieldMs + 10 && s.sceneMs > s.invincibleUntil + 20, 240);
    await op(page, "positionPlayer", { x: slot.position.x, y: slot.position.y });
    c.novaExpired = await op(page, "damage");
    check(c, c.novaExpired.accepted && c.novaExpired.after.hp < c.novaExpired.before.hp, "expired protection at DEP center receives native damage", c.novaExpired);
  }
  c.novaEnd = await read(page);
}

async function runGateAndRaf(r, c) {
  const page = r.page;
  await steps(page, 90); await settle(page, c); await op(page, "prepare", "gate-cleanup"); await steps(page, 3);
  await until(page, s => s.slots.some(q => q.state === "ORBITING"), 600);
  await inputs(page, ["ArrowRight", "Shift"], 8, c); await steps(page, 1);
  c.beforeGate = await read(page); check(c, c.beforeGate.slots.some(q => q.state === "DEPLOYED"), "Gate cleanup begins with actual live DEP", c.beforeGate);
  check(c, c.beforeGate.novaFields.fields.length > 0, "Gate cleanup starts while protection field is live", c.beforeGate.novaFields);
  c.gate = await op(page, "gate"); await page.keyboard.down("1"); await steps(page, 1); await page.keyboard.up("1");
  c.afterGate = await until(page, s => s.depth === 2 && s.state === "ACTIVE" && !s.paused, 180);
  check(c, !c.afterGate.slots.some(q => q.state === "DEPLOYED"), "real NEXT STAGE removes previous DEP", c.afterGate);
  check(c, c.afterGate.novaFields.fields.length === 0 && !c.afterGate.glide.active, "real Gate removes old protection fields and glide ticket", c.afterGate);
  await op(page, "prepare", "normal-raf-smoke"); await steps(page, 2);
  c.rafBefore = await op(page, "resumeRaf");
  await page.keyboard.down("ArrowRight"); await page.keyboard.down("Shift"); await page.waitForTimeout(180);
  await page.keyboard.up("Shift"); await page.waitForTimeout(350); await page.keyboard.up("ArrowRight");
  c.rafAfter = await op(page, "stopRaf");
  check(c, c.rafAfter.physicsSteps > c.rafBefore.physicsSteps + 5 && Math.hypot(c.rafAfter.body.x - c.rafBefore.body.x, c.rafAfter.body.y - c.rafBefore.body.y) > 1,
    "ordinary requestAnimationFrame advances actual physics and input after trial and Gate", { before: c.rafBefore, after: c.rafAfter });
  check(c, c.rafAfter.runtimeErrors.every(n => n === 0), "dedicated runtimes retain zero errors", c.rafAfter.runtimeErrors);
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const report = { createdAt: new Date().toISOString(), sourceRoot: h.sourceRoot, sources: h.sources,
    harnessSha256: h.sha(fs.readFileSync(__filename)), cases: [], errors: [],
    section: process.env.UMBRA_MOBILITY_SECTION === "nova-only" ? "nova-only" : "full-functional",
    methodology: "Four serial isolated normal SurvivalScene contexts. Deterministic original 60 Hz Game.step begins at first actual Opening, with existing test-only Date.now/seed control. Actual keyboard selection timers, native boost/AI/body/receiver remain. Boundary fixture complete grants existing synthetic starting equipment only; NOVA uses real Opening when offered or an explicitly recorded lawful S1 unlock callback. Player and native tank body placements are explicit synthetic fixtures; enemy HP/AI/damage, player HP/EN, attack flags and physics settings are not edited. No natural reachability, full game balance or performance claim. Bounded observations, no screenshots during measured movement. Final combined Gate case resumes ordinary rAF for functional input smoke.",
    unconfirmed: ["Natural deep progression and balance", "Physical phones and gamepads", "Low-FPS long-run performance", "All enemy types and all Boss actions"] };
  let browser;
  try {
    const harnessDir = path.join(out, "harness"); fs.mkdirSync(harnessDir, { recursive: true });
    for (const name of [path.basename(__filename), "umbra-integration-browser-harness.cjs", "umbra-integration-initialization-browser.cjs", "umbra-integration-scene-observer.cjs", "umbra-moonreach-controlled-helpers.cjs"]) fs.copyFileSync(path.join(__dirname, name), path.join(harnessDir, name), fs.constants.COPYFILE_EXCL);
    browser = await h.launch(); report.browser = browser.version();
    const selected = process.env.UMBRA_MOBILITY_MODES?.split(",");
    for (const mode of MODES.filter(q => !selected || selected.includes(q.id))) {
      const c = { mode, checks: [], selections: [], inputs: [] }; report.cases.push(c); let r;
      process.stdout.write(`START mobility ${mode.id}\n`);
      try {
        r = await setup(browser, mode, c, value => { r = value; });
        if (report.section !== "nova-only") await runMotion(r, mode, c);
        await runNova(r, mode, c);
        if (report.section !== "nova-only" && mode.id === "combined" && c.initial.depth === 1) await runGateAndRaf(r, c);
      } catch (error) { c.error = String(error.stack || error); if (r) c.failure = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export() || window.__NORMAL_SCENE_OBSERVER__?.snapshot()).catch(e => ({ error: String(e) })); }
      finally {
        if (r) {
          c.final = await r.page.evaluate(() => window.__UMBRA_MOBILITY_PROBE__?.export()).catch(() => null);
          await r.page.evaluate(() => {
            window.__UMBRA_MOBILITY_PROBE__?.cleanup(); window.__NORMAL_SCENE_OBSERVER__?.cleanup(); window.__UMBRA_PREP_CONTROL__?.restore();
            window.__UMBRA_INTEGRATION_ENVIRONMENT__?.end("MOBILITY_CASE_END");
            const game = window.__SURVIVAL_GAME__; if (game?.pendingDestroy) game.step(performance.now(), 1000 / 60);
            window.__UMBRA_EXTERNAL_DATE__?.restore();
          }).catch(e => { c.endError = String(e); });
          c.audit = await h.audit(r).catch(e => ({ error: String(e) })); await r.context.close();
        }
        c.passed = !c.error && !c.endError && c.checks.length > 0 && c.checks.every(q => q.passed) && c.audit?.isolationPassed && c.audit.pageErrors.length === 0;
        fs.writeFileSync(path.join(out, `${mode.id}.json`), JSON.stringify(c, null, 2), { flag: "wx" });
        process.stdout.write(`END mobility ${mode.id} ${c.passed ? "PASS" : "FAIL"} ${c.error || ""}\n`);
      }
      if (!c.passed && process.env.UMBRA_MOBILITY_KEEP_GOING !== "1") break;
    }
  } catch (error) { report.errors.push(String(error.stack || error)); }
  finally {
    if (browser) { let timer; await Promise.race([browser.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(Error("browser close timeout")), 10000); })]).catch(e => { report.cleanupError = String(e); }); clearTimeout(timer); }
    report.passed = report.cases.length > 0 && report.cases.every(q => q.passed) && !report.errors.length && !report.cleanupError;
    fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2), { flag: "wx" });
    process.stdout.write(JSON.stringify({ passed: report.passed, cases: report.cases.length, checks: report.cases.map(c => ({ mode: c.mode.id, passed: c.checks.filter(q => q.passed).length, total: c.checks.length })), errors: report.errors }) + "\n");
    process.exitCode = report.passed ? 0 : 1;
  }
}
if (require.main === module) main();
module.exports = { MODES, installMobilityProbe, setup, read, op, steps, inputs, until, check };
