import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {birthCard,endCard} from '../src/ui/share-cards.js';
const toolkit=process.env.TOUTAI_RENDER_NODE_MODULES??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const require=createRequire(join(toolkit,'package.json'));
const {chromium}=require('playwright'),sharp=require('sharp');
const out=new URL('../tests/artifacts-04/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.TOUTAI_CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const evidence=[];
try{const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 for(const [name,id] of [['urban','京-2026-066321'],['rural','粤-2026-694669']]){
  let life=createBirth(id);const birth=life;while(life.alive)life=step(life,{auto:true}).state;
  for(const[kind,svg]of [['birth',birthCard(birth)],['end',endCard(life)]]){
   const stem=new URL(`${name}-${kind}`,out);writeFileSync(fileURLToPath(stem)+'.svg',svg);
   await page.setContent(`<meta charset="utf-8"><style>html,body{margin:0}svg{display:block}</style>${svg}`);await page.evaluate(()=>document.fonts.ready);
   const path=fileURLToPath(stem)+'.png';await page.screenshot({path});const md=await sharp(path).metadata();assert.equal(md.width,1080);assert.equal(md.height,1920);
   evidence.push({id,kind,width:md.width,height:md.height});
  }
 }
 writeFileSync(new URL('share-card-render.json',out),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
}finally{await browser.close();}
