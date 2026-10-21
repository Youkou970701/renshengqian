import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBirth } from '../src/engine/birth.js';
import { simulate } from '../src/engine/life.js';
import { logistic } from '../src/engine/params.js';
import { makeDice } from '../src/engine/dice.js';
import { diceMarginText, closestMoment } from '../src/content/dice.js';

test('2000局实际裁决骰子与既有抽样一致，前三项百分点方向及排序正确',()=>{
 const kinds=new Set();let count=0;
 for(let i=0;i<2000;i++){
  const s=simulate(drawBirth(i),{capture:true,choices:i%2?['repeat']:[]});
  for(const event of s.log)for(const die of event.dice??[]){
   count++;kinds.add(die.id);
   assert.equal(die.pass,die.u<die.p);
   assert.ok(die.u>=0&&die.u<1&&die.p>=0&&die.p<=1);
   const score=Object.values(die.contributions).reduce((a,b)=>a+b,0);
   assert.ok(Math.abs(logistic(score)-die.p)<1e-10);
   assert.equal(die.nearMiss,die.positive&&!die.pass&&die.u<die.p+.05);
   assert.equal(die.closePass,die.positive&&die.pass&&die.u>die.p-.05);
   assert.ok(die.factors.length<=3);
   die.factors.forEach((f,j)=>{
    assert.equal(Math.sign(f.pp),Math.sign(f.logit));
    assert.ok(Math.abs(f.delta-(die.p-logistic(score-f.logit)))<1e-10);
    if(j)assert.ok(Math.abs(die.factors[j-1].pp)>=Math.abs(f.pp));
   });
   if(die.id==='midcareer'){assert.equal(die.p,event.probability);assert.equal(die.u,event.draw);assert.equal(die.positive,false);}
   if(['master','civil'].includes(die.id)){assert.equal(die.p,event.probability);assert.equal(die.u,event.draw);}
  }
  const nearest=closestMoment(s.log);
  if(nearest)assert.ok(nearest.nearMiss&&nearest.positive);
 }
 assert.ok(count>5000);
 for(const kind of ['school-stage','school-general','exam-bachelor','exam-211','exam-985','repeat-bachelor','master','civil','midcareer'])assert.ok(kinds.has(kind),kind);
});

test('只差与险过采用严格5百分点边界，岗位中断不用有利裁决措辞',()=>{
 const make=(p,u,positive=true)=>makeDice({id:'test',p,u,positive});
 assert.equal(make(.5,.5).nearMiss,true);
 assert.equal(make(.5,.55).nearMiss,false);
 assert.equal(make(.5,.549).nearMiss,true);
 assert.equal(make(.5,.45).closePass,false);
 assert.equal(make(.5,.451).closePass,true);
 assert.equal(make(.5,.449).closePass,false);
 assert.equal(make(.5,.5).closePass,false);
 assert.equal(diceMarginText(make(.5,.51)),'只差 1%');
 assert.equal(diceMarginText(make(.5,.49)),'险过');
 assert.equal(diceMarginText(make(.5,.51,false)),'');
 assert.equal(diceMarginText(make(.5,.49,false)),'');
});

test('骰子只显示七种直白标签，内部阈值和未映射项保留审计值而不冒充因素',()=>{
 const labels={wealth:'家境',hukou:'城乡',grade:'成绩',tier:'省份',effort:'努力',grind:'努力',retry:'努力',degree:'学历',region:'省份',industry:'行业'};
 for(const [key,label] of Object.entries(labels)){
  const die=makeDice({id:'label',p:.5,u:.4,contributions:{base:-.2,[key]:.2}});
  assert.deepEqual(die.factors.map(f=>f.label),[label]);
 }
 const die=makeDice({id:'cap',p:.4,u:.45,contributions:{base:0,wealth:.2,futureTerm:.3}});
 assert.deepEqual(die.factors.map(f=>f.key),['wealth']);
 assert.equal(die.contributions.futureTerm,.3);
 assert.ok(Number.isFinite(die.contributions.cap));
 assert.ok(Math.abs(logistic(Object.values(die.contributions).reduce((sum,v)=>sum+v,0))-.4)<1e-10);
 assert.equal(die.pass,false);
 assert.equal(die.nearMiss,false);
});
