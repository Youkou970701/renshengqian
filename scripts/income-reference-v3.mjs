// Derived model reference. Source data/ is never modified.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {drawBirth} from '../src/engine/birth.js';
import {step} from '../src/engine/life.js';
import {autoChoose} from '../src/engine/decisions.js';
export const incomeAgeGroup=age=>age<18?null:age<25?'18-24':age<35?'25-34':age<45?'35-44':age<55?'45-54':age<65?'55-64':'65+';
const empty=()=>({nLives:0,values:[]});
const quantiles=values=>{values.sort((a,b)=>a-b);return Array.from({length:201},(_,i)=>values.length?values[Math.round((values.length-1)*i/200)]:0);};
const finish=row=>({observations:row.values.length,nLives:row.nLives,quantiles:quantiles(row.values)});
export function incomeReference({n=20000}={}){
 if(!Number.isInteger(n)||n<1000)throw Error('Income reference requires at least 1000 lives');
 const groups=Object.fromEntries(['18-24','25-34','35-44','45-54','55-64','65+'].map(key=>[key,{national:empty(),provinces:{}}]));
 for(let i=0;i<n;i++){
  let s={...drawBirth((Math.imul(i,2654435761)+123456789)>>>0),capture:false},guard=0,lastAge=-1;
  const seen=new Set();
  while(s.alive){
   if(++guard>600)throw Error('Income reference life did not terminate');
   if(!s.pending&&s.age!==lastAge){
    lastAge=s.age;const group=incomeAgeGroup(s.age);
    if(group){const row=groups[group],province=row.provinces[s.province]??=empty();row.national.values.push(s.income);province.values.push(s.income);
     if(!seen.has(group)){row.national.nLives++;province.nLives++;seen.add(group);}
    }
   }
   s=step(s,s.pending?{choice:autoChoose(s)}:{}).state;
  }
  if(i&&i%5000===0)console.log('Income reference',i,'/',n);
 }
 return {version:1,n,policy:'固定种子出生队列，存活成年人每岁完成当年选择后的年收入（含0及养老金），按年龄段、出生省份统计；百分位为本作模拟参照，不是真实人群统计。每半个百分点保存一个分位金额，同一人生可有多次年度观测。',groups:Object.fromEntries(Object.entries(groups).map(([key,row])=>[key,{national:finish(row.national),provinces:Object.fromEntries(Object.entries(row.provinces).map(([province,p])=>[province,finish(p)]))}]))};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),get=(name,defaultValue)=>{const i=args.indexOf(name);return i<0?defaultValue:args[i+1];};
 const data=incomeReference({n:Number(get('--n',20000))}),path=resolve(get('--output','src/content/income-reference-v3.json'));
 mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,JSON.stringify(data)+'\n');console.log('Income reference complete',data.n,path);
}
