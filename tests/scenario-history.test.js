import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {scenarioPatch} from '../src/engine/scenarios.js';
import {scenarioResultFacts} from '../src/content/scenario-result-facts.js';
import {migrateLife} from '../src/engine/migrate.js';
import {step} from '../src/engine/life.js';
import {SCENARIOS} from '../src/content/scenarios.js';
import {biography} from '../src/engine/biography.js';
const base=()=>({...createBirth('粤-2026-123456'),age:40,capture:true,scenarioHistory:[],assets:300000});
test('存档钉住当时分支事实和真实效果，不随以后内容改字而重写一生',()=>{
 let s=scenarioPatch(base(),'luck-mentor',0,'decline');
 const h=JSON.parse(JSON.stringify(s.scenarioHistory.at(-1)));
 const def=SCENARIOS.find(d=>d.id===h.id);
 const changed={...def,endFacts:{avoided:{text:'不曾发生的新结果',title:'不曾发生新结果'}},steps:def.steps.map(st=>({...st,options:st.options.map(o=>({...o,endFacts:undefined}))}))};
 assert.match(scenarioResultFacts(h,changed).text,/拒绝/);assert.deepEqual(h.appliedEffects,[{happyDelta:1},{}]);
 assert.equal(h.contentRevision,def.revision);assert.deepEqual(migrateLife(s),s);
});
test('旧未完成模板保留已付代价和日志，停止失效分支；不把旧选项解释成新结果',()=>{
 const active=scenarioPatch(base(),'luck-mentor',0,'scope');
 const old=JSON.parse(JSON.stringify(active));delete old.scenarioHistory[0].contentRevision;
 old.pending={id:'story:luck-mentor:1',options:[{id:'resolve',label:'旧选项'}]};
 const before=JSON.stringify(old),next=migrateLife(old);
 assert.equal(JSON.stringify(old),before);assert.equal(next.assets,old.assets);assert.equal(next.storyActive,null);assert.equal(next.pending,null);
 assert.equal(next.scenarioHistory[0].outcome,'skipped');assert.deepEqual(next.log.slice(0,-1),old.log);
 assert.doesNotMatch(biography(next).sentence,/交付项目|拿到.*报酬/);
});
test('旧模板首幕尚未选择时只更新卡片，继续后记录当前真实选项',()=>{
 const old={...base(),pending:{id:'story:warm-neighbor:0',title:'旧标题',options:[{id:'ask',label:'旧选项一'},{id:'handle',label:'旧选项二'}]}};
 const next=migrateLife(old);assert.equal(next.pending.id,old.pending.id);assert.equal(next.assets,old.assets);
 assert.ok(next.pending.options.every(o=>!['ask','handle'].includes(o.id)));
 const played=step(next,{choice:next.pending.options[0].id}).state;
 assert.equal(played.scenarioHistory[0].choices[0].choice,next.pending.options[0].id);
});
test('复查排除重病与职业健康异常未确诊，不写成已经重病或肺损伤',()=>{
 const defs=[['body-major',['check','plan']],['body-occupational',['evaluate','follow']]];
 for(const [id,choices]of defs){
  const h={id,startedAt:40,endedAt:41,outcome:'good',choices:choices.map((choice,index)=>({choice,index,age:40+index}))};
  const b=biography({...base(),age:80,alive:false,death:{detail:'脑卒中'},record:{},scenarioHistory:[h]});
  assert.doesNotMatch(b.sentence,/确诊重病|肺部受损|改变谋生方式/);
  assert.match(b.sentence,id==='body-major'?/排除重病/:/未见肺部持续损伤/);
 }
});
