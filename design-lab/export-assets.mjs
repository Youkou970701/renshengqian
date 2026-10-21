import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {resolve,join} from 'node:path';
const toolkit=process.env.TOUTAI_RENDER_NODE_MODULES??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const require=createRequire(join(toolkit,'package.json'));
const {chromium}=require('playwright');const sharp=require('sharp');
const root=fileURLToPath(new URL('.',import.meta.url));
const data=JSON.parse(readFileSync(join(root,'data.json'),'utf8'));
const folders=['A-dossier','B-ticket','C-lottery','D-datajournal','E-scroll'];
const labels=['A 人事档案','B 人生车票','C 出生摇号','D 数据新闻','E 竖版长卷'];
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']});
try{
 const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 const cells=[];
 for(let i=0;i<folders.length;i++){
  const folder=folders[i];const{buildCard}=await import(new URL(`./${folder}/card.mjs`,import.meta.url));
  for(const person of ['rural','urban']){
   const svg=buildCard(data[person]);const stem=join(root,folder,'card-'+person);writeFileSync(stem+'.svg',svg);
   await page.setContent(`<html><meta charset="utf-8"><style>html,body{padding:0;margin:0;width:1080px;height:1920px;overflow:hidden}svg{display:block}</style>${svg}</html>`);
   await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:stem+'.png',type:'png'});
   const md=await sharp(stem+'.png').metadata();if(md.width!==1080||md.height!==1920)throw Error('Wrong size '+stem);
   if(person==='rural')writeFileSync(join(root,folder,'card.png'),readFileSync(stem+'.png'));
   const thumb=await sharp(stem+'.png').resize(170,302,{fit:'fill'}).png().toBuffer();writeFileSync(stem+'-170.png',thumb);
   cells.push({input:thumb,left:26+i*190,top:person==='rural'?78:432});
  }
 }
 const heading=`<svg xmlns="http://www.w3.org/2000/svg" width="976" height="766"><rect width="976" height="766" fill="#eceee8"/><g font-family="'PingFang SC','Heiti SC',sans-serif" fill="#20382c"><text x="26" y="27" font-size="14" font-weight="700">同一个人生，五种看法 / 每张缩略图宽170px</text>${labels.map((l,i)=>`<text x="${26+i*190}" y="62" font-size="14" font-weight="600">${l}</text>`).join('')}<text x="26" y="406" font-size="12">上：周亦辰 · 广东农村留守 · 67岁 / 下：刘欣怡 · 北京城市家庭 · 92岁</text><text x="26" y="753" font-size="11">两个真实出生编号 / 不改人生结果 / 全部卡片原图为1080×1920</text></g></svg>`;
 await page.setViewportSize({width:976,height:766});await page.setContent(`<html><style>html,body{margin:0}</style>${heading}</html>`);await page.evaluate(()=>document.fonts.ready);const background=await page.screenshot();await sharp(background).composite(cells).png().toFile(join(root,'thumbs.png'));
 console.log('Exported 10 real-data cards (1080x1920), 10 thumbnails (170px), and thumbs.png');
}finally{await browser.close();}
