const f=(id,label,min,max,skills)=>({id,label,when:s=>s.age>=min&&s.age<=max,skills});
export const FOCUSES=[
 f('study','学习',6,15,{study:3}),f('play','玩耍',6,15,{social:2,healthHabits:1}),f('interest','兴趣班',6,11,{craft:3}),f('chores','帮家里干活',6,11,{craft:1,affection:2}),
 f('arts','兴趣特长',12,18,{craft:3}),f('romance','社团和恋爱',12,22,{affection:3,social:1}),f('gaming','打游戏',12,15,{social:1}),
 f('sprint','学习与升学准备',16,22,{study:4}),f('play','放慢脚步',16,18,{healthHabits:2}),f('parttime','勤工俭学',19,22,{craft:2,reputation:1}),f('travel','旅行',19,22,{social:2}),f('certificate','考证',19,22,{study:2,craft:2}),f('internship','实习',19,22,{craft:3,reputation:1}),
 f('career','拼事业',23,59,{craft:3,reputation:1}),f('family','顾家',23,59,{affection:4}),f('side','副业',23,59,{craft:2,social:1}),f('skill','学技能',23,59,{study:2,craft:2}),f('rest','养身体',23,59,{healthHabits:4}),f('network','社交人脉',23,59,{social:4}),
 f('grandchildren','陪伴家人',60,110,{affection:4}),f('travel','旅行',60,110,{social:2,healthHabits:1}),f('wellness','养生',60,110,{healthHabits:4}),f('dance','广场舞和老年大学',60,110,{social:3,study:1}),f('earn','继续挣钱',60,110,{craft:2,reputation:1}),
];
