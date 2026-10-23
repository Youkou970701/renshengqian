import {scenarioNarrativeAge,civilNarrativeAttempts} from './narrative-facts.js';
import {polishNarrative} from './narrative-copy.js';
import {SCENARIOS} from './scenarios.js';
import {JOBS} from './jobs.js';
import {netAssets} from '../engine/money.js';
import {titleFacts} from './title-facts.js';
export {titleFacts} from './title-facts.js';

// Priority and rarityRank are editorial simulation parameters, not measured
// population rarity. The probe measures frequencies by stable pattern id.
const suffix='的人生';
const branchFactIds=new Set(SCENARIOS.filter(d=>d.endFacts).map(d=>d.id));
const interpolate=(template,values)=>template.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]));
function pattern(id,body,kind,priority,description,match,{shareBody=body,detail=''}={}){
 const template=polishNarrative(body+suffix),shareTemplate=polishNarrative(shareBody+suffix);
 const variables=[...new Set([...template.matchAll(/\{(\w+)\}/g)].map(x=>x[1]))];
 const labels={age:'年龄',years:'累计年数',startedAge:'起始年龄',rank:'实际职级',attempts:'考试次数',campus:'录取院校层次',province:'出生省份',birthPlace:'出生地',count:'实际次数或人数',opened:'开业次数',closed:'关门次数',amount:'实际金额',birthday:'下一个生日年龄',venture:'实际经营类型',destination:'实际录用去向'};
 const displayName=template.replace(/\{(\w+)\}/g,(_,key)=>`〔${labels[key]??key}〕`);
 return {id,name:template,shareName:shareTemplate,displayName,template,shareTemplate,variables,kind,priority,rarityRank:priority,description,detail,match,render:values=>polishNarrative(interpolate(template,values)),renderShare:values=>polishNarrative(interpolate(shareTemplate,values))};
}
const fact=(values,evidence,score=0)=>({values,evidence,score});
const recordFact=(f,field,value,values,score=0)=>fact(values,{kind:'record',field,value},score);
const scenarioFact=(h,values={})=>fact({age:scenarioNarrativeAge(h),startedAge:h.startedAt,...values},{kind:'scenario',id:h.id,startedAt:h.startedAt,endedAt:h.endedAt,outcome:h.outcome,heavy:!!h.heavy,choices:(h.choices??[]).map(x=>({...x}))});
const storyMatch=(id,outcomes,extra=()=>({}))=>f=>{const h=f.completedScenarios.find(h=>h.id===id&&outcomes.includes(h.outcome));if(!h)return null;const values=extra(h,f);return values===null?null:scenarioFact(h,values);};
const story=(id,outcome,body,priority,description,extra=()=>({}),shareBody=body)=>({...pattern(`story-${id}${outcome?'-'+outcome:''}`,body,'scenario',priority,description,storyMatch(id,outcome?[outcome]:['good','bad','mixed','rehabilitated'],extra),{shareBody,detail:body.replace(/^.*?岁/,'').replace(/\{[^}]*\}/g,'这次')}),scenarioId:id,outcome});

// A profession is a different trajectory, not a seed or age bucket. Years are
// the engine's cumulative experience count, never a claim of continuous work.
const professions=JOBS.filter(j=>j.id===j.profession);
const careers=professions.map(job=>pattern(`career-${job.id}`,({farm:'累计种了{years}年地',rider:'累计跑了{years}年外卖',courier:'累计送了{years}年快递',driver:'累计开了{years}年网约车',soldier:'累计当了{years}年兵',teacher:'累计教了{years}年书',writer:'累计做了{years}年编辑',freelancer:'累计做了{years}年自由职业'})[job.id]??`累计做了{years}年${job.name}`,'career',60,`workExperience.${job.id} > 0；累计职业年数`,f=>{
 const rows=f.work.filter(w=>w.job.profession===job.id);if(!rows.length)return null;
 const years=Math.max(...rows.map(w=>w.years));
 return fact({years},{kind:'career',jobId:job.id,years,work:rows.map(w=>({jobId:w.jobId,years:w.years}))},Math.min(12,years/3));
}));
const promotions=professions.filter(j=>j.levels.length>1).map(job=>pattern(`career-${job.id}-promotion`,`${({mechanic:'修车',cook:'学做菜',repair:'修手机',hairdresser:'学理发',beautician:'学美容'})[job.id]??''}从${job.levels[0].title}干到{rank}`,'career',78,`最后保留的 occupation 是 ${job.id} 职系，实际 level >= 2 或已达该职业顶级；不推算历史最高职级`,f=>{
 const o=f.occupation;if(o?.job.profession!==job.id||!Number.isInteger(o.level)||o.level<1||!o.job.levels[o.level]||(o.level<2&&o.level!==o.job.levels.length-1))return null;
 return fact({rank:o.job.levels[o.level].title},{kind:'promotion',jobId:o.id,level:o.level,rank:o.job.levels[o.level].title},o.level*2);
}));

const outcomes=[
 story('boundary-drunk','bad','酒后打架留下刑事记录',112,'本剧本 bad 实际施加刑事记录',h=>h.hasEffect('criminalRecord')?{}:null,'喝酒惹祸后重新安排生活'),
 story('boundary-driving','bad','酒后开车被判拘役',112,'酒后驾驶剧本 bad 结局',()=>({}),'喝酒犯错后重新安排生活'),
 story('boundary-prison','bad','借出一张银行卡坐了{years}年牢',118,'真实服刑区间截到终局年龄；不把刚判的刑期当已服刑年数',h=>h.servedYears>0?{years:h.servedYears}:null,'走过弯路后又一次重新开始'),
 story('boundary-prison','rehabilitated','借出一张银行卡坐了{years}年牢后重新找工',110,'实际施加服刑并完成出狱后续',h=>h.servedYears>0?{years:h.servedYears}:null,'重新开始后又去找工作'),
 story('boundary-gambling','bad','上牌桌后背上{amount}元借款',111,'本段实际新增债务；不以结尾叙述推断卖房或离婚',h=>{const amount=h.effects.reduce((n,e)=>n+(e.debtDelta??0),0);return amount>0?{amount}:null;}),
 story('boundary-gambling','rehabilitated','欠债后在{age}岁戒了赌',103,'明确 rehabilitated 结局'),
 story('boundary-theft','bad','在{age}岁偷拿东西后进入专门学校',107,'bad 明确进入专门学校，不冒充刑事记录',()=>({}),'在{age}岁走过一段弯路'),
 story('jianghu-circle','bad','跟着熟人混社会被判{years}年',115,'本段实际施加 prisonYears',h=>h.prisonYears>0?{years:h.prisonYears}:null,'走过弯路后重新开始了一次'),
 story('jianghu-circle','rehabilitated','在{age}岁离开旧圈子回家重新干活',102,'明确 rehabilitated 结局'),
 story('accident-road','bad','车祸后在{age}岁留下残疾',108,'本段实际施加 disability',h=>h.hasEffect('disability')?{}:null),
 story('victim-phone','bad','手机被抢后又损失{amount}元',101,'本段 bad 的实扣财产',h=>h.assetsDelta<0?{amount:-h.assetsDelta}:null,'丢了手机后又损失{amount}元'),
 story('victim-phone','good','在{age}岁找回被抢走手机',85,'明确找回结局',()=>({}),'在{age}岁找回丢失手机'),
 story('victim-bike','good','在{age}岁找回被偷走电动车',83,'明确找回结局',()=>({}),'在{age}岁找回丢失电动车'),
 story('trap-drugs','bad','染上毒瘾后在{age}岁再次接受治疗',109,'已完成接触及治疗阶段',()=>({}),'在{age}岁重新接受治疗'),
 story('trap-drugs','rehabilitated','在{age}岁戒毒后回家重建生活',106,'rehabilitated 明确戒断结局',()=>({}),'在{age}岁治疗后回家重建生活'),
 story('family-domestic','bad','遭遇家庭暴力后在{age}岁寻求保护',107,'完成家庭暴力剧本',()=>({}),'在{age}岁求助保护自己'),
 story('luck-compensation','good','拿到{amount}元补偿后守住家底',105,'本段实际收到补偿，good 结局',h=>{const amount=h.effects.reduce((n,e)=>n+Math.max(0,e.assetsDelta??0),0);return amount>0?{amount}:null;}),
 story('luck-compensation','bad','拿到补偿后又损失{amount}元',106,'本段实际扣款，不能臆造十年花光',h=>{const amount=h.effects.reduce((n,e)=>n-Math.min(0,e.assetsDelta??0),0);return amount>0?{amount}:null;}),
 story('luck-compensation','mixed','补偿到账后又花掉{amount}元',98,'本段实际负向支出总额，不推断剩余财产',h=>{const amount=h.effects.reduce((n,e)=>n-Math.min(0,e.assetsDelta??0),0);return amount>0?{amount}:null;}),
 story('luck-prize','good','领奖拿到{amount}元奖金',87,'实际完成的领奖正向入账；不臆造存款动作',h=>h.assetsDelta>0?{amount:h.assetsDelta}:null),
 story('luck-mentor','good','在{age}岁交付项目挣到额外报酬',85,'完成项目交付结局'),
 story('luck-inheritance','good','在{age}岁继承一笔遗产',86,'完成财产手续结局'),
 
 story('body-parent','good','在{age}岁等父母病情稳定继续照护',24,'完成父母入院及后续照护'),
 story('accident-water','good','在{age}岁呼叫救援等来报平安',79,'完成救援后续'),
];
// Explicit exits get low priority: avoiding an invitation is not an accident,
// a criminal record, lost property, or a dramatic result that actually happened.
const avoidedRows=[
 ['boundary-drunk','结账离开避开酒桌打架','结账离开避开酒桌争执'],
 ['boundary-driving','喝酒后叫车避开亲自开车'],
 ['boundary-prison','没借出银行卡避开一场案件','没借出银行卡避开一场麻烦'],
 ['boundary-gambling','留在家里没去那场牌局'],
 ['boundary-theft','拒绝起哄没拿货架商品'],
 ['jianghu-circle','拒绝熟人邀约没进旧圈子'],
];
const legacyExits=avoidedRows.map(([id,body,shareBody=body])=>story(id,'avoided',`在{age}岁${body}`,26,'仅完成 avoided 结局可用',()=>({}),`在{age}岁${shareBody}`));

const exits=legacyExits;

// Completed scene facts. No title is awarded for a card's heading, an offered
// opportunity, or an unfinished scene. Prominent careers outrank these vignettes.
const scenes=[
 ['accident-road','车祸后在{age}岁接受治疗',69],['accident-site','工伤后在{age}岁办下认定和补偿',72],['accident-fire','火灾后在{age}岁搬进临时住处',74],['accident-water','在{startedAge}岁遇上落水险情后呼叫救援',57],
 ['victim-bike','丢车后在{age}岁换了一辆车',64],['victim-phone','手机被抢后在{age}岁补卡重新生活',67,'手机丢失后在{age}岁补卡重新生活'],['victim-fraud','遭遇诈骗后在{age}岁重新安排账单',76,'损失钱款后在{age}岁重新安排账单'],['victim-pyramid','受骗滞留外地后在{age}岁回到家',77,'外出受阻后在{age}岁终于回到家'],
 ['boundary-drunk','酒后争执在{age}岁赔钱收场',76,'酒后争执在{age}岁赔钱收场'],['boundary-driving','酒后开车在{age}岁被暂扣驾照',77,'喝酒犯错后在{age}岁改乘公共交通'],
 ['jianghu-esport','参加青训到{age}岁仍没能晋级',75],['jianghu-south','南下找工到{age}岁还被拖欠工资',75],['jianghu-apprentice','交钱学手艺到{age}岁却没等到工作',75],
 ['trap-loan','借款到期在{age}岁开始逐笔还账',76],['trap-investment','买入理财到{age}岁仍无法提现',79,'存入钱款到{age}岁仍无法取回'],['trap-parents','在{age}岁替父母退货只追回部分钱',72],
 ['family-parents-separate','{age}岁父母离婚后两边跑着长大',83],['family-betrayal','伴侣出轨后在{age}岁分居生活',83],['family-child-school','在{age}岁陪厌学孩子求助调整上学安排',71],['family-domestic','遭遇家庭暴力后在{age}岁咨询保护令',85,'在{age}岁咨询法律援助寻求保护'],
 ['body-major','重病确诊后在{age}岁安排治疗',24],['body-mood','持续低落后在{age}岁就医复诊',24],['body-occupational','在{age}岁查出肺部损伤',24],['body-parent','父母入院后在{age}岁安排轮流照护',24],
 ['warm-neighbor','敲开邻居门一起做了顿饭',41],['warm-reunion','回家见了多年未见同桌',42],['warm-library','读完一本书结识两位书友',43],['warm-garden','把快枯花养出新叶',40],
 ['warm-repair','修好父亲舍不得扔掉收音机',43],['warm-pet','救下小猫找到领养人',46],['warm-volunteer','完成社区活动认识一楼邻居',43],['warm-cooking','照母亲语音学会家乡菜',42],
 ['warm-music','参加合唱完成一场演出',47],['warm-walk','跟朋友坚持饭后散步',42],['warm-class','回夜校学完一门课程',46],['warm-lost','找回钱包证件和现金',43],
 ['warm-birthday','收下蛋糕把生日卡留了下来',40],['warm-letter','寄出一封信解开旧误会',44],['warm-team','跟同事补救失误赶上期限',44],['warm-photo','约家人团聚拍了新合照',43],
 ['warm-craft','摆摊卖出第一件手作',48],['warm-stage','背熟台词完成小剧场演出',48],['warm-train','到车站接回久未见面亲人',42],['warm-thanks','收到多年后登门道谢',43],
 ['warm-park','在公园下棋结识新朋友',43],['warm-window','收拾出书桌养成阅读习惯',40],['warm-song','跟孩子学会一首新歌',41],['warm-home','跟亲人清扫老屋重新开门',42],
 ['warm-flower','买花回家学会照顾自己',40],['warm-helper','借伞后还伞送去感谢卡',41],['warm-winter','拆织几遍织成第一双手套',43],['warm-second-chance','与老朋友道歉恢复联系',44],
];
const sceneTitles=scenes.map(([id,body,priority,shareBody=body])=>story(id,'',body.includes('{')?body:`在{age}岁${body}`,priority,'非 avoided/skipped 且已结束；仅叙述本段已经完成动作',h=>{
 // First-scene mixed exits have not performed the later scene's actions.
 if(!h.reachedLastStep)return null;
 // These two paths have different concrete results within the same outcome.
 if(id==='victim-phone'&&h.outcome==='good'||id==='victim-bike'&&h.outcome==='good')return null;
 if(id==='boundary-driving'&&h.outcome!=='mixed')return null;
 if(id==='boundary-drunk'&&h.outcome==='bad')return null;
 return {};
},shareBody.includes('{')?shareBody:`在{age}岁${shareBody}`));

const businessVenture=rows=>rows.every(x=>['shop','online'].includes(x.type))?'店':rows.every(x=>x.type==='factory')?'工厂':'生意';

const other=[
 pattern('civil-retry','考了{attempts}次终于考上{destination}','career',94,'实际考试录用 publicPath，至少两次；仅 tizhiBy35 不是上岸证据',f=>civilNarrativeAttempts(f.s)>1&&['civil-exam','institution-recruitment'].includes(f.record.publicPath)?recordFact(f,'publicPath',f.record.publicPath,{attempts:civilNarrativeAttempts(f.s),destination:f.record.publicPath==='civil-exam'?'公务员':'事业单位'}):null),
 pattern('civil-not-admitted','考公{attempts}次仍未录用','career',84,'至少两次且从未有 publicPath/tizhiBy35 录用记录',f=>civilNarrativeAttempts(f.s)>1&&!f.record.publicPath&&!f.record.tizhiBy35?recordFact(f,'civilAttempts',f.record.civilAttempts,{attempts:civilNarrativeAttempts(f.s)}):null),
 pattern('master-retry','考了{attempts}次终于读上研究生','education',93,'masterAdmitted 且至少两次考试',f=>f.record.masterAttempts>1&&f.record.masterAdmitted?recordFact(f,'masterAttempts',f.record.masterAttempts,{attempts:f.record.masterAttempts}):null),
 pattern('master-not-admitted','考研{attempts}次仍未被录取','education',82,'至少两次且 masterAdmitted 不为真',f=>f.record.masterAttempts>1&&!f.record.masterAdmitted?recordFact(f,'masterAttempts',f.record.masterAttempts,{attempts:f.record.masterAttempts}):null),
 pattern('left-behind-elite','留守长大考上{campus}','education',99,'留守经历且真实985/211本科记录',f=>f.s.leftBehind&&['985','211'].includes(f.s.eliteUndergrad??f.s.edu)?fact({campus:f.s.eliteUndergrad??f.s.edu},{kind:'education',leftBehind:true,value:f.s.eliteUndergrad??f.s.edu}):null),
 pattern('repeat-elite','复读一年考上{campus}','education',97,'repeatUsed 实际复读且985/211录取',f=>f.s.repeatUsed&&['985','211'].includes(f.s.eliteUndergrad??f.s.edu)?fact({campus:f.s.eliteUndergrad??f.s.edu},{kind:'education',repeatUsed:true,value:f.s.eliteUndergrad??f.s.edu}):null),
 pattern('elite-campus','从{province}考上{campus}','education',83,'真实985/211本科记录',f=>['985','211'].includes(f.s.eliteUndergrad??f.s.edu)?fact({province:f.province,campus:f.s.eliteUndergrad??f.s.edu},{kind:'education',value:f.s.eliteUndergrad??f.s.edu}):null),
 pattern('doctoral-road','从{province}读到硕士','education',81,'硕士已经毕业，不能只看在读',f=>f.s.edu==='master'?fact({province:f.province},{kind:'education',value:f.s.edu}):null),
 pattern('bachelor-road','从{province}走进本科课堂','education',38,'实际本科录取',f=>f.s.edu==='bachelor'?fact({province:f.province},{kind:'education',value:f.s.edu}):null),
 pattern('college-road','从{province}读到专科','education',36,'实际专科就读',f=>f.s.edu==='college'?fact({province:f.province},{kind:'education',value:f.s.edu}):null),
 pattern('vocational-road','在{province}读完中职再找工','education',34,'中职完成且确有就业记录',f=>f.s.edu==='vocational'&&f.record.completed&&f.work.length?fact({province:f.province},{kind:'education',value:f.s.edu}):null),
 pattern('marriage-again','结了{count}次婚重新组建家庭','family',92,'record.marriages >= 2，起诉和分居不算离婚或重婚次数',f=>f.record.marriages>1?recordFact(f,'marriages',f.record.marriages,{count:f.record.marriages}):null),
 pattern('divorce-road','离了{count}次婚重新安排生活','family',89,'record.divorces 已经完成',f=>f.record.divorces>0?recordFact(f,'divorces',f.record.divorces,{count:f.record.divorces}):null),
 pattern('late-marriage','在{age}岁结婚','family',102,'实际 marriage 记录，年龄至少65',f=>{const h=f.relationships.findLast(h=>h.kind==='marriage'&&h.age>=65);return h?fact({age:h.age},{kind:'relationship',...h}):null;}),
 pattern('second-child','接连迎来{count}个孩子','family',63,'至少两名真实出生孩子；不称养大',f=>f.kids.length>=2?fact({count:f.kids.length},{kind:'kids',count:f.kids.length}):null),
 pattern('large-family','陪{count}个孩子过完童年','family',90,'至少三名孩子确满18岁',f=>f.adultKids.length>=3?fact({count:f.adultKids.length},{kind:'kids',count:f.adultKids.length,adults:true}):null),
 pattern('parent-support','为父母治病付了{amount}元','family',77,'实际 parentMedicalPaid 累计至少60000',f=>f.record.parentMedicalPaid>=60000?recordFact(f,'parentMedicalPaid',f.record.parentMedicalPaid,{amount:f.record.parentMedicalPaid}):null),
 pattern('parent-care','在{province}接父母同住照护','family',58,'只叙述已经选择的同住照护，不从年龄推算照护年数',f=>f.record.parentCare==='cohabit'&&f.s.city==='老家'?recordFact(f,'parentCare',f.record.parentCare,{province:f.province}):null),
 pattern('returned-home','从外地回到{birthPlace}安顿','choice',68,'实际 returnedHome 标记，不臆造在外地多少年',f=>f.record.returnedHome?recordFact(f,'returnedHome',true,{birthPlace:f.birthPlace}):null),
 pattern('shop-open','开过{count}次生意自己当老板','business',64,'实际启动次数；一次开业属普通轨迹，至少两次创业加22分，此后每次加2分，最多加28分',f=>{const count=f.businesses.length;return count?fact({count},{kind:'business',count},count>=2?22+Math.min(6,(count-2)*2):0):null;}),
 pattern('shop-close','开过{opened}次{venture}又关了{closed}次门','business',72,'只数实际closedAt；一次开关店属普通轨迹。多次创业或关店按真实次数加16至22分，最高94分',f=>{const opened=f.businesses.length,closed=f.closedBusinesses.length;const bonus=closed>=2?18+Math.min(4,(closed-2)*2):opened>=2?16+Math.min(4,(opened-2)*2):0;return closed?fact({opened,closed,venture:businessVenture(f.businesses)},{kind:'business',opened,closed},bonus):null;}),
 pattern('business-employees','开起生意请了{count}名员工','business',98,'当前生意真实 employees >= 2',f=>f.s.business?.employees>=2?fact({count:f.s.business.employees},{kind:'business',employees:f.s.business.employees}):null),
 pattern('house-cash','在{age}岁花{amount}元全款买房','money',84,'真实 housePurchases fullCash 记录',f=>{const p=f.purchases.find(p=>p.fullCash);return p?fact({age:p.age,amount:p.price},{kind:'house',purchase:{...p}}):null;}),
 pattern('own-home','在{age}岁付{amount}元首付买房','money',71,'实际按揭购房记录，不把后来婚姻财产当自己买入',f=>{const p=f.purchases.find(p=>!p.fullCash);return p?fact({age:p.age,amount:p.down},{kind:'house',purchase:{...p}}):null;}),
 pattern('million-assets','走到{age}岁留下{amount}万元净资产','money',100,'净资产至少1000万元；只称期末净资产，不声称白手起家',f=>{const amount=netAssets(f.s);return amount>=10000000?fact({age:f.age,amount:Math.floor(amount/10000)},{kind:'money',netAssets:Math.round(amount)}):null;}),
 ...[
  ['keep-learning',['study','skill','sprint','certificate'],'把{count}年重心放在学习进修'],
  ['family-years',['family','grandchildren','chores'],'把{count}年重心放在陪伴家人'],
  ['health-years',['rest','health','wellness'],'把{count}年重心放在休息养病'],
 ].map(([id,focuses,body])=>pattern(id,body,'focus',22,'focusHistory实际年度重心累计，不能推算连续年数',f=>{const count=(f.s.focusHistory??[]).filter(h=>focuses.includes(h.focus)).length;return count>=3?fact({count},{kind:'focus',focuses,count}):null;})),
 pattern('long-life','活到{age}岁看过一个世纪','age',104,'真实寿命至少100岁且已经终局',f=>f.s.alive===false&&f.age>=100?fact({age:f.age},{kind:'age',age:f.age}):null),
 pattern('early-childhood','只走到{age}岁还没来得及长大','age',105,'真实终局且未满6岁；不写死因',f=>f.s.alive===false&&f.age<6?fact({age:f.age},{kind:'age',age:f.age}):null),
 pattern('school-years','没能过完{birthday}岁生日','age',104,'真实终局6至17岁；不写死因',f=>f.s.alive===false&&f.age>=6&&f.age<18?fact({birthday:f.age+1},{kind:'age',age:f.age}):null),
 pattern('young-adult','从{birthPlace}出发只走到{age}岁','age',45,'18至24岁且未有职业记录',f=>f.age>=18&&f.age<25&&!f.work.length?fact({birthPlace:f.birthPlace,age:f.age},{kind:'age',age:f.age}):null),
 pattern('unfolding','从{birthPlace}出发走到{age}岁','fallback',0,'无其他更突出的已发生轨迹时使用出生地与实际年龄',f=>fact({birthPlace:f.birthPlace,age:f.age},{kind:'life',age:f.age,birthPlace:f.birthPlace})),
];

const legacyTitles=[...outcomes,...exits,...sceneTitles,...promotions,...careers,...other];
// Each distinct authored result is a stable mode. Different ages fill the same
// mode; they do not manufacture rarity. Identical facts reached by two options
// share a mode instead of duplicating it.
const authoredTitles=SCENARIOS.filter(d=>d.endFacts).flatMap(def=>{
 const groups=new Map(),usedIds=new Set();
 const collect=(key,outcome,result)=>{
  if(!result?.title)return;
  const signature=result.title+'\0'+(result.shareTitle??result.title);
  const entry=groups.get(signature);
  if(entry){entry.outcomes.add(outcome);return;}
  const prior=legacyTitles.find(t=>t.id===`story-${def.id}-${outcome}`);
  const generic=legacyTitles.find(t=>t.id===`story-${def.id}`);
  let priority=outcome==='avoided'?26:prior?.priority??generic?.priority??(def.positive?46:74);
  // Disease follows explicit avoided exits (26), ahead of ordinary life fallback (0).
  // Distinctive longevity and early-death facts retain their existing priority.
  if(def.category==='body')priority=24;
  const id=prior&&!usedIds.has(prior.id)?prior.id:`branch-${def.id}-${key}`;usedIds.add(id);
  groups.set(signature,{id,outcomes:new Set([outcome]),result,priority});
 };
 for(const [outcome,result]of Object.entries(def.endFacts))collect(outcome,outcome,result);
 for(const [index,st]of def.steps.entries())for(const o of st.options)for(const [outcome,result]of Object.entries(o.endFacts??{}))collect(`${index}-${o.id}-${outcome}`,outcome,result);
 const displayBody=text=>text==='父母离婚后按约分别探望'?'{age}岁父母离婚后两边跑着长大':`在{age}岁${text}`;
 return [...groups.values()].map(({id,outcomes,result,priority})=>({...pattern(id,displayBody(result.title),'scenario',priority,'本局已完成的具体分支事实，年龄与传记共用事实时点（父母离婚取开始，其余分支取结束）',f=>{
  const h=f.completedScenarios.find(h=>h.id===def.id&&outcomes.has(h.outcome)&&h.resultFact?.title===result.title&&h.resultFact.shareTitle===(result.shareTitle??result.title));
  return h?scenarioFact(h):null;
 },{shareBody:displayBody(result.shareTitle??result.title)}),scenarioId:def.id,outcome:[...outcomes].join('/') }));
});
const retainedTitles=legacyTitles.filter(t=>!branchFactIds.has(t.scenarioId));
export const TITLES=[...retainedTitles,...authoredTitles];
export const TITLE_BY_ID=Object.fromEntries(TITLES.map(t=>[t.id,t]));
export function titleCandidates(s){
 const f=titleFacts(s),candidates=[];
 for(const t of TITLES){const m=t.match(f);if(!m)continue;
  if(t.variables.some(key=>m.values[key]===undefined||m.values[key]===null))continue;
  const name=t.render(m.values),shareName=t.renderShare(m.values);
  candidates.push({...t,name,shareName,values:{...m.values},evidence:m.evidence,priorityBonus:m.score??0,score:t.priority+(m.score??0)});
 }
 return candidates.sort((a,b)=>b.score-a.score||b.rarityRank-a.rarityRank||a.id.localeCompare(b.id));
}
export function selectTitle(s){return titleCandidates(s)[0];}

// Known deprecated labels and their closest current wording. A generic old
// unlock is not evidence of the mapped outcome: collection migration removes
// the deprecated label, and must never grant its mapped title automatically.
// These aliases never participate in candidate selection.
const priorTitleIdMigrations={
 'story-boundary-gambling':'story-boundary-gambling-rehabilitated','story-boundary-prison':'story-boundary-prison-rehabilitated',
 'story-jianghu-circle':'story-jianghu-circle-rehabilitated','story-trap-drugs':'story-trap-drugs-rehabilitated',
 'story-boundary-theft':'story-boundary-theft-bad','story-body-major-good':'story-body-major',
 'story-luck-compensation':'story-luck-compensation-good','story-luck-prize':'story-luck-prize-good',
 'story-luck-mentor':'story-luck-mentor-good','story-luck-inheritance':'story-luck-inheritance-good',
};

const closestTitle=id=>{
 if(TITLE_BY_ID[id])return id;
 const old=legacyTitles.find(t=>t.id===id);
 return authoredTitles.find(t=>t.scenarioId===old?.scenarioId&&t.outcome.split('/').includes(old?.outcome))?.id??authoredTitles.find(t=>t.scenarioId===old?.scenarioId)?.id;
};
export const TITLE_ID_MIGRATIONS=Object.fromEntries([
 ...Object.entries(priorTitleIdMigrations).map(([id,target])=>[id,closestTitle(target)]),
 ...legacyTitles.filter(t=>!TITLE_BY_ID[t.id]).map(t=>[t.id,closestTitle(t.id)]),
].filter(([,target])=>target));
