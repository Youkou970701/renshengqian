import {SCENARIOS} from '../content/scenarios.js';
import {cardById,materializeCard} from './cards.js';
import {hashSeed,random} from './rng.js';
const coreIds=new Set(['school','exam','repeat','upgrade','career','city','marry','house','child','midcareer']);
// Saves from the deployed UI remain playable. Historical decisions stay in their
// original log; only v2 interactions enter the new history used by v2 probes.
function migrateOriginal(life){
 if(!life||life.engineVersion===2)return life;
 const cardUsage={};for(const choice of life.choices??[])if(coreIds.has(choice.decision))cardUsage[choice.decision]={count:1,lastAge:choice.age};
 const pending=life.pending?{...life.pending,id:life.pending.id==='careerPlan'?'career':life.pending.id,core:coreIds.has(life.pending.id)||life.pending.id==='careerPlan'}:null;
 if(pending)cardUsage[pending.id]={count:1,lastAge:life.age};
 const talentDraw=random(hashSeed(life.seed^0x12acf873)).value;
 return {...life,engineVersion:2,cardRngState:hashSeed(life.seed^0x5bd1e995),cardUsage,cardHistory:[],cardSeeds:[],cardYear:life.age,cardsOfferedThisYear:pending?1:0,contextTried:false,skills:{},educationFinance:{},preparation:null,pending,talent:talentDraw<.12?['音乐','美术','体育','数学','口才','手巧'][Math.floor(talentDraw/.02)]:null,eliteFamily:life.wealthQ===5&&random(hashSeed(life.seed^0x731ab28f)).value<.01,record:{...life.record,schoolSettled:life.age>15||Boolean(life.choices?.some(c=>c.decision==='school')),publicGeneral:life.record.general,publicGeneralEver:life.record.general},schoolRoute:life.record.general?'public':life.age>16?'work':undefined};
}


// Content revisions never replay an old choice with a newly assigned meaning.
// Preserve paid costs and the original log; discontinue only an obsolete active
// branch. An unchosen opening can safely show the current opening instead.
export function migrateLife(life){
 const s=migrateOriginal(life);if(!s)return s;
 const active=s.storyActive,h=active&&(s.scenarioHistory??[]).findLast(h=>h.id===active.id&&!h.outcome);
 const def=active&&SCENARIOS.find(d=>d.id===active.id);
 if(def?.revision&&h&&h.contentRevision!==def.revision){
  return {...s,storyActive:null,pending:s.pending?.id.startsWith(`story:${active.id}:`)?null:s.pending,pendingScenarioEvents:[],scenarioHistory:s.scenarioHistory.map(x=>x===h?{...x,outcome:'skipped',endedAt:s.age}:x),log:[...s.log,{age:s.age,node:'story-update',text:'旧故事的后续已更新。此前的选择和已经发生的损失保留，生活从这一年继续。',stat:null}]};
 }
 if(!active&&s.pending?.id.startsWith('story:')){
  const [,id,index]=s.pending.id.split(':'),definition=SCENARIOS.find(d=>d.id===id);
  if(Number(index)===0&&definition?.revision){
   const eligible=s.age>=definition.minAge&&s.age<=definition.maxAge&&definition.trigger(s);
   const pending=eligible?materializeCard(cardById(s.pending.id),s):null;
   return {...s,pending};
  }
 }
 return s;
}
