import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {summary} from '../src/engine/summary.js';
import {birthText,terminalText,childStartingText} from '../src/content/presentation.js';
import {visibleFootnote,SOURCES_NOTE} from '../src/content/footnotes.js';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const edu={none:'初中未完成',junior:'初中',high:'普通高中',vocational:'中职',college:'专科',bachelor:'本科','211':'211本科','985':'985本科',master:'硕士'};
const output={};
for(const [key,id]of[['urban','京-2026-066321'],['rural','粤-2026-694669']]){
 const b=createBirth(id);let mid=b;while(mid.alive&&!(mid.age===15&&mid.pending?.id==='school'))mid=step(mid,{auto:true}).state;
 if(!mid.pending)throw Error('No school decision for '+id);
 const judged=step(mid,{choice:autoChoose(mid)}).state;
 const event=judged.log.findLast(e=>e.node==='school');const end=simulate(b,{capture:true});const s=summary(end);
 const mapEvent=e=>({age:e.age,text:e.text,footnote:visibleFootnote(e),node:e.node??null});
 const peers=[1,2,3,4].map(i=>{const p=simulate(drawBirth((b.seed+Math.imul(i,2654435761))>>>0,b.year),{until:15,capture:true});return{name:p.name,province:p.province,age:p.age,alive:p.alive,edu:edu[p.edu],hukou:p.hukou};});
 output[key]={id:b.id,name:b.name,province:b.province,place:b.place,hukou:b.hukou,wealthQ:b.wealthQ,sex:b.sex,leftBehind:b.leftBehind,familyLabel:b.wealthQ===5?'积蓄充足':'收入紧张',birthStory:birthText(b),parents:b.parents,birthYear:b.year,mid:{age:judged.age,verdict:event.text,footnote:visibleFootnote(event),attrs:judged.attrs,result:judged.record.general?'普通高中 · 已录取':judged.record.stage?'中职 · 录取':'暂别校园',log:judged.log.slice(-6).map(mapEvent),peers,gradePct:judged.gradePct},end:{age:end.age,edu:edu[end.edu],job:end.lastJob??end.job,cause:end.death.detail,income:end.income,assets:end.assets,bachelorPer100:s.bachelorPer100,rank:s.incomePercentile,story:terminalText(end),history:end.history,kidsStory:childStartingText(end),headline:edu[end.edu]==='初中'?'只读完初中，也走过一生':'没读本科，也走过一生',referenceSample:s.referenceSample,chapterLog:end.log.filter(e=>e.node).map(mapEvent)},disclaimer:'基于公开统计的模拟，不代表任何个人命运。15岁以上。',sourcesNote:SOURCES_NOTE};
}
writeFileSync(new URL('./data.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
console.log(Object.fromEntries(Object.entries(output).map(([k,d])=>[k,{name:d.name,result:d.mid.result,age:d.end.age,edu:d.end.edu,bachelor:d.end.bachelorPer100}])));
