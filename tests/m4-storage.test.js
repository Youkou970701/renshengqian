import test from'node:test';
import assert from'node:assert/strict';
import{createBirth}from'../src/engine/birth.js';
import{simulate}from'../src/engine/life.js';
import{deriveChild}from'../src/engine/family.js';
import{TITLES,TITLE_ID_MIGRATIONS}from'../src/content/titles.js';
import{biography}from'../src/engine/biography.js';
import{emptyCollection,importCollection,exportCollection,recordLife,loadCollection,saveCollection,TITLE_CELLS}from'../src/ui/collection.js';
import{PAST_LIVES_KEY,ABANDONED_BIRTHS_KEY,PAST_LIVES_LIMIT,ABANDONED_BIRTHS_LIMIT,lifeFingerprint,loadPastLives,recordPastLife,savePastLife,loadAbandonedBirths,recordAbandonedBirth}from'../src/ui/past-lives.js';

const memoryStorage=()=>{const db=new Map();return{getItem:key=>db.get(key)??null,setItem:(key,value)=>db.set(key,value)};};
const life=simulate(createBirth('粤-2026-694669'),{capture:true});

test('09c 旧泛称不冒充新的具体结果，足迹和历史摘要仍可恢复',()=>{
 const oldIds=Object.keys(TITLE_ID_MIGRATIONS),current=TITLES[0].id;
 const old={...emptyCollection(),provinces:['广东'],titles:[current,...oldIds]};
 const next=importCollection(JSON.stringify(old));
 assert.deepEqual(next.provinces,['广东']);assert.deepEqual(next.titles,[current]);
 const rows=recordPastLife([],life),oldRow={...rows[0],title:oldIds[0],titleName:'一段旧版经历的人生'};
 const storage=memoryStorage();storage.setItem(PAST_LIVES_KEY,JSON.stringify({version:1,items:[oldRow]}));
 const restored=loadPastLives(storage);assert.equal(restored.length,1);assert.equal(restored[0].title,oldIds[0]);
 assert.equal(recordPastLife(restored,life)[0].title,biography(life).title.id);
});

test('M4 图鉴延用版本3，旧版1至3缺省称号正常迁移，合法称号导入导出往返',()=>{
 for(const version of[1,2,3]){
  const legacy={...emptyCollection(),version,provinces:['广东']};delete legacy.titles;
  const imported=importCollection(JSON.stringify(legacy));
  assert.equal(imported.version,3);assert.deepEqual(imported.titles,[]);assert.deepEqual(imported.provinces,['广东']);
  imported.titles=TITLES.slice(0,3).map(t=>t.id);
  assert.deepEqual(importCollection(exportCollection(imported)),imported);
 }
 assert.deepEqual(TITLE_CELLS.map(t=>t.id),TITLES.map(t=>t.id));
});

test('M4 图鉴拒绝非法、重复和错误类型的称号，不从导入文件执行任何内容',()=>{
 for(const titles of[['does-not-exist'],[TITLES[0].id,TITLES[0].id],[{id:TITLES[0].id}],[1],null,'title'])assert.throws(()=>importCollection(JSON.stringify({...emptyCollection(),titles})),/图鉴/);
 const storage=memoryStorage();storage.setItem('toutai-sim:collection:v1',JSON.stringify({...emptyCollection(),titles:['invalid']}));
 assert.deepEqual(loadCollection(storage),emptyCollection());
});

test('M4 只有终局收集主称号，相同结局重开页面不重复计数',()=>{
 const birth=createBirth(life.id);assert.deepEqual(recordLife(emptyCollection(),birth).collection.titles,[]);
 const {collection}=recordLife(emptyCollection(),life);
 assert.deepEqual(collection.titles,[biography(life).title.id]);
 assert.equal(collection.completed.length,1);
 assert.deepEqual(recordLife(collection,life).collection,collection);
 const storage=memoryStorage();saveCollection(collection,storage);assert.deepEqual(loadCollection(storage),collection);
 const replay={...life,choices:[...life.choices,{age:20,decision:'different-path',choice:'another'}]};
 assert.equal(recordLife(collection,replay).collection.completed.length,2);
});

test('M4 前世只存终局轻量摘要，保留底色四轴，结局指纹去重并允许同编号不同选择',()=>{
 const storage=memoryStorage();assert.deepEqual(savePastLife(createBirth(life.id),storage),[]);
 const first=savePastLife(life,storage);assert.equal(first.length,1);assert.equal(first[0].title,biography(life).title.id);
 assert.equal(first[0].biography,biography(life).sentence);assert.equal(first[0].key,lifeFingerprint(life));
 assert.equal(first[0].color.axes.length,4);
 assert.deepEqual(loadPastLives(storage),first);assert.equal(savePastLife(life,storage).length,1);
 const replay={...life,choices:[...life.choices,{age:20,decision:'different-path',choice:'another'}]};
 const rows=savePastLife(replay,storage);assert.equal(rows.length,2);assert.equal(rows[0].id,rows[1].id);assert.notEqual(rows[0].key,rows[1].key);
 const raw=JSON.parse(storage.getItem(PAST_LIVES_KEY));
 for(const row of raw.items){for(const forbidden of['log','choices','parents','record','scenarioHistory','history','rngState'])assert.ok(!(forbidden in row),forbidden);}
 assert.ok(storage.getItem(PAST_LIVES_KEY).length<10000);
});

test('M4 前世限最近12局，重复终局不挤走其他人生，读档过滤损坏条目并剥离额外字段',()=>{
 let rows=[];
 for(let i=0;i<20;i++)rows=recordPastLife(rows,{...life,choices:[...life.choices,{age:20,decision:'branch',choice:String(i)}]});
 assert.equal(rows.length,PAST_LIVES_LIMIT);
 const old=rows.at(-1),duplicate=recordPastLife(rows,{...life,choices:[...life.choices,{age:20,decision:'branch',choice:'8'}]});
 assert.deepEqual(duplicate,rows);assert.equal(duplicate.at(-1).key,old.key);
 const storage=memoryStorage();storage.setItem(PAST_LIVES_KEY,JSON.stringify({version:1,items:[null,{...rows[0],title:'invalid'},...rows.map(row=>({...row,log:['private'],color:{...row.color,log:['private'],axes:row.color.axes.map(a=>({...a,log:['private']}))}})),rows[0]]}));
 assert.deepEqual(loadPastLives(storage),rows);
});

test('M4 前世接纳合法二代三代家族编号，拒绝异常或嵌套代际后缀',()=>{
 const storage=memoryStorage(),parent=simulate(createBirth('粤-2026-410636'),{capture:true});
 const child=deriveChild(parent);assert.ok(child);
 const second=simulate(child,{capture:true}),grandchild=deriveChild(second);assert.ok(grandchild);
 const third=simulate(grandchild,{capture:true});
 assert.equal(second.id,parent.id+'·二代');assert.equal(third.id,parent.id+'·三代');
 savePastLife(parent,storage);savePastLife(second,storage);const rows=savePastLife(third,storage);
 assert.deepEqual(rows.map(row=>row.id),[third.id,second.id,parent.id]);assert.deepEqual(loadPastLives(storage),rows);
 assert.equal(savePastLife(second,storage).length,3);
 for(const id of[parent.id+'·一代',parent.id+'·四代',parent.id+'·2代',parent.id+'·二代·三代',parent.id+'·三代extra','不存在-2026-410636·二代']){
  assert.deepEqual(savePastLife({...second,id},storage),rows,id);
  storage.setItem(PAST_LIVES_KEY,JSON.stringify({version:1,items:[{...rows[0],id,key:id+':123'},...rows]}));
  assert.deepEqual(loadPastLives(storage),rows,id);
 }
 assert.equal(recordAbandonedBirth(child,storage).count,0);
});

test('M4 重抽只记尚未开始的普通身份，总数累计，明细限100条且不保存父母隐私',()=>{
 const storage=memoryStorage(),birth=createBirth(life.id);
 for(let i=0;i<105;i++)recordAbandonedBirth(birth,storage);
 const saved=loadAbandonedBirths(storage);assert.equal(saved.count,105);assert.equal(saved.items.length,ABANDONED_BIRTHS_LIMIT);
 assert.deepEqual(Object.keys(saved.items[0]).sort(),['id','name','province']);
 for(const invalid of[life,{...birth,age:1},{...birth,choices:[{}]},{...birth,family:{generation:2}},null])assert.deepEqual(recordAbandonedBirth(invalid,storage),saved);
 const raw=JSON.parse(storage.getItem(ABANDONED_BIRTHS_KEY));raw.items[0].parents=['private'];raw.items.unshift(null);storage.setItem(ABANDONED_BIRTHS_KEY,JSON.stringify(raw));assert.deepEqual(loadAbandonedBirths(storage),saved);
});

test('M4 本机存储不可用、格式错误或超限时安全恢复；写入异常留给UI提示',()=>{
 const broken={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.deepEqual(loadPastLives(broken),[]);assert.equal(loadAbandonedBirths(broken).count,0);
 assert.throws(()=>savePastLife(life,broken),/blocked/);assert.throws(()=>recordAbandonedBirth(createBirth(life.id),broken),/blocked/);
 const storage=memoryStorage();
 for(const raw of['{','null',JSON.stringify({version:99,items:[]}),JSON.stringify({version:1,count:-1,items:[]}), 'x'.repeat(100001)]){
  storage.setItem(PAST_LIVES_KEY,raw);storage.setItem(ABANDONED_BIRTHS_KEY,raw);
  assert.deepEqual(loadPastLives(storage),[]);assert.equal(loadAbandonedBirths(storage).count,0);
 }
});
