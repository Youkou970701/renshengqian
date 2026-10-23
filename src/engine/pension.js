import {DATA} from './stats.js';
import {JOB_BY_ID} from '../content/jobs.js';
import {isProtectedPost} from './employment.js';
import {incomeEvent} from './income-events.js';

const VALUES=DATA.pension;
export const PENSION_RULES={
 minYears:VALUES.min_contribution_years.value,
 residentMonthly:VALUES.urban_rural_resident_monthly.value,
 enterpriseMonthly:VALUES.enterprise_worker_monthly.value,
 enterpriseUpper:VALUES.worker_monthly_2025_est.value,
 publicMonthly:VALUES.public_institution_monthly.value,
 // A game parameter, not a quoted statutory contribution schedule.
 flexibleAnnualContribution:12000,
};
const clip=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function isFlexibleWork(s){
 return !!s.business?.active||['务农','个体户','老板','外卖骑手','网约车司机','自由职业者','主播','店主'].includes(s.job)||['farm','freelancer','driver','rider','streamer','shop'].includes(s.occupation?.id);
}
export function baseRetirementAge(s){
 if(s.sex==='male')return 63;
 const klass=s.retirementClass??(s.retired?s.pensionRecord?.retirementClass:null)??JOB_BY_ID[s.occupation?.id]?.retirementClass??s.pensionRecord?.retirementClass;
 return klass==='cadre'||isProtectedPost(s)?58:55;
}
export function retirementAge(s){return baseRetirementAge(s)+({early:-1,normal:0,late:3}[s.retirementChoice]??0);}

// Contributions accrue only for paid employment months. Prior years are never
// reconstructed from hukou, education, current salary, or an assumed career.
export function recordContributions(s){
 if(s.pensionRecord?.creditedAge===s.age)return s.pensionRecord;
 const r={years:0,publicYears:0,enterpriseYears:0,wageTotal:0,...s.pensionRecord,creditedAge:s.age};
 s.pensionRecord=r;
 if(s.retired||s.age<18||s.job==='待业'||s.job==='研究生在读'||s.job==='尚未就业'||s.examGapUntil>=s.age)return r;
 const flexible=isFlexibleWork(s);
 if(!flexible&&!(s.income>0))return r;
 if(flexible&&r.years>=PENSION_RULES.minYears&&s.age>=retirementAge(s))return r;
 const months=flexible?12:clip(s.occupation?.paidMonths??12,0,12);
 if(!months)return r;
 if(flexible){
  if(s.socialInsuranceChoice!=='pay')return r;
  const contribution=PENSION_RULES.flexibleAnnualContribution*months/12;
  if(!(s.assets>=contribution)){r.unpaidAge=s.age;return r;}
  s.assets-=contribution;r.selfContributions=(r.selfContributions??0)+contribution;
 }
 const fraction=months/12,publicPost=isProtectedPost(s)&&!flexible;
 r.years+=fraction;r[publicPost?'publicYears':'enterpriseYears']+=fraction;
 r.wageTotal+=s.income;
 r.lastCategory=publicPost?'public':'enterprise';
 r.retirementClass=s.retirementClass??JOB_BY_ID[s.occupation?.id]?.retirementClass??(publicPost?'cadre':'worker');
 return r;
}

export function pensionEntitlement(s){
 const r=s.pensionRecord??{},years=r.years??0,enough=years+1e-8>=PENSION_RULES.minYears;
 const eligible=enough?(!!s.retired||isFlexibleWork(s)&&s.age>=retirementAge(s)):s.age>=60;
 if(!enough)return {category:'resident',monthly:eligible?PENSION_RULES.residentMonthly:0,annual:eligible?PENSION_RULES.residentMonthly*12:0,years,eligible,publicShare:0};
 const averageAnnualWage=years>0?(r.wageTotal??0)/years:0;
 // Explicit game interpolation, not an actuarial/legal benefit calculation.
 // Both contribution length and recorded pay shift enterprise benefits within
 // the supplied 2022 mean and 2025 estimate, without changing either datum.
 const lengthScore=clip((years-PENSION_RULES.minYears)/25,0,1),wageScore=clip((averageAnnualWage-30000)/120000,0,1);
 const enterprise=PENSION_RULES.enterpriseMonthly+(PENSION_RULES.enterpriseUpper-PENSION_RULES.enterpriseMonthly)*(.55*lengthScore+.45*wageScore);
 const publicShare=clip((r.publicYears??0)/years,0,1);
 const amount=enterprise*(1-publicShare)+PENSION_RULES.publicMonthly*publicShare;
 return {category:r.lastCategory==='public'&&publicShare>0?'public':'enterprise',monthly:eligible?Math.round(amount*100)/100:0,annual:eligible?Math.round(amount*12):0,years,eligible,publicShare,averageAnnualWage};
}

export function pensionComparisonText(s){
 const p=pensionEntitlement(s),r=s.pensionRecord??{};
 const comparison=`城乡居民养老金参考每月约${Math.round(PENSION_RULES.residentMonthly)}元，企业职工约${Math.round(PENSION_RULES.enterpriseMonthly)}—${Math.round(PENSION_RULES.enterpriseUpper)}元，机关事业约${Math.round(PENSION_RULES.publicMonthly)}元。`;
 return `${comparison}你的职工养老缴费累计${(r.years??0).toFixed(1)}年，最低缴费年限${PENSION_RULES.minYears}年${p.eligible?`，本局每月领取${Math.round(p.monthly)}元`:'，尚未开始领取'}。`;
}

// pensionIncome is independent of labour income: resident recipients may keep
// farming or taking flexible work. The caller adds it to household cash flow.
export function settlePension(s,emit=()=>{}){
 const p=pensionEntitlement(s),previousAnnual=s.pensionIncome??0,previousCategory=s.pensionCategory;
 s.pensionIncome=p.annual;s.pensionMonthly=p.monthly;s.pensionCategory=p.category;
 if(p.eligible&&!s.pensionStarted){
  s.pensionStarted=true;
  incomeEvent(s,emit,'pension-start',`你开始领取养老金。${pensionComparisonText(s)}`,{pensionCategory:p.category,pensionAnnual:p.annual});
 }else if(s.pensionStarted&&(Math.abs(previousAnnual-p.annual)>1||previousCategory!==p.category)){
  const reason=p.eligible?'缴费累计变化后，养老金按本局的新标准结算。':'职工养老缴费已达到最低年限，等待相应退休年龄后按职工标准领取。';
  incomeEvent(s,emit,'pension-change',`${reason}${pensionComparisonText(s)}`,{pensionCategory:p.category,pensionAnnual:p.annual,previousPensionAnnual:previousAnnual});
 }
 return p;
}
