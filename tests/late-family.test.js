import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {financialAction,copyEconomy} from '../src/engine/money.js';
import {LATE_FAMILY_CARDS,LATE_FAMILY_RULES,inheritanceAmount} from '../src/content/cards/late-family.js';
const byId=id=>LATE_FAMILY_CARDS.find(c=>c.id===id);
const state=(patch={})=>copyEconomy({...drawBirth(42),age:45,assets:300000,city:'省会',job:'企业职员',employmentType:'非编制',married:true,...patch});
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
function choose(s,id,choice){const card=byId(id),option=card.options.find(o=>o.id===choice);assert.ok(card.when(s),id);assert.ok(!option.requires||option.requires(s),`${id}/${choice}`);const cost=typeof option.cost==='function'?option.cost(s):option.cost??0;assert.ok(s.assets>=cost);const paid={...s,assets:s.assets-cost};return {...paid,...option.effects(paid)};}

test('后半生16张卡有精确资格、实际选项、限次和冷却，大病可被沉重过滤',()=>{
 assert.equal(LATE_FAMILY_CARDS.length,16);assert.equal(new Set(LATE_FAMILY_CARDS.map(c=>c.id)).size,16);
 for(const c of LATE_FAMILY_CARDS){assert.equal(typeof c.when,'function');assert.equal(typeof c.weight,'function');assert.ok(c.options.length>=2);assert.ok(c.maxPerLife<=2);assert.ok(c.cooldown>=5);for(const o of c.options)assert.equal(typeof o.effects,'function');assert.doesNotThrow(()=>typeof c.body==='function'?c.body(drawBirth(42)):c.body);}
 const illness=byId('parent-serious-illness');assert.equal(illness.heavy,true);assert.equal(illness.category,'serious-illness');
 let offered=0;for(let seed=0;seed<100;seed++)offered+=illness.when(state({age:44,seed}));assert.ok(offered>0&&offered<100,'大病不能每局必发');
});

test('育儿教育选项拷贝孩子、扣真实费用，学习投入留给下一代接口',()=>{
 const s=freeze(state({age:45,kids:[{bornAt:30,gradeSupport:1,educationInvestment:2000},{bornAt:35}]})),original=JSON.stringify(s);
 const out=choose(s,'child-junior-exam','invest');assert.equal(out.assets,s.assets-12000);assert.equal(out.kids[0].educationInvestment,14000);assert.equal(out.kids[0].gradeSupport,6);assert.notEqual(out.kids[0],s.kids[0]);assert.notEqual(out.kids[1],s.kids[1]);assert.equal(JSON.stringify(s),original);
 const later=choose(state({age:48,kids:out.kids}),'child-college-exam','invest');assert.equal(later.kids[0].educationInvestment,34000);assert.equal(later.kids[0].gradeSupport,10);
 const baby=choose(state({age:31,kids:[{bornAt:30}]}),'family-child-care','hometown');assert.equal(baby.kids[0].careBy,'left-behind');assert.equal(baby.kids[0].leftBehind,true);
});

test('第二胎不为未成年或无孩子的人创造首次生育，不改变已有首胎',()=>{
 const c=byId('family-second-child');for(const age of [12,17,18,29,41])assert.equal(c.when(state({age,kids:[{bornAt:10}]})),false);
 assert.equal(c.when(state({age:35,kids:[]})),false);assert.equal(c.when(state({age:35,married:false,kids:[{bornAt:30}]})),false);assert.equal(c.when(state({age:35,kids:[{bornAt:34}]})),false);
 const s=freeze(state({age:35,kids:[{bornAt:30,educationInvestment:2000}]})),result=choose(s,c.id,'child');assert.equal(result.kids.length,2);assert.deepEqual(result.kids[0],s.kids[0]);assert.equal(result.kids[1].bornAt,35);assert.equal(result.assets,s.assets-8000);assert.equal(c.when(result),false);
});

test('大病卖房先结清真实房贷再付医疗费，无房者不能选择',()=>{
 const card=byId('parent-serious-illness'),sell=card.options.find(o=>o.id==='sell');assert.equal(sell.requires(state({ownsHouse:false})),false);
 let s=state({age:44,assets:1000,ownsHouse:true,mortgage:100000,money:{property:{city:'省会',size:'small',value:400000},mortgage:{balance:100000,monthly:1000,monthsLeft:100,rate:.035},accounts:{},debts:[],relatives:[],parentSpending:{},actionUsage:{}}});
 while(!card.when(s))s={...s,seed:s.seed+1};
 const snapshot=JSON.stringify(s),sold=financialAction(s,{action:'house-sell'}),out=choose(freeze(s),card.id,'sell');assert.equal(out.assets,sold.assets-60000);assert.equal(out.ownsHouse,false);assert.equal(out.money.property,null);assert.equal(out.money.mortgage,null);assert.equal(out.record.parentMedicalPaid,60000);assert.equal(JSON.stringify(s),snapshot);
});

test('遗产仅已故未领取父母可领，份额有家境上限且兄弟姐妹分摊',()=>{
 const s=state({age:50,wealthQ:2,siblings:2,parents:{father:{alive:false,age:80},mother:{alive:true,age:77}}});assert.equal(inheritanceAmount(s),Math.floor(10000/3));
 const out=choose(freeze(s),'parent-inheritance','accept');assert.equal(out.assets-s.assets,Math.floor(10000/3));assert.ok(out.record.inheritanceReceived<=LATE_FAMILY_RULES.inheritanceByWealth[1]);assert.equal(byId('parent-inheritance').when(out),false);assert.equal(byId('parent-inheritance').when(state()),false);
});

test('50岁再就业创建真实求职等待，回乡变地点且编制不自动转岗',()=>{
 const s=freeze(state({age:50,job:'待业',employmentType:'待业',income:0})),out=choose(s,'fifty-reemployment','security');assert.equal(out.job,'待业');assert.equal(out.income,0);assert.equal(out.employmentSearch.jobId,'security');assert.ok(out.employmentSearch.monthsLeft>=3);
 const home=choose(state({age:46}),'return-hometown','home');assert.equal(home.city,'老家');assert.equal(home.assets,297000);assert.equal(byId('return-hometown').when(state({age:46,job:'教师',employmentType:'编制'})),false);
});

test('照护和老年节点实际记录分工，孩子首付支持不凭空增加子代现金',()=>{
 const s=state({age:58,kids:[{bornAt:30}]}),out=choose(s,'child-down-payment','help');assert.equal(out.assets,s.assets-50000);assert.equal(out.kids[0].housingSupport,50000);
 const old=choose(state({age:72,kids:[{bornAt:30}]}),'elder-residence','facility');assert.equal(old.assets,282000);assert.equal(old.record.elderResidence,'care-facility');assert.equal(choose(state({age:76}),'family-will','document').record.will,'documented');
});
