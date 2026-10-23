import {partnerCandidate,partnerSummary} from '../../engine/relationships.js';
const o=(id,label,hint)=>({id,label,hint});
const node=(id,stage,age,title,options,when=()=>true)=>({id,stage,when:s=>s.age===(id==='career'?Math.max(age,s.collegeGraduateAge??age):age)&&when(s),weight:()=>1,cooldown:5,maxPerLife:1,priority:100,core:true,title,body:()=>'',options});
export const CORE_CARDS=[
 node('school','teen',15,'中考之后，你想走哪条路？',[o('general','争取公办普通高中','未录取还可以选择其他路'),o('vocational','报读中职','接着选择专业和学费安排'),o('leave','先去工作','暂时离开学校，以后仍有第二次机会')],s=>s.edu==='junior'),
 {id:'school-alternatives',stage:'teen',when:s=>s.age>=15&&s.age<=16&&s.record.junior&&s.record.schoolSettled===true&&s.record.publicGeneral===false&&!s.schoolRoute,weight:()=>1,cooldown:5,maxPerLife:1,priority:90,core:true,title:'公办普高没有录取，你还有别的路',body:()=> '班主任把几份招生简章放在桌上。学费、时间和将来的工作，都需要一起考虑。',options:[o('private','民办普通高中','每年学费 1.8 万元；家庭需有支付能力'),o('repeat-junior','复读初三','多用一年时间，重新参加中考'),o('vocational','中职 / 技校','选一门手艺，仍可参加升学考试'),o('talent','艺体特长路线','需要童年练习或已经显露的天分'),o('international','国际学校 / 出国','城市家庭且经济条件充足；费用较高'),o('work','暂时不读，先去工作','将来可以再回课堂')]},
 node('exam','high',18,'毕业之后，你想怎样继续？',[o('exam','参加高考 / 职教升学考试','录取概率取决于成绩与出身'),o('factory','进厂工作','开始积累收入')],s=>s.record.completed&&!s.repeatJunior),
 node('repeat-exam','high',19,'多读一年后，升学的考场到了',[o('exam','参加升学考试','按本次成绩与实际录取机会判定'),o('factory','先去工作','暂停全日制升学')],s=>s.repeatJunior&&s.record.completed),
 node('repeat','high',19,'录取通知没有来，接下来的时间怎么安排？',[o('repeat','复读一年','重新准备考试，会占用时间和生活费'),o('college','接受专科或工作','走技能与就业路线')],s=>s.record.gaokao&&!s.record.admitted&&!s.repeatUsed&&!s.repeatJunior),
 node('upgrade','college',21,'要再试试本科这条路吗？',[o('upgrade','准备专升本 / 继续升学','需要准备考试，不保证录取'),o('work','开始工作','积累工作经验')],s=>['college','vocational'].includes(s.edu)),
 node('career','adult',22,'离开校园之后，你准备怎么生活？',[o('work','找一份工作','投简历，开始自己的生活'),{...o('master','进入研究生备考状态','之后逐年参加，成功、放弃或年龄条件变化后退出'),requires:s=>['bachelor','211','985'].includes(s.edu)&&!s.record.masterAdmitted},{...o('civil','进入公务员 / 事业编备考状态','之后逐年参加，菜单可放弃'),requires:s=>!s.record?.criminalRecord&&!s.criminalRecord&&['college','bachelor','211','985','master'].includes(s.edu)&&!['公务员','教师','医护','事业编'].includes(s.job)},o('home','回老家找活','务农、做小生意或在附近就业')],s=>!(s.incarceratedUntil>s.age)&&s.job!=='研究生在读'&&!s.preparation&&!s.militaryService?.active),
 node('city','adult',25,'去哪里生活？',['一线','省会','县城','老家'].map(c=>o(c,c,'影响收入与住房成本'))),
 {...node('marry','adult',29,'两个人的生活',[o('marry','尝试相亲与结婚','影响幸福与家庭支出'),o('single','先独自生活','保留当前生活节奏')],s=>!s.married),profile:partnerCandidate,body:partnerSummary},
 node('house','adult',31,'要买房吗？',[o('buy','在工作地买普通房','承担按揭，首付与月供不足时继续租住'),o('buy-small','在工作地买小房','面积小一些，首付和月供也少一些'),o('buy-county','买县城小房','可以在县城安家，工作地仍可租住'),o('buy-home','买老家小房','老家的房价更低，仍需要偿还贷款'),o('rent','继续租住','保留积蓄')]),
 node('child','adult',33,'是否抚养一个孩子？',[o('child','迎接孩子','孩子起点由当前收入和居住地派生'),o('no','暂时不生育','保留当前生活节奏')],s=>s.married),
 node('midcareer','adult',35,'工作走到新的路口',[o('stay','继续现在的工作','面临行业波动'),o('change','学习技能转行','短期收入下降，改善技能')]),
];
