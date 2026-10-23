import {partnerCandidate,partnerSummary,relationshipPatch} from '../../engine/relationships.js';
import {hashSeed,random} from '../../engine/rng.js';
const chance=(s,salt,p)=>random(hashSeed(s.seed^Math.imul(s.age+1,salt))).value<p;
const effect=action=>s=>relationshipPatch(s,action);
const affection=(s,n)=>({relationship:{...(s.relationship??{}),closeness:Math.max(0,Math.min(100,(s.relationship?.closeness??55)+n))}});
const dating=s=>!s.married&&!!s.datingPartner;
const introduction=(id,title,min,max,stage='adult')=>({id,title,stage,weight:()=>5,cooldown:8,maxPerLife:2,when:s=>!s.married&&!s.datingPartner&&s.age>=min&&s.age<=max,profile:partnerCandidate,body:s=>`${partnerSummary(s)}你们可以先认识，也可以保持原来的安排。`,options:[
 {id:'date',label:'先认识，慢慢交往',hint:'开始一段交往，不立刻结婚',effects:effect('date')},
 {id:'pass',label:'暂时不开始',hint:'保留自己的安排',effects:()=>({})},
]});
export const RELATIONSHIP_CARDS=[
 introduction('relationship-first-love','课间越来越熟悉的那个人',14,17,'teen'),
 introduction('relationship-college-love','一起上课，也一起吃晚饭',19,22,'college'),
 // 2026-10-22 Claude 补：原来 23 岁以后再也遇不到新的人，离婚后几乎不可能再婚（3000 局只有 6 人结过两次婚）。
 {...introduction('relationship-blind-date','家里安排的一次相亲',24,34),title:'家里安排的一次相亲',body:s=>`亲戚介绍了一个人，约在商场的咖啡店见面。${partnerSummary(s)}要不要接着处处看？`},
 {...introduction('relationship-new-start','一个人过了一段日子以后',30,72,'midlife'),title:'一个人过了一段日子以后',maxPerLife:2,cooldown:5,priority:30,when:s=>!s.married&&!s.datingPartner&&s.age>=30&&s.age<=72&&((s.record?.divorces??0)>0||!!s.record?.widowed||s.age>=36)&&chance(s,0x2c1b3c6d,.4),body:s=>`朋友组了个饭局，你旁边坐着一个人，聊得意外地投机。${partnerSummary(s)}`},
 {...introduction('relationship-late-companion','公园里常遇见的那个人',60,80,'senior'),title:'公园里常遇见的那个人',maxPerLife:2,cooldown:4,priority:20,when:s=>!s.married&&!s.datingPartner&&s.age>=60&&s.age<=80&&chance(s,0x3a8f05c5,.2),body:s=>`你们在公园遛弯时常碰见，后来约着一起买菜、一起去社区活动。${partnerSummary(s)}老了找个伴，你怎么想？`},
 {id:'relationship-distance',title:'工作和学校把你们隔在两地',stage:'adult',when:s=>dating(s)&&s.age>=23&&s.age<=34,weight:()=>5,cooldown:8,maxPerLife:1,profile:partnerCandidate,body:s=>`${partnerSummary(s)}你们的时间表渐渐不同，联系要靠两个人一起安排。`,options:[
  {id:'continue',label:'约好固定联系和见面',hint:'保持交往，增加亲近',effects:s=>affection(s,8)},
  {id:'breakup',label:'认真告别，结束交往',hint:'可以在往后遇见其他人',effects:effect('breakup')},
 ]},
 {id:'relationship-breakup',title:'对以后生活的想法变了',stage:'adult',when:s=>dating(s)&&s.age>=24,weight:()=>3,cooldown:12,maxPerLife:2,profile:partnerCandidate,body:()=> '你们谈起工作地点、家庭和各自想要的生活，发现有些期待已经不同。',options:[
  {id:'talk',label:'把各自的期待说清楚',hint:'尝试继续交往',effects:s=>affection(s,5)},
  {id:'breakup',label:'结束这段交往',hint:'双方各自生活',effects:effect('breakup')},
 ]},
 introduction('relationship-matchmaking','朋友介绍了一位新朋友',35,59),
 introduction('relationship-senior-meeting','散步时又遇见熟悉的身影',65,82,'senior'),
 {id:'relationship-late-marriage',title:'要不要把以后的日子放在一起',stage:'midlife',priority:25,when:s=>dating(s)&&s.age>=35&&chance(s,0x4d2a91b7,.35),weight:()=>7,cooldown:12,maxPerLife:2,profile:partnerCandidate,body:s=>`${partnerSummary(s)}登记结婚、继续交往或分开，都需要双方自己决定。婚前个人财产不会因登记自动转给另一方。`,options:[
  {id:'marry',label:'双方自愿，登记结婚',hint:'可以再婚，70多岁也可以；婚前财产分别记录',effects:effect('marry')},
  {id:'continue',label:'继续交往，暂不登记',hint:'保留现在的安排',effects:s=>affection(s,5)},
  {id:'breakup',label:'各自生活',hint:'结束交往',effects:effect('breakup')},
 ]},
 {id:'relationship-marriage-crisis',title:'你们又一次没能把话说下去',stage:'midlife',priority:40,when:s=>s.married&&!!s.relationship?.marriage&&s.age>=26&&chance(s,0x1f12ad71,(s.relationship?.closeness??60)<45?.14:.07),weight:()=>9,cooldown:6,maxPerLife:2,profile:s=>s.partner??partnerCandidate(s),body:()=> '争执反复出现。关系是否继续、如何沟通，都需要你们决定；个人婚前财产与婚后共同财产分别计算。',options:[
  {id:'tolerate',label:'先忍下去，维持现状',hint:'保持婚姻，不提出离婚',effects:effect('tolerate')},
  {id:'cold',label:'暂时冷战',hint:'减少沟通，关系可能更疏远',effects:effect('cold')},
  {id:'consult',label:'一起做婚姻咨询',hint:'咨询费用1200元，尝试重新沟通',requires:s=>s.assets>=1200,effects:effect('consult')},
  {id:'separate',label:'先分居',hint:'记录实际分居时间，不等于自动离婚',effects:effect('separate')},
  {id:'request-divorce',label:'协商协议离婚',hint:'双方同意后申请，先经过30日冷静期',effects:effect('request-divorce')},
  {id:'sue',label:'向法院起诉离婚',hint:'依法审理；法定破裂情形可直接判准',effects:effect('sue')},
 ]},
 {id:'relationship-divorce-window',title:'离婚登记申请还在等待期',stage:'midlife',priority:85,when:s=>s.married&&!!s.relationship?.divorce,weight:()=>1,cooldown:1,maxPerLife:2,body:()=> '申请后有30日冷静期，任一方可以撤回。期满后30日内双方须共同登记，未办理视为撤回。这里只推进关系的天数，不重复结算一年。',options:[
  {id:'register',label:'等满30日，双方再到场登记',hint:'明确等待并办理，不增加年龄或重复领取工资',effects:effect(['wait-30-days','register-divorce'])},
  {id:'withdraw',label:'撤回申请，暂时不离',hint:'任一方在冷静期内可撤回',effects:effect('withdraw')},
 ]},
 {id:'relationship-partner-suit',title:'对方把离婚请求交到了法院',stage:'midlife',priority:60,when:s=>s.married&&s.age>=35&&!!s.relationship?.marriage&&(s.relationship.partnerWantsDivorce||s.relationship.closeness<35&&chance(s,0x31df1279,.10)),weight:()=>1,cooldown:1,maxPerLife:2,profile:s=>s.partner,body:()=> '即使一方不同意，另一方仍可以起诉。法院要判断感情破裂等法定条件；经判决不准离婚后又分居满一年，再诉应当准予离婚。',options:[{id:'contest',label:'不同意离婚，出庭陈述自己的理由',hint:'表达意愿，依法由法院审理',effects:effect('opponent-sue')},{id:'respond',label:'核对共同财产，依法回应诉讼',hint:'个人婚前财产仍分别保留',effects:effect('opponent-sue')}]},
 {id:'relationship-court-again',priority:50,title:'判决之后，生活仍各自分开',stage:'midlife',when:s=>s.married&&s.relationship?.deniedAt!=null&&s.relationship?.separatedAt!=null&&s.age*365+(s.relationshipDayOffset??0)-Math.max(s.relationship.deniedAt,s.relationship.separatedAt)>=365,weight:()=>6,cooldown:6,maxPerLife:1,body:()=> '经判决不准离婚后，你们又分居满一年。此时一方再次起诉，依法应当准予离婚。',options:[
  {id:'sue',label:'再次起诉离婚',hint:'符合判决不准后又分居满一年的条件',effects:effect('sue')},
  {id:'tolerate',label:'暂时维持婚姻关系',hint:'不强制结束婚姻',effects:effect('tolerate')},
 ]},
];
