"use strict";

// Numeric Normal Context fixture. Actual damage/robot/overflow entry methods;
// render/notification leaves only are omitted. No browser, Storage or network.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const filename = path.join(__dirname, "umbra-normal-context.test.cjs"), content = fs.readFileSync(filename, "utf8");
const mod = new Module(filename, module); mod.filename = filename; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(content.slice(0, content.indexOf('\ntest("')) + "\nmodule.exports = {fixture};", filename);
function ready() {
  const f = mod.exports.fixture(), s = f.scene;
  s.prepareUmbraNormalRunContext(); f.bind(); f.activate(); s.robotState = s.createRobotState();
  s.coins = 100; s.runUnsecuredCoins = 0; s.invincibleUntil = 0;
  s.tweens = { add() {} };
  const leaves = ["spawnRobotHealPulse", "spawnRobotBarrierImpactEffect", "updateRobotBarrierVisual", "updateHudRobotPanel",
    "updateRobotVisualLevel", "updateRobotRecoveryFieldVisual", "showOverflowRewardText", "updateOverflowHud"];
  const calls = {}; for (const name of leaves) s[name] = () => { calls[name] = (calls[name] || 0) + 1; };
  return { ...f, leaves, calls };
}

test("normal actual damage, Recovery pulse and Barrier mutate HP/shield through existing effect methods", () => {
  const f = ready(), s = f.scene, maxHp = s.stats.maxHp;
  assert.equal(s.applyDamageToPlayer(20, { source: "pure-boundary-diagnostic" }), true);
  assert.equal(s.stats.hp, maxHp - 20);
  s.shopState = s.normalizeShopState({ ...s.shopState, robotCustom: { ...s.shopState.robotCustom, barrierUnlocked: true } });
  assert.equal(s.isRobotBarrierUnlocked(), true);
  const damaged = s.stats.hp, healing = s.getRobotHealAmount();
  s.updateRobotHealing(s.getRobotHealInterval());
  assert.equal(s.stats.hp, damaged + healing); assert.ok(s.robotState.barrierHp > 0);
  assert.equal(f.calls.spawnRobotHealPulse, 1); assert.ok(s.robotState.healXp > 0); assert.ok(s.robotState.syncGauge > 0);
  const hpBefore = s.stats.hp, barrierBefore = s.robotState.barrierHp;
  s.time.now = s.invincibleUntil + 1; // Explicit numeric clock boundary, not physical/rAF timing.
  assert.equal(s.applyDamageToPlayer(2, { source: "pure-boundary-barrier" }), true);
  assert.equal(s.stats.hp, hpBefore); assert.equal(s.robotState.barrierHp, barrierBefore - 2);
  assert.ok(f.calls.spawnRobotBarrierImpactEffect > 0); assert.equal(s.coins, 100);
});

test("normal overflow performs actual activation and charge consumption while rewards stay unsecured", () => {
  const f = ready(), s = f.scene;
  const result = s.addOverdriveFromXp(2000); // Explicit overflow input, no natural XP-cap claim.
  assert.equal(result.triggered, true); assert.ok(s.overflowRewardState.overdriveRemainingMs > 0);
  const duration = s.overflowRewardState.overdriveRemainingMs; s.updateOverdrive(100);
  assert.equal(s.overflowRewardState.overdriveRemainingMs, duration - 100);
  assert.ok(s.runUnsecuredCoins > 0); assert.equal(s.coins, 100);
  const charge = s.addStabilizeGauge(100);
  assert.equal(charge.chargesAdded, 1); assert.equal(s.overflowRewardState.stabilizeCharges, 1);
  const bonusMs = s.consumeStabilizeChargesForGate();
  assert.ok(bonusMs > 0); assert.equal(s.overflowRewardState.stabilizeCharges, 0);
  assert.equal(s.consumeStabilizeChargesForGate(), 0); assert.equal(s.coins, 100);
});
