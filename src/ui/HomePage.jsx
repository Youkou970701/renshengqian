import React, {useEffect, useState} from 'react';
import {DATA, PROVINCES, BIRTH_TOTAL, provinceInfo} from '../engine/stats.js';
import {drawBirth} from '../engine/birth.js';
import {hashSeed} from '../engine/rng.js';
import './home.css';

// These are a presentation clock and decorative births, independent of life RNG.
const pageOpenedAt=Date.now();
const YEAR_SECONDS=366*24*60*60; // The baseline is the leap year 2024.
const number=n=>Math.max(0,Math.floor(n)).toLocaleString('zh-CN');
const provinceRows=PROVINCES.map(province=>({province,share:provinceInfo(province).birthShare,status:DATA.births.by_province_2024[province].status})).sort((a,b)=>b.share-a.share);
const maxShare=provinceRows[0].share;
const statusNote=status=>status==='待核'?'（初步数据）':status==='估算'?'（推算）':'';
function simulatedBirth(index){
 const life=drawBirth(hashSeed(((pageOpenedAt%4294967296)+Math.imul(index+1,2654435761))>>>0));
 return {id:index,text:`有人出生在${life.province}${life.place}${life.hukou==='rural'?'的一个村子':'的一处城镇'}`};
}

/** Controlled preferences; archived lives and storage remain owned by App. */
export default function HomePage({
 state={},life=null,pastLives=[],abandonedCount=0,dailyPreview='',
 onStart,onFeature,onPreferenceChange,onSources,onResume,onReviewLife,onReplay,
}){
 const [elapsed,setElapsed]=useState(()=>Math.max(0,(Date.now()-pageOpenedAt)/1000));
 const [births,setBirths]=useState(()=>[2,1,0].map(simulatedBirth));
 const [feedPaused,setFeedPaused]=useState(false);
 const [idInput,setIdInput]=useState('');
 useEffect(()=>{const timer=setInterval(()=>setElapsed(Math.max(0,(Date.now()-pageOpenedAt)/1000)),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(feedPaused)return;const timer=setInterval(()=>setBirths(rows=>[simulatedBirth(rows[0].id+1),...rows].slice(0,3)),6500);return()=>clearInterval(timer);},[feedPaused]);
 const preview=typeof dailyPreview==='string'?dailyPreview:dailyPreview?.text??'';
 const archive=pastLives.slice(0,12);
 const abandoned=Number.isFinite(abandonedCount)?Math.max(0,Math.floor(abandonedCount)):0;
 return <section className="home-v2" aria-label="人生签首页">
  <div className="hv-hero">
   <div className="hv-intro"><p className="eyebrow">中国版 / 每一种起点都有故事</p><h1>如果人生<br/>重新抽签。</h1><p className="hv-hook">出生是一张签。<br/>你能把它改写多少？</p><button className="primary hv-start" onClick={()=>onStart?.('normal')}>出生 <span>→</span></button><p className="hv-abandoned">你放弃过 <b>{number(abandoned)}</b> 个身份 · 仅记录在本机</p>{life&&<button className="hv-resume" onClick={onResume}>继续存档 · {life.name} · {life.age} 岁 <span aria-hidden="true">→</span><small>{life.id}</small></button>}</div>
   <aside className="hv-clock" aria-labelledby="hv-clock-title"><div className="hv-section-label"><p className="eyebrow" id="hv-clock-title">此刻 / 按统计模拟</p><span className="hv-live-dot" aria-hidden="true"/></div><p>从你打开页面到现在，<br/>全国大约又有</p><div className="hv-count"><strong>{number(elapsed*DATA.births.national_2024.value*10000/YEAR_SECONDS)}</strong><span>个婴儿出生</span></div><div className="hv-count hv-count-death"><strong>{number(elapsed*DATA.births.deaths_2024.value*10000/YEAR_SECONDS)}</strong><span>个人离世</span></div><small>按 2024 年全年人数匀速折算，并非实时人口记录。出生 {DATA.births.national_2024.value} 万人{statusNote(DATA.births.national_2024.status)}；死亡 {DATA.births.deaths_2024.value} 万人{statusNote(DATA.births.deaths_2024.status)}。</small>{onSources&&<button className="hv-text-button" onClick={onSources}>查看统计出处 ↗</button>}</aside>
  </div>
  <div className="hv-feed"><div><b>刚刚出生</b><span>按统计模拟</span></div><ol aria-label="按出生分布模拟的出生动态" aria-live="off">{births.map((row,index)=><li key={row.id}><span>{index===0?'刚刚':'片刻前'}</span>{row.text}</li>)}</ol><button className="hv-text-button" aria-pressed={feedPaused} onClick={()=>setFeedPaused(value=>!value)}>{feedPaused?'继续滚动':'暂停滚动'}</button></div>
  <section className="hv-distribution" aria-labelledby="hv-distribution-title"><div className="hv-section-heading"><div><p className="eyebrow">01 / 起点的分布</p><h2 id="hv-distribution-title">如果你是此刻出生的婴儿。</h2></div><p>出生在哪，按出生人数来抽签。<br/>每 10 个婴儿，约 {Math.round(DATA.births.rural_share_of_births.value*10)} 个出生在农村。<small>农村占比由统计推算；出身由模型模拟。</small></p></div><figure className="hv-chart"><figcaption>31 省出生占比 · 2024 年数据归一化</figcaption><ol className="hv-bars">{provinceRows.map(({province,share,status})=><li key={province}><span className="hv-province">{province}</span><span className="hv-bar-track" aria-hidden="true"><i style={{width:`${share/maxShare*100}%`}}/></span><span className="hv-share">{(share*100).toFixed(2)}%<span className="hv-sr-only">{statusNote(status)}</span></span></li>)}</ol><p className="hv-chart-note">各省数值合计 {BIRTH_TOTAL.toFixed(1)} 万人，与全国总数口径有差异，本图只用于相对出生权重。部分省份由公开资料推算，各省出生占比不等于人口占比。</p><details><summary>查看各省数字与说明</summary><p>各省出生人数来自公开统计及人口资料推算，完整出处、数据状态与计算说明见「统计出处」。</p><p>{provinceRows.map(row=>`${row.province} ${DATA.births.by_province_2024[row.province].value} 万人${statusNote(row.status)}`).join('；')}。</p></details></figure></section>
  <section className="hv-entries" aria-label="更多玩法"><button onClick={()=>onStart?.('watch')}><span>有人生路口，也可以先看一看</span><h3>我只想看 <i aria-hidden="true">↗</i></h3><p>10 秒自动抉择，可随时接手</p></button><button onClick={()=>onFeature?.('每日一签')}><span>今天 / 全国同一个出生编号</span><h3>每日一签 <i aria-hidden="true">↗</i></h3><p>{preview||'从同一处出发，看看不同的选择。'}</p></button><button onClick={()=>onStart?.('speed')}><span>快进 / 只看人生关键节点</span><h3>极速一局 <i aria-hidden="true">↗</i></h3><p>一分钟，走完另一种人生</p></button><button onClick={()=>onFeature?.('人生图鉴')}><span>收集 / 每一种人生都算数</span><h3>人生图鉴 <i aria-hidden="true">↗</i></h3><p>走过的地方与拿到的人生印记</p></button></section>
  <section className="hv-past" aria-labelledby="hv-past-title"><div className="hv-section-heading"><div><p className="eyebrow">02 / 留在这台设备上的记忆</p><h2 id="hv-past-title">你的前世</h2></div><small>仅保存在本机 · {pastLives.length} 段人生</small></div>{archive.length?<div className="hv-past-cards">{archive.map((row,index)=><button key={row.key??row.id??index} onClick={()=>onReviewLife?.(row)} disabled={!onReviewLife}><span>{row.province} · {row.age} 岁</span><h3>{row.name}</h3><p>{row.titleName??(typeof row.title==='object'?row.title.name:'走过这一生的人')}</p><small>重看这一生 →</small></button>)}</div>:<div className="hv-empty"><span aria-hidden="true">—</span><p>第一段人生，还在前面。<small>走完一生后，名字、称号和年岁会留在这里。</small></p></div>}</section>
  <section className="hv-how" aria-label="怎么玩"><article><span>一</span><h3>同一秒，人生不同</h3><p>按真实统计与推算抽取出身。你会遇见同时出生、起点不同的几个人，看看往后的人生如何展开。</p></article><article><span>二</span><h3>选方向，掷命运骰子</h3><p>读什么书、做什么工作、和谁生活，由你选择。努力会改变机会，重要关口仍有一颗命运骰子。</p></article><article><span>三</span><h3>数据之外，也是故事</h3><p>有出处的数字会附上统计脚注；找不到统计的地方会说明数字由推算或模拟得出。模拟中的一个人，不代表所有人的人生。</p>{onSources&&<button className="hv-text-button" onClick={onSources}>数据从哪里来 ↗</button>}</article></section>
  <section className="hv-settings" aria-label="开局设置"><div><p className="eyebrow">出发前 / 你的观看方式</p><h2>这一生，慢慢来。</h2><label className="hv-heavy"><input type="checkbox" aria-label="略过沉重情节" checked={state.skipHeavy===true} onChange={event=>onPreferenceChange?.('skipHeavy',event.target.checked)}/><span>略过沉重情节<small>避开犯罪、毒品、赌博、家庭暴力、自杀与重病类剧本。</small></span></label><small>适合 15 岁以上体验。故事含有疾病、失去与生活困境。</small></div><div className="hv-options"><label>家族目标（可不选）<select value={state.familyGoal??'free'} onChange={event=>onPreferenceChange?.('familyGoal',event.target.value)}><option value="free">回到原点 · 自由玩</option><option value="city">走出村子 · 城市户口出生</option><option value="bachelor">第一个大学生 · 读到本科</option><option value="all-bachelor">三代本科</option></select></label><label>一局时长（近似）<select value={state.duration??30} onChange={event=>onPreferenceChange?.('duration',Number(event.target.value))}>{[15,30,60].map(n=><option key={n} value={n}>{n} 分钟</option>)}</select><small>1× 观看时间；不含暂停、手动抉择和骰子停留。</small></label><label>你出生在哪个省（仅本机对照）<select value={state.ownProvince??''} onChange={event=>onPreferenceChange?.('ownProvince',event.target.value)}><option value="">暂不选择</option>{PROVINCES.map(province=><option key={province}>{province}</option>)}</select></label><form onSubmit={event=>{event.preventDefault();onReplay?.(idInput.trim());}}><label>输入出生编号<input value={idInput} onChange={event=>setIdInput(event.target.value)} placeholder="豫-2026-483920" required maxLength={40}/></label><button className="outline" type="submit">复现这一生 →</button></form><small>同一编号与同一选择序列会复现相同日志。开始新人生将替换当前存档。</small></div></section>
 </section>;
}
