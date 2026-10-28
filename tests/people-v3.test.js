import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createBirth} from '../src/engine/birth.js';
import {ensurePeople,annualPeople,peopleChoice,personalDaily,familyMembers,closenessLabel,closeSibling,childVisitFrequency,relationshipOpportunity} from '../src/engine/people.js';

const birth=()=>createBirth('粤-2026-694669');
const adult=()=>({...birth(),age:43,married:true,partner:{id:'sample-partner',name:'李知夏',age:42,job:'护士'},relationship:{closeness:65},kids:[{bornAt:30},{bornAt:34}],siblings:2});
test('people use isolated deterministic names, preserve all original state and provide complete named family',()=>{
 const before=adult(),raw=JSON.stringify(before),a=ensurePeople(before),b=ensurePeople(before);
 assert.deepEqual(a.people,b.people);assert.equal(JSON.stringify(before),raw);
 assert.equal(a.rngState,before.rngState);assert.equal(a.cardRngState,before.cardRngState);assert.equal(a.economyRngState,before.economyRngState);
 assert.equal(a.attrs,before.attrs);assert.equal(a.assets,before.assets);assert.equal(a.relationship,before.relationship);
 const list=familyMembers(a);
 for(const role of ['parent','sibling','friend','child'])assert.equal(list.filter(p=>p.role===role).length,2);
 assert.equal(list.filter(p=>p.role==='partner').length,1);
 for(const p of list){assert.match(p.name,/^[\p{Script=Han}]{2,4}$/u);assert.ok(Number.isFinite(p.age));assert.ok(p.job);assert.ok(['亲近','一般','疏远'].includes(closenessLabel(p.closeness)));}
 assert.equal(list.find(p=>p.id==='mother').name,before.parents.mother.name);
 assert.equal(list.find(p=>p.role==='partner').name,'李知夏');
});
test('real birth care changes closeness once, with an explicit cause, including a life ending at age zero',()=>{
 const original=birth(),events=[],emit=(text,stat,meta)=>events.push({text,stat,...meta});
 const first=ensurePeople(original,emit),again=ensurePeople(first,emit);
 assert.equal(first.people.changeCount,1);assert.equal(again.people.changeCount,1);assert.equal(events.length,1);
 assert.ok(events[0].reason);assert.equal(events[0].after-events[0].before,1);assert.equal(events[0].node,'people-relationship');
 assert.equal(ensurePeople({...original,age:50},emit).people.changeCount,0,'old saves never receive invented retroactive birth care');
 assert.equal(events.length,1);
 const closed={...first,alive:false};assert.equal(closed.age,0);assert.ok(closed.people.changeCount>=1);
});
test('annual company and real care/borrowing choices change specific people without changing economic or school inputs',()=>{
 const original=ensurePeople(adult()),snapshot=JSON.stringify(original),events=[],emit=(text,stat,meta)=>events.push({text,stat,...meta});
 const close=annualPeople(original,'family',emit);
 assert.ok(close.people.members.mother.closeness>original.people.members.mother.closeness);
 assert.equal(JSON.stringify(original),snapshot);assert.equal(close.attrs,original.attrs);assert.equal(close.assets,original.assets);
 assert.equal(annualPeople(close,'family',emit).people.changeCount,close.people.changeCount,'a year is settled once');
 const childId=familyMembers(close).find(p=>p.role==='child').id;
 const apart=peopleChoice(close,'family-child-care','hometown',emit);
 assert.equal(apart.people.members[childId].closeness,close.people.members[childId].closeness-12);
 const lend=peopleChoice(apart,'sibling-borrowing','lend',emit),refuse=peopleChoice(apart,'sibling-borrowing','decline',emit);
 assert.ok(closeSibling(lend));assert.equal(closeSibling(refuse),null);
 assert.ok(events.every(e=>e.reason&&e.personId&&e.name&&e.before!==e.after));
 assert.equal(lend.rngState,original.rngState);assert.equal(lend.cardRngState,original.cardRngState);assert.equal(lend.assets,original.assets);
});
test('named scenes respect children age, dead parents, closeness and actual later visits',()=>{
 let s=ensurePeople(adult());
 const child=familyMembers(s).find(p=>p.role==='child');
 assert.equal(childVisitFrequency(s,child.id),3);
 s={...s,age:70,people:{...s.people,members:{...s.people.members,[child.id]:{...child,closeness:20}}}};
 assert.equal(childVisitFrequency(s,child.id),6);
 let named=0,seenDistant=false;
 for(let slot=0;slot<100;slot++){
  const out=personalDaily(s,'孩子打电话来谈起近况。',{templateId:`sample-${slot}`,slot});
  if(out.peopleNamed){named++;assert.ok(out.personIds.length);assert.ok(Object.values(s.people.members).some(p=>out.text.includes(p.name)));if(out.text.includes('今年也没有定下回来的日子'))seenDistant=true;}
 }
 assert.ok(named>=40);assert.ok(seenDistant);
 const parent=birth().parents.mother;
 const deceased=ensurePeople({...adult(),parents:{...adult().parents,mother:{...parent,alive:false,age:74,diedAt:43}}});
 const row=familyMembers(deceased).find(p=>p.id==='mother');assert.equal(row.diedAge,74);assert.equal(row.age,74);assert.equal(row.alive,false);
});
test('capture modes, JSON saves, divorce and a new partner preserve social facts deterministically',()=>{
 const a=annualPeople({...adult(),capture:true},'family',()=>{}),b=annualPeople({...adult(),capture:false},'family',()=>{});
 assert.deepEqual(a.people,b.people);
 assert.deepEqual(ensurePeople(JSON.parse(JSON.stringify(a))).people,a.people);
 const divorced=ensurePeople({...a,married:false,partner:null});assert.equal(familyMembers(divorced).filter(p=>p.role==='partner').length,0);
 const remarried=ensurePeople({...divorced,married:true,partner:{id:'new',name:'陈知远',age:44,job:'教师'}});
 assert.equal(familyMembers(remarried).filter(p=>p.role==='partner').length,1);assert.equal(familyMembers(remarried).find(p=>p.role==='partner').name,'陈知远');
 assert.equal(remarried.people.members['partner:sample-partner'].active,false);
});
test('real PeoplePanel displays names, ages, occupations, closeness and death ages',async()=>{
 const {outputFiles}=await build({entryPoints:[fileURLToPath(new URL('../src/ui/PeoplePanel.jsx',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',external:['react']});
 const code=outputFiles[0].text.replace(/from "react"/g,`from ${JSON.stringify(import.meta.resolve('react'))}`);
 const {default:Panel}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const s=adult();s.parents.mother={...s.parents.mother,alive:false,age:74};
 const html=renderToStaticMarkup(React.createElement(Panel,{life:s}));
 for(const text of ['家人与生活','李知夏','护士','74 岁离开','亲近','好朋友'])assert.ok(html.includes(text),text);
});

test('later relationship opportunities require actual closeness and apply/log the named recipient once',()=>{
 let s=ensurePeople(adult());
 assert.equal(relationshipOpportunity(s),null);
 s=peopleChoice(s,'sibling-borrowing','lend',()=>{});
 const card=relationshipOpportunity(s);assert.equal(card.id,'people-sibling-hand');assert.equal(card.options.length,3);assert.ok(card.when(s));
 const chosen=closeSibling(s),before=chosen.closeness,patch=card.options[0].effects(s),events=[];
 const after=peopleChoice({...s,...patch},card.id,'accept-help',(text,stat,meta)=>events.push({text,...meta}));
 assert.equal(after.people.members[chosen.id].closeness,before+5);assert.equal(events.length,1);assert.equal(events[0].personId,chosen.id);assert.ok(events[0].reason);
 const distant={...after,people:{...after.people,members:{...after.people.members,[chosen.id]:{...chosen,closeness:20},'sibling:1':{...after.people.members['sibling:1'],closeness:20}}}};
 assert.equal(card.when(distant),false);assert.equal(card.options[0].requires(distant),false);
 let older=ensurePeople({...s,age:70});const child=familyMembers(older).find(p=>p.role==='child');older={...older,people:{...older.people,members:{...older.people.members,[child.id]:{...child,closeness:70}}}};
 assert.equal(relationshipOpportunity(older).id,'people-child-weekend');
});
test('small annual changes stay recorded without flooding logs; known widowhood remains visible and divorce is not called death',()=>{
 const logs=[],emit=(text,stat,meta)=>logs.push({text,...meta});let s=ensurePeople({...birth(),age:0},emit);
 for(let age=1;age<=6;age++)s=annualPeople({...s,age},'family',emit);
 assert.ok(s.people.changeCount>logs.length);assert.ok(s.people.lastChange.reason);assert.ok(logs.every(e=>e.reason));
 const original=ensurePeople(adult());
 const dead=ensurePeople({...original,married:false,partner:null,exPartners:[original.partner],relationshipHistory:[{kind:'widowed',partnerId:original.partner.id,partnerAge:42}]});
 const p=familyMembers(dead).find(p=>p.role==='partner');assert.ok(p);assert.equal(p.alive,false);assert.equal(p.diedAge,42);
 const reload=ensurePeople({...dead,relationshipHistory:[]});assert.equal(familyMembers(reload).find(p=>p.role==='partner').alive,false);
 const divorce=ensurePeople({...original,married:false,partner:null,relationshipHistory:[{kind:'divorce',partnerId:original.partner.id}]});assert.equal(familyMembers(divorce).filter(p=>p.role==='partner').length,0);
});

test('sync cache reuses unchanged facts but catches same-age marriage, newborn, divorce, death and care source changes',()=>{
 const s=ensurePeople(adult()),snapshot=JSON.stringify(s);
 assert.equal(ensurePeople(s),s);
 const clonedSources={...s,parents:structuredClone(s.parents),kids:structuredClone(s.kids),partner:structuredClone(s.partner)};
 assert.equal(ensurePeople(clonedSources),clonedSources,'equal scalar sources can reuse facts despite fresh engine copies');
 const single=ensurePeople({...s,married:false,partner:null});assert.equal(familyMembers(single).filter(p=>p.role==='partner').length,0);
 const married=ensurePeople({...single,married:true,partner:{id:'same-year',name:'王知远',age:45,job:'木工'}});
 assert.equal(familyMembers(married).find(p=>p.role==='partner').name,'王知远');
 const newborn=ensurePeople({...s,kids:[...s.kids,{bornAt:s.age}]});const child=familyMembers(newborn).find(p=>p.role==='child'&&p.age===0);assert.ok(child);
 const death=ensurePeople({...s,parents:{...s.parents,mother:{...s.parents.mother,age:80,alive:false}}});assert.equal(death.people.members.mother.alive,false);assert.equal(death.people.members.mother.diedAge,80);
 const renamed=ensurePeople({...s,parents:{...s.parents,father:{...s.parents.father,name:'李建军'}}});assert.equal(renamed.people.members.father.name,'李建军');assert.ok(familyMembers(renamed).filter(p=>p.role==='sibling').every(p=>p.name.startsWith('李')));
 const careInput={...s,kids:s.kids.map((k,i)=>i?{...k}:{...k,careBy:'left-behind',leftBehind:true})},care=ensurePeople(careInput);
 assert.notEqual(care,careInput,'care flags invalidate the source cache');
 const separation=peopleChoice(care,'family-child-care','hometown',()=>{});assert.equal(separation.people.members['child:30:0'].closeness,s.people.members['child:30:0'].closeness-12);
 const left=ensurePeople({...s,leftBehind:true,parents:{...s.parents,mother:{...s.parents.mother,away:true}}});assert.ok(left.people.members['caregiver:grandmother']);
 assert.equal(JSON.stringify(s),snapshot,'all source changes leave the original input untouched');
});
test('generated profile cache preserves names and death ages across aging and JSON rehydration',()=>{
 let s=ensurePeople(adult());const original=familyMembers(s).filter(p=>p.bornAt!=null).map(p=>({id:p.id,name:p.name,age:p.age,bornAt:p.bornAt}));
 for(let age=44;age<=105;age++){
  s=ensurePeople({...s,age});
  const restored=ensurePeople(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(restored.people,s.people);
  for(const p of original){const current=s.people.members[p.id];assert.equal(current.name,p.name);assert.equal(current.age,current.alive?age-p.bornAt:current.diedAge);}
 }
});
