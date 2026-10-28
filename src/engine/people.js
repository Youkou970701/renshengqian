import {hashSeed,random} from './rng.js';
import {nameFor} from '../content/names.js';

const clamp=n=>Math.max(0,Math.min(100,n));
const hash=text=>{let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
const roll=(s,key)=>random(hashSeed(s.seed^hash(key))).value;
const jobs=['店员','木工','教师','护士','会计','农机维修工','快递员','厨师'];
// Caches retain no gameplay state: their keys are immutable people/member
// objects, so saved JSON needs no cache fields and a restored save recomputes
// exactly the same facts. Source values, not just age, guard same-year changes.
const syncedPeople=new WeakMap(),generatedProfiles=new WeakMap();
function sourceSnapshot(s){
 const source=[s.seed,s.year,s.age,s.name,s.siblings,s.leftBehind,s.married,s.relationship?.closeness];
 for(const role of ['mother','father']){const p=s.parents?.[role];source.push(p?.name,p?.age,p?.job,p?.alive,p?.away,p?.birthAge);}
 const p=s.partner;source.push(p?.id,p?.name,p?.age,p?.job,p?.alive);
 const kids=s.kids??[];source.push(kids.length);for(const k of kids)source.push(k.bornAt,k.leftBehind,k.careBy);
 const history=s.relationshipHistory??[];source.push(history.length);for(const h of history)source.push(h.kind,h.partnerId,h.name,h.partnerAge,h.diedAge);
 const ex=s.exPartners??[];source.push(ex.length);for(const p of ex)source.push(p?.id,p?.name,p?.job);
 return source;
}
const sameSource=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
function inheritSync(before,after){const source=syncedPeople.get(before);if(source)syncedPeople.set(after,source);return after;}
export const closenessLabel=n=>n>=65?'亲近':n<40?'疏远':'一般';
const initialCloseness=(s,id)=>id==='mother'||id==='father'?(s.parents?.[id]?.away?47:62):id.startsWith('friend:')?58:57;
const jobAt=(s,id,age)=>age<6?'尚未入学':age<18?'学生':age>=65?'退休':jobs[Math.floor(roll(s,`${id}:job`)*jobs.length)];
const memberName=(s,id,sex,birthYear,surname)=>nameFor(sex,birthYear,roll(s,`${id}:name`),surname);
const sexFor=(s,id,previous)=>{const profile=previous&&generatedProfiles.get(previous);return profile?.seed===s.seed?profile.sex:roll(s,`${id}:sex`)<.5?'female':'male';};
function own(previous,fields){
 const result={...previous,...fields,closeness:Number.isFinite(previous?.closeness)?previous.closeness:fields.closeness};
 const profile=generatedProfiles.get(fields)??(previous&&generatedProfiles.get(previous));if(profile)generatedProfiles.set(result,profile);
 return result;
}
function generated(s,id,role,label,bornAt,sex,surname,previous){
 const old=previous&&generatedProfiles.get(previous);
 const same=old&&old.seed===s.seed&&old.year===s.year&&old.id===id&&old.role===role&&old.label===label&&old.bornAt===bornAt&&old.sex===sex&&old.surname===surname;
 const profile=same?old:{seed:s.seed,year:s.year,id,role,label,bornAt,sex,surname,name:memberName(s,id,sex,s.year+bornAt,surname),deathAge:78+Math.floor(roll(s,`${id}:death`)*24),adultJob:jobAt(s,id,18)};
 const age=Math.max(0,s.age-bornAt),alive=age<profile.deathAge;
 const result={id,role,label,name:profile.name,age:alive?age:profile.deathAge,job:age<6?'尚未入学':age<18?'学生':age>=65?'退休':profile.adultJob,alive,diedAge:alive?null:profile.deathAge,bornAt,active:true,closeness:initialCloseness(s,id)};
 generatedProfiles.set(result,profile);return result;
}
function change(s,id,delta,reason,emit,{annual=false}={}){
 const person=s.people.members[id];if(!person||!person.alive||!delta)return s;
 const before=person.closeness,after=clamp(before+delta);if(before===after)return s;
 const next={...person,closeness:after};
 const profile=generatedProfiles.get(person);if(profile)generatedProfiles.set(next,profile);
 const event={age:s.age,personId:id,name:person.name,before,after,reason};
 const text=`${person.label}${person.name}与你${after>before?'更亲近了':'有些疏远了'}：${reason}。`;
 const shouldLog=!annual||!s.people.lastLoggedChange||closenessLabel(before)!==closenessLabel(after);
 const result={...s,people:inheritSync(s.people,{...s.people,members:{...s.people.members,[id]:next},changeCount:(s.people.changeCount??0)+1,lastChange:event,...(shouldLog&&emit?{lastLoggedChange:event}:{})})};
 if(shouldLog)emit?.(text,null,{node:'people-relationship',...event});return result;
}

/** Names and social ages use only an isolated hash. No demographic stream,
 * income, school attribute or existing relationship state is changed. */
export function ensurePeople(state,emit){
 const source=sourceSnapshot(state),known=state.people&&syncedPeople.get(state.people);
 if(known&&sameSource(source,known)&&!(state.age===0&&!state.people.birthCareRecorded&&emit))return state;
 const old=state.people?.version===1?state.people:{version:1,members:{},changeCount:0,lastAnnualAge:null,birthCareRecorded:false};
 const members={...old.members};
 for(const role of ['mother','father']){
  const p=state.parents?.[role];if(!p)continue;
  members[role]=own(members[role],{id:role,role:'parent',label:role==='mother'?'妈妈':'爸爸',name:p.name,age:p.age,job:p.job,alive:p.alive!==false,diedAge:p.alive===false?p.age:null,active:true,closeness:initialCloseness(state,role)});
 }
 for(let i=0;i<(state.siblings??0);i++){
  const id=`sibling:${i}`,sex=sexFor(state,id,members[id]),bornAt=-(i+1)*2;
  members[id]=own(members[id],generated(state,id,'sibling',sex==='female'?'姐姐':'哥哥',bornAt,sex,state.parents?.father?.name?.[0],members[id]));
 }
 for(let i=0;i<(state.age>=6?2:0);i++){
  const id=`friend:${i}`,sex=sexFor(state,id,members[id]);
  members[id]=own(members[id],generated(state,id,'friend',i?'老朋友':'好朋友',i?1:0,sex,undefined,members[id]));
 }
 for(const [i,kid] of (state.kids??[]).entries()){
  const id=`child:${kid.bornAt}:${i}`,sex=sexFor(state,id,members[id]);
  const fields=generated(state,id,'child',sex==='female'?'女儿':'儿子',kid.bornAt,sex,state.name?.[0],members[id]);
  fields.closeness=kid.leftBehind||kid.careBy==='left-behind'?45:62;members[id]=own(members[id],fields);
 }
 const currentPartner=state.partner&&(state.married||state.partner.alive===false)?state.partner:null;
 for(const [id,p]of Object.entries(members))if(p.role==='partner'){
  const death=(state.relationshipHistory??[]).findLast(h=>['widowed','widow','partner-death','spouse-death'].includes(h.kind)&&(h.partnerId===p.partnerId||h.partnerId===id.slice('partner:'.length)||h.name===p.name));
  const deathAge=death?.partnerAge??death?.diedAge;
  members[id]=death&&Number.isFinite(deathAge)?{...p,active:true,alive:false,age:deathAge,diedAge:deathAge}:{...p,active:p.alive===false||!!currentPartner&&id===`partner:${currentPartner.id??currentPartner.name}`};
 }
 for(const death of state.relationshipHistory??[]){
  if(!['widowed','widow','partner-death','spouse-death'].includes(death.kind))continue;
  const p=(state.exPartners??[]).find(p=>p?.id===death.partnerId||p?.name===death.name),deathAge=death.partnerAge??death.diedAge;
  if(!p||!Number.isFinite(deathAge))continue;
  const id=`partner:${p.id??p.name}`;
  members[id]=own(members[id],{id,partnerId:p.id??p.name,role:'partner',label:'伴侣',name:p.name,age:deathAge,job:p.job,alive:false,diedAge:deathAge,active:true,closeness:65});
 }
 if(currentPartner){
  const p=currentPartner,id=`partner:${p.id??p.name}`;
  members[id]=own(members[id],{id,partnerId:p.id??p.name,role:'partner',label:'伴侣',name:p.name,age:p.age,job:p.job,alive:p.alive!==false,diedAge:p.alive===false?p.age:null,active:true,closeness:Math.round(state.relationship?.closeness??65)});
 }
 if(state.leftBehind&&state.parents?.mother?.away){
  const id='caregiver:grandmother',ageAtBirth=(state.parents?.father?.birthAge??29)+24;
  members[id]=own(members[id],generated(state,id,'grandparent','奶奶',-ageAtBirth,'female',undefined,members[id]));
 }
 let s={...state,people:{...old,members}};
 syncedPeople.set(s.people,source);
 // Only a genuinely new birth gets this moment. Old saves are not given a
 // retroactive birth scene; their next actual choice/year changes closeness.
 if(s.age===0&&!old.birthCareRecorded&&emit){
  s={...s,people:inheritSync(s.people,{...s.people,birthCareRecorded:true})};
  const id=members['caregiver:grandmother']?'caregiver:grandmother':members.mother?.alive?'mother':'father';
  const person=members[id];
  if(person)s=change(s,id,1,`${person.label}把你抱在怀里，认出了你哭声里要人陪的意思`,emit);
 }
 return s;
}
export const familyMembers=s=>Object.values(ensurePeople(s).people.members).filter(p=>p.active!==false);
export const rapport=(s,id)=>ensurePeople(s).people.members[id]?.closeness??50;
export const closeSibling=s=>familyMembers(s).find(p=>p.role==='sibling'&&p.alive&&p.closeness>=65)??null;
export const childVisitFrequency=(s,id)=>rapport(s,id)>=65?1:rapport(s,id)>=40?3:6;
export function canFamilySupport(s){return !!closeSibling(s);}
export function peopleChoice(state,cardId,choice,emit,impact=null){
 let s=ensurePeople(state,emit);if(!cardId)return s;
 const opportunity=s.people.pendingOpportunity;
 if(opportunity?.cardId===cardId){
  const e=opportunity.event,p=s.people.members[e.personId];
  const text=`${p.label}${p.name}与你${e.after>e.before?'更亲近了':'有些疏远了'}：${e.reason}。`;
  emit?.(text,null,{node:'people-relationship',...e});
  const {pendingOpportunity,...people}=s.people;
  return {...s,people:inheritSync(s.people,{...people,lastLoggedChange:e})};
 }
 const living=Object.values(s.people.members).filter(p=>p.alive&&p.active!==false);
 const partner=living.find(p=>p.role==='partner'),children=living.filter(p=>p.role==='child'),parents=living.filter(p=>p.role==='parent'),siblings=living.filter(p=>p.role==='sibling'),friends=living.filter(p=>p.role==='friend');
 const apply=(targets,delta,reason)=>{for(const p of targets)s=change(s,p.id,delta,reason,emit);};
 if(cardId==='family-child-care')apply(children,choice==='hometown'?-12:choice==='parents'?8:3,choice==='hometown'?'你把孩子送回老家，日常的相处变成了隔着电话说话':'你重新排了照护时间，孩子醒着时常能见到你');
 else if(['child-junior-exam','child-college-exam'].includes(cardId))apply(children,['company','together','space','decide'].includes(choice)?7:3,['company','together','space','decide'].includes(choice)?'你听完了孩子的想法，再一起商量升学安排':'你为孩子安排了学习支持，也认真解释了这笔钱的用途');
 else if(cardId==='parent-care-arrangement')apply(parents,choice==='together'?10:choice==='calls'?3:6,choice==='together'?'你为老人腾出房间，把复诊和买菜写进自己的日程':'你把探望和通话的时间固定下来，不再只说有空再联系');
 else if(cardId==='parent-serious-illness')apply(parents,choice==='discuss'?3:8,'你陪着核对治疗安排，老人知道这件事有人一起承担');
 else if(cardId==='sibling-borrowing')apply(siblings,choice==='decline'?-7:choice==='lend'?9:5,choice==='decline'?'你说清了自己家里的开支，对方仍一时有些失落':'你们把能帮多少和何时归还谈清楚，没有让人空等');
 else if(cardId==='siblings-family-division')apply(siblings,choice==='defer'?-5:6,choice==='defer'?'分工一直没谈妥，几次电话都说不到一处':'你们把照护分工一项项说清，谁也不用猜对方的意思');
 else if(cardId.startsWith('relationship-')&&partner)apply([partner],['cold','separate','sue','request-divorce','breakup'].includes(choice)?-12:['consult','talk','continue','withdraw'].includes(choice)?8:0,['cold','separate','sue','request-divorce','breakup'].includes(choice)?'争执之后你们减少了联系，许多话没能继续说完':'你们给彼此留出说话的时间，把上次争执的事情重新谈过');
 else if(cardId==='return-hometown'&&choice==='home')apply(parents,7,'回老家以后，你能常去看看他们，不必把见面都等到过年');
 else if(cardId==='grandchild-care')apply(children,choice==='help'?8:3,choice==='help'?'你答应固定几天帮忙，也把自己的休息时间说清楚':'你们谈妥探望的日子，照护安排没有靠猜测');
 else if(cardId==='child-down-payment')apply(children,choice==='budget'?2:6,choice==='budget'?'你把自己的养老开支说清，又陪孩子核对了预算':'你把愿意支持的数目说清，孩子知道这份帮忙并不轻松');
 else if(cardId.startsWith('people-')){
  // New social cards report their own facts separately. Their choices also
  // leave a mark on the friends who hear how the dilemma was handled.
  const close=/help|stand|support|witness|join|listen|accompany|share|talk|report|return|agree|care|protect/.test(choice),distant=/ignore|avoid|refuse|silence|leave|decline|hide|pass/.test(choice);
  const targets=cardId==='people-sibling-hand'?[closeSibling(s)].filter(Boolean):cardId==='people-child-weekend'?children.filter(p=>p.closeness>=65).slice(0,1):impact?.target==='child'?children.slice(0,1):impact?.target==='parent'?parents.slice(0,1):impact?.target==='sibling'||cardId.includes('relative')||cardId.includes('sibling')?siblings.slice(0,1):friends.slice(0,1);
  if(impact)apply(targets,impact.delta,impact.reason);
  else apply(targets,close?5:distant?-4:1,close?'听你讲完这次为别人费心的事，对方也愿意把自己的难处告诉你':distant?'这次你没有接住求助，后来再联系时两边都拘谨了一些':'你们把彼此能承担的事情说清，往后联络也有了分寸');
 }
 return s;
}
export function annualPeople(state,focus,emit){
 let s=ensurePeople(state,emit);if(s.people.lastAnnualAge===s.age)return s;
 s={...s,people:inheritSync(s.people,{...s.people,lastAnnualAge:s.age})};
 const list=Object.values(s.people.members).filter(p=>p.active!==false&&p.alive);
 const caring=['family','grandchildren','chores','romance'].includes(focus),social=['network','dance','travel','play'].includes(focus),busy=['work','career','side','earn','internship'].includes(focus);
 if(caring){
  const targets=list.filter(p=>['parent','partner','child','grandparent'].includes(p.role));
  for(const p of targets)s=change(s,p.id,3,p.role==='parent'?'你留出时间听老人把近况说完，也记住了下次复诊的日子':p.role==='child'?'你把手机放下，听孩子说了些不必急着讲道理的事':'你把一起吃饭和散步的时间留了出来，没有临时改成别的安排',emit,{annual:true});
 }else if(social){
  const friend=list.find(p=>p.role==='friend'&&p.id===`friend:${s.age%2}`)??list.find(p=>p.role==='friend');
  if(friend)s=change(s,friend.id,3,'你们约好见面，把各自最近的难处慢慢说完',emit,{annual:true});
 }else if(busy&&s.age%3===0){
  const p=list.find(p=>p.role==='child')??list.find(p=>p.role==='partner')??list.find(p=>p.role==='parent');
  if(p)s=change(s,p.id,-3,'你几次忙到很晚，原先答应的见面和通话都往后推了',emit,{annual:true});
 }else if(s.age<6){
  const p=list.find(p=>p.role==='grandparent')??list.find(p=>p.id==='mother');
  if(p)s=change(s,p.id,1,'每天有人应声、喂饭、哄睡，你渐渐记住了这个熟悉的怀抱',emit,{annual:true});
 }else if(s.age%4===0){
  const p=list.find(p=>p.role==='sibling')??list.find(p=>p.role==='friend');
  if(p)s=change(s,p.id,2,'你记得对方提过的难处，这回专门打了个电话问后来怎样',emit,{annual:true});
 }
 return s;
}

const scenes={
 parent:[
  p=>`${p.label}${p.name}把晒好的被子抱进屋，说你下次回来住时就不用再找。你摸到被面还留着太阳的暖意。`,
  p=>`${p.label}${p.name}打电话来问你最近吃得怎样。你这次没有只说「都好」，把一天的事情从头说给对方听。`,
  p=>`陪${p.label}${p.name}走到菜市场，卖菜的人已经认识你们。回程时，你接过了装土豆的那只袋子。`,
  p=>`${p.label}${p.name}找出你小时候的照片，指着一件旧毛衣说当年织了很久。你把照片拍下来留在手机里。`,
  p=>`${p.label}${p.name}记不住手机里新换的位置，你把常用的几个按钮画在纸上，贴在电话旁边。`,
  p=>`${p.label}${p.name}说家里的灯又不亮了。你回去换好灯泡，又坐下来吃完了一顿原本打算省掉的晚饭。`,
  p=>`${p.label}${p.name}把想问医生的问题写在纸上，见到你后又补了一条。你们约好下次复诊一起去。`,
  p=>`${p.label}${p.name}问你今年何时回家。你翻开日历给了一个确切日子，电话那头才开始说准备做什么菜。`,
 ],
 partner:[
  p=>`${p.name}生日那天，你们没有约很多人，只在回家路上买了一小块蛋糕，坐在厨房里慢慢分着吃。`,
  p=>`${p.name}睡前说起白天受的委屈。你忍住替对方立刻出主意的习惯，先把这段话听完。`,
  p=>`周末你和${p.name}把家里的旧东西摊开整理，一张过期车票让你们想起第一次一起出门的日子。`,
  p=>`${p.name}咳嗽了几天，你下班带回热汤，把第二天陪着去门诊的时间空了出来。`,
  p=>`你和${p.name}为了谁洗碗拌了几句嘴。饭后两人把这周的家务重新分了分，谁也没有继续摔门。`,
  p=>`路过夜市时，${p.name}停在一盏小台灯前。你们试了试暖黄的灯光，说把它放在床边看书正好。`,
  p=>`${p.name}翻出你们刚在一起时的聊天记录。那些当年说得郑重的话，如今读起来让两个人都笑了。`,
  p=>`早晨出门前，${p.name}把忘带的钥匙塞进你手里。你们又站在门边确认了一遍今天谁先回家。`,
 ],
 sibling:[
  p=>`${p.label}${p.name}发来家里新修好的门口照片，问你认不认得换掉的那块旧砖。你们聊起小时候藏东西的地方。`,
  p=>`${p.label}${p.name}把家里的照护安排写进群里。你认真回了自己能到的日期，没有再只留一句「到时看」。`,
  p=>`你和${p.label}${p.name}在厨房一起择菜，小时候争最后一个饺子的事又被翻出来，谁都说自己记得更清楚。`,
  p=>`${p.label}${p.name}说起最近工作里的难处。你们边走边聊，走到路口才发现比原计划多绕了一大圈。`,
  p=>`${p.label}${p.name}来时带了一袋家里晒的干菜，临走又问你有没有东西要捎回去。门口的寒暄拖了很久。`,
  p=>`${p.label}${p.name}发来一段旧家庭录像，你们在里面找了半天，才认出镜头角落里那个小小的自己。`,
 ],
 friend:[
  p=>`${p.name}在路边小店等你，先替你点了一杯温水。你们聊完近况，才发现隔壁桌的人已经换了好几轮。`,
  p=>`${p.name}给你发来一张新做成的饭菜照片。你照着试了一次，把失败的那盘也拍给对方看。`,
  p=>`你和${p.name}在旧学校门口碰头，小卖部已经换了招牌。两个人还是顺着当年的放学路走了一段。`,
  p=>`${p.name}搬家后给你寄来新地址。你把它认真存进通讯录，又问了附近哪路公交能到。`,
  p=>`${p.name}这阵子心事重，你们约着沿河走了很久。你没有追问，只把下次见面的日子先约好。`,
  p=>`你和${p.name}翻到多年前的合照，轮流认出一个个已经很少联系的人，也说起谁最近过得不容易。`,
  p=>`${p.name}在你生日那天打来电话，说礼物寄慢了。你们从这个迟到的包裹，一直聊到天色暗下来。`,
  p=>`${p.name}约你参加一次社区活动。你们笨手笨脚做完分配的活，收拾东西时反倒聊得最热闹。`,
  p=>`你在街角遇见${p.name}，两个人都说只聊十分钟，最后却一起去吃了碗面。`,
  p=>`${p.name}把修好的旧收音机带来给你听。频道有些杂音，你们还是听完了那首熟悉的歌。`,
 ],
};
function childScene(s,p,n){
 if(p.age<6)return [
  `${p.name}把积木推到你面前，非要你看那座总往一边歪的小房子。你蹲下来，等孩子自己把最后一块放好。`,
  `给${p.name}洗澡时，孩子讲起白天认识的新朋友。你一边冲掉头发上的泡沫，一边记住了那个新名字。`,
  `${p.name}睡着后还攥着你的衣角。你多坐了一会儿，等那只小手慢慢松开才起身。`,
  `${p.name}学着你叠衣服，一件小上衣被翻了好几遍。你把自己的那件放慢了些，两个人总算一起叠好。`,
  `${p.name}举着一张新画的全家福给你看，你的位置画得很大。你把画贴在冰箱旁，没有问画得像不像。`,
  `接${p.name}回家时下起了雨，孩子坚持自己撑伞。你们挪得很慢，到家时两双鞋都湿透了。`,
 ][n%6];
 if(p.age<19)return [
  `${p.name}把学校发的奖状放到饭桌上，假装只是顺手。你认真读完上面的字，腾出一个位置让孩子自己贴。`,
  `${p.name}说这次没有考好。你们收起卷子先吃饭，饭后才一起看了最难的那两道题。`,
  `${p.name}要参加学校的表演，排练时总找不到拍子。你坐在床边帮着数，数错时两个人一起笑起来。`,
  `${p.name}放学后一直没说话。你陪孩子走到楼下，听完和同学闹别扭的经过，没有急着替谁评理。`,
  `${p.name}把想读的学校圈在简章上。你先问为什么喜欢那里，才拿出纸一起算住宿和路费。`,
  `${p.name}想学一道你常做的菜。你把火关小，站在旁边等孩子自己尝出还差一点什么味道。`,
 ][n%6];
 if(s.age>=60&&p.closeness<40)return `${p.name}回消息越来越简短，今年也没有定下回来的日子。你发出问候后把手机放在桌边，想起以前几次没能好好说完的话。`;
 if(s.age>=60&&s.age%childVisitFrequency(s,p.id)!==0)return `${p.name}这回没能赶回来，给你发来了一张晚饭照片。你们隔着电话互问近况，说好下次再把见面的日子定准。`;
 return [
  `${p.name}回家时提着一袋水果，把最近工作上遇见的事讲给你听。你们吃完饭，碗留在水池里，又多聊了一会儿。`,
  `${p.name}第一次自己做成了一件难事，电话里说得飞快。你听到最后才插上一句，问今晚准备怎样庆祝。`,
  `${p.name}下班路上打来电话，说只是想听听你的声音。你也把这一天的琐事一件件说给孩子听。`,
  `${p.name}带回一张小时候的画，问你还记不记得当时住在哪里。你们顺着画里的门窗，把那个旧家慢慢想起来。`,
  `${p.name}帮你把手机里的照片备份好，你又翻出几张孩子从没见过的老照片。两个人一直看到了傍晚。`,
  `${p.name}来学家里的那道拿手菜，你把用旧的围裙递过去，说今天换你站在旁边尝味道。`,
 ][n%6];
}
export function personalDaily(state,originalText,{templateId='',slot=0}={}){
 const s=ensurePeople(state),u=roll(s,`scene:${s.age}:${slot}:${templateId}`);
 if(s.age<25||u>=.78)return {text:originalText,peopleNamed:false,personIds:[]};
 const all=Object.values(s.people.members).filter(p=>p.active!==false),living=all.filter(p=>p.alive&&(p.role!=='child'||p.age>=0));
 let eligible;
 if(/孩子|亲子|家长|幼儿/.test(originalText))eligible=living.filter(p=>p.role==='child');
 else if(/父母|长辈|复查|医嘱|药盒/.test(originalText))eligible=living.filter(p=>['parent','grandparent'].includes(p.role));
 else if(/朋友|相识|同事|婚礼/.test(originalText))eligible=living.filter(p=>p.role==='friend');
 else if(/家人|晚饭|家务|旧物|照片/.test(originalText))eligible=living.filter(p=>['partner','sibling','parent','child'].includes(p.role));
 if(!eligible?.length)eligible=living.filter(p=>['friend','partner','sibling','child','parent'].includes(p.role));
 const deceased=all.filter(p=>p.alive===false&&['parent','grandparent'].includes(p.role));
 if(deceased.length&&u<.09){
  const p=deceased[(s.age+slot)%deceased.length];
  const memories=[
   `整理旧照片时，你又看到${p.label}${p.name}的笑脸。你把这张照片放在容易拿到的地方，想起对方从前叫你回家吃饭的声音。`,
   `做饭时闻到熟悉的味道，你想起${p.label}${p.name}以前站在灶边的样子。饭好后，你把那道菜的做法写了下来。`,
   `收拾柜子时翻出${p.label}${p.name}留下的一件旧物，你擦去上面的灰，没有急着决定要不要丢掉。`,
   `家人谈起从前，你说了一件关于${p.label}${p.name}的小事。讲到一半才发觉，那句话自己也许多年没说过了。`,
   `路过一家旧店时，你想起曾陪${p.label}${p.name}来过。店里的摆设已经换了，你仍认得门口那级台阶。`,
   `翻通讯录时，你停在${p.label}${p.name}的名字上。那个号码已经不能接通，你还是保留了这条记录。`,
  ],index=Math.floor(roll(s,`memory:${s.age}:${slot}:${templateId}`)*memories.length);
  return {text:memories[index],peopleNamed:true,personIds:[p.id],sceneKey:`memory:${index}`};
 }
 if(!eligible.length)return {text:originalText,peopleNamed:false,personIds:[]};
 const p=eligible[Math.floor(roll(s,`person:${s.age}:${slot}:${templateId}`)*eligible.length)],n=Math.floor(roll(s,`line:${s.age}:${slot}:${templateId}`)*10000);
 let text;
 if(p.role==='child')text=childScene(s,p,n);
 else if(p.closeness<40)text=`你给${p.label}${p.name}打了电话，几句话后两边都安静下来。你们说了下次再聊，挂断后才想起还有些事没问出口。`;
 else if(p.role==='sibling'&&p.closeness>=65&&s.job==='待业')text=`${p.label}${p.name}知道你还在找工作，主动说可以先帮你接送孩子、留意附近的招工消息。你们把各自能做的事认真说清。`;
 else {const pool=scenes[p.role==='grandparent'?'parent':p.role]??scenes.friend;text=pool[n%pool.length](p);}
 return {text,peopleNamed:true,personIds:[p.id],sceneKey:p.role==='child'?`child:${p.age<6?'small':p.age<19?'school':s.age>=60?'later':'adult'}:${n%6}`:p.closeness<40?'distance':`${p.role}:${n%(scenes[p.role==='grandparent'?'parent':p.role]??scenes.friend).length}`};
}

/** Optional later-life cards. The scheduler may offer these in spare slots;
 * they never join the legacy random pool. Availability is a real consequence
 * of recorded closeness, not a label added after an unrelated card was drawn. */
export function relationshipOpportunity(state){
 const s=ensurePeople(state),child=familyMembers(s).find(p=>p.role==='child'&&p.alive&&p.age>=18&&p.closeness>=65);
 const sibling=closeSibling(s);
 const chosen=s.age>=60?child:s.age>=25?sibling:null;
 if(!chosen)return null;
 const isChild=chosen.role==='child',id=isChild?'people-child-weekend':'people-sibling-hand';
 const availability=current=>{
  const person=ensurePeople(current).people.members[chosen.id];
  return !!person?.alive&&person.active!==false&&person.closeness>=65&&(isChild?current.age>=60:current.age>=25);
 };
 const effect=(delta,reason)=>current=>{
  const next=change(ensurePeople(current),chosen.id,delta,reason);
  return {people:inheritSync(next.people,{...next.people,pendingOpportunity:{cardId:id,event:next.people.lastChange}})};
 };
 return {id,category:'身边的人',stage:isChild?'senior':'adult',maxPerLife:1,cooldown:100,weight:()=>1,when:availability,
  title:isChild?`${chosen.name}约好回来过周末`:`${chosen.label}${chosen.name}主动说能搭把手`,
  body:isChild?`${chosen.name}说，想留一个不用赶路的周末，陪你吃饭、走走。以前你肯听孩子把话说完，如今孩子也想把时间留给你。`:`${chosen.label}${chosen.name}听说你最近有些忙乱，主动问哪件事可以分着做。你们这些年的往来，让这句帮忙不必绕很多弯。`,
  options:isChild?[
   {id:'welcome',label:'把周末空出来，商量一起做什么',hint:'接受相伴，关系更亲近',requires:availability,effects:effect(6,'孩子特地留出一个周末，你也把想一起做的事认真告诉了对方')},
   {id:'short-visit',label:'只约一顿饭，给彼此留休息时间',hint:'接住好意，也说明自己的安排',effects:effect(2,'你们把见面的时间商量好，没有让这次好意变成谁的负担')},
   {id:'later',label:'这回先不见，等以后再约',hint:'没有约定日期，联系会少一些',effects:effect(-4,'见面的日子一再往后推，孩子渐渐拿不准你是否愿意再相聚')},
  ]:[
   {id:'accept-help',label:'说出眼前最需要帮的一件事',hint:'接受支持，关系更亲近',requires:availability,effects:effect(5,'你接住了这份帮忙，也记住了往后该在什么地方回一把手')},
   {id:'share-task',label:'只分一小部分，一起把时间排清楚',hint:'共同分担，也照顾对方的余力',effects:effect(3,'你们把各自能承担的时间说清，帮忙的人不用靠猜测')},
   {id:'decline-help',label:'道谢后婉拒，这次自己处理',hint:'保留自己的安排，也让对方有些距离感',effects:effect(-2,'你说自己能处理，对方仍有一点担心，也不知以后该不该再问')},
  ]};
}
