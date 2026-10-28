/** Handoff 13: full captured lives and once-per-age observations after all choices. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {engineHash} from './engine-hash.mjs';
export const median=rows=>{if(!rows.length)return null;const a=[...rows].sort((a,b)=>a-b),m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;};
// Independent field-based classification, not the happiness model's penalties.
export function yearObservation(s){
 const f=s.educationFinance??{},m=s.money??{};
 const student=s.job==='研究生在读'||s.job==='尚未就业'&&s.age<(s.collegeGraduateAge??22);
 const retired=!!s.retired||s.job==='退休';
 const mortgage=m.mortgage?.balance??s.mortgage??0,studentDebt=(f.loanBalance??0)+(f.loanInterestArrears??0);
 const borrowing=(m.debts??[]).reduce((n,d)=>n+Math.max(0,d.balance),0),cashShortfall=Math.max(0,-s.assets);
 const monthly=m.mortgage?.monthly??null,mortgageRatio=mortgage>0&&s.income>0&&monthly!==null?monthly*12/s.income:null;
 const mortgageDefault=mortgage>0&&(s.income<=0||m.mortgage?.monthsLeft<=0||m.lastAge===s.age&&Number.isFinite(m.mortgage?.lastPayment)&&monthly!==null&&m.mortgage.lastPayment+.01<monthly*12);
 const badDebt=borrowing+cashShortfall+(mortgageDefault?mortgage:0),debt=mortgage+studentDebt+borrowing+cashShortfall;
 const affordableMortgage=mortgage>0&&studentDebt===0&&badDebt===0&&mortgageRatio!==null&&mortgageRatio<=.30;
 const studentLoanOnly=studentDebt>0&&mortgage===0&&badDebt===0;
 const unemployed=!student&&!retired&&!s.business?.active&&(s.income<=0||['待业','尚未就业'].includes(s.job));
 return {id:s.id,age:s.age,happy:s.attrs.happy,student,retired,debt,mortgage,mortgageRatio,mortgageDefault,studentDebt,badDebt,affordableMortgage,studentLoanOnly,unemployed,working:!retired&&!student&&!unemployed&&s.income>0};
}
export function happinessSummary(years){
 const reference=years.filter(y=>y.working&&y.debt<=0),groups={affordableMortgage:years.filter(y=>y.affordableMortgage),studentLoanOnly:years.filter(y=>y.studentLoanOnly),badDebt:years.filter(y=>y.badDebt>0),unemployed:years.filter(y=>y.unemployed),debt:years.filter(y=>y.debt>0),either:years.filter(y=>y.unemployed||y.debt>0)};
 const base=median(reference.map(y=>y.happy));
 return {observations:years.length,reference:{n:reference.length,median:base},...Object.fromEntries(Object.entries(groups).map(([key,rows])=>{const m=median(rows.map(y=>y.happy));return [key,{n:rows.length,median:m,gap:base===null||m===null?null:base-m}];}))};
}
export function probe13({n=2000}={}){
 if(!Number.isInteger(n)||n<2000)throw Error('Handoff 13 requires at least 2000 lives');
 const years=[],missingTitles=[],duplicates=[],vagueReasons=[];let ordinaryChoices=0,scenarioChoices=0,changes=0;
 for(let i=0;i<n;i++){
  let s={...drawBirth((Math.imul(i,2654435761)+123456789)>>>0),capture:true},guard=0;
  while(s.alive){
   if(++guard>600)throw Error(`Life did not terminate: ${s.id}`);
   if(!s.pending&&s.age>=18)years.push(yearObservation(s));
   const pending=s.pending,choice=pending?autoChoose(s):undefined,result=step(s,choice?{choice}:{});
   for(const e of result.events){
    if(e.text.startsWith('你选择了')&&!e.text.includes(e.cardTitle??'\u0000'))missingTitles.push({id:s.id,event:e});
    if(e.node==='card'){
     if(e.cardId.startsWith('story:'))scenarioChoices++;
     else {ordinaryChoices++;if(e.cardTitle!==pending?.title||!e.cardTitle||!e.text.startsWith(`${pending.title}——你选了`))missingTitles.push({id:s.id,event:e,expected:pending?.title});}
    }
    if(e.node==='people-relationship'){
     changes++;if(!e.reason||/^(把实名信息的边界说清楚|接住|接受|答应|明确|替|陪|安排|拒绝|支持|说明|提供|放弃|分担|承担)/.test(e.reason))vagueReasons.push({id:s.id,event:e});
    }
   }
   s=result.state;
   const used=new Map([[s.name.slice(1),'player']]);
   for(const p of Object.values(s.people?.members??{})){
    const given=p.name.slice(1);if(used.has(given))duplicates.push({id:s.id,age:s.age,given,people:[used.get(given),p.id]});else used.set(given,p.id);
   }
  }
 }
 const happiness=happinessSummary(years),check=(name,value,pass,target)=>({name,value,pass,target});
 const checks=[check('2000局普通选择记录缺少实际卡标题为0',missingTitles.length,!missingTitles.length&&ordinaryChoices>0,'0'),check('每局家人与朋友给名重复为0（含主角、逝者和旧伴侣）',duplicates.length,!duplicates.length,'0'),check('亲疏原因没有省略行为主体的短语',vagueReasons.length,!vagueReasons.length&&changes>0,'0'),...[
  ['affordableMortgage',5,true],['badDebt',15,false],['unemployed',10,false],
 ].map(([key,limit,near])=>check(`13a幸福中位数差：${key}`,happiness[key].gap,happiness[key].n>0&&happiness.reference.n>0&&(near?Math.abs(happiness[key].gap)<=limit:happiness[key].gap>=limit),near?'absolute difference <=5':`>=${limit}`))];
 const samples=['陕-2026-405095','赣-2026-303077'].map(id=>{const s=simulate(createBirth(id),{capture:true});return {id,name:s.name,events:s.log.filter(e=>e.age>=30&&e.age<=60)};});
 return {n,engineHash:engineHash(),pass:checks.every(c=>c.pass),checks,ordinaryChoices,scenarioChoices,changes,happiness,missingTitles,duplicates,vagueReasons,samples,years};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=resolve(process.env.POLISH_OUTPUT??'tests/artifacts-13');mkdirSync(out,{recursive:true});const {years,...report}=probe13();
 try{report.beforeHappiness=happinessSummary(JSON.parse(readFileSync(`${out}/before-years.json`)));}catch(e){if(e.code!=='ENOENT')throw e;}
 writeFileSync(`${out}/probe-13.json`,JSON.stringify(report,null,2)+'\n');writeFileSync(`${out}/after-years.json`,JSON.stringify(years)+'\n');writeFileSync(`${out}/after-logs.json`,JSON.stringify(report.samples,null,2)+'\n');
 for(const c of report.checks)console.log(c.pass?'PASS':'FAIL',c.name,c.value);if(!report.pass)process.exitCode=1;
}
