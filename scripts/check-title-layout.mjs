import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {endCard,colorCard} from '../src/ui/share-cards.js';
import {biography} from '../src/engine/biography.js';
const require=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium}=require('playwright'),args=process.argv.slice(2),i=args.indexOf('--output-dir'),out=i<0?'tests/artifacts-09/M4-retest':args[i+1];mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),results=[];
try{
 const p=await browser.newPage({viewport:{width:1100,height:1950}});
 const stress=simulate(createBirth('沪-2026-022423'),{capture:true}),stressBio=biography(stress);
 writeFileSync(join(out,'stress-long-biography.svg'),endCard(stress));
 const files=[...Array.from({length:10},(_,i)=>`sample-${i+1}-end.svg`),'stress-long-biography.svg'];
 for(const file of files){
  const svg=readFileSync(join(out,file),'utf8');await p.setContent(svg);await p.evaluate(()=>document.fonts.ready);
  const boxes=await p.locator('[data-card-region]').evaluateAll(groups=>Object.fromEntries(groups.map(g=>{const b=g.getBBox();return [g.dataset.cardRegion,{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.y+b.height}];})));
  const order=['title','biography','reference','people','summary'];
  for(let n=1;n<order.length;n++)assert.ok(boxes[order[n-1]].bottom<boxes[order[n]].y,`${file} overlap ${order[n-1]}/${order[n]} ${JSON.stringify(boxes)}`);
  for(const [name,b]of Object.entries(boxes)){assert.ok(b.x>=35&&b.x+b.width<=1045,`${file}/${name} overflows`);assert.ok(b.bottom<1800,`${file}/${name} crosses footer`);}
  assert.equal(await p.locator('[data-role="person-cell"]').count(),100);
  await p.locator('svg').screenshot({path:join(out,file.replace('.svg','.png'))});results.push({file,boxes});
 }
 await p.setContent(colorCard(stress));await p.evaluate(()=>document.fonts.ready);await p.locator('svg').screenshot({path:join(out,'stress-color.png')});
 writeFileSync(join(out,'title-layout.json'),JSON.stringify({pass:true,actualBrowserTextBounds:true,stress:{id:stress.id,biographyLength:stressBio.sentence.length,title:stressBio.title.name,biography:stressBio.sentence},results},null,2)+'\n');console.log(`PASS ${results.length} actual SVG layouts; stress ${stressBio.sentence.length} characters`);
}finally{await browser.close();}
