import test from 'node:test';
import assert from 'node:assert/strict';
import { annualCareer, annualPublicCareer, careerDecision, autoCareerChoice, resolveCareer, resolveMidcareer, isPublic } from '../src/engine/career.js';
import { logistic } from '../src/engine/params.js';
import { createBirth } from '../src/engine/birth.js';
import { step } from '../src/engine/life.js';

const person=(patch={})=>({seed:17,age:23,edu:'bachelor',major:'师范教育',job:'企业职员',industry:'service',employmentType:'非编制',record:{},gradePct:65,wealthQ:3,tier:'B',hukou:'urban',city:'省会',income:45000,attrs:{happy:65,grind:50,knowledge:50},...patch});
const sink=()=>{const events=[];return {events,emit:(text,stat,meta)=>events.push({text,stat,...meta})};};
const sequence=(...values)=>{let i=0;return ()=>{assert.ok(i<values.length,'发生了额外的随机抽样');return values[i++];};};
const noDraw=()=>assert.fail('这一状态不应抽取招录随机数');

test('明确合同与规培不能算体制，旧教师医护存档仍按原语义读取',()=>{
  for(const job of ['公务员','事业编','教师','医护','公办教师','公立医院医护']){
    assert.equal(isPublic({job}),true);
    assert.equal(isPublic({job,employmentType:'编制'}),true);
    for(const employmentType of ['合同','非编制','规培','在读'])assert.equal(isPublic({job,employmentType}),false);
  }
  for(const job of ['规培医师','研究生在读','企业职员'])assert.equal(isPublic({job,employmentType:'编制'}),false);
});

test('师范教师招聘失败保留合同工作，次年可录用，一年不能重复招聘',()=>{
  const s=person(),out=sink();
  annualPublicCareer(s,sequence(0,.9),out.emit,{teacherApply:1,teacherAnnualSuccess:.25});
  assert.equal(s.job,'教师');assert.equal(s.employmentType,'合同');assert.equal(isPublic(s),false);
  assert.equal(s.record.tizhiBy35,undefined);assert.equal(s.income,45000);assert.equal(s.publicPath,'teacher-recruitment');
  assert.equal(s.record.teacherRecruitmentAttempts,1);assert.equal(s.record.publicPath,undefined);
  annualPublicCareer(s,noDraw,out.emit,{teacherApply:1,teacherAnnualSuccess:.25});
  s.age=24;annualPublicCareer(s,sequence(.1),out.emit,{teacherAnnualSuccess:.25});
  assert.equal(s.job,'教师');assert.equal(s.employmentType,'编制');assert.equal(isPublic(s),true);
  assert.equal(s.record.tizhiBy35,true);assert.equal(s.record.publicPath,'teacher-recruitment');
  assert.equal(s.record.teacherRecruitmentAttempts,2);assert.equal(s.publicCareerRoute,null);
  for(const e of out.events.filter(e=>e.dice)){
    const die=e.dice[0];assert.equal(die.id,'teacher-recruitment');assert.equal(die.u,e.draw);assert.equal(die.p,e.probability);assert.equal(die.pass,die.u<die.p);
    assert.ok(Math.abs(logistic(Object.values(die.contributions).reduce((sum,v)=>sum+v,0))-die.p)<1e-12);
  }
});

test('临床医学先毕业再规培三整年，规培和未录用合同均不算在编医护',()=>{
  const s=person({age:22,major:'临床医学'}),out=sink();
  annualPublicCareer(s,noDraw,out.emit);assert.notEqual(s.job,'医护');assert.equal(s.record.tizhiBy35,undefined);
  s.age=23;annualPublicCareer(s,sequence(0),out.emit,{hospitalApply:1,hospitalAnnualSuccess:.1});
  assert.equal(s.job,'规培医师');assert.equal(s.employmentType,'规培');assert.equal(s.residencyCompletedYears,0);assert.equal(isPublic(s),false);
  for(const age of [24,25]){s.age=age;annualPublicCareer(s,noDraw,out.emit);assert.equal(s.residencyCompletedYears,age-23);assert.equal(s.record.hospitalRecruitmentAttempts,undefined);assert.equal(isPublic(s),false);}
  s.age=26;annualPublicCareer(s,sequence(.9),out.emit,{hospitalAnnualSuccess:.1});
  assert.equal(s.residencyCompletedYears,3);assert.equal(s.residencyCompletedAt,26);assert.equal(s.job,'医护');assert.equal(s.employmentType,'合同');assert.equal(isPublic(s),false);assert.equal(s.record.tizhiBy35,undefined);
  annualPublicCareer(s,noDraw,out.emit);
  s.age=27;annualPublicCareer(s,sequence(0),out.emit,{hospitalAnnualSuccess:.1});
  assert.equal(s.employmentType,'编制');assert.equal(isPublic(s),true);assert.equal(s.record.tizhiBy35,true);assert.equal(s.record.publicPath,'hospital-recruitment');
  assert.ok(out.events.some(e=>e.dice?.[0].id==='hospital-recruitment'&&e.dice[0].pass));
});

test('医学显式毕业年龄与读研占用的年份不被偷算为规培',()=>{
  const s=person({major:'临床医学',medicalGraduateAge:24}),out=sink();
  annualPublicCareer(s,noDraw,out.emit);assert.equal(s.publicCareerRoute,undefined);
  s.age=24;annualPublicCareer(s,sequence(0),out.emit,{hospitalApply:1});
  s.age=25;s.job='研究生在读';annualPublicCareer(s,noDraw,out.emit);assert.equal(s.residencyCompletedYears,0);assert.equal(isPublic(s),false);
  s.age=26;s.job='企业职员';annualPublicCareer(s,noDraw,out.emit);assert.equal(s.residencyCompletedYears,0);assert.equal(s.job,'规培医师');
  for(const age of [27,28]){s.age=age;annualPublicCareer(s,noDraw,out.emit);assert.equal(isPublic(s),false);}
  s.age=29;annualPublicCareer(s,sequence(.99),out.emit,{hospitalAnnualSuccess:.1});
  assert.equal(s.residencyCompletedYears,3);assert.equal(s.residencyCompletedAt,29);assert.equal(s.employmentType,'合同');
});

test('旧笼统教育医疗专业只分流到一条路线，低学历和未毕业不会直接入编',()=>{
  for(const major of ['教育医疗','教育医护']){
    const s=person({major}),out=sink();
    annualPublicCareer(s,sequence(0,0,.99),out.emit,{teacherApply:1,teacherAnnualSuccess:.1});
    assert.equal(s.publicMajorTrack,'teacher');assert.equal(s.employmentType,'合同');assert.equal(isPublic(s),false);
    assert.equal(s.record.hospitalRecruitmentAttempts,undefined);
  }
  for(const patch of [{edu:'junior'},{edu:'college'},{job:'研究生在读'},{collegeGraduateAge:25}]){
    const s=person(patch);annualPublicCareer(s,noDraw,()=>{});assert.equal(s.record.tizhiBy35,undefined);
  }
});

test('选调必须同时有重点本科背景和党员或学生干部条件，未录用保留工作',()=>{
  for(const patch of [{edu:'985'},{edu:'bachelor',studentCadre:true},{edu:'211',job:'研究生在读',partyMember:true}]){
    const s=person({major:'工程技术',...patch});annualPublicCareer(s,noDraw,()=>{});assert.equal(s.record.selectedRecruitmentAttempts,undefined);
  }
  const s=person({major:'工程技术',edu:'211',studentCadre:true}),out=sink();
  annualPublicCareer(s,sequence(0,.9),out.emit,{selectedApply:1,selectedAnnualSuccess:.1});
  assert.equal(s.job,'企业职员');assert.equal(s.income,45000);assert.equal(isPublic(s),false);
  s.age=24;annualPublicCareer(s,sequence(0),out.emit,{selectedAnnualSuccess:.1});
  assert.equal(s.job,'公务员');assert.equal(s.record.publicPath,'selected-graduate');assert.equal(s.record.tizhiBy35,true);
  const master=person({major:'工程技术',edu:'985',record:{}});resolveCareer(master,'master',()=>0,()=>{});
  assert.equal(master.eliteUndergrad,'985');assert.equal(isPublic(master),false);
});

test('军人转业以真实服役记录为前提，失败不发编制，录用才记录来源',()=>{
  const neverServed=person({age:24,major:'工程技术'});annualPublicCareer(neverServed,noDraw,()=>{});assert.equal(neverServed.record.militaryRecruitmentAttempts,undefined);
  const s=person({age:24,major:'工程技术',veteran:true}),out=sink();
  annualPublicCareer(s,sequence(0,.9),out.emit,{militaryTransferApply:1,militaryAnnualSuccess:.1});
  assert.equal(s.job,'企业职员');assert.equal(s.record.tizhiBy35,undefined);
  s.age=25;annualPublicCareer(s,sequence(0),out.emit,{militaryAnnualSuccess:.1});
  assert.equal(s.job,'事业编');assert.equal(s.record.publicPath,'military-transfer');assert.equal(isPublic(s),true);
});

test('同年专门招聘与考公不重复抽样，持续备考和超龄不会偷偷追加招聘',()=>{
  const s=person(),out=sink();annualPublicCareer(s,sequence(0,.9),out.emit,{teacherApply:1,teacherAnnualSuccess:.1});
  resolveCareer(s,'civil',noDraw,out.emit);assert.equal(s.record.civilAttempts,undefined);
  for(const patch of [{age:36},{preparation:{kind:'civil'}},{record:{publicRecruitmentLastAge:23}}]){
    const candidate=person(patch);annualPublicCareer(candidate,noDraw,()=>{});assert.equal(candidate.record.teacherRecruitmentAttempts,undefined);
  }
});

test('合同教师仍有岗位中断风险，编制教师保留公共岗位保护',()=>{
  const out=sink(),contract=person({age:35,job:'教师',industry:'education',employmentType:'合同'});
  resolveMidcareer(contract,'stay',sequence(0,.9,.9,.5),out.emit,{layoff:{education:.2}});
  assert.notEqual(contract.job,'教师');assert.equal(isPublic(contract),false);
  const established=person({age:35,job:'教师',industry:'public',employmentType:'编制'});
  resolveMidcareer(established,'stay',noDraw,out.emit);assert.equal(established.job,'教师');assert.equal(isPublic(established),true);
});

test('新职业随机流可存档复现且不消耗年度人口随机流，step不修改输入',()=>{
  const source=person(),a=structuredClone(source),b=structuredClone(source),first=sink(),second=sink();
  annualCareer(a,noDraw,first.emit,{publicCareer:{teacherApply:1}});
  annualCareer(b,noDraw,second.emit,{publicCareer:{teacherApply:1}});
  assert.deepEqual(a,b);assert.deepEqual(first.events,second.events);assert.ok(Number.isInteger(a.careerRngState));
  const restored=JSON.parse(JSON.stringify(a));a.age=24;restored.age=24;
  annualCareer(a,noDraw,()=>{});annualCareer(restored,noDraw,()=>{});assert.deepEqual(a,restored);
  const birth=createBirth('沪-2026-123456');const input={...birth,age:22,edu:'bachelor',major:'师范教育',job:'企业职员',employmentType:'非编制'};
  const before=structuredClone(input);const x=step(input,{focus:'work'}),y=step(structuredClone(input),{focus:'work'});
  assert.deepEqual(input,before);assert.deepEqual(x,y);
});

test('推迟毕业后的首次就业按实际年龄记录，不能补写22岁去向',()=>{
  for(const choice of ['work','home']){
    const s=person({age:24,job:'尚未就业',collegeGraduateAge:24,record:{deferredCareerEntry:true}}),out=sink();
    s.pending=careerDecision(s);assert.ok(s.pending.options.some(o=>o.id==='home'));assert.ok(s.pending.options.some(o=>o.id==='master'));
    assert.equal(autoCareerChoice(s,0),'master');
    resolveCareer(s,choice,()=>.5,out.emit);
    assert.notEqual(s.job,'尚未就业');assert.equal(s.record.careerEntryAge,24);assert.equal(s.record.age22,undefined);assert.equal(s.record.deferredCareerEntry,false);
    assert.ok(out.events.some(e=>e.templateId?.startsWith('career-24-')));
    assert.equal(careerDecision(s),null);
  }
  const graduate=person({age:24,record:{deferredCareerEntry:true}}),out=sink();resolveCareer(graduate,'master',()=>0,out.emit);
  assert.equal(graduate.record.careerEntryAge,24);assert.equal(graduate.record.age22,undefined);assert.ok(out.events.some(e=>e.node==='career'&&e.text.startsWith('24 岁')));
  const ordinary=person({age:22});resolveCareer(ordinary,'work',()=>.5,()=>{});assert.equal(ordinary.record.careerEntryAge,22);assert.equal(ordinary.record.age22,ordinary.job);
});

test('军中、延迟本科毕业和未完成首次就业的人不被年度路径提前分配工作',()=>{
  for(const patch of [
    {job:'待业',militaryService:{active:true,startedAt:21,returnAge:23}},
    {job:'待业',collegeGraduateAge:24},
    {job:'尚未就业'},
  ]){
    const s=person(patch),before=s.job;annualCareer(s,noDraw,()=>{});assert.equal(s.job,before);assert.equal(s.record.tizhiBy35,undefined);
  }
});
