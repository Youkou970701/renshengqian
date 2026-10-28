export const SAVE_KEY='toutai-sim:v2';
export const SCHEMA_VERSION=4;
// Repeated income-observation keys dominate older lives. A lossless column
// dictionary keeps every value and absent field, without truncating history.
function packLog(rows){
 if(!Array.isArray(rows)||rows.length<30)return rows;
 const keys=[...new Set(rows.flatMap(row=>Object.keys(row)))],index=new Map(keys.map((key,i)=>[key,i]));
 return {encoding:'entries-v1',keys,rows:rows.map(row=>Object.entries(row).filter(([,value])=>value!==undefined).flatMap(([key,value])=>[index.get(key),value]))};
}
function unpackLog(data){
 if(!data||data.encoding!=='entries-v1')return data;
 if(!Array.isArray(data.keys)||!Array.isArray(data.rows)||data.keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)))throw Error('Invalid log dictionary');
 return data.rows.map(row=>{
  if(!Array.isArray(row)||row.length%2)throw Error('Invalid log row');
  const entries=[];for(let i=0;i<row.length;i+=2){const key=data.keys[row[i]];if(!Number.isInteger(row[i])||typeof key!=='string')throw Error('Invalid log field');entries.push([key,row[i+1]]);}
  return Object.fromEntries(entries);
 });
}
// Income explanations also appear verbatim in the life log. Share repeated
// long strings across those two histories; never remove an event or a value.
const sharedFields=['log','incomeHistory','incomeSceneMemory','lastIncomeObservation'];
function shareStrings(life){
 const counts=new Map();
 const visit=value=>{if(typeof value==='string'&&value.length>=20)counts.set(value,(counts.get(value)??0)+1);else if(value&&typeof value==='object')Object.values(value).forEach(visit);};
 for(const field of sharedFields)visit(life[field]);
 const strings=[...counts].filter(([,count])=>count>1).map(([value])=>value);
 if(!strings.length)return life;
 const indexes=new Map(strings.map((value,i)=>[value,i]));
 const encode=value=>typeof value==='string'&&indexes.has(value)?{$s:indexes.get(value)}:Array.isArray(value)?value.map(encode):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,encode(v)])):value;
 return {...life,...Object.fromEntries(sharedFields.filter(field=>field in life).map(field=>[field,encode(life[field])])),_saveStrings:strings};
}
function restoreStrings(life){
 if(!life?._saveStrings)return life;
 const strings=life._saveStrings;if(!Array.isArray(strings)||strings.some(value=>typeof value!=='string'))throw Error('Invalid shared strings');
 const decode=value=>{
  if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===1&&Object.hasOwn(value,'$s')){
   if(!Number.isInteger(value.$s)||typeof strings[value.$s]!=='string')throw Error('Invalid shared string');return strings[value.$s];
  }
  return Array.isArray(value)?value.map(decode):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,decode(v)])):value;
 };
 const {_saveStrings,...rest}=life;
 return {...rest,...Object.fromEntries(sharedFields.filter(field=>field in rest).map(field=>[field,decode(rest[field])]))};
}
function packLife(life) {
 if(life&&Array.isArray(life.log))life={...life,log:packLog(life.log)};
 if(!Array.isArray(life?.incomeHistory)||life.incomeHistory.length<10)return life;
 const keys=[...new Set(life.incomeHistory.flatMap(row=>Object.keys(row)))];
 const indices=new Map(keys.map((key,i)=>[key,i]));
 return shareStrings({...life,incomeHistory:{encoding:'columns-v1',keys,rows:life.incomeHistory.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[indices.get(key),value])))}});
}
function unpackLife(life) {
 life=restoreStrings(life);
 if(life?.log?.encoding==='entries-v1')life={...life,log:unpackLog(life.log)};
 const h=life?.incomeHistory;
 if(!h||h.encoding!=='columns-v1')return life;
 if(!Array.isArray(h.keys)||!Array.isArray(h.rows)||h.keys.some(k=>typeof k!=='string'||['__proto__','constructor','prototype'].includes(k)))throw Error('Invalid income history');
 return {...life,incomeHistory:h.rows.map(row=>Object.fromEntries(Object.entries(row).map(([index,value])=>{
  if(!/^\d+$/.test(index)||!h.keys[Number(index)])throw Error('Invalid income column');
  return [h.keys[Number(index)],value];
 })))};
}
export function hydrateSave(saved) {
 if(!saved||![3,SCHEMA_VERSION].includes(saved.schemaVersion))return saved;
 return {...saved,life:unpackLife(saved.life),birthOrigin:unpackLife(saved.birthOrigin),familyRows:Array.isArray(saved.familyRows)?saved.familyRows.map(unpackLife):saved.familyRows};
}
export function serializeSave(state) {
 const {saveRevision,actionError,...saved}=state;
 return JSON.stringify({...saved,schemaVersion:SCHEMA_VERSION,life:packLife(state.life),birthOrigin:packLife(state.birthOrigin),familyRows:state.familyRows?.map(packLife),peers:(state.peers??[]).map(({id,age,alive})=>({id,age:age+(alive===false?1:0)}))});
}
