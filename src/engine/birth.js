import { random, weightedIndex, idToSeed, seedToId, hashSeed, ABBRS, parseId } from './rng.js';
import { DATA, PROVINCES, BIRTH_WEIGHTS, tierFor } from './stats.js';
import { uniqueNameFor } from '../content/names.js';
import { placeFor } from '../content/places.js';
import { birthText } from '../content/presentation.js';
import { P, clamp } from './params.js';
export function createBirth(id) {
 const seed=idToSeed(id), parsed=parseId(id); let r=hashSeed(seed); const draw=()=>{const x=random(r);r=x.seed;return x.value;};
 const province=PROVINCES[parsed.provinceIndex],tier=tierFor(province);
 const hukou=draw()<clamp(1-DATA.province_tier[tier].urban_share+P.ruralOffset,0,1)?'rural':'urban';
 const wealthQ=weightedIndex(hukou==='urban'?P.wealthUrban:P.wealthRural,draw())+1;
 const sex=draw()<P.sexMale?'male':'female';
 const parent=()=>({age:23+Math.floor(draw()*13),education:wealthQ>=4?'大专及以上':wealthQ===3?'高中/中职':'初中及以下',job:(wealthQ>=4?['教师','白领','公务员','个体经营者']:hukou==='rural'?['农民','外出务工者','个体经营者']:['工人','服务业从业者','个体经营者'])[Math.floor(draw()*(wealthQ>=4?4:3))]});
 const parents={mother:parent(),father:parent()};
 const leftBehind=hukou==='rural'&&draw()<DATA.family.left_behind_share_rural.value;
 const siblings=draw()<(hukou==='urban'?P.onlyChildUrban:P.onlyChildRural)?0:1+Math.floor(draw()*2);
 const gradePct=clamp(50+(draw()-.5)*70+(wealthQ-3)*4);
 for(const [role,p] of Object.entries(parents)){p.name=uniqueNameFor(role==='mother'?'female':'male',parsed.year-p.age,draw(),undefined,Object.values(parents).map(p=>p.name).filter(Boolean));p.birthAge=p.age;p.alive=true;p.health=85;p.away=leftBehind&&(role==='father'||draw()<.6);if(p.away){p.job='外出务工者';p.workplace=role==='father'?'外地工地':'外地工厂';}}
 const name=uniqueNameFor(sex,parsed.year,draw(),parents.father.name[0],Object.values(parents).map(p=>p.name)),place=placeFor(province,draw()),month=1+Math.floor(draw()*12);
 const talentDraw=random(hashSeed(seed^0x12acf873)).value;
 const state={talent:talentDraw<.12?['音乐','美术','体育','数学','口才','手巧'][Math.floor(talentDraw/.02)]:null,engineVersion:2,cardRngState:hashSeed(seed^0x5bd1e995),cardHistory:[],cardSeeds:[],cardUsage:{},skills:{},educationFinance:{},eliteFamily:wealthQ===5&&random(hashSeed(seed^0x731ab28f)).value<.01,name,place,month,templateUsage:{},id,seed,year:parsed.year,rngState:r,age:0,alive:true,sex,province,tier,hukou,wealthQ,parents,leftBehind,siblings,attrs:{health:85,happy:65,knowledge:0,social:40,grind:0},gradePct,edu:'none',job:'尚未就业',income:0,assets:0,city:'老家',married:false,kids:[],log:[],history:[{age:0,happy:65}],pending:null,choices:[],record:{junior:false,stage:false,general:false,completed:false,gaokao:false,admitted:false,elite:false,age22:null},repeatUsed:false};state.log=[{age:0,text:birthText(state),stat:null,node:'birth'}];return state;
}
export function drawBirth(seed,year=2026) { let a=random(seed>>>0);const index=weightedIndex(BIRTH_WEIGHTS,a.value);a=random(a.seed);return createBirth(`${ABBRS[index]}-${year}-${String(Math.floor(a.value*1000000)).padStart(6,'0')}`); }
export {seedToId};
