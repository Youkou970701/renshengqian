import{isBachelor}from'../engine/education.js';
import{netAssets}from'../engine/money.js';
const hasChoice=(s,id,choice)=>s.choices?.some(c=>c.decision===id&&c.choice===choice);
const passedRecruitment=(s,attempt)=>s.log?.some(e=>e.templateId===`civil-admitted-${attempt}`&&e.dice?.some(d=>d.id==='civil'&&d.pass));
const entranceExamIds=new Set(['school-stage','school-general','junior-repeat','exam-bachelor','exam-211','exam-985','repeat-bachelor','repeat-211','repeat-985','master','parttime-master','special','competition']);
const near=s=>s.log?.some(e=>e.dice?.some(d=>entranceExamIds.has(d.id)&&d.nearMiss&&d.pass===false&&d.gap>=0&&d.gap<.01));
// Five entry achievements give a first life a visible result. All other entries
// describe a narrower event, measured with the same fixed 100,000-life policy.
// Changed definitions use new IDs; collection migration removes obsolete unlocks.
const defs=[
 ['rural-degree','农村出身上本科','农村低收入家庭出生，最终获得本科及以上学历。',s=>s.hukou==='rural'&&s.wealthQ===1&&isBachelor(s)],
 ['left-985','留守儿童上985','童年留守，最终学历为985本科。',s=>s.leftBehind&&s.edu==='985'],
 ['repeat-degree','复读一年上985','高考复读一年，最终学历为985本科。',s=>hasChoice(s,'repeat','repeat')&&s.edu==='985'],
 ['civil-third','第三次招录上岸','第三次参加公务员或事业单位招录考试时获录用。',s=>passedRecruitment(s,3)],
 ['near-one','只差1%未通过','一次中考、高考、考研、专项或竞赛升学考试未通过，与录取门槛相差不足1个百分点。',near],
 ['beijing-college','北京长大读专科','北京城市户口出生，最终学历为专科。',s=>s.province==='北京'&&s.hukou==='urban'&&s.edu==='college'],
 ['century','活到100岁','这一生达到100岁。',s=>s.age>=100],
 ['hometown','一生都住在老家','终局仍在老家，从未选择迁往县城、省会或一线城市。',s=>s.city==='老家'&&!s.choices?.some(c=>c.decision==='city'&&c.choice!=='老家')],
 ['master','读到硕士毕业','最终完成硕士学业。',s=>s.edu==='master'],
 ['public','进入体制内岗位','35岁前进入公务员、事业编、教师或医护岗位。',s=>!!s.record.tizhiBy35],
 ['rural-master','农村留守读硕士','农村出生、童年留守，最终完成硕士学业。',s=>s.hukou==='rural'&&s.leftBehind&&s.edu==='master'],
 ['left-degree','留守儿童读本科','童年留守，最终获得本科及以上学历。',s=>s.leftBehind&&isBachelor(s)],
 ['teacher','留守儿童当教师','童年留守，在40岁时从事教师工作。',s=>s.leftBehind&&s.record.job40==='教师'],
 ['medical','留守儿童做医护','童年留守，在40岁时从事医护工作。',s=>s.leftBehind&&s.record.job40==='医护'],
 ['technician','农村出身当技工','农村出生，在40岁时从事技术员工作。',s=>s.hukou==='rural'&&s.record.job40==='技术员'],
 ['business','留守后做个体户','童年留守，在40岁时经营个体生意。',s=>s.leftBehind&&s.record.job40==='个体户'],
 ['company','农村出身当老板','农村低收入家庭出生，在40岁时经营自己的公司。',s=>s.hukou==='rural'&&s.wealthQ===1&&s.record.job40==='老板'],
 ['house-before30','三十前一线置业','30岁生日之前，在一线城市实际买下住房。',s=>!!s.record?.housePurchases?.some(p=>p.age<30&&p.city==='一线')],
 ['house-cash','全款买房','买房时一次付清全部房款；还清按揭不算全款买房。',s=>!!s.record?.housePurchases?.some(p=>p.fullCash===true&&p.principal===0)],
 ['parent','成为孩子的父母','这一生迎接了孩子。',s=>s.kids.length>0,true],
 ['together','结婚组建家庭','这一生与伴侣结婚。',s=>!!s.married,true],
 ['city','留守后定居城市','童年留守，后来选择在省会或一线城市生活。',s=>s.leftBehind&&['一线','省会'].includes(s.city)],
 ['ten-million','身家过千万','终局资产含房产、车辆、投资和经营资产，扣除住房、助学及其他负债后达到1000万元。',s=>netAssets(s)>=10000000],
 ['long-life','活到80岁','这一生达到80岁。',s=>s.age>=80,true],
 ['college','留守儿童读专科','童年留守，最终学历为专科。',s=>s.leftBehind&&s.edu==='college'],
 ['upgrade','留守后专升本科','童年留守，专科后选择继续升学，并最终获得本科及以上学历。',s=>s.leftBehind&&hasChoice(s,'upgrade','upgrade')&&isBachelor(s)],
 ['first-master','首次考研读硕士','第一次考研被录取，最终完成硕士学业。',s=>s.edu==='master'&&s.record.masterAttempts===1],
 ['civil-first','首次招录就上岸','第一次参加公务员或事业单位招录考试即获录用。',s=>passedRecruitment(s,1)],
 ['general','留守后考上高中','童年留守，中考获得普通高中录取。',s=>s.leftBehind&&!!s.record.general],
 ['high-complete','完成高中学业','完成普通高中或中职学业。',s=>!!s.record.completed,true],
 ['degree','获得本科学历','最终获得本科及以上学历。',isBachelor,true],
];
export const ACHIEVEMENTS=defs.map(([id,name,description,test,beginner=false])=>({id,name,description,test,beginner}));
export const achievementIds=s=>ACHIEVEMENTS.filter(a=>a.test(s)).map(a=>a.id);
