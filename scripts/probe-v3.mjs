/** Phase-2 acceptance. n>=2000; --regressions also runs the original 100k/13/5 gates. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {events as dailyTemplates} from '../src/content/events/index.js';
import {PEOPLE_CARDS,PEOPLE_FOLLOWUPS} from '../src/content/cards/people.js';
import {BUSINESS_SCENES,WORK_SCENES,INDUSTRY_SCENES,PROFESSION_SCENES} from '../src/content/income-scenes.js';
import {netAssets} from '../src/engine/money.js';
import {engineHash} from './engine-hash.mjs';
import {cohort,effortCohort,checks as calibrationChecks,educationChecks} from './cohort.mjs';
import {probeM3} from './probe-m3.mjs';
import {probeVariety} from './probe-variety.mjs';
export const STIFF_EXPRESSIONS=['系数','按完整十二个月','恢复了在岗工作','重新开始领取工资','收支平常','年景周期','求职空档','在岗月份'];
const templateIds=new Set(dailyTemplates.map(t=>t.id));
const median=values=>{const sorted=[...values].sort((a,b)=>a-b),m=sorted.length>>1;return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;};
// First urban/rural cohort members reaching 60 with children and an adult people-card followup by 60.
// No filtering on wealth, happiness, or which option was chosen (cohort indices 10 and 12).
const sampleIds={urban:'陕-2026-405095',rural:'赣-2026-303077'};
export function probeV3({n=2000,regressions=false}={}){
 if(!Number.isInteger(n)||n<2000)throw Error('V3 acceptance requires at least 2000 actual captured lives');
 let dailyCount=0,namedDailyCount=0,followups=0,chosenPeople=0,minChanges=Infinity,repeatedMoney=0,ledgerFailures=0,ledgerSamples=0;
 const counts=[],stiffHits=[],noChangeIds=[],moneyDuplicates=[],peopleCoverage=new Map(),branchCoverage=new Set();
 for(let i=0;i<n;i++){
  const life=simulate(drawBirth((Math.imul(i,2654435761)+123456789)>>>0),{capture:true});
  const names=new Set([life.name,...Object.values(life.people?.members??{}).map(p=>p.name),...Object.values(life.parents??{}).map(p=>p.name),...Object.values(life.people?.members??{}).flatMap(p=>p.previousNames??[])]);
  names.delete(life.name);names.delete(undefined);
  const selected=life.cardHistory.filter(row=>row.id.startsWith('people-'));
  counts.push(selected.length);chosenPeople+=selected.length;
  const returned=life.log.filter(e=>e.node==='people-followup');
  for(const event of returned)if(selected.some(h=>h.id===event.sourceCardId&&h.choice===event.choice&&event.age-h.age>=1&&event.age-h.age<=5))followups++;
  for(const h of selected){peopleCoverage.set(h.id,(peopleCoverage.get(h.id)??0)+1);branchCoverage.add(`${h.id}:${h.choice}`);}
  const changes=life.log.filter(e=>e.node==='people-relationship'&&e.reason&&e.before!==e.after&&e.text.includes(e.reason));
  minChanges=Math.min(minChanges,changes.length);if(!changes.length)noChangeIds.push(life.id);
  const priorMoney=new Map();
  for(const event of life.log){
   if(event.age>25&&templateIds.has(event.templateId)){
    dailyCount++;if([...names].some(name=>typeof name==='string'&&name.length>=2&&event.text.includes(name)))namedDailyCount++;
   }
   for(const word of STIFF_EXPRESSIONS)if(event.text.includes(word))stiffHits.push({id:life.id,age:event.age,word,text:event.text});
   if(event.incomeEvent==='business-year'||event.incomeEvent==='industry-cycle'){
    const key=event.incomeEvent,previous=priorMoney.get(key);
    if(previous&&previous.age===event.age-1&&previous.text===event.text){repeatedMoney++;moneyDuplicates.push({id:life.id,event});}
    priorMoney.set(key,event);
   }
  }
  const ledger=life.moneyYear;
  if(ledger&&Number.isFinite(ledger.delta)&&Array.isArray(ledger.sources)){
   ledgerSamples++;const sum=ledger.sources.reduce((total,row)=>total+row.amount,0);
   if(Math.abs(sum-ledger.delta)>.011)ledgerFailures++;
  }else if(life.age>=18)ledgerFailures++;
 }
 const check=(name,value,pass,target)=>({name,value,target,pass});
 const scenePools=[...Object.values(WORK_SCENES),...Object.values(BUSINESS_SCENES).flatMap(Object.values),...Object.values(INDUSTRY_SCENES).flatMap(Object.values),...Object.values(PROFESSION_SCENES).flatMap(Object.values)];
 const rows=[
  check('25岁后日常提到具名家人/朋友≥40%',dailyCount?namedDailyCount/dailyCount:0,dailyCount>0&&namedDailyCount/dailyCount>=.40,'>=0.40'),
  check('每局亲疏变化≥1次且实际日志含原因',minChanges,minChanges>=1,'>=1, no survivor-only exclusion'),
  check('身边的人卡每局中位数≥2',median(counts),median(counts)>=2,'>=2'),
  check('所选身边人卡1–5年内实际后续出现率≥60%',chosenPeople?followups/chosenPeople:0,chosenPeople>0&&followups/chosenPeople>=.60,'>=0.60, all chosen cards including deaths'),
  check('2000局实际日志账房腔为0',stiffHits.length,stiffHits.length===0,'0'),
  check('经营/行业同一句连续两年重复为0',repeatedMoney,repeatedMoney===0,'0'),
  check('原创身边人卡≥20且每卡≥3选项，每个选项都有1–5年后续',PEOPLE_CARDS.length,PEOPLE_CARDS.length>=20&&PEOPLE_CARDS.every(c=>c.options.length>=3&&c.variants?.length>=4&&c.options.every(o=>o.seeds?.some(seed=>PEOPLE_FOLLOWUPS[seed.cardId]&&seed.inYears[0]>=1&&seed.inYears[1]<=5))),'>=20, >=3 options, >=4 situation variants'),
  check('身边人卡全部实际可达',peopleCoverage.size,peopleCoverage.size===PEOPLE_CARDS.length,'all authored cards'),
  check('已记录净资产变化的来源合计一致',ledgerFailures,ledgerFailures===0&&ledgerSamples>0,'0 mismatches; every adult ending has actual sources'),
  check('各类经营/行业/职业结果至少6种具体说法',scenePools.length,scenePools.every(rows=>rows.length>=6&&new Set(rows).size>=6),'>=6 unique scenes in every result pool'),
 ];
 const samples=Object.fromEntries(Object.entries(sampleIds).map(([kind,id])=>{
  const life=simulate(createBirth(id),{capture:true});
  if(life.age<60)throw Error(`Full sample must reach age60: ${id}`);
  return [kind,{id,province:life.province,hukou:life.hukou,name:life.name,age:life.age,events:life.log.filter(e=>e.age>=30&&e.age<=60),netAssets:netAssets(life)}];
 }));
 let regression=null;
 if(regressions){
  const c=cohort(100000),e=effortCohort(100000),calibration=calibrationChecks(c,e),education=educationChecks(c),m3=probeM3({n:3000}),variety=probeVariety({n:2000});
  regression={calibration:{n:100000,checks:calibration,educationChecks:education},m3,variety};
  rows.push(check('原25项十万局校准全部通过',calibration.filter(r=>r.pass).length,calibration.length===25&&calibration.every(r=>r.pass)&&education.every(r=>r.pass),'25/25 plus admission strata'));
  rows.push(check('原M3剧本13项全部通过',m3.checks.filter(r=>r.pass).length,m3.checks.length===13&&m3.pass,'13/13'));
  rows.push(check('原多样性5项全部通过',variety.checks.filter(r=>r.pass).length,variety.checks.length===5&&variety.pass,'5/5'));
 }
 return {phase:2,n,engineHash:engineHash(),checks:rows,pass:rows.every(row=>row.pass),daily:{named:namedDailyCount,total:dailyCount},people:{selected:chosenPeople,followups,median:median(counts),minChanges,missingChanges:noChangeIds,coverage:Object.fromEntries(peopleCoverage),branchCoverage:branchCoverage.size},stiffHits,moneyDuplicates,regression,samples};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=(name,value)=>{const i=args.indexOf(name);return i<0?value:args[i+1];},out=resolve(get('--output-dir','tests/artifacts-12/v3'));
 mkdirSync(out,{recursive:true});const result=probeV3({n:Number(get('--n',2000)),regressions:args.includes('--regressions')});
 writeFileSync(`${out}/probe-v3.json`,JSON.stringify(result,null,2)+'\n');
 writeFileSync(`${out}/logs-30-60.txt`,Object.entries(result.samples).map(([kind,s])=>`${kind} ${s.id} ${s.name} ${s.hukou}\n`+s.events.map(e=>`${e.age}岁 ${e.text}`).join('\n')).join('\n\n')+'\n');
 for(const row of result.checks)console.log(row.pass?'PASS':'FAIL',row.name,row.value);
 if(!result.pass)process.exitCode=1;
}
