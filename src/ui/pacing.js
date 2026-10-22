import {step} from '../engine/life.js';

const importantNodes=new Set(['junior','school','completion','exam','master','civil','career','midcareer','parentDeath','death']);
export const hasImportantEvents=life=>Boolean(life.pending||life.choices.some(c=>c.age===life.age)||life.log.some(e=>e.age===life.age&&(e.dice?.length||importantNodes.has(e.node))));
export function importantTransition(before,after){
 return hasImportantEvents(after)||before.edu!==after.edu||before.job!==after.job||before.married!==after.married||before.kids.length!==after.kids.length||['mother','father'].some(k=>before.parents[k].alive!==after.parents[k].alive);
}

// Forecast on copied engine states only; never consume the player's RNG or skip a step.
// Rebalance the remaining viewing budget after choices/focus changes. Manual thinking,
// pauses and dice interaction are extra time; speed buttons scale only viewing time.
export function normalPacing(life,{duration=30,elapsedMs=0,focus='auto',important=false}={}){
 const weights=new Map([[life.age,important||hasImportantEvents(life)?2:.6]]);
 let next={...life,capture:true},guard=0;
 while(next.alive){
  if(++guard>300)throw new Error('普通人生节奏预测没有正常结束');
  const before=next;
  next=step(before,{auto:true,...(focus==='auto'?{}:{focus})}).state;
  const weight=importantTransition(before,next)?2:.6;
  weights.set(next.age,Math.max(weights.get(next.age)??.6,weight));
 }
 const remainingMs=Math.max(0,duration*60000-elapsedMs),totalWeight=[...weights.values()].reduce((a,b)=>a+b,0);
 return {delayMs:remainingMs*weights.get(life.age)/totalWeight,weight:weights.get(life.age),totalWeight,remainingMs,weights:Object.fromEntries(weights)};
}
