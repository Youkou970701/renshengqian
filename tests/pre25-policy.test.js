import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';import{drawBirth}from'../src/engine/birth.js';import{step}from'../src/engine/life.js';
test('2000局生育自动策略改动不影响25岁前逐步状态、日志与随机状态',async()=>{
 const url=new URL('../src/engine/decisions.js',import.meta.url);const current=readFileSync(url,'utf8');assert.ok(current.includes('u<P.family.autoChildProbability'));
 const legacySource=current.replace('u<P.family.autoChildProbability','u<.55').replace(/from\s+(['"])([^'"]+)\1/g,(_,q,p)=>`from ${JSON.stringify(new URL(p,url).href)}`);
 const {autoChoose:legacy}=await import('data:text/javascript;base64,'+Buffer.from(legacySource).toString('base64'));
 for(let i=0;i<2000;i++){let now=drawBirth(i),old=drawBirth(i);while(now.alive&&now.age<25){now=step(now,{auto:true}).state;old=step(old,old.pending?{choice:legacy(old)}:{auto:true}).state;assert.deepEqual(now,old,now.id+' '+now.age);}}
});
