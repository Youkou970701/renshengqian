import stats from '../../data/cn-stats.json' with { type: 'json' };

// Exact keys are retained so readers can trace every footnote to the read-only table.
export function resolveStat(key) {
  if (typeof key !== 'string' || !key) return null;
  const parts = key.split('.');
  let value = stats;
  let source = '';
  let status = '';
  let note = '';
  for (const part of parts) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, part)) return null;
    source = value.source || source;
    status = value.status || status;
    note = value.note || value._note || note;
    value = value[part];
  }
  if (value && typeof value === 'object') {
    source = value.source || source;
    status = value.status || status;
    note = value.note || value._note || note;
  }
  return { key, value, source: source || note || '参考资料未列出独立出处', status: status || '未标注', note };
}

// Only approved statistical rows are visible; audit metadata stays in resolveStat.
const labels = {
 'births.national_2024':'2024 年全国出生人口 954 万人。来源：国家统计局统计公报。',
 'education.compulsory_retention':'2024 年九年义务教育巩固率 95.9%。来源：教育事业发展统计公报。',
 'education.general_hs_rate':'2024 年普高招生数约为初中毕业生的 61%。来源：第一财经按教育事业发展统计公报人数计算。',
 'education.hs_stage_gross_enroll':'2024 年高中阶段毛入学率 92%（含中职）。来源：教育事业发展统计公报。',
 'education.higher_ed_gross_enroll':'2024 年高等教育毛入学率 60.8%（含专科、成人教育）。来源：教育事业发展统计公报。',
 'education.gaokao_applicants':'2025 年全国高考报名人数 1335 万。来源：教育部。',
 'education.poor_rural_hs_completion':'贫困农村学生高中完成率约 37%（调查年份未列明）。来源：斯坦福 REAP 张林秀演讲。',
 'education.rural_share_pku':'2013 年北京大学农村生源比例 14.2%。来源：北京大学公布数据。',
 'education.kaoyan_applicants':'2025 年全国硕士研究生考试报名人数 388 万。来源：教育部。',
 'education.master_enroll':'2022 年全国硕士生招生 110.35 万人。来源：教育事业发展统计公报。',
 'career.youth_unemployment':'2025 年 12 月城镇不含在校生的 16 至 24 岁青年失业率 16.5%。来源：国家统计局。',
 'career.guokao_ratio':'2025 年国考约 341.6 万人过审、3.97 万个岗位，约 86 人竞争 1 个岗位。来源：中新网。',
 'career.primary_sector_share':'2023 年第一产业就业人员占比约 23%。来源：国家统计局年鉴口径。',
 'health.life_expectancy':'2024 年全国人均预期寿命 79 岁。来源：国家卫生健康委。',
 'health.infant_mortality':'2024 年婴儿死亡率 4.0‰。来源：国家卫生健康委。',
 'health.under5_mortality':'2024 年 5 岁以下儿童死亡率 5.6‰。来源：国家卫生健康委。',
 'family.left_behind_share_rural':'2013 年农村留守儿童约 6102 万，占农村儿童 37.7%。来源：全国妇联。',
 'family.marriage_registrations':'2024 年全国结婚登记 610.6 万对。来源：民政部。',
 'family.first_marriage_age':'2020 年平均初婚年龄约 28.7 岁。来源：第七次全国人口普查。',
};
export const SOURCES_NOTE = '本作基于公开统计模拟，不代表任何个人命运。统计的年份、调查人群和口径各不相同：历史资料不代表今天每个家庭的情况；人口平均寿命不是个人期限；毛入学率、生源构成和就业人员占比不能当作个人录取或从业概率。未完成原始出处复核的数字仍需核对；模拟计算采用的内部数值不列作统计脚注。';
const clean = (s) => String(s).replace(/Q[1-5]|待核|估算|机制|类别|档位|pending|stat/g,'');
export function footnote(key) {
 const found=resolveStat(key);
 if(!found) throw new Error('Unknown statistical reference: '+key);
 if(!['已核','待核'].includes(found.status)) return '';
 if(labels[key]) return labels[key];
 const raw=found.value;
 const value=typeof raw==='number'?raw:raw?.value;
 if(key.startsWith('births.by_province_2024.') && Number.isFinite(value)) return `2024 年${key.split('.').at(-1)}出生人口约 ${value} 万人。来源：第一财经 2025 年汇总。`;
 if(Number.isFinite(value)) return `${value}${clean(raw?.unit || '')}（${raw?.year ? clean(raw.year)+' 年' : '资料未列明年份'}）。来源：${clean(found.source)}。`;
 throw new Error('Statistical reference has no displayable number: '+key);
}
// Local event.footnote is deliberately ignored: it may describe tuning parameters.
export function visibleFootnote(eventOrKey) {
 const key=typeof eventOrKey==='string'?eventOrKey:eventOrKey?.stat;
 return key ? footnote(key) : '';
}
export const statKeys = Object.keys(labels);
export default footnote;
