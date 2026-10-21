import {drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {deriveChild,familyGoalStatus} from '../src/engine/family.js';
import {isBachelor} from '../src/engine/education.js';
import {writeFileSync} from 'node:fs';
const seed=i=>(Math.imul(i,2654435761)+123456789)>>>0;
const group=()=>({n:0,rural:0,urban:0,leftBehind:0,ruralLeftBehind:0,wealth:{}});
function count(g,b){g.n++;g[b.hukou]++;g.leftBehind+=b.leftBehind;g.ruralLeftBehind+=b.hukou==='rural'&&b.leftBehind;g.wealth[b.wealthQ]=(g.wealth[b.wealthQ]??0)+1;}
export function probeFamily06({cohortN=5000,familiesN=1000}={}){
 const births={2:group(),3:group()},unsecured=group(),degreeHouse=group(),fertility={survive45:0,parents45:0,children45:0,parents:0,children:0};let loopSample=null;
 for(let i=0;i<cohortN;i++){
  const b=drawBirth(seed(i)),end=simulate(b),child=deriveChild(end);
  if(end.age>=45){fertility.survive45++;fertility.parents45+=end.kids.length>0;fertility.children45+=end.kids.length;}
  fertility.parents+=end.kids.length>0;fertility.children+=end.kids.length;
  if(!child)continue;
  if(end.hukou==='rural'&&!isBachelor(end)&&!end.ownsHouse)count(unsecured,child);
  // Paired intervention: same actual rural bachelor terminals with a purchased
  // urban home. Automatic policy rents, so it cannot supply this stratum itself.
  if(end.hukou==='rural'&&isBachelor(end)&&end.city!=='老家')count(degreeHouse,deriveChild({...end,ownsHouse:true}));
  count(births[2],child);const second=simulate(child),third=deriveChild(second);if(third)count(births[3],third);
  if(!loopSample&&b.leftBehind&&child.leftBehind){const e1=simulate(b,{capture:true}),b2=deriveChild(e1),e2=simulate(b2,{capture:true});const loops=e2.log.filter(e=>e.templateId?.startsWith('family-left-loop-'));const oldLine=e2.log.filter(e=>e.templateId?.includes('left-')&&!e.templateId?.startsWith('family-'));if(loops.length>=3&&oldLine.length){const b3=deriveChild(e2);loopSample={births:[b,b2,...(b3?[b3]:[])],lives:[e1,e2,...(b3?[simulate(b3,{capture:true})]:[])],loops,oldLine};}}
 }
 const target={eligible:0,eligibleSuccess:0,allStarts:0,allSuccess:0,first1000StartsSuccess:0};
 for(let i=0;target.eligible<familiesN;i++){
  const birth=drawBirth(seed(i));if(birth.hukou!=='rural'||birth.wealthQ!==1)continue;target.allStarts++;
  let end=simulate(birth),child=deriveChild(end),success=false;
  if(child){target.eligible++;for(let gen=2;gen<=3&&child;gen++){success ||= child.hukou==='urban';end=simulate(child);child=deriveChild(end);}}
  target.eligibleSuccess+=success;target.allSuccess+=success;if(target.allStarts<=1000)target.first1000StartsSuccess+=success;
 }
 return {cohortN,familiesN,births,unsecured,degreeHouse,fertility,target,loopSample};
}
if(process.argv[1]?.endsWith('probe-family-06.mjs')){const result=probeFamily06();writeFileSync(new URL('../tests/artifacts-06/family-probe.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,loopSample:result.loopSample?.lives.map(s=>({id:s.id,name:s.name,hukou:s.hukou,wealthQ:s.wealthQ,leftBehind:s.leftBehind,age:s.age,edu:s.edu}))},null,2));}
