import test from 'node:test';import assert from 'node:assert/strict';import{createBirth,drawBirth}from'../src/engine/birth.js';import{step,simulate}from'../src/engine/life.js';import{drawCards}from'../src/engine/cards.js';import{PENSION_RULES}from'../src/engine/pension.js';
const person=patch=>({...drawBirth(42),age:62,sex:'male',edu:'bachelor',collegeGraduateAge:22,job:'教师',employmentType:'编制',city:'省会',assets:100000,income:100000,occupation:{id:'teacher',legacy:'教师',employmentType:'编制',level:2,years:35,yearsAtLevel:0,percentile:.5,paidMonths:12},pensionRecord:{years:35,publicYears:35,enterpriseYears:0,wageTotal:3500000,lastCategory:'public',retirementClass:'cadre'},...patch});
test('完整主路径男63退休领机关养老金，终年原因含三类金额',()=>{
 const s=step(person()).state;assert.equal(s.age,63);assert.equal(s.retired,true);assert.equal(s.laborIncome,0);assert.ok(Math.abs(s.pensionIncome-PENSION_RULES.publicMonthly*12)<1);assert.equal(s.pensionCategory,'public');assert.ok(s.log.some(e=>e.age===63&&e.text.includes('城乡居民')&&e.text.includes('机关事业')));
});
test('退休前一年有三种真实选择，提前和延后改变退休年龄',()=>{
 const s=drawCards(person({age:62}));assert.equal(s.pending.id,'flexible-retirement');const early=step(s,{choice:'early'}).state;assert.equal(early.retired,true);assert.equal(early.retiredAt,62);
 const late=step(s,{choice:'late'}).state;assert.equal(late.retirementChoice,'late');const at63=step({...late,pending:null}).state;assert.equal(at63.retired,undefined);assert.ok(at63.laborIncome>0);
});
test('同户口不同缴费不混类；务农60岁后仍有劳动与居民养老金',()=>{
 const farmer=step({...person({age:59,hukou:'urban',job:'务农',employmentType:'非编制',occupation:null,pensionRecord:null,cardUsage:{}})}).state;assert.equal(farmer.retired,undefined);assert.equal(farmer.pensionCategory,'resident');assert.ok(farmer.laborIncome>0);assert.equal(farmer.pensionMonthly,PENSION_RULES.residentMonthly);assert.equal(farmer.income,Math.round(farmer.laborIncome+farmer.pensionIncome));
});
test('备考后同岗位复工必写当年原因（性质测试，不绑死单个编号）',()=>{
 // M3 加入剧本后单个编号的一生会变，所以扫一批人生：凡是备考空档收入为 0、次年回到同一岗位领工资的年份，都必须有 exam-return 原因和日志。
 let cases=0;
 for(let i=0;i<1500;i++){const s=simulate(drawBirth((Math.imul(i,2654435761)+545861)>>>0),{capture:true});const h=s.incomeHistory??[];
  for(let k=1;k<h.length;k++){const prev=h[k-1],cur=h[k];
   if(prev.income===0&&prev.examGap&&cur.income>0&&cur.jobId&&cur.jobId===prev.jobId){cases++;
    assert.ok((cur.reasons??[]).some(r=>r.kind==='exam-return'),`${s.id} ${cur.age} 岁复工缺 exam-return 原因`);
    assert.ok(s.log.some(e=>e.age===cur.age&&e.incomeEvent==='exam-return'),`${s.id} ${cur.age} 岁复工缺日志`);}}}
 assert.ok(cases>=1,`样本里没有备考后复工的例子，测试会变成空跑`);
});
