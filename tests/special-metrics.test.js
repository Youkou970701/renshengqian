import test from 'node:test';
import assert from 'node:assert/strict';
import {educationChecks,schoolObservation,recordSchoolObservation} from '../scripts/cohort.mjs';

test('专项3–8%的分子和分母只取农村Q1–Q2高考者，不混入其他家境录取或缩成资格人群',()=>{
 const rows={};
 const observe=(hukou,wealthQ,record)=>{const b={hukou,wealthQ};const s={record,highSchoolLocation:'county'};recordSchoolObservation(rows,'all',b,s);return schoolObservation(b,s);};
 observe('rural',1,{gaokao:true,specialAdmitted:true,specialEligible:true});
 observe('rural',2,{gaokao:true,specialEligible:false});
 observe('rural',3,{gaokao:true,specialAdmitted:true,specialEligible:true});
 observe('rural',5,{gaokao:true,specialAdmitted:true,specialEligible:true});
 observe('urban',1,{gaokao:true,specialAdmitted:false});
 observe('rural',1,{});
 assert.equal(rows.all.sampleSize,6);assert.equal(rows.all.specialAdmitted,3);assert.equal(rows.all.specialPoorAdmitted,1);assert.equal(rows.all.specialExams,2);
 assert.equal(educationChecks({...rows.all,n:10000,competitionAdmitted:20})[1].value,50);
 assert.equal(educationChecks({n:100000,competitionAdmitted:200,specialAdmitted:2000,specialPoorAdmitted:500,specialExams:10000})[1].value,5);
 assert.equal(educationChecks({n:100000,competitionAdmitted:200,specialAdmitted:2000,specialPoorAdmitted:500,specialExams:10000})[1].pass,true);
 assert.equal(educationChecks({n:1000,competitionAdmitted:2,specialAdmitted:99,specialPoorAdmitted:0,specialExams:0})[1].pass,false);
});
