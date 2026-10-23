import { random, weightedIndex } from './rng.js';
import { DATA } from './stats.js';
import { P, logistic, logit, clamp } from './params.js';
import { mortalityRisk, causeOfDeath, LIFE_TABLES } from './mortality.js';
import { autoChoose } from './decisions.js';
import { probability, attribution, contributions, isBachelor } from './education.js';
import { resolveCareer, annualCareer, resolveMidcareer } from './career.js';
import { events as templates } from '../content/events/index.js';
import { verdict } from '../content/verdicts.js';
import { makeDice } from './dice.js';
import { familyCareEvent } from './family.js';
import {drawCards,cardById,resolveCard,withoutHeavyPending} from './cards.js';
import {schoolAlternative,annualEducation,resolveEducationAction,extraAdmission,contentDraw} from './education-paths.js';
import {settleFocus,demographicFocus} from './focus.js';
import {beginPreparation,annualPreparation,preparationAction} from './preparation.js';
import {annualRelationships,marryPartner,partnerCandidate} from './relationships.js';
import { childStartingText } from '../content/presentation.js';
import {extendStudentLoanStudy} from './student-loans.js';
import {ensureHighSchoolLocation,specialPlanEligible} from './school-location.js';
import {annualWork,settleDisposableIncome} from './work.js';
import {retirementAge,isFlexibleWork,recordContributions,settlePension,pensionComparisonText} from './pension.js';
import {copyEconomy,financialAction,buyHouse,annualBusiness,annualMoney} from './money.js';
const STAGES=['baby','child','junior','high','college','adult','middle','senior'];
const byStage=Object.fromEntries(STAGES.map(stage=>[stage,templates.filter(e=>e.stage===stage)]));
const stageAt=a=>a<6?'baby':a<12?'child':a<16?'junior':a<19?'high':a<23?'college':a<36?'adult':a<60?'middle':'senior';

export function step(previous,input={}) {
 if(!previous.alive)return {state:previous,events:[]};
 const light=withoutHeavyPending(previous);if(light!==previous)return {state:light,events:[]};
 if(input.action){const state=input.action==='leave-preparation'?preparationAction(previous,input.action):financialAction(previous,input);return {state,events:state.log.slice(previous.log.length)};}
 if(previous.pending&&!input.choice&&!input.auto)return {state:previous,events:[]};
 let s={...previous,cardHistory:[...(previous.cardHistory??[])],skills:{...(previous.skills??{})},educationFinance:{...(previous.educationFinance??{})},cardUsage:{...(previous.cardUsage??{})},cardSeeds:[...(previous.cardSeeds??[])],preparation:previous.preparation?{...previous.preparation}:null,attrs:{...previous.attrs},record:{...previous.record},kids:[...previous.kids],templateUsage:previous.templateUsage,verdictUsage:{...previous.verdictUsage},parents:Object.fromEntries(Object.entries(previous.parents).map(([role,p])=>[role,{...p}]))};
 s=copyEconomy(s);
 let seed=s.rngState;
 const draw=()=>{const r=random(seed);seed=r.seed;return r.value;};
 const output=[];
 const emit=(text,stat,meta={})=>{if(s.capture!==false)output.push({age:s.age,text,stat:stat??null,...meta});};
 const report=(node,gate,u,outcome,stat,choice=false,bonus=0,dice=null)=>{
  const cause=choice?{dominant:'choice',contributions:{},probability:null,draw:u}:attribution(s,gate,u,bonus);
  let variant=(s.seed+s.age)%4;
  for(let k=0;k<4;k++){const id=`verdict:${node}:${cause.dominant}:${variant}`,used=s.verdictUsage[id];if(!used||(used.count<2&&s.age-used.lastAge>=5))break;variant=(variant+1)%4;}
  const templateId=`verdict:${node}:${cause.dominant}:${variant}`,old=s.verdictUsage[templateId];s.verdictUsage[templateId]={count:(old?.count??0)+1,lastAge:s.age};
  emit(verdict(s,{node,outcome,...cause,variant}),stat,{node,reason:cause.dominant,outcome,...cause,templateId,...(dice?{dice}:!choice&&node==='school'?{dice:[makeDice({id:'school-'+gate,label:gate==='stage'?'高中阶段升学概率':'普通高中录取概率',p:cause.probability,u,contributions:cause.contributions,successLabel:gate==='stage'?'继续升学':'普通高中录取',failureLabel:gate==='stage'?'未能继续升学':'未录取普通高中'})]}:{})});
 };
 const admission=(repeat=false)=>{
  const u=draw(),p=probability(s,'bachelor'),bonus=repeat?P.repeatBonus:0;
  ensureHighSchoolLocation(s);s.record.gaokao=true;s.record.specialEligible=specialPlanEligible(s);
  if(u<Math.min(p+bonus,probability(s,'elite'))){s.edu='985';s.record.elite=true;s.record.admitted=true;}
  else if(u<Math.min(p+bonus,probability(s,'211'))){s.edu='211';s.record.admitted=true;}
  else if(u<p+bonus){s.edu='bachelor';s.record.admitted=true;}
  else s.edu=draw()<P.fallbackCollege?'college':s.record.general?'high':'vocational';
  const prefix=repeat?'repeat':'exam',bachelorP=Math.min(1,p+bonus);
  const cause=attribution(s,'bachelor',u,bonus);
  const dice=[makeDice({id:prefix+'-bachelor',label:repeat?'复读后本科录取概率':'本科录取概率',p:bachelorP,u,contributions:cause.contributions,successLabel:'本科录取',failureLabel:'未录取本科'}),...['211','elite'].map(gate=>makeDice({id:prefix+'-'+(gate==='elite'?'985':gate),label:(gate==='elite'?'985':'211及以上')+'录取概率',p:Math.min(bachelorP,probability(s,gate)),u,contributions:contributions(s,gate),successLabel:(gate==='elite'?'985':'211及以上')+'录取',failureLabel:'未录取'}))];
  report('exam','bachelor',u,s.record.admitted?'admitted':'rejected','province_tier.'+s.tier,false,bonus,dice);
  extraAdmission(s,emit);
  if(['college','bachelor','211','985'].includes(s.edu)){s.record.collegeEnrolledAt=s.age;s.collegeGraduateAge=s.age+(s.edu==='college'?3:4);}
  if(s.record.admitted)emit(`你被${s.edu==='985'?'985大学':s.edu==='211'?'211大学':'普通本科院校'}录取了。你先拨通了家里的电话。`);
 };
 if(s.pending){
  const d=s.pending,choice=input.choice??autoChoose(s);
  if(!d.options.some(o=>o.id===choice&&!o.disabled))throw new Error('无效抉择：'+choice);
  const definition=cardById(d.id),core=definition?.core??false;
  if(core&&d.id!=='school-alternatives')draw();
  else contentDraw(s);
  s.cardHistory.push({id:d.id,age:s.age,choice});
  if(!core)s=resolveCard(s,choice);
  const consequences=[...(s.pendingScenarioEvents??[]),...(s.relationshipEvents??[])];
  for(const event of consequences.filter(e=>e.node==='scenario-scene'))emit(event.text,event.stat,event);
  s.pendingScenarioEvents=[];s.relationshipEvents=[];
  s.pending=null;
  if(s.capture!==false)s.choices=[...s.choices,{age:s.age,decision:d.id,choice}];
  emit(`你选择了「${d.options.find(o=>o.id===choice).label}」。`,null,{node:'card',cardId:d.id});
  for(const event of consequences.filter(e=>e.node!=='scenario-scene'))emit(event.text,event.stat,event);
  switch(d.id){
   case 'school': {
    const stageDraw=draw(),generalDraw=draw(),entered=stageDraw<probability(s,'stage'),general=generalDraw<probability(s,'general');
    s.record.schoolSettled=true;s.record.stage=choice!=='leave'&&entered;s.record.general=s.record.stage&&choice==='general'&&general;s.record.publicGeneral=s.record.general;s.record.publicGeneralEver=s.record.general;if(s.record.general)s.schoolRoute='public';if(choice==='leave'){s.schoolRoute='work';s.schoolAlternativeOffered=true;}if(choice==='vocational')s.schoolRoute='vocational';
    s.edu=s.record.stage?(s.record.general?'high':'vocational'):'junior';
    report('school',!entered?'stage':'general',!entered?stageDraw:generalDraw,s.record.general?'general':s.record.stage?'vocational':'leave','education.general_hs_rate',choice!=='general');
    break;
   }
   case 'early-house':if(choice!=='rent'){const p=s.record.housePurchases.at(-1);emit(`你在${p.city}买下住房，支付${Math.round(p.down)}元${p.fullCash?'全款':'首付'}，剩余房贷本金${Math.round(p.principal)}元。`,null,{node:'house',...p});}break;
   case 'business-start':if(choice!=='decline')emit(`你投入${s.business.capital}元经营${s.business.name}，从小生意开始，自己承担往后的盈亏。`,null,{node:'business',outcome:'started',type:s.business.type});break;
   case 'school-alternatives':schoolAlternative(s,choice,emit);break;
   case 'repeat-exam':
   case 'exam':if(choice==='exam')admission();else {s.job='工厂工人';s.industry='manufacturing';emit('你没有再报名考试，把行李放进工厂宿舍，开始按排班表过日子。','education.higher_ed_gross_enroll',{node:'exam',reason:'choice'});}break;
   case 'repeat':s.repeatUsed=true;if(choice==='repeat'){s.gradePct=clamp(s.gradePct+4);admission(true);}else emit('你收起复习资料，先把专科和就业这条路走下去。');break;
   case 'upgrade':if(choice==='upgrade'&&draw()<logistic(logit(P.upgradeProbability)+P.bachelorGrind*s.attrs.grind/100)){s.edu='bachelor';const previousGraduation=s.collegeGraduateAge??s.age;s.collegeGraduateAge=Math.max(s.age,previousGraduation)+2;if(s.educationFinance.studentLoan)Object.assign(s,extendStudentLoanStudy(s,s.collegeGraduateAge-previousGraduation,{reason:'college-upgrade',additionalFunding:true}));emit('继续升学的录取通知到了，你沿着另一条路走进本科课堂，还要再完成两年的课程。');}else emit('继续升学这条路没有走通，你把课本收好，先去积累工作经验。');break;
   case 'career':s.record.deferredCareerEntry=s.age>22;resolveCareer(s,choice,draw,emit);beginPreparation(s,choice);break;
   case 'city':s.city=choice;emit(`你把生活搬到了${choice}。`);break;
   case 'marry':if(choice==='marry'&&draw()<P.marriageProbability)marryPartner(s,partnerCandidate(s),emit);else emit('你暂时独自生活。');break;
   case 'house':{const city=choice==='buy-home'?'老家':choice==='buy-county'?'县城':s.city,size=choice==='buy'?'normal':'small';if(choice==='rent'||!buyHouse(s,emit,city,size))emit(choice!=='rent'?'首付、月供或贷款条件暂时不合适，你继续租住。':'你续签了租房合同。');break;}
   case 'child':if(choice==='child'){s.kids=[{bornAt:s.age,hukou:['一线','省会'].includes(s.city)?'urban':'rural',wealthQ:clamp(Math.ceil(s.income/26000),1,5)}];emit('孩子出生了。'+childStartingText(s));}break;
   case 'midcareer':resolveMidcareer(s,choice,draw,emit);break;
  }
  if(!core)resolveEducationAction(s,emit);
  s=drawCards(s);
 }else if(draw()<mortalityRisk(s)){
  s.alive=false;s.death=causeOfDeath(s,draw());
  emit(`${s.age}岁这一年，你因${s.death.detail}离开了。家人把你的旧照片收进了相册。`,'health.life_expectancy',{node:'death'});
 }else{
  s.age++;
  const selectedFocus=input.focus??(['study','work','family','health','hobby'][Math.floor(draw()*5)]);
  settleFocus(s,selectedFocus);const focus=demographicFocus(selectedFocus);
  if(s.age>=6){
   s.attrs.grind=clamp(s.attrs.grind+(focus==='study'?8:-1));s.gradePct=clamp(s.gradePct+(focus==='study'?.8:-.15));
   s.attrs.knowledge=clamp(s.attrs.knowledge+(focus==='study'?2:.3));s.attrs.happy=clamp(s.attrs.happy+(focus==='study'?-.3:focus==='hobby'?.8:0));
   s.attrs.health=clamp(s.attrs.health+(focus==='health'?.5:-.12));s.attrs.social=clamp(s.attrs.social+(focus==='family'?.5:.05));
  }
  for(const [role,parent] of Object.entries(s.parents)){
   if(!parent.alive)continue;
   parent.age++;
   const sex=role==='mother'?'female':'male';
   if((parent.storyDeathAge!==undefined?parent.age>=parent.storyDeathAge:draw()<(parent.age>=110?1:LIFE_TABLES[`${s.province}:${sex}`][parent.age]))){parent.alive=false;parent.diedAt=s.age;parent.health=0;emit(`${role==='mother'?'妈妈':'爸爸'}${parent.name}在${parent.age}岁离开了。你翻出家里的旧照片，才发现许多话还没有来得及说。`,'health.life_expectancy_by_sex',{node:'parentDeath'});}
   else if(parent.age>=55&&!parent.ill&&draw()<.025){parent.ill=true;parent.health=55;emit(`${role==='mother'?'妈妈':'爸爸'}${parent.name}需要住院治疗。你请了假，把药盒和换洗衣服装进袋子。`);}
  }
  const care=familyCareEvent(s);if(care)emit(care.text,null,care);
  if(s.age===15){const u=draw();s.record.junior=u<probability(s,'junior');s.edu=s.record.junior?'junior':'none';emit(s.record.junior?'你完成初中学业，拿到了毕业证，接下来要面对中考。':'你没能完成初中学业。课本收进抽屉，你开始帮家里分担日常。','education.compulsory_retention',{node:'junior'});}
  if(s.age===(s.repeatJunior?19:18)&&s.record.stage&&!s.highDropout){const u=draw();s.record.completed=u<probability(s,'completion');if(!s.record.completed)s.edu='junior';report('completion','completion',u,s.record.completed?'completed':'dropped',s.hukou==='rural'&&s.wealthQ===1?'education.poor_rural_hs_completion':'education.hs_stage_gross_enroll');}
  annualCareer(s,draw,emit);
  annualEducation(s,emit);
  if(!s.retired&&((!isFlexibleWork(s)&&s.age>=retirementAge(s))||(isFlexibleWork(s)&&(s.attrs.health<45||s.age>=85)))){s.retirementClass=s.retirementClass??s.pensionRecord?.retirementClass;s.retired=true;s.retiredAt=s.age;s.lastJob=s.job;s.job='退休';emit(`你收好工作时常用的物件，结束了在岗工作。${pensionComparisonText(s)}`,null,{node:'retirement'});}
  if(s.kids[0]&&s.age-s.kids[0].bornAt===15)emit('孩子也到了中考的年纪。你陪着孩子翻招生简章，想起自己当年的那张志愿表。','education.general_hs_rate');
  const pool=byStage[stageAt(s.age)],count=1+Math.floor(draw()*3);
  const stage=stageAt(s.age),usage={...s.templateUsage?.[stage]};s.templateUsage={...s.templateUsage,[stage]:usage};
  for(let i=0;i<count;i++){
   const weights=pool.map(e=>{const used=usage[e.id];return used&&(used.count>=2||s.age-used.lastAge<5)?0:Math.max(0,e.weight(s));});
   const u=draw();if(!weights.some(w=>w>0))continue;
   const t=pool[weightedIndex(weights,u)],old=usage[t.id];usage[t.id]={count:(old?.count??0)+1,lastAge:s.age};
   for(const [key,delta]of Object.entries(t.effects??{}))if(key in s.attrs)s.attrs[key]=clamp(s.attrs[key]+delta);
   if(s.capture!==false)emit(t.text(s),t.stat,{templateId:t.id});
  }
  draw(); // Retain the demographic stream's historical annual wage draw.
  if(s.age>=18){
   annualWork(s,emit);annualBusiness(s,emit);
   recordContributions(s);s.laborIncome=s.income;settlePension(s,emit);s.income=Math.round(s.laborIncome+s.pensionIncome);
   const savingRate=P.savingRate+(s.ownsHouse&&s.money.property?.city===s.city&&!s.money.property.rented?.15:0);
   s.peakIncome=Math.max(s.peakIncome??0,s.income);s.assets=Math.round(s.assets+s.income*savingRate-s.kids.filter(k=>s.age-k.bornAt<22).length*P.childAnnualCost);
   annualMoney(s,emit);settleDisposableIncome(s);annualRelationships(s,emit);
  }
  if(s.age===40)s.record.job40=s.job;
  annualPreparation(s,draw,emit);
  s=drawCards(s);
 }
 s.rngState=seed;
 if(s.capture!==false){s.log=[...previous.log,...output];s.history=[...previous.history,...(s.age!==previous.age?[{age:s.age,happy:s.attrs.happy}]:[])];}
 return {state:s,events:output};
}
export function simulate(initial,{focus,choices=[],capture=false,until=110}={}){
 let s={...initial,capture},i=0,guard=0;
 while(s.alive&&s.age<=until){
  if(++guard>600)throw new Error('人生未能终止');
  if(s.age===until&&!s.pending&&until<110)break;
  let input=focus?{focus}:{};
  if(s.pending){const next=choices[i];const choice=s.pending.options.some(o=>o.id===next&&!o.disabled)?choices[i++]:autoChoose(s);if(!choice)throw new Error('卡片没有可选项：'+s.pending.id);input={...input,choice};}
  s=step(s,input).state;
 }
 return s;
}
