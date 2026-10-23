// M5：好运、家庭与身体。金额和结局概率是游戏参数，不代表现实发生率。
// 事实只记录这条路线已经完成的事；疑似、预约和等待都不提前写成确诊或办成。
const o = (id, label, hint, effects = {}, extra = {}) => ({ id, label, hint, effects, ...extra })
const step = (title, body, options) => ({ title, body, options })
const fact = (text, title, shareText = text, shareTitle = title) => ({ text, title, shareText, shareTitle })
const adult = s => s.age >= 18
const parentAlive = s => Object.values(s.parents ?? {}).some(p => p.alive !== false)
const dustJobs = ['factory', 'construction', 'welder', 'carpenter', 'electrician']

export const FAMILY_SCENARIOS = [
  {
    id: 'luck-mentor', category: 'luck', positive: true, heavy: false,
    minAge: 22, maxAge: 70, trigger: adult,
    steps: [
      step('前辈打来的电话', '以前共事的前辈给你打电话：一个小项目缺人，预算1.5万元，启动时间还没定，先问你愿不愿留一份样稿。你得挤出几个周末准备。', [
        o('decline', '谢谢他，这次不接', '保住眼下的休息和工作安排', { happyDelta: 1 }, { exit: 'avoided', outcome: 'avoided', endText: '你谢过他的推荐，没有接下项目。后来听说工期又缩短了，你把这几个周末留给了自己。', endFacts: { avoided: fact('谢过前辈，拒绝了一份赶工项目', '拒绝赶工保住几个周末') } }),
        o('scope', '约好范围，再接下初稿', '花800元整理样稿，减少返工风险', { assetsDelta: -800 }, { risk: -.12, text: '你和前辈把交付范围逐项写清，开始准备第一版。' }),
        o('promise', '先答应全部要求', '省下准备费，工期和返工风险更高', { happyDelta: -1 }, { risk: .12, text: '你一口应下所有要求，把几个周末划给了项目。' }),
      ]),
      step('意见写满了两页', '一年后项目启动，前辈把对方对样稿的意见发给你。两页批注里，有几处已超出最初约定。还没有验收，也还没有尾款。', [
        o('review', '请前辈一起核对，再修改', '再花1200元整理，成果仍需对方认可', { assetsDelta: -1200, happyDelta: -1 }, { risk: -.08, chance: { good: .82, bad: .08 }, endTexts: { good: '你们谈清了追加要求，修改稿通过验收，1.5万元报酬到账。前辈说，下次有合适的活还会想起你。', bad: '改完后，对方仍取消了项目。你没有拿到报酬，前辈陪你把这次踩过的坑列了下来。', mixed: '你交出了修改稿，对方付了5000元阶段款，剩下的工作取消了。你留下样稿，也少赚了原来盼着的钱。' } }),
        o('deliver', '按原约定交稿，不再追加', '少花时间，能否验收仍有分歧', { happyDelta: 1 }, { chance: { good: .72, bad: .13 } }),
      ]),
    ],
    outcomeEffects: { good: { assetsDelta: 15000, happyDelta: 4, reputationDelta: 3 }, bad: { happyDelta: -3 }, mixed: { assetsDelta: 5000, happyDelta: 1 } },
    endTexts: { good: '你按约定完成项目，对方验收后付了1.5万元。前辈的推荐终于变成了一份拿得出手的作品。', bad: '交付范围没有谈拢，对方取消项目，你没有拿到报酬。以后再接活，你会先问清边界。', mixed: '你交完阶段稿，拿到5000元。项目没能全部做完，周末总算回到了自己手里。' },
    endFacts: { good: fact('交付前辈推荐的项目，拿到1.5万元报酬', '交付项目拿到1.5万元'), bad: fact('前辈推荐的项目取消，投入的周末没有换来报酬', '接下项目却没拿到报酬'), mixed: fact('交付阶段稿，拿到5000元报酬', '交付阶段稿赚到5000元') },
    longTerm: '是否获得报酬取决于实际交付结果；推荐本身不等于项目验收。',
  },
  {
    id: 'luck-inheritance', category: 'luck', positive: true, heavy: false,
    minAge: 30, maxAge: 80, trigger: adult,
    steps: [
      step('相册里夹着一封信', '亲属送来长辈留下的旧相册，还有一笔预计可分给你的6万元财产。账户和继承材料仍需核对，经办处让你先核对清楚再安排开支。', [
        o('papers', '先核对材料，再谈怎么花', '跑两趟窗口，少一些遗漏', { assetsDelta: -300 }, { risk: -.12 }),
        o('wait', '先请亲属保管材料', '暂不办手续，财产还没有到手', { happyDelta: -1 }, { exit: 'mixed', outcome: 'mixed', endText: '你把相册留下，请亲属暂时保管材料。手续还没有办完，这6万元也没有进入你的账户。', endFacts: { mixed: fact('收下长辈的相册，继承手续暂未办理', '留下相册暂缓继承手续') } }),
        o('hurry', '按口头说明尽快申办', '少花准备时间，可能漏掉材料', {}, { risk: .12 }),
      ]),
      step('补材料的通知', '经办处让你确认几项财产信息，亲属也想先商量相册和旧物怎么留。办完手续之前，大家都还拿不到这笔钱。', [
        o('complete', '逐项补齐，和亲属核对', '再花500元往返，等正式结果', { assetsDelta: -500 }, { risk: -.08, chance: { good: .82, bad: .06 } }),
        o('delegate', '委托可信亲属继续跑手续', '少跑腿，仍需核实授权和进度', { assetsDelta: -1000 }, { chance: { good: .76, bad: .08 }, endTexts: { good: '你核对授权和结算后，6万元进入账户。亲属把相册送回，长辈留下的信也收进了抽屉。', bad: '部分财产信息仍有争议，手续没有办成。你留下相册，没有支取任何尚未分清的钱。', mixed: '亲属继续补材料，手续还没走完。你能确认相册已经保留，钱仍需等候结算。' } }),
      ]),
    ],
    outcomeEffects: { good: { assetsDelta: 60000, happyDelta: 2 }, bad: { happyDelta: -2 }, mixed: { happyDelta: 0 } },
    endTexts: { good: '核对和分配手续终于办完，6万元到账。你没有急着花钱，先把那封信和旧相册放在一起。', bad: '财产信息没能核清，手续暂时停下。你没有拿到这笔钱，长辈留下的相册仍在。', mixed: '有一项材料仍未补齐，财产还没有到账。你给经办处留下联系方式，回家先收好了旧相册。' },
    endFacts: { good: fact('办完继承手续，收到长辈留下的6万元', '办完手续继承6万元'), bad: fact('继承财产信息有争议，手续暂时停下', '因财产争议暂停继承手续'), mixed: fact('继续补继承材料，尚未收到财产', '继续补办继承手续') },
    longTerm: '只有手续办妥的好结局才增加财产；等待和争议不冒充继承完成。',
  },
  {
    id: 'family-parents-separate', category: 'family', positive: false, heavy: false,
    minAge: 8, maxAge: 16, trigger: s => s.age >= 8 && s.age <= 16,
    steps: [
      step('父母离婚了', '父母离婚了，两个人以后住在不同地方。吃饭时他们问你，周末愿不愿意见另一边。你不想替大人选谁对谁错。', [
        o('ask', '说清楚自己想怎样联系', '表达想念，也可以说这周不想出门', { happyDelta: -2 }, { risk: -.15 }),
        o('teacher', '先和信任的老师聊聊', '请一个大人帮你说出难处', { happyDelta: -1 }, { risk: -.1 }),
        o('quiet', '暂时不谈，给自己一点时间', '暂少争执，安排也可能悬着', { happyDelta: -3 }, { risk: .1 }),
      ]),
      step('下一次生日在哪过', '生日快到了，两个住址都打来电话。你把自己的想法告诉大人，探望和生活安排还需要他们认真商量。', [
        o('timetable', '请大人约好联系和探望时间', '不是你来裁决父母的矛盾', { happyDelta: 1 }, { risk: -.08, chance: { good: .08, bad: .72 } }),
        o('pause', '先过好学校生活，慢慢联系', '这次先不过两边都到的生日', { happyDelta: 2 }, { chance: { good: .08, bad: .72 }, endTexts: { good: '大人接受了你的节奏，没有再让你传话。你慢慢恢复联系，学校里也有人愿意听你说话。', bad: '你少了来回奔波，却仍会因父母的争执难过。老师提醒你，这不是你的错，你可以继续求助。', mixed: '这次生日没有两边都到。你保留了慢慢联系的空间，大人的矛盾仍由大人处理。' }, endFacts: { good: fact('父母离婚后按自己的节奏恢复联系', '父母离婚后慢慢恢复联系'), bad: fact('父母离婚后仍受争执影响，得到老师支持', '父母离婚后向老师求助'), mixed: fact('父母离婚后暂缓两边探望，慢慢适应', '父母离婚后暂缓两边探望') } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 3 }, bad: { happyDelta: -3 }, mixed: { happyDelta: 0 } },
    endTexts: { good: '父母把联系和探望时间约好了，也答应不再让你夹在中间传话。两个家还在，你不用假装自己一点也不难过。', bad: '父母仍会因安排争吵，探望没能照约定进行。老师陪你说话，提醒你不用为他们的离婚负责。', mixed: '生活和联系安排先定了下来，探望偶尔会变。你开始知道，自己也有说想念和说不愿意的权利。' },
    endFacts: { good: fact('父母离婚后按约分别探望', '父母离婚后按约分别探望'), bad: fact('父母离婚后探望未能按约进行，向老师求助', '父母离婚后向老师求助'), mixed: fact('父母离婚后重新适应两个住址', '父母离婚后重新适应生活') },
    longTerm: '父母离婚已经发生；孩子不承担调解责任。两幕最晚17岁结束。',
  },
  {
    id: 'family-betrayal', category: 'family', positive: false, heavy: false,
    minAge: 25, maxAge: 80, trigger: s => adult(s) && Boolean(s.partner) && s.married,
    steps: [
      step('饭桌上的坦白', '伴侣承认隐瞒了一段婚外关系。晚饭已经凉了，你还没有想好，是继续谈、先分开住，还是结束婚姻。', [
        o('space', '先分开住，找人陪自己谈谈', '花2000元安排短住，给自己空间', { assetsDelta: -2000, happyDelta: -3 }, { risk: -.12 }),
        o('talk', '约一次双方都愿意的咨询', '花1000元，能否重建信任还不确定', { assetsDelta: -1000, happyDelta: -2 }, { risk: -.08 }),
        o('silent', '这次先不谈，照常过日子', '暂不花钱，隐瞒带来的裂痕仍在', { happyDelta: -4 }, { risk: .15 }),
      ]),
      step('摆到桌上的生活账', '你们再次坐下来谈住房和日常开支。受伤的信任没有自动回来，这次需要说清楚下一步的边界。', [
        o('boundary', '说明底线，观察是否做到', '继续相处，信任还得慢慢重建', { happyDelta: -1 }, { risk: -.08, chance: { good: .1, bad: .7 } }),
        o('separate', '提出分居，讨论财产和后续', '分居不会自动办成离婚', { assetsDelta: -1500, happyDelta: -2, endMarriage: true }, { chance: { good: .08, bad: .7 }, endTexts: { good: '你们安排了分居和各自的生活账。对方接受边界，婚姻下一步仍需双方依法处理。', bad: '你提出分居后，财产和生活安排仍谈不拢。婚姻危机留了下来，你请可信的人陪着处理。', mixed: '你们先分开住，生活账分开记。是否离婚还未决定，你不用在一次谈话里作出所有决定。' }, endFacts: { good: fact('伴侣出轨后谈妥分居和生活安排', '伴侣出轨后谈妥分居安排'), bad: fact('伴侣出轨后提出分居，财产安排仍有分歧', '伴侣出轨后分居仍有分歧'), mixed: fact('伴侣出轨后分开住，婚姻去留尚未决定', '伴侣出轨后分开生活') } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 2 }, bad: { happyDelta: -4, endMarriage: true }, mixed: { happyDelta: -1 } },
    endTexts: { good: '对方开始履行谈好的边界，你也保留随时重新考虑的权利。生活暂时接上了，信任仍需慢慢建立。', bad: '几次谈话都没有落实承诺，婚姻危机加深。你不再替对方掩饰，请人陪着处理后续安排。', mixed: '你们把眼前开支和相处边界说清，信任却还没有回来。婚姻仍在继续，去留还没有定。' },
    endFacts: { good: fact('伴侣出轨后重新约定相处边界', '伴侣出轨后重订相处边界'), bad: fact('伴侣出轨后婚姻危机加深，寻求亲友支持', '伴侣出轨后面对婚姻危机'), mixed: fact('伴侣出轨后继续相处，信任尚未恢复', '伴侣出轨后继续磨合生活') },
    longTerm: '婚外关系引发的婚姻危机不会自动写成已经离婚；具体去留接婚姻选择。',
  },
  {
    id: 'family-child-school', category: 'family', positive: false, heavy: false,
    minAge: 30, maxAge: 70, trigger: s => adult(s) && (s.kids?.length ?? 0) > 0 && s.kids.some(k => s.age - k.bornAt >= 6 && s.age - k.bornAt <= 17),
    steps: [
      step('书包停在门口', '早上出门时，孩子抱着书包说不想去学校。老师告诉你，孩子最近常独自坐着，作业也有几次没交。', [
        o('listen', '请半天假，先听孩子说', '先了解发生了什么，今天不追问分数', { happyDelta: -1 }, { risk: -.15 }),
        o('school', '约老师一起了解学校情况', '花200元往返，不先替孩子下结论', { assetsDelta: -200 }, { risk: -.1 }),
        o('push', '要求先去上课，晚上再说', '眼前照常出门，孩子可能更难开口', { happyDelta: -3 }, { risk: .15 }),
      ]),
      step('接下来两周怎么过', '你和孩子、老师把近况摊开来说。问题不会因为一次谈话消失，下一步要安排学习，也要留出求助和休息的时间。', [
        o('support', '一起咨询，再调整到校安排', '花2000元寻求专业支持，不保证立刻恢复', { assetsDelta: -2000, happyDelta: -1 }, { risk: -.1, chance: { good: .1, bad: .72 } }),
        o('daily', '先约好每天聊十分钟', '少花费用，也继续与老师保持联系', { happyDelta: 1 }, { chance: { good: .08, bad: .72 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 3 }, bad: { happyDelta: -3 }, mixed: { happyDelta: 1 } },
    endTexts: { good: '孩子愿意把不开心的事说出来，也逐渐恢复了到校。你们约好继续联系老师，不再只盯着成绩问。', bad: '孩子仍难以到校，你请学校继续协调，重新安排求助。事情还没解决，你把下一次沟通约进了日历。', mixed: '孩子愿意开口了，到校仍有反复。你们先把眼前一周安排好，继续和老师联系。' },
    endFacts: { good: fact('陪不愿上学的孩子恢复到校，继续联系老师', '陪孩子重新回到学校'), bad: fact('孩子仍难到校，继续协调学校和求助安排', '陪孩子继续处理上学困难'), mixed: fact('和孩子重新开始沟通，到校仍有反复', '陪孩子重新开口沟通') },
    longTerm: '学校困难不归罪于孩子，也不把一次付费咨询写成彻底解决。',
  },
  {
    id: 'family-domestic', category: 'family', positive: false, heavy: true, heavyCategory: 'domestic-violence',
    minAge: 20, maxAge: 80, trigger: s => adult(s) && Boolean(s.partner) && s.married,
    steps: [
      step('这次不能当作没发生', '伴侣在冲突中对你动手。你先离开冲突现场，找到安全落脚处。需要紧急帮助时可联系110、12338；保护自己不必先决定是否离婚。', [
        o('police', '到安全处报警，请亲友陪同', '先处理安全和就医，婚姻去留以后再谈', { healthDelta: -2, happyDelta: -3 }, { risk: -.16 }),
        o('relative', '先去亲友家，安排就医求助', '花800元交通和就医，保留相关记录', { assetsDelta: -800, healthDelta: -2, happyDelta: -2 }, { risk: -.1 }),
      ]),
      step('住处和下一步', '亲友陪你商量住处，法律援助人员说明可咨询人身安全保护令。申请保护令不以先提起离婚诉讼为前提，安全安排也不能只靠一句道歉。', [
        o('protect', '咨询保护令，继续留在安全处', '花1200元安置和往返，结果仍需依法审查', { assetsDelta: -1200 }, { risk: -.1, chance: { good: .1, bad: .7 } }),
        o('aid', '先安排长期住处和法律援助', '花2500元安置，婚姻问题另行处理', { assetsDelta: -2500, endMarriage: true }, { risk: -.08, chance: { good: .1, bad: .7 }, endTexts: { good: '你安顿好住处，也接上法律援助。亲友继续陪着你，是否离婚由你在安全的情况下再作决定。', bad: '安置和后续事务仍有困难，你继续留在安全处，请警方、亲友和法律援助协助。伤害不是你的责任。', mixed: '你有了暂时住处，法律援助继续跟进。接下来的生活安排还需处理，你不用独自面对。' }, endFacts: { good: fact('遭遇家庭暴力后安顿住处，接上法律援助', '遭遇家庭暴力后安顿住处', '在亲友陪同下安顿住处，接上法律援助', '求助后安顿新住处'), bad: fact('遭遇家庭暴力后继续寻求安全安置和法律帮助', '遭遇家庭暴力后继续求助', '继续寻求安全安置和法律帮助', '继续求助安排安全住处'), mixed: fact('遭遇家庭暴力后找到暂住处，接受法律援助', '遭遇家庭暴力后暂住求助', '找到暂住处，接受法律援助', '找到暂住处接受援助') } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 2 }, bad: { happyDelta: -3, endMarriage: true }, mixed: { happyDelta: -1 } },
    endTexts: { good: '你咨询了保护令和法律援助，安全住处也有了安排。亲友继续陪同，后续程序按实际情况处理，是否离婚另由你决定。', bad: '保护和生活安排还没全部落实，你继续留在安全处求助。程序上的困难不该由你独自扛，更不是你造成伤害。', mixed: '你把材料交给法律援助人员，继续等候下一步。暂住处有人照应，后续保护安排仍需跟进。' },
    endFacts: { good: fact('遭遇家庭暴力后咨询保护令和法律援助', '遭遇家庭暴力后寻求保护', '咨询保护安排和法律援助，亲友继续陪同', '求助保护自己'), bad: fact('遭遇家庭暴力后继续寻求保护和安全安置', '遭遇家庭暴力后继续寻求保护', '继续寻求保护和安全安置', '继续求助保护自己'), mixed: fact('遭遇家庭暴力后递交求助材料，等待后续保护', '遭遇家庭暴力后递交求助材料', '递交求助材料，等候后续保护安排', '递交材料等候保护安排') },
    longTerm: '保护令不以离婚诉讼为前提；求助不保证一次解决，也不把后续困难归罪于受害者。',
  },
  {
    id: 'body-major', category: 'body', positive: false, heavy: true, heavyCategory: 'serious-illness',
    minAge: 35, maxAge: 80, trigger: adult,
    steps: [
      step('体检后又来一个电话', '体检中心让你去复查，报告里有一项异常。医生强调，还需要进一步检查，现在不能凭这一张报告下重病结论。', [
        o('check', '预约正规医院进一步检查', '花1500元检查，先弄清情况', { assetsDelta: -1500, happyDelta: -2 }, { risk: -.15 }),
        o('second', '带齐旧报告，再听专科意见', '花2000元复诊，避免只凭猜测作决定', { assetsDelta: -2000, happyDelta: -1 }, { risk: -.1 }),
        o('delay', '忙完这一阵再去复查', '暂不支出，检查延后带来不确定', { happyDelta: -3 }, { risk: .15 }),
      ]),
      step('和医生把方案谈清楚', '你带着复查材料来到门诊，和医生逐项核对异常。医生一边核对检查结论，一边和你商量，接下来该怎样治疗或随访。', [
        o('plan', '按检查结论安排治疗或随访', '花5000元继续检查和就医，后续按实际病情处理', { assetsDelta: -5000 }, { risk: -.08, chance: { good: .12, bad: .65 } }),
        o('support', '请家人一起核对费用和照护', '花8000元检查和安排照护，治疗仍听专业意见', { assetsDelta: -8000, happyDelta: 1 }, { risk: -.04, chance: { good: .12, bad: .65 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 3 }, bad: { assetsDelta: -20000, healthDelta: -8, happyDelta: -3, disability: .15 }, mixed: { assetsDelta: -12000, healthDelta: -3, happyDelta: -1 } },
    endTexts: { good: '进一步检查排除了这次担心的重病，医生给了随访安排。你松了一口气，按时复查仍要记在日历上。', bad: '复查确诊了重病，治疗花去额外2万元，身体也留下活动限制。你和医生安排继续治疗，家人开始分担照护。', mixed: '复查确诊了需要持续治疗的疾病，你又支出1.2万元。治疗已经开始，疗效仍需随访，没人替你许诺一次就能好。' },
    endFacts: { good: fact('复查排除重病，开始按时随访', '复查排除重病开始随访'), bad: fact('复查确诊重病，治疗后仍有活动限制', '确诊重病后继续治疗'), mixed: fact('复查确诊疾病，开始持续治疗', '确诊疾病后开始治疗') },
    longTerm: '体检异常不等于确诊重病；只有相应结局才落实疾病、费用和活动限制。',
  },
  {
    id: 'body-mood', category: 'body', positive: false, heavy: false,
    minAge: 18, maxAge: 80, trigger: adult,
    steps: [
      step('好几个星期没睡好', '你连续几周睡不好，过去喜欢的事也提不起精神。朋友问要不要陪你去正规医院，这次你没有立刻说自己没事。', [
        o('clinic', '请朋友陪着预约门诊', '花300元评估，症状需要专业判断', { assetsDelta: -300, happyDelta: -1 }, { risk: -.15 }),
        o('schedule', '调整作息，同时预约评估', '少排一件事，生活调整不能替代就诊', { happyDelta: 1 }, { risk: -.08 }),
        o('wait', '先独自撑过这段忙碌', '暂时不花钱，低落可能继续影响日常', { happyDelta: -3 }, { risk: .15 }),
      ]),
      step('把难处说进诊室', '你来到门诊，医生详细询问睡眠、情绪和日常生活。评估和后续支持都需要时间，哪一种安排适合你，要一起商量。', [
        o('follow', '按评估安排治疗和随访', '花1200元，接受专业支持', { assetsDelta: -1200 }, { risk: -.08, chance: { good: .1, bad: .7 } }),
        o('family', '请可信的人一起安排复诊', '花1800元，减少独自处理的负担', { assetsDelta: -1800, happyDelta: 1 }, { risk: -.05, chance: { good: .1, bad: .7 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 4, healthDelta: 1 }, bad: { happyDelta: -3, healthDelta: -2 }, mixed: { happyDelta: 1 } },
    endTexts: { good: '经过评估和一段治疗，睡眠和情绪逐渐改善。你继续随访，也会告诉朋友今天需要陪伴还是想休息。', bad: '低落和失眠仍影响生活，你把变化告诉医生，继续调整支持安排。这不是意志不够坚强，更不是你欠谁一个立刻好起来。', mixed: '有些晚上睡得好了，也仍会有难熬的时候。你继续接受专业支持，没再把所有事都藏着。' },
    endFacts: { good: fact('接受情绪评估和治疗，睡眠逐渐改善', '接受治疗逐渐睡好觉'), bad: fact('低落和失眠仍影响生活，继续接受专业支持', '低落时继续接受专业支持'), mixed: fact('因持续低落接受专业支持，继续随访', '因持续低落开始随访') },
    longTerm: '不把低落直接等同于某种诊断，也不把治疗效果归因于意志强弱。',
  },
  {
    id: 'body-occupational', category: 'body', positive: false, heavy: true, heavyCategory: 'serious-illness',
    minAge: 35, maxAge: 75,
    trigger: s => adult(s) && (dustJobs.includes(s.occupation?.id) || dustJobs.some(id => (s.workExperience?.[id] ?? 0) >= 3)),
    steps: [
      step('咳嗽没有自己停下', '做过粉尘较多的活后，你开始反复咳嗽。职业健康检查提示进一步评估，但检查异常还不等于已经确诊职业病。', [
        o('evaluate', '联系诊断机构，整理工作接触材料', '花600元往返，核实检查和职业史', { assetsDelta: -600, happyDelta: -1 }, { risk: -.15 }),
        o('specialist', '先去专科看咳嗽，再补工作材料', '花1000元就医，不能只凭症状下结论', { assetsDelta: -1000 }, { risk: -.08 }),
        o('postpone', '等忙季结束再作进一步检查', '暂时不花钱，症状和不确定仍在', { happyDelta: -2 }, { risk: .15 }),
      ]),
      step('诊断材料要一起看', '你把接触史、检查结果和手头的工作材料带到机构。医生一页页核对资料，安排了下一轮检查，准备再判断肺部情况和工作的关系。', [
        o('follow', '配合检查，按建议处理接触风险', '花2000元后续安排，不预先认定疾病', { assetsDelta: -2000 }, { risk: -.08, chance: { good: .12, bad: .65 } }),
        o('advice', '请家人一起听诊疗和工作建议', '花3000元，重新核对谋生和照护预算', { assetsDelta: -3000, happyDelta: 1 }, { risk: -.04, chance: { good: .12, bad: .65 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 2 }, bad: { assetsDelta: -10000, healthDelta: -7, happyDelta: -3, disability: .15 }, mixed: { assetsDelta: -3000, healthDelta: -2 } },
    endTexts: { good: '这次进一步检查没有发现肺部持续损伤，医生仍安排了随访和接触风险建议。你记下了复查日期，也开始核对工作场所的防护。', bad: '检查发现肺部损伤，你又花去1万元治疗，部分体力活动受到限制。病因和职业关系按程序核实，治疗和后续谋生都要重新安排。', mixed: '检查还不能给出明确诊断，你花了3000元继续治疗和观察。咳嗽需要复诊，病因和职业关系还要等检查与材料核实。' },
    endFacts: { good: fact('检查未见肺部持续损伤，开始随访', '检查未见肺部持续损伤'), bad: fact('检查发现肺部损伤，治疗并调整生活安排', '查出肺部损伤继续治疗'), mixed: fact('咳嗽继续检查观察，尚未明确诊断', '为咳嗽继续复查观察') },
    longTerm: '职业健康检查、疾病诊断与职业关系认定分开；未确诊路线不声称肺部受损。',
  },
  {
    id: 'body-parent', category: 'body', positive: false, heavy: true, heavyCategory: 'serious-illness',
    minAge: 35, maxAge: 75, trigger: s => adult(s) && parentAlive(s),
    steps: [
      step('急诊外的塑料椅', s => `家里打来电话，${s.parents?.father?.alive !== false && s.parents?.father ? '父亲' : '母亲'}突然入院。你赶到急诊外，等医生说明病情，手机上还有没回完的工作消息。`, [
        o('family', '先和亲属分工，再听医生说明', '拿出3000元周转，照护不全压在一人身上', { assetsDelta: -3000, happyDelta: -2 }, { risk: -.15 }),
        o('care', '请护工暂时接一班，自己对接医院', '花5000元，给工作和照护留出空当', { assetsDelta: -5000, happyDelta: -1 }, { risk: -.08 }),
        o('alone', '自己先把医院和工作都接下来', '暂时少付费用，疲惫容易累积', { healthDelta: -2, happyDelta: -3 }, { risk: .1 }),
      ]),
      step('接下来谁来医院', '住院安排和费用逐渐有了眉目，病情还要观察。亲属在群里问接下来谁来医院，你也需要为自己的吃饭睡觉留一点位置。', [
        o('rota', '列好亲属轮班和复诊分工', '再拿5000元，按病情调整照护', { assetsDelta: -5000 }, { risk: -.08, chance: { good: .1, bad: .72 } }),
        o('paid', '付费照护配合亲属轮换', '再拿8000元，减少独自值守', { assetsDelta: -8000, happyDelta: 1 }, { risk: -.05, chance: { good: .1, bad: .72 } }),
      ]),
    ],
    outcomeEffects: { good: { happyDelta: 2 }, bad: { assetsDelta: -10000, happyDelta: -4 }, mixed: { assetsDelta: -3000, happyDelta: -1 } },
    endTexts: { good: '病情稳定下来，家里按谈好的分工接续复诊和照护。你也终于能完整睡上一觉，康复仍要慢慢走。', bad: '病情反复，治疗又花去1万元，原来的照护安排还得重排。你和亲属重新排班，把自己当晚的休息也写了进去。', mixed: '病情还需观察，你又支出3000元。亲属开始轮换照护，接下来的复诊和费用仍要继续商量。' },
    endFacts: { good: fact('父母住院后病情稳定，和亲属分担照护', '照顾住院父母分好轮班'), bad: fact('父母病情反复，继续支付治疗费并重排照护', '为父母继续筹付治疗费'), mixed: fact('父母住院后继续观察，和亲属轮换照护', '陪住院父母继续观察') },
    longTerm: '父母患病不自动改写为死亡或康复；费用和照护跟随实际结局。',
  },
]
