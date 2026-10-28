import {random,hashSeed} from '../../engine/rng.js';
import {isProtectedPost} from '../../engine/employment.js';
import {copyEconomy,financialAction} from '../../engine/money.js';

// Household amounts and deterministic opportunity rates are game parameters.
export const LATE_FAMILY_RULES={status:'参数',medicalOutOfPocket:60000,inheritanceByWealth:[2000,10000,40000,120000,400000]};
const kids=s=>s.kids??[];
const atChildAge=(s,age)=>s.age>=18&&kids(s).some(k=>s.age-k.bornAt===age);
const childPatch=(s,age,patch)=>({kids:kids(s).map(k=>s.age-k.bornAt===age?{...k,...(typeof patch==='function'?patch(k):patch)}:{...k})});
const opportunity=(s,salt,p)=>random(hashSeed(s.seed^salt)).value<p;
const livingParents=s=>Object.entries(s.parents??{}).filter(([,p])=>p.alive);
const deceasedRole=s=>Object.keys(s.parents??{}).find(role=>!s.parents[role].alive&&!s.record?.inheritanceClaimed?.[role]);
export const inheritanceAmount=s=>Math.floor(LATE_FAMILY_RULES.inheritanceByWealth[(s.wealthQ??1)-1]/((s.siblings??0)+1));
const medicalParent=s=>livingParents(s).sort((a,b)=>b[1].age-a[1].age)[0]?.[0];
function carePatch(s,paid){const role=medicalParent(s);return {record:{parentMedicalPaid:(s.record?.parentMedicalPaid??0)+paid,parentMedicalRole:role??null},parents:Object.fromEntries(Object.entries(s.parents??{}).map(([key,p])=>[key,{...p,...(key===role?{health:Math.min(85,(p.health??50)+15)}:{})}]))};}
function saleForCare(s){const sold=financialAction(copyEconomy(s),{action:'house-sell'});return {...carePatch(s,60000),assets:sold.assets-60000,money:sold.money,ownsHouse:false,mortgage:0,economyRngState:sold.economyRngState,inputHistory:sold.inputHistory};}
const canSellForCare=s=>!!s.ownsHouse&&s.assets+(copyEconomy(s).money.property?.value??0)*.85-(copyEconomy(s).money.mortgage?.balance??0)>=60000;
const card=(id,stage,when,title,body,options,extra={})=>({id,stage,when,title,body,options,priority:12,weight:()=>1,cooldown:100,maxPerLife:1,...extra});
export const LATE_FAMILY_CARDS=[
 card('midlife-fallback','midlife',s=>s.age===36&&!s.retired&&!isProtectedPost(s),'给自己留一条退路','熟悉的工作做了多年。你开始考虑，下一份收入能靠什么接上。',[
  {id:'craft',label:'花时间学一门能接活的手艺',hint:'支出3000元，积累技能',cost:3000,effects:s=>({skills:{craft:(s.skills?.craft??0)+6},record:{fallbackPlan:'craft'}})},
  {id:'contacts',label:'整理以前合作过的人和项目',hint:'建立接活准备，增加社交经验',effects:s=>({attrs:{social:Math.min(100,s.attrs.social+4)},record:{fallbackPlan:'contacts'}})},
  {id:'steady',label:'先把手头的工作做好',hint:'保留现有安排',effects:()=>({record:{fallbackPlan:'current-job'}})},
 ]),
 card('family-child-care','adult',s=>atChildAge(s,1),'孩子白天由谁照看？','工作、照护和团聚需要放进同一张日程表。',[
  {id:'parents',label:'自己和伴侣轮流带',hint:'为照护留出时间',effects:s=>childPatch(s,1,{careBy:'parents',leftBehind:false})},
  {id:'grandparents',label:'接老人过来一起带',hint:'支出3000元安顿老人',cost:3000,requires:s=>livingParents(s).length>0,effects:s=>childPatch(s,1,{careBy:'grandparents',leftBehind:false})},
  {id:'hometown',label:'暂时送回老家，由老人照看',hint:'孩子与父母分住两地',requires:s=>livingParents(s).length>0,effects:s=>childPatch(s,1,{careBy:'left-behind',leftBehind:true})},
 ]),
 card('family-second-child','adult',s=>s.age>=30&&s.age<=40&&s.married&&kids(s).length===1&&s.age-kids(s)[0].bornAt>=3,'要不要再迎接一个孩子？','家里的空间、照护时间和养育开支，都要重新安排。',[
  {id:'keep',label:'先照顾好现在的孩子',hint:'保持家庭安排',effects:()=>({record:{secondChildPlan:'no'}})},
  {id:'child',label:'一起迎接第二个孩子',hint:'支出8000元准备，此后逐年承担养育开支',cost:8000,effects:s=>({kids:[...kids(s).map(k=>({...k})),{bornAt:s.age,hukou:['一线','省会'].includes(s.city)?'urban':'rural',wealthQ:s.wealthQ,careBy:'parents',leftBehind:false,educationInvestment:0,gradeSupport:0}],record:{secondChildPlan:'yes'}})},
 ]),
 card('child-junior-exam','midlife',s=>atChildAge(s,15),'轮到你陪孩子看中考志愿','饭桌上摊开了招生简章。投入金钱、陪伴或者放手，都是不同的安排。',[
  {id:'invest',label:'安排有针对性的学习辅导',hint:'支出12000元，增加孩子的学习支持',cost:12000,effects:s=>childPatch(s,15,k=>({educationInvestment:(k.educationInvestment??0)+12000,gradeSupport:(k.gradeSupport??0)+5,educationStyle:'structured'}))},
  {id:'company',label:'每晚留出时间陪孩子梳理功课',hint:'用陪伴支持学习',effects:s=>childPatch(s,15,k=>({gradeSupport:(k.gradeSupport??0)+2,educationStyle:'company'}))},
  {id:'space',label:'让孩子自己安排，保留倾听时间',hint:'不额外花钱，尊重自己的节奏',effects:s=>({...childPatch(s,15,{educationStyle:'independent'}),attrs:{happy:Math.min(100,s.attrs.happy+2)}})},
 ]),
 card('child-college-exam','midlife',s=>atChildAge(s,18),'孩子也到了填高考志愿的时候','你记得自己当年的选择，这次想先听听孩子怎么说。',[
  {id:'invest',label:'支持继续读书的费用和准备',hint:'支出20000元，增加下一代教育起点',cost:20000,effects:s=>childPatch(s,18,k=>({educationInvestment:(k.educationInvestment??0)+20000,gradeSupport:(k.gradeSupport??0)+4,educationPlan:'continue'}))},
  {id:'together',label:'一起核对学校、费用和兴趣',hint:'不增加花费，增加选择支持',effects:s=>childPatch(s,18,k=>({gradeSupport:(k.gradeSupport??0)+2,educationPlan:'discussed'}))},
  {id:'decide',label:'让孩子自己决定去向',hint:'保留自主选择',effects:s=>childPatch(s,18,{educationPlan:'independent'})},
 ]),
 card('parent-serious-illness','midlife',s=>s.age===44&&livingParents(s).length>0&&opportunity(s,0x3a15bd29,.25),'父母的一次大病治疗','医生把治疗安排和自付账单交到家属手里。本局自付费用参数为60000元。',[
  {id:'savings',label:'拿出积蓄支付治疗',hint:'支出60000元',cost:60000,effects:s=>carePatch(s,60000)},
  {id:'sell',label:'出售住房，结清房贷后支付治疗',hint:'按实际成交房款结算，支付60000元',requires:canSellForCare,effects:s=>saleForCare(s)},
  {id:'basic',label:'先支付当前能承担的诊疗',hint:'支出8000元，分阶段安排',cost:8000,effects:s=>carePatch(s,8000)},
  {id:'discuss',label:'和家人商量筹款与照护',hint:'暂不发生支出，记录待筹费用',effects:()=>({record:{parentMedicalFundingPending:60000}})},
 ],{heavy:true,category:'serious-illness'}),
 card('parent-care-arrangement','midlife',s=>s.age===50&&livingParents(s).some(([,p])=>p.age>=65),'父母需要更固定的照护','电话里说起买菜、复诊和夜里起身的事，你们开始安排接下来的日子。',[
  {id:'together',label:'接来同住，安排日常照护',hint:'支出5000元安顿住处',cost:5000,effects:()=>({record:{parentCare:'cohabit'}})},
  {id:'siblings',label:'和兄弟姐妹排好轮流照护',hint:'共同承担时间和安排',requires:s=>s.siblings>0,effects:()=>({record:{parentCare:'siblings'}})},
  {id:'visits',label:'定期回家，约好复诊和联络',hint:'支出2000元交通与照护',cost:2000,effects:()=>({record:{parentCare:'visits'}})},
  {id:'calls',label:'先固定每天通话，协调邻里照应',hint:'建立固定联系',effects:()=>({record:{parentCare:'daily-contact'}})},
 ]),
 card('parent-inheritance','midlife',s=>s.age>=35&&!!deceasedRole(s),'整理父母留下的东西',s=>`旧相册和日用品收好后，家人开始核对留下的现金。家人核对可分配现金约为${LATE_FAMILY_RULES.inheritanceByWealth[(s.wealthQ??1)-1]}元，你这一份为${inheritanceAmount(s)}元。`,[
  {id:'accept',label:'按家人核对的份额办理',hint:'只领取这次核对的现金份额',effects:s=>({assets:s.assets+inheritanceAmount(s),record:{inheritanceClaimed:{...(s.record?.inheritanceClaimed??{}),[deceasedRole(s)]:true},inheritanceReceived:(s.record?.inheritanceReceived??0)+inheritanceAmount(s)}})},
  {id:'leave',label:'把这份现金留给在世家人照护',hint:'不增加自己的积蓄',effects:s=>({record:{inheritanceClaimed:{...(s.record?.inheritanceClaimed??{}),[deceasedRole(s)]:true},inheritanceDonated:(s.record?.inheritanceDonated??0)+inheritanceAmount(s)}})},
 ],{heavy:true,category:'bereavement'}),
 card('sibling-borrowing','midlife',s=>s.age===42&&s.siblings>0&&opportunity(s,0x5159a231,.60),'兄弟姐妹来借一笔周转钱','对方说最近手头紧。你知道这笔钱可能不能按时回来。',[
  {id:'lend',label:'借出15000元，写清借款',hint:'支出15000元，未归还前不算现金',cost:15000,effects:s=>({record:{siblingDebt:(s.record?.siblingDebt??0)+15000}})},
  {id:'gift',label:'只拿3000元作为帮忙',hint:'支出3000元，不期待归还',cost:3000,effects:()=>({record:{siblingSupport:3000}})},
  {id:'decline',label:'说明家里的开支，这次不借',hint:'保留自己的现金',effects:()=>({record:{siblingLoanDeclined:true}})},
 ]),
 card('siblings-family-division','midlife',s=>s.age===48&&s.siblings>0,'家里的账和照护责任怎么分？','家人想把共有物品、旧账和照护分工逐项列清，减少往后反复争执。',[
  {id:'write',label:'一起核对凭证，写下分配约定',hint:'只记录核对结果，不凭空增加财产',effects:()=>({record:{familyDivision:'written-agreement'}})},
  {id:'mediate',label:'请熟悉的长辈帮忙协调',hint:'支出1000元交通与见面',cost:1000,effects:()=>({record:{familyDivision:'family-mediation'}})},
  {id:'defer',label:'先处理照护，财产以后再谈',hint:'暂缓分配',effects:()=>({record:{familyDivision:'deferred'}})},
 ]),
 card('return-hometown','midlife',s=>s.age===46&&s.city!=='老家'&&!isProtectedPost(s),'要不要回老家生活？','熟悉的地方有亲友，留下来则能保住眼前的生活圈。换地方后，岗位收入会按所在地结算。',[
  {id:'stay',label:'暂时留在现在的城市',hint:'维持当前生活地点',effects:()=>({record:{hometownPlan:'stay'}})},
  {id:'home',label:'收拾东西，回老家安顿',hint:'支出3000元搬家，往后按老家找到的工作挣钱',cost:3000,effects:()=>({city:'老家',record:{returnedHome:true,hometownPlan:'return'}})},
 ]),
 card('fifty-reemployment','midlife',s=>s.age===50&&!s.retired&&!isProtectedPost(s)&&s.job==='待业'&&!s.employmentSearch,'五十岁，重新找一份工作','你想找一份能接上收入的工作，也想把身体能承受的事情说清楚。',[
  {id:'security',label:'申请附近的保安岗位',hint:'进入求职等待，等待期间没有工资',requires:s=>!s.business?.active,effects:s=>{const next=financialAction(s,{action:'apply-job',jobId:'security'});return {job:next.job,industry:next.industry,employmentType:next.employmentType,publicEmployer:next.publicEmployer,employmentSearch:next.employmentSearch,economyRngState:next.economyRngState,income:next.income,inputHistory:next.inputHistory};}},
  {id:'learn',label:'先练好一门能接单的技能',hint:'增加手艺，暂不保证找到工作',effects:s=>({skills:{craft:(s.skills?.craft??0)+4},record:{reemploymentPlan:'learn'}})},
  {id:'wait',label:'先照顾身体，再找合适的活',hint:'增加健康，继续待业',effects:s=>({attrs:{health:Math.min(100,s.attrs.health+3)},record:{reemploymentPlan:'recover'}})},
 ]),
 card('grandchild-care','senior',s=>s.age===64&&kids(s).some(k=>s.age-k.bornAt>=25),'孩子问，能不能帮忙带孙辈？','新一代的哭声和笑声，让家里的时间表又热闹起来。你也可以把自己的体力说清楚。',[
  {id:'help',label:'答应每周固定几天帮忙',hint:'建立照护安排，也给自己留休息',effects:s=>({record:{grandchildCare:'part-time'},attrs:{happy:Math.min(100,s.attrs.happy+4)}})},
  {id:'visit',label:'偶尔探望，不承担日常照护',hint:'保持联络和自己的生活',effects:s=>({record:{grandchildCare:'visits'},attrs:{happy:Math.min(100,s.attrs.happy+2)}})},
 ]),
 card('child-down-payment','midlife',s=>s.age>=50&&kids(s).some(k=>s.age-k.bornAt===28),'孩子在算自己的住房首付','孩子把预算带回家。你们一起看看，家里能帮多少，还要给养老留下多少。',[
  {id:'help',label:'拿出50000元帮一把',hint:'支出50000元，记录给孩子的住房支持',cost:50000,effects:s=>({...childPatch(s,28,k=>({housingSupport:(k.housingSupport??0)+50000})),record:{childDownPayment:50000}})},
  {id:'small',label:'只帮10000元，说明自己的预算',hint:'支出10000元',cost:10000,effects:s=>({...childPatch(s,28,k=>({housingSupport:(k.housingSupport??0)+10000})),record:{childDownPayment:10000}})},
  {id:'budget',label:'陪孩子核对预算，保留养老钱',hint:'不额外支出',effects:()=>({record:{childDownPayment:0}})},
 ]),
 card('elder-residence','senior',s=>s.age===72,'往后的日子，住在哪里？','家人把照护、费用和各自的日常摆到桌面上。你也说出自己最在意的事。',[
  {id:'home',label:'留在熟悉的家，固定联系',hint:'保留自己的生活空间',effects:()=>({record:{elderResidence:'own-home'}})},
  {id:'child',label:'和孩子商量搬去同住',hint:'共同安排照护',requires:s=>kids(s).length>0,effects:()=>({record:{elderResidence:'with-child'}})},
  {id:'facility',label:'试住有照护服务的养老院',hint:'支出18000元首段住宿照护费用',cost:18000,effects:()=>({record:{elderResidence:'care-facility',elderCarePaid:18000}})},
 ]),
 card('family-will','senior',s=>s.age===76,'把身后的安排写清楚','你想把个人财物、照护意愿和重要联系人留一份清楚的记录。',[
  {id:'document',label:'整理清单，依法记录自己的意愿',hint:'记录个人财产安排，具体效力依法审查',effects:()=>({record:{will:'documented'}})},
  {id:'family',label:'先和家人谈谈，再完善记录',hint:'记录已经沟通过的愿望',effects:()=>({record:{will:'discussed'}})},
 ]),
];
