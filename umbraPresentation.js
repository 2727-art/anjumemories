/* UMBRA presentation only. No physics, target selection, combat clock updates, IO or arena fixtures. */
(function () {
  "use strict";
  const NOVA_DISPLAY = Object.freeze({ hudIntervalMs: 100, rayLimit: 12, rayDurationMs: 180, regenerationShrinkMs: 150,
    orbitScaleMultiplier: 0.45, deployedScaleMultiplier: 0.62 });
  const CORE_TINTS = Object.freeze({ assault: 0xffd1a3, control: 0xc2bcff, reactor: 0xb6f5ff });
  const SPIKE_DISPLAY = Object.freeze({ baseImpactRadius: 80 });
  const FINAL_DISPLAY = Object.freeze({ secondaryLimit: 12, executionLimit: 12, markDurationMs: 180, fieldLimit: 6 });
  function drawControlMark(graphics, x, y, halfHeight) {
    graphics.lineStyle(2, CORE_TINTS.control, 0.85).strokeEllipse(x, y + halfHeight + 3, 22, 7)
      .lineBetween(x - 7, y + halfHeight + 9, x + 7, y + halfHeight + 9);
  }
  function registerEffectFrames(textures, assets, key) {
    const effect = Object.values(assets.effects).find(item => item.key === key);
    if (!effect || !textures.exists(key)) return false;
    const texture = textures.get(key);
    effect.frames.forEach(frame => { if (!texture.has(frame.name)) texture.add(frame.name, 0, frame.x, frame.y, frame.width, frame.height); });
    return true;
  }
  window.umbraPresentation = Object.freeze({ version: "umbra-spike-giant-v1", NOVA_DISPLAY, SPIKE_DISPLAY, CORE_TINTS, FINAL_DISPLAY, drawControlMark, registerEffectFrames });
  window.createUmbraPresentation = function (scene, options = {}) {
    const assets = options.assets || window.umbraPreviewAssets;
    if (!assets?.effects || !scene?.add || typeof options.isActive !== "function") throw new Error("UMBRA presentation dependencies are unavailable");
    const growth = options.growth === true, core = options.core === true, final = options.final === true;
    const phase4 = options.spike === true, phase5 = options.nova === true;
    const effect = assets.effects.umbraMoonlight, spikeEffect = assets.effects.umbraBloodSpike, novaEffect = assets.effects.umbraPhantomNova;
    const ignore = object => { options.ignoreWorldObject?.(object); return object; };
    const guides = () => options.isGuidesVisible?.() === true;
    const combatClock = () => Math.max(0, Number(scene.umbraMoonlightRuntime?.combatTimeMs) || 0);
    const novaClock = () => Math.max(0, Number(scene.umbraPhantomNovaRuntime?.combatTimeMs) || 0);
    const coreTint = profile => core ? CORE_TINTS[profile?.coreId] : null;
    const maxImpactFx = () => Math.max(0, Math.floor(Number(scene.getUmbraMoonlightStage1Config?.()?.maxImpactFx) || 0));
    const arena = {
      fxMode: "image", destroyed: false, effects: [], spikeEffects: new Map(), novaEffects: new Map(), novaRays: [],
      fxCounts: { requested: 0, shown: 0, fallback: 0, capped: 0, hidden: 0, completed: 0 },
      spikeFxCounts: { created: 0, image: 0, fallback: 0, hidden: 0, destroyed: 0 },
      novaFxCounts: { created: 0, destroyed: 0, image: 0, fallback: 0, rayRequested: 0, rayShown: 0, rayCapped: 0, rayHidden: 0 },
      ...(final ? { finalFields: new Map(), finalMarks: [], finalFxCounts: { secondaryRequested: 0, secondaryShown: 0, executionRequested: 0, executionShown: 0, capped: 0, hidden: 0, completed: 0 } } : {})
    };
    const active = () => !arena.destroyed && options.isActive() === true;
    arena.clearEffects = function () { arena.effects.splice(0).forEach(fx => fx.object.destroy()); };
    arena.clearSpikeEffects = function () {
      for (const fx of arena.spikeEffects.values()) { fx.object?.destroy(); fx.ground?.destroy(); arena.spikeFxCounts.destroyed++; }
      arena.spikeEffects.clear();
    };
    arena.clearNovaEffects = function () {
      for (const fx of arena.novaEffects.values()) { fx.object?.destroy(); fx.ground?.destroy(); arena.novaFxCounts.destroyed++; }
      arena.novaEffects.clear(); arena.novaRays.splice(0).forEach(ray => ray.object.destroy());
    };
    function drawExecutionMark(graphics, x, y, tint = 0xdce9ff, alpha = 0.9) {
      graphics.lineStyle(1, tint || 0xdce9ff, alpha).lineBetween(x, y - 15, x, y + 15)
        .lineBetween(x - 7, y - 9, x - 7, y - 4).lineBetween(x - 7, y - 9, x - 2, y - 9)
        .lineBetween(x + 7, y + 9, x + 7, y + 4).lineBetween(x + 7, y + 9, x + 2, y + 9);
    }
    arena.spawnHitFx = function (hit) {
      arena.fxCounts.requested++;
      if (!active() || arena.fxMode === "off") { arena.fxCounts.hidden++; return; }
      if (arena.effects.length >= maxImpactFx()) { arena.fxCounts.capped++; return; }
      const position = hit.position;
      if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return;
      const imageAvailable = arena.fxMode === "image" && scene.textures.exists(effect.key)
        && effect.frames.every(frame => scene.textures.get(effect.key).has(frame.name));
      const object = ignore(imageAvailable ? scene.add.image(position.x, position.y, effect.key, effect.frames[0].name).setDepth(24)
        : scene.add.graphics().setDepth(24));
      const fx = { object, x: position.x, y: position.y, age: 0, createdCombatTimeMs: combatClock(), image: imageAvailable, lastFrame: -1,
        ...(core ? { coreProfile: hit.coreProfile } : {}), ...(final ? { finalProfile: hit.finalProfile } : {}) };
      arena.effects.push(fx); arena.fxCounts.shown++; if (!imageAvailable) arena.fxCounts.fallback++;
      arena.drawFx(fx);
    };
    arena.drawFx = function (fx) {
      const index = Math.min(effect.frames.length - 1, Math.floor(fx.age * effect.frameRate / 1000));
      if (index === fx.lastFrame) return;
      fx.lastFrame = index;
      if (fx.image) {
        const frame = effect.frames[index];
        fx.object.setFrame(frame.name).setOrigin(frame.origin.x, frame.origin.y).setScale(effect.displayScale).setPosition(fx.x, fx.y);
        if (coreTint(fx.coreProfile)) fx.object.setTint(coreTint(fx.coreProfile));
      } else {
        const spread = 13 + index * 5, alpha = Math.max(0.1, 1 - index / 8);
        fx.object.clear().lineStyle(5 - index * 0.4, coreTint(fx.coreProfile) || 0xcaffff, alpha).lineBetween(fx.x - spread, fx.y + spread * 0.5, fx.x + spread, fx.y - spread * 0.5);
      }
    };
    arena.updateSpikeFx = function () {
      if (!phase4) return;
      const snapshot = scene.getUmbraBloodSpikeSnapshot?.();
      const casts = snapshot?.casts || [], living = new Set(casts.map(cast => cast.castId));
      for (const [id, fx] of arena.spikeEffects) {
        if (!living.has(id)) { fx.object?.destroy(); fx.ground?.destroy(); arena.spikeEffects.delete(id); arena.spikeFxCounts.destroyed++; }
      }
      for (const cast of casts) {
        const x = cast.position?.x, y = cast.position?.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        let fx = arena.spikeEffects.get(cast.castId);
        if (!fx) {
          const imageAvailable = arena.fxMode === "image" && scene.textures.exists(spikeEffect.key)
            && spikeEffect.frames.every(frame => scene.textures.get(spikeEffect.key).has(frame.name));
          const object = arena.fxMode === "off" ? null : ignore(imageAvailable
            ? scene.add.image(x, y, spikeEffect.key, spikeEffect.frames[0].name).setDepth(19.5)
            : scene.add.graphics().setDepth(19.5));
          const ground = arena.fxMode === "off" ? null : ignore(scene.add.graphics().setDepth(17.5));
          fx = { object, ground, image: imageAvailable, castId: cast.castId, x, y, lastFrame: -1, age: 0,
            // Cast-owned footprint keeps both the rising horn and its ground
            // glow fixed when the player upgrades while this cast is alive.
            scaleMultiplier: growth ? Math.max(1, (Number(cast.radius) || SPIKE_DISPLAY.baseImpactRadius) / SPIKE_DISPLAY.baseImpactRadius) : 1,
            ...(core ? { coreProfile: cast.coreProfile } : {}), ...(final ? { finalProfile: cast.finalProfile } : {}) };
          arena.spikeEffects.set(cast.castId, fx); arena.spikeFxCounts.created++;
          if (!object) arena.spikeFxCounts.hidden++; else if (imageAvailable) arena.spikeFxCounts.image++; else arena.spikeFxCounts.fallback++;
        }
        fx.age = Math.max(0, snapshot.combatTimeMs - cast.createdCombatTimeMs);
        const index = Math.min(spikeEffect.frames.length - 1, Math.max(0, Number.isFinite(cast.frameIndex)
          ? cast.frameIndex : Math.floor((fx.age + 1e-7) * spikeEffect.frameRate / 1000)));
        if (fx.ground) {
          fx.ground.clear().lineStyle(1, coreTint(fx.coreProfile) || 0xea99a9, 0.45);
          if (guides()) fx.ground.strokeCircle(fx.x, fx.y, cast.radius);
          fx.ground.fillStyle(coreTint(fx.coreProfile) || 0x923b58, 0.16).fillEllipse(fx.x, fx.y, 94 * fx.scaleMultiplier, 27 * fx.scaleMultiplier);
          // Preserve the confirmed S1 image/ground treatment. Larger casts add
          // their own thin world-circle footprint, independent of diagnostic H.
          // This is a cast snapshot, not a promise of damage through a wall.
          if (growth && cast.radius > SPIKE_DISPLAY.baseImpactRadius) {
            fx.ground.fillStyle(coreTint(fx.coreProfile) || 0x923b58, 0.07).fillCircle(fx.x, fx.y, cast.radius)
              .lineStyle(1, coreTint(fx.coreProfile) || 0xea99a9, 0.36).strokeCircle(fx.x, fx.y, cast.radius);
          }
          if (final && fx.finalProfile?.finalId === "execution") drawExecutionMark(fx.ground, fx.x, fx.y - 42, coreTint(fx.coreProfile), 0.75);
        }
        if (index === fx.lastFrame) continue;
        fx.lastFrame = index;
        if (fx.image && fx.object) {
          const frame = spikeEffect.frames[index];
          fx.object.setFrame(frame.name).setOrigin(frame.origin.x, frame.origin.y)
            .setScale(spikeEffect.displayScale * spikeEffect.resolutionScale.x * fx.scaleMultiplier, spikeEffect.displayScale * spikeEffect.resolutionScale.y * fx.scaleMultiplier)
            .setPosition(fx.x, fx.y);
          if (coreTint(fx.coreProfile)) fx.object.setTint(coreTint(fx.coreProfile));
        } else if (fx.object) {
          const heights = [10, 37, 104, 115, 103, 76, 42, 12];
          const height = heights[index] * fx.scaleMultiplier, alpha = index < 4 ? 0.9 : Math.max(0.14, 1 - (index - 3) * 0.2);
          fx.object.clear().fillStyle(coreTint(fx.coreProfile) || 0xd46c93, alpha).lineStyle(2, 0xffc0d8, alpha);
          fx.object.fillTriangle(fx.x - 42 * fx.scaleMultiplier, fx.y, fx.x + 13 * fx.scaleMultiplier, fx.y - height, fx.x + 34 * fx.scaleMultiplier, fx.y)
            .strokeTriangle(fx.x - 42 * fx.scaleMultiplier, fx.y, fx.x + 13 * fx.scaleMultiplier, fx.y - height, fx.x + 34 * fx.scaleMultiplier, fx.y);
        }
      }
    };
    arena.updateNovaFx = function () {
      if (!phase5) return;
      const view = scene.getUmbraPhantomNovaVisualState?.();
      const slots = view?.slots || [], living = new Set(slots.map(slot => slot.slotId));
      for (const [id, fx] of arena.novaEffects) {
        const slot = slots.find(value => value.slotId === id);
        if (!living.has(id) || slot.cycleGeneration !== fx.cycleGeneration || arena.fxMode === "off") {
          fx.object?.destroy(); fx.ground?.destroy(); arena.novaEffects.delete(id); arena.novaFxCounts.destroyed++;
        }
      }
      const clock = Math.max(0, Number(view?.combatTimeMs) || 0);
      const index = Math.floor(clock * novaEffect.frameRate / 1000) % novaEffect.frames.length;
      for (const slot of slots) {
        const x = slot.position?.x, y = slot.position?.y;
        let fx = arena.novaEffects.get(slot.slotId);
        if (slot.state === "REGENERATING") {
          // Only an already displayed deployed sphere may leave this short
          // visual remainder. The logical slot has no position or attack here.
          const start = fx?.state === "DEPLOYED" ? fx.deployedUntilMs : fx?.shrinkStartedAtMs;
          const shrinking = fx && Number.isFinite(start) && clock >= start
            && clock < start + NOVA_DISPLAY.regenerationShrinkMs && arena.fxMode !== "off";
          fx?.ground?.setVisible(false);
          if (shrinking) {
            const factor = 1 - (clock - start) / NOVA_DISPLAY.regenerationShrinkMs;
            fx.shrinkStartedAtMs = start; fx.state = "REGENERATING";
            fx.object.setVisible(true);
            if (fx.image) fx.object.setScale(fx.displayScaleX * factor, fx.displayScaleY * factor).setAlpha(factor);
            else {
              const radius = fx.displayRadius * factor;
              fx.object.clear().fillStyle(coreTint(fx.coreProfile) || 0xff63ce, 0.6 * factor).fillCircle(fx.x, fx.y, radius)
                .lineStyle(2, 0xffd4fb, 0.95 * factor).strokeCircle(fx.x, fx.y, radius * 0.65)
                .fillStyle(0xffeeff, 0.85 * factor).fillCircle(fx.x, fx.y, radius * 0.25);
            }
          } else fx?.object?.setVisible(false);
          continue;
        }
        const visible = slot.state !== "REGENERATING" && Number.isFinite(x) && Number.isFinite(y);
        if (!visible || arena.fxMode === "off") { fx?.object?.setVisible(false); fx?.ground?.setVisible(false); continue; }
        if (!fx) {
          const imageAvailable = arena.fxMode === "image" && scene.textures.exists(novaEffect.key)
            && novaEffect.frames.every(frame => scene.textures.get(novaEffect.key).has(frame.name));
          const object = ignore(imageAvailable ? scene.add.image(x, y, novaEffect.key, novaEffect.frames[index].name).setDepth(22)
            : scene.add.graphics().setDepth(22));
          const ground = ignore(scene.add.graphics().setDepth(17.7));
          fx = { object, ground, image: imageAvailable, slotId: slot.slotId, cycleGeneration: slot.cycleGeneration, lastFrame: -1, state: "", x, y };
          arena.novaEffects.set(slot.slotId, fx); arena.novaFxCounts.created++;
          if (imageAvailable) arena.novaFxCounts.image++; else arena.novaFxCounts.fallback++;
        }
        const deployed = slot.state === "DEPLOYED", changed = index !== fx.lastFrame || slot.state !== fx.state;
        if (core) fx.coreProfile = slot.coreProfile;
        if (final) fx.finalProfile = slot.finalProfile;
        fx.deployedUntilMs = deployed && Number.isFinite(slot.deployedUntilMs) ? slot.deployedUntilMs : null;
        fx.shrinkStartedAtMs = null;
        fx.x = x; fx.y = y; fx.object.setVisible(true); fx.ground.setVisible(true);
        if (fx.image) {
          fx.object.setPosition(x, y);
          if (core) {
            if (coreTint(fx.coreProfile)) fx.object.setTint(coreTint(fx.coreProfile)); else fx.object.clearTint();
          }
          if (changed) {
            const frame = novaEffect.frames[index];
            const scale = novaEffect.displayScale * (deployed ? NOVA_DISPLAY.deployedScaleMultiplier : NOVA_DISPLAY.orbitScaleMultiplier);
            fx.displayScaleX = scale * (novaEffect.resolutionScale?.x || 1);
            fx.displayScaleY = scale * (novaEffect.resolutionScale?.y || 1);
            fx.object.setFrame(frame.name).setOrigin(frame.origin.x, frame.origin.y)
              .setScale(fx.displayScaleX, fx.displayScaleY)
              .setAlpha(deployed ? 1 : 0.84);
          }
        } else {
          const radius = (deployed ? 23 : 16) + Math.sin(index * Math.PI / 4) * 2;
          fx.displayRadius = radius;
          fx.object.clear().fillStyle(coreTint(fx.coreProfile) || (deployed ? 0xff63ce : 0xda56c7), deployed ? 0.6 : 0.42).fillCircle(x, y, radius)
            .lineStyle(2, 0xffd4fb, 0.95).strokeCircle(x, y, radius * 0.65).fillStyle(0xffeeff, 0.85).fillCircle(x, y, radius * 0.25);
        }
        fx.ground.clear();
        if (deployed) fx.ground.lineStyle(1, coreTint(fx.coreProfile) || 0xf69eda, 0.6).strokeEllipse(x, y + 12, 52, 17).lineBetween(x - 5, y, x + 5, y).lineBetween(x, y - 5, x, y + 5);
        if (guides()) {
          const range = Number(slot.range);
          // Range belongs to the numeric core view, never the image's dimensions.
          if (Number.isFinite(range) && range > 0) fx.ground.lineStyle(1, 0xffb8ec, 0.24).strokeCircle(x, y, range);
        }
        fx.lastFrame = index; fx.state = slot.state;
      }
      for (const ray of arena.novaRays.slice()) {
        const age = Math.max(0, clock - ray.createdCombatTimeMs);
        if (!view?.enabled || age >= NOVA_DISPLAY.rayDurationMs) { ray.object.destroy(); arena.novaRays.splice(arena.novaRays.indexOf(ray), 1); }
        else ray.object.setAlpha(1 - age / NOVA_DISPLAY.rayDurationMs);
      }
    };
    arena.spawnNovaPulseFx = function (hit) {
      arena.novaFxCounts.rayRequested++;
      if (!active() || arena.fxMode === "off") { arena.novaFxCounts.rayHidden++; return; }
      if (arena.novaRays.length >= NOVA_DISPLAY.rayLimit) { arena.novaFxCounts.rayCapped++; return; }
      const from = hit.sourcePosition, to = hit.position;
      if (![from?.x, from?.y, to?.x, to?.y].every(Number.isFinite)) return;
      const object = ignore(scene.add.graphics().setDepth(25));
      const dx = to.x - from.x, dy = to.y - from.y, length = Math.max(1, Math.hypot(dx, dy));
      const mx = (from.x + to.x) / 2 - dy / length * 7, my = (from.y + to.y) / 2 + dx / length * 7;
      object.lineStyle(4, coreTint(hit.coreProfile) || 0xf064d0, 0.6).lineBetween(from.x, from.y, mx, my).lineBetween(mx, my, to.x, to.y)
        .lineStyle(1.5, 0xffedff, 1).lineBetween(from.x, from.y, mx, my).lineBetween(mx, my, to.x, to.y)
        .strokeCircle(to.x, to.y, 8);
      arena.novaRays.push({ object, slotId: hit.slotId, cycleGeneration: hit.cycleGeneration,
        pulseSerial: hit.pulseSerial, createdCombatTimeMs: Number.isFinite(hit.combatTimeMs) ? hit.combatTimeMs : novaClock() });
      arena.novaFxCounts.rayShown++;
    };
    arena.clearFinalFx = function () {
      if (!final) return;
      for (const fx of arena.finalFields.values()) fx.object.destroy();
      arena.finalFields.clear();
      for (const fx of arena.finalMarks) fx.object.destroy();
      arena.finalFxCounts.completed += arena.finalMarks.length;
      arena.finalMarks.length = 0;
    };
    arena.spawnFinalMark = function (kind, skillId, hit) {
      if (!final) return;
      const counter = kind === "prism" ? "secondary" : "execution";
      arena.finalFxCounts[`${counter}Requested`]++;
      if (!active() || arena.fxMode === "off") { arena.finalFxCounts.hidden++; return; }
      const limit = kind === "prism" ? FINAL_DISPLAY.secondaryLimit : FINAL_DISPLAY.executionLimit;
      if (arena.finalMarks.filter(mark => mark.kind === kind).length >= limit) { arena.finalFxCounts.capped++; return; }
      const view = scene.getUmbraFinalVisualState?.(), owner = view?.owners?.find(value => value.skillId === skillId);
      if (!owner || (hit.ownerGeneration != null && hit.ownerGeneration !== owner.generation)) return;
      const to = hit.position, from = hit.sourcePosition;
      if (![to?.x, to?.y].every(Number.isFinite) || (kind === "prism" && ![from?.x, from?.y].every(Number.isFinite))) return;
      const object = ignore(scene.add.graphics().setDepth(25));
      const tint = coreTint(hit.coreProfile) || CORE_TINTS[hit.finalProfile?.coreId] || 0xdce9ff;
      if (kind === "prism") object.lineStyle(1.5, tint, 0.9).lineBetween(from.x, from.y, to.x, to.y);
      else drawExecutionMark(object, to.x, to.y, tint);
      arena.finalMarks.push({ object, kind, skillId, ownerGeneration: owner.generation, finalProfile: hit.finalProfile,
        coreProfile: hit.coreProfile, createdAtMs: owner.combatTimeMs });
      arena.finalFxCounts[`${counter}Shown`]++;
    };
    arena.updateFinalFx = function () {
      if (!final) return;
      const view = scene.getUmbraFinalVisualState?.() || { owners: [], fields: [] };
      const owners = new Map((view.owners || []).map(owner => [owner.skillId, owner]));
      const fields = arena.fxMode === "off" ? [] : (view.fields || []).slice(0, FINAL_DISPLAY.fieldLimit);
      const live = new Set(fields.map(field => field.fieldId));
      for (const [fieldId, fx] of arena.finalFields) if (!live.has(fieldId)) { fx.object.destroy(); arena.finalFields.delete(fieldId); }
      for (const field of fields) {
        const { x, y } = field.position || {};
        if (![x, y, field.radius].every(Number.isFinite) || field.radius <= 0) continue;
        let fx = arena.finalFields.get(field.fieldId);
        if (fx && fx.ownerGeneration !== field.ownerGeneration) { fx.object.destroy(); arena.finalFields.delete(field.fieldId); fx = null; }
        if (!fx) {
          const object = ignore(scene.add.graphics().setDepth(17.3));
          const tint = coreTint(field.coreProfile) || CORE_TINTS[field.finalProfile?.coreId] || 0xb6cbeb;
          // One low-luminance fill and one ring per immutable field. Its size
          // comes from the logical snapshot, never NOVA attack range or PNG.
          object.fillStyle(tint, 0.055).fillCircle(x, y, field.radius)
            .lineStyle(1, tint, 0.5).strokeCircle(x, y, field.radius);
          fx = { object, ownerGeneration: field.ownerGeneration, finalProfile: field.finalProfile, coreProfile: field.coreProfile };
          arena.finalFields.set(field.fieldId, fx);
        }
      }
      for (const fx of arena.finalMarks.slice()) {
        const owner = owners.get(fx.skillId), age = Number(owner?.combatTimeMs) - fx.createdAtMs;
        if (arena.fxMode === "off" || !owner || owner.generation !== fx.ownerGeneration || age >= FINAL_DISPLAY.markDurationMs) {
          fx.object.destroy(); arena.finalMarks.splice(arena.finalMarks.indexOf(fx), 1); arena.finalFxCounts.completed++;
        } else fx.object.setAlpha(Math.max(0, 1 - age / FINAL_DISPLAY.markDurationMs));
      }
    };
    arena.updateMoonFx = function () {
      for (const fx of arena.effects.slice()) {
        fx.age = Math.max(0, combatClock() - fx.createdCombatTimeMs);
        if (fx.age >= effect.frames.length * 1000 / effect.frameRate) {
          fx.object.destroy(); arena.effects.splice(arena.effects.indexOf(fx), 1); arena.fxCounts.completed++;
        } else arena.drawFx(fx);
      }
    };
    arena.update = function () {
      if (arena.destroyed) return;
      arena.updateSpikeFx(); arena.updateNovaFx(); arena.updateFinalFx();
      if (active()) arena.updateMoonFx();
    };
    arena.setFxMode = function (mode) {
      if (arena.destroyed) return;
      arena.fxMode = ["image", "fallback", "off"].includes(mode) ? mode : "image";
      arena.effects.forEach(fx => fx.object.setVisible(arena.fxMode !== "off"));
      for (const fx of arena.spikeEffects.values()) { fx.object?.destroy(); fx.ground?.destroy(); }
      arena.spikeEffects.clear();
      if (phase5) { arena.clearNovaEffects(); arena.updateNovaFx(); }
      if (final) { arena.clearFinalFx(); arena.updateFinalFx(); }
    };
    arena.clearDepth = function () { arena.clearEffects(); arena.clearSpikeEffects(); arena.clearNovaEffects(); arena.clearFinalFx(); };
    arena.destroy = function () { if (arena.destroyed) return; arena.destroyed = true; arena.clearDepth(); };
    return arena;
  };
}());
