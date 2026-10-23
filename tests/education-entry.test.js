import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {mayMaster,mayCivil,annualCareer} from '../src/engine/career.js';
import {openStudentLoan,annualStudentLoan} from '../src/engine/student-loans.js';

test('专升本成功必须再读两年，贷款增加真实学年且不得提前就业备考',()=>{
 let passed;
 for(let seed=0;seed<100;seed++){
  let s={...drawBirth(seed),age:18,edu:'college',collegeGraduateAge:21};
  s=openStudentLoan(s,{level:'college',years:3,graduationAge:21});
  for(const age of [19,20])s=annualStudentLoan({...s,age});
  s={...s,age:21,pending:{id:'upgrade',options:[{id:'upgrade',label:'继续升学',disabled:false}]}};
  const before=structuredClone(s),after=step(s,{choice:'upgrade'}).state;
  assert.deepEqual(s,before);
  if(after.edu==='bachelor'){passed=after;break;}
 }
 assert.ok(passed,'真实概率抽样必须有成功样本');
 assert.equal(passed.collegeGraduateAge,23);
 assert.equal(passed.educationFinance.studentLoan.programYears,5);
 assert.equal(passed.educationFinance.studentLoan.graduationAge,23);
 const at22={...passed,age:22};assert.equal(mayMaster(at22),false);assert.equal(mayCivil(at22),false);
 const beforeJob=at22.job;annualCareer(at22,()=>0,()=>{});assert.equal(at22.job,beforeJob);
 let financed=annualStudentLoan({...passed,age:21});financed=annualStudentLoan({...financed,age:22});
 assert.equal(financed.educationFinance.loanBalance,40000);
});

test('临床和服役的真实在读边界不能参加研究生或招录考试',()=>{
 const s={...drawBirth(5),age:22,edu:'bachelor',collegeGraduateAge:23};
 assert.equal(mayMaster(s),false);assert.equal(mayCivil(s),false);
 const army={...s,age:24,militaryService:{active:true}};
 assert.equal(mayMaster(army),false);assert.equal(mayCivil(army),false);
});

test('在职研毕业保留既有职业和行业，不额外抽入职随机数',()=>{
 const s={...drawBirth(6),age:30,edu:'bachelor',job:'技术员',industry:'manufacturing',masterStudyMode:'parttime',masterGraduateAge:30};
 let draws=0;annualCareer(s,()=>{draws++;return .9},()=>{});
 assert.equal(s.edu,'master');assert.equal(s.job,'技术员');assert.equal(s.industry,'manufacturing');assert.equal(draws,0);
});
