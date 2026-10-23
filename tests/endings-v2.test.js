import test from 'node:test';
import assert from 'node:assert/strict';
import {biography} from '../src/engine/biography.js';
import {TITLES,TITLE_BY_ID,selectTitle} from '../src/content/titles.js';
import {LIFE_COLORS,lifeColor,CHOICE_COLOR_SCORES} from '../src/content/life-colors.js';
import {CARD_BY_ID} from '../src/content/cards/index.js';
import {createBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
const base=()=>({...createBirth('粤-2026-123456'),age:70,record:{},cardHistory:[],focusHistory:[],alive:true});
test('称号与底色库有独立名字、稳定标识和完整分享措辞',()=>{
 assert.ok(TITLES.length>=100);assert.equal(new Set(TITLES.map(t=>t.id)).size,TITLES.length);assert.equal(new Set(TITLES.map(t=>t.name)).size,TITLES.length);
 assert.equal(LIFE_COLORS.length,16);assert.equal(new Set(LIFE_COLORS.map(c=>c.name)).size,16);
 for(const t of TITLES){assert.ok(t.name&&t.shareName);assert.doesNotMatch(t.shareName,/暴力|犯罪|毒品|家暴/);}
});
test('传记仅引用记录里的年龄、职业、孩子和结局；不编造持续年数',()=>{
 const s={...base(),age:78,alive:false,death:{detail:'脑卒中'},edu:'college',record:{junior:true,age22:'工厂工人'},occupation:{id:'welder'},kids:[{bornAt:30}]};
 const b=biography(s);assert.match(b.sentence,/22岁在工厂上班/);assert.doesNotMatch(b.sentence,/焊工/);assert.match(b.sentence,/30岁有了一个孩子/);assert.match(b.sentence,/78岁因脑卒中离开/);assert.doesNotMatch(b.sentence,/干了|养大|主任|连续/);
 assert.doesNotMatch(biography({...s,alive:true}).sentence,/因脑卒中离开/);
});
test('避开只称避开；未结束剧本不伪造完成结局',()=>{
 const h={id:'boundary-driving',heavy:true,startedAt:29,endedAt:29,outcome:'avoided'};const b=biography({...base(),scenarioHistory:[h]});
 assert.equal(b.title.id,'story-boundary-driving-avoided');assert.match(b.sentence,/没有自己开车/);assert.doesNotMatch(b.sentence,/付出代价/);
 assert.notEqual(selectTitle({...base(),scenarioHistory:[{...h,outcome:null,endedAt:undefined}]}).kind,'scenario');
});
test('称号用实际职业、履历、选择匹配；失败备考不冒充上岸',()=>{
 const s={...base(),workExperience:{factory:10,welder:20}};assert.equal(selectTitle(s).id,'career-welder');
 assert.notEqual(selectTitle({...base(),record:{civilAttempts:3,tizhiBy35:true,publicPath:'teacher'}}).id,'civil-retry');
 assert.equal(selectTitle({...base(),record:{civilAttempts:3,tizhiBy35:true,publicPath:'civil-exam'}}).id,'civil-retry');
 assert.equal(selectTitle({...base(),record:{marriages:2,divorces:1}}).id,'marriage-again');
});
test('空白和中间值不会被seed强行涂色；相同选择跨种子一致',()=>{
 const blank=lifeColor(base());assert.equal(blank.id,'uncolored');assert.ok(blank.axes.every(a=>a.side==='unknown'&&a.evidenceCount===0));
 const choices=[{id:'work-salary-talk',choice:'rest'},{id:'work-salary-talk',choice:'ask'}];
 const a=lifeColor({...base(),cardHistory:choices}),b=lifeColor({...base(),seed:2345,cardHistory:choices});assert.deepEqual(a,b);assert.equal(a.axes[0].side,'balanced');assert.equal(a.axes[3].side,'balanced');
});
test('卡片上下文决定含义，不把同名选项强行归轴',()=>{
 const a=lifeColor({...base(),cardHistory:[{id:'unknown-card',choice:'accept'}]});assert.ok(a.axes.every(x=>x.evidenceCount===0));
 const b=lifeColor({...base(),cardHistory:[{id:'parent-inheritance',choice:'leave'}]});assert.equal(b.axes[1].side,'left');assert.equal(b.axes[2].side,'unknown');
});
test('focus累计真实次数；财务实际输入可改变风险与照护倾向',()=>{
 const b=lifeColor({...base(),focusHistory:Array.from({length:20},(_,age)=>({age,focus:'family'})),inputHistory:[{action:'parents',age:30},{action:'stock',age:31}]});
 assert.equal(b.axes[1].evidenceCount,21);assert.equal(b.axes[0].evidenceCount,21);assert.equal(b.axes[0].side,'balanced');assert.equal(b.axes[1].side,'left');
});
test('分享传记与称号中性化敏感经历',()=>{
 const s={...base(),alive:false,death:{detail:'暴力伤害'},scenarioHistory:[{id:'victim-phone',heavy:true,outcome:'bad',startedAt:25,endedAt:27}]};const b=biography(s);assert.doesNotMatch(b.shareSentence+b.title.shareName,/暴力|犯罪|毒品|家暴|抢夺/);
});
test('真实capture:false生命周期也保留结局依据；生成纯函数不动状态与随机流',()=>{
 const s=simulate(createBirth('粤-2026-123456'));const before=structuredClone(s);const b=biography(s);assert.ok(TITLE_BY_ID[b.title.id]);assert.equal(b.color.axes.length,4);assert.deepEqual(s,before);assert.deepEqual(biography(s),b);
});

test('每条底色映射都引用现有卡片的现有选项',()=>{for(const [id,choices]of Object.entries(CHOICE_COLOR_SCORES)){assert.ok(CARD_BY_ID[id],id);for(const choice of Object.keys(choices))assert.ok(CARD_BY_ID[id].options.some(o=>o.id===choice),id+':'+choice);}});
