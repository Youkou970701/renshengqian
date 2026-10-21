import{PROVINCES}from'../engine/stats.js';import{ACHIEVEMENTS,achievementIds}from'../content/achievements.js';
import rarity from'../content/achievements-rarity.json'with{type:'json'};import{ENGINE_HASH}from'../content/engine-version.js';
export const RARITY_POLICY=rarity.policy;
export const COLLECTION_KEY='toutai-sim:collection:v1';
export const PROVINCE_CELLS=PROVINCES;
export const ORIGIN_CELLS=['urban','rural'].flatMap(h=>[1,2,3,4,5].map(q=>({id:`${h}-${q}`,label:`${h==='urban'?'城市':'乡村'} · ${['收入紧张','收入不宽裕','生活稳定','有些积蓄','积蓄充足'][q-1]}`})));
export const EDUCATION_CELLS=[['none','初中未完成'],['junior','初中'],['vocational','中职'],['high','普通高中'],['college','专科'],['bachelor','本科'],['211','211本科'],['985','985本科'],['master','硕士']].map(([id,label])=>({id,label}));
export const JOB_CELLS=['本地服务业','公务员','技术员','工厂工人','企业职员','建筑工人','互联网职员','务农','个体户','医护','老板','网约车司机','事业编','外卖骑手','教师'];
export const LIFESPAN_CELLS=[['under30','未满30岁'],['30-59','30至59岁'],['60-79','60至79岁'],['80-99','80至99岁'],['100plus','100岁以上']].map(([id,label])=>({id,label}));
export function checkRarity(data=rarity,expected=ENGINE_HASH){if(data.n!==100000||data.engineHash!==expected)throw Error('模拟频率版本不一致，请重新生成图鉴数据。');}
checkRarity();
export const ACHIEVEMENT_CELLS=ACHIEVEMENTS.map(({test,...a})=>({...a,count:rarity.counts[a.id]}));
export const emptyCollection=()=>({version:2,provinces:[],origins:[],educations:[],jobs:[],lifespans:[],achievements:[],completed:[]});
const fields=['provinces','origins','educations','jobs','lifespans','achievements','completed'];
const limits={provinces:PROVINCE_CELLS,origins:ORIGIN_CELLS.map(x=>x.id),educations:EDUCATION_CELLS.map(x=>x.id),jobs:JOB_CELLS,lifespans:LIFESPAN_CELLS.map(x=>x.id),achievements:ACHIEVEMENT_CELLS.map(x=>x.id)};
export function importCollection(raw){if(typeof raw!=='string'||raw.length>5000000)throw Error('图鉴文件过大或无效。');const c=JSON.parse(raw);if(![1,2].includes(c?.version)||fields.some(k=>!Array.isArray(c[k])||c[k].length>100000||c[k].some(x=>typeof x!=='string'||x.length>120)))throw Error('图鉴结构无效。');for(const k of fields){if(new Set(c[k]).size!==c[k].length||limits[k]&&c[k].some(x=>!limits[k].includes(x)))throw Error('图鉴条目无效。');}const revised=new Set(['repeat-degree','civil-third','rural-master','teacher','medical','technician','business','company','city','college','upgrade','civil-first','general']);return Object.fromEntries([['version',2],...fields.map(k=>[k,c.version===1&&k==='achievements'?c[k].filter(id=>!revised.has(id)):c.version===1&&k==='completed'?[]:c[k].slice()])]);}
export const exportCollection=c=>JSON.stringify(importCollection(JSON.stringify(c)),null,2);
export function loadCollection(storage=localStorage){try{return importCollection(storage.getItem(COLLECTION_KEY)??'');}catch{return emptyCollection();}}
export function saveCollection(c,storage=localStorage){storage.setItem(COLLECTION_KEY,exportCollection(c));}
const add=(a,x)=>x&&!a.includes(x)?[...a,x]:a;
export function recordBirth(c,life){return {...c,provinces:add(c.provinces,life.province),origins:add(c.origins,`${life.hukou}-${life.wealthQ}`)};}
export function recordLife(c,life){
 if(life.alive)return{collection:recordBirth(c,life),unlocked:[]};
 const raw=JSON.stringify([life.id,life.choices,life.age,life.edu,life.lastJob??life.job,life.assets]);let a=2166136261,b=5381;for(const ch of raw){a=Math.imul(a^ch.charCodeAt(0),16777619)>>>0;b=(Math.imul(b,33)^ch.charCodeAt(0))>>>0;}const key=life.id+':'+a.toString(16)+b.toString(16);if(c.completed.includes(key))return{collection:c,unlocked:[]};
 const ids=achievementIds(life),unlocked=ACHIEVEMENT_CELLS.filter(a=>ids.includes(a.id)&&!c.achievements.includes(a.id));
 const job=life.lastJob??life.job,span=life.age<30?'under30':life.age<60?'30-59':life.age<80?'60-79':life.age<100?'80-99':'100plus';
 const next={...recordBirth(c,life),educations:add(c.educations,life.edu),jobs:JOB_CELLS.includes(job)?add(c.jobs,job):c.jobs,lifespans:add(c.lifespans,span),achievements:[...c.achievements,...unlocked.map(a=>a.id)],completed:[...c.completed,key]};
 return{collection:next,unlocked};
}
