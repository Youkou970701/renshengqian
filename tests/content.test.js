import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { events, stages } from '../src/content/events/index.js';
import { footnote, resolveStat, visibleFootnote } from '../src/content/footnotes.js';
import { findBannedWords } from './banned-words.js';

const expectedStages = ['baby', 'child', 'junior', 'high', 'college', 'adult', 'middle', 'senior'];
const ages = [3, 8, 14, 17, 20, 28, 45, 70];
const educations = ['none', 'junior', 'vocational', 'secondary_vocational', 'zhongzhi', 'associate', 'bachelor', '985'];
const representativeStates = ages.flatMap((age, ageIndex) =>
  ['rural', 'urban'].flatMap((hukou) =>
    [1, 2, 3, 4, 5].map((wealthQ, index) => ({
      id: '豫-2026-000001', name: '陈小明', age, alive: true, hukou, wealthQ,
      parents: {mother: {name: '李秀英', age: 28+age, job: '务农', alive: true}, father: {name: '陈建国', age: 30+age, job: '建筑工人', alive: true}},
      sex: index % 2 ? 'female' : 'male', province: index % 2 ? '上海' : '河南', tier: index % 2 ? 'S' : 'C',
      edu: educations[(ageIndex + index) % educations.length],
      job: ['delivery', 'driver', 'worker', 'white_collar', 'unemployed'][index],
      leftBehind: hukou === 'rural' && index % 2 === 0,
      married: index % 2 === 0,
      kids: index === 0 ? [] : index === 1 ? [{ age: 8 }] : index % 3,
      homeOwned: index % 2 === 0,
      attrs: { health: 60, happy: 60, knowledge: 60, social: 60, grind: 60 },
    })),
  ),
);

test('event library has at least 300 unique templates and 12 per required stage', () => {
  assert.ok(events.length >= 300, `only ${events.length} templates`);
  assert.equal(new Set(events.map((event) => event.id)).size, events.length, 'duplicate template IDs');
  assert.deepEqual(stages, expectedStages);
  for (const stage of expectedStages) {
    assert.ok(events.filter((event) => event.stage === stage).length >= 12, `${stage} has too few templates`);
  }
  for (const event of events) {
    assert.ok(expectedStages.includes(event.stage), `${event.id}: unexpected stage`);
    assert.equal(typeof event.weight, 'function');
    assert.equal(typeof event.text, 'function');
    assert.ok(event.effects && typeof event.effects === 'object' && !Array.isArray(event.effects));
    for (const [key, value] of Object.entries(event.effects)) {
      assert.ok(['health', 'happy', 'knowledge', 'social', 'grind'].includes(key), `${event.id}: unknown effect ${key}`);
      assert.ok(Number.isFinite(value), `${event.id}: invalid effect ${key}`);
    }
  }
});

test('cited templates reference real statistics and render numerical, readable footnotes', () => {
  for (const event of events.filter(event => event.stat)) {
    const resolved = resolveStat(event.stat);
    assert.ok(resolved, `${event.id}: missing stat ${event.stat}`);
    assert.notEqual(resolved.value, undefined);
    assert.ok(resolved.source.length > 0);
    const rendered = footnote(event.stat);
    if(['已核','待核'].includes(resolved.status)) assert.match(rendered, /\d/, `${event.id}: no numerical context`);
    else assert.equal(rendered,'',`${event.id}: nonstatistical citation leaked`);
    assert.ok(!rendered.includes(event.stat), `${event.id}: internal key exposed`);
    assert.ok(!rendered.includes('undefined') && !rendered.includes('[object Object]'));
    assert.deepEqual(findBannedWords(rendered), [], `${event.id}: footnote contains banned wording`);
  }
  assert.match(footnote('education.general_hs_rate'), /61%/);
  assert.match(footnote('health.infant_mortality'), /4(?:\.0)?‰/);
  assert.match(footnote('family.left_behind_share_rural'), /2013/);
  assert.equal(resolveStat('education.nonexistent'), null);
  assert.equal(resolveStat(''), null);
});

test('template weights and text are deterministic, finite, and do not mutate representative states', () => {
  for (const state of representativeStates) {
    const original = JSON.stringify(state);
    for (const event of events) {
      const weight = event.weight(state);
      assert.ok(Number.isFinite(weight) && weight >= 0, `${event.id}: weight ${weight}`);
      assert.equal(weight, event.weight(state), `${event.id}: nondeterministic weight`);
      const text = event.text(state);
      assert.equal(typeof text, 'string');
      assert.ok(text.trim().length > 0, `${event.id}: empty text`);
      assert.equal(text, event.text(state), `${event.id}: nondeterministic text`);
      assert.ok(!text.includes('undefined') && !text.includes('[object Object]'), `${event.id}: broken interpolation`);
      assert.deepEqual(findBannedWords(text), [], `${event.id}: banned text`);
    }
    assert.equal(JSON.stringify(state), original, 'template mutated input state');
  }
  for (const stage of stages) {
    for (const state of representativeStates) {
      assert.ok(events.some((event) => event.stage === stage && event.weight(state) > 0), `${stage}: no selectable template`);
    }
  }
});

test('content and footnote source files contain no ambient randomness', () => {
  const folder = fileURLToPath(new URL('../src/content/events/', import.meta.url));
  const paths = readdirSync(folder).filter((name) => name.endsWith('.js')).map((name) => `${folder}/${name}`);
  paths.push(fileURLToPath(new URL('../src/content/footnotes.js', import.meta.url)));
  for (const path of paths) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /Math\s*\.\s*random\s*\(|Date\s*\.\s*now\s*\(/, `${path}: nondeterministic content`);
  }
});


test('only approved statistical rows are displayed, local parameter notes are hidden',()=>{
  for(const key of ['education.kaoyan_admit_ratio','career.guokao_ratio_2026','province_tier.C','calibration_targets_v2.urban_q5_bachelor']) assert.equal(footnote(key),'');
  assert.equal(visibleFootnote({stat:null,footnote:'风险 27%。来源：本地岗位风险参数'}),'');
  assert.match(visibleFootnote({stat:'health.infant_mortality',footnote:'内部参数'}),/4.0‰/);
  assert.doesNotMatch(footnote('family.left_behind_share_rural'),/历史统计|不代表/);
});

test('parents have natural work descriptions and school leaving names the actual final year', async()=>{
  const {familyText,jobPhrase}=await import('../src/content/presentation.js');
  const {verdict}=await import('../src/content/verdicts.js');
  for(const job of ['农民','外出务工者','个体经营者','工人','服务业从业者','教师','白领','公务员']) {
    assert.ok(jobPhrase(job).length>2);
    const text=familyText({wealthQ:1,age:0,parents:{father:{name:'周建华',birthAge:32,job},mother:{name:'李秀英',birthAge:29,job}}});
    assert.doesNotMatch(text,new RegExp(`做${job}`));
  }
  assert.match(jobPhrase('外出务工者'),/在外地打工/);
  for(const general of [true,false])for(const dominant of ['effort','wealth','hukou','grade','tier','chance','choice'])for(let variant=0;variant<4;variant++) {
    const text=verdict({record:{general},parents:{}},{node:'completion',outcome:'dropped',dominant,variant});
    assert.ok(text.startsWith(general?'普通高中高三没读完':'中职三年级没读完'));
    assert.doesNotMatch(text,/东莞|工厂宿舍/);
  }
});
