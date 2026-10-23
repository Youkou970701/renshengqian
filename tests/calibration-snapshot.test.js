import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {cohort,effortCohort,checks,educationChecks} from '../scripts/cohort.mjs';
import {referenceFromCohort} from '../scripts/reference.mjs';

test('100000局 v2 真实主路径原25项全部PASS，固定新快照',{timeout:900000},()=>{
 const c=cohort(100000),e=effortCohort(100000),rows=checks(c,e),educationRows=educationChecks(c);
 const actual=JSON.stringify({cohort:c,effort:e,rows,educationRows},(key,value)=>key==='income'?undefined:value===Infinity?'Infinity':value,2)+'\n';
 if(process.env.V2_MILESTONE){
  assert.match(process.env.V2_MILESTONE,/^M[1-5](?:-retest(?:-[1-9]\d*)?)?$/);const dir=new URL(`./artifacts-09/${process.env.V2_MILESTONE}/`,import.meta.url);mkdirSync(dir,{recursive:true});writeFileSync(new URL('calibration.json',dir),actual);
 }
 assert.equal(rows.length,25);
 assert.deepEqual(rows.filter(r=>!r.pass).map(r=>({name:r.name,value:r.value,min:r.min,max:r.max})),[], '原25项校准有失败；不得刷新快照或进入下一里程碑');
 assert.deepEqual(educationRows.filter(r=>!r.pass),[],'09a录取目标未过，不能写入新快照');
 if(process.env.EXPORT_REFERENCE==='1'&&process.env.V2_MILESTONE)writeFileSync(new URL(`./artifacts-09/${process.env.V2_MILESTONE}/reference-candidate.json`,import.meta.url),JSON.stringify(referenceFromCohort(c),null,2)+'\n');
 const path=new URL('./fixtures/calibration-v2.json',import.meta.url);
 // Explicit user-authorized snapshot rebuild; normal test runs never accept their own output.
 if(process.env.UPDATE_CALIBRATION_V2==='1')writeFileSync(path,actual);
 assert.equal(actual,readFileSync(path,'utf8'));
});
