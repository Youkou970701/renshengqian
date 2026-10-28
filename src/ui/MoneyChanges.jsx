import React from 'react';
import {moneyChangeRows} from '../engine/money-ledger.js';
const money=n=>`${n>0?'+':n<0?'−':''}${Math.abs(n).toLocaleString('zh-CN',{maximumFractionDigits:2})} 元`;
export default function MoneyChanges({life}){
 const frame=life.moneyYear;if(!frame)return <section className="money-changes"><h3>这一年的钱</h3><p>往后每年的净资产变化，会在这里列出来源。</p></section>;
 const rows=moneyChangeRows(life),transfers=Object.entries(frame.transfers??{}).filter(([,amount])=>amount>0);
 return <section className="money-changes" aria-label="净资产变化来源"><h3>{frame.age} 岁这一年 · 净资产 {money(frame.change)}</h3><dl>{rows.length?rows.map(row=><React.Fragment key={row.kind}><dt>{row.label}</dt><dd>{money(row.amount)}</dd></React.Fragment>):<><dt>这一年净资产没有变化</dt><dd>0 元</dd></>}</dl>{transfers.length>0&&<details><summary>本金的转入与归还</summary>{transfers.map(([label,amount])=><p key={label}>{label} {Math.round(amount).toLocaleString('zh-CN')} 元</p>)}<small>借款和还本金改变现金与欠款，不当作收入或亏损再算一遍。</small></details>}<small>这里只记已经发生的变化；收入里用于日常生活的部分不算积蓄。住房没有重新成交或估值时，不补写房价涨跌。</small></section>;
}
