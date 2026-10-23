import {scenarioResultFacts} from './scenario-result-facts.js';
import {JOB_BY_ID} from './jobs.js';
import {SCENARIOS} from './scenarios.js';
const SCENARIO_BY_ID=Object.fromEntries(SCENARIOS.map(x=>[x.id,x]));
// These are audit facts, not prose inferred from the visible log. All fields
// used to rank titles survive capture:false. In particular, incomeHistory is
// deliberately excluded: it is optional and must not change a life's title.
export function titleFacts(s){
 const record=s.record??{},age=Number.isFinite(s.age)?s.age:0;
 const work=Object.entries(s.workExperience??{}).filter(([id,years])=>JOB_BY_ID[id]&&Number.isFinite(years)&&years>0).map(([jobId,years])=>({jobId,job:JOB_BY_ID[jobId],years})).sort((a,b)=>b.years-a.years||a.jobId.localeCompare(b.jobId));
 const completedScenarios=(s.scenarioHistory??[]).filter(h=>h.outcome&&h.outcome!=='skipped'&&Number.isFinite(h.endedAt)).map(h=>{
  const def=SCENARIO_BY_ID[h.id],choices=h.choices??[];
  const effects=h.appliedEffects??[...choices.map(c=>def?.steps[c.index]?.options.find(o=>o.id===c.choice)?.effects).filter(e=>e&&typeof e==='object'),def?.outcomeEffects?.[h.outcome]].filter(Boolean);
  const sum=key=>effects.reduce((n,e)=>n+(typeof e[key]==='number'?e[key]:0),0);
  const prisonTerms=[...choices.flatMap(c=>{const years=def?.steps[c.index]?.options.find(o=>o.id===c.choice)?.effects?.prisonYears;return years?[{age:c.age,years}]:[];}),...(def?.outcomeEffects?.[h.outcome]?.prisonYears?[{age:h.endedAt,years:def.outcomeEffects[h.outcome].prisonYears}]:[])];
  // A sentence imposed at the final choice has not already been served. Cap
  // every actual custody interval at this life's final age, merging overlaps.
  const intervals=prisonTerms.filter(t=>Number.isFinite(t.age)).map(t=>[t.age,Math.min(age,t.age+t.years)]).filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0]);
  let servedYears=0,end=-Infinity;for(const [a,b]of intervals){servedYears+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
  return {...h,def,resultFact:scenarioResultFacts(h,def),effects,prisonTerms,servedYears,reachedLastStep:choices.some(c=>c.index===def?.steps.length-1),prisonYears:sum('prisonYears'),assetsDelta:sum('assetsDelta'),hasEffect:key=>effects.some(e=>!!e[key]),chose:(index,choice)=>choices.some(c=>c.index===index&&c.choice===choice)};
 });
 const occupation=s.occupation&&JOB_BY_ID[s.occupation.id]?{...s.occupation,job:JOB_BY_ID[s.occupation.id]}:null;
 const relationships=s.relationshipHistory??[];
 const businesses=s.businessHistory??[];
 const purchases=(record.housePurchases??[]).filter(x=>Number.isFinite(x.age)&&Number.isFinite(x.price));
 return {s,record,age,province:s.province??'故乡',birthPlace:`${s.province??''}${s.place??''}`||'故乡',work,occupation,completedScenarios,businesses,purchases,relationships,kids:s.kids??[],closedBusinesses:businesses.filter(x=>Number.isFinite(x.closedAt)),adultKids:(s.kids??[]).filter(k=>Number.isFinite(k.bornAt)&&age-k.bornAt>=18)};
}
