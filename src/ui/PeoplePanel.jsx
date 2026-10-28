import React from 'react';
import {familyMembers,closenessLabel} from '../engine/people.js';
export default function PeoplePanel({life}){
 const people=familyMembers(life);
 return <section className="people-panel" aria-label="家人与生活"><div className="section-head"><h3>家人与生活</h3><span>{people.length} 人</span></div><div className="people-list">{people.map(p=><article key={p.id} className={p.alive?'person':'person deceased'} style={{padding:'10px 0',borderBottom:'1px solid var(--line)'}}><strong>{p.label} · {p.name}</strong><p style={{margin:'3px 0',fontSize:12}}>{p.alive?`${p.age} 岁 · ${p.job}`:`${p.diedAge??p.age} 岁离开 · 生前${p.job}`}<br/><span>{closenessLabel(p.closeness)}</span></p></article>)}</div><small>相处、照护和选择，会一点点改变彼此的距离。</small></section>;
}
