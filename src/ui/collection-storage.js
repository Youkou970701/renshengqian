import {PROVINCES} from '../engine/stats.js';
import {TITLE_IDS,TITLE_ID_MIGRATIONS,ACHIEVEMENT_IDS} from './collection-ids.js';
export const COLLECTION_KEY='toutai-sim:collection:v1';
export const PROVINCE_CELLS=PROVINCES;
export const ORIGIN_CELLS=['urban','rural'].flatMap(h=>[1,2,3,4,5].map(q=>({id:`${h}-${q}`,label:`${h==='urban'?'城市':'乡村'} · ${['收入紧张','收入不宽裕','生活稳定','有些积蓄','积蓄充足'][q-1]}`})));
export const EDUCATION_CELLS=[['none','初中未完成'],['junior','初中'],['vocational','中职'],['high','普通高中'],['college','专科'],['bachelor','本科'],['211','211本科'],['985','985本科'],['master','硕士']].map(([id,label])=>({id,label}));
export const JOB_CELLS=['本地服务业','公务员','技术员','工厂工人','企业职员','建筑工人','互联网职员','务农','个体户','医护','老板','网约车司机','事业编','外卖骑手','教师'];
export const LIFESPAN_CELLS=[['under30','未满30岁'],['30-59','30至59岁'],['60-79','60至79岁'],['80-99','80至99岁'],['100plus','100岁以上']].map(([id,label])=>({id,label}));
export const emptyCollection=()=>({version:3,provinces:[],origins:[],educations:[],jobs:[],lifespans:[],achievements:[],completed:[],titles:[]});
const legacyFields=['provinces','origins','educations','jobs','lifespans','achievements','completed'];
const fields=[...legacyFields,'titles'];
const limits={provinces:PROVINCE_CELLS,origins:ORIGIN_CELLS.map(x=>x.id),educations:EDUCATION_CELLS.map(x=>x.id),jobs:JOB_CELLS,lifespans:LIFESPAN_CELLS.map(x=>x.id),achievements:ACHIEVEMENT_IDS,titles:TITLE_IDS};
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
export const add=(a,x)=>x&&!a.includes(x)?[...a,x]:a;
export function recordBirth(c,life){const provinces=add(c.provinces,life.province),origins=add(c.origins,`${life.hukou}-${life.wealthQ}`);return provinces===c.provinces&&origins===c.origins?c:{...c,provinces,origins};}
