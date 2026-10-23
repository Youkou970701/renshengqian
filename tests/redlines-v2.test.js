import {SCENARIOS} from '../src/content/scenarios.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS} from '../src/content/cards/index.js';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {birthCard,endCard,cardText} from '../src/ui/share-cards.js';
// Explicit editorial constraints are independent of the generator and never
// derived from the same content being tested. Extend only by review, not to fit output.
const redlines=[/撬锁教程|开锁步骤|如何行窃|作案手法|销赃渠道|赌术|出千技巧|稳赢打法|吸食方法|吸食方式|制毒步骤|诈骗话术|洗钱步骤|逃避侦查/,
 /强奸|性侵|强暴|性暴力|猥亵儿童/,
 /跳楼|上吊|割腕|吞药自尽|自杀教程|自杀方法/,
 /上访|群体事件|强拆|冲击政府|制度害人|政策害人|政府害人|户籍制度害人|高考制度害人/,
 /低等人|地域劣根|活该穷|赌博致富|吸毒很酷|犯罪真爽|混社会最有前途/];
const shareForbidden=/犯罪|毒品|家暴|赌博|坐牢|诈骗|盗窃|抢劫|案底|戒毒|自杀/;
const heavyCategories=new Set(['crime','drugs','gambling','domestic-violence','suicide','serious-illness']);
function check(text,context){for(const rule of redlines)assert.doesNotMatch(text,rule,context);}
test('v2 全卡片文案硬红线：无方法、美化、性暴力、敏感冲突或政策评价',()=>{
 for(const c of CARDS)for(const b of [drawBirth(42),{...drawBirth(43),age:17},{...drawBirth(44),age:42}]){
  const text=[c.title,typeof c.body==='function'?c.body(b):c.body,...c.options.flatMap(o=>[o.label,o.hint])].filter(Boolean).join('\n');check(text,c.id);
  if(heavyCategories.has(c.category))assert.equal(c.heavy,true,c.id+' 必须被沉重开关覆盖');
 }
});
test('v2 两千局实际日志红线、略过沉重开关与真实分享卡净化',()=>{
 let logs=0;
 for(let i=0;i<2000;i++){
  const b=drawBirth((Math.imul(i,2654435761)+123456789)>>>0),normal=simulate(b,{capture:true}),light=simulate({...b,skipHeavy:true},{capture:true});
  for(const e of normal.log){check(e.text,b.id);logs++;if(e.category==='suicide')assert.ok(/离开/.test(e.text)&&e.help,'相关情节必须保留求助渠道');}
  for(const h of light.cardHistory){const c=CARDS.find(c=>c.id===h.id);assert.ok(!c?.heavy,b.id+' 跳过沉重仍触发 '+h.id);}
  for(const e of light.log)assert.ok(!heavyCategories.has(e.category));
  for(const svg of [birthCard(b),endCard(normal)])assert.doesNotMatch(cardText(svg),shareForbidden,b.id+' 分享卡出现沉重字样');
 }
 assert.ok(logs>50000,'扫描必须覆盖实际日志，不能只检查静态模板');
});

test('所有剧本声明的结尾与分支事实也接受红线扫描，不靠随机局碰到稀有结局',()=>{
 const strings=x=>typeof x==='string'?[x]:Array.isArray(x)?x.flatMap(strings):x&&typeof x==='object'?Object.values(x).flatMap(strings):[];
 for(const def of SCENARIOS)check(strings(def).join('\n'),def.id);
});
