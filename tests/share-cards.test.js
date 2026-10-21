import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {birthCard,endCard,familyCard,cardText} from '../src/ui/share-cards.js';
import {findBannedWords} from './banned-words.js';
test('分享卡为1080×1920，本地SVG含真实编号，不印网址且文案通过扫描',()=>{
 for(const id of ['京-2026-066321','粤-2026-694669']){
  let life=createBirth(id);const original=JSON.stringify(life);
  const birth=birthCard(life);assert.equal(JSON.stringify(life),original);
  while(life.alive)life=step(life,{auto:true}).state;
  const end=endCard(life);
  for(const svg of [birth,end]){
   assert.match(svg,/<svg[^>]+width="1080" height="1920"/);
   const copy=cardText(svg);assert.ok(copy.includes(id));assert.ok(copy.includes('人生签'));
   assert.deepEqual(findBannedWords(copy),[]);assert.doesNotMatch(copy,/https?:|www\.|\.pages\.dev|\.com/);
  }
  assert.match(cardText(birth),/这一生，准备出发/);
  assert.match(cardText(end),/100 人/);
 }
});
test('终局高亮格落在对应学历群体，出生卡父母年龄不随玩家年龄漂移',()=>{
 let b=createBirth('粤-2026-694669');const born=birthCard(b);while(b.alive)b=step(b,{auto:true}).state;
 assert.match(cardText(birthCard(b)),/当时 32 岁/);assert.match(cardText(born),/当时 32 岁/);
 assert.equal((endCard(b).match(/width="82" height="82"/g)||[]).length,100);
 assert.ok(cardText(endCard({...b,edu:'master'})).includes('硕士'));
 assert.ok(cardText(endCard(b,{badge:'今日签 · 第 2 局'})).includes('今日签 · 第 2 局'));
 assert.ok(!cardText(endCard(b,{badge:'今日签 · 第 2 局'})).includes('首局'));
});

test('Node渲染的两类分享卡PNG像素尺寸为1080×1920',()=>{
 for(const id of ['京-2026-066321','粤-2026-694669'])for(const kind of ['出生','终局']){
  const png=readFileSync(new URL(`./artifacts-07/人生签-${id}-${kind}.png`,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1920);
 }
});

test('旧品牌进入实际玩家文本禁词，新品牌文字覆盖三类分享卡',()=>{
 const previousName=String.fromCodePoint(0x6295,0x80ce);
 assert.ok(findBannedWords(previousName+'模拟器').includes(previousName));
 assert.deepEqual(findBannedWords('人生签'),[]);
 const family=JSON.parse(readFileSync(new URL('./artifacts-06/family-probe.json',import.meta.url),'utf8')).loopSample.lives;
 for(const svg of [birthCard(createBirth('粤-2026-694669')),endCard(family.at(-1)),familyCard(family.at(-1),{family})]){const copy=cardText(svg);assert.ok(copy.includes('人生签'));assert.deepEqual(findBannedWords(copy),[]);}
});
