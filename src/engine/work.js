import {JOBS,JOB_BY_ID,WORK_RULES} from '../content/jobs.js';
import {random,hashSeed} from './rng.js';
import {isPublic} from './career.js';
import {makeDice} from './dice.js';
import {P,clamp} from './params.js';
import {incomeEvent} from './income-events.js';
import {isProtectedPost} from './employment.js';
import {pensionEntitlement} from './pension.js';
export const degreeRank=s=>({none:0,junior:0,vocational:0,high:0,college:1,bachelor:2,'211':3,'985':3,master:4})[s.edu]??0;
export const jobEligible=(s,j)=>!((s.record?.criminalRecord||s.criminalRecord)&&['teacher','doctor','lawyer','soldier','civil','institution'].includes(j.profession))&&degreeRank(s)>=j.entry.degree&&(!j.entry.majors.length||j.entry.majors.includes(s.major))&&(s.skills?.craft??0)>=j.entry.certificate&&!j.publicOnly&&(j.id!=='soldier'||s.age<=24&&s.attrs.health>=60)&&(j.profession!=='doctor'||(s.residencyCompletedYears??0)>=3);
export function economyDraw(s){const r=random(s.economyRngState??hashSeed(s.seed^0x49d91a37));s.economyRngState=r.seed;return r.value;}
const pools={
 '工厂工人':['factory','welder','mechanic'],'建筑工人':['construction','carpenter','electrician'],
 '本地服务业':['cleaner','security','waiter','retail','cook','hairdresser','caregiver','courier'],
 '技术员':['engineer','itops','mechanic'],'企业职员':['clerk','hr','sales','accountant','designer','lawyer','bank','writer'],
 '互联网职员':['programmer','itops','designer','streamer'],'个体户':['freelancer','repair','sales'],'老板':['freelancer','sales'],
 '教师':['teacher'],'医护':['doctor'],'规培医师':['doctor'],'公务员':['civil'],'事业编':['institution'],
 '军人':['soldier'],'务农':['farm'],'外卖骑手':['rider'],'网约车司机':['driver'],
};
function pickJob(s){
 const exact=JOBS.find(j=>j.legacy===s.job);
 let list=(pools[s.job]??(exact?[exact.id]:['freelancer'])).map(id=>JOB_BY_ID[id]);
 if(['企业职员','互联网职员','技术员','本地服务业'].includes(s.job)){
  const preferred=({'工程计算机':['programmer','engineer','itops'],'经管商科':['bank','accountant','hr','finance'],'人文艺术':['designer','writer'],'师范教育':['training','writer']}[s.major]??[]).map(id=>JOB_BY_ID[id]);
  list=[...list,...preferred,...preferred];
 }
 // Public and residency entry has already been adjudicated by career.js.
 if(!['教师','医护','规培医师','公务员','事业编','军人'].includes(s.job))list=list.filter(j=>jobEligible(s,j));
 if(!isProtectedPost(s))list=list.map(j=>JOB_BY_ID[`${j.id}-contract`]??j);
 if(!list.length)list=[JOB_BY_ID.freelancer];
 return list[Math.min(list.length-1,Math.floor(economyDraw(s)*list.length))];
}
function startOccupation(s,j,emit,{paidMonths=12}={}){
 const previous=s.occupation,same=previous&&(JOB_BY_ID[previous.id]?.profession??previous.id)===j.profession;
 const level=same?Math.max(0,Math.min(j.levels.length-1,previous.level)):0;
 s.occupation={...(same?previous:{}),id:j.id,legacy:s.job,employmentType:s.employmentType??null,level,startedAt:s.age,yearsAtLevel:same?previous.yearsAtLevel:0,years:same?previous.years:s.workExperience?.[j.id]??0,percentile:same?previous.percentile:economyDraw(s),paidMonths};
 s.industry=isPublic(s)?'public':j.industry;
 incomeEvent(s,emit,'job-entry',`你开始做${j.name}，从${j.levels[level].title}这一档积累经验。`,{jobId:j.id,level});
}
export const publicOccupation=(s,j=JOB_BY_ID[s.occupation?.id])=>isPublic(s)||['civil','institution','teacher','doctor','nurse','soldier'].includes(j?.profession??j?.id);
export function industryYear(industry,year){
 let code=0;for(const ch of industry)code=Math.imul(code,31)+ch.charCodeAt(0);
 const u=random(hashSeed(code^Math.imul(Math.floor(year/4),0x5bd1e995))).value;
 return {value:u,factor:industry==='public'?.97+u*.06:u<.15?.60:u>.85?1.35:.90+u*.20,label:u<.15?'难熬':u>.85?'顺利':'平常'};
}
export function annualWork(s,emit){
 if(s.workSettledAt===s.age)return;s.workSettledAt=s.age;
 s.occupation=s.occupation?{...s.occupation}:null;
 if(s.age<18){s.income=0;return;}
 if(s.incarceratedUntil>s.age){s.job='待业';s.employmentType='服刑';s.publicEmployer=false;s.income=0;incomeEvent(s,emit,'incarceration','这一年仍在服刑，没有在岗工资。');return;}
 if(s.incarceratedUntil&&s.age>=s.incarceratedUntil&&!s.releasedAt){s.releasedAt=s.age;s.job='待业';s.employmentType='待业';s.publicEmployer=false;const prior=JOB_BY_ID[s.occupation?.id];s.employmentSearch={jobId:prior&&jobEligible(s,prior)?prior.id:'freelancer',monthsLeft:12,startedAt:s.age};incomeEvent(s,emit,'release','服刑结束后，你重新找工作，部分岗位因任职资格未能接续。等待期间没有工资。');}
 if(s.retired){s.income=0;if(!s.lastIncomeObservation?.retired)incomeEvent(s,emit,'retirement','你结束了在岗工作，工资停止，养老金按实际缴费年限和岗位类型结算。');return;}
 if(s.business?.active)return;
 const studying=s.job==='研究生在读'||s.job==='尚未就业'&&s.age<(s.collegeGraduateAge??22);
 if(studying||s.examGapUntil>=s.age){s.income=0;if(s.lastIncomeObservation?.income>0)incomeEvent(s,emit,'study-leave','你离开在岗工作，进入学习或备考空档，这一年没有工资。');return;}
 let paidMonths=12;
 if(isProtectedPost(s))s.employmentSearch=null;
 if(s.employmentSearch){
  const search={...s.employmentSearch};
  if(search.monthsLeft>=12){search.monthsLeft-=12;s.employmentSearch=search;s.income=0;incomeEvent(s,emit,'unemployment','这一年仍在找工作，没有工资收入。',{node:'jobSearch',months:12});return;}
  paidMonths=12-search.monthsLeft;const j=JOB_BY_ID[search.jobId]??JOB_BY_ID.freelancer;
  s.job=j.legacy;s.industry=j.industry;s.employmentType='非编制';s.publicEmployer=false;s.employmentSearch=null;startOccupation(s,j,emit,{paidMonths});
  incomeEvent(s,emit,'reemployment',`找工作用了${search.monthsLeft}个月，之后接上了${j.name}的收入。`,{node:'jobSearch',months:search.monthsLeft});
 }
 if(s.job==='待业'){s.income=0;if(s.lastIncomeObservation?.income>0)incomeEvent(s,emit,'unemployment','你暂时没有在岗工作，这一年没有工资。');return;}
 if(!s.occupation||s.occupation.legacy!==s.job||s.occupation.employmentType!==(s.employmentType??null))startOccupation(s,pickJob(s),emit);
 const o=s.occupation,j=JOB_BY_ID[o.id];o.years++;o.yearsAtLevel++;s.workExperience={...(s.workExperience??{}),[j.id]:o.years};
 const cycle=industryYear(s.industry??j.industry,s.year+s.age);
 if(!isProtectedPost(s)&&s.job!=='规培医师'&&s.age>=23&&economyDraw(s)<WORK_RULES.layoff*(cycle.factor<.8?2:1)){
  const months=4+Math.floor(economyDraw(s)*15);s.employmentSearch={jobId:j.id,monthsLeft:months,startedAt:s.age};s.job='待业';s.industry='unemployed';s.employmentType='待业';s.publicEmployer=false;s.income=0;
  incomeEvent(s,emit,'layoff',`原来的工作结束了。你重新投简历，预计还要经历${months}个月的求职和等待，这段时间没有工资。`,{node:'jobSearch',months});return;
 }
 const next=j.levels[o.level+1];
 if(next&&o.yearsAtLevel>=next.promotion.years&&(s.skills?.craft??0)>=next.promotion.skill){
  const focus=s.focusHistory?.at(-1)?.focus,p=Math.min(WORK_RULES.promotionCap,next.promotion.baseChance+o.yearsAtLevel*.012+(['career','work','side'].includes(focus)?.06:0)+(s.promotionBoostUntil>=s.age?.04:0)+(s.skills?.craft??0)/2000),u=economyDraw(s);
  if(u<p){o.level++;o.yearsAtLevel=0;o.contractAnnual=null;incomeEvent(s,emit,'promotion',`这一轮评审后，你升到${j.levels[o.level].title}。新职责和收入一起变化。`,{node:'promotion',jobId:j.id,level:o.level,dice:[makeDice({id:'promotion',label:'本次晋升机会',p,u,successLabel:'晋升',failureLabel:'未晋升'})]});}
  else if(o.yearsAtLevel%3===0)emit('这次晋升没有轮到你，原来的工作和薪酬水平继续保留。',null,{node:'promotion',jobId:j.id,dice:[makeDice({id:'promotion',label:'本次晋升机会',p,u,successLabel:'晋升',failureLabel:'未晋升'})]});
 }
 if(Number.isFinite(s.salaryNegotiation)&&s.salaryNegotiation<s.age){const p=.40,u=economyDraw(s),pass=u<p;s.salaryNegotiation=null;if(pass){o.percentile=clamp(o.percentile+.08,0,1);o.contractAnnual=null;incomeEvent(s,emit,'salary-negotiation','调薪谈话通过了，新一年的薪酬标准有所提高。',{node:'salaryTalk',dice:[makeDice({id:'salary-talk',label:'本次调薪通过机会',p,u,successLabel:'通过',failureLabel:'未通过'})]});}else emit('这次调薪要求没有通过，原来的收入标准继续保留。',null,{node:'salaryTalk',dice:[makeDice({id:'salary-talk',label:'本次调薪通过机会',p,u,successLabel:'通过',failureLabel:'未通过'})]});}
 const stable=publicOccupation(s,j),old=s.lastIncomeObservation;
 if(old?.income===0&&old.examGap&&!(s.examGapUntil>=s.age))incomeEvent(s,emit,'exam-return','备考结束，回到原来的岗位，工资恢复按在岗月份结算。',{jobId:j.id});
 if(old?.income===0&&old.job==='待业'&&s.job!=='待业'&&!s.employmentSearch)incomeEvent(s,emit,'reemployment','面试后恢复了在岗工作，这一年重新开始领取工资。',{jobId:j.id});
 const [lo,hi]=j.levels[o.level].annual,residency=s.job==='规培医师'?.48:1;
 if(!o.contractAnnual)o.contractAnnual=(lo+(hi-lo)*o.percentile)*(j.upside&&o.percentile>=j.upside.threshold?j.upside.multiple:1)*WORK_RULES.salaryScale*(j.migrant?WORK_RULES.migrantScale:1);
 else o.contractAnnual*=1+(economyDraw(s)-.5)*(stable?.025:j.volatile?.20:.06);
 if(old?.jobId===j.id&&old.city!==s.city)incomeEvent(s,emit,'city-change',`工作生活地点改为${s.city}，本局按当地收入系数调整薪酬。`);
 if(old?.paidMonths>0&&old.paidMonths<12&&paidMonths===12)incomeEvent(s,emit,'full-year-pay','求职空档已经结束，今年按完整十二个月发薪。');
 if(o.residencyFactor!=null&&o.residencyFactor!==residency)incomeEvent(s,emit,'residency-complete','规培阶段结束，在岗收入改按正式岗位结算。');
 o.residencyFactor=residency;o.paidMonths=paidMonths;
 const factor=stable?1:cycle.factor;
 if(o.cycleFactor!=null&&o.cycleFactor!==factor)incomeEvent(s,emit,'industry-cycle',`所在行业进入新的年景周期，岗位薪酬系数由${o.cycleFactor.toFixed(2)}调整为${factor.toFixed(2)}。`);
 o.cycleFactor=factor;const capacity=s.disability?1-Math.min(.6,s.disability):1;if(o.workCapacity!=null&&o.workCapacity!==capacity)incomeEvent(s,emit,'injury-capacity','身体留下的活动限制影响了可承担的工作量，岗位收入按实际能力调整。');o.workCapacity=capacity;
 s.income=Math.round(o.contractAnnual*WORK_RULES.city[s.city]*factor*residency*capacity*paidMonths/12);
 s.lastStableIncome=s.income;s.industryCycle=cycle.label;
}
export function settleDisposableIncome(s){
 if(s.age<18){s.disposableIncome=0;return;}
 if(s.married&&!s.spouseEconomy){const u=economyDraw(s),v=economyDraw(s);s.spouseEconomy={working:u>.20,base:(s.lastStableIncome||s.laborIncome||s.income||30000)*(.5+v*.7),ageGap:Math.round((v-.5)*6)};}
 let spouse=0;
 if(s.married){
  const e={...s.spouseEconomy},spouseAge=s.age+(e.ageGap??0),spouseRetirement=s.sex==='female'?63:55;
  const r={years:0,publicYears:0,enterpriseYears:0,wageTotal:0,...e.pensionRecord};
  if(e.settledAge!==s.age&&e.working&&spouseAge<spouseRetirement){r.years++;r.enterpriseYears++;r.wageTotal+=e.base;r.lastCategory='enterprise';}
  e.settledAge=s.age;e.pensionRecord=r;s.spouseEconomy=e;
  if(e.working&&spouseAge<spouseRetirement)spouse=e.base*(.9+industryYear('service',s.year+s.age).factor*.1)*.85;
  else spouse=pensionEntitlement({age:spouseAge,retired:spouseAge>=spouseRetirement,pensionRecord:r}).annual;
 }
 const studying=s.job==='研究生在读'||s.job==='尚未就业'&&s.age<(s.collegeGraduateAge??22);
 const childSupport=s.retired&&s.kids.some(k=>s.age-k.bornAt>=18)?WORK_RULES.adultChildRemittance:0;
 const support=studying?[8000,12000,18000,30000,60000][s.wealthQ-1]:childSupport|| (s.income===0&&!s.married&&s.age<35?[2000,4000,8000,16000,24000][s.wealthQ-1]:0);
 if(childSupport&&s.money.remittanceSettledAt!==s.age){s.money.remittanceSettledAt=s.age;s.money.familyRemittance=childSupport;s.assets+=childSupport;}
 const household=1+Number(s.married)+s.kids.filter(k=>s.age-k.bornAt<22).length;
 s.disposableIncome=Math.max(0,Math.round(((s.laborIncome??(s.retired?0:s.income))*.85+(s.pensionIncome??0)+spouse+support+(s.money?.investmentIncome??0))/household));
 const old=s.incomeStats??{observations:0,firstBucket:null,minBucket:null,maxBucket:null,largeChange:false,lastIncome:null};
 const stats={...old};
 if(s.income>0||old.observations>0){
  const bucket=Math.floor(s.income/5000);stats.minBucket=stats.minBucket===null?bucket:Math.min(stats.minBucket,bucket);stats.maxBucket=stats.maxBucket===null?bucket:Math.max(stats.maxBucket,bucket);
  if(old.lastIncome!==null&&((old.lastIncome>0&&Math.abs(s.income-old.lastIncome)/old.lastIncome>=.30)||(old.lastIncome===0&&s.income>0))){if(s.incomeReasonAge===s.age&&s.incomeReasons?.length)stats.largeChange=true;else stats.unexplainedLargeChanges=(stats.unexplainedLargeChanges??0)+1;}
  stats.lastIncome=s.income;stats.observations++;
 }
 s.incomeStats=stats;
 if(s.age===40)s.record.economy40={income:s.income,disposableIncome:s.disposableIncome,jobId:s.occupation?.id??null,city:s.city,edu:s.edu,ownsHouse:!!s.ownsHouse};
 const observation={age:s.age,income:s.income,laborIncome:s.laborIncome??s.income,pensionIncome:s.pensionIncome??0,pensionCategory:s.pensionCategory??null,contributionYears:s.pensionRecord?.years??0,disposableIncome:s.disposableIncome,jobId:s.business?.active?s.business.jobId:s.occupation?.id??null,level:s.occupation?.level??null,city:s.city,edu:s.edu,migrant:!!JOB_BY_ID[s.occupation?.id]?.migrant,job:s.job,retired:!!s.retired,public:isProtectedPost(s),employmentType:s.employmentType??null,examGap:!!(s.examGapUntil>=s.age),volatile:!!JOB_BY_ID[s.occupation?.id]?.volatile,paidMonths:s.occupation?.paidMonths??0,reasons:s.incomeReasonAge===s.age?[...(s.incomeReasons??[])]:[]};
 s.lastIncomeObservation=observation;
 if(s.capture!==false||s.trackIncome)s.incomeHistory=[...(s.incomeHistory??[]),observation];
}
