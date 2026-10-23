import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {hashSeed} from '../src/engine/rng.js';
import {JOBS,JOB_BY_ID} from '../src/content/jobs.js';
import {DATA} from '../src/engine/stats.js';
import {netAssets} from '../src/engine/money.js';
import {isProtectedPost} from '../src/engine/employment.js';
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const quantile=(xs,q)=>{if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y),i=(a.length-1)*q,lo=Math.floor(i),hi=Math.ceil(i);return a[lo]+(a[hi]-a[lo])*(i-lo);};
export const FIXED_SAMPLE_IDS={urbanMiddle:'冀-2026-083642',ruralPoor:'粤-2026-410636',eliteFamily:'浙-2026-943206'};
// Keep this audit independent from engine incomeStats: reasons cannot make annual
// noise count as event volatility, and initial entry cannot count as a windfall.
export function auditIncomePair(previous,current,{hasEarned=false}={}){
 if(!previous||!current||current.age!==previous.age+1)return {large:false,explained:false,stable:null};
 const reasons=current.reasons??[],event=reasons.some(r=>r&&typeof r.kind==='string'&&typeof r.text==='string'&&r.text.trim());
 const rate=previous.income>0?Math.abs(current.income-previous.income)/previous.income:current.income>0?1:0;
 const large=hasEarned&&rate>=.30;
 const same=previous.income>0&&current.income>0&&previous.jobId&&previous.jobId===current.jobId&&previous.level===current.level&&previous.city===current.city&&!previous.retired&&!current.retired&&previous.paidMonths===12&&current.paidMonths===12&&!reasons.length;
 return {large,explained:large&&event,rate,stable:same?(current.volatile?'volatile':current.public?'public':'regular'):null};
}
export function incomeTrajectoryMarkdown(samples){
 const out=['# M2 复验：固定三条人生收入轨迹','','金额为年收入（元）；原因逐项来自当年收入事件，首次入职不计作收入大变化。',''];
 for(const [key,s] of Object.entries(samples)){
  out.push(`## ${s.id}（${key}）`,'','| 年龄 | 岗位 | 职级 | 年收入 | 较上年 | 当年原因 |','|---:|---|---:|---:|---:|---|');
  let previous=null,hasEarned=false;
  for(const row of s.incomeHistory??[]){
   if(row.age<18)continue;
   const audit=auditIncomePair(previous,row,{hasEarned}),delta=previous&&previous.income>0?`${((row.income-previous.income)/previous.income*100).toFixed(1)}%`:previous&&row.income>0?'恢复收入':'—';
   const reasons=(row.reasons??[]).map(r=>r.text).join('；')||'无收入事件';
   out.push(`| ${row.age} | ${JOB_BY_ID[row.jobId]?.name??row.job??'—'}${row.retired?'（退休）':''} | ${row.level==null?'—':row.level+1} | ${row.income.toLocaleString('zh-CN')} | ${delta} | ${reasons.replaceAll('|','／')}${audit.large&&!audit.explained?' 【无原因的大变化】':''} |`);
   hasEarned||=row.income>0;previous=row;
  }
  out.push('');
 }
 return out.join('\n')+'\n';
}
export function probeM2({n=5000,offset=0}={}){
 if(n<3000||!Number.isInteger(n))throw Error('M2探针至少3000局');
 const disposable=[],migrant=[],groups={},privateWages=[],publicWages=[],schoolMatrix={},careerCounts={},stability={regular:[],public:[],volatile:[]},unexplainedExamples=[],protectedLossExamples=[],pensionIssues=[],pensionCounts={resident:0,enterprise:0,public:0};let pensionSampleSize=0,pensionUnder20=0,pensionIssueCount=0;let adultLives=0,largeChanges=0,allLargeChanges=0,unexplained=0,flat=0,urban40=0,owns40=0,businessLives=0,eligible45=0,businessClosed=0,protectedWorkYears=0,protectedCycleLosses=0;
 for(let i=0;i<n;i++){
  const birth=drawBirth((Math.imul(i+offset,2654435761)+123456789)>>>0),targetAge=18+hashSeed(birth.seed^0x16f23a91)%63;
  let s={...birth,capture:false},guard=0,previousIncome=null,hasEarned=false,eventChange=false;
  while(s.alive){
   if(++guard>800)throw Error('M2人生未终止');
   const before=s.age,protectedBefore=isProtectedPost(s),auditMidcareer=s.pending?.id==='midcareer',oldLog=s.log;
   // Only this decision needs visible dice metadata; capture:false suppresses it.
   // dice.pass means the adverse interruption was drawn, not that a post survived.
   const result=step(auditMidcareer?{...s,capture:true}:s,s.pending?{choice:autoChoose(s)}:{});
   s=result.state;
   if(auditMidcareer){s={...s,capture:false,log:oldLog};if(protectedBefore&&result.events.some(e=>e.node==='midcareer'&&['midcareer-gig','midcareer-reemployed'].includes(e.templateId)&&e.dice?.some(d=>d.id==='midcareer'&&d.pass))){protectedCycleLosses++;if(protectedLossExamples.length<20)protectedLossExamples.push({id:birth.id,age:s.age,kind:'midcareer',events:result.events});}}
   if(s.age!==before&&s.lastIncomeObservation?.age===s.age){
    const current=s.lastIncomeObservation,a=auditIncomePair(previousIncome,current,{hasEarned});
    if(protectedBefore&&!current.retired){protectedWorkYears++;if(current.reasons?.some(r=>r.kind==='layoff')){protectedCycleLosses++;if(protectedLossExamples.length<20)protectedLossExamples.push({id:birth.id,age:s.age,kind:'layoff',current});}}
    if(a.stable)stability[a.stable].push(a.rate);
    if(a.large){allLargeChanges++;if(a.explained)eventChange=true;else{unexplained++;if(unexplainedExamples.length<20)unexplainedExamples.push({id:birth.id,previous:previousIncome,current});}}
    hasEarned||=current.income>0;previousIncome=current;
   }
   if(s.age!==before&&s.age===targetAge){disposable.push(s.disposableIncome);const o=s.occupation,j=JOB_BY_ID[o?.id];
    if(s.age>=60&&s.pensionIncome>0){
     pensionSampleSize++;const category=s.pensionCategory,years=s.pensionRecord?.years??0,under20=years<20;pensionUnder20+=under20;
     if(Object.hasOwn(pensionCounts,category))pensionCounts[category]++;
     const mismatch=!Object.hasOwn(pensionCounts,category)||(category==='resident')!==under20;
     if(mismatch)pensionIssueCount++;
     if(mismatch&&pensionIssues.length<20)pensionIssues.push({id:birth.id,age:s.age,category,years,monthly:s.pensionMonthly});
    }
    if(!s.retired&&!s.business?.active&&s.income>0&&j){const key=`${s.edu}:${s.city}`;(groups[key]??=[]).push(s.income);(s.employmentType==='编制'?publicWages:privateWages).push(s.income);}
   }
   if(s.age!==before&&s.age===40){
    if(s.hukou==='urban'){urban40++;owns40+=!!s.ownsHouse;}
    if(JOB_BY_ID[s.occupation?.id]?.migrant&&s.hukou==='rural'&&s.income>0&&!s.retired&&!s.business?.active&&s.job!=='待业'){migrant.push(s.income/Math.max(1,s.occupation.paidMonths??12));}
   }
  }
  if(s.incomeStats?.observations){adultLives++;largeChanges+=eventChange;flat+=s.incomeStats.minBucket===s.incomeStats.maxBucket;}
  const m=schoolMatrix[`${birth.tier}:${birth.hukou}:Q${birth.wealthQ}`]??={sampleSize:0,bachelor:0};m.sampleSize++;m.bachelor+=['bachelor','211','985','master'].includes(s.edu);
  const id=s.record.economy40?.jobId;if(id)careerCounts[id]=(careerCounts[id]??0)+1;
  if(s.age>=45){eligible45++;const started=!!s.record.businessStarted||!!s.businessHistory?.length,closed=!!s.record.businessClosed||!!s.businessHistory?.some(b=>Number.isFinite(b.closedAt));businessLives+=started;businessClosed+=started&&closed;}

 }
 const sorted=disposable.sort((a,b)=>a-b),quintiles=DATA.economy.income_quintiles.value.map((target,i)=>{const xs=sorted.slice(Math.floor(i*sorted.length/5),Math.floor((i+1)*sorted.length/5)),value=mean(xs);return {group:i+1,sampleSize:xs.length,value,target,min:target*.75,max:target*1.25,pass:value!==null&&value>=target*.75&&value<=target*1.25};});
 const spreads=Object.fromEntries(Object.entries(groups).map(([key,xs])=>{const p10=quantile(xs,.1),p90=quantile(xs,.9);return [key,{sampleSize:xs.length,p10,p90,ratio:p90/p10,formal:xs.length>=100}];})),formal=Object.values(spreads).filter(r=>r.formal),minSpread=formal.length?Math.min(...formal.map(r=>r.ratio)):null;
 const stabilitySummary=Object.fromEntries(Object.entries(stability).map(([key,xs])=>[key,{sampleSize:xs.length,median:quantile(xs,.5),p90:quantile(xs,.9)}]));
 const ordinary=[...stability.regular,...stability.public],ordinaryMedian=quantile(ordinary,.5),ordinaryP90=quantile(ordinary,.9);
 const samples=Object.fromEntries(Object.entries(FIXED_SAMPLE_IDS).map(([key,id])=>[key,{birth:createBirth(id)}]));
 const checks=[...quintiles.map(q=>({name:`人均可支配收入第${q.group}等份均值±25%`,...q})),{name:'农民工路线月收入中位数4500–5600',value:quantile(migrant,.5),sampleSize:migrant.length,min:4500,max:5600,pass:migrant.length>=100&&quantile(migrant,.5)>=4500&&quantile(migrant,.5)<=5600},{name:'同学历同城市P90/P10≥3',value:minSpread,groups:formal.length,min:3,pass:formal.length>=6&&minSpread>=3},{name:'事件引起的终生至少一次收入涨跌≥30%者≥80%',value:largeChanges/adultLives,numerator:largeChanges,sampleSize:adultLives,min:.80,pass:adultLives>0&&largeChanges/adultLives>=.80},
 {name:'每次收入大变化都有当年事件原因',value:unexplained,sampleSize:allLargeChanges,max:0,pass:allLargeChanges>0&&unexplained===0},
 {name:'在编岗位因行业周期失业次数=0',value:protectedCycleLosses,sampleSize:protectedWorkYears,max:0,pass:protectedWorkYears>0&&protectedCycleLosses===0},
 {name:'普通职业同岗同级无事件收入变化中位数≤5%',value:ordinaryMedian,sampleSize:ordinary.length,max:.05,pass:ordinary.length>=100&&ordinaryMedian<=.05},
 {name:'普通职业同岗同级无事件收入变化P90≤12%',value:ordinaryP90,sampleSize:ordinary.length,max:.12,pass:ordinary.length>=100&&ordinaryP90<=.12},
 {name:'体制内同岗同级无事件收入变化P90≤6%',value:stabilitySummary.public.p90,sampleSize:stability.public.length,max:.06,pass:stability.public.length>=100&&stabilitySummary.public.p90<=.06},
 {name:'显式volatile职业同岗同级无事件收入变化P90≤30%',value:stabilitySummary.volatile.p90,sampleSize:stability.volatile.length,max:.30,pass:stability.volatile.length>=100&&stabilitySummary.volatile.p90<=.30},
 {name:'活到45岁者终生经营过生意8–20%',value:businessLives/eligible45,numerator:businessLives,sampleSize:eligible45,min:.08,max:.20,pass:eligible45>0&&businessLives/eligible45>=.08&&businessLives/eligible45<=.20},
 {name:'经营过生意者关店比例≥40%',value:businessClosed/businessLives,numerator:businessClosed,sampleSize:businessLives,min:.40,pass:businessLives>0&&businessClosed/businessLives>=.40},{name:'终生年收入同一个5k区间者<5%',value:flat/adultLives,numerator:flat,sampleSize:adultLives,max:.05,pass:flat/adultLives<.05},{name:'职业至少40种、各3–6级',value:JOBS.length,pass:JOBS.length>=40&&JOBS.every(j=>j.levels.length>=3&&j.levels.length<=6)}];
 return {milestone:'M2',n,offset,method:'每人预先按独立编号哈希抽18–80岁一个观察年龄，活到该年龄者每人一条；可支配收入为本局家庭人均，五等份锚点是组内均值而非分位切点。工资单列。失业收入0；首次入职前不拿0→首份工资充当涨幅。',observedAdults:disposable.length,quintiles,checks,pass:checks.every(c=>c.pass),failures:checks.filter(c=>!c.pass),migrant:{sampleSize:migrant.length,medianMonthly:quantile(migrant,.5),method:'农村出身、农民工职业路线、40岁实际在岗者，年工资除该年有薪月数；每人一次'},spreads,largeChanges:{count:largeChanges,sampleSize:adultLives,rate:largeChanges/adultLives},flat:{count:flat,sampleSize:adultLives,rate:flat/adultLives},housing40:{owns:owns40,sampleSize:urban40,rate:owns40/urban40,hardTarget:null},businessLives,business:{eligible45,started:businessLives,closed:businessClosed,rate:businessLives/eligible45,closureRate:businessClosed/businessLives},stability:{...stabilitySummary,ordinary:{sampleSize:ordinary.length,median:ordinaryMedian,p90:ordinaryP90}},unexplainedLargeChanges:{count:unexplained,totalLargeChanges:allLargeChanges,examples:unexplainedExamples},pensions:{sampleSize:pensionSampleSize,categories:Object.fromEntries(Object.entries(pensionCounts).map(([category,count])=>[category,{count,sampleSize:pensionSampleSize,rate:pensionSampleSize?count/pensionSampleSize:null}])),under20:{count:pensionUnder20,sampleSize:pensionSampleSize,rate:pensionSampleSize?pensionUnder20/pensionSampleSize:null},classificationConsistent:pensionCounts.resident===pensionUnder20&&pensionIssueCount===0,issueCount:pensionIssueCount,issues:pensionIssues,method:'预先独立抽取观察年龄；60岁以上且本年领取养老金，每人至多一条。分类及不足20年缴费占比打印供复核，不改变旧收入门槛。'},protectedPosts:{sampleSize:protectedWorkYears,industryCycleLosses:protectedCycleLosses,examples:protectedLossExamples},careerCounts,wageDiagnostics:{privateMean:mean(privateWages),privateN:privateWages.length,publicMean:mean(publicWages),publicN:publicWages.length},schoolMatrix,sampleIds:Object.fromEntries(Object.entries(samples).map(([k,v])=>[k,v.birth.id])),samples};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];},n=Number(get('--n','5000')),offset=Number(get('--offset','0')),dir=get('--output-dir','tests/artifacts-09/M2');mkdirSync(dir,{recursive:true});
 const p=probeM2({n,offset});writeFileSync(`${dir}/income-probe.json`,JSON.stringify(p,(k,v)=>k==='samples'?undefined:v,2)+'\n');
 const lives=Object.fromEntries(Object.entries(p.samples).map(([k,v])=>[k,simulate(v.birth,{capture:true})]));
 writeFileSync(`${dir}/sample-lives.json`,JSON.stringify(lives,null,2)+'\n');
 writeFileSync(`${dir}/income-trajectories.md`,incomeTrajectoryMarkdown(lives));
 const missingLogReasons=Object.values(lives).flatMap(s=>(s.incomeHistory??[]).flatMap(row=>(row.reasons??[]).filter(reason=>!s.log.some(event=>event.age===row.age&&event.text===reason.text)).map(reason=>({id:s.id,age:row.age,reason}))));
 if(missingLogReasons.length)throw Error(`收入轨迹事件未写入当年日志：${JSON.stringify(missingLogReasons)}`);
 for(const r of p.checks)console.log(r.pass?'PASS':'FAIL',r.name,r.value);console.log('养老金分层',p.pensions);console.log('在编行业周期失业',p.protectedPosts);console.log('40岁城镇有房',p.housing40);console.log('samples',p.sampleIds);
 if(!p.pass)process.exitCode=1;
}
