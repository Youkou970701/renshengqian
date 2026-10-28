import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {wholeMoney,moneyDisplayRows} from '../src/ui/money-display.js';
import {occupationTitle,occupationSummary} from '../src/ui/work-title.js';
import {JOB_BY_ID} from '../src/content/jobs.js';

async function components(){
 const base=new URL('../src/ui/',import.meta.url);
 const output=await build({stdin:{contents:"export {default as MoneyChanges} from './MoneyChanges.jsx';export {default as IncomeRank} from './IncomeRank.jsx';export {default as Sources} from './Sources.jsx';",resolveDir:fileURLToPath(base),loader:'jsx'},bundle:true,write:false,format:'esm',platform:'node',external:['react','react-dom']});
 const linked=output.outputFiles[0].text.replace(/from\s+(['"])([^'"]+)\1/g,(_,quote,path)=>`from ${JSON.stringify(path.startsWith('.')?new URL(path,base).href:import.meta.resolve(path))}`);
 return import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`);
}

test('money rows show whole yuan, retain the original ledger, and still add to the total',async()=>{
 const life={moneyYear:{age:50,change:26147,flows:{wages:35201.76,mortgageInterest:-3154.9,debtInterest:-900,family:-5000,rounding:.14},transfers:{'归还房贷本金':1234.56}}};
 const original=structuredClone(life),rows=moneyDisplayRows(life);
 assert.ok(rows.every(row=>Number.isInteger(row.amount)&&row.kind!=='rounding'));
 assert.equal(rows.reduce((sum,row)=>sum+row.amount,0),life.moneyYear.change);
 assert.deepEqual(life,original);assert.equal(wholeMoney(22901.78),'+22,902 元');assert.equal(wholeMoney(-.22),'0 元');
 const {MoneyChanges}=await components(),html=renderToStaticMarkup(React.createElement(MoneyChanges,{life}));
 assert.doesNotMatch(html,/金额取整|[0-9]\.[0-9]+\s*元/);assert.match(html,/\+26,147 元/);assert.match(html,/1,235 元/);
 const tiny={moneyYear:{age:28,change:-1,flows:{rounding:-1}}};
 const tinyHtml=renderToStaticMarkup(React.createElement(MoneyChanges,{life:tiny}));
 assert.match(tinyHtml,/净资产基本持平/);assert.doesNotMatch(tinyHtml,/金额取整|净资产没有变化/);
 assert.deepEqual(moneyDisplayRows(tiny),[]);assert.equal(tiny.moneyYear.change,-1);
});

test('rank uses current income and plain language; sample and method details stay in Sources',async()=>{
 const {IncomeRank,Sources}=await components();
 const html=renderToStaticMarkup(React.createElement(IncomeRank,{life:{age:50,income:50000,peakIncome:1000000,province:'江西'}}));
 assert.match(html,/你的收入比全国约 \d+% 的同龄人高/);assert.match(html,/在江西同龄人中排在前 \d+%/);
 assert.match(html,/45–54/);assert.doesNotMatch(html,/百分位|年度观察|贡献多个年度|样本|峰值|20,000/);
 const source=renderToStaticMarkup(React.createElement(Sources));assert.match(source,/20,000/);assert.match(source,/少于 30 个独立人/);
});

test('years of freelancing stop being labelled a newcomer without manufacturing a promotion',()=>{
 const make=(id,years,level=0)=>({occupation:{id,years,level},job:JOB_BY_ID[id].legacy});
 assert.equal(occupationTitle(make('freelancer',1)),'接单新人');
 assert.equal(occupationTitle(make('freelancer',3)),'独立接单者');
 const life=make('freelancer',20),before=structuredClone(life);
 assert.equal(occupationTitle(life),'接单老手');assert.doesNotMatch(occupationSummary(life),/新人/);assert.match(occupationSummary(life),/这行第20年/);assert.deepEqual(life,before);
 assert.equal(occupationTitle(make('welder',20)),'');
 assert.equal(occupationTitle(make('programmer',20)), '初级开发');
 assert.equal(occupationTitle(make('freelancer',20,2)),'独立工作室负责人');
});
