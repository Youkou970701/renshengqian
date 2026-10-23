import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {random,idToSeed,seedToId,ABBRS} from '../src/engine/rng.js';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {step,simulate} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
import {PROVINCES,provinceInfo} from '../src/engine/stats.js';
import {lifeTableExpectation} from '../src/engine/mortality.js';
import {P} from '../src/engine/params.js';
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
test('PRNG同种子同序列，编号包含省份年份六位数字可逆',()=>{for(let seed=0;seed<20;seed++)assert.deepEqual(random(seed),random(seed));assert.notEqual(random(1).value,random(2).value);for(const a of ABBRS)for(const y of ['0000','2026','9999'])for(const num of ['000000','483920','999999']){const id=`${a}-${y}-${num}`;assert.equal(seedToId(idToSeed(id)),id);}assert.throws(()=>createBirth('非法-2026-001'));});
test('同出生编号同焦点和选择序列逐字重现，含自动选择及存档重载',()=>{const a=simulate(createBirth('豫-2026-483920'),{focus:'study',capture:true});const b=simulate(createBirth('豫-2026-483920'),{focus:'study',capture:true});assert.deepEqual(a,b);assert.ok(a.log.length>40);const choices=['leave','home','老家','single','rent','stay'];const manual=simulate(createBirth(a.id),{focus:'study',choices,capture:true});assert.deepEqual(manual,simulate(createBirth(a.id),{focus:'study',choices,capture:true}));assert.ok(manual.choices.some(c=>c.choice==='leave'));assert.notDeepEqual(manual.log,a.log);let s=createBirth(a.id);for(let i=0;i<25;i++)s=step(s,s.pending?{auto:true}:{focus:'health'}).state;let restored=JSON.parse(JSON.stringify(s));assert.deepEqual(simulate(s,{capture:true}),simulate(restored,{capture:true}));});
test('step与autoChoose不修改输入，pending不推进年龄，不同选择有可见影响',()=>{let s=createBirth('沪-2026-123456');for(let i=0;i<100&&s.pending?.id!=='school'&&s.alive;i++)s=step(s,s.pending?{choice:autoChoose(s)}:{focus:'study'}).state;assert.equal(s.pending?.id,'school');const frozen=freeze(s);assert.equal(step(frozen).state,frozen);assert.equal(step(frozen,{choice:autoChoose(frozen)}).state.age,15);const left=step(frozen,{choice:'leave'}).state;assert.equal(left.edu,'junior');assert.ok(left.log.some(e=>e.text.includes('先去工作')));});
test('固定扫描可抽到每个省，边界省完整终止，死后无事件',()=>{const found=new Set();for(let i=0;i<10000;i++)found.add(drawBirth(i).province);assert.equal(found.size,31);for(const abbr of ABBRS){const s=simulate(createBirth(`${abbr}-2026-000001`),{capture:true});assert.equal(s.alive,false);assert.ok(s.age<=110);assert.deepEqual(step(s),{state:s,events:[]});assert.equal(new Set(s.history.map(h=>h.age)).size,s.history.length);assert.ok(s.log.every(e=>e.age<=s.age));}});
test('寿命表逐省逐性别数值匹配预期寿命',()=>{for(const p of PROVINCES)for(const sex of ['male','female'])assert.ok(Math.abs(lifeTableExpectation(p,sex)-provinceInfo(p).lifeExpectancy-(sex==='male'?P.maleLifeShift:P.femaleLifeShift))<1e-8);});
test('引擎目录禁止环境随机性、时钟、浏览器和React依赖',()=>{for(const f of readdirSync(new URL('../src/engine/',import.meta.url)).filter(f=>f.endsWith('.js'))){const text=readFileSync(new URL('../src/engine/'+f,import.meta.url),'utf8');assert.doesNotMatch(text,/Math\.random|\bDate\b|\b(?:document|window|localStorage)\b|from\s+['"]react/);}});
test('capture仅影响日志，不能改变模拟机制',()=>{for(let i=0;i<20;i++){const b=drawBirth(i);const normal=simulate(b,{capture:true}),fast=simulate(b);for(const k of ['age','rngState','edu','job','assets','attrs','record','death'])assert.deepEqual(normal[k],fast[k]);}});
