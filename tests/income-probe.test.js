import test from 'node:test';
import assert from 'node:assert/strict';
import {auditIncomePair,incomeTrajectoryMarkdown,FIXED_SAMPLE_IDS} from '../scripts/probe-m2.mjs';
const row=(age,income,extra={})=>({age,income,jobId:'teacher',level:1,city:'县城',paidMonths:12,public:true,volatile:false,retired:false,reasons:[],...extra});
test('首次进入就业收入不算事件大涨，失业和复工必须各自有事件',()=>{
 assert.equal(auditIncomePair(row(18,0),row(19,100000),{hasEarned:false}).large,false);
 const lost=auditIncomePair(row(30,100000),row(31,0),{hasEarned:true});assert.equal(lost.large,true);assert.equal(lost.explained,false);
 const resumed=auditIncomePair(row(31,0),row(32,100000,{reasons:[{kind:'reemployment',text:'重新入职，有薪十个月。'}]}),{hasEarned:true});assert.equal(resumed.large,true);assert.equal(resumed.explained,true);
 assert.equal(auditIncomePair(row(30,100000),row(31,60000,{reasons:[{}]}),{hasEarned:true}).explained,false);
});
test('无事件同岗同级噪声不能拿来满足事件波动门槛',()=>{
 const a=auditIncomePair(row(30,100000),row(31,140000),{hasEarned:true});assert.equal(a.stable,'public');assert.equal(a.large,true);assert.equal(a.explained,false);assert.equal(a.rate,.4);
 const withReason=auditIncomePair(row(30,100000),row(31,140000,{reasons:[{kind:'promotion',text:'晋升调薪。'}]}),{hasEarned:true});assert.equal(withReason.stable,null);assert.equal(withReason.explained,true);
});
test('黏性仅取连续、完整有薪、同地点同岗同级无事件年度对',()=>{
 const original=row(30,100000);
 for(const changed of [{age:32},{jobId:'civil'},{level:2},{city:'一线'},{paidMonths:10},{retired:true},{income:0},{reasons:[{kind:'illness',text:'病休'}]}])assert.equal(auditIncomePair(original,row(31,102000,changed),{hasEarned:true}).stable,null);
 assert.equal(auditIncomePair(row(30,100000,{paidMonths:10}),row(31,100000),{hasEarned:true}).stable,null);
 assert.equal(auditIncomePair(original,row(31,102000,{public:false}),{hasEarned:true}).stable,'regular');
 assert.equal(auditIncomePair(original,row(31,102000,{public:false,volatile:true}),{hasEarned:true}).stable,'volatile');
});
test('三条轨迹固定旧编号并按年打印原因，不挑一条更平稳的新人生',()=>{
 assert.deepEqual(Object.values(FIXED_SAMPLE_IDS),['冀-2026-083642','粤-2026-410636','浙-2026-943206']);
 const text=incomeTrajectoryMarkdown({fixed:{id:FIXED_SAMPLE_IDS.eliteFamily,incomeHistory:[row(30,100000),row(31,140000)]}});
 assert.match(text,/浙-2026-943206/);assert.match(text,/40\.0%/);assert.match(text,/无原因的大变化/);
});
