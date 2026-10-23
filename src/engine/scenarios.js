import {scenarioResultFacts} from '../content/scenario-result-facts.js';
import {SCENARIOS} from '../content/scenarios.js';
import {random,hashSeed,weightedIndex} from './rng.js';
import {copyEconomy,financialAction} from './money.js';
import {incomeEvent} from './income-events.js';
import {makeDice} from './dice.js';
import {isProtectedPost} from './employment.js';
export const SCENARIO_RULES={status:'参数',annualChance:.055,maxPerLife:5,cooldownYears:3,oppositeValenceWeight:3};
const code=text=>{let n=0;for(const ch of text)n=Math.imul(n,31)+ch.charCodeAt(0);return n;};
export function scenarioOpportunity(s){
 if(s.storyActive||s.age<8||s.age>85||(s.scenarioHistory?.length??0)>=SCENARIO_RULES.maxPerLife)return null;
 const past=s.scenarioHistory??[],last=past.at(-1);if(last&&s.age-last.startedAt<SCENARIO_RULES.cooldownYears)return null;
 const u=random(hashSeed(s.seed^Math.imul(s.age,0x5687bc91))).value;if(u>=SCENARIO_RULES.annualChance)return null;
 const pool=SCENARIOS.filter(x=>s.age>=x.minAge&&s.age<=x.maxAge&&!(s.skipHeavy&&x.heavy)&&!past.some(p=>p.id===x.id)&&x.trigger(s));if(!pool.length)return null;
 const hasGood=past.some(x=>x.outcome==='good'),hasBad=past.some(x=>x.outcome==='bad');
 const weights=pool.map(x=>(!hasGood&&hasBad&&x.positive||hasGood&&!hasBad&&!x.positive)?SCENARIO_RULES.oppositeValenceWeight:1);
 return pool[weightedIndex(weights,random(hashSeed(s.seed^Math.imul(s.age,0x31f27a95))).value)];
}
function draw(s){const r=random(s.storyRngState??hashSeed(s.seed^0x2a167c39));s.storyRngState=r.seed;return r.value;}
function applyEffects(s,e,emit){
 if(!e)return;
 if(e.sellHouse&&s.ownsHouse){const old=s.log.length;const result=financialAction(s,{action:'house-sell'});for(const event of result.log.slice(old))emit(event.text,event.stat,event);Object.assign(s,result);}
 s.assets=(s.assets??0)+(e.assetsDelta??0);
 for(const [key,delta]of [['health',e.healthDelta],['happy',e.happyDelta]])if(delta)s.attrs[key]=Math.max(0,Math.min(100,s.attrs[key]+delta));
 if(e.creditDelta)s.credit=Math.max(0,Math.min(100,(s.credit??100)+e.creditDelta));
 if(e.reputationDelta)s.reputation=Math.max(-100,Math.min(100,(s.reputation??0)+e.reputationDelta));
 if(e.debtDelta>0)s.money.debts.push({id:`scenario:${s.age}:${s.scenarioHistory.length}`,kind:'scenario',balance:e.debtDelta,rate:.18,yearsLeft:3});
 if(e.disability){s.disability=Math.max(s.disability??0,typeof e.disability==='number'?e.disability:.35);s.record.disability=true;}
 if(e.addiction!=null){s.addiction=e.addiction;if(s.relationship)s.relationship={...s.relationship,drugAbuse:!!e.addiction};}
 if(e.familyEstranged)s.record.familyEstranged=true;
 if(e.criminalRecord){if(!s.record.criminalRecord)emit('刑事判决留下了记录，相关岗位的任职审核会受到影响。',null,{node:'scenario-consequence'});s.record.criminalRecord=true;s.criminalRecord=true;s.preparation=null;if(isProtectedPost(s)||['教师','医护','护士'].includes(s.job)){s.job='待业';s.employmentType='不在岗';s.publicEmployer=false;s.income=0;incomeEvent(s,emit,'criminal-dismissal','刑事判决后的任职后果开始生效，你离开了原岗位。');}}
 if(e.prisonYears){s.incarceratedUntil=Math.max(s.incarceratedUntil??0,s.age+e.prisonYears);s.lastJob=s.job;s.job='待业';s.employmentType='服刑';s.publicEmployer=false;s.employmentSearch=null;s.income=0;incomeEvent(s,emit,'incarceration','服刑期间没有在岗工资，原来的工作与生活安排中断。');}
 if(e.bankrupt){if(s.ownsHouse){const old=s.log.length;const result=financialAction(s,{action:'house-sell'});for(const event of result.log.slice(old))emit(event.text,event.stat,event);Object.assign(s,result);}if(s.assets<0)s.money.debts.push({id:`housing-shortfall:${s.age}`,kind:'housing-shortfall',balance:-s.assets,rate:.08,yearsLeft:3});s.assets=0;s.money.accounts={};s.money.car=null;if(s.business?.active){s.business={...s.business,active:false,closedAt:s.age};s.record.businessClosed=true;}s.record.bankrupt=true;emit('处置剩余资产后，手头积蓄已经耗尽，未结清的借款仍留在账目里。',null,{node:'scenario-consequence'});}
 if(e.endMarriage&&s.married){s.marriageCrisis=true;s.relationship={...s.relationship,closeness:Math.max(0,(s.relationship?.closeness??50)-35)};emit('这段经历使两个人的关系出现了严重裂痕，后续需要面对婚姻的选择。',null,{node:'scenario-consequence'});}
}
export function scenarioPatch(previous,id,index,optionId){
 const def=SCENARIOS.find(x=>x.id===id),option=def.steps[index].options.find(x=>x.id===optionId);
 let s={...copyEconomy(previous),attrs:{...previous.attrs},record:{...previous.record},scenarioHistory:(previous.scenarioHistory??[]).map(x=>({...x,choices:[...x.choices]})),storyActive:previous.storyActive?{...previous.storyActive}:null};
 const queue=[],emit=(text,stat,meta={})=>queue.push({age:s.age,text,stat:stat??null,scenarioId:id,category:def.heavyCategory??def.category,heavy:!!def.heavy,...meta});
 if(index===0){s.scenarioHistory.push({id,category:def.category,heavy:!!def.heavy,positive:def.positive,startedAt:s.age,contentRevision:def.revision??0,choices:[],appliedEffects:[],outcome:null});s.storyActive={id,index:0,startedAt:s.age,risk:0};}
 const history=s.scenarioHistory.at(-1);if(!history||history.id!==id||s.storyActive?.index!==index)throw Error('剧本阶段不匹配');
 history.choices.push({age:s.age,index,choice:optionId});
 // 人生纪录里留下这一幕本身（玩家的选择由卡片系统统一记「你选择了…」，这里不重复）。
 {const stage=def.steps[index],body=typeof stage.body==='function'?stage.body(previous):stage.body;emit(body,null,{node:'scenario-scene',index});}if(s.married&&option.exit!=='avoided'&&['domestic-violence','gambling'].includes(def.heavyCategory)){s.relationship={...s.relationship,...(def.heavyCategory==='domestic-violence'?{domesticViolence:true}:{habitualGambling:true})};}applyEffects(s,option.effects,emit);history.appliedEffects=[...(history.appliedEffects??[]),{...(option.effects??{})}];
 // 分支（v2 剧本重写）：risk 累积到结局概率；exit 提前结束；next 跳到指定一幕；delay 控制下一幕间隔几年；text 是选完以后的叙述。
 if(option.risk)s.storyActive={...s.storyActive,risk:Math.max(-.6,Math.min(.6,(s.storyActive.risk??0)+option.risk))};
 if(option.text)emit(typeof option.text==='function'?option.text(s):option.text,option.stat??null,{node:'scenario-choice'});
 const final=!!(option.exit||option.chance||(option.next==null&&index===def.steps.length-1));
 if(final){
  let outcome=option.exit??option.outcome??'mixed',dice=null;
  if(!option.exit&&option.chance){const u=draw(s),risk=s.storyActive?.risk??0,clamp=x=>Math.max(0,Math.min(.95,x)),base=option.chance,p={good:base.good>0?clamp(base.good-risk):0,bad:clamp((base.bad??0)+risk),rehabilitated:base.rehabilitated??0},order=p.good>0?[['good',p.good],['bad',p.bad??0],['rehabilitated',p.rehabilitated??0]]:[['bad',p.bad??0],['rehabilitated',p.rehabilitated??0],['good',0]];let threshold=0;outcome='mixed';for(const [name,chance]of order){threshold+=chance;if(u<threshold){outcome=name;break;}}
   const positive=p.good>0,probability=positive?p.good:p.bad;dice=makeDice({id:'story-outcome',label:positive?'这段经历有顺利结果的机会':'这段经历出现严重后果的机会',p:probability,u,positive,successLabel:positive?'顺利':'严重后果',failureLabel:positive?'未遇顺利结局':'未出现严重后果'});
  }
  applyEffects(s,def.outcomeEffects?.[outcome],emit);history.outcome=outcome;history.endedAt=s.age;history.appliedEffects.push({...def.outcomeEffects?.[outcome]});const actualEffects=history.appliedEffects;history.consequences=Object.fromEntries(['criminalRecord','disability','bankrupt','familyEstranged'].map(key=>[key,actualEffects.some(e=>!!e[key])]));history.resultFacts=scenarioResultFacts(history,def);s.storyActive=null;
  const tail=option.endText??option.endTexts?.[outcome]??def.endTexts?.[outcome];emit(tail?(typeof tail==='function'?tail(s):tail):`「${def.steps[0].title}」这段经历告一段落。${outcome==='avoided'?'那件事没有发生在你身上。':outcome==='good'?'有人伸出援手，生活多了一些新的可能。':outcome==='bad'?'留下的损失和后果还需要慢慢承担。':outcome==='rehabilitated'?'你停止了原来的危险行为，已经发生的后果仍然保留。':'生活继续，已经作出的选择也留在了这一生里。'}`,null,{node:'scenario-end',outcome,...(dice?{dice:[dice]}:{})});
 }else{const nextIndex=option.next??index+1,wait=option.delay??1;s.storyActive={...s.storyActive,index:nextIndex,dueAge:option.waitForRelease||def.id==='boundary-prison'&&nextIndex===3?Math.max(s.age+wait,s.incarceratedUntil??0):s.age+wait};}
 s.pendingScenarioEvents=[...(s.pendingScenarioEvents??[]),...queue];return s;
}
export const SCENARIO_CARDS=SCENARIOS.flatMap(def=>def.steps.map((stage,index)=>({
 id:`story:${def.id}:${index}`,stage:'adult',category:def.heavyCategory??def.category,heavy:!!def.heavy,scenarioId:def.id,priority:index?80:25,cooldown:100,maxPerLife:1,
 when:(s,context)=>index===0?!s.storyActive&&(context?context.scenario:scenarioOpportunity(s))?.id===def.id:s.storyActive?.id===def.id&&s.storyActive.index===index&&s.age>=s.storyActive.dueAge,
 weight:()=>1,title:stage.title,body:stage.body,options:stage.options.map(o=>({...o,requires:s=>(!o.effects?.sellHouse||!!s.ownsHouse),effects:s=>scenarioPatch(s,def.id,index,o.id)})),
})));
