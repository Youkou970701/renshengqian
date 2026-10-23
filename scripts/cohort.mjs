import { drawBirth } from '../src/engine/birth.js';
import { simulate } from '../src/engine/life.js';
import { isBachelor } from '../src/engine/education.js';
import { DATA, PROVINCES, BIRTH_WEIGHTS, BIRTH_TOTAL } from '../src/engine/stats.js';
export function schoolObservation(b,s){
 const r=s.record,poor=b.hukou==='rural'&&b.wealthQ<=2;
 return {sampleSize:1,highSchoolKnown:Number(['county','city'].includes(s.highSchoolLocation)),countyHighSchool:Number(s.highSchoolLocation==='county'),gaokao:Number(!!r.gaokao),specialEligible:Number(!!r.specialEligible),specialAdmitted:Number(!!r.specialAdmitted),specialPoorAdmitted:Number(poor&&!!r.gaokao&&!!r.specialAdmitted),specialExams:Number(poor&&!!r.gaokao)};
}
export function recordSchoolObservation(table,key,b,s){const observation=schoolObservation(b,s),row=table[key]??={};for(const [k,v] of Object.entries(observation))row[k]=(row[k]??0)+v;}
export function cohort(n=100000,offset=0){
 const c={n,competitionAdmitted:0,specialAdmitted:0,specialPoorAdmitted:0,specialExams:0,specialEligible:0,schoolStrata:{},schoolByWealth:{},publicGeneral:0,privateGeneral:0,births:{},rural:0,under5:0,survive16:0,junior16:0,junior:0,general:0,stage:0,poor:0,poorComplete:0,exams:0,admit:0,elite:0,eliteRural:0,bachelor:0,lifespan:0,sex:{male:{n:0,age:0},female:{n:0,age:0}},provinceAge:{},edu:{},tiers:{},matrix:{},career:{},causes:{},income:[],strata:{},master:0,tizhi35:0,publicPaths:{},at40:0,ruralAt40:0,gig40:0,farming40:0,jobs40:{}};
 for(let i=0;i<n;i++){
  const b=drawBirth((Math.imul(i+offset,2654435761)+123456789)>>>0);const s=simulate(b);const r=s.record;c.competitionAdmitted+=!!r.competitionAdmitted;c.specialAdmitted+=!!r.specialAdmitted;c.specialPoorAdmitted+=Number(b.hukou==='rural'&&b.wealthQ<=2&&!!r.gaokao&&!!r.specialAdmitted);c.specialExams+=b.hukou==='rural'&&b.wealthQ<=2&&r.gaokao;c.specialEligible+=!!r.specialEligible;c.publicGeneral+=!!r.publicGeneralEver;c.privateGeneral+=!!r.privateGeneral;
  recordSchoolObservation(c.schoolStrata,`${b.tier}:${b.hukou}:Q${b.wealthQ}`,b,s);recordSchoolObservation(c.schoolByWealth,`${b.hukou}:Q${b.wealthQ}`,b,s);
  c.births[b.province]=(c.births[b.province]??0)+1;c.rural+=b.hukou==='rural';c.under5+=s.age<5;c.survive16+=s.age>=16;c.junior16+=s.age>=16&&r.junior;c.junior+=r.junior;c.general+=r.general;c.stage+=r.stage;
  const poor=b.hukou==='rural'&&b.wealthQ===1;c.poor+=poor;c.poorComplete+=poor&&r.completed;c.exams+=r.gaokao;c.admit+=r.admitted;c.elite+=r.elite;c.eliteRural+=r.elite&&b.hukou==='rural';c.bachelor+=isBachelor(s);c.master+=s.edu==='master';c.tizhi35+=!!r.tizhiBy35;if(r.tizhiBy35)c.publicPaths[r.publicPath??'legacy']=(c.publicPaths[r.publicPath??'legacy']??0)+1;if(r.job40){c.at40++;c.ruralAt40+=s.hukou==='rural';c.gig40+=['外卖骑手','网约车司机'].includes(r.job40);c.farming40+=s.hukou==='rural'&&r.job40==='务农';c.jobs40[r.job40]=(c.jobs40[r.job40]??0)+1;}c.lifespan+=s.age;
  c.sex[s.sex].n++;c.sex[s.sex].age+=s.age;
  const pa=c.provinceAge[s.province]??={n:0,age:0,bachelor:0,income:[]};pa.n++;pa.age+=s.age;pa.bachelor+=isBachelor(s);pa.income.push(s.peakIncome??0);
  c.edu[s.edu]=(c.edu[s.edu]??0)+1;const t=c.tiers[s.tier]??={n:0,exams:0,admit:0,bachelor:0};t.n++;t.exams+=r.gaokao;t.admit+=r.admitted;t.bachelor+=isBachelor(s);
  const m=c.matrix[`${s.hukou}:Q${s.wealthQ}`]??={n:0,bachelor:0};m.n++;m.bachelor+=isBachelor(s);const stratum=c.strata[`${s.tier}:${s.hukou}:Q${s.wealthQ}`]??={n:0,n18:0,bachelor:0,bachelor18:0};stratum.n++;stratum.n18+=s.age>=18;stratum.bachelor+=isBachelor(s);stratum.bachelor18+=s.age>=18&&isBachelor(s);
  if(r.age22)c.career[r.age22]=(c.career[r.age22]??0)+1;c.causes[s.death.category]=(c.causes[s.death.category]??0)+1;
  c.income.push(s.peakIncome??0);
 }
 return c;
}
export function effortCohort(n=6000){let study=0,never=0,poorStudy=0,richAuto=0,poorN=0,richN=0;
 for(let i=0;i<n;i++){
  const b=drawBirth((Math.imul(i,2246822519)+987654321)>>>0);
  study+=isBachelor(simulate(b,{focus:'study',until:23}));never+=isBachelor(simulate(b,{focus:'hobby',until:23}));
  if(b.hukou==='rural'&&b.wealthQ===1){poorN++;poorStudy+=isBachelor(simulate(b,{focus:'study',until:23}));}
  if(b.hukou==='urban'&&b.wealthQ===5){richN++;richAuto+=isBachelor(simulate(b,{until:23}));}
 }
 return {n,study:study/n,never:never/n,difference:(study-never)/n,poorN,poorStudy:poorStudy/poorN,richN,richAuto:richAuto/richN};
}
export function checks(c,e){const rows=[];const row=(name,value,min,max,unit='%')=>rows.push({name,value,min,max,unit,pass:value>=min&&value<=max});
 const maxProvinceDeviation=Math.max(...PROVINCES.map((p,i)=>Math.abs((c.births[p]??0)/c.n-BIRTH_WEIGHTS[i]/BIRTH_TOTAL)))*100;
 row('各省出生权重最大偏差',maxProvinceDeviation,0,.5,'pp');row('农村出生占比',c.rural/c.n*100,37,43);row('5岁前死亡',c.under5/c.n*100,.4,.8);row('活到16岁者初中毕业',c.junior16/c.survive16*100,94.5,97.5);row('初中毕业升普高',c.general/c.junior*100,58,64);row('初中毕业进入高中阶段',c.stage/c.junior*100,89,95);row('农村Q1完成高中阶段',c.poorComplete/c.poor*100,30,45);row('高考者本科录取',c.admit/c.exams*100,37,45);row('S/C档高考本科率比',(c.tiers.S.admit/c.tiers.S.exams)/(c.tiers.C.admit/c.tiers.C.exams),1.7,Infinity,'倍');row('高考者985',c.elite/c.exams*100,1.2,2.2);row('985新生农村占比',c.eliteRural/c.elite*100,10,25);row('出生队列最终本科及以上',c.bachelor/c.n*100,28,40);row('全队列平均寿命',c.lifespan/c.n,77.5,80.5,'岁');row('女性减男性平均寿命',c.sex.female.age/c.sex.female.n-c.sex.male.age/c.sex.male.n,4,7,'岁');row('上海减西藏平均寿命',c.provinceAge['上海'].age/c.provinceAge['上海'].n-c.provinceAge['西藏'].age/c.provinceAge['西藏'].n,6,Infinity,'岁');row('同出身全学习增益',e.difference*100,5,20,'pp');row('城市Q5自动减农村Q1全学习',(e.richAuto-e.poorStudy)*100,.0000001,Infinity,'pp');
 const v=DATA.calibration_targets_v2;const m=(h,q)=>c.matrix[`${h}:Q${q}`].bachelor/c.matrix[`${h}:Q${q}`].n;
 row('城市Q5出生队列本科率',m('urban',5)*100,v.urban_q5_bachelor.min*100,v.urban_q5_bachelor.max*100);
 row('农村Q1出生队列本科率',m('rural',1)*100,v.rural_q1_bachelor.min*100,v.rural_q1_bachelor.max*100);
 const gradient=['urban','rural'].every(h=>[1,2,3,4].every(q=>m(h,q)<m(h,q+1))&&m(h,5)-m(h,3)>=.10);row('城乡家境严格递增且Q5减Q3至少10pp',Number(gradient),1,1,'');
 row('同家境Q3城市减农村',100*(m('urban',3)-m('rural',3)),5,Infinity,'pp');
 row('出生队列硕士及以上',100*c.master/c.n,v.master_of_cohort.min*100,v.master_of_cohort.max*100);
 row('35岁前进入体制内',100*c.tizhi35/c.n,v.tizhi_by_35.min*100,v.tizhi_by_35.max*100);
 row('40岁外卖骑手及网约车占比',100*c.gig40/c.at40,0,v.gig_at_40.max*100);
 row('40岁农村出身务农占比',100*c.farming40/c.ruralAt40,v.farming_at_40_rural_origin.min*100,v.farming_at_40_rural_origin.max*100);
 return rows;}
export const formatValue=r=>`${r.value.toFixed(3)}${r.unit}`;
export const formatTarget=r=>`${Number(r.min.toFixed(4))}–${r.max===Infinity?'∞':Number(r.max.toFixed(4))}${r.unit}`;
// 09a product targets, additional to (and never replacing) the original 25.
export function educationChecks(c){
 return [
  {name:'竞赛录取占出生队列',value:100*c.competitionAdmitted/c.n,min:.1,max:.3,unit:'%'},
  {name:'专项录取占农村Q1-Q2高考人群',value:100*c.specialPoorAdmitted/c.specialExams,min:3,max:8,unit:'%'},
 ].map(r=>({...r,pass:Number.isFinite(r.value)&&r.value>=r.min&&r.value<=r.max}));
}
