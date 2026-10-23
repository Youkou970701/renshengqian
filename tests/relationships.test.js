import test from 'node:test';
import assert from 'node:assert/strict';
import {drawBirth} from '../src/engine/birth.js';
import {partnerCandidate,brideGiftQuote,marryPartner,annualRelationships,marriageSettlement,relationshipAction,relationshipPatch} from '../src/engine/relationships.js';
import {RELATIONSHIP_CARDS} from '../src/content/cards/relationships.js';
const person=(patch={})=>({...drawBirth(42),age:30,sex:'male',assets:50000,income:80000,job:'企业职员',city:'县城',...patch});
const partner=(patch={})=>({...partnerCandidate(person()),sex:'female',age:29,income:60000,assets:100000,...patch});
const marry=(patch={})=>{const s=person(patch);marryPartner(s,partner());return s;};

test('候选对象完整资料在抉择前可见，生成纯确定且不消耗任何引擎随机流',()=>{
 const s=person(),before=JSON.stringify(s),p=partnerCandidate(s);
 for(const key of ['name','age','province','education','job','income','assets','ownsHouse','ownsCar','personality','family','brideGift','dowry'])assert.ok(Object.hasOwn(p,key),key);
 assert.ok(Object.hasOwn(p.family,'fatherJob')&&Object.hasOwn(p.family,'motherJob')&&Object.hasOwn(p.family,'siblings'));
 assert.deepEqual(partnerCandidate(s),p);assert.equal(JSON.stringify(s),before);
 const introduction=RELATIONSHIP_CARDS.find(c=>c.id==='relationship-matchmaking');assert.deepEqual(introduction.profile(s),p);assert.match(introduction.body(s),new RegExp(p.name));
});

test('彩礼按省份城乡组合形成数值，未核省级数据始终标参数且不作地域评价',()=>{
 assert.equal(brideGiftQuote('河南','rural').status,'参数');assert.equal(brideGiftQuote('河南','urban').status,'参数');
 assert.ok(brideGiftQuote('河南','rural').value>brideGiftQuote('河南','urban').value);
 assert.notEqual(brideGiftQuote('河南','rural').value,brideGiftQuote('江苏','rural').value);
});

test('高资产对象婚前一千万元不转给玩家，婚后一年分到的不超过共同财产一半',()=>{
 const s=person({assets:10000});marryPartner(s,partner({assets:10000000}));
 assert.equal(s.assets,10000);assert.equal(s.relationship.marriage.partnerPremarital,10000000);
 s.age++;s.assets+=20000;annualRelationships(s);
 const settlement=marriageSettlement(s);assert.equal(settlement.joint,33200);assert.equal(settlement.playerShare,16600);
 relationshipAction(s,'request-divorce');relationshipAction(s,'wait-30-days');relationshipAction(s,'register-divorce');
 assert.equal(s.assets,10000+settlement.joint/2);assert.ok(s.assets-10000<=settlement.joint/2);assert.equal(s.married,false);
 assert.equal(s.relationshipHistory.at(-1).settlement.partnerPremarital,10000000);
});

test('共同收益只结算真实年度一次，不把同年重复调用或配偶婚前存款算进去',()=>{
 const s=marry();annualRelationships(s);assert.equal(s.relationship.marriage.partnerCommon,0);
 s.age++;s.assets+=10000;annualRelationships(s);const once=marriageSettlement(s);
 annualRelationships(s);assert.deepEqual(marriageSettlement(s),once);
 assert.equal(once.playerCommon,10000);assert.equal(once.partnerCommon,13200);
});

test('协议离婚30日内可反悔，等待不增加年龄、工资、经营年限',()=>{
 const s=marry(),income=s.income,age=s.age;
 relationshipAction(s,'request-divorce');assert.throws(()=>relationshipAction(s,'register-divorce'),/冷静期/);
 relationshipAction(s,'withdraw');assert.equal(s.married,true);assert.equal(s.relationship.divorce,null);
 relationshipAction(s,'request-divorce');relationshipAction(s,'wait-30-days');
 assert.equal(s.age,age);assert.equal(s.income,income);assert.equal(s.relationshipDayOffset,30);
 relationshipAction(s,'register-divorce');assert.equal(s.married,false);
});

test('冷静期结束后30日登记窗口过期视为撤回，不自动离婚',()=>{
 const s=marry(),logs=[];relationshipAction(s,'request-divorce');
 for(let n=0;n<3;n++)relationshipAction(s,'wait-30-days',text=>logs.push(text));
 assert.equal(s.married,true);assert.equal(s.relationship.divorce,null);assert.ok(logs.some(t=>t.includes('视为撤回')));
 assert.throws(()=>relationshipAction(s,'register-divorce'),/有效/);
});

test('对方不同意协议离婚仍可起诉，第一次并非一律不准',()=>{
 const s=marry();s.relationship.partnerConsents=false;relationshipAction(s,'request-divorce');assert.equal(s.relationship.divorce,null);
 relationshipAction(s,'sue');assert.equal(s.married,true);assert.ok(s.relationship.deniedAt>=0);
 const t=marry();t.relationship.legalBreakdown=true;relationshipAction(t,'sue');assert.equal(t.married,false);
});

test('单纯分居一年不能套用再次起诉规则，判决不准后又分居一年才应准',()=>{
 const s=marry();relationshipAction(s,'separate');s.age++;relationshipAction(s,'sue');assert.equal(s.married,true);
 s.age++;relationshipAction(s,'sue');assert.equal(s.married,false);
 const t=marry();relationshipAction(t,'sue');relationshipAction(t,'separate');t.age++;relationshipAction(t,'sue');assert.equal(t.married,false);
 const u=marry();relationshipAction(u,'sue');u.age++;relationshipAction(u,'sue');assert.equal(u.married,true);
 const v=marry();relationshipAction(v,'sue');relationshipAction(v,'separate');v.relationshipDayOffset=300;relationshipAction(v,'sue');assert.equal(v.married,true);v.relationshipDayOffset=365;relationshipAction(v,'sue');assert.equal(v.married,false);
});

test('多次交往和分手独立留痕，70多岁仍可登记再婚',()=>{
 const s=person();relationshipAction(s,'date');const first=s.datingPartner.id;relationshipAction(s,'breakup');relationshipAction(s,'date');assert.notEqual(s.datingPartner.id,first);
 relationshipAction(s,'marry');s.relationship.legalBreakdown=true;relationshipAction(s,'sue');
 s.age=74;relationshipAction(s,'date');relationshipAction(s,'marry');assert.equal(s.married,true);assert.equal(s.record.marriages,2);
 // 再婚卡每年按 35% 出现（2026-10-22 Claude 改，避免被抽卡竞争稀释）：70 多岁的人在几年里总会遇到。
 const lateCard=RELATIONSHIP_CARDS.find(c=>c.id==='relationship-late-marriage');assert.ok([74,75,76,77,78,79,80].some(age=>lateCard.when(person({age,datingPartner:partner({age:72})}))));
});

test('危机卡六项完整，玩家可以维持婚姻而不被强制离婚',()=>{
 const card=RELATIONSHIP_CARDS.find(c=>c.id==='relationship-marriage-crisis');assert.deepEqual(card.options.map(o=>o.id),['tolerate','cold','consult','separate','request-divorce','sue']);
 const s=marry();for(const action of ['tolerate','cold','consult','separate'])relationshipAction(s,action);assert.equal(s.married,true);
});

test('卡片patch不修改前态，关系事件可由主引擎原样写入日志',()=>{
 const s=marry(),before=JSON.stringify(s),patch=relationshipPatch(s,['request-divorce','wait-30-days','register-divorce']);
 assert.equal(JSON.stringify(s),before);assert.equal(patch.married,false);assert.equal(patch.relationshipEvents.length,3);assert.equal(patch.relationshipDayOffset,30);
});
