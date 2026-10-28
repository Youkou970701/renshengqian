import {PEOPLE_CARDS,PEOPLE_FOLLOWUPS} from '../content/cards/people.js';
import {hashSeed,random} from './rng.js';
import {materializeCard} from './cards.js';
const salt=text=>{let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
export const peopleDraw=(s,purpose)=>random(hashSeed(s.seed^salt(purpose))).value;
export const PEOPLE_WINDOWS=[[7,24],[28,59],[60,85]];
export function offerPeopleCard(previous){
 if(!previous.alive||previous.pending||(previous.cardsOfferedThisYear??0)>0)return previous;
 const slotIndex=PEOPLE_WINDOWS.findIndex(([min,max])=>previous.age>=min&&previous.age<=max);
 if(slotIndex<0||slotIndex===Math.floor(peopleDraw(previous,'skip-span')*3))return previous;
 const [min,max]=PEOPLE_WINDOWS[slotIndex],start=min+Math.floor(peopleDraw(previous,`start:${slotIndex}`)*(max-min-1));
 if(previous.age<start||(previous.cardHistory??[]).some(h=>h.id.startsWith('people-')&&h.age>=PEOPLE_WINDOWS[slotIndex][0]&&h.age<=PEOPLE_WINDOWS[slotIndex][1]))return previous;
 const pool=PEOPLE_CARDS.filter(c=>c.when(previous)&&!(previous.cardUsage?.[c.id]?.count));
 if(!pool.length)return previous;
 const c=pool[Math.floor(peopleDraw(previous,`card:${slotIndex}:${previous.age}`)*pool.length)];
 return {...previous,cardUsage:{...previous.cardUsage,[c.id]:{count:1,lastAge:previous.age}},cardsOfferedThisYear:1,pending:materializeCard(c,previous)};
}
export function peopleAutoChoice(s){
 const options=s.pending?.options.filter(o=>!o.disabled)??[];
 return options[Math.floor(peopleDraw(s,`choice:${s.pending?.id}:${s.age}`)*options.length)]?.id??null;
}
// The existing seeds schema is shared with other cards. Mature people seeds
// return as a consequence scene, without creating a new decision slot.
export function maturePeopleSeeds(previous,emit){
 const due=(previous.cardSeeds??[]).filter(seed=>seed.atAge<=previous.age&&PEOPLE_FOLLOWUPS[seed.cardId]);
 if(!due.length)return previous;
 let s={...previous,cardSeeds:previous.cardSeeds.filter(seed=>!due.includes(seed)),peopleFollowups:[...(previous.peopleFollowups??[])]};
 for(const seed of due){
  const definition=PEOPLE_FOLLOWUPS[seed.cardId];
  const patch=definition.effects?.(s)??{};s={...s,...patch};
  const text=typeof definition.text==='function'?definition.text(s):definition.text;
  const row={id:seed.cardId,sourceCardId:definition.sourceCardId,choice:definition.choice,age:s.age,scheduledAge:seed.atAge};
  s.peopleFollowups=[...s.peopleFollowups,row];
  emit(text,null,{node:'people-followup',...row});
 }
 return s;
}
export function peopleSeedState(s){return hashSeed(s.seed^salt(`seeds:${s.pending?.id}:${s.age}`));}
