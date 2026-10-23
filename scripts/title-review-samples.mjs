import {randomBytes} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {drawBirth} from '../src/engine/birth.js';
import {simulate} from '../src/engine/life.js';
import {biography} from '../src/engine/biography.js';
import {TITLES} from '../src/content/titles.js';
import {endCard,colorCard} from '../src/ui/share-cards.js';
const args=process.argv.slice(2),flag=args.indexOf('--output-dir'),out=flag>=0?args[flag+1]:'tests/artifacts-09/M4-retest';
mkdirSync(out,{recursive:true});
const seedPath=join(out,'sample-seeds.json');
// Choose once, before looking at endings. Rerunning prose/layout verification
// reuses every draw, including an ordinary, unhappy or short life.
const seeds=existsSync(seedPath)?JSON.parse(readFileSync(seedPath)):Array.from({length:10},()=>randomBytes(4).readUInt32LE());
if(seeds.length!==10||!seeds.every(x=>Number.isInteger(x)&&x>=0&&x<=0xffffffff))throw Error('随机样本种子结构无效');
writeFileSync(seedPath,JSON.stringify(seeds,null,2)+'\n');
const samples=seeds.map((seed,index)=>{
 const life=simulate(drawBirth(seed),{capture:true}),bio=biography(life);
 writeFileSync(join(out,`sample-${index+1}-end.svg`),endCard(life));
 writeFileSync(join(out,`sample-${index+1}-color.svg`),colorCard(life));
 return {index:index+1,seed,id:life.id,name:life.name,age:life.age,province:life.province,place:life.place,titleId:bio.title.id,title:bio.title.name,shareTitle:bio.title.shareName,biography:bio.sentence,shareBiography:bio.shareSentence,titleValues:bio.title.values,titleEvidence:bio.title.evidence,timeline:bio.timeline};
});
writeFileSync(join(out,'title-samples.json'),JSON.stringify({selection:'10个独立crypto随机种子，无条件抽取，不看结局筛选；种子落盘后不换样本',seeds,samples},null,2)+'\n');
writeFileSync(join(out,'title-library.json'),JSON.stringify(TITLES.map(t=>({id:t.id,template:t.template,displayName:t.displayName??t.name,shareTemplate:t.shareTemplate,variables:t.variables,description:t.description,priority:t.priority,rarityRank:t.rarityRank})),null,2)+'\n');
console.log(samples.map(s=>`${s.index}. ${s.id}\n${s.title}\n${s.biography}`).join('\n\n'));
