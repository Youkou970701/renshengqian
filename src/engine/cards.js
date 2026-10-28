import {CARDS,CARD_BY_ID} from '../content/cards/index.js';
import {random,hashSeed,weightedIndex} from './rng.js';
import {ensureHighSchoolLocation} from './school-location.js';
import {scenarioOpportunity} from './scenarios.js';
export const cardById=id=>CARD_BY_ID[id];
const ordinaryCards=CARDS.filter(c=>!c.scenarioId&&c.category!=='people');
export function availableCards(s){const context={scenario:scenarioOpportunity(s)},storyId=s.storyActive?`story:${s.storyActive.id}:${s.storyActive.index}`:context.scenario?`story:${context.scenario.id}:0`:null,pool=storyId?[...ordinaryCards,CARD_BY_ID[storyId]]:ordinaryCards;return pool.filter(c=>!(s.militaryService?.active&&['college','high'].includes(c.stage))&&!((s.skipHeavy??false)&&c.heavy)&&c.when(s,context)&&(s.cardUsage?.[c.id]?.count??0)<(c.maxPerLife??2)&&s.age-(s.cardUsage?.[c.id]?.lastAge??-999)>=(c.cooldown??5));}
export function withoutHeavyPending(previous){
 if(!previous.skipHeavy)return previous;
 const active=previous.storyActive,activeHeavy=active&&CARD_BY_ID[`story:${active.id}:${active.index}`]?.heavy;
 if(!previous.pending?.heavy&&!activeHeavy)return previous;
 return {...previous,pending:previous.pending?.heavy?null:previous.pending,storyActive:activeHeavy?null:active,scenarioHistory:activeHeavy?(previous.scenarioHistory??[]).map(h=>h.id===active.id&&!h.outcome?{...h,outcome:'skipped',endedAt:previous.age}:h):previous.scenarioHistory};
}
// 变体（2026-10-23，用户：「每人的选择都是一样的？我想要都不一样」）：按处境确定性地挑第一个匹配的版本，
// 只换标题、情境和选项文字，选项编号与后果不变，所以不消耗随机数、不影响统计机制。
export function cardVariant(c,s){return c.variants?.find(v=>v.when(s))??null;}
export function materializeCard(c,s){
 const options=c.options,variant=cardVariant(c,s),text=(x,fallback)=>x==null?fallback:typeof x==='function'?x(s):x;
 return {id:c.id,variant:variant?.key??null,core:!!c.core,category:c.category??null,title:text(variant?.title,c.title),body:text(variant?.body,typeof c.body==='function'?c.body(s):c.body??''),heavy:!!c.heavy,profile:c.profile?c.profile(s):null,stat:c.stat??null,options:options.map(o=>{
  const routeAllowed=c.id!=='school-alternatives'||(o.id==='private'?s.wealthQ>=3:o.id==='international'?s.hukou==='urban'&&s.wealthQ===5:o.id==='talent'?Boolean(s.talent||s.interest||(s.skills?.craft??0)>=8):true);
  const price=typeof o.cost==='function'?o.cost(s):o.cost??0;const enabled=routeAllowed&&(!o.requires||o.requires(s))&&(price<=0||s.age<18||s.assets>=price);
  const relabel=variant?.labels?.[o.id];
  return {id:o.id,label:relabel?.[0]??o.label,effect:relabel?.[1]??o.hint??o.effect??'',cost:typeof o.cost==='number'?o.cost:undefined,disabled:!enabled};
 })};
}
// An independent, persisted stream keeps content selection from coupling the
// demographic draws to the number of text cards. Both streams use the same PRNG.
export function drawCards(previous,{limit=2}={}){
 if(!previous.alive||previous.pending)return previous;
 const s={...previous,cardUsage:{...(previous.cardUsage??{})},cardSeeds:[...(previous.cardSeeds??[])],cardRngState:previous.cardRngState??hashSeed(previous.seed^0x5bd1e995)};
 ensureHighSchoolLocation(s);
 if(s.cardYear!==s.age){s.cardYear=s.age;s.cardsOfferedThisYear=0;s.contextTried=false;}
 if(s.cardsOfferedThisYear>=Math.min(2,limit))return s;
 const draw=()=>{const r=random(s.cardRngState);s.cardRngState=r.seed;return r.value;};
 const available=availableCards(s),due=s.cardSeeds.filter(seed=>seed.atAge<=s.age&&available.some(c=>c.id===seed.cardId));
 let c;
 if(due.length){const seed=due[0];c=available.find(c=>c.id===seed.cardId);s.cardSeeds=s.cardSeeds.filter(x=>x!==seed);}
 if(!c)c=available.filter(c=>(c.priority??0)>0).sort((a,b)=>(b.priority??0)-(a.priority??0)||a.id.localeCompare(b.id))[0];
 if(!c&&!s.contextTried){s.contextTried=true;if(s.age>=2&&draw()<(s.age>=28?.18:.32)){const pool=available.filter(c=>!c.core),weights=pool.map(c=>Math.max(0,c.weight(s)));if(weights.some(Boolean))c=pool[weightedIndex(weights,draw())];}}
 if(!c)return s;
 const old=s.cardUsage[c.id];s.cardUsage[c.id]={count:(old?.count??0)+1,lastAge:s.age};s.cardsOfferedThisYear++;s.pending=materializeCard(c,s);
 if(c.id==='school-alternatives')s.schoolAlternativeOffered=true;
 return s;
}
export function resolveCard(previous,choice){
 const c=cardById(previous.pending?.id),option=c?.options.find(o=>o.id===choice);
 if(!c||!option)throw new Error('未知卡片选项');
 const displayed=previous.pending.options.find(o=>o.id===choice);if(!displayed||displayed.disabled)throw new Error('当前无法选择这个选项');
 let s={...previous,attrs:{...previous.attrs},skills:{...(previous.skills??{})},educationFinance:{...(previous.educationFinance??{})},record:{...previous.record},cardSeeds:[...(previous.cardSeeds??[])]};
 const cost=typeof option.cost==='function'?option.cost(s):option.cost??0;
 if(cost>0&&s.age>=18&&s.assets<cost)throw new Error('积蓄不足');
 if(s.age>=18)s.assets-=cost;
 const patch=option.effects?.(s)??{};s={...s,...patch,attrs:{...s.attrs,...patch.attrs},skills:{...s.skills,...patch.skills},educationFinance:{...s.educationFinance,...patch.educationFinance},record:{...s.record,...patch.record}};
 for(const seed of option.seeds??[]){let r=random(s.cardRngState);s.cardRngState=r.seed;if(r.value>=(seed.chance??1))continue;r=random(s.cardRngState);s.cardRngState=r.seed;const [min,max]=seed.inYears;s.cardSeeds.push({cardId:seed.cardId,atAge:s.age+min+Math.floor(r.value*(max-min+1))});}
 return s;
}
