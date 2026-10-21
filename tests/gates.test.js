import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {logistic} from '../src/engine/params.js';
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
test('25岁生活抉择后仍可同龄备考，未决不推进，完成计划后才过年',()=>{
 const birth=createBirth('京-2026-066321');let s={...birth,age:24,edu:'bachelor',job:'企业职员',record:{...birth.record,masterAttempts:2,careerPlanAge:24}};
 s=step(s).state;assert.equal(s.age,25);assert.equal(s.pending.id,'city');
 s=step(s,{choice:'省会'}).state;assert.equal(s.age,25);assert.equal(s.pending.id,'careerPlan');assert.equal(step(s).state,s);
 s=step(s,{choice:'work'}).state;assert.equal(s.age,25);assert.equal(s.pending,null);assert.equal(s.record.careerPlanAge,25);
 s=step(s).state;assert.equal(s.age,26);assert.equal(s.pending.id,'careerPlan');
});
