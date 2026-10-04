"use strict";
// Real production methods and receiver with numeric bodies. Controlled physical
// events here are separate from real Phaser/rAF and natural progression evidence.
const fs = require("node:fs"), path = require("node:path"), Module = require("node:module");
const test = require("node:test"), assert = require("node:assert/strict");
const file = path.join(__dirname, "umbra-core-runtime.test.cjs"), src = fs.readFileSync(file, "utf8");
const mod = new Module(file, module); mod.filename = file; mod.paths = Module._nodeModulePaths(__dirname);
mod._compile(src.slice(0, src.indexOf('\ntest("')) + '\nmodule.exports={core,stage,moonFixture,spikeFixture,novaFixture};', file);
const { core, stage, moonFixture, spikeFixture, novaFixture } = mod.exports;
const M = "umbraMoonlight", B = "umbraBloodSpike", N = "umbraPhantomNova", ids = [M, B, N];
const plain = x => JSON.parse(JSON.stringify(x)), close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`);
function setup(factory = novaFixture) {
  const f = factory(); f.scene.verificationContext = { ...f.scene.verificationContext, finalEnabled: true, triadEnabled: true };
  core(f, [B,N]); f.scene.initializeUmbraTriadRun(); return f;
}
function select(s, id, choice) {
  if (!s.skillMutationState?.selectionOpen) assert.equal(s.tryOpenPendingSkillMutationSelection(), true);
  assert.equal(s.skillMutationState.currentSelection.skillId, id);
  const ix=s.levelUpCardRecords.findIndex(r=>r.model.option.choiceId===choice); assert.ok(ix>=0);
  s.selectLevelUpCard(ix); s.testConfirm();
}
function build(f, cores=["assault","assault","assault"], finals=["execution","execution","execution"], stages=[8,8,8]) {
  const s=f.scene;
  for(let i=0;i<3;i++) {
    if(stages[i]<4) continue;
    stage(s,ids[i],stages[i]); select(s,ids[i],cores[i]);
    if(stages[i]===8) select(s,ids[i],finals[i]);
  }
  s.levelUpActive=false; s.physics.world.isPaused=false; return f;
}
const stats=(s,id)=>s[id===M?"getUmbraMoonlightEffectiveStats":id===B?"getUmbraBloodSpikeEffectiveStats":"getUmbraPhantomNovaEffectiveStats"]();
const profile=(s,id,deployed=false)=>{const a=stats(s,id);return id===N?(deployed?a.deployedFinalProfile:a.orbitFinalProfile):a.finalProfile;};
function cast(s) { return s.createUmbraBloodSpikeCast({position:{x:100,y:0},record:{lifeId:"placement"}}); }
function impact(s,c) {s.umbraBloodSpikeRuntime.combatTimeMs=c.impactDueAtMs;s.applyUmbraBloodSpikeImpact(c);}

test("TRIAD combines C/F/T before one round: Assault/Execution II is23/9/6 and neutral R6 remains9",()=>{
  const {scene:s}=build(setup()); const high={hp:10,maxHp:10}, low={hp:1,maxHp:10};
  assert.deepEqual(ids.map(id=>s.getUmbraFinalMainRawDamage(profile(s,id),high,0)),[23,9,6]);
  assert.equal(s.getUmbraFinalMainRawDamage(profile(s,N,true),high,0),6);
  assert.deepEqual(ids.map(id=>s.getUmbraFinalMainRawDamage(profile(s,id),low,0)),[16,7,4]);
  const p=Object.freeze({...profile(s,M),addedRaw:6});assert.equal(s.getUmbraFinalMainRawDamage(p,high,0),11);
  const neutral=Object.freeze({...p,triadProfile:undefined});assert.equal(s.getUmbraFinalMainRawDamage(neutral,high,0),9);
  const capped=Object.freeze({...p,triadProfile:Object.freeze({...p.triadProfile,skillDamageMultiplier:5})});
  assert.equal(s.getUmbraFinalMainRawDamage(capped,high,0),11); // explicit coefficient cap probe, not a legal build
});

test("Assault/Prism II secondary rounds target A then branch*T once:6/3/2",()=>{
  const {scene:s}=build(setup(),undefined,["prism","prism","prism"]), target={hp:10,maxHp:10};
  assert.deepEqual(ids.map(id=>s.getUmbraFinalMainRawDamage(profile(s,id),target,0)),[16,7,4]);
  assert.deepEqual(ids.map((id,i)=>s.getUmbraFinalSecondaryRawDamage(profile(s,id),target,[.35,.4,.4][i])),[6,3,2]);
  assert.deepEqual(ids.map(id=>profile(s,id).triadProfile.prismDamageMultiplier),[1.15,1.15,1.15]);
});

test("other two Execution LINK independently evaluates weak/strong secondary just before actual SPIKE receiver",()=>{
  for(const parentStrong of [true,false]) {
    const f=build(setup(spikeFixture),undefined,["execution","prism","execution"]),s=f.scene;
    s.stats.bulletDamage=8; // legal +7 raw boundary where branch rounding exposes target condition
    const parent=f.add(340,0,parentStrong?100:3), other=f.add(430,0,parentStrong?3:100);
    parent.maxHp=parentStrong?100:10;other.maxHp=parentStrong?10:100;
    const c=cast(s),before=other.hp;impact(s,c);
    assert.equal(before-other.hp,parentStrong?6:7);
    assert.equal(f.calls.filter(v=>v.e===other).length,1);
    assert.equal(s.umbraBloodSpikeRuntime.finalState.counts.secondaryAccepted,1);
    assert.equal(s.umbraBloodSpikeRuntime.controlContributions.size,0);
    const hit=s.umbraBloodSpikeRuntime.finalState.history.find(h=>h.secondaryDepth===1);
    assert.equal(hit.finalProfile.triadProfile.executionDamageMultiplier,1.06);
    assert.equal(hit.finalProfile.triadProfile.prismDamageMultiplier,1);
    assert.equal(hit.rawDamage,parentStrong?6:7);assert.equal(other.killCalls||0,parentStrong?1:0);
  }
});

test("acquired S1 without Core receives two other weapons' Assault/Execution LINK without unlocking Final",()=>{
  for(let missing=0;missing<3;missing++) {
    const stages=[8,8,8];stages[missing]=1;
    const {scene:s}=build(setup(),undefined,undefined,stages);s.stats.bulletDamage=11;
    const id=ids[missing],p=profile(s,id);assert.equal(p.finalId,null);assert.equal(p.coreId,null);
    assert.equal(p.triadProfile.skillDamageMultiplier,1.04);assert.equal(p.triadProfile.executionDamageMultiplier,1.06);
    const base=[4,5,2][missing]+10;
    assert.equal(s.getUmbraFinalMainRawDamage(p,{hp:10,maxHp:10},0),Math.round(base*1.04*1.06));
    assert.equal(s.ensureUmbraFinalState(id,s.getUmbraControlOwner(id)),null);
    assert.equal(s.getUmbraControlOwner(id).finalState,undefined);
  }
});

test("CONTROL II and SINGULARITY II have independent slow/duration/radius with unchanged main impact",()=>{
  const f=build(setup(spikeFixture),["control","control","control"],["singularity","singularity","singularity"]),s=f.scene;
  const e=f.add(100),c=cast(s);assert.equal(c.radius,240);impact(s,c);
  const rt=s.umbraBloodSpikeRuntime,field=[...rt.finalState.fields.values()][0];
  close(field.radius,200);close(field.expiresAtMs-field.createdAtMs,1120);
  const main=[...rt.controlContributions.get(e).values()][0];close(main.multiplier,.72);close(main.expiresAtMs-main.appliedAtMs,672);
  close(s.getUmbraControlSpeedMultiplier(e),.72);rt.combatTimeMs=main.expiresAtMs;
  close(s.getUmbraControlSpeedMultiplier(e),.832);rt.combatTimeMs=field.expiresAtMs;assert.equal(s.getUmbraControlSpeedMultiplier(e),1);
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].damage,5);assert.equal(e.hp,95);
  const cp=stats(s,B).coreProfile;close(s.getUmbraControlEffectStats(cp,true).multiplier,.9104);
  const fieldStats=s.getUmbraFinalFieldSettings(M,profile(s,M));close(fieldStats.radius,100.8);close(fieldStats.durationMs,672);
  const nova=s.getUmbraFinalFieldSettings(N,profile(s,N,true),{expiresAtMs:3000},800);close(nova.radius,89.6);assert.equal(nova.durationMs,2200);
});

test("TRIAD slow lower bounds clamp its contribution only and keep pre-existing stronger legacy slow",()=>{
  const {scene:s}=build(setup());const p={controlMultiplier:100};
  assert.equal(s.getUmbraTriadSlowMultiplier(.85,false,p),.65);assert.equal(s.getUmbraTriadSlowMultiplier(.95,true,p),.9);
  const cp={coreId:"control",controlSettings:{normalMultiplier:.75,bossMultiplier:.92,durationMs:600},triadProfile:p};
  assert.equal(s.getUmbraControlEffectStats(cp).durationMs,1000);
  s.getEnemyLostArmsSlowMultiplier=()=>.5;s.getEnemyCleaningRobotSlowMultiplier=()=>1;s.getEnemySkillMutationSlowMultiplier=()=>1;
  assert.equal(s.getEnemySpeedMultiplier({}),.5);
});

test("SPIKE creation captures old TRIAD through later selections and next cast sees new committed II",()=>{
  const f=setup(spikeFixture),s=f.scene;
  for(const id of [M,B]) {stage(s,id,8);select(s,id,"control");select(s,id,"singularity");}
  const old=cast(s),oldProfile=old.finalProfile,oldCore=old.coreProfile;
  assert.equal(oldProfile.triadProfile.singularityMultiplier,1.06);
  stage(s,N,8);select(s,N,"control");select(s,N,"singularity");
  assert.equal(old.finalProfile,oldProfile);assert.equal(old.coreProfile,oldCore);
  const enemy=f.add(100);impact(s,old);const rt=s.umbraBloodSpikeRuntime,oldField=[...rt.finalState.fields.values()][0];
  close(oldField.radius,200);close(oldField.expiresAtMs-oldField.createdAtMs,1060);
  const oldRecord=[...rt.controlContributions.get(enemy).values()][0];close(oldRecord.multiplier,.735);close(oldRecord.expiresAtMs-oldRecord.appliedAtMs,636);
  const next=cast(s);assert.ok(next.finalProfile.triadProfile.revision>oldProfile.triadProfile.revision);
  assert.equal(next.finalProfile.triadProfile.singularityMultiplier,1.12);impact(s,next);
  assert.equal(rt.controlContributions.get(enemy).size,2);
  close(oldField.radius,200);assert.equal(oldRecord.expiresAtMs,oldRecord.appliedAtMs+636);
});

test("NOVA deployed profile/regen/field are not retroactively upgraded and its next DEP has new II",()=>{
  const f=setup(novaFixture),s=f.scene;
  for(const id of [N,M]) {stage(s,id,8);select(s,id,"control");select(s,id,"singularity");}
  const slot=f.deploy(0,0),old=slot.deployedSnapshot,deadline=slot.deployedUntilMs,regen=slot.regenerateAtMs;
  const field=[...s.umbraPhantomNovaRuntime.finalState.fields.values()][0];close(field.radius,84.8);
  stage(s,B,8);select(s,B,"control");select(s,B,"singularity");
  assert.equal(slot.deployedSnapshot,old);assert.equal(slot.deployedUntilMs,deadline);assert.equal(slot.regenerateAtMs,regen);
  close(field.radius,84.8);assert.equal(field.expiresAtMs,deadline);
  f.tick(800);f.deploy(150,0);const second=s.umbraPhantomNovaRuntime.slots.find(x=>x!==slot&&x.state==="DEPLOYED");
  assert.ok(second);assert.equal(second.deployedSnapshot.finalProfile.triadProfile.singularityMultiplier,1.12);
  assert.equal(slot.deployedSnapshot.finalProfile.triadProfile.singularityMultiplier,1.06);
  const newest=[...s.umbraPhantomNovaRuntime.finalState.fields.values()].find(x=>x.slotId===second.slotId);close(newest.radius,89.6);assert.equal(newest.expiresAtMs,second.deployedUntilMs);
});

test("old and new CONTROL strengths expire independently without combining stronger value and later deadline",()=>{
  const f=build(setup(spikeFixture),["control","control","control"],["singularity","singularity","singularity"]),s=f.scene,rt=s.umbraBloodSpikeRuntime,e=f.add(100),life=rt.targets.get(e),cp=stats(s,B).coreProfile;
  s.applyUmbraControlHit(B,rt,e,life,cp,"strong");const first=[...rt.controlContributions.get(e).values()][0];
  rt.combatTimeMs=500;const weak=Object.freeze({...cp,triadProfile:Object.freeze({...cp.triadProfile,controlMultiplier:1.06})});
  s.applyUmbraControlHit(B,rt,e,life,weak,"weak");close(first.expiresAtMs,672);assert.equal(rt.controlContributions.get(e).size,2);
  rt.combatTimeMs=672;close(s.getUmbraControlSpeedMultiplier(e),.735);rt.combatTimeMs=1136;assert.equal(s.getUmbraControlSpeedMultiplier(e),1);
});

test("real owner loss changes II to I for next cast while the earlier stronger CONTROL keeps its own expiry",()=>{
  const f=build(setup(spikeFixture),["control","control","control"],["singularity","singularity","singularity"]),s=f.scene,e=f.add(100),rt=s.umbraBloodSpikeRuntime;
  const first=cast(s);impact(s,first);const strong=[...rt.controlContributions.get(e).values()][0],oldEnd=strong.expiresAtMs;
  s.destroyUmbraPhantomNovaRuntime("TRIAD_OWNER_LOSS_TEST");assert.equal(s.getUmbraTriadSnapshot().modifiers.controlMultiplier,1.06);
  rt.combatTimeMs+=100;const next=cast(s);impact(s,next);
  assert.equal(next.coreProfile.triadProfile.controlMultiplier,1.06);assert.equal(first.coreProfile.triadProfile.controlMultiplier,1.12);
  assert.equal(strong.expiresAtMs,oldEnd);assert.equal(rt.controlContributions.get(e).size,2);
  rt.combatTimeMs=oldEnd;close(s.getUmbraControlSpeedMultiplier(e),.735);
  rt.combatTimeMs=next.impactDueAtMs+636;close(s.getUmbraControlSpeedMultiplier(e),.832); // earlier independent field still exists
});

test("new entry suppresses already applied TRIAD control during Raid without modifying records or clocks",()=>{
  const f=build(setup(spikeFixture),["control","control","control"],["singularity","singularity","singularity"]),s=f.scene,e=f.add(100),c=cast(s);impact(s,c);
  const rt=s.umbraBloodSpikeRuntime,record=[...rt.controlContributions.get(e).values()][0],before=rt.combatTimeMs;
  s.finalBossRaidAssetsLoading=true;assert.equal(s.getUmbraControlSpeedMultiplier(e),1);assert.equal(rt.combatTimeMs,before);assert.equal(record.multiplier,.72);
  s.finalBossRaidAssetsLoading=false;close(s.getUmbraControlSpeedMultiplier(e),.72);
});

test("Final branch receiver rejection never refunds TRIAD parent/ICD or creates extra Control/field",()=>{
  const f=build(setup(spikeFixture),undefined,["prism","prism","prism"]),s=f.scene,e=f.add(340),other=f.add(430),receiver=s.applyDamageToEnemy;
  s.applyDamageToEnemy=(enemy,...args)=>enemy===other?undefined:receiver.call(s,enemy,...args);
  const c=cast(s);impact(s,c);const rt=s.umbraBloodSpikeRuntime;
  assert.equal(rt.finalState.counts.secondaryAttempts,1);assert.equal(rt.finalState.counts.secondaryAccepted,0);
  s.applyUmbraBloodSpikeImpact(c);assert.equal(rt.finalState.counts.dispatches,1);assert.equal(rt.finalState.fields.size,0);
  assert.equal(rt.controlContributions.size,0);assert.equal(other.hp,100);assert.equal(e.hp,93);
});

test("TRIAD field geometry/membership remains fixed and finite across repeated getter reads and current snapshot refresh",()=>{
  const f=build(setup(spikeFixture),["control","control","control"],["singularity","singularity","singularity"]),s=f.scene;
  const enemies=Array.from({length:9},(_,i)=>f.add(90+i*3)),c=cast(s);impact(s,c);const rt=s.umbraBloodSpikeRuntime,field=[...rt.finalState.fields.values()][0];
  assert.equal(rt.counts.accepted,9);assert.equal(field.members.size,6);const before=plain({settings:field.fieldSettings,counts:rt.finalState.counts,at:field.nextMembershipAtMs});
  for(let i=0;i<30;i++){s.getUmbraFinalSnapshot();s.getUmbraTriadSnapshot();s.refreshUmbraTriadSnapshot("READ_PROBE");}
  assert.deepEqual(plain({settings:field.fieldSettings,counts:rt.finalState.counts,at:field.nextMembershipAtMs}),before);
  assert.throws(()=>field.radius=999,TypeError);assert.throws(()=>field.fieldSettings.normalMultiplier=.1,TypeError);
  const departing=enemies[0];f.move(departing,500,0);rt.combatTimeMs+=99;s.updateUmbraFinalFields(B,rt);assert.ok(field.members.has(departing));
  rt.combatTimeMs+=1;s.updateUmbraFinalFields(B,rt);assert.equal(field.members.has(departing),false);assert.equal(field.members.size,6);
  assert.equal(f.calls.length,9);
});
