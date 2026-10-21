// Deterministic moment fitting; never writes the Claude-owned statistics.
import { createBirth } from '../src/engine/birth.js';
import { DATA, BIRTH_WEIGHTS, BIRTH_TOTAL, PROVINCES, tierFor } from '../src/engine/stats.js';
import { ABBRS } from '../src/engine/rng.js';
import { P, logistic, logit } from '../src/engine/params.js';
import { readFileSync, writeFileSync } from 'node:fs';
function bisect(fn,target,lo=-15,hi=15){for(let i=0;i<45;i++){const m=(lo+hi)/2;if(fn(m)<target)lo=m;else hi=m;}return (lo+hi)/2;}
P.ruralOffset=bisect(x=>PROVINCES.reduce((v,p,i)=>v+BIRTH_WEIGHTS[i]/BIRTH_TOTAL*Math.max(0,Math.min(1,1-DATA.province_tier[tierFor(p)].urban_share+x)),0),DATA.births.rural_share_of_births.value,-.3,.3);
// Marginal quintiles stay exactly 20%, conditional distribution is a mechanism prior.
P.wealthUrban=P.wealthRural.map(p=>(.2-.4*p)/.6);
const population=[];
for(let p=0;p<31;p++)for(let i=0;i<500;i++)population.push({s:createBirth(`${ABBRS[p]}-2026-${String(i).padStart(6,'0')}`),w:BIRTH_WEIGHTS[p]/BIRTH_TOTAL/500});
const avg=fn=>population.reduce((v,r)=>v+r.w*fn(r.s),0);
// The supplied aggregate data cannot identify separate wealth, hukou, grade and effort
// coefficients at every gate. Use minimum complexity: unidentified coefficients = 0.
// Family affects graduation through the one coefficient identified by the rural-Q1 moment.
P.stageWealth=0;P.generalWealth=0;P.bachelorWealth=0;P.bachelorUrban=0;
P.careerWealth=0;P.careerGrade=0;P.careerGrind=0;
P.stageBase=logit(DATA.education.hs_stage_gross_enroll.value);
const stage=()=>DATA.education.hs_stage_gross_enroll.value;
P.generalBase=logit(DATA.education.general_hs_rate.value/stage());
const poorWeight=avg(s=>s.hukou==='rural'&&s.wealthQ===1?1:0);
// National completion 85% of entrants is an explicit modelling anchor, NOT source data.
// It is chosen from cohort-final-bachelor 28–40% / examinee-bachelor 37–45% constraints.
P.completionWealth=bisect(beta=>{const b=bisect(x=>avg(s=>logistic(x+beta*(s.wealthQ-3))),.85);return -avg(s=>s.hukou==='rural'&&s.wealthQ===1?DATA.education.compulsory_retention.value*stage(s)*logistic(b+beta*(s.wealthQ-3)):0)/poorWeight;},-DATA.education.poor_rural_hs_completion.value,0,8);
P.completionBase=bisect(b=>avg(s=>logistic(b+P.completionWealth*(s.wealthQ-3))),.85);
const candidate=s=>stage(s)*logistic(P.completionBase+P.completionWealth*(s.wealthQ-3));
const candidateWeight=avg(candidate);
const bachelor=(s,b,grind=.20,grade=s.gradePct)=>logistic(logit(DATA.province_tier[s.tier].bachelor_rate)+b+P.bachelorGrade*(grade-50)/25+P.bachelorGrind*(grind-.35));
// Study vs no-study through age18 changes the two standardized features by roughly
// 0.494 (grade) and 1 (grind). Tie coefficient ratio to this gradient, then solve a 12pp
// paired-cohort gain. This is a product constraint, not an estimated causal effect.
const gradeDirection=13*(.8+.15)/25;
P.bachelorGrind=.5;P.bachelorGrade=gradeDirection*.5;
for(let k=0;k<6;k++){
 P.bachelorBase=bisect(b=>avg(s=>candidate(s)*bachelor(s,b))/candidateWeight,.415);
 P.bachelorGrind=bisect(beta=>{const oldG=P.bachelorGrind,oldB=P.bachelorGrade;P.bachelorGrind=beta;P.bachelorGrade=gradeDirection*beta;const delta=avg(s=>DATA.education.compulsory_retention.value*candidate(s)*(bachelor(s,P.bachelorBase,1,Math.min(100,s.gradePct+10.4))-bachelor(s,P.bachelorBase,0,Math.max(0,s.gradePct-1.95))));P.bachelorGrind=oldG;P.bachelorGrade=oldB;return delta;},.12,0,3);
 P.bachelorGrade=gradeDirection*P.bachelorGrind;
}
// 985 rural 17.5% proxy midpoint and 1.6% overall rate jointly identify urban beta + intercept.
P.eliteUrban=bisect(beta=>{const b=bisect(x=>avg(s=>candidate(s)*logistic(x+Math.log(DATA.province_tier[s.tier].elite_mult)+beta*(s.hukou==='urban')))/candidateWeight,.016);const rural=avg(s=>s.hukou==='rural'?candidate(s)*logistic(b+Math.log(DATA.province_tier[s.tier].elite_mult)):0);return -rural/(candidateWeight*.016);},-.175,0,5);
P.eliteBase=bisect(b=>avg(s=>candidate(s)*logistic(b+Math.log(DATA.province_tier[s.tier].elite_mult)+P.eliteUrban*(s.hukou==='urban')))/candidateWeight,.016);
P.elite211Base=bisect(b=>avg(s=>candidate(s)*logistic(b+Math.log(DATA.province_tier[s.tier].elite_mult)+P.eliteUrban*(s.hukou==='urban')))/candidateWeight,DATA.education.elite_211_rate.value);
const keys=['ruralOffset','wealthUrban','stageWealth','generalWealth','stageBase','generalBase','completionBase','completionWealth','bachelorBase','bachelorWealth','bachelorUrban','bachelorGrade','bachelorGrind','eliteUrban','eliteBase','elite211Base','careerWealth','careerGrade','careerGrind'];
const file=new URL('../src/engine/params.js',import.meta.url);
const block='// BEGIN FITTED\nObject.assign(P, '+JSON.stringify(Object.fromEntries(keys.map(k=>[k,P[k]])),null,2)+');\n// END FITTED';
writeFileSync(file,readFileSync(file,'utf8').replace(/\/\/ BEGIN FITTED[\s\S]*?\/\/ END FITTED/,block));
console.table(Object.fromEntries(keys.map(k=>[k,P[k]])));
