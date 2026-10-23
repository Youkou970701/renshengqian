import {MONEY_ACTIONS,MONEY_ACTION_BY_ID,MONEY_RULES,BUSINESS_TYPES} from '../content/actions.js';
import {JOB_BY_ID} from '../content/jobs.js';
import {economyDraw,jobEligible,industryYear} from './work.js';
import {P,clamp} from './params.js';
import {makeDice} from './dice.js';
import {incomeEvent} from './income-events.js';
import {isProtectedPost} from './employment.js';
const cash=x=>Math.round(x*100)/100;
export function copyEconomy(s){
 const m={...(s.money??{}),accounts:{...(s.money?.accounts??{})},debts:(s.money?.debts??[]).map(x=>({...x})),relatives:(s.money?.relatives??[]).map(x=>({...x})),parentSpending:{...(s.money?.parentSpending??{})},actionUsage:{...(s.money?.actionUsage??{})},property:s.money?.property?{...s.money.property}:null,mortgage:s.money?.mortgage?{...s.money.mortgage}:null};
 // The deployed save used a scalar balance. Preserve its debt, reconstructing
 // the remaining schedule instead of granting a fresh loan or losing the home.
 if(s.ownsHouse&&!m.property)m.property={city:s.city,size:'normal',value:P.houseCost[s.city],rented:false};
 if(s.ownsHouse&&!m.mortgage&&s.mortgage>0){const months=Math.max(1,(61-s.age)*12),r=MONEY_RULES.mortgageRate/12;m.mortgage={balance:s.mortgage,original:s.mortgage,rate:MONEY_RULES.mortgageRate,monthsLeft:months,monthly:cash(r*s.mortgage/(1-Math.pow(1+r,-months)))};}
 return {...s,occupation:s.occupation?{...s.occupation}:null,business:s.business?{...s.business}:null,money:m};
}
export function houseQuote(s,city=s.city,size='normal',{fullCash=false}={}){
 const price=Math.round(P.houseCost[city]*(size==='small'?.60:1)),down=fullCash?price:price*MONEY_RULES.downPayment,principal=price-down;
 const r=MONEY_RULES.mortgageRate/12,n=MONEY_RULES.mortgageYears*12,monthly=principal?r*principal/(1-Math.pow(1+r,-n)):0;
 const enabled=s.age>=18&&!s.ownsHouse&&(s.assets??0)>=down&&((s.credit??100)>=60||!principal)&&(!principal||monthly*12<=Math.max(0,s.income)*.45);
 return {city,size,price,down,principal,monthly:cash(monthly),enabled,reason:enabled?'':s.ownsHouse?'目前已有住房':s.assets<down?'首付积蓄不足':(s.credit??100)<60?'信用暂不符合贷款条件':'月供超过当前收入的承受范围'};
}
export function buyHouse(s,emit,city=s.city,size='normal',options={}){
 const q=houseQuote(s,city,size,options);if(!q.enabled)return false;
 s.money={...s.money,property:{city,size,value:q.price,rented:false},mortgage:q.principal?{balance:q.principal,rate:MONEY_RULES.mortgageRate,monthly:q.monthly,monthsLeft:360,original:q.principal}:null};
 s.assets=cash(s.assets-q.down);s.ownsHouse=true;s.mortgage=q.principal;
 s.record={...s.record,housePurchases:[...(s.record.housePurchases??[]),{age:s.age,city,size,price:q.price,down:q.down,principal:q.principal,fullCash:q.principal===0}]};
 emit(`你在${city}买下${size==='small'?'一套小房':'一套住房'}，支付${Math.round(q.down)}元${q.principal?'首付':'房款'}。${q.principal?`本局贷款年息3.5%，每月约还${Math.round(q.monthly)}元。`:''}`,null,{node:'house',price:q.price,down:q.down,monthly:q.monthly});return true;
}
export function businessStartPatch(s,type){
 const b=BUSINESS_TYPES[type],j=JOB_BY_ID[b.jobId];
 return {business:{type,name:b.name,jobId:b.jobId,active:true,capital:MONEY_ACTION_BY_ID[`business:${type}`].cost,scale:1,employees:0,startedAt:s.age},businessHistory:[...(s.businessHistory??[]),{type,startedAt:s.age}],record:{...s.record,businessStarted:true},job:j.legacy,industry:'business',employmentType:'非编制',publicEmployer:false,occupation:null,employmentSearch:null,income:0};
}
export const flexibleAmount=id=>['parents','relative','bride-gift','dowry','deposit','fund','stock','wealth','mortgage-prepay','debt-repay','online-loan','business-loan'].includes(id)||id.startsWith('withdraw-');
function amountFor(a,input){if(!flexibleAmount(a.id)&&input.amount!=null&&input.amount!==a.cost)throw new Error('该行动价格固定');const amount=input.amount??a.cost;if(!Number.isFinite(amount)||amount<0||amount>10000000)throw new Error('金额无效');return cash(amount);}
function eligibility(s,a,input={}){
 if(s.age<a.minAge||!s.alive)return '尚未到适用年龄';
 const m=s.money??{},amount=amountFor(a,input);
 if(a.city)return houseQuote(s,a.city,a.size,{fullCash:!!input.fullCash}).reason;
 if(m.actionUsage?.[a.id]===s.age)return '今年已经安排过';
 if(a.id.startsWith('business:')){if(s.business?.active)return '已有正在经营的生意';if(a.id==='business:training'&&(s.skills?.craft??0)<6)return '需要先积累教学或技术经验';}
 if(['business-hire','business-expand','business-loan','business-transfer'].includes(a.id)&&!s.business?.active)return '还没有正在经营的生意';
 if(a.id==='business-loan'&&((s.credit??100)<70||m.debts?.some(d=>d.kind==='business'&&d.balance>0)))return '当前经营借款条件不符';
 if(a.id==='online-loan'&&((s.credit??100)<50||m.debts?.some(d=>d.kind==='online'&&d.balance>0)))return '请先处理已有借款或信用问题';
 if(a.id==='mortgage-prepay'&&!m.mortgage?.balance)return '没有待还房贷';
 if(a.id==='debt-repay'&&!m.debts?.some(d=>d.balance>0))return '没有待还借款';
 if(['house-sell','house-rent'].includes(a.id)&&!s.ownsHouse)return '还没有住房';
 if(a.id.startsWith('withdraw-')&&!(m.accounts?.[a.id.slice(9)]>0))return '该账户没有余额';
 if(s.age<18){const spent=m.parentSpending?.[s.age]??0;if(spent+amount>MONEY_RULES.parentBudget[s.wealthQ-1])return '家里今年可承担的教育费用不足';}
 else if(!['online-loan','business-loan'].includes(a.id)&&!a.id.startsWith('withdraw-')&&amount>0&&amount>(s.assets??0))return '可用现金不足';
 return '';
}
export function moneyOptions(s){return MONEY_ACTIONS.map(a=>{const reason=eligibility(s,a);const q=a.city?houseQuote(s,a.city,a.size):null;return {...a,enabled:!reason,reason,cost:q?q.down:a.cost,hint:q?`房价${q.price}元，首付${q.down}元，月供约${Math.round(q.monthly)}元`:a.id==='online-loan'?'本局合同年息18%，借款需还本付息':a.id==='business-loan'?'本局合同年息8%，需要信用和持续经营':a.id==='business-hire'?'入职开支3000元；之后每年2.4万元工资，扩大接单能力':a.id==='wealth'?'可能损失本金':`${a.cost}元`};});}
export function financialReason(s,input){const a=MONEY_ACTION_BY_ID[input.action];return a?eligibility(s,a,input):'未知行动';}
export function financialAction(previous,input){
 let s=copyEconomy(previous);s.attrs={...s.attrs};s.skills={...s.skills};s.record={...s.record};s.educationFinance={...s.educationFinance};
 const emit=(text,stat,meta={})=>{if(s.capture!==false)s.log=[...s.log,{age:s.age,text,stat:stat??null,...meta}];};
 if(input.action==='apply-job'){
  const j=JOB_BY_ID[input.jobId];if(!j||s.age<18||s.retired||s.job==='研究生在读'||s.militaryService?.active||!jobEligible(s,j))throw new Error('当前不符合该岗位入口');
  if(s.age<(s.collegeGraduateAge??0)||s.business?.active)throw new Error('请先完成学业或处理当前经营');
  if(s.employmentSearch)throw new Error('已有求职计划');
  if(isProtectedPost(s))incomeEvent(s,emit,'voluntary-resignation','你主动离开原来的在编岗位，开始寻找新的工作。');
  const months=3+Math.floor(economyDraw(s)*16);s.employmentSearch={jobId:j.id,monthsLeft:months,startedAt:s.age};s.job='待业';s.industry='unemployed';s.employmentType='待业';s.publicEmployer=false;s.income=0;
  emit(`你开始寻找${j.name}的岗位，安排了${months}个月的求职准备和等待。期间没有工资收入。`,null,{node:'jobSearch',jobId:j.id,months});
 }else{
  const a=MONEY_ACTION_BY_ID[input.action];if(!a)throw new Error('未知花钱行动');const reason=eligibility(s,a,input);if(reason)throw new Error(reason);
  const amount=amountFor(a,input),m=s.money;m.actionUsage[a.id]=s.age;
  if(a.city){if(!buyHouse(s,emit,a.city,a.size,{fullCash:!!input.fullCash}))throw new Error('当前无法购房');}
  else if(a.id.startsWith('withdraw-')){const key=a.id.slice(9),withdraw=input.amount??m.accounts[key];if(withdraw<0||withdraw>m.accounts[key])throw new Error('赎回金额超过余额');s.assets=cash(s.assets+withdraw);m.accounts[key]=cash(m.accounts[key]-withdraw);emit(`你取回${Math.round(withdraw)}元${a.label.slice(2)}，按当前余额结算。`,null,{node:'money'});}
  else if(['online-loan','business-loan'].includes(a.id)){
   const borrowing=input.amount??(a.id==='business-loan'?50000:10000);if(borrowing<1000||borrowing>50000)throw new Error('本次可借1000到50000元');
   m.debts.push({id:`${a.id}:${s.age}`,kind:a.id==='business-loan'?'business':'online',balance:borrowing,rate:a.id==='business-loan'?.08:MONEY_RULES.onlineRate,yearsLeft:3});s.assets+=borrowing;emit(`你借到${borrowing}元，本局合同年息${a.id==='business-loan'?8:18}%，期限三年。借款不是收入，需要按期偿还。`,null,{node:'debt'});
  }else if(a.id==='house-sell'){
   const price=Math.round(m.property.value*(.85+economyDraw(s)*.3)),balance=m.mortgage?.balance??0;s.assets=cash(s.assets+price-balance);s.ownsHouse=false;s.mortgage=0;m.property=null;m.mortgage=null;emit(`住房以${price}元成交，先结清${Math.round(balance)}元房贷，再结算剩余房款。`,null,{node:'house'});
  }else if(a.id==='house-rent'){m.property.rented=!m.property.rented;emit(m.property.rented?'你把住房租出去，租金会并入后续年度账目。':'你收回出租的住房，下一年不再记租金。',null,{node:'house'});
  }else if(a.id==='business-transfer'){
   const proceeds=Math.round(s.business.capital*(.5+economyDraw(s)*.7));s.assets+=proceeds;s.business={...s.business,active:false,transferredAt:s.age};s.job='待业';s.industry='unemployed';s.occupation=null;emit(`你转让了${s.business.name}，收到${proceeds}元。接下来要重新安排工作。`,null,{node:'business'});
  }else{
   if(s.age<18){m.parentSpending[s.age]=(m.parentSpending[s.age]??0)+amount;s.educationFinance.familySpent=(s.educationFinance.familySpent??0)+amount;}else s.assets=cash(s.assets-amount);
   if(a.skill)s.skills[a.skill]=(s.skills[a.skill]??0)+a.gain;
   if(['tutoring','school-choice'].includes(a.id)){s.gradePct=clamp(s.gradePct+1);s.attrs.knowledge=clamp(s.attrs.knowledge+3);}
   if(a.id==='interest')s.interest=s.interest??'美术';
   if(a.health)s.attrs.health=clamp(s.attrs.health+a.health);if(a.happy)s.attrs.happy=clamp(s.attrs.happy+a.happy);
   if(['deposit','fund','stock','wealth'].includes(a.id))m.accounts[a.id]=(m.accounts[a.id]??0)+amount;
   else if(a.id==='mortgage-prepay'){const payment=Math.min(amount,m.mortgage.balance);m.mortgage.balance=cash(m.mortgage.balance-payment);s.assets=cash(s.assets+amount-payment);s.mortgage=m.mortgage.balance;}
   else if(a.id==='debt-repay'){let left=amount;for(const debt of m.debts){const pay=Math.min(left,debt.balance);debt.balance-=pay;left-=pay;}s.assets+=left;}
   else if(a.id==='car')m.car={value:amount,purchasedAt:s.age};
   else if(a.id==='parents')s.record.parentTransfers=(s.record.parentTransfers??0)+amount;
   else if(a.id==='relative')m.relatives.push({amount,dueAge:s.age+3,settled:false});
   else if(a.id==='bride-gift'||a.id==='dowry')s.record[a.id==='dowry'?'dowryPaid':'brideGiftPaid']=(s.record[a.id==='dowry'?'dowryPaid':'brideGiftPaid']??0)+amount;
   else if(a.id==='lottery'){const u=economyDraw(s),p=.00001,win=u<p;if(win)s.assets+=200000;emit(win?'这一年的小额彩票中了一笔奖金，你先把钱存进账户。':'这一年的彩票没有中奖，花掉的钱已经记入开支。',null,{node:'lottery',dice:[makeDice({id:'lottery',label:'本次中奖机会',p,u,successLabel:'中奖',failureLabel:'未中奖'})]});}
   else if(a.id.startsWith('business:')){const type=a.id.split(':')[1];Object.assign(s,businessStartPatch(s,type));s.business.capital=amount;}
   else if(a.id==='business-hire')s.business={...s.business,employees:s.business.employees+1,scale:s.business.scale+.8};
   else if(a.id==='business-expand')s.business={...s.business,capital:s.business.capital+amount,scale:s.business.scale+.35};
   if(a.id!=='lottery')emit(`你安排了「${a.label}」，${s.age<18?'家里':'自己'}支出${Math.round(amount)}元。`,null,{node:'money',actionId:a.id});
  }
 }
 s.inputHistory=[...(s.inputHistory??[]),{age:s.age,...input}];return s;
}
export function annualBusiness(s,emit){
 if(!s.business?.active||s.business.lastAge===s.age)return;
 if(s.retired){s.assets+=Math.round(s.business.capital*.5);s.business={...s.business,active:false,transferredAt:s.age};incomeEvent(s,emit,'business-retirement','退休后你转让了生意，收回部分投入，收入改按养老金结算。');return;}
 const b={...s.business,lastAge:s.age},u=economyDraw(s),outcome=u<.20?'good':u<.70?'flat':u<.93?'hard':'closed';
 const base=b.type==='factory'?100000:b.type==='training'?70000:b.type==='online'?50000:55000;
 const profit=Math.round(base*b.scale*(outcome==='good'?1.7:outcome==='flat'?.65:outcome==='hard'?-.3:0)-b.employees*24000);
 b.lastOutcome=outcome;b.profit=profit;
 if(outcome==='closed'){const recovered=Math.round(b.capital*.2);s.assets+=recovered;b.active=false;b.closedAt=s.age;s.record={...s.record,businessClosed:true};s.businessHistory=(s.businessHistory??[]).map(x=>x.startedAt===b.startedAt?{...x,closedAt:s.age}:x);s.income=0;s.job='待业';s.industry='unemployed';s.occupation=null;incomeEvent(s,emit,'business-closure',`${b.name}关门了，设备和存货收回${recovered}元，原来投入的大部分资金没有回来。`,{node:'business',outcome});}
 else{s.income=Math.max(0,profit);if(profit<0)s.assets+=profit;incomeEvent(s,emit,'business-year',`${b.name}这一年${outcome==='good'?'生意顺利':outcome==='flat'?'收支平常':'难熬'}，扣除经营开支后${profit>=0?'结余':'亏损'}${Math.abs(profit)}元。`,{node:'business',outcome,profit,dice:[makeDice({id:'business-year',label:'本次生意顺利机会',p:.20,u,successLabel:'顺利',failureLabel:'未遇顺利年'})]});}
 s.business=b;
}
export function annualMoney(s,emit){
 const m=s.money;if(!m||m.lastAge===s.age)return;m.lastAge=s.age;m.investmentIncome=0;
 for(const [key,balance] of Object.entries(m.accounts)){
  if(balance<=0)continue;const u=economyDraw(s),change=key==='deposit'?MONEY_RULES.depositRate:key==='fund'?-.25+u*.60:key==='stock'?-.55+u*1.20:u<.04?-.80:.025+u*.05;
  const next=Math.max(0,Math.round(balance*(1+change)));m.accounts[key]=next;m.investmentIncome+=next-balance;
  if(key==='wealth'&&change<-.5)emit('这笔理财发生了本金损失，账户按实际剩余金额记录。',null,{node:'investment'});
 }
 if(m.property?.rented){const rent=Math.round(m.property.value*.025);s.assets+=rent;m.investmentIncome+=rent;}
 if(m.car){m.car={...m.car,value:Math.round(m.car.value*.85)};s.assets-=3000;}
 if(m.mortgage?.balance>0){
  const loan={...m.mortgage};let paid=0,interest=0;
  for(let i=0;i<12&&loan.balance>0&&loan.monthsLeft>0;i++){
   const dueInterest=loan.balance*loan.rate/12,payment=loan.monthsLeft===1?loan.balance+dueInterest:Math.min(loan.balance+dueInterest,loan.monthly),available=Math.max(0,s.assets-paid);loan.monthsLeft--;
   if(available<payment){s.credit=Math.max(0,(s.credit??100)-5);loan.balance+=dueInterest;continue;}
   interest+=dueInterest;loan.balance=Math.max(0,loan.balance-(payment-dueInterest));paid+=payment;
  }
  if(loan.monthsLeft<=0&&loan.balance>0){const final=Math.min(Math.max(0,s.assets-paid),loan.balance);loan.balance-=final;paid+=final;if(loan.balance>.01){s.credit=Math.max(0,(s.credit??100)-10);emit('房贷合同已经到期，仍有欠款需要处理。',null,{node:'debt'});}}
  s.assets=cash(s.assets-paid);loan.balance=cash(loan.balance);loan.lastPayment=cash(paid);loan.lastInterest=cash(interest);m.mortgage=loan;s.mortgage=loan.balance;
 }
 for(const debt of m.debts){if(debt.balance<=0)continue;const interest=debt.balance*debt.rate,principal=debt.balance/Math.max(1,debt.yearsLeft),due=interest+principal,paid=Math.min(Math.max(0,s.assets),due);s.assets=cash(s.assets-paid);debt.balance=cash(Math.max(0,debt.balance+interest-paid));debt.yearsLeft=Math.max(0,debt.yearsLeft-1);if(paid<due){s.credit=Math.max(0,(s.credit??100)-10);emit('今年的借款没有足额偿还，欠款和信用变化记入了账目。',null,{node:'debt'});}}
 for(const loan of m.relatives){if(!loan.settled&&s.age>=loan.dueAge){loan.settled=true;if(economyDraw(s)<.65){s.assets+=loan.amount;emit('亲戚把此前借的钱还了回来。',null,{node:'relative'});}else emit('约定的还款时间过了，这笔借给亲戚的钱暂时没有收回来。',null,{node:'relative'});}}
}
export function netAssets(s){const m=s.money;return Math.round((s.assets??0)+Object.values(m?.accounts??{}).reduce((a,v)=>a+v,0)+(m?.property?.value??(s.ownsHouse?P.houseCost[s.city]:0))+(m?.car?.value??0)+(s.business?.active?s.business.capital:0)-(m?.mortgage?.balance??s.mortgage??0)-(s.educationFinance?.loanBalance??0)-(s.educationFinance?.loanInterestArrears??0)-(m?.debts??[]).reduce((a,d)=>a+d.balance,0));}
