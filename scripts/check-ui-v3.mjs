/** Handoff 12, phase 2: real production UI smoke, no deployment.
 * Run: node scripts/check-ui-v3.mjs
 * Optional: V3_UI_URL, V3_UI_OUTPUT, V3_UI_PORT, TOUTAI_CHROME.
 * This builds with Vite directly: rarity's independent 100k job need not finish
 * before a local UI check. Normal release validation still uses npm run build.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {simulate,step} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {familyMembers,closenessLabel} from '../src/engine/people.js';
import {PEOPLE_CARDS} from '../src/content/cards/people.js';
import {advancePeer,hydrateSave} from '../src/ui/save.js';
import {moneyDisplayRows,wholeMoney} from '../src/ui/money-display.js';
import {incomeAgeGroup,incomePercentile} from '../src/ui/income-rank.js';

const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium}=require('playwright');
const out=resolve(process.env.V3_UI_OUTPUT??'tests/artifacts-12/v3/ui');mkdirSync(out,{recursive:true});
const port=process.env.V3_UI_PORT??'5196',url=process.env.V3_UI_URL??`http://127.0.0.1:${port}/`;
const checks=[],pageerrors=[],cases=[],SAVE_KEY='toutai-sim:v2';
const reference=JSON.parse(readFileSync(new URL('../src/content/income-reference-v3.json',import.meta.url)));
function check(name,pass,actual){checks.push({name,pass,...(actual!==undefined?{actual}:{})});console.log(pass?'PASS':'FAIL',name,actual===undefined?'':JSON.stringify(actual));}
function fixture(life){
 const birth=createBirth(life.id);
 return {schemaVersion:2,screen:life.alive?'play':'end',life,birthOrigin:birth,peers:[1,2,3,4].map(i=>advancePeer(drawBirth((birth.seed+Math.imul(i,2654435761))>>>0,birth.year),life.age)),familyRows:[],familyGoal:'free',mode:'normal',automaticVersion:1,automatic:false,duration:30,speed:1,focus:'auto',paused:true,reveal:null,revealQueue:[],pacingElapsedMs:0};
}
function socialFixture(){
 const ids=new Set(PEOPLE_CARDS.map(c=>c.id));
 for(const id of ['京-2026-066321','粤-2026-694669','鄂-2026-002735']){
  let life={...createBirth(id),capture:true},guard=0;
  while(life.alive&&guard++<600){
   if(ids.has(life.pending?.id)){
    const card=PEOPLE_CARDS.find(c=>c.id===life.pending.id),option=card.options.find(o=>!life.pending.options.find(p=>p.id===o.id)?.disabled&&o.peopleImpact?.delta>0);
    if(option){
     const decided=step(life,{choice:option.id}).state;
     const seed=decided.cardSeeds.find(seed=>seed.cardId.startsWith(`people-followup:${card.id}:`));
     assert.ok(seed,'Real people option must schedule a follow-up');
     let future=decided,more=0;
     while(future.alive&&!future.peopleFollowups?.some(row=>row.id===seed.cardId)&&more++<50)future=step(future,{auto:true}).state;
     const followup=future.log.find(e=>e.node==='people-followup'&&e.id===seed.cardId);
     if(followup)return {before:life,decided,future,cardId:card.id,choice:option.id,seed,followup,impact:option.peopleImpact};
    }
   }
   life=step(life,{auto:true}).state;
  }
 }
 throw Error('No surviving real people-card/follow-up fixture was found');
}
const samples=[['urban','京-2026-066321'],['rural','粤-2026-694669']].map(([kind,id])=>({kind,id,life:simulate(createBirth(id),{capture:true,until:50})}));
for(const sample of samples)assert.ok(sample.life.alive&&sample.life.age===50,`${sample.id} must reach 50`);
const social=socialFixture();
let server,browser,fatal=null;
try{
 const built=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{encoding:'utf8'});
 writeFileSync(join(out,'vite-build.log'),(built.stdout??'')+(built.stderr??''));assert.equal(built.status,0,'Production build failed');
 if(!process.env.V3_UI_URL){
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',port,'--strictPort'],{stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',data=>log+=data);server.stderr.on('data',data=>log+=data);
  await new Promise((resolve,reject)=>{const started=Date.now(),timer=setInterval(async()=>{if(server.exitCode!==null){clearInterval(timer);reject(Error(log));return;}try{if((await fetch(url)).ok){clearInterval(timer);resolve();}}catch{}if(Date.now()-started>15000){clearInterval(timer);reject(Error('Preview did not start: '+log));}},100);});
 }
 browser=await chromium.launch({headless:true,executablePath:process.env.TOUTAI_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for(const width of [375,1280]){
  const context=await browser.newContext({viewport:{width,height:width===375?812:900},isMobile:width===375,hasTouch:width===375,deviceScaleFactor:1});
  await context.addInitScript(({SAVE_KEY})=>{
   if(window.name.startsWith('toutai-ui-v3:')){const raw=window.name.slice('toutai-ui-v3:'.length);window.name='';localStorage.clear();localStorage.setItem(SAVE_KEY,raw);}
  },{SAVE_KEY});
  const page=await context.newPage();page.on('pageerror',error=>pageerrors.push({width,error:String(error)}));
  await page.goto(url,{waitUntil:'networkidle'});
  async function load(life){
   await page.evaluate(saved=>{window.name='toutai-ui-v3:'+JSON.stringify(saved);},fixture(life));
   await page.reload({waitUntil:'networkidle'});await page.locator('.people-panel').waitFor();
   if(life.age>=18)await page.locator('.income-rank').waitFor();
  }
  async function noOverflow(label){const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);check(`${label} ${width}px horizontal overflow`,overflow<=0,overflow);}
  for(const sample of samples){
   const life=sample.life,label=`${sample.kind}-age50`;
   await load(life);
   const rows=await page.locator('.people-list article').allTextContents(),members=familyMembers(life);
   const missing=members.filter(p=>!rows.some(text=>text.includes(p.name)&&text.includes(p.alive?`${p.age} 岁`:`${p.diedAge??p.age} 岁离开`)&&text.includes(p.job)&&text.includes(closenessLabel(p.closeness))));
   check(`${label} ${width}px complete people panel`,missing.length===0&&rows.length===members.length,{expected:members.length,shown:rows.length,missing:missing.map(p=>p.id),deceased:members.filter(p=>!p.alive).map(p=>({id:p.id,name:p.name,age:p.diedAge}))});
   const frame=life.moneyYear,sum=(frame.sources??[]).reduce((total,row)=>total+row.amount,0),moneyRows=moneyDisplayRows(life);
   const moneyText=await page.locator('.money-changes').textContent();
   check(`${label} ${width}px real money sources reconcile`,Math.abs(sum-frame.delta)<.011&&moneyRows.every(row=>moneyText.includes(row.label)&&moneyText.includes(wholeMoney(row.amount)))&&moneyRows.reduce((sum,row)=>sum+row.amount,0)===Math.round(frame.delta)&&!/金额取整|[0-9]\.[0-9]+\s*元/.test(moneyText),{delta:frame.delta,sum,sources:frame.sources});
   const ageGroup=incomeAgeGroup(life.age),p=reference.groups[ageGroup].provinces[life.province],n=reference.groups[ageGroup].national,rankText=await page.locator('.income-rank').textContent(),pp=incomePercentile(life.income,p),np=incomePercentile(life.income,n);
   check(`${label} ${width}px rank uses current income and age group`,rankText.includes(`比全国约 ${np}% 的同龄人高`)&&rankText.includes(`在${life.province}同龄人中排在前 ${Math.max(1,100-pp)}%`)&&rankText.includes(ageGroup.replace('-','–'))&&!rankText.includes('峰值'),{income:life.income,peakIncome:life.peakIncome,ageGroup,provincePercentile:pp,nationalPercentile:np});
   check(`${label} ${width}px rank uses plain language and puts sample detail in sources`,rankText.includes(life.province)&&rankText.includes('出生省份')&&!/百分位|年度观察|贡献多个年度|样本|少于 30|\d[\d,]* 人/.test(rankText)&&rankText.includes('统计出处'),{birthProvince:life.province,provinceNLives:p.nLives,nationalNLives:n.nLives});
   await noOverflow(label);
   const screenshot=join(out,`${label}-${width}.png`);await page.screenshot({path:screenshot,fullPage:true});
   await page.locator('.people-panel').screenshot({path:join(out,`${label}-people-${width}.png`)});
   cases.push({kind:sample.kind,width,id:life.id,age:life.age,people:members,screenshot});
  }
  await load(social.before);await page.locator('#decision-title').waitFor();
  check(`real people card ${width}px pending title`,await page.locator('#decision-title').textContent()===social.before.pending.title,{id:social.cardId,age:social.before.age,title:social.before.pending.title,variant:social.before.pending.variant});
  await page.screenshot({path:join(out,`people-card-${width}.png`),fullPage:true});
  const choiceIndex=social.before.pending.options.findIndex(o=>o.id===social.choice);await page.locator('.decision-options button').nth(choiceIndex).click();
  await page.waitForFunction(({key,id,choice})=>JSON.parse(localStorage.getItem(key))?.life?.peopleDilemmas?.[id]?.choice===choice,{key:SAVE_KEY,id:social.cardId,choice:social.choice});
  const after=hydrateSave(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY));
  const relation=after.life.log.findLast(e=>e.node==='people-relationship'&&e.age===social.before.age),expected=social.decided.people.lastChange;
  check(`real people choice ${width}px changes closeness with reason`,typeof relation?.reason==='string'&&relation.reason===social.impact.reason.replaceAll('{name}',relation.name)&&relation.reason===expected.reason&&relation.reason.includes(relation.name)&&relation.text.includes(relation.reason)&&relation?.personId===expected.personId&&relation.before===expected.before&&relation.after===expected.after,{choice:social.choice,event:relation});
  check(`real people choice ${width}px schedules 1-5 year seed`,after.life.cardSeeds.some(seed=>seed.cardId===social.seed.cardId&&seed.atAge===social.seed.atAge)&&social.seed.atAge-social.before.age>=1&&social.seed.atAge-social.before.age<=5,{age:social.before.age,scheduledAge:social.seed.atAge,id:social.seed.cardId});
  await page.screenshot({path:join(out,`people-choice-${width}.png`),fullPage:true});
  await load(social.future);
  const displayed=await page.locator('.life-log').textContent();
  check(`real people follow-up ${width}px appears at seeded time`,displayed.includes(social.followup.text)&&social.followup.age===social.seed.atAge&&social.followup.age-social.before.age>=1&&social.followup.age-social.before.age<=5,{sourceCard:social.cardId,decisionAge:social.before.age,scheduledAge:social.seed.atAge,actualAge:social.followup.age,text:social.followup.text});
  await noOverflow('people-followup');await page.screenshot({path:join(out,`people-followup-${width}.png`),fullPage:true});
  cases.push({kind:'people-dilemma',width,id:social.before.id,cardId:social.cardId,choice:social.choice,age:social.before.age,variant:social.before.pending.variant,followup:social.followup});
  await context.close();
 }
 check('browser pageerror',pageerrors.length===0,pageerrors);
}catch(error){fatal=String(error?.stack??error);check('smoke execution completed',false,fatal);}
finally{
 const report={pass:!fatal&&checks.every(row=>row.pass),date:new Date().toISOString(),url,chromeVersion:browser?await browser.version():null,checks,cases,pageerrors,fatal};
 writeFileSync(join(out,'ui-result.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();server?.kill();
 if(!report.pass)process.exitCode=1;
}
