import {createRequire} from 'node:module';import {join} from 'node:path';import {homedir} from 'node:os';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const require=createRequire(join(process.env.TOUTAI_RENDER_NODE_MODULES??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'package.json'));
const {webkit,devices}=require('playwright');const sharp=require('sharp');
const browser=await webkit.launch({headless:true});const outcomes=[];
try{const context=await browser.newContext({...devices['iPhone 13'],acceptDownloads:true});const page=await context.newPage();
 const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5173')&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:'))external.push(r.url());});
 for(const kind of ['birth','end']){
  await page.goto(`http://127.0.0.1:5173/tests/artifacts-04/share-fixture.html?kind=${kind}`);
  const downloads=[];page.on('download',d=>downloads.push(d));await page.getByRole('button',{name:'保存图片',exact:true}).click();
  const img=page.locator('.share-image-preview img');await img.waitFor();await img.evaluate(i=>i.decode());
  const dimensions=await img.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,src:i.currentSrc}));assert.equal(dimensions.width,1080);assert.equal(dimensions.height,1920);assert.ok(dimensions.src.startsWith('blob:'));
  await page.getByText('下载 PNG 原图',{exact:true}).waitFor();await page.getByText('图片已在本机生成。手机可长按下图，选择「存储到照片」。',{exact:true}).waitFor();
  const download=downloads[0]??await page.waitForEvent('download',{timeout:3000}).catch(()=>null);
  if(download){const path=new URL(`../tests/artifacts-04/webkit-${kind}-download.png`,import.meta.url);await download.saveAs(fileURLToPath(path));const md=await sharp(fileURLToPath(path)).metadata();assert.equal(md.width,1080);assert.equal(md.height,1920);}
  await page.screenshot({path:fileURLToPath(new URL(`../tests/artifacts-04/webkit-${kind}-fallback.png`,import.meta.url)),fullPage:true});
  outcomes.push({kind,browser:'Playwright WebKit 26.5, iPhone 13 emulation (not iOS hardware or Apple Simulator)',pngDimensions:[dimensions.width,dimensions.height],downloadEvent:Boolean(download),fallbackImage:true,longPressInstruction:true,externalRequests:external.length});
 }
 assert.deepEqual(external,[]);writeFileSync(new URL('../tests/artifacts-04/webkit-share-result.json',import.meta.url),JSON.stringify(outcomes,null,2)+'\n');console.log(JSON.stringify(outcomes,null,2));
}finally{await browser.close();}
