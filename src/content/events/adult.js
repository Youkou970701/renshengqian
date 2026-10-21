import { adultExtra } from './extra.js';
import { templates, rural, poor, rich, hasKids, working, childAge } from './helpers.js';

export const adultEvents = templates('adult', [
  ['recruit', '招聘软件里多了新的岗位，你认真改了简历开头的自我介绍。', null, { grind: 1 }, (s) => s.age <= 24],
  ['civil', '下班后你打开考编题库，做完一页才想起汤还没热。', null, { knowledge: 1 }, (s) => working(s) && s.job !== '公务员'],
  ['marriage', '朋友的婚礼请柬发来，群里开始讨论谁坐哪班车回去。', null, { social: 1 }],
  ['match', '相亲时，你们先聊通勤，再聊以后想住在哪里。', null, { social: 1 }, (s) => !s.married],
  ['wedding-plan', '翻到婚礼时留下的清单，你们聊起当初一起置办生活用品的日子。', null, { happy: 1 }, (s) => s.married],
  ['child-cost', '超市的婴儿用品架前，你们算了算接下来的生活开销。', null, { happy: -1 }, (s) => s.married],
  ['birth-chat', '同事在午饭时聊起是否要孩子，大家的顾虑并不一样。', null, { social: 1 }, working],
  ['exam-result', '考公公告更新了，你把专业要求和备考安排看了一遍，才关掉浏览器。', null, { happy: -1 }, (s) => ['college', 'associate', 'bachelor', '985', '211', 'master'].includes(s.edu) && s.job !== '公务员'],
  ['new-family', '你给孩子整理小衣服，把自己的旧相册挪到柜子上层。', null, { happy: 1 }, childAge(0, 5)],
  ['long-plan', '体检后你把报告收好，和家人商量下次休假一起出去走走。', null, { health: 1 }],
  ['rent', '房东问要不要续租，你把通勤路线和搬家费用列在便签上。', null, { happy: -1 }, (s) => !s.ownsHouse && s.city !== '老家'],
  ['mortgage', '看房回来的路上，你们打开计算器，反复调整首付和月供。', null, { happy: -1 }, (s) => s.married || rich(s)],
  ['dowry-talk', '两家人坐下来商量婚事，你希望把彩礼和婚礼支出说得更明白。', null, { social: 1 }, (s) => !s.married],
  ['delivery-rain', '雨天收工后，你把湿透的手套摊在窗边晾着。', null, { health: -1 }, (s) => ['delivery', 'driver', 'worker', '工厂工人', '外卖骑手', '网约车司机'].includes(s.job)],
  ['hometown', '老家的饭桌给你留了位置，家人问这次能待到什么时候。', null, { happy: 2 }, rural],
  ['late-work', '加班结束的电梯里很安静，你终于回复了家人的消息。', null, { health: -1, grind: 1 }, (s) => working(s) && ['企业职员', '公务员', 'white_collar'].includes(s.job)],
  ['move', '搬家箱子上写着厨房和卧室，你先拆开了装电饭煲的那箱。', null, { happy: 1 }],
  ['pay', '工资到账，你先把房租和给家里的钱分开，才看剩余金额。', null, { happy: -1 }, (s) => working(s) && poor(s)],
  ['day-off', '休息日你把工作群设成免打扰，去河边慢慢走了一段。', null, { health: 1, happy: 1 }, working],
  ['kindergarten', '接孩子时你赶在关门前到了，书包里装着一张新画的全家福。', null, { happy: 1 }, childAge(3, 6)],
  ['youth-data','求职讲座展示了不含在校生的青年失业率。散场后，你和几个正在找工作的人交换了招聘消息。','career.youth_unemployment',{social:1},s=>s.age<=24],
  ['marriage-data','你看见关于平均初婚年龄的报道，没有立刻转给家人，先想了想自己想过的生活。','family.first_marriage_age',{happy:1},s=>s.age<35],
]);
adultEvents.push(...adultExtra);
