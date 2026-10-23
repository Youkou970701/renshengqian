import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {marryPartner,partnerCandidate} from '../src/engine/relationships.js';
import {RELATIONSHIP_CARDS} from '../src/content/cards/relationships.js';
const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium}=require('playwright'),out=process.env.V2_UI_OUTPUT??'tests/artifacts-09/M4';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),errors=[],results=[];
try{
 const p=await browser.newPage({viewport:{width:375,height:812},isMobile:true,hasTouch:true});p.on('pageerror',e=>errors.push(String(e)));
 const url=process.env.UI_URL??'http://127.0.0.1:5199/';
 await p.goto(url,{waitUntil:'networkidle'});await p.evaluate(()=>localStorage.clear());await p.reload();
 assert.equal(await p.locator('.hv-bars li').count(),31);assert.equal(await p.getByRole('checkbox',{name:/略过沉重情节/}).isChecked(),false);
 assert.ok((await p.locator('.hv-clock').innerText()).includes('按统计模拟'));
 await p.getByRole('button',{name:'暂停滚动',exact:true}).click();assert.equal(await p.getByRole('button',{name:'继续滚动',exact:true}).count(),1);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:join(out,'home-375.png'),fullPage:true});
 await p.setViewportSize({width:1280,height:900});await p.screenshot({path:join(out,'home-1280.png'),fullPage:true});await p.setViewportSize({width:375,height:812});
 await p.getByRole('button',{name:'出生 →',exact:true}).click();let id='';
 for(let i=0;i<12;i++){const before=await p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:v2')).life.id);const now=Date.now();await p.getByRole('button',{name:'重新抽签 ↻',exact:true}).click();id=await p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:v2')).life.id);assert.notEqual(id,before);assert.ok(Date.now()-now<1000);}
 await p.getByRole('button',{name:'首页',exact:true}).click();assert.match(await p.locator('.hv-abandoned').innerText(),/12/);results.push('手机/桌面首页31省可读且无横溢；12次重抽每次1秒内，本机放弃数12');
 const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('toutai-sim:v2')));
 const birth=createBirth('浙-2026-257424'),ending=simulate(birth,{capture:true});
 const save=life=>({schemaVersion:2,screen:life.alive?'play':'end',life,birthOrigin:birth,peers:[1,2,3,4].map(i=>drawBirth(i)),mode:'normal',automaticVersion:1,automatic:false,duration:30,speed:1,focus:'auto',paused:true,reveal:null,revealQueue:[],familyRows:[],familyGoal:'free',pacingElapsedMs:0});
 await p.evaluate(s=>localStorage.setItem('toutai-sim:v2',JSON.stringify(s)),save(ending));await p.reload();await p.locator('.ending-story').waitFor();
 assert.equal(await p.locator('.ending-story .color-axis').count(),4);assert.equal((await read()).life.id,ending.id);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.screenshot({path:join(out,'end-375.png'),fullPage:true});await p.setViewportSize({width:1280,height:900});await p.screenshot({path:join(out,'end-1280.png'),fullPage:true});await p.setViewportSize({width:375,height:812});
 for(const [selector,name]of [['.ending-color .share-image','color'],['.end-details .share-image','end']]){const d=p.waitForEvent('download');await p.locator(selector).getByRole('button',{name:'保存图片',exact:true}).click();await(await d).saveAs(join(out,`${name}-card.png`));const image=p.locator(selector+' img');await image.waitFor();assert.equal(await image.evaluate(img=>img.naturalWidth),1080);assert.equal(await image.evaluate(img=>img.naturalHeight),1920);}
 await p.getByRole('button',{name:'首页',exact:true}).click();await p.locator('.hv-past-cards button').first().click();await p.locator('.past-life-dialog').waitFor();assert.equal(await p.locator('.past-life-dialog .color-axis').count(),4);assert.match(await p.locator('.past-life-dialog').innerText(),new RegExp(ending.name));await p.reload();assert.equal(await p.locator('.hv-past-cards button').count(),1);
 await p.getByRole('button',{name:/人生图鉴/}).click();assert.equal(await p.locator('.dex-section').filter({has:p.getByRole('heading',{name:'这一生的称号',exact:true})}).count(),1);results.push('终局真实传记/四轴渲染，终局及底色1080×1920 PNG生成，前世刷新留存和回看，称号进入图鉴');
 const adult={...birth,age:30,sex:'male',assets:50000};marryPartner(adult,{...partnerCandidate(adult),age:29,sex:'female'});const card=RELATIONSHIP_CARDS.find(c=>c.id==='relationship-marriage-crisis');adult.pending={id:card.id,title:card.title,options:card.options.map(o=>({id:o.id,label:o.label}))};const resolved=step(adult,{choice:'sue'}).state;
 await p.evaluate(s=>localStorage.setItem('toutai-sim:v2',JSON.stringify(s)),save(resolved));await p.reload();const logs=await p.locator('.life-log li').allTextContents();const choice=logs.findIndex(t=>t.includes('你选择了「向法院起诉离婚」')),court=logs.findIndex(t=>t.includes('未判准离婚'));assert.ok(choice>=0&&court>choice);await p.screenshot({path:join(out,'relationship-order-375.png'),fullPage:true});results.push('手机页面同年先显示起诉选择，再显示法院未判准结果');
 assert.deepEqual(errors,[]);writeFileSync(join(out,'ui.json'),JSON.stringify({results,errors},null,2)+'\n');console.log(results);
}finally{await browser.close();}
