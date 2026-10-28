import {JOB_BY_ID} from '../content/jobs.js';
import {employmentLabel} from '../engine/employment.js';

export function occupationTitle(life){
 const occupation=life.occupation,job=JOB_BY_ID[occupation?.id];
 const title=job?.levels[occupation?.level]?.title??'';
 const years=occupation?.years??0;
 if(years<3||!/(新人|学徒|见习)/.test(title))return title;
 if(job?.profession==='freelancer')return years>=10?'接单老手':'独立接单者';
 // Years alone do not confer a certificate, promotion, or supervisory role.
 return '';
}
export function occupationSummary(life){
 if(!life.occupation)return '';
 return [employmentLabel(life),occupationTitle(life),`这行第${life.occupation.years}年`].filter(Boolean).join(' · ');
}
