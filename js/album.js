/* 사진첩 : 우표(책) 버튼을 누르면 열리는 책 넘기기 사진첩 */
/* ── 사진첩 (책 넘기기) ── */
const album=document.getElementById('album');
const book=document.getElementById('book');
const leaves=[...book.querySelectorAll('.leaf')];
const dotsEl=document.getElementById('dots');
const card=document.querySelector('.card');
const labels=['COVER','PAGE 1 — 2','PAGE 3 — 4','PAGE 5','THE END','CLOSED'];
const N=leaves.length;
let s=0,timer=null,openTimer=null;
for(let k=0;k<=N;k++){const d=document.createElement('i');d.addEventListener('click',()=>go(k));dotsEl.appendChild(d);}
function render(instant){
  book.dataset.s=s;
  leaves.forEach((l,i)=>{
    const f=s>i,was=l.classList.contains('flip');
    l.classList.toggle('flip',f);
    const z=(f?i+1:N-i)+2;
    if(f!==was&&!instant)setTimeout(()=>{l.style.zIndex=z;},book.classList.contains("fast")?230:450);else l.style.zIndex=z;
  });
  [...dotsEl.children].forEach((d,k)=>d.classList.toggle('on',k===s));
  document.getElementById('count').textContent=labels[s];
  document.getElementById('replay').hidden=s<N-1;
}
function go(n){
  clearInterval(timer);
  const target=Math.max(0,Math.min(N,n));
  const fast=Math.abs(target-s)>1;
  book.classList.toggle("fast",fast);
  const step=()=>{
    if(s===target){clearInterval(timer);return;}
    s+=s<target?1:-1;render();
  };
  step();
  timer=setInterval(step,fast?200:420);
}
function back(){go(s===N?0:s-1);}
function openAlbum(){
  album.hidden=false;album.classList.add('show');document.body.style.overflow='hidden';
  card.classList.add('seen');
  clearInterval(timer);clearTimeout(openTimer);
  s=0;leaves.forEach(l=>l.classList.remove('flip'));render(true);
  openTimer=setTimeout(()=>go(1),800);
  document.getElementById('albumClose').focus();
}
function closeAlbum(){
  clearInterval(timer);clearTimeout(openTimer);
  album.classList.remove('show');album.hidden=true;document.body.style.overflow='';
  document.getElementById('stampBtn').focus();
}
document.getElementById('stampBtn').addEventListener('click',openAlbum);
document.getElementById('albumClose').addEventListener('click',closeAlbum);
document.getElementById('replay').addEventListener('click',()=>go(0));
document.getElementById('prevPhoto').addEventListener('click',()=>back());
document.getElementById('nextPhoto').addEventListener('click',()=>go(s+1));
album.addEventListener('click',e=>{if(e.target===album)closeAlbum();});
let swiped=false;
book.addEventListener('click',e=>{
  if(swiped){swiped=false;return;}
  const r=book.getBoundingClientRect();
  if(s===0||e.clientX>r.left+r.width/2)go(s+1);else back();
});
document.addEventListener('keydown',e=>{
  if(!album.classList.contains('show'))return;
  if(e.key==='Escape')closeAlbum();
  if(e.key==='ArrowLeft')back();
  if(e.key==='ArrowRight')go(s+1);
});
let sx=null;
book.addEventListener('pointerdown',e=>{sx=e.clientX;});
book.addEventListener('pointerup',e=>{
  if(sx===null)return;const dx=e.clientX-sx;sx=null;
  if(Math.abs(dx)>50){swiped=true;(dx<0?go(s+1):back());}
},true);
render(true);
