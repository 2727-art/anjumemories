"use strict";
// Pure player-copy/projection checks. The numerical owner fixtures do not claim
// to perform actual card transactions or establish browser text readability.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-normal-context.test.cjs"), source = fs.readFileSync(filename, "utf8");
const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(source.slice(0, source.indexOf('\ntest("')) + "\nmodule.exports = fixture;", filename);
const fixture = mod.exports, ids = ["umbraMoonlight", "umbraBloodSpike", "umbraPhantomNova"], [M, B, N] = ids;
const plain = value => JSON.parse(JSON.stringify(value));
function ready({ equipped = true, stage = 1, core = null, final = null } = {}) {
  const f = fixture({ equipped }), s = f.scene;
  s.prepareUmbraNormalRunContext(); f.bind(); f.activate(); s.levelUpActive = true;
  s.unlockSkill(B); s.unlockSkill(N);
  for (const id of ids) {
    s.playerSkills[id].stageIndex = stage - 1; assert.equal(s.applySkillStage(s.playerSkills[id]), true);
    const entries = s.getUmbraCoreSelectionState(true).entries, entry = entries[id] || (entries[id] = {});
    Object.assign(entry, { core, stage4Selected: Boolean(core), final, stage8Selected: Boolean(final) });
  }
  s.skillMutationState.pendingQueue = [];
  s.refreshUmbraTriadSnapshot("NUMERIC_CARD_FIXTURE", { notify: false });
  s.game.canvas = { getBoundingClientRect: () => ({ width: 1280, height: 720 }) };
  return f;
}
function display(s, option) { const old = s.buildLevelUpCardModel(option, 0), model = s.buildUmbraPlayerCardModel(old); return { old, model, view: model.umbraPlayerCard }; }
function growth(s, id, from, to) {
  const definition = s.playerSkills[id].definition, currentStage = from ? definition.stages[from - 1] : null, nextStage = definition.stages[to - 1];
  const umbraGrowthCard = s.buildUmbraSkillGrowthCard(id, currentStage, nextStage);
  return display(s, { type: "skill", actionType: from ? "upgrade" : "unlock", skillId: id, definition, currentStage, nextStage, umbraGrowthCard, onSelect() {} });
}
function mutation(s, id, type, choice) {
  const data = type === "core" ? s.buildUmbraCoreCard(id, choice) : s.buildUmbraFinalCard(id, choice);
  assert.ok(data); return display(s, { ...data, type: "skillMutation", phase: type === "core" ? "stage4" : "stage8", choiceId: choice, onSelect() {} });
}
function samples() {
  const rows = [], add = (name, result) => rows.push({ name, title: result.old.title, oldDescription: result.old.description,
    oldChips: result.old.chips.map(chip => chip.label), player: plain(result.view) });
  for (const [id, from, to] of [[M, 0, 1], [M, 1, 2], [M, 3, 4], [B, 0, 1], [B, 3, 4], [N, 0, 1], [N, 1, 2], [N, 3, 4], [N, 4, 5], [N, 7, 8]]) {
    const { scene: s } = ready({ stage: Math.max(1, from) }); add(`${id}-S${from}-S${to}`, growth(s, id, from, to));
  }
  for (const id of ids) for (const core of ["assault", "control", "reactor"]) {
    const { scene: s } = ready({ stage: 4 }); add(`${id}-${core}`, mutation(s, id, "core", core));
  }
  for (const id of ids) for (const final of ["execution", "prism", "singularity"]) {
    const { scene: s } = ready({ stage: 8, core: "assault" }); add(`${id}-${final}`, mutation(s, id, "final", final));
  }
  {
    const { scene: s } = ready();
    for (const option of s.getPassiveUpgradeChoices()) add(`passive-${option.id}`, display(s, option));
  }
  for (const id of ids) {
    const { scene: s } = ready({ stage: 8, core: "reactor", final: "prism" });
    add(`${id}-OVL-I`, display(s, s.buildUmbraEquipmentOverlimitChoice(id)));
    s.umbraEquipmentState.overlimitLevels = Object.freeze({ ...s.umbraEquipmentState.overlimitLevels, [id]: 1 });
    add(`${id}-OVL-II`, display(s, s.buildUmbraEquipmentOverlimitChoice(id)));
  }
  return rows;
}

test("every normal projection retains its exact option, legacy description and immutable player copy", () => {
  const { scene: s } = ready();
  const result = growth(s, M, 1, 2);
  assert.equal(result.model.option, result.old.option); assert.equal(result.model.description, result.old.description);
  assert.equal(result.model.chips, result.old.chips); assert.ok(Object.isFrozen(result.view));
  s.isUmbraNormalPresentationContext = () => false;
  assert.equal(s.buildUmbraPlayerCardModel(result.old), result.old);
});

test("every adjacent Stage says exactly what changed, including NOVA S4/S8 count-only and S5 power-only", () => {
  for (const id of ids) for (let stage = 1; stage < 8; stage++) {
    const { scene: s } = ready({ stage }), { view } = growth(s, id, stage, stage + 1);
    assert.ok(view.summary.split("\n").length <= 2); assert.ok(view.importantChanges.length >= 1 && view.importantChanges.length <= 2);
    if (id === N && [3, 7].includes(stage)) { assert.match(view.summary, /1基増える/); assert.doesNotMatch(view.summary, /範囲/); }
    if (id === N && stage === 4) { assert.match(view.summary, /威力/); assert.doesNotMatch(view.summary, /範囲|増える/); }
    if (id === N && [1, 2, 5, 6].includes(stage)) { assert.match(view.summary, /範囲/); assert.doesNotMatch(view.summary, /増える/); }
    if (id === M && [1, 4].includes(stage)) { assert.match(view.summary, /威力/); assert.doesNotMatch(view.summary, /範囲/); }
    if (id === B) assert.match(view.summary, stage === 7 ? /巨大な角.*\n敵集団を巻き込む/ : /範囲/);
  }
});

test("next-Stage damage projection equals actual applied Stage with current TRIAD and equipment, without mutating owner", () => {
  for (const id of ids) for (const stage of [1, 4, 7]) {
    const { scene: s } = ready({ stage, core: stage >= 4 ? "assault" : null });
    const skill = s.playerSkills[id], before = s.getUmbraSkillFinalProfile(id), current = skill.currentStage;
    const expected = plain(s.getUmbraPlayerCardDamageRows(id, skill.definition.stages[stage]));
    assert.equal(skill.currentStage, current); assert.deepEqual(plain(s.getUmbraSkillFinalProfile(id)), plain(before));
    skill.stageIndex = stage; assert.equal(s.applySkillStage(skill), true);
    assert.deepEqual(plain(s.getUmbraPlayerCardDamageRows(id, skill.currentStage)), expected);
  }
});

test("Reactor Overcharge projection reuses the actual damage calculators and one common +1", () => {
  const { scene: s } = ready({ stage: 8, core: "assault", final: "execution" });
  for (const id of ids) {
    const current = s.getUmbraActiveSkillStage(id), before = s.stats.bulletDamage;
    const prediction = plain(s.getUmbraPlayerCardDamageRows(id, current, { bulletIncrease: 1 }));
    assert.equal(s.stats.bulletDamage, before);
    s.stats.bulletDamage += 1;
    assert.deepEqual(plain(s.getUmbraPlayerCardDamageRows(id, current)), prediction);
    s.stats.bulletDamage = before;
  }
});

test("player details retain exact Final/Core conditions and contain no copied diagnostic-only terms", () => {
  for (const row of samples()) {
    const text = [row.player.summary, row.player.condition, ...row.player.detailLines].join("\n");
    assert.doesNotMatch(text, /\braw\b|\bcast\b|snapshot|lifeId|\bICD\b|DEP期限|受付前|一段丸め/i, row.name);
    if (row.name.endsWith("-execution")) for (const token of ["62%", "36以上", "Boss / Elite / Nemesis", "小さな敵"]) assert.ok(text.includes(token));
    if (row.name.endsWith("-singularity")) assert.match(text, /追加ダメージはありません/);
    if (row.name === `${N}-singularity`) assert.match(text, /命中は不要/);
    if (row.name.endsWith("-prism")) assert.match(text, /さらに分岐することはありません/);
  }
});

test("normal SPIKE S8 growth and Singularity cards distinguish the giant 240px impact from the capped 200px slow field", () => {
  const { scene: s } = ready({ stage: 8, core: "control" });
  assert.equal(s.getUmbraBloodSpikeEffectiveStats().impactRadius, 240);
  const final = mutation(s, B, "final", "singularity");
  assert.match(final.old.chips.map(chip => chip.label).join("|"), /半径200px/);
  assert.match(final.view.detailLines.join("\n"), /領域の半径：200px/);
  assert.doesNotMatch(final.view.detailLines.join("\n"), /領域の半径：240px/);
  const progress = growth(s, B, 7, 8).view;
  assert.match(progress.importantChanges.join("|"), /93px/);
  assert.match(progress.detailLines.join("\n"), /角と地面の発光も同じ比率/);
});

test("zero-difference OVL is visible and only cap II says it is a preliminary step", () => {
  const { scene: s } = ready({ stage: 8, core: "reactor", final: "prism" });
  const option = s.buildUmbraEquipmentOverlimitChoice(N), result = display(s, option);
  assert.equal(option.umbraEquipmentCard.zeroCurrentDifference, true);
  assert.equal(result.view.summary.replace(/\n/g, ""), "今の威力は変わりません。");
  assert.match(result.view.condition, /II/);
  const capI = display(s, { ...option, overlimitCap: 1 }); assert.equal(capI.view.condition, "");
  assert.doesNotMatch(capI.view.detailLines.join("\n"), /II へ/);
});

test("small canvas player-card layout targets actual 14 CSS pixels without changing world size", () => {
  const { scene: s } = ready();
  for (const size of [[1280, 720], [616.875, 346.9921875], [638, 358.875]]) for (const count of [1, 3, 4]) {
    s.game.canvas.getBoundingClientRect = () => ({ width: size[0], height: size[1] });
    const layout = s.getUmbraPlayerCardLayout(count);
    assert.ok(layout.fontSize * layout.cssScale >= 14); assert.equal(layout.panelHeight, 700);
    for (const point of layout.cardPositions) { assert.ok(Math.abs(point.x) + layout.cardWidth / 2 < 640); assert.ok(Math.abs(point.y) + layout.cardHeight / 2 < 325); }
    if (count === 3 && size[0] < 760) assert.equal(layout.rowCards, true);
  }
});

test("details block numeric selection; Escape closes only details; no pending or clocks are modified", () => {
  const { scene: s } = ready(); let closes = 0, selects = 0;
  const listeners = {}; s.input = { keyboard: { on: (type, fn) => listeners[type] = fn, off() {} } };
  s.levelUpInputEnabled = true; s.levelUpSelectionLocked = false; s.pendingLevelUps = 3;
  s.umbraPlayerCardDetail = { sentinel: true }; s.closeUmbraPlayerCardDetails = () => { closes++; s.umbraPlayerCardDetail = null; };
  const timer = s.umbraPhantomNovaRuntime.combatTimeMs, queue = s.skillMutationState.pendingQueue;
  s.registerLevelUpKeyboardInput(); const originalSelect = s.selectLevelUpCard;
  originalSelect.call(s, 0); assert.equal(s.levelUpSelectionLocked, false);
  s.selectLevelUpCard = () => selects++;
  listeners.keydown({ key: "1" }); assert.equal(selects, 0);
  listeners.keydown({ key: "Escape" }); assert.equal(closes, 1); assert.equal(s.levelUpActive, true);
  assert.equal(s.pendingLevelUps, 3); assert.equal(s.umbraPhantomNovaRuntime.combatTimeMs, timer); assert.equal(s.skillMutationState.pendingQueue, queue);
});

test("saved old pointer, detail, pad actions and key handlers cannot act on replacement cards or an ended run", () => {
  const { scene: s } = ready(); let selected = 0, opened = 0;
  const object = () => ({ scene: s, visible: true, list: [], handlers: {}, setOrigin() { return this; }, setInteractive() { return this; },
    setStrokeStyle() { return this; }, on(name, callback) { this.handlers[name] = callback; return this; },
    add(child) { this.list.push(...(Array.isArray(child) ? child : [child])); return this; }, bringToTop() { return this; } });
  s.add = { container: object, graphics: object, text: object, zone: object, rectangle: object };
  s.overlayContainer = object(); s.overlayButtons = []; s.overlayActions = []; s.drawLevelUpCardBackground = () => {};
  s.selectLevelUpCard = () => selected++; s.openUmbraPlayerCardDetails = () => opened++;
  const { model } = growth(s, M, 1, 2), record = s.createUmbraPlayerLevelUpCard(model, 0, s.getUmbraPlayerCardLayout(1));
  s.levelUpCardRecords = [record]; s.levelUpInputEnabled = true;
  const actions = s.overlayActions.slice(); actions[0].onSelect(); actions[1].onSelect();
  assert.equal(selected, 1); assert.equal(opened, 1);
  let handler; s.input = { keyboard: { on(type, callback) { handler = callback; }, off() {} } }; s.registerLevelUpKeyboardInput();
  s.levelUpCardRecords = [{ ...record }];
  for (const action of actions) action.onSelect(); record.hitZone.handlers.pointerup(); record.detailButton.handlers.pointerup(); handler({ key: "1" }); handler({ key: "d" });
  assert.equal(selected, 1); assert.equal(opened, 1);
  s.levelUpCardRecords = [record]; s.umbraRunContext.state = "ENDED";
  for (const action of actions) action.onSelect();
  assert.equal(selected, 1); assert.equal(opened, 1);
});

test("normal pointer details take priority over the containing card in the generic scene pointer handler", () => {
  const { scene: s } = ready(); let card = 0, detail = 0;
  const parent = {}, button = {}; s.overlayContainer = { visible: true };
  s.overlayActions = [{ panel: parent, onSelect: () => card++, handlesOwnFlow: true }, { panel: button, onSelect: () => detail++, handlesOwnFlow: true }];
  s.levelUpCardRecords = [{ model: { umbraPlayerCard: {} }, detailButton: button }];
  s.getOverlayPointerGamePosition = () => ({ x: 1, y: 1 }); s.isPointInsideOverlayAction = () => true;
  s.handleOverlayPointerUp({ button: 0 }); assert.equal(detail, 1); assert.equal(card, 0);
  const consumed = {}; s.umbraPlayerCardConsumedPointerEvent = consumed;
  s.handleOverlayPointerUp({ button: 0, event: consumed }); assert.equal(detail, 1); assert.equal(card, 0);
  s.isUmbraNormalPresentationContext = () => false;
  s.handleOverlayPointerUp({ button: 0 }); assert.equal(detail, 1); assert.equal(card, 1);
});

module.exports = { ready, display, growth, mutation, samples };
