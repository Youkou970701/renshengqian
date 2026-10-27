import{PROVINCES}from'../engine/stats.js';import{ACHIEVEMENTS,achievementIds}from'../content/achievements.js';
import rarity from'../content/achievements-rarity.json'with{type:'json'};import{ENGINE_HASH}from'../content/engine-version.js';
import{TITLES}from'../content/titles.js';import{biography}from'../engine/biography.js';import{lifeFingerprint}from'./past-lives.js';
export const RARITY_POLICY=rarity.policy;
export * from './collection-storage.js';
import {JOB_CELLS,recordBirth,add} from './collection-storage.js';
export function checkRarity(data=rarity,expected=ENGINE_HASH){if(data.n!==100000||data.engineHash!==expected)throw Error('模拟频率版本不一致，请重新生成图鉴数据。');}
checkRarity();
export const ACHIEVEMENT_CELLS=ACHIEVEMENTS.map(({test,...a})=>({...a,count:rarity.counts[a.id]}));
export const TITLE_CELLS=TITLES.map(({id,name,displayName})=>({id,name:displayName??name,label:displayName??name}));
export function recordLife(c,life){
 if(life.alive)return{collection:recordBirth(c,life),unlocked:[]};
 const title=biography(life).title.id,titles=add(c.titles??[],title),key=lifeFingerprint(life);if(c.completed.includes(key))return{collection:titles===c.titles?c:{...c,titles},unlocked:[]};
 const ids=achievementIds(life),unlocked=ACHIEVEMENT_CELLS.filter(a=>ids.includes(a.id)&&!c.achievements.includes(a.id));
 const job=life.lastJob??life.job,span=life.age<30?'under30':life.age<60?'30-59':life.age<80?'60-79':life.age<100?'80-99':'100plus';
 const next={...recordBirth(c,life),educations:add(c.educations,life.edu),jobs:JOB_CELLS.includes(job)?add(c.jobs,job):c.jobs,lifespans:add(c.lifespans,span),achievements:[...c.achievements,...unlocked.map(a=>a.id)],completed:[...c.completed,key].slice(-100000),titles};
 return{collection:next,unlocked};
}
