// Happiness combines accumulated moods with the person's present situation.
// All values are game parameters. No draws, probability gates, or other
// attributes depend on this calculation.
const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const amount=n=>Number.isFinite(n)?n:0;
export function debtBreakdown(s){
 const money=s.money,finance=s.educationFinance,loan=money?.mortgage;
 const mortgage=Math.max(0,amount(loan?.balance??s.mortgage));
 const studentPrincipal=Math.max(0,amount(finance?.loanBalance)),studentArrears=Math.max(0,amount(finance?.loanInterestArrears));
 const borrowing=(money?.debts??[]).reduce((sum,debt)=>sum+Math.max(0,amount(debt.balance)),0);
 // Investments do not erase a shortfall in cash available for today's bills.
 const cashShortfall=Math.max(0,-amount(s.assets)),income=Math.max(0,amount(s.income));
 // Match the existing legacy mortgage reconstruction without altering a loan.
 const months=Math.max(1,loan?.monthsLeft??(61-s.age)*12),rate=(loan?.rate??.035)/12;
 const monthly=mortgage?Math.max(0,Number.isFinite(loan?.monthly)?loan.monthly:rate?rate*mortgage/(1-Math.pow(1+rate,-months)):mortgage/months):0;
 const ratio=mortgage?(income>0?monthly*12/income:Infinity):0;
 const missedPayment=mortgage>0&&(loan?.monthsLeft<=0||money?.lastAge===s.age&&Number.isFinite(loan?.lastPayment)&&loan.lastPayment+.01<monthly*12);
 const mortgageDefault=mortgage>0&&(income<=0||missedPayment);
 const badDebt=borrowing+cashShortfall+(mortgageDefault?mortgage:0);
 return {mortgage,monthly,mortgageRatio:ratio,mortgageDefault,studentPrincipal,studentArrears,borrowing,cashShortfall,badDebt,total:mortgage+studentPrincipal+studentArrears+borrowing+cashShortfall};
}
export const debtBalance=s=>debtBreakdown(s).total;
export function happinessSituation(s){
 const adult=s.age>=18,retired=!!s.retired||s.job==='退休';
 const studying=s.job==='研究生在读'||s.job==='尚未就业'&&s.age<(s.collegeGraduateAge??22);
 const unemployed=adult&&!retired&&!studying&&(s.job==='待业'||s.job==='尚未就业'||s.industry==='unemployed'||!!s.employmentSearch);
 const working=adult&&!retired&&!studying&&!unemployed;
 const debts=debtBreakdown(s),debt=debts.total;
 return {adult,retired,studying,unemployed,working,debt,indebted:debt>.005,debts};
}
// Restore the underlying mood before existing events and choices apply their
// changes. The prior year's hardship is not subtracted again next year.
export function beginHappiness(s){
 if(s.age<18)return s;
 const h=s.happiness,baseMood=h?.version===1?clamp(h.baseMood+amount(s.attrs.happy-h.value)):clamp(s.attrs.happy);
 return {...s,attrs:{...s.attrs,happy:baseMood},happiness:{version:1,baseMood,value:baseMood,unsettled:true}};
}
export function finishHappiness(s){
 if(s.age<18)return s;
 const h=s.happiness,baseMood=h?.version===1?clamp(h.baseMood+amount(s.attrs.happy-h.value)):clamp(s.attrs.happy);
 const situation=happinessSituation(s),income=Math.max(0,amount(s.income));
 const members=Object.values(s.people?.members??{}).filter(p=>p.active!==false&&p.alive!==false);
 const closeness=members.length?members.reduce((sum,p)=>sum+amount(p.closeness),0)/members.length:60;
 const d=situation.debts,r=d.mortgageRatio;
 const factors={
  // Repeated pleasant events leave room for material circumstances to matter;
  // their base mood is retained separately, so a happy choice still helps.
  mood:70+(baseMood-65)*.35,
  income:clamp(Math.log2((income+12000)/60000)*4,-6,6),
  health:clamp((amount(s.attrs.health)-75)*.22,-16.5,5.5),
  relationships:clamp((closeness-60)*.20,-12,8),
  unemployment:situation.unemployed?-28:0,
  mortgage:!d.mortgage||d.mortgageDefault?0:r<=.30?-r*10:r<=.50?-(5+5*(r-.30)/.20):-(12+6*Math.min(1,(r-.50)/.50)),
  studentLoan:d.studentArrears>0?-8:d.studentPrincipal>0?-(2+3*Math.min(1,d.studentPrincipal/Math.max(12000,income))):0,
  badDebt:d.badDebt>.005?-(20+Math.min(12,d.badDebt/Math.max(12000,income)*8)):0,
 };
 const value=Math.round(clamp(Object.values(factors).reduce((sum,v)=>sum+v,0))*10)/10;
 return {...s,attrs:{...s.attrs,happy:value},happiness:{version:1,baseMood,value,factors}};
}
