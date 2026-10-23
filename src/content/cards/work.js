import {isPublic} from '../../engine/career.js';
import {isProtectedPost} from '../../engine/employment.js';
import {random,hashSeed} from '../../engine/rng.js';
import {businessStartPatch,copyEconomy,buyHouse,houseQuote} from '../../engine/money.js';
const working=s=>s.age>=24&&s.age<=55&&s.occupation&&!s.retired&&s.job!=='待业'&&s.job!=='研究生在读'&&s.job!=='军人';
export const BUSINESS_AUTO_RULES={status:'参数',annualOpportunity:.009,layoffBonus:.02,craftBonus:.004,hometownBonus:.004,experienceBonus:.003};
export function businessOpportunity(s){
 if(s.age<28||s.age>52||s.retired||isProtectedPost(s)||s.militaryService?.active||s.job==='研究生在读'||s.job==='务农'||s.business?.active||s.record.businessStarted||s.assets<26000)return false;
 const r=BUSINESS_AUTO_RULES,p=r.annualOpportunity+(s.job==='待业'?r.layoffBonus:0)+((s.skills?.craft??0)>=8?r.craftBonus:0)+(s.city==='老家'?r.hometownBonus:0)+(s.age>=35?r.experienceBonus:0);
 return random(hashSeed(s.seed^Math.imul(s.age,0x1f123bb5))).value<p;
}
function purchasePatch(s,size,fullCash=false){const p=copyEconomy(s);if(!buyHouse(p,()=>{},s.city,size,{fullCash}))throw new Error('购房条件不足');return {money:p.money,record:p.record,assets:p.assets,ownsHouse:p.ownsHouse,mortgage:p.mortgage};}
export const WORK_CARDS=[
 {id:'early-house',stage:'adult',priority:35,when:s=>!s.ownsHouse&&(s.age===28||s.age>=36&&s.age<=55&&random(hashSeed(s.seed^Math.imul(s.age,0x3b7ac619))).value<.12)&&houseQuote(s,s.city,'small').enabled,weight:()=>1,cooldown:8,maxPerLife:2,title:'积蓄够付一套房的首付了',body:s=>`你算了算，${s.city}小房总价约${houseQuote(s,s.city,'small').price}元。买房会占用积蓄，租房则保留手头现金。`,options:[
  {id:'full',label:'全款买一套小房',hint:'一次付清房款，不新增房贷',requires:s=>houseQuote(s,s.city,'small',{fullCash:true}).enabled,effects:s=>purchasePatch(s,'small',true)},
  {id:'normal',label:'按揭买普通房',hint:'付首付，逐年偿还房贷',requires:s=>houseQuote(s).enabled,effects:s=>purchasePatch(s,'normal')},
  {id:'small',label:'按揭买一套小房',hint:'付首付，逐年偿还房贷',requires:s=>houseQuote(s,s.city,'small').enabled,effects:s=>purchasePatch(s,'small')},
  {id:'rent',label:'暂时继续租房',hint:'保留积蓄，晚些再考虑',effects:()=>({})},
 ]},
 {id:'business-start',stage:'adult',priority:40,when:businessOpportunity,weight:()=>1,cooldown:40,maxPerLife:1,title:'要不要自己做一份小生意？',body:s=>`${s.job==='待业'?'找工作的空档里':s.city==='老家'?'回到熟悉的地方后':'积累了一些经验后'}，你开始考虑自己接单或开店。开业需要真金白银，也可能亏损、关门。`,options:[
  {id:'shop',label:'开一家社区小店',hint:'投入40000元，往后逐年结算经营年景',cost:40000,effects:s=>businessStartPatch(s,'shop')},
  {id:'online',label:'先经营一家网店',hint:'投入20000元，从小规模经营开始',cost:20000,effects:s=>businessStartPatch(s,'online')},
  {id:'factory',label:'组织一个小厂',hint:'投入120000元，需要承担更高开支',cost:120000,requires:s=>(s.skills?.craft??0)>=12,effects:s=>businessStartPatch(s,'factory')},
  {id:'training',label:'开一个补习班',hint:'投入30000元，需要已有教学经验',cost:30000,requires:s=>(s.skills?.craft??0)>=6,effects:s=>businessStartPatch(s,'training')},
  {id:'decline',label:'继续找工作或留在岗位',hint:'这次不投入经营',effects:()=>({})},
 ]},
 {id:'work-promotion-preparation',stage:'adult',when:working,weight:()=>3,cooldown:8,maxPerLife:1,title:'下一轮晋升名单还没有定',body:()=> '主管问你是否愿意多承担一个项目。争取机会会多占一些时间，原来的生活也需要安排。',options:[
  {id:'campaign',label:'承担项目，争取晋升',hint:'多投入三年，工作之外的时间少一些',effects:s=>({promotionBoostUntil:s.age+3,skills:{craft:(s.skills?.craft??0)+4},attrs:{happy:s.attrs.happy-2}})},
  {id:'learn',label:'先考证补齐经验',hint:'支出2500元，提升技术经验',cost:2500,effects:s=>({skills:{craft:(s.skills?.craft??0)+6}})},
  {id:'steady',label:'先把生活稳定下来',hint:'保持工作，给身体和家人留时间',effects:s=>({attrs:{health:Math.min(100,s.attrs.health+2),happy:Math.min(100,s.attrs.happy+3)}})},
 ]},
 {id:'work-salary-talk',stage:'adult',when:s=>working(s)&&!isPublic(s),weight:()=>2,cooldown:10,maxPerLife:1,title:'年度调薪前的一次谈话',body:()=> '你整理了自己做过的项目和承担的职责。可以提出要求，也可以先换一种安排；下一轮是否调薪仍需等待结果。',options:[
  {id:'ask',label:'带着成果争取调薪',hint:'下一年结算谈话结果，不保证成功',effects:s=>({salaryNegotiation:s.age})},
  {id:'skill',label:'先学一门新的技能',hint:'增加经验，不立刻改变工资',effects:s=>({skills:{craft:(s.skills?.craft??0)+4}})},
  {id:'rest',label:'暂时保持现状',hint:'把这段时间留给休息',effects:s=>({attrs:{happy:Math.min(100,s.attrs.happy+3)}})},
 ]},
 {id:'business-customer-change',stage:'adult',when:s=>s.business?.active&&s.age>=23&&s.age<=59,weight:()=>4,cooldown:8,maxPerLife:2,title:'熟客问，能不能换一种服务',body:s=> `${s.business?.name??'店里'}的老顾客提了一个建议。调整服务需要先花钱，也可能带来新的客人。`,options:[
  {id:'adapt',label:'投入改进服务',hint:'支出5000元，增加经营能力，也继续承担年景风险',cost:5000,effects:s=>({business:{...s.business,scale:s.business.scale+.2,capital:s.business.capital+5000}})},
  {id:'keep',label:'先守住熟悉的生意',hint:'不增加投入，保持规模',effects:s=>({skills:{financial:(s.skills?.financial??0)+2}})},
 ]},
];
