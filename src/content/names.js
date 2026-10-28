// u is a seeded draw supplied by the engine; these functions never sample.
const surnames = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','胡','朱','高','林','何','郭','马','罗'];
const young = { male: ['子涵','浩然','宇辰','一诺','明轩','梓睿','承宇','景行','书航','亦辰','嘉言','知远','星野','沐阳','予安','清和'], female: ['一诺','欣怡','诗涵','雨桐','思源','若溪','知夏','清妍','安宁','书瑶','嘉宁','念初','语禾','星澄','可欣','予晴'] };
const older = { male: ['建军','志强','国华','建平','伟','军','明','海峰','志远','建华','国庆','振华','卫东','永明','文斌','德林'], female: ['秀兰','丽华','淑芬','玉梅','红','燕','芳','敏','桂英','春梅','丽娟','晓霞','惠珍','秀英','文静','素琴'] };
const pick = (a, u) => a[Math.min(a.length-1, Math.floor(Math.max(0, u % 1) * a.length))];
export function nameFor(sex, generation, u, surname) {
 const bank = generation === 'parent' || generation === 'older' || (typeof generation === 'number' && generation < 2005) ? older : young;
 return (surname || pick(surnames, u)) + pick(bank[sex === 'female' ? 'female' : 'male'], (u * 37.117) % 1);
}
// The caller supplies a deterministic draw; retries never consume an engine
// random stream. Reserve given names across surnames and across generations.
export const givenName=name=>typeof name==='string'?name.slice(1):'';
export function uniqueNameFor(sex,generation,u,surname,used=[]){
 const occupied=new Set([...used].map(givenName).filter(Boolean));
 const first=nameFor(sex,generation,u,surname),family=surname??first[0];
 if(!occupied.has(givenName(first)))return first;
 const bank=generation==='parent'||generation==='older'||typeof generation==='number'&&generation<2005?older:young;
 const names=bank[sex==='female'?'female':'male'],start=names.indexOf(givenName(first));
 for(let offset=1;offset<=names.length;offset++){
  const candidate=names[(Math.max(0,start)+offset)%names.length];
  if(!occupied.has(candidate))return family+candidate;
 }
 // Long-lived blended families can exhaust one small editorial name bank.
 const extras=['知秋','云舟','望舒','映川','初霁','庭安','怀瑾','云岚','景澄','时雨','星河','念远','明澈','安禾','清圆','云初'];
 for(const candidate of extras)if(!occupied.has(candidate))return family+candidate;
 for(const a of '予安知清云星景怀明映初念庭时若'){
  for(const b of '禾宁川澄远舟秋雨舒霁瑾圆然夏和'){
   if(!occupied.has(a+b))return family+a+b;
  }
 }
 throw Error('Given-name bank exhausted');
}
export function namesInLife(s){
 return [s.name,...Object.values(s.parents??{}).map(p=>p.name),s.partner?.name,...(s.exPartners??[]).map(p=>p.name),...Object.values(s.people?.members??{}).flatMap(p=>[p.name,...(p.previousNames??[])])].filter(Boolean);
}
export { surnames };
