// Display-only dates: separation has already happened when the parents' story
// starts; other branch results become facts when the branch finishes.
export const scenarioNarrativeAge = h => h.id === 'family-parents-separate' ? h.startedAt : h.endedAt;

// Handoff 10's prose convention: before 35, at most two exams per eligible
// year. This caps displayed totals only; recruitment records and rolls stay intact.
export function civilNarrativeAttempts(s) {
 const firstChoices=(s.cardHistory??[]).filter(h=>['civil','institution'].includes(h.choice)&&Number.isFinite(h.age)).map(h=>h.age);
 const start=Math.max(22,s.collegeGraduateAge??22,firstChoices.length?Math.min(...firstChoices):22);
 const end=Math.min(34,s.age,s.record?.publicRecruitmentLastAge??s.age);
 const capacity=2*Math.max(0,Math.floor(end)-Math.ceil(start)+1);
 return Math.min(s.record?.civilAttempts??0,capacity);
}
