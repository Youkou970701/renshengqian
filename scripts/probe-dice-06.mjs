import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { drawBirth } from '../src/engine/birth.js';
import { simulate } from '../src/engine/life.js';
import { logistic } from '../src/engine/params.js';

const allowed=['家境','城乡','省份','成绩','努力','学历','行业'];
const labels=Object.fromEntries(allowed.map(label=>[label,0]));
const kinds={};
let diceCount=0,nearMissCount=0,closePassCount=0,internalCaps=0,maxProbabilityError=0;
for(let seed=0;seed<3000;seed++){
 const life=simulate(drawBirth(seed),{capture:true});
 for(const event of life.log)for(const die of event.dice??[]){
  diceCount++;kinds[die.id]=(kinds[die.id]??0)+1;
  assert.equal(die.pass,die.u<die.p);
  assert.ok(die.u>=0&&die.u<1&&die.p>=0&&die.p<=1);
  assert.equal(die.nearMiss,die.positive&&!die.pass&&die.u<die.p+.05);
  assert.equal(die.closePass,die.positive&&die.pass&&die.u>die.p-.05);
  if(die.nearMiss)nearMissCount++;
  if(die.closePass)closePassCount++;
  if(die.contributions.cap!==undefined)internalCaps++;
  const total=Object.values(die.contributions).reduce((sum,value)=>sum+value,0);
  const error=Math.abs(logistic(total)-die.p);
  maxProbabilityError=Math.max(maxProbabilityError,error);
  assert.ok(error<1e-10);
  assert.ok(die.factors.length<=3);
  for(let i=0;i<die.factors.length;i++){
   const factor=die.factors[i];
   assert.ok(allowed.includes(factor.label),factor.label);
   assert.ok(!['base','cap'].includes(factor.key));
   assert.equal(factor.logit,die.contributions[factor.key]);
   assert.ok(Math.abs(factor.delta-(die.p-logistic(total-factor.logit)))<1e-10);
   assert.equal(Math.sign(factor.pp),Math.sign(factor.logit));
   if(i)assert.ok(Math.abs(die.factors[i-1].pp)>=Math.abs(factor.pp));
   labels[factor.label]++;
  }
  if(['master','civil','midcareer'].includes(die.id)){
   assert.equal(die.p,event.probability);
   assert.equal(die.u,event.draw);
  }
 }
}
const result={sampleSize:3000,seedRange:[0,2999],strategy:'auto',diceCount,labels,kinds,nearMissCount,closePassCount,internalCaps,maxProbabilityError,assertions:'PASS'};
const directory=new URL('../tests/artifacts-06/',import.meta.url);
mkdirSync(directory,{recursive:true});
writeFileSync(new URL('dice-probe.json',directory),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
