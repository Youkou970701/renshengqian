import test from 'node:test';
import assert from 'node:assert/strict';
import {storyExperience} from '../scripts/probe-m3.mjs';
const good={positive:true,outcome:'good'};
test('09d普通挫折口径：负向mixed和rehabilitated算经历坏事，avoided不算',()=>{
 for(const outcome of ['bad','mixed','rehabilitated'])assert.deepEqual(storyExperience([good,{positive:false,outcome}]),{good:true,bad:true,both:true});
 for(const outcome of ['avoided','skipped',null])assert.deepEqual(storyExperience([good,{positive:false,outcome}]),{good:true,bad:false,both:false});
});
test('好事须正向good：负向good、正向坏结局或未完机会都不冒充双覆盖',()=>{
 assert.deepEqual(storyExperience([{positive:false,outcome:'good'},{positive:false,outcome:'bad'}]),{good:false,bad:true,both:false});
 for(const outcome of ['bad','mixed','rehabilitated','avoided',null])assert.deepEqual(storyExperience([{positive:true,outcome}]),{good:false,bad:false,both:false});
 assert.deepEqual(storyExperience([good]),{good:true,bad:false,both:false});
});
