import React,{lazy,Suspense,useState,useEffect,useRef} from 'react';
import HomePage from './HomePage.jsx';
import {viewingPreferences} from './preferences.js';
import {loadPastLives,loadAbandonedBirths} from './past-lives-storage.js';
import {loadCollection,saveCollection} from './collection-storage.js';
import {SAVE_KEY,serializeSave} from './save-codec.js';
import {ColorAxes} from './ColorAxes.jsx';
import {dailyPreview,getShanghaiDate} from './daily.js';
const App=lazy(()=>import('./App.jsx'));
const Sources=lazy(()=>import('./Sources.jsx'));
const CollectionPage=lazy(()=>import('./CollectionPage.jsx'));
function savedHome(){try{return JSON.parse(localStorage.getItem(SAVE_KEY))??{};}catch{return {};}}
// Home needs births and stored summaries. The simulation and ending catalogues
// are fetched only when the player opens them, including direct birth-ID links.
export default function Boot(){
 const [saved,setSaved]=useState(savedHome),[launch,setLaunch]=useState(()=>new URLSearchParams(location.search).has('id')||saved.life&&['birth','play','end'].includes(saved.screen)?{type:'direct'}:null),[feature,setFeature]=useState(''),[review,setReview]=useState(null);
 const [pastLives]=useState(loadPastLives),[abandoned]=useState(loadAbandonedBirths),[collection,setCollection]=useState(loadCollection);
 const preferences={...viewingPreferences(saved),...Object.fromEntries(['skipHeavy','ownProvince','familyGoal'].filter(k=>k in saved).map(k=>[k,saved[k]]))};
 const [today,setToday]=useState(getShanghaiDate);
 useEffect(()=>{const timer=setInterval(()=>setToday(getShanghaiDate()),30000);return()=>clearInterval(timer);},[]);
 const latest=useRef(saved);latest.current=saved;
 useEffect(()=>{if(launch)return;const save=()=>{try{const s=latest.current;localStorage.setItem(SAVE_KEY,serializeSave({...s,...viewingPreferences(s)}));}catch{}};const hide=()=>{if(document.hidden)save();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',save);return()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',save);};},[launch]);
 const set=(key,value)=>{setSaved(s=>({...s,[key]:value}));};
 if(launch)return <Suspense fallback={<p role="status">正在载入这一生…</p>}><App launch={{...launch,preferences}}/></Suspense>;
 return <main className="app-shell"><header className="site-header"><button className="brand" onClick={()=>setFeature('')}>人生签<span>中国版 / 2026</span></button><nav><button onClick={()=>setFeature('')}>首页</button><button onClick={()=>setFeature(f=>f==='统计出处'?'':'统计出处')}>{feature==='统计出处'?'收起来源':'统计出处'}</button></nav></header><Suspense fallback={<p role="status">正在载入…</p>}>
 {feature==='统计出处'?<Sources/>:feature==='人生图鉴'?<CollectionPage collection={collection} onImport={value=>{setCollection(value);saveCollection(value);}}/>:<><HomePage state={preferences} onPreferenceChange={set} onStart={mode=>setLaunch({type:'new',mode})} onFeature={name=>name==='每日一签'?setLaunch({type:'daily'}):setFeature(name)} onSources={()=>setFeature('统计出处')} life={saved.life} onResume={()=>setLaunch({type:'resume'})} dailyPreview={dailyPreview(today)} pastLives={pastLives} onReviewLife={row=>{setReview(row);requestAnimationFrame(()=>{const view=document.querySelector('.past-life-dialog');view?.scrollIntoView({behavior:'smooth',block:'start'});view?.focus({preventScroll:true});});}} abandonedCount={abandoned.count} onReplay={id=>setLaunch({type:'new',id})}/>{review&&<section className="past-life-dialog" tabIndex={-1} aria-label="前世回看"><p className="eyebrow">前世 / 本机记录</p><h2>{review.titleName}</h2><p>{review.name} · {review.province} · {review.age} 岁</p><p>{review.biography}</p><p>人生底色 · {review.color?.name??'尚未定色'}</p><ColorAxes color={review.color}/><small>这是本机保存的人生摘要。</small><button onClick={()=>setReview(null)}>收起回看</button></section>}</>}
 </Suspense><footer className="site-footer"><b>人生签</b><small>基于公开统计的模拟，不代表任何个人命运。适合 15 岁以上。<br/>人生记录保存在这台设备，分享图片在本机生成。</small></footer></main>;
}
