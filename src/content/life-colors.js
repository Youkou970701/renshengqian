// Signed choice evidence: negative means the left word, positive the right.
// Missing, tied or unmapped histories stay explicit; a seed never adds color.
export const COLOR_AXES=[
 {id:'pace',left:'安稳',right:'折腾'}, {id:'care',left:'顾家',right:'顾己'},
 {id:'place',left:'留下',right:'离开'}, {id:'will',left:'认命',right:'不认命'},
];
const names=['守灯的人','静水有岸','故园听雨','微光长明','把风留住','舟停月下','晴窗自守','山前种树','带家远行','星河有信','行囊有根','追光越岭','旷野慢行','自由潮汐','山海独行','破晓赶路'];
const hues=['#586c62','#648a75','#7d8471','#8e986c','#61827c','#68868f','#8e8a78','#9b8b61','#a07d72','#ad8c70','#8e839c','#a37a91','#718a99','#698fa4','#8283ae','#a88c64'];
export const LIFE_COLORS=names.map((name,i)=>({id:`color-${i.toString(2).padStart(4,'0')}`,name,hex:hues[i],signature:i.toString(2).padStart(4,'0'),description:COLOR_AXES.map((a,j)=>i&(1<<(3-j))?a.right:a.left).join(' · ')}));
export const CHOICE_COLOR_SCORES={
 'repeat':{repeat:[1,0,0,1],college:[-1,0,0,-1]},
 'upgrade':{upgrade:[1,0,0,1],work:[-1,0,0,-1]},
 'school-alternatives':{'repeat-junior':[1,0,0,1],work:[-1,0,1,-1]},
 'business-start':{shop:[1,0,0,1],online:[1,0,0,1],factory:[1,0,0,1],training:[1,0,0,1],decline:[-1,0,0,-1]},
 'business-customer-change':{adapt:[1,0,0,1],keep:[-1,0,0,-1]},
 'temperament-window':{insist:[1,0,0,1],try:[1,0,0,0],look:[1,0,0,0],wait:[-1,0,0,0]},
 city:{'老家':[0,0,-2,0],'县城':[0,0,1,0],'省会':[0,0,1,0],'一线':[1,0,2,0]},
 career:{home:[-1,0,-2,0],work:[0,0,0,0],civil:[-1,0,0,1],master:[1,0,0,1]},
 midcareer:{stay:[-1,0,-1,-1],change:[1,0,1,1]},
 'return-hometown':{stay:[-1,0,-2,0],home:[1,-1,2,1]},
 'elder-residence':{home:[-1,1,-2,0],child:[0,-1,2,0],facility:[1,1,2,0]},
 'family-child-care':{parents:[0,-1,0,0],grandparents:[0,-1,0,0],hometown:[0,1,0,0]},
 'family-second-child':{child:[1,-2,0,0],keep:[-1,-1,0,0]},
 'grandchild-care':{help:[0,-2,0,0],visit:[0,2,0,0]},
 'child-down-payment':{help:[0,-2,0,0],small:[0,-1,0,0],budget:[-1,2,0,0]},
 'parent-inheritance':{accept:[0,2,0,0],leave:[0,-2,0,0]},
 'sibling-borrowing':{lend:[1,-1,0,0],gift:[0,-1,0,0],decline:[-1,1,0,0]},
 'parent-serious-illness':{savings:[0,-2,0,1],sell:[1,-2,1,1],basic:[-1,-1,0,0],discuss:[0,-1,0,0]},
 'parent-care-arrangement':{together:[0,-2,0,0],siblings:[0,-1,0,0],visits:[0,-1,0,0],calls:[0,-1,0,0]},
 'relationship-marriage-crisis':{tolerate:[-1,0,-1,-1],cold:[0,1,-1,-1],consult:[1,-1,0,1],separate:[1,1,1,1],'request-divorce':[1,1,1,1],sue:[1,1,1,1]},
 'relationship-late-marriage':{marry:[1,-1,-1,1],continue:[-1,0,-1,0],breakup:[1,1,1,1]},
 'relationship-breakup':{talk:[0,-1,-1,1],breakup:[1,1,1,0]},
 'relationship-distance':{continue:[0,-1,-1,1],breakup:[1,1,1,0]},
 'work-promotion-preparation':{steady:[-1,0,0,-1],learn:[1,0,0,1],campaign:[1,0,0,1]},
 'work-salary-talk':{rest:[-1,1,0,-1],skill:[1,0,0,1],ask:[1,0,0,1]},
 'midlife-fallback':{craft:[1,0,0,1],contacts:[1,0,0,1],steady:[-1,0,0,-1]},
 'flexible-retirement':{early:[-1,1,0,0],normal:[-1,0,0,0],late:[1,0,0,1]},
};
const focusScores={study:[0,1,0,1],sprint:[1,1,0,1],certificate:[1,1,0,1],skill:[1,1,0,1],career:[1,1,0,1],side:[1,1,0,1],family:[-1,-1,-1,0],chores:[-1,-1,-1,0],grandchildren:[-1,-1,-1,0],travel:[1,1,1,0],rest:[-1,1,0,0],health:[-1,1,0,0],wellness:[-1,1,0,0],interest:[0,1,0,0],arts:[0,1,0,0],play:[0,1,0,0],gaming:[0,1,0,0]};
const moneyScores={parents:[0,-1,0,0],relative:[1,-1,0,0],deposit:[-1,0,0,0],stock:[1,0,0,0],fund:[1,0,0,0],wealth:[1,0,0,0],'business-expand':[1,0,0,1],'house-sell':[1,0,1,0],'mortgage-prepay':[-1,0,0,1]};
export function lifeColor(s){
 const axes=COLOR_AXES.map(a=>({...a,leftScore:0,rightScore:0,evidenceCount:0}));
 const add=(values,weight=1,count=1)=>{if(!values)return;values.forEach((v,i)=>{if(!v)return;axes[i][v<0?'leftScore':'rightScore']+=Math.abs(v)*weight;axes[i].evidenceCount+=count;});};
 for(const h of s.cardHistory??[])add(CHOICE_COLOR_SCORES[h.id]?.[h.choice]);
 // Repeated focus is evidence too; saturating weight keeps a long lifespan
 // from erasing consequential card choices. No annual focus is invented.
 const count={};for(const h of s.focusHistory??[])count[h.focus]=(count[h.focus]??0)+1;
 for(const [id,n]of Object.entries(count))add(focusScores[id],Math.min(1,n/4),n);
 for(const h of s.financialHistory??s.inputHistory??[])add(moneyScores[h.action]??(h.action?.startsWith('business:')?[1,0,0,1]:null));
 for(const a of axes){a.leftScore=Number(a.leftScore.toFixed(3));a.rightScore=Number(a.rightScore.toFixed(3));a.value=Number((a.rightScore-a.leftScore).toFixed(3));a.side=!a.evidenceCount?'unknown':a.value>0?'right':a.value<0?'left':'balanced';a.label=a.side==='unknown'?'尚无选择':a.side==='balanced'?'两边都有':a[a.side];}
 const determined=axes.every(a=>['left','right'].includes(a.side)),signature=axes.map(a=>a.side==='right'?'1':a.side==='left'?'0':'?').join('');
 const color=determined?LIFE_COLORS.find(c=>c.signature===signature):{id:'uncolored',name:'尚未定色',hex:'#a5a59b',signature,description:'已有的选择仍留在这里；没有倾向的轴暂不定色。'};
 return {...color,signature,determined,axes};
}
