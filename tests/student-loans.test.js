import test from 'node:test';
import assert from 'node:assert/strict';
import {openStudentLoan, annualStudentLoan, extendStudentLoanStudy, compensateMilitaryTuition, STUDENT_LOAN_RULES} from '../src/engine/student-loans.js';
const state = patch => ({age: 18, assets: 100000, credit: 100, educationFinance: {}, capture: true, ...patch});
const freeze = x => {if (x && typeof x === 'object') {Object.freeze(x);for (const v of Object.values(x)) freeze(v);}return x;};
const loan = s => s.educationFinance.studentLoan;
const year = (s, age, opts) => annualStudentLoan({...s, age}, opts);
function graduated(options = {}) {
  let s = openStudentLoan(state(), options);
  for (let age = 19; age <= 21; age++) s = year(s, age);
  return s;
}

test('本专科2万、研究生2.5万上限，贷款按实际需要并逐年放款', () => {
  assert.equal(STUDENT_LOAN_RULES.undergradAnnualCap, 20000);
  assert.equal(STUDENT_LOAN_RULES.gradAnnualCap, 25000);
  for (const level of ['undergrad', 'college']) {
    const s = openStudentLoan(state(), {level, annualNeed: 40000});
    assert.equal(loan(s).balance, 20000);
    assert.equal(loan(s).totalDisbursed, 20000);
    assert.equal(loan(s).fundedYears, 1);
  }
  assert.equal(loan(openStudentLoan(state(), {level: 'grad', annualNeed: 40000})).balance, 25000);
  let s = openStudentLoan(state(), {annualNeed: 11000, annualTuition: 8000});
  assert.equal(loan(s).balance, 11000);
  assert.equal(loan(s).tuitionLedger[0].loanOutstanding, 8000);
  s = year(s, 19);assert.equal(loan(s).balance, 22000);
  s = year(s, 19);assert.equal(loan(s).balance, 22000, '同一年度不重复放款');
  assert.equal(loan(openStudentLoan(state())).balance, 8000, '默认学费不是2万全额贷款');
});

test('在校不扣息，毕业后完整5年只息不还本，第6年开始本金', () => {
  let s = graduated({lpr: .03});
  assert.equal(loan(s).balance, 32000);
  assert.equal(s.assets, 100000);
  assert.equal(loan(s).lastAnnual.interestSubsidized, true);
  for (let age = 22; age <= 26; age++) {
    const old = s.assets;s = year(s, age);
    assert.equal(loan(s).lastAnnual.interest, 736);
    assert.equal(loan(s).lastAnnual.principalPayment, 0, `毕业后第${age - 21}年`);
    assert.equal(s.assets, old - 736);
    assert.equal(loan(s).balance, 32000);
  }
  s = year(s, 27);
  assert.ok(loan(s).lastAnnual.principalPayment > 0);
  assert.equal(loan(s).lastAnnual.principalDue, 2909.09);
  assert.equal(loan(s).maturityAge, 37, '4年学制+15年，从18岁入学起算');
  for (let age = 28; age <= 37; age++) s = year(s, age);
  assert.equal(loan(s).balance, 0);
});

test('LPR必须显式提供，按LPR减70bp，缺失时保留未核利息而不假定现行数', () => {
  let s = year(graduated(), 22);
  assert.equal(loan(s).rateStatus, 'unverified');
  assert.equal(s.assets, 100000);
  assert.deepEqual(loan(s).pendingInterest, [{age: 22, principal: 32000}]);
  s = year(s, 23, {lpr: .025});
  assert.equal(loan(s).lastAnnual.interest, 576);
  assert.equal(loan(s).rateStatus, 'explicit-parameter');
  assert.equal(loan(s).pendingInterest.length, 1, '新参数不能倒填历史未知LPR');
  assert.equal(loan(year(graduated({lpr: .005}), 22)).lastAnnual.interest, 0, '负利率下限为0');
});

test('参军/休学延期按实际毕业移动宽限期，期限最长22年且服从实际合同deadline', () => {
  let s = openStudentLoan(state(), {lpr: .03});
  s = extendStudentLoanStudy(s, 3, {reason: 'military'});
  assert.equal(loan(s).graduationAge, 25);
  assert.equal(loan(s).maturityAge, 40);
  s = year(s, 19, {suspended: true});
  s = year(s, 20, {suspended: true});
  s = year(s, 21, {suspended: true});
  assert.equal(loan(s).balance, 8000);
  assert.equal(s.assets, 100000, '保留学籍服役期间不向学生扣息');
  for (let age = 22; age <= 24; age++) s = year(s, age);
  assert.equal(loan(s).fundedYears, 4, '退伍回校仅补足实际四个学习年');
  assert.equal(loan(s).balance, 32000);
  assert.equal(loan(year(s, 29)).lastAnnual.principalPayment, 0);
  assert.ok(loan(year(s, 30)).lastAnnual.principalPayment > 0);
  assert.equal(loan(extendStudentLoanStudy(s, 10)).maturityAge, 40, '不能超过入学后22年');
  assert.equal(loan(extendStudentLoanStudy(openStudentLoan(state(), {deadlineAge: 36}), 4)).maturityAge, 36);
  assert.equal(loan(openStudentLoan(state(), {years: 12})).maturityAge, 40);
});

test('军人学费补偿先代偿实际学费贷款，不能清掉生活费贷款或白拿年度上限', () => {
  let s = openStudentLoan(state(), {annualNeed: 14000, annualTuition: 8000});
  s = compensateMilitaryTuition(s);
  assert.equal(loan(s).balance, 6000, '只代偿8千学费，6千生活费仍是贷款');
  assert.equal(s.assets, 100000);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 8000);
  const again = compensateMilitaryTuition(s);
  assert.equal(again.educationFinance.militaryTuition.totalCompensated, 8000);
  assert.equal(loan(again).balance, 6000);
  const capped = compensateMilitaryTuition(openStudentLoan(state(), {annualNeed: 40000, annualTuition: 35000}));
  assert.equal(capped.educationFinance.militaryTuition.totalCompensated, 20000);
  assert.equal(capped.assets, 100000, '补到年度2万上限，没有多余现金');
});

test('无贷款的已缴学费按实际额逐年补偿，重复领取和虚空领取均无额外收益', () => {
  assert.equal(compensateMilitaryTuition(state()).assets, 100000);
  let s = compensateMilitaryTuition(state(), {tuitionPaid: 16000, years: 2});
  assert.equal(s.assets, 116000);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 16000);
  s = compensateMilitaryTuition(s, {tuitionPaid: 16000, years: 2});
  assert.equal(s.assets, 116000);
  const cap = compensateMilitaryTuition(state(), {tuitionPaidByYear: [{year: 17, amount: 30000}, {year: 18, amount: 8000}]});
  assert.equal(cap.assets, 128000);
  const grad = compensateMilitaryTuition(openStudentLoan(state(), {level: 'grad'}));
  assert.equal(grad.educationFinance.militaryTuition.totalCompensated, undefined, '未提供研究生军补规则，不套本科额度');
});

test('还款后军补仍以实际学费为上限，可返还已偿还学费，未付本金优先代偿', () => {
  let s = year(graduated({lpr: .007}), 27);
  assert.equal(loan(s).balance, 29090.91);
  const before = s.assets;
  s = compensateMilitaryTuition(s);
  assert.equal(loan(s).balance, 0);
  assert.equal(s.assets, before + 2909.09);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 32000);
});

test('欠款信用后果只按已知到期债务结算，到期不因仍在校而无限展期', () => {
  let s = year({...graduated({lpr: .03}), assets: 0}, 22);
  assert.equal(loan(s).interestArrears, 736);
  assert.equal(s.credit, 90);
  assert.equal(loan(s).missedPayments, 1);
  s = year({...s, assets: 10000}, 23);
  assert.equal(loan(s).interestArrears, 0);
  assert.equal(loan(s).lastAnnual.interestPayment, 1472);
  const maturity = year(extendStudentLoanStudy(openStudentLoan(state(), {lpr: .007}), 30), 40, {inSchool: true});
  assert.equal(loan(maturity).balance, 0, '22年硬期限到期须结清，不无限享受补贴');
  const deficit = year({...graduated({lpr: .03}), assets: -1000}, 22);
  assert.equal(deficit.assets, -1000, '不能通过年度贷款结算清掉其他负债');
});

test('所有helper保持纯函数，capture标记不改变余额/利息/补偿和确定性', () => {
  const original = freeze(state());
  const a = openStudentLoan(original, {lpr: .03});
  assert.deepEqual(original, state());
  freeze(a);
  const b = annualStudentLoan({...a, age: 19});
  freeze(b);
  assert.doesNotThrow(() => extendStudentLoanStudy(b, 2));
  assert.doesNotThrow(() => compensateMilitaryTuition(b));
  const play = capture => {
    let s = openStudentLoan(state({capture}), {lpr: .03});
    s = compensateMilitaryTuition(s);
    s = extendStudentLoanStudy(s, 2);
    for (let age = 19; age <= 29; age++) s = year(s, age, {suspended: age <= 20});
    return {finance: s.educationFinance, assets: s.assets, credit: s.credit};
  };
  assert.deepEqual(play(true), play(false));
  assert.deepEqual(play(true), play(true));
});


test('未实际缴纳的学费差额不能生成军补现金，实际毕业年龄控制宽限和期限', () => {
  const s = compensateMilitaryTuition(openStudentLoan(state(), {annualNeed: 4000, annualTuition: 8000}));
  assert.equal(s.assets, 100000, '只贷过4千，不假设剩下4千已经缴费');
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 4000);
  const confirmedPaid = compensateMilitaryTuition(s, {tuitionPaidByYear: [{year: 18, amount: 4000}]});
  assert.equal(confirmedPaid.assets, 104000);
  assert.equal(confirmedPaid.educationFinance.militaryTuition.totalCompensated, 8000);
  assert.equal(loan(openStudentLoan(state(), {graduationAge: 25})).maturityAge, 40);
  const delayed = year(graduated({lpr: .03}), 25, {graduatedAt: 25});
  assert.equal(loan(delayed).maturityAge, 40);
  assert.equal(loan(year(delayed, 29)).lastAnnual.principalPayment, 0);
});


test('本科接研究生保留旧债，新学段按2.5万单独放款，各自期限独立', () => {
  const undergrad = graduated({lpr: .03});
  let s = openStudentLoan({...undergrad, age: 22}, {level: 'grad', years: 3, annualNeed: 30000, annualTuition: 10000, lpr: .03});
  assert.equal(s.educationFinance.studentLoans.length, 2);
  assert.equal(s.educationFinance.loanBalance, 57000);
  const old = s.educationFinance.studentLoans[0], current = loan(s);
  assert.equal(old.balance, 32000);assert.equal(old.annualCap, 20000);
  assert.equal(old.maturityAge, 37);assert.equal(old.graduationAge, 22);
  assert.equal(current.balance, 25000);assert.equal(current.annualCap, 25000);
  assert.equal(current.maturityAge, 40);assert.equal(current.graduationAge, 25);
  const repeat = openStudentLoan(s, {level: 'grad', annualNeed: 30000});
  assert.equal(repeat.educationFinance.studentLoans.length, 2);
  assert.equal(repeat.educationFinance.loanBalance, 57000);
  s = year(s, 23, {inSchool: true});
  assert.equal(s.educationFinance.studentLoans[0].lastAnnual.interest, 736, '旧本科不能继承研究生的在校/宽限状态');
  assert.equal(loan(s).balance, 50000);
  assert.equal(loan(s).lastAnnual.interest, 0);
  assert.equal(s.educationFinance.loanBalance, 82000);
  s = year(s, 24);
  assert.equal(s.educationFinance.loanBalance, 107000);
  assert.equal(s.educationFinance.loanOriginal, 107000);
  s = year(s, 27);
  assert.ok(s.educationFinance.studentLoans[0].lastAnnual.principalPayment > 0);
  assert.equal(loan(s).lastAnnual.principalPayment, 0, '研究生账户仍在自身宽限期');
});

test('多账户军补只代偿本专科学费，绝不抵研究生贷款', () => {
  let s = openStudentLoan({...graduated({lpr: .03}), age: 22}, {level: 'grad', annualNeed: 25000, annualTuition: 10000});
  s = compensateMilitaryTuition(s);
  assert.equal(s.educationFinance.studentLoans[0].balance, 0);
  assert.equal(loan(s).balance, 25000);
  assert.equal(s.educationFinance.loanBalance, 25000);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 32000);
  s = compensateMilitaryTuition(s);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 32000);
  assert.equal(loan(s).balance, 25000);
});

test('同年多账户的军补合计仍不超过本专科年度2万上限', () => {
  let s = openStudentLoan(state(), {level: 'undergrad', annualNeed: 20000, annualTuition: 20000});
  s = openStudentLoan(s, {level: 'college', annualNeed: 20000, annualTuition: 20000});
  s = compensateMilitaryTuition(s);
  assert.equal(s.educationFinance.militaryTuition.totalCompensated, 20000);
  assert.equal(s.educationFinance.loanBalance, 20000);
});


test('五年医学专业增加一个真实放款学年，服役延期不增加放款，毕业前转贷只贷剩余学年', () => {
  let s = extendStudentLoanStudy(openStudentLoan(state()), 1, {reason: 'clinical-medicine', additionalFunding: true});
  assert.equal(loan(s).programYears, 5);
  assert.equal(loan(s).graduationAge, 23);
  assert.equal(loan(s).maturityAge, 38);
  for (let age = 19; age <= 22; age++) s = year(s, age);
  assert.equal(loan(s).fundedYears, 5);assert.equal(loan(s).balance, 40000);
  s = extendStudentLoanStudy(s, 2, {reason: 'military'});
  assert.equal(loan(s).programYears, 5);
  assert.equal(loan(s).graduationAge, 25);
  assert.equal(loan(s).maturityAge, 40);
  s = year(s, 23, {suspended: true});s = year(s, 24, {suspended: true});
  assert.equal(loan(s).balance, 40000);
  let late = openStudentLoan(state({age: 21}), {years: 1, graduationAge: 22});
  assert.equal(loan(late).balance, 8000);
  late = year(late, 22);
  assert.equal(loan(late).fundedYears, 1);assert.equal(loan(late).balance, 8000);
});
