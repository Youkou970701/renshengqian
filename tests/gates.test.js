import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {logistic} from '../src/engine/params.js';
import {autoChoose} from '../src/engine/decisions.js';
test('真实升学裁决只有可翻转同次抽样的因素才能写成主因，包括复读加成',()=>{
 let verified=0;
 for(let i=0;i<400;i++)for(const e of simulate(drawBirth(i),{capture:true,until:23}).log){
  if(!['school','exam','completion'].includes(e.node)||['chance','choice'].includes(e.reason))continue;
  const score=Object.values(e.contributions).reduce((a,b)=>a+b,0),v=e.contributions[e.reason];
  assert.ok(Number.isFinite(v));assert.ok(Math.abs(e.probability-logistic(score))<1e-12);
  assert.notEqual(e.draw<e.probability,e.draw<logistic(score-v));verified++;
 }
 assert.ok(verified>50);
});
test('25岁卡片未决不推进，同年最多两张卡，后续年份不再出现careerPlan',()=>{
 const birth=createBirth('京-2026-066321');let s={...birth,age:24,edu:'bachelor',job:'企业职员',record:{...birth.record,masterAttempts:2,careerPlanAge:24}};
 s=step(s).state;assert.equal(s.age,25);assert.equal(s.pending.id,'city');
 assert.equal(step(s).state,s);
 s=step(s,{choice:'省会'}).state;assert.equal(s.age,25);assert.equal(s.city,'省会');
 let guard=0;
 while(s.alive&&s.age<=35){
  assert.ok(++guard<60,'年度卡片结算应能正常推进');
  assert.ok(s.cardsOfferedThisYear<=2);
  if(s.pending){
   assert.notEqual(s.pending.id,'careerPlan');assert.doesNotMatch(s.pending.title,/今年还要再试一次/);
   assert.equal(step(s).state,s);
   const age=s.age;s=step(s,{choice:autoChoose(s)}).state;assert.equal(s.age,age);
  }else s=step(s).state;
 }
 const byAge={};for(const card of s.cardHistory??[])byAge[card.age]=(byAge[card.age]??0)+1;
 assert.ok(byAge[25]>=1&&byAge[25]<=2);
 assert.ok(Object.values(byAge).every(count=>count<=2));
 assert.ok(!(s.cardHistory??[]).some(card=>card.id==='careerPlan'));
});
