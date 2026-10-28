export const incomeAgeGroup=age=>age<25?'18-24':age<35?'25-34':age<45?'35-44':age<55?'45-54':age<65?'55-64':'65+';
export function incomePercentile(income,sample){
 if(!sample||!(sample.nLives>=30)||!Array.isArray(sample.quantiles)||sample.quantiles.length<2)return null;
 const xs=sample.quantiles;let lo=0,hi=xs.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(xs[mid]<=income)lo=mid+1;else hi=mid;}
 // Published quantile grid has ties; report the midpoint of equal quantiles
 // so a zero-income tie does not automatically rank above every zero earner.
 let first=lo;while(first>0&&xs[first-1]===income)first--;
 return Math.round(Math.max(0,Math.min(100,(first+(lo-first)/2)/(xs.length-1)*100)));
}
