import {createBirth} from './birth.js';
import {hashSeed,random,ABBRS} from './rng.js';
import {PROVINCES,tierFor} from './stats.js';
import {isBachelor} from './education.js';
import {nameFor} from '../content/names.js';
import {birthText} from '../content/presentation.js';
import {P} from './params.js';
import reference from './reference.json' with {type:'json'};
import {netAssets} from './money.js';
import {familyGeneration,canRelay,settlement,familyMembers} from './family.js';
const rank=value=>{
 const xs=reference.income;let lo=0,hi=xs.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(xs[mid]<=value)lo=mid+1;else hi=mid;}
 return lo/xs.length;
};
const bounded=x=>Math.max(0,Math.min(.999999,x));
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

