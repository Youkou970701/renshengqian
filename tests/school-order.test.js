import test from 'node:test';
import assert from 'node:assert/strict';
import { drawBirth } from '../src/engine/birth.js';
import { step } from '../src/engine/life.js';
import { autoChoose } from '../src/engine/decisions.js';

test('09a: 3000 局真实逐步人生中，替代路线卡只在真实中考结算且公办未录取后出现', t => {
  let schoolAnswers = 0, alternativeCards = 0;
  for (let i = 0; i < 3000; i++) {
    const birth = drawBirth((Math.imul(i, 2654435761) + 123456789) >>> 0);
    // Start from the real birth, without injecting ages, route flags, cards or
    // admission metadata. The independent boolean proves school was answered.
    let state = { ...birth, capture: false }, schoolAnswered = false, guard = 0;
    while (state.alive) {
      assert.ok(++guard <= 1000, `人生未终止: ${birth.id}`);
      const pending = state.pending;
      if (pending?.id === 'school-alternatives') {
        alternativeCards++;
        assert.equal(schoolAnswered, true, `${birth.id}/${state.age}: 替代路线卡先于真实中考抉择`);
        assert.equal(state.record.schoolSettled, true, `${birth.id}/${state.age}: 中考未结算`);
        assert.equal(state.record.publicGeneral, false, `${birth.id}/${state.age}: 未证实公办普高落选`);
      }
      const choice = pending ? autoChoose(state) : null;
      if (pending) assert.ok(pending.options.some(o => o.id === choice && !o.disabled), `${birth.id}/${pending.id}: 自动选择必须有效`);
      const next = step(state, pending ? { choice } : {}).state;
      if (pending?.id === 'school') {
        schoolAnswers++;
        schoolAnswered = true;
        assert.equal(next.record.schoolSettled, true, `${birth.id}: 中考选择后必须留下结算记录`);
      }
      state = next;
    }
  }
  // Coverage assertions have no exact route count or preselected outcome.
  assert.ok(schoolAnswers > 0, '必须真实走过中考节点');
  assert.ok(alternativeCards > 0, '必须真实观察到替代路线，不能空扫描通过');
  t.diagnostic(JSON.stringify({ lives: 3000, schoolAnswers, alternativeCards, earlyAlternatives: 0 }));
});
