import {biography} from '../engine/biography.js';
import {normalizePastLives,validBirth,summary,lifeFingerprint,loadPastLives,PAST_LIVES_KEY,PAST_LIVES_LIMIT} from './past-lives-storage.js';
export * from './past-lives-storage.js';
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
