import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {cohort,effortCohort,checks} from '../scripts/cohort.mjs';
let c,e;
before(()=>{c=cohort(20000);e=effortCohort(20000);},{timeout:60000});
test('20000局完整生命周期统计校准全部通过',()=>{for(const r of checks(c,e).slice(0,15))assert.ok(r.pass,`${r.name}: ${r.value} outside ${r.min}..${r.max}`);});
test('努力边界一：配对同出生队列全学习比从不学习多5至20个百分点',()=>{assert.equal(e.n,20000);assert.ok(e.difference>=.05&&e.difference<=.20,`增益=${e.difference}`);});
test('努力边界二：农村Q1全学习本科率仍低于城市Q5默认自动',()=>{assert.ok(e.poorN>2000&&e.richN>2000);assert.ok(e.poorStudy<e.richAuto,`${e.poorStudy} >= ${e.richAuto}`);});

test('新增8项分层与成年去向目标保持原表约束全部通过',()=>{const rows=checks(c,e).slice(17);assert.equal(rows.length,8);for(const r of rows)assert.ok(r.pass,`${r.name}: ${r.value} outside ${r.min}..${r.max}`);});
