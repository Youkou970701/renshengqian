import {polishNarrative} from '../content/narrative-copy.js';
import {scenarioResultFacts} from '../content/scenario-result-facts.js';
import {sceneFacts,completedSceneFacts,avoidedFacts} from '../content/biography-facts.js';
import {selectTitle} from '../content/titles.js';
import {lifeColor} from '../content/life-colors.js';
import {JOB_BY_ID} from '../content/jobs.js';
import {SCENARIOS} from '../content/scenarios.js';

export const BIOGRAPHY_STIFF_EXPRESSIONS=['住址的分开','未完成','自己的求学路','需要认真面对的波折','办完手续','办完继承手续','登记结婚','公务岗位','结束在岗工作','编辑写作者'];
const schoolNames={college:'专科',bachelor:'本科','211':'211大学','985':'985大学'};
const emptyJobs=new Set(['待业','尚未就业','退休','研究生在读']);
const byId=Object.fromEntries(SCENARIOS.map(x=>[x.id,x]));
function storyEvent(h){
 const def=byId[h.id];if(!def||def.category==='warmth'||!h.outcome||h.outcome==='skipped'||h.endedAt==null)return null;
 const branch=scenarioResultFacts(h,def);
 if(branch&&h.id==='family-parents-separate')return {age:h.startedAt,text:'父母离婚',shareText:'父母离婚',source:'scenarioHistory',id:h.id,outcome:h.outcome};
 if(branch)return {age:branch.age,text:branch.text,shareText:branch.shareText,source:'scenarioHistory',id:h.id,outcome:h.outcome};
 const first=h.choices?.[0],last=h.choices?.at(-1);let age=completedSceneFacts[h.id]?h.endedAt:h.startedAt,text=completedSceneFacts[h.id]??sceneFacts[h.id];
 const effects=[...(h.choices??[]).map(c=>def.steps[c.index]?.options.find(o=>o.id===c.choice)?.effects),def.outcomeEffects?.[h.outcome]].filter(e=>e&&typeof e==='object');
 const total=key=>effects.reduce((sum,e)=>sum+(typeof e[key]==='number'?e[key]:0),0);
 const spent=effects.reduce((sum,e)=>sum-Math.min(0,e.assetsDelta??0),0);
 if(h.outcome==='avoided')text=avoidedFacts[h.id];
 else if(h.id==='boundary-prison'){
  const prison=h.choices?.find(c=>['serve','drift'].includes(c.choice));
  if(prison){age=h.endedAt;const years=def.steps[prison.index]?.options.find(o=>o.id===prison.choice)?.effects?.prisonYears??0,again=def.outcomeEffects?.[h.outcome]?.prisonYears??0;text=again?`因借卡案件先后被判${years+again}年监禁`:`因借卡案件坐过${years}年牢后重新找工作`;}
  else {age=h.endedAt;text='借出银行卡后卷入案件';}
 }else if(h.id==='boundary-driving'){age=h.endedAt;text=h.outcome==='bad'?'酒后开车被判拘役':'酒后开车被罚款、暂扣驾照';}
 else if(h.id==='boundary-drunk'){age=h.endedAt;text=h.outcome==='bad'?'因酒后冲突留下刑事记录':'为酒后冲突赔了钱';}
 else if(h.id==='boundary-gambling'){
  age=h.endedAt;text=h.outcome==='rehabilitated'?'开始戒赌，继续偿还赌债':last?.choice==='quit'?'赢了三千元后离开牌桌':last?.choice==='confess'?'停赌并向家人坦白三万元亏损':h.outcome==='bad'?'赌博欠债后耗尽积蓄':'在牌局之后继续处理债务';
 }else if(h.id==='boundary-theft'){age=h.endedAt;text=last?.choice==='out'?'偷拿过商品后退出了同学圈子':'因偷拿商品被发现，家里作了退赔';}
 else if(h.id==='jianghu-circle'&&last?.choice==='leave'){age=h.endedAt;text='离开熟人圈子，转去学修车';}
 else if(h.id==='jianghu-circle'&&h.outcome==='bad'){age=h.endedAt;text=`跟着熟人混社会后被判${total('prisonYears')}年监禁`;}
 else if(h.id==='jianghu-circle'&&h.outcome==='rehabilitated'){age=h.endedAt;text='离开熟人圈子，回老家重新干活';}
 else if(h.id==='trap-drugs'&&h.outcome==='rehabilitated'){age=h.endedAt;text='戒断毒品后回家重建生活';}
 else if(h.id==='luck-compensation'){
  // Only the signed/checked first choice actually adds this money.
  text=first?.choice==='check'?'拿到八十五万元搬迁补偿':first?.choice==='sign'?'拿到八十万元搬迁补偿':'拿到搬迁补偿';
  if(h.outcome==='bad'||h.outcome==='mixed'){age=h.endedAt;text+=`，又${h.outcome==='bad'?'损失':'花掉'}${spent}元`;}
 }else if(h.id==='accident-road'&&h.outcome==='bad'){age=h.endedAt;text='交通事故后留下长期活动限制';}
 else if(h.id==='victim-bike'&&h.outcome==='good'){age=h.endedAt;text='丢失的电动车被找了回来';}
 else if(h.id==='victim-phone'&&h.outcome==='good'){age=h.endedAt;text='被抢的手机失而复得';}
 else if(h.id==='victim-phone'&&h.outcome==='bad'){age=h.endedAt;text=`手机被抢后又损失${-total('assetsDelta')}元`;}
 if(h.id==='jianghu-apprentice')age=h.endedAt;
 if(!text)return null;
 const sensitive=['crime','drugs','domestic-violence','gambling'].includes(def.heavyCategory);
 const shareText=sensitive?(h.outcome==='avoided'?'谢绝危险邀约，平安回家':h.id==='family-domestic'?'遭遇伤害后咨询保护令和法律援助':h.id==='victim-phone'&&h.outcome==='bad'?`丢失手机后又损失${-total('assetsDelta')}元`:'经历一段波折后重新安排生活'):text;
 return {age,text,shareText,source:'scenarioHistory',id:h.id,outcome:h.outcome};
}
export function biography(s){
 const title=selectTitle(s),r=s.record??{},events=[];
 const add=(age,text,source,extra={})=>{if(Number.isFinite(age)&&age>=0&&age<=s.age&&text)events.push({age,source,...extra,text:polishNarrative(text),...(extra.shareText?{shareText:polishNarrative(extra.shareText)}:{})});};
 const histories=(s.scenarioHistory??[]).filter(h=>h.outcome&&h.outcome!=='skipped'&&h.endedAt!=null&&byId[h.id]?.category!=='warmth');
 const mainId=title.scenarioId??(title.evidence?.kind==='scenario'?title.evidence.id:null);
 const ranked=histories.slice().sort((a,b)=>(b.id===mainId)-(a.id===mainId)||(b.heavy&&b.outcome!=='avoided')-(a.heavy&&a.outcome!=='avoided')||b.startedAt-a.startedAt);
 for(const h of histories.filter(h=>h.id==='family-parents-separate'||ranked.slice(0,1).includes(h))){const event=storyEvent(h);if(event)add(event.age,event.text,event.source,event);}
 // Junior completion is settled at 15; a later final degree cannot tell us
 // when college/master study happened. Use its recorded admission age only.
 if(s.age>=15&&typeof r.junior==='boolean')add(15,r.junior?'读完初中':'初中没读完','record.junior');
 const school=(s.cardHistory??[]).find(h=>h.id==='school');
 if(r.stage&&school)add(school.age,r.general?'接着上了普通高中':'接着读了中职','cardHistory.school');
 if(Number.isFinite(r.collegeEnrolledAt)){
  const degree=s.eliteUndergrad??(r.elite?'985':s.edu==='master'?'bachelor':s.edu);
  add(r.collegeEnrolledAt,`考上${schoolNames[degree]??'大学'}`,'record.collegeEnrolledAt');
 }
 const masterLog=(s.log??[]).find(e=>e.node==='master'&&/admitted/.test(e.templateId??''));
 if(masterLog)add(masterLog.age,'考上研究生','log.master');
 const jobs=[];
 const jobAt=(age,name,source)=>{if(name&&!emptyJobs.has(name)&&Number.isFinite(age)&&age<=s.age)jobs.push({age,name,source});};
 if(r.age22)jobAt(22,r.age22,'record.age22');
 for(const row of s.incomeHistory??[]){if(!row.retired&&row.income>0)jobAt(row.age,JOB_BY_ID[row.jobId]?.name??row.job,'incomeHistory');}
 for(const row of s.log??[]){if(row.incomeEvent==='job-entry')jobAt(row.age,JOB_BY_ID[row.jobId]?.name,'log.job-entry');}
 if(s.occupation)jobAt(s.occupation.startedAt,JOB_BY_ID[s.occupation.id]?.name,'occupation.startedAt');
 const uniqueJobs=jobs.sort((a,b)=>a.age-b.age).filter((x,i,a)=>!a.slice(0,i).some(y=>y.name===x.name));
 const chosenJobs=uniqueJobs.length>1?[uniqueJobs[0],uniqueJobs.at(-1)]:uniqueJobs;
 for(const [i,j]of chosenJobs.entries())add(j.age,j.name==='工厂工人'?(i?'转到工厂上班':'在工厂上班'):`${i?'转做':'做'}${j.name}`,j.source);
 const jobLoss=(s.incomeHistory??[]).find(row=>row.reasons?.some(e=>e.kind==='layoff'))??(s.log??[]).find(e=>e.incomeEvent==='layoff');
 if(jobLoss)add(jobLoss.age,'失业后重新找工作',jobLoss.incomeEvent?'log.layoff':'incomeHistory.layoff');
 let marriageCount=0;
 for(const h of s.relationshipHistory??[]){
  if(h.kind==='marriage')add(h.age,++marriageCount===1?'结婚':'再次结婚','relationshipHistory.marriage');
  if(h.kind==='divorce')add(h.age,'离了婚','relationshipHistory.divorce');
 }
 const kids=(s.kids??[]).filter(k=>Number.isFinite(k.bornAt)&&k.bornAt<=s.age);
 for(const [i,k]of kids.entries())add(k.bornAt,kids.length===1?'有了一个孩子':`迎来第${i+1}个孩子`,'kids.bornAt');
 if(Number.isFinite(s.retiredAt))add(s.retiredAt,'退休','retiredAt');
 // The selected rare trajectory must appear in the biography too. Lifetime
 // totals have an explicit as-of endpoint; prose presents them as a lifetime
 // aside, never as something already accumulated at the first working age.
 let summary=null;const e=title.evidence??{},v=title.values??{};
 const businesses=s.businessHistory??[];
 const venture=v.venture??(businesses.length&&businesses.every(b=>['shop','online'].includes(b.type))?'店':businesses.length&&businesses.every(b=>b.type==='factory')?'工厂':'生意');
 if(e.kind==='career'&&e.years>0)summary=`前后做了${e.years}年${JOB_BY_ID[e.jobId]?.name??'这份工作'}`;
 if(e.kind==='promotion')summary=`从${JOB_BY_ID[e.jobId]?.levels[0]?.title??'入门岗位'}做到${e.rank}`;
 if(title.id==='civil-retry')summary=`先后考了${r.civilAttempts}次，终于${r.publicPath==='institution-recruitment'?'考进事业单位':'考上公务员'}`;
 if(title.id==='civil-not-admitted')summary=`考公${r.civilAttempts}次，始终没被录用`;
 if(title.id==='master-retry')summary=`考了${r.masterAttempts}次才读上研究生`;
 if(title.id==='master-not-admitted')summary=`考研${r.masterAttempts}次，始终没被录取`;
 if(title.id==='parent-support')summary=`给父母治病前后花了${r.parentMedicalPaid}元`;
 if(title.id==='parent-care')summary='接父母同住，安排日常照护';
 if(title.id==='returned-home')summary='也曾从外地回老家安顿';
 if(title.id==='shop-open')summary=`一生开过${v.count}次${venture}`;
 if(title.id==='shop-close')summary=`开过${v.opened}次${venture}又关了${v.closed}次门`;
 if(title.id==='business-employees')summary=`做生意请了${v.count}名员工`;
 if(title.id==='million-assets')summary=`留下${v.amount}万元净资产`;
 if(title.id==='left-behind-elite')summary=`小时候留守，后来考上${v.campus}大学`;
 if(title.id==='repeat-elite')summary=`复读一年考上${v.campus}大学`;
 if(title.kind==='education'&&!summary&&!Number.isFinite(r.collegeEnrolledAt))summary=({master:'读完硕士',college:'读到专科',bachelor:'读到本科','985':'考上985大学','211':'考上211大学',vocational:'读过中职'})[s.edu];
 if(title.id==='house-cash'||title.id==='own-home'){
  const p=e.purchase;if(p)add(p.age,p.fullCash?`花${p.price}元全款买了房`:`付${p.down}元首付买了房`,'record.housePurchases');
 }
 if(summary)summary=polishNarrative(summary);
 if(summary)add(s.age,summary,'title.evidence',{summary:true,evidence:e});

 // A final occupation with no date is omitted instead of being placed after
 // retirement or being assigned a made-up early-career date.
 const end=s.alive===false?(s.age<18?'生命在这一年停下':`因${s.death?.detail??'生命走到终点'}离开`):'走到人生的这一年';
 add(s.age,end,'end',{shareText:/暴力|犯罪|毒品|抢夺|自杀/.test(end)?'走到生命终点':end});
 const timeline=events.sort((a,b)=>a.age-b.age||Number(a.source==='end')-Number(b.source==='end'));
 const place=`${s.province??'故乡'}${s.place??''}${s.hukou==='rural'?'的一个村子':''}`;
 const compose=share=>{
  const groups=[];
  for(const e of timeline.filter(e=>!e.summary)){const text=share?(e.shareText??e.text):e.text;const last=groups.at(-1);if(last?.age===e.age)last.texts.push(text);else groups.push({age:e.age,texts:[text]});}
  const phrases=groups.map(g=>`${g.age}岁${[...new Set(g.texts)].join('，')}`);
  if(summary)phrases.splice(Math.max(0,phrases.length-1),0,summary);
  return polishNarrative([`出生在${place}`,...phrases].join('，')+'。');
 };
 return {title,sentence:compose(false),shareSentence:compose(true),color:lifeColor(s),timeline};
}
export {lifeColor};
