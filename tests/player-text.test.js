import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup,renderToPipeableStream} from 'react-dom/server';
import {build} from 'esbuild';
import {PassThrough} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {P} from '../src/engine/params.js';
import {birthText,familyText,terminalText} from '../src/content/presentation.js';
import {footnote,resolveStat,visibleFootnote} from '../src/content/footnotes.js';
import {findBannedWords} from './banned-words.js';
import {DATA,PROVINCES} from '../src/engine/stats.js';

const criticalNodes=new Set(['school','exam','career','civil','master','midcareer','death']);
function checkText(text, context, {sourcePage=false}={}) {
  assert.equal(typeof text, 'string', `${context}: expected text`);
  // The dedicated Sources page preserves the read-only table's original audit
  // statuses so readers can judge provenance. Only 已核 / 待核 / 估算 are exempt
  // there; the home page and all game copy still use the complete banned list.
  const sourceStatuses=new Set(sourcePage?['已核','待核','估算']:[]);
  assert.deepEqual(findBannedWords(text).filter(word=>!sourceStatuses.has(word)), [], `${context}: player terminology leaked: ${text}`);
  assert.doesNotMatch(text, /undefined|\[object Object\]/, `${context}: broken interpolation`);
}

// Transform the real JSX module in memory. This executes the components used by
// the app, so the check cannot pass by inspecting a separate copy of UI text.
async function loadUI() {
  const url=new URL('../src/ui/App.jsx',import.meta.url);
  const bundle=await build({stdin:{contents:`export {default} from './App.jsx'; export * from './App.jsx'; export {default as End} from './End.jsx'; export {default as Sources} from './Sources.jsx';`,resolveDir:fileURLToPath(new URL('.',url)),loader:'jsx'},bundle:true,write:false,format:'esm',platform:'node',external:['react','react-dom'],loader:{'.css':'empty'}});
  const code=bundle.outputFiles[0].text;
  const linked=code.replace(/from\s+(['"])([^'"]+)\1/g, (_,quote,path)=>
    `from ${JSON.stringify(path.startsWith('.')?new URL(path,url).href:import.meta.resolve(path))}`);
  return import(`data:text/javascript;base64,${Buffer.from(linked).toString('base64')}`);
}

async function renderApp(element){
 return new Promise((resolve,reject)=>{const output=new PassThrough();let html='';output.on('data',data=>{html+=data;});output.on('end',()=>resolve(html));const stream=renderToPipeableStream(element,{onAllReady(){stream.pipe(output);},onError:reject});});
}

test('2000 complete lives: actual logs, birth cards, endings and rendered UI contain no forbidden terminology', async()=>{
  const ui=await loadUI();
  const seenCritical=new Map();
  let leftBehind=0, namedParents=0, directSources=0, appExample;
  for(let seed=0;seed<2000;seed++) {
    const birth=drawBirth(seed);
    let end=birth,guard=0;
    while(end.alive && guard++<300) {
      if(end.pending) {
        const markup=renderToStaticMarkup(React.createElement(ui.Decision,{life:end,automatic:true,paused:false,countdown:5}));
        checkText(markup.replace(/<[^>]*>/g,''),`${birth.id}: decision at ${end.age}`);
      }
      end=step(end,{auto:true}).state;
    }
    assert.equal(end.alive,false,`${birth.id}: incomplete life`);
    if(!appExample) appExample={birth,end};
    for(const person of [birth,birth.parents.mother,birth.parents.father]) {
      assert.match(person.name,/^[\p{Script=Han}]{2,4}$/u,`${birth.id}: missing Chinese name`);
    }
    namedParents++;
    if(birth.leftBehind) leftBehind++;
    for(const text of [birthText(birth),familyText(birth),terminalText(end)]) checkText(text,birth.id);
    const occurrences=new Map();
    for(const event of end.log) {
      checkText(event.text,`${birth.id} / ${event.age}`);
      const renderedCitation=visibleFootnote(event);
      if(event.footnote!=null) {
        directSources++;
        assert.equal(event.node,'midcareer',`${birth.id}: direct citation only permitted for industry risk`);
        assert.equal(event.stat,null,`${birth.id}: risk must not cite an unrelated population statistic`);
        assert.ok(Number.isFinite(event.probability),`${birth.id}: missing actual risk probability`);
        assert.ok(event.industry,`${birth.id}: missing source industry`);
        const expected=P.career.layoff[event.industry] ?? P.career.layoff.service;
        assert.equal(event.probability,expected,`${birth.id}: cited risk does not match the industry parameter`);
        assert.equal(event.contributions?.industry,expected,`${birth.id}: missing actual industry contribution`);
        assert.match(event.footnote,/来源[：:]/,`${birth.id}: direct citation lacks a source`);
        const percentages=[...event.footnote.matchAll(/(\d+(?:\.\d+)?)%/g)].map(match=>Number(match[1]));
        assert.ok(percentages.some(value=>Math.abs(value-expected*100)<1e-9),`${birth.id}: displayed risk differs from the probability used`);
        assert.equal(renderedCitation,'',`${birth.id}: local risk parameter must stay out of player footnotes`);
      }
      if(event.stat) {
        const resolved=resolveStat(event.stat);
        assert.ok(resolved && resolved.value!==undefined && resolved.source,`${birth.id}: missing statistic or source`);
        const rendered=footnote(event.stat);
        checkText(rendered,`${birth.id}: footnote ${event.stat}`);
        if(['已核','待核'].includes(resolved.status)) assert.match(rendered,/\d/,`${birth.id}: citation lacks a number`);
        else assert.equal(rendered,'',`${birth.id}: ineligible data row exposed`);
        assert.ok(!rendered.includes(event.stat),`${birth.id}: internal citation key leaked`);
      }
      if(criticalNodes.has(event.node)) {
        seenCritical.set(event.node,(seenCritical.get(event.node)??0)+1);
        if(event.stat && ['已核','待核'].includes(resolveStat(event.stat).status)) {
          assert.ok(renderedCitation,`${birth.id}: ${event.node} approved statistical context omitted`);
          assert.match(renderedCitation,/\d/,`${birth.id}: ${event.node} citation lacks numbers`);
        } else assert.equal(renderedCitation,'',`${birth.id}: internal parameter exposed`);
      }
      if(event.templateId) {
        const ages=occurrences.get(event.templateId)??[];
        assert.ok(ages.length<2,`${birth.id}: ${event.templateId} used more than twice`);
        assert.ok(ages.every(age=>event.age-age>=5),`${birth.id}: ${event.templateId} repeated within five years`);
        ages.push(event.age);occurrences.set(event.templateId,ages);
      }
    }
    const markup=renderToStaticMarkup(React.createElement(React.Fragment,null,
      React.createElement(ui.Birth,{life:birth,ownProvince:''}),
      React.createElement(ui.LifeLog,{life:end}),
      React.createElement(ui.End,{life:end}),
      React.createElement(ui.Peers,{peers:[end]})));
    const displayed=markup.replace(/<[^>]*>/g,'');
    checkText(displayed,`${birth.id}: rendered UI`);
    // Existing plain UI remains a stage-04 integration task. The formatter used
    // by the design lab is checked on every actual event above.
  }
  assert.equal(namedParents,2000);
  assert.ok(directSources>0,'sample must exercise actual industry risk citations');
  assert.ok(leftBehind>0,'sample must exercise left-behind children');
  for(const node of criticalNodes) assert.ok(seenCritical.get(node)>0,`sample never exercised ${node}`);
  const sources=renderToStaticMarkup(React.createElement(ui.Sources)).replace(/<[^>]*>/g,'');
  checkText(sources,'rendered sources',{sourcePage:true});
  for(const status of ['已核','待核','估算']) assert.ok(sources.includes(status),`sources must retain ${status}`);
  assert.ok(sources.includes(DATA.births.by_province_2024._note),'sources must preserve the original province-data note');
  for(const province of PROVINCES) assert.ok(sources.includes(`2024 年${province}出生人口 ${DATA.births.by_province_2024[province].value} 万人，数据状态：${DATA.births.by_province_2024[province].status}`),`${province}: original status missing from sources`);
  const originalStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const originalLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
  try {
    Object.defineProperty(globalThis,'location',{value:new URL('http://localhost/'),configurable:true});
    for(const screen of ['home','birth','play','end']) {
      const life=screen==='end'?appExample.end:appExample.birth;
      const saved={schemaVersion:2,screen,life,peers:[life,life,life,life]};
      Object.defineProperty(globalThis,'localStorage',{value:{getItem:()=>JSON.stringify(saved)},configurable:true});
      const text=(await renderApp(React.createElement(ui.default))).replace(/<[^>]*>/g,'');
      checkText(text,`full app screen ${screen}`);
      if(screen==='home') {
        // Includes hidden screen-reader copy and collapsed details, not just
        // the initially visible hero text.
        assert.doesNotMatch(text,/已核|待核|估算/,'home must use player-facing data labels throughout');
        for(const copy of ['推算','初步数据','家庭暴力','刚刚出生','你的前世']) assert.ok(text.includes(copy),`home missing ${copy}`);
      }
      assert.ok(text.includes({home:'如果人生重新抽签。',birth:'出生登记卡',play:'今年的重心',end:'这一生的终局'}[screen]),`${screen}: failed to restore screen under test`);
    }
  } finally {
    if(originalStorage) Object.defineProperty(globalThis,'localStorage',originalStorage); else delete globalThis.localStorage;
    if(originalLocation) Object.defineProperty(globalThis,'location',originalLocation); else delete globalThis.location;
  }
});
