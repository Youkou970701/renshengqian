import {RISK_SCENARIOS} from './scenarios-v2-risks.js';
import {FAMILY_SCENARIOS} from './scenarios-v2-family.js';
import {WARM_SCENARIOS} from './scenarios-v2-warmth.js';
import {EXTRA_SCENARIOS} from './scenarios-v2-extra.js';
// 手写的分支剧本（2026-10-22，Claude 接手 M3 时重写）。
// 规则：每一步至少两个后果不同的选项；能躲开的事要给「躲开」的出口；选择通过 risk 改变最后的结局概率。
// 红线：只写选择和后果，不写作案、赌博、逃避检查的方法；越界类剧本坏结局占多数；不出现上访、强拆冲突。
// 金额与概率都是游戏参数，不是现实发生率，也不是处置指南。

const o = (id, label, hint, effects = {}, extra = {}) => ({ id, label, hint, effects, ...extra })
const step = (title, body, options) => ({ title, body, options })
const adult = s => s.age >= 18
// 三幕各隔一年，12–14 岁开始才能保证整段都在未成年期间走完。
const minorsOnly = s => s.age >= 12 && s.age <= 14
const dropout = s => ['none', 'junior', 'vocational'].includes(s.edu)

export const HANDWRITTEN_M3_SCENARIOS = [
  {
    id: 'boundary-drunk', category: 'boundary', positive: false, heavy: true, heavyCategory: 'crime', minAge: 18, maxAge: 65, trigger: adult,
    steps: [
      step('喝到第三轮', '同学聚会喝到第三轮，邻桌有人撞翻了你的酒杯，嘴里还不干不净。你的朋友已经站起来了。', [
        o('leave', '拉着朋友结账走人', '酒钱照付，面子先不要了', {}, { exit: 'avoided', endText: '你们结了账出门，冷风一吹，酒醒了一半。第二天群里有人说，那桌后来又跟别人打了起来，派出所都来了。' }),
        o('argue', '过去跟他理论', '话赶话，场面可能失控', {}, { risk: .1, text: '你走过去说了两句，对方先推了你一把。桌子翻了，玻璃碎了一地。' }),
        o('hit', '借着酒劲先动手', '这一下可能要付出很大的代价', { healthDelta: -4 }, { risk: .35, text: '你先挥了拳头。混乱里谁打了谁已经说不清，只记得有人在喊「报警」。' }),
      ]),
      step('派出所里', '双方都挂了彩，对方去医院验伤。民警问你们愿不愿意调解。', [
        o('mediate', '道歉，赔钱，签调解协议', '赔一笔钱，换一个了结', { assetsDelta: -12000, happyDelta: -4 }, { chance: { good: 0, bad: .08, rehabilitated: 0 } }),
        o('refuse', '不调解：凭什么我赔，是他先惹事', '不调解就按程序走，结果要看伤情鉴定', { happyDelta: -2 }, { chance: { good: 0, bad: .45, rehabilitated: 0 }, endTexts: { mixed: '伤情鉴定是轻微伤，够不上刑事。你被行政拘留了几天，医药费最后还是赔了，比调解时要的还多。' } }),
      ]),
    ],
    endTexts: {
      mixed: '调解书签完，这件事算是了了。那晚的视频在朋友圈转了几天，有人从此见到你就绕着走。',
      bad: '伤情鉴定出来是轻伤，案子转成了刑事案件。赔偿、判决、记录，一样都没躲掉。很多年后你仍会想起那一杯酒。',
    },
    outcomeEffects: { bad: { criminalRecord: true, assetsDelta: -40000, reputationDelta: -25, happyDelta: -10 }, mixed: { reputationDelta: -8 }, avoided: {}, good: {}, rehabilitated: {} },
    longTerm: '酒后冲突可能留下刑事记录，影响考公、参军和部分岗位审查。',
  },
  {
    id: 'boundary-driving', category: 'boundary', positive: false, heavy: true, heavyCategory: 'crime', minAge: 20, maxAge: 70,
    trigger: s => s.age >= 20 && (!!s.money?.car || (s.assets ?? 0) > 80000),
    steps: [
      step('车钥匙在兜里', '饭局散场已经快十一点。你喝了三两白酒，车就停在楼下。', [
        o('driver', '叫代驾', '花几十块钱', { assetsDelta: -80 }, { exit: 'avoided', endText: '代驾师傅把车稳稳停进车位，收了你八十块。路上你看见路口有交警在查酒驾。' }),
        o('taxi', '打车回家，车明天再来开', '第二天还得跑一趟', { assetsDelta: -40 }, { exit: 'avoided', endText: '第二天去开车时，你在小区群里看到一条消息：昨晚那条路上抓了好几个酒驾的。' }),
        o('drive', '就几公里，自己开回去', '这个决定可能改变很多事', {}, { risk: 0, text: '你发动了车。路灯一盏盏往后退，你开得比平时更小心。' }),
      ]),
      step('前方查酒驾', '拐过路口，前方停着警车，交警示意你靠边，递来了吹气仪。', [
        o('cooperate', '配合检测', '结果取决于你喝了多少', {}, { chance: { good: 0, bad: .6, rehabilitated: 0 } }),
        o('plead', '求情，说只喝了一点、离家很近', '检测照样要做', { happyDelta: -2 }, { chance: { good: 0, bad: .6, rehabilitated: 0 } }),
      ]),
    ],
    endTexts: {
      mixed: '数值在饮酒驾驶的区间：罚款，驾驶证暂扣六个月。那半年你每天挤地铁上班，再也没有在喝了酒以后碰过方向盘。',
      bad: '血液检测达到醉驾标准，以危险驾驶罪被判拘役。驾驶证被吊销，五年内不能重新考取。单位的人事通知比判决书来得还快。',
    },
    outcomeEffects: { bad: { criminalRecord: true, assetsDelta: -15000, reputationDelta: -20, happyDelta: -12 }, mixed: { assetsDelta: -2000, happyDelta: -4 }, avoided: {}, good: {}, rehabilitated: {} },
    longTerm: '醉驾留下刑事记录；在编岗位按规定处理。',
  },
  {
    id: 'boundary-gambling', category: 'boundary', positive: false, heavy: true, heavyCategory: 'gambling', minAge: 18, maxAge: 70, trigger: adult,
    steps: [
      step('过年的牌局', '过年回家，老乡拉你去镇上的牌室，说就是玩玩，底子不大，「这不算赌博」。', [
        o('no', '不去，陪家里人看电视', '少一点热闹', {}, { exit: 'avoided', endText: '你在家陪爸妈看完了春晚。后来听说，那间牌室里有人一个正月输掉了一辆车。' }),
        o('go', '去玩两把就回', '你以为自己能控制住', {}, { text: '你坐上了牌桌。那一晚手气出奇地好。' }),
      ]),
      step('手气来了', '一晚上赢了三千多。有个牌友凑过来，说县城有个「大场子」，来钱快得多，要不要一起去。', [
        o('quit', '见好就收，钱拿回家', '把运气留在这一晚', { assetsDelta: 3000, happyDelta: 3 }, { exit: 'mixed', endText: '你用赢来的钱给爸妈换了台新电视。那个牌友后来再也没在村里出现过，有人说他欠了一屁股债跑了。' }),
        o('more', '跟着去大场子', '赢的钱还在手里，胆子也大了', { assetsDelta: 3000 }, { risk: .2, delay: 1, text: '第一个月你又赢了。第二个月，全输了回去，还倒欠三万。' }),
      ]),
      step('有人递来一个借钱软件', '牌友说：「先借点翻本，赢了马上还。」手机上的借款额度一下子批了五万。', [
        o('confess', '停手，跟家里坦白', '先认下这三万的窟窿', { assetsDelta: -30000, creditDelta: -5, happyDelta: -6 }, { exit: 'mixed', endText: '你把手机里的牌友全删了。那三万，你一个月一个月地还，还了两年多。爸妈嘴上没说什么，过年再没让你出过门。' }),
        o('borrow', '借，翻本', '只要赢一把就能回本', { debtDelta: 80000, creditDelta: -20 }, { risk: .25, delay: 1, text: '你又借了一笔，又输了。借款软件一个接一个地装，利息比本金涨得还快。' }),
      ]),
      step('催收打到了你妈的手机上', '债滚到了二十多万。催收电话打给你妈，打给你单位的领导，打给通讯录里的每一个人。', [
        o('sell', '卖房还债，从头来过', '要有房才能出售住房；伴侣已经在提离婚', { sellHouse: true, happyDelta: -10 }, { chance: { good: 0, bad: .5, rehabilitated: .3 } }),
        o('help', '去戒赌互助，一点一点还', '债不会消失，催收也不会马上停', { happyDelta: -8 }, { chance: { good: 0, bad: .55, rehabilitated: .25 } }),
        o('last', '再借最后一笔，翻一次本', '你知道这句话说过很多次了', {}, { risk: .3, chance: { good: 0, bad: .7, rehabilitated: .1 } }),
      ]),
    ],
    endTexts: {
      mixed: '你没有再去牌桌，可债一直在。每个月发了工资先还网贷，剩下的才是日子。家里人再提起那几年，都换个话题。',
      rehabilitated: '你戒了。那几年的债花了很久才还完，有些朋友再也没回来。你后来很少提起那段日子，只是从不让孩子碰牌。',
      bad: '房子、积蓄、婚姻，一样一样没有了。家里人不再接你的电话。很多年后你仍然在还那笔债。',
    },
    outcomeEffects: { bad: { bankrupt: true, familyEstranged: true, endMarriage: true, happyDelta: -15 }, rehabilitated: { happyDelta: 3 }, mixed: {}, avoided: {}, good: {} },
    longTerm: '赌博留下债务、征信污点和破裂的关系。',
  },
  {
    id: 'boundary-theft', category: 'boundary', positive: false, heavy: true, heavyCategory: 'crime', minAge: 12, maxAge: 14, trigger: minorsOnly,
    steps: [
      step('小卖部的货架', '放学路上，几个同学起哄，要你从小卖部「顺」一包零食，说老板从来不看监控。', [
        o('no', '不干，自己先走了', '可能会被他们笑话', { happyDelta: -1 }, { exit: 'avoided', endText: '那几个同学后来被老板当场拦下，叫了家长。你站在马路对面看着，心跳得厉害。' }),
        o('once', '跟着拿了一次', '你告诉自己就这一次', {}, { text: '没有人发现。回去的路上大家都在笑，你却一直攥着书包带。' }),
      ]),
      step('越拿越大', '后来他们开始拿更贵的东西，还说网吧旁边有人收手机。他们约你周末一起去。', [
        o('out', '退出，不再跟他们玩', '会孤单一阵子', { happyDelta: -2 }, { exit: 'mixed', endText: '你换了一条路回家。那年冬天，他们中有两个人被派出所带走了。' }),
        o('join', '一起去', '你不想被说怂', {}, { risk: .3, text: '你跟着去了。第三次的时候，店主一把抓住了你的胳膊。' }),
      ]),
      step('派出所的电话打到了家里', '你们被当场抓住。你还没成年，爸妈被叫到了派出所，你妈进门第一眼就红了眼眶。', [
        o('admit', '老老实实认错，家里退赔', '要面对爸妈的失望', { assetsDelta: -3000, happyDelta: -6 }, { chance: { good: 0, bad: .3, rehabilitated: .45 } }),
        o('blame', '一口咬定是同学让你干的', '想把责任推出去', { happyDelta: -3 }, { risk: .15, chance: { good: 0, bad: .5, rehabilitated: .2 } }),
      ]),
    ],
    endTexts: {
      rehabilitated: '你被训诫，家里赔了钱，学校给了处分。按规定，未成年时的这段记录依法封存。你后来再没碰过别人的东西。',
      bad: '你被送进了专门学校。出来的时候，原来的同学已经升学，你成了街坊嘴里「那个孩子」。',
      mixed: '这件事过去了，但你和家里人之间多了一层说不清的东西。',
    },
    outcomeEffects: { bad: { reputationDelta: -20, familyEstranged: true, happyDelta: -10 }, rehabilitated: { happyDelta: 2 }, mixed: {}, avoided: {}, good: {} },
    longTerm: '未成年时的违法记录依法封存，但人际和家庭关系的影响会留下来。',
  },
  {
    id: 'jianghu-circle', category: 'jianghu', positive: false, heavy: true, heavyCategory: 'crime', minAge: 18, maxAge: 35, trigger: s => s.age >= 18 && dropout(s),
    steps: [
      step('表哥说带你见见世面', '不读书以后在外面晃了两年。表哥从县城回来，说跟着「龙哥」做事，一个月六千，管吃管住。', [
        o('factory', '不去，跟同乡进厂', '钱少一点，踏实一点', {}, { exit: 'avoided', endText: '你进了电子厂，每天站十个小时。三年后听说龙哥那帮人全被抓了，表哥也在里面。' }),
        o('go', '去看看', '先干着试试', {}, { text: '你跟着表哥上了县城。龙哥请你们吃了顿大排档，拍着你的肩膀说「以后就是兄弟」。' }),
      ]),
      step('龙哥的场子', '活儿是给歌厅看场子，有时候帮人「要账」。龙哥讲义气，过年给每人发了个大红包。', [
        o('safe', '只看场子，别的活一概不接', '少挣点，离麻烦远点', { assetsDelta: 30000 }, { risk: .05, delay: 2 }),
        o('all', '什么活都接，钱多', '钱来得快，走得也快', { assetsDelta: 70000 }, { risk: .3, delay: 2 }),
        o('leave', '干了一年就走，自己学门手艺', '要放下来钱快的日子', { assetsDelta: 20000 }, { exit: 'mixed', endText: '你跟着一个修车师傅当学徒，手上全是机油。后来你自己开了间修车铺，老主顾都不知道你年轻时那一段。' }),
      ]),
      step('出事那晚', '一次要账闹大了，对方被打进了医院。警察找上门的时候，龙哥已经不在县城了。', [
        o('surrender', '去派出所自首，如实交代', '自首和如实供述依法可以从宽', {}, { risk: -.2, chance: { good: 0, bad: .5, rehabilitated: .3 } }),
        o('run', '跑去外省躲着', '躲得过初一，躲不过十五', { happyDelta: -6 }, { risk: .25, chance: { good: 0, bad: .85, rehabilitated: .05 } }),
      ]),
    ],
    endTexts: {
      bad: '你被判了三年。龙哥最后也没逃掉，可是没有人再提「兄弟」两个字。出狱那天，来接你的只有你妈。',
      mixed: '调查认定你当晚只是在场、没有动手，做完笔录让你回了家。龙哥那帮人散了，你回到老家，夜里偶尔还会梦见那间歌厅。',
      rehabilitated: '因为情节较轻、主动交代，检察院对你作出不起诉决定。你回了老家，跟着父亲种地，后来在镇上开了家小店。',
    },
    outcomeEffects: { bad: { criminalRecord: true, prisonYears: 3, familyEstranged: true, happyDelta: -12 }, rehabilitated: { happyDelta: 2 }, mixed: {}, avoided: {}, good: {} },
    longTerm: '跟着混社会，绝大多数人最后的结局都不好。',
  },
  {
    id: 'boundary-prison', category: 'boundary', positive: false, heavy: true, heavyCategory: 'crime', minAge: 18, maxAge: 50, trigger: adult,
    steps: [
      step('借你的银行卡用一下', '一个网上认识的「朋友」说，借你的银行卡走几笔账，一笔给你两千块，「绝对没风险」。', [
        o('no', '不借，银行卡不出借', '这两千不要了', {}, { exit: 'avoided', endText: '半年后新闻里说，一个出租银行卡的团伙被打掉了，涉案的几十张卡全是像你这样的年轻人的。' }),
        o('lend', '借了，就走几笔账', '你觉得卡在自己手里，出不了事', { assetsDelta: 6000 }, { delay: 1, text: '三笔账，六千块到手。你没有多想。' }),
      ]),
      step('看守所里', '那些钱是电信诈骗的赃款。你因为涉嫌帮助信息网络犯罪活动被刑事拘留，家里人托人找了律师。', [
        o('plead', '认罪认罚，退出违法所得', '依法可以从宽', { assetsDelta: -6000 }, { risk: -.15 }),
        o('deny', '坚持说自己不知道', '要看证据怎么认定', {}, { risk: .15 }),
      ]),
      step('判决下来', '判决生效：有期徒刑一年，并处罚金。工作没了，租的房子由家人去退。', [
        o('serve', '服刑，盼着家人每月一次的探视，积极参加学习和劳动', '减刑要依法审查，没有保证', { prisonYears: 1, criminalRecord: true, assetsDelta: -10000 }, { risk: -.1, waitForRelease: true }),
        o('drift', '在里面混日子', '日子一样过，出来时什么都没学到', { prisonYears: 1, criminalRecord: true, assetsDelta: -10000 }, { risk: .15, waitForRelease: true }),
      ]),
      step('出狱以后的招聘窗口', '你刑满出狱。应聘时一次次被拒，好几家都卡在了背景审查这一关。', [
        o('humble', '从愿意接纳的小工作重新开始', '工资低，但能站住', { happyDelta: -6 }, { chance: { good: 0, bad: .3, rehabilitated: .55 } }),
        o('old', '回去找以前网上认识的那些人', '来钱快的路又在招手', {}, { risk: .4, chance: { good: 0, bad: .7, rehabilitated: .15 } }),
      ]),
    ],
    endTexts: {
      mixed: '你换了几份工，都干不长。案底像一道看不见的墙，你慢慢学会了只去那些不问过去的地方。',
      rehabilitated: '你在一家物流仓库干了下来，老板说「我只看你现在干得怎么样」。案底还在，考公、参军这些门对你关上了，你也慢慢接受了。',
      bad: '你又一次站在了被告席上。家里人这一次没有再请律师。',
    },
    outcomeEffects: { bad: { prisonYears: 3, familyEstranged: true, happyDelta: -12 }, rehabilitated: { happyDelta: 3 }, mixed: {}, avoided: {}, good: {} },
    longTerm: '案底会持续影响就业与部分资格审查；子女的相关岗位审查也可能需要说明。',
  },
  {
    id: 'accident-road', category: 'accident', positive: false, heavy: true, heavyCategory: 'serious-illness', minAge: 16, maxAge: 85, trigger: s => s.age >= 16 && s.age !== 17,
    steps: [
      step('雨天的路口', '你骑电动车回家，一辆小轿车右转时把你撞倒在地。司机下车，说要不私了，当场给你五千。', [
        o('private', '收下五千，私了', '省事，但以后有事就找不到人了', { assetsDelta: 5000 }, { risk: .2, text: '司机转完账就走了。你一瘸一拐地把车推回了家。' }),
        o('police', '报警，等交警定责、走保险', '要多花半天时间', {}, { risk: -.15, text: '交警来了，认定对方全责。保险公司的人留了电话，让你先去医院。' }),
      ]),
      step('复查的片子', '复查时腿仍肿着。检查发现是骨折，医生建议手术。', [
        o('surgery', '做手术，先垫钱', '手术费要先自己掏', { assetsDelta: -30000, healthDelta: -5 }, { chance: { good: 0, bad: .2, rehabilitated: 0 } }),
        o('conservative', '保守治疗，能省就省', '恢复可能不完全', { assetsDelta: -5000, healthDelta: -8 }, { risk: .2, chance: { good: 0, bad: .2, rehabilitated: 0 } }),
      ]),
    ],
    endTexts: {
      mixed: '恢复花了小半年。阴雨天腿还会隐隐地疼，你骑车时多了一个习惯：路口一定减速。',
      bad: '腿没能完全恢复，落下了残疾，重活再也干不了了。当初那五千块，连一次复查都不够。',
    },
    outcomeEffects: { bad: { disability: .3, healthDelta: -15, happyDelta: -10 }, mixed: { happyDelta: -2 }, avoided: {}, good: {}, rehabilitated: {} },
    longTerm: '交通事故可能留下长期的身体影响。',
  },
  {
    id: 'victim-phone', category: 'victim', positive: false, heavy: true, heavyCategory: 'crime', minAge: 14, maxAge: 80, trigger: s => s.age >= 14 && s.age !== 17,
    steps: [
      step('夜路上的摩托车', '晚上你边走边看手机，一辆摩托车从身边擦过，手机被一把拽走，你被带倒在地上。', [
        o('chase', '爬起来追上去', '可能会受伤', { healthDelta: -6 }, { risk: .3, text: '你追了几十米，摔在了路沿上，膝盖和手肘全破了。摩托车早没了影子。' }),
        o('report', '记住车的样子，马上报警', '先保护好自己', {}, { risk: -.1, text: '你借路边小店的电话报了警，把摩托车的颜色、方向都说清楚了。' }),
        o('freeze', '先借电话打给家里，冻结支付和银行卡', '先把钱保住', {}, { risk: -.2, text: '家里人帮你挂失了手机卡，冻结了支付账户。' }),
      ]),
      step('等来的消息', '手机丢失以后，你把报案回执留在钱包里。后来派出所打来电话，让你去核对消息。', [
        o('wait', '去派出所看看结果', '结果不由你决定', {}, { chance: { good: .25, bad: .3, rehabilitated: 0 } }),
        o('accompany', '请亲友陪同核对账户损失', '往返和补办材料花二百元，多一个人支持', { assetsDelta: -200, happyDelta: 1 }, { risk: -.05, chance: { good: .25, bad: .3, rehabilitated: 0 } }),
      ]),
    ],
    endTexts: {
      good: '团伙被抓了，你的手机居然找了回来，屏幕碎了一角。你把它放在抽屉里，再也没在夜路上低头看过手机。',
      mixed: '手机没有找回来。你补了卡、换了新手机，从此走夜路都把手机收进口袋。',
      bad: '手机没有找回，支付账户在你冻结前已经被转走了几千块。那之后很长一段时间，你听见身后有摩托车的声音就会回头。',
    },
    outcomeEffects: { bad: { assetsDelta: -6000, happyDelta: -6 }, good: { happyDelta: 2 }, mixed: { assetsDelta: -3000 }, avoided: {}, rehabilitated: {} },
    longTerm: '被抢的经历会留下很久的不安。',
  },
  {
    id: 'victim-bike', category: 'victim', positive: false, heavy: false, minAge: 14, maxAge: 80, trigger: s => s.age >= 14 && s.age !== 17,
    steps: [
      step('车棚里空了一格', '你骑了两年的电动车不见了，锁被剪断扔在地上。明天还得上班。', [
        o('report', '报警，找物业调监控', '要花时间', {}, { text: '监控里只拍到一个戴帽子的背影。民警做了笔录，让你回去等消息。' }),
        o('used', '自认倒霉，去二手市场买一辆', '今天就能骑上', { assetsDelta: -1500 }, { exit: 'mixed', endText: '二手市场的老板说这车「来路正」，你没有多问。后来你常想，它会不会就是别人丢的那一辆。' }),
      ]),
      step('等来的回信', '后来，派出所打来电话。', [
        o('go', '去派出所', '结果不由你决定', {}, { chance: { good: .3, bad: 0, rehabilitated: 0 } }),
        o('check', '请半天假，把购车凭证带去核对', '准备材料不能保证追回，少挣一百元', { assetsDelta: -100 }, { risk: -.05, chance: { good: .3, bad: 0, rehabilitated: 0 } }),
      ]),
    ],
    endTexts: {
      good: '一个盗窃电动车的团伙被打掉了，你的车在一排车里被认了出来。你给它换了把最贵的锁。',
      mixed: '车没有找回来。你买了辆便宜的二手车，把报案回执收进了抽屉。',
    },
    outcomeEffects: { mixed: { assetsDelta: -2500, happyDelta: -2 }, good: { happyDelta: 2 }, bad: {}, avoided: {}, rehabilitated: {} },
    longTerm: '丢车的损失不大，麻烦却很实在。',
  },
  {
    id: 'luck-compensation', category: 'luck', positive: true, heavy: false, minAge: 22, maxAge: 75,
    trigger: s => s.age >= 22 && (s.hukou === 'rural' || !!s.ownsHouse),
    steps: [
      step('村口贴了公告', '你家所在的片区列入了征收范围。按面积和户口算下来，现金补偿共八十万元，面积还可以再核对。', [
        o('sign', '签字，拿补偿', '早签早安心', { assetsDelta: 800000, happyDelta: 8 }, { text: '钱到账那天，你把银行短信看了好几遍，确认后面的零没有数错。' }),
        o('check', '先找评估公司把面积核一遍', '晚几个月，可能多一点', { assetsDelta: 850000, happyDelta: 6 }, { text: '核对后补上了一间漏算的偏房，多了五万。钱到账那天，全家人吃了顿好的。' }),
      ]),
      step('钱到账以后', '亲戚们都知道了。表弟来借二十万做生意，以前的同学拉你投一个「年化 20%、稳赚」的项目。', [
        o('save', '存起来，给孩子留着买房', '亲戚那边要得罪一些人', {}, { risk: -.2, chance: { good: .7, bad: .05, rehabilitated: 0 } }),
        o('lend', '借给表弟二十万', '借出去的钱，回不回得来不一定', { assetsDelta: -200000 }, { risk: .1, chance: { good: .45, bad: .15, rehabilitated: 0 }, endTexts: { mixed: '借给表弟的二十万元还没回来，家用和后续支出又花去三十万元。你把剩下的钱重新列账，开始认真问那笔借款什么时候还。', bad: '借给表弟的二十万元没有回来，后来又为这门生意拿出六十万元。账本摊到桌上时，家里人很久没有说话。' } }),
        o('invest', '投那个高收益项目', '收益看起来很诱人', {}, { risk: .45, chance: { good: .45, bad: .1, rehabilitated: 0 } }),
      ]),
    ],
    endTexts: {
      good: '这笔钱稳稳地托住了家里：孩子的首付、父母的医药费都有了着落。村里人说你家「祖坟冒青烟」，你只是笑笑。',
      mixed: '家用和其他支出陆续花去三十万元。再算账时，你把余下的补偿单独列了出来，不再把它看成花不完的钱。',
      bad: '那个「稳赚」的项目暴雷了，老板跑了。八十万补偿赔进去一大半，你和家里人为这件事吵了很多年。',
    },
    outcomeEffects: { good: { happyDelta: 4 }, mixed: { assetsDelta: -300000 }, bad: { assetsDelta: -600000, happyDelta: -12, familyEstranged: true }, avoided: {}, rehabilitated: {} },
    longTerm: '拆迁补偿是一夜之间改变家境的少数机会，守不守得住要看之后的选择。',
  },
]

export const REWRITTEN_SCENARIOS = [...HANDWRITTEN_M3_SCENARIOS,...[...RISK_SCENARIOS,...FAMILY_SCENARIOS,...WARM_SCENARIOS,...EXTRA_SCENARIOS].map(d=>({...d,revision:5}))];

export const REWRITTEN_IDS = new Set(REWRITTEN_SCENARIOS.map(s => s.id))
