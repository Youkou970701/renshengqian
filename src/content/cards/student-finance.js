const student=s=>['college','bachelor','211','985'].includes(s.edu)&&s.age>=18&&s.age<(s.collegeGraduateAge??23)&&!s.overseasUndergrad&&!s.masterPlan?.started;
export const STUDENT_FINANCE_CARDS=[
 {id:'college-cadre-election',stage:'college',when:s=>s.age>=20&&s.age<=21&&['211','985'].includes(s.edu)&&!s.studentCadre,weight:()=>1,priority:85,cooldown:5,maxPerLife:1,title:'班级需要新的联系人',body:()=> '同学邀请你参加班委竞选。组织活动、协调日常问题会占用课余时间，是否当选由投票决定。',options:[{id:'run',label:'参加竞选',hint:'花时间沟通，不保证当选',effects:()=>({educationAction:'cadre-campaign'})},{id:'study',label:'把时间留给课程',hint:'暂不承担班级职务',effects:s=>({skills:{...s.skills,study:(s.skills?.study??0)+2}})}]},
 {id:'college-military-service',stage:'college',when:s=>student(s)&&!s.record?.criminalRecord&&!s.criminalRecord&&!s.militaryService&&s.attrs.health>=60,weight:()=>2,cooldown:5,maxPerLife:1,title:'校园里的征兵咨询台',body:()=> '报名还需要审核与体检。入伍后保留学籍，服役结束后可以回校继续读书；学费补偿按实际学费和规定上限计算。',options:[
  {id:'enlist',label:'报名并接受审核',hint:'审核通过后服役两年，退伍再回课堂',effects:()=>({educationAction:'college-enlist'})},
  {id:'study',label:'先把这一阶段读完',hint:'保持原来的学习安排',effects:s=>({skills:{...s.skills,study:(s.skills?.study??0)+2}})},
 ]},
 {id:'graduate-tuition',stage:'college',when:s=>(s.job==='研究生在读'||s.masterPlan?.started)&&s.age>=(s.masterStartedAt??s.masterGraduateAge-3)&&s.masterGraduateAge>s.age&&!s.educationFinance?.gradTuitionOffered,weight:()=>1,priority:105,cooldown:5,maxPerLife:1,title:'研究生入学后的费用',body:()=> '奖助、家庭支持和贷款可以一起核对。研究生助学贷款每年最多二万五千元，实际借多少按费用需要决定。',options:[
  {id:'loan',label:'按实际需要申请助学贷款',hint:'国内全日制研究生每年上限二万五千元，毕业后五年还本宽限；在职或海外课程不适用',requires:s=>s.masterStudyMode!=='parttime'&&!s.masterStudyAbroad,effects:()=>({educationAction:'grad-tuition-loan'})},
  {id:'family',label:'由积蓄和家庭支持承担',hint:'保留贷款额度，记录实际教育支出',effects:()=>({educationAction:'grad-tuition-family'})},
 ]},
];
