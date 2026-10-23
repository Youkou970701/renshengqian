import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBirth, createBirth } from '../src/engine/birth.js';
import { step } from '../src/engine/life.js';
import { autoChoose } from '../src/engine/decisions.js';
import { availableCards, drawCards, resolveCard } from '../src/engine/cards.js';
import { CARDS } from '../src/content/cards/index.js';
import { beginPreparation, annualPreparation } from '../src/engine/preparation.js';

function freeze(x) {
  if (x && typeof x === 'object') {
    Object.freeze(x);
    for (const value of Object.values(x)) freeze(value);
  }
  return x;
}
const atAge = (age, patch = {}) => ({ ...createBirth('沪-2026-123456'), age, cardHistory: [], cardUsage: {}, cardSeeds: [], cardQueue: [], ...patch });
function fullLife(seed) {
  let life = { ...drawBirth(seed), capture: false }, guard = 0;
  while (life.alive) {
    assert.ok(++guard <= 1000, '新卡引擎必须终止');
    const input = life.pending ? { choice: autoChoose(life) } : {};
    life = step(life, input).state;
  }
  return life;
}
function contextualFixture() {
  for (let age = 6; age < 100; age++) {
    const state = atAge(age);
    const card = availableCards(state).find(c => !c.core && (c.cooldown ?? 5) > 0);
    if (card) return { state, card };
  }
  throw new Error('卡池中缺少有冷却的情境卡');
}

test('v2 卡 schema: ID 唯一，阶段/冷却/选项代价与限次可由引擎读取', () => {
  assert.equal(new Set(CARDS.map(c => c.id)).size, CARDS.length);
  assert.ok(CARDS.length > 12, '必须实际包含固定节点以外的情境卡');
  for (const card of CARDS) {
    assert.ok(['child', 'teen', 'high', 'college', 'adult', 'midlife', 'senior'].includes(card.stage), card.id);
    assert.equal(typeof card.when, 'function', card.id);
    assert.equal(typeof card.weight, 'function', card.id);
    assert.ok((card.maxPerLife ?? 2) <= 2, card.id);
    assert.ok((card.cooldown ?? 5) >= 0, card.id);
    assert.equal(new Set(card.options.map(o => o.id)).size, card.options.length, card.id);
    for (const option of card.options) {
      assert.equal(typeof option.label, 'string', `${card.id}/${option.id}`);
      if (option.cost !== undefined) assert.ok(typeof option.cost === 'function' || Number.isFinite(option.cost), `${card.id}/${option.id}`);
    }
  }
});

test('v2 卡抽取纯函数且确定，同卡满 2 次和未过冷却时排除', () => {
  const { state, card } = contextualFixture();
  const frozen = freeze(state), snapshot = JSON.stringify(frozen);
  assert.deepEqual(drawCards(frozen), drawCards(frozen));
  assert.equal(JSON.stringify(frozen), snapshot);
  const exhausted = { ...state, cardUsage: { [card.id]: { count: 2, lastAge: -99 } } };
  // A zero count isolates the cooldown predicate even for one-shot cards.
  const cooling = { ...state, cardUsage: { [card.id]: { count: 0, lastAge: state.age } } };
  assert.ok(!availableCards(exhausted).some(c => c.id === card.id));
  assert.ok(!availableCards(cooling).some(c => c.id === card.id));
  const ready = { ...state, cardUsage: { [card.id]: { count: 0, lastAge: state.age - (card.cooldown ?? 5) } } };
  assert.ok(availableCards(ready).some(c => c.id === card.id));
});

test('v2 到期伏笔优先抽取，未来伏笔保留，卡池随机不消费人口流 RNG', () => {
  const { state, card } = contextualFixture();
  const future = { cardId: card.id, atAge: state.age + 5 };
  const seeded = freeze({ ...state, cardSeeds: [{ cardId: card.id, atAge: state.age }, future] });
  const drawn = drawCards(seeded);
  assert.equal(drawn.pending.id, card.id);
  assert.deepEqual(drawn.cardSeeds, [future]);
  assert.equal(drawn.rngState, seeded.rngState);
  assert.deepEqual(seeded.cardSeeds, [{ cardId: card.id, atAge: state.age }, future]);
  assert.equal(drawn.cardUsage[card.id].count, 1);
  assert.equal(drawn.cardsOfferedThisYear, 1);
});

test('v2 完整真实状态机确定、所有有效选择入史、每年最多 2 张且同卡一生最多 2 次', () => {
  let observedChoices = 0;
  for (let i = 0; i < 24; i++) {
    const seed = (Math.imul(i, 2654435761) + 123456789) >>> 0;
    const life = fullLife(seed), reloaded = fullLife(seed);
    assert.deepEqual(life, reloaded);
    assert.ok(Array.isArray(life.cardHistory));
    const ids = {}, years = {};
    for (const h of life.cardHistory) {
      observedChoices++;
      ids[h.id] = (ids[h.id] ?? 0) + 1;
      years[h.age] = (years[h.age] ?? 0) + 1;
      assert.ok(ids[h.id] <= 2, `${life.id}/${h.id}`);
      assert.ok(years[h.age] <= 2, `${life.id}/${h.age}`);
      assert.notEqual(h.id, 'careerPlan');
    }
  }
  assert.ok(observedChoices > 0, '测试必须真正处理卡片选择');
});

test('v2 等待抉择时不推进，禁用选项无法由 step 或内容 resolver 绕过', () => {
  let state = atAge(15, { edu: 'junior', wealthQ: 1, hukou: 'rural', record: { junior: true, general: false, schoolSettled: true, publicGeneral: false } });
  state = drawCards({ ...state, cardSeeds: [{ cardId: 'school-alternatives', atAge: 15 }] });
  assert.equal(state.pending.id, 'school-alternatives');
  const frozen = freeze(state);
  assert.equal(step(frozen).state, frozen);
  assert.ok(frozen.pending.options.find(o => o.id === 'private').disabled);
  assert.ok(frozen.pending.options.find(o => o.id === 'international').disabled);
  assert.throws(() => step(frozen, { choice: 'private' }));
  assert.throws(() => resolveCard(frozen, 'private'));
  assert.ok(frozen.pending.options.some(o => o.id === autoChoose(frozen) && !o.disabled));
});

test('v2 备考状态每年只结算一次，失败继续、过报名年龄停止，主动放弃可重放', () => {
  const state = atAge(22, { edu: 'bachelor', job: '企业职员' });
  beginPreparation(state, 'civil');
  assert.equal(state.preparation.kind, 'civil');
  assert.equal(state.preparation.startedAt, 22);
  const failDraw = () => .999999;
  annualPreparation(state, failDraw, () => {});
  assert.equal(state.record.civilAttempts ?? 0, 0, '进入当年不能重复考试');
  state.age = 23;
  annualPreparation(state, failDraw, () => {});
  assert.equal(state.record.civilAttempts, 1);
  assert.equal(state.preparation.lastExamAge, 23);
  annualPreparation(state, failDraw, () => {});
  assert.equal(state.record.civilAttempts, 1, '同年重复结算不能多考');
  const before = freeze(structuredClone(state));
  const stopped = step(before, { action: 'leave-preparation' }).state;
  assert.equal(stopped.preparation, null);
  assert.equal(stopped.age, before.age);
  assert.equal(stopped.rngState, before.rngState);
  assert.deepEqual(stopped.inputHistory.at(-1), { age: 23, action: 'leave-preparation' });
  assert.equal(before.preparation.kind, 'civil');
  assert.deepEqual(stopped, step(JSON.parse(JSON.stringify(before)), { action: 'leave-preparation' }).state);
  state.age = 36;
  annualPreparation(state, failDraw, () => {});
  assert.equal(state.preparation, null);
  assert.equal(state.record.civilAttempts, 1);
});

test('v2 研究生连续落榜保持备考直到 26 岁，同年不重复且 27 岁退出', () => {
  const state = atAge(22, { edu: 'bachelor', job: '企业职员' });
  beginPreparation(state, 'master');
  for (let age = 23; age <= 26; age++) {
    state.age = age;
    annualPreparation(state, () => .999999, () => {});
    assert.equal(state.record.masterAttempts, age - 22);
    assert.equal(state.preparation.kind, 'master');
    assert.equal(state.preparation.startedAt, 22);
    annualPreparation(state, () => .999999, () => {});
    assert.equal(state.record.masterAttempts, age - 22);
  }
  state.age = 27;
  annualPreparation(state, () => .999999, () => {});
  assert.equal(state.preparation, null);
  assert.equal(state.record.masterAttempts, 4);
});

test('v2 负资产仍能选择免费项，不能卡在无法回答的模态内', () => {
  const state = drawCards(atAge(35, { assets: -5000 }));
  assert.equal(state.pending.id, 'midcareer');
  assert.ok(state.pending.options.some(o => !o.disabled));
  const selected = autoChoose(state);
  assert.ok(selected);
  assert.doesNotThrow(() => step(freeze(state), { choice: selected }));
});

test('v2 未进公办普高六条路实际改变去向，民办/国际课程记录家庭费用', () => {
  const routes = { private: 'private', 'repeat-junior': 'repeat', vocational: 'vocational', talent: 'talent', international: 'international', work: 'work' };
  for (const [choice, route] of Object.entries(routes)) {
    const initial = atAge(15, { edu: 'junior', wealthQ: 5, hukou: 'urban', talent: '体育', record: { junior: true, stage: true, general: false, schoolSettled: true, publicGeneral: false }, cardSeeds: [{ cardId: 'school-alternatives', atAge: 15 }] });
    const state = drawCards(initial);
    assert.equal(state.pending.id, 'school-alternatives');
    assert.ok(!state.pending.options.find(o => o.id === choice).disabled);
    const next = step(freeze(state), { choice }).state;
    assert.equal(next.age, 15);
    assert.equal(next.schoolRoute, route);
    assert.deepEqual(next.cardHistory[0], { id: 'school-alternatives', age: 15, choice });
    if (choice === 'private') assert.equal(next.educationFinance.annualSchoolFee, 18000);
    if (choice === 'international') assert.equal(next.educationFinance.annualSchoolFee, 120000);
    if (choice === 'repeat-junior') assert.equal(next.repeatJunior, true);
    if (choice === 'vocational') assert.ok(['汽修', '护理', '电商', '烹饪'].includes(next.major));
    if (choice === 'work') assert.equal(next.record.stage, false);
  }
});

test('v2 真实学费卡贷款保留入学，成人继续教育只在预算足够时扣费并安排三年后考核', () => {
  const tuition = drawCards(atAge(18, { edu: 'bachelor', wealthQ: 1, assets: 0, cardSeeds: [{ cardId: 'college-tuition', atAge: 18 }] }));
  assert.equal(tuition.pending.id, 'college-tuition');
  const loan = step(freeze(tuition), { choice: 'loan' }).state;
  assert.equal(loan.edu, 'bachelor');
  assert.equal(loan.educationFinance.tuitionOffered, true);
  assert.ok(loan.educationFinance.loanBalance > 0);
  assert.equal(loan.assets, 0);
  for (const assets of [5999, 6000]) {
    const pending = drawCards(atAge(25, { edu: 'high', assets, cardSeeds: [{ cardId: 'adult-open-university', atAge: 25 }] }));
    assert.equal(pending.pending.id, 'adult-open-university');
    const enrolled = step(freeze(pending), { choice: 'enrol' }).state;
    assert.equal(enrolled.edu, 'high', '交学费不能立刻获得文凭');
    assert.equal(enrolled.assets, assets < 6000 ? assets : 0);
    if (assets < 6000) assert.ok(!enrolled.adultEducation?.graduationAge);
    else assert.deepEqual(enrolled.adultEducation, { route: 'open-university', enrolledAt: 25, graduationAge: 28 });
  }
});
