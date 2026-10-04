"use strict";
// Reproducible pure tables for the report; no browser, saves or acquisition.
const fs=require("node:fs"),path=require("node:path"),Module=require("node:module"),crypto=require("node:crypto");
const root=path.resolve(__dirname,".."),file=path.join(__dirname,"umbra-equipment-state.test.cjs"),m=new Module(file,module);
m.filename=file;m.paths=Module._nodeModulePaths(__dirname);const text=fs.readFileSync(file,"utf8");
m._compile(text.slice(0,text.indexOf('\ntest("'))+"\nmodule.exports={equipment,equipmentData,ids,base,system};",file);
const {equipment,equipmentData,ids,base,system}=m.exports,hash=v=>crypto.createHash("sha256").update(v).digest("hex");
const fixtureInputs=[
  ["none",equipmentData()],
  ["sensor",equipmentData("SR",3,5)],
  ["armament",equipmentData("SR",3,5)],
  ["medium",equipmentData("SR",3,5)],
  ["ssr",equipmentData("SSR",5,15)],
  ["legend",equipmentData("LEGEND",5,20)],
  ["incomplete",equipmentData("LEGEND",5,20)]
];
for(const [id,data]of fixtureInputs)for(const slot of system.SLOTS)if(id==="sensor"&&slot!=="head"||id==="armament"&&slot!=="weapon"||id==="incomplete"&&slot==="accessory"){
  data.bestBySlot[slot]=null;data.refinementBySlot[slot]=0;data.refinementLimitUnlockedBySlot[slot]=false;
}
const fixtureRows=fixtureInputs.map(([id,loadout])=>{const s=equipment({loadout}).scene,snap=s.getUmbraEquipmentSnapshot();return{id,snapshot:snap};});
const periodRows=[];
for(const [fixtureId,loadout]of[["baseline",equipmentData()],["medium",equipmentData("SR",3,5)],["deep",equipmentData("LEGEND",5,20)]]){
 const f=equipment({fixtureId,loadout}),s=f.scene;
 for(const stage of[1,4,8]){for(const id of ids)base.live.selectStage(s,f.api,id,stage);
 periodRows.push({fixtureId,stage,fire:s.stats.fireInterval,sensor:s.getUmbraEquipmentSnapshot().sensorMultiplier,
 moon:s.getUmbraMoonlightRehitIntervalMs(),spike:s.getUmbraBloodSpikeIntervalMs(),orbit:s.getUmbraPhantomNovaIntervalMs("orbit"),deploy:s.getUmbraPhantomNovaIntervalMs("deployed")});}
}
const zeroDifferenceRows=["SSR","LEGEND"].map(rarity=>{const s=equipment({cores:[null,null,"assault"],finals:[null,null,"prism"],loadout:equipmentData(rarity,5,0)}).scene;
 return{rarity,rank:5,refinement:0,rawBonus:0,stage:8,core:"assault",final:"prism",triad:s.getUmbraTriadSnapshot(),
  snapshot:s.getUmbraEquipmentSnapshot(),difference:s.getUmbraEquipmentOverlimitCardDifference(ids[2],1),card:s.buildEquipmentOverlimitChoice(ids[2])?.umbraEquipmentCard};});
const result={at:new Date().toISOString(),sourceHashes:Object.fromEntries(["game.js","equipmentDefinitions.js","skillDefinitions.js","umbraDriveFixtures.js"].map(name=>[name,hash(fs.readFileSync(path.join(root,name)))])),
 harnessSha256:hash(fs.readFileSync(__filename)),fixtureHarnessSha256:hash(fs.readFileSync(file)),
 methodology:"Pure real EquipmentSystem normalization and production snapshot/period/card calculation. Canonical Stage and selected Mutation records are explicit numerical inputs. Does not measure acquisition, starting AP application, physical quantization, HP loss, XP or performance.",fixtureRows,periodRows,zeroDifferenceRows};
const output=path.join(process.env.UMBRA_TEST_OUTPUT||path.join(root,".tmp_umbra_phase6d2/2026-09-08-start/numeric"),`equipment-numeric-${Date.now()}.json`);
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:"wx"});console.log(JSON.stringify({output,fixtureRows:fixtureRows.map(r=>({id:r.id,sensor:r.snapshot.sensorMultiplier,arm:r.snapshot.armamentMultiplier,cap:r.snapshot.overlimitCap,bonuses:r.snapshot.bonuses})),periodRows,zeroDifferenceRows:zeroDifferenceRows.map(r=>({rarity:r.rarity,arm:r.snapshot.armamentMultiplier,difference:r.difference}))},null,2));
