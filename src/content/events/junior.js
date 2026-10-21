import { templates, rural, poor, rich } from './helpers.js';

const juniorSchool = (s) => s.age < 15 || s.edu === 'junior';

export const juniorEvents = templates('junior', [
  ['dorm', '住校的行李用绳子捆着，家人把一包饼干塞在被褥中间。', null, { social: 1 }, (s) => juniorSchool(s) && rural(s)],
  ['county-bus', '去县城的客车绕过熟悉的路口，你第一次自己保管生活费。', null, { social: 1 }, (s) => juniorSchool(s) && rural(s)],
  ['mock', '模拟考成绩贴在教室后墙，你先看自己的名字，再看下一次考试日期。', null, { grind: 1 }, juniorSchool],
  ['split', '班会讲到了普高和中职，老师让大家把招生简章带回家。', null, { knowledge: 1 }, juniorSchool],
  ['talk', '班主任留下你聊升学，问的除了成绩，还有家里的情况。', null, { happy: -1 }, (s) => juniorSchool(s) && rural(s) && poor(s)],
  ['video', '晚自习后你借到手机，父亲在工地宿舍里听你说学校的事。', null, { social: 1 }, (s) => juniorSchool(s) && (s.leftBehind && s.parents?.mother?.away === true && s.parents?.mother?.alive !== false && s.parents?.father?.alive !== false)],
  ['exam-fee', '家人把生活费装进信封，反复嘱咐你别为了省钱不吃早饭。', null, { happy: 1 }, (s) => juniorSchool(s) && rural(s) && poor(s)],
  ['complete', '学校核对毕业资料，你认真把姓名和证件号码又看了一遍。', null, { knowledge: 1 }, juniorSchool],
  ['options', '招生老师带来实训课的照片，你第一次仔细看另一条升学路线。', null, { knowledge: 1 }, juniorSchool],
  ['reunion', '父母回来开家长会，散会后陪你在操场绕了一圈。', null, { happy: 2 }, (s) => juniorSchool(s) && (s.leftBehind && s.parents?.mother?.away === true && s.parents?.mother?.alive !== false && s.parents?.father?.alive !== false)],
  ['night-study', '晚自习的铃响过，你和同桌在走廊上再对了一遍答案。', null, { knowledge: 1 }, juniorSchool],
  ['shoes', '体育课的鞋底磨平了，家人说周末带你去买新的。', null, { health: 1 }, juniorSchool],
  ['guidebook', '亲戚送来的旧教辅有很多批注，你在空白处写自己的解法。', null, { knowledge: 1 }, (s) => juniorSchool(s) && poor(s)],
  ['tutor', '家人预约了补课老师，你得把原本的球赛改到下个周末。', null, { knowledge: 1, happy: -1 }, (s) => juniorSchool(s) && rich(s)],
  ['canteen', '食堂阿姨认出你没带饭卡，先把饭盘递给了你。', null, { happy: 1 }, juniorSchool],
  ['friendship', '你和好友约好周末一起骑车，计划写在便签纸角落。', null, { social: 1 }],
  ['ranking', '这次成绩退了几名，你把试卷重新叠好，没有急着扔进书包。', null, { happy: -1, grind: 1 }, juniorSchool],
  ['basketball', '傍晚的球场只剩半边有光，你们仍然多打了一会儿。', null, { health: 1, happy: 1 }],
  ['bike-chain', '自行车掉了链子，同学蹲下来帮忙，手上沾满黑油。', null, { social: 1 }],
  ['letter', '老师让写给未来的自己，你想了很久才落笔。', null, { happy: 1 }, juniorSchool],
  ['left-call','父母在外地宿舍接起视频，你把这次试卷举高，怕他们看不清。',null,{social:1},s=>(s.leftBehind && s.parents?.mother?.away === true && s.parents?.mother?.alive !== false && s.parents?.father?.alive !== false)],
  ['left-meeting','家长会的椅子上坐着爷爷，你看见他一笔一画地抄老师写下的安排。',null,{happy:1},s=>(s.leftBehind && s.parents?.mother?.away === true && s.parents?.mother?.alive !== false && s.parents?.father?.alive !== false)],
  ['parent-workaway','爸爸说工地暂时走不开，升学说明会只能请你用手机录下来。',null,{happy:-1},s=>s.parents?.father?.alive !== false && s.parents?.father?.job==='外出务工者'],
  ['parent-farm','农忙的日子，父母天黑才回来，你把成绩单压在饭碗下面。',null,{social:1},s=>Object.values(s.parents||{}).some(p=>p.alive !== false && p.job==='农民')],
  ['split-data','升学说明会上，老师用全国招生人数讲了普高和中职的去向。你把两种学校的简章都带回了家。','education.general_hs_rate',{knowledge:1},juniorSchool],
  ['finish-data','班主任说起读完义务教育的重要，把毕业前需要补交的材料写在黑板上。','education.compulsory_retention',{knowledge:1},juniorSchool],
  ['father-holiday','爸爸从外地回来时，你已经比他记忆里高了一截。他问起学校，你们边走边说。',null,{happy:1},s=>s.parents?.father?.away && s.parents?.father?.alive !== false],
]);
