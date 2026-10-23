import {PUBLIC_JOBS} from '../content/public-career.js';
// Explicit contracts take precedence over a generic occupation name. Missing
// employmentType retains the deployed save's legacy public-post convention.
export const isProtectedPost=s=>s.job==='军人'||!!s.militaryService?.active||['编制','行政编制','事业编制','军籍'].includes(s.employmentType)||PUBLIC_JOBS.includes(s.job)&&s.employmentType==null;
export const employmentLabel=s=>isProtectedPost(s)?s.job==='军人'?'军籍':'在编':s.employmentType==='合同'?'合同制':'非编制';
