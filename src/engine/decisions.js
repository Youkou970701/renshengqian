import { careerDecision,autoCareerChoice } from './career.js';
import { random } from './rng.js';
import { P } from './params.js';
const option=(id,label,effect)=>({id,label,effect});
export function decisionAt(s){
 if(s.age===15&&s.edu==='junior')return {id:'school',title:'中考之后，你想走哪条路？',options:[option('general','争取普通高中','成绩判定；家境影响机会'),option('vocational','报读中职','学习一门技能'),option('leave','先去工作','增加收入，停止升学')]};
 if(s.age===18&&s.record.completed)return {id:'exam',title:s.record.general?'填报高考志愿':'中职毕业后的路',options:[option('exam','参加高考 / 职教升学考试','录取概率取决于成绩与出身'),option('factory','进厂工作','开始积累收入')]};
 if(s.age===19&&s.record.gaokao&&!s.record.admitted&&!s.repeatUsed)return {id:'repeat',title:'你还想再试一次吗？',options:[option('repeat','复读一次','再参加一次考试，成绩略提升'),option('college','接受专科或工作','走技能与就业路线')]};
 if(s.age===21&&['college','vocational'].includes(s.edu))return {id:'upgrade',title:'要再试试本科这条路吗？',options:[option('upgrade','准备专升本 / 继续升学','需要准备考试，不保证录取'),option('work','开始工作','积累工作经验')]};
 if(s.age===22)return careerDecision(s);
 if(s.age===25)return {id:'city',title:'去哪里生活？',options:['一线','省会','县城','老家'].map(c=>option(c,c,'影响收入与住房成本'))};
 if(s.age===29&&!s.married)return {id:'marry',title:'两个人的生活',options:[option('marry','尝试相亲与结婚','影响幸福与家庭支出'),option('single','先独自生活','保留当前生活节奏')]};
 if(s.age===31)return {id:'house',title:'要买房吗？',options:[option('buy','拿积蓄付首付','承担按揭，可能因积蓄不足放弃'),option('rent','继续租住','保留积蓄')]};
 if(s.age===33&&s.married)return {id:'child',title:'是否抚养一个孩子？',options:[option('child','迎接孩子','孩子起点由当前收入和居住地派生'),option('no','暂时不生育','保留当前生活节奏')]};
 if(s.age===35)return {id:'midcareer',title:'工作走到新的路口',options:[option('stay','继续现在的工作','面临行业波动'),option('change','学习技能转行','短期收入下降，改善技能')]};
 return careerDecision(s);
}
export function autoChoose(s){const d=s.pending;if(!d)return null;const u=random(s.rngState).value;
 if(d.id==='career'||d.id==='careerPlan')return autoCareerChoice(s,u);
 const defaults={school:'general',exam:'exam',repeat:'college',upgrade:'upgrade',career:u<.13?'master':u<.18?'civil':u<.25?'home':'work',city:s.wealthQ>=4?'省会':s.hukou==='rural'?'县城':'省会',marry:'marry',house:'rent',child:u<P.family.autoChildProbability?'child':'no',midcareer:'stay'};
 return defaults[d.id]??d.options[0].id;
}
