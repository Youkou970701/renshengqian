import test from 'node:test';
import assert from 'node:assert/strict';
import {createBirth} from '../src/engine/birth.js';
import {biography} from '../src/engine/biography.js';
import {selectTitle,titleCandidates,TITLES} from '../src/content/titles.js';
import {terminalText,childStartingText} from '../src/content/presentation.js';
import {civilNarrativeAttempts} from '../src/content/narrative-facts.js';
import {SCENARIOS} from '../src/content/scenarios.js';
import {JOB_BY_ID} from '../src/content/jobs.js';
const base=()=>({...createBirth('粤-2026-123456'),age:80,alive:false,death:{detail:'脑卒中'},record:{},workExperience:{},occupation:null,scenarioHistory:[],log:[]});
const story=(id,outcome='bad')=>({id,startedAt:40,endedAt:41,outcome,resultFacts:{...SCENARIOS.find(d=>d.id===id).endFacts[outcome]},choices:[]});

test('职业短语覆盖务农、个体经营、参军和转行，年限总结也使用合适动词',()=>{
 const cases=[['务农','在家务农'],['个体户','自己做生意'],['个体经营者','自己做生意'],['军人','入伍当兵'],['自由职业者','自由接活'],['店主','开店做生意'],['小厂经营者','经营一家小厂'],['网店店主','开网店'],['建筑工人','在工地干活']];
 for(const [job,phrase]of cases){
  const b=biography({...base(),record:{age22:job}});assert.ok(b.sentence.includes(`22岁${phrase}`),b.sentence);assert.ok(b.shareSentence.includes(phrase));
 }
 for(const j of Object.values(JOB_BY_ID)){
  const b=biography({...base(),record:{age22:j.name},workExperience:{[j.id]:20}});
  assert.doesNotMatch(b.sentence,/做务农|做个体户|做个体经营者|做军人|做自由职业者|做了20年务农|做了20年军人/);
 }
 assert.match(biography({...base(),record:{age22:'工厂工人'},occupation:{id:'farm',startedAt:40}}).sentence,/40岁回家务农/);
 assert.match(biography({...base(),workExperience:{farm:20}}).sentence,/前后种了20年地/);
 assert.match(biography({...base(),workExperience:{soldier:20}}).sentence,/前后当了20年兵/);
});

test('终局只用终点事实和最后职业，不拼孩子出生、入学或其他早年日志',()=>{
 const s={...base(),lastJob:'焊工',kids:[{bornAt:30,wealthQ:1}],log:[{age:6,text:'你背起书包入学'},{age:30,text:'孩子来到这个家'}]};
 assert.match(childStartingText(s),/孩子来到这个家/);
 const text=terminalText(s);assert.match(text,/80岁这一年.*脑卒中/);assert.match(text,/最后一份工作是焊工/);
 assert.doesNotMatch(text,/孩子来到|开始安排接下来|每一笔学费|入学|背起书包/);
 assert.equal(terminalText({...s,kids:[],log:[]}),text);
});

test('所有疾病结局落在躲开之后、普通寿命兜底之前，生意和事业优先',()=>{
 const diseases=TITLES.filter(t=>['body-major','body-mood','body-occupational','body-parent'].includes(t.scenarioId));
 assert.ok(diseases.length>4);assert.ok(diseases.every(t=>t.priority===24));
 for(const id of ['body-major','body-mood','body-occupational','body-parent']){
  const illness=story(id),s={...base(),scenarioHistory:[illness]};
  assert.equal(selectTitle(s).scenarioId,id);
  assert.equal(selectTitle({...s,businessHistory:[{type:'shop',startedAt:30,closedAt:35}]}).id,'shop-close');
  const avoided={id:'boundary-driving',startedAt:30,endedAt:30,outcome:'avoided'};
  assert.equal(selectTitle({...s,scenarioHistory:[illness,avoided]}).scenarioId,'boundary-driving');
  assert.equal(selectTitle({...s,age:101}).id,'long-life');
 }
});

test('父母离婚的称号、分享称号和传记共用发生年龄，其他结果仍取完成年龄',()=>{
 const parent={id:'family-parents-separate',startedAt:15,endedAt:16,outcome:'good',choices:[{index:0,choice:'ask'},{index:1,choice:'timetable'}],resultFacts:{text:'父母离婚后按约分别探望',title:'父母离婚后按约分别探望'}};
 const s={...base(),scenarioHistory:[parent]},before=JSON.stringify(s),b=biography(s);
 assert.equal(b.title.values.age,15);assert.equal(b.timeline.find(e=>e.id===parent.id).age,15);
 assert.match(b.title.name,/15岁父母离婚后两边跑着长大/);assert.equal(b.title.name,b.title.shareName);assert.match(b.sentence,/15岁父母离婚/);
 assert.doesNotMatch(b.title.name+b.sentence,/16岁|按约分别探望/);assert.equal(JSON.stringify(s),before);
 const other={...base(),scenarioHistory:[story('body-major')]};
 const t=titleCandidates(other).find(t=>t.scenarioId==='body-major');assert.equal(t.values.age,41);assert.equal(biography(other).timeline.find(e=>e.id==='body-major').age,41);
});

test('考公展示按实际可报考年限封顶，两处同值，不改原始尝试记录',()=>{
 // The engine allows one annual attempt at 22–35: fourteen remains below the
 // handoff's display ceiling (22–34, two exams/year = twenty-six).
 assert.equal(civilNarrativeAttempts({...base(),record:{civilAttempts:14}}),14);
 for(const admitted of [false,true]){
  const s={...base(),collegeGraduateAge:30,cardHistory:[{id:'career',choice:'civil',age:32}],record:{civilAttempts:40,publicRecruitmentLastAge:35,...(admitted?{publicPath:'civil-exam'}:{})}},before=JSON.stringify(s);
  const b=biography(s);assert.equal(b.title.values.attempts,6);assert.match(b.title.name,/六次/);assert.match(b.sentence,/六次/);assert.equal(JSON.stringify(s),before);
 }
 assert.equal(civilNarrativeAttempts({...base(),age:23,record:{civilAttempts:14}}),4);
 assert.equal(civilNarrativeAttempts({...base(),age:20,record:{civilAttempts:14}}),0);
});
