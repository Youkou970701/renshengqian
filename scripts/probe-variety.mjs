// 「每个人的选择都不一样」探针（交接 11）。按「卡 + 变体」统计，剧本步骤按剧本编号计。
import {drawBirth} from '../src/engine/birth.js';import {simulate} from '../src/engine/life.js';import {CARDS} from '../src/content/cards/index.js';
const key=h=>h.variant?`${h.id}#${h.variant}`:h.id;
const jaccard=(a,b)=>{let i=0;for(const x of a)if(b.has(x))i++;return i/(a.size+b.size-i||1);};
export function probeVariety({n=3000}={}){
 const lives=[],freq={},cardSeen={};
 for(let i=0;i<n;i++){const s=simulate(drawBirth((Math.imul(i,2654435761)+123456789)>>>0));const keys=new Set(s.cardHistory.map(key));
  for(const k of keys)freq[k]=(freq[k]??0)+1;for(const id of new Set(s.cardHistory.map(h=>h.id)))cardSeen[id]=(cardSeen[id]??0)+1;
  lives.push({keys,hukou:s.hukou,wealthQ:s.wealthQ,elite:!!s.eliteFamily,early:s.cardHistory.filter(h=>h.age<12).length});}
 const top=Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>[k,v/n]);
 const pairs=[];for(let i=0;i+1<lives.length;i+=2)pairs.push(jaccard(lives[i].keys,lives[i+1].keys));pairs.sort((a,b)=>a-b);
 const rich=lives.filter(x=>x.hukou==='urban'&&x.wealthQ===5).slice(0,200),poor=lives.filter(x=>x.hukou==='rural'&&x.wealthQ===1).slice(0,200);
 let cross=0,c=0;for(let i=0;i<Math.min(rich.length,poor.length);i++){cross+=jaccard(rich[i].keys,poor[i].keys);c++;}
 const elites=lives.filter(x=>x.elite).length;
 const ordinary=CARDS.filter(x=>!x.scenarioId);
 const used=ordinary.filter(x=>(cardSeen[x.id]??0)/n>=.002||(x.id.startsWith('rich-')&&elites>0&&(cardSeen[x.id]??0)/elites>=.05));
 const early=lives.map(x=>x.early).sort((a,b)=>a-b);
 const checks=[
  {name:'单个「卡+变体」出现率≤40%',value:top[0][1],max:.40,pass:top[0][1]<=.40},
  {name:'随机两人卡片重合度中位数≤25%',value:pairs[pairs.length>>1],max:.25,pass:pairs[pairs.length>>1]<=.25},
  {name:'城市Q5与农村Q1组间重合度≤15%',value:cross/c,max:.15,pass:cross/c<=.15},
  {name:'卡池利用率≥95%（≥0.2%，富豪线按目标人群≥5%）',value:used.length/ordinary.length,min:.95,pass:used.length/ordinary.length>=.95},
  {name:'12岁前卡数中位数≥3',value:early[early.length>>1],min:3,pass:early[early.length>>1]>=3},
 ];
 return {n,checks,pass:checks.every(x=>x.pass),top,unused:ordinary.filter(x=>!used.includes(x)).map(x=>x.id),elites};
}
if(import.meta.url===`file://${process.argv[1]}`){const r=probeVariety({n:Number(process.argv[2]??3000)});for(const x of r.checks)console.log(x.pass?'PASS':'FAIL',x.name,x.value.toFixed(4));console.log('最常见：',r.top.map(([k,v])=>`${k} ${(v*100).toFixed(0)}%`).join(' | '));console.log('未用：',r.unused.join(' '));}
