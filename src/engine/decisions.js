import {peopleAutoChoice} from './people-opportunities.js';
import {autoCareerChoice} from './career.js';
import {random} from './rng.js';
import {P} from './params.js';
import {drawCards} from './cards.js';
import {houseQuote} from './money.js';
export const decisionAt=s=>drawCards(s).pending??null;
export function autoChoose(s){
 const d=s.pending;if(!d)return null;
 if(d.category==='people'||d.id.startsWith('people-'))return peopleAutoChoice(s);
 const u=random(d.core?s.rngState:s.cardRngState??s.rngState).value,options=d.options.filter(o=>!o.disabled),has=id=>options.some(o=>o.id===id);
 if(d.id==='career')return autoCareerChoice(s,u);
 if(d.id==='self-employed-insurance')return has('pay')&&s.assets>=24000?'pay':'skip';
 if(d.id==='flexible-retirement')return 'normal';
 if(d.id==='early-house'){if(has('full')&&s.assets>=houseQuote(s,s.city,'small',{fullCash:true}).price*1.10)return 'full';return has('normal')?'normal':'small';}
 if(d.id==='city'&&has('一线')&&['bachelor','211','985','master'].includes(s.edu)&&u<.18)return '一线';
 if(d.id==='business-start'){if(has('factory')&&(s.skills?.craft??0)>=20&&s.assets>=180000&&u<.12)return 'factory';if(has('training')&&['teacher','training'].includes(s.occupation?.id))return 'training';if(has('shop')&&s.assets>=60000)return 'shop';return has('online')?'online':'decline';}
 if(d.id==='house'){
  if(houseQuote(s).enabled)return 'buy';
  if(has('buy-small')&&houseQuote(s,s.city,'small').enabled)return 'buy-small';
  if(has('buy-county')&&houseQuote(s,'县城','small').enabled)return 'buy-county';
  if(has('buy-home')&&houseQuote(s,'老家','small').enabled)return 'buy-home';
  return 'rent';
 }
 if(d.id==='school-alternatives'){
  if(!s.record.stage)return 'work';
  if(s.wealthQ>=4&&has('private')&&u<.65)return 'private';
  if(s.wealthQ===3&&has('private')&&u<.22)return 'private';
  if(u>.86)return 'repeat-junior';if(u>.80)return 'work';if(u>.74&&has('talent'))return 'talent';if(u>.70&&has('international'))return 'international';return 'vocational';
 }
 const defaults={school:'general',exam:'exam','repeat-exam':'exam',repeat:'college',upgrade:'upgrade',city:s.wealthQ>=4?'省会':s.hukou==='rural'?'县城':'省会',marry:'marry',house:houseQuote(s).enabled?'buy':'rent',child:u<P.family.autoChildProbability?'child':'no',midcareer:'stay'};
 if(has(defaults[d.id]))return defaults[d.id];
 if(d.id==='rural-special-plan'&&has('apply'))return 'apply';
 if(s.wealthQ<=2&&has('loan'))return 'loan';if(has('family')&&s.wealthQ>=3)return 'family';
 // All contextual choices are real inputs; rotate across eligible alternatives,
 // including declining an invitation, rather than always picking the first one.
 return options[Math.min(options.length-1,Math.floor(u*options.length))]?.id??null;
}
