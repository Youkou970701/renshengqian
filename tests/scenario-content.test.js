import test from 'node:test'
import assert from 'node:assert/strict'
import { SCENARIOS, SCENARIO_CATEGORIES } from '../src/content/scenarios.js'

const text = def => def.steps.flatMap(s => [s.title, s.body, ...s.options.flatMap(o => [o.label, o.hint])]).join('\n')
test('剧本库至少40个，八类各四个，温暖好运与挫折数量相当', () => {
  assert.ok(SCENARIOS.length >= 40)
  assert.equal(new Set(SCENARIOS.map(d => d.id)).size, SCENARIOS.length)
  for (const cat of SCENARIO_CATEGORIES) assert.ok(SCENARIOS.filter(d => d.category === cat).length >= 4, cat)
  const positive = SCENARIOS.filter(d => d.positive).length
  assert.ok(positive >= SCENARIOS.length * .45 && positive <= SCENARIOS.length * .55)
  const bodies = SCENARIOS.flatMap(d => d.steps.map(s => s.body))
  assert.equal(new Set(bodies).size, bodies.length, '不能用重复正文扩量')
})
test('每个连环剧本2至4步，选项结构与概率完整', () => {
  for (const def of SCENARIOS) {
    assert.ok(def.steps.length >= 2 && def.steps.length <= 4, def.id)
    assert.equal(typeof def.trigger, 'function')
    assert.equal(typeof def.longTerm, 'string')
    assert.ok(def.minAge <= def.maxAge)
    for (const step of def.steps) {
      assert.ok(step.title && step.body && step.options.length)
      assert.equal(new Set(step.options.map(o => o.id)).size, step.options.length)
      for (const option of step.options) {
        assert.ok(option.label && option.hint && option.effects)
        for (const value of Object.values(option.chance ?? {})) assert.ok(value >= 0 && value <= 1)
        assert.ok(Object.values(option.chance ?? {}).reduce((a,b)=>a+b,0) <= 1)
      }
    }
    for (const option of def.steps.at(-1).options) assert.ok(option.chance || option.outcome)
  }
})
test('越界江湖：选择真的有用，但不美化（随机选择模拟：无好结局、严重后果≥40%、改过≤35%）', async () => {
  // 2026-10-22 Claude 改：旧规则要求每个最终选项坏结局≥65%，会让「道歉调解」和「硬扛」结局几乎一样，选择失去意义。
  // 新规则按真实走剧本统计：没躲开（未 avoided）的人里，好结局为 0，严重后果≥40%，改过≤35%。
  const { scenarioPatch } = await import('../src/engine/scenarios.js')
  const { drawBirth } = await import('../src/engine/birth.js')
  for (const def of SCENARIOS.filter(d => ['boundary', 'jianghu'].includes(d.category))) {
    if (def.category === 'jianghu' || def.id !== 'boundary-theft') assert.ok(def.minAge >= 18, def.id)
    assert.ok(def.steps.every(st => st.options.every(o => o.exit !== 'good' && !(o.chance?.good > 0))), `${def.id} 越界不能有好结局`)
    const consequence = def.outcomeEffects.bad
    assert.ok(consequence.criminalRecord || consequence.disability || consequence.bankrupt || consequence.familyEstranged || consequence.reputationDelta <= -15, def.id)
    let crossed = 0, bad = 0, rehab = 0
    for (let i = 0; i < 400; i++) {
      let s = { ...drawBirth(9000 + i), age: Math.max(def.minAge, 20), ownsHouse: i % 2 === 0, married: true, relationship: {}, money: { debts: [], accounts: {} }, attrs: { health: 70, happy: 60, knowledge: 50, social: 50, grind: 30 }, record: {}, log: [], assets: 300000 }
      if (def.id === 'boundary-theft') s.age = 14
      let index = 0, guard = 0
      while (guard++ < 8) {
        const options = def.steps[index].options.filter(o => !o.effects?.sellHouse || s.ownsHouse)
        const pick = options[(i * 7 + index * 3 + guard) % options.length]
        s = scenarioPatch(s, def.id, index, pick.id)
        if (!s.storyActive) break
        index = s.storyActive.index
      }
      const outcome = s.scenarioHistory.at(-1).outcome
      if (outcome === 'avoided') continue
      crossed++; bad += outcome === 'bad'; rehab += outcome === 'rehabilitated'
      assert.notEqual(outcome, 'good', def.id)
    }
    if (crossed >= 40) {
      assert.ok(bad / crossed >= .4, `${def.id} 严重后果 ${(bad / crossed).toFixed(2)}`)
      assert.ok(rehab / crossed <= .35, `${def.id} 改过 ${(rehab / crossed).toFixed(2)}`)
    }
  }
})
test('手写剧本：每一步至少两个后果不同的选项（不能是模板的两个空选项）', () => {
  for (const def of SCENARIOS.filter(d => d.endTexts)) {
    const steps = def.steps.filter(st => st.options.length >= 2)
    assert.ok(steps.length >= def.steps.length - 1, `${def.id} 大多数步骤应有真正的选择`)
    for (const st of steps) {
      const sig = st.options.map(o => JSON.stringify([o.effects, o.exit ?? null, o.risk ?? 0, o.chance ?? null, o.next ?? null]))
      assert.equal(new Set(sig).size, sig.length, `${def.id}「${st.title}」的选项后果完全相同`)
    }
  }
})
test('坐牢、毒品和赌博是完整连环后果而不是一行结局', () => {
  const prison = SCENARIOS.find(d => d.id === 'boundary-prison')
  assert.equal(prison.steps.length, 4)
  assert.match(text(prison), /看守所[\s\S]*判决[\s\S]*服刑[\s\S]*探视[\s\S]*减刑[\s\S]*出狱/)
  assert.match(text(prison), /被拒/)
  const drugs = SCENARIOS.find(d => d.id === 'trap-drugs')
  assert.equal(drugs.steps.length, 3)
  assert.match(text(drugs), /引诱[\s\S]*隔离戒毒[\s\S]*复吸/)
  assert.equal(drugs.outcomeEffects.rehabilitated.addiction, false)
  const gambling = SCENARIOS.find(d => d.id === 'boundary-gambling')
  assert.equal(gambling.steps.length, 4)
  assert.match(text(gambling), /赌博[\s\S]*借款[\s\S]*出售住房[\s\S]*离婚[\s\S]*催收/)
})
test('沉重类别明确标记，未成年人只允许旁观家庭变化，没有越界行为', () => {
  for (const def of SCENARIOS) {
    assert.equal(def.heavy, Boolean(def.heavyCategory))
    if (def.heavy) assert.ok(['crime','drugs','gambling','domestic-violence','serious-illness'].includes(def.heavyCategory))
    // 未成年人：可以是受害者（被抢、车祸）或旁观者；唯一允许的越界是不涉及暴力的小偷小摸（boundary-theft），且不留刑事记录（未成年犯罪记录依法封存）。
    if (def.minAge < 18) assert.ok(['family-parents-separate', 'boundary-theft'].includes(def.id) || ['victim', 'accident'].includes(def.category), def.id)
    if (def.id === 'boundary-theft') assert.ok(!def.outcomeEffects.bad.criminalRecord && /封存/.test(Object.values(def.endTexts).join('')))
    if (/毒品|隔离戒毒|复吸/.test(text(def))) assert.equal(def.heavyCategory, 'drugs')
    if (/赌博|赌债|戒赌/.test(text(def))) assert.equal(def.heavyCategory, 'gambling')
    if (/对你动手/.test(text(def))) {
      assert.equal(def.heavyCategory, 'domestic-violence')
      assert.match(text(def), /110、12338/)
    }
  }
})
test('红线硬编码扫描：无方法、性暴力、自杀或政策评价', () => {
  const prohibited = [/作案手法|赌术|吸食方式|诈骗话术|如何行窃|如何下注|如何吸毒/, /性侵|强奸|猥亵/, /自杀|自残|轻生/, /上访|群体事件|强拆|政策评价|制度优劣/, /稳赚不赔|一本万利|黑道传奇|混社会真威风/]
  for (const def of SCENARIOS) for (const pattern of prohibited) assert.doesNotMatch(text(def), pattern, def.id)
})
