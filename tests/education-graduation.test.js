import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {drawCards} from '../src/engine/cards.js';
import {resolveEducationAction,annualEducation} from '../src/engine/education-paths.js';
import {annualCareer} from '../src/engine/career.js';
import {random} from '../src/engine/rng.js';
import {STUDENT_FINANCE_CARDS} from '../src/content/cards/student-finance.js';

const person = (patch={}) => {
 const base=createBirth('沪-2026-123456');
 return {...base,age:18,edu:'bachelor',collegeGraduateAge:22,job:'尚未就业',assets:100000,capture:false,...patch,record:{...base.record,completed:true,collegeEnrolledAt:18,...patch.record}};
};
const seedFor = (predicate,n=1) => {let seed=1;for(;;seed++){let r={seed};for(let i=0;i<n;i++)r=random(r.seed);if(predicate(r.value))return seed;}};
function action(s,name,{pass=true}={}) {
 s.educationAction=name;s.cardRngState=seedFor(u=>pass?u<.01:u>.99);
 const events=[];resolveEducationAction(s,(text,stat,meta)=>events.push({text,stat,...meta}));return events;
}
function annual(s,age){s.age=age;const events=[];annualEducation(s,(text,stat,meta)=>events.push({text,stat,...meta}));return events;}
const current=s=>s.educationFinance.studentLoan;
const freeze=x=>{if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};

test('真实卡主路径：本科20岁推免只预录取，22岁开学后才出现研究生费用卡',()=>{
 let s=person({age:20,gradePct:95,cardRngState:seedFor(u=>u<.01,2),cardSeeds:[{cardId:'college-recommendation',atAge:20}]});
 s=drawCards(s);assert.equal(s.pending.id,'college-recommendation');
 s=step(freeze(s),{choice:'apply'}).state;
 assert.equal(s.record.masterAdmitted,true);assert.equal(s.masterPlan.started,false);
 assert.equal(s.job,'尚未就业');assert.equal(s.masterStartedAt,undefined);assert.equal(s.masterGraduateAge,undefined);
 const gradCard=STUDENT_FINANCE_CARDS.find(c=>c.id==='graduate-tuition');assert.equal(gradCard.when(s),false);
 const plan=s.masterPlan;action(s,'recommendation');assert.deepEqual(s.masterPlan,plan,'预录取后不得重复进入新计划');
 annual(s,21);assert.equal(s.masterStartedAt,undefined);
 annual(s,22);assert.equal(s.masterStartedAt,22);assert.equal(s.masterGraduateAge,25);assert.equal(s.job,'研究生在读');assert.equal(gradCard.when(s),true);
 action(s,'grad-tuition-loan');assert.equal(current(s).startAge,22);assert.equal(current(s).balance,16000);
 annual(s,23);annual(s,24);assert.equal(current(s).balance,48000);
 annualCareer(s,()=>.99,()=>{});assert.equal(s.edu,'bachelor','24岁仍不能算研究生毕业');
 s.age=25;annualCareer(s,()=>.99,()=>{});annual(s,25);assert.equal(s.edu,'master');
 assert.equal(current(s).lastAnnual.principalDue,0);
 annual(s,29);assert.equal(current(s).lastAnnual.principalDue,0);
 annual(s,30);assert.ok(current(s).lastAnnual.principalDue>0);
});

test('医学五年加参军两年：顺延本科和预录取，军中停贷、回校续读且实际毕业才开研',()=>{
 const s=person();action(s,'tuition-loan');
 s.collegeGraduateAge=23;action(s,'medical-program');assert.equal(current(s).programYears,5);
 annual(s,19);action(s,'recommendation');assert.equal(s.masterPlan.startAge,23);
 action(s,'college-enlist');assert.equal(s.militaryService.active,true);assert.equal(s.collegeGraduateAge,25);
 assert.equal(current(s).graduationAge,25);assert.equal(current(s).programYears,5);
 const disbursed=current(s).totalDisbursed;
 annual(s,20);assert.equal(current(s).totalDisbursed,disbursed);assert.equal(s.masterStartedAt,undefined);
 annual(s,21);assert.equal(s.militaryService.active,false);assert.equal(s.veteran,true);assert.ok(current(s).totalDisbursed>disbursed);
 annual(s,22);annual(s,23);annual(s,24);assert.equal(s.masterStartedAt,undefined);assert.equal(current(s).fundedYears,5);
 annual(s,25);assert.equal(s.masterStartedAt,25);assert.equal(s.masterGraduateAge,28);
});

test('本科继续国内全日制读研：旧账户在校贴息，旧期限不覆盖，新账户独立毕业宽限',()=>{
 const s=person();action(s,'tuition-loan');for(const age of [19,20,21])annual(s,age);
 current(s).lpr=.03;const oldDeadline=current(s).maturityAge;
 s.age=22;action(s,'recommendation');annual(s,22);
 assert.equal(current(s).lastAnnual.interestSubsidized,true);assert.equal(current(s).lastAnnual.interest,0);
 action(s,'grad-tuition-loan');assert.equal(s.educationFinance.studentLoans.length,2);assert.equal(s.educationFinance.loanBalance,48000);
 current(s).lpr=.03;annual(s,23);annual(s,24);
 const old=s.educationFinance.studentLoans[0];assert.equal(old.balance,32000);assert.equal(old.maturityAge,oldDeadline);assert.equal(old.graduationAge,22);assert.equal(old.lastAnnual.interest,0);assert.equal(old.lastAnnual.interestSubsidized,true);
 s.age=25;annualCareer(s,()=>.99,()=>{});annual(s,25);
 assert.equal(s.educationFinance.studentLoans[0].lastAnnual.interest,736);
 assert.equal(current(s).lastAnnual.interest,1104);assert.equal(current(s).lastAnnual.principalDue,0);
});

test('在职研实际开学后保留工作，费用逐年记录，不套用全日制国家新贷或贴息',()=>{
 const s=person({age:27,job:'企业职员',industry:'service'});action(s,'parttime-master');
 assert.equal(s.masterStartedAt,27);assert.equal(s.masterGraduateAge,30);assert.equal(s.job,'企业职员');assert.equal(s.masterStudyMode,'parttime');
 const gradCard=STUDENT_FINANCE_CARDS.find(c=>c.id==='graduate-tuition');assert.equal(gradCard.when(s),true);assert.equal(gradCard.options.find(o=>o.id==='loan').requires(s),false);
 action(s,'grad-tuition-loan');assert.equal(s.educationFinance.studentLoans?.length??0,0);
 action(s,'grad-tuition-family');annual(s,28);annual(s,29);annual(s,29);
 assert.equal(s.educationFinance.familySpent,48000);assert.equal(s.educationFinance.gradTuitionPaidByYear.length,3);assert.equal(s.job,'企业职员');
 s.age=30;annualCareer(s,()=>.99,()=>{});assert.equal(s.edu,'master');assert.equal(s.job,'企业职员');
});

test('海外本科独立四年学制与每年30万费用，不伪造国内高考或985计数',()=>{
 const s=person({age:19,edu:'985',collegeGraduateAge:22,wealthQ:5,record:{admitted:true,elite:true,gaokao:true}});
 const before={admitted:s.record.admitted,elite:s.record.elite,gaokao:s.record.gaokao};
 const logs=action(s,'overseas-undergrad');assert.ok(logs.some(e=>e.text.includes('海外本科录取')));
 assert.equal(s.edu,'bachelor');assert.equal(s.overseasUniversity,'海外大学');assert.equal(s.collegeGraduateAge,23);assert.equal(s.masterGraduateAge,undefined);
 assert.deepEqual({admitted:s.record.admitted,elite:s.record.elite,gaokao:s.record.gaokao},before);
 assert.equal(s.educationFinance.familySpent,300000);
 for(const age of [20,21,22])annual(s,age);
 assert.equal(s.educationFinance.familySpent,1200000);annual(s,23);assert.equal(s.educationFinance.familySpent,1200000);
 const noDomestic=person({age:18,edu:'high',record:{admitted:false,elite:false,gaokao:false}});action(noDomestic,'overseas-undergrad');assert.equal(noDomestic.record.admitted,false);assert.equal(noDomestic.record.elite,false);assert.equal(noDomestic.record.gaokao,false);
});

test('海外本科失败保留原路线，已毕业者和重复申请不能重新获得四年学籍',()=>{
 const s=person({age:20});const logs=action(s,'overseas-undergrad',{pass:false});
 assert.ok(logs.some(e=>e.text.includes('没有拿到录取')));assert.equal(s.collegeGraduateAge,22);assert.equal(s.overseasUndergrad,undefined);
 action(s,'overseas-undergrad');assert.equal(s.overseasUndergrad,undefined);
 const finished=person({age:25,collegeGraduateAge:22});action(finished,'overseas-undergrad');assert.equal(finished.overseasUndergrad,undefined);
});
