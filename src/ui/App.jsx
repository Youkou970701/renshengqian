import React, { useEffect, useReducer, useState, useRef, useMemo, lazy, Suspense } from 'react';
import {createPortal} from 'react-dom';
import {normalPacing,importantTransition} from './pacing.js';
import {migrateLife} from '../engine/migrate.js';
import {focusOptions} from '../engine/focus.js';
import {moneyOptions,financialReason,flexibleAmount,netAssets} from '../engine/money.js';
import {jobEligible} from '../engine/work.js';
import {JOBS,JOB_BY_ID} from '../content/jobs.js';
import {viewingPreferences} from './preferences.js';
import { createBirth, drawBirth } from '../engine/birth.js';
import { step } from '../engine/life.js';
import { autoChoose } from '../engine/decisions.js';
import {withoutHeavyPending} from '../engine/cards.js';
import {employmentLabel} from '../engine/employment.js';
import {orderedLifeLog} from './life-log.js';
import {ColorAxes} from './ColorAxes.jsx';
import HomePage from './HomePage.jsx';
import {loadPastLives,loadAbandonedBirths,recordAbandonedBirth} from './past-lives-storage.js';
import { PROVINCES, provinceInfo } from '../engine/stats.js';
import { visibleFootnote } from '../content/footnotes.js';
import { birthText, familyText } from '../content/presentation.js';

import ShareImage from './ShareImage.jsx';
import {buildSpeedTimeline} from './speed.js';
import {canRelay,familyGeneration,familyGoalStatus,settlement} from '../engine/family.js';
import {getShanghaiDate,dailyPreview,beginDaily,completeDaily,dailyBadge} from './daily.js';
import {emptyCollection,loadCollection,saveCollection,recordBirth} from './collection-storage.js';
const CollectionPage=lazy(()=>import('./CollectionPage.jsx'));
const Sources=lazy(()=>import('./Sources.jsx'));
const End=lazy(()=>import('./End.jsx'));
const EndingStory=lazy(()=>import('./EndingStory.jsx'));
import {label,money} from './format.js';
import {SAVE_KEY,SCHEMA_VERSION,validLife,restorePeers,advancePeer,serializeSave,hydrateSave,checkpointChanged} from './save.js';

const lifeKey=life=>life?.pending?`${life.id}:${life.age}:${life.pending.id}`:'';
function initial() {
 let saved, damaged=false;
 try { const raw=localStorage.getItem(SAVE_KEY); if(raw) saved=hydrateSave(JSON.parse(raw)); } catch { damaged=true; }
 const peers=[2,SCHEMA_VERSION].includes(saved?.schemaVersion)?restorePeers(saved.peers):null;
 const valid=Boolean(validLife(saved?.life)&&peers);
 if(saved?.life && !valid) damaged=true;
 const base={ schemaVersion:SCHEMA_VERSION,saveRevision:0,skipHeavy:saved?.skipHeavy===true, screen:'home', daily:null,familyRows:[],familyGoal:['city','bachelor','all-bachelor','free'].includes(saved?.familyGoal)?saved.familyGoal:'free',birthOrigin:null, mode:saved?.mode==='speed'?'speed':'normal', life:null, peers:[], reveal:null, revealQueue:[],speedFrameIndex:0, ...viewingPreferences(saved),pacingElapsedMs:Math.max(0,Number.isFinite(saved?.pacingElapsedMs)?saved.pacingElapsedMs:0),pacingImportantAge:saved?.pacingImportantAge??null,
  ownProvince:PROVINCES.includes(saved?.ownProvince)?saved.ownProvince:'', focus:['study','work','family','health','hobby'].includes(saved?.focus)?saved.focus:'auto',
  speed:[1,2,4].includes(saved?.speed)?saved.speed:1, paused:typeof saved?.paused==='boolean'?saved.paused:false,
  error:damaged?'旧版或损坏的存档已忽略，请重新开始。':'' };
 if(valid) Object.assign(base,{daily:saved.daily&&typeof saved.daily.date==='string'&&Number.isInteger(saved.daily.attempt)?saved.daily:null,familyRows:Array.isArray(saved.familyRows)?saved.familyRows.filter(validLife):[],birthOrigin:validLife(saved.birthOrigin)?saved.birthOrigin:null,life:saved.life,peers,reveal:saved.reveal?.dice?.length?saved.reveal:null,revealQueue:Array.isArray(saved.revealQueue)?saved.revealQueue:[],displayLogs:Array.isArray(saved.displayLogs)?saved.displayLogs:undefined,speedFrameIndex:Number.isInteger(saved.speedFrameIndex)?saved.speedFrameIndex:0,screen:['home','birth','play','end'].includes(saved.screen)?saved.screen:(saved.life.alive?'play':'end')});
 if(base.life){base.life=migrateLife(base.life);base.birthOrigin=migrateLife(base.birthOrigin);base.peers=base.peers.map(migrateLife);base.familyRows=base.familyRows.map(migrateLife);}
 if(base.life && !base.life.alive && base.screen==='play') base.screen='end';
 const id=new URLSearchParams(location.search).get('id');
 if(id && !(valid && saved.life.id===id)) {try {return {...base,...newLife(createBirth(id))};} catch {return {...base,error:'出生编号无效，请检查省份简称、年份和六位数字。'};}}
 return base;
}
function newLife(life) { return {life,birthOrigin:life, peers:[1,2,3,4].map(i=>drawBirth((life.seed + Math.imul(i,2654435761)) >>> 0,life.year)), screen:'birth', paused:false, pacingElapsedMs:0,pacingImportantAge:null,error:''}; }
function advance(state, choice, elapsedMs=0) {
 if (state.reveal || !state.life?.alive) return state;
 const before = state.life;
 const life = step(before,{...(state.focus==='auto'?{}:{focus:state.focus}), ...(choice ? {choice} : {})}).state;
 const revealed=life.log.slice(before.log.length).filter(e=>e.dice?.length);
 return {...state, life,pacingElapsedMs:(state.pacingElapsedMs??0)+elapsedMs,pacingImportantAge:importantTransition(before,life)?life.age:state.pacingImportantAge, peers:state.peers.map(p=>advancePeer(p,life.age)), screen:life.alive?'play':'end',reveal:revealed[0]??null,revealQueue:revealed.slice(1)};
}
function reduceState(state, action) {
 switch(action.type) {
 case 'set': return {...state, [action.key]:action.value,...(action.key==='skipHeavy'&&state.life?{life:withoutHeavyPending({...state.life,skipHeavy:action.value})}:{})};
 case 'engine-action': {try{const result=step(state.life,action.input??{action:action.action}),dice=result.events.filter(e=>e.dice?.length);return {...state,life:result.state,actionError:'',reveal:dice[0]??state.reveal,revealQueue:dice.slice(1)};}catch(error){return {...state,actionError:error.message};}}
 case 'new': return {...state, ...newLife(action.life),mode:action.mode??'normal',automatic:action.watch===true,reveal:null,revealQueue:[],speedFrameIndex:0,daily:action.daily??null,familyRows:action.familyRows??[]};
 case 'frame': return {...state,speedFrameIndex:action.index,life:action.frame.life,peers:state.peers.map(p=>advancePeer(p,action.frame.life.age)),displayLogs:action.frame.displayLogs,screen:action.frame.life.alive?'play':'end',reveal:action.frame.events.find(e=>e.dice?.length)??null};
 case 'dismiss': return {...state,reveal:state.revealQueue?.[0]??null,revealQueue:state.revealQueue?.slice(1)??[]};
 case 'start': return {...state,screen:'play'};
 case 'advance': return advance(state,action.choice,action.elapsedMs);
 case 'jump': { let next=state, guard=0; while(next.life.alive && !next.life.pending && !next.reveal && guard++<111) next=advance(next); return next; }
 default:return state;
 }
}
function reducer(state,action) {
 const next=reduceState(state,action);
 return checkpointChanged(state,next,action)?{...next,saveRevision:(state.saveRevision??0)+1}:next;
}
function Comparison({province,ownProvince}) {
 const a=provinceInfo(province), b=ownProvince?provinceInfo(ownProvince):null;
 const rows=[['预期寿命','lifeExpectancy',v=>`${v} 岁`],['高考报名者本科录取率','bachelorRate',v=>`${(v*100).toFixed(1)}%`],['城镇化参考比例','urbanShare',v=>`${(v*100).toFixed(1)}%`]];
 return <details className="comparison"><summary>{b?'与你的省份对照':'查看出生地的数字'}</summary><table><thead><tr><th>指标</th><th>{province}</th>{b && <th>{ownProvince}</th>}</tr></thead><tbody>{rows.map(([name,key,f])=><tr key={key}><th>{name}</th><td>{f(a[key])}</td>{b && <td>{f(b[key])}</td>}</tr>)}</tbody></table><small>省级数字用于群体参考；本科率分母是高考报名者。</small></details>;
}
export function Birth({life,ownProvince,onStart,onReroll,rerollReason='',badge=''}) {
 return <section className="birth-page"><div className="ticket"><div className="ticket-top"><span>{badge||'人生签 · 即将出发'}</span><span>出生登记卡</span></div><p className="ticket-serial">车次 {life.id}</p><h2 className="ticket-route">{life.province}<span>━━━</span>人生</h2><p className="ticket-place">始发站 · {life.place} · {life.hukou==='urban'?'城镇':'乡村'}</p><div className="ticket-name">{life.name}<span>{label(life.sex)} · 兄弟姐妹 {life.siblings} 人</span></div><p className="ticket-stamp">准予出发</p><dl className="ticket-fields"><dt>家庭条件</dt><dd>{['','收入紧张','收入不宽裕','生活稳定','有一些积蓄','积蓄充足'][life.wealthQ]}</dd><dt>照护</dt><dd>{life.leftBehind?'父母一方或双方在外务工':'与父母一起生活'}</dd><dt>父亲</dt><dd>{life.parents.father.name} · {life.parents.father.job}</dd><dt>母亲</dt><dd>{life.parents.mother.name} · {life.parents.mother.job}</dd></dl><p className="ticket-story">{familyText(life)}</p><p className="ticket-footer">这一生，准备出发。<br/>人生签 · {life.id}</p><button className="primary" onClick={onStart}>开始这一生 <span>→</span></button>{onReroll?<button className="reroll" onClick={onReroll}>重新抽签 ↻</button>:rerollReason&&<small className="reroll-reason">{rerollReason}</small>}</div><div className="birth-aside"><p className="eyebrow">你无法选择起点</p><h2>接下来，<br/>你会怎么过？</h2><p>{birthText(life)}</p><Comparison province={life.province} ownProvince={ownProvince}/><ShareImage life={life} kind="birth" badge={badge}/></div></section>;
}
const LogEntry=React.memo(function LogEntry({event:e}) {
 const citation=visibleFootnote(e);
 return <li><b>{e.age}<span>岁</span></b><div>{e.text}{citation&&<small>{citation}</small>}</div></li>;
});
export function LifeLog({life,hiddenEvent,events}) {
 const [earlier,setEarlier]=useState({id:life.id,count:0});
 const extra=earlier.id===life.id?earlier.count:0;
 const logs=useMemo(()=>orderedLifeLog((events??life.log).map((event,index)=>({event,index})).filter(({event:e})=>!hiddenEvent||!(e.age===hiddenEvent.age&&e.node===hiddenEvent.node&&e.draw===hiddenEvent.draw&&e.text===hiddenEvent.text)).map(row=>({...row,age:row.event.age}))),[events,life.log,hiddenEvent]);
 const shown=logs.slice(0,30+extra);
 return <section className="log-section"><div className="section-head"><h3>人生纪录</h3><span>{logs.length} 条</span></div><ol className="life-log">{shown.map(({event,index})=><LogEntry key={`${life.id}:${index}`} event={event}/>)}</ol>{logs.length>shown.length&&<button onClick={()=>setEarlier({id:life.id,count:extra+30})}>查看更早（还有 {logs.length-shown.length} 条）</button>}</section>;
}
export function Peers({peers}) { return <section className="peer-section"><h3>与你同秒出生</h3><div className="peers">{peers.map(p=><article key={p.id}><b>{p.name}</b><span>{p.province} · {p.hukou==='urban'?'城镇':'乡村'}</span><span>{p.age} 岁 · {label(p.edu)}</span><span>{p.alive?p.job:'已终局'}</span></article>)}</div><small>四条人生随你同步向前。</small></section>; }
export function MoneyMenu({life,onAction,disabled=false,error=''}){
 const [actionId,setActionId]=useState('tutoring'),[amount,setAmount]=useState(3000),[jobId,setJobId]=useState('freelancer'),[fullCash,setFullCash]=useState(false);
 if(life.age<6||!life.alive)return null;
 const options=moneyOptions(life),selected=options.find(o=>o.id===actionId)??options[0],flexible=flexibleAmount(actionId),input={action:actionId,...(selected.city?{fullCash}:{}),...(flexible?{amount:Number(amount)}:{})},reason=financialReason(life,input);
 return <details className="money-menu"><summary>花钱与行动</summary><p>{life.age<18?'教育费用由家里承担，能安排多少取决于家庭条件。':'行动会记入这一生，花掉的钱需要重新积累。'}</p><label>想做什么<select aria-label="花钱行动" value={actionId} onChange={e=>{setActionId(e.target.value);const item=options.find(o=>o.id===e.target.value);setAmount(item?.cost|| (e.target.value==='business-loan'?50000:e.target.value==='online-loan'?10000:1000));}}>{[...new Set(options.map(o=>o.category))].map(group=><optgroup label={group} key={group}>{options.filter(o=>o.category===group&&life.age>=o.minAge).map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</optgroup>)}</select></label><p>{selected.hint}</p>{selected.city&&<label><input type="checkbox" checked={fullCash} onChange={e=>setFullCash(e.target.checked)}/>全款购买（按房价一次支付）</label>}{flexible&&<label>金额（元）<input aria-label="行动金额" type="number" min="1" max="10000000" value={amount} onChange={e=>setAmount(e.target.value)}/></label>}<button disabled={disabled||Boolean(reason)} onClick={()=>onAction?.(input)}>安排这件事</button>{reason&&<small>{reason}</small>}{life.age>=18&&<><label>想找的职业<select aria-label="想找的职业" value={jobId} onChange={e=>setJobId(e.target.value)}>{JOBS.map(j=><option key={j.id} value={j.id} disabled={!jobEligible(life,j)}>{j.name}{j.publicOnly?'（通过招录进入）':''}</option>)}</select></label><small>换工作需要求职时间，等待期间没有工资；具体资格取决于学历、专业和经验。</small><button disabled={disabled||!!life.employmentSearch||!jobEligible(life,JOB_BY_ID[jobId])} onClick={()=>onAction?.({action:'apply-job',jobId})}>开始找这份工作</button></>}{life.money?.mortgage?.balance>0&&<p>房贷本金 {money(life.money.mortgage.balance)}<br/>月供 {money(life.money.mortgage.monthly)}</p>}{life.business&&<p>{life.business.name} · {life.business.active?'经营中':'已结束'} · 雇员{life.business.employees}人</p>}{error&&<p role="alert">{error}</p>}</details>;
}
export function PartnerProfile({profile:p}){if(!p)return null;return <section className="partner-profile" aria-label="对方资料"><h3>{p.name} · {p.age}岁</h3><dl><dt>籍贯与学历</dt><dd>{p.province} · {p.education}</dd><dt>职业与收入</dt><dd>{p.job} · 年收入{money(p.income)}</dd><dt>积蓄与房车</dt><dd>存款{money(p.assets)} · {p.ownsHouse?'有房':'暂无房'} · {p.ownsCar?'有车':'暂无车'}</dd><dt>性格</dt><dd>{p.personality}</dd><dt>家里的人</dt><dd>父亲{p.family?.fatherJob}、母亲{p.family?.motherJob}；兄弟姐妹{p.family?.siblings??0}人</dd><dt>婚礼的打算</dt><dd>彩礼意向{money(p.brideGift)}，嫁妆意向{money(p.dowry)}；可协商</dd></dl></section>;}
export function Decision({life,automatic,paused,stopped,countdown,onChoose,mobile=false,onInteract,cardRef}) { return <section ref={cardRef} tabIndex={-1} role="dialog" aria-modal={mobile?'true':'false'} aria-labelledby="decision-title" className="decision" onPointerDownCapture={onInteract} onTouchStartCapture={onInteract} onScrollCapture={onInteract}><p className="eyebrow">{life.age} 岁 · 人生路口</p><h2 id="decision-title">{life.pending.title}</h2>{life.pending.body&&<p className="decision-body">{life.pending.body}</p>}<PartnerProfile profile={life.pending.profile}/><p className="decision-time" role="status">{stopped?'已停止自动选择，请自己选':automatic?(paused?'已暂停倒计时':`${countdown} 秒后自动抉择`):'请选择。未决期间年龄不会推进。'}</p><div className="decision-options">{life.pending.options.map(o=><button key={o.id} disabled={o.disabled} onClick={()=>onChoose?.(o.id)}>{o.label}<small>{o.effect??''}</small></button>)}</div></section>; }
function TimedDecision({life,automatic,paused,onChoose}) {
 const [countdown,setCountdown]=useState(10),[stopped,setStopped]=useState(false),[hidden,setHidden]=useState(document.hidden),[mobile,setMobile]=useState(()=>matchMedia('(max-width: 767px)').matches);
 const choose=useRef(onChoose),card=useRef(null),interacted=useRef(false);choose.current=onChoose;
 const stop=()=>{if(!automatic)return;interacted.current=true;setStopped(true);};
 useEffect(()=>{const media=matchMedia('(max-width: 767px)'),change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{const change=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change);},[]);
 useEffect(()=>{if(!mobile)return;
  const body=document.body,html=document.documentElement,shell=document.querySelector('.app-shell'),previous=document.activeElement,y=window.scrollY;
  const old={overflow:body.style.overflow,position:body.style.position,top:body.style.top,width:body.style.width,htmlOverflow:html.style.overflow,inert:shell?.inert};
  body.style.overflow='hidden';body.style.position='fixed';body.style.top=`-${y}px`;body.style.width='100%';html.style.overflow='hidden';if(shell)shell.inert=true;
  card.current?.focus({preventScroll:true});
  const trap=e=>{if(e.key!=='Tab')return;const buttons=[...card.current.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===card.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
  document.addEventListener('keydown',trap);
  return()=>{document.removeEventListener('keydown',trap);Object.assign(body.style,{overflow:old.overflow,position:old.position,top:old.top,width:old.width});html.style.overflow=old.htmlOverflow;if(shell)shell.inert=old.inert;window.scrollTo(0,y);if(previous?.isConnected)previous.focus({preventScroll:true});};
 },[mobile]);
 useEffect(()=>{if(!automatic||paused||hidden||stopped)return;
  const timer=setInterval(()=>{if(interacted.current||document.hidden)return;setCountdown(n=>Math.max(0,n-1));},1000);return()=>clearInterval(timer);
 },[automatic,paused,hidden,stopped]);
 useEffect(()=>{if(countdown===0&&automatic&&!paused&&!hidden&&!stopped&&!interacted.current){interacted.current=true;choose.current(autoChoose(life));}},[countdown,automatic,paused,hidden,stopped,life]);
 const decision=<Decision life={life} automatic={automatic} paused={paused||hidden} stopped={stopped} countdown={countdown} onChoose={onChoose} mobile={mobile} onInteract={stop} cardRef={card}/>;
 return mobile?createPortal(<div className="decision-backdrop" data-testid="decision-backdrop">{decision}</div>,document.body):decision;
}
export function DiceReveal({event,fast=false,onClose}) {
 const [rolled,setRolled]=useState(false),[index,setIndex]=useState(0);const dice=event.dice[index]??event.dice[0];
 useEffect(()=>{setRolled(false);const t=setTimeout(()=>setRolled(true),fast?400:1200);return()=>clearTimeout(t);},[event,index,fast]);
 useEffect(()=>{if(!fast||!rolled)return;const t=setTimeout(()=>{if(index+1<event.dice.length)setIndex(index+1);else onClose();},200);return()=>clearTimeout(t);},[rolled,fast,index,event,onClose]);
 return <section className={`dice-modal ${dice.positive===false?'risk-dice':''}`} role="dialog" aria-label="命运骰子"><p className="eyebrow">{event.age} 岁 · 命运骰子</p><h2>{dice.label}<strong>{(dice.p*100).toFixed(1)}<span>%</span></strong></h2><p className="dice-factors">{dice.factors.map(f=><span key={f.key}>{f.label} {f.pp>=0?'+':'−'}{Math.abs(f.pp).toFixed(1)}%</span>)}</p><div className={`dice-track ${rolled?'settled':'rolling'}`} style={{'--p':`${dice.p*100}%`,'--u':`${dice.u*100}%`,'--roll-duration':fast?'0.4s':'1.2s'}}><div className="dice-pass-zone"/><i className="dice-pointer"/><span className="dice-threshold"/></div><div className="track-labels"><span>0%</span><span>{dice.positive===false?'风险线':'通过线'} {(dice.p*100).toFixed(1)}%</span><span>100%</span></div>{rolled?<><p className="dice-result">{dice.pass?dice.successLabel:dice.failureLabel}<span>抽样 {(dice.u*100).toFixed(1)}%</span></p>{dice.nearMiss&&<p className="near-miss">只差 {(dice.gap*100).toFixed(1)}%</p>}{dice.closePass&&<p className="near-miss">险过</p>}<p className="verdict">{event.text}</p>{visibleFootnote(event)&&<small>{visibleFootnote(event)}</small>}<button className="primary" onClick={()=>index+1<event.dice.length?setIndex(index+1):onClose()}>{index+1<event.dice.length?'看看下一次裁决':'继续这一生'} →</button></>:<p className="rolling-copy">结果正在揭晓…</p>}<small className="dice-note">各项影响为单项移除前后的概率差，不可直接相加。抽样值低于本次概率时，该事件发生。</small></section>;
}
export default function App({launch}={}) {
 const [state,dispatch]=useReducer(reducer,undefined,()=>({...initial(),...launch?.preferences})),[sourceOpen,setSourceOpen]=useState(false),[saveError,setSaveError]=useState(''),[feature,setFeature]=useState(''),[collection,setCollection]=useState(()=>{try{return loadCollection();}catch{return emptyCollection();}}),[newUnlocks,setNewUnlocks]=useState([]),[toast,setToast]=useState('');
 const [pastLives,setPastLives]=useState(()=>loadPastLives()),[abandoned,setAbandoned]=useState(()=>loadAbandonedBirths()),[review,setReview]=useState(null);
 const {life}=state;const familyRows=life&&!life.alive?[...state.familyRows.filter(row=>row.id!==life.id),life]:state.familyRows;const set=(key,value)=>dispatch({type:'set',key,value});const plan=useRef(null),frameIndex=useRef(0);
 useEffect(()=>{if(!life||life.alive)return;
 let active=true;import('./past-lives.js').then(({savePastLife})=>{if(active)setPastLives(savePastLife(life));}).catch(()=>{if(active)setSaveError('前世暂时无法保存在本机，请保留本局图片。');});return()=>{active=false;};
 },[life?.id,life?.alive]);
 useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),6000);return()=>clearTimeout(timer);},[toast]);
 useEffect(()=>{try{saveCollection(collection);}catch{setSaveError('图鉴暂时无法保存在本机，请导出备份。');}},[collection]);
 useEffect(()=>{
  if(!life||state.screen==='birth'||(state.screen==='home'&&life.age===0))return;
  if(life.alive){setCollection(previous=>recordBirth(previous,life));return;}
  let active=true;
  import('./collection.js').then(({recordLife})=>{
   if(!active)return;
   setCollection(previous=>{const result=recordLife(previous,life);if(result.unlocked.length){setNewUnlocks(result.unlocked);setToast(`解锁 ${result.unlocked.length} 个人生印记 · ${result.unlocked[0].name}`);}return result.collection;});
   if(state.daily)completeDaily(localStorage,state.daily,life);
  }).catch(()=>{if(active)setSaveError('图鉴或今日签记录暂时无法保存，请保留本局图片。');});
  return()=>{active=false;};
 },[life?.id,life?.alive,state.screen]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t);},[toast]);
 const latestState=useRef(state);latestState.current=state;
 const persistedRevision=useRef(state.saveRevision);
 const save=()=>{try{localStorage.setItem(SAVE_KEY,serializeSave(latestState.current));setSaveError('');}catch{setSaveError('本机存档失败，可能是浏览器存储空间不足。');}};
 useEffect(()=>{if(persistedRevision.current===state.saveRevision)return;persistedRevision.current=state.saveRevision;save();},[state.saveRevision]);
 useEffect(()=>{
  const hide=()=>{if(document.visibilityState==='hidden')save();};
  const leave=()=>save();
  document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);
  return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);};
 },[]);
 const pacing=useMemo(()=>life?.alive&&state.mode!=='speed'?normalPacing(life,{duration:state.duration,elapsedMs:state.pacingElapsedMs,focus:state.focus,important:state.pacingImportantAge===life.age}):null,[life,state.mode,state.duration,state.pacingElapsedMs,state.focus,state.pacingImportantAge]);
 useEffect(()=>{if(state.screen!=='play'||state.paused||!life?.alive||life.pending||state.reveal||state.mode==='speed')return;const t=setTimeout(()=>dispatch({type:'advance',elapsedMs:pacing.delayMs}),pacing.delayMs/state.speed);return()=>clearTimeout(t);},[state,pacing]);
 useEffect(()=>{if(state.mode!=='speed'||state.screen!=='play'||state.paused||!life?.alive)return;
  if(!plan.current){plan.current=buildSpeedTimeline(state.birthOrigin??createBirth(life.id));frameIndex.current=Math.min(state.speedFrameIndex??0,plan.current.frames.length-1);}
  const i=frameIndex.current,t=setTimeout(()=>{frameIndex.current=i+1;if(plan.current.frames[i+1])dispatch({type:'frame',frame:plan.current.frames[i+1],index:i+1});},plan.current.frames[i]?.durationMs??3000);return()=>clearTimeout(t);
 },[state.mode,state.screen,state.paused,life]);
 function startNew(id,mode='normal',daily=null) {try{let fresh;do{fresh=id?createBirth(id.trim()):drawBirth(crypto.getRandomValues(new Uint32Array(1))[0]);}while(!id&&fresh.id===life?.id);fresh={...fresh,skipHeavy:state.skipHeavy};plan.current=mode==='speed'?buildSpeedTimeline(fresh):null;frameIndex.current=0;dispatch({type:'new',life:fresh,mode:mode==='watch'?'normal':mode,watch:mode==='watch',daily});setNewUnlocks([]);setFeature('');setSourceOpen(false);const url=new URL(location.href);url.searchParams.delete('id');history.replaceState(null,'',url);}catch{set('error','出生编号无效，请使用示例格式：豫-2026-483920。');}}
 useEffect(()=>{if(launch?.type==='new')startNew(launch.id,launch.mode);else if(launch?.type==='daily')setFeature('每日一签');else if(launch?.type==='resume'&&life)set('screen',life.alive?(life.age===0?'birth':'play'):'end');},[]);
 function rerollBirth(){try{setAbandoned(recordAbandonedBirth(life));}catch{setSaveError('放弃记录暂时无法保存在本机。');}startNew(undefined,state.mode==='normal'&&state.automatic?'watch':state.mode);}
 function startDaily(){try{const session=beginDaily(localStorage,getShanghaiDate());startNew(session.id,'normal',session);}catch{set('error','今日签暂时无法保存，请检查浏览器本机存储。');}}
 async function relay(){const {deriveChild}=await import('../engine/family-relay.js');const child=deriveChild(life);if(!child)return;plan.current=state.mode==='speed'?buildSpeedTimeline(child):null;frameIndex.current=0;dispatch({type:'new',life:child,mode:state.mode,familyRows});setNewUnlocks([]);window.scrollTo?.(0,0);}
 const [today,setToday]=useState(getShanghaiDate);useEffect(()=>{const timer=setInterval(()=>setToday(getShanghaiDate()),30000);return()=>clearInterval(timer);},[]);const preview=dailyPreview(today);
 const speed=state.mode==='speed';
 return <main className="app-shell"><Suspense fallback={<p role="status">正在载入…</p>}><header className="site-header"><button className="brand" onClick={()=>{set('screen','home');setFeature('');setSourceOpen(false);}}>人生签<span>中国版 / 2026</span></button><nav><button onClick={()=>{set('screen','home');setFeature('');setSourceOpen(false);}}>首页</button><button onClick={()=>setSourceOpen(v=>!v)}>{sourceOpen?'收起来源':'统计出处'}</button></nav></header>
 {(saveError||state.error)&&<p className="notice" role="alert">{saveError||state.error}</p>}
 {sourceOpen?<Sources/>:feature==='人生图鉴'?<CollectionPage collection={collection} onImport={setCollection}/>:feature==='每日一签'?<section className="daily-page"><p className="eyebrow">北京时间 / {today}</p><h1>今天，<br/>我们从同一处出发。</h1><p className="daily-preview">{typeof preview==='string'?preview:preview.text}</p><p>每个人拿到同一个出生编号。<br/>选择不同，人生也会走向不同的地方。</p><button className="primary" onClick={startDaily}>领取今日签 →</button><small>本机会记录每次开始的次数。终局卡上会印出本次是第几局。</small></section>:<>
 {state.screen==='home'&&<><HomePage state={state} onPreferenceChange={set} onStart={mode=>startNew(undefined,mode)} onFeature={setFeature} onSources={()=>setSourceOpen(true)} life={life} onResume={()=>set('screen',life.alive?(life.age===0?'birth':'play'):'end')} dailyPreview={preview} pastLives={pastLives} onReviewLife={row=>{setReview(row);requestAnimationFrame(()=>{const view=document.querySelector('.past-life-dialog');view?.scrollIntoView({behavior:'smooth',block:'start'});view?.focus({preventScroll:true});});}} abandonedCount={abandoned.count} onReplay={id=>startNew(id)}/>{review&&<section className="past-life-dialog" tabIndex={-1} aria-label="前世回看"><p className="eyebrow">前世 / 本机记录</p><h2>{review.titleName}</h2><p>{review.name} · {review.province} · {review.age} 岁</p><p>{review.biography}</p><p>人生底色 · {review.color?.name??'尚未定色'}</p><ColorAxes color={review.color}/><small>这是本机保存的人生摘要。</small><button onClick={()=>setReview(null)}>收起回看</button></section>}</>}

 {state.screen==='birth'&&<Birth life={life} ownProvince={state.ownProvince} badge={state.daily?dailyBadge(state.daily,{birth:true}):life.family?`家族接力 · 第 ${familyGeneration(life)} 代`:''} onReroll={!state.daily&&!life.family?rerollBirth:undefined} rerollReason={state.daily?'今日签全国同一个开局':life.family?'孩子的出身由上一代决定':''} onStart={()=>dispatch({type:'start'})}/>}
 {state.screen==='play'&&<div className="play-layout"><aside className="play-sidebar"><section className="status-panel"><p className="eyebrow">{speed?'一分钟极速局':'人生进行中'}{life.family?` · 第 ${familyGeneration(life)} 代`:''}</p><h2 className="age-display">{life.age}<span>岁</span></h2><p className="life-name">{life.name} · {life.province}<small>{life.id}</small></p><p>{label(life.edu)} · {JOB_BY_ID[life.occupation?.id]?.name??life.job}</p>{life.occupation&&<small>{employmentLabel(life)} · {JOB_BY_ID[life.occupation.id]?.levels[life.occupation.level]?.title} · 这行第{life.occupation.years}年</small>}<div className="attrs">{[['健康','health'],['幸福','happy'],['知识','knowledge'],['人际','social'],['卷度','grind']].map(([name,key])=><label key={key}><span>{name}</span><b>{Math.round(life.attrs[key])}</b><progress max="100" value={life.attrs[key]}/></label>)}</div><p className="finance">年收入 {money(life.income)}<br/>养老金年额 {money(life.pensionIncome)}<br/>家庭人均可支配 {money(life.disposableIncome)}<br/>可用现金 {money(life.assets)}<br/>净资产 {money(netAssets(life))}{life.educationFinance?.loanBalance>0&&<> <br/>助学贷款本金 {money(life.educationFinance.loanBalance)}</>}</p>{life.preparation&&<div className="preparation-status"><p>{life.preparation.kind==='master'?'研究生':'招录'}备考中 · 每年自动参加</p><button onClick={()=>dispatch({type:'engine-action',action:'leave-preparation'})}>放弃备考，回到工作</button></div>}<label>今年的重心<select disabled={speed||life.age<6} value={speed?'auto':state.focus} onChange={e=>set('focus',e.target.value)}><option value="auto">自动安排</option>{focusOptions(life).map(f=><option key={f.id} value={f.id}>{f.label}</option>)}</select></label><div className="controls"><button onClick={()=>set('paused',!state.paused)}>{state.paused?'继续':'暂停'}</button>{!speed&&<>{[1,2,4].map(n=><button aria-pressed={state.speed===n} key={n} onClick={()=>set('speed',n)}>{n}×</button>)}<button disabled={Boolean(life.pending||state.reveal)} onClick={()=>dispatch({type:'advance'})}>过一年</button><button disabled={Boolean(life.pending||state.reveal)} onClick={()=>dispatch({type:'jump'})}>下一抉择</button><label><input type="checkbox" checked={state.automatic} onChange={e=>set('automatic',e.target.checked)}/>自动抉择</label></>}</div>{speed&&<small>只展示关键节点。日常照常发生，所有抉择自动安排。</small>}</section><MoneyMenu life={life} disabled={speed||Boolean(state.reveal)} error={state.actionError} onAction={input=>dispatch({type:'engine-action',input})}/><Peers peers={state.peers}/></aside><div className="play-main">{!speed&&!state.reveal&&life.pending&&<TimedDecision key={lifeKey(life)} life={life} automatic={state.automatic} paused={state.paused} onChoose={choice=>dispatch({type:'advance',choice})}/>}<LifeLog life={life} hiddenEvent={state.reveal} events={speed?state.displayLogs:undefined}/></div></div>}
 {state.screen==='end'&&<><EndingStory life={life}/><End life={life} badge={state.daily?dailyBadge(state.daily):''} onNew={()=>state.daily?startDaily():startNew(undefined,state.mode)}/><section className="family-panel"><p className="eyebrow">家族接力 / 第 {familyGeneration(life)} 代</p><h2>{familyGeneration(life)===3?'家族终局':canRelay(life)?'接着，做你的孩子。':'这个家的故事。'}</h2>{state.familyGoal!=='free'&&<p>{familyGoalStatus(life,state.familyGoal)?'家族目标已达成。':canRelay(life)?'这条家族目标，还在路上。':'这个家族没有达成目标。'}</p>}<div className="family-rows">{familyRows.map((row,i)=><article key={row.id}><span>第 {i+1} 代</span><h3>{row.name}</h3><p>{row.province}{row.place} · {label(row.edu)}<br/>定居 {settlement(row).label} · {row.age} 岁</p></article>)}</div>{canRelay(life)?<button className="primary" onClick={relay}>接着做你的孩子 →</button>:<p className="family-stop">{familyGeneration(life)===3?'三代人的故事，先写到这里。':`这个家的故事停在了第 ${familyGeneration(life)} 代。`}</p>}<ShareImage life={life} kind="family" family={familyRows}/></section>{newUnlocks.length>0&&<section className="new-unlocks"><h3>本局新解锁</h3>{newUnlocks.map(a=><p key={a.id}><b>{a.name}</b><small>10 万次模拟里出现 {a.count.toLocaleString('zh-CN')} 次</small></p>)}</section>}<LifeLog life={life} events={speed?state.displayLogs:undefined}/></>}
 {state.reveal&&state.screen==='play'&&<div className="reveal-backdrop"><DiceReveal key={`${state.reveal.age}:${state.reveal.node}`} event={state.reveal} fast={speed} onClose={()=>dispatch({type:'dismiss'})}/></div>}
 </>}
 {toast&&<div className="unlock-toast" role="status">{toast}</div>}<footer className="site-footer"><b>人生签</b><small>基于公开统计的模拟，不代表任何个人命运。适合 15 岁以上。<br/>人生记录保存在这台设备，分享图片在本机生成。</small></footer></Suspense></main>;
}
