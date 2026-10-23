import {random,hashSeed} from './rng.js';
import {isBachelor,probability,attribution} from './education.js';
import {makeDice} from './dice.js';
import {EDUCATION_RULES} from '../content/education-rules.js';
import {openStudentLoan,annualStudentLoan,extendStudentLoanStudy,compensateMilitaryTuition} from './student-loans.js';
import {P} from './params.js';
import {ensureHighSchoolLocation,specialPlanEligible} from './school-location.js';
export function contentDraw(s){const r=random(s.cardRngState??hashSeed(s.seed^0x5bd1e995));s.cardRngState=r.seed;return r.value;}
const schoolCost=18000;
const GRAD_YEARS=3;
const DOMESTIC_GRAD_ANNUAL_FEE=16000; // Simulation expense parameter; not a loan cap.
const OVERSEAS_ANNUAL_TUITION=300000; // Explicit scenario parameter pending fee data.
const graduateActive=s=>Number.isFinite(s.masterStartedAt)&&s.age>=s.masterStartedAt&&s.age<s.masterGraduateAge;
function chargeFamilyYear(s,key,amount){
 const f=s.educationFinance??{},ledger=f[key]??[];
 if(ledger.some(x=>x.year===s.age))return;
 s.educationFinance={...f,familySpent:(f.familySpent??0)+amount,[key]:[...ledger,{year:s.age,amount}]};
}
function startMasterProgram(s,emit){
 const plan=s.masterPlan;
 if(!plan||plan.started)return;
 const startAge=Math.max(plan.startAge,s.collegeGraduateAge??s.age,s.militaryService?.active?s.militaryService.returnAge:0);
 s.masterPlan={...plan,startAge};
 if(s.age<startAge||s.militaryService?.active)return;
 s.masterPlan={...s.masterPlan,started:true,startAge:s.age};
 s.masterStartedAt=s.age;s.masterGraduateAge=s.age+GRAD_YEARS;
 s.masterStudyMode=plan.parttime?'parttime':'fulltime';s.masterStudyAbroad=plan.route==='overseas-application';
 s.educationFinance={...s.educationFinance,gradTuitionOffered:false};s.preparation=null;
 if(!plan.parttime){s.job='研究生在读';s.industry='education';}
 emit(plan.parttime?'在职研究生课程正式开始了。你保留原来的工作，用接下来三年完成课程与考核。':'本科阶段结束后，你正式进入研究生课堂。接下来的三年，要继续完成课程和论文。',null,{node:'master',reason:'actual-enrollment'});
}
function normalizeMasterProgram(s){
 // Career exam admission already starts a real three-year program immediately.
 if(s.job==='研究生在读'&&s.masterGraduateAge>s.age&&!Number.isFinite(s.masterStartedAt)){
  s.masterStartedAt=s.masterGraduateAge-GRAD_YEARS;s.masterStudyMode='fulltime';
 }
}
export function schoolAlternative(s,choice,emit){
 const routes={'repeat-junior':'repeat',private:'private',vocational:'vocational',talent:'talent',international:'international',work:'work'};
 s.schoolRoute=routes[choice];
 if(choice==='work'){s.record.stage=false;s.record.general=false;s.edu='junior';s.job='工厂工人';emit('你把招生简章收起来，先去工作。成年后仍可以通过继续教育回到课堂。');return;}
 if(choice==='repeat-junior'){s.repeatJunior=true;s.record.stage=false;s.edu='junior';emit('你留下初三的课本，多读一年。家里也要重新安排这一年的生活费。');return;}
 s.record.stage=true;s.record.privateGeneral=choice==='private';s.record.publicGeneralEver=choice==='talent';s.record.general=['private','talent'].includes(choice);s.edu=choice==='international'||s.record.general?'high':'vocational';
 if(choice==='private'){s.educationFinance={...s.educationFinance,annualSchoolFee:schoolCost,familySpent:(s.educationFinance?.familySpent??0)+schoolCost};emit('家里凑出了第一年的民办高中学费。每年一万八千元，需要继续安排。');}
 if(choice==='talent'){s.educationRoute='talent';emit('你拿着从小练习积累的作品或成绩，走进艺体方向的课堂。文化课仍然要学。');}
 if(choice==='international'){s.educationRoute='international';s.educationFinance={...s.educationFinance,annualSchoolFee:120000};emit('家里承担了国际学校的费用。语言考试和申请材料，成了新的日常。');}
 if(choice==='vocational'){s.major=s.major??['汽修','护理','电商','烹饪'][Math.floor(contentDraw(s)*4)];emit(`你选择了中职的${s.major}方向，课表里多了实训课。`);}
}
export function annualEducation(s,emit){
 if(s.repeatJunior&&s.age===16){const p=probability(s,'general'),u=contentDraw(s),cause=attribution(s,'general',u);s.record.stage=true;s.record.general=u<p;s.record.publicGeneralEver=s.record.general;s.edu=s.record.general?'high':'vocational';emit(s.record.general?'重新参加中考后，你进入普通高中，比同龄人晚一年开始。':'重新参加中考后，你转入中职，继续学习一门技能。',null,{node:'school',reason:cause.dominant,probability:cause.probability,draw:u,contributions:cause.contributions,dice:[makeDice({id:'junior-repeat',label:'再次中考普通高中录取概率',p,u,contributions:{},successLabel:'普通高中录取',failureLabel:'转入中职'})]});}
 if(s.adultEducation?.graduationAge===s.age){const p=.02+Math.min(.02,(s.skills?.study??0)/5000),u=contentDraw(s),pass=u<p;emit(pass?'边工作边学习的课程结束了，你通过考核，拿到了继续教育本科文凭。':'这一轮继续教育考核没有通过，你保留教材，重新安排工作和学习。',null,{node:'educationPath',dice:[makeDice({id:'adult-graduation',label:'继续教育完成机会',p,u,contributions:{},successLabel:'完成本科',failureLabel:'本次未通过'})]});if(pass){s.edu='bachelor';s.educationFinance={...s.educationFinance};}}
 if(s.militaryService?.active&&s.age>=s.militaryService.returnAge){s.militaryService={...s.militaryService,active:false};s.veteran=true;s.record.veteran=true;s.job='尚未就业';s.industry='education';emit('两年服役结束，你回到学校，继续把原来的课程读完。');}
 startMasterProgram(s,emit);normalizeMasterProgram(s);
 const serving=s.militaryService?.active===true;
 const studyingGraduate=graduateActive(s);
 const overseasUndergrad=s.overseasUndergrad&&s.age>=s.overseasUndergrad.startedAt&&s.age<s.overseasUndergrad.graduationAge;
 const f=s.educationFinance??{};
 if(!serving&&!overseasUndergrad&&!studyingGraduate&&f.tuitionFunding==='family'&&s.age<(s.collegeGraduateAge??f.undergradGraduationAge))chargeFamilyYear(s,'tuitionPaidByYear',8000);
 if(!serving&&overseasUndergrad)chargeFamilyYear(s,'overseasTuitionPaidByYear',s.overseasUndergrad.annualTuition);
 if(studyingGraduate&&s.educationFinance.gradTuitionFunding==='family')chargeFamilyYear(s,'gradTuitionPaidByYear',s.educationFinance.gradAnnualFee??DOMESTIC_GRAD_ANNUAL_FEE);
 const subsidizedGraduate=studyingGraduate&&s.masterStudyMode!=='parttime'&&!s.masterStudyAbroad;
 Object.assign(s,annualStudentLoan(s,{suspended:serving||Boolean(overseasUndergrad),inSchoolAll:subsidizedGraduate}));
 if(s.veteran&&s.educationFinance?.militaryEligible)Object.assign(s,compensateMilitaryTuition(s,{tuitionPaidByYear:s.educationFinance.tuitionPaidByYear}));
 if(!serving&&s.collegeGraduateAge===s.age&&s.job==='尚未就业'){s.job='待业';s.industry='unemployed';}
 const payment=s.educationFinance?.studentLoan?.lastAnnual;
 if(payment?.age===s.age&&payment.principalDue>0&&payment.principalPayment<payment.principalDue)emit('今年的助学贷款没有足额还款，你需要联系贷款机构重新安排。');

}
export function resolveEducationAction(s,emit){
 let action=s.educationAction;if(action==='postgrad-application')action='postgrad-preparation';if(!action)return;s.educationAction=null;
 const dice=(id,p,success,failure)=>{const u=contentDraw(s),pass=u<p;emit(pass?success:failure,null,{node:'educationPath',dice:[makeDice({id,label:'本次继续升学机会',p,u,contributions:{},successLabel:'录取',failureLabel:'本次未录取'})]});return pass;};
 s.educationFinance={...(s.educationFinance??{})};
 if(action.startsWith('tuition-')){
  s.educationFinance.tuitionOffered=true;const fee=8000;
  if(action==='tuition-loan'){
   const level=s.edu==='college'?'college':'undergrad',years=Math.max(1,(s.collegeGraduateAge??s.age+(level==='college'?3:4))-s.age);
   Object.assign(s,openStudentLoan(s,{level,years,annualNeed:fee,annualTuition:fee,graduationAge:s.collegeGraduateAge??s.age+years}));
   emit('你按实际学费申请助学贷款。本专科每年最多两万元，按学年发放；毕业后有五年还本宽限期。');
  }
  if(action==='tuition-family'){s.educationFinance={...s.educationFinance,tuitionFunding:'family',undergradGraduationAge:s.collegeGraduateAge??s.age+4,familySpent:(s.educationFinance.familySpent??0)+fee,tuitionPaidByYear:[...(s.educationFinance.tuitionPaidByYear??[]),{year:s.age,amount:fee}]};emit('家里承担了今年的学费，你把缴费凭据放进文件袋，以后逐年安排。');}
  if(action==='tuition-work'){s.educationFinance.workStudy=true;s.skills={...s.skills,craft:(s.skills?.craft??0)+4};emit('你申请勤工俭学，把课余时间排进了图书馆或食堂的值班表。');}
  if(action==='tuition-leave'){s.edu=s.previousEducation??'high';s.educationFinance.leftForFees=true;s.job='工厂工人';emit('你没有办理入学，把录取通知收起来，先去工作。');}
 }else if(action==='cadre-campaign'){const p=.5,u=contentDraw(s);s.studentCadre=u<p;emit(s.studentCadre?'同学投票后，你当选了班委。组织活动和协调日常问题，成了课程以外的一份责任。':'班委选举结果公布，这次没有当选，你继续原来的学习安排。',null,{node:'educationPath',dice:[makeDice({id:'student-cadre',label:'本次班委选举机会',p,u,contributions:{},successLabel:'当选',failureLabel:'未当选'})]});
 }else if(action==='grad-tuition-loan'){
  normalizeMasterProgram(s);
  if(!graduateActive(s)||s.masterStudyMode==='parttime'||s.masterStudyAbroad){emit('当前学籍不属于这项全日制国内研究生贷款的适用范围，先核对费用和其他资助。');return;}
  if(s.educationFinance.gradTuitionOffered)return;
  s.educationFinance.gradTuitionOffered=true;
  Object.assign(s,openStudentLoan(s,{level:'grad',years:Math.max(1,s.masterGraduateAge-s.age),graduationAge:s.masterGraduateAge,annualNeed:DOMESTIC_GRAD_ANNUAL_FEE,annualTuition:DOMESTIC_GRAD_ANNUAL_FEE}));
  emit('研究生助学贷款按实际费用逐年发放，每年最多二万五千元。原有本专科借款仍按各自期限保留。');
 }else if(action==='grad-tuition-family'){
  normalizeMasterProgram(s);if(!graduateActive(s)||s.educationFinance.gradTuitionOffered)return;
  s.educationFinance={...s.educationFinance,gradTuitionOffered:true,gradTuitionFunding:'family',gradAnnualFee:s.masterStudyAbroad?OVERSEAS_ANNUAL_TUITION:DOMESTIC_GRAD_ANNUAL_FEE};
  chargeFamilyYear(s,'gradTuitionPaidByYear',s.educationFinance.gradAnnualFee);
  emit('你安排了今年研究生阶段的费用，把单据收好。之后按实际在读学年逐年安排。');
 }else if(action==='medical-program'){const loan=s.educationFinance.studentLoan;if(loan&&loan.level!=='grad'&&s.collegeGraduateAge>loan.graduationAge)Object.assign(s,extendStudentLoanStudy(s,s.collegeGraduateAge-loan.graduationAge,{reason:'medical-program',additionalFunding:true}));
 }else if(action==='college-enlist'){
  if(s.record.criminalRecord||s.criminalRecord){emit('审核未通过，入伍申请没有继续办理。');return;}
  const p=.65,u=contentDraw(s);if(u<p){
   const returnAge=s.age+2;s.collegeGraduateAge=(s.collegeGraduateAge??s.age+2)+2;Object.assign(s,extendStudentLoanStudy(s,2,{reason:'military'}));
   Object.assign(s,compensateMilitaryTuition(s,{tuitionPaidByYear:s.educationFinance.tuitionPaidByYear}));
   s.militaryService={active:true,startedAt:s.age,returnAge};s.educationFinance.militaryEligible=true;s.record.militaryService=true;s.job='军人';s.industry='military';
   emit('报名和体检审核通过，你保留学籍入伍。学费按实际已缴或已贷金额补偿，退伍后继续读书。',null,{node:'military',dice:[makeDice({id:'student-enlist',label:'本次报名审核通过机会',p,u,contributions:{},successLabel:'通过审核',failureLabel:'本次未通过'})]});
  }else emit('这次征兵审核没有通过，你继续原来的课程。',null,{node:'military',dice:[makeDice({id:'student-enlist',label:'本次报名审核通过机会',p,u,contributions:{},successLabel:'通过审核',failureLabel:'本次未通过'})]});
 }else if(action==='fee-waiver'||action==='grant'){s.educationFinance.grants=(s.educationFinance.grants??0)+(action==='grant'?6000:3000);emit('免除的费用和这笔资助，让你能把下一学期先读下去。');}
 else if(action==='competition'){
  s.competitionLevel=(s.skills?.study??0)>=15?'省一等奖':'校内选拔';s.competitionEligible=s.competitionLevel==='省一等奖';emit(`你参加了学科竞赛，这次取得${s.competitionLevel}的结果。后续申请仍需满足招生要求。`);
 }else if(action==='special-admission'){ensureHighSchoolLocation(s);s.specialPlan=specialPlanEligible(s);emit(s.specialPlan?'老师帮你核对了农村户籍、县中学籍和成绩要求。你多了一次提交申请的机会，录取仍需判定。':'核对资格后，这次没有符合专项计划的条件，你继续准备常规申请。');}
 else if(['arts-training','sports-training'].includes(action)){s.educationRoute=action==='arts-training'?'arts':'sports';emit('你把专业训练排进课表，文化课也要继续准备。');}
 else if(action==='dropout-high'){s.record.stage=true;s.record.completed=false;s.highDropout=true;s.edu='junior';s.job='工厂工人';emit('你办理了离校，先去工作。继续教育的门并没有因此关上。');}
 else if(['adult-degree','self-study','open-university','night-school'].includes(action)){
  if(isBachelor(s)){emit('你已经有本科阶段学历，这次选择了一门继续教育课程。');return;}
  if(s.assets<6000){emit('这次的学习费用还没有凑够，你先把招生资料留下。');return;}
  s.assets-=6000;s.adultEducation={...s.adultEducation,route:action,enrolledAt:s.age,graduationAge:s.age+3};emit('你交了这一阶段的学习费用，报名后要用三年时间，边工作边准备考核。');
 }else if(action==='overseas-undergrad'){
  const enrolledUndergrad=['college','bachelor','211','985'].includes(s.edu)&&s.age<(s.collegeGraduateAge??23);
  if(s.age<18||(!enrolledUndergrad&&(!s.record.completed||['college','bachelor','211','985','master'].includes(s.edu)))||s.educationFinance.overseasUndergradApplied||s.militaryService?.active||s.record.masterAdmitted){emit('这次海外本科申请没有进入受理：需要先完成高中阶段或仍在本科阶段，且当前不在服役。');return;}
  s.educationFinance.overseasUndergradApplied=true;
  const p=.22; // Scenario admission parameter, not a measured university rate.
  if(dice('overseas-undergrad',p,'海外本科录取通知到了。你开始准备四年的课程与费用。','这次海外本科申请没有拿到录取，原来的学历与学习安排保持不变。')){
   s.overseasUndergrad={startedAt:s.age,graduationAge:s.age+4,annualTuition:OVERSEAS_ANNUAL_TUITION};
   s.overseasUniversity='海外大学';s.collegeGraduateAge=s.age+4;s.edu='bachelor';s.job='尚未就业';s.industry='education';
   s.educationFinance={...s.educationFinance,tuitionOffered:true,tuitionFunding:'overseas-family'};
   s.record.overseasUndergradAdmitted=true;
   chargeFamilyYear(s,'overseasTuitionPaidByYear',OVERSEAS_ANNUAL_TUITION);
  }
 }else if(['parttime-master','recommendation','overseas-application'].includes(action)){
  if(!isBachelor(s)||s.edu==='master'||s.record.masterAdmitted||s.masterPlan){emit('你已经有明确的研究生学习安排，或尚不符合本次申请条件，不再重复申请。');return;}
  const affordable=action!=='overseas-application'||s.wealthQ===5;
  const p=action==='recommendation'?.08:action==='overseas-application'?.12:.06;
  if(affordable&&dice(action,p,'研究生申请通过了。正式入学会安排在本科实际完成之后，课程需要三年。','这次申请没有拿到录取，你保留原来的学历和工作安排。')){
   s.record.masterAdmitted=true;s.preparation=null;
   s.masterPlan={route:action,startAge:Math.max(s.age,s.collegeGraduateAge??s.age),years:GRAD_YEARS,parttime:action==='parttime-master',started:false};
   startMasterProgram(s,emit);
  }
 }else if(action==='postgrad-preparation'){if(!s.record.masterAdmitted&&!s.masterPlan&&s.edu!=='master')s.preparation={kind:'master',startedAt:s.age,lastExamAge:s.age};
 }else if(action==='private-tutor'){s.educationFinance.familySpent=(s.educationFinance.familySpent??0)+24000;emit('家里支付了私教费用，老师按你的进度安排课程。');
 }else if(action==='certificate'){s.skills={...s.skills,craft:(s.skills?.craft??0)+3};emit('你完成了一段考证准备，把练习和工作安排在了一起。');
 }else if(action==='arts-exam'||action==='sports-exam'){const p=.22+Math.min(.3,(s.skills?.[action==='arts-exam'?'art':'sports']??0)/100);s.talentQualified=dice(action,p,'专业测试达到了申请要求，接下来仍需参加文化课和录取审核。','这次专业测试没有达标，你继续保留普通升学路线。');
 }else if(action==='private-school'){
  if(s.age<15){s.educationRoute='private';s.educationFinance.familySpent=(s.educationFinance.familySpent??0)+18000;emit('家里安排了民办课程的准备，正式高中入学仍要等中考后的决定。');}else if(s.wealthQ>=3)schoolAlternative(s,'private',emit);else emit('家里暂时拿不出这笔学费，你继续原来的学习安排。');
 }else if(action==='international-school'){
  if(s.age<15){s.educationRoute='international';s.educationFinance.familySpent=(s.educationFinance.familySpent??0)+120000;emit('家里为国际课程预留了费用，你先开始语言准备，正式高中入学以后再决定。');}else if(s.hukou==='urban'&&s.wealthQ===5)schoolAlternative(s,'international',emit);else emit('核对费用后，这次没有选择国际学校。');
 }
}
// Extra admissions use a genuine second draw, and are included in the same final
// admitted/gaokao counters as the ordinary entrance route.
export function extraAdmission(s,emit){
 if(s.record.admitted)return;
 const route=s.specialPlan&&specialPlanEligible(s)?'special':s.competitionEligible?'competition':s.talentQualified?'talent':null;if(!route)return;
 const p=route==='special'?EDUCATION_RULES.specialSuccess:route==='competition'?EDUCATION_RULES.competitionSuccess:EDUCATION_RULES.talentSuccess,u=contentDraw(s),pass=u<p;
 emit(pass?'另一份录取结果到了，你通过补充渠道走进了本科课堂。':'补充申请的结果也公布了，这次没有获得录取。',null,{node:'exam',reason:'chance',dice:[makeDice({id:route,label:route==='special'?'专项录取机会':'竞赛招生机会',p,u,contributions:{},successLabel:'本科录取',failureLabel:'未录取'})]});
 if(pass){s.edu='bachelor';s.record.admitted=true;s.record[route==='special'?'specialAdmitted':route==='competition'?'competitionAdmitted':'talentAdmitted']=true;}
}
