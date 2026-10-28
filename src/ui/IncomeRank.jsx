import React from 'react';
import reference from '../content/income-reference-v3.json' with {type:'json'};
import {incomeAgeGroup,incomePercentile} from './income-rank.js';
export {incomeAgeGroup,incomePercentile} from './income-rank.js';
export default function IncomeRank({life}){
 if(life.age<18)return null;
 const age=incomeAgeGroup(life.age),group=reference.groups?.[age],province=group?.provinces?.[life.province],national=group?.national;
 const p=incomePercentile(life.income??0,province),n=incomePercentile(life.income??0,national);
 return <section className="income-rank" aria-label="收入模拟排名"><h3>收入在同龄人中排在哪里</h3><p>{n===null?'全国的收入比较暂时还不够可靠':`你的收入比全国约 ${n}% 的同龄人高`}<br/>{p===null?`${life.province}的收入比较暂时还不够可靠`:`在${life.province}同龄人中排在前 ${Math.max(1,100-p)}%`}</p><small>按本作模拟中 {age==='65+'?'65 岁以上':`${age.replace('-','–')} 岁`} 的年收入比较；省内按出生省份，不代表现居地或真实人口统计。比较方法见统计出处。</small></section>;
}
