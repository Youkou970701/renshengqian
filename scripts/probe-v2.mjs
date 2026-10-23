import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawBirth } from '../src/engine/birth.js';
import { step } from '../src/engine/life.js';
import { autoChoose } from '../src/engine/decisions.js';
import { isBachelor } from '../src/engine/education.js';
import {recordSchoolObservation} from './cohort.mjs';

// The seed sequence is identical to scripts/cohort.mjs. Every observation below
// comes from actual choices through step(), never a calibration snapshot.
const median = values => {
  const a = [...values].sort((x, y) => x - y), m = Math.floor(a.length / 2);
  return a.length ? a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2 : null;
};
const ratio = (numerator, denominator) => denominator ? numerator / denominator : null;
const increment = (counts, key) => counts[key] = (counts[key] ?? 0) + 1;
const retryPattern = /今年.*(?:再试|再考|备考)|还要再试一次|今年还要|careerPlan/;

function baselineMatrix() {
  const text = readFileSync(new URL('../docs/codex-handoff-02-results.md', import.meta.url), 'utf8');
  const section = text.split('## 档位 × 户口 × 家境本科率矩阵')[1]?.split('### 全国城乡')[0];
  if (!section) throw new Error('无法读取 02 的存活到 18 岁本科率矩阵');
  const baseline = {};
  for (const line of section.split('\n')) {
    const cells = line.split('|').map(x => x.trim());
    if (!/^[SABC]$/.test(cells[1] ?? '') || !['urban', 'rural'].includes(cells[2])) continue;
    for (let q = 1; q <= 5; q++) {
      const match = cells[q + 2]?.match(/^([\d.]+)% \(n=(\d+)\)$/);
      if (!match) throw new Error(`02 矩阵单元格无法解析: ${line}`);
      baseline[`${cells[1]}:${cells[2]}:Q${q}`] = { rate: Number(match[1]) / 100, sampleSize: Number(match[2]) };
    }
  }
  if (Object.keys(baseline).length !== 40) throw new Error('02 基线矩阵必须有 40 格');
  return baseline;
}

export function probeV2({ n = 3000, offset = 0 } = {}) {
  if (!Number.isInteger(n) || n < 3000) throw new Error('正式分层探针必须运行至少 3000 局');
  if (!Number.isInteger(offset) || offset < 0) throw new Error('offset 必须为非负整数');
  const counts = [], after35 = [], perCard = {}, routeCounts = {}, strata = {}, issues = [], privateStrata = {},schoolStrata={},schoolByWealth={};
  const baseline = baselineMatrix();
  const school = { settled: 0, junior: 0, initialPublicGeneral: 0, publicGeneral: 0, privateGeneral: 0, general: 0, alternativeCards: 0, earlyAlternativeCards: 0 };
  let retryCards = 0, nonGeneral = 0, missingRoute = 0, q1Bachelor = 0, tuitionOffered = 0;
  let competitionAdmitted = 0, specialAdmitted = 0, specialPoorAdmitted = 0, specialExams = 0, specialEligible = 0, maxCardPerLife = 0, maxCardsPerYear = 0;
  let mismatchedHistory = 0;
  const issue = value => { if (issues.length < 30) issues.push(value); };
  for (let i = 0; i < n; i++) {
    const seed = (Math.imul(i + offset, 2654435761) + 123456789) >>> 0;
    const birth = drawBirth(seed);
    let life = { ...birth, capture: false }, guard = 0, resolved = 0, schoolResolved = false;
    while (life.alive) {
      if (++guard > 1000) throw new Error(`人生未终止: ${birth.id}, age=${life.age}, pending=${life.pending?.id}`);
      let input = {};
      if (life.pending) {
        const pending = life.pending;
        if (pending.id === 'school-alternatives') {
          school.alternativeCards++;
          if (!schoolResolved || !life.record.schoolSettled || life.record.publicGeneral !== false) {
            school.earlyAlternativeCards++;
            issue({ type: 'earlySchoolAlternative', id: birth.id, age: life.age, schoolResolved, schoolSettled: life.record.schoolSettled ?? null, publicGeneral: life.record.publicGeneral ?? null });
          }
        }
        if (retryPattern.test(`${pending.id} ${pending.title}`)) {
          retryCards++;
          issue({ type: 'annualRetry', id: birth.id, age: life.age, cardId: pending.id, title: pending.title });
        }
        const choice = autoChoose(life);
        if (!pending.options.some(o => o.id === choice && !o.disabled)) throw new Error(`自动策略返回不可用选择: ${birth.id} ${pending.id}/${choice}`);
        input = { choice };
        resolved++;
      }
      const settlingSchool = life.pending?.id === 'school';
      life = step(life, input).state;
      if (settlingSchool) schoolResolved = true;
    }
    if (!Array.isArray(life.cardHistory)) throw new Error(`缺少真实 cardHistory: ${birth.id}`);
    const history = life.cardHistory;
    recordSchoolObservation(schoolStrata,`${birth.tier}:${birth.hukou}:Q${birth.wealthQ}`,birth,life);recordSchoolObservation(schoolByWealth,`${birth.hukou}:Q${birth.wealthQ}`,birth,life);
    if (history.length !== resolved) {
      mismatchedHistory++;
      issue({ type: 'historyMismatch', id: birth.id, resolved, recorded: history.length });
    }
    counts.push(history.length);
    after35.push(history.filter(h => h.age > 35).length);
    const lifeCards = {}, yearCards = {};
    for (const h of history) {
      if (typeof h.id !== 'string' || !Number.isInteger(h.age) || typeof h.choice !== 'string') throw new Error(`无效 cardHistory 条目: ${birth.id} ${JSON.stringify(h)}`);
      const total = increment(lifeCards, h.id), yearly = increment(yearCards, h.age);
      maxCardPerLife = Math.max(maxCardPerLife, total);
      maxCardsPerYear = Math.max(maxCardsPerYear, yearly);
      const c = perCard[h.id] ??= { resolved: 0, lives: 0, maxPerLife: 0 };
      c.resolved++; c.lives += total === 1; c.maxPerLife = Math.max(c.maxPerLife, total);
      if (total > 2) issue({ type: 'cardPerLife', id: birth.id, cardId: h.id, count: total });
      if (yearly > 2) issue({ type: 'cardsPerYear', id: birth.id, age: h.age, count: yearly });
    }
    school.settled += life.record.schoolSettled === true;
    school.junior += !!life.record.junior;
    school.initialPublicGeneral += life.record.publicGeneral === true;
    school.publicGeneral += life.record.publicGeneralEver === true;
    school.privateGeneral += life.record.privateGeneral === true;
    school.general += !!life.record.general;
    const privateKey = `${birth.tier}:${birth.hukou}:Q${birth.wealthQ}`;
    const privateStratum = privateStrata[privateKey] ??= { sampleSize: 0, schoolSettled: 0, nonPublic: 0, initialPublicGeneral: 0, publicGeneral: 0, privateGeneral: 0, general: 0, privateRoute: 0, routes: {} };
    privateStratum.sampleSize++;
    privateStratum.schoolSettled += life.record.schoolSettled === true;
    privateStratum.initialPublicGeneral += life.record.publicGeneral === true;
    privateStratum.publicGeneral += life.record.publicGeneralEver === true;
    privateStratum.privateGeneral += life.record.privateGeneral === true;
    privateStratum.general += !!life.record.general;
    if (life.record.schoolSettled && life.record.publicGeneral === false) {
      nonGeneral++;
      privateStratum.nonPublic++;
      privateStratum.privateRoute += life.schoolRoute === 'private';
      increment(privateStratum.routes, life.schoolRoute ?? 'unrecorded');
      if (!life.schoolRoute) missingRoute++;
      increment(routeCounts, life.schoolRoute ?? 'unrecorded');
    }
    const bachelor = isBachelor(life);
    if (birth.wealthQ === 1 && bachelor) {
      q1Bachelor++;
      tuitionOffered += !!life.educationFinance?.tuitionOffered;
    }
    competitionAdmitted += !!life.record.competitionAdmitted;
    specialAdmitted += !!life.record.specialAdmitted;
    const ruralPoor = birth.hukou === 'rural' && birth.wealthQ <= 2;
    specialPoorAdmitted += ruralPoor && !!life.record.gaokao && !!life.record.specialAdmitted;
    specialExams += ruralPoor && !!life.record.gaokao;
    specialEligible += life.record.specialEligible === true;
    const key = `${birth.tier}:${birth.hukou}:Q${birth.wealthQ}`;
    const stratum = strata[key] ??= { sampleSize: 0, alive18: 0, bachelor: 0, bachelorAlive18: 0 };
    stratum.sampleSize++; stratum.alive18 += life.age >= 18;
    stratum.bachelor += bachelor; stratum.bachelorAlive18 += bachelor && life.age >= 18;
  }
  const routes = Object.fromEntries(Object.entries(routeCounts).sort(([a], [b]) => a.localeCompare(b)).map(([route, count]) => [route, { count, sampleSize: nonGeneral, rate: ratio(count, nonGeneral) }]));
  const routesAbove3Percent = Object.entries(routes).filter(([route, row]) => !['unrecorded', 'public'].includes(route) && row.rate >= .03).map(([route]) => route);
  const matrix = Object.fromEntries(Object.keys(baseline).map(key => {
    const s = strata[key] ?? { sampleSize: 0, alive18: 0, bachelor: 0, bachelorAlive18: 0 };
    const rateAlive18 = ratio(s.bachelorAlive18, s.alive18);
    return [key, { ...s, rateCohort: ratio(s.bachelor, s.sampleSize), rateAlive18, baseline02: baseline[key], deltaFrom02pp: rateAlive18 === null ? null : (rateAlive18 - baseline[key].rate) * 100, interpretation: s.alive18 < 30 ? '小样本，仅列计数，不能作为分层结论' : '描述性样本，门槛由独立全量校准验收' }];
  }));
  const privateMatrix = Object.fromEntries(Object.keys(baseline).map(key => {
    const s = privateStrata[key] ?? { sampleSize: 0, schoolSettled: 0, nonPublic: 0, publicGeneral: 0, privateGeneral: 0, general: 0, privateRoute: 0, routes: {} };
    return [key, { ...s, privateRouteRateAmongNonPublic: ratio(s.privateRoute, s.nonPublic), privateGeneralRateOfCohort: ratio(s.privateGeneral, s.sampleSize), interpretation: s.nonPublic < 30 ? '小样本，只作描述，不能作为分层结论' : '民办去向分母为已结算中考且未被公办录取者' }];
  }));
  const rareAdmissionChecks = [
    { name: '竞赛录取占出生队列 0.1–0.3%', value: ratio(competitionAdmitted, n), numerator: competitionAdmitted, sampleSize: n, min: .001, max: .003 },
    { name: '专项录取占农村 Q1–Q2 高考人群 3–8%', value: ratio(specialPoorAdmitted, specialExams), numerator: specialPoorAdmitted, sampleSize: specialExams, min: .03, max: .08 },
  ].map(check => ({ ...check, formal: n >= 100000, pass: n >= 100000 ? check.value !== null && check.value >= check.min && check.value <= check.max : null }));
  const checks = [
    { name: '中考结算前替代路线卡出现 0 次', value: school.earlyAlternativeCards, pass: school.earlyAlternativeCards === 0 },
    { name: '每局有效抉择中位数 ≥ 18', value: median(counts), pass: median(counts) >= 18 },
    { name: '同卡一生 ≤ 2 次', value: maxCardPerLife, pass: maxCardPerLife <= 2 },
    { name: '每年最多 2 张卡', value: maxCardsPerYear, pass: maxCardsPerYear <= 2 },
    { name: '年年再试一次类卡为 0', value: retryCards, pass: retryCards === 0 },
    { name: '未进公办普高至少 4 种路线各 ≥ 3%', value: routesAbove3Percent.length, pass: routesAbove3Percent.length >= 4 },
    { name: '未进公办普高去向无缺失', value: missingRoute, pass: missingRoute === 0 },
    { name: '本科 Q1 学费卡触发率 ≥ 40%', value: ratio(tuitionOffered, q1Bachelor), numerator: tuitionOffered, sampleSize: q1Bachelor, pass: q1Bachelor > 0 && tuitionOffered / q1Bachelor >= .4 },
    { name: '真实选择全部计入 cardHistory', value: mismatchedHistory, pass: mismatchedHistory === 0 },
    ...rareAdmissionChecks.filter(check => check.formal),
  ];
  return {
    milestone: 'M1', n, offset,schoolStrata,schoolByWealth, seedFormula: '(Math.imul(i + offset, 2654435761) + 123456789) >>> 0',
    source: 'drawBirth + step + autoChoose; capture=false; cardHistory records every resolved card',
    checks, pass: checks.every(c => c.pass), failures: checks.filter(c => !c.pass).map(c => c.name),
    choices: { median: median(counts), medianAfter35: median(after35), min: Math.min(...counts), max: Math.max(...counts), distribution: counts.reduce((a, v) => { increment(a, v); return a; }, {}), after35Distribution: after35.reduce((a, v) => { increment(a, v); return a; }, {}) },
    maxCardPerLife, maxCardsPerYear, retryCards, perCard, nonGeneral, routes, routesAbove3Percent,
    q1Tuition: { sampleSize: q1Bachelor, count: tuitionOffered, rate: ratio(tuitionOffered, q1Bachelor) },
    school: { ...school, publicGeneralRatePerJunior: ratio(school.publicGeneral, school.junior), privateGeneralRatePerJunior: ratio(school.privateGeneral, school.junior), generalRatePerJunior: ratio(school.general, school.junior) },
    routeDenominator: '最终 record.schoolSettled === true 且 record.publicGeneral === false；不使用 offered 标记代替真实中考结算',
    privateMatrix,
    admissions: { competitionAdmitted, specialAdmitted, specialPoorAdmitted, specialExams, specialEligible, competitionRateOfBirths: ratio(competitionAdmitted, n), specialRateOfRuralPoorExams: ratio(specialPoorAdmitted, specialExams), rareAdmissionChecks, eligibilityNote: 'specialEligible 直接计数 record.specialEligible===true（高考时农村户口、县城/乡镇高中且score达到 EDUCATION_RULES.topFifthScore；不按家境切资格）；专项硬门槛分子仅该人群专项录取specialPoorAdmitted，分母是所有农村Q1–Q2高考人群 specialExams，不以资格筛选缩小分母' },
    matrixDenominator: 'rateAlive18 与 02 主矩阵一致：活到 18 岁者；rateCohort 另列全出生队列口径',
    matrix, issues,
    calibration: '本探针不替代原 25 项校准，必须另跑完整 calibrate。小样本分层差值不能当作结论。',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), option = (name, fallback) => {
    const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1];
  };
  const n = Number(option('--n', '3000')), offset = Number(option('--offset', '0'));
  const output = resolve(option('--output', 'tests/artifacts-09/M1/probe.json'));
  const result = probeV2({ n, offset });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  for (const check of result.checks) process.stdout.write(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}: ${check.value}\n`);
  for (const check of result.admissions.rareAdmissionChecks.filter(c => !c.formal)) process.stdout.write(`OBSERVE ${check.name}: ${check.numerator}/${check.sampleSize}（稀有事件仅报告，正式 100000 局验收）\n`);
  process.stdout.write(`中考口径 publicGeneral=${result.school.publicGeneral}; privateGeneral=${result.school.privateGeneral}; general=${result.school.general}; junior=${result.school.junior}\n`);
  process.stdout.write(`35岁以后抉择中位数: ${result.choices.medianAfter35}\n竞赛录取: ${result.admissions.competitionAdmitted}; 专项录取: ${result.admissions.specialAdmitted}\n${output}\n`);
  if (!result.pass) process.exitCode = 1;
}
