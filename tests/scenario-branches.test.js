import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../src/content/scenarios.js';
import {scenarioPatch} from '../src/engine/scenarios.js';
import {scenarioResultFacts} from '../src/content/scenario-result-facts.js';
import {createBirth} from '../src/engine/birth.js';
import {hashSeed} from '../src/engine/rng.js';
import {findBannedWords} from './banned-words.js';
const initial=()=>({...createBirth('粤-2026-123456'),age:40,capture:false,assets:300000,married:true,partner:{name:'林禾'},relationship:{closeness:60},scenarioHistory:[],storyActive:null});
const forbiddenShare=/犯罪|毒品|家暴|家庭暴力|赌博|坐牢|诈骗|盗窃|抢劫|案底|戒毒|自杀/;
const terminal=o=>o.exit||o.chance||o.outcome;
const signatures=st=>st.options.map(o=>JSON.stringify([o.effects,o.exit??null,o.risk??0,o.chance??null,o.next??null]));
test('M5全部剧本均手写，每幕至少两个不同后果选项，终局有专属结尾',()=>{
 assert.ok(SCENARIOS.length>=65);
 for(const def of SCENARIOS){
  assert.ok(def.endTexts,def.id);
  for(const [index,st]of def.steps.entries()){
   assert.ok(st.options.length>=2,`${def.id}:${index}`);assert.equal(new Set(signatures(st)).size,st.options.length,`${def.id}:${index}`);
   assert.doesNotMatch(st.options.map(o=>o.label).join(' '),/找可信的人一起商量|先整理眼下的事情|把这份心意留在生活里/);
   for(const o of st.options){
    if(o.next!=null)assert.ok(o.next>=0&&o.next<def.steps.length);
    if(o.exit)assert.ok(o.endText||o.endTexts?.[o.exit]||def.endTexts[o.exit],`${def.id}:${o.id}:${o.exit}`);
    if(index===def.steps.length-1)assert.ok(terminal(o));
   }
  }
 }
});
test('新手写终局的分支事实覆盖实际路线，分享事实中性，称号只有结尾一个的',()=>{
 const defs=SCENARIOS.filter(d=>d.endFacts);assert.ok(defs.length>=55);
 let ends=0,avoided=0;
 for(const def of defs){
  const explore=(s,index,depth)=>{
   assert.ok(depth<6,'分支不应循环');
   for(const o of def.steps[index].options){
    if(o.effects?.sellHouse&&!s.ownsHouse)continue;
    const seeds=terminal(o)||index===def.steps.length-1?Array.from({length:48},(_,i)=>hashSeed(Math.imul(i+1,2654435761))):[s.storyRngState];
    for(const seed of seeds){
     const end=scenarioPatch({...s,storyRngState:seed},def.id,index,o.id);
     if(end.storyActive){explore({...end,age:end.storyActive.dueAge},end.storyActive.index,depth+1);continue;}
     const h=end.scenarioHistory.at(-1),f=scenarioResultFacts(h,def);assert.ok(f,`${def.id}:${o.id}:${h.outcome}`);ends++;avoided+=h.outcome==='avoided';
     assert.ok(o.endText||o.endTexts?.[h.outcome]||def.endTexts[h.outcome],`${def.id}:${o.id}:${h.outcome} 结尾缺失`);
     assert.ok(!f.title.includes('的'),`${def.id}:${o.id}:${f.title}`);assert.ok(!f.shareTitle.includes('的'));
     assert.deepEqual(findBannedWords(f.text+' '+f.title+' '+f.shareText+' '+f.shareTitle),[],def.id);
     assert.doesNotMatch(f.shareText+' '+f.shareTitle,forbiddenShare,def.id);
     assert.equal(f.age,end.age);assert.ok(f.text.length>3&&f.title.length>3);
    }
   }
  };
  explore({...initial(),age:Math.max(def.minAge,Math.min(40,def.maxAge))},0,0);
 }
 assert.ok(ends>5000);assert.ok(avoided>0);
});
test('拒绝牌局不污染伴侣习惯，旧案底不能冒充本段新严重后果',()=>{
 const b=initial(),no=scenarioPatch(b,'boundary-gambling',0,'no');
 assert.ok(!no.relationship.habitualGambling);assert.equal(no.scenarioHistory.at(-1).outcome,'avoided');
 const refuse=scenarioPatch(b,'trap-drugs',0,'leave');assert.ok(!refuse.relationship.drugAbuse);assert.ok(!refuse.addiction);
 const old={...b,record:{...b.record,criminalRecord:true,disability:true,bankrupt:true,familyEstranged:true}};
 const exit=scenarioPatch(old,'boundary-prison',0,'no');
 assert.deepEqual(exit.scenarioHistory.at(-1).consequences,{criminalRecord:false,disability:false,bankrupt:false,familyEstranged:false});
});
test('面向未成年人的剧情所有后续幕都在18岁前结束',()=>{
 const b=initial();
 const lastAge=(def,index,age)=>Math.max(...def.steps[index].options.map(o=>terminal(o)||index===def.steps.length-1?age:lastAge(def,o.next??index+1,age+(o.delay??1))));
 for(const def of SCENARIOS)for(let age=8;age<18;age++)if(age>=def.minAge&&age<=def.maxAge&&def.trigger({...b,age}))assert.ok(lastAge(def,0,age)<18,`${def.id} ${age}岁开始会延到成年`);
});
