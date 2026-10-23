// Income reasons are recorded even in capture:false runs; the visible event and
// the audit row share the same evidence instead of inventing reasons afterwards.
export function incomeEvent(s,emit,kind,text,meta={}){
 if(s.incomeReasonAge!==s.age){s.incomeReasonAge=s.age;s.incomeReasons=[];}
 const event={age:s.age,kind,text,...meta};s.incomeReasons=[...(s.incomeReasons??[]),event];
 emit(text,null,{node:'income',incomeEvent:kind,...meta});return event;
}
