// status=参数：职业路线的模拟先验，非现实招录比例；与原体制内队列目标共同校准。
export const PUBLIC_CAREER_PARAMS = {
  status: '参数',
  teacherApply: .60, teacherAnnualSuccess: .055,
  hospitalApply: .75, hospitalAnnualSuccess: .045,
  selectedApply: .12, selectedAnnualSuccess: .04,
  militaryTransferApply: .15, militaryAnnualSuccess: .12,
};

export const PUBLIC_JOBS = ['公务员', '事业编', '教师', '医护', '公办教师', '公立医院医护'];
export const PUBLIC_MAJOR_TRACKS = {
  '师范教育': 'teacher', '临床医学': 'hospital',
  '教育医护': 'legacy', '教育医疗': 'legacy',
};
const graduate = s => ['bachelor', '211', '985', 'master'].includes(s.edu);
const elite = s => ['211', '985'].includes(s.edu) || ['211', '985'].includes(s.eliteUndergrad) || s.record?.elite;
export const PUBLIC_CAREER_PATHS = [
  {
    id: 'teacher', publicPath: 'teacher-recruitment',
    qualifies: s => graduate(s) && s.publicMajorTrack === 'teacher',
    apply: 'teacherApply', success: 'teacherAnnualSuccess', minAge: 23, maxAge: 35,
    job: '教师', industry: 'education', contract: true,
    label: '教师编制招聘录用概率', diceId: 'teacher-recruitment',
    entry: '师范专业的课程结束了。你先在学校按合同任教，同时准备符合条件的教师编制招聘。合同岗位和编制岗位，写在两份不同的招聘表上。',
    admitted: '教师招聘的笔试、面试和公示结束，名单上有你的名字。你办好了入编手续，继续站在熟悉的讲台前。',
    failures: [
      '这次教师编制招聘没有录用你。你继续按合同上课，把备课本和下次招聘材料放在一起。',
      '教师编制招聘的名额没有轮到你。课表照旧，你下周还要给学生讲完这一单元。',
      '这一轮教师编制招聘结束了，你保留合同岗位，先把眼前的教学工作做好。',
      '公示名单里没有你的名字。你仍按学校合同领取工资，重新安排工作和准备招聘的时间。',
    ],
  },
  {
    id: 'hospital', publicPath: 'hospital-recruitment',
    qualifies: s => graduate(s) && s.publicMajorTrack === 'hospital',
    apply: 'hospitalApply', success: 'hospitalAnnualSuccess', minAge: 23, maxAge: 35,
    job: '医护', industry: 'medical', contract: true, residencyYears: 3,
    label: '医院编制招聘录用概率', diceId: 'hospital-recruitment',
    entry: '临床医学的学业完成后，你进入三年的住院医师规范化培训。轮转、考核和带教排满了日程，规培身份还不是医院编制。',
    residencyCompleted: '三年的规培和考核完成了。你先与医院签订劳动合同，再按条件参加编制岗位招聘；签合同并不等于入编。',
    admitted: '医院编制岗位的招聘和公示完成，你办理了入编手续。此前规培和合同工作的经历，如今都写进了履历。',
    failures: [
      '这轮医院编制招聘没有录用你。你继续按劳动合同工作，值班表仍然排到了下个月。',
      '医院的编制名额有限，这一次没有轮到你。你保留合同岗位，照常完成查房和交班。',
      '招聘结果公布后，你仍是合同制医护。工资照合同发，编制申请要等以后合适的机会。',
      '公示名单里没有你的名字。你继续在合同岗位积累经验，没有把未录用写成入编。',
    ],
  },
  {
    id: 'selected', publicPath: 'selected-graduate',
    qualifies: s => graduate(s) && elite(s) && Boolean(s.partyMember || s.studentCadre || s.record?.partyMember || s.record?.studentCadre),
    apply: 'selectedApply', success: 'selectedAnnualSuccess', minAge: 23, maxAge: 26,
    job: '公务员', industry: 'public',
    label: '选调生竞争录用概率', diceId: 'selected-recruitment',
    entry: '你把院校、党员或学生干部经历逐条对照选调公告，准备报名材料。符合报名条件，还不代表已经拿到名额。',
    admitted: '选调招录的考核、体检和公示结束，你获得了录用。报到以后，新的工作从熟悉基层事务开始。',
    failures: [
      '这次选调竞争没有录用你。你保留现在的工作安排，继续靠眼前的收入生活。',
      '选调名额没有轮到你，原来的工作还要继续。你把申请材料留好，重新安排时间。',
      '名单公布后没有录用通知。你继续工作，没有把符合报名条件当成已经进入体制。',
      '这一轮选调结束了。你回到原来的岗位，先把工作和生活接着往前安排。',
    ],
  },
  {
    id: 'military', publicPath: 'military-transfer',
    qualifies: s => Boolean(s.veteran || s.record?.veteran || s.record?.militaryService || s.job === '军人'),
    apply: 'militaryTransferApply', success: 'militaryAnnualSuccess', minAge: 24, maxAge: 35,
    job: '事业编', industry: 'public',
    label: '退役转业岗位录用概率', diceId: 'military-transfer',
    entry: '服役经历结束后，你开始了解符合条件的转业与岗位招聘安排。名额和资格都需要审核，尚未确定的去向不能算作入编。',
    admitted: '转业岗位的资格审核和录用手续完成，你进入了事业岗位。新的工资和工作安排，从报到这天开始计算。',
    failures: [
      '这次没有获得转业岗位的录用。你继续寻找或保留眼前的工作，不把服役经历直接当成编制。',
      '岗位审核和竞争结束，这一轮没有录用你。你把工作安排放回眼前，继续生活。',
      '转业岗位的名额没有轮到你。你保留现有的收入来源，再留意符合条件的机会。',
      '这轮岗位安排没有确定录用。你收好材料，继续做眼前能接上的工作。',
    ],
  },
];
