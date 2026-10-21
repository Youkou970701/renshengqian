// Phase 02 is the only docs output this writer is authorized to update.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {drawBirth,createBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {summary} from '../src/engine/summary.js';
import {P} from '../src/engine/params.js';
import {events} from '../src/content/events/index.js';
import {footnote} from '../src/content/footnotes.js';
import {formatValue,formatTarget} from './cohort.mjs';
import assert from 'node:assert/strict';
const {cohort:c,effort:e,rows}=JSON.parse(readFileSync(new URL('./calibration-result.json',import.meta.url),'utf8'));
assert.equal(c.n,100000);assert.equal(e.n,100000);assert.equal(rows.length,25);assert.ok(rows.every(r=>r.pass));
const pct=(n,d)=>(100*n/d).toFixed(3)+'%';
const table=(headers,rs)=>'| '+headers.join(' | ')+' |\n| '+headers.map(()=>'---').join(' | ')+' |\n'+rs.map(r=>'| '+r.join(' | ')+' |').join('\n');
const samples=[];
for(const type of ['urban','rural'])for(let i=1;i<10000;i++){
 const b=drawBirth((Math.imul(i,2654435761)+123456789)>>>0);
 if(type==='urban'?b.hukou!=='urban'||b.wealthQ!==5:b.hukou!=='rural'||b.wealthQ!==1||!b.leftBehind||!b.parents.mother.away)continue;
 const s=simulate(b,{capture:true});if(s.age<60)continue;
 assert.deepEqual(s,simulate(createBirth(s.id),{capture:true}));samples.push(s);break;
}
assert.equal(samples.length,2);
writeFileSync(new URL('./life-examples-02.json',import.meta.url),JSON.stringify(samples,null,2)+'\n');
const stages=Object.fromEntries([...new Set(events.map(x=>x.stage))].map(k=>[k,events.filter(x=>x.stage===k).length]));
const cited=events.filter(x=>x.stat).length;
const sources=['data/cn-stats.json','docs/requirements.md','docs/codex-handoff-02-engine-content-fixes.md','docs/codex-handoff-01-results.md'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]);
const betaKeys=['stageWealth','stageUrban','generalWealth','generalUrban','generalGrade','completionWealth','bachelorBase','bachelorWealth','bachelorWealthHigh','bachelorUrban','bachelorGrade','bachelorGrind','tierScale','eliteWealth','eliteUrban','eliteBase','elite211Base'];
const citations=s=>s.log.filter(v=>v.stat||v.footnote).length;
const report=`# 第2阶段交付结果：出身梯度、成年去向与文案修复

2026-10-21。本阶段只写src/、scripts/、tests/、根配置和本结果文件。数据底表、需求与交接文档、01结果均未改。未做视觉方案、未部署。

## 运行与验收

- npm test：26项全部通过；内含20000局校准、20000组配对努力试验、2000局完整日志与真实React界面SSR文本检查。20000局校准测试在60秒以内。
- npm run calibrate：100000局完整生命周期 + 100000组努力配对；25项全部PASS，原17项目标保持不变，新增8项读取calibration_targets_v2。
- npm run fit：先按分层约束联合拟合，再以20000次真实出生运行到18岁，保留实际自动重心与事件积累，拟合本科截距。后一步见scripts/refine.mjs，目标取原37–45%区间内的42.5%，没有改动验收区间。
- npm run build：通过；npm run dev在本地试玩。编号与纯函数契约保留，更新后的同一编号/完整选择序列可逐字重放；01日志因引擎版本变化不承诺与02相同。
- 22–35岁每年都能安排事业计划，25岁迁居、29岁婚恋等生活节点后仍可同龄备考。已选择继续工作的年份不会重复弹计划。考研至多两次，录取后还要三年毕业才取得硕士；考编可反复参加。

## 10万局校准：原17项 + 新8项

${table(['指标','原定目标','实测','结果'],rows.map(r=>[r.name,r.name==='城市Q5自动减农村Q1全学习'?'>0pp':formatTarget({...r,max:r.max==='Infinity'?Infinity:r.max}),formatValue(r),r.pass?'PASS':'FAIL']))}

家境递增一项为联合布尔断言：城乡两行各自Q1<Q2<Q3<Q4<Q5，且各自Q5−Q3≥10pp；不是只断言全国均值。40岁职业的分母是存活并到达40岁的人；农村务农的分母是其中农村出生者。硕士率、35岁前曾进入体制内率均以全部出生队列为分母，后者包含公务员、事业编、教师、医护。

配对努力样本n=${e.n}：全学习本科率${pct(e.study,1)}，从不学习${pct(e.never,1)}，差${(100*e.difference).toFixed(3)}pp。农村Q1全学习${pct(e.poorStudy,1)}（n=${e.poorN}），城市Q5默认自动${pct(e.richAuto,1)}（n=${e.richN}）。努力试验至23岁，覆盖全部本科获得路径；全队列另运行至离世。

## 档位 × 户口 × 家境本科率矩阵

下面主矩阵与Claude分层探针一致：分母为活到18岁者；每格“最终本科率（样本数）”。全部出生队列口径另列后表，防止混分母。

${table(['档位','户口','Q1','Q2','Q3','Q4','Q5'],['S','A','B','C'].flatMap(t=>['urban','rural'].map(h=>[t,h,...[1,2,3,4,5].map(q=>{const x=c.strata[t+':'+h+':Q'+q];return pct(x.bachelor18,x.n18)+' (n='+x.n18+')';})])))}

### 全国城乡 × 家境：出生队列口径

${table(['户口','Q1','Q2','Q3','Q4','Q5'],['urban','rural'].map(h=>[h,...[1,2,3,4,5].map(q=>{const x=c.matrix[h+':Q'+q];return pct(x.bachelor,x.n)+' (n='+x.n+')';})]))}

### 各地区层次的本科率

${table(['地区层次','出生人数','高考人数','高考本科率','队列最终本科率'],['S','A','B','C'].map(t=>{const x=c.tiers[t];return[t,x.n,x.exams,pct(x.admit,x.exams),pct(x.bachelor,x.n)];}))}

## 成年去向

### 40岁职业分布

${table(['职业','人数','40岁存活者占比'],Object.entries(c.jobs40).sort((a,b)=>b[1]-a[1]).map(([k,n])=>[k,n,pct(n,c.at40)]))}

40岁存活样本n=${c.at40}；其中农村出身n=${c.ruralAt40}。骑手与网约车合计${pct(c.gig40,c.at40)}；农村出身务农${pct(c.farming40,c.ruralAt40)}。岗位中断风险按互联网、制造、建筑、服务、个体经营、务农和公共岗位区分，普通岗位中断后主要回到普通职业，并未默认转零工。

### 22岁去向

${table(['去向','人数'],Object.entries(c.career).sort((a,b)=>b[1]-a[1]))}

“待业”含22岁备考未录取者，不能直接拿这列除以出生人数与16.5%的城镇青年失业率相比；后者口径只用于未选升学/备考、求职者的就业判定。体制内各岗位在22岁表和35岁累计表采用同一职业集合。

### 学历与硕士

${table(['最终学历','人数','出生队列占比'],Object.entries(c.edu).map(([k,n])=>[k,n,pct(n,c.n)]))}

## 参数与拟合依据

${table(['参数','最终值','约束或解释'],betaKeys.map(k=>[k,Math.abs(P[k])<1e-9?'0（非负约束边界）':P[k].toFixed(9),({stageWealth:'分层家境斜率的一部分，联合普高/高中阶段总率',stageUrban:'城乡独立项，联合总进入率',generalWealth:'补课与学习支持差异，联合普高率61%',generalUrban:'城乡支持项，联合普高率61%',generalGrade:'成绩标准化先验；不是独立可识别的因果系数',completionWealth:'农村Q1完成高中37%与总完成度联合约束',bachelorBase:'实际18岁状态下全国高考本科率42.5%内点',bachelorWealth:'低中家境线性项，最优解落在非负边界',bachelorWealthHigh:'高于中间家境的增量项，城市Q5与Q5−Q3梯度约束',bachelorUrban:'同家境Q3城乡差≥5pp，拟合取8.5pp内点',bachelorGrade:'学习暴露标准化先验，与努力收益一起验收',bachelorGrind:'同出生队列全学习收益约12pp，实测要求5–20pp',tierScale:'保持省份底表相对差异，S/C本科率比约1.95内点',eliteWealth:'与本科分层强度绑定，验证985和农村生源约束',eliteUrban:'985农村占比10–25%，拟合17.5%代理内点',eliteBase:'985总体1.6%',elite211Base:'211含985累计5%背景锚点'})[k]]))}

本科财富项采用分段logit：β_low×(wealthQ−3)+β_high×max(wealthQ−3,0)。这让中间家境往上的求学支持继续产生差距，避免01里仅用毕业门槛导致Q3–Q5持平。低中段线性项落在非负边界不等于家境不起作用：普高、毕业、成绩起点和高段增量均保留家境贡献，最终城乡各五档已严格递增。

地区、财富与城乡系数是在本产品分层约束下联合拟合的概率模型，不是从这张汇总表唯一估出的社会因果效应；stage/general的分配比例、成绩标准化项等仍有正则化先验。报告区分“目标约束下选择”和“原始统计事实”，没有把先验也叫已核结论。

### 成年路径参数

~~~json
${JSON.stringify(P.career,null,2)}
~~~

考研单次以底表24%报录参照、考公以86:1参照作logit基准；事业编另设通道。每年参加比例及成功截距以硕士4–9%、体制内3–7%约束联合验收，civilApply由原0.30降至0.20以容纳生活节点之后的逐年重考机会。务农与零工转向用新40岁职业约束验收。学历、成绩等细分项为集中列明的条件先验，现有八个群体目标不足以唯一识别每个细分项。

## 文案、家庭与脚注

- ${events.length}条日常模板；各阶段：${Object.entries(stages).map(([k,n])=>k+' '+n).join('，')}。另有关键裁决、年度考试、家人离世等节点叙述，不为凑数并入日常模板数。
- ${cited}条日常模板带数字脚注，均对应正在讲述的留守、升学等事实。已取消40%覆盖率；没有给书包、鸡蛋羹等日常物件硬挂统计。
- 2000局实际日志扫描包含每个关键裁决、数字脚注、出生/终局文本、全部实际抉择及真实React页面SSR。内部术语、插值错误、模板超过两次或间隔不足五年都会失败。
- 35岁企业岗位脚注直接显示本次采用的行业风险百分比与“来源：本地岗位风险参数；不是行业调查结果”。不把它冒充官方裁员率，也不挂无关的青年失业率。测试逐条核对百分比与实际industry/probability及params一致；公共岗位用相关体制内背景数字。
- 每个拒录主因都记录实际logit贡献、抽样值与概率。只有移除该项能翻转本次结果时才写成主因，否则写竞争结果；成功同样检查必要的正贡献，复读加成也进入归因。未编造未存储的“差11分”“家里寄2万元”等个人数字。
- 玩家和父母均有中文名，省内地点每省5个；姓名/地名为虚构人生叙事，不评价地域。父亲/母亲外出标志驱动不同照护事件；中年父母按年龄和对应生命表变老、患病、离世，死后不再触发在世父母事件。出生描述用出生时年龄，不把父母离世后的年龄写成当前做工状态。
- 孩子出身保存于出生当年，终局用人话展示；没有把内部财富编号写给玩家。

## 两局完整人生日志

样例按固定种子扫描，选择首个满足出身条件且活到60岁的人，不挑选学历或职业。两局均用默认自动安排与自动抉择。农村样例要求农村Q1、留守且双亲离家，由祖辈照护，便于完整展示这一条家庭线。结构化状态见scripts/life-examples-02.json；已逐字重放验证。

${samples.map(s=>`### ${s.hukou==='urban'?'城市 Q5':'农村 Q1 · 留守'}：${s.id}\n\n${createBirth(s.id).log[0].text}\n\n终局：${summary(s).education}，${s.age}岁，退休前最后工作${s.lastJob??s.job}。共${s.log.length}条记录，其中${citations(s)}条带数字脚注。\n\n`+s.log.map((v,i)=>`${i+1}. **${v.age}岁**：${v.text}${v.stat||v.footnote?'\n   '+(v.footnote??footnote(v.stat)):''}`).join('\n')).join('\n\n')}

## 浏览器核验

实际跑通出生卡、暂停、手动抉择、25岁迁居后同龄事业计划、终局与续档。控制台无运行错误。375px实际iframe检查：内容宽375px / 滚动宽375px，PASS；截图保存在tests/ui-mobile-02.png。朴素样式沿用01，本阶段没有视觉设计。

![375px出生卡验收](/Users/xiaoyang/Dev/workspace/toutai-sim/tests/ui-mobile-02.png)

## 数据与口径说明

- 只读取更新后的calibration_targets_v2，不改目标；guokao_ratio_2026日期已正确记为2025-10-24，出处页包含它，当前考试基准沿用2025年86:1以保持口径一致。
- 92%高中毛入学率与初中毕业者进入高中阶段比例仍不同；遵照交接原口径验收，不混称真实队列转化率。37%贫困农村高中完成来自较早调查；985农村构成仍借北大历史资料做代理。
- 工资、养老金、行业中断风险、死因细分与模拟家境分布仍为本地参数，不能当作官方个体预测。预期寿命为合成队列，未随未来年份自动增长；死亡分布不受健康重心任意改动，确保原寿命校准稳定。
- 当前无自杀、暴力、性暴力事件，不展示未使用的援助号码。本文内部校准表保留Q1等审计术语；玩家界面与实际人生记录不显示这些词。

## 只读文件留痕

${table(['文件','SHA-256'],sources)}
`;
writeFileSync(new URL('../docs/codex-handoff-02-results.md',import.meta.url),report);
console.log(samples.map(s=>({id:s.id,name:s.name,age:s.age,edu:s.edu,job:s.lastJob,logs:s.log.length,citations:citations(s),leftBehind:s.leftBehind})));
