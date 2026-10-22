import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {normalPacing,importantTransition} from '../src/ui/pacing.js';
import {viewingPreferences} from '../src/ui/preferences.js';

test('08 默认关闭自动抉择，旧 true/false 均迁移关闭，仅保留新版主动选择',()=>{
 assert.deepEqual(viewingPreferences(),{automaticVersion:1,automatic:false,duration:30});
 for(const automatic of [true,false])assert.equal(viewingPreferences({automatic}).automatic,false);
 assert.equal(viewingPreferences({automaticVersion:1,automatic:true}).automatic,true);
 for(const [old,next] of [[5,15],[10,30],[20,60],[15,15],[30,30],[60,60]])assert.equal(viewingPreferences({duration:old}).duration,next);
});

test('08 节奏只读预测，抉择/骰子/升学/工作/婚育/亲人离世年份权重2，日常0.6',()=>{
 const birth=drawBirth(42),copy=structuredClone(birth),plan=normalPacing(birth);
 assert.deepEqual(birth,copy);
 assert.equal(plan.weights[0],.6);assert.equal(plan.weights[15],2);assert.equal(plan.weights[22],2);assert.equal(plan.weights[29],2);
 for(const change of [{edu:'bachelor'},{job:'技术员'},{married:true},{kids:[{bornAt:0}]},{parents:{...birth.parents,mother:{...birth.parents.mother,alive:false}}}])assert.equal(importantTransition(birth,{...birth,...change}),true);
 const daily={...birth,log:[{age:0,text:'日常事件'}]};assert.equal(importantTransition(birth,daily),false);
 const dice={...birth,log:[{age:0,text:'骰子',dice:[{}]}]};assert.equal(importantTransition(birth,dice),true);
});

test('08 15/30/60分钟预算归一，30局完整逐步运行仍与引擎相同',()=>{
 for(const duration of [15,30,60])for(let seed=0;seed<10;seed++){
  const birth=drawBirth(seed);let life=birth,elapsedMs=0,importantAge=null,guard=0;
  while(life.alive){
   assert.ok(++guard<300);const before=life;
   if(life.pending)life=step(life,{choice:autoChoose(life)}).state;
   else {const plan=normalPacing(life,{duration,elapsedMs,important:importantAge===life.age});assert.ok(plan.delayMs>=0);elapsedMs+=plan.delayMs;life=step(life).state;}
   if(importantTransition(before,life))importantAge=life.age;
  }
  assert.ok(Math.abs(elapsedMs-duration*60000)<.001,`${duration}分钟 seed=${seed}: ${elapsedMs}`);
  assert.deepEqual({...life,capture:true},simulate(birth,{capture:true}));
 }
});

test('08 手动抉择和重心改变后重新分配剩余观看预算，不改变实际引擎结果',()=>{
 let life=drawBirth(123),elapsedMs=0,importantAge=null,guard=0;
 while(life.alive){
  assert.ok(++guard<300);const before=life,focus=life.age<30?'study':'health';
  if(life.pending)life=step(life,{choice:life.pending.options.at(-1).id,focus}).state;
  else {elapsedMs+=normalPacing(life,{duration:30,elapsedMs,focus,important:importantAge===life.age}).delayMs;life=step(life,{focus}).state;}
  if(importantTransition(before,life))importantAge=life.age;
 }
 assert.ok(Math.abs(elapsedMs-1800000)<.001);
});
