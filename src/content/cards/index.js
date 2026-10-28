import {PEOPLE_CARDS} from './people.js';
import {SCENARIO_CARDS} from '../../engine/scenarios.js';
import {RELATIONSHIP_CARDS} from './relationships.js';
import {LATE_FAMILY_CARDS} from './late-family.js';
import {PENSION_CARDS} from './pension.js';
import {CORE_CARDS} from './core.js';
import {EXTRA_CARDS} from './education.js';
import {WORK_CARDS} from './work.js';
import {STUDENT_FINANCE_CARDS} from './student-finance.js';
import {CARD_VARIANTS} from './variants.js';
import {MORE_VARIANTS} from './variants-more.js';
import {VARIANT_LABELS} from './variant-labels.js';
export const CARDS=[...CORE_CARDS,...EXTRA_CARDS,...STUDENT_FINANCE_CARDS,...WORK_CARDS,...PENSION_CARDS,...SCENARIO_CARDS,...RELATIONSHIP_CARDS,...LATE_FAMILY_CARDS,...PEOPLE_CARDS];
// 处境变体挂到对应卡上（只换文字，不改选项编号和后果）。
const ALL_VARIANTS={...CARD_VARIANTS,...MORE_VARIANTS};
for(const c of CARDS)if(ALL_VARIANTS[c.id])c.variants=ALL_VARIANTS[c.id].map(v=>({...v,labels:{...(VARIANT_LABELS[c.id]?.[v.key]??{}),...(v.labels??{})}}));
// 富豪线（出生中约 0.2%）原来要和大量卡按权重竞争，富家孩子一张都遇不到：改成到了年龄窗口就出现。
for(const c of CARDS)if(c.id.startsWith('rich-')&&!c.priority)c.priority=35;
export const CARD_BY_ID=Object.fromEntries(CARDS.map(c=>[c.id,c]));
