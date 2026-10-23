import {resolveCareer,isPublic,mayMaster,mayCivil} from './career.js';
export function beginPreparation(s,kind){s.preparation=['master','civil','institution'].includes(kind)?{kind,startedAt:s.age,lastExamAge:s.age}:null;if(s.record.masterAdmitted||isPublic(s))s.preparation=null;}
export function annualPreparation(s,draw,emit){
 const p=s.preparation;if(!p||p.lastExamAge>=s.age||s.age<22)return;
 if((p.kind==='master'&&!mayMaster(s))||(p.kind!=='master'&&!mayCivil(s))){s.preparation=null;return;}
 draw();resolveCareer(s,p.kind,draw,emit);s.preparation=s.record.masterAdmitted||isPublic(s)?null:{...p,lastExamAge:s.age};
}
export function preparationAction(previous,action){
 if(action!=='leave-preparation')throw new Error('未知行动');
 return {...previous,preparation:null,inputHistory:[...(previous.inputHistory??[]),{age:previous.age,action}],log:previous.capture===false?previous.log:[...previous.log,{age:previous.age,text:'你收起备考计划，先把时间留给工作和生活。',node:'preparation',stat:null}]};
}
