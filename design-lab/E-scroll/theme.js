import {scene} from './card.mjs';
const paint=()=>{const data=window.labData;if(!data)return;const motif=document.querySelector('.birth-motif');if(motif)motif.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-50 0 520 1200" aria-hidden="true">${scene(data,0,10,1)}</svg>`};
window.addEventListener('lab:render',paint);document.addEventListener('DOMContentLoaded',paint);paint();
