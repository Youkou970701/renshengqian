import {mkdirSync,writeFileSync} from 'node:fs';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {biography} from '../src/engine/biography.js';
import {netAssets} from '../src/engine/money.js';
const outputIndex=process.argv.indexOf('--output-dir');
const out=outputIndex<0?'tests/artifacts-09/M5':process.argv[outputIndex+1];if(!out)throw Error('--output-dir需要路径');mkdirSync(out,{recursive:true});
const lives={urbanMiddle:simulate(createBirth('冀-2026-083642'),{capture:true}),eliteFamily:simulate(createBirth('浙-2026-943206'),{capture:true})};
let scanIndex=null;
for(let i=0;i<20000;i++){
 const b=drawBirth((Math.imul(i,2654435761)+123456789)>>>0);
 if(b.hukou!=='rural'||b.wealthQ!==1)continue;
 const s=simulate(b,{capture:true});
 if(s.scenarioHistory.some(h=>h.category==='jianghu'&&h.outcome&&h.outcome!=='avoided'&&h.outcome!=='skipped')){lives.ruralJianghu=s;scanIndex=i;break;}
}
if(!lives.ruralJianghu)throw Error('固定序列未找到农村Q1实际走江湖者');
if(lives.urbanMiddle.hukou!=='urban'||lives.urbanMiddle.wealthQ!==3||!['clerk','hr','itops','accountant','designer','writer','bank','sales'].includes(lives.urbanMiddle.record.economy40?.jobId))throw Error('城市Q3样本不符合普通白领条件');
if(!lives.eliteFamily.eliteFamily)throw Error('富豪样本不是富豪线');
const selection={method:'两个既有固定编号仍符合类型则保留；农村Q1样本为正式固定出生序列中首个实际走过江湖且未躲开者。不按好坏、寿命或文本质量筛选。样本用于逐条阅读，不据此计算总体比例。',ruralScanIndex:scanIndex,criteria:{ruralJianghu:'rural + wealthQ=1 + jianghu已结束且非avoided/skipped',urbanMiddle:'urban + wealthQ=3 + 40岁普通白领岗位',eliteFamily:'出生eliteFamily=true'},samples:Object.fromEntries(Object.entries(lives).map(([key,s])=>[key,{id:s.id,hukou:s.hukou,wealthQ:s.wealthQ,eliteFamily:s.eliteFamily,job40:s.record.economy40,title:biography(s).title.name,scenarios:s.scenarioHistory.map(h=>({id:h.id,outcome:h.outcome}))}]))};
writeFileSync(`${out}/review-selection.json`,JSON.stringify(selection,null,2)+'\n');writeFileSync(`${out}/review-lives.json`,JSON.stringify(lives,null,2)+'\n');
const text=['# M5 三局完整人生日志','',selection.method,''];
for(const [key,s]of Object.entries(lives)){
 const b=biography(s);text.push(`## ${key}：${s.id} · ${s.name}`,'',`出生：${s.province}${s.place}，${s.hukou}，Q${s.wealthQ}；富豪线：${s.eliteFamily?'是':'否'}。`,`终局：${s.age}岁；净资产${Math.round(netAssets(s))}元。`,`称号：${b.title.name}`,b.sentence,'','以下为实际引擎日志，按原顺序完整导出：','');
 for(const e of s.log)text.push(`- ${e.age}岁：${e.text}${e.dice?.length?'〔骰子：'+e.dice.map(d=>`${d.id} p=${d.p.toFixed(6)} u=${d.u.toFixed(6)} ${d.pass?'命中':'未命中'}`).join('；')+'〕':''}`);
 text.push('');
}
writeFileSync(`${out}/review-lives.md`,text.join('\n')+'\n');console.log(JSON.stringify(selection,null,2));
