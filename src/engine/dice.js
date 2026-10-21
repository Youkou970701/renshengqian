import { logistic, logit } from './params.js';

const LABELS={wealth:'家境',hukou:'城乡',grade:'成绩',tier:'省份',effort:'努力',grind:'努力',retry:'努力',degree:'学历',region:'省份',industry:'行业'};
// Data only: no draws, no state mutations. A threshold cap is represented in logit
// space so neutralizing a factor always reconstructs this gate's actual probability.
export function makeDice({id,label,p,u,contributions={},base,positive=true,successLabel='通过',failureLabel='未通过'}) {
 const terms={...contributions};
 if(base!==undefined)terms.base=base;
 const target=logit(Math.max(Number.EPSILON,Math.min(1-Number.EPSILON,p)));
 const total=Object.values(terms).reduce((a,b)=>a+b,0);
 if(!Object.keys(terms).length)terms.base=target;
 else if(Math.abs(total-target)>1e-10)terms.cap=(terms.cap??0)+target-total;
 // Base, probability caps and future unmapped terms remain in the exact audit
 // payload. Only named player-facing factors participate in the displayed top 3.
 const factors=Object.entries(terms).filter(([key,value])=>Object.hasOwn(LABELS,key)&&value!==0).map(([key,value])=>{
  const delta=p-logistic(target-value);
  return {key,label:LABELS[key],logit:value,delta,pp:delta*100};
 }).sort((a,b)=>Math.abs(b.pp)-Math.abs(a.pp)).slice(0,3);
 const pass=u<p,gap=Math.abs(u-p);
 return {id,label,p,u,pass,contributions:terms,factors,positive,successLabel,failureLabel,nearMiss:positive&&!pass&&u<p+.05,closePass:positive&&pass&&u>p-.05,gap};
}
