import { DATA, PROVINCES, provinceInfo } from './stats.js';
import { P } from './params.js';
const infant=DATA.health.infant_mortality.value;
const child=1-Math.pow((1-DATA.health.under5_mortality.value)/(1-infant),1/4);
function risks(scale){return Array.from({length:111},(_,age)=>age===110?1:age===0?infant:age<5?child:1-Math.exp(-P.makeham-scale*Math.exp(P.gompertzGrowth*age)));}
function expectation(table){let alive=1,total=0;for(let a=0;a<110;a++){alive*=1-table[a];total+=alive;}return total;}
function solve(target){let lo=0,hi=.01;for(let i=0;i<70;i++){let mid=(lo+hi)/2;if(expectation(risks(mid))>target)lo=mid;else hi=mid;}return risks((lo+hi)/2);}
// Immutable derived life tables solved once per province and sex, not during step.
export const LIFE_TABLES=Object.freeze(Object.fromEntries(PROVINCES.flatMap(province=>['male','female'].map(sex=>[`${province}:${sex}`,Object.freeze(solve(provinceInfo(province).lifeExpectancy+(sex==='male'?P.maleLifeShift:P.femaleLifeShift)))]))));
export const mortalityRisk=state=>LIFE_TABLES[`${state.province}:${state.sex}`][state.age];
export const lifeTableExpectation=(province,sex)=>expectation(LIFE_TABLES[`${province}:${sex}`]);
export function causeOfDeath(state,u){
 if(u<.055)return {category:'意外',detail:state.age<18?'意外伤害':state.age<60?'交通意外':'意外跌伤'};
 const detail=state.age<15?'严重感染':state.age<40?'急性重病':u<.35?'肺癌':u<.6?'脑卒中':u<.82?'心梗':'重症肺炎';
 return {category:'疾病',detail};
}
