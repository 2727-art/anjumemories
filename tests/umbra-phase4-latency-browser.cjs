"use strict";
// Phase 4 supplement: diagnostic wrappers in disposable private contexts only.
// No production source, physics cadence, attack settings, or saved data changes.
const { chromium } = require("playwright");
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto");
const project = path.resolve(__dirname, ".."), base = "http://127.0.0.1:4173";
const sha = b => crypto.createHash("sha256").update(b).digest("hex");
const output = process.env.UMBRA_TEST_OUTPUT;
if (!output) throw Error("Set a new UMBRA_TEST_OUTPUT directory; existing reports are never overwritten");
fs.mkdirSync(output, { recursive: true });
const destination = path.join(output, "latency-report.json");
if (fs.existsSync(destination)) throw Error("Report already exists: " + destination);
fs.writeFileSync(path.join(output,"harness.cjs"),fs.readFileSync(__filename),{flag:"wx"});
const frozen = new Map();
for (const name of ["index.html", "game.js", "skillDefinitions.js", "equipmentDefinitions.js", "stageDefinitions.js", "umbraDrive.js", "umbraDriveRuntime.js", "umbraDriveFixtures.js", "umbraMoonlightArena.js", "umbraPreview.js", "umbraPreviewAssets.js", "vendor/phaser.min.js"]) {
  const body = fs.readFileSync(path.join(project, name)); frozen.set(name, { body, sha256: sha(body) });
}
const report = { createdAt: new Date().toISOString(), sources: Object.fromEntries([...frozen].map(([n, b]) => [n, b.sha256])),
  harnessSha256: sha(fs.readFileSync(__filename)), cases: [], contexts: [],
  methodology: "Single browser, sequential fresh contexts. Same baseline fixture, camera, elite enemy layout and neutral50/right+dash900ms schedule for all four weapons. Controlled 60Hz Game.step loops versus separate normal rAF. Common numeric inclusive timing wrappers; parent/child durations must not be summed. A retains old detailed WORLD_STEP/trace observers and post-step snapshots, B omits only these added harness records. Production diagnostic consumers/HUD remain unless a labelled factor disables status HUD. Main wall timing excludes row capture, setup/spawn/reset, report serialization and export. All outliers retained. CPU-side call elapsed time is not GPU timing or CPU busy time." };
const suite = process.argv[2] || "ab";
const configurations = suite === "ab" ? [16, 128].flatMap(n => ["none", "moonlight", "bloodSpike", "both"].flatMap((weapon, i) => (i % 2 ? ["B", "A"] : ["A", "B"]).map(observer => ({ n, weapon, observer, fx: "image", hud: "on", driver: "controlled", repeats: 3 }))))
  : suite === "factors" ? ["image", "fallback", "off"].map(fx => ({ n: 128, weapon: "both", observer: "B", fx, hud: "on", driver: "controlled", repeats: 3 })).concat(["hidden", "updates-off"].map(hud => ({ n: 128, weapon: "both", observer: "B", fx: "image", hud, driver: "controlled", repeats: 3 })))
  : suite === "raf" ? ["none", "moonlight", "bloodSpike", "both"].map(weapon => ({ n: 128, weapon, observer: "B", fx: "image", hud: "on", driver: "raf", repeats: 3, durationMs: 5000 }))
  : suite === "raf-steady" ? [{ n: 128, weapon: "both", observer: "B", fx: "image", hud: "on", driver: "raf", repeats: 1, durationMs: 10000, warmupFrames: 120 }]
  : suite === "confirm" ? ["on", "updates-off", "updates-off", "on"].map(hud => ({ n: 128, weapon: "both", observer: "B", fx: "image", hud, driver: "controlled", repeats: 6 }))
  : suite === "cadence" ? ["controlled", "paced", "paced", "controlled"].map(driver => ({ n: 128, weapon: "both", observer: "B", fx: "image", hud: "on", driver, repeats: 3 }))
  : suite === "smoke" ? [{ n: 16, weapon: "both", observer: "A", fx: "image", hud: "on", driver: "controlled", repeats: 1 }]
  : (() => { throw Error("Unknown suite"); })();

function summarize(rows, field) {
  const a = rows.map(r => r[field]).filter(Number.isFinite).sort((a,b) => a-b);
  const p = q => a[Math.max(0, Math.ceil(a.length*q)-1)] ?? null;
  return { count: a.length, mean: a.reduce((x,y) => x+y,0)/a.length, median: a.length % 2 ? p(.5) : (a[a.length/2-1]+a[a.length/2])/2, p95: p(.95), p99: p(.99), max: p(1), over100: a.filter(x => x >= 100).length };
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.UMBRA_TEST_BROWSER, args: ["--disable-background-networking"] });
  report.browserVersion = browser.version();
  try {
    for (const config of configurations) {
      const audit = { config, external: [], pageErrors: [] }; report.contexts.push(audit);
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: "block" });
      await context.route("**/*", route => {
        const url = route.request().url();
        if (!url.startsWith(base + "/")) { audit.external.push(url); return route.abort(); }
        const name = decodeURIComponent(new URL(url).pathname).slice(1) || "index.html", entry = frozen.get(name);
        return entry ? route.fulfill({ status: 200, body: entry.body, contentType: name.endsWith(".html") ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }) : route.continue();
      });
      const page = await context.newPage(); page.on("pageerror", e => audit.pageErrors.push(e.stack));
      await page.addInitScript(() => {
        window.__latencyAudit = { storage: [], normal: [], probes: 0 };
        for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) Storage.prototype[method] = function () { window.__latencyAudit.storage.push(method); throw Error("Storage forbidden"); };
        for (const name of ["localStorage", "sessionStorage"]) Object.defineProperty(window, name, { configurable: true, get() { window.__latencyAudit.probes++; throw Error("Storage access forbidden"); } });
        let factory;
        Object.defineProperty(window, "createUmbraPhase2ADriveScene", { configurable: true, get() { return factory; }, set(value) {
          factory = function (...args) {
            const Scene = value(...args), original = Scene.prototype.create;
            Scene.prototype.create = function (...a) {
              original.apply(this, a);
              if (this.moonlightArena) { this.moonlightArena.configId = "empty"; this.resetDrive(this.mechId, this.fixtureId); }
              this.physics.world.pause();
            };
            return Scene;
          };
        } });
        window.addEventListener("load", () => {
          for (const name of ["init", "preload", "create", "createState", "initializeCloudSaveRuntime", "beginCloudSaveBootstrap", "getFirebaseLeaderboardClient", "addKillRankingEntry"]) {
            const method = SurvivalScene.prototype[name];
            if (typeof method === "function") SurvivalScene.prototype[name] = function (...args) { window.__latencyAudit.normal.push(name); return method.apply(this, args); };
          }
        }, { once: true });
      });
      await page.goto(base + "/?umbraPreview=1&umbraDrive=1&umbraBloodSpike=1&umbraMoonlight=1");
      await page.waitForFunction(() => window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase1Assets")?.status.finished && window.__SURVIVAL_GAME__?.scene.getScene("UmbraPhase2ADrive")?.moonlightArena, null, { timeout: 30000 });
      const cases = await page.evaluate(async config => {
        const game = window.__SURVIVAL_GAME__, s = game.scene.getScene("UmbraPhase2ADrive"), arena = s.moonlightArena;
        game.loop.stop();
        const results = [], dt = 1000/60, copy = x => JSON.parse(JSON.stringify(x ?? null));
        const input = (...keys) => { for (const name of ["up", "down", "left", "right", "w", "a", "s", "d", "dash", "dashAlt"]) { s.keys[name].isDown = keys.includes(name); s.keys[name].isUp = !s.keys[name].isDown; } };
        const center = b => ({ x: b.position.x+b.halfWidth, y: b.position.y+b.halfHeight });
        const listenerCounts = e => Object.fromEntries(e.eventNames().map(n => [String(n),e.listenerCount(n)]));
        const inventory = () => ({ realMs: performance.now(), sceneTime: s.time.now, sceneUpdates: s.sceneUpdates, physicsSteps: s.physicsSteps,
          displayList: s.children.list.length, updateList: s.sys.updateList.getActive().length, bodies: s.physics.world.bodies.size,
          timerActive: s.time._active.length, timerInsert: s.time._pendingInsertion.length, timerRemove: s.time._pendingRemoval.length, tweens: s.tweens.tweens.length,
          enemies: arena.enemies.size, effects: arena.effects.length, spikeEffects: arena.spikeEffects.size, numbers: arena.numbers.length,
          listeners: { game: listenerCounts(game.events), scene: listenerCounts(s.events), world: listenerCounts(s.physics.world), input: listenerCounts(s.input), keyboard: listenerCounts(s.input.keyboard) } });
        const gl = game.renderer.gl, debug = gl?.getExtension("WEBGL_debug_renderer_info");
        const environment = { phaser: Phaser.VERSION, rendererType: game.renderer.type, glVendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null, glRenderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null, fps: s.physics.world.fps, fixedStep: s.physics.world.fixedStep };
        for (let repeat=0; repeat<config.repeats; repeat++) {
          let time = config.driver !== "raf" ? 10000 + repeat*10000 : performance.now();
          s.time.now = time; arena.configId="empty"; arena.weaponSelection=config.weapon; arena.fxMode=config.fx; arena.contactEnabled=false;
          s.resetDrive("umbraSeraph", "baseline"); input();
          const item = { ...config, repeat, cold: repeat===0, environment, before: inventory(), frames: [], physical: [], notices: [], detailedFrames: [], setup: [], inputChanges: [], rafIntervals: [] };
          const restores=[], wrap=(obj,key,label) => {
            const original=obj?.[key]; if(typeof original!=="function") return;
            obj[key]=function(...args){ const start=performance.now(); try { return original.apply(this,args); } finally { if(metrics) { metrics[label]=(metrics[label]||0)+performance.now()-start; metrics[label+"Calls"]=(metrics[label+"Calls"]||0)+1; } } };
            restores.push(()=>{obj[key]=original;});
          };
          let metrics=null;
          if (config.hud !== "on") { const visible=s.uiCamera.visible; s.uiCamera.visible=false; restores.push(()=>{s.uiCamera.visible=visible;}); }
          if(config.hud === "updates-off") {
            for (const [obj,key,fn] of [[arena,"refreshHud",()=>{}],[s,"refreshDriveHud",()=>s.refreshDriveTraceHud()],[s.driveTraceLabel,"setText",function(){return this;}]]) {
              const original=obj[key]; obj[key]=fn; restores.push(()=>{obj[key]=original;});
            }
          }
          for(const [obj,key,label] of [[game.scene,"update","sceneManager"],[s.sys,"sceneUpdate","driveUpdate"],[s.sys,"step","driveSysStep"],
            [arena,"update","arenaUpdate"],[arena,"renderEnemy","enemyDraw"],[arena,"refreshHud","arenaHud"],[arena,"updateSpikeFx","spikeFx"],
            [s,"refreshDriveHud","driveHud"],[s,"refreshDriveTraceHud","traceHud"],[s,"observeUmbraBloodSpikeStep","spikeEntry"],[s,"receiveUmbraMoonlightTrace","moonEntry"],[s,"observeUmbraBoostTraceStep","traceEntry"],
            [game.renderer,"preRender","preRender"],[game.scene,"render","sceneRender"],[game.renderer,"render","rendererRender"],[game.renderer,"postRender","postRender"],
            [Phaser.GameObjects.Text.prototype,"updateText","textUpdate"],[game.renderer,"canvasToTexture","canvasTexture"],
            [game.renderer,"updateCanvasTexture","updateCanvasTexture"],[game.renderer,"createCanvasTexture","createCanvasTexture"]]) wrap(obj,key,label);
          // Separate follow-up instrumentation; elapsed synchronous GL calls do
          // not identify GPU execution time. All compared factor runs share it.
          for(const key of ["bufferSubData","bufferData","texSubImage2D","texImage2D","drawElements","drawArrays","flush","finish","readPixels","checkFramebufferStatus"])wrap(gl,key,"gl_"+key);
          const emit = s.events.emit;
          s.events.emit=function(event,...args){ const start=performance.now(); try{return emit.call(this,event,...args);}finally{if(metrics && ["preupdate","update","postupdate"].includes(event))metrics[event]=(metrics[event]||0)+performance.now()-start;} };
          restores.push(()=>{s.events.emit=emit;});
          if(config.observer === "A") {
            const unsubscribe=s.subscribeUmbraBoostTrace("latency-detailed-observer",n=>{const start=performance.now();item.notices.push(copy(n)); if(metrics)metrics.observerTrace=(metrics.observerTrace||0)+performance.now()-start;}); restores.push(unsubscribe);
            const observer=delta=>{
              const start=performance.now(), targets=Array.from(arena.enemies.keys()).filter(e=>e.active&&e.body), spike=s.getUmbraBloodSpikeSnapshot(), moon=s.getUmbraMoonlightSnapshot();
              item.physical.push({deltaMs:delta*1000,sceneTime:s.time.now,player:center(s.playerHitbox.body),spike:{combatTimeMs:spike.combatTimeMs,counts:spike.counts,lastProcessingMs:spike.lastProcessingMs},moon:{combatTimeMs:moon?.combatTimeMs,counts:moon?.counts,lastProcessingMs:moon?.lastProcessingMs},targetCount:targets.length,targets:targets.slice(0,16).map(e=>({id:e.moonlightArenaId,lifeId:s.umbraBloodSpikeRuntime?.targets.get(e)?.lifeId,hp:e.hp,dying:!!e.isDying,position:center(e.body),shape:{circle:e.body.isCircle,width:e.body.width,height:e.body.height}}))});
              if(metrics)metrics.observerPhysical=(metrics.observerPhysical||0)+performance.now()-start;
            };
            s.physics.world.on("worldstep",observer); restores.push(()=>s.physics.world.off("worldstep",observer));
          }
          const originalStep=game.step;
          game.step=function(t,delta){
            const beforeScene=s.sceneUpdates,beforePhysics=s.physicsSteps; metrics={}; const start=performance.now();
            originalStep.call(this,t,delta); const end=performance.now(), row=metrics; metrics=null;
            const captureStart=performance.now(), b=s.playerHitbox.body, sp=s.umbraBloodSpikeRuntime, mo=s.umbraMoonlightRuntime;
            Object.assign(row,{ index:item.frames.length, realStartMs:start,realEndMs:end,wallMs:end-start, sceneTime:s.time.now,delta,
              sceneBefore:beforeScene,sceneAfter:s.sceneUpdates,physicsBefore:beforePhysics,physicsAfter:s.physicsSteps,
              x:b.position.x+b.halfWidth,y:b.position.y+b.halfHeight,vx:b.velocity.x,vy:b.velocity.y,en:s.stats.stamina,
              evade:s.isAcEvadeWindowActive(s.time.now),mode:s.acMovementState.mode,airBrake:!!s.acMovementState.airBrake.active,
              casts:sp?.counts.casts||0,impacts:sp?.counts.impacts||0,spikeAccepted:sp?.counts.accepted||0,spikeKills:sp?.counts.kills||0,moonAccepted:mo?.counts.accepted||0,moonKills:mo?.counts.kills||0,
              spikeCoreMs:sp?.lastProcessingMs||0,moonCoreMs:mo?.lastProcessingMs||0,spikeTime:sp?.combatTimeMs||0,
              displayList:s.children.list.length,timerActive:s.time._active.length,timerInsert:s.time._pendingInsertion.length,timerRemove:s.time._pendingRemoval.length,tweens:s.tweens.tweens.length,
              fx:arena.effects.length,spikeFxCount:arena.spikeEffects.size,numbers:arena.numbers.length,rawDelta:game.loop.rawDelta,smoothedDelta:game.loop.delta });
            row.commonCaptureMs=performance.now()-captureStart;
            if(config.observer === "A") {const at=performance.now();item.detailedFrames.push({position:center(b),velocity:{x:b.velocity.x,y:b.velocity.y},spikeTime:s.getUmbraBloodSpikeSnapshot()?.combatTimeMs,moonTime:s.getUmbraMoonlightSnapshot()?.combatTimeMs});row.postStepSnapshotMs=performance.now()-at;}
            item.frames.push(row);
          };
          restores.push(()=>{game.step=originalStep;});
          let spawned=false;
          function applyInput(elapsed){
            if(elapsed < 50-1e-6) {input();return;}
            if(!spawned){
              const at=performance.now(); for(let i=0;i<config.n;i++) arena.spawnEnemy({isElite:true,x:600+(i<16?(i%4)*10:Math.floor(i/16)*70),y:i<16?490+Math.floor(i/4)*10:1200+(i%8)*30});
              item.setup.push({action:"spawn",durationMs:performance.now()-at,elapsed}); spawned=true;
              item.inputChanges.push({elapsed,realMs:performance.now(),keys:["right","dash"]});
            }
            // Same schedule in the longer rAF run: release after the 900ms boost.
            if(elapsed<950-1e-6)input("right","dash");else{input();if(item.inputChanges.length===1)item.inputChanges.push({elapsed,realMs:performance.now(),keys:[]});}
          }
          try {
            item.windowStartMs=performance.now();
            if(config.driver !== "raf") {
              for(let i=0;i<57;i++){
                applyInput(i*dt);time+=dt;game.step(time,dt);
                // A separate dispatch-cadence probe, not a different physics
                // step or a claim of precise 60Hz presentation. Yield is outside
                // Game.step timing; logical input/time samples remain identical.
                if(config.driver === "paced")await new Promise(resolve=>setTimeout(resolve,dt));
              }
            } else {
              await new Promise((resolve,reject)=>{
                let origin=null,lastRaf=null,watchId,warmed=0;
                const warmupStart=performance.now();
                const stop=error=>{game.loop.stop();cancelAnimationFrame(watchId);clearTimeout(watchdog);error?reject(error):resolve();};
                const watchdog=setTimeout(()=>stop(Error("rAF measurement exceeded 30 seconds")),30000);
                const watch=t=>{if(lastRaf!==null)item.rafIntervals.push({time:t,interval:t-lastRaf});lastRaf=t;watchId=requestAnimationFrame(watch);}; watchId=requestAnimationFrame(watch);
                game.loop.start((t,delta)=>{
                  try {
                  if(warmed < (config.warmupFrames||0)) {
                    // Let the existing TimeStep startup cooldown expire through
                    // ordinary empty-arena rAF callbacks; no engine setting is
                    // changed. Then reset the same fixture outside measurement.
                    originalStep.call(game,t,delta);warmed++;
                    if(warmed === config.warmupFrames){
                      item.warmup={callbacks:warmed,realMs:performance.now()-warmupStart,coolDown:game.loop._coolDown};
                      s.time.now=t;s.resetDrive("umbraSeraph","baseline");input();item.before=inventory();
                      item.rafIntervals.length=0;lastRaf=null;item.windowStartMs=performance.now();
                    }
                    return;
                  }
                  if(origin===null)origin=t;
                  const elapsed=t-origin;applyInput(elapsed);game.step(t,delta);
                  if(elapsed >= config.durationMs)stop();
                  } catch(error) {stop(error);}
                });
              });
            }
            item.windowEndMs=performance.now();item.after=inventory();
          } finally { game.loop.stop(); input(); restores.reverse().forEach(fn=>fn()); }
          item.restored=inventory();
          item.spike=s.getUmbraBloodSpikeSnapshot();item.moon=s.getUmbraMoonlightSnapshot();item.trace=s.getDriveTraceDiagnostics();item.arena=arena.getSnapshot();
          item.finalState={player:center(s.playerHitbox.body),velocity:{x:s.playerHitbox.body.velocity.x,y:s.playerHitbox.body.velocity.y},en:s.stats.stamina,
            spike:copy(item.spike?.counts),moon:copy(item.moon?.counts),enemies:[...arena.enemies.keys()].map(e=>({hp:e.hp,active:e.active,position:center(e.body)})),
            sceneUpdates:s.sceneUpdates,physicsSteps:s.physicsSteps,traceA:item.trace.A?.hash,traceB:item.trace.B?.hash};
          results.push(item);
        }
        window.__latencyResultAudit=window.__latencyAudit;
        return results;
      }, config);
      for (const item of cases) {
        item.summary = summarize(item.frames,"wallMs");item.rafSummary=summarize(item.rafIntervals,"interval");
        item.outliers=item.frames.filter(r=>r.wallMs>=100);item.stateHash=sha(JSON.stringify(item.finalState));report.cases.push(item);
      }
      audit.runtime = await page.evaluate(()=>window.__latencyResultAudit);
      audit.checks={framesPresent:cases.every(c=>c.frames.length>0),consumerErrorsZero:cases.every(c=>(c.spike?.errors||0)===0&&(c.moon?.errors||0)===0&&(c.trace.source?.consumerErrors||0)===0),
        traceParity:cases.every(c=>c.trace.A?.hash===c.trace.B?.hash&&c.trace.A?.count===c.trace.B?.count),externalRequestsZero:audit.external.length===0,pageErrorsZero:audit.pageErrors.length===0,
        storageMethodsZero:audit.runtime.storage.length===0,normalSceneEntriesZero:audit.runtime.normal.length===0};
      await context.close();
      // Disk output/logging occurs after this entire context's measurement windows.
      fs.writeFileSync(path.join(output,`context-${report.contexts.length}.json`),JSON.stringify({audit,cases},null,2),{flag:"wx"});
      process.stdout.write(JSON.stringify({done:report.contexts.length,config,summaries:cases.map(c=>c.summary)})+"\n");
    }
  } finally {await browser.close();fs.writeFileSync(destination,JSON.stringify(report,null,2),{flag:"wx"});}
})().catch(e=>{process.stderr.write(e.stack+"\n");process.exitCode=1;});
