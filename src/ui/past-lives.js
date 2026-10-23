import{biography}from'../engine/biography.js';
import{TITLES,TITLE_ID_MIGRATIONS}from'../content/titles.js';
import{PROVINCES}from'../engine/stats.js';
import{parseId}from'../engine/rng.js';

export const PAST_LIVES_KEY='toutai-sim:past-lives:v1';
export const ABANDONED_BIRTHS_KEY='toutai-sim:abandoned-births:v1';
export const PAST_LIVES_LIMIT=12;
export const ABANDONED_BIRTHS_LIMIT=100;
const MAX_COUNT=Number.MAX_SAFE_INTEGER;
const titleIds=new Set([...TITLES.map(t=>t.id),...Object.keys(TITLE_ID_MIGRATIONS)]);
const short=(s,max=120)=>typeof s==='string'&&s.length>0&&s.length<=max;
const validId=id=>{try{if(typeof id!=='string'||id.trim()!==id)return false;parseId(id.replace(/·(?:二代|三代)$/, ''));return true;}catch{return false;}};
const validBirth=s=>s&&validId(s.id)&&short(s.name,40)&&PROVINCES.includes(s.province);

// Hash the ending and actual choices, never retain the full life or its log.
// The same birth can therefore have several distinct remembered lives.
export function lifeFingerprint(life){
 const raw=JSON.stringify([life.id,life.choices??[],life.cardHistory??[],life.focusHistory??[],life.financialHistory??life.inputHistory??[],life.age,life.edu,life.lastJob??life.job,life.assets,life.married,life.kids?.length,life.death?.category,(life.scenarioHistory??[]).map(s=>[s.id,s.choices,s.outcome])]);
 let a=2166136261,b=5381;
 for(const ch of raw){a=Math.imul(a^ch.charCodeAt(0),16777619)>>>0;b=(Math.imul(b,33)^ch.charCodeAt(0))>>>0;}
 return `${life.id}:${a.toString(16)}${b.toString(16)}`;
}

function summary(row){
 if(!validBirth(row)||!short(row.key)||!row.key.startsWith(`${row.id}:`)||!Number.isInteger(row.age)||row.age<0||row.age>150||!titleIds.has(row.title)||!short(row.titleName,80)||!short(row.biography,500))return null;
 return{key:row.key,id:row.id,name:row.name,province:row.province,age:row.age,edu:short(row.edu,40)?row.edu:'none',job:short(row.job,60)?row.job:'',title:row.title,titleName:row.titleName,biography:row.biography,color:colorSummary(row.color)};
}

function colorSummary(color){
 // Keep only presentation fields, even when a caller supplies an entire life.
 if(!color||typeof color!=='object')color={};
 const axes=Array.isArray(color.axes)?color.axes.slice(0,4).filter(axis=>axis&&typeof axis==='object'&&short(axis.id,40)).map(axis=>({...Object.fromEntries(['id','left','right','side','label'].filter(k=>short(axis[k],40)).map(k=>[k,axis[k]])),...Object.fromEntries(['value','leftScore','rightScore','evidenceCount'].filter(k=>Number.isFinite(axis[k])&&Math.abs(axis[k])<=1000000).map(k=>[k,axis[k]]))})):[];
 return {id:'uncolored',name:'尚未定色',determined:false,...Object.fromEntries(['id','name','hex','background','foreground','description','signature'].filter(k=>short(color[k],160)).map(k=>[k,color[k]])),...(typeof color.determined==='boolean'?{determined:color.determined}:{}),axes};
}

function normalizePastLives(value){
 if(value?.version!==1||!Array.isArray(value.items))return[];
 const seen=new Set(),items=[];
 for(const row of value.items.slice(0,1000)){
  const item=summary(row);if(!item||seen.has(item.key))continue;
  seen.add(item.key);items.push(item);if(items.length===PAST_LIVES_LIMIT)break;
 }
 return items;
}

export function loadPastLives(storage=globalThis.localStorage){
 try{const raw=storage.getItem(PAST_LIVES_KEY);if(typeof raw!=='string'||raw.length>100000)return[];return normalizePastLives(JSON.parse(raw));}catch{return[];}
}

export function recordPastLife(items,life){
 const previous=normalizePastLives({version:1,items});
 if(life?.alive!==false||!validBirth(life))return previous;
 const bio=biography(life),row=summary({key:lifeFingerprint(life),id:life.id,name:life.name,province:life.province,age:life.age,edu:life.edu,job:life.lastJob??life.job,title:bio.title.id,titleName:bio.title.name,biography:bio.sentence,color:bio.color});
 if(!row)return previous;
 if(previous.some(x=>x.key===row.key))return previous.map(item=>item.key===row.key?row:item);
 return[row,...previous].slice(0,PAST_LIVES_LIMIT);
}

export function savePastLife(life,storage=globalThis.localStorage){
 const items=recordPastLife(loadPastLives(storage),life);
 storage.setItem(PAST_LIVES_KEY,JSON.stringify({version:1,items}));
 return items;
}

export const emptyAbandonedBirths=()=>({version:1,count:0,items:[]});
export function loadAbandonedBirths(storage=globalThis.localStorage){
 try{
  const raw=storage.getItem(ABANDONED_BIRTHS_KEY);if(typeof raw!=='string'||raw.length>100000)return emptyAbandonedBirths();
  const value=JSON.parse(raw);
  if(value?.version!==1||!Number.isInteger(value.count)||value.count<0||value.count>MAX_COUNT||!Array.isArray(value.items))return emptyAbandonedBirths();
  const items=value.items.filter(validBirth).slice(0,Math.min(value.count,ABANDONED_BIRTHS_LIMIT)).map(s=>({id:s.id,name:s.name,province:s.province}));
  return{version:1,count:value.count,items};
 }catch{return emptyAbandonedBirths();}
}

export function recordAbandonedBirth(life,storage=globalThis.localStorage){
 const previous=loadAbandonedBirths(storage);
 // The caller exposes this only on ordinary birth screens, never today's shared birth.
 // A played life or a family child cannot be rerolled.
 if(!validBirth(life)||life.alive!==true||life.age!==0||(life.choices??[]).length||life.family)return previous;
 const next={version:1,count:Math.min(MAX_COUNT,previous.count+1),items:[{id:life.id,name:life.name,province:life.province},...previous.items].slice(0,ABANDONED_BIRTHS_LIMIT)};
 storage.setItem(ABANDONED_BIRTHS_KEY,JSON.stringify(next));
 return next;
}
