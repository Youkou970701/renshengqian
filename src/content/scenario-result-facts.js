// Only terminal, explicitly authored branch facts may replace legacy prose.
// A failed invitation, early exit and completed task have different facts even
// when their broad outcome code is the same.
export function scenarioResultFacts(history,definition){
 if(!history?.outcome||history.outcome==='skipped'||!Number.isFinite(history.endedAt))return null;
 const stored=history.resultFacts;
 if(stored?.text&&stored.title)return {...stored,age:history.endedAt,shareText:stored.shareText??stored.text,shareTitle:stored.shareTitle??stored.title};
 if(!definition?.endFacts)return null;
 const choice=history.choices?.at(-1);
 const option=definition.steps[choice?.index]?.options.find(o=>o.id===choice?.choice);
 if(!option||!history.choices.every(c=>definition.steps[c.index]?.options.some(o=>o.id===c.choice)))return null;
 if(!option.exit&&!option.chance&&choice.index!==definition.steps.length-1)return null;
 const facts=option?.endFacts?.[history.outcome]??definition.endFacts[history.outcome];
 if(!facts?.text||!facts.title)return null;
 return {...facts,age:history.endedAt,shareText:facts.shareText??facts.text,shareTitle:facts.shareTitle??facts.title};
}
