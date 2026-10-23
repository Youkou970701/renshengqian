import {JOB_BY_ID} from '../src/content/jobs.js';
import {SCENARIOS} from '../src/content/scenarios.js';
import {drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {biography,BIOGRAPHY_STIFF_EXPRESSIONS} from '../src/engine/biography.js';
import {TITLES} from '../src/content/titles.js';
import {pathToFileURL} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {findBannedWords} from '../tests/banned-words.js';
export function probeM4({n=100000,offset=0,onProgress}={}){
 if(!Number.isInteger(n)||n<100)throw Error('样本数须为至少100的整数');
 const counts={},axes=Object.fromEntries(['pace','care','place','will'].map(id=>[id,{left:0,right:0,balanced:0,unknown:0}]));let coverage=0,uncolored=0,unsafe=0,grammar=0,chronology=0,stiff=0,warmth=0,smallCounts=0,promotionEligibility=0;const examples={},issues=[];
 for(let i=0;i<n;i++){
  if(i>0&&i%10000===0)onProgress?.({completed:i,n});
  const s=simulate(drawBirth((Math.imul(i+offset,2654435761)+123456789)>>>0)),b=biography(s);
  coverage+=TITLES.some(t=>t.id===b.title.id);counts[b.title.id]=(counts[b.title.id]??0)+1;
  for(const a of b.color.axes)axes[a.id][a.side]++;
  uncolored+=!b.color.determined;unsafe+=/犯罪|毒品|家暴|暴力/.test(b.title.shareName+b.shareSentence);
  const invalid=[b.title.name,b.title.shareName].some(name=>(name.match(/的/g)??[]).length!==1||!name.endsWith('的人生')||findBannedWords(name).length);
  grammar+=invalid;
  const copy=b.title.name+b.title.shareName+b.sentence+b.shareSentence;
  stiff+=BIOGRAPHY_STIFF_EXPRESSIONS.some(word=>copy.includes(word));
  warmth+=b.timeline.some(e=>e.source==='scenarioHistory'&&SCENARIOS.find(d=>d.id===e.id)?.category==='warmth');
  smallCounts+=/(?<!\d)(?:10|[1-9])(?:次|个|名)/.test(copy);
  const promotion=b.title.evidence;if(promotion?.kind==='promotion'){const levels=JOB_BY_ID[promotion.jobId]?.levels;promotionEligibility+=!levels||promotion.level<2&&promotion.level!==levels.length-1;}
  const ages=[...b.sentence.matchAll(/(\d+)岁/g)].map(m=>Number(m[1]));
  const disordered=ages.some((age,index)=>index>0&&age<=ages[index-1]);chronology+=disordered;
  examples[b.title.id]??={id:s.id,name:b.title.name,shareName:b.title.shareName,biography:b.sentence,values:b.title.values??{},evidence:b.title.evidence};
  if((invalid||disordered)&&issues.length<10)issues.push({id:s.id,title:b.title.name,sentence:b.sentence,invalid,disordered});
 }
 const titles=Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([id,count])=>({id,name:TITLES.find(t=>t.id===id)?.name,count,percent:100*count/n}));
 const rare=titles.filter(r=>r.count>0&&r.percent<1).length;
 const checks=[
  {name:'称号库至少100个',value:TITLES.length,pass:TITLES.length>=100},
  {name:'每局主称号覆盖',value:coverage/n,pass:coverage===n},
  {name:'最常见称号低于15%',value:titles[0].percent,pass:titles[0].percent<15},
  {name:'实际出现且低于1%的称号至少20个',value:rare,pass:rare>=20},
  ...Object.entries(axes).flatMap(([id,a])=>['left','right'].map(side=>({name:`${id}.${side}至少15%`,value:100*a[side]/n,pass:a[side]/n>=.15}))),
  {name:'分享敏感词0处',value:unsafe,pass:unsafe===0},
  {name:'称号恰好一个的且无禁词',value:grammar,pass:grammar===0},
  {name:'传记显示年龄严格递增',value:chronology,pass:chronology===0},
  {name:'09d称号传记生硬表达0处',value:stiff,pass:stiff===0},
  {name:'温暖小事不进传记',value:warmth,pass:warmth===0},
  {name:'十以内次数人数均用汉字',value:smallCounts,pass:smallCounts===0},
  {name:'主称号晋升至少两级或顶级',value:promotionEligibility,pass:promotionEligibility===0},
  {name:'至少60%模板插入本局变量',value:TITLES.filter(t=>t.variables?.length&&t.variables.every(key=>(t.template??'').includes('{'+key+'}'))).length/TITLES.length,pass:TITLES.filter(t=>t.variables?.length&&t.variables.every(key=>(t.template??'').includes('{'+key+'}'))).length/TITLES.length>=.6},
 ];
 return {n,offset,library:TITLES.length,coverage,uncolored,unsafe,observedTitles:titles.length,observedRareTitles:rare,mostCommon:titles[0],axes,counts,titles,examples,issues,grammar,chronology,stiff,warmth,smallCounts,promotionEligibility,checks,pass:checks.every(c=>c.pass)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=probeM4({n:Number(process.argv[2]??100000),onProgress:p=>console.log(`M4 probe ${p.completed}/${p.n}`)});console.log(JSON.stringify({...r,titles:undefined,counts:undefined},null,2));console.table(r.titles);
 const outIndex=process.argv.indexOf('--output-dir');if(outIndex>=0){const dir=process.argv[outIndex+1];if(!dir)throw Error('--output-dir需要目录');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'probe-m4.json'),JSON.stringify(r,null,2)+'\n');}
 if(!r.pass)process.exitCode=1;
}
