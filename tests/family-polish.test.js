import test from 'node:test';import assert from 'node:assert/strict';
import {probeFamily06} from '../scripts/probe-family-06.mjs';
import {familyGoalStatus,deriveChild,settlement} from '../src/engine/family.js';
import {findBannedWords} from './banned-words.js';
import {simulate} from '../src/engine/life.js';import {createBirth} from '../src/engine/birth.js';
test('06家族城乡、生育参数、1000个可接力农村Q1家族目标均满足约束',()=>{
 const r=probeFamily06();const u=r.unsecured,h=r.degreeHouse,f=r.fertility,t=r.target;
 assert.ok(u.n>500&&h.n>100);assert.ok(u.rural/u.n>=.5);assert.ok(u.ruralLeftBehind/u.rural>=.3);
 assert.ok(h.urban/h.n>=.7);assert.equal(t.eligible,1000);assert.ok(t.eligibleSuccess/t.eligible>=.3&&t.eligibleSuccess/t.eligible<=.8);
 assert.ok(f.parents45/f.survive45>=.65&&f.parents45/f.survive45<=.85);assert.ok(f.children/f.parents>=1);
 assert.ok(r.births[2].rural&&r.births[3].rural&&r.births[2].urban&&r.births[3].urban);
 assert.ok(r.loopSample);assert.equal(r.loopSample.births[0].leftBehind,true);assert.equal(r.loopSample.births[1].leftBehind,true);
 assert.ok(r.loopSample.loops.length>=3);assert.ok(r.loopSample.oldLine.length>0);
 for(const e of [...r.loopSample.loops,...r.loopSample.oldLine])assert.deepEqual(findBannedWords(e.text),[]);
});
test('姓氏取父亲，乡村工作迁居不提前解锁城市出生目标',()=>{
 // 不绑死某个编号的人生走向（M3 加剧本后同一编号的一生会变）：按条件找一位农村出身、在县城或省会定居、有孩子的女性。
 let mother=null;for(let i=0;i<4000&&!mother;i++){const s=simulate(createBirth(`粤-2026-${String(410636+i).padStart(6,'0')}`),{capture:true});if(s.sex==='female'&&s.hukou==='rural'&&['县城','省会'].includes(s.city)&&deriveChild(s))mother=s;}
 assert.ok(mother,'没有找到农村出身、城镇定居、有孩子的女性样本');assert.equal(mother.sex,'female');const child=deriveChild(mother);assert.ok(child);assert.equal(child.name[0],child.parents.father.name[0]);assert.equal(child.parents.mother.name,mother.name);
 assert.equal(settlement(mother).hukou,'urban');assert.equal(familyGoalStatus(mother,'city'),false);
 assert.equal(familyGoalStatus({...mother,hukou:'urban'},'city'),true);
 assert.deepEqual(child,deriveChild(mother));
});
