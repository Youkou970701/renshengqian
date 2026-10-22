import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {deriveChild} from '../src/engine/family.js';
const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium}=require('playwright');
const url=process.env.UI_URL??'http://127.0.0.1:5188/',out='tests/artifacts-08';mkdirSync(out,{recursive:true});
const birth=createBirth('粤-2026-694669');let school=birth;
while(school.alive&&school.pending?.id!=='school')school=step(school,{auto:true}).state;
assert.equal(school.pending.id,'school');
const save=(life,extra={})=>({schemaVersion:2,screen:'play',life,birthOrigin:birth,peers:[1,2,3,4].map(i=>drawBirth((life.seed+Math.imul(i,2654435761))>>>0,life.year)),mode:'normal',automaticVersion:1,automatic:false,duration:30,speed:1,focus:'auto',paused:false,reveal:null,revealQueue:[],familyRows:[],familyGoal:'free',pacingElapsedMs:0,...extra});
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:v2')));
const fingerprint=s=>({age:s.life.age,pending:s.life.pending?.id,rngState:s.life.rngState,choices:s.life.choices.length,log:s.life.log.length});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[],results=[];
try{
 const context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
 const p=await context.newPage();p.on('pageerror',e=>errors.push(String(e)));
 async function load(page,life,extra={}){await page.goto(url);await page.evaluate(s=>{localStorage.clear();localStorage.setItem('toutai-sim:v2',JSON.stringify(s));},save(life,extra));await page.reload();await page.locator('.age-display,.ticket,.end-page').first().waitFor();}
 await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.clear());await p.reload();await p.getByRole('button',{name:'出生 →',exact:true}).waitFor();assert.equal((await read(p)).automatic,false);assert.equal((await read(p)).duration,30);
 assert.deepEqual(await p.getByLabel('一局时长（近似）').locator('option').allTextContents(),['15 分钟','30 分钟','60 分钟']);
 await p.getByRole('button',{name:'出生 →',exact:true}).click();let prior=(await read(p)).life.id;const rerolled=[prior];
 for(let i=0;i<12;i++){await p.getByRole('button',{name:'重新抽签 ↻',exact:true}).click();const s=await read(p);assert.notEqual(s.life.id,prior);assert.equal(s.life.age,0);prior=s.life.id;rerolled.push(prior);}
 let collection=await p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:collection:v1')));assert.deepEqual(collection.provinces,[]);assert.deepEqual(collection.origins,[]);assert.deepEqual(collection.completed,[]);
 await p.screenshot({path:`${out}/birth-reroll-375.png`,fullPage:true});await p.getByRole('button',{name:'开始这一生 →',exact:true}).click();await p.waitForFunction(()=>JSON.parse(localStorage.getItem('toutai-sim:collection:v1')).provinces.length>0);collection=await p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:collection:v1')));assert.deepEqual(collection.provinces,[(await read(p)).life.province]);
 results.push({case:'默认设置、连续12次重抽、未开始不入图鉴',pass:true,rerolled:rerolled.length,automatic:false,duration:30});
 await p.getByRole('button',{name:'首页',exact:true}).click();await p.getByRole('button',{name:/每日一签/}).click();await p.getByRole('button',{name:'领取今日签 →',exact:true}).click();assert.equal(await p.getByRole('button',{name:'重新抽签 ↻',exact:true}).count(),0);await p.getByText('今日签全国同一个开局',{exact:true}).waitFor();
 const family=JSON.parse(readFileSync('tests/artifacts-06/family-lives.json','utf8'));const child=deriveChild(family[0]);assert.ok(child);await load(p,child,{screen:'birth',birthOrigin:child});assert.equal(await p.getByRole('button',{name:'重新抽签 ↻',exact:true}).count(),0);await p.getByText('孩子的出身由上一代决定',{exact:true}).waitFor();results.push({case:'每日签和接力孩子隐藏重抽并说明原因',pass:true});
 await load(p,school,{automatic:true,automaticVersion:undefined,duration:10});assert.equal((await read(p)).automatic,false);assert.equal((await read(p)).duration,30);await p.reload();assert.equal((await read(p)).automatic,false);results.push({case:'旧自动开启存档迁移关闭，旧10分钟迁移30分钟',pass:true});
 await load(p,school);const dialog=p.getByRole('dialog');assert.equal(await dialog.getAttribute('aria-modal'),'true');assert.equal(await p.locator('[data-testid=decision-backdrop]').count(),1);
 assert.equal(await p.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');assert.equal(await p.evaluate(()=>document.querySelector('.app-shell').inert),true);
 const rect=await dialog.boundingBox();assert.ok(Math.abs(rect.y+rect.height-812)<2);await p.screenshot({path:`${out}/decision-modal-375.png`});
 await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),await dialog.getByRole('button').last().textContent());await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),await dialog.getByRole('button').first().textContent());
 const before=fingerprint(await read(p)),started=Date.now();const scrollY=await p.evaluate(()=>scrollY);const cdp=await context.newCDPSession(p);
 for(let i=0;i<15;i++){await p.mouse.move(180,100);await p.mouse.wheel(0,300);if(i===2)await cdp.send('Input.synthesizeScrollGesture',{x:180,y:100,yDistance:-350,gestureSourceType:'touch'});await p.waitForTimeout(1000);}
 const after=fingerprint(await read(p));assert.deepEqual(after,before);assert.equal(await p.evaluate(()=>scrollY),scrollY);assert.equal(await dialog.count(),1);
 results.push({case:'375px连续真实15秒滚动不推进、不自动选',pass:true,wallSeconds:(Date.now()-started)/1000,before,after,bodyOverflow:'hidden',modal:true});
 await dialog.getByRole('button').last().click();assert.equal(await p.locator('.decision-backdrop').count(),0);assert.equal(await p.evaluate(()=>document.body.style.overflow),'');assert.equal(await p.evaluate(()=>document.body.style.position),'');assert.equal(await p.evaluate(()=>document.querySelector('.app-shell').inert),false);
 results.push({case:'选择后释放遮罩、body滚动与背景交互',pass:true});
 // Virtual browser time: countdown, visibility and full-duration tests without a 30-minute wall-clock wait.
 const q=await context.newPage();q.on('pageerror',e=>errors.push(String(e)));await q.clock.install();
 await load(q,birth);await q.getByRole('checkbox',{name:'自动抉择',exact:true}).check();await q.reload();assert.equal((await read(q)).automatic,true);results.push({case:'新版主动开启偏好刷新后保留',pass:true});
 await load(q,school,{automatic:true});await q.clock.runFor(3000);assert.match(await q.locator('.decision-time').textContent(),/7 秒/);await q.locator('#decision-title').tap();await q.clock.runFor(15000);assert.equal((await read(q)).life.choices.length,school.choices.length);assert.equal(await q.locator('.decision-time').textContent(),'已停止自动选择，请自己选');results.push({case:'主动开启10秒倒计时，3秒后触摸卡片，15秒后仍未选择',pass:true});
 await load(q,school,{automatic:true});await q.clock.runFor(3000);await q.locator('.decision').dispatchEvent('scroll');await q.clock.runFor(15000);assert.equal((await read(q)).life.choices.length,school.choices.length);results.push({case:'卡片内部滚动停止倒计时',pass:true});
 await load(q,school,{automatic:true});await q.clock.runFor(3000);await q.evaluate(()=>{window.testHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});document.dispatchEvent(new Event('visibilitychange'));});await q.clock.runFor(15000);assert.equal((await read(q)).life.choices.length,school.choices.length);assert.equal(await q.locator('.decision-time').textContent(),'已暂停倒计时');await q.evaluate(()=>{window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await q.clock.runFor(6000);assert.equal((await read(q)).life.choices.length,school.choices.length);await q.clock.runFor(1000);assert.equal((await read(q)).life.choices.length,school.choices.length+1);results.push({case:'后台暂停15秒，返回继续剩余7秒，只自动选择一次',pass:true});
 await load(q,school,{automatic:true,paused:true});await q.clock.runFor(15000);assert.match(await q.locator('.decision-time').textContent(),/已暂停/);assert.equal((await read(q)).life.choices.length,school.choices.length);results.push({case:'游戏暂停时自动倒计时不推进',pass:true});
 const resolved=step(school,{choice:'general'}).state,event=resolved.log.findLast(e=>e.dice?.length);assert.ok(event);
 await load(q,resolved,{reveal:event});await q.clock.runFor(15000);const diceBefore=fingerprint(await read(q));await q.clock.runFor(60000);assert.deepEqual(fingerprint(await read(q)),diceBefore);await q.getByRole('button',{name:/继续这一生|看看下一次裁决/}).waitFor();results.push({case:'骰子揭晓后未关闭弹层，60秒内年龄仍冻结',pass:true});
 const desktop=await browser.newPage({viewport:{width:1280,height:900}});desktop.on('pageerror',e=>errors.push(String(e)));await load(desktop,school);assert.equal(await desktop.getByRole('dialog').getAttribute('aria-modal'),'false');assert.equal(await desktop.locator('.decision-backdrop').count(),0);assert.equal(await desktop.evaluate(()=>document.body.style.overflow),'');await desktop.screenshot({path:`${out}/decision-inline-1280.png`});
 for(const width of [767,768]){await desktop.setViewportSize({width,height:900});await desktop.waitForFunction(expected=>document.querySelector('.decision').getAttribute('aria-modal')===expected,width<768?'true':'false');assert.equal(await desktop.getByRole('dialog').getAttribute('aria-modal'),width<768?'true':'false');}
 results.push({case:'桌面原位呈现，767模态/768非模态，动态切换释放滚动锁',pass:true});
 await desktop.close();
 await load(q,birth,{screen:'birth',automatic:true});await q.getByRole('button',{name:'开始这一生 →',exact:true}).click();let clockSeconds=0,guard=0,diceWait=0,decisionWait=0,delays=[];
 while((await read(q)).screen!=='end'){
  assert.ok(++guard<500,'Full life did not terminate');const s=await read(q);
  if(s.reveal){const before=fingerprint(s);await q.clock.runFor(1200);clockSeconds+=1.2;diceWait+=1.2;assert.deepEqual(fingerprint(await read(q)),before);await q.getByRole('button',{name:/继续这一生|看看下一次裁决/}).click();}
  else if(s.life.pending){await q.clock.runFor(10000);clockSeconds+=10;decisionWait+=10;}
  else {const {normalPacing}=await import('../src/ui/pacing.js');const timing=normalPacing(s.life,{duration:s.duration,elapsedMs:s.pacingElapsedMs,focus:s.focus,important:s.pacingImportantAge===s.life.age});const ms=Math.ceil(timing.delayMs)+1;delays.push({age:s.life.age,weight:timing.weight,seconds:timing.delayMs/1000});await q.clock.runFor(ms);clockSeconds+=ms/1000;}
 }
 const end=await read(q);assert.ok(clockSeconds>=1440&&clockSeconds<=2160);assert.ok(Math.abs(end.pacingElapsedMs-1800000)<.01);const expected=await q.evaluate(async b=>{const {simulate}=await import('/src/engine/life.js');return simulate(b,{capture:true});},birth);assert.deepEqual({...end.life,capture:true},expected);
 results.push({case:'30分钟档浏览器虚拟时钟完整一局',pass:true,clockSeconds,viewingSeconds:end.pacingElapsedMs/1000,decisionWaitSeconds:decisionWait,diceWaitSeconds:diceWait,age:end.life.age,id:end.life.id,engineStateIdentical:true,delays});await q.screenshot({path:`${out}/end-30-minute-375.png`,fullPage:true});
 await load(q,birth,{screen:'birth',mode:'speed',automatic:false});await q.getByRole('button',{name:'开始这一生 →',exact:true}).click();await q.clock.runFor(60000);const fast=await read(q);assert.equal(fast.screen,'end');assert.deepEqual({...fast.life,capture:true},expected);results.push({case:'一分钟极速局，自动偏好关闭时仍全自动并完整终局',pass:true,seconds:60,engineStateIdentical:true});
 assert.deepEqual(errors,[]);
 writeFileSync(`${out}/ui-result.json`,JSON.stringify({results,errors},null,2)+'\n');
 for(const {delays,...result} of results)console.log('PASS',JSON.stringify(result));
}finally{await browser.close();}
