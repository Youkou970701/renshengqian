import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {marryPartner,partnerCandidate} from '../src/engine/relationships.js';
import {RELATIONSHIP_CARDS} from '../src/content/cards/relationships.js';
import {SCENARIO_CARDS} from '../src/engine/scenarios.js';
import {orderedLifeLog} from '../src/ui/life-log.js';

const pending=c=>({id:c.id,title:c.title,options:c.options.map(o=>({id:o.id,label:o.label,disabled:false}))});
test('关系卡先记录选择再写法院后果，页面倒排年份仍保留同年先后',()=>{
 const s={...drawBirth(42),age:30,sex:'male',assets:50000};
 marryPartner(s,{...partnerCandidate(s),age:29,sex:'female'});
 const c=RELATIONSHIP_CARDS.find(x=>x.id==='relationship-marriage-crisis');
 s.pending=pending(c);const before=structuredClone(s),result=step(s,{choice:'sue'});
 assert.deepEqual(s,before);
 assert.equal(result.events[0].node,'card');assert.match(result.events[0].text,/向法院起诉离婚/);
 assert.match(result.events[1].text,/未判准离婚/);
 const shown=orderedLifeLog([{age:29,text:'去年'},...result.events,{age:31,text:'次年'}]);
 assert.equal(shown[0].text,'次年');assert.equal(shown[1].text,result.events[0].text);assert.equal(shown[2].text,result.events[1].text);
 assert.equal(result.state.relationship.deniedAt,30*365);
});
test('剧本日志依次为情境、选择、后果和结局，各出现一次',()=>{
 const c=SCENARIO_CARDS.find(x=>x.id==='story:boundary-drunk:0');
 const s={...drawBirth(42),age:25,pending:pending(c)};
 const result=step(s,{choice:'leave'}),events=result.events;
 assert.deepEqual(events.map(e=>e.node),['scenario-scene','card','scenario-end']);
 assert.equal(events.filter(e=>e.node==='card'&&e.text.startsWith('你选了')).length,1);
 assert.equal(events.filter(e=>e.node==='card'&&e.text.includes(c.title)).length,0,'scenario choice must not repeat its title after the full scene');
 assert.equal(result.state.scenarioHistory.at(-1).outcome,'avoided');
 assert.deepEqual(orderedLifeLog(events),events);
});
