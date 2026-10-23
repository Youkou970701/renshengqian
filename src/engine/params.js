// Mechanism estimates, NOT sourced statistics. Refit with npm run fit.
// fit.mjs solves logit intercepts and coefficients against cohort constraints.
export const P = {
  ruralOffset: 0,
  wealthUrban:[.10,.15,.20,.25,.30], wealthRural:[.30,.25,.20,.15,.10],
  bachelorWealthHigh:0,stageUrban:0,generalUrban:0,generalGrade:0,eliteWealth:.5,tierScale:1,
  stageWealth:.65, generalWealth:.35, bachelorWealth:.36, bachelorUrban:.32,
  bachelorGrade:.16, bachelorGrind:.75, eliteUrban:1.2,
  stageBase:3, generalBase:.6, completionBase:4, completionWealth:1,
  bachelorBase:0, eliteBase:0, elite211Base:0,
  careerWealth:.12, careerGrade:.12, careerGrind:.15,
  upgradeProbability:.06, repeatBonus:.04, fallbackCollege:.80, marriageProbability:.78, childProbability:.55, midcareerRisk:.16,
  ruralPension:6000, urbanPension:36000, childAnnualCost:8500,
  cityMultiplier:{'一线':1.65,'省会':1.15,'县城':.85,'老家':.70},
  wageNoise:.25,savingRate:.22,houseCost:{'一线':1800000,'省会':850000,'县城':420000,'老家':220000},
  sexMale:110/210, onlyChildUrban:.48,onlyChildRural:.25,
  femaleLifeShift:3,maleLifeShift:-2.6,gompertzGrowth:.095,makeham:.00012,
};
export const logistic=x=>1/(1+Math.exp(-x));
export const logit=p=>Math.log(p/(1-p));
export const clamp=(x,min=0,max=100)=>Math.max(min,Math.min(max,x));
// BEGIN FITTED
Object.assign(P, {
  "ruralOffset": -0.007563243244294424,
  "wealthUrban": [
    0.13333333333333336,
    0.16666666666666669,
    0.2,
    0.23333333333333336,
    0.26666666666666666
  ],
  "stageWealth": 0.284482091114296,
  "stageUrban": 0.08672732924569573,
  "generalWealth": 0.4876835847673646,
  "generalUrban": 0.1300909938685436,
  "generalGrade": 0.12,
  "stageBase": 2.522076764416852,
  "generalBase": 0.10,
  "completionBase": 3.3627237945802335,
  "completionWealth": 1.7949218613393896,
  "bachelorBase": -0.5292592930968442,
  "bachelorWealth": 0.12,
  "bachelorWealthHigh": 0.69,
  "bachelorUrban": 0.80,
  "bachelorGrade": 0.28,
  "bachelorGrind": 0.6274024623762671,
  "tierScale": 1.0119952314662441,
  "eliteWealth": 0.40640298730158975,
  "eliteUrban": 0.5885496909922949,
  "eliteBase": -4.814906278425042,
  "elite211Base": -3.611136376766808,
  "careerWealth": 0,
  "careerGrade": 0,
  "careerGrind": 0
});
// END FITTED

// Career pathway priors, checked jointly against the v2 adult cohort targets.
P.career={
  "masterApply": 0.30,
  "masterRetry": 0.7,
  "masterBase": 0,
  "masterWealth": 0.08,
  "masterGrade": 0.12,
  "masterGrind": 0.12,
  "civilApply": 0.22,
  "civilBase": 0,
  "institutionSuccess": 0.05,
  "civilDegree": 0.2,
  "civilRegionHigh": -0.1,
  "civilRegionOther": 0.05,
  "civilGrade": 0.08,
  "directPublic": 0.008,
  "farmBase": 0.18,
  "gigFallback": 0.04,
  "recoverEmployment": 0.68,
  "layoff": {
    "internet": 0.27,
    "manufacturing": 0.14,
    "construction": 0.19,
    "service": 0.12,
    "business": 0.16,
    "agriculture": 0.04,
    "public": 0.002
  }
};

// status=参数：家族玩法目标，非现实统计；出生派生与生育自动选择使用，不参与第一代出生或教育抽签。
P.family={
 status:'参数',
 ruralHomeLowIncome:0.72,
 ruralHomeOtherIncome:0.58,
 urbanWithDegreeOrHouse:0.50,
 urbanWithDegreeAndHouse:0.96,
 leftBehindAway:0.68,
 autoChildProbability:0.95,
};
