import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{cohort,effortCohort,checks}from'../scripts/cohort.mjs';
test('100000局校准25项及完整输出与03快照逐字一致（锁定随机数消耗）',{timeout:300000},()=>{
 const c=cohort(100000),e=effortCohort(100000),rows=checks(c,e);
 assert.equal(rows.length,25);assert.ok(rows.every(r=>r.pass));
 const actual=JSON.stringify({cohort:c,effort:e,rows},(key,value)=>key==='income'?undefined:value===Infinity?'Infinity':value,2)+'\n';
 assert.equal(actual,readFileSync(new URL('./fixtures/calibration-03.json',import.meta.url),'utf8'));
});
