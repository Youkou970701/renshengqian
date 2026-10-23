import { createBirth } from './birth.js';
import { hashSeed, random, ABBRS } from './rng.js';
import { PROVINCES, tierFor } from './stats.js';
import { isBachelor } from './education.js';
import { nameFor } from '../content/names.js';
import { birthText } from '../content/presentation.js';
import {P} from './params.js';
import reference from './reference.json' with {type:'json'};
import {netAssets} from './money.js';

export const familyGeneration=s=>s.family?.generation??1;
export const canRelay=s=>s.alive===false&&s.kids?.length>0&&familyGeneration(s)<3;
const rank=value=>{
 const xs=reference.income;let lo=0,hi=xs.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(xs[mid]<=value)lo=mid+1;else hi=mid;}
 return lo/xs.length;
};
const bounded=x=>Math.max(0,Math.min(.999999,x));
export function settlement(s){
 if(s.city==='一线'){
  const cities=[{province:'北京',place:'朝阳区'},{province:'上海',place:'浦东新区'},{province:'广东',place:'广州市'},{province:'广东',place:'深圳市'}];
  const city=cities[Math.floor(random(hashSeed(s.seed+7919)).value*cities.length)];
  return {...city,hukou:'urban',label:city.province===city.place?city.place:city.province+city.place};
 }
 const hukou=s.city==='省会'||s.city==='县城'?'urban':s.hukou;
 const capitals={河北:'石家庄市',山西:'太原市',内蒙古:'呼和浩特市',辽宁:'沈阳市',吉林:'长春市',黑龙江:'哈尔滨市',江苏:'南京市',浙江:'杭州市',安徽:'合肥市',福建:'福州市',江西:'南昌市',山东:'济南市',河南:'郑州市',湖北:'武汉市',湖南:'长沙市',广东:'广州市',广西:'南宁市',海南:'海口市',四川:'成都市',贵州:'贵阳市',云南:'昆明市',西藏:'拉萨市',陕西:'西安市',甘肃:'兰州市',青海:'西宁市',宁夏:'银川市',新疆:'乌鲁木齐市'};
 const place=s.city==='省会'?(capitals[s.province]??s.place):s.place;
 return {province:s.province,place,hukou,label:s.province+place};
}
function snapshot(s){return {id:s.id,seed:s.seed,name:s.name,year:s.year,sex:s.sex,age:s.age,province:s.province,place:s.place,hukou:s.hukou,wealthQ:s.wealthQ,edu:s.edu,job:s.lastJob??s.job,city:s.city,leftBehind:s.leftBehind,settlement:settlement(s),generation:familyGeneration(s)};}
export const familyMembers=s=>[...(s.family?.ancestors??[]),snapshot(s)];
export function familyGoalStatus(s,goal){const members=familyMembers(s);return goal==='city'?members.some(m=>m.hukou==='urban'):goal==='bachelor'?members.some(isBachelor):goal==='all-bachelor'?members.length===3&&members.every(isBachelor):goal==='free';}

// The empirical nationwide income distribution is the existing 100,000-life
// reference, not a claim about actual Chinese households. Assets are converted
// to an annual resource equivalent at 4%, then ranked in that same distribution.
// 30% of transitions redraw a resource percentile; the remainder retains parental
// resources plus bounded variation. This permits both upward and downward moves.
export function deriveChild(parentEnd,{generation=familyGeneration(parentEnd)+1,rootId=parentEnd.family?.rootId??parentEnd.id.split('·')[0]}={}){
 if(!canRelay(parentEnd)||generation!==familyGeneration(parentEnd)+1||generation>3)return null;
 const seed=hashSeed(parentEnd.seed+Math.imul(generation,0x9e3779b9));let r=seed;
 const draw=()=>{const x=random(r);r=x.seed;return x.value;};
 const kid=parentEnd.kids[0],year=parentEnd.year+kid.bornAt,destination=settlement(parentEnd);
 // Residence for work is not the same as a child's birthplace or household registration.
 // Use an independent family-only stream, leaving both the first life and the
 // descendant's existing resource draws independent of this placement decision.
 let locationSeed=hashSeed(seed+0x517cc1b7);
 const locationDraw=()=>{const x=random(locationSeed);locationSeed=x.seed;return x.value;};
 const degree=isBachelor(parentEnd),lowIncome=rank(parentEnd.peakIncome??parentEnd.income??0)<=.5;
 const urbanHouse=parentEnd.ownsHouse&&(parentEnd.money?.property?parentEnd.money.property.city!=='老家':destination.hukou==='urban');
 const ruralHome=parentEnd.hukou==='rural'?{province:parentEnd.province,place:parentEnd.place,hukou:'rural'}:null;
 let home=destination;
 if(ruralHome){
  const cityChance=destination.hukou!=='urban'?0:degree&&urbanHouse?P.family.urbanWithDegreeAndHouse:degree||urbanHouse?P.family.urbanWithDegreeOrHouse:1-(lowIncome?P.family.ruralHomeLowIncome:P.family.ruralHomeOtherIncome);
  if(locationDraw()>=cityChance)home=ruralHome;
 }
 const awayForWork=home.hukou==='rural'&&destination.hukou==='urban';
 const leftBehind=awayForWork&&locationDraw()<P.family.leftBehindAway;
 const serial=Math.floor(draw()*1000000),baseId=`${ABBRS[PROVINCES.indexOf(home.province)]}-${year}-${String(serial).padStart(6,'0')}`;
 const child=createBirth(baseId);child.seed=seed;child.rngState=hashSeed(seed);
 const spouseSex=parentEnd.sex==='male'?'female':'male',spouseAge=Math.max(20,kid.bornAt+Math.floor(draw()*7)-3);
 const playerIncome=parentEnd.peakIncome??parentEnd.income??0;
 const spouse={name:nameFor(spouseSex,parentEnd.year,draw()),sex:spouseSex,birthAge:spouseAge,age:spouseAge,job:isBachelor(parentEnd)?'白领':destination.hukou==='rural'?'农民':'工人',education:isBachelor(parentEnd)?'大专及以上':'初中及以下',income:Math.round(playerIncome*(.45+draw()*.9)),assets:Math.round(Math.max(0,netAssets(parentEnd))*(.4+draw()*1.2))};
 const resources=.65*rank((playerIncome+spouse.income)/2)+.35*rank((Math.max(0,netAssets(parentEnd))+spouse.assets)/2*.04);
 const correlated=resources+(isBachelor(parentEnd)?.06:0)+(home.hukou==='urban'?.04:0)+(draw()-.5)*.4;
 const independent=draw()<.30;
 child.wealthQ=1+Math.floor(bounded(independent?draw():correlated)*5);
 child.id=rootId+(generation===2?'·二代':'·三代');child.year=year;child.province=home.province;child.place=home.place;child.tier=tierFor(home.province);child.hukou=home.hukou;
 child.leftBehind=kid.careBy==='left-behind'?true:kid.careBy==='parents'?false:leftBehind;child.parentCriminalRecord=!!parentEnd.record.criminalRecord;
 const playerRole=parentEnd.sex==='male'?'father':'mother',spouseRole=playerRole==='father'?'mother':'father';
 child.parents={
  [playerRole]:{name:parentEnd.name,sex:parentEnd.sex,age:kid.bornAt,birthAge:kid.bornAt,job:parentEnd.lastJob??parentEnd.job,education:isBachelor(parentEnd)?'大专及以上':['high','vocational','college'].includes(parentEnd.edu)?'高中/中职':'初中及以下',alive:true,health:85,away:child.leftBehind,storyDeathAge:parentEnd.age,previousPlayer:true},
  [spouseRole]:{...spouse,age:spouse.birthAge,birthAge:spouse.birthAge,alive:true,health:85,away:child.leftBehind},
 };
 // Preserve the actual parent occupation; away describes location, not a new job.
 if(child.leftBehind)for(const p of Object.values(child.parents))p.workplace=destination.label;
 child.name=nameFor(child.sex,year,draw(),child.parents.father.name[0]);
 child.family={generation,rootId,ancestors:familyMembers(parentEnd),parentSpouse:spouse,workSettlement:destination,birthPlacement:{lowIncome,awayForWork},resourcePercentile:resources,mobilityRedraw:independent};
 child.gradePct=Math.max(0,Math.min(100,child.gradePct+(child.wealthQ-createBirth(baseId).wealthQ)*4+Math.min(6,(kid.gradeSupport??0)+(kid.educationInvestment??0)/20000)));child.family.educationInvestment=kid.educationInvestment??0;child.family.careBy=kid.careBy??null;
 child.log=[{age:0,text:birthText(child),stat:null,node:'birth'}];
 return child;
}

// Calendar years identify actual relatives: a previous player is a parent in the
// second life, and only a grandparent in the third life. Never swap those roles.
export function familyCareEvent(s){
 if(!s.family||s.age<1||s.age>12)return null;
 const ancestors=s.family.ancestors,previous=ancestors.at(-1),grand=ancestors.at(-2);
 if(s.leftBehind&&previous.leftBehind&&[3,7,11].includes(s.age)){
  const role=previous.sex==='female'?'妈妈':'爸爸',p=s.parents[previous.sex==='female'?'mother':'father'];
  if(!p?.alive||!p.away)return null;
  const text={
   3:`${role}${previous.name}小时候也常等父母过年回来。如今你在电话这头问，什么时候才能见到${role}。`,
   7:`${role}${previous.name}记得小时候等电话的心情。视频快挂断时，你又问了一次下一次回家的日子。`,
   11:`${role}${previous.name}小时候把想说的话攒到过年。现在，你也把学校的事记在本子上，等${role}回家。`,
  }[s.age];
  return {text,templateId:`family-left-loop-${s.age}`,node:'familyCare',relative:role,relativeName:previous.name};
 }
 const relation=grand?(previous.sex==='female'?(grand.sex==='female'?'外婆':'外公'):(grand.sex==='female'?'奶奶':'爷爷')):(previous.sex==='female'?'妈妈':'爸爸');
 const relative=grand??previous,calendarAge=s.year+s.age-relative.year;
 if(calendarAge>=relative.age)return null;
 const correspondingParent=Object.values(s.parents).find(p=>p.previousPlayer);
 if(!grand&&correspondingParent?.away)return null;
 const who=relation+relative.name;
 const templates=[
  `${who}把你抱到窗边，教你辨认回家的那条路。`,
  `${who}给你留了一只小碗，吃饭时总让你坐在伸手够得到的地方。`,
  `${who}牵着你去买菜，回家路上让你慢慢数过街的台阶。`,
  `${who}收好你的第一张画，夹进了家里的旧相册。`,
  `${who}替你缝好书包的带子，说读书要带的东西都放得下。`,
  `${who}陪你走到学校门口，等你进了教室才转身。`,
  `${who}翻出自己年轻时的照片，你第一次知道大人也曾是个孩子。`,
  relative.leftBehind?`${who}小时候常常等父母回家。如今放学时，校门口总有人等你。`:`${who}把每天接你放学的时间记在纸上，贴在门边。`,
  `${who}陪你把错题重新读了一遍，没催你立刻给出答案。`,
  `${who}讲起自己当年求学的路，你把这些故事写进了作文。`,
  `${who}替你把水壶装满，叮嘱你路上慢一点。`,
  `${who}坐在灯下听你说学校的事，这一天没有急着打断你。`,
 ];
 return {text:templates[s.age-1],templateId:`family-care-${s.age}`,node:'familyCare',relative:relation,relativeName:relative.name};
}
