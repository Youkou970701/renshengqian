export const SAVE_KEY='toutai-sim:v2';
export const SCHEMA_VERSION=3;
// Repeated income-observation keys dominate older lives. A lossless column
// dictionary keeps every value and absent field, without truncating history.
function packLife(life) {
 if(!Array.isArray(life?.incomeHistory)||life.incomeHistory.length<10)return life;
 const keys=[...new Set(life.incomeHistory.flatMap(row=>Object.keys(row)))];
 const indices=new Map(keys.map((key,i)=>[key,i]));
 return {...life,incomeHistory:{encoding:'columns-v1',keys,rows:life.incomeHistory.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[indices.get(key),value])))}};
}
function unpackLife(life) {
 const h=life?.incomeHistory;
 if(!h||h.encoding!=='columns-v1')return life;
 if(!Array.isArray(h.keys)||!Array.isArray(h.rows)||h.keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)))throw Error('Invalid income history');
 return {...life,incomeHistory:h.rows.map(row=>Object.fromEntries(Object.entries(row).map(([index,value])=>{
  if(!/^\d+$/.test(index)||!h.keys[Number(index)])throw Error('Invalid income column');
  return [h.keys[Number(index)],value];
 })))};
}
export function hydrateSave(saved) {
 if(!saved||saved.schemaVersion!==SCHEMA_VERSION)return saved;
 return {...saved,life:unpackLife(saved.life),birthOrigin:unpackLife(saved.birthOrigin),familyRows:Array.isArray(saved.familyRows)?saved.familyRows.map(unpackLife):saved.familyRows};
}
export function serializeSave(state) {
 const {saveRevision,actionError,...saved}=state;
 return JSON.stringify({...saved,schemaVersion:SCHEMA_VERSION,life:packLife(state.life),birthOrigin:packLife(state.birthOrigin),familyRows:state.familyRows?.map(packLife),peers:(state.peers??[]).map(({id,age,alive})=>({id,age:age+(alive===false?1:0)}))});
}
