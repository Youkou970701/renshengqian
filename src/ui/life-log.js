// Newest year first, with each year's scene, choice and consequence in order.
// Stable sorting also preserves the historical order of multiple cards in a year.
export const orderedLifeLog = events => [...events].sort((a,b)=>b.age-a.age);
