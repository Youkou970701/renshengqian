// Template functions only inspect state. Sampling belongs to the seeded engine.
export const rural = (s) => s.hukou === 'rural';
export const urban = (s) => s.hukou === 'urban';
export const poor = (s) => s.wealthQ <= 2;
export const rich = (s) => s.wealthQ >= 4;
export const secondarySchool = (s) => ['high', 'vocational', 'secondary_vocational', 'zhongzhi'].includes(s.edu) && ['尚未就业', '在读', 'student', undefined].includes(s.job);
export const higherSchool = (s) => ['college', 'associate', 'bachelor', '985', '211', 'master'].includes(s.edu) && ['尚未就业', '研究生在读', '在读', 'student', undefined].includes(s.job);
export const bachelorEligible = (s) => ['bachelor', '985', '211', 'master'].includes(s.edu);
export const working = (s) => Boolean(s.job) && !s.retired && !['尚未就业', '待业', '研究生在读', '退休', '居民养老 / 零工', 'student', 'unemployed'].includes(s.job);
export const childAge = (min, max) => (s) => Array.isArray(s.kids) && s.kids.some((child) => {
  const age = Number.isFinite(child.bornAt) ? s.age - child.bornAt : child.age;
  return Number.isFinite(age) && age >= min && age <= max;
});
export const hasKids = (s) => Number(s.kids) > 0 || (Array.isArray(s.kids) && s.kids.length > 0);

export function templates(stage, rows) {
  return rows.map(([id, text, stat, effects = {}, condition = () => true, boost = () => 1]) => ({
    id: `${stage}-${id}`,
    stage,
    weight: (state) => condition(state) ? Math.max(0, boost(state)) : 0,
    text: typeof text === 'function' ? text : () => text,
    effects,
    ...(stat ? { stat } : {}),
  }));
}
