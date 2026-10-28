import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {businessScene,workScene,BUSINESS_SCENES,WORK_SCENES,INDUSTRY_SCENES,PROFESSION_SCENES} from '../src/content/income-scenes.js';
import {beginMoneyYear,finishMoneyYear,recordMoneyFlow,moneyChangeRows} from '../src/engine/money-ledger.js';
import {financialAction,annualMoney,annualBusiness,businessStartPatch,copyEconomy,netAssets} from '../src/engine/money.js';
import {annualWork,settleDisposableIncome} from '../src/engine/work.js';
import {incomeAgeGroup,incomePercentile} from '../src/ui/income-rank.js';
const banned=['系数','按完整十二个月','恢复了在岗工作','重新开始领取工资','收支平常','年景周期','求职空档','在岗月份'];
function adult(){return copyEconomy({...createBirth('鄂-2026-002735'),age:35,assets:1000000,job:'企业职员',income:100000,city:'县城',skills:{craft:30},capture:true});}
const sum=s=>moneyChangeRows(s).reduce((n,row)=>n+row.amount,0);
const close=(a,b)=>assert.ok(Math.abs(a-b)<.011,`${a} != ${b}`);
test('business types and results each have six concrete original scenes, never adjacent repeats',()=>{
 for(const [type,outcomes] of Object.entries(BUSINESS_SCENES))for(const [outcome,texts] of Object.entries(outcomes)){
  assert.equal(texts.length,6);assert.equal(new Set(texts).size,6);
  let s=adult(),previous;const rng=s.rngState;
  for(let age=35;age<49;age++){s={...s,age};const scene=businessScene(s,type,outcome);assert.notEqual(scene.text,previous);assert.ok(scene.sceneId);assert.ok(!banned.some(word=>scene.text.includes(word)));previous=scene.text;}
  assert.equal(s.rngState,rng);
  if(type==='factory')assert.ok(texts.every(t=>!t.includes('货架')&&!t.includes('店门')));
  if(type==='training')assert.ok(texts.every(t=>!t.includes('车间')&&!t.includes('发货')));
 }
 for(const [industry,directions]of Object.entries(INDUSTRY_SCENES))for(const [direction,texts]of Object.entries(directions)){assert.equal(texts.length,6);let s={...adult(),industry},last;for(let i=0;i<13;i++){s.age++;const result=workScene(s,`industry-${direction}`);assert.notEqual(result.text,last);last=result.text;}if(industry==='agriculture')assert.ok(texts.every(t=>!t.includes('部门')&&!t.includes('车间')));if(industry==='manufacturing')assert.ok(texts.every(t=>!t.includes('店里')&&!t.includes('柜台')));}
 for(const [group,directions]of Object.entries(PROFESSION_SCENES))for(const texts of Object.values(directions)){assert.equal(texts.length,6);if(group==='office')assert.ok(texts.every(t=>!t.includes('顾客')&&!t.includes('店里')&&!t.includes('客人')));if(group==='driver')assert.ok(texts.every(t=>!t.includes('包裹')&&!t.includes('车间')));}
 for(const [kind,texts] of Object.entries(WORK_SCENES)){assert.ok(texts.length>=6);let s=adult(),last;for(let i=0;i<13;i++){s.age++;const result=workScene(s,kind,{city:'县城'});assert.notEqual(result.text,last);last=result.text;}}
});
test('scene history copies state without touching random streams and survives JSON save/load',()=>{
 let s=adult();const original=JSON.parse(JSON.stringify(s));businessScene(s,'shop','flat');assert.equal(s.rngState,original.rngState);assert.equal(s.economyRngState,original.economyRngState);
 const memory=structuredClone(s.incomeSceneMemory);const next={...s,age:s.age+1};const first=businessScene(next,'shop','flat');assert.deepEqual(s.incomeSceneMemory,memory);
 const reloaded=JSON.parse(JSON.stringify(s));reloaded.age++;assert.deepEqual(businessScene(reloaded,'shop','flat'),first);
});
test('deposit, borrowing, loan principal repayment and buying property are transfers, not net income',()=>{
 let s=adult();beginMoneyYear(s);const initial=netAssets(s);
 s=financialAction(s,{action:'deposit',amount:20000});assert.equal(netAssets(s),initial);close(sum(s),0);
 s=financialAction(s,{action:'online-loan',amount:10000});assert.equal(netAssets(s),initial);close(sum(s),0);assert.equal(s.moneyYear.transfers['借款本金'],10000);
 s=financialAction(s,{action:'debt-repay',amount:4000});assert.equal(netAssets(s),initial);close(sum(s),0);assert.equal(s.moneyYear.transfers['归还其他借款本金'],4000);
 s=financialAction(s,{action:'house:县城:small'});assert.equal(netAssets(s),initial);close(sum(s),0);
 s=financialAction(s,{action:'mortgage-prepay',amount:10000});assert.equal(netAssets(s),initial);close(sum(s),0);
});
test('annual debt and mortgage interest reconcile including unpaid interest; principal is separate',()=>{
 let s=adult();s=financialAction(s,{action:'house:县城:small'});s=financialAction(s,{action:'online-loan',amount:10000});s.age++;beginMoneyYear(s);const start=netAssets(s);annualMoney(s,()=>{});finishMoneyYear(s);
 close(s.moneyYear.change,netAssets(s)-start);close(sum(s),s.moneyYear.change);
 assert.ok(s.moneyYear.flows.mortgageInterest<0);assert.ok(s.moneyYear.flows.debtInterest<0);assert.ok(s.moneyYear.transfers['归还房贷本金']>0);assert.ok(!s.moneyYear.flows.other);
 s.age++;s.assets=0;beginMoneyYear(s);const previous=netAssets(s);annualMoney(s,()=>{});finishMoneyYear(s);close(sum(s),netAssets(s)-previous);assert.ok(s.moneyYear.flows.mortgageInterest<0);assert.ok(!s.moneyYear.flows.other);
});
test('investments, rent, car depreciation, family support and consumption retain real sources',()=>{
 let s=adult();s=financialAction(s,{action:'deposit',amount:10000});s=financialAction(s,{action:'car'});s=financialAction(s,{action:'parents',amount:3000});assert.equal(s.moneyYear.flows.family,-3000);
 s.age++;beginMoneyYear(s);annualMoney(s,()=>{});finishMoneyYear(s);assert.ok(s.moneyYear.flows.investment>0);assert.ok(s.moneyYear.flows.car<0);assert.ok(!s.moneyYear.flows.other);close(sum(s),s.moneyYear.change);
});
test('business profit and scene selection match capture modes without consuming extra randomness',()=>{
 for(const type of Object.keys(BUSINESS_SCENES)){
  const base=adult();Object.assign(base,businessStartPatch(base,type));
  const a={...base,capture:true},b={...base,capture:false};beginMoneyYear(a);beginMoneyYear(b);const events=[];
  annualBusiness(a,(text,stat,meta)=>events.push({text,...meta}));annualBusiness(b,()=>{});
  assert.equal(a.income,b.income);assert.equal(a.assets,b.assets);assert.equal(a.economyRngState,b.economyRngState);assert.deepEqual(a.incomeSceneMemory,b.incomeSceneMemory);
  assert.ok(events.every(e=>e.sceneId));assert.ok(events.every(e=>!banned.some(word=>e.text.includes(word))));
  if(a.business.lastOutcome==='closed'){finishMoneyYear(a);assert.ok(!a.moneyYear.flows.other);}
 }
});

test('same-age income ranking suppresses small samples and treats equal incomes as a tie',()=>{
 assert.deepEqual([18,24,25,34,35,44,45,54,55,64,65,90].map(incomeAgeGroup),['18-24','18-24','25-34','25-34','35-44','35-44','45-54','45-54','55-64','55-64','65+','65+']);
 const sample={nLives:100,observations:400,quantiles:Array.from({length:201},(_,i)=>i*1000)};
 assert.equal(incomePercentile(100000,sample),50);assert.equal(incomePercentile(-100,sample),0);assert.equal(incomePercentile(1000000,sample),100);
 assert.equal(incomePercentile(100000,{...sample,nLives:29}),null);assert.equal(incomePercentile(0,{...sample,quantiles:Array(201).fill(0)}),50);
});
