import test from 'node:test';import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';import {simulate} from '../src/engine/life.js';import {buildSpeedTimeline} from '../src/ui/speed.js';
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
