import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {biography} from '../src/engine/biography.js';
import {endCard,colorCard,cardText} from '../src/ui/share-cards.js';

test('终局和底色卡使用同一人生的传记与称号，不改变状态或随机流',()=>{
 for(let i=0;i<30;i++){
  const life=simulate(drawBirth(i),{capture:true}),before=structuredClone(life),b=biography(life);
  const ending=endCard(life),color=colorCard(life);
  assert.match(ending,/width="1080" height="1920"/);assert.match(color,/width="1080" height="1920"/);
  assert.ok(cardText(ending).replaceAll('\n','').includes(b.title.shareName));
  assert.ok(cardText(color).replaceAll('\n','').includes(b.color.name));
  assert.deepEqual(life,before);
  for(const text of [cardText(ending),cardText(color)])assert.doesNotMatch(text,/犯罪|毒品|家暴/);
 }
});
test('短暂人生底色卡保留四轴并明确未有选择',()=>{
 const life={...drawBirth(42),alive:false,age:0};
 const text=cardText(colorCard(life));
 assert.match(text,/尚未定色/);assert.equal((text.match(/还没有相关选择/g)??[]).length,4);
 for(const word of ['安稳','折腾','顾家','顾己','留下','离开','认命','不认命'])assert.ok(text.includes(word));
});
