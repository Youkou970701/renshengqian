// Explicit PRNG state: no mutable global generator. Every draw returns its successor.
export function random(seed) {
  const next = (seed + 0x6D2B79F5) >>> 0;
  let t = next;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return { value: ((t ^ t >>> 14) >>> 0) / 4294967296, seed: next };
}
export const ABBRS = ['粤','豫','鲁','川','苏','桂','贵','浙','湘','皖','鄂','赣','冀','云','闽','陕','新','晋','渝','辽','甘','京','蒙','沪','琼','黑','吉','津','宁','青','藏'];
export function parseId(id) {
  const match = /^(.+)-(\d{4})-(\d{6})$/.exec(id);
  if (!match || !ABBRS.includes(match[1])) throw new Error('出生编号格式应为：豫-2026-483920');
  return { provinceIndex: ABBRS.indexOf(match[1]), year: +match[2], serial: +match[3] };
}
// Full tuple encoded in a safe integer, including leading zero serials and year.
export function idToSeed(id) { const p = parseId(id); return (p.year * 31 + p.provinceIndex) * 1000000 + p.serial; }
export function seedToId(seed) {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed >= 310000000000) throw new Error('无效出生种子');
  const group = Math.floor(seed / 1000000);
  return `${ABBRS[group % 31]}-${String(Math.floor(group / 31)).padStart(4,'0')}-${String(seed % 1000000).padStart(6,'0')}`;
}
export function hashSeed(seed) { let n = Number(seed % 4294967296) >>> 0; n = Math.imul(n ^ n >>> 16, 0x45d9f3b); n = Math.imul(n ^ n >>> 16, 0x45d9f3b); return (n ^ n >>> 16) >>> 0; }
export function weightedIndex(weights, u) { const sum = weights.reduce((a,b)=>a+b,0); let v=u*sum; for(let i=0;i<weights.length;i++){v-=weights[i];if(v<0)return i;}return weights.length-1; }
