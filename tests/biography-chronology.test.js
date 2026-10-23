import test from 'node:test';
import assert from 'node:assert/strict';
import {polishNarrative} from '../src/content/narrative-copy.js';
import {biography,BIOGRAPHY_STIFF_EXPRESSIONS} from '../src/engine/biography.js';
import {createBirth,drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
const base=()=>({...createBirth('粤-2026-123456'),age:80,alive:false,death:{detail:'脑卒中'}});
const displayedAges=text=>[...text.matchAll(/(\d+)岁/g)].map(m=>Number(m[1]));
function chronological(b){
 const ages=displayedAges(b.sentence);assert.ok(ages.every((n,i)=>i===0||n>ages[i-1]),b.sentence);
 assert.deepEqual(displayedAges(b.shareSentence),ages);
 assert.ok(b.timeline.every((e,i)=>Number.isFinite(e.age)&&e.source&&(i===0||e.age>=b.timeline[i-1].age)));
 for(const word of BIOGRAPHY_STIFF_EXPRESSIONS){assert.ok(!b.sentence.includes(word),b.sentence);assert.ok(!b.shareSentence.includes(word),b.shareSentence);}
}
test('父母12岁离婚排在22岁工作前，同龄事件只显示一次年龄',()=>{
 const b=biography({...base(),record:{junior:false,age22:'工厂工人'},scenarioHistory:[{id:'family-parents-separate',startedAt:12,endedAt:13,outcome:'mixed'}],occupation:{id:'cleaner',startedAt:35},relationshipHistory:[{kind:'marriage',age:22}],kids:[{bornAt:35}]});
 chronological(b);assert.match(b.sentence,/12岁父母离婚，15岁初中没读完，22岁在工厂上班，结婚，35岁转做保洁，有了一个孩子/);
 assert.equal(b.timeline.find(e=>e.id==='family-parents-separate').age,12);assert.doesNotMatch(b.sentence,/养大/);
});
test('最后学历和职业缺少时间时不倒推入学、毕业、入职或晋升年龄',()=>{
 const b=biography({...base(),edu:'master',record:{},occupation:{id:'welder',level:2},lastJob:'焊工',retiredAt:63});
 chronological(b);assert.doesNotMatch(b.sentence,/初中|研究生|本科|晋升|主任/);assert.match(b.sentence,/从学徒焊工做到焊接带班/);assert.equal(b.timeline.find(e=>e.summary).source,'title.evidence');assert.match(b.sentence,/63岁退休/);
});
test('收入中的数字不当作年龄；职业按收入履历的实际年龄排列',()=>{
 const b=biography({...base(),record:{},incomeHistory:[{age:20,income:50000,jobId:'factory'},{age:40,income:180000,jobId:'cleaner'}],retiredAt:63});
 chronological(b);assert.match(b.sentence,/20岁在工厂上班，40岁转做保洁，63岁退休/);assert.equal(b.timeline[0].source,'incomeHistory');
});
test('capture关闭也能以记录复述婚育与剧情，不把选项当作成功事实',()=>{
 const b=biography({...base(),capture:false,log:[],record:{junior:true},cardHistory:[{id:'career',age:22,choice:'civil'}],scenarioHistory:[{id:'boundary-prison',outcome:'rehabilitated',startedAt:24,endedAt:28,choices:[{age:24,index:0,choice:'lend'},{age:25,index:1,choice:'plead'},{age:26,index:2,choice:'serve'},{age:28,index:3,choice:'humble'}]}],relationshipHistory:[{age:30,kind:'marriage'},{age:47,kind:'divorce'}],kids:[{bornAt:33}]});
 chronological(b);assert.match(b.sentence,/28岁因借卡案件坐过1年牢后重新找工作/);assert.match(b.shareSentence,/47岁离了婚/);assert.doesNotMatch(b.sentence,/公务员|考上|养大/);assert.doesNotMatch(b.shareSentence,/银行卡|刑事|坐过|监禁/);
});
test('分享保留离婚、生病、失业，犯罪毒品与家庭暴力采用自然中性句',()=>{
 const s={...base(),record:{},incomeHistory:[{age:40,income:0,job:'待业',reasons:[{kind:'layoff'}]}],scenarioHistory:[{id:'body-major',startedAt:45,endedAt:46,outcome:'bad',choices:[{index:0,choice:'check'},{index:1,choice:'plan'}]}],relationshipHistory:[{kind:'divorce',age:42}]};
 const b=biography(s);assert.match(b.shareSentence,/离了婚/);assert.match(b.shareSentence,/确诊重病/);assert.match(b.shareSentence,/40岁失业后重新找工作/);
 for(const id of ['family-domestic','trap-drugs','victim-phone']){const x=biography({...s,scenarioHistory:[{id,startedAt:45,endedAt:46,outcome:'bad',heavy:true}]});assert.doesNotMatch(x.shareSentence,/家庭暴力|毒品|被抢/);}
});
test('未结束剧情不写结局，避开危险不写成受害或犯罪',()=>{
 const b=biography({...base(),record:{},scenarioHistory:[{id:'boundary-driving',startedAt:29,endedAt:29,outcome:'avoided'}]});
 chronological(b);assert.match(b.sentence,/29岁喝酒后没有自己开车/);assert.doesNotMatch(b.sentence,/判拘役|被罚款/);
 const active=biography({...base(),record:{},scenarioHistory:[{id:'boundary-driving',startedAt:29,outcome:null}]});assert.doesNotMatch(active.sentence,/开车|拘役/);
});
test('早逝克制地写到终点，不报死因、不补写未发生的成年生活',()=>{
 const b=biography({...base(),age:4,death:{detail:'交通事故'},edu:'none',record:{junior:false}});
 chronological(b);assert.equal(b.sentence,`出生在广东${base().place}${base().hukou==='rural'?'的一个村子':''}，4岁生命在这一年停下。`);assert.doesNotMatch(b.sentence,/初中|工作|交通事故/);
});
test('500个真实终局在两种捕获模式下年龄严格递增，且不改变原状态',()=>{
 for(let i=0;i<500;i++){
  const s=simulate(drawBirth(104729*(i+1)),{capture:i%2===0}),before=JSON.stringify(s),b=biography(s);
  chronological(b);assert.equal(b.timeline.at(-1).source,'end');assert.equal(b.timeline.at(-1).age,s.age);assert.equal(JSON.stringify(s),before);
 }
});


test('主称号对应真实事业、升学、家庭、生意轨迹也进入传记，不只叙述无关剧情',()=>{
 const cases=[
  [{workExperience:{welder:20}},/前后做了20年焊工/],
  [{record:{civilAttempts:3,publicPath:'civil-exam',tizhiBy35:true}},/先后考了三次，终于考上公务员/],
  [{record:{masterAttempts:2,masterAdmitted:true}},/考了两次才读上研究生/],
  [{record:{parentMedicalPaid:60000}},/给父母治病前后花了60000元/],
  [{businessHistory:[{type:'shop',startedAt:28,closedAt:31}]},/开过一次店又关了/],
 ];
 for(const [patch,expected]of cases){const b=biography({...base(),record:{},...patch});chronological(b);assert.match(b.sentence,expected);}
});


test('领奖、遗产手续、项目交付、保护咨询和治疗均在完成幕之后才成立',()=>{
 const cases=[
  ['luck-inheritance','good',['papers','complete'],/41岁继承长辈留下的6万元/],
  ['luck-prize','good',['save','reserve'],/41岁领到一万二千元彩票奖金/],
  ['luck-mentor','good',['scope','review'],/41岁交付前辈推荐的项目，拿到1.5万元报酬/],
  ['family-domestic','good',['police','protect'],/41岁遭遇家庭暴力后咨询保护令和法律援助/],
  ['body-major','bad',['check','plan'],/41岁复查确诊重病，治疗后仍有活动限制/],
  ['body-occupational','bad',['evaluate','follow'],/41岁检查发现肺部损伤，治疗并调整生活安排/],
 ];
 for(const [id,outcome,choices,expected]of cases){const b=biography({...base(),record:{},scenarioHistory:[{id,startedAt:40,endedAt:41,outcome,choices:choices.map((choice,index)=>({choice,index,age:40+index}))}]});chronological(b);assert.match(b.sentence,expected);assert.equal(b.timeline.find(e=>e.id===id).age,41);assert.doesNotMatch(b.sentence,/40岁/);}

});


test('中途略过沉重剧情不把尚未发生的后果写进传记',async()=>{
 const {scenarioPatch}=await import('../src/engine/scenarios.js');
 const {withoutHeavyPending}=await import('../src/engine/cards.js');
 let lung={...base(),age:40,alive:true,record:{},scenarioHistory:[]};
 lung=scenarioPatch(lung,'body-occupational',0,'evaluate');
 lung=withoutHeavyPending({...lung,skipHeavy:true});
 assert.equal(lung.scenarioHistory.at(-1).outcome,'skipped');
 assert.doesNotMatch(biography(lung).sentence,/肺部受损|改变谋生方式/);
 let prison={...base(),age:18,alive:true,record:{},scenarioHistory:[]};
 for(const [age,index,choice]of [[18,0,'lend'],[19,1,'plead'],[20,2,'serve']])prison=scenarioPatch({...prison,age},'boundary-prison',index,choice);
 assert.ok(prison.incarceratedUntil>prison.age);
 prison=withoutHeavyPending({...prison,skipHeavy:true});
 assert.equal(prison.scenarioHistory.at(-1).outcome,'skipped');
 assert.doesNotMatch(biography(prison).sentence,/坐过1年牢后重新找工作/);
});


test('温暖类真实完成历史留在日志，传记不写温暖小事且不挤掉重大经历',async()=>{
 const {SCENARIO_CARDS}=await import('../src/engine/scenarios.js');
 const {step}=await import('../src/engine/life.js');
 for(const id of ['warm-neighbor','warm-community-kitchen']){
  let s={...base(),age:40,alive:true,capture:true,record:{},log:[],scenarioHistory:[]};
  for(let index=0;index<2;index++){
   const card=SCENARIO_CARDS.find(c=>c.id===`story:${id}:${index}`);
   s=step({...s,age:40+index,pending:card},{choice:card.options[0].id}).state;
  }
  const completed=s.scenarioHistory.find(h=>h.id===id);
  assert.ok(completed.endedAt!=null&&completed.resultFacts?.text);
  assert.ok(s.log.some(e=>e.scenarioId===id&&e.node==='scenario-end'));
  const before=JSON.stringify(s.log),b=biography({...s,age:80,alive:false,death:{detail:'脑卒中'}});
  assert.ok(!b.timeline.some(e=>e.id===id));assert.ok(!b.sentence.includes(completed.resultFacts.text));assert.equal(JSON.stringify(s.log),before);
  const major={id:'body-major',startedAt:43,endedAt:44,outcome:'bad',choices:[{index:0,choice:'check'},{index:1,choice:'plan'}]};
  const both=biography({...s,age:80,alive:false,death:{detail:'脑卒中'},scenarioHistory:[major,completed]});
  assert.match(both.sentence,/确诊重病/);assert.ok(!both.timeline.some(e=>e.id===id));chronological(both);
 }
});
test('旧存储事实和旧职业名只清理展示文案，不改原事实，也保留好运结果',()=>{
 const resultFacts={text:'办完继承手续，收到长辈留下的6万元',title:'办完手续继承一笔遗产'};
 const s={...base(),record:{age22:'编辑写作者'},scenarioHistory:[{id:'luck-inheritance',outcome:'good',startedAt:40,endedAt:41,resultFacts}],retiredAt:63};
 const before=JSON.stringify(s),b=biography(s);chronological(b);
 assert.match(b.sentence,/22岁做编辑，41岁继承长辈留下的6万元，63岁退休/);
 assert.equal(JSON.stringify(s),before);assert.ok(b.timeline.every(e=>BIOGRAPHY_STIFF_EXPRESSIONS.every(word=>!e.text.includes(word))));
});
test('次数和孩子人数十以内用汉字，十一及年龄金额仍保留数字',()=>{
 assert.equal(polishNarrative('1次，10次，11次，21次，10岁，60000元'),'一次，十次，11次，21次，10岁，60000元');
 for(const [count,expected]of [[2,'两'],[10,'十'],[11,'11']]){
  const b=biography({...base(),record:{masterAttempts:count,masterAdmitted:true}});
  assert.match(b.sentence,new RegExp(`考了${expected}次才读上研究生`));chronological(b);
 }
 const b=biography({...base(),record:{},kids:[{bornAt:31},{bornAt:34}]});
 assert.match(b.sentence,/31岁迎来第一个孩子，34岁迎来第二个孩子/);chronological(b);
});
test('考进事业单位不写成考上公务员',()=>{
 const b=biography({...base(),record:{civilAttempts:3,publicPath:'institution-recruitment',tizhiBy35:true}});
 assert.match(b.sentence,/先后考了三次，终于考进事业单位/);assert.doesNotMatch(b.sentence,/考上公务员/);chronological(b);
});

test('只升一级且未到顶级时，传记不额外追加职级小升级总结',()=>{
 const b=biography({...base(),record:{},occupation:{id:'welder',level:1,startedAt:22}});
 assert.doesNotMatch(b.sentence,/从学徒焊工做到熟练焊工/);
 assert.ok(!b.timeline.some(e=>e.summary&&e.evidence?.kind==='promotion'));
 chronological(b);
});


test('经营摘要按实际店铺、工厂或混合经营区分，不把工厂改写成店',()=>{
 const cases=[
  [[{type:'shop',startedAt:30,closedAt:35}],/开过一次店又关了/],
  [[{type:'factory',startedAt:30,closedAt:35}],/开过一次工厂又关了一次门/],
  [[{type:'factory',startedAt:30,closedAt:35},{type:'shop',startedAt:40,closedAt:45}],/开过两次生意又关了两次门/],
  [[{type:'factory',startedAt:30}],/一生开过一次工厂/],
  [[{type:'online',startedAt:30}],/一生开过一次店/],
  [[{startedAt:30,closedAt:35}],/开过一次生意又关了一次门/],
 ];
 for(const [businessHistory,expected]of cases){
  const s={...base(),record:{},businessHistory},before=JSON.stringify(s),b=biography(s);
  assert.match(b.sentence,expected);assert.match(b.shareSentence,expected);chronological(b);assert.equal(JSON.stringify(s),before);
  if(businessHistory.every(h=>h.type==='factory'))assert.doesNotMatch(b.sentence,/次店/);
 }
});
