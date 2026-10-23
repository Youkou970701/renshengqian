import test from 'node:test';import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';import {simulate} from '../src/engine/life.js';import {buildSpeedTimeline,isSpeedEvent} from '../src/ui/speed.js';
test('200局极速模拟时钟：45至75秒中位数，完整结果与普通自动人生一致',()=>{
 const durations=[];
 for(let i=0;i<200;i++){
  const birth=drawBirth(i),plan=buildSpeedTimeline(birth),end=simulate(birth,{capture:true});
  assert.deepEqual(plan.frames.at(-1).life,end);let clock=0;
  for(const frame of plan.frames){assert.ok(Math.abs(frame.atMs-clock)<.001);assert.ok(frame.durationMs>=400);clock+=frame.durationMs;}
  assert.ok(Math.abs(clock-plan.durationMs)<.001);durations.push(clock/1000);
 }
 durations.sort((a,b)=>a-b);assert.ok(durations[100]>=45&&durations[100]<=75);
});

test('极速只保留关键抉择和全部剧本终局，包括没有骰子的躲开出口',()=>{
 assert.equal(isSpeedEvent({node:'card',cardId:'warm-unimportant'}),false);
 assert.equal(isSpeedEvent({node:'scenario-scene'}),false);
 assert.equal(isSpeedEvent({node:'card',cardId:'marry'}),true);
 assert.equal(isSpeedEvent({node:'scenario-end',outcome:'avoided'}),true);
 let endings=0,exits=0;
 for(let i=0;i<100;i++){
  const b=drawBirth(i),p=buildSpeedTimeline(b),s=p.frames.at(-1).life,shown=p.frames.flatMap(f=>f.events);
  for(const e of s.log.filter(e=>e.node==='scenario-end')){assert.ok(shown.includes(e));endings++;exits+=e.outcome==='avoided';}
 }
 assert.ok(endings>100);assert.ok(exits>0);
});
