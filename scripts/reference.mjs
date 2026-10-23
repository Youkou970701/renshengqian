// Derived model reference only. Inputs must be an actually simulated cohort.
export function referenceFromCohort(c){
 const sample=(xs,stride)=>[...xs].sort((a,b)=>a-b).filter((_,i)=>i%stride===0);
 return {n:c.n,provinces:Object.fromEntries(Object.entries(c.provinceAge).map(([p,v])=>[p,{n:v.n,bachelorPer100:Math.round(v.bachelor/v.n*100),income:sample(v.income,10)}])),income:sample(c.income,Math.max(1,Math.floor(c.n/1000)))};
}
