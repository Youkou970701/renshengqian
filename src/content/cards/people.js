import {origin,adult,later} from './variants.js';
import {closeSibling,familyMembers} from '../../engine/people.js';

// Original social dilemmas. These facts live beside the demographic/economic
// simulation: a promise, testimony or lost trust does not manufacture wages.
// Follow-ups are cardSeeds matured by the dedicated people scheduler.
export const PEOPLE_FOLLOWUPS={};
const followId=(id,choice)=>`people-followup:${id}:${choice}`;
const patch=(s,id,choice,detail,changes,followedUp=false)=>({
 peopleDilemmas:{...(s.peopleDilemmas??{}),[id]:{...(s.peopleDilemmas?.[id]??{}),choice,decidedAt:s.peopleDilemmas?.[id]?.decidedAt??s.age,...(followedUp&&s.peopleDilemmas?.[id]?{}:typeof detail==='function'?detail(s):detail),...(followedUp?{followedUpAt:s.age}:{}),...changes}},
});
const by=(ruler,rows,options)=>Object.entries(rows).map(([key,[title,body,labels]])=>({
 key,when:s=>ruler(s)===key,title,body,labels:Object.fromEntries(options.map((o,i)=>[o.id,[labels[i],o.hint]])),
}));
function dilemma(id,minAge,maxAge,ruler,rows,choices){
 const options=choices.map(([choice,label,hint,detail,text,result,peopleImpact])=>{
  const cardId=followId(id,choice);
  PEOPLE_FOLLOWUPS[cardId]={id:cardId,sourceCardId:id,choice,category:'people',text:typeof text==='function'?text:()=>text,peopleImpact,
   effects:s=>patch(s,id,choice,detail,result,true)};
  return {id:choice,label,hint,peopleImpact,effects:s=>patch(s,id,choice,detail,{status:'waiting'}),seeds:[{cardId,inYears:[1,5],chance:1}]};
 });
 const variants=by(ruler,rows,options),first=variants[0];
 return {id,title:first.title,body:first.body,category:'people',stage:minAge<13?'child':minAge<19?'teen':minAge<60?'adult':'senior',minAge,maxAge,
  when:s=>s.age>=minAge&&s.age<=maxAge,weight:()=>1,cooldown:100,maxPerLife:1,variants,options};
}

export const PEOPLE_CARDS=[
 dilemma('people-empty-seat',6,12,origin,{
  left:['靠窗的空座位','新来的同学午饭总一个人坐。你也常等不到爸妈的电话，知道那种想有人搭话的心情。',['把自己的小板凳搬过去','请老师安排一次两人合作','留在原来的伙伴中间']],
  village:['新同学的饭盒','转学来的孩子坐在教室门槛上吃饭。有人说他家是外村搬来的，不肯让他加入游戏。',['招呼他一起去树下吃饭','和老师商量轮换游戏搭档','继续和熟悉的伙伴玩']],
  town:['排队时空出来的一格','新同学的旧校服短了一截，排队时总有人故意离远一点。你看见他把袖口往下拉。',['站到他旁边一起排队','向班主任说明排队的事','先不站过去，也不跟着笑']],
  city:['分组名单上少了一个名字','做小组作业时，刚转来的孩子没有人选。你的小组已经约好要一起拿高分。',['腾出一个位置让他加入','请老师重新安排分组','保留原来的小组安排']],
  rich:['没有被邀请的生日会','班里在传周末生日会的邀请，新来的孩子没拿到。朋友说名额已经排满，你可以带一个人。',['把自己的同行名额留给他','请朋友另约一次全班活动','仍按原来的名单赴约']],
 },[
  ['invite','主动把他请进来','多花相处时间，给对方一个位置',{commitment:'include',timeHours:6},'后来那位同学第一次主动来找你借书。你们记不住当时的饭菜，却都记得有人挪出了一个位置。',{status:'friendship',trust:2},{target:'friend',delta:5,reason:'你给落单的同学腾了座位，{name}看见后也敢来找你说话'}],
  ['teacher','请老师一起解决','把问题交给可信的大人，自己也参与',{commitment:'adult-help',timeHours:2},'老师后来安排了轮换搭档。新同学渐渐敢举手，你们偶尔还会结伴值日。',{status:'included',trust:1},{target:'friend',delta:2,reason:'你请老师帮新同学融入班级，{name}也愿意和你一起帮忙'}],
  ['stay','先留在原来的圈子','没有参与排斥，也错过了主动靠近',{commitment:'distance',timeHours:0},'再排座位时，那位同学和别人坐到了一起。你们点头打招呼，始终没聊起那顿独自吃完的午饭。',{status:'acquaintance',trust:-1},{target:'friend',delta:-2,reason:'你没有去招呼落单的同学，{name}觉得你们之间少了些能说的话'}],
 ]),
 dilemma('people-lost-tool',9,16,origin,{
  left:['借出去的水壶不见了','同学把你借给他的水壶落在操场。奶奶出门前反复叮嘱别弄丢，你怕回去挨说。',['陪他沿放学的路再找一遍','一起向老师说明经过','当着大家的面追问是谁弄丢的']],
  village:['农忙前少了一把小铲','邻居孩子借了你家种菜的小铲，第二天说找不到了。家里下午还要用。',['陪他去菜地和沟边寻找','请双方家长一起商量替换','在小伙伴面前逼他马上交还']],
  town:['被落下的公交卡','同学借了你的公交卡，回来说不知道掉在哪里。你这周回家的车费都在卡里。',['陪他去车站的失物处问问','一起告诉家长，请大人处理','在班群里点名让他解释']],
  city:['没有回来的球拍','同学借走球拍，说还的时候已经放回了柜子。现在柜子是空的，两个人都觉得委屈。',['约好放学后一起找球拍','请老师核对保管和归还经过','当着同学的面认定是他拿走的']],
  rich:['乐团排练前少了一个谱架','朋友借了你的便携谱架，演出前说落在车上了。司机和教室里都没找到。',['陪他把排练路线重新走一遍','请老师联系场地失物处','在排练群里要求他公开道歉']],
 },[
  ['search','先一起寻找','花时间查找，不先给对方定性',{commitment:'search',timeHours:4},'东西最后在别人收起的杂物里找到了。借东西的同学记着你没有先责怪他，后来保管得格外认真。',{status:'found',trust:2},{target:'friend',delta:4,reason:'你陪同学一起找丢失的东西，{name}知道你不会先怪别人'}],
  ['adult','让大人帮忙核对','留下事实，借还的规矩也要讲清',{commitment:'check',timeHours:2},'大人陪你们把经过问清，又约定了以后怎么交还。东西的事结束了，借还前说一句的习惯留了下来。',{status:'agreement',trust:1},{target:'friend',delta:1,reason:'你和同学把东西怎样借还讲清楚，{name}不再担心开口会伤和气'}],
  ['accuse','当众追问责任','可能逼出回应，也可能伤害信任',{commitment:'public-blame',risk:'misjudgment',timeHours:1},'后来才知道是第三个人顺手收进了储物间。你当众说过的话传得比解释快，那位同学不再愿意借用你的东西。',{status:'wrongly-blamed',trust:-3},{target:'friend',delta:-6,reason:'你没有查清楚就当众指责同学，{name}不敢再把东西借给你'}],
 ]),
 dilemma('people-private-letter',13,19,origin,{
  left:['被传看的纸条','舍友捡到一封没寄出的家信，里面写着想让父母回来。几个人围着看，还要传给你。',['合上信，私下交还写信的人','找宿管一起制止传看','看完再跟着大家议论']],
  village:['作文本里的家事','同学的作文写了家里争吵的事，有人撕下复印着传。你知道他第二天还得来上课。',['把纸收好，告诉同学自己看见了什么','请老师收回被传开的纸','把自己听来的家事也讲出来']],
  town:['课桌里的一张检查单','有人从同学桌里翻出家人的病历复印件，想拍到群里。你站在旁边。',['先拦下照片，再把纸还回去','请老师帮忙处理已经传出的信息','跟着转给自己的熟人看']],
  city:['班群里的一张截图','同学在私人聊天里说的心事被截进班群。大家不停追问，你也被问到认不认识当事人。',['不再传播，提醒群里撤回','请老师帮助当事人处理','转发给另一群朋友讨论']],
  rich:['被公开的申请文书','同学把家庭经历写进申请材料，一份草稿被人放进了同学群。大家把它当成谈资。',['提醒删除，私下问本人需要什么帮助','请指导老师接手处理','存下草稿，发给熟悉的同学看']],
 },[
  ['protect','保护隐私，私下归还','不扩散信息，给本人保留决定权',{commitment:'privacy',timeHours:1},'那位同学后来愿意单独跟你说话。关于家里的事，他仍不愿公开，但知道你不会拿去换热闹。',{status:'confidence-kept',trust:3},{target:'friend',delta:6,reason:'你没有把朋友的私事传出去，{name}更愿意把心里话告诉你'}],
  ['help','请可信的大人协助','借助学校处理，不保证流言立刻消失',{commitment:'seek-support',timeHours:2},'老师帮忙收回了散发的材料。流言没有马上停下，当事人却不用再独自向每一个人解释。',{status:'supported',trust:1},{target:'friend',delta:2,reason:'你请老师帮助被议论的同学，{name}知道你愿意替难堪的人说话'}],
  ['spread','跟着传播和议论','伤害隐私，可能被当事人追问责任',{commitment:'spread',risk:'privacy-harm',timeHours:0},'当事人后来找到了转发记录。你说自己只是顺手，却无法替他说出这些私事；他把你从私人聊天里移除了。',{status:'trust-broken',trust:-4},{target:'friend',delta:-8,reason:'你转发了朋友不想公开的材料，{name}不再放心和你说私事'}],
 ]),
 dilemma('people-group-credit',17,24,origin,{
  left:['墙报上的署名','同组同学替你画完了大半面墙报。评奖时，负责登记的人只写了你的名字。',['把他的名字补上并说明分工','先问他想不想公开署名','不再提起遗漏的名字']],
  village:['比赛作品少了一个人','手工比赛的作品用了同学做的部件，老师夸奖时却以为全是你一个人完成的。',['当场讲清哪些是他做的','和同学一起去找老师核对','先领下表扬，回头再说']],
  town:['实习成果写给谁','小组实习报告里，整理数据的同学没被写进名单。负责人说名字写多了不好看。',['把实际分工写在报告里','约同学一起和负责人谈','照现有名单提交']],
  city:['小组汇报只留一个名字','课堂项目的展示稿只署了主讲人的名字。整理资料的人说算了，你知道他熬过几个晚上。',['在展示前补上每个人的分工','私下征求同学意见后一起提','先按主讲人的名字展示']],
  rich:['作品集里借来的那一段','朋友替你的短片做了配乐，作品集模板却把所有工作都写成了独立完成。',['改正署名，写清合作内容','和朋友一起确认授权及署名','保留独立完成的说法']],
 },[
  ['credit','主动补全实际贡献','放下独占表扬，保留共同合作的信任',{commitment:'shared-credit',timeHours:2},'后来又有合作机会，那位同学第一个来问你愿不愿意组队。他说不怕活多，怕做完像没来过。',{status:'invited-again',trust:3},{target:'friend',delta:5,reason:'你在作品上写全了合作者的名字，{name}觉得和你一起做事踏实'}],
  ['discuss','先和对方一起核对','尊重对方意愿，也要承担沟通时间',{commitment:'consent',timeHours:3},'你们后来把分工一起补进了记录。没有人专门表扬这次更正，但两个人都能放心把名字留在同一页上。',{status:'corrected-together',trust:2},{target:'friend',delta:3,reason:'你和伙伴一起核对署名，{name}知道自己的付出不会被漏掉'}],
  ['omit','沿用对自己有利的署名','眼前省事，合作关系可能结束',{commitment:'omitted-credit',risk:'credit-dispute',timeHours:0},'那位同学后来拒绝了你的组队邀请。别人问起旧作品，他拿出了自己的草稿，你不得不重新解释当时的署名。',{status:'credit-disputed',trust:-4},{target:'friend',delta:-7,reason:'你没有写上合作者的名字，{name}不愿再和你一起做事'}],
 ]),
 dilemma('people-shift-blame',20,30,adult,{
  elite:['会议上的一张错误表','项目进度表出了错，会上有人把责任指给刚来的同事。你保存着原来的修改记录。',['整理记录，把经手步骤说清','先陪同事核对，再一起向负责人说明','不拿出记录，继续听会议安排']],
  grad:['交接记录没有被看见','同事被说成漏交了一份材料，你记得自己在群里收到了他的交接。领导正等一个解释。',['提供自己收到材料的时间','和同事一起补齐交接凭证','不卷入争执，先做自己的工作']],
  migrant:['工位上少了一箱货','组长说是新来的工友漏装，你知道那箱货上午被临时调走了。大家都怕耽误下班。',['说明自己看见的调货经过','陪工友去仓库核对单子','先不出声，等别人处理']],
  worker:['盘点时算到一个人头上','少了一批库存，值班同事被要求写情况说明。你知道前一天还有另一次领用。',['把自己知道的领用经过补上','和同事一起申请重新核对','不参与核对，按时交班']],
 },[
  ['testify','拿出自己掌握的事实','愿意承担被追问的时间，不替任何人编造',{commitment:'witness',timeHours:5},'重新核对后，同事不再独自背着那件事。后来你需要人接一次班，他记着你肯把自己看见的事说出来。',{status:'cleared',trust:3},{target:'friend',delta:5,reason:'你替被误解的同事说明经过，{name}听说后觉得遇到难事可以找你'}],
  ['verify','陪对方先把材料找齐','先核实，结果可能来得慢一些',{commitment:'verify-together',timeHours:8},'你们把原来的记录找全了，说明过程多用了几个晚上。同事后来把每次交接都保存清楚，也愿意替你核对。',{status:'evidence-recovered',trust:2},{target:'friend',delta:3,reason:'你陪同事找齐了交接记录，{name}知道你愿意花时间把事问清楚'}],
  ['silent','这次不介入争执','保住自己的时间，关系也会变得疏远',{commitment:'no-testimony',timeHours:0},'那位同事后来调离了原来的岗位。你们偶尔见面，他仍然客气，却不再把难处讲给你听。',{status:'distance',trust:-2},{target:'friend',delta:-4,reason:'你明知道经过却没有回应同事的求助，{name}以后不太愿意找你帮忙'}],
 ]),
 dilemma('people-fallen-neighbor',24,34,adult,{
  elite:['车库出口的一声呼喊','一位老人跌坐在车库坡道边，手边的购物袋散开了。你赶着去参加一个已经迟到的会议。',['留在现场联系急救和家属','请门岗到场，确认有人接手再走','绕开坡道，继续赶去开会']],
  grad:['路口的菜篮翻了','你去单位的路上，一位老人倒在路边，试着起身却没起来。旁边有人停下，又拿不定主意。',['联系急救，说明看到的情况','请周围的人一起留守并找家属','先去上班，不参与现场的事']],
  migrant:['厂门外的老人','早班快点名了，厂门外一位老人跌在路沿边。你担心迟到，又看见他一直摸口袋里的电话。',['联系急救，帮忙通知家属','请门卫过来接手，再向班组解释','直接进厂，想着会有人处理']],
  worker:['赶车前的一跤','赶班车的路上，老人倒在小区口，保温杯滚到了路边。车已经亮起了转弯灯。',['留下联系急救和家属','请社区值班人员到场接手','先赶班车，离开现场']],
 },[
  ['stay','留下联系专业救助','占用自己的时间，不贸然移动伤者',{commitment:'emergency-support',timeHours:3},'老人恢复后，家属在社区留言向留在现场的人道谢。你记得的却是电话终于接通时，他松开攥着衣角的手。',{status:'help-reached',trust:2},{target:'friend',delta:3,reason:'你留下来帮摔倒的老人联系家属，{name}听说后愿意和你一起照应邻里'}],
  ['handover','确认有人接手再离开','组织接力，让现场不落空',{commitment:'safe-handover',timeHours:1},'后来社区更新了紧急联系人名册，值班人特意问你有没有要补充的电话。那次接力让几个人开始相互认识。',{status:'community-link',trust:1},{target:'friend',delta:2,reason:'你等到有人接手才离开现场，{name}觉得你答应的事靠得住'}],
  ['leave','继续原来的行程','没有承诺照应，也错过了帮助的机会',{commitment:'walk-away',timeHours:0},'你后来听说老人由另一位路人联系上家属。事情有了着落，但当社区征集互助联系人时，你没再收到那一家的询问。',{status:'not-in-contact',trust:-1},{target:'friend',delta:-2,reason:'你没有回应邻居的紧急求助，{name}对找你帮忙有些犹豫'}],
 ]),
 dilemma('people-name-on-form',28,38,adult,{
  elite:['项目验收页上的空白','负责人递来一张验收页，要你替不在场的人签字。你没有实际核查，对方说只是赶个流程。',['只签自己确实核查过的部分','请实际经办人补核后再签','为赶进度，替别人签下名字']],
  grad:['没有核对过的报销附件','同事请你在不完整的附件上确认经办，说以后会补齐。纸上写着你没有参与的事项。',['把缺少的事项退回核对','请财务说明应由谁确认','没有核实就签下经办确认']],
  migrant:['出货单上多出的一笔','主管让你确认一批没见过的出货数量，说车等不起。单据上的日期也和你当班的时间不同。',['只确认自己实际清点的货','请交班人和仓管一起核对','照主管的意思把整张单签了']],
  worker:['维修记录上空着的名字','你被叫去补签一项没有参加的检修。对方说设备能转就行，没必要再找当班的人。',['拒绝替没有参加的检修确认','请当班人回来核对记录','为省事在整项检修后签字']],
 },[
  ['truth','只确认实际做过的事','可能拖慢进度，避免替未知事实担责',{commitment:'truthful-record',timeHours:3},'后来有人复核那批记录，空缺的部分找到了实际经办人。你不需要解释没做过的工作，只补交了自己那一段说明。',{status:'verified-record',risk:'avoided'},{target:'friend',delta:1,reason:'你只签了自己确实做过的部分，{name}知道你不会随便替人作证'}],
  ['review','要求相关人员一起复核','占用协调时间，把责任说明白',{commitment:'joint-review',timeHours:6},'相关人员后来一起更正了记录。那次会议让人觉得麻烦，却留下了谁做过什么的清楚凭证。',{status:'corrected-record',risk:'resolved'},{target:'friend',delta:2,reason:'你请一起经办的人重新核对记录，{name}更放心和你一起做事'}],
  ['sign','未经核实就签字','不实确认可能带来调查和追责，不保证能补救',{commitment:'unverified-signature',risk:'false-attestation',timeHours:0},'复核时，那份签字成了你必须解释的记录。你花了多次休息时间配合调查，签字被要求撤销；信任不能靠一句「别人让我签的」恢复。',{status:'investigated',risk:'accountability',timeHours:20},{target:'friend',delta:-5,reason:'你没核实就签了单据，{name}担心自己也会被卷进说不清的事'}],
 ]),
 dilemma('people-identity-request',32,42,adult,{
  elite:['旧同学要借你的实名信息','旧同学筹办一个项目，说自己的资料不方便用，想借你的实名信息登记。你看不懂用途。',['拒绝出借，提醒各用各的实名信息','陪他向正规机构核实合法替代办法','只因为关系好就答应出借']],
  grad:['朋友说只是登记一下','朋友请你借身份信息办一项业务，说自己以后再改回来。你问具体责任，他只说不用担心。',['明确拒绝，把担心说明白','陪他咨询正规柜台该如何办理','不看清责任就答应出借']],
  migrant:['老乡来借证件信息','老乡说办业务少一份身份材料，想先用你的。你们一起出来多年，他把话说得很轻。',['不借自己的实名材料','陪他去正规服务点问清办法','怕伤和气，先把信息交给他']],
  worker:['熟人来问一份实名资料','熟人说自己不便露面，想借你的身份信息办卡。你听见「名字写谁都一样」时犹豫了。',['拒绝代用身份，说明责任风险','陪他到正规柜台咨询','信任熟人，未经核实就同意']],
 },[
  ['refuse','拒绝出借实名信息','守住个人信息，可能让对方不高兴',{commitment:'identity-boundary',timeHours:1},'后来那位朋友自己办齐了材料。最初的不快慢慢过去，你们再谈起这件事，至少责任没有挂在另一个人的名字下。',{status:'boundary-kept',risk:'avoided'},{target:'friend',delta:-1,reason:'你没有把身份证借给{name}，对方有些不高兴'}],
  ['consult','一起询问正规的办理办法','花时间帮忙，不替别人承担实名责任',{commitment:'lawful-help',timeHours:4},'正规柜台列出了他能补交的材料，你陪他跑了一趟。事情办得慢些，最后用的是他自己的名字。',{status:'lawful-route',trust:2},{target:'friend',delta:3,reason:'你陪{name}去问了不用借身份证的办法，对方知道你不是敷衍'}],
  ['lend','没有核实就出借','可能出现冒用和账户责任，严重时依法处理',{commitment:'identity-lent',risk:'identity-misuse',timeHours:0},'后来一项与你实际生活无关的业务找上了你。你开始核对记录、申请纠正并配合调查；关系再熟，也不能替代对实名责任的核实。',{status:'correction-and-investigation',risk:'identity-misuse',timeHours:24},{target:'friend',delta:-8,reason:'你把身份证借给{name}后，两人为该由谁负责起了争执'}],
 ]),
 dilemma('people-noisy-neighbor',36,46,adult,{
  elite:['隔壁一直没有完工','邻居的改造拖了很久，休息日也有敲击声。家里的老人睡不好，对方说施工队只能这个时候来。',['带着记录商量固定安静时段','请物业组织双方当面协商','在住户群里公开指责对方']],
  grad:['周末的电钻又响了','邻居装修一延再延，你在家准备工作材料总被打断。孩子也开始跟着抱怨。',['约对方谈好每天停工时间','请社区帮忙核对约定和投诉渠道','每天在群里追着对方争吵']],
  migrant:['出租屋楼上的敲打声','夜班回来想补觉，楼上白天一直敲打。房东说两家都要理解，你也不想再搬一次。',['告诉楼上自己的夜班时间并商量','请房东召集双方定下安静时段','敲天花板，隔空和楼上争吵']],
  worker:['午休总被装修打断','楼上换地板拖了几个月，家里午休一到就响。你去敲门时，对方也一脸疲惫。',['直接说清休息需要，约好时间','请物业主持一次具体协商','回家后不停在群里点名指责']],
 },[
  ['talk','把需要和时间直接谈清','花时间沟通，争取能执行的约定',{commitment:'quiet-hours',timeHours:3},'后来敲打声仍偶尔响起，但约好的午休时段安静了下来。你们在楼道碰面，终于能先打招呼再说事情。',{status:'working-agreement',trust:2},{target:'friend',delta:2,reason:'你和邻居谈好了休息时段，{name}也愿意帮你照着约定提醒对方'}],
  ['mediate','请第三方协助协商','把争执写成具体的时间安排',{commitment:'mediation',timeHours:5},'协调后留下了一张双方确认的施工时刻表。后面有一次超时，你们照着约定处理，没有再把整栋楼卷进争吵。',{status:'mediated-agreement',trust:1},{target:'friend',delta:1,reason:'你请人帮忙调解邻居间的争执，{name}见你肯坐下来谈，也放下了火气'}],
  ['shout','用公开争吵回应噪声','能表达不满，也可能让邻里长期对立',{commitment:'public-quarrel',risk:'neighbor-conflict',timeHours:3},'装修终于结束了，你们的争吵却被邻居记住。后来公共区域要维修，两家仍各自等着对方先开口。',{status:'lasting-conflict',trust:-3},{target:'friend',delta:-4,reason:'你和邻居吵了几回，{name}再见到你时也不太敢搭话'}],
 ]),
 dilemma('people-delivery-witness',40,50,adult,{
  elite:['楼下等着解释的骑手','你看见骑手按了几次门铃都没人应，住户却投诉说他没有送到。物业正想让他快点走。',['只向平台说明自己亲眼所见','留下联系方式，请物业一起核对','怕耽误时间，不再回应询问']],
  grad:['快递门口的一场争执','一件包裹淋了雨，收件人认定是送件人扔在外面。你知道当时门厅临时封着。',['说明门厅封闭的实际情况','请双方先保存照片再核对','把门关上，不参与解释']],
  migrant:['宿舍楼下被投诉的送餐人','送餐人说已经联系过订餐人，却被说成擅自放下。你恰好听见过那通免提电话。',['把自己听到的原话说清','请宿管协助核对送达经过','赶着去交班，不留下说明']],
  worker:['门岗外的送货纠纷','住户说送货人拒绝上楼，你看见电梯当时正在检修。对方请你证明一下。',['如实说明电梯检修的事','留下联系方式，等双方核对','不想被追问，离开门岗']],
 },[
  ['witness','只证明自己看见的事实','不保证投诉撤回，但不编造细节',{commitment:'limited-testimony',timeHours:2},'那次投诉后来重新核查了。送件人再路过时向你点了点头，你们并不熟，却知道一次说明可能关系到别人一天的工作。',{status:'reviewed',trust:2},{target:'friend',delta:2,reason:'你说出了自己看到的送餐经过，{name}知道你不会让人白受委屈'}],
  ['record','留下联系，协助核对','以后可能被再次询问，事情有了核对线索',{commitment:'contactable-witness',timeHours:4},'平台后来联系你核实经过，你把确实知道的部分说了一遍。双方补齐了记录，争执没有继续扩大。',{status:'record-completed',trust:1},{target:'friend',delta:1,reason:'你留下了可以核对的见证，{name}觉得找你帮忙说明情况是件踏实的事'}],
  ['leave','不介入这次纠纷','节省自己的时间，也留下未能核清的争议',{commitment:'no-record',timeHours:0},'后来那位送件人换了片区。门岗的人说投诉的几处细节一直没查明，你也没有机会再补上当时看见的事。',{status:'unresolved-record',trust:-1},{target:'friend',delta:-2,reason:'你没有回应骑手请你作证的请求，{name}听说后不太愿意再托你帮忙'}],
 ]),
 dilemma('people-care-rota',44,54,adult,{
  elite:['朋友照护表里的一段空白','朋友的家人出院了，白天有人照看，晚饭后的两小时却总排不出人。你最近也很忙。',['只答应每周自己能做到的一次','替朋友联系正规的社区照护资源','一口答应整周，之后再想办法']],
  grad:['同学群里的陪护接龙','老同学要照顾家人，群里在排接送复诊的日程。有人说认识多年总得多担一点。',['选一个自己确实能到场的时段','帮忙整理资源和可靠联系人','怕扫兴，先把几个时段全接下']],
  migrant:['老乡来回医院顾不上吃饭','老乡照护家人，厂里和医院两头跑。轮到你接班帮忙时，正碰上最难请假的一周。',['提前说清能帮的那一天','帮他联系同乡和医院社工','先答应全包，到时再说']],
  worker:['邻居家的复诊安排','邻居要连续复诊，家里只有一位照护者。你也要上班，能帮忙的时间并不多。',['留出一个固定可做到的半天','陪他问社区有没有接送协助','先把所有接送都答应下来']],
 },[
  ['bounded','只承诺能做到的时间','帮助有限，但对方可以据此安排',{commitment:'reliable-slot',timeHours:8},'照护最忙的那段日子里，你按约到了几次。朋友后来不再追问你还能不能多做，只说那几个确定的时段让他能放心睡一觉。',{status:'kept-promise',trust:3},{target:'friend',delta:5,reason:'你按约替{name}分担了照护，对方终于能腾出时间歇一歇'}],
  ['connect','帮助寻找可以持续的支持','不包办照护，把时间用在联络上',{commitment:'support-network',timeHours:5},'后来几个人把接送和复诊慢慢排顺了。朋友把新的联系人留在冰箱上，最初你整理的那页纸还夹在后面。',{status:'shared-support',trust:2},{target:'friend',delta:3,reason:'你和{name}找到了能轮班照护的人，对方不用再独自扛着'}],
  ['overpromise','先答应超出能力的安排','临时失约可能让照护出现空档',{commitment:'overpromised',risk:'unreliable-care',timeHours:1},'你后来有两次没能赶到，又没提前找到接替的人。朋友只好临时调整复诊安排，往后的照护表没有再把关键时段留给你。',{status:'missed-promise',trust:-4},{target:'friend',delta:-6,reason:'你答应替{name}照护，却没有说清哪几天能赶到，对方拿不准自己的安排'}],
 ]),
 dilemma('people-workspace-rule',48,58,adult,{
  elite:['安全问题被留在会议纪要外','你注意到工作场所的疏散通道被占用，负责人说活动结束就清。下一场活动马上又要开始。',['留下事实，通过安全渠道反映','先和负责人约定清理期限并复查','觉得不归自己管，继续原来的工作']],
  grad:['堆满纸箱的安全出口','办公室为省空间把资料堆在出口。有人提醒过，后来又堆回去，你能叫出每个加班人的名字。',['记录情况，要求走正式安全流程','找同事一起把清理责任约清楚','不再提起，免得显得不合群']],
  migrant:['夜班出口旁越堆越高的货','夜班经过侧门，通道被临时货物堵住。组里说等出货就搬，你担心真有急事时走不出去。',['把堵塞情况按安全渠道报上去','和当班负责人确认清理并回看','照旧绕路，不再追问']],
  worker:['值班室门口的杂物','值班室的出口旁一直放着旧设备，大家早就习惯侧身走。你知道下次换班仍会有人从这里经过。',['正式报告通道堵塞的情况','和同事约好清理后共同复查','继续侧身走，暂时不出声']],
 },[
  ['report','通过安全渠道如实反映','可能遇到不满，留下可核对的事实',{commitment:'safety-report',timeHours:4},'后来检查人员复核了那条通道，杂物被清走并明确了责任人。有人仍嫌你认真，但夜班的人不用再侧着身子过门。',{status:'hazard-removed',trust:2},{target:'friend',delta:2,reason:'你把看到的安全问题说了出来，{name}知道你会替一起干活的人着想'}],
  ['deadline','约定清理与复查','先给改正机会，也要真正回去看',{commitment:'follow-through',timeHours:5},'你按约回去看了一次，通道已经腾出来。同事后来提醒其他人别再往门边堆东西，约定没有只停在口头上。',{status:'checked-and-cleared',trust:1},{target:'friend',delta:2,reason:'你一直追问整改进展，直到隐患修好，{name}才放心回去干活'}],
  ['ignore','暂时不再追问','保留眼前的和气，隐患不会因此消失',{commitment:'unreported-hazard',risk:'unresolved-safety',timeHours:0},'后来一次演练中，那道门前的人被迫停住了脚。检查终于发现堆物，你想起自己曾经担心过，却一直没留下提醒的记录。',{status:'exercise-exposed-hazard',risk:'unresolved-safety'},{target:'friend',delta:-3,reason:'你看见安全隐患却没再过问，{name}以后不敢再托你反映难处'}],
 ]),
 dilemma('people-young-apprentice',52,62,adult,{
  elite:['刚入行的人问你借一份名单','一个年轻同行想请你介绍项目，发来的自我介绍写了做过却没参与的经历。你可以替他担保，也可以把话说清。',['先帮他改成真实经历，再介绍合适的人','只提供公开的招聘和学习渠道','明知经历不实，仍替他背书']],
  grad:['学生来问第一份推荐','以前带过的学生请你写推荐，草稿里夸大了一个项目的工作量。他说不这样写就没有机会。',['核对实际做过的事，再写推荐','把可以公开申请的岗位发给他','照夸大的草稿替他推荐']],
  migrant:['年轻工友想让你说句好话','年轻工友想接一项他还没学会的活，求你和组长说他早就会了。你知道那项工作不能靠试运气。',['陪他把不会的部分补练清楚','请他先走公开考核再争取岗位','没有核实能力就替他保证']],
  worker:['新同事想跳过一次考核','年轻同事觉得培训太慢，想请你证明他已经能独立上岗。你只和他一起值过两次班。',['先把需要掌握的事教到能做','建议照原来的考核流程走','为帮熟人，保证他已经全会']],
 },[
  ['mentor','把真实能力补起来再推荐','花时间带人，不替没有的经历背书',{commitment:'honest-mentoring',timeHours:12},'年轻人后来按实际能力找到了位置。再次碰面时，他带来了一页新做成的成果，终于不需要把没做过的事写进介绍。',{status:'earned-opportunity',trust:3},{target:'friend',delta:4,reason:'你耐心陪年轻人练好手里的活，{name}看见你肯花时间，也愿意帮忙'}],
  ['channel','提供公开渠道，让他自己争取','帮到边界内，不作个人保证',{commitment:'open-channel',timeHours:2},'后来他通过公开考核拿到了机会。你们没有因此走得特别近，但推荐和录用之间的责任一直分得清楚。',{status:'independent-opportunity',trust:1},{target:'friend',delta:1,reason:'你把公开招聘的条件找给年轻人看，{name}知道你没有随口许诺'}],
  ['vouch','明知不足仍作保证','可能让对方受挫，也损害你的信用',{commitment:'false-endorsement',risk:'unfounded-guarantee',timeHours:1},'岗位上很快暴露出准备不足。对方被重新安排培训，你也被问及当初保证的依据；一次好意不能代替实际能力。',{status:'endorsement-questioned',trust:-4},{target:'friend',delta:-5,reason:'你没核实本事就替年轻人推荐，{name}被问起时也觉得难以解释'}],
 ]),
 dilemma('people-reunion-photo',56,66,adult,{
  elite:['聚会合照里没有来的人','老同学聚会要发公开合照，照片里拍到了正在照护病人的同学。他没有答应把家事一起公开。',['先征得每个人同意再发照片','只把照片留在小范围相册','觉得大家都认识，直接公开配文']],
  grad:['同学聚会上的旧故事','有人想把当年的窘事写进聚会推文，主角就坐在你旁边，脸上没有笑。',['先问本人愿不愿意被写进去','建议只写这次聚会的公共部分','跟着补上自己记得的旧糗事']],
  migrant:['老乡聚餐后的短视频','老乡聚餐，有人把一位工友谈家里困难的片段剪进视频。他酒醒后还不知道。',['先问工友是否同意发布','把涉及私事的部分删掉再分享','先发出去，想着熟人不会介意']],
  worker:['社区聚餐的那张照片','聚餐时一位邻居讲起失业的事，大家想把聊天照片和内容一起发出去，说能让人帮忙介绍活。',['先问邻居想不想公开这件事','只发布活动照片，不写私人处境','替他作主，把困难写进公开消息']],
 },[
  ['consent','先让本人决定是否公开','牺牲一点热闹，保留对方的体面和选择',{commitment:'informed-consent',timeHours:2},'后来那位老朋友自己发了一张近照，没有再提当时的难处。他私下谢谢你，没让那次聚会变成一份公开解释。',{status:'consent-respected',trust:3},{target:'friend',delta:5,reason:'你先问{name}愿不愿意公开近况，对方知道你顾着自己的感受'}],
  ['limit','只分享已经确认的公共部分','保留联系，不把别人的处境当谈资',{commitment:'limited-sharing',timeHours:1},'那份相册后来还在小圈子里流传，大家添进了新照片。照片里的人不必担心，下一次打开会看见自己的私事被写成说明。',{status:'safe-album',trust:2},{target:'friend',delta:2,reason:'你只在{name}同意的几个人中谈起近况，对方不再担心私事被传开'}],
  ['publish','替别人决定公开','可能失去信任，也要面对撤回和解释',{commitment:'unauthorized-sharing',risk:'privacy-harm',timeHours:0},'那位朋友看到公开内容后要求删除。你撤回了原文，却无法收回已经传走的截图；下一次聚会，他提前说自己不入镜。',{status:'withdrawal-request',trust:-4},{target:'friend',delta:-7,reason:'你没问{name}就把对方的难处讲给大家听，对方后来少来聚会了'}],
 ]),
 dilemma('people-shared-garden',60,70,later,{
  public:['活动室钥匙谁来保管','退休后常去的活动室换了门锁，熟人请你收钥匙。有人希望只留给原来的小圈子用。',['订出公开登记和轮值办法','请社区保管钥匙，自己协助值班','只把钥匙交给熟悉的人']],
  rural:['村口空地上的新菜畦','几位老邻居清出一块公共空地，想种菜休息。有人把最好的位置先围给了自家。',['一起说明边界，排公开轮用表','请村里核对使用约定','默认熟人先占，不再开口']],
  grad:['阅读角里只剩几个固定座位','你参与整理的社区阅读角渐渐被熟人固定占着。一个新搬来的老人想找地方坐，被说成已经有人。',['和大家商量按到场轮换座位','请社区协助制定开放时间','按熟人的说法保留固定座位']],
  worker:['楼下长椅旁划出的小圈子','邻居把公共长椅旁摆满私人物品，新住户来坐时总得先问一句。熟人说相处多年该留点方便。',['一起把公共空间整理出来','请物业组织大家谈使用约定','不碰熟人的东西，继续默认']],
 },[
  ['open','让公共空间按公开办法使用','可能要反复解释，也让新面孔有位置',{commitment:'open-space',timeHours:6},'后来这里多了几张新面孔。轮值表有时需要调整，但谁能来不再只看认不认识保管钥匙的人。',{status:'shared-access',trust:2},{target:'friend',delta:3,reason:'你给邻居保留了公平使用的时间，{name}也愿意照着一起排班'}],
  ['community','请社区协助定规则','自己不独揽决定，参与具体值守',{commitment:'shared-management',timeHours:4},'社区把开放和保管安排贴了出来。你退到协助的位置，偶尔替人换一次班，空间仍能照常使用。',{status:'community-managed',trust:1},{target:'friend',delta:2,reason:'你和邻居分着做公共区域的事，{name}不用再一个人收拾'}],
  ['circle','优先照顾熟人的方便','小圈子可能更稳，新邻里却被挡在外面',{commitment:'closed-circle',risk:'exclusion',timeHours:0},'新搬来的人后来不再问了。熟悉的几个人仍坐在一起，等有人身体不好来不了，空出的地方却很少有人接上。',{status:'narrower-circle',trust:-2},{target:'friend',delta:-3,reason:'你把公共空间留给熟人使用，{name}觉得自己被挡在了外面'}],
 ]),
 dilemma('people-hospital-bedside',64,74,later,{
  public:['老同事的病床前','老同事住院，病房里请你轮一晚照护。他的家人都在赶路，你也要按时服药休息。',['陪到家人接班，并说清自己的体力','帮他联系病区正规的照护支持','怕让人失望，答应连守几夜']],
  rural:['邻居住院后的第一夜','老邻居被送去县里住院，孩子还在外地。大家望向你，可你连自己的复诊都刚安排好。',['留一个能做到的照看时段','联系家属和医院的照护人员','把几天几夜都先答应下来']],
  grad:['病友请你留下一个晚上','复诊时熟识的病友临时住院，请你守一夜。你不是家属，也不清楚他要做哪些检查。',['在明确照护范围后陪一段时间','帮忙联系家属和病区工作人员','没有核对就答应全程照护']],
  worker:['隔壁床的家属没有赶到','熟人的家属一时赶不过来，想请你先照应。病区很忙，你也刚从另一处检查回来。',['先陪到交接的人到场','帮忙把情况转给家属和病区','不顾体力，保证一直留在病房']],
 },[
  ['bounded','说清自己能照看的时间','照顾别人，也保留安全的交接和休息',{commitment:'bedside-handover',timeHours:6},'那位熟人后来出院了，家属还记得你把药品和联系事项一项项交接清楚。探望没有变成谁都不敢先离开的值守。',{status:'safe-care',trust:3},{target:'friend',delta:4,reason:'你按体力帮病友跑腿，离开前又找人接手，{name}看见你把答应的事做完了'}],
  ['support','联系家属和专业照护人员','不代替医疗判断，把求助传到能接手的人那里',{commitment:'care-contact',timeHours:3},'后来家属和病区排好了照护安排。你再去探望，只需要带上一份对方想读的报纸，不用独自扛住整个夜晚。',{status:'care-connected',trust:2},{target:'friend',delta:3,reason:'你替住院的熟人联系到照护的人，{name}知道难处有人一起想办法'}],
  ['overdo','答应超出体力的照护','可能失约或力不从心，仍需要别人接手',{commitment:'care-overreach',risk:'care-exhaustion',timeHours:18},'连续守夜后，你实在撑不住，只能临时找人接班。家属后来重新排了照护，朋友也劝你下次先把自己的身体算进去。',{status:'emergency-handover',trust:-2},{target:'friend',delta:-3,reason:'你答应的照护超过了自己的体力，{name}不得不临时赶来接手'}],
 ]),
 dilemma('people-rumor-check',68,78,later,{
  public:['退休群里传来一条消息','老同事群里说一位熟人出了大事，转述的人都说自己听说过，却没有人联系过本人。',['先向本人或家属核实再回应','提醒群里不要扩散，等可靠消息','把消息再转给其他熟人问问']],
  rural:['赶集时听来的传言','赶集的人说村里一户出了事，越说越具体。你知道那家老人平时独居，还没人真正去看过。',['直接联系那家人确认近况','请村里的联络人核实后再说','把听来的版本告诉更多邻居']],
  grad:['读书群里的一张旧照片','有人把一张旧照片当成最近的消息，指向你认识的一位朋友。评论已经开始替人下结论。',['联系朋友核对照片和近况','提醒大家停下转发，等待本人说明','附上自己的猜测再转出去']],
  worker:['小区群里的一句话','小区群有人说一户邻居出了事故，地址和名字都对不上。有人催你把消息发给楼里的人。',['先打电话确认是哪一家、什么情况','请社区核实后统一告知','还没核对就转到楼栋群']],
 },[
  ['verify','先核实，再决定怎么说','付出联络时间，避免拿猜测当事实',{commitment:'verified-news',timeHours:2},'后来核实发现消息里混进了另一件旧事。那位熟人谢谢你先打来的电话，他不用再挨个解释自己并没有经历那些事。',{status:'rumor-corrected',trust:3},{target:'friend',delta:4,reason:'你先给{name}打电话问清近况，没有急着相信外面的传言'}],
  ['pause','提醒暂停传播，等可靠回应','自己不作结论，给当事人留出空间',{commitment:'no-amplification',timeHours:1},'群里后来等到了家属的简短说明。许多人删掉了猜测，你也没有成为下一份传言的来源。',{status:'contained-rumor',trust:1},{target:'friend',delta:2,reason:'你没有继续转发那条没查清的消息，{name}知道你会顾着自己的感受'}],
  ['forward','先转发，再等别人核实','传播可能让当事人承受额外解释',{commitment:'rumor-forwarded',risk:'misinformation',timeHours:0},'那位熟人后来看到转发记录，逐个请求更正。你补了一句「原来不是这样」，却发现原来的消息早已传到了别的群。',{status:'correction-needed',trust:-3},{target:'friend',delta:-5,reason:'你转发了关于{name}的传言，对方知道后不愿再和你多说'}],
 ]),
 dilemma('people-friend-memory',72,82,later,{
  public:['老同事又问了一遍集合时间','老同事几次记错活动的时间，旁人笑他总迟到。你发现他连熟悉的路口也会犹豫。',['私下问他需不需要一起核对行程','征得同意后联系他信任的家人','在群里拿他记错的事开玩笑']],
  rural:['老伙计在路口走错了方向','散场后，老伙计朝另一条路走去，说要回旧村。那条路早就改了，你看他有些慌。',['陪他认路，把需要的联系写清楚','问他愿不愿意和家人一起商量','当着邻居说他现在什么都记不住']],
  grad:['约好的朋友记错了地方','你约朋友去熟悉的图书馆，他却到了另一处早已停用的旧馆。见面后他很努力地解释。',['私下和他核对方便记住的约法','经他同意，请家人一起安排支持','把这次走错当作聚会上的笑谈']],
  worker:['常一起买菜的人忘了回程','熟人提着菜在站台等一班早就改线的车。你问起，他不愿承认自己有些记不清。',['陪他走一趟现在的回家路线','征得同意后联系可信的家人','在别人面前数落他老糊涂了']],
 },[
  ['accompany','私下陪伴，保留对方的体面','不自行诊断，先解决眼前的不便',{commitment:'respectful-support',timeHours:5},'后来你们见面前会再确认一次地点。朋友偶尔还是记错，却愿意直接问你，不必先为难堪找一个借口。',{status:'support-accepted',trust:3},{target:'friend',delta:6,reason:'你耐心听{name}把同一件事又讲了一遍，没有催对方快一点'}],
  ['family','经同意联系可信的家人','让支持能延续，不越过本人的意愿',{commitment:'consented-contact',timeHours:3},'家人后来陪他做了评估，也一起调整了外出的安排。你们仍有机会见面，照应不再只靠一个人记得打电话。',{status:'family-support',trust:2},{target:'friend',delta:4,reason:'你先问过{name}的意思，再联系能常来帮忙的人，对方不再怕给你添麻烦'}],
  ['joke','公开拿健忘开玩笑','可能换来笑声，也让对方不敢再求助',{commitment:'public-ridicule',risk:'humiliation',timeHours:0},'朋友后来很少参加那一圈人的活动。有人说他变得不合群，你想起他曾经在一阵笑声里把话咽了回去。',{status:'withdrawn',trust:-4},{target:'friend',delta:-8,reason:'你当着别人嘲笑{name}记不住事，对方后来躲着不肯见你'}],
 ]),
 dilemma('people-old-recording',76,86,later,{
  public:['老同事留下的一段录音','整理单位往事时，老同事给你一段私人录音。里头有他没对外说过的遗憾，采访者想全文使用。',['只分享他明确同意公开的部分','把原录音交给他指定的家人保管','为故事完整，把整段录音发出去']],
  rural:['旧木箱里的一封家书','老邻居请你保管几封旧家书，村里整理口述史的人来借看。信里有些家事他从没公开讲过。',['先问清哪些内容可以公开','把家书交到他指定的家人手里','觉得年代久远，整封交给采写者']],
  grad:['朋友的回忆稿还没定稿','朋友留下回忆稿，请你帮忙保管。读书会想选一段刊出，草稿里仍有他划掉又写回的名字。',['只使用他最终确认过的段落','先交回本人或指定家人决定','替他决定全部内容都能发表']],
  worker:['邻居托你收好的一本旧相册','老邻居请你收着相册，有人想把每一页拍下来做成公开展览。背面写着不少私人记事。',['先确认照片中哪些可以展出','把相册交给他指定的家人保管','把每一页连同背面的字都公开']],
 },[
  ['permission','尊重已经说清的公开范围','故事可能不完整，托付仍被认真对待',{commitment:'archive-consent',timeHours:4},'后来那份公开记录少了一些细节，却留下了本人愿意被记住的部分。熟人再谈起托付，知道你会先问一句能不能说。',{status:'trusted-archive',trust:3},{target:'friend',delta:5,reason:'你只把{name}托付的往事讲给约定的人听，对方知道你没把它当谈资'}],
  ['return','交给本人指定的人决定','不替别人作主，把保管责任交接清楚',{commitment:'archive-handover',timeHours:3},'指定的家人后来确认了接收清单。他们保存了原件，也自己决定哪些往事可以让外人看见。',{status:'archive-delivered',trust:2},{target:'friend',delta:3,reason:'你按{name}的意思把私人物件交给家人，没有让外人翻看'}],
  ['expose','替对方决定全部公开','可能伤害隐私，留下无法撤回的传播',{commitment:'archive-exposed',risk:'privacy-harm',timeHours:1},'家人后来请求撤下那些私人内容。有些副本已经留下，保管一件旧物的托付，变成了需要不断解释和道歉的事。',{status:'archive-dispute',trust:-4},{target:'friend',delta:-7,reason:'你没按{name}的嘱咐，把原本私下说的话讲给了更多人'}],
 ]),
 dilemma('people-emergency-key',80,90,later,{
  public:['老同事想留一把备用钥匙','独居的老同事请你保管备用钥匙，又说别告诉任何人。你也担心自己某天联系不上，谁都进不了门。',['约清使用条件，并留另一位可信联系人','建议使用社区登记的应急联系安排','没有约定便收下钥匙，保证只找自己']],
  rural:['邻居把钥匙放到你手里','老邻居独居，想让你留一把门钥匙。他的孩子在外地，你自己的出门时间也不固定。',['和他及另一位可信的人约好交接','陪他登记家属和村里的应急联系人','一口答应任何时候都能开门照应']],
  grad:['朋友想把求助电话只留给你','独居朋友希望遇事先找你，备用钥匙也只给你一份。你们年纪相近，谁都不能保证总在家。',['约清边界，再增补一位可信联系人','陪他建立多人的应急联络单','答应独自承担所有紧急联络']],
  worker:['楼道里交过来的一把钥匙','老邻居怕自己有一天在屋里出事，让你收下备用钥匙。你愿意帮，也怕一句答应成了做不到的保证。',['写清使用约定，再留第二联系人','一起请社区完善应急联络','没有商量就答应所有时候都到场']],
 },[
  ['shared','说清边界，建立双人接力','尊重隐私，也避免求助只系在一个人身上',{commitment:'shared-emergency',timeHours:3},'后来有一次电话没接通，第二位联系人按约先到场核实。备用钥匙没有随意使用，那份清楚的接力安排也真的派上了用场。',{status:'backup-worked',trust:3},{target:'friend',delta:5,reason:'你和{name}约好了急事找谁、备用钥匙放在哪里，对方独居时安心了些'}],
  ['network','建立不依赖单个人的联络','花时间登记，往后有多人能接上求助',{commitment:'emergency-network',timeHours:4},'新的联系人单后来贴在了对方家里。你仍是其中一个名字，但不再是谁睡着、出门就会断掉的唯一一环。',{status:'network-active',trust:2},{target:'friend',delta:3,reason:'你替{name}补齐了能赶来帮忙的联系人，对方不用只等你一个人'}],
  ['sole','独自承诺随叫随到','可能增加负担，临时不在时缺少替补',{commitment:'sole-contact',risk:'no-backup',timeHours:1},'后来你有一次没能及时接到电话，只能赶紧找人帮忙核实。没有预先说好的替补，两个人都经历了一场不必要的慌张。',{status:'backup-missing',trust:-3},{target:'friend',delta:-4,reason:'你答应应急时赶来，却没替{name}留一个找不到你时的联系人'}],
 ]),
];

// These invitations genuinely depend on earlier closeness. A distant sibling
// will not offer help, and an estranged adult child will not plan a weekend.
const closeChild=s=>familyMembers(s).find(p=>p.role==='child'&&p.alive&&p.age>=18&&p.closeness>=65)??null;
const named=(s,id,fallback)=>{const entry=s.peopleDilemmas?.[id];return familyMembers(s).find(p=>p.id===entry?.personId)?.name??entry?.personName??fallback;};
const siblingDetail=s=>({personId:closeSibling(s)?.id,personName:closeSibling(s)?.name});
const childDetail=s=>({personId:closeChild(s)?.id,personName:closeChild(s)?.name});
const siblingHelp=dilemma('people-sibling-hand',25,62,adult,{
 elite:['家里人说，可以分一件事给我',s=>`${closeSibling(s)?.name??'手足'}看出你最近忙不过来，问能不能替你接一次家里的安排。你担心麻烦对方，也知道对方是在认真开口。`,['把需要的那件事具体说出来','一起分好各自能做的时间','道谢后说这回先自己处理']],
 grad:['手足在电话里多问了一句',s=>`${closeSibling(s)?.name??'手足'}听你说完工作的事，没有马上挂断，问家里最近哪件事需要搭把手。你们这些年的往来，让这句询问很自然。`,['请对方帮一次确实需要的忙','只分一小段，再一起核对安排','不想让对方操心，这次婉拒']],
 migrant:['出门在外，也有人能替你照应',s=>`${closeSibling(s)?.name??'手足'}打来电话，说回老家时可以顺路帮你办一件事。你知道对方也有自己的家，要不要把真正的难处说清？`,['把眼前最需要照应的事说清','请对方只帮方便接手的一部分','说自己能安排好，先不麻烦']],
 worker:['一家人的事，可以分着做',s=>`${closeSibling(s)?.name??'手足'}见你这阵子忙，主动说周末有空，能帮一件家里的事。关系亲近，让这句帮忙不用反复铺垫。`,['接住这份好意，说明具体事情','一起把任务分小，量力安排','谢过对方，这回自己做完']],
},[
 ['accept','接受具体的一次帮助','亲近的手足愿意分担，约清楚具体事情',s=>({...siblingDetail(s),commitment:'accepted-family-help',timeHours:2}),s=>`${named(s,'people-sibling-hand','那位手足')}后来按约替你照应了那件事。你不必再假装什么都能独自做完，也记下了对方需要帮忙时自己能回一把手。`,{status:'family-help-arrived',trust:3},{target:'sibling',delta:5,reason:'你接下了{name}愿意帮忙的那件事，也记着以后找机会回一把手'}],
 ['share','只分一小部分，共同安排','接受支持，也尊重对方能承担的时间',s=>({...siblingDetail(s),commitment:'shared-family-task',timeHours:4}),s=>`后来你和${named(s,'people-sibling-hand','那位手足')}照着约定各做了一部分。没有谁需要临时猜对方还会不会来，家里的事也慢慢有了着落。`,{status:'family-task-shared',trust:2},{target:'sibling',delta:3,reason:'你和{name}把能帮的时间说清楚，没有让对方白等'}],
 ['decline','道谢后婉拒','保留自己的安排，往后求助的机会可能变少',s=>({...siblingDetail(s),commitment:'family-help-declined',timeHours:0}),s=>`${named(s,'people-sibling-hand','那位手足')}后来没有再主动问那件事。你们仍然联络，只是对方不知道下次该不该再多问一句。`,{status:'family-help-quiet',trust:-1},{target:'sibling',delta:-2,reason:'你谢过{name}后说自己能处理，对方不知道下次该不该再开口'}],
]);
siblingHelp.when=s=>s.age>=25&&s.age<=62&&!!closeSibling(s);
const childWeekend=dilemma('people-child-weekend',60,86,later,{
 public:['孩子想陪你过一个不用赶的周末',s=>`${closeChild(s)?.name??'孩子'}说，这次想把周末空出来，陪你看看旧照片。往年你愿意听孩子把话说完，如今孩子也想把时间留给你。`,['把周末空出来，一起商量怎么过','只约一顿饭，留足彼此休息的时间','这回先推迟，没有定下新日子']],
 rural:['孩子说，这次回家不急着走',s=>`${closeChild(s)?.name??'孩子'}打来电话，说想留两天在家，陪你去集上走走。你们平时相处亲近，这次不用等到过年才见面。`,['留出两天，一起慢慢安排','约好吃一顿饭，不催着多留','说家里没事，这回先别回来']],
 grad:['孩子主动约了一次慢慢的见面',s=>`${closeChild(s)?.name??'孩子'}想周末来看你，说不是顺路，是特意把别的事挪开。孩子还记得以前你肯耐心听他说话。`,['认真接住邀请，留出相伴时间','只约一段散步，给彼此留余地','把见面往后推，等以后再说']],
 worker:['孩子问周末想吃什么',s=>`${closeChild(s)?.name??'孩子'}问你周末想吃什么，还说这次由他来准备。你们这些年的亲近，让这顿饭不需要一个特别的理由。`,['说好一起买菜做饭，多坐一会儿','只留一顿饭的时间，不让谁太累','先推掉这次饭局，没约下一次']],
},[
 ['welcome','把时间留给这次相聚','回应成年孩子主动的亲近',s=>({...childDetail(s),commitment:'child-weekend-welcome',timeHours:8}),s=>`后来${named(s,'people-child-weekend','孩子')}又主动约了一个周末。你们没有安排什么大事，只把饭吃得慢一些，旧相册在桌上摊了很久。`,{status:'visits-continued',trust:3},{target:'child',delta:6,reason:'你认真回了{name}想一起过周末的消息，把那天的时间空了出来'}],
 ['short','约一段都能轻松承担的时间','保留相伴，也尊重彼此的体力和生活',s=>({...childDetail(s),commitment:'child-short-visit',timeHours:3}),s=>`你和${named(s,'people-child-weekend','孩子')}后来习惯先商量见面的时长。短短一顿饭也能说清近况，没有人要用累得撑不住来证明惦记。`,{status:'visits-agreed',trust:2},{target:'child',delta:3,reason:'你和{name}商量好只一起吃顿饭，留出彼此休息的时间'}],
 ['later','没有日期地推迟见面','这次保留自己的时间，孩子可能渐渐不再主动约',s=>({...childDetail(s),commitment:'child-visit-deferred',timeHours:0}),s=>`${named(s,'people-child-weekend','孩子')}后来少提周末回来的事。电话还在打，只是两边都不太确定，下一次见面该由谁再开口。`,{status:'visits-less-frequent',trust:-2},{target:'child',delta:-5,reason:'你把和{name}见面的日子一再往后推，孩子不确定你是不是愿意见面'}],
]);
childWeekend.when=s=>s.age>=60&&s.age<=86&&!!closeChild(s);
PEOPLE_CARDS.push(siblingHelp,childWeekend);
