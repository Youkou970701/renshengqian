import data from '../../data/cn-stats.json' with { type: 'json' };
export const DATA = data;
export const PROVINCES = Object.keys(data.births.by_province_2024).filter(k=>!k.startsWith('_'));
export const BIRTH_WEIGHTS = PROVINCES.map(p=>data.births.by_province_2024[p].value);
export const BIRTH_TOTAL = BIRTH_WEIGHTS.reduce((a,b)=>a+b,0);
export function tierFor(province) { return Object.keys(DATA.province_tier).find(k=>DATA.province_tier[k].provinces?.includes(province)); }
export function provinceInfo(province) { const t=DATA.province_tier[tierFor(province)]; return {lifeExpectancy: DATA.health.province_overrides[province] ?? DATA.health.life_expectancy_by_tier[tierFor(province)],bachelorRate:t.bachelor_rate,urbanShare:t.urban_share,birthShare:DATA.births.by_province_2024[province].value/BIRTH_TOTAL}; }
export function statAt(key) { return key.split('.').reduce((o,k)=>o?.[k],DATA); }
