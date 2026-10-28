import {moneyChangeRows} from '../engine/money-ledger.js';

export const wholeMoney=n=>{
 const amount=Math.round(Number.isFinite(n)?n:0);
 return `${amount>0?'+':amount<0?'−':''}${Math.abs(amount).toLocaleString('zh-CN')} 元`;
};

// Keep the settlement precise; distribute the sub-yuan display remainder to
// an existing source so whole-yuan rows still add up to the shown total.
export function moneyDisplayRows(life){
 const rows=moneyChangeRows(life).filter(row=>row.kind!=='rounding').map(row=>({...row,amount:Math.round(row.amount)}));
 if(rows.length){
  const remainder=Math.round(life.moneyYear.change)-rows.reduce((sum,row)=>sum+row.amount,0);
  const largest=rows.reduce((best,row,i)=>Math.abs(row.amount)>Math.abs(rows[best].amount)?i:best,0);
  rows[largest]={...rows[largest],amount:rows[largest].amount+remainder};
 }
 return rows.filter(row=>row.amount!==0);
}
