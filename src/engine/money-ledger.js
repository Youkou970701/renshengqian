import {netAssets} from './money.js';
const cents=n=>Math.round(n*100)/100;
export const MONEY_FLOW_LABELS={
 wages:'工资留下的积蓄',pension:'养老金留下的积蓄',business:'经营留下的结余',businessLoss:'经营亏损',businessExit:'结束经营的损益',
 mortgageInterest:'房贷利息',debtInterest:'其他借款利息',investment:'存款和投资涨跌',rent:'收到的房租',property:'住房成交损益',
 rounding:'金额取整',car:'车辆折旧与养车',children:'养育孩子的开支',family:'给家里与收到家里的钱',relative:'亲友借款往来',
 unexpected:'意外收支',contributions:'自己交的养老保险',education:'学习与助学贷款',health:'看病与照护',living:'日常安排与其他消费',other:'其他实际收支',
};
// One current-year frame only; this is an explanation of actual changes, not a
// second financial model or another lifetime history.
export function beginMoneyYear(s){
 if(s.moneyYear?.age===s.age)return s;
 s.moneyYear={age:s.age,start:netAssets(s),end:netAssets(s),change:0,flows:{},transfers:{}};
 return s;
}
export function recordMoneyFlow(s,kind,amount){
 if(!Number.isFinite(amount)||amount===0)return s;
 beginMoneyYear(s);
 const frame=s.moneyYear;
 s.moneyYear={...frame,flows:{...frame.flows,[kind]:cents((frame.flows[kind]??0)+amount)}};
 return s;
}
export function recordMoneyTransfer(s,kind,amount){
 if(!Number.isFinite(amount)||amount===0)return s;
 beginMoneyYear(s);const frame=s.moneyYear;
 s.moneyYear={...frame,transfers:{...frame.transfers,[kind]:cents((frame.transfers[kind]??0)+amount)}};
 return s;
}
export function finishMoneyYear(s){
 beginMoneyYear(s);const f=s.moneyYear,end=netAssets(s),change=end-f.start;
 const flows={...f.flows};delete flows.other;delete flows.rounding;
 const explained=Object.values(flows).reduce((a,b)=>a+b,0),other=cents(change-explained);
 if(other)flows[Math.abs(other)<1.01?'rounding':'other']=other;
 s.moneyYear={...f,end,change,delta:change,flows,sources:Object.entries(flows).filter(([,amount])=>amount!==0).map(([kind,amount])=>({kind,label:MONEY_FLOW_LABELS[kind]??MONEY_FLOW_LABELS.other,amount}))};return s;
}
export function moneyChangeRows(s){
 const f=s.moneyYear;if(!f)return [];
 return Object.entries(f.flows).filter(([,amount])=>Math.abs(amount)>=.005).map(([kind,amount])=>({kind,label:MONEY_FLOW_LABELS[kind]??MONEY_FLOW_LABELS.other,amount}));
}
