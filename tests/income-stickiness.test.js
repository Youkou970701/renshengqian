import test from 'node:test';import assert from 'node:assert/strict';
import {drawBirth,createBirth} from '../src/engine/birth.js';import {annualWork,settleDisposableIncome} from '../src/engine/work.js';import {copyEconomy,annualBusiness,financialAction} from '../src/engine/money.js';import {simulate} from '../src/engine/life.js';import {JOB_BY_ID} from '../src/content/jobs.js';
const setup=(id,legacy,extra={})=>copyEconomy({...drawBirth(42),age:30,job:legacy,employmentType:'编制',income:100000,assets:300000,city:'省会',skills:{craft:0},occupation:{id,legacy,employmentType:'编制',level:0,years:2,yearsAtLevel:0,percentile:.6,paidMonths:12},...extra});
test('教师无收入事件的同岗同级年份，薪酬基准延续，年度变化不超过6%',()=>{
 let s=setup('teacher','教师'),prior=null,n=0;const events=[];
 for(let i=0;i<20;i++){s=copyEconomy({...s,age:30+i});annualWork(s,(text,stat,meta)=>events.push({age:s.age,text,...meta}));settleDisposableIncome(s);if(prior&&!s.lastIncomeObservation.reasons.length){assert.ok(Math.abs(s.income-prior)/prior<=.06);n++;}prior=s.income;}
 assert.ok(n>=15);assert.ok(s.occupation.contractAnnual>0);
});
test('高波动职业显式列出，普通岗位不可被全量标高波动绕过门槛',()=>{
 for(const id of ['sales','driver','streamer','shop','smallfactory','onlinestore'])assert.equal(JOB_BY_ID[id].volatile,true,id);
 for(const id of ['teacher','doctor','civil','programmer','factory','clerk'])assert.equal(JOB_BY_ID[id].volatile,false,id);
});
test('退休的大幅减薪与经营亏损/关店有真实当年事件，不用噪声充数',()=>{
 let s=setup('teacher','教师');annualWork(s,()=>{});settleDisposableIncome(s);s={...copyEconomy(s),age:60,retired:true,job:'退休'};const logs=[];annualWork(s,(text,stat,meta)=>logs.push({text,...meta}));settleDisposableIncome(s);assert.ok(s.incomeStats.largeChange);assert.equal(logs[0].incomeEvent,'retirement');assert.equal(s.lastIncomeObservation.reasons[0].kind,'retirement');
 let b=financialAction(setup('clerk','企业职员'),{action:'business:shop'});b.age++;annualBusiness(b,(text,stat,meta)=>logs.push({text,...meta}));assert.ok(b.incomeReasons.some(x=>['business-year','business-closure'].includes(x.kind)));assert.ok(b.record.businessStarted);
});
test('固定教师样本逐年大幅收入变化都有同年原因和日志，存档与capture结果一致',()=>{
 const birth=createBirth('浙-2026-943206'),s=simulate(birth,{capture:true}),quiet=simulate(birth,{capture:false});assert.deepEqual(s.incomeStats,quiet.incomeStats);assert.equal(s.incomeStats.unexplainedLargeChanges??0,0);
 let old=null,started=false;
 for(const row of s.incomeHistory){if(started&&old&&(old.income>0?Math.abs(row.income-old.income)/old.income>=.3:row.income>0)){assert.ok(row.reasons.length,`age ${row.age}`);for(const reason of row.reasons)assert.ok(s.log.some(e=>e.age===row.age&&e.text===reason.text));}started ||=row.income>0;old=row;}
});
