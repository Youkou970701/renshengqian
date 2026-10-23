import test from 'node:test';
import assert from 'node:assert/strict';
import {ACHIEVEMENTS} from '../src/content/achievements.js';
import {makeDice} from '../src/engine/dice.js';
const achievement=id=>ACHIEVEMENTS.find(a=>a.id===id);
test('住房成就只认实际购买记录，严格区分30岁前与一线、全款与结清按揭',()=>{
 const early=achievement('house-before30'),full=achievement('house-cash');
 const state=p=>({record:{housePurchases:p},ownsHouse:true,mortgage:0});
 assert.equal(early.test(state([{age:29,city:'一线',principal:700000,fullCash:false}])),true);
 for(const p of [[{age:30,city:'一线'}],[{age:29,city:'省会'}],[]])assert.equal(early.test(state(p)),false);
 assert.equal(full.test(state([{age:40,city:'县城',principal:0,fullCash:true}])),true);
 assert.equal(full.test(state([{age:29,city:'一线',principal:700000,fullCash:false}])),false);
 assert.equal(full.test(state([{age:29,city:'一线',principal:700000,fullCash:true}])),false);
 assert.equal(early.test({ownsHouse:true}),false);assert.equal(full.test({ownsHouse:true,mortgage:0}),false);
 assert.equal(ACHIEVEMENTS.some(a=>['house','million'].includes(a.id)),false);
});
test('身家过千万含房产和经营投资，扣按揭、助学本息与其他借款，边界写死',()=>{
 const rich=achievement('ten-million');
 const s={assets:1000000,money:{accounts:{fund:2000000},property:{value:12000000},mortgage:{balance:4000000},car:{value:300000},debts:[{balance:500000}]},business:{active:true,capital:300000},educationFinance:{loanBalance:1000000,loanInterestArrears:100000}};
 assert.equal(rich.test(s),true); // exactly 10,000,000
 assert.equal(rich.test({...s,assets:999999}),false);
 assert.equal(rich.test({assets:10000000,mortgage:1}),false);
 assert.equal(rich.test({assets:10000000}),true);
});
test('只差1%仅限指定升学考试，不含工作、经营、招录、入伍或班委抽签',()=>{
 const near=achievement('near-one'),state=(id,p=.5,u=.505)=>({log:[{dice:[makeDice({id,p,u})]}]});
 for(const id of ['school-stage','school-general','junior-repeat','exam-bachelor','exam-211','exam-985','repeat-bachelor','repeat-211','repeat-985','master','parttime-master','special','competition'])assert.equal(near.test(state(id)),true,id);
 for(const id of ['civil','teacher-admission','medical-admission','midcareer','promotion','salary-negotiation','business','business-year','student-enlist','student-cadre','adult-graduation','unknown'])assert.equal(near.test(state(id)),false,id);
 assert.equal(near.test(state('master',.5,.499)),false);
 assert.equal(near.test(state('master',.5,.52)),false);
 assert.equal(near.test({log:[{dice:[{id:'master',nearMiss:true,pass:false,gap:.01}]}]}),false);
 assert.equal(near.test({log:[]}),false);
});
