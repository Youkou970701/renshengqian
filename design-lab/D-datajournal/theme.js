function enhance(){const m=document.querySelector('.birth-motif');if(m)m.innerHTML=Array.from({length:100},(_,i)=>`<span class="dot${i===99?' player':''}"></span>`).join('');}
window.addEventListener('lab:render',enhance);enhance();
