import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {normalPacing} from '../src/ui/pacing.js';

test('v2 没事年份4秒，有事年份分配剩余观看预算，15/30/60分钟档均不修改人生',()=>{
 for(const duration of [15,30,60]){
  const life=drawBirth(42),before=structuredClone(life),plan=normalPacing(life,{duration});
  assert.equal(plan.weight,.6);assert.equal(plan.delayMs,4000);assert.deepEqual(life,before);
  const weights=Object.values(plan.weights),quiet=weights.filter(x=>x===.6).length,important=weights.length-quiet;
  assert.ok(important>0);assert.ok((plan.remainingMs-quiet*plan.delayMs)/important>plan.delayMs);
  const urgent=normalPacing(life,{duration,elapsedMs:duration*60000-1});assert.ok(urgent.delayMs>=0&&urgent.delayMs<=1);
 }
});
