"use strict";
// Bounded isolated regression: real boost/overlap/damage, AP-zero end and reset.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const { chromium } = require("playwright"), h = require("./umbra-growth-browser.cjs");
const out = process.env.UMBRA_TEST_OUTPUT;
if (!out) throw Error("Use a new UMBRA_TEST_OUTPUT directory");
fs.mkdirSync(out, { recursive: true });
const expectUi = process.argv.includes("--expect-ui"), report = { createdAt: new Date().toISOString(), sources: h.report.sources,
  harnessSha256: crypto.createHash("sha256").update(fs.readFileSync(__filename)).digest("hex"), expectUi, cases: [], errors: [] };
(async () => { let browser; try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER }); h.setBrowser(browser);
  for (const viewport of [{ width: 1280, height: 800 }, { width: 740, height: 420 }]) {
    const run = await h.open(`AP0-${viewport.width}`, "&umbraGrowth=1&umbraCore=1", viewport);
    try {
      const contact = await run.page.evaluate(() => {
        const g = window.__SURVIVAL_GAME__, s = g.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
        a.configId = "boss"; a.coreComparisonWeapons = "moonlight"; a.resetGrowthPreset(1);
        s.closeCandidateCards(); s.pendingLevelUps = 0; s.startingUpgradeSelectionsRemaining = 0; s.levelUpActive = false;
        s.physics.world.resume(); a.contactButton.box.emit("pointerdown");
        s.playerHitbox.body.reset(1240, 600); let t = s.time.now; const dt = 1000 / 60;
        const setInput = keys => { for (const k of ["left", "right", "up", "down", "dash", "dashAlt"]) { s.keys[k].isDown = keys.includes(k); s.keys[k].isUp = !s.keys[k].isDown; } };
        setInput([]); for (let n = 0; n < 3; n++) g.step(t += dt, dt);
        const rows = [], target = [...a.enemies.keys()].find(e => !e.body.isCircle);
        setInput(["right", "dash"]);
        for (let n = 0; n < 1200 && !s.gameOver; n++) {
          if (n === 60) setInput([]);
          if (n === 100) setInput(["left", "dash"]);
          const hp = s.stats.hp; g.step(t += dt, dt);
          if (hp !== s.stats.hp || n % 15 === 0 || s.gameOver) rows.push({ t, hp: s.stats.hp, maxHp: s.stats.maxHp, x: s.playerHitbox.body.center.x,
            boost: s.acMovementState?.continuousBoost?.active, evade: s.acMovementState?.evadeWindow?.active, scene: s.sceneUpdates, physics: s.physicsSteps, gameOver: s.gameOver });
        }
        setInput([]); const before = { scene: s.sceneUpdates, physics: s.physicsSteps, now: s.time.now };
        for (let n = 0; n < 30; n++) g.step(t += dt, dt);
        window.__apZeroClock = t;
        return { rows, target: { hp: target.hp, maxHp: target.maxHp, contactDamage: target.contactDamage }, hp: s.stats.hp,
          gameOver: s.gameOver, drivePaused: s.drivePaused, worldPaused: s.physics.world.isPaused, before,
          after: { scene: s.sceneUpdates, physics: s.physicsSteps, now: s.time.now }, ownedStage: s.playerSkills.umbraMoonlight?.stageIndex + 1,
          hud: a.info.text, status: s.statusLabel.text, reason: a.reasonInfo.text, contactEnabled: a.contactEnabled,
          endNotice: a.endNotice?.text || null };
      });
      await run.page.screenshot({ path: path.join(out, `ap-zero-${viewport.width}.png`) });
      const raf = await run.page.evaluate(() => new Promise(resolve => {
        let calls = 0; const start = performance.now(); const next = () => { if (++calls === 8) resolve({ calls, elapsedMs: performance.now() - start }); else requestAnimationFrame(next); }; requestAnimationFrame(next);
      }));
      await run.page.keyboard.press("p");
      const endedControls = await run.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
        a.contactButton.box.emit("pointerdown");
        const result = { hp: s.stats.hp, gameOver: s.gameOver, paused: s.drivePaused, worldPaused: s.physics.world.isPaused, contact: a.contactEnabled };
        a.contactButton.box.emit("pointerdown"); return result;
      });
      // A real keyboard event must still reach the existing new-run reset.
      await run.page.keyboard.press("r");
      const reset = await run.page.evaluate(() => {
        const s = window.__SURVIVAL_GAME__.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
        return { hp: s.stats.hp, maxHp: s.stats.maxHp, gameOver: s.gameOver, contact: a.contactEnabled,
          stage: s.playerSkills.umbraMoonlight?.stageIndex + 1, noticeVisible: a.endNotice?.visible || false };
      });
      const off = await run.page.evaluate(() => {
        const g = window.__SURVIVAL_GAME__, s = g.scene.getScene("UmbraPhase2ADrive"), a = s.moonlightArena;
        a.contactButton.box.emit("pointerdown"); s.playerHitbox.body.reset(1240, 600); s.physics.world.resume();
        let t = s.time.now; for (let n = 0; n < 3; n++) g.step(t += 1000 / 60, 1000 / 60);
        s.keys.right.isDown = true; s.keys.right.isUp = false; s.keys.dash.isDown = true; s.keys.dash.isUp = false;
        for (let n = 0; n < 120; n++) g.step(t += 1000 / 60, 1000 / 60);
        s.keys.right.isDown = false; s.keys.dash.isDown = false;
        return { hp: s.stats.hp, maxHp: s.stats.maxHp, gameOver: s.gameOver, contact: a.contactEnabled, x: s.playerHitbox.body.center.x, overlaps: a.contact.overlaps };
      });
      const checks = {
        realContactEndedAtApZero: contact.gameOver && contact.hp === 0 && contact.contactEnabled,
        actualBoost: contact.rows.some(row => row.boost),
        endedPhysicsFrozenSceneClockAlive: contact.worldPaused && contact.before.physics === contact.after.physics && contact.before.scene === contact.after.scene && contact.after.now > contact.before.now,
        browserRafAlive: raf.calls === 8,
        acquiredSkillNotDeleted: contact.ownedStage === 1,
        realRResets: !reset.gameOver && reset.hp === reset.maxHp && reset.stage === 1 && reset.contact && !reset.noticeVisible,
        contactOffPassThrough: !off.gameOver && !off.contact && off.hp === off.maxHp && off.x > 1600
      };
      if (expectUi) Object.assign(checks, { endNotice: /試走終了/.test(contact.endNotice || ""), correctStageLabel: /MOON S1/.test(contact.hud) && !/MOON 未取得/.test(contact.hud), endedStatus: /試走終了/.test(contact.status),
        endedControlsDoNotRevive: endedControls.hp === 0 && endedControls.gameOver && endedControls.paused && endedControls.worldPaused && !endedControls.contact });
      report.cases.push({ viewport, contact, raf, endedControls, reset, off, checks, passed: Object.values(checks).every(Boolean) });
    } finally { await h.close(run); }
  }
} catch (e) { report.errors.push(e.stack); } finally {
  await browser?.close(); report.contexts = h.report.contexts;
  report.passed = !report.errors.length && report.cases.length === 2 && report.cases.every(c => c.passed) && report.contexts.every(c => c.passed);
  const file = path.join(out, `ap-zero-${Date.now()}.json`); fs.writeFileSync(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ file, passed: report.passed, errors: report.errors, cases: report.cases.map(c => ({ viewport: c.viewport, hp: c.contact.hp, target: c.contact.target, damageRows: c.contact.rows.filter((r,i,rows) => i === 0 || r.hp !== rows[i-1].hp), hud: c.contact.hud, status: c.contact.status, reset: c.reset, off: c.off, checks: c.checks })) }));
  process.exitCode = report.passed ? 0 : 1;
} })();
