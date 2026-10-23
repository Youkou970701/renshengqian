import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {annualWork} from '../src/engine/work.js';
import {resolveMidcareer} from '../src/engine/career.js';
import {isProtectedPost} from '../src/engine/employment.js';
import {copyEconomy} from '../src/engine/money.js';
import {WORK_RULES,JOB_BY_ID} from '../src/content/jobs.js';

const fixture=(id,job,employmentType='编制')=>copyEconomy({...drawBirth(42),age:35,job,employmentType,city:'省会',industry:JOB_BY_ID[id].industry,income:100000,assets:300000,edu:'bachelor',major:'师范教育',skills:{craft:0},occupation:{id,legacy:job,employmentType,level:2,years:10,yearsAtLevel:0,percentile:.6,paidMonths:12}});
const protectedRoles=[['teacher','教师'],['doctor','医护'],['civil','公务员'],['institution','事业编'],['soldier','军人'],['nurse','护士']];

test('在编教师、医生、护士、公务员、事业编与军人在所有行业和强制年度风险下均不被行业裁员',()=>{
 const prior=WORK_RULES.layoff;WORK_RULES.layoff=1;
 try{
  for(const [id,job] of protectedRoles)for(const industry of ['education','medical','public','military','internet','manufacturing','construction','service','business','agriculture'])for(let seed=1;seed<=12;seed++){
   const s={...fixture(id,job),economyRngState:seed,industry};const events=[];
   annualWork(s,(text,stat,meta)=>events.push({text,...meta}));
   assert.equal(isProtectedPost(s),true,`${id}/${industry}/${seed}`);
   assert.equal(s.job,job);assert.equal(s.employmentSearch??null,null);assert.ok(s.income>0);
   assert.equal(events.some(e=>e.incomeEvent==='layoff'),false);
  }
 }finally{WORK_RULES.layoff=prior;}
});

test('35岁行业中断节点即使风险强制为100%，也不让在编岗位失业或转岗',()=>{
 for(const [id,job] of protectedRoles)for(const choice of ['stay','change']){
  const s=fixture(id,job),events=[];
  resolveMidcareer(s,choice,()=>0,(text,stat,meta)=>events.push({text,...meta}),{layoff:Object.fromEntries(['education','medical','public','military'].map(k=>[k,1]))});
  assert.equal(s.job,job);assert.equal(s.occupation.level,2);assert.equal(s.employmentType,'编制');
  assert.equal(events.some(e=>e.dice?.some(d=>d.id==='midcareer'&&d.pass)),false);
 }
});

test('合同制教师不享有编制保护，年度与35岁行业中断均可实际失业',()=>{
 const prior=WORK_RULES.layoff;WORK_RULES.layoff=1;
 try{
  const s=fixture('teacher-contract','教师','合同');assert.equal(isProtectedPost(s),false);
  annualWork(s,()=>{});assert.equal(s.job,'待业');assert.equal(s.income,0);assert.equal(s.employmentSearch.jobId,'teacher-contract');assert.ok(s.incomeReasons.some(r=>r.kind==='layoff'));
  const nurse=fixture('nurse','护士','合同');assert.equal(isProtectedPost(nurse),false);annualWork(nurse,()=>{});assert.equal(nurse.job,'待业');assert.equal(nurse.income,0);assert.ok(nurse.incomeReasons.some(r=>r.kind==='layoff'));
 }finally{WORK_RULES.layoff=prior;}
 const s=fixture('teacher-contract','教师','合同'),events=[];
 resolveMidcareer(s,'stay',()=>0,(text,stat,meta)=>events.push({text,...meta}),{layoff:{education:1},gigFallback:1});
 assert.ok(events.some(e=>e.node==='midcareer'&&e.dice?.some(d=>d.id==='midcareer'&&d.pass)));
 assert.equal(s.job,'外卖骑手');
});

test('同职业复职保留原职级和积累，包括教师从合同转在编与合同求职后复工',()=>{
 const prior=WORK_RULES.layoff;WORK_RULES.layoff=0;
 try{
  const admitted=fixture('teacher-contract','教师','合同');admitted.employmentType='编制';annualWork(admitted,()=>{});
  assert.equal(admitted.occupation.id,'teacher');assert.equal(admitted.occupation.level,2);assert.equal(admitted.occupation.years,11);
  const resumed=fixture('teacher-contract','教师','合同');resumed.job='待业';resumed.employmentType='待业';resumed.employmentSearch={jobId:'teacher-contract',monthsLeft:3};annualWork(resumed,()=>{});
  assert.equal(resumed.occupation.level,2);assert.equal(resumed.occupation.years,11);assert.equal(resumed.occupation.paidMonths,9);assert.ok(resumed.incomeReasons.some(r=>r.kind==='reemployment'));
 }finally{WORK_RULES.layoff=prior;}
});
