// M5 的四段日常生活。金额和概率都是游戏参数。
const o = (id, label, hint, effects = {}, extra = {}) => ({ id, label, hint, effects, ...extra })
const step = (title, body, options) => ({ title, body, options })
const fact = (text, title) => ({ text, title, shareText: text, shareTitle: title })
const adult = s => s.age >= 18

export const EXTRA_SCENARIOS = [
  {
    id: 'accident-leak', category: 'accident', positive: false, heavy: false,
    minAge: 18, maxAge: 80, trigger: adult,
    steps: [
      step('墙角湿了一大片', '一场大雨后，旧住处的墙角湿了一大片。纸箱里的冬衣也沾了水，你先把东西移开，再看怎么修。', [
        o('inspect', '请师傅查漏，先处理渗水处', '花600元检查和临时修补', { assetsDelta: -600 }, { risk: -.12 }),
        o('temporary', '先挪走物品，等雨停后再查', '花200元买收纳箱，漏点还没找全', { assetsDelta: -200, happyDelta: -1 }, { risk: .08 }),
      ]),
      step('雨停后看墙面', '雨停后，师傅和你一起看墙面留下的水印。修补范围和费用摆在面前，屋里还堆着没归位的箱子。', [
        o('repair', '按查出的漏点安排修补', '再花800元，下一场雨还要观察', { assetsDelta: -800 }, { risk: -.08, chance: { good: .1, bad: .7 } }),
        o('small', '先修眼前这块，留下应急钱', '先花300元，其他位置仍需留意', { assetsDelta: -300 }, { risk: .05, chance: { good: .1, bad: .7 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 2 }, mixed: { assetsDelta: -300, happyDelta: -1 }, bad: { assetsDelta: -1200, happyDelta: -2 } },
    endTexts: { good: '下一场雨过后，墙角没有再湿。你把冬衣晾干放回箱子，屋里终于恢复了原来的样子。', mixed: '墙面已经晾干，但还有一处小渗点。你又花300元临时处理，约好继续观察。', bad: '下一场雨还是渗了进来，你又花1200元返修和更换受潮物品。箱子仍放在高处，漏点还要继续找。' },
    endFacts: { good: fact('修好旧住处漏点，下一场雨没有再漏', '修好漏点住回干燥房间'), mixed: fact('旧住处漏水暂时处理，继续观察渗点', '临时处理漏水继续观察'), bad: fact('旧住处漏水返修，继续寻找漏点', '为旧屋漏水返修花钱') },
    longTerm: '漏水事故已经发生；结局只影响修补开销和居住烦恼。',
  },
  {
    id: 'victim-wage', category: 'victim', positive: false, heavy: false,
    minAge: 18, maxAge: 65, trigger: s => adult(s) && !s.retired && !s.business?.active && (s.income ?? 0) > 0,
    steps: [
      step('少了7000元的到账提醒', '一笔7000元工资迟迟没到账，对方只说再等等。你把这笔缺口记进生活账，房租和饭钱还得照付。', [
        o('records', '整理劳动和工资材料，询问正规求助渠道', '记下7000元缺口，先整理手头已有材料', { assetsDelta: -7000, happyDelta: -1 }, { risk: -.12 }),
        o('ask', '先直接催付，约好书面回复', '记下欠付7000元，暂时少跑腿', { assetsDelta: -7000, happyDelta: -2 }, { risk: .06 }),
      ]),
      step('回复还是一句再等等', '催付后，对方还没把钱全部付来。你翻出之前的材料和回复，需要决定接下来花多少精力继续处理。', [
        o('help', '带材料继续咨询和反映欠付情况', '花200元往返，回款仍需等实际结果', { assetsDelta: -200 }, { risk: -.1, chance: { good: .1, bad: .7 } }),
        o('follow', '保留记录，继续催付并安排眼前开销', '暂时少花费用，回款仍不确定', { happyDelta: -1 }, { risk: .03, chance: { good: .1, bad: .7 } }),
      ]),
    ],
    outcomeEffects: { good: { assetsDelta: 7000, happyDelta: 2 }, mixed: { assetsDelta: 3000, happyDelta: -1 }, bad: { happyDelta: -3 } },
    endTexts: { good: '7000元欠付工资终于到账。你把这笔缺口从生活账里划掉，跑过的路和花掉的费用仍留在这一年。', mixed: '你追回3000元，还有4000元没收到。生活账缓了一口气，欠付记录和材料还要继续保留。', bad: '7000元仍没有付来，你只能继续压缩眼前开销。材料和催付记录都留着，后续求助也还在继续。' },
    endFacts: { good: fact('追回被拖欠的7000元工资', '追回7000元欠付工资'), mixed: fact('追回3000元欠薪，还有4000元未收回', '追回3000元仍有工资未付'), bad: fact('7000元工资仍被拖欠，继续催付求助', '为7000元欠薪继续求助') },
    longTerm: '先记7000元工资缺口；回款只填回已发生的缺口，手续费用另计。',
  },
  {
    id: 'luck-craft-order', category: 'luck', positive: true, heavy: false,
    minAge: 20, maxAge: 75, trigger: adult,
    steps: [
      step('熟人问能不能接个小单', '熟人看过你做的样品，问能不能按同样要求做一批，报酬3000元。你得腾出几个晚上，也要先垫材料钱。', [
        o('decline', '这次不接，把晚上留给自己', '少一笔收入，也保住休息时间', { happyDelta: 1 }, { exit: 'avoided', outcome: 'avoided', endText: '你说明最近腾不出时间，没有接单。后来听说对方临时加了要求，你仍按自己的安排过了这几个晚上。', endFacts: { avoided: fact('拒绝3000元小订单，把晚上留给休息', '拒绝小单留住休息时间') } }),
        o('sample', '确认样品和数量，再接单', '垫400元材料，先把要求写清', { assetsDelta: -400 }, { risk: -.08 }),
        o('quick', '先答应，边做边核对', '垫250元材料，返工风险稍高', { assetsDelta: -250, happyDelta: -1 }, { risk: .08 }),
      ]),
      step('成品摆满了桌子', '你把做好的成品摆上桌，熟人提出几处调整。是否按原约定验收，仍需要双方再确认。', [
        o('check', '按约定逐项核对，完成小修改', '再花150元材料，争取一次交清', { assetsDelta: -150 }, { risk: -.05, chance: { good: .9, bad: .04 } }),
        o('stage', '先交已经确认的部分', '少一些追加投入，剩余部分继续商量', { happyDelta: 1 }, { risk: .05, chance: { good: .9, bad: .04 } }),
      ]),
    ],
    outcomeEffects: { good: { assetsDelta: 3000, happyDelta: 3, reputationDelta: 1 }, mixed: { assetsDelta: 1000, happyDelta: 1 }, bad: { happyDelta: -2 } },
    endTexts: { good: '对方验收后付了3000元，你交出了这一批成品。垫过的材料钱扣下来，这几个晚上还是换来了一笔收入。', mixed: '对方收下确认过的部分，付了1000元阶段款。余下部分取消了，你把剩余材料收回柜子。', bad: '最后没能谈拢验收，对方取消订单，你没有拿到报酬。材料和忙过的几个晚上留了下来。' },
    endFacts: { good: fact('完成一批小订单，收到3000元报酬', '完成小订单赚到3000元'), mixed: fact('交付部分成品，收到1000元阶段款', '交付部分成品赚到1000元'), bad: fact('小订单取消，没有收到报酬', '接下小单却没有拿到报酬') },
    longTerm: '报酬随实际交付结局支付，拒绝接单没有收入也没有材料支出。',
  },
  {
    id: 'warm-community-kitchen', category: 'warmth', positive: true, heavy: false,
    minAge: 18, maxAge: 80, trigger: adult,
    steps: [
      step('社区厨房缺一双手', '社区厨房周末准备做一顿饭，联络人问你能不能来帮忙。你可以亲自下厨，也可以准备一份食材，不用人人都做同一件事。', [
        o('cook', '腾出周末，去厨房一起做', '花80元交通和食材，留半天给大家', { assetsDelta: -80, happyDelta: 1 }, { risk: -.06, text: '第一次活动里，你和邻居忙完了备菜，也记住了几个人的口味。' }),
        o('ingredients', '买齐一份食材，送到厨房', '花180元，少占半天时间', { assetsDelta: -180 }, { risk: -.03, text: '你把食材送到厨房，帮忙登记数量后回去做自己的事。' }),
      ]),
      step('临时有两个人来不了', '一年后又一次聚餐前，联络人在群里说，临时有两个人来不了，菜单和人数要重新核对。你看看自己的时间，决定再搭哪一把手。', [
        o('simple', '帮忙缩小菜单，按人数分好食材', '再花40元补买，大家少赶一点', { assetsDelta: -40 }, { risk: -.03, chance: { good: .9, bad: .04 } }),
        o('delivery', '帮忙联系送餐和取餐的人', '再花60元交通费，安排会更忙些', { assetsDelta: -60, happyDelta: 1 }, { risk: .01, chance: { good: .9, bad: .04 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 4 }, mixed: { happyDelta: 1 }, bad: { happyDelta: -1 } },
    endTexts: { good: '这一顿饭按调整后的安排做成了，有人留在桌边吃，也有人把饭带回去。收拾完厨房，大家约好下次再碰面。', mixed: '人数变动后，大家只做了几份简单饭菜。规模比原来小，愿意帮忙的人还是彼此记住了。', bad: '厨房临时无法使用，这次聚餐没办成。买好的食材分给了参与者，花过的钱没有退回，群里约着以后再找时间。' },
    endFacts: { good: fact('参与社区厨房，和邻居一起做成一顿饭', '帮社区厨房做成一顿饭'), mixed: fact('参与社区厨房，和大家做了几份简餐', '帮社区厨房做出几份简餐'), bad: fact('社区厨房聚餐取消，和大家分好已买食材', '聚餐取消后分好食材') },
    longTerm: '活动有时间和食材投入；没办成只留下小额支出和失落。',
  },
]
