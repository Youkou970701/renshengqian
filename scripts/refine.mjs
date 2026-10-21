// Final intercept fit uses actual age-18 states, including event history and focus.
// No acceptance target or statistic is changed. The target 42.5% lies inside 37–45%.
import { drawBirth } from '../src/engine/birth.js';
import { simulate } from '../src/engine/life.js';
import { probability } from '../src/engine/education.js';
import { P } from '../src/engine/params.js';
import { readFileSync,writeFileSync } from 'node:fs';
const examinees=[];
for(let i=0;i<20000;i++){const s=simulate(drawBirth((Math.imul(i,2654435761)+123456789)>>>0),{until:18});if(s.record.gaokao)examinees.push(s);}
let lo=-3,hi=3;
for(let k=0;k<45;k++){P.bachelorBase=(lo+hi)/2;const avg=examinees.reduce((v,s)=>v+probability(s,'bachelor'),0)/examinees.length;if(avg<.425)lo=P.bachelorBase;else hi=P.bachelorBase;}
P.bachelorBase=(lo+hi)/2;
const file=new URL('../src/engine/params.js',import.meta.url);let source=readFileSync(file,'utf8');source=source.replace(/("bachelorBase":\s*)-?[\d.eE+-]+/,(_,a)=>a+P.bachelorBase);writeFileSync(file,source);
console.log(`Actual-state intercept fit: ${examinees.length} examinees / 20000 births; expected 42.5%; bachelorBase=${P.bachelorBase}`);
