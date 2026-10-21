import { DATA } from './stats.js';
import { P, logistic, logit, clamp } from './params.js';
import { makeDice } from './dice.js';
import { isBachelor } from './education.js';

// These are fitted simulation coefficients, not individual statistical forecasts.
// Helpers are private to step: `s` is the copy created by step, draw is injected.
export const CAREER_DEFAULTS = {
  masterApply: .5, masterRetry: .7, masterBase: 0,
  masterWealth: .08, masterGrade: .12, masterGrind: .12,
  civilApply: .30, civilBase: 0, institutionSuccess: .045,
  civilDegree: .20, civilRegionHigh: -.10, civilRegionOther: .05, civilGrade: .08,
  directPublic: .008, farmBase: .18, gigFallback: .04,
  recoverEmployment: .68,
  layoff: { internet: .27, manufacturing: .14, construction: .19, service: .12, business: .16, agriculture: .04, public: .002 },
};
const params = p => ({ ...CAREER_DEFAULTS, ...(P.career ?? {}), ...(p ?? {}), layoff: { ...CAREER_DEFAULTS.layoff, ...(P.career?.layoff ?? {}), ...(p?.layoff ?? {}) } });
const opt = (id,label,effect) => ({id,label,effect});
export const isPublic = s => ['公务员','事业编','教师','医护'].includes(s.job);
const mayMaster = s => s.age >= 22 && isBachelor(s) && s.edu !== 'master' && s.job !== '研究生在读' && !s.record.masterAdmitted && (s.record.masterAttempts ?? 0) < 2 && s.age <= 26;
const mayCivil = s => s.age >= 22 && s.age <= 35 && !isPublic(s) && s.job !== '研究生在读' && ['college','bachelor','211','985','master'].includes(s.edu);

export function careerDecision(s) {
  if(s.record.careerPlanAge===s.age)return null;
  if(s.job==='研究生在读'||(s.age===22&&s.record.age22))return null;
  if (s.age === 22) {
    const options = [opt('work','找一份工作','投简历，靠收入开始自己的生活')];
    if (mayMaster(s)) options.push(opt('master','准备研究生考试','再读几年书，也可能再等一年'));
    if (mayCivil(s)) options.push(opt('civil','备考公务员 / 事业编','竞争录用，失败会消耗一年时间'));
    options.push(opt('home','回老家找活','务农、做小生意或在附近就业'));
    return { id:'career',title:'离开校园之后，你准备怎么生活？',options };
  }
  if (!mayCivil(s) && !mayMaster(s)) return null;
  const options = [opt('work','继续工作','保住眼前的收入')];
  if (mayCivil(s)) options.push(opt('civil','备考公务员','再试一次招录考试'),opt('institution','备考事业单位','竞争教师、医护和其他事业岗位'));
  if (mayMaster(s)) options.push(opt('master',(s.record.masterAttempts ?? 0) ? '再考一次研究生' : '准备研究生考试','备考期间收入减少，未必录取'));
  return { id:'careerPlan',title:`${s.age} 岁，今年还要再试一次吗？`,options };
}

export function autoCareerChoice(s,u,p) {
  const c = params(p), options = s.pending?.options ?? [];
  const has = x => options.some(o=>o.id===x);
  if (has('master') && (s.record.masterAttempts ?? 0) > 0 && u < c.masterRetry) return 'master';
  if (has('master') && s.age === 22 && u < c.masterApply) return 'master';
  if (has('civil') && u > 1-c.civilApply) return has('institution') && u > 1-c.civilApply/2 ? 'institution' : 'civil';
  if (has('home') && s.hukou === 'rural' && u > .60 && u < .76) return 'home';
  return has('work') ? 'work' : options[0]?.id;
}

function assignJob(s,draw,p,home=false) {
  const u=draw();
  if (s.hukou==='rural' && !isBachelor(s) && u < p.farmBase*(home?1.7:1)) {s.job='务农';s.industry='agriculture';return;}
  const v=draw();
  if (isBachelor(s)) {
    if (v < p.directPublic) {s.job=draw()<.6?'教师':'医护';s.industry='public';}
    else if(v<.28){s.job='互联网职员';s.industry='internet';}
    else if(v<.72){s.job='企业职员';s.industry='service';}
    else if(v<.90){s.job='技术员';s.industry='manufacturing';}
    else if(v<.975){s.job='个体户';s.industry='business';}
    else{s.job='老板';s.industry='business';}
  } else if(v<.30){s.job='工厂工人';s.industry='manufacturing';}
  else if(v<.48&&s.hukou==='rural'){s.job='建筑工人';s.industry='construction';}
  else if(v<.80){s.job=s.edu==='college'?'技术员':'本地服务业';s.industry=s.edu==='college'?'manufacturing':'service';}
  else if(v<.97){s.job='个体户';s.industry='business';}
  else{s.job='老板';s.industry='business';}
  if (isPublic(s) && s.age<=35) s.record.tizhiBy35=true;
}

function employment(s,draw,p,home=false) {
  if(home)s.city='老家';
  if(!home && draw()<DATA.career.youth_unemployment.value){s.job='待业';s.industry='unemployed';return;}
  assignJob(s,draw,p,home);
}

// A factor is called decisive only if removing it flips this exact draw's result.
// Otherwise the text attributes the outcome to competition rather than inventing a score.
function verdict(base,contributions,u,success) {
  const probability=logistic(base+Object.values(contributions).reduce((sum,x)=>sum+x,0));
  const decisive=Object.entries(contributions).filter(([,v])=>v!==0 && (u<logistic(logit(probability)-v))!==success).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  return {reason:decisive[0]?.[0]??'competition',draw:u,probability,contributions};
}
const examCauses = {
  wealth: {
    yes:['家里的积蓄给备考留出了时间。','家里能替你接住一段没有工资的日子。','生活费没有催着你立刻离开书桌。','父母留下的余钱，让你能把心思放在备考上。'],
    no:['家里留给备考的时间和钱都有限。','收入还没有着落，备考的日子也得算着过。','这个家无法让你一直留在书桌前。','你需要尽快挣钱，留给准备考试的余地更小。'],
  },
  grade: {
    yes:['以前学过的功课，这次接住了你。','这些年积累的知识在考试里帮了忙。','读书时打下的基础，这一次没有白费。','过去认真做过的题，成了这次过关的底气。'],
    no:['过去功课留下的差距还没补齐。','基础课上的缺口，到了考试时仍然在。','这些年落下的知识，不是临考就能补全。','准备到最后，仍有一些基础题没能掌握。'],
  },
  grind: {
    yes:['备考时多做的那些题帮了忙。','你为学习留下的时间，这次换来了结果。','之前反复练习的内容，在这次考试里用上了。','一次次坐回书桌的日子，这回有了回音。'],
    no:['备考还不够充分。','分给复习的时间，这一次还没能补足差距。','准备考试的那部分功夫，这次还欠了一些。','直到考试结束，计划里还有没有复习完的内容。'],
  },
  degree: {
    yes:['你的学历符合更多岗位的报名要求。','毕业证让你有了更多报考机会。','读到更高学历后，能选择的岗位多了一些。','此前继续读书，让这次报考多了余地。'],
    no:['学历限制了能报的岗位。','招聘条件让你能选的岗位少了一些。','有些岗位的学历要求，暂时把你挡在门外。','手里的毕业证，还不能满足更多岗位的要求。'],
  },
  region: {
    yes:['你报考的地区和岗位，竞争相对缓和一些。','这次选的地区和岗位，给了你多一点机会。','地区和岗位的竞争差别，这次对你有利。','在你能选择的报考地区里，这次竞争帮了忙。'],
    no:['你报考的地区和岗位，竞争更紧一些。','这次选的地区和岗位，让过关更难了一点。','地区和岗位的竞争差别，这次没有帮到你。','你面对的这批岗位，竞争比另一条路更紧。'],
  },
  competition: {
    yes:['这一轮名额竞争结束，名单上有你的名字。','有限的名额里，这次有你一个。','等待结果的日子结束了，这回是好消息。','这轮招录给了你继续往前走的机会。'],
    no:['这次没有拿到有限的录用名额。','录用通知没有来，这一轮竞争结束了。','等待到结果公布，你还是没有等到那个名额。','这次报考走到了结果公布，却没有走到入职。'],
  },
};
const civilFailureLife = [
  '你收起准考证，先把这段日子的花销补回去。',
  '这段时间的复习没有换来录用，你得重新安排每天那几个小时。',
  '备考和挣钱挤在一起，接下来得先给哪一边留时间？',
  '书桌还在原处，你却要重新想清楚明年是否继续坐下来。',
  '这段准备没有变成新工作，眼前的生活仍得接着过。',
  '你没有入职时间表，明年的生活还要重新安排。',
  '又一个报考周期结束，你开始认真比较继续考和换工作。',
  '你把复习计划合上。下一年的时间，不能再不计成本地花。',
  '这次等来的还是未录用，备考占去的时间已经没法退回来。',
  '你开始计算：如果再考一次，这一年少挣的钱要从哪里补。',
  '备考的经历在变长，考试却没有替你打开另一份工作的门。',
  '你重看招聘条件，想找出还有哪些岗位值得再准备一年。',
  '离报考年龄上限更近了，继续等一个名额的余地也更少。',
  '这次仍没能入职。到这一步，你必须重新给工作排一个顺序。',
];
function explanation(result,success,attempt=1) {
  const pool=examCauses[result.reason]??examCauses.competition;
  return pool[success?'yes':'no'][(attempt-1)%4];
}

export function resolveCareer(s,choice,draw,emit,p) {
  const c=params(p), was22=s.age===22;
  s.record.careerPlanAge=s.age;
  if(choice==='master') {
    if(!mayMaster(s)) throw new Error('当前不能参加研究生考试');
    s.record.masterAttempts=(s.record.masterAttempts??0)+1;
    const contributions={wealth:c.masterWealth*(s.wealthQ-3),grade:c.masterGrade*(s.gradePct-50)/25,grind:c.masterGrind*(s.attrs.grind/100-.35)};
    const u=draw(), success=u<logistic(logit(DATA.education.kaoyan_admit_ratio.value)+c.masterBase+Object.values(contributions).reduce((a,b)=>a+b,0));
    const base=logit(DATA.education.kaoyan_admit_ratio.value)+c.masterBase;
    const result=verdict(base,contributions,u,success);
    result.dice=[makeDice({id:'master',label:'研究生录取概率',p:result.probability,u,base,contributions,successLabel:'研究生录取',failureLabel:'未录取研究生'})];
    if(success){s.job='研究生在读';s.masterGraduateAge=s.age+3;s.industry='education';s.record.masterAdmitted=true;emit(explanation(result,true,s.record.masterAttempts)+'接下来的三年，你还要住在学校里，工资要再等一等。','education.kaoyan_admit_ratio',{node:'master',templateId:`master-${success?'admitted':'failure'}-${s.record.masterAttempts}`,...result});}
    else{s.attrs.happy=clamp(s.attrs.happy-4);s.income=0;s.examGapUntil=s.age+1;if(was22)s.job='待业';emit(explanation(result,false,s.record.masterAttempts)+(s.record.masterAttempts===1?'你把专业课书留在桌上：再考一年，就少挣一年的工资。':'第二次查分后，你关掉了页面。两年的备考时间已经过去，你开始重新找工作。'),'education.kaoyan_admit_ratio',{node:'master',templateId:`master-${success?'admitted':'failure'}-${s.record.masterAttempts}`,...result});}
  } else if(choice==='civil'||choice==='institution') {
    if(!mayCivil(s)) throw new Error('当前不符合报考条件');
    s.record.civilAttempts=(s.record.civilAttempts??0)+1;
    const institution=choice==='institution'||(was22&&draw()<.65);
    const base=institution?c.institutionSuccess:1/DATA.career.guokao_ratio.value;
    const contributions={degree:s.edu==='master'?c.civilDegree:0,region:['S','A'].includes(s.tier)?c.civilRegionHigh:c.civilRegionOther,grade:c.civilGrade*(s.gradePct-50)/25};
    const u=draw(),success=u<logistic(logit(base)+c.civilBase+Object.values(contributions).reduce((a,b)=>a+b,0));
    const result=verdict(logit(base)+c.civilBase,contributions,u,success);
    result.dice=[makeDice({id:'civil',label:institution?'事业岗位录用概率':'公务员录用概率',p:result.probability,u,base:logit(base)+c.civilBase,contributions,successLabel:'录用',failureLabel:'未录用'})];
    if(success){
      s.job=institution?['事业编','教师','医护'][Math.floor(draw()*3)]:'公务员';s.industry='public';s.record.tizhiBy35=true;
      emit(explanation(result,true,s.record.civilAttempts)+`体检和公示结束，你成了一名${s.job}。这次终于可以把练习题收起来。`,institution?'career.tizhi_share':'career.guokao_ratio',{node:'civil',templateId:`civil-${success?'admitted':'failure'}-${s.record.civilAttempts}`,...result});
    }else{s.attrs.happy=clamp(s.attrs.happy-3);s.income=0;s.examGapUntil=s.age+1;if(was22)s.job='待业';emit(explanation(result,false,s.record.civilAttempts)+civilFailureLife[Math.min(s.record.civilAttempts-1,13)],institution?'career.tizhi_share':'career.guokao_ratio',{node:'civil',templateId:`civil-${success?'admitted':'failure'}-${s.record.civilAttempts}`,...result});}
  } else if(was22 || choice==='home') {
    employment(s,draw,c,choice==='home');
    const text=s.job==='务农'?'你回家接过了田里的活。播种和收成有了你的名字，工资卡里却不会按月进钱。':s.job==='建筑工人'?'你跟着熟人去了外地工地，安全帽里夹着回家的车票。':s.job==='待业'?'投出去的简历没有换来合适的岗位。房租照付，你先把每天的饭钱记了下来。':`第一份稳定下来的工作是${s.job}。你开始算，到手的钱够不够房租和寄回家的那一笔。`;
    emit(text,s.job==='务农'?'career.primary_sector_share':isPublic(s)?'career.tizhi_share':'career.youth_unemployment',{node:'career',templateId:`career-22-${choice}-${s.job}`,reason:s.job});
  }
  if(was22){s.record.age22=s.job;if(choice==='master'||choice==='civil'||choice==='institution')emit(s.job==='研究生在读'?'22 岁这一年，你把去向填成了继续读研。':isPublic(s)?`22 岁这一年，你把去向填成了${s.job}，开始办理入职手续。`:'22 岁这一年，你暂时没有录取或录用通知，正在找工作和再备考之间做打算。',choice==='master'?'education.kaoyan_admit_ratio':isPublic(s)?'career.tizhi_share':'career.guokao_ratio',{node:'career',templateId:`career-22-${choice}-${s.job}`,reason:s.job});}
}

export function annualCareer(s,draw,emit,p) {
  const c=params(p);
  if(s.masterGraduateAge===s.age){s.edu='master';assignJob(s,draw,c);emit(`答辩通过后，你收好学生证，开始做${s.job}。招聘表上的学历要求终于不再把你拦在外面。`,'education.master_enroll',{node:'master',templateId:'master-graduation',reason:'graduation'});}
  else if(s.age>22&&s.age<60&&s.job==='待业'&&draw()<c.recoverEmployment){assignJob(s,draw,c);emit(`面试后，对方约好了报到时间。你开始做${s.job}，终于又能按月算收入。`);}
  if(s.age<=35&&isPublic(s))s.record.tizhiBy35=true;
}

export function resolveMidcareer(s,choice,draw,emit,p) {
  const c=params(p),industry=s.industry??'service';
  if(isPublic(s)){emit(`你在${s.job==='公务员'?'单位':s.job==='教师'?'学校':s.job==='医护'?'医院':'单位'}继续上班，岗位没有因这一轮企业裁员而变化。工资和家里的开支，还是按月排着。`,'career.tizhi_share',{node:'midcareer',templateId:'midcareer-public',reason:'public'});return;}
  const risk=c.layoff[industry]??c.layoff.service;
  const metadata={node:'midcareer',industry,probability:risk,contributions:{industry:risk},footnote:`本次人生计算中，这一行业在35岁节点的岗位中断风险为 ${Number((risk*100).toFixed(2))}%。来源：本地岗位风险参数；不是行业调查结果。`};
  const u=draw(),lost=u<risk;
  metadata.draw=u;
  metadata.dice=[makeDice({id:'midcareer',label:'本次岗位中断概率',p:risk,u,contributions:{base:logit(c.layoff.service),industry:logit(risk)-logit(c.layoff.service)},positive:false,successLabel:'岗位中断',failureLabel:'岗位保留'})];
  if(choice==='change'||lost){
    s.attrs.knowledge=clamp(s.attrs.knowledge+(choice==='change'?8:2));
    if(lost&&draw()<c.gigFallback){s.job=draw()<.5?'外卖骑手':'网约车司机';s.industry='gig';emit(`部门缩减了岗位。你暂时靠${s.job==='外卖骑手'?'送外卖':'开网约车'}接上收入，先把下个月的账单付掉。`,null,{...metadata,templateId:'midcareer-gig',reason:industry});}
    else {const previous=s.job;assignJob(s,draw,c,s.hukou==='rural'&&s.city==='老家');emit((lost?`${previous}的工作结束了。你带着这些年的经验重新找活，最后接上了${s.job}的收入。`:`你拿出积蓄学新手艺，换了一份${s.job}的工作，头几个月还在适应。`)+(s.job==='务农'?'每年的收成开始影响全家的账。':''),null,{...metadata,templateId:lost?'midcareer-reemployed':'midcareer-reskill',reason:lost?industry:'reskill'});}
  }else emit(s.job==='务农'?'田里的活还要照做。你比年轻时更会看天气，也更知道一场雨会影响多少收入。':`这一轮调整后，你仍在做${s.job}。工资没有中断，家里的开支也还要按月安排。`,null,{...metadata,templateId:'midcareer-retained',reason:'retained_'+industry});
}
