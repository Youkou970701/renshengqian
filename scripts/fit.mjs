// V2 constrained moment fit, with targets read from the Claude-owned table.
import { createBirth } from '../src/engine/birth.js';
import { DATA, BIRTH_WEIGHTS, BIRTH_TOTAL, PROVINCES, tierFor } from '../src/engine/stats.js';
import { ABBRS } from '../src/engine/rng.js';
import { P, logistic, logit } from '../src/engine/params.js';
import { probability } from '../src/engine/education.js';
import { readFileSync, writeFileSync } from 'node:fs';
export function bisect(fn,target,lo=-15,hi=15,steps=38){for(let i=0;i<steps;i++){const m=(lo+hi)/2;if(fn(m)<target)lo=m;else hi=m;}return (lo+hi)/2;}
P.ruralOffset=bisect(x=>PROVINCES.reduce((v,p,i)=>v+BIRTH_WEIGHTS[i]/BIRTH_TOTAL*Math.max(0,Math.min(1,1-DATA.province_tier[tierFor(p)].urban_share+x)),0),DATA.births.rural_share_of_births.value,-.3,.3);
P.wealthUrban=P.wealthRural.map(p=>(.2-.4*p)/.6);
const pop=[];for(let p=0;p<31;p++)for(let i=0;i<160;i++)pop.push({s:createBirth(`${ABBRS[p]}-2026-${String(i).padStart(6,'0')}`),w:BIRTH_WEIGHTS[p]/BIRTH_TOTAL/160});
const avg=fn=>pop.reduce((v,r)=>v+r.w*fn(r.s),0);
const avgGroup=(fn,predicate)=>avg(s=>predicate(s)?fn(s):0)/avg(s=>predicate(s)?1:0);
P.bachelorWealth=.25;P.bachelorWealthHigh=.7;P.bachelorUrban=.7;P.tierScale=1.5;P.bachelorGrade=.28;P.bachelorGrind=.8;
const v2=DATA.calibration_targets_v2;
const stage=s=>probability(s,'stage');const completed=s=>probability(s,'completion');
const exposure=s=>stage(s)*completed(s);
const final=s=>DATA.education.compulsory_retention.value*exposure(s)*(probability(s,'bachelor')+(1-probability(s,'bachelor'))*P.fallbackCollege*P.upgradeProbability);
const q5=s=>s.hukou==='urban'&&s.wealthQ===5, q3u=s=>s.hukou==='urban'&&s.wealthQ===3,q3r=s=>s.hukou==='rural'&&s.wealthQ===3;
for(let outer=0;outer<20;outer++){
 // Tied slopes allocate the shared wealth effect across the education gates;
 // the v2 wealth-gradient moment identifies the common strength.
 P.stageWealth=(P.bachelorWealth+P.bachelorWealthHigh)*.35;P.generalWealth=(P.bachelorWealth+P.bachelorWealthHigh)*.6;
 P.stageUrban=P.bachelorUrban*.2;P.generalUrban=P.bachelorUrban*.3;P.generalGrade=.12;
 P.stageBase=bisect(b=>{P.stageBase=b;return avg(stage);},.92);
 P.generalBase=bisect(b=>{P.generalBase=b;return avg(s=>stage(s)*probability(s,'general'));},.61);
 P.completionWealth=bisect(beta=>{P.completionWealth=beta;P.completionBase=bisect(b=>{P.completionBase=b;return avg(s=>stage(s)*completed(s))/.92;},.85);return -avgGroup(s=>DATA.education.compulsory_retention.value*exposure(s),s=>s.hukou==='rural'&&s.wealthQ===1);},-.37,0,6);
 P.completionBase=bisect(b=>{P.completionBase=b;return avg(s=>stage(s)*completed(s))/.92;},.85);
 P.bachelorBase=bisect(b=>{P.bachelorBase=b;return avg(s=>exposure(s)*probability(s,'bachelor'))/avg(exposure);},.415);
 P.bachelorWealth=bisect(beta=>{P.bachelorWealth=beta;return -avgGroup(final,s=>s.hukou==='rural'&&s.wealthQ===1);},-.10,0,1);
 P.bachelorWealthHigh=bisect(beta=>{P.bachelorWealthHigh=beta;return avgGroup(final,q5);},.665,0,3);
 P.bachelorUrban=bisect(beta=>{P.bachelorUrban=beta;return avgGroup(final,q3u)-avgGroup(final,q3r);},.085,0,3);
 P.tierScale=bisect(beta=>{P.tierScale=beta;return (avgGroup(s=>exposure(s)*probability(s,'bachelor'),s=>s.tier==='S')/avgGroup(exposure,s=>s.tier==='S'))/(avgGroup(s=>exposure(s)*probability(s,'bachelor'),s=>s.tier==='C')/avgGroup(exposure,s=>s.tier==='C'));},1.95,.5,4);
}
// Effort remains a bounded probability gain for paired identical birth circumstances.
P.bachelorGrind=bisect(beta=>{P.bachelorGrind=beta;const delta=avg(s=>{const a={...s,attrs:{...s.attrs,grind:100},gradePct:Math.min(100,s.gradePct+10.4)},b={...s,attrs:{...s.attrs,grind:0},gradePct:Math.max(0,s.gradePct-1.95)};return DATA.education.compulsory_retention.value*exposure(s)*(probability(a,'bachelor')-probability(b,'bachelor'));});return delta;},.12,0,3);
P.eliteWealth=P.bachelorWealth+P.bachelorWealthHigh*.5;
P.eliteUrban=bisect(beta=>{P.eliteUrban=beta;P.eliteBase=bisect(b=>{P.eliteBase=b;return avg(s=>exposure(s)*probability(s,'elite'))/avg(exposure);},.016);return -avg(s=>s.hukou==='rural'?exposure(s)*probability(s,'elite'):0)/(avg(exposure)*.016);},-.175,0,5);
P.eliteBase=bisect(b=>{P.eliteBase=b;return avg(s=>exposure(s)*probability(s,'elite'))/avg(exposure);},.016);
P.elite211Base=bisect(b=>{P.elite211Base=b;return avg(s=>exposure(s)*probability(s,'211'))/avg(exposure);},.05);
const keys=['ruralOffset','wealthUrban','stageWealth','stageUrban','generalWealth','generalUrban','generalGrade','stageBase','generalBase','completionBase','completionWealth','bachelorBase','bachelorWealth','bachelorWealthHigh','bachelorUrban','bachelorGrade','bachelorGrind','tierScale','eliteWealth','eliteUrban','eliteBase','elite211Base','careerWealth','careerGrade','careerGrind'];
const file=new URL('../src/engine/params.js',import.meta.url);const block='// BEGIN FITTED\nObject.assign(P, '+JSON.stringify(Object.fromEntries(keys.map(k=>[k,P[k]])),null,2)+');\n// END FITTED';writeFileSync(file,readFileSync(file,'utf8').replace(/\/\/ BEGIN FITTED[\s\S]*?\/\/ END FITTED/,block));
console.table(Object.fromEntries(keys.map(k=>[k,P[k]])));
console.log('Expected moments', {urbanQ5:avgGroup(final,q5),ruralQ1:avgGroup(final,s=>s.hukou==='rural'&&s.wealthQ===1),q3Gap:avgGroup(final,q3u)-avgGroup(final,q3r)});
await import('./refine.mjs');
