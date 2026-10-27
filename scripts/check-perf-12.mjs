/** Production-browser acceptance for handoff 12, phase 1 only.
 * Run: npm run build && node scripts/check-perf-12.mjs
 * Optional: PERF_URL=http://127.0.0.1:.../ (existing production preview),
 * TOUTAI_CHROME=/path/to/chrome, PERF_OUTPUT=/path/to/evidence.
 * This script drives the shipped UI; it never replaces the app's engine.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {migrateLife} from '../src/engine/migrate.js';
import {hydrateSave} from '../src/ui/save.js';

const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium}=require('playwright');
const out=resolve(process.env.PERF_OUTPUT??'tests/artifacts-12');mkdirSync(out,{recursive:true});
const url=process.env.PERF_URL??'http://127.0.0.1:5192/';
const SAVE_KEY='toutai-sim:v2',checks=[],errors=[];
function check(name,actual,limit,pass){const row={name,actual,limit,pass};checks.push(row);console.log(pass?'PASS':'FAIL',name,JSON.stringify(actual));}
function advancePeer(peer,age){let guard=0;while(peer.alive&&peer.age<age){assert.ok(++guard<300);peer=step(peer,{auto:true,...(peer.pending?{choice:autoChoose(peer)}:{})}).state;}return peer;}
function oldSave(life,extra={}){return{schemaVersion:2,screen:'play',life,birthOrigin:createBirth(life.id),peers:[1,2,3,4].map(i=>advancePeer(drawBirth((life.seed+Math.imul(i,2654435761))>>>0,life.year),life.age)),familyRows:[],familyGoal:'free',mode:'normal',automaticVersion:1,automatic:false,duration:30,speed:1,focus:'auto',paused:true,reveal:null,revealQueue:[],pacingElapsedMs:0,...extra};}
const read=async page=>hydrateSave(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SAVE_KEY));
async function settle(page,ms=350){await page.waitForTimeout(ms);}
let server,browser;
try{
 if(!process.env.PERF_URL){
  assert.ok(existsSync('dist/index.html'),'Build first: npm run build');
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','5192','--strictPort'],{stdio:['ignore','pipe','pipe']});
  let log='';server.stdout.on('data',b=>log+=b);server.stderr.on('data',b=>log+=b);
  await new Promise((resolve,reject)=>{const started=Date.now(),timer=setInterval(async()=>{if(server.exitCode!==null){clearInterval(timer);reject(Error(log));return;}try{const response=await fetch(url);if(response.ok){clearInterval(timer);resolve();}}catch{}if(Date.now()-started>15000){clearInterval(timer);reject(Error('Preview did not start: '+log));}},100);});
 }
 browser=await chromium.launch({headless:true,executablePath:process.env.TOUTAI_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await context.addInitScript(({SAVE_KEY})=>{
  window.__perf12={writes:[],longTasks:[],recording:false};
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(this===localStorage){let age=null;try{age=JSON.parse(value)?.life?.age??null;}catch{}window.__perf12.writes.push({key,age,bytes:new TextEncoder().encode(value).length,at:performance.now()});}
   return original.call(this,key,value);
  };
  // Seed at document start: a real pagehide flush from the previous page must
  // never overwrite the fixture before the next app has a chance to restore it.
  if(window.name.startsWith('toutai-perf12:')){const raw=window.name.slice('toutai-perf12:'.length);window.name='';localStorage.clear();localStorage.setItem(SAVE_KEY,raw);}
  new PerformanceObserver(list=>{if(window.__perf12.recording)for(const entry of list.getEntries())window.__perf12.longTasks.push({startTime:entry.startTime,duration:entry.duration,name:entry.name});}).observe({type:'longtask',buffered:false});
 },{SAVE_KEY});
 const page=await context.newPage();page.on('pageerror',error=>errors.push(String(error)));
 const cdp=await context.newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 const jsBodies=new Map(),pendingBodies=[];let navigationJS=new Set();
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigationJS=new Set();});
 page.on('response',response=>{if(!/\.js(?:\?|$)/.test(response.url()))return;navigationJS.add(response.url());if(response.status()>=200&&response.status()<300)pendingBodies.push(response.body().then(body=>{jsBodies.set(response.url(),body);}).catch(error=>errors.push('JS response: '+error)));});
 await page.goto(url,{waitUntil:'networkidle'});await page.locator('.hv-settings').waitFor();await Promise.all(pendingBodies);
 const firstScreenJS=[...jsBodies].map(([url,body])=>({url,rawBytes:body.length,gzipBytes:gzipSync(body).length}));
 const firstScreenGzip=firstScreenJS.reduce((sum,row)=>sum+row.gzipBytes,0);
 check('首屏实际请求 JavaScript gzip 总和',firstScreenGzip,'≤150×1024 bytes',firstScreenGzip<=150*1024);
 // Observe first-screen requests before opening anything; all subsequent requests
 // are recorded separately, so lazy imports cannot disappear from this evidence.
 const firstScreenURLs=new Set(jsBodies.keys());
 await page.getByRole('button',{name:'统计出处',exact:true}).click();await page.locator('.sources').waitFor();await page.waitForLoadState('networkidle');await Promise.all(pendingBodies);
 const sourceJS=[...jsBodies.keys()].filter(u=>!firstScreenURLs.has(u));
 check('统计出处按需请求',sourceJS.map(u=>new URL(u).pathname),'打开后新增 JS 请求',sourceJS.length>0);
 await page.getByRole('button',{name:'首页',exact:true}).click();await page.locator('.hv-settings').waitFor();
 const beforeCollection=new Set(jsBodies.keys());await page.getByRole('button',{name:/人生图鉴/}).click();await page.locator('.collection-page').waitFor();await page.waitForLoadState('networkidle');await Promise.all(pendingBodies);
 const collectionJS=[...jsBodies.keys()].filter(u=>!beforeCollection.has(u));
 check('图鉴按需请求',collectionJS.map(u=>new URL(u).pathname),'打开后新增 JS 请求',collectionJS.length>0);
 check('图鉴含称号与模拟频率',await page.locator('.title-collection h3').count(),'称号及频率展示可用',(await page.locator('.title-collection h3').count())>0&&(await page.locator('.achievement-grid').last().textContent()).includes('10 万次模拟'));

 async function load(saved){await page.evaluate(saved=>{window.name='toutai-perf12:'+JSON.stringify(saved);},saved);await page.reload({waitUntil:'networkidle'});await page.locator('.age-display,.ticket,.end-page').first().waitFor();await settle(page);}
 // The fixed survivor reaches 80 under the shipped deterministic auto policy.
 const birth=createBirth('鄂-2026-002735');
 await load(oldSave(birth));
 await page.clock.install();
 await page.evaluate(()=>{window.__perf12.writes=[];window.__perf12.longTasks=[];window.__perf12.recording=true;});
 const moves=[];let expectedLife=birth;
 async function closeDice(){
  let guard=0;
  while(await page.locator('.dice-modal').count()){
   assert.ok(++guard<10,'Dice modal did not close');
   await page.clock.runFor(1250);
   await page.getByRole('button',{name:/继续这一生|看看下一次裁决/}).click();
  }
 }
 async function progressTo(target){
  let guard=0;
  for(;;){
   assert.ok(++guard<500,'UI advancement stalled');
   await closeDice();
   const age=Number(await page.locator('.age-display').textContent().then(text=>text.replace(/\D/g,'')));
   assert.equal(age,expectedLife.age,'UI age diverged from independent reference inputs');
   const pending=await page.locator('.decision-options').count();
   if(age>=target&&!pending)return;
   assert.ok(expectedLife.alive,'Fixed survivor died before target');
   if(pending){
    // An independent pure reference follows the same inputs to obtain the
    // normal auto policy even while a pending card awaits its checkpoint.
    // The UI title/age must match; clicking executes the production reducer.
    assert.equal(await page.locator('#decision-title').textContent(),expectedLife.pending.title,'UI pending card diverged');
    const id=autoChoose(expectedLife),index=expectedLife.pending.options.findIndex(o=>o.id===id);
    assert.ok(index>=0,'Auto policy did not return a pending option');
    await page.locator('.decision-options button').nth(index).click();moves.push({age,choice:id});expectedLife=step(expectedLife,{choice:id}).state;
   }else{
    await page.getByRole('button',{name:'过一年',exact:true}).click();moves.push({age,advance:true});expectedLife=step(expectedLife).state;
   }
   // Let React commit and checkpoints finish between user actions. Browser
   // clock accelerates only the 1.2-second dice reveal, never engine execution.
   await settle(page);
  }
 }
 await progressTo(60);await settle(page);await page.evaluate(()=>{window.__perf12.recording=false;});
 const sixty=await read(page),perf=await page.evaluate(()=>window.__perf12);
 const histogram={};for(const row of perf.writes.filter(row=>row.key===SAVE_KEY&&row.age>0&&row.age<=60))histogram[row.age]=(histogram[row.age]??0)+1;
 const maxWrites=Math.max(0,...Object.values(histogram));
 check('375px + Chrome 4× CPU，推进60年长任务 >50ms',perf.longTasks,'≤3',perf.longTasks.length<=3);
 check('每年主存档 localStorage 写入',maxWrites,'≤2',maxWrites<=2);
 const checkpointYears=Object.keys(histogram).length;
 check('每年都有落盘进度',checkpointYears,'60 个年龄',checkpointYears===60);
 const totalWrites=perf.writes.length;
 check('60年全部 localStorage 写入平均',totalWrites/60,'≤2 / year',totalWrites<=120);
 check('人生纪录初始渲染上限',await page.locator('.life-log>li').count(),'30',await page.locator('.life-log>li').count()===30);
 await page.screenshot({path:join(out,'age60-375.png'),fullPage:true});
 const beforeExpand=await page.locator('.life-log>li').count();await page.getByRole('button',{name:/查看更早/}).click();
 check('查看更早可展开',await page.locator('.life-log>li').count(),'>30',await page.locator('.life-log>li').count()>beforeExpand);
 // Pacing/preferences are UI state, with no checkpoint until an actual life
 // transition or lifecycle flush. Waiting uses the browser clock only.
 const beforePrefs=await page.evaluate(()=>window.__perf12.writes.filter(x=>x.key==='toutai-sim:v2').length);
 await page.getByRole('button',{name:'2×',exact:true}).click();await page.clock.runFor(2000);await settle(page);
 const afterPrefs=await page.evaluate(()=>window.__perf12.writes.filter(x=>x.key==='toutai-sim:v2').length);
 check('速度/计时变化不触发主存档',afterPrefs-beforePrefs,'0',afterPrefs===beforePrefs);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await settle(page);
 const hidden=await read(page),afterHidden=await page.evaluate(()=>window.__perf12.writes.filter(x=>x.key==='toutai-sim:v2').length);
 check('页面隐藏立即保存最新偏好',{writes:afterHidden-afterPrefs,speed:hidden.speed},'1次且speed=2',afterHidden-afterPrefs===1&&hidden.speed===2);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));});
 await page.getByRole('button',{name:'1×',exact:true}).click();await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await settle(page);
 const pagehide=await read(page),afterPagehide=await page.evaluate(()=>window.__perf12.writes.filter(x=>x.key==='toutai-sim:v2').length);
 check('pagehide立即保存最新偏好',{writes:afterPagehide-afterHidden,speed:pagehide.speed},'1次且speed=1',afterPagehide-afterHidden===1&&pagehide.speed===1);
 await progressTo(80);await settle(page);
 const eighty=await read(page),saveBytes=await page.evaluate(key=>new TextEncoder().encode(localStorage.getItem(key)).length,SAVE_KEY);
 check('80岁存档 UTF-8 大小',saveBytes,'≤120×1024 bytes',eighty.life.age===80&&saveBytes<=120*1024);
 check('peers仅存编号与年龄',eighty.peers,'每项仅id/age',eighty.peers.length===4&&eighty.peers.every(peer=>Object.keys(peer).sort().join(',')==='age,id'));
 // Reload a real old full-peer save at a pending decision, not a fabricated
 // reduced fixture. Keep all RNG/history/choices and the exact pending card.
 let legacyLife=birth;while(legacyLife.alive&&(legacyLife.age<46||!legacyLife.pending))legacyLife=step(legacyLife,{auto:true}).state;
 const legacy=oldSave(legacyLife);await load(legacy);const peerText=await page.locator('.peers').textContent();
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await settle(page);const migrated=await read(page);
 check('旧全量存档主角完整进度迁移',{age:migrated.life.age,pending:migrated.life.pending?.id,schemaVersion:migrated.schemaVersion},'与迁移前所有字段一致且schema3',JSON.stringify(migrated.life)===JSON.stringify(migrateLife(legacyLife))&&migrated.schemaVersion===3);
 check('旧全量存档四条同生人生可见',legacy.peers.map(peer=>({id:peer.id,age:peer.age})), '4人姓名/年龄显示',legacy.peers.every(peer=>peerText.includes(peer.name)&&peerText.includes(`${peer.age} 岁`)));
 await page.reload({waitUntil:'networkidle'});await page.locator('.peers').waitFor();const resumedPeers=await page.locator('.peers').textContent();
 check('压缩后重载同生人生一致',resumedPeers,'与旧档展示逐字一致',resumedPeers===peerText);
 // Birth share generation stays cold until clicked, then produces a usable PNG.
 await load(oldSave(birth,{screen:'birth'}));await Promise.all(pendingBodies);
 const birthEntryURLs=[...navigationJS];assert.ok(birthEntryURLs.length>0,'Direct birth entry must request its script graph');
 const birthEntryJS=birthEntryURLs.map(url=>({url,gzipBytes:gzipSync(jsBodies.get(url)).length}));
 const birthEntryGzip=birthEntryJS.reduce((sum,row)=>sum+row.gzipBytes,0);
 const beforeShare=new Set(jsBodies.keys());await page.getByRole('button',{name:'分享 / 展开图片',exact:true}).click();await page.locator('.share-image-preview img').waitFor();await Promise.all(pendingBodies);
 const shareJS=[...jsBodies.keys()].filter(u=>!beforeShare.has(u));
 check('分享卡生成按需请求',shareJS.map(u=>new URL(u).pathname),'点击后新增 JS 请求',shareJS.length>0);
 const image=await page.locator('.share-image-preview img').evaluate(img=>({width:img.naturalWidth,height:img.naturalHeight,loaded:img.complete}));
 check('出生分享PNG可用',image,'1080×1920',image.loaded&&image.width===1080&&image.height===1920);
 check('手机横向溢出',await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),'≤0',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check('浏览器异常',errors,'0',errors.length===0);
 const report={phase:1,viewport:{width:375,height:812},cpuThrottlingRate:4,httpCacheDisabled:true,chromeVersion:await browser.version(),date:new Date().toISOString(),url,checks,pass:checks.every(row=>row.pass),firstScreenJS,firstScreenGzip,birthEntryJS,birthEntryGzip,sourceJS,collectionJS,shareJS,sixty:{id:sixty.life.id,age:sixty.life.age,logCount:sixty.life.log.length},eighty:{id:eighty.life.id,age:eighty.life.age,saveBytes},perYearMainSaveWrites:histogram,totalStorageWrites60:totalWrites,longTasks:perf.longTasks,storageWrites:perf.writes,moves,errors};
 writeFileSync(join(out,'perf-result.json'),JSON.stringify(report,null,2)+'\n');
 assert.ok(report.pass,'Performance acceptance failed; see '+join(out,'perf-result.json'));
}catch(error){writeFileSync(join(out,'perf-error.json'),JSON.stringify({date:new Date().toISOString(),checks,errors,fatal:String(error),stack:error.stack},null,2)+'\n');throw error;}finally{await browser?.close();server?.kill();}
