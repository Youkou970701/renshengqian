import test from'node:test';import assert from'node:assert/strict';import{dailyBirth,getShanghaiDate,dailyPreview,beginDaily,completeDaily,dailyBadge,loadDaily}from'../src/ui/daily.js';import{simulate}from'../src/engine/life.js';import{findBannedWords}from'./banned-words.js';
const memory=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('每日签北京时间跨零点，全国同日出生完全一致，预告无剧透和禁词',()=>{
 assert.equal(getShanghaiDate(new Date('2026-10-21T15:59:00Z')),'2026-10-21');assert.equal(getShanghaiDate(new Date('2026-10-21T16:01:00Z')),'2026-10-22');
 assert.deepEqual(dailyBirth('2026-10-22'),dailyBirth('2026-10-22'));assert.notEqual(dailyBirth('2026-10-21').id,dailyBirth('2026-10-22').id);
 for(let d=1;d<=28;d++){const date=`2026-10-${String(d).padStart(2,'0')}`;assert.deepEqual(findBannedWords(dailyPreview(date)),[]);assert.doesNotMatch(dailyPreview(date),/本科|岁|终局/);}
});
test('每日签只首局终局印首局，重玩编号不变且不能覆盖第一局结果',()=>{
 const storage=memory(),one=beginDaily(storage,'2026-10-22'),two=beginDaily(storage,'2026-10-22');assert.equal(one.id,two.id);assert.match(dailyBadge(one),/首局/);assert.doesNotMatch(dailyBadge(two),/首局/);assert.equal(dailyBadge(two),'今日签 · 第 2 局');assert.equal(dailyBadge(one,{birth:true}),'10月22日 · 今日签');
 const end=simulate(one.birth);completeDaily(storage,one,end);const first=loadDaily(storage).days[one.date].firstResult;completeDaily(storage,two,{...end,age:109});assert.deepEqual(loadDaily(storage).days[one.date].firstResult,first);assert.equal(dailyBadge(null),'');
});
