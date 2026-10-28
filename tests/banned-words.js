// First-pass editorial guard. Claude can extend this list during content review.
// Neutral terms such as 疾病、死亡、癌症 are deliberately allowed.
export const terminology = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', '待核', '估算', '机制', '类别', '档位', 'pending', 'stat'];
export const bannedWords = [
  ...terminology, '系数', '按完整十二个月', '恢复了在岗工作', '重新开始领取工资', '收支平常', '年景周期', '求职空档', '在岗月份', '\u6295\u80ce',
  '跳楼', '上吊', '割腕', '吞药自尽', '自杀方法', '自杀教程',
  '强奸', '性侵', '强暴', '家暴',
  '天生低等', '活该穷', '地域劣根', '低等人', '劣等人',
  '户籍制度害人', '高考制度害人', '计划生育害人',
];

export function findBannedWords(text) {
  return bannedWords.filter((word) => String(text).includes(word));
}

export default bannedWords;
