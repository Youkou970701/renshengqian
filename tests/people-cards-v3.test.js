import test from 'node:test';
import assert from 'node:assert/strict';
import {PEOPLE_CARDS,PEOPLE_FOLLOWUPS} from '../src/content/cards/people.js';
import {createBirth} from '../src/engine/birth.js';
import {ensurePeople} from '../src/engine/people.js';
import {findBannedWords} from './banned-words.js';

const base=(age=40)=>({...createBirth('粤-2026-694669'),age,siblings:1,edu:'high',job:'工厂工人',city:'县城'});
const humanState=age=>{
 let s=ensurePeople({...base(age),kids:[{bornAt:20}]});
 s={...s,people:{...s.people,members:Object.fromEntries(Object.entries(s.people.members).map(([id,p])=>[id,{...p,closeness:75}]))}};
 return s;
};
const contexts=[
 {hukou:'rural',leftBehind:true,wealthQ:1,edu:'high',job:'务农',city:'老家'},
 {hukou:'rural',leftBehind:false,wealthQ:3,edu:'high',job:'工厂工人',city:'老家'},
 {hukou:'urban',leftBehind:false,wealthQ:1,edu:'high',job:'企业职员',city:'县城'},
 {hukou:'urban',leftBehind:false,wealthQ:3,edu:'bachelor',job:'企业职员',city:'省会'},
 {hukou:'urban',leftBehind:false,wealthQ:5,edu:'985',job:'公务员',city:'一线'},
];
const copy=(x,s)=>typeof x==='function'?x(s):x;

test('身边的人至少20张原创两难，童年到晚年，每卡至少3个不同后果并有1–5年专属伏笔',()=>{
 assert.ok(PEOPLE_CARDS.length>=20);
 assert.equal(new Set(PEOPLE_CARDS.map(c=>c.id)).size,PEOPLE_CARDS.length);
 assert.ok(PEOPLE_CARDS.some(c=>c.minAge<13));assert.ok(PEOPLE_CARDS.some(c=>c.minAge>=60));
 for(const c of PEOPLE_CARDS){
  assert.equal(c.category,'people');assert.equal(c.maxPerLife,1);assert.ok(c.options.length>=3,c.id);
  const s=humanState(Math.max(40,c.minAge));const original=structuredClone(s);
  const immediate=[],future=[],texts=[];
  for(const o of c.options){
   assert.equal(o.seeds.length,1);const seed=o.seeds[0];assert.deepEqual(seed.inYears,[1,5]);assert.equal(seed.chance,1);
   const patch=o.effects(s);assert.deepEqual(Object.keys(patch),['peopleDilemmas']);
   assert.deepEqual(s,original,`${c.id}/${o.id} mutated input`);
   assert.equal(patch.peopleDilemmas[c.id].choice,o.id);assert.equal(patch.peopleDilemmas[c.id].decidedAt,s.age);
   const f=PEOPLE_FOLLOWUPS[seed.cardId];assert.ok(f,seed.cardId);assert.equal(f.sourceCardId,c.id);assert.equal(f.choice,o.id);
   const after={...s,...patch,age:s.age+3},follow=f.effects(after);
   assert.equal(follow.peopleDilemmas[c.id].followedUpAt,after.age);
   assert.equal(follow.peopleDilemmas[c.id].decidedAt,s.age);
   assert.equal(after.rngState,s.rngState);assert.equal(after.cardRngState,s.cardRngState);assert.equal(after.assets,s.assets);
   texts.push(f.text(after));immediate.push(JSON.stringify(patch.peopleDilemmas[c.id]));future.push(JSON.stringify(follow.peopleDilemmas[c.id]));
   for(const text of [o.label,o.hint,f.text(after)]){assert.equal(typeof text,'string');assert.doesNotMatch(text,/undefined|\[object Object\]/);assert.deepEqual(findBannedWords(text),[]);}
  }
  assert.equal(new Set(immediate).size,c.options.length,`${c.id}: indistinguishable immediate facts`);
  assert.equal(new Set(future).size,c.options.length,`${c.id}: indistinguishable followup results`);
  assert.equal(new Set(texts).size,c.options.length,`${c.id}: repeated branch followup text`);
 }
});

test('每张身边人卡用现有处境尺子，版本更换场景和全部选项文字，不改后果编号',()=>{
 for(const c of PEOPLE_CARDS){
  assert.ok(c.variants.length>=4,c.id);assert.equal(new Set(c.variants.map(v=>v.title)).size,c.variants.length,`${c.id}: repeated titles`);
  for(const v of c.variants){
   const s=humanState(Math.max(40,c.minAge));
   assert.ok(copy(v.body,s).length>=20);assert.ok(copy(v.title,s).length>=4);
   assert.deepEqual(Object.keys(v.labels).sort(),c.options.map(o=>o.id).sort());
   for(const [id,[label,hint]] of Object.entries(v.labels)){
    assert.ok(c.options.some(o=>o.id===id));assert.ok(label.length>=5);assert.ok(hint.length>0);
    assert.deepEqual(findBannedWords(label+hint+copy(v.title,s)+copy(v.body,s)),[]);
   }
  }
  const versions=new Set(contexts.map(context=>c.variants.find(v=>v.when({...base(Math.max(40,c.minAge)),...context}))?.key));
  assert.ok(versions.size>=3,`${c.id}: ruler not sensitive to circumstances`);
 }
});

test('亲近手足才主动帮忙，亲近成年孩子才邀约；后续保留当初的人名而不是改找另一个人',()=>{
 for(const [id,role,age]of [['people-sibling-hand','sibling',40],['people-child-weekend','child',65]]){
  const c=PEOPLE_CARDS.find(c=>c.id===id);let s=humanState(age);
  assert.ok(c.when(s),`${id} close relation should be eligible`);
  const person=Object.values(s.people.members).find(p=>p.role===role);
  assert.ok(person);
  const changed={...s,people:{...s.people,members:{...s.people.members,[person.id]:{...person,closeness:20}}}};
  assert.equal(c.when(changed),false,`${id} distant relation must not invite`);
  const o=c.options.at(-1),chosen={...s,...o.effects(s)};
  const later={...chosen,age:age+2,people:{...chosen.people,members:{...chosen.people.members,[person.id]:{...person,closeness:20}}}};
  const f=PEOPLE_FOLLOWUPS[o.seeds[0].cardId],result=f.effects(later);
  assert.equal(result.peopleDilemmas[id].personId,person.id);
  assert.equal(result.peopleDilemmas[id].personName,person.name);
  assert.ok(f.text({...later,...result}).includes(person.name));
 }
});
