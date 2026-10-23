import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JOBS,JOB_BY_ID} from '../src/content/jobs.js';
import {drawBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {drawCards} from '../src/engine/cards.js';
import {autoChoose} from '../src/engine/decisions.js';
import {annualWork,industryYear,jobEligible} from '../src/engine/work.js';
import {financialAction,copyEconomy,houseQuote,annualMoney,annualBusiness,netAssets} from '../src/engine/money.js';
import {random} from '../src/engine/rng.js';
const person=(patch={})=>({...drawBirth(42),age:30,edu:'bachelor',collegeGraduateAge:22,job:'企业职员',industry:'service',employmentType:'非编制',assets:300000,income:100000,skills:{craft:30},...patch});
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
const seedFor=pred=>{let i=1;while(!pred(random(i).value))i++;return i;};

test('至少40种独立职业，各有3–6级收入与晋升条件，指定生活职业齐全',()=>{
 assert.ok(JOBS.length>=40);assert.equal(new Set(JOBS.map(j=>j.id)).size,JOBS.length);
 for(const name of ['自由职业者','医生','军人','老师','服务员','保洁','保安','厨师','护工','快递员','房产中介','保险销售','网店店主','律师','会计'])assert.ok(JOBS.some(j=>j.name===name),name);
 for(const j of JOBS){assert.ok(j.levels.length>=3&&j.levels.length<=6);for(const l of j.levels){assert.ok(l.annual[0]>0&&l.annual[1]>l.annual[0]);assert.ok(l.promotion.years>=2);}}
 assert.doesNotMatch(readFileSync(new URL('../src/engine/life.js',import.meta.url),'utf8'),/incomeByEdu/);
});

test('同学历同城市不同职业产生不同收入，行业年景按行业和年份共同变化',()=>{
 const base=person({age:40});
 const a={...base,job:'工厂工人',industry:'manufacturing',occupation:{id:'factory',legacy:'工厂工人',employmentType:'非编制',level:0,years:4,yearsAtLevel:0,percentile:.5}},b={...base,job:'互联网职员',industry:'internet',occupation:{id:'programmer',legacy:'互联网职员',employmentType:'非编制',level:0,years:4,yearsAtLevel:0,percentile:.5}};
 a.economyRngState=b.economyRngState=seedFor(u=>u>.5);annualWork(a,()=>{});annualWork(b,()=>{});assert.ok(b.income>a.income*1.3);assert.deepEqual(industryYear('internet',2050),industryYear('internet',2050));assert.notDeepEqual(industryYear('internet',2050),industryYear('internet',2052));
});

test('求职期间工资0，有薪月数真实递减等待，不能靠菜单瞬间入职',()=>{
 let s=financialAction(person(),{action:'apply-job',jobId:'freelancer'});assert.equal(s.job,'待业');assert.equal(s.income,0);const waiting=s.employmentSearch.monthsLeft;assert.ok(waiting>=3&&waiting<=18);
 s.age++;annualWork(s,()=>{});if(waiting>=12){assert.equal(s.income,0);assert.equal(s.employmentSearch.monthsLeft,waiting-12);s.age++;annualWork(s,()=>{});}
 assert.equal(s.job,'自由职业者');assert.ok(s.income>0);assert.ok(s.occupation.paidMonths>0&&s.occupation.paidMonths<=12);
 assert.equal(jobEligible(person({edu:'junior'}),JOB_BY_ID.lawyer),false);assert.equal(jobEligible(person({edu:'master'}),JOB_BY_ID.doctor),false);
 assert.throws(()=>financialAction(person({edu:'junior'}),{action:'apply-job',jobId:'lawyer'}));
});

test('购房需真实首付、月供和信用，小房便宜；付首付不凭空增加净资产',()=>{
 const s=person();const q=houseQuote(s,'县城','small');assert.ok(q.enabled);assert.ok(q.price<houseQuote(s,'县城','normal').price);
 const before=netAssets(s),p=financialAction(freeze(s),{action:'house:县城:small'});assert.equal(p.assets,s.assets-q.down);assert.equal(p.money.mortgage.balance,q.principal);assert.equal(netAssets(p),before);
 assert.throws(()=>financialAction(person({assets:0}),{action:'house:县城:small'}));assert.throws(()=>financialAction(person({credit:20}),{action:'house:县城:small'}));
});

test('房贷按30年逐月计息还本，提前还款和卖房按余额结清，没有本金/利息混淆',()=>{
 let s=financialAction(person(),{action:'house:县城:small'}),balance=s.money.mortgage.balance;s.age++;annualMoney(s,()=>{});
 const loan=s.money.mortgage;assert.ok(loan.balance<balance);assert.ok(loan.lastInterest>0);assert.ok(Math.abs((balance-loan.balance)+loan.lastInterest-loan.lastPayment)<.1);
 s=financialAction(s,{action:'mortgage-prepay',amount:10000});assert.ok(Math.abs(s.money.mortgage.balance-(loan.balance-10000))<.01);
 for(let i=0;i<30;i++){s={...copyEconomy(s),age:s.age+1,assets:1000000};annualMoney(s,()=>{});}assert.equal(s.money.mortgage.balance,0);
 const sold=financialAction(s,{action:'house-sell'});assert.equal(sold.ownsHouse,false);assert.equal(sold.mortgage,0);assert.ok(sold.assets>s.assets);
});

test('自动购房会在可承受地区和面积中选择；现金不足仍租房',()=>{
 const s=drawCards(person({age:31,city:'省会',income:60000,assets:100000}));assert.equal(s.pending.id,'house');assert.equal(autoChoose(s),'buy-county');const p=step(freeze(s),{choice:autoChoose(s)}).state;assert.equal(p.ownsHouse,true);assert.equal(p.money.property.city,'县城');assert.ok(p.assets>=0);
 assert.equal(autoChoose(drawCards(person({age:31,assets:0}))), 'rent');
});

test('存款和赎回只改变现金位置，网贷不是收入且负债等额增加，零现金也能按合同借款',()=>{
 let s=person({assets:10000});const original=netAssets(s);s=financialAction(s,{action:'deposit',amount:5000});assert.equal(s.assets,5000);assert.equal(netAssets(s),original);
 s=financialAction(s,{action:'withdraw-deposit',amount:5000});assert.equal(s.assets,10000);assert.equal(s.money.accounts.deposit,0);
 const loan=financialAction(person({assets:0,income:0}),{action:'online-loan',amount:10000});assert.equal(loan.assets,10000);assert.equal(loan.money.debts[0].balance,10000);assert.equal(loan.income,0);assert.equal(netAssets(loan),0);
 assert.throws(()=>financialAction(loan,{action:'online-loan',amount:10000}));assert.throws(()=>financialAction(person(),{action:'online-loan',amount:999999}));
});

test('父母预算、固定价格和每年安排有边界，免费改金额或借负数不能刷属性',()=>{
 const poor=person({age:8,wealthQ:1,assets:0});assert.throws(()=>financialAction(poor,{action:'tutoring'}));
 const rich=person({age:8,wealthQ:5,assets:0}),before=structuredClone(rich),s=financialAction(freeze(rich),{action:'tutoring'});assert.deepEqual(rich,before);assert.equal(s.assets,0);assert.equal(s.money.parentSpending[8],3000);assert.equal(s.skills.study,6);
 assert.throws(()=>financialAction(s,{action:'tutoring'}));assert.throws(()=>financialAction(rich,{action:'tutoring',amount:1}));assert.throws(()=>financialAction(person(),{action:'online-loan',amount:-1}));
});

test('四种经营都可真实开办，雇人扩张借款转让有账，关闭损失不能凭空回本',()=>{
 for(const type of ['shop','factory','online','training']){
  let s=financialAction(person(),{action:`business:${type}`});assert.equal(s.business.active,true);assert.equal(s.income,0);
  s=financialAction(s,{action:'business-hire'});assert.equal(s.business.employees,1);assert.ok(s.business.scale>1);
  s=financialAction(s,{action:'business-expand'});s=financialAction(s,{action:'business-loan',amount:10000});assert.ok(s.money.debts.length);
  const closed={...copyEconomy(s),age:s.age+1,economyRngState:seedFor(u=>u>.95)},before=closed.assets,capital=closed.business.capital;annualBusiness(closed,()=>{});assert.equal(closed.business.active,false);assert.equal(closed.assets-before,Math.round(capital*.2));assert.equal(closed.income,0);
  const sold=financialAction(s,{action:'business-transfer'});assert.equal(sold.business.active,false);assert.equal(sold.job,'待业');
 }
});

test('同编号同菜单输入可复现并能存档，行动不推进年龄，capture不改结果',()=>{
 const inputs=[{action:'deposit',amount:1000},{action:'fund',amount:1000},{action:'certificate'},{action:'parents',amount:1000}];
 let a=person(),b=person({capture:false});
 for(const input of inputs){const before=structuredClone(a),x=step(freeze(a),input).state,y=step(b,input).state;assert.deepEqual(a,before);assert.equal(x.age,30);assert.equal(x.rngState,a.rngState);a=x;b=y;}
 assert.deepEqual(a.money,b.money);assert.deepEqual(a.inputHistory,inputs.map(input=>({age:30,...input})));
 assert.deepEqual(simulate(a,{capture:true}),simulate(JSON.parse(JSON.stringify(a)),{capture:true}));
});
