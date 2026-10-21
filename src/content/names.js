// u is a seeded draw supplied by the engine; these functions never sample.
const surnames = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','胡','朱','高','林','何','郭','马','罗'];
const young = { male: ['子涵','浩然','宇辰','一诺','明轩','梓睿','承宇','景行','书航','亦辰','嘉言','知远','星野','沐阳','予安','清和'], female: ['一诺','欣怡','诗涵','雨桐','思源','若溪','知夏','清妍','安宁','书瑶','嘉宁','念初','语禾','星澄','可欣','予晴'] };
const older = { male: ['建军','志强','国华','建平','伟','军','明','海峰','志远','建华','国庆','振华','卫东','永明','文斌','德林'], female: ['秀兰','丽华','淑芬','玉梅','红','燕','芳','敏','桂英','春梅','丽娟','晓霞','惠珍','秀英','文静','素琴'] };
const pick = (a, u) => a[Math.min(a.length-1, Math.floor(Math.max(0, u % 1) * a.length))];
export function nameFor(sex, generation, u, surname) {
 const bank = generation === 'parent' || generation === 'older' || (typeof generation === 'number' && generation < 2005) ? older : young;
 return (surname || pick(surnames, u)) + pick(bank[sex === 'female' ? 'female' : 'male'], (u * 37.117) % 1);
}
export { surnames };
