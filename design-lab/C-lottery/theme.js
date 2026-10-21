// Animate the existing result, never generate alternative names or random numbers.
function reveal(){
 if(new URLSearchParams(location.search).has('capture') || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(document.querySelector('.birth-screen').hidden)return;
 for(const [i,selector] of ['.serial','.province-display'].entries()){
  document.querySelector(selector).animate([
   {transform:'translateY(-30px)',opacity:0},
   {transform:'translateY(18px)',opacity:.6,offset:.45},
   {transform:'translateY(-7px)',opacity:1,offset:.8},
   {transform:'translateY(0)',opacity:1}
  ],{duration:620,delay:i*90,easing:'steps(8,end)',fill:'backwards'});
 }
}
window.addEventListener('lab:render',reveal);reveal();
