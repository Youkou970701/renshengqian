import test from 'node:test';
import assert from 'node:assert/strict';
import {TITLES,TITLE_BY_ID,TITLE_ID_MIGRATIONS,selectTitle,titleCandidates,titleFacts} from '../src/content/titles.js';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {JOB_BY_ID} from '../src/content/jobs.js';
import {polishNarrative} from '../src/content/narrative-copy.js';
import {findBannedWords} from './banned-words.js';
const base=()=>({...createBirth('粤-2026-123456'),age:70,capture:false,record:{},workExperience:{},scenarioHistory:[],kids:[],log:[]});
const h=(id,outcome,choices=[],extra={})=>({id,outcome,startedAt:25,endedAt:28,choices,...extra});
const chosen=(index,choice,age=25+index)=>({index,choice,age});
const deCount=text=>(text.match(/的/g)??[]).length;

test('称号模式至少100个且至少60%确实插入本局变量；展示名使用中文占位',()=>{
 assert.ok(TITLES.length>=100);
 assert.equal(new Set(TITLES.map(t=>t.id)).size,TITLES.length);
 assert.equal(new Set(TITLES.map(t=>t.template)).size,TITLES.length);
 const withVariables=TITLES.filter(t=>t.variables.length&&t.variables.every(key=>t.template.includes(`{${key}}`)));
 assert.ok(withVariables.length/TITLES.length>=.6);
 for(const t of TITLES){
  const keys=[...new Set([...t.template.matchAll(/\{(\w+)\}/g)].map(m=>m[1]))];
  assert.deepEqual(t.variables,keys,t.id);
  assert.equal(deCount(t.template),1,t.id);assert.equal(deCount(t.displayName),1,t.id);
  assert.ok(t.template.endsWith('的人生'));assert.doesNotMatch(t.displayName,/[{}]/);
  assert.ok(Number.isFinite(t.priority)&&Number.isFinite(t.rarityRank));assert.ok(t.description);
  assert.equal(typeof t.match,'function');assert.equal(typeof t.render,'function');
  const values=Object.fromEntries(keys.map(key=>[key,key==='province'?'广东':key==='birthPlace'?'广东饶平县':key==='rank'?'班组长':key==='campus'?'985':17]));
  const name=t.render(values);assert.equal(deCount(name),1,t.id);assert.doesNotMatch(name,/undefined|[{}]/);assert.deepEqual(findBannedWords(name),[],t.id);
  assert.doesNotMatch(t.renderShare(values),/犯罪|毒品|家庭暴力|家暴/);
 }
});

test('累计职业年数来自履历；同职系转合同不重复相加且不臆造连续年数',()=>{
 const s={...base(),workExperience:{factory:10,welder:20}};
 const t=selectTitle(s);assert.equal(t.id,'career-welder');assert.equal(t.values.years,20);assert.match(t.name,/累计做了20年焊工/);assert.doesNotMatch(t.name,/连续/);
 const teacher=titleCandidates({...base(),workExperience:{teacher:10,'teacher-contract':12}}).find(t=>t.id==='career-teacher');assert.equal(teacher.values.years,12);
});

test('职级只写实际保留职级，不从工作年数补造主任；没有职级不升职',()=>{
 const s={...base(),workExperience:{factory:25},occupation:{id:'factory',level:2}};
 assert.equal(selectTitle(s).name,'从普工干到班组长的人生');assert.doesNotMatch(selectTitle(s).name,/主任/);
 const noLevel={...s,occupation:{id:'factory'}};assert.equal(selectTitle(noLevel).id,'career-factory');
 assert.equal(titleCandidates({...s,occupation:null}).some(t=>t.id==='career-factory-promotion'),false);
});

test('没有结局或只有第一幕退出，不把通知和后续场景当已经发生结果',()=>{
 const unfinished={...base(),scenarioHistory:[h('luck-compensation',null,[chosen(0,'sign')],{endedAt:undefined})]};
 assert.equal(titleCandidates(unfinished).some(t=>t.kind==='scenario'),false);
 const firstExit={...base(),scenarioHistory:[h('warm-repair','mixed',[chosen(0,'ask')])]};
 assert.equal(titleCandidates(firstExit).some(t=>t.id==='story-warm-repair'),false);
 const avoided={...base(),scenarioHistory:[h('boundary-driving','avoided',[chosen(0,'taxi')],{endedAt:25})]};
 assert.equal(selectTitle(avoided).id,'story-boundary-driving-avoided');assert.doesNotMatch(selectTitle(avoided).name,/被判|暂扣|犯罪|坐牢/);
});

test('补偿和亏损取真正施加金额，不捏造十年花光、卖房或离婚',()=>{
 const s={...base(),scenarioHistory:[h('luck-compensation','bad',[chosen(0,'check'),chosen(1,'lend')]) ]};
 const t=selectTitle(s);assert.equal(t.id,'story-luck-compensation-bad');assert.equal(t.values.amount,800000);assert.match(t.name,/损失800000元/);assert.doesNotMatch(t.name,/十年|卖房|离婚/);
 const good=selectTitle({...s,scenarioHistory:[h('luck-compensation','good',[chosen(0,'check'),chosen(1,'save')])]});assert.match(good.name,/850000元补偿/);
});

test('服刑数字按实际起止并截到终局年龄；宣判通知和新增刑期不提前算成已服刑',()=>{
 const history=h('boundary-prison','bad',[chosen(0,'lend',25),chosen(1,'plead',26),chosen(2,'serve',27),chosen(3,'old',28)]);
 const t=selectTitle({...base(),age:28,scenarioHistory:[history]});assert.match(t.name,/坐了1年牢/);assert.equal(t.values.years,1);
 const later=selectTitle({...base(),age:40,scenarioHistory:[history]});assert.match(later.name,/坐了4年牢/);
 const notification=h('boundary-prison',null,[chosen(0,'lend'),chosen(1,'plead')],{endedAt:undefined});
 assert.equal(titleFacts({...base(),scenarioHistory:[notification]}).completedScenarios.length,0);
});

test('少年偷拿坏结局不是刑事记录，离婚生病不在分享卡被遮掩',()=>{
 const theft=selectTitle({...base(),scenarioHistory:[h('boundary-theft','bad',[chosen(0,'once',12),chosen(1,'join',13),chosen(2,'admit',14)],{startedAt:12,endedAt:14})]});
 assert.match(theft.name,/专门学校/);assert.doesNotMatch(theft.name,/刑事|坐牢/);assert.doesNotMatch(theft.shareName,/偷拿|犯罪/);
 const divorced=selectTitle({...base(),record:{divorces:2}});assert.equal(divorced.name,divorced.shareName);assert.match(divorced.name,/离了两次婚/);
 const ill=titleCandidates({...base(),scenarioHistory:[h('body-major','mixed',[chosen(0,'check'),chosen(1,'plan')])]}).find(t=>t.scenarioId==='body-major');assert.equal(ill.name,ill.shareName);assert.match(ill.name,/确诊疾病/);
});

test('结果年龄使用真实结局年龄，不把残疾和找回手机提前到初发年龄',()=>{
 const accident=selectTitle({...base(),scenarioHistory:[h('accident-road','bad',[chosen(0,'police',17),chosen(1,'surgery',20)],{startedAt:17,endedAt:20})]});
 assert.equal(accident.name,'车祸后在20岁留下残疾的人生');assert.equal(accident.values.age,20);
 const phone=selectTitle({...base(),scenarioHistory:[h('victim-phone','good',[chosen(0,'report',25),chosen(1,'wait',27)],{startedAt:25,endedAt:27})]});assert.match(phone.name,/27岁找回/);
});

test('实际儿童与经营记录不被通知代替，不把生孩子写成已经养大',()=>{
 const kids=titleCandidates({...base(),age:35,kids:[{bornAt:30},{bornAt:32},{bornAt:34}]}).find(t=>t.id==='second-child');assert.match(kids.name,/迎来三个孩子/);assert.doesNotMatch(kids.name,/养大|过完童年/);
 const business=titleCandidates({...base(),record:{businessStarted:true,businessClosed:true}});assert.equal(business.some(t=>['shop-open','shop-close'].includes(t.id)),false);
 const actual=selectTitle({...base(),businessHistory:[{type:'shop',startedAt:30,closedAt:35},{type:'online',startedAt:40}]});assert.equal(actual.name,'开过两次店又关了一次门的人生');
});

test('稀有严重后果优先于主动躲开和温暖片段；换seed不改变同一事实排序',()=>{
 const s={...base(),occupation:{id:'factory',level:2},workExperience:{factory:20},scenarioHistory:[h('boundary-driving','avoided',[chosen(0,'taxi')]),h('accident-road','bad',[chosen(0,'police'),chosen(1,'surgery')])]};
 assert.equal(selectTitle(s).id,'story-accident-road-bad');
 assert.equal(selectTitle({...s,seed:s.seed+1}).id,selectTitle(s).id);
});

test('普通生意轨迹优先于疾病；多次录取、高额资产和晚年结婚仍优先',()=>{
 const businesses=[{type:'shop',startedAt:30,closedAt:35}];
 const ordinary={...base(),businessHistory:businesses};
 const opened=titleCandidates(ordinary).find(t=>t.id==='shop-open'),closed=titleCandidates(ordinary).find(t=>t.id==='shop-close');
 assert.equal(opened.score,64);assert.equal(closed.score,72);
 const medical=h('body-occupational','bad',[chosen(0,'evaluate'),chosen(1,'follow')]);
 assert.equal(selectTitle({...ordinary,scenarioHistory:[medical]}).id,'shop-close');
 const major=h('body-major','mixed',[chosen(0,'check'),chosen(1,'plan')]);
 assert.equal(selectTitle({...ordinary,scenarioHistory:[major]}).id,'shop-close');
 const parents=h('family-parents-separate','mixed',[chosen(0,'ask',10),chosen(1,'timetable',11)],{startedAt:10,endedAt:11});
 assert.equal(selectTitle({...ordinary,scenarioHistory:[parents]}).evidence.id,'family-parents-separate');
 assert.equal(selectTitle({...ordinary,record:{masterAttempts:2,masterAdmitted:true}}).id,'master-retry');
 assert.equal(selectTitle({...ordinary,assets:12000000}).id,'million-assets');
 assert.equal(selectTitle({...ordinary,relationshipHistory:[{kind:'marriage',age:73}]}).id,'late-marriage');
});

test('多次创业或关门按真实次数提升并优先于疾病，不以渲染变量拆分模式',()=>{
 const businesses=Array.from({length:3},(_,i)=>({type:'shop',startedAt:25+i*5,closedAt:27+i*5}));
 const once=titleCandidates({...base(),businessHistory:businesses.slice(0,1)}).find(t=>t.id==='shop-close');
 const twice=titleCandidates({...base(),businessHistory:businesses.slice(0,2)}).find(t=>t.id==='shop-close');
 const thrice=titleCandidates({...base(),businessHistory:businesses}).find(t=>t.id==='shop-close');
 assert.equal(once.id,twice.id);assert.equal(twice.id,thrice.id);assert.ok(once.score<twice.score&&twice.score<thrice.score);
 assert.equal(selectTitle({...base(),businessHistory:businesses}).id,'shop-close');
 const medical=h('body-occupational','bad',[chosen(0,'evaluate'),chosen(1,'follow')]);
 assert.equal(selectTitle({...base(),businessHistory:businesses,scenarioHistory:[medical]}).id,'shop-close');
});

test('真实完整人生的称号在capture:true/false保持相同；所有实际候选的语法和变量完整',()=>{
 for(let i=0;i<40;i++){
  const birth=drawBirth((Math.imul(i,2654435761)+123456789)>>>0);
  const captured=simulate(birth,{capture:true}),silent=simulate(birth,{capture:false});
  const a=selectTitle(captured),b=selectTitle(silent);assert.equal(a.id,b.id,birth.id);assert.equal(a.name,b.name,birth.id);assert.deepEqual(a.values,b.values,birth.id);
  for(const t of titleCandidates(silent)){assert.equal(deCount(t.name),1,`${birth.id}/${t.id}`);assert.equal(deCount(t.shareName),1);assert.doesNotMatch(t.name,/undefined|NaN|[{}]/);assert.deepEqual(findBannedWords(t.name),[]);}
 }
});

test('旧称号迁移只指向当前可展示模式',()=>{for(const [old,id]of Object.entries(TITLE_ID_MIGRATIONS)){assert.ok(!TITLE_BY_ID[old],old);assert.ok(TITLE_BY_ID[id],id);}});


test('晋升主称号至少跨越两级或已经到顶，初始岗位和普通一级晋升不入选',()=>{
 for(const id of ['factory','accountant','engineer','teacher-contract','doctor-contract']){
  const s={...base(),occupation:{id,level:1},workExperience:{[id]:20}};
  const profession=JOB_BY_ID[id].profession;
  assert.equal(titleCandidates(s).some(t=>t.id===`career-${profession}-promotion`),false,id);
  assert.equal(titleCandidates({...s,occupation:{id,level:0}}).some(t=>t.id===`career-${profession}-promotion`),false,id);
  assert.equal(titleCandidates({...s,occupation:{id,level:2}}).some(t=>t.id===`career-${profession}-promotion`),true,id);
  const top=JOB_BY_ID[id].levels.length-1;
  const t=titleCandidates({...s,occupation:{id,level:top}}).find(t=>t.id===`career-${profession}-promotion`);
  assert.ok(t,id);assert.equal(t.evidence.level,top);assert.equal(t.values.rank,JOB_BY_ID[id].levels[top].title);
 }
});

test('次数一到十写汉字，十一和年龄金额年数保留原始数字，事实值仍是数字',()=>{
 assert.equal(polishNarrative('1次、10次、11次、21次；1个、10名；1岁、10岁、10元、1年、10年'), '一次、十次、11次、21次；一个、十名；1岁、10岁、10元、1年、10年');
 for(const [attempts,copy]of [[2,'两'],[10,'十'],[11,'11']]){
  const t=selectTitle({...base(),record:{civilAttempts:attempts}});
  assert.equal(t.name,`考公${copy}次仍未录用的人生`);assert.equal(t.values.attempts,attempts);
 }
 const once=selectTitle({...base(),businessHistory:[{type:'shop',startedAt:30,closedAt:35}]});
 assert.equal(once.name,'开过一次店又关了的人生');assert.equal(once.values.opened,1);assert.equal(once.values.closed,1);
 const factory=selectTitle({...base(),businessHistory:[{type:'factory',startedAt:30,closedAt:35}]});
 assert.match(factory.name,/工厂/);assert.doesNotMatch(factory.name,/店/);
 const mixed=selectTitle({...base(),businessHistory:[{type:'factory',startedAt:30,closedAt:35},{type:'shop',startedAt:40}]});
 assert.match(mixed.name,/生意/);assert.doesNotMatch(mixed.name,/次店/);
});

test('称号模板与显示清除公文腔，录用去向不把事业单位冒充公务员',()=>{
 const stiff=/办完手续|登记结婚|公务岗位|结束在岗工作|编辑写作者/;
 assert.equal(TITLES.length,420);
 for(const t of TITLES){assert.doesNotMatch(t.template,stiff,t.id);assert.doesNotMatch(t.shareTemplate,stiff,t.id);assert.doesNotMatch(t.displayName,stiff,t.id);}
 const civil=selectTitle({...base(),record:{civilAttempts:3,publicPath:'civil-exam'}});
 const institution=selectTitle({...base(),record:{civilAttempts:3,publicPath:'institution-recruitment'}});
 assert.equal(civil.id,institution.id);assert.equal(civil.name,'考了三次终于考上公务员的人生');assert.equal(institution.name,'考了三次终于考上事业单位的人生');
 const inheritance=selectTitle({...base(),scenarioHistory:[h('luck-inheritance','good',[chosen(0,'papers'),chosen(1,'complete')])]});
 assert.match(inheritance.name,/继承/);assert.doesNotMatch(inheritance.name,stiff);
 assert.equal(deCount(inheritance.name),1);
});


test('序数第二与计数两次分开，旧公文腔按上下文转成自然考公措辞',()=>{
 assert.equal(polishNarrative('第2个孩子，第2次考试，第2名；2个孩子，2次考试，2名员工；第10次，第11次'), '第二个孩子，第二次考试，第二名；两个孩子，两次考试，两名员工；第十次，第11次');
 assert.equal(polishNarrative('考了14次公务岗位仍未录用'), '考公14次仍未录用');
 assert.equal(polishNarrative('考了2次终于进入公务岗位'), '考了两次终于考上公务员');
 assert.equal(polishNarrative('参加公务岗位考试'), '参加公务员考试');
 assert.doesNotMatch(polishNarrative('考了2次终于进入公务岗位'),/进入公务员|进入考公|公务岗位|公职/);
});
