import {random,hashSeed} from './rng.js';
import {EDUCATION_RULES} from '../content/education-rules.js';
export {specialPlanEligible} from '../content/education-rules.js';

// Called only on step/drawCards' copy. The independent persisted draw records
// where school was attended, without changing demographic or card randomness.
export function ensureHighSchoolLocation(s){
 if(s.highSchoolLocation||!s.record?.stage||s.age<15)return s;
 if(s.age<=16&&s.record.schoolSettled&&s.record.publicGeneral===false&&!s.schoolRoute)return s;
 const r=random(s.schoolRngState??hashSeed(s.seed^0x6f42a9d3));
 s.schoolRngState=r.seed;
 const probability=EDUCATION_RULES.countySchoolProbabilities[s.wealthQ-1];
 s.highSchoolLocation=s.schoolRoute==='international'?'city':r.value<probability?'county':'city';
 return s;
}
