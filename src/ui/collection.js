import{PROVINCES}from'../engine/stats.js';import{ACHIEVEMENTS,achievementIds}from'../content/achievements.js';
import rarity from'../content/achievements-rarity.json'with{type:'json'};import{ENGINE_HASH}from'../content/engine-version.js';
import{TITLES,TITLE_ID_MIGRATIONS}from'../content/titles.js';import{biography}from'../engine/biography.js';import{lifeFingerprint}from'./past-lives.js';
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
export const TITLE_CELLS=TITLES.map(({id,name,displayName})=>({id,name:displayName??name,label:displayName??name}));
export const emptyCollection=()=>({version:3,provinces:[],origins:[],educations:[],jobs:[],lifespans:[],achievements:[],completed:[],titles:[]});
const legacyFields=['provinces','origins','educations','jobs','lifespans','achievements','completed'];
const fields=[...legacyFields,'titles'];
const limits={provinces:PROVINCE_CELLS,origins:ORIGIN_CELLS.map(x=>x.id),educations:EDUCATION_CELLS.map(x=>x.id),jobs:JOB_CELLS,lifespans:LIFESPAN_CELLS.map(x=>x.id),achievements:ACHIEVEMENT_CELLS.map(x=>x.id),titles:TITLE_CELLS.map(x=>x.id)};
export function importCollection(raw){
 if(typeof raw!=='string'||raw.length>5000000)throw Error('图鉴文件过大或无效。');
 const c=JSON.parse(raw);
 if(![1,2,3].includes(c?.version)||legacyFields.some(k=>!Array.isArray(c[k]))||('titles'in c&&!Array.isArray(c.titles)))throw Error('图鉴结构无效。');
 c.titles??=[];
 if(fields.some(k=>c[k].length>100000||c[k].some(x=>typeof x!=='string'||x.length>120)))throw Error('图鉴结构无效。');
 const retired=new Set(['house','million']);
 for(const k of fields){if(new Set(c[k]).size!==c[k].length||limits[k]&&c[k].some(x=>!limits[k].includes(x)&&!(c.version<3&&k==='achievements'&&retired.has(x))&&!(k==='titles'&&Object.hasOwn(TITLE_ID_MIGRATIONS,x))))throw Error('图鉴条目无效。');}
 const revisedV1=new Set(['repeat-degree','civil-third','rural-master','teacher','medical','technician','business','company','city','college','upgrade','civil-first','general']);
 const revisedV2=new Set(['house','million','near-one']);
 return Object.fromEntries([['version',3],...fields.map(k=>[k,k==='achievements'?c[k].filter(id=>!(c.version===1&&revisedV1.has(id))&&!(c.version<3&&revisedV2.has(id))):k==='completed'&&c.version<3?[]:k==='titles'?c[k].filter(id=>limits.titles.includes(id)):c[k].slice()])]);
}
export const exportCollection=c=>JSON.stringify(importCollection(JSON.stringify(c)),null,2);
export function loadCollection(storage=localStorage){try{return importCollection(storage.getItem(COLLECTION_KEY)??'');}catch{return emptyCollection();}}
export function saveCollection(c,storage=localStorage){storage.setItem(COLLECTION_KEY,exportCollection(c));}
const add=(a,x)=>x&&!a.includes(x)?[...a,x]:a;
export function recordBirth(c,life){return {...c,provinces:add(c.provinces,life.province),origins:add(c.origins,`${life.hukou}-${life.wealthQ}`)};}
export function recordLife(c,life){
 if(life.alive)return{collection:recordBirth(c,life),unlocked:[]};
 const title=biography(life).title.id,titles=add(c.titles??[],title),key=lifeFingerprint(life);if(c.completed.includes(key))return{collection:titles===c.titles?c:{...c,titles},unlocked:[]};
 const ids=achievementIds(life),unlocked=ACHIEVEMENT_CELLS.filter(a=>ids.includes(a.id)&&!c.achievements.includes(a.id));
 const job=life.lastJob??life.job,span=life.age<30?'under30':life.age<60?'30-59':life.age<80?'60-79':life.age<100?'80-99':'100plus';
 const next={...recordBirth(c,life),educations:add(c.educations,life.edu),jobs:JOB_CELLS.includes(job)?add(c.jobs,job):c.jobs,lifespans:add(c.lifespans,span),achievements:[...c.achievements,...unlocked.map(a=>a.id)],completed:[...c.completed,key].slice(-100000),titles};
 return{collection:next,unlocked};
}
