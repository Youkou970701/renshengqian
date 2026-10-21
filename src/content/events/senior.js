import { seniorExtra } from './extra.js';
import { templates, rural, urban, hasKids } from './helpers.js';

export const seniorEvents = templates('senior', [
  ['checkup', '体检报告装进旧文件袋，你按医嘱在药盒上贴了标签。', null, { health: 1 }],
  ['walk', '晨练的路走得慢了些，你在树荫下停下，和熟人打招呼。', null, { health: 1, social: 1 }],
  ['village-home', '老屋的门槛还在，你搬把椅子坐着，听院外熟悉的脚步声。', null, { happy: 1 }, rural],
  ['family-call', '孩子打来视频，你先问吃饭没有，对方也问了同一句。', null, { happy: 1 }, hasKids],
  ['archive', '整理旧物时翻出毕业证，你把压弯的封皮轻轻抚平。', null, { happy: 1 }, (s) => s.edu !== 'none'],
  ['travel', '邻居约你去公园，你把常用药和水杯放进随身小包。', null, { health: 1 }],
  ['doctor', '复诊时你拿出记好的问题，医生逐条告诉你该留意什么。', null, { health: 1 }],
  ['reunion', '晚辈回来看你，饭桌坐满后，你又从柜里找出一双碗筷。', null, { happy: 2 }, hasKids],
  ['calendar', '新日历挂上墙，你用笔圈出家人计划回来的日子。', null, { happy: 1 }],
  ['community', '社区活动室开门，你把上次没下完的棋重新摆好。', null, { social: 1 }, urban],
  ['pension', '领取养老金后，你先记下日常开销，再去市场挑新鲜蔬菜。', null, { happy: 1 }, (s) => Boolean(s.retired)],
  ['garden', '菜地里新苗冒出来，你扶着锄头看了好一会儿。', null, { health: 1, happy: 1 }, rural],
  ['photo', '旧照片褪了色，你在背面补写还能记得的时间和地点。', null, { happy: 1 }],
  ['phone', '手机又弹出更新提示，你请晚辈把常用按钮放回原处。', null, { social: 1 }],
  ['dance', '广场的音乐响起，你没有急着加入，先在旁边跟着打拍子。', null, { health: 1 }],
  ['stairs', '上楼时你歇了一会儿，决定下次少提一点东西。', null, { health: -1 }],
  ['old-friend', '老朋友来串门，茶续了又续，你们又聊起年轻时的工作。', null, { social: 1, happy: 1 }],
  ['quilt', '晴天你把被子拿出去晒，傍晚收回来时带着暖暖的味道。', null, { happy: 1 }],
  ['recipes', '晚辈想学你做的菜，你边演示边说调味不用太着急。', null, { social: 1 }, hasKids],
  ['window', '窗边的花又开了，你挪了挪花盆，让它多晒一会儿太阳。', null, { happy: 1 }],
  ['life-data','健康讲座说起全国人均预期寿命，你听完那个数字，还是按自己的步子走回家。','health.life_expectancy',{health:1}],
]);
seniorEvents.push(...seniorExtra);
