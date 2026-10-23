import {baseRetirementAge,isFlexibleWork,PENSION_RULES,pensionComparisonText} from '../../engine/pension.js';
import {isProtectedPost} from '../../engine/employment.js';
export const PENSION_CARDS=[
 {id:'self-employed-insurance',stage:'adult',priority:75,when:s=>s.age>=23&&s.age<60&&isFlexibleWork(s)&&!s.socialInsuranceChoice,weight:()=>1,cooldown:100,maxPerLife:1,title:'自己的养老保险，要不要继续交？',body:s=>`自己经营或灵活接活，需要自行安排职工养老缴费。本局每年自缴${PENSION_RULES.flexibleAnnualContribution}元，现金不足的年份不记为已缴。${pensionComparisonText(s)}`,options:[
  {id:'pay',label:'自己缴职工养老保险',hint:'往后按年度支出，有实际缴费才累计年限',requires:s=>s.assets>=PENSION_RULES.flexibleAnnualContribution,effects:()=>({socialInsuranceChoice:'pay'})},
  {id:'skip',label:'暂不参加职工养老保险',hint:'未达到职工缴费年限时，60岁后按城乡居民标准领取',effects:()=>({socialInsuranceChoice:'skip'})},
 ]},
 {id:'flexible-retirement',stage:'senior',priority:85,when:s=>!s.retired&&!isFlexibleWork(s)&&s.age===baseRetirementAge(s)-1&&!s.retirementChoice,weight:()=>1,cooldown:100,maxPerLife:1,title:'快到退休年龄，你想怎样安排？',body:s=>`本局正常退休年龄为${baseRetirementAge(s)}岁。可以按条件提前一年，或与单位商量延后三年。${pensionComparisonText(s)}`,options:[
  {id:'early',label:'提前一年办理退休',hint:'已缴满20年才能选择；不回溯已经度过的年份',requires:s=>(s.pensionRecord?.years??0)>=PENSION_RULES.minYears,effects:s=>({retirementChoice:'early',retired:true,retiredAt:s.age,lastJob:s.job,job:'退休',retirementClass:isProtectedPost(s)?'cadre':s.pensionRecord?.retirementClass??'worker'})},
  {id:'normal',label:'到正常年龄退休',hint:'按本局岗位对应的退休年龄办理',effects:()=>({retirementChoice:'normal'})},
  {id:'late',label:'与单位商定延后三年',hint:'这段时间继续工作和累计实际缴费',effects:()=>({retirementChoice:'late'})},
 ]},
];
