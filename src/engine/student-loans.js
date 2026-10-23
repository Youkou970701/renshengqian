import { DATA } from './stats.js';

// Rates are model inputs, never an invented current LPR. All helpers return a
// new state; there is no RNG, wall clock, capture branch or logging side effect.
const RULES = DATA.education.student_loan;
export const STUDENT_LOAN_RULES = Object.freeze({
  undergradAnnualCap: RULES.max_per_year_undergrad.value,
  gradAnnualCap: RULES.max_per_year_grad.value,
  principalGraceYears: RULES.principal_grace_years.value,
  extraTermYears: 15,
  maximumTermYears: 22,
  lprDiscount: .007,
  militaryAnnualCap: RULES.military_tuition_compensation.value,
});
const money = value => Math.round((Number.isFinite(value) ? Math.max(0, value) : 0) * 100) / 100;
const positiveYears = (value, fallback) => Number.isInteger(value) && value > 0 ? value : fallback;
function cloneLoan(loan) {
  return {...loan, id: loan.id ?? `${loan.level}:${loan.startAge}`, tuitionLedger: (loan.tuitionLedger ?? []).map(x => ({...x})), disbursements: (loan.disbursements ?? []).map(x => ({...x})), pendingInterest: (loan.pendingInterest ?? []).map(x => ({...x})), studyExtensions: (loan.studyExtensions ?? []).map(x => ({...x})), lastAnnual: loan.lastAnnual ? {...loan.lastAnnual} : null};
}
function copy(s) {
  const finance = {...(s.educationFinance ?? {})};
  const current = finance.studentLoan;
  finance.studentLoans = (finance.studentLoans ?? (current ? [current] : [])).map(cloneLoan);
  const currentId = current ? current.id ?? `${current.level}:${current.startAge}` : null;
  finance.studentLoan = finance.studentLoans.find(x => x.id === currentId) ?? finance.studentLoans.at(-1);
  finance.militaryTuition = {...(finance.militaryTuition ?? {}), ledger: (finance.militaryTuition?.ledger ?? []).map(x => ({...x}))};
  return {...s, educationFinance: finance};
}
function mirror(s) {
  const f = s.educationFinance, loans = f.studentLoans ?? [];
  if (loans.length) {
    const sum = fn => money(loans.reduce((n, loan) => n + fn(loan), 0));
    f.loanOriginal = sum(loan => loan.totalDisbursed);
    f.loanBalance = sum(loan => loan.balance);
    f.loanInterestArrears = sum(loan => loan.interestArrears);
    f.lastPayment = sum(loan => loan.lastAnnual?.age === s.age ? loan.lastAnnual.payment : 0);
    f.missedPayments = loans.reduce((n, loan) => n + loan.missedPayments, 0);
  }
  return s;
}
function rate(lpr) {
  if (!Number.isFinite(lpr) || lpr < 0 || lpr > 1) return null;
  return Math.max(0, lpr - STUDENT_LOAN_RULES.lprDiscount);
}
function fund(s, loan = s.educationFinance.studentLoan) {
  if (!loan || s.age >= loan.graduationAge || loan.fundedYears >= loan.programYears || s.age >= loan.maturityAge || loan.disbursements.some(x => x.age === s.age)) return;
  const amount = money(Math.min(loan.annualNeed, loan.annualCap));
  loan.balance = money(loan.balance + amount);
  loan.totalDisbursed = money(loan.totalDisbursed + amount);
  loan.fundedYears++;
  loan.disbursements.push({age: s.age, amount});
  const financedTuition = money(Math.min(amount, loan.annualTuition));
  loan.tuitionLedger.push({year: s.age, tuition: loan.annualTuition, loanOutstanding: financedTuition, tuitionPaid: 0, compensated: 0});
}
// Mark paid principal against the tuition component first. Living-cost loans
// remain debts and cannot be erased by a tuition-only military benefit.
function allocatePrincipal(loan, amount) {
  let left = amount;
  for (const entry of loan.tuitionLedger) {
    const paid = money(Math.min(left, entry.loanOutstanding));
    entry.loanOutstanding = money(entry.loanOutstanding - paid);
    entry.tuitionPaid = money(entry.tuitionPaid + paid);
    left = money(left - paid);
    if (left <= 0) break;
  }
}

/** Open an account and disburse this school year's actual need, never four
 * years' maximum in advance. annualNeed/annualTuition are explicit parameters;
 * 8000 is a simulation fee assumption, not the policy annual loan cap.
 * deadlineAge can preserve an earlier actual contractual deadline. */
export function openStudentLoan(previous, {
  level = 'undergrad', years = level === 'grad' ? 3 : 4,
  annualNeed = 8000, annualTuition = Math.min(8000, annualNeed),
  graduationAge, lpr, deadlineAge,
} = {}) {
  const s = copy(previous);
  if (!['undergrad', 'college', 'grad'].includes(level)) throw new Error('未知助学贷款学历层次');
  const programYears = positiveYears(years, level === 'grad' ? 3 : 4);
  const startAge = s.age;
  const accountId = `${level}:${startAge}`;
  const existing = s.educationFinance.studentLoans.find(x => x.id === accountId);
  if (existing) {s.educationFinance.studentLoan = existing;return mirror(s);}
  const finish = Number.isFinite(graduationAge) && graduationAge > startAge ? graduationAge : startAge + programYears;
  const hardDeadlineAge = Math.min(startAge + STUDENT_LOAN_RULES.maximumTermYears, Number.isFinite(deadlineAge) ? deadlineAge : Infinity);
  const maturityAge = Math.min(hardDeadlineAge, finish + STUDENT_LOAN_RULES.extraTermYears);
  s.educationFinance.studentLoan = {
    id: accountId, level, startAge, programYears, graduationAge: finish, hardDeadlineAge, maturityAge,
    annualNeed: money(annualNeed), annualTuition: money(annualTuition),
    annualCap: level === 'grad' ? STUDENT_LOAN_RULES.gradAnnualCap : STUDENT_LOAN_RULES.undergradAnnualCap,
    fundedYears: 0, totalDisbursed: 0, balance: 0, interestArrears: 0,
    lpr: Number.isFinite(lpr) ? lpr : null,
    rateStatus: rate(lpr) === null ? 'unverified' : 'explicit-parameter',
    pendingInterest: [], disbursements: [], tuitionLedger: [], studyExtensions: [],
    missedPayments: 0, lastAnnual: null,
  };
  s.educationFinance.studentLoans.push(s.educationFinance.studentLoan);
  s.educationFinance.tuitionOffered = true;
  fund(s);
  return mirror(s);
}

/** Delayed graduation shifts the grace period. Funding still covers only the
 * original number of school years; no lending during a leave/service year.
 * The term may extend with study, bounded by 22 years and an actual deadline. */
export function extendStudentLoanStudy(previous, years, {reason = 'military', additionalFunding = false} = {}) {
  const s = copy(previous), loan = s.educationFinance.studentLoan;
  const extension = positiveYears(years, 0);
  if (!loan || !extension) return mirror(s);
  loan.graduationAge += extension;
  if (additionalFunding) loan.programYears += extension;
  loan.maturityAge = Math.min(loan.hardDeadlineAge, loan.graduationAge + STUDENT_LOAN_RULES.extraTermYears);
  loan.studyExtensions.push({atAge: s.age, years: extension, reason, additionalFunding});
  return mirror(s);
}

/** Run once for a simulated year. Caller supplies whether enrolled status is
 * retained during a suspension and may provide the actual graduation age.
 * A missing LPR records unresolved interest rather than inventing a rate. */
function annualAccount(s, loan, {lpr, inSchool, graduatedAt, suspended = false} = {}) {
  if (loan.lastAnnual?.age === s.age) return;
  if (Number.isFinite(graduatedAt)) {
    loan.graduationAge = graduatedAt;
    loan.maturityAge = Math.min(loan.hardDeadlineAge, graduatedAt + STUDENT_LOAN_RULES.extraTermYears);
  }
  if (lpr !== undefined) loan.lpr = Number.isFinite(lpr) ? lpr : null;
  const annualRate = rate(loan.lpr);
  loan.rateStatus = annualRate === null ? 'unverified' : 'explicit-parameter';
  const studying = inSchool ?? s.age < loan.graduationAge;
  const status = {age: s.age, studying, suspended, interest: 0, principalDue: 0, payment: 0, interestPayment: 0, principalPayment: 0, interestSubsidized: false, unresolvedRate: false};
  if (studying && s.age < loan.maturityAge) {
    if (!suspended) fund(s, loan);
    status.interestSubsidized = true;
    loan.lastAnnual = status;
    return;
  }
  const interest = annualRate === null ? 0 : money(loan.balance * annualRate);
  if (annualRate === null && loan.balance > 0) {
    loan.pendingInterest.push({age: s.age, principal: loan.balance});
    status.unresolvedRate = true;
  }
  status.interest = interest;
  loan.interestArrears = money(loan.interestArrears + interest);
  const graceEnded = s.age >= loan.graduationAge + STUDENT_LOAN_RULES.principalGraceYears;
  const matured = s.age >= loan.maturityAge;
  if (graceEnded || matured) status.principalDue = money(loan.balance / Math.max(1, loan.maturityAge - s.age + 1));
  const available = money(s.assets);
  status.interestPayment = money(Math.min(available, loan.interestArrears));
  loan.interestArrears = money(loan.interestArrears - status.interestPayment);
  status.principalPayment = money(Math.min(available - status.interestPayment, status.principalDue));
  loan.balance = money(loan.balance - status.principalPayment);
  allocatePrincipal(loan, status.principalPayment);
  status.payment = money(status.interestPayment + status.principalPayment);
  s.assets = Math.round(((s.assets ?? 0) - status.payment) * 100) / 100;
  if (loan.interestArrears > 0 || status.principalPayment < status.principalDue) {
    loan.missedPayments++;
    s.credit = Math.max(0, (s.credit ?? 100) - 10);
  }
  loan.lastAnnual = status;
}

export function annualStudentLoan(previous, options = {}) {
  const s = copy(previous), f = s.educationFinance;
  for (const loan of f.studentLoans) {
    const opts = loan === f.studentLoan ? {...options, ...(options.inSchoolAll ? {inSchool:true} : {})} : {lpr: options.lpr, ...(options.inSchoolAll ? {inSchool:true} : {})};
    annualAccount(s, loan, opts);
  }
  return mirror(s);
}

/** Tuition actually paid/financed is the compensation basis. With no explicit
 * list, use the student loan's school-year ledger. tuitionPaidByYear accepts
 * [{year, amount}] or numeric amounts; tuitionPaid with years splits a known
 * actual total across those school years. Repeated claims are idempotent. */
export function compensateMilitaryTuition(previous, {tuitionPaidByYear, tuitionPaid, years = 1} = {}) {
  const s = copy(previous), f = s.educationFinance;
  const eligibleLoans = f.studentLoans.filter(x => x.level !== 'grad');
  const loan = eligibleLoans.includes(f.studentLoan) ? f.studentLoan : eligibleLoans.at(-1);
  if (!loan && f.studentLoans.length) return mirror(s); // No supplied graduate military rule.
  const benefit = f.militaryTuition;
  let provided = tuitionPaidByYear;
  if (!provided && Number.isFinite(tuitionPaid)) {
    const count = positiveYears(years, 1), total = money(tuitionPaid);
    provided = Array.from({length: count}, (_, i) => ({year: (loan?.startAge ?? s.age - count + 1) + i, amount: money(i === count - 1 ? total - money(total / count) * (count - 1) : total / count)}));
  }
  const ledger = loan ? loan.tuitionLedger : benefit.ledger;
  for (const [i, item] of (provided ?? []).entries()) {
    const year = typeof item === 'number' ? (loan?.startAge ?? s.age - provided.length + 1) + i : item.year;
    const paid = money(typeof item === 'number' ? item : item.amount);
    let entry = ledger.find(x => x.year === year);
    if (!entry) {entry = {year, tuition: paid, tuitionPaid: paid, loanOutstanding: 0, compensated: 0};ledger.push(entry);}
    else if (paid > entry.tuitionPaid) {entry.tuition = Math.max(entry.tuition, entry.loanOutstanding + paid);entry.tuitionPaid = paid;}
  }
  let repaid = 0, refunded = 0;
  const ledgers = [...eligibleLoans.map(owner => ({owner, entries: owner.tuitionLedger})), {owner: null, entries: benefit.ledger}];
  const yearClaims = new Map();
  for (const {entries} of ledgers) for (const entry of entries) yearClaims.set(entry.year, money((yearClaims.get(entry.year) ?? 0) + entry.compensated));
  for (const {owner, entries} of ledgers) for (const entry of entries) {
    const eligible = money(Math.min(Math.max(0, entry.tuition - entry.compensated), Math.max(0, STUDENT_LOAN_RULES.militaryAnnualCap - (yearClaims.get(entry.year) ?? 0))));
    const toLoan = money(Math.min(eligible, entry.loanOutstanding, owner?.balance ?? 0));
    if (owner) owner.balance = money(owner.balance - toLoan);
    entry.loanOutstanding = money(entry.loanOutstanding - toLoan);
    const refund = money(Math.min(eligible - toLoan, entry.tuitionPaid));
    entry.compensated = money(entry.compensated + toLoan + refund);
    yearClaims.set(entry.year, money((yearClaims.get(entry.year) ?? 0) + toLoan + refund));
    repaid += toLoan;refunded += refund;
  }
  s.assets = Math.round(((s.assets ?? 0) + refunded) * 100) / 100;
  benefit.totalCompensated = money((benefit.totalCompensated ?? 0) + repaid + refunded);
  benefit.loanRepaid = money((benefit.loanRepaid ?? 0) + repaid);
  benefit.cashRefunded = money((benefit.cashRefunded ?? 0) + refunded);
  benefit.lastClaim = {age: s.age, loanRepaid: money(repaid), cashRefunded: money(refunded)};
  return mirror(s);
}
