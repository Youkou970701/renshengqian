import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {deriveChild} from '../src/engine/family.js';
import {validLife,restorePeers,advancePeer,serializeSave,hydrateSave,checkpointChanged} from '../src/ui/save.js';
import {TITLE_IDS,TITLE_ID_MIGRATIONS,ACHIEVEMENT_IDS} from '../src/ui/collection-ids.js';
import {TITLES,TITLE_ID_MIGRATIONS as actualMigrations} from '../src/content/titles.js';
import {ACHIEVEMENTS} from '../src/content/achievements.js';
import {loadCollection as lightLoad,importCollection as lightImport} from '../src/ui/collection-storage.js';
import {loadCollection,importCollection,emptyCollection} from '../src/ui/collection.js';
import {loadPastLives as lightPast} from '../src/ui/past-lives-storage.js';
import {loadPastLives,savePastLife} from '../src/ui/past-lives.js';

const peersFor=life=>[1,2,3,4].map(i=>drawBirth((life.seed+Math.imul(i,2654435761))>>>0,life.year));
test('compact peers replay exactly across repeated save/load, including pending choices and death',()=>{
 for(const id of ['粤-2026-694669','京-2026-066321','豫-2026-483920']){
  const birth=createBirth(id);let direct=peersFor(birth),restored=peersFor(birth);
  for(const age of [1,2,15,16,18,22,35,60,80,100,110]){
   direct=direct.map(p=>advancePeer(p,age));restored=restored.map(p=>advancePeer(p,age));
   const saved=JSON.parse(serializeSave({schemaVersion:2,life:birth,peers:restored,saveRevision:12}));
   assert.equal(saved.schemaVersion,3);assert.equal('saveRevision'in saved,false);
   assert.ok(saved.peers.every(p=>Object.keys(p).join(',')==='id,age'));
   restored=restorePeers(saved.peers);assert.deepEqual(restored,direct,`${id} at ${age}`);
  }
 }
});
test('legacy full peers and current life retain their exact progress and can continue after migration',()=>{
 let life=createBirth('粤-2026-694669');while(life.alive&&life.age<50)life=step(life,{auto:true}).state;
 const peers=peersFor(life).map(p=>advancePeer(p,life.age));
 const old={schemaVersion:2,screen:'play',life,peers,pacingElapsedMs:123456};
 assert.ok(validLife(life));assert.deepEqual(restorePeers(old.peers),peers);
 const saved=hydrateSave(JSON.parse(serializeSave(old)));assert.deepEqual(saved.life,JSON.parse(JSON.stringify(life)));
 assert.equal(saved.pacingElapsedMs,old.pacingElapsedMs);assert.deepEqual(restorePeers(saved.peers),peers);
 assert.deepEqual(restorePeers(saved.peers).map(p=>advancePeer(p,60)),peers.map(p=>advancePeer(p,60)));
 assert.equal(restorePeers([{id:'bad',age:12},{},{},{}]),null);
 assert.equal(restorePeers(saved.peers.slice(1)),null);
 assert.equal(restorePeers([{id:life.id,age:112},...saved.peers.slice(1)]),null);
});
test('checkpoints exclude preferences, timer ticks, dice dismissal and unanswered annual cards',()=>{
 const before={life:createBirth('粤-2026-694669')};
 const clock={...before,pacingElapsedMs:999};
 for(const type of ['set','dismiss','start','new'])assert.equal(checkpointChanged(before,clock,{type}),false);
 assert.equal(checkpointChanged(before,before,{type:'advance'}),false);
 const year={life:{...before.life,age:1}};
 assert.equal(checkpointChanged(before,year,{type:'advance'}),true);
 assert.equal(checkpointChanged(before,{life:{...year.life,pending:{id:'test'}}},{type:'advance'}),false);
 const chosen={life:{...year.life,choices:[{choice:'yes'}]}};
 assert.equal(checkpointChanged(year,chosen,{type:'advance',choice:'yes'}),true);
});
test('80-year UTF-8 compact save <=120 KiB without dropping own logs or choices',()=>{
 let checked=0;
 for(let seed=0;seed<30;seed++){
  let life=drawBirth(seed);const origin=life;while(life.alive&&life.age<80)life=step(life,{auto:true}).state;
  if(life.age<80)continue;
  const saved=serializeSave({schemaVersion:3,screen:'play',life,birthOrigin:origin,familyRows:[],peers:peersFor(origin).map(p=>advancePeer(p,life.age))});
  assert.ok(Buffer.byteLength(saved)<=120*1024,`${life.id}: ${Buffer.byteLength(saved)}`);
  assert.deepEqual(hydrateSave(JSON.parse(saved)).life,JSON.parse(JSON.stringify(life)));checked++;
 }
 assert.ok(checked>=5);
});
test('light storage catalogue matches lazy authored catalogues exactly',()=>{
 assert.deepEqual(TITLE_IDS,TITLES.map(t=>t.id));assert.deepEqual(TITLE_ID_MIGRATIONS,actualMigrations);assert.deepEqual(ACHIEVEMENT_IDS,ACHIEVEMENTS.map(a=>a.id));
 const raw=JSON.stringify(emptyCollection());assert.deepEqual(lightImport(raw),importCollection(raw));
 const db=new Map(),storage={getItem:k=>db.get(k),setItem:(k,v)=>db.set(k,v)};
 assert.deepEqual(lightLoad(storage),loadCollection(storage));
 let life=createBirth('粤-2026-694669');while(life.alive)life=step(life,{auto:true}).state;
 savePastLife(life,storage);assert.deepEqual(lightPast(storage),loadPastLives(storage));
 const child=deriveChild(life);if(child)assert.ok(validLife(child));
});
