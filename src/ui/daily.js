import {drawBirth} from '../engine/birth.js';
export const DAILY_KEY='toutai-sim:daily:v1';
export function getShanghaiDate(instant=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(instant);
 const value=key=>parts.find(p=>p.type===key).value;return `${value('year')}-${value('month')}-${value('day')}`;
}
export function validDailyDate(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(`${date}T00:00:00Z`);return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===date;}
export function dailySeed(date){if(!validDailyDate(date))throw Error('日期无效，请重新打开今日签。');let seed=2166136261;for(const c of 'daily-'+date){seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;}return seed;}
export function dailyBirth(date){return drawBirth(dailySeed(date));}
export function dailyPreview(date){const b=dailyBirth(date);return `今天，你会出生在${b.province}${b.hukou==='rural'?'的一个村子':'的一座城市'}。`;}
export function loadDaily(storage=localStorage){
 try{const parsed=JSON.parse(storage.getItem(DAILY_KEY)??'null');if(parsed?.version===1&&parsed.days&&typeof parsed.days==='object'&&!Array.isArray(parsed.days)){const days={};for(const[date,row]of Object.entries(parsed.days)){if(validDailyDate(date)&&Number.isInteger(row?.attempts)&&row.attempts>=1&&row.attempts<=100000)days[date]={attempts:row.attempts,...(row.firstResult&&typeof row.firstResult==='object'?{firstResult:row.firstResult}:{})};}return {version:1,days};}}catch{}return {version:1,days:{}};
}
export function beginDaily(storage=localStorage,date=getShanghaiDate()){
 const birth=dailyBirth(date),data=loadDaily(storage),row=data.days[date]??{attempts:0};const attempt=row.attempts+1;
 data.days[date]={...row,attempts:attempt};storage.setItem(DAILY_KEY,JSON.stringify(data));return {date,attempt,id:birth.id,birth};
}
export function completeDaily(storage,session,life){
 if(!session||!validDailyDate(session.date)||session.id!==dailyBirth(session.date).id||life.id!==session.id||life.alive)return null;
 const data=loadDaily(storage),row=data.days[session.date];if(!row||session.attempt<1||session.attempt>row.attempts)return null;
 if(session.attempt===1&&!row.firstResult){row.firstResult={id:life.id,name:life.name,age:life.age,edu:life.edu,job:life.lastJob??life.job};storage.setItem(DAILY_KEY,JSON.stringify(data));}
 return row.firstResult??null;
}
export function dailyBadge(session,{birth=false}={}){
 if(!session)return '';if(!validDailyDate(session.date)||!Number.isInteger(session.attempt)||session.attempt<1)return '';
 if(birth){const[,m,d]=session.date.split('-');return `${Number(m)}月${Number(d)}日 · 今日签`;}
 return session.attempt===1?'今日签 · 首局':`今日签 · 第 ${session.attempt} 局`;
}
