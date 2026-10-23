// Display-only prose cleanup. Audit facts and authored branch matching keys
// remain untouched. Ages, money amounts and durations keep their numerals.
const smallNumbers=['零','一','两','三','四','五','六','七','八','九','十'];
export function polishNarrative(text){
 return String(text??'')
  .replace(/办完继承手续，收到长辈留下的/g,'继承长辈留下的')
  .replace(/办完手续[，,、]?继承/g,'继承')
  .replace(/办完手续/g,'完成安排')
  .replace(/登记结婚/g,'结婚')
  .replace(/考了([0-9一二两三四五六七八九十百]+)次公务岗位/g,'考公$1次')
  .replace(/进入公务岗位/g,'考上公务员')
  .replace(/公务岗位/g,'公务员')
  .replace(/退休[，,、]?结束在岗工作/g,'退休')
  .replace(/结束在岗工作/g,'退休')
  .replace(/编辑写作者/g,'编辑')
  .replace(/(?<![\d.])(10|[1-9])(?=次|个|名)/g,(_,n,offset,source)=>Number(n)===2&&source[offset-1]==='第'?'二':smallNumbers[Number(n)])
  .replace(/开过一次店又关了一次门/g,'开过一次店又关了');
}
