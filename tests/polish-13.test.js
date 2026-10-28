import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {materializeCard,cardById} from '../src/engine/cards.js';
import {probe13,yearObservation,happinessSummary} from '../scripts/probe-13.mjs';

test('ordinary choice records the actual displayed variant title and option, once before consequences',()=>{
 let s={...createBirth('赣-2026-303077'),age:36,kids:[{bornAt:33}],married:true,capture:true};
 const c=cardById('family-second-child');assert.ok(c);
 s.pending=materializeCard(c,s);s.pending.title='二胎的账算不过来';
 const selected=s.pending.options.find(o=>!o.disabled),result=step(s,{choice:selected.id});
 const events=result.events.filter(e=>e.node==='card');assert.equal(events.length,1);
 assert.equal(events[0].text,`二胎的账算不过来——你选了「${selected.label}」。`);
 assert.equal(events[0].cardTitle,s.pending.title);assert.equal(events[0].choice,selected.id);
});
test('happiness probe counts real liabilities, separates students/retirees and compares stable years',()=>{
 const b=createBirth('赣-2026-303077');
 assert.equal(yearObservation({...b,age:19,job:'尚未就业'}).unemployed,false);
 assert.equal(yearObservation({...b,age:70,job:'退休',retired:true}).unemployed,false);
 const y=yearObservation({...b,age:40,job:'待业',assets:-100,money:{mortgage:{balance:1000},debts:[{balance:200}]},educationFinance:{loanBalance:300,loanInterestArrears:10}});
 assert.equal(y.debt,1610);assert.equal(y.unemployed,true);
 const report=happinessSummary([{working:true,debt:0,happy:80},{unemployed:true,debt:20,happy:55}]);assert.equal(report.either.gap,25);
});
test('2000 complete lives meet all handoff 13 choice, name, reason and happiness gates',{timeout:120000},()=>{
 const r=probe13();assert.equal(r.n,2000);assert.deepEqual(r.checks.filter(c=>!c.pass),[]);
});
