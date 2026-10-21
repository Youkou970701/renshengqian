import { middleExtra } from './extra.js';
import { templates, rural, poor, hasKids, working, childAge } from './helpers.js';

export const middleEvents = templates('middle', [
  ['child-school', '孩子把升学资料放在桌上，你想起自己当年攥着志愿表的样子。', null, { happy: 1 }, childAge(12, 18)],
  ['school-meeting', '家长会上，老师讲了普高和中职，你把重点记在手机里。', null, { knowledge: 1 }, childAge(12, 15)],
  ['child-exam', '孩子说想试试更远的学校，你先问了住宿和路费。', null, { social: 1 }, childAge(15, 19)],
  ['health-file', '社区更新健康档案，你找出上次体检忘了看的那张报告。', null, { health: 1 }],
  ['parents-check', '陪家人去复查，你把药盒照片和医嘱存在手机同一个文件夹。', null, { health: -1 }],
  ['hometown-care', '老家的亲戚打来电话，你开始协调轮流照看长辈的时间。', null, { social: 1 }, rural],
  ['new-skills', '同事准备继续读书，你也找来专业课教材，试着翻了开头。', null, { knowledge: 1 }, working],
  ['young-job', '年轻亲戚请你帮忙看看简历，你把联系方式一栏单独圈出来。', null, { social: 1 }],
  ['child-road', '孩子说起升学压力，你没有立刻讲道理，先陪着散了会儿步。', null, { social: 1 }, childAge(6, 18)],
  ['future-plan', '饭后你和家人讨论退休以后想怎样生活，把想去的地方记下来。', null, { happy: 1 }],
  ['restructure', '部门调整的消息传来，你开始整理这些年的项目和联系方式。', null, { happy: -1, grind: 1 }, (s) => working(s) && ['企业职员', '公务员', '技术员', 'white_collar'].includes(s.job)],
  ['retrain', '转岗培训需要重新做笔记，你把听不懂的地方用笔标出来。', null, { knowledge: 1 }, working],
  ['delivery', '你帮熟人研究送餐路线，才发现每个路口的等待都要算时间。', null, { knowledge: 1 }, poor],
  ['school-house', '家里讨论孩子上学和住处，你把地图放大，比较了几条通勤路线。', null, { happy: -1 }, childAge(3, 18)],
  ['parent-phone', '你教长辈用手机挂号，对方又问了一遍，你把步骤写在纸上。', null, { social: 1 }],
  ['repair', '家里的水龙头又滴水，你照着教程换了密封圈。', null, { knowledge: 1 }],
  ['old-friend', '旧相识来到附近，你们吃了顿便饭，话题从近况慢慢聊到家人。', null, { social: 1, happy: 1 }],
  ['exercise', '体检提醒你多活动，你把久没穿的运动鞋重新擦干净。', null, { health: 1 }],
  ['dinner', '难得家里人都准时回来，饭菜热了又热，终于一起坐下。', null, { happy: 2 }],
  ['savings', '你把存款和日常支出重新算了一遍，决定先修好家里的旧冰箱。', null, { happy: -1 }, poor],
  ['child-split-data','学校介绍全国普高招生人数，你替孩子把中考后的几条路写在同一张纸上。','education.general_hs_rate',{knowledge:1},childAge(12,16)],
]);
middleEvents.push(...middleExtra);
