export const dicePercent=value=>`${(value*100).toFixed(1).replace(/\.0$/,'')}%`;
export function diceFactorsText(die){return die.factors.map(f=>`${f.label} ${f.pp>0?'+':'−'}${Math.abs(f.pp).toFixed(1)}%`).join(' · ');}
export function diceMarginText(die){return die.nearMiss?`只差 ${dicePercent(die.gap)}`:die.closePass?'险过':'';}
export function closestMoment(log){
 const moments=log.flatMap(e=>(e.dice??[]).filter(d=>d.nearMiss).map(d=>({age:e.age,...d})));
 return moments.sort((a,b)=>a.gap-b.gap)[0]??null;
}
