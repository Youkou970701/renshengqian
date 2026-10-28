import React from 'react';
import reference from '../content/income-reference-v3.json' with {type:'json'};
import {incomeAgeGroup,incomePercentile} from './income-rank.js';
export {incomeAgeGroup,incomePercentile} from './income-rank.js';
export default function IncomeRank({life}){
 if(life.age<18)return null;
 const age=incomeAgeGroup(life.age),group=reference.groups?.[age],province=group?.provinces?.[life.province],national=group?.national;
 const p=incomePercentile(life.income??0,province),n=incomePercentile(life.income??0,national);
 return <section className="income-rank" aria-label="收入模拟排名"><h3>收入在同年龄段的位置</h3><p>省内{p===null?'样本不足':`约第 ${p} 百分位`} · 全国{n===null?'样本不足':`约第 ${n} 百分位`}</p><small>本作模拟的 {age==='65+'?'65 岁以上':`${age.replace('-','–')} 岁`} 年收入参照；数字越高，收入越靠前，不是真实人口统计；省内按出生省份 {life.province} 归组，不是现居地。{province&&`省内 ${province.nLives.toLocaleString('zh-CN')} 人、${province.observations.toLocaleString('zh-CN')} 次年度观察；`}{national&&`全国 ${national.nLives.toLocaleString('zh-CN')} 人、${national.observations.toLocaleString('zh-CN')} 次年度观察。`}同一个人可贡献多个年度；少于 30 人时不显示百分位。</small></section>;
}
