import {DATA,PROVINCES} from './stats.js';
import {hashSeed,random} from './rng.js';
import {nameFor} from '../content/names.js';
import {netAssets} from './money.js';

// Civil Code, arts. 1062–1064, 1076–1079, 1087–1089 (official text):
// https://tjca.miit.gov.cn/zwgk/zcwj/flfg/art/2020/art_20cf1a2e1b854924b5caa744c8045d1f.html
// Equal division is this game's ordinary agreed settlement, not a claim that
// courts always divide equally. Premarital individual property is excluded.
export const RELATIONSHIP_RULES={status:'参数',partnerSavingRate:.22,consultationCost:1200,agreementCoolingDays:30,agreementWindowDays:30};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const day=s=>s.age*365+(s.relationshipDayOffset??0);
const roll=(s,salt)=>random(hashSeed(s.seed^Math.imul(s.age+1,0x731ab28f)^Math.imul((s.relationshipCount??0)+1,0x1f123bb5)^salt)).value;
const copy=s=>({...s,relationship:s.relationship?structuredClone(s.relationship):null,partner:s.partner?structuredClone(s.partner):null,datingPartner:s.datingPartner?structuredClone(s.datingPartner):null,relationshipHistory:[...(s.relationshipHistory??[])],record:{...s.record},attrs:{...s.attrs},log:[...(s.log??[])]});
const emitEvent=(s,emit,text,meta={})=>emit(text,null,{node:'relationship',...meta});
export function brideGiftQuote(province,hukou){
 const source=DATA.family?.bride_price??DATA.marriage?.bride_price??{};
 const known=source.by_province?.[province]?.[hukou];
 if(typeof known?.value==='number'||typeof known==='number')return {value:known?.value??known,status:known?.status??'已核',source:'cn-stats'};
 // No authoritative province table is supplied. A small smooth, fixed model
 // variation creates local quotes without portraying any region as a type.
 const index=Math.max(0,PROVINCES.indexOf(province));
 const baseline=source.rural_mean_2024?.value??128000;
 return {value:Math.round(baseline*(hukou==='rural'?1:.65)*(1+.12*Math.sin(index*1.7))/1000)*1000,status:'参数',source:'缺少权威分省城乡调查；非地区结论'};
}
export function partnerCandidate(s){
 if(s.datingPartner)return structuredClone(s.datingPartner);
 const u=n=>roll(s,n*0x5bd1e995),sex=s.sex==='male'?'female':'male';
 const age=s.age<18?Math.min(17,Math.max(13,s.age+Math.floor(u(1)*5)-2)):Math.max(18,s.age+Math.floor(u(1)*9)-4);
 const province=u(2)<.72?s.province:PROVINCES[Math.floor(u(3)*PROVINCES.length)];
 const education=age<18?'在读':u(4)<.25?'初中及以下':u(4)<.60?'高中或中职':u(4)<.80?'大专':'本科及以上';
 const roles=age<18?['学生']:age>=65?['退休职工','务农','零工']:['企业职员','工厂工人','店员','技术员','教师','个体经营者'];
 const job=roles[Math.floor(u(5)*roles.length)],income=age<18?0:Math.round((age>=65?18000:28000)+u(6)*(age>=65?30000:90000));
 const assets=age<18?0:Math.round(income*(.4+u(7)*5)),quote=brideGiftQuote(province,s.hukou),gift=age<18?0:Math.round(quote.value*(.6+u(8)*.8)/1000)*1000;
 return {id:`partner-${s.seed}-${s.age}-${s.relationshipCount??0}`,name:nameFor(sex,s.year,u(9)),sex,age,province,education,job,income,assets,ownsHouse:age>=25&&u(10)<.5,ownsCar:age>=22&&u(11)<.4,personality:['温和','直爽','谨慎','开朗','安静'][Math.floor(u(12)*5)],family:{fatherJob:['工人','务农','职员','个体经营者'][Math.floor(u(13)*4)],motherJob:['工人','务农','职员','个体经营者'][Math.floor(u(14)*4)],siblings:Math.floor(u(15)*3)},brideGift:gift,dowry:Math.round(gift*(.2+u(16)*.5)/1000)*1000,brideGiftStatus:quote.status,quote};
}
export function partnerSummary(s){const p=partnerCandidate(s);return `${p.name}，${p.age}岁，${p.province}，${p.education}，${p.job}，年收入${p.income}元，存款${p.assets}元，${p.ownsHouse?'有房':'暂无房'}、${p.ownsCar?'有车':'暂无车'}。彩礼意向${p.brideGift}元、嫁妆意向${p.dowry}元（${p.brideGiftStatus}，可协商）。`;}

export function marryPartner(s,candidate=partnerCandidate(s),emit=()=>{}){
 if(s.married&&s.relationship?.marriage)return s;
 if(s.age<(s.sex==='male'?22:20)||candidate.age<(candidate.sex==='male'?22:20))throw new Error('尚未达到本局结婚年龄');
 const p=structuredClone(candidate),playerNet=netAssets(s);
 s.partner={...p,marriedAt:s.age};s.datingPartner=null;s.married=true;
 s.relationship={status:'married',closeness:65,marriage:{startedAt:s.age,startedDay:day(s),playerPremarital:playerNet,partnerPremarital:p.assets,lastPlayerNet:playerNet,playerCommon:0,partnerCommon:0,settledAge:s.age},divorce:null,separatedAt:null,deniedAt:null};
 s.relationshipHistory=[...(s.relationshipHistory??[]),{kind:'marriage',age:s.age,day:day(s),partnerId:p.id,name:p.name}];
 s.record={...s.record,marriages:(s.record?.marriages??0)+1};
 emitEvent(s,emit,`你和${p.name}登记结婚。双方的婚前个人财产分别保留，往后的共同收益另行记录。`);
 return s;
}

export function annualRelationships(s,emit=()=>{}){
 if(s.datingPartner){const previous=s.datingPartner.updatedAt??s.relationshipHistory?.findLast(x=>x.kind==='dating')?.age??s.age;const delta=Math.max(0,s.age-previous);s.datingPartner={...s.datingPartner,age:s.datingPartner.age+delta,updatedAt:s.age};if(s.datingPartner.age>=18&&s.datingPartner.job==='学生')s.datingPartner={...s.datingPartner,job:'企业职员',education:'高中或中职',income:30000+Math.floor(roll(s,0x61b9)*50000)};}
 if(!s.married)return s;
 if(!s.relationship?.marriage)marryPartner(s,s.partner??partnerCandidate(s),emit);
 const r=structuredClone(s.relationship),m=r.marriage;s.relationship=r;
 if(m.settledAge===s.age)return s;
 const currentNet=netAssets(s),delta=currentNet-m.lastPlayerNet;
 m.playerCommon+=delta;m.lastPlayerNet=currentNet;
 // The partner's actual simulated yearly saving is maintained separately; it
 // is never added as premarital capital to the player's account.
 const partnerIncome=s.partner?.income??0;
 m.partnerCommon+=Math.round(partnerIncome*RELATIONSHIP_RULES.partnerSavingRate);
 m.settledAge=s.age;
 if(s.partner)s.partner={...s.partner,age:s.partner.age+1};
 r.closeness=clamp((r.closeness??65)+(roll(s,0x19c3)<.5?-2:2),0,100);
 expireAgreement(s,emit);
 return s;
}

export function marriageSettlement(s){
 const m=s.relationship?.marriage;if(!m)throw new Error('当前没有婚姻财产记录');
 const playerCommon=m.playerCommon+(netAssets(s)-m.lastPlayerNet),partnerCommon=m.partnerCommon;
 const joint=playerCommon+partnerCommon,playerShare=joint/2;
 return {joint,playerShare,partnerShare:joint-playerShare,playerCommon,partnerCommon,transfer:playerShare-playerCommon,playerPremarital:m.playerPremarital,partnerPremarital:m.partnerPremarital};
}
function completeDivorce(s,emit,route){
 const settlement=marriageSettlement(s);
 s.assets+=settlement.transfer;
 s.relationshipHistory=[...(s.relationshipHistory??[]),{kind:'divorce',age:s.age,day:day(s),partnerId:s.partner?.id,route,settlement}];
 s.exPartners=[...(s.exPartners??[]),s.partner];s.partner=null;s.datingPartner=null;s.spouseEconomy=null;s.married=false;
 s.relationship={status:'single',closeness:0,marriage:null,divorce:null,separatedAt:null,deniedAt:null};
 s.relationshipCount=(s.relationshipCount??0)+1;s.record={...s.record,divorces:(s.record?.divorces??0)+1};
 emitEvent(s,emit,`婚姻关系解除。婚前个人财产各自保留；本局共同净财产${Math.round(settlement.joint)}元，${route==='court'?'依法判决分割':'按双方协议分割'}，你分得${Math.round(settlement.playerShare)}元。`,{divorceRoute:route,settlement});
}
function expireAgreement(s,emit){
 const request=s.relationship?.divorce;
 if(request&&day(s)>request.requestedDay+60){s.relationship.divorce=null;emitEvent(s,emit,'冷静期结束后未在三十日登记窗口内办理，离婚登记申请视为撤回。');}
}
export function relationshipAction(s,action,emit=()=>{}){
 s.relationship=s.relationship?structuredClone(s.relationship):{status:s.married?'married':'single',closeness:50};
 expireAgreement(s,emit);
 if(action==='date'){
  if(s.married)throw new Error('当前已有婚姻关系');
  s.datingPartner=partnerCandidate(s);s.relationship.status='dating';s.relationshipCount=(s.relationshipCount??0)+1;
  s.relationshipHistory=[...(s.relationshipHistory??[]),{kind:'dating',age:s.age,partnerId:s.datingPartner.id}];
  emitEvent(s,emit,`你和${s.datingPartner.name}开始交往。`);return s;
 }
 if(action==='breakup'){
  if(s.married)throw new Error('结束婚姻需要办理离婚');
  s.relationshipHistory=[...(s.relationshipHistory??[]),{kind:'breakup',age:s.age,partnerId:s.datingPartner?.id}];s.datingPartner=null;s.relationship.status='single';s.relationshipCount=(s.relationshipCount??0)+1;
  emitEvent(s,emit,'你们认真谈过后，结束了这段交往。');return s;
 }
 if(action==='marry')return marryPartner(s,partnerCandidate(s),emit);
 if(!s.married||!s.relationship.marriage)throw new Error('当前没有可处理的婚姻关系');
 const r=s.relationship;
 if(action==='wait-30-days'){
  s.relationshipDayOffset=(s.relationshipDayOffset??0)+30;expireAgreement(s,emit);
  emitEvent(s,emit,'又过了三十天。年龄、工资和年度经营没有重复结算。');return s;
 }
 if(action==='withdraw'){
  r.divorce=null;emitEvent(s,emit,'一方撤回了离婚登记申请，婚姻关系继续。');return s;
 }
 if(action==='request-divorce'){
  r.divorce={requestedDay:day(s),partnerConsents:r.partnerConsents!==false};
  if(!r.divorce.partnerConsents){r.divorce=null;emitEvent(s,emit,'对方不同意协议离婚，登记申请未能提出；仍可选择起诉。');}
  else emitEvent(s,emit,'双方提出离婚登记申请，进入三十日冷静期，期间任一方可以撤回。');
  return s;
 }
 if(action==='register-divorce'){
  const request=r.divorce;if(!request)throw new Error('没有有效的离婚登记申请');
  const elapsed=day(s)-request.requestedDay;if(elapsed<30)throw new Error('三十日冷静期尚未结束');
  if(elapsed>60)throw new Error('登记窗口已过期');
  if(r.partnerConsents===false){r.divorce=null;emitEvent(s,emit,'对方未共同到场，离婚登记未完成。');return s;}
  completeDivorce(s,emit,'agreement');return s;
 }
 if(action==='opponent-sue'){r.partnerWantsDivorce=true;r.separatedAt??=day(s);emitEvent(s,emit,'对方提起离婚诉讼，你们分别居住。你可以不同意离婚并依法陈述，法院仍按实际事实审理。');return relationshipAction(s,'sue',emit);}
 if(action==='sue'){
  const broken=!!r.legalBreakdown||!!r.domesticViolence||!!r.abandonment||!!r.bigamy||!!r.habitualGambling||!!r.drugAbuse;
  const separated=r.separatedAt!=null?day(s)-r.separatedAt:0;
  const afterDenied=r.deniedAt!=null&&r.separatedAt!=null?day(s)-Math.max(r.deniedAt,r.separatedAt):0;
  if(broken||separated>=730||afterDenied>=365)completeDivorce(s,emit,'court');
  else{r.deniedAt??=day(s);emitEvent(s,emit,'法院审理并调解，本局尚未认定感情确已破裂，未判准离婚。判决后若双方又分居满一年，再次起诉应当准予离婚。');}
  return s;
 }
 if(action==='separate'){r.separatedAt??=day(s);r.closeness=Math.max(0,r.closeness-8);emitEvent(s,emit,'你们分开居住，开始分别安排生活。');return s;}
 if(action==='consult'){
  if(s.assets<RELATIONSHIP_RULES.consultationCost)throw new Error('咨询费用不足');
  s.assets-=RELATIONSHIP_RULES.consultationCost;r.closeness=clamp(r.closeness+12,0,100);emitEvent(s,emit,'你们参加婚姻咨询，尝试把各自的需要说清楚。');return s;
 }
 if(action==='cold'){r.closeness=clamp(r.closeness-10,0,100);emitEvent(s,emit,'你们暂时减少沟通，问题仍留在生活里。');return s;}
 if(action==='tolerate'){r.closeness=clamp(r.closeness-3,0,100);emitEvent(s,emit,'你选择先维持现状，没有提出离婚。');return s;}
 throw new Error('未知关系行动');
}
export function relationshipPatch(previous,action){
 const s=copy(previous),events=[];
 for(const command of Array.isArray(action)?action:[action])relationshipAction(s,command,(text,stat,meta)=>events.push({age:s.age,text,stat,...meta}));
 // Root card integration may read relationshipEvents; log also supports direct
 // menu actions without advancing annual simulation time.
 s.relationshipEvents=events;
 return {relationship:s.relationship,relationshipDayOffset:s.relationshipDayOffset??0,relationshipHistory:s.relationshipHistory,relationshipCount:s.relationshipCount??0,partner:s.partner??null,datingPartner:s.datingPartner??null,exPartners:s.exPartners??[],spouseEconomy:s.spouseEconomy??null,married:!!s.married,assets:s.assets,record:s.record,relationshipEvents:events};
}
