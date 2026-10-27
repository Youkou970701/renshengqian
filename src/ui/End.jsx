import React from 'react';
import {summary} from '../engine/summary.js';
import {pensionComparisonText} from '../engine/pension.js';
import {netAssets} from '../engine/money.js';
import {terminalText} from '../content/presentation.js';
import ShareImage from './ShareImage.jsx';
import {label,money} from './format.js';
export default function End({life,onNew,badge=''}) {
 const end=summary(life), n=end.bachelorPer100??0,educated=['bachelor','211','985','master'].includes(life.edu),me=educated?Math.max(0,n-1):99,near=life.log.flatMap(e=>(e.dice??[]).filter(d=>d.nearMiss).map(d=>({...d,age:e.age}))).sort((a,b)=>a.gap-b.gap)[0];
 return <section className="end-page"><div className="end-data"><p className="eyebrow">这一生的终局 {badge}</p><h2><strong>{n}</strong><span>/ 100 人</span></h2><p>同省同年出生的人里，<br/>约有这么多人读了本科。</p><div className="hundred-grid" aria-label={`${n}人读本科，你是橙红色那一格`}>{Array.from({length:100},(_,i)=><i key={i} className={i===me?'you':i<n?'filled':''}/>)}</div><small>橙红色是你。数字来自模型的出生队列参考样本，本省 {end.referenceSample??0} 局，不是个人录取概率。</small><h3>{educated?'你也走进了本科课堂。':'你走了另一条路。'}</h3><p>{life.name} · {life.age} 岁 · {label(end.education)}<br/>{life.lastJob??life.job}</p><p className="serial">{life.id}</p></div><div className="end-details"><p>{terminalText(life)}</p><p className="pension-comparison">{pensionComparisonText(life)}</p><dl className="summary-grid"><dt>年收入</dt><dd>{money(life.income)}</dd><dt>净资产</dt><dd>{money(netAssets(life))}</dd><dt>同省同年峰值收入分位</dt><dd>{end.incomePercentile} / 100</dd></dl>{near&&<div className="near-summary"><p className="eyebrow">这一生最接近的一次</p><strong>{near.age} 岁 · {near.label}，只差 {(near.gap*100).toFixed(1)}%</strong></div>}<h3>每一格，都是一年</h3><div className="life-grid">{life.history.map((h,i)=><span tabIndex="0" key={i} title={`${h.age} 岁：幸福 ${Math.round(h.happy)}`} aria-label={`${h.age}岁，幸福${Math.round(h.happy)}`} style={{background:`hsl(151 23% ${35+Math.max(0,Math.min(100,h.happy))*.5}%)`}}>{h.age}</span>)}</div><ShareImage life={life} kind="end" badge={badge}/><button className="primary again" onClick={onNew}>再投一次 <span>→</span></button></div></section>;
}
