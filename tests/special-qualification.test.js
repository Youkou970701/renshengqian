import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {drawCards} from '../src/engine/cards.js';
import {step} from '../src/engine/life.js';
import {ensureHighSchoolLocation,specialPlanEligible} from '../src/engine/school-location.js';
import {extraAdmission} from '../src/engine/education-paths.js';
import {EDUCATION_RULES} from '../src/content/education-rules.js';
import {P} from '../src/engine/params.js';
import {random} from '../src/engine/rng.js';
const make=(wealthQ=3)=>({...drawBirth(42),age:17,wealthQ,hukou:'rural',edu:'high',gradePct:80,highSchoolLocation:'county',record:{stage:true,junior:true,schoolSettled:true,publicGeneral:true,completed:false,admitted:false}});
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);}return x;};

test('专项资格不按收入切断：Q1到Q5农村县中优秀生都可申请，城镇/市里高中/低成绩均不符合',()=>{
 for(let q=1;q<=5;q++)assert.equal(specialPlanEligible(make(q)),true);
 for(const patch of [{hukou:'urban'},{highSchoolLocation:'city'},{gradePct:EDUCATION_RULES.topFifthScore-.01}])assert.equal(specialPlanEligible({...make(),...patch}),false);
});

test('县中概率严格随家境平滑下降，真实独立抽样逼近参数并只记录一次',()=>{
 const ps=EDUCATION_RULES.countySchoolProbabilities;assert.equal(ps.length,5);
 assert.ok(ps.every(p=>p>0&&p<1));for(let i=1;i<5;i++){assert.ok(ps[i]<ps[i-1]);assert.ok(ps[i-1]-ps[i]<=.25);}
 const counts=[];
 for(let q=1;q<=5;q++){
  let county=0;
  for(let i=0;i<5000;i++){
   const s={...make(q),seed:i,highSchoolLocation:undefined};const demographic=s.rngState,card=s.cardRngState;
   ensureHighSchoolLocation(s);assert.equal(s.rngState,demographic);assert.equal(s.cardRngState,card);
   county+=s.highSchoolLocation==='county';const state=s.schoolRngState,location=s.highSchoolLocation;
   s.wealthQ=6-q;ensureHighSchoolLocation(s);assert.equal(s.schoolRngState,state);assert.equal(s.highSchoolLocation,location);
  }
  assert.ok(Math.abs(county/5000-ps[q-1])<.025);counts.push(county);
 }
 for(let i=1;i<5;i++)assert.ok(counts[i]<counts[i-1]);
});

test('未完成高中去向选择不提前抽学校，旧存档缺字段可纯函数补齐且capture不改结果',()=>{
 const b={...make(),age:15,highSchoolLocation:undefined,record:{...make().record,publicGeneral:false},schoolRoute:undefined};ensureHighSchoolLocation(b);assert.equal(b.highSchoolLocation,undefined);
 const old={...make(),highSchoolLocation:undefined};const before=structuredClone(old),a=drawCards(freeze(old)),b2=drawCards({...before,capture:false});
 assert.deepEqual(old,before);assert.ok(['county','city'].includes(a.highSchoolLocation));assert.equal(a.highSchoolLocation,b2.highSchoolLocation);assert.equal(a.schoolRngState,b2.schoolRngState);
});

test('Q3和Q5真实卡选择可进入专项并按实际补充录取，不能让市区高中绕过资格',()=>{
 for(const q of [3,5]){
  const s=drawCards(make(q));assert.equal(s.pending.id,'rural-special-plan');
  const after=step(freeze(s),{choice:'apply'}).state;assert.equal(after.specialPlan,true);
  let candidate=1;while(random(candidate).value>=EDUCATION_RULES.specialSuccess)candidate++;
  const admitted={...after,cardRngState:candidate,record:{...after.record,admitted:false}};extraAdmission(admitted,()=>{});
  assert.equal(admitted.record.specialAdmitted,true);assert.equal(admitted.edu,'bachelor');
  const invalid={...admitted,edu:'high',highSchoolLocation:'city',competitionEligible:false,talentQualified:false,record:{...admitted.record,admitted:false,specialAdmitted:false}};
  extraAdmission(invalid,()=>{});assert.equal(invalid.record.specialAdmitted,false);
 }
});

test('低中家境本科直接斜率必须为正，不能退回近零边界',()=>assert.ok(P.bachelorWealth>1e-6));
