import {createBirth} from '../engine/birth.js';
import {PROVINCES} from '../engine/stats.js';
import {step} from '../engine/life.js';
import {autoChoose} from '../engine/decisions.js';
import {migrateLife} from '../engine/migrate.js';
export {SAVE_KEY,SCHEMA_VERSION,hydrateSave,serializeSave} from './save-codec.js';
export function validLife(life) {
 try {
  if (!life || typeof life !== 'object') return false;
  const family=life.family;
  const birth=createBirth(family?.rootId??life.id);
  const birthMatches=family ? [2,3].includes(family.generation)&&Array.isArray(family.ancestors)&&family.ancestors.length===family.generation-1&&family.ancestors.every(a=>a&&typeof a.name==='string'&&Number.isFinite(a.age)&&Number.isFinite(a.year)&&a.settlement&&PROVINCES.includes(a.province))&&life.id===`${family.rootId}·${family.generation===2?'二':'三'}代`&&Number.isInteger(life.seed)&&PROVINCES.includes(life.province) : birth.province===life.province&&birth.seed===life.seed&&life.tier===birth.tier;
  const finite=keys=>keys.every(key=>Number.isFinite(life[key]));
  return birthMatches
   && ['male','female'].includes(life.sex) && ['urban','rural'].includes(life.hukou)
   && Number.isInteger(life.rngState) && life.rngState>=0 && life.rngState<=4294967295
   && Number.isInteger(life.age) && life.age>=0 && life.age<=110 && typeof life.alive==='boolean'
   && Number.isInteger(life.wealthQ) && life.wealthQ>=1 && life.wealthQ<=5
   && finite(['income','assets','gradePct']) && life.attrs
   && ['health','happy','knowledge','social','grind'].every(k=>Number.isFinite(life.attrs[k]))
   && Array.isArray(life.log) && life.log.every(e=>e && Number.isFinite(e.age) && typeof e.text==='string' && (e.stat==null || typeof e.stat==='string') && (e.footnote==null || typeof e.footnote==='string'))
   && Array.isArray(life.history) && life.history.every(h=>h && Number.isFinite(h.age) && Number.isFinite(h.happy))
   && Array.isArray(life.kids) && life.kids.every(k=>k && Number.isFinite(k.bornAt))
   && Array.isArray(life.choices) && life.record && typeof life.record==='object'
   && life.parents && ['mother','father'].every(k=>life.parents[k] && Number.isFinite(life.parents[k].age) && typeof life.parents[k].education==='string' && typeof life.parents[k].job==='string')
   && typeof life.name==='string' && ['mother','father'].every(k=>typeof life.parents[k].name==='string')
   && typeof life.edu==='string' && typeof life.job==='string' && ['一线','省会','县城','老家'].includes(life.city)
   && (!life.death || typeof life.death.category==='string')
   && (!life.pending || (typeof life.pending.id==='string' && typeof life.pending.title==='string'
    && Array.isArray(life.pending.options) && life.pending.options.length>=2 && life.pending.options.every(o=>o && typeof o.id==='string' && typeof o.label==='string' && (o.effect==null || typeof o.effect==='string'))));
 } catch {return false;}
}
export function advancePeer(peer, targetAge) {
 let result=peer, guard=0;
 while(result.alive && result.age<targetAge && guard++<220) result=step(result, {auto:true, ...(result.pending ? {choice:autoChoose(result)} : {})}).state;
 return result;
}
// Peers have no user inputs. age records the replay horizon: a deceased peer
// needs deathAge+1, since death can occur on the next step at the same age.
// The recomputed life still shows its original death age.
export function restorePeers(peers) {
 if(!Array.isArray(peers)||peers.length!==4)return null;
 try{return peers.map(p=>{
  if(validLife(p))return migrateLife(p); // deployed schema 2, including its progress
  if(!p||Object.keys(p).some(k=>!['id','age'].includes(k))||!Number.isInteger(p.age)||p.age<0||p.age>111)throw Error('Invalid peer');
  const life=advancePeer(createBirth(p.id),p.age);
  if(life.age!==p.age&&(life.alive||life.age+1!==p.age))throw Error('Unreachable peer age');
  return life;
 });}catch{return null;}
}
// A checkpoint follows a completed engine input, never a clock tick or animation.
export function checkpointChanged(before,after,action) {
 if(!['advance','jump','frame','engine-action'].includes(action.type))return false;
 // A year with cards is checkpointed by its completed choices (at most two).
 // Hiding the page also saves an unanswered card immediately.
 if(after.life?.pending&&before.life?.age!==after.life?.age&&!action.choice)return false;
 return before.life!==after.life && (before.life?.age!==after.life?.age
  || before.life?.alive!==after.life?.alive || before.life?.log!==after.life?.log
  || before.life?.choices!==after.life?.choices);
}
