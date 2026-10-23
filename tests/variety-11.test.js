// 交接 11：每个人的选择都不一样（Claude 实现，2026-10-23）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { CARDS, CARD_BY_ID } from '../src/content/cards/index.js'
import { materializeCard } from '../src/engine/cards.js'
import { drawBirth } from '../src/engine/birth.js'
import { probeVariety } from '../scripts/probe-variety.mjs'

const withVariants = CARDS.filter(c => c.variants)

test('变体只换文字：每个变体的选项编号都属于原卡，选项编号集合与原卡一致', () => {
  assert.ok(withVariants.length >= 40, `带变体的卡只有 ${withVariants.length} 张`)
  for (const c of withVariants) for (const v of c.variants) {
    for (const id of Object.keys(v.labels ?? {})) assert.ok(c.options.some(o => o.id === id), `${c.id}#${v.key} 选项 ${id} 不存在`)
    const s = { ...drawBirth(1), age: 30, assets: 1e6 }
    const shown = materializeCard({ ...c, variants: [{ ...v, when: () => true }] }, s)
    assert.deepEqual(shown.options.map(o => o.id), c.options.map(o => o.id), `${c.id}#${v.key} 改变了选项编号`)
  }
})

test('同一张卡的变体：标题互不相同，至少 4 个版本（只按户口或家境的卡可以用 4–5 个）', () => {
  for (const c of withVariants) {
    const titles = c.variants.map(v => typeof v.title === 'function' ? 'fn' : v.title)
    assert.equal(new Set(titles).size, titles.length, `${c.id} 有重复标题`)
    assert.ok(c.variants.length >= 4, `${c.id} 只有 ${c.variants.length} 个版本`)
  }
})

test('选项文字也跟着处境变：≥90% 的变体给了自己的选项文字，且每个这样的变体至少覆盖一半选项', () => {
  const all = withVariants.flatMap(c => c.variants.map(v => ({ c, v })))
  const labelled = all.filter(({ v }) => Object.keys(v.labels ?? {}).length > 0)
  assert.ok(labelled.length / all.length >= .9, `只有 ${labelled.length}/${all.length} 个变体换了选项文字`)
  for (const { c, v } of labelled) assert.ok(Object.keys(v.labels).length >= c.options.length / 2, `${c.id}#${v.key} 选项文字覆盖不到一半`)
})

test('变体按处境确定性选出：同一状态两次结果一样', () => {
  const c = CARD_BY_ID.house
  for (let i = 0; i < 50; i++) {
    const s = { ...drawBirth(i * 7919), age: 31, edu: ['junior', 'bachelor', '985'][i % 3], assets: 1e5 }
    assert.equal(materializeCard(c, s).variant, materializeCard(c, s).variant)
  }
})

test('五条新门槛（2000 局）：单个卡+变体 ≤40%、两人重合中位 ≤25%、Q5 vs Q1 ≤15%、卡池利用率 ≥95%、12 岁前 ≥3 张', { timeout: 600000 }, () => {
  const r = probeVariety({ n: 2000 })
  for (const x of r.checks) assert.ok(x.pass, `${x.name}：${x.value}`)
})
