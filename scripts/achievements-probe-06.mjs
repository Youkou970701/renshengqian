import{writeFileSync}from'node:fs';
import{drawBirth}from'../src/engine/birth.js';import{step}from'../src/engine/life.js';import{autoChoose}from'../src/engine/decisions.js';import{ACHIEVEMENTS,achievementIds}from'../src/content/achievements.js';
// Exactly the production rarity seed/policy, using its first 10,000 births.
// This exploratory output is not shipped as the final 100,000-life frequency.
const n=10000,counts=Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,0]));for(let i=0;i<n;i++){let s={...drawBirth((Math.imul(i,2654435761)+123456789)>>>0),capture:true};const policy=i%10;while(s.alive){const d=s.pending;let choice=d?autoChoose(s):undefined;if(policy===7&&d?.id==='repeat')choice='repeat';if(policy===8&&d?.id==='house')choice='buy';s=step(s,{...(choice?{choice}:{}),...(policy===9?{focus:'study'}:{})}).state;}for(const id of achievementIds(s))counts[id]++;}
const rows=ACHIEVEMENTS.map(a=>({id:a.id,name:a.name,beginner:a.beginner,count:counts[a.id],percent:counts[a.id]/n*100}));console.table(rows);writeFileSync('/tmp/toutai-achievements-06-probe.json',JSON.stringify({n,rows},null,2)+'\n');
