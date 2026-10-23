import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA} from '../src/engine/stats.js';
import {baseRetirementAge,retirementAge,isFlexibleWork,recordContributions,pensionEntitlement,settlePension,pensionComparisonText,PENSION_RULES} from '../src/engine/pension.js';
const worker=(patch={})=>({age:30,sex:'male',job:'企业职员',income:60000,assets:100000,employmentType:'合同',occupation:{id:'clerk',paidMonths:12},...patch});

test('退休年龄按性别和明确岗位类别，弹性选择不改变户口口径',()=>{
 assert.equal(baseRetirementAge(worker()),63);
 assert.equal(baseRetirementAge(worker({sex:'female',edu:'master'})),55);
 assert.equal(baseRetirementAge(worker({sex:'female',job:'公务员',employmentType:'编制'})),58);
 assert.equal(baseRetirementAge(worker({sex:'female',job:'退休',retired:true,pensionRecord:{retirementClass:'cadre'}})),58);
 assert.equal(retirementAge(worker({retirementChoice:'early'})),62);
 assert.equal(retirementAge(worker({retirementChoice:'late'})),66);
});

test('缴费只计实际有薪月份且每年幂等，读书备考失业和退休不补缴',()=>{
 const s=worker({occupation:{id:'clerk',paidMonths:3}});
 recordContributions(s);assert.equal(s.pensionRecord.years,.25);assert.equal(s.pensionRecord.wageTotal,60000);
 recordContributions(s);assert.equal(s.pensionRecord.years,.25);
 for(const patch of [{income:0},{job:'待业'},{job:'研究生在读'},{retired:true},{examGapUntil:30}]){
  const p=worker(patch);recordContributions(p);assert.equal(p.pensionRecord.years,0);
 }
});

test('最低缴费20年，不足者60岁只领居民养老金，与户口无关',()=>{
 for(const hukou of ['rural','urban']){
  const s=worker({age:60,hukou,pensionRecord:{years:19.99,publicYears:19.99},retired:true});
  const p=pensionEntitlement(s);assert.equal(p.category,'resident');assert.equal(p.monthly,DATA.pension.urban_rural_resident_monthly.value);
 }
 assert.equal(pensionEntitlement(worker({age:59,retired:true})).annual,0);
});

test('企业养老金按真实缴费年限和工资平滑，机关事业引用原始数据',()=>{
 const pension=(years,wage)=>pensionEntitlement(worker({age:63,retired:true,pensionRecord:{years,enterpriseYears:years,wageTotal:years*wage,lastCategory:'enterprise'}}));
 const low=pension(20,30000),long=pension(40,30000),high=pension(40,150000);
 assert.ok(low.monthly<long.monthly&&long.monthly<high.monthly);
 assert.ok(low.monthly>=3000&&high.monthly<=4000);
 const p=pensionEntitlement(worker({age:63,retired:true,pensionRecord:{years:30,publicYears:30,wageTotal:3000000,lastCategory:'public'}}));
 assert.equal(p.monthly,DATA.pension.public_institution_monthly.value);
 const mixed=pensionEntitlement(worker({age:63,retired:true,pensionRecord:{years:30,publicYears:15,enterpriseYears:15,wageTotal:3000000,lastCategory:'public'}}));
 assert.ok(mixed.monthly>high.monthly&&mixed.monthly<p.monthly);
});

test('个体户交社保才计年限，现金不足不借债补缴，默认不隐式加入',()=>{
 const skip=worker({job:'个体户'});assert.ok(isFlexibleWork(skip));recordContributions(skip);assert.equal(skip.pensionRecord.years,0);
 const pay=worker({job:'个体户',socialInsuranceChoice:'pay'});recordContributions(pay);assert.equal(pay.pensionRecord.years,1);assert.equal(pay.assets,100000-PENSION_RULES.flexibleAnnualContribution);
 const poor=worker({job:'个体户',socialInsuranceChoice:'pay',assets:10});recordContributions(poor);assert.equal(poor.pensionRecord.years,0);assert.equal(poor.assets,10);
});

test('居民60岁可工作与养老金并领，首领事件含三类金额且不会重复',()=>{
 const s=worker({age:60,job:'务农',income:22000}),logs=[];
 settlePension(s,(text)=>logs.push(text));assert.equal(s.income,22000);assert.equal(s.pensionIncome,DATA.pension.urban_rural_resident_monthly.value*12);
 assert.match(pensionComparisonText(s),/205.*3149—3962.*6100/);
 assert.equal(logs.length,1);assert.equal(s.incomeReasons[0].kind,'pension-start');
 settlePension(s,(text)=>logs.push(text));assert.equal(logs.length,1);
});

test('受雇者缴满社保须退休才领取，不能凭到60岁提前领职工养老金',()=>{
 const s=worker({age:60,pensionRecord:{years:30,enterpriseYears:30,wageTotal:1800000,lastCategory:'enterprise'}});
 assert.equal(pensionEntitlement(s).eligible,false);
 s.retired=true;assert.equal(pensionEntitlement(s).eligible,true);
 const flex=worker({age:63,job:'个体户',pensionRecord:{years:25,enterpriseYears:25,wageTotal:1500000,lastCategory:'enterprise'}});
 assert.equal(pensionEntitlement(flex).eligible,true);assert.equal(flex.retired,undefined);
 settlePension(flex);assert.equal(flex.income,60000);assert.ok(flex.pensionIncome>0);
 const before=flex.assets;recordContributions(flex);assert.equal(flex.pensionRecord.years,25);assert.equal(flex.assets,before);
});

test('领取居民养老金后补足职工缴费年限，转换时有同年收入事件',()=>{
 const s=worker({age:63,job:'个体户',socialInsuranceChoice:'pay',pensionRecord:{years:19,enterpriseYears:19,wageTotal:1140000,lastCategory:'enterprise'}}),logs=[];
 settlePension(s,(text)=>logs.push(text));assert.equal(s.pensionCategory,'resident');
 s.age++;recordContributions(s);settlePension(s,(text)=>logs.push(text));
 assert.equal(s.pensionCategory,'enterprise');assert.equal(s.pensionRecord.years,20);
 assert.ok(s.pensionIncome>3000*12);assert.equal(s.incomeReasons[0].kind,'pension-change');assert.equal(logs.length,2);
});
