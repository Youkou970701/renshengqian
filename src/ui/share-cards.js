import {settlement} from '../engine/family.js';
import {summary} from '../engine/summary.js';
import {jobPhrase} from '../content/presentation.js';

export const CARD_WIDTH=1080;
export const CARD_HEIGHT=1920;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const text=(s,x,y,size=30,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(s)}</text>`;
const lines=(s,x,y,{size=32,max=25,gap=51,...rest}={})=>{const a=Array.from(String(s??''));return Array.from({length:Math.ceil(a.length/max)},(_,i)=>text(a.slice(i*max,(i+1)*max).join(''),x,y+i*gap,size,rest.bold?'font-weight="700"':'')).join('');};
const shell=(body,bg,ink)=>`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="${bg}"/><g fill="${ink}" font-family="PingFang SC,Microsoft YaHei,Heiti SC,sans-serif">${body}</g></svg>`;
const family=['','每笔开销都要细算','大笔支出需要攒钱','日常有着落，花费需计划','有积蓄支持你的求学','求学和起步都有人托底'];
const footer=(life,ink='#192e28')=>`<path d="M60 1800H1020" stroke="${ink}" stroke-width="2"/>${text(life.id,60,1850,27,'font-family="Menlo,Courier New,monospace"')}${text('人生签',1020,1850,28,'text-anchor="end" font-weight="700"')}${text('基于公开统计的模拟，不代表任何个人命运',60,1894,21)}`;
const badge=(s)=>s?`<rect x="60" y="159" width="960" height="65" fill="#ed563c"/>${text(s,85,203,31,'fill="#fff" font-weight="700"')}`:'';

/** All card input is already-computed life state; rendering consumes no randomness. */
export function birthCard(life,opts={}) {
 const parents=life.parents??{}, p=(role,title)=>{const v=parents[role]??{};const age=v.birthAge??Math.max(0,(v.age??25)-life.age);return `${title}${v.name??''} · 当时 ${age} 岁 · ${jobPhrase(v.job)}`;};
 const care=life.leftBehind?(parents.mother?.away?'父母常年在外工作，主要由爷爷奶奶照料。':'父亲常年在外工作，由妈妈和家中长辈照料。'):'和父母一起生活。';
 return shell(`<path d="M35 42H1045V1875H35Z" fill="#e4f0f2" stroke="#497b91" stroke-width="2"/><rect x="35" y="42" width="1010" height="28" fill="#295b73"/>${text('人生铁路 / 单程票',75,129,31,'font-weight="700" letter-spacing="5"')}${text('出发，去过这一生。',1005,129,25,'text-anchor="end"')}${badge(opts.badge)}${text('始发站',75,305,28,'letter-spacing="8"')}${text(life.province,64,443,112,'font-weight="800"')}${text(`${life.place??''} · ${life.hukou==='rural'?'乡村':'城市'}`,75,507,34)}<path d="M565 382H979M953 364L979 382L953 400" fill="none" stroke="#295b73" stroke-width="5"/>${text('人生',1000,457,51,'text-anchor="end" font-weight="700"')}${text(life.name,75,670,89,'font-weight="700"')}${text(`${life.year} 年 ${life.month??1} 月 · ${life.sex==='female'?'女孩':'男孩'}`,75,740,35)}<path d="M75 790H1005" stroke="#6591a2" stroke-width="2"/>${text('车次 / 出生编号',75,850,27)}${text(life.id,75,912,43,'font-family="Menlo,Courier New,monospace" fill="#ed563c" font-weight="700"')}${text('随行家人',75,1010,28,'font-weight="700"')}${lines(p('father','爸爸'),75,1070,{size:31,max:29,gap:46})}${lines(p('mother','妈妈'),75,1170,{size:31,max:29,gap:46})}<path d="M35 1280H1045" stroke="#6492a3" stroke-dasharray="7 13" stroke-width="4"/><circle cx="35" cy="1280" r="26" fill="#b6d5df"/><circle cx="1045" cy="1280" r="26" fill="#b6d5df"/>${text('家里的起点',75,1360,28,'font-weight="700"')}${text(family[life.wealthQ]??family[3],75,1430,38,'font-weight="700"')}${lines(care,75,1500,{size:30,max:28,gap:47})}${text('这一生，准备出发',75,1710,58,'font-weight="800"')}${footer(life,'#295b73')}`,'#b6d5df','#234e65');
}

export function endCard(life,opts={}) {
 const s=summary(life),n=Math.max(0,Math.min(100,Math.round(s.bachelorPer100??0)));
 const educated=['bachelor','211','985','master','phd'].includes(life.edu);
 const me=educated?Math.max(0,n-1):99;
 const grid=Array.from({length:100},(_,i)=>{const x=60+(i%10)*96,y=735+Math.floor(i/10)*96;return `<rect x="${x}" y="${y}" width="82" height="82" fill="${i===me?'#ed563c':i<n?'#285e49':'#dfe5dc'}"/>${i===me?`<path d="M${x+15} ${y+41}h52m-26-26v52" stroke="#fff" stroke-width="7"/>`:''}`;}).join('');
 const edu=s.education==='普通本科'?'本科':s.education;
 return shell(`<rect x="60" y="60" width="960" height="18"/>${text('人生签 / 中国版',60,128,27,'font-weight="700"')}${text('一生的数据',1020,128,24,'text-anchor="end"')}${badge(opts.badge)}${text(`${life.province} · ${life.place??''}`,60,272,30)}${text(n,52,541,302,'font-family="Arial,sans-serif" font-weight="700" letter-spacing="-15"')}${text('/ 100 人',470,541,65)}${text('同省同年出生的人里，',60,622,43,'font-weight="600"')}${text(`约 ${n} 人读了本科。`,60,684,43,'font-weight="600"')}${text(`模型出生队列参照 · 本省 ${s.referenceSample??0} 局`,60,718,20)}${grid}${text(`你读到${edu}，走过 ${life.age} 年。`,60,1730,50,'font-weight="800"')}${text(`${life.name} · ${life.lastJob??life.job} · 橙色方格是你`,60,1775,27)}${footer(life)}`,'#fafbf7','#192e28');
}

/** Player-visible strings only, used by editorial tests (SVG attributes are not copy). */
export function cardText(svg){return Array.from(svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g),m=>m[1].replace(/&apos;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')).join('\n');}

export function familyCard(life,opts={}){
 const rows=(opts.family?.length?opts.family:[life]).slice(0,3),first=rows[0],last=rows.at(-1);
 const home=s=>s.familySettlement??s.city;
 let headline=rows.length===3?`${first.name[0]}家三代，把日子接着往前过。`:`这个家的故事，写到了第 ${rows.length} 代。`;
 if(rows.length===3&&first.hukou==='rural')headline=rows.some(s=>s.hukou==='urban')?`${first.name[0]}家三代，有人在城市出生。`:`${first.name[0]}家三代，出生仍在乡村。`;
 const body=rows.map((s,i)=>{
  const y=420+i*430,previous=rows[i-1],delta=previous?s.wealthQ-previous.wealthQ:0;
  const education=summary(s).education,settled=settlement(s).label;
  return `${i?text(delta>0?'↑ 起点更宽裕':delta<0?'↓ 起点更紧张':'→ 相近的起点',75,y-43,27,'fill="#ed563c"'):''}<path d="M60 ${y}H1020" stroke="#203b30" stroke-width="2"/>${text(`第 ${i+1} 代`,65,y+55,28)}${text(s.name,65,y+136,69,'font-weight="700"')}${text(`${s.age} 岁`,1005,y+136,69,'text-anchor="end" font-weight="700"')}${text(`出生 · ${s.province}${s.place} · ${s.hukou==='rural'?'乡村':'城市'}`,65,y+200,31)}${text(`学历 · ${education}`,65,y+255,31)}${text(`定居 · ${settled}`,65,y+310,31)}`;
 }).join('');
 return shell(`<rect x="60" y="60" width="960" height="18"/>${text('人生签 / 家族接力',60,137,30,'font-weight="700"')}${text(`${rows.length} 代`,1015,137,30,'text-anchor="end"')}${lines(headline,60,265,{size:55,max:17,gap:75,bold:true})}${body}${footer(life)}`,'#fafbf7','#192e28');
}
