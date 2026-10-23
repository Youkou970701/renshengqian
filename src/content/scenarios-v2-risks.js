// M5：风险、受害与意外。金额、概率及恢复时间均为游戏参数。
// 只描述选择与代价；终局事实供传记和称号使用，不把开场邀请当成既成结果。
const o = (id, label, hint, effects = {}, extra = {}) => ({ id, label, hint, effects, ...extra })
const step = (title, body, options) => ({ title, body, options })
const adult = s => s.age >= 18
const fact = (text, title, shareText = text, shareTitle = title) => ({ text, title, shareText, shareTitle })
const exit = (outcome, endText, endFacts) => ({ exit: outcome, outcome, endText, endFacts })

export const RISK_SCENARIOS = [
  {
    id: 'accident-site', category: 'accident', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 65, trigger: s => adult(s) && ['建筑工人', '工人', '农民工'].includes(s.job),
    steps: [
      step('脚手架下的等待', '你在工地摔伤了腿。同事陪你到了急诊，包工头打来电话，说先给你三千元，之后就别再找他。', [
        o('records', '先治伤，请同事帮忙找用工记录', '垫付三千元，后续还要核实工伤材料', { assetsDelta: -3000, healthDelta: -3 }, { risk: -.08 }),
        o('settle', '先收下三千元，自己回家养伤', '眼前拿到钱，诊疗和停工损失仍要自己处理', { assetsDelta: 3000, healthDelta: -5, happyDelta: -3 }, { risk: .12 }),
      ]),
      step('装着票据的文件袋', '复诊时，医生让你继续休养。窗口要核对用工关系和受伤经过，家里却已经在问下个月的房租从哪里来。', [
        o('assist', '请法律援助帮忙核对材料', '跑几趟窗口，先花一千元补齐检查', { assetsDelta: -1000, happyDelta: -1 }, { risk: -.1 }),
        o('rush', '先回工地做能站着干的活', '多挣两千元，腿还没恢复', { assetsDelta: 2000, healthDelta: -4 }, { risk: .18 }),
      ]),
      step('复查片子放上灯箱', '补偿和医疗费用还在逐项结算。医生拿出复查片子，问你接下来能否留出时间做康复。', [
        o('rehab', '拿出四千元继续康复', '恢复程度仍不确定，停工损失已经发生', { assetsDelta: -4000, happyDelta: -2 }, { chance: { good: .18, bad: .42 } }),
        o('work', '减少复诊，尽快恢复满班', '省下康复支出，可能留下活动障碍', { healthDelta: -3 }, { risk: .12, chance: { good: .1, bad: .55 } }),
      ]),
    ],
    endTexts: {
      good: '补偿结算覆盖了大部分诊疗费。你坚持做完康复，走路终于不再一瘸一拐，只是停工少挣的钱没能补回来。',
      mixed: '补偿到账后，家里终于能补上欠着的账单。你能重新上工了，腿在阴雨天仍会疼，后来挑活时多问了一句。',
      bad: '复查确认腿部留下长期活动障碍。补偿花在治疗和停工期间的生活上，原先要爬高的活再也接不了了。',
    },
    outcomeEffects: { good: { assetsDelta: 7000, healthDelta: 2 }, mixed: { assetsDelta: 4000, happyDelta: -3 }, bad: { assetsDelta: 6000, disability: .25, healthDelta: -7, happyDelta: -7 } },
    endFacts: {
      good: fact('工地受伤后完成康复，重新上工', '工地受伤后完成康复'),
      mixed: fact('工伤结算后重新上工，腿仍会疼', '工伤后带着腿痛重新上工'),
      bad: fact('工地受伤留下腿部活动障碍，无法再接爬高活', '工地受伤后留下腿部伤残'),
    },
    longTerm: '工伤恢复取决于伤情和后续选择；补偿不等于停工损失全部消失。',
  },
  {
    id: 'accident-fire', category: 'accident', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 85, trigger: adult,
    steps: [
      step('楼道里响起警报', '邻居用力敲门，楼道已经有烟。你和家人撤到了楼下，消防人员正在清点住户。钥匙、手机和证件只带出来一半。', [
        o('stay', '留在集合点，帮消防员核对住户', '先确认人都出来了，屋内损失等通知', { happyDelta: -2 }, { risk: -.1 }),
        o('search', '绕到楼后找没出来的邻居', '联系其他住户，自己也被烟呛得咳嗽', { healthDelta: -2, happyDelta: -3 }, { risk: .1 }),
      ]),
      step('门打开以后', '获准回屋后，你看见家具泡在水里，墙面熏黑。临时住处每天要一百元，维修师傅建议先检查线路。', [
        o('inspect', '先花两千元检查线路，再修必要的地方', '住处还要慢慢整理，减少返工', { assetsDelta: -2000 }, { risk: -.08 }),
        o('cheap', '先买最便宜的家具，尽快搬回去', '先花一千元，后面可能继续维修', { assetsDelta: -1000, happyDelta: -2 }, { risk: .12 }),
      ]),
      step('重新摆上餐桌', '家具清单和维修报价都摊在桌上。借住的日子比想象中长，你得决定这次要修到哪一步。', [
        o('basic', '花四千元先恢复做饭和睡觉的地方', '先过日子，别的以后补', { assetsDelta: -4000 }, { chance: { good: .18, bad: .22 } }),
        o('all', '花九千元把受损房间一起修好', '更大支出换一个完整住处', { assetsDelta: -9000, happyDelta: 2 }, { risk: -.04, chance: { good: .26, bad: .16 } }),
      ]),
    ],
    endTexts: {
      good: '维修没有再出岔子，家人一起把新桌子搬回屋里。火灾损失还在，可这一顿终于不用借别人家的厨房。',
      mixed: '你们搬回了屋里。几件旧家具再也找不到了，墙上新刷的漆旁边，还留着一小块洗不掉的黑印。',
      bad: '隐蔽处的受损管线又返修了一次，你多付了六千元，也多住了些日子临时房。人都平安，积蓄却少了一截。',
    },
    outcomeEffects: { good: { happyDelta: 3 }, mixed: { happyDelta: -2 }, bad: { assetsDelta: -6000, happyDelta: -5 } },
    endFacts: {
      good: fact('火灾后修好住处，一家人搬了回去', '火灾后修好住处搬回家'),
      mixed: fact('火灾损坏家具，重新安顿了住处', '火灾后重新安顿住处'),
      bad: fact('火灾后住处反复维修，又花了六千元', '火灾后又付6000元返修费'),
    },
    longTerm: '火灾损失落在维修和临时居住支出上，不把普通财产损失写成倾家荡产。',
  },
  {
    id: 'accident-water', category: 'accident', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 85, trigger: adult,
    steps: [
      step('岸边的呼救', '傍晚路过河边，你听见有人呼救。岸边已有几个人拿出手机，落水者离岸有一段距离，你不会水。', [
        o('call', '拨打救援电话，留在安全位置说明地点', '等待救援，不能保证马上获救', { happyDelta: -1 }, { risk: -.1 }),
        o('crowd', '先跑去叫附近的人过来', '有人帮忙，但报出准确地点晚了一点', { happyDelta: -2 }, { risk: .08 }),
      ]),
      step('救援人员到了', '专业人员开始救援，请岸边的人退后。对方家属赶来，哭着问有没有人能帮忙联系医院。', [
        o('contact', '替家属联系医院，等到交接结束', '耽误半天工作，少挣三百元', { assetsDelta: -300 }, { chance: { good: .6, bad: .14 } }),
        o('leave', '把情况交代清楚，先赶回单位', '已经完成现场信息交接，后续不再参与', { happyDelta: -2 }, { outcome: 'mixed', endTexts: { mixed: '你把看到的情况告诉了救援人员，随后赶回单位。后来经过那段河岸，你仍会停一下，却没有再听到那家人的消息。' }, endFacts: { mixed: fact('在河边呼救现场协助联系救援后离开', '在河边协助联系救援') } }),
      ]),
    ],
    endTexts: {
      good: '落水者获救后，家属终于给你打来报平安的电话。你没有下水，只是在岸边把能做的事情做完了。',
      mixed: '救援人员把人送往医院，你留到家属办完交接才回家。之后没有再收到消息，那天的呼声很久才从梦里散去。',
      bad: '救援结束后，对方仍在医院治疗。你陪家属等到深夜，第二天请了假，后来也花了一段时间才缓过来。',
    },
    outcomeEffects: { good: { happyDelta: 4, reputationDelta: 3 }, mixed: { happyDelta: -2 }, bad: { assetsDelta: -400, happyDelta: -6, healthDelta: -1 } },
    endFacts: {
      good: fact('在岸边协助救援，后来收到落水者家属报平安的电话', '协助救援后收到报平安电话'),
      mixed: fact('协助落水救援和医院交接，之后未再收到消息', '协助落水救援等到医院交接'),
      bad: fact('协助落水救援后陪家属守到深夜，花了一阵子才缓过来', '协助落水救援后陪家属等到深夜'),
    },
    longTerm: '旁观者只做能力范围内的联系和交接，不把不会水的人写成下水英雄。',
  },
  {
    id: 'victim-fraud', category: 'victim', positive: false, heavy: true, heavyCategory: 'crime',
    minAge: 18, maxAge: 80, trigger: adult,
    steps: [
      step('账户少了一笔钱', '你核对账单时发现被骗了。一万六千元已经转出，电话那头又要求你交一笔所谓处理费。', [
        o('report', '停止转账，报警并联系银行', '一万六千元已经损失，追回没有保证', { assetsDelta: -16000, happyDelta: -4 }, { risk: -.1 }),
        o('pay', '再交三千元，想把原来的钱取回来', '损失可能继续扩大', { assetsDelta: -19000, happyDelta: -6 }, { risk: .18 }),
      ]),
      step('接到一通回访电话', '案件仍在办理。有人自称能替你追回损失，要先收两千元；家人也发现了账单，问你究竟出了什么事。', [
        o('verify', '向办案单位核实，把账单给家人看', '不再交钱，承认这次损失', { happyDelta: -1 }, { risk: -.1 }),
        o('hide', '付两千元试试，暂时瞒着家人', '这笔费用也可能打水漂', { assetsDelta: -2000, reputationDelta: -3 }, { risk: .2 }),
      ]),
      step('账单得重新排', '回款仍没有确定日期。房租和生活费却要照付，你把下一季的账单排在日历上。', [
        o('budget', '缩减开支，按办案进展等候', '追回一部分或暂时没有回款', { happyDelta: -2 }, { chance: { good: .18, bad: .3 } }),
        o('borrow', '借五千元先付账单', '借款不是追回的款项，之后仍需还', { assetsDelta: 5000, debtDelta: 5000, happyDelta: -1 }, { risk: .08, chance: { good: .14, bad: .36 } }),
      ]),
    ],
    endTexts: {
      good: '办案单位通知你领回六千元。剩下的损失没有追回，但你终于能把积压的账单补上一部分。',
      mixed: '这一阶段没有追回款项。你们压缩开销把日子接下去，后来再遇到声称能追回钱的人，你先挂了电话。',
      bad: '钱暂时没追回，拖延的账单又产生了一千元额外支出。你不得不把原来留给家里的计划推迟。你是受害者，损失却仍要面对。',
    },
    outcomeEffects: { good: { assetsDelta: 6000, happyDelta: 1 }, mixed: { happyDelta: -2 }, bad: { assetsDelta: -1000, happyDelta: -7, creditDelta: -5 } },
    endFacts: {
      good: fact('遭电信诈骗后追回六千元，其余损失未追回', '遭诈骗后追回6000元', '受骗后追回六千元，其余损失未追回', '受骗后追回6000元'),
      mixed: fact('遭电信诈骗后未追回款项，只能压缩开销', '遭诈骗后压缩开销承担损失', '受骗损失积蓄，只能压缩开销', '受骗后压缩开销承担损失'),
      bad: fact('遭电信诈骗后未追回款项，还多付了一千元账单费用', '遭诈骗后未追回积蓄', '受骗后积蓄未追回，账单又添支出', '受骗后未追回积蓄'),
    },
    longTerm: '受害人的损失不会因报案自动消失；不把诈骗受害者写成有刑事记录。',
  },
  {
    id: 'victim-pyramid', category: 'victim', positive: false, heavy: true, heavyCategory: 'crime',
    minAge: 18, maxAge: 65, trigger: adult,
    steps: [
      step('不肯说清地址的工作', '旧同学约你去外地，说交九千元就能参加培训安排工作，却不肯把公司地址和劳动合同发来。', [
        o('refuse', '没有核实清楚，不交钱也不出发', '放弃这次口头承诺', {}, exit('avoided', '你没去。后来那位同学发来消息，说所谓培训一直在让人交钱，他也在想办法离开。', { avoided: fact('拒绝交钱参加无法核实的外地招工', '拒绝交钱参加不明招工') })),
        o('go', '交钱，买票去看看', '先付九千元和六百元车费', { assetsDelta: -9600, happyDelta: -2 }, { risk: .08 }),
      ]),
      step('宿舍里的要求', '到了才发现所谓工作没有岗位，每天只让人交钱、联系亲友。你想离开，对方却一再阻拦，你设法向外界求助。', [
        o('help', '联系家人和警方，说明自己需要帮助', '等待外界协助，不再追加费用', { happyDelta: -4 }, { risk: -.1 }),
        o('stall', '又交三千元，希望对方让自己走', '额外付款不保证能离开', { assetsDelta: -3000, happyDelta: -5 }, { risk: .18 }),
      ]),
      step('回家的车站', '在外界帮助下，你终于离开了那处住处。车站长椅上，家人问你要不要先回家休息，预付费用还没有退。', [
        o('home', '先回家，配合提供已知情况', '花六百元车费，让亲友陪一阵', { assetsDelta: -600, happyDelta: -2 }, { chance: { good: .12, bad: .26 } }),
        o('alone', '自己租房，尽快在当地重新找工', '再花两千元，独自承担压力', { assetsDelta: -2000, happyDelta: -4 }, { risk: .12, chance: { good: .08, bad: .35 } }),
      ]),
    ],
    endTexts: {
      avoided: '这次招工没有变成你的旅程。',
      good: '你回到能安心睡觉的住处，后来退回了两千元。剩下的钱没有追回，你重新找工作时终于敢把这段经历告诉亲友。',
      mixed: '预付的钱没有追回。你慢慢恢复工作，手机里那位同学的邀约再来时，你不再回答。',
      bad: '钱没追回，长时间的恐惧还留着。你又花两千元接受咨询和休养，暂时推迟了找工。家人陪着，也不能让这段日子立刻过去。',
    },
    outcomeEffects: { avoided: {}, good: { assetsDelta: 2000, happyDelta: 2 }, mixed: { happyDelta: -3 }, bad: { assetsDelta: -2000, happyDelta: -8, healthDelta: -3 } },
    endFacts: {
      avoided: fact('拒绝交钱参加无法核实的外地招工', '拒绝交钱参加不明招工'),
      good: fact('误入传销招工后获助离开，追回两千元', '获助离开传销招工追回2000元', '外地求职受骗后获助离开，追回两千元', '外地求职受骗后追回2000元'),
      mixed: fact('误入传销招工后获助离开，预付费用未追回', '获助离开传销招工但未追回费用', '外地求职受骗后获助离开，预付费用未追回', '外地求职受骗后未追回费用'),
      bad: fact('误入传销招工后获助离开，花钱休养并推迟找工', '离开传销招工后花钱休养', '外地求职受骗后获助离开，花钱休养并推迟找工', '外地求职受骗后花钱休养'),
    },
    longTerm: '写受害人的脱离和后续损失，不描述组织控制人的方法，不把受害人写成犯罪者。',
  },
  {
    id: 'jianghu-esport', category: 'jianghu', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 28, trigger: adult,
    steps: [
      step('青训邀请到了', '一家游戏青训营给你发来试训邀请，要先交一万二千元。对方只保证训练，不保证入队，接下来几个休息日都得留给训练。', [
        o('stay', '不交钱，留在原来的工作', '放下这次不确定的试训机会', { happyDelta: -1 }, exit('avoided', '你没有报名。几个月后青训营换了批学员，那封邀请被你留在了聊天记录里。', { avoided: fact('放弃收费青训，留在原来的工作', '放弃收费青训保住工作') })),
        o('train', '利用休息日试训，付清训练费', '先花一万二千元，名额没有保证', { assetsDelta: -12000, happyDelta: 2 }, { risk: .04 }),
      ]),
      step('下一期还要交费', '首轮没有进队。教练说再练一期也许有机会，需要再交一万元。家人问你什么时候回来，语气比以前急。', [
        o('limit', '只练已经交费的课程，跟家人说明进度', '不追加费用，接受可能落选', { happyDelta: -3 }, { risk: -.08 }),
        o('more', '再付一万元，仍说自己快要入队', '钱继续花，家人听到的却不是实情', { assetsDelta: -10000, reputationDelta: -5 }, { risk: .12 }),
      ]),
      step('最后一张名单', '最终名单里没有你。宿舍即将清退，家人也看到了全部缴费记录，你需要收拾行李重新找工作。', [
        o('face', '回去说明损失，边找工边还人情', '承认这条路没有走通，关系未必能修好', { assetsDelta: -1000, happyDelta: -5 }, { chance: { good: 0, bad: .82, rehabilitated: .08 } }),
        o('insist', '不回去，另租房再找机会', '又花三千元，和家人继续争执', { assetsDelta: -3000, happyDelta: -7 }, { risk: .1, chance: { good: 0, bad: .84, rehabilitated: .06 } }),
      ]),
    ],
    endTexts: {
      avoided: '青训这条路在交费以前停下了。',
      bad: '你没能进入队伍，交出去的钱也退不回来。家人不愿再替你承担生活费，你们在一次争执后断了来往。搬走那天，训练服还塞在行李箱最底下。',
      mixed: '你搬离了青训宿舍，重新投简历。钱没退回来，家人仍会接电话，只是不再问比赛打得怎么样。',
      rehabilitated: '你停止追加训练费，重新找到了谋生的活。家里肯重新说话了，花掉的训练费和空出来的工作经历仍要自己承担。',
    },
    outcomeEffects: { avoided: {}, bad: { familyEstranged: true, happyDelta: -10 }, mixed: { happyDelta: -5 }, rehabilitated: { happyDelta: 1 } },
    endFacts: {
      avoided: fact('放弃收费青训，留在原来的工作', '放弃收费青训保住工作'),
      bad: fact('付费青训落选，损失费用并与家人断了来往', '青训落选赔钱后与家人断联'),
      mixed: fact('付费青训落选，损失费用后重新找工作', '青训落选后赔钱重新找工'),
      rehabilitated: fact('青训落选后停止追加费用，重新谋生并与家人恢复联系', '青训落选后停止交费重新谋生'),
    },
    longTerm: '付费青训落选可能造成积蓄与家庭支持的损失，合法电竞试训不产生刑事记录。',
  },
  {
    id: 'jianghu-south', category: 'jianghu', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 55, trigger: adult,
    steps: [
      step('南下的夜班车', '熟人说南方有工地急招人，工资月底结，却拿不出书面用工信息。今晚的车票六百元，他催你别错过。', [
        o('check', '没核实岗位，先不跟他走', '放弃这趟仓促的招工', {}, exit('avoided', '你没上车。后来熟人回来说，那处工地的工资拖了很久，连介绍人也联系不上。', { avoided: fact('没有跟随无法核实岗位的熟人南下', '拒绝仓促南下招工') })),
        o('go', '买票跟他去，到了再说', '付六百元，岗位和工资都未核实', { assetsDelta: -600, happyDelta: -1 }, { risk: .08 }),
      ]),
      step('宿舍里的欠条', '住进宿舍几个月后，工资只拿到一小部分，介绍人已经失联。你连着搬重物，手腕肿了，工头还在催下一班。', [
        o('stop', '停止重活，和工友一起核对欠薪记录', '花两千元看伤，讨薪没有保证', { assetsDelta: -2000, healthDelta: -3 }, { risk: -.08 }),
        o('overtime', '继续上满班，希望先拿到工资', '少休息，手伤可能加重', { healthDelta: -7, happyDelta: -3 }, { risk: .14 }),
      ]),
      step('回程票捏在手里', '工资还没结清。医生说手腕需要休养，欠条和检查单装在同一个袋子里，你要决定下一步。', [
        o('rest', '先回家休养，继续依法反映欠薪', '付六百元车费，伤情和回款都不确定', { assetsDelta: -600, happyDelta: -4 }, { chance: { good: 0, bad: .82, rehabilitated: .08 } }),
        o('next', '留在当地，再找一份体力活顶着', '房租一千元，手伤仍没有养好', { assetsDelta: -1000, healthDelta: -4 }, { risk: .12, chance: { good: 0, bad: .84, rehabilitated: .06 } }),
      ]),
    ],
    endTexts: {
      avoided: '这趟夜班车没有带走你。',
      bad: '欠薪只追回一部分，手腕却留下了长期活动障碍。以后再有人找你搬重货，你只能摇头。那趟车的钱不多，后面的代价很长。',
      mixed: '你拿着欠条离开，追回了两千元。手腕缓过来一些，原先欠着的钱仍没全部结清。',
      rehabilitated: '你停下了超出身体承受范围的活，按安排休养，后来改找轻一些的工种。欠薪和休养损失没有一笔勾销。',
    },
    outcomeEffects: { avoided: {}, bad: { disability: .25, healthDelta: -6, happyDelta: -8 }, mixed: { assetsDelta: 2000, happyDelta: -3 }, rehabilitated: { healthDelta: 2, happyDelta: -1 } },
    endFacts: {
      avoided: fact('没有跟随无法核实岗位的熟人南下', '拒绝仓促南下招工'),
      bad: fact('南下务工遭遇欠薪，手腕伤后留下活动障碍', '南下遭欠薪又留下手腕伤残'),
      mixed: fact('南下务工遭遇欠薪，追回两千元后离开', '南下遭欠薪后追回2000元'),
      rehabilitated: fact('南下遭欠薪和手伤后停下重活，休养后另找轻工', '南下受伤后停下重活另谋生计'),
    },
    longTerm: '欠薪和过度体力劳动留下收入与身体损失；工友寻求帮助不承担刑事后果。',
  },
  {
    id: 'jianghu-apprentice', category: 'jianghu', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 50, trigger: adult,
    steps: [
      step('手艺班的口头承诺', '培训班说交一万八千元学三个月，毕业就安排工作。合同却只写了授课，母亲问要不要从家里拿钱。', [
        o('decline', '不交这笔钱，另找能核实的师傅', '这次包安排工作的承诺没有写进合同', {}, exit('avoided', '你没报名。半年后有人在同学群里问退款，所谓包安排工作一直没有兑现。', { avoided: fact('没有报名口头保证就业的收费培训班', '拒绝18000元口头就业培训') })),
        o('pay', '付一万八千元，先把手艺学了', '授课不等于就业，先花掉这笔积蓄', { assetsDelta: -18000, happyDelta: 1 }, { risk: .06 }),
      ]),
      step('实习还得再交钱', '课程结束，你只学会了一些基础。培训班说要再交六千元才能推荐实习，家里等着你开始挣钱。', [
        o('refuse', '不追加费用，向家里说明真实情况', '承认工作没有安排下来', { happyDelta: -4 }, { risk: -.08 }),
        o('extra', '再付六千元，告诉家里快上班了', '费用增加，承诺仍没有落到合同上', { assetsDelta: -6000, reputationDelta: -5 }, { risk: .14 }),
      ]),
      step('空下来的工具箱', '承诺的岗位没有来。你带着工具箱去招工点，对方说还得从基础做起；家里终于知道了全部花费。', [
        o('start', '从基础工学起，承认培训损失', '收入不能立刻补上费用，家人未必谅解', { happyDelta: -4 }, { chance: { good: 0, bad: .82, rehabilitated: .08 } }),
        o('fight', '继续争执，要求家里再出生活费', '多花两千元，关系继续恶化', { assetsDelta: -2000, happyDelta: -6 }, { risk: .12, chance: { good: 0, bad: .84, rehabilitated: .06 } }),
      ]),
    ],
    endTexts: {
      avoided: '这笔培训费没有交出去。',
      bad: '费用没退，工作也没安排上。你和家里为这些钱吵到不再往来，后来只能自己付房租、从头找活。',
      mixed: '你从基础工重新学起。培训费暂时没有退回，家里不再催你说出一个好听的岗位名称，只等你按时回个电话。',
      rehabilitated: '你不再为新的口头承诺交钱，踏实从基础做起。家人慢慢恢复联系，那笔学费却没有因此回来。',
    },
    outcomeEffects: { avoided: {}, bad: { familyEstranged: true, happyDelta: -10 }, mixed: { happyDelta: -4 }, rehabilitated: { happyDelta: 1 } },
    endFacts: {
      avoided: fact('没有报名口头保证就业的收费培训班', '拒绝18000元口头就业培训'),
      bad: fact('培训就业承诺落空，损失学费后与家人断了来往', '培训没换来工作又与家人断联'),
      mixed: fact('培训就业承诺落空，损失学费后从基础工做起', '赔掉培训费后从基础工做起'),
      rehabilitated: fact('培训失利后停止追加费用，从基础学起并与家人恢复联系', '培训失利后停止交费重新学工'),
    },
    longTerm: '有问题的培训承诺造成费用和家庭信任损失，不把正常学手艺写成犯罪。',
  },
  {
    id: 'trap-loan', category: 'trap', positive: false, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 75, trigger: adult,
    steps: [
      step('月末多出来的借款额度', '手机里又弹出消费借款额度。你想换一台六千元的手机，房租和下个月的生活费却还没留出来。', [
        o('no', '不借，旧手机再用一年', '压下这次消费', {}, exit('avoided', '你关掉页面。月底交完房租，账户里还留着能过日子的钱。', { avoided: fact('放弃借钱换六千元手机', '放弃借钱换6000元手机') })),
        o('borrow', '借六千元换手机', '手机买了，六千元借款开始计息', { debtDelta: 6000, happyDelta: 2 }, { risk: .08 }),
      ]),
      step('几张账单挤在同一天', '利息和分期挤到一起，你才发现自己已有几笔别的消费借款。本月还款开始挤占房租和伙食。', [
        o('list', '把欠款列清楚，压缩消费', '拿三千元补上眼前账单，不增加新借款', { assetsDelta: -3000, happyDelta: -3 }, { risk: -.12 }),
        o('roll', '再借一万二千元顶住眼前', '手里多了现金，欠款也增加', { assetsDelta: 12000, debtDelta: 12000, creditDelta: -4 }, { risk: .2 }),
      ]),
      step('工资还没到，账单先到了', '你把工资到账日和还款日圈了出来。家里愿意陪你核对账目，但不能替你把欠款清零。', [
        o('plan', '和债权方核对账目，按能力安排偿还', '支出要长期收紧，是否逾期仍看实际收支', { happyDelta: -3 }, { chance: { good: .15, bad: .32 } }),
        o('ignore', '暂时不看通知，等下一笔工资', '拖延可能产生额外费用和信用影响', { happyDelta: -5 }, { risk: .18, chance: { good: .06, bad: .46 } }),
      ]),
    ],
    endTexts: {
      avoided: '这笔消费借款没有发生。',
      good: '你按收支把还款安排了下来，没有继续增加消费借款。欠款仍在账上，生活里却终于有了一条不再借新的规矩。',
      mixed: '你停下了额外消费。每个月工资还没捂热就要先还钱，旧账没有消失，只是没有再往上堆。',
      bad: '连续逾期产生了额外费用，信用也受了影响。你又欠下一万元，亲友听到借钱便沉默，手机仍是当初那台手机。',
    },
    outcomeEffects: { avoided: {}, good: { happyDelta: 1 }, mixed: { happyDelta: -2 }, bad: { debtDelta: 10000, creditDelta: -20, happyDelta: -7 } },
    endFacts: {
      avoided: fact('放弃借钱换六千元手机', '放弃借钱换6000元手机'),
      good: fact('消费借款后停止新增借款，开始按收支偿还', '消费借款后停止新增借款'),
      mixed: fact('消费借款挤占日常开支，只能缩减消费', '借款后缩减消费承担旧账'),
      bad: fact('消费借款连续逾期，债务和信用压力加重', '消费借款逾期后又欠10000元'),
    },
    longTerm: '消费借款进入真实债务账目，不用叙述把债务自动清零。',
  },
  {
    id: 'trap-investment', category: 'trap', positive: false, heavy: true, heavyCategory: 'crime',
    minAge: 18, maxAge: 85, trigger: adult,
    steps: [
      step('那份高回报的邀请', '熟人推荐一款投资，说投入三万元很快就能见到回报。你查不到清楚的资金去向，对方还在催最后一个名额。', [
        o('no', '不投，留着这三万元', '放弃没有核实的回报承诺', {}, exit('avoided', '你没转账。后来熟人问你有没有认识的律师，那款产品已经无法提现。', { avoided: fact('拒绝投入三万元购买无法核实的投资产品', '拒绝投入30000元不明投资', '拒绝投入三万元购买无法核实的投资产品', '拒绝投入30000元不明投资') })),
        o('buy', '投入三万元', '这笔资金可能无法取回', { assetsDelta: -30000, happyDelta: 1 }, { risk: .08 }),
      ]),
      step('无法提现的页面', '提现申请卡在处理中，客服始终没有确定日期。群里有人说再交五千元就能优先办理，也有人开始登记损失。', [
        o('register', '停止追加，核实信息并登记损失', '原先投入仍不能取回', { happyDelta: -4 }, { risk: -.1 }),
        o('priority', '再交五千元，赌能排到前面', '新增费用也可能损失', { assetsDelta: -5000, happyDelta: -3 }, { risk: .18 }),
      ]),
      step('没法兑现的装修计划', '原定的装修预算已经不在手里。回款还要等，你必须先决定生活中哪些安排要推迟。', [
        o('wait', '取消装修，按正式通知等候处理', '不会自动补回资金，但不再新增投入', { happyDelta: -3 }, { chance: { good: .16, bad: .34 } }),
        o('bridge', '借八千元完成最必要的修缮', '借款和投资损失是两笔账', { assetsDelta: 8000, debtDelta: 8000, happyDelta: -1 }, { risk: .08, chance: { good: .12, bad: .42 } }),
      ]),
    ],
    endTexts: {
      avoided: '那三万元没有转出去。',
      good: '登记后，你拿回了八千元。其余资金仍未兑付，装修只能缩减，至少有一部分钱回到了自己手里。',
      mixed: '这一阶段没有回款。你把装修计划收进抽屉，先顾眼前生活，原来那笔投入仍记在损失清单上。',
      bad: '资金一直没有回来，账单却没有停。你又花了两千元处理原有安排的违约费用，家人开始重新核对所有大额支出。',
    },
    outcomeEffects: { avoided: {}, good: { assetsDelta: 8000, happyDelta: 1 }, mixed: { happyDelta: -3 }, bad: { assetsDelta: -2000, happyDelta: -8, creditDelta: -4 } },
    endFacts: {
      avoided: fact('拒绝投入三万元购买无法核实的投资产品', '拒绝投入30000元不明投资'),
      good: fact('投资无法兑付后追回八千元，其余仍未回款', '投资未兑付后追回8000元'),
      mixed: fact('投资无法兑付，取消了原定装修', '投资未兑付后取消装修'),
      bad: fact('投资无法兑付，还多付两千元原计划违约费用', '投资未兑付又付2000元违约费'),
    },
    longTerm: '投入金额真实扣除；受损登记不保证回款，也不提供新的投资承诺。',
  },
  {
    id: 'trap-parents', category: 'trap', positive: false, heavy: false, heavyCategory: null,
    minAge: 30, maxAge: 80, trigger: s => s.age >= 30,
    steps: [
      step('父母藏起来的收据', '你从抽屉里看到八千元收据。父母买了一批声称有神奇疗效的产品，销售人员又在催下一批，他们怕你生气一直没说。', [
        o('talk', '先听他们讲清楚，再陪去正规医院', '补八千元家用，另花五百元检查', { assetsDelta: -8500, happyDelta: -1 }, { risk: -.12 }),
        o('scold', '责怪他们不该乱买，把产品收进柜子', '先出八千元补上家用，争执没有解决病情', { assetsDelta: -8000, happyDelta: -4 }, { risk: .16 }),
      ]),
      step('还没拆封的纸箱', '销售又打来电话，说下一批要先付款。父母看着纸箱，问你是不是以后生病也不能再自己作主。', [
        o('refund', '一起核对收据，停止追加并申请退货', '退款未必全部成功，不再交新的费用', { happyDelta: -1 }, { risk: -.08 }),
        o('extra', '给三千元让他们自己再试一次', '多花钱也不能代替治疗', { assetsDelta: -3000, happyDelta: -2 }, { risk: .18 }),
      ]),
      step('把下次复诊写在日历上', '退货回复还在等，父母的身体也需要继续检查。你想和他们约定以后遇到大笔消费怎么商量。', [
        o('together', '陪着复诊，约好先一起核实', '再花五百元，尊重他们也要把钱说明白', { assetsDelta: -500, happyDelta: 1 }, { chance: { good: .5, bad: .2 } }),
        o('control', '只查消费账单，不再谈买东西的原因', '少花时间，矛盾可能继续藏起来', { happyDelta: -3 }, { risk: .12, chance: { good: .22, bad: .34 } }),
      ]),
    ],
    endTexts: {
      good: '退货拿回了四千元，父母也同意按医生安排复诊。你们没有再为那批产品交钱，以后收据不必藏在抽屉最里面。',
      mixed: '钱只退回一千元。你们约好先顾正规检查，损失仍在，至少新的订单停下了。',
      bad: '款项没有退回，父母把你的追问听成了责怪。你又拿出两千元补家用，他们却越来越少主动谈自己的事。',
    },
    outcomeEffects: { good: { assetsDelta: 4000, happyDelta: 3 }, mixed: { assetsDelta: 1000, happyDelta: -1 }, bad: { assetsDelta: -2000, happyDelta: -7 } },
    endFacts: {
      good: fact('处理父母保健品损失，退回四千元并陪着复诊', '替父母退回4000元并陪着复诊'),
      mixed: fact('处理父母保健品损失，退回一千元后停止追加', '替父母退回1000元并停止追加'),
      bad: fact('父母保健品款未退回，补家用后关系仍紧张', '替父母补家用仍未退回货款'),
    },
    longTerm: '保健品纠纷留下家庭支出和沟通后果，不替代正规医疗，也不把老人写成笑话。',
  },
  {
    id: 'trap-drugs', category: 'trap', positive: false, heavy: true, heavyCategory: 'drugs',
    minAge: 18, maxAge: 60, trigger: adult,
    steps: [
      step('被引诱的那次聚会', '聚会上，有人诱导你接触毒品，说不会有事。你看见朋友把门关上，手机里还有家人问你几点回家的消息。', [
        o('leave', '拒绝，离开聚会', '不接触，把自己先带回安全的地方', { happyDelta: -1 }, exit('avoided', '你离开了。后来有人告诉你，那次聚会的参与者已经有人开始戒毒。你把那个邀约群退出了。', { avoided: fact('拒绝接触毒品，离开那次聚会', '拒绝毒品后离开聚会', '拒绝危险邀约，离开那次聚会', '拒绝危险邀约后离开聚会') })),
        o('accept', '听信对方，留在聚会', '接触后依赖和健康损害可能接踵而来', { addiction: true, healthDelta: -8, happyDelta: -5 }, { risk: .14, text: '你听信了那番话。此后的睡眠和工作开始出问题，家人发现异常时，你已经离不开它。' }),
      ]),
      step('戒毒安排摆在眼前', '家人陪你了解戒毒治疗。自愿治疗、社区戒毒与强制隔离戒毒各有条件；符合强制隔离法定条件时，由公安机关依法作出决定，不是每个求助的人都会被强制隔离。', [
        o('treat', '主动接受正规治疗和后续安排', '花八千元诊疗与康复，是否隔离依实际依法决定', { assetsDelta: -8000, healthDelta: -2, happyDelta: -3 }, { risk: -.14, delay: 2, text: '你开始接受戒毒治疗。接下来的两年，家人跟你一起面对复诊、康复和已经发生的损失。' }),
        o('refuse', '拖延治疗，觉得自己能扛过去', '依赖继续，后续仍可能依法进入隔离戒毒', { assetsDelta: -4000, healthDelta: -8, happyDelta: -5 }, { risk: .2, delay: 2, text: '你拖延了一阵，健康和工作继续受影响，后来仍接受了依法安排的戒毒治疗。两年里，家人一直等着你重新安顿生活。' }),
      ]),
      step('回到日常后的考验', '两年后，旧交再次联系。你正在重新安排生活，专业人员提醒：戒断后的随访、复吸风险和家人的支持都要继续面对。', [
        o('support', '远离旧圈子，坚持随访和康复', '再花三千元，戒断仍不能靠一次保证', { assetsDelta: -3000, happyDelta: -2 }, { chance: { good: 0, bad: .45, rehabilitated: .25 } }),
        o('contact', '又去见旧交，减少随访', '省下眼前支出，复吸风险上升', { happyDelta: -4 }, { risk: .16, chance: { good: 0, bad: .58, rehabilitated: .1 } }),
      ]),
    ],
    endTexts: {
      avoided: '这次诱导在你离开时停下了。',
      rehabilitated: '这段随访期间，你没有复吸，依赖状态得到缓解。已经花掉的钱、受损的身体和中断的生活仍需修补，你继续按安排复诊。',
      mixed: '你没有把日常完全接回来，仍在接受治疗和康复支持。家人愿意陪着，但下一次复诊和生活账单还摆在眼前。',
      bad: '你再次复吸，健康进一步受损，不得不重新接受治疗，是否采取强制隔离措施仍须依法决定。病历越积越厚，原来能做完的活也常常做不动了。',
    },
    outcomeEffects: { avoided: {}, rehabilitated: { addiction: false, happyDelta: 2 }, mixed: { addiction: true, happyDelta: -4 }, bad: { addiction: true, healthDelta: -12, happyDelta: -10, assetsDelta: -8000 } },
    endFacts: {
      avoided: fact('拒绝接触毒品，离开那次聚会', '拒绝毒品后离开聚会', '拒绝危险邀约，离开那次聚会', '拒绝危险邀约后离开聚会'),
      rehabilitated: fact('接受戒毒治疗后，在这段随访期间没有复吸', '戒毒治疗后随访期间未复吸', '接受治疗和持续随访，依赖状态缓解', '持续治疗随访后缓解依赖'),
      mixed: fact('因药物依赖继续接受戒毒治疗和康复支持', '继续接受戒毒治疗和康复', '因依赖问题继续接受治疗和康复支持', '因依赖继续接受治疗康复'),
      bad: fact('戒毒后再次复吸，健康恶化并重新接受治疗', '戒毒后复吸并重新接受治疗', '健康恶化后重新接受治疗和康复支持', '健康恶化后重新接受治疗'),
    },
    longTerm: '药物依赖造成健康和生活损失；治疗依法分路径，不因依赖自动留下刑事记录。',
  },
  {
    id: 'luck-prize', category: 'luck', positive: true, heavy: false, heavyCategory: null,
    minAge: 18, maxAge: 85, trigger: adult,
    steps: [
      step('核对了三遍的兑奖通知', '偶尔买的一张彩票中了小奖，核对后可领一万二千元。这不是能改变一切的钱，却足够让你认真想一想。', [
        o('save', '按正规渠道核实，先不告诉太多人', '把这笔意外收入当作应急钱', { happyDelta: 2 }, { risk: -.08 }),
        o('announce', '在亲友群里发消息，答应请客', '分享喜悦，也多了些人情期待', { happyDelta: 4 }, { risk: .1 }),
      ]),
      step('奖金到账那天', '一万二千元奖金到账。家人说能补上拖着的家用，有亲友问能否请大家吃一顿，你得给这笔钱定个去处。', [
        o('reserve', '留一万元应急，用两千元改善家用', '实际留下的一万元，不是未来中奖的本钱', { assetsDelta: 10000, happyDelta: 2 }, { chance: { good: .9, bad: .02 } }),
        o('dinner', '花五千元请客，留下七千元', '热闹一场，手里能留的钱少一些', { assetsDelta: 7000, happyDelta: 4 }, { risk: .06, chance: { good: .85, bad: .05 } }),
      ]),
    ],
    endTexts: {
      good: '奖金按你的安排留下来了一部分。后来遇到一笔临时开销，你不用立刻开口借钱，也没有把偶然中奖当成固定收入。',
      mixed: '钱到账后，人情和家用很快就有了去处。仍有一部分留在手里，这次好运只够把一阵日子过得松一点。',
      bad: '亲友对这笔奖金的期待引起争执，你又拿出三千元处理临时家用。钱是真的收到过，也确实没有传说中那么经花。',
    },
    outcomeEffects: { good: { happyDelta: 3 }, mixed: { happyDelta: 1 }, bad: { assetsDelta: -3000, happyDelta: -4 } },
    endFacts: {
      good: fact('领到一万二千元彩票奖金，安排家用后留下一笔钱', '领到12000元奖金并留作家用'),
      mixed: fact('领到一万二千元彩票奖金，花在家用和人情上', '领到12000元奖金后安排家用'),
      bad: fact('领到一万二千元彩票奖金后，因用钱安排与亲友争执', '领12000元奖金后为用钱起争执'),
    },
    longTerm: '彩票只是一次意外收入，不给继续投注的鼓励；到账与支出分开记账。',
  },
]

export default RISK_SCENARIOS
