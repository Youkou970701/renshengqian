export function jobPhrase(job) {
 const phrases = {
  农民:'在家种地', 务农:'在家种地', 外出务工者:'在外地打工', 外出务工:'在外地打工',
  个体经营者:'经营自己的小生意', 个体户:'经营自己的小生意', 工人:'在工厂上班',
  建筑工人:'在工地干活', 工地务工:'在工地干活', 服务业从业者:'从事服务工作',
  教师:'在学校教书', 白领:'在公司上班', 公务员:'在机关上班', 护士:'在医院当护士',
  医护:'在医院工作', 老板:'经营自己的公司',
 };
 return phrases[job] || '靠工作维持家用';
}
const parent = (s, role) => s.parents?.[role] || {};
export function familyText(s) {
 const f=parent(s,'father'),m=parent(s,'mother');
 const bornAge = p => Number.isFinite(p.birthAge) ? p.birthAge : Number.isFinite(p.age) ? Math.max(0,p.age-(s.age || 0)) : null;
 const describe = (p,label) => `${label}${p.name || ''}${bornAge(p) !== null ? `当时${bornAge(p)}岁，` : '，'}${p.away&&['农民','务农'].includes(p.job)?'在外地做农活':jobPhrase(p.job)}`;
 const resources = s.wealthQ <= 2 ? '那时家里的收入不宽裕，大笔支出都要提前攒钱。' : s.wealthQ === 3 ? '那时家里有稳定的日常收入，学费和房款仍要仔细安排。' : s.wealthQ === 4 ? '那时父母有一些积蓄，能替你负担求学期间的大部分开销。' : '那时家里积蓄充足，父母能替你承担求学和初入社会的开销。';
 const care=s.leftBehind ? m.away ? '父母当时为了工作常年离家，你小时候主要跟着爷爷奶奶生活。' : '爸爸当时为了工作常年离家，你小时候主要由妈妈和家中长辈照料。' : '小时候，你和父母一起生活。';
 return `你出生时，${describe(f,'爸爸')}；${describe(m,'妈妈')}。${resources}${care}`;
}
export function birthText(s) {return `${s.year}年${s.month || 1}月，你出生在${s.province}${s.place || ''}${s.hukou === 'rural' ? '的一个村子' : '的城区'}，名字叫${s.name || '小安'}。${familyText(s)}`;}
export function childStartingText(s) {
 const child = s.kids?.[0]; if(!child) return '';
 const q = child.wealthQ || s.wealthQ;
 return `孩子来到这个家，你开始安排接下来的开销：${q <= 2 ? '收入紧张，每一笔学费都要提前攒' : q === 3 ? '日常生活有着落，大笔花费需要计划' : '有一些积蓄，能给孩子更从容的求学支持'}。`;
}
export function terminalText(s) {
 const job=s.lastJob ?? s.job;
 const work=job && !['尚未就业','待业','在读','研究生在读','退休','居民养老 / 零工','转行学习中'].includes(job) ? `你最后一份工作是${job}。` : '';
 const ending=s.death?.detail ? `${s.age}岁这一年，你因${s.death.detail}离开了。` : `这一生走到了${s.age}岁。`;
 return `${s.name || '你'}，${ending}${work}`;
}
