// Focus labels and effects live in content; the engine only applies their schema.
import {FOCUSES} from '../content/focus.js';
export function focusOptions(s){return FOCUSES.filter(f=>f.when(s));}
export function settleFocus(s,id){
 const f=focusOptions(s).find(f=>f.id===id);if(!f)return;
 s.skills={...(s.skills??{})};for(const [key,delta]of Object.entries(f.skills))s.skills[key]=(s.skills[key]??0)+delta;
 s.focusHistory=[...(s.focusHistory??[]),{age:s.age,focus:id}];
}
export function demographicFocus(id){return ({play:'hobby',gaming:'hobby',romance:'family',sprint:'study',arts:'study',parttime:'work',internship:'work',travel:'hobby',certificate:'study',career:'work',side:'work',skill:'study',rest:'health',network:'family',grandchildren:'family',wellness:'health',dance:'hobby',earn:'work',chores:'family',interest:'hobby'})[id]??id;}
