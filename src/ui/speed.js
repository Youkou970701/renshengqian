import {step} from '../engine/life.js';

const nodes=new Set(['school','exam','master','civil','midcareer','parentDeath','death']);
const keyChoices=new Set(['school','school-alternatives','exam','repeat','repeat-exam','career','city','marry','child','house','midcareer','flexible-retirement']);
export const isSpeedEvent=e=>nodes.has(e.node)||e.speedKey===true||Boolean(e.dice?.length)||e.node==='scenario-end'||e.node==='card'&&keyChoices.has(e.cardId);
// Timing is presentation-only. Every step (including daily events) runs unchanged.
export function buildSpeedTimeline(birth){
 let life={...birth,capture:true},guard=0,displayLogs=[{age:0,text:`${birth.name}，出生在${birth.province}${birth.place}。`,speedKey:true}];
 const frames=[{life,events:displayLogs.slice(),displayLogs:displayLogs.slice()}];
 while(life.alive){
  if(++guard>600)throw new Error('极速人生没有正常结束');
  const before=life,result=step(life,{auto:true});life=result.state;
  const events=result.events.filter(isSpeedEvent);
  if(before.age<22&&life.age===22)events.push({age:22,text:`22岁，${life.edu==='none'?'你初中没读完':`你读到${educationLabel(life.edu)}`}，准备安排离开校园后的生活。`,speedKey:true});
  if(!before.married&&life.married)events.push({age:life.age,text:'你们开始一起安排两个人的生活。',speedKey:true});
  if(life.kids.length>before.kids.length)events.push({age:life.age,text:'孩子来到这个家，你也开始做父母。',speedKey:true});
  if(events.length){displayLogs=[...displayLogs,...events];frames.push({life,events,displayLogs:displayLogs.slice()});}
 }
 // Keep the exact terminal state, including the full log and all RNG state.
 if(frames.at(-1).life!==life)frames.push({life,events:[],displayLogs:displayLogs.slice()});
 const durationMs=60000,slot=durationMs/frames.length;
 return {frames:frames.map((frame,i)=>({...frame,atMs:i*slot,durationMs:slot})),durationMs};
}
export function educationLabel(edu){return {none:'初中没读完',junior:'初中',high:'普通高中',vocational:'中职',college:'专科',bachelor:'本科','211':'211本科','985':'985本科',master:'硕士'}[edu]??'在读';}
