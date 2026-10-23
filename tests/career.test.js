import test from 'node:test';
import assert from 'node:assert/strict';
import { careerDecision, autoCareerChoice, resolveCareer, annualCareer, resolveMidcareer, isPublic } from '../src/engine/career.js';
import { logistic, logit } from '../src/engine/params.js';
import { DATA } from '../src/engine/stats.js';
import { beginPreparation, annualPreparation } from '../src/engine/preparation.js';
import { createBirth } from '../src/engine/birth.js';
import { step } from '../src/engine/life.js';

const person = (changes={}) => ({age:22,edu:'bachelor',job:'尚未就业',tier:'C',hukou:'rural',wealthQ:1,gradePct:40,attrs:{grind:40,happy:60,knowledge:40},record:{},income:20000,city:'老家',...changes});
const sink = () => {const events=[];return {events,emit:(text,stat,metadata)=>events.push({text,stat,...metadata})};};

test('不同年龄学历职业的自动选项合法，报考资格和年度年龄边界一致',()=>{
  for(let age=18;age<=36;age++)for(const edu of ['junior','college','bachelor','master'])for(const job of ['企业职员','研究生在读','公务员']){
    const s=person({age,edu,job});s.pending=careerDecision(s);
    if(!s.pending)continue;
    for(let i=0;i<100;i++)assert.ok(s.pending.options.some(o=>o.id===autoCareerChoice(s,i/100)));
    if(age<22||age>35||job==='研究生在读'||job==='公务员'||edu==='junior')assert.ok(!s.pending.options.some(o=>o.id==='civil'||o.id==='institution'));
  }
  assert.ok(careerDecision(person()).options.some(o=>o.id==='civil'));
  for(const age of [23,25,29,31,33,35])assert.equal(careerDecision(person({age})),null);
  const {emit}=sink();assert.throws(()=>resolveCareer(person({edu:'junior'}),'master',()=>0,emit));assert.throws(()=>resolveCareer(person({age:36}),'civil',()=>0,emit));
});

test('考研选择一次后逐年自动考试，同年不重复，失败消耗时间并在27岁退出',()=>{
  const s=person(),{events,emit}=sink();resolveCareer(s,'master',()=>.999,emit);
  assert.equal(s.record.masterAttempts,1);assert.equal(s.income,0);assert.equal(s.examGapUntil,23);assert.equal(s.attrs.happy,56);assert.equal(s.record.age22,'待业');
  assert.ok(events.some(e=>e.node==='career'&&e.stat==='education.kaoyan_admit_ratio'));
  beginPreparation(s,'master');assert.equal(s.preparation.kind,'master');
  annualPreparation(s,()=>{assert.fail('进入备考的同年不能再次抽考试骰子');},emit);
  for(let age=23;age<=26;age++){
    s.age=age;annualPreparation(s,()=>.999,emit);
    assert.equal(s.record.masterAttempts,age-21);assert.equal(s.examGapUntil,age+1);
    assert.equal(s.preparation.lastExamAge,age);assert.equal(careerDecision(s),null);
    annualPreparation(s,()=>{assert.fail('同一年不能重复考试');},emit);
  }
  assert.equal(s.record.masterAttempts,5,'不再把二战当作终身上限');
  s.age=27;annualPreparation(s,()=>{assert.fail('超龄不应再抽考试骰子');},emit);
  assert.equal(s.preparation,null);assert.equal(s.record.masterAttempts,5);
  assert.throws(()=>resolveCareer(s,'master',()=>0,emit));
});

test('录取不等于硕士毕业，保留原学历且三年后才取得硕士',()=>{
  const s=person(),{events,emit}=sink();resolveCareer(s,'master',()=>0,emit);
  assert.equal(s.edu,'bachelor');assert.equal(s.job,'研究生在读');assert.equal(s.masterGraduateAge,25);assert.equal(s.record.masterAdmitted,true);
  assert.equal(careerDecision(s),null);assert.throws(()=>resolveCareer(s,'master',()=>0,emit));
  s.age=24;annualCareer(s,()=>0,emit);assert.equal(s.edu,'bachelor');assert.equal(s.job,'研究生在读');
  s.age=25;annualCareer(s,()=>.5,emit);assert.equal(s.edu,'master');assert.notEqual(s.job,'研究生在读');
  assert.ok(events.some(e=>e.node==='master'&&e.reason==='graduation'));
});

test('公务员和事业编含教师医护采用同一体制口径，35岁企业裁员不影响体制岗位',()=>{
  const {emit}=sink();
  for(const job of ['公务员','事业编','教师','医护']){const s=person({age:35,job,industry:'public'});assert.equal(isPublic(s),true);annualCareer(s,()=>0,emit);assert.equal(s.record.tizhiBy35,true);resolveMidcareer(s,'stay',()=>0,emit);assert.equal(s.job,job);}
  const s=person({age:23});resolveCareer(s,'institution',()=>0,emit);assert.equal(isPublic(s),true);assert.equal(s.record.tizhiBy35,true);
  const failed=person({age:30});resolveCareer(failed,'civil',()=>.999,emit);assert.equal(failed.record.civilAttempts,1);assert.equal(failed.examGapUntil,31);assert.equal(failed.attrs.happy,57);assert.equal(failed.income,0);assert.equal(careerDecision(failed),null);
  beginPreparation(failed,'civil');failed.age=31;annualPreparation(failed,()=>.999,emit);
  assert.equal(failed.record.civilAttempts,2);assert.equal(failed.preparation.lastExamAge,31);assert.equal(careerDecision(failed),null);
});

test('农村低学历回乡可务农，企业裁员后可找普通岗位，不默认成为零工',()=>{
  const {emit}=sink();const farm=person({edu:'junior'});resolveCareer(farm,'home',()=>0,emit);assert.equal(farm.job,'务农');assert.equal(farm.industry,'agriculture');
  const worker=person({age:35,job:'互联网职员',industry:'internet'});let i=0;const draws=[0,.9,.9,.5];resolveMidcareer(worker,'stay',()=>draws[i++]??.5,emit);assert.ok(!['外卖骑手','网约车司机'].includes(worker.job));assert.notEqual(worker.job,'互联网职员');
});

test('考研原因使用同次抽样的反事实：移除贡献改变结果才称为主因',()=>{
  const s=person({wealthQ:5,gradePct:50,attrs:{grind:35,happy:60,knowledge:40}}),{events,emit}=sink();
  const u=(DATA.education.kaoyan_admit_ratio.value+logistic(logit(DATA.education.kaoyan_admit_ratio.value)+.16))/2;
  resolveCareer(s,'master',()=>u,emit,{masterBase:0});const e=events.find(e=>e.node==='master');
  assert.equal(e.reason,'wealth');assert.equal(e.draw,u);assert.ok(e.probability>u);assert.equal(e.contributions.wealth,.16);assert.match(e.text,/积蓄/);
  const ordinary=person(),log=sink();resolveCareer(ordinary,'master',()=>.999,log.emit,{masterBase:0});assert.equal(log.events.find(e=>e.node==='master').reason,'competition');
});

test('连续14次考编失败有14条不同内容和独立模板，35岁风险脚注来自实际参数',()=>{
  const s=person(),{events,emit}=sink();
  for(let age=22;age<=35;age++){s.age=age;resolveCareer(s,'institution',()=>.999,emit);}
  const failures=events.filter(e=>e.node==='civil');assert.equal(failures.length,14);
  assert.equal(new Set(failures.map(e=>e.templateId)).size,14);assert.equal(new Set(failures.map(e=>e.text)).size,14);
  assert.ok(failures.every(e=>!e.text.includes('这是你的第')));
  const work=person({age:35,job:'互联网职员',industry:'internet'}),out=sink();
  resolveMidcareer(work,'stay',()=>.999,out.emit,{layoff:{internet:.27}});
  const e=out.events[0];assert.equal(e.stat,null);assert.equal(e.industry,'internet');assert.equal(e.probability,.27);assert.equal(e.contributions.industry,.27);
  assert.match(e.footnote,/27%/);assert.match(e.footnote,/来源：本地岗位风险参数/);assert.doesNotMatch(e.text,/外卖|网约车/);
});

test('公务员和事业编持续备考到35岁，录用后退出，36岁不再考试',()=>{
  for(const kind of ['civil','institution']){
    const s=person(),{emit}=sink();resolveCareer(s,kind,()=>.999,emit);beginPreparation(s,kind);
    for(let age=23;age<=35;age++){s.age=age;annualPreparation(s,()=>.999,emit);assert.equal(s.record.civilAttempts,age-21);assert.equal(careerDecision(s),null);}
    s.age=36;annualPreparation(s,()=>{assert.fail('36岁不能继续招录考试');},emit);
    assert.equal(s.preparation,null);assert.equal(s.record.civilAttempts,14);
    const admitted=person();resolveCareer(admitted,kind,()=>.999,emit);beginPreparation(admitted,kind);
    admitted.age=23;annualPreparation(admitted,()=>0,emit);
    assert.equal(isPublic(admitted),true);assert.equal(admitted.record.tizhiBy35,true);assert.equal(admitted.preparation,null);
  }
});

test('菜单放弃备考是可复现的输入，不推进年龄或随机数，之后不再自动考试',()=>{
  const birth=createBirth('京-2026-066321');
  const s={...birth,age:24,edu:'bachelor',job:'企业职员',record:{...birth.record,civilAttempts:3}};
  beginPreparation(s,'civil');const before=structuredClone(s);
  const a=step(s,{action:'leave-preparation'}),b=step(structuredClone(s),{action:'leave-preparation'});
  assert.deepEqual(a,b);assert.deepEqual(s,before);assert.equal(a.state.age,24);assert.equal(a.state.rngState,s.rngState);
  assert.equal(a.state.preparation,null);assert.deepEqual(a.state.inputHistory.at(-1),{age:24,action:'leave-preparation'});
  assert.ok(a.events.some(e=>e.node==='preparation'));
  const after=a.state;after.age=25;
  annualPreparation(after,()=>{assert.fail('菜单放弃后不能再抽考试骰子');},()=>{});
  assert.equal(after.record.civilAttempts,3);assert.equal(careerDecision(after),null);
});
