import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{checkRarity,emptyCollection,recordLife,recordBirth,exportCollection,importCollection,saveCollection,loadCollection,ACHIEVEMENT_CELLS}from'../src/ui/collection.js';import{createBirth}from'../src/engine/birth.js';import{simulate}from'../src/engine/life.js';import{engineHash}from'../scripts/engine-hash.mjs';import{familyCard,cardText,endCard}from'../src/ui/share-cards.js';import{dailyBadge,dailyBirth}from'../src/ui/daily.js';import{findBannedWords}from'./banned-words.js';import{ACHIEVEMENTS}from'../src/content/achievements.js';
test('图鉴导出、清空、导入完整往返，损坏文件拒绝，重复终局不重复解锁',()=>{const life=simulate(createBirth('粤-2026-694669'),{capture:true});const r=recordLife(recordBirth(emptyCollection(),life),life);assert.ok(r.unlocked.length);const raw=exportCollection(r.collection);const db=new Map(),storage={setItem:(k,v)=>db.set(k,v),getItem:k=>db.get(k)};saveCollection(r.collection,storage);assert.deepEqual(loadCollection(storage),r.collection);saveCollection(emptyCollection(),storage);assert.deepEqual(loadCollection(storage),emptyCollection());saveCollection(importCollection(raw),storage);assert.deepEqual(loadCollection(storage),r.collection);assert.deepEqual(recordLife(r.collection,life).unlocked,[]);assert.throws(()=>importCollection('{"version":1}'));assert.throws(()=>importCollection(raw.replace('广东','不存在省份')));});
test('31项成就十万模拟频率、引擎哈希及成就家族每日卡片禁词扫描',()=>{const rarity=JSON.parse(readFileSync(new URL('../src/content/achievements-rarity.json',import.meta.url),'utf8'));assert.equal(rarity.n,100000);assert.equal(rarity.engineHash,engineHash());assert.equal(ACHIEVEMENT_CELLS.length,31);for(const a of ACHIEVEMENT_CELLS){assert.ok(Number.isInteger(a.count)&&a.count>=0&&a.count<=100000);assert.deepEqual(findBannedWords(a.name+' '+a.description),[]);assert.doesNotMatch(a.name+a.description,/死因|疾病|癌症|自杀|废物|躺平王/);}const sample=JSON.parse(readFileSync(new URL('./artifacts-05/family-probe.json',import.meta.url),'utf8')).sample;for(const svg of[familyCard(sample.at(-1),{family:sample}),endCard(simulate(dailyBirth('2026-10-22')),{badge:dailyBadge({date:'2026-10-22',attempt:2})})])assert.deepEqual(findBannedWords(cardText(svg)),[]);});
test('家族卡与每日签首局重玩卡均导出1080×1920实图',()=>{for(const name of['family','daily-first','daily-repeat']){const png=readFileSync(new URL(`./artifacts-05/${name}.png`,import.meta.url));assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);}});

test("图鉴频率版本错配会明确报错",()=>assert.throws(()=>checkRarity({n:100000,engineHash:"outdated"}),/版本不一致/));

// Product rarity targets are evaluated against the shipped 100,000-life data,
// never against a separate, easier population or a rounded displayed percent.
test('成就最多5项入门，其余少于10%，至少8项少于1%，名称短而无禁词',()=>{
 assert.equal(ACHIEVEMENTS.length,31);
 assert.equal(new Set(ACHIEVEMENTS.map(a=>a.id)).size,31);
 const rarity=JSON.parse(readFileSync(new URL('../src/content/achievements-rarity.json',import.meta.url),'utf8'));
 const beginner=ACHIEVEMENTS.filter(a=>a.beginner);assert.ok(beginner.length<=5);
 let rare=0;for(const a of ACHIEVEMENTS){
  assert.equal(typeof a.beginner,'boolean',a.id+' must explicitly classify beginner status');
  assert.ok([...a.name].length<=8,a.name+' exceeds 8 characters');
  assert.ok(a.description.length>0);
  assert.deepEqual(findBannedWords(a.name+' '+a.description),[],a.id);
  assert.doesNotMatch(a.name+a.description,/死因|疾病|癌症|自杀|废物|躺平王|穷鬼|牛马/);
  const count=rarity.counts[a.id];assert.ok(Number.isInteger(count)&&count>0&&count<=rarity.n,a.id+' must be observed in the fixed simulation');
  if(!a.beginner)assert.ok(count<rarity.n*.1,a.name+' is not below 10%');
  if(a.id==='ten-million')assert.ok(count<rarity.n*.03,'身家过千万 must be below 3%');
  if(count<rarity.n*.01)rare++;
 }assert.ok(rare>=8,'need at least eight achievements below 1%');
});
test('招录成就看实际录用事件，不把三次落榜后的其他工作算成上岸',()=>{
 const third=ACHIEVEMENTS.find(a=>a.id==='civil-third'),first=ACHIEVEMENTS.find(a=>a.id==='civil-first');
 const event=(attempt,pass)=>({templateId:`civil-${pass?'admitted':'failure'}-${attempt}`,dice:[{id:'civil',pass}]});
 assert.equal(third.test({record:{civilAttempts:3,tizhiBy35:true},log:[event(1,false),event(2,false),event(3,false)]}),false);
 assert.equal(third.test({log:[event(3,true)]}),true);assert.equal(first.test({log:[event(1,true)]}),true);
 assert.equal(first.test({record:{civilAttempts:1,tizhiBy35:true},log:[event(1,false)]}),false);
});
test('旧图鉴保留足迹；收紧条件的旧成就不冒充新稀有成就',()=>{const legacy={...emptyCollection(),version:1,provinces:['广东'],achievements:['teacher','degree'],completed:['old-terminal']};const migrated=importCollection(JSON.stringify(legacy));assert.equal(migrated.version,3);assert.deepEqual(migrated.provinces,['广东']);assert.deepEqual(migrated.achievements,['degree']);assert.deepEqual(migrated.completed,[]);assert.deepEqual(importCollection(exportCollection(migrated)),migrated);});

test('M2旧图鉴迁移删除旧住房、百万和非升学近失误，保留足迹及其他成就',()=>{
 const old={...emptyCollection(),version:2,provinces:['广东'],achievements:['house','million','near-one','degree'],completed:['old-terminal']};
 const next=importCollection(JSON.stringify(old));assert.equal(next.version,3);assert.deepEqual(next.provinces,['广东']);assert.deepEqual(next.achievements,['degree']);assert.deepEqual(next.completed,[]);assert.deepEqual(importCollection(exportCollection(next)),next);
 assert.throws(()=>importCollection(JSON.stringify({...old,version:3})),/条目无效/);
});
