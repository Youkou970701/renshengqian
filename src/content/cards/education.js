// Original situation cards. Academic gates belong to the engine; no card changes
// edu, record, gradePct or grind. Monetary education actions are settled there too.
import {EDUCATION_RULES,specialPlanEligible} from '../education-rules.js';
const age = (s, min, max = min) => s.age >= min && s.age <= max;
const skill = (s, key) => s.skills?.[key] ?? 0;
const poor = s => s.wealthQ <= 2;
const excellent = s => s.gradePct >= EDUCATION_RULES.topFifthScore;
const wealthy = s => s.eliteFamily === true;
const bachelor = s => ['bachelor', '211', '985', 'master'].includes(s.edu);
const student = s => age(s, 18, 23) && ['college', 'bachelor', '211', '985'].includes(s.edu);
const high = s => age(s, 16, 18) && ['high', 'private-high', 'art-high', 'sport-high', 'international'].includes(s.edu);
const bounded = n => Math.max(0, Math.min(100, n));
const patch = (s, skills = {}, attrs = {}, extra = {}) => ({
  ...extra,
  skills: Object.fromEntries(Object.entries(skills).map(([key, delta]) => [key, bounded(skill(s, key) + delta)])),
  attrs: Object.fromEntries(Object.entries(attrs).map(([key, delta]) => [key, bounded((s.attrs?.[key] ?? 50) + delta)])),
});
const choose = (id, label, hint, skills = {}, attrs = {}, extra = {}) => ({id, label, hint, effects: s => patch(s, skills, attrs, typeof extra === 'function' ? extra(s) : extra)});
const action = (id, label, hint, educationAction, skills = {}, attrs = {}, extra = {}) => choose(id, label, hint, skills, attrs, s => ({...extra, educationAction}));
const affinities = {'talent-rhythm': '音乐', 'talent-sketch': '美术', 'talent-track': '体育', 'talent-repair': '手巧', 'talent-number': '数学', 'interest-stage': '口才'};
const follow = (option, cardId, inYears, chance = 1) => ({...option, seeds: [{cardId, inYears, chance}]});
const card = (id, stage, when, title, body, options, more = {}) => ({
  id, stage, when, weight: s => 1 + (affinities[id] && s.talent === affinities[id] ? 4 : 0) + (s.temperament === '好奇' && ['child', 'teen'].includes(stage) ? .3 : 0), cooldown: 8, maxPerLife: 1,
  title, body: typeof body === 'function' ? body : () => body, options, ...more,
});

export const EXTRA_CARDS = [
  card('temperament-window', 'child', s => age(s, 2), '窗外传来一声响', '家人抱你到窗边。陌生的声音让你又想看，又有点怕。', [
    choose('look', '伸手要看个明白', '好奇心更强，也更愿意探索', {study: 2}, {}, {temperament: '好奇'}),
    choose('wait', '先靠在熟悉的人怀里', '学会观察，慢一点接近新事物', {affection: 2}, {}, {temperament: '安静'}),
    choose('try', '指着门要自己走过去', '胆子渐渐大起来', {social: 2}, {}, {temperament: '胆大'}),
    choose('insist', '坚持要家人再听一遍', '遇到疑问不容易放弃', {craft: 2}, {}, {temperament: '倔强'}),
  ], {priority: 100, weight: () => 8}),
  card('talent-rhythm', 'child', s => age(s, 5, 8), '饭桌旁的小节拍', '你用筷子敲出了收音机里的节奏。家人停下聊天，听你敲完了这一段。', [
    choose('music', '跟着旧录音练节奏', '多花课余时间，培养音乐兴趣', {music: 5}, {happy: 2}, {interest: '音乐'}),
    choose('play', '拉着大家一起唱', '练口才和与人合作', {social: 4, affection: 2}),
    choose('leave', '把它留在饭桌边', '不急着把每件喜欢的事变成训练', {}, {happy: 3}),
  ]),
  card('talent-sketch', 'child', s => age(s, 6, 10), '画在作业本背面的街道', '你画的店招、窗户和放学路线挤满了一页。美术老师问，愿不愿意参加学校画展。', [
    choose('show', '认真画一张去参展', '花几个周末练画，不保证获奖', {art: 6, reputation: 2}, {happy: 1}, {interest: '美术'}),
    choose('keep', '留给自己，慢慢画', '保留爱好，少一份比赛压力', {art: 3}, {happy: 3}, {interest: '美术'}),
  ]),
  card('talent-track', 'child', s => age(s, 7, 11), '操场上的最后一圈', '体育老师发现你跑完最后一圈还有力气，邀请你试试校队。训练会占掉放学后的时间。', [
    action('train', '加入校队试训', '固定训练，功课时间会少一些', 'sports-training', {sports: 7, healthHabits: 2}, {happy: 1}, {interest: '体育'}),
    choose('friends', '只和同学放学踢球', '保留体能和朋友，不走竞技路线', {sports: 3, social: 2}, {happy: 2}),
  ]),
  card('talent-repair', 'child', s => age(s, 7, 11), '坏掉的台灯', '家里的旧台灯不亮了。大人准备换一盏，你却盯着零件看了很久。', [
    choose('learn', '请大人教你认识零件', '由大人处理电器，你从基础学起', {craft: 6}, {}, {interest: '手工'}),
    choose('draw', '把零件形状画下来', '观察和画画也能通往技术', {art: 3, study: 2}),
    choose('read', '去图书角找科学书', '把问题带进课本', {study: 4}),
  ]),
  card('talent-number', 'child', s => age(s, 8, 11), '一道题，三种解法', '班上讲完了答案，你还想问有没有别的算法。老师给你借来一本旧数学读物。', [
    choose('explore', '自己琢磨新的解法', '培养数学兴趣，进度未必更快', {math: 6, study: 2}, {}, {interest: '数学'}),
    choose('explain', '把懂的那种讲给同学', '练表达，也巩固基础', {social: 4, study: 2}),
    choose('rest', '做完作业就去玩', '给课余生活留一点空白', {}, {happy: 3}),
  ]),
  card('interest-community', 'child', s => age(s, 8, 11), '少年宫剩下一个名额', '周六上午有一门公益兴趣课。报名不贵，但家里需要有人送你过去。', [
    action('art', '选美术班', '需要交通和练习时间', 'arts-training', {art: 5}, {happy: 2}, {interest: '美术'}),
    action('sport', '选体育班', '坚持训练，走得远还要看后续表现', 'sports-training', {sports: 5, healthHabits: 2}, {}, {interest: '体育'}),
    choose('free', '在家照着书自学', '花钱少，靠自己维持习惯', {craft: 3, study: 2}),
  ]),
  card('interest-stage', 'child', s => age(s, 9, 11), '班会需要一位主持人', '大家把目光投向你。你喜欢说故事，可站上讲台和坐在座位上聊天是两回事。', [
    choose('host', '写好串词上台', '承担排练，锻炼口才', {social: 6, reputation: 2}, {happy: 1}, {interest: '表达'}),
    choose('backstage', '帮忙写稿和布置', '选择幕后，练组织和合作', {craft: 3, affection: 2}),
    choose('audience', '坐在台下认真鼓掌', '这次先做观众', {}, {happy: 2}),
  ]),
  card('junior-competition', 'teen', s => age(s, 12, 14), '数学老师带来一张报名表', '竞赛小组每周多上一节课，题目和考试很不一样。老师说，先来试试，不把获奖当承诺。', [
    action('math', '参加数学竞赛小组', '占用周末，成绩与比赛结果另行判定', 'competition', {math: 7, study: 3}, {happy: -1}, {competitionSubject: '数学'}),
    action('coding', '尝试信息学小组', '从基础练习开始，需要长时间积累', 'competition', {coding: 7, craft: 2}, {happy: -1}, {competitionSubject: '信息学'}),
    choose('base', '先把日常课程学稳', '减少竞赛负担，巩固学习习惯', {study: 4}, {happy: 1}),
  ], {weight: s => excellent(s) ? 4 : 1}),
  card('junior-lab', 'teen', s => age(s, 13, 15), '实验室第一次向社团开放', '老师愿意带几位学生做课后实验。你要在一周里挤出两次放学后的时间。', [
    action('physics', '报名物理组', '可能衔接高中竞赛，也可能只是一次探索', 'competition', {study: 4, craft: 4}, {}, {competitionSubject: '物理'}),
    choose('record', '给大家做实验记录', '练认真记录和合作', {study: 3, social: 2}),
    choose('home', '按时回家帮忙', '把时间给家人', {affection: 4}),
  ]),
  card('poor-teacher', 'teen', s => age(s, 12, 15) && poor(s) && excellent(s), '老师留下了你', '放学以后，老师说可以借你资料，也愿意免费答疑。你第一次觉得，往前走未必只能靠家里。', [
    follow(choose('accept', '每周来问不懂的题', '需要坚持，把老师的帮助用在日常', {study: 7, reputation: 2}, {happy: 3}, {mentorTeacher: true}), 'poor-county-waiver', [2, 3]),
    follow(choose('group', '和另外两个同学一起学', '一起分担难题，也互相督促', {study: 5, social: 3}, {happy: 2}, {mentorTeacher: true}), 'poor-county-waiver', [2, 3]),
    choose('quiet', '先把资料带回家', '保留帮助，自己安排节奏', {study: 3}, {happy: 2}, {mentorTeacher: true}),
  ], {weight: () => 8}),
  card('poor-county-waiver', 'high', s => high(s) && poor(s) && excellent(s), '县中寄来减免通知', '学校可以审核减免部分学杂费。老师提醒你，别因为不好意思，就把申请表留在抽屉里。', [
    follow(action('apply', '整理材料提出申请', '审核通过后减轻教育支出', 'fee-waiver', {study: 3}, {happy: 3}, {educationFinance: {supportApplied: true, kind: 'fee-waiver'}}), 'rural-special-plan', [1, 1]),
    action('ask', '先找老师核对材料', '多跑一趟，避免漏交', 'fee-waiver', {social: 2, study: 2}, {happy: 2}, {educationFinance: {supportApplied: true, kind: 'fee-waiver'}}),
    choose('decline', '这次暂不申请', '家里继续承担学杂费', {}, {happy: -1}),
  ], {weight: () => 8}),
  card('poor-competition-fare', 'high', s => high(s) && poor(s) && (excellent(s) || s.competitionSubject), '去省城的车票', '竞赛复试要去省城，路费和住宿让你犹豫。老师说可以帮你问问学校的资助名额。', [
    action('support', '申请路费支持后参赛', '先审核资助，再参加选拔，不保证获奖', 'competition', {study: 4, reputation: 2}, {happy: 2}, {competitionAidApplied: true}),
    choose('stay', '留在学校准备日常考试', '保住稳定节奏，放过这次比赛', {study: 4}, {happy: 1}),
  ], {weight: () => 5}),
  card('rural-special-plan', 'high', s => age(s, 16, 18) && specialPlanEligible(s), '招生简章里的一条支路', '你在县城或乡镇读高中。老师圈出专项计划的农村户籍、成绩和学籍要求，提醒你核对报名时间。这是多一次审核机会，不是录取通知。', [
    follow(action('apply', '逐项核对并报名', '满足资格后增加专项申请机会', 'special-admission', {study: 3}, {happy: 2}, {specialPlanApplied: true}), 'poor-grant', [1, 2]),
    choose('ordinary', '集中准备普通批次', '少处理一套材料，继续普通录取路线', {study: 4}),
  ], {weight: () => 10,priority:95}),
  card('poor-grant', 'college', s => student(s) && poor(s), '辅导员发来资助申请', '入学后，辅导员把助学金申请时间单独告诉你。材料审核需要时间，生活费却每个月都要支出。', [
    action('apply', '如实申请助学金', '审核后获得生活支持，不影响学业记录', 'grant', {study: 2}, {happy: 4}, {educationFinance: {supportApplied: true, kind: 'grant'}}),
    choose('work', '问问校内勤工岗位', '工作占去课余时间，积累责任感', {craft: 4, social: 2}, {happy: -1}, {campusWork: true}),
    choose('family', '暂时向家里求助', '让家里继续分担，减少打工时间', {affection: 2}, {happy: -1}),
  ], {weight: () => 6}),
  card('college-tuition', 'college', s => s.age >= 18 && s.job!=='研究生在读' && (s.age <= 22 || Boolean(s.adultEducation)) && (bachelor(s) || s.edu === 'college') && !s.educationFinance?.tuitionOffered, '录取通知书和缴费单', '通知书到了，学费和住宿费也列在同一页。怎么把这几年读下来，需要你和家里一起商量。', [
    action('loan', '申请助学贷款', '本专科每年最多两万元，按实际需要申请；毕业后五年还本宽限', 'tuition-loan', {study: 2}, {happy: 2}),
    action('family', '由家里筹学费', '占用家庭积蓄，自己专心上课', 'tuition-family', {}, {affection: 2}),
    action('work', '勤工俭学并申请减免', '少一些休息，保留读书机会', 'tuition-work', {craft: 3}, {happy: -1}),
    action('leave', '先离校挣钱', '中断当前学业，之后仍有成人升学路线', 'tuition-leave', {craft: 2}, {happy: -2}),
  ], {priority: 105, weight: s => s.wealthQ === 1 && bachelor(s) ? 100 : 6}),
  card('rich-private-tutor', 'child', s => age(s, 7, 11) && wealthy(s), '两位老师等你选课', '家里可以请到一对一老师，也能把周末空出来。钱能买到时间和指导，买不到你愿不愿意学。', [
    action('academic', '请老师补基础', '每年额外教育支出，建立学习习惯', 'private-tutor', {study: 6}, {happy: -1}),
    action('piano', '坚持钢琴与乐理', '练习会占掉自由时间', 'arts-training', {music: 8}, {}, {interest: '音乐'}),
    choose('free', '留两个没有安排的下午', '减少培训，保留探索空间', {social: 2}, {happy: 5}),
  ], {weight: () => 8}),
  card('rich-international-tour', 'teen', s => age(s, 12, 15) && wealthy(s), '参观国际学校的那一天', '校园里有不同的课程和升学路线。家人愿意承担费用，也希望你尽早想清楚要去哪里生活。', [
    action('international', '申请国际课程', '高额学费，准备语言和海外申请', 'international-school', {language: 6, study: 2}, {}, {educationRoute: 'international'}),
    action('private', '选择国内民办课程', '支付学费，继续国内考试路线', 'private-school', {study: 4}, {}, {educationRoute: 'private'}),
    choose('public', '留在熟悉的公办学校', '维持朋友和日常环境', {social: 3}, {happy: 3}),
  ], {weight: () => 8}),
  card('rich-horse-and-friends', 'teen', s => age(s, 12, 15) && wealthy(s), '马术课和同学的生日', '两件事排在同一个周末。家里已经付了课费，同学却认真地为你留了一个座位。', [
    choose('lesson', '按计划上课', '继续训练，也会错过一次聚会', {sports: 4, reputation: 2}, {happy: -1}),
    choose('friend', '请一次假去过生日', '把时间给朋友', {social: 5, affection: 2}, {happy: 3}),
  ]),
  card('rich-ivy-application', 'college', s => age(s, 18, 21) && wealthy(s) && s.record.completed && !s.educationFinance?.overseasUndergradApplied && !s.record.masterAdmitted, '一叠海外申请材料', '家人替你预约了升学咨询。对方说可以协助准备材料，但学校是否录取，只能由学校决定。', [
    action('apply', '认真准备海外名校申请', '海外本科需四年，高额费用，录取另行判定', 'overseas-undergrad', {language: 7, study: 3}, {happy: -1}),
    choose('domestic', '先把国内专业读扎实', '留在熟悉的环境，建立自己的作品', {study: 5, craft: 2}, {happy: 2}),
    choose('gap', '先用一年做项目', '延后计划，靠实际作品认识自己', {craft: 5, social: 3}, {}, {gapProject: true}),
  ], {weight: () => 7}),
  card('rich-inheritance-training', 'adult', s => age(s, 23, 34) && wealthy(s), '家里的空工位', '家人想让你从公司的一线岗位做起。你可以接受这条已经铺好的路，也可以先去别人的公司。', [
    choose('learn', '从一线学起', '接班需要年资，先练管理和技术', {craft: 6, reputation: 3}, {happy: -1}, {familyBusinessPlan: 'apprentice'}),
    choose('outside', '去外面工作几年', '放慢接班，换取独立经验', {social: 5, craft: 3}, {happy: 2}, {familyBusinessPlan: 'outside'}),
    choose('decline', '说清楚不想接班', '保留自己的方向，要面对家人失望', {reputation: 2}, {happy: 1}, {familyBusinessPlan: 'declined'}),
  ]),
  card('rich-marriage-pressure', 'adult', s => age(s, 23, 34) && wealthy(s), '饭局上多摆了一副碗筷', '家人介绍了一位门当户对的同龄人。你们还不了解彼此，双方长辈已经聊起了未来。', [
    choose('meet', '先作为普通朋友认识', '只答应见面，不承诺婚姻', {social: 3}, {happy: 1}, {familyMatchPressure: 'meet'}),
    choose('boundary', '说明感情由自己决定', '家庭气氛会紧张一阵', {reputation: 3}, {happy: -1}, {familyMatchPressure: 'declined'}),
    choose('talk', '和家人单独谈谈期待', '花时间沟通，不让饭局代替选择', {affection: 4, social: 2}, {}, {familyMatchPressure: 'discuss'}),
  ]),
  card('rich-spending-plan', 'adult', s => age(s, 20, 32) && wealthy(s), '一张长得吓人的账单', '你把几个月的消费加在一起，才发现零散开销已经成了一大笔钱。家里提出每月给你一份固定预算。', [
    choose('budget', '从这月开始记账', '少一点随手消费，学会安排钱', {financial: 7}, {happy: -1}, {spendingPlan: 'budget'}),
    choose('work', '让一部分开销由自己挣', '接受工作和消费之间的约束', {craft: 4, financial: 4}, {}, {spendingPlan: 'earn'}),
    choose('continue', '暂时维持现在的生活', '短期自在，缺少预算的习惯会继续', {}, {happy: 3}, {spendingPlan: 'loose'}),
  ]),
  card('rich-questionable-project', 'adult', s => age(s, 22, 34) && wealthy(s), '朋友带来一份漂亮的计划书', '对方很会谈前景，却不愿给你看完整账目。你第一次要决定，关系和资金能不能放在同一个篮子里。', [
    choose('audit', '请独立人士核对账目', '花时间做尽调，可能伤朋友面子', {financial: 6, reputation: 2}, {happy: -1}, {investmentResponse: 'review'}),
    choose('decline', '没有看清楚就不出钱', '保留资金，错过的机会也由自己承担', {financial: 4}, {happy: 1}, {investmentResponse: 'decline'}),
    choose('trust', '先口头答应，继续追问', '关系暂时融洽，尚未转出资金', {social: 2}, {}, {investmentResponse: 'pending'}),
  ]),
  card('high-exhaustion', 'high', s => high(s), '晚自习后，教室只剩你', '你已经很久没有睡过一个完整的周末。离开教室时，班主任问你，是不是需要重新安排节奏。', [
    choose('adjust', '减掉一项额外训练', '给睡眠和课堂留精力', {healthHabits: 5, study: 2}, {happy: 4}),
    choose('ask', '请老师一起拆学习计划', '承认自己需要帮助', {study: 5, social: 2}, {happy: 2}),
    action('leave', '和家里商量中途离校', '停止当前高中路线，保留未来再读的可能', 'dropout-high', {craft: 2}, {happy: -2}),
  ]),
  card('high-family-pressure', 'high', s => high(s) && poor(s), '家里问你能不能早些挣钱', '晚饭桌上，家人提到眼前的开销。谁都没有说让你走，但你听出了难处。', [
    action('aid', '先找学校问资助', '尝试减免，不把离校当成唯一办法', 'fee-waiver', {study: 2, social: 2}, {happy: 1}),
    choose('weekend', '只在周末帮忙', '休息减少，暂时保留课堂', {craft: 3, affection: 3}, {happy: -1}),
    action('leave', '先离校帮家里', '当前学业中断，成年后仍能重返课堂', 'dropout-high', {craft: 4, affection: 2}, {happy: -2}),
  ]),
  card('high-art-route', 'high', s => high(s) && (skill(s, 'art') >= 3 || skill(s, 'music') >= 3 || s.interest === '美术'), '作品集摆上了课桌', '带训老师问你要不要走艺术类选拔。训练费、文化课和专业课，需要同时安排。', [
    action('art', '准备艺术类选拔', '投入训练，专业考试单独判定', 'arts-exam', {art: 6, study: 2}, {happy: -1}),
    choose('ordinary', '把艺术留作长期爱好', '继续普通升学路线', {art: 2, study: 3}, {happy: 2}),
  ], {weight: () => 4}),
  card('high-sport-route', 'high', s => high(s) && (skill(s, 'sports') >= 3 || s.interest === '体育'), '教练问你要不要去测试', '冬训名单即将确定。成绩够不够、身体能不能承受，都要经过正式测试。', [
    action('test', '报名体育类测试', '训练和文化课并行，测试另行判定', 'sports-exam', {sports: 6, healthHabits: 2}, {happy: -1}),
    choose('ordinary', '继续上课，业余训练', '退出竞技选拔，保留锻炼习惯', {study: 3, healthHabits: 3}, {happy: 1}),
  ], {weight: () => 4}),
  card('high-classmate-support', 'high', s => high(s), '借来的笔记上有一张便条', '你生病请假那几天，同桌把笔记整理成了几页，还写着：有不懂的，放学一起看。', [
    choose('together', '一起补上落下的课程', '接受帮助，建立学习伙伴', {study: 4, affection: 3}, {happy: 3}),
    choose('return', '下次轮到你帮同学', '把人情变成长期的互助', {social: 3, reputation: 3}, {happy: 2}),
  ]),
  card('vocational-workshop', 'teen', s => age(s, 15, 17) && s.edu === 'vocational', '实训室里的一排工位', '汽修、护理、电商、烹饪都开放了体验课。老师说，先做一遍，再决定专业方向。', [
    choose('repair', '去汽修工位', '从基础保养和安全规范学起', {craft: 7}, {}, {major: '汽修'}),
    choose('care', '去护理实训室', '训练耐心与规范操作', {affection: 4, craft: 3}, {}, {major: '护理'}),
    choose('commerce', '去电商教室', '练沟通、表格与店铺运营', {social: 4, craft: 3}, {}, {major: '电商'}),
    choose('kitchen', '去烹饪教室', '从刀工规范和卫生习惯练起', {craft: 6, healthHabits: 1}, {}, {major: '烹饪'}),
  ], {weight: () => 6}),
  card('vocational-internship', 'high', s => age(s, 16, 18) && s.edu === 'vocational', '实习安排有两个去处', '一个岗位离家近，另一个训练更完整却要住集体宿舍。你第一次认真比较工作条件。', [
    choose('training', '选有导师的实习点', '离家远，换取系统训练', {craft: 6, reputation: 2}, {happy: -1}, {internshipPlan: 'mentor'}),
    choose('local', '留在家附近实习', '方便照应家里，技术成长慢一点', {craft: 3, affection: 3}, {happy: 2}, {internshipPlan: 'local'}),
    choose('study', '先了解对口升学', '少赚一段实习收入，多准备课程', {study: 5}, {}, {educationRoute: 'vocational-upgrade'}),
  ]),
  card('major-engineering', 'college', s => (student(s) || (bachelor(s) && Boolean(s.adultEducation))) && !s.major, '志愿表上的专业栏', '分数决定了可选范围，专业却要陪你走很久。你把课程表、就业去向和自己的兴趣摊在一起。', [
    choose('engineering', '选工程与计算机方向', '课程紧，强调技术积累', {craft: 4, coding: 2}, {}, {major: '工程技术'}),
    choose('teaching', '选师范教育方向', '毕业后可参加教师招聘，录用需判定', {study: 4, affection: 3}, {}, {major: '师范教育'}),
    {...choose('medicine', '选临床医学方向', '本科五年，之后规培；编制与合同岗位分开判定', {study: 5}, {}, s=>({major:'临床医学',collegeGraduateAge:(s.record.collegeEnrolledAt??18)+5+(s.militaryService?2:0),educationAction:'medical-program'})),requires:s=>bachelor(s)},
    choose('business', '选经管与商科方向', '更看重表达、实践与后续竞争', {social: 4, financial: 2}, {}, {major: '经济管理'}),
    choose('humanities', '选人文与艺术方向', '靠长期阅读和作品积累', {art: 3, language: 3}, {happy: 1}, {major: '人文艺术'}),
  ], {priority: 90, weight: () => 12}),
  card('college-library', 'college', student, '图书馆最后一排的座位', '室友叫你出去玩，你却刚找到一本想读的书。大学里的时间，开始真正由你分配。', [
    choose('read', '把这一章读完', '少一次聚会，练专注和知识积累', {study: 5}, {happy: 1}),
    choose('go', '今晚和室友一起出去', '学习放到明天，先认识身边的人', {social: 4, affection: 2}, {happy: 3}),
    choose('club', '约大家下次做读书会', '组织比独处更费心', {study: 2, social: 3, reputation: 2}),
  ]),
  card('college-parttime', 'college', student, '课表空出来的两个下午', '食堂、图书馆和校外商店都有兼职。时薪不高，但第一次能靠自己的时间换生活费。', [
    choose('campus', '找校内勤工岗位', '收入有限，通勤少，较能兼顾课程', {craft: 4, reputation: 2}, {}, {campusWork: true}),
    choose('outside', '去校外做兼职', '更累，也能练与陌生人打交道', {social: 5, craft: 2}, {happy: -1}, {campusWork: true}),
    choose('study', '把空档留给课程', '暂时不挣钱，积累学业技能', {study: 5}, {happy: 1}),
  ]),
  card('college-roommate-boundary', 'college', student, '寝室的灯迟迟没关', '有人赶作业，有人想早睡。你发现，相处不是永远忍着，也不是每次都争个输赢。', [
    choose('talk', '约大家定一份作息约定', '花时间协调，可能先有些尴尬', {social: 5, affection: 2}, {happy: 2}),
    choose('adapt', '买个眼罩，先调整自己', '减少冲突，问题未必完全解决', {healthHabits: 2}, {happy: 1}),
    choose('silent', '什么也不说', '省去眼前谈话，憋着的不快还在', {}, {happy: -2}),
  ]),
  card('college-travel', 'college', student, '社团在约一次短途旅行', '大家计划坐慢车去邻市，两天一夜。你要在预算、兼职班次和难得的同行之间做选择。', [
    choose('budget', '控制预算，去两天', '安排课余时间，培养规划能力', {social: 4, financial: 2}, {happy: 4}, {travelPlan: 'student-budget'}),
    choose('local', '改约一次本地散步', '花销少，也能留下共同记忆', {affection: 3, social: 2}, {happy: 3}),
    choose('work', '留校完成手头的事', '错过这次同行，保留自己的节奏', {study: 3, craft: 2}),
  ]),
  card('college-certificate', 'college', student, '报名网站在今晚关闭', '一项和专业有关的资格考试开始报名。报名费和复习时间都要自己安排，证书也不会自动换来工作。', [
    action('prepare', '按职业需要准备考试', '付出复习时间，考试结果另行判定', 'certificate', {study: 4, craft: 3}),
    choose('project', '先把一个项目做完整', '少一张证，增加可展示的作品', {craft: 6, reputation: 2}, {}, {portfolio: true}),
    choose('wait', '等方向明确后再报名', '少花一次费用，也推迟了尝试', {financial: 2}),
  ]),
  card('college-internship', 'college', s => student(s) && s.age >= 20, '暑假里的两封邮件', '一份实习要求你去外地，另一份是老师介绍的本地项目。两边都希望你尽快答复。', [
    choose('away', '去外地实习', '承担生活安排，接触更大的行业圈', {craft: 5, social: 4}, {happy: -1}, {internshipPlan: 'away'}),
    choose('local', '跟着老师做本地项目', '熟悉环境，练完整交付', {craft: 6, reputation: 2}, {happy: 1}, {internshipPlan: 'local'}),
    choose('home', '回家照顾家人', '工作经验少一点，陪伴多一点', {affection: 6}, {happy: 2}),
  ]),
  card('college-friendship', 'college', student, '散场之后的小面馆', '活动结束后，几个还不熟的同学问你要不要一起吃碗面。你原本已经准备回寝室。', [
    choose('join', '坐下来再聊一会儿', '晚一点回去，认识新的朋友', {social: 4, affection: 2}, {happy: 4}),
    choose('invite', '说好下次你来约', '这次休息，主动保留联系', {social: 2, healthHabits: 2}, {happy: 2}),
  ]),
  card('college-student-research', 'college', s => student(s) && excellent(s), '老师问你愿不愿意进课题组', '课题并不耀眼，最开始只是整理数据和读论文。它会占掉很多零碎的晚上。', [
    choose('research', '先踏实做基础工作', '练研究习惯，为继续深造积累经验', {study: 7, reputation: 3}, {happy: -1}, {researchExperience: true}),
    choose('practice', '把精力留给实习', '走向职业实践，少一段研究经历', {craft: 5, social: 2}),
    choose('balance', '商量一个能坚持的安排', '进展慢一点，保留生活空间', {study: 4, healthHabits: 2}, {happy: 2}, {researchExperience: true}),
  ]),
  card('college-recommendation', 'college', s => student(s) && s.age >= 20 && excellent(s), '推免说明会的最后一页', '学院公布了申请要求。你可能具备申请资格，但排名、材料和名额都要正式审核。', [
    action('apply', '准备推荐免试申请', '资格和录取另行判定，不直接保送', 'recommendation', {study: 5, reputation: 2}),
    action('exam', '准备统考读研', '进入备考状态，之后每年自动参考', 'postgrad-application', {study: 4}),
    choose('work', '把毕业去向放在就业', '少几年在校时间，尽早积累工作经验', {craft: 4, social: 2}),
  ], {weight: () => 5}),
  card('college-overseas-grad', 'college', s => student(s) && s.age >= 20 && s.wealthQ >= 4, '交换同学发来的申请日历', '语言考试、推荐信和学费预算排成一长列。出国深造是一条路，也是一笔必须算清楚的投入。', [
    action('apply', '准备海外研究生申请', '承担考试与申请成本，录取另判', 'overseas-application', {language: 6, study: 3}),
    choose('local', '先在国内读书或工作', '保留积蓄，在熟悉的环境积累', {study: 3, craft: 2}, {happy: 2}),
  ]),
  card('adult-return-exam', 'adult', s => age(s, 24, 35) && !bachelor(s), '夜班路上看见招生海报', '成人高考的报名时间就在这个月。你已经很久没做过试卷，可白天和夜晚并没有完全被工作占满。', [
    action('adult', '报读成人高考课程', '花学费和业余时间，完成后再认定学历', 'adult-degree', {study: 4}, {happy: -1}, {adultEducation: {route: '成人高考', startedAt: null}}),
    action('self', '先尝试自学考试', '费用较低，靠自己坚持并逐科通过', 'self-study', {study: 5}),
    choose('skill', '先学一项工作用得上的技术', '暂不提升学历，练可用的技能', {craft: 6}),
  ]),
  card('adult-open-university', 'adult', s => age(s, 25, 35) && !bachelor(s), '同事把周末课程表给你看', '开放大学允许边工作边学习。课程安排更灵活，但作业、考试和学费一样都不会省掉。', [
    action('enrol', '了解清楚后报名', '进入在职学习，按进度完成课程', 'open-university', {study: 4, craft: 2}),
    action('night', '先选附近的夜校', '先练具体技能，降低试错成本', 'night-school', {craft: 5, social: 2}),
    choose('wait', '等工作稳定后再安排', '保留时间，也推迟一次机会', {healthHabits: 2}, {happy: 1}),
  ]),
  card('adult-parttime-master', 'adult', s => age(s, 27, 35) && bachelor(s), '办公室有人开始周末读研', '同事把课表发给你：工作日照常上班，周末上课。学历、学费和休息，要重新排一遍。', [
    action('apply', '准备在职研究生申请', '录取另判，学习期间周末更少', 'parttime-master', {study: 5, reputation: 2}, {happy: -1}),
    choose('course', '只学工作需要的课程', '不追求学位，先解决具体难题', {craft: 6}, {happy: 1}),
    choose('family', '把周末留给家庭', '少一段学习经历，增加陪伴', {affection: 5}, {happy: 3}),
  ]),
  card('adult-mentor-evening', 'adult', s => age(s, 24, 35), '老师傅留你多看十分钟', '下班以后，老师傅愿意把今天返工的原因讲给你听。你已经很累，但这类经验很少写在书里。', [
    choose('listen', '留下来听明白', '少一点休息，积累实务经验', {craft: 6, reputation: 2}, {happy: -1}),
    choose('ask', '请教能否明早再讲', '练沟通，也照顾自己的体力', {craft: 3, social: 3, healthHabits: 2}),
    choose('leave', '按时回家', '今天先休息，接受错过这一课', {healthHabits: 3}, {happy: 2}),
  ]),
  card('adult-hobby-market', 'adult', s => age(s, 24, 35), '有人问你做的东西卖不卖', '你闲时做的小作品被朋友看见。第一次报价，突然比埋头制作还难。', [
    choose('sell', '从一份小订单试起', '要按时交付，爱好开始有约束', {craft: 5, financial: 3}, {}, {sideProject: '试单'}),
    choose('gift', '这次送给朋友', '保留创作自由，收获一份人情', {affection: 4, reputation: 2}, {happy: 3}),
    choose('portfolio', '先整理成作品集', '推迟收入，积累展示材料', {craft: 4, reputation: 3}, {}, {portfolio: true}),
  ]),
  card('adult-classmate-reunion', 'adult', s => age(s, 27, 35), '同学群约了一次见面', '有人换了行业，有人回了老家。轮到你讲近况时，你发现人生已经没有统一的进度表。', [
    choose('honest', '平实地讲自己的日子', '减少比较，保持真实联系', {social: 3, affection: 3}, {happy: 3}),
    choose('advice', '认真问问转行的经验', '收集信息，下一步仍由自己判断', {social: 5, craft: 2}),
    choose('skip', '这次不去，单独联系老朋友', '少一点热闹，多一点熟悉的陪伴', {affection: 4}, {happy: 2}),
  ]),
  card('midlife-night-school', 'midlife', s => age(s, 36, 49), '下班后亮着灯的教室', '社区夜校开了新的课程。坐在教室里的有年轻人，也有和你一样刚下班的人。', [
    action('digital', '学数字工具和基础表格', '每周两个晚上，为转岗积累技能', 'night-school', {craft: 6, study: 2}),
    action('craft', '学一门能接小活的手艺', '从基础做起，短期不会立刻增收', 'night-school', {craft: 7}),
    choose('rest', '先把晚上留给休息', '学习推迟，改善生活节奏', {healthHabits: 4}, {happy: 3}),
  ]),
  card('midlife-portfolio', 'midlife', s => age(s, 36, 50), '履历上只有一串职位名', '一位朋友建议你，把这些年做过的事整理成看得见的成果。你才发现，有些经验一直只留在脑子里。', [
    choose('organize', '花几个周末整理作品', '暂时少休息，为求职留证据', {craft: 4, reputation: 5}, {happy: -1}, {portfolio: true}),
    choose('share', '在团队里做一次经验分享', '增加表达和认可，成果先服务眼前', {social: 4, reputation: 4}, {happy: 2}),
    choose('quiet', '先做好当前岗位', '不急着展示，继续积累', {craft: 4}, {happy: 1}),
  ]),
  card('midlife-move-back', 'midlife', s => age(s, 38, 52), '老家的房门还有一把钥匙', '回去一趟以后，你开始认真比较两地的生活：工作机会、照顾家人和每个月的账单。', [
    choose('research', '先调查家乡的工作和开销', '不仓促搬家，准备一份实际计划', {financial: 4, social: 3}, {}, {returnHomePlan: 'research'}),
    choose('stay', '继续留在现在的城市', '保留积累的工作与朋友', {reputation: 3, social: 2}, {happy: 1}, {returnHomePlan: 'stay'}),
    choose('visits', '暂不搬家，增加回家次数', '需要更多协调，陪伴多一点', {affection: 5}, {happy: 2}, {returnHomePlan: 'visits'}),
  ]),
  card('midlife-health-routine', 'midlife', s => age(s, 36, 54), '体检单上没有惊天动地的字', '医生提醒你，睡眠、饮食和运动最好现在就调整。你知道最难的不是听懂，而是下个月还记得。', [
    choose('walk', '每天晚饭后走一走', '留出固定时间，积累健康习惯', {healthHabits: 7}, {happy: 2}),
    choose('schedule', '先把熬夜减少两天', '工作安排需要协调，慢慢调整', {healthHabits: 5, social: 1}, {happy: 2}),
    choose('later', '先忙完眼前这一阵', '保持工作节奏，习惯暂时没变', {craft: 2}, {happy: -1}),
  ], {maxPerLife: 2, cooldown: 10}),
  card('midlife-old-friend', 'midlife', s => age(s, 38, 55), '几年没见的朋友发来消息', '对方没有借钱，也没有推销什么，只问你最近有没有空一起吃顿饭。', [
    choose('meet', '挑一个晚上见面', '暂时放下事务，续一段老关系', {affection: 5, social: 3}, {happy: 5}),
    choose('call', '先打一个长电话', '省去奔波，也把话慢慢说完', {affection: 4}, {happy: 4}),
    choose('delay', '把见面推到以后', '眼前更轻松，关系还需要维护', {craft: 2}, {happy: -1}),
  ], {maxPerLife: 2, cooldown: 10}),
  card('midlife-weekend-table', 'midlife', s => age(s, 36, 55), '周末的餐桌空了很久', '家人说，大家同住一个屋檐，却常常各吃各的。你翻了一遍日程，发现可以腾出一个晚上。', [
    choose('cook', '一起做一顿普通晚饭', '花时间准备，不需要昂贵安排', {affection: 6}, {happy: 4}),
    choose('rotate', '约好以后轮流安排', '把一次聚餐变成长期约定', {affection: 4, social: 3}, {happy: 3}),
    choose('work', '这周先赶完工作', '保住进度，下次仍要自己安排', {craft: 3}, {happy: -1}),
  ], {maxPerLife: 2, cooldown: 10}),
  card('midlife-parents-photo', 'midlife', s => age(s, 40, 57), '抽屉里的一沓旧照片', '你翻到了父母年轻时的照片。很多背后的故事，你以前没问过。', [
    choose('record', '找时间听他们讲一讲', '留下一段家庭记忆', {affection: 6, language: 2}, {happy: 4}, {familyMemory: true}),
    choose('album', '把照片整理成一本相册', '费几个周末，让记忆有个归处', {craft: 3, affection: 4}, {happy: 3}, {familyMemory: true}),
    choose('keep', '先仔细收好', '保留旧物，等自己有空再做', {affection: 2}, {happy: 1}),
  ]),
  card('midlife-apprentice', 'midlife', s => age(s, 40, 56), '新同事把难题放到你桌上', '对方卡住的地方，正是你当年吃过亏的地方。带新人会慢一点，却可能让经验继续往下走。', [
    choose('teach', '耐心带着做一遍', '占用工作时间，积累带人的能力', {social: 4, reputation: 5, affection: 2}, {happy: 2}),
    choose('notes', '整理一份简明说明', '先把经验写下来', {craft: 4, reputation: 4}, {happy: 1}),
    choose('busy', '只指出最关键的一处', '兼顾自己进度，帮助有限', {reputation: 2, craft: 2}),
  ]),
  card('midlife-child-study', 'midlife', s => age(s, 38, 55) && (s.kids?.length ?? 0) > 0, '孩子把试卷藏进书包', '你看见了不理想的分数，也看见孩子在等你的反应。这次谈话会留下些什么，比这张卷子更久。', [
    choose('listen', '先听孩子说哪里最难', '花时间理解，减少争执', {affection: 6, social: 2}, {happy: 2}, {parentingStyle: 'listen'}),
    choose('plan', '一起做能完成的小计划', '需要持续陪伴，改善学习支持', {affection: 4, study: 3}, {}, {parentingStyle: 'support'}),
    choose('pressure', '要求下次必须明显进步', '表达期待，也给亲子关系增加压力', {study: 2}, {happy: -2}, {parentingStyle: 'pressure'}),
  ]),
  card('midlife-empty-weekend', 'midlife', s => age(s, 45, 58), '突然空出来的星期天', '忙了很多年，你难得没有必须赶去的地方。一天没有被安排好，反而让你有点不习惯。', [
    choose('hobby', '重新拿出旧爱好', '不为收入，找回自己的兴趣', {art: 3, craft: 3}, {happy: 5}),
    choose('walk', '去从没去过的街区走走', '慢下来观察生活', {healthHabits: 3, social: 2}, {happy: 4}),
    choose('plan', '学一点未来用得上的东西', '给下一阶段留准备', {study: 4, financial: 2}, {happy: 1}),
  ]),
  card('midlife-second-degree', 'midlife', s => age(s, 36, 49) && !bachelor(s), '这次报名没有年龄同学', '招生咨询台前，有人比你小十岁，也有人比你大十岁。工作人员把课程安排推到你面前。', [
    action('adult', '报名成人学历课程', '用几年业余时间完成，结业另行认定', 'adult-degree', {study: 5}, {happy: -1}),
    action('self', '先考一门自学课程', '小步开始，不承诺一次完成全部', 'self-study', {study: 4}),
    choose('skill', '选一门短期职业课程', '优先学眼前能用的技能', {craft: 6}),
  ]),
  card('midlife-new-industry', 'midlife', s => age(s, 43, 57), '老客户问你能不能换一种做法', '行业里的工具更新了。过去的经验还在，但一些任务已经有了新的做法。', [
    choose('learn', '用一个月熟悉新工具', '学习期间效率会慢一点', {craft: 6, study: 3}, {happy: -1}),
    choose('partner', '和年轻同事合作', '用经验交换工具能力', {social: 5, reputation: 3}, {happy: 2}),
    choose('old', '继续服务熟悉的客户', '守住原有长处，适应会更慢', {reputation: 3, craft: 2}),
  ]),
  card('midlife-fifty-work', 'midlife', s => age(s, 49, 58), '一份节奏不同的工作邀请', '朋友介绍了一份岗位，收入未必更高，工作时间却比较固定。你开始认真衡量体力和余下的岁月。', [
    choose('look', '去现场看看再决定', '收集真实信息，准备下一份工作', {social: 4, financial: 3}, {}, {lateCareerPlan: 'explore'}),
    choose('stay', '继续现在熟悉的工作', '保留已有积累，照顾自己的节奏', {reputation: 3, craft: 2}, {happy: 1}, {lateCareerPlan: 'stay'}),
    choose('reduce', '先减少额外的工作', '短期少些机会，给体力留余地', {healthHabits: 5}, {happy: 3}, {lateCareerPlan: 'reduce'}),
  ]),
  card('midlife-retire-prep', 'midlife', s => age(s, 54, 59), '离退休还有几年', '你把证件、缴费记录和日常开销放到一起。这件事没有惊喜，却会决定以后怎么安排生活。', [
    choose('check', '核对记录，做一份预算', '花时间查清楚，减少临近时的慌乱', {financial: 6}, {happy: 2}, {retirementPlan: 'budget'}),
    choose('work', '了解退休后能做的小工作', '提前积累联系，也保留休息的选择', {social: 4, craft: 2}, {}, {retirementPlan: 'parttime'}),
    choose('life', '先列一张想做的事情清单', '开始认识工作之外的自己', {art: 2, affection: 2}, {happy: 4}, {retirementPlan: 'life'}),
  ]),
  card('senior-first-free-monday', 'senior', s => age(s, 60, 66), '第一个不用赶车的星期一', '闹钟照常响了，你却不用赶去原来的岗位。窗外的街道没有变，你的一天开始有了新写法。', [
    choose('routine', '给自己安排散步和饭点', '建立新的生活节奏', {healthHabits: 6}, {happy: 3}),
    choose('club', '去社区活动室看看', '从不熟悉的人中慢慢交朋友', {social: 5}, {happy: 4}),
    choose('rest', '先让自己休息一阵', '接受暂时没有目标的日子', {healthHabits: 2}, {happy: 4}),
  ]),
  card('senior-family-time', 'senior', s => age(s, 60, 72) && (s.kids?.length ?? 0) > 0, '孩子问你周末有没有空', '对方有自己的忙碌，也想让你搭把手。你愿意帮忙，又怕从此没有了自己的安排。', [
    choose('schedule', '约定固定能帮忙的时间', '留下边界，也留下支持', {affection: 5, social: 2}, {happy: 3}, {grandparentCarePlan: 'scheduled'}),
    choose('all', '尽量接下这段时间', '家人更轻松，自己休息少一点', {affection: 7}, {happy: -1}, {grandparentCarePlan: 'intensive'}),
    choose('space', '说明自己也需要休息', '少承担一些，把话说清楚', {healthHabits: 4, social: 2}, {happy: 2}, {grandparentCarePlan: 'limited'}),
  ], {maxPerLife: 2, cooldown: 10}),
  card('senior-learn-phone', 'senior', s => age(s, 62, 78), '手机上又多了一个按钮', '新的办事页面和以前不一样。你想问家人，又怕自己总是问重复的问题。', [
    choose('lesson', '去社区学一次手机课', '记下来慢慢练，增加独立生活能力', {study: 4, craft: 4}, {happy: 3}),
    choose('family', '请家人陪着做一遍', '接受帮助，也多一次交流', {affection: 4, craft: 2}, {happy: 2}),
    choose('paper', '保留线下办事的习惯', '需要多跑几趟，方式仍由自己选择', {healthHabits: 2}, {happy: 1}),
  ]),
  card('senior-old-hobby', 'senior', s => age(s, 63, 80), '柜子深处的旧乐器', '它已经很久没响过了。你想起年轻时总说，等有空了再认真学。', [
    choose('learn', '从最简单的一段开始', '不求上台，把兴趣捡回来', {music: 6, study: 2}, {happy: 5}),
    choose('share', '找人一起学', '多一点热闹，也要互相等一等', {music: 3, social: 4}, {happy: 4}),
    choose('gift', '送给愿意学的晚辈', '放下一件旧物，留下一个话题', {affection: 5}, {happy: 3}),
  ], {maxPerLife: 2, cooldown: 10}),
  card('senior-housing-talk', 'senior', s => age(s, 68, 83), '楼梯比以前长了', '你提着东西上楼，第一次认真想，以后住在哪里会更方便。这是生活安排，值得趁还能从容时商量。', [
    choose('near', '了解离家近的养老服务', '先看实际条件，再决定是否搬去', {financial: 3, social: 3}, {happy: 1}, {elderHomePlan: 'service'}),
    choose('family', '和家人讨论住近一点', '需要协调各自空间', {affection: 5, social: 2}, {happy: 2}, {elderHomePlan: 'near-family'}),
    choose('adapt', '先改善现在的居住环境', '优先处理眼前不便', {craft: 3, healthHabits: 3}, {happy: 2}, {elderHomePlan: 'adapt'}),
  ]),
  card('senior-memory-book', 'senior', s => age(s, 65, 85), '孩子问起你年轻时的工作', '你讲了很久，对方说：这些事应该留下来。那些普通年份，忽然也像一本书。', [
    choose('write', '每周写一小段', '慢慢整理，不要求文笔漂亮', {language: 5, affection: 4}, {happy: 4}, {memoir: true}),
    choose('audio', '让家人录下闲聊', '更轻松，也需要有人陪着听', {affection: 6, social: 2}, {happy: 4}, {memoir: true}),
    choose('photos', '先给旧照片写上名字', '做一件细小却有用的事', {craft: 3, affection: 4}, {happy: 3}, {memoir: true}),
  ]),
  card('senior-wishes', 'senior', s => age(s, 70, 88), '把重要的事说在平常一天', '你想把物品、账户和自己的愿望交代清楚。家人一开始有些不习惯，后来都坐了下来。', [
    choose('list', '先列清单，再咨询规范手续', '把愿望讲清，减少未来误会', {financial: 4, affection: 4}, {happy: 2}, {willPlan: 'consult'}),
    choose('family', '先和家人谈自己的想法', '保留沟通，手续以后继续完成', {affection: 6, social: 2}, {happy: 3}, {willPlan: 'discuss'}),
    choose('later', '今天先聊聊生活', '暂缓安排，珍惜眼前相处', {affection: 3}, {happy: 2}, {willPlan: 'later'}),
  ]),
];
