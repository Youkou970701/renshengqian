import test from 'node:test';
import assert from 'node:assert/strict';
import {beginHappiness,finishHappiness,debtBalance,debtBreakdown,happinessSituation} from '../src/engine/happiness.js';
import {createBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
const adult=patch=>({age:50,job:'企业职员',industry:'service',income:60000,assets:10000,attrs:{happy:100,health:80},people:{members:{friend:{closeness:65,alive:true}}},...patch});
const settle=s=>finishHappiness(beginHappiness(s));
test('happiness responds independently to income, health, closeness, unemployment and all debt kinds',()=>{
 const s=adult(),base=settle(s),value=base.attrs.happy;
 assert.ok(settle(adult({income:180000})).attrs.happy>value);
 assert.ok(settle(adult({attrs:{happy:100,health:40}})).attrs.happy<value);
 assert.ok(settle(adult({people:{members:{friend:{closeness:20,alive:true}}}})).attrs.happy<value);
 const jobless=settle(adult({job:'待业',industry:'unemployed',income:0}));
 assert.ok(value-jobless.attrs.happy>=10);assert.ok(jobless.attrs.happy>0&&jobless.attrs.happy<70);
 for(const patch of [{money:{debts:[{balance:10000}]}},{assets:-10000}]){
  const stressed=settle(adult(patch));assert.ok(value-stressed.attrs.happy>=10,JSON.stringify(patch));
 }
 assert.equal(debtBalance(adult({assets:-1000,money:{accounts:{savings:2000}}})),1000);
});
test('13a mortgage pressure follows payment burden, and default is heavy rather than double-counted',()=>{
 const loan=(monthly,patch={})=>adult({money:{mortgage:{balance:200000,monthly,monthsLeft:240,...patch}}});
 assert.equal(settle(loan(500)).happiness.factors.mortgage,-1);
 assert.equal(settle(loan(1500)).happiness.factors.mortgage,-3);
 assert.ok(Math.abs(settle(loan(2000)).happiness.factors.mortgage+7.5)<1e-9);
 assert.equal(settle(loan(2500)).happiness.factors.mortgage,-10);
 assert.ok(Math.abs(settle(loan(3000)).happiness.factors.mortgage+13.2)<1e-9);
 assert.equal(settle(loan(6000)).happiness.factors.mortgage,-18);
 const missed=loan(1000,{lastPayment:6000});missed.money.lastAge=50;
 for(const s of [missed,loan(1000,{monthsLeft:0}),{...loan(1000),income:0}]){
  const d=debtBreakdown(s),h=settle(s).happiness;
  assert.ok(d.mortgageDefault);assert.equal(d.badDebt,200000);assert.equal(d.total,200000);
  assert.equal(h.factors.mortgage,0);assert.ok(h.factors.badDebt<=-20);
 }
 assert.equal(debtBreakdown(loan(1000)).mortgageDefault,false,'new loan without a payment record is not defaulted');
 assert.ok(settle(adult({mortgage:10000})).happiness.factors.mortgage>=-3,'legacy scalar gets a plausible payment');
});
test('13a student principal is light, arrears cost eight, and risky debt stays heavy in mixed loans',()=>{
 const light=settle(adult({educationFinance:{loanBalance:10000}})).happiness.factors;
 assert.ok(light.studentLoan<=-2&&light.studentLoan>=-5);assert.equal(light.badDebt,0);
 assert.equal(settle(adult({educationFinance:{loanBalance:10000,loanInterestArrears:1}})).happiness.factors.studentLoan,-8);
 for(const kind of ['online','gambling','scenario','business']){
  const s=adult({money:{mortgage:{balance:200000,monthly:1000,monthsLeft:240},debts:[{kind,balance:10000}]},educationFinance:{loanBalance:10000}}),before=structuredClone(s);
  const h=settle(s).happiness;assert.equal(h.factors.mortgage,-2);assert.ok(h.factors.studentLoan>=-5);assert.ok(h.factors.badDebt<=-20);assert.deepEqual(s,before);
 }
 const old={...adult(),attrs:{happy:55.5,health:80},money:{mortgage:{balance:200000,monthly:1000,monthsLeft:240}},happiness:{version:1,baseMood:100,value:55.5,factors:{debt:-28}}};
 const restored=settle(old);assert.equal(restored.happiness.baseMood,100);assert.ok(restored.attrs.happy>80);assert.deepEqual(settle(restored),restored);
});
test('same hardship does not accumulate annually; reemployment and clearing debt recover promptly',()=>{
 let s=settle(adult({job:'待业',industry:'unemployed',income:0,mortgage:10000}));const value=s.attrs.happy;
 for(let i=0;i<10;i++){s=settle({...s,age:s.age+1});assert.equal(s.attrs.happy,value);}
 const restored=settle({...s,job:'企业职员',industry:'service',income:60000,mortgage:0});
 assert.equal(restored.attrs.happy,settle(adult()).attrs.happy);
 assert.deepEqual(finishHappiness(restored),restored);
});
test('choices retain mood effects without repeated circumstances, and saved states continue exactly',()=>{
 const s=settle(adult({attrs:{happy:65,health:80}}));
 const pending=beginHappiness(s);const changed=finishHappiness({...pending,attrs:{...pending.attrs,happy:pending.attrs.happy+5}});
 assert.ok(changed.attrs.happy>s.attrs.happy);assert.equal(changed.happiness.baseMood,70);
 const loaded=JSON.parse(JSON.stringify(changed));assert.deepEqual(settle(loaded),settle(changed));
 const frozen=Object.freeze({...s,attrs:Object.freeze(s.attrs),happiness:Object.freeze(s.happiness)});
 assert.deepEqual(settle(frozen),s);assert.equal(s.attrs.happy,settle(adult({attrs:{happy:65,health:80}})).attrs.happy);
});
test('children, students and retirees are not mislabeled unemployed; debt still affects adults',()=>{
 const child={...adult(),age:17};assert.equal(beginHappiness(child),child);assert.equal(finishHappiness(child),child);
 for(const s of [adult({age:19,job:'尚未就业',income:0}),adult({age:25,job:'研究生在读',income:0}),adult({job:'退休',retired:true,income:18000})])assert.equal(happinessSituation(s).unemployed,false);
 const first=settle(adult({attrs:{happy:100,health:80}}));assert.equal(first.happiness.baseMood,100);
 assert.ok(first.attrs.happy<100);assert.equal(happinessSituation(adult({age:25,job:'尚未就业',income:0})).unemployed,true);
});
test('real engine financial actions reflect borrowing and complete repayment in the same year',()=>{
 let s=settle({...createBirth('陕-2026-405095'),age:50,job:'企业职员',income:60000,assets:100000});
 const before=JSON.parse(JSON.stringify(s)),happy=s.attrs.happy;
 const borrowed=step(s,{action:'online-loan',amount:10000}).state;
 assert.deepEqual(s,before);assert.equal(borrowed.age,s.age);assert.ok(happy-borrowed.attrs.happy>=10);
 assert.equal(borrowed.history.at(-1).age,50);assert.equal(borrowed.history.at(-1).happy,borrowed.attrs.happy);
 const repaid=step(borrowed,{action:'debt-repay',amount:10000}).state;
 assert.equal(repaid.attrs.happy,happy);assert.equal(repaid.happiness.baseMood,s.happiness.baseMood);
 assert.equal(repaid.history.length,borrowed.history.length);assert.equal(repaid.history.at(-1).happy,happy);
 assert.equal(debtBalance(repaid),0);
 const quiet=step({...s,capture:false},{action:'online-loan',amount:10000}).state;
 assert.equal(quiet.attrs.happy,borrowed.attrs.happy);assert.deepEqual(quiet.log,s.log);
});
