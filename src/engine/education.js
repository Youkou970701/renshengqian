import { DATA } from './stats.js';
import { P, logistic, logit } from './params.js';
export const isBachelor=s=>['bachelor','211','985','master'].includes(s.edu);
export function contributions(s,node){
 const w=s.wealthQ-3,urban=s.hukou==='urban'?1:0;
 if(node==='junior')return {base:logit(DATA.education.compulsory_retention.value)};
 if(node==='stage')return {base:P.stageBase,wealth:P.stageWealth*w,hukou:P.stageUrban*(urban-.6)};
 if(node==='general')return {base:P.generalBase,wealth:P.generalWealth*w,hukou:P.generalUrban*(urban-.6),grade:P.generalGrade*(s.gradePct-50)/25};
 if(node==='completion')return {base:P.completionBase,wealth:P.completionWealth*w};
 if(node==='bachelor')return {base:P.bachelorBase,tier:P.tierScale*logit(DATA.province_tier[s.tier].bachelor_rate),wealth:P.bachelorWealth*w+P.bachelorWealthHigh*Math.max(w,0),hukou:P.bachelorUrban*(urban-.6),grade:P.bachelorGrade*(s.gradePct-50)/25,effort:P.bachelorGrind*(s.attrs.grind/100-.35)};
 if(node==='elite'||node==='211')return {base:node==='elite'?P.eliteBase:P.elite211Base,tier:Math.log(DATA.province_tier[s.tier].elite_mult),wealth:P.eliteWealth*w,hukou:P.eliteUrban*urban};
 throw new Error('Unknown education gate: '+node);
}
export function probability(s,node){return logistic(Object.values(contributions(s,node)).reduce((a,b)=>a+b,0));}
// Only attribute a rejection to a factor if neutralizing that actual negative logit
// contribution would have reversed this very draw. Otherwise the residual draw is decisive.
export function attribution(s,node,u,bonus=0){
 const terms=contributions(s,node);let score=Object.values(terms).reduce((a,b)=>a+b,0);
 if(bonus){terms.retry=logit(Math.min(1-Number.EPSILON,logistic(score)+bonus))-score;score+=terms.retry;}
 const success=u<logistic(score);
 const decisive=Object.entries(terms).filter(([k,v])=>k!=='base'&&(success?v>0&&u>=logistic(score-v):v<0&&u<logistic(score-v))).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 return {dominant:decisive[0]?.[0]??'chance',contributions:terms,probability:logistic(score),draw:u};
}
