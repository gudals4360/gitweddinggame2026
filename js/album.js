/* 사진첩 : 띠지를 손으로 뜯어 열고, 책장 모서리를 손으로 잡아 넘기는 사진첩 */
const album=document.getElementById('album');
const book=document.getElementById('book');
const leaves=[...book.querySelectorAll('.leaf')];
const dotsEl=document.getElementById('dots');
const card=document.querySelector('.card');
const band=document.getElementById('band');
const bandTab=document.getElementById('bandTab');
const dragHint=document.getElementById('dragHint');
const labels=['COVER','PAGE 1 — 2','PAGE 3 — 4','PAGE 5','THE END','CLOSED'];
const N=leaves.length;
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
let s=0,busy=false,openTimer=null,sealed=true;

book.classList.add('hand');                     // 책장 움직임을 CSS 대신 손(자바스크립트)이 맡음
leaves.forEach(l=>l.querySelectorAll('.face').forEach(f=>{const d=document.createElement('div');d.className='shade';f.appendChild(d);}));
const castR=document.createElement('div');castR.className='cast r';
const castL=document.createElement('div');castL.className='cast l';
book.append(castR,castL);
for(let k=0;k<=N;k++){const d=document.createElement('i');d.addEventListener('click',()=>go(k));dotsEl.appendChild(d);}
const sfx=name=>{try{Sound[name]&&Sound[name]()}catch(e){}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ───── 책장 한 장의 모습 : 각도(0=오른쪽에 놓임, 180=왼쪽으로 넘어감)와 휘어짐 ───── */
function setAngle(l,a,bend=0){
  const lift=Math.sin(a*Math.PI/180);
  l.style.transform=`rotateY(${-a}deg) skewY(${(-bend*lift*7).toFixed(2)}deg)`;
  const [front,back]=l.querySelectorAll('.shade');
  front.style.opacity=a<90?(a/90*.9).toFixed(3):0;
  back.style.opacity=a>90?((180-a)/90*.9).toFixed(3):0;
  castR.style.opacity=a<90?(lift*.6).toFixed(3):0;
  castL.style.opacity=a>90?(lift*.6).toFixed(3):0;
}
function settle(l,flipped){
  l.classList.toggle('flip',flipped);
  setAngle(l,flipped?180:0);
  castR.style.opacity=castL.style.opacity=0;
}
function render(){
  book.dataset.s=s;
  leaves.forEach((l,i)=>{l.style.zIndex=(s>i?i+1:N-i)+2;});
  [...dotsEl.children].forEach((d,k)=>d.classList.toggle('on',k===s));
  document.getElementById('count').textContent=labels[s];
  document.getElementById('replay').hidden=s<N-1;
}
function resetBook(){leaves.forEach((l,i)=>settle(l,s>i));render();}

/* ───── 손으로 넘기는 듯한 자동 넘김 : 천천히 들렸다가 넘어가고, 살짝 넘쳤다 내려앉음 ───── */
const ease=p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
function turn(i,from,to,{bend=.3,bendMode='arc',dur=950,sound=true}={},done){
  const l=leaves[i];l.style.zIndex=60;busy=true;
  if(sound)sfx('page');
  if(reduce)dur=120;
  const over=to>from?3:-3,t0=performance.now();
  requestAnimationFrame(function frame(now){
    const p=Math.min(1,(now-t0)/dur);
    const a=p<.86?from+(to+over-from)*ease(p/.86):to+over*Math.pow(1-(p-.86)/.14,2);
    const b=bendMode==='arc'?bend*Math.sin(Math.PI*p):bend*(1-p);
    setAngle(l,clamp(a,0,180),b);
    if(p<1)requestAnimationFrame(frame);
    else{settle(l,to===180);busy=false;done&&done();}
  });
}
function step(dir,opt={},done){
  if(busy||sealed)return;
  if(dir>0&&s<N)turn(s,0,180,opt,()=>{s++;render();done&&done();});
  else if(dir<0&&s>0)turn(s-1,180,0,opt,()=>{s--;render();done&&done();});
}
function go(n){
  n=clamp(n,0,N);
  if(sealed){autoTear();return;}
  if(busy||n===s)return;
  const fast=Math.abs(n-s)>1;
  const next=()=>{if(s!==n)step(n>s?1:-1,{bend:.2,dur:fast?440:950},next);};
  next();
}
function back(){go(s===N?0:s-1);}

/* ───── 책장 모서리를 잡고 끌어서 넘기기 ───── */
let drag=null,hinted=false;
function hideHint(){if(!hinted){hinted=true;dragHint.classList.add('off');}}
book.addEventListener('pointerdown',e=>{
  if(sealed||busy||e.button>0||band.contains(e.target))return;
  const r=book.getBoundingClientRect(),spine=r.left+r.width/2;
  const fwd=e.clientX>spine;
  if(fwd?s>=N:s<=0)return;
  drag={i:fwd?s:s-1,fwd,pw:r.width/2,top:r.top,h:r.height,x0:e.clientX,y0:e.clientY,moved:false,a:fwd?0:180,bend:0,hist:[[e.clientX,performance.now()]]};
  book.setPointerCapture(e.pointerId);
});
book.addEventListener('pointermove',e=>{
  if(!drag)return;
  if(!drag.moved){
    if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<6)return;
    drag.moved=true;leaves[drag.i].style.zIndex=60;sfx('page');hideHint();
  }
  const r=book.getBoundingClientRect(),spine=r.left+r.width/2;
  drag.a=Math.acos(clamp((e.clientX-spine)/drag.pw,-1,1))*180/Math.PI;   // 책장 끝이 손가락 밑에 오도록
  drag.bend=clamp((e.clientY-(drag.top+drag.h/2))/(drag.h/2),-1,1);         // 잡은 높이만큼 종이가 휨
  setAngle(leaves[drag.i],drag.a,drag.bend);
  drag.hist.push([e.clientX,performance.now()]);if(drag.hist.length>6)drag.hist.shift();
});
function endDrag(e){
  if(!drag)return;const d=drag;drag=null;
  if(!d.moved){step(d.fwd?1:-1,{bend:clamp((e.clientY-(d.top+d.h/2))/(d.h/2),-1,1)*.6});return;}   // 톡 누르면 손으로 넘기듯
  const [x1,t1]=d.hist[0],[x2,t2]=d.hist[d.hist.length-1];
  const v=(x2-x1)/Math.max(1,t2-t1);                                          // 손을 뗄 때의 속도
  let flip=d.a>90;if(v<-.45)flip=true;if(v>.45)flip=false;
  const to=flip?180:0,dur=Math.max(260,Math.abs(to-d.a)/180*700);
  turn(d.i,d.a,to,{bend:d.bend,bendMode:'fade',dur,sound:false},()=>{
    if(d.fwd&&flip)s++;else if(!d.fwd&&!flip)s--;
    render();
  });
}
book.addEventListener('pointerup',endDrag);
book.addEventListener('pointercancel',endDrag);

/* ───── 띠지 뜯기 ───── */
const bp={ti:band.querySelector('.top-in'),to:band.querySelector('.top-out'),bi:band.querySelector('.bot-in'),bo:band.querySelector('.bot-out'),
  lt:band.querySelector('.loose-t'),ls:band.querySelector('.loose-s')};
const TAPE_Y=38;
let tx=0,tearDrag=null,ripAt=0,autoRun=false;
function drawTear(x,hx,hy){
  const w=band.offsetWidth,open=1-x/w;
  tx=x;band.style.setProperty('--x',x+'px');
  bp.to.style.transformOrigin=`${x}px 100%`;bp.to.style.transform=`translateY(${(-2-open*5).toFixed(1)}px) rotate(${(-open*1.5).toFixed(2)}deg)`;
  bp.bo.style.transformOrigin=`${x}px 0`;bp.bo.style.transform=`translateY(${(2+open*5).toFixed(1)}px) rotate(${(open*1.5).toFixed(2)}deg)`;
  const L=w-x,d=Math.hypot(hx-x,hy-TAPE_Y),sag=Math.sqrt(Math.max(0,L*L-d*d))*.5;   // 뜯긴 테이프는 손과 뜯긴 자리 사이에서 축 늘어짐
  const path=L<2?'':`M${x} ${TAPE_Y} Q ${((x+hx)/2).toFixed(1)} ${(Math.max(TAPE_Y,hy)+sag).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
  bp.lt.setAttribute('d',path);bp.ls.setAttribute('d',path);
  bandTab.style.left=hx+'px';bandTab.style.top=hy+'px';
  if(ripAt-x>26){ripAt=x;sfx('rip');}
}
function restTear(){                                                        // 손을 놓으면 뜯긴 테이프가 아래로 늘어짐
  const L=band.offsetWidth-tx;
  drawTear(tx,tx+Math.min(L,40)*.5,TAPE_Y+Math.max(14,L*.7));
}
function sealBand(){
  band.hidden=false;band.classList.remove('pulling');
  [bp.ti,bp.to,bp.bi,bp.bo,band].forEach(el=>{el.style.transition='';el.style.opacity='';});
  requestAnimationFrame(()=>{const w=band.offsetWidth;ripAt=w;drawTear(w,w+4,TAPE_Y);bandTab.style.left='';bandTab.style.top='';});
}
function finishTear(){
  sealed=false;autoRun=false;band.classList.add('pulling');sfx('rip');
  const fall='transform .7s cubic-bezier(.4,0,.8,.6),opacity .7s ease';
  drawTear(0,-30,TAPE_Y+30);
  [bp.to,bp.bo].forEach(el=>el.style.transition=fall);
  bp.to.style.transform='translate(-18px,-70px) rotate(-14deg)';bp.to.style.opacity=0;
  bp.bo.style.transform='translate(14px,90px) rotate(10deg)';bp.bo.style.opacity=0;
  band.style.transition='opacity .6s ease .15s';band.style.opacity=0;
  setTimeout(()=>{band.hidden=true;band.style.opacity='';
    step(1,{bend:.45,dur:1100},()=>{dragHint.classList.toggle('off',hinted);});
  },650);
}
function autoTear(){                                                        // 톡 누르면 손이 대신 쭉 잡아당김
  if(!sealed||autoRun)return;autoRun=true;band.classList.add('pulling');
  const w=band.offsetWidth,x0=tx,t0=performance.now(),dur=reduce?150:1100;
  requestAnimationFrame(function frame(now){
    const p=Math.min(1,(now-t0)/dur),e=p<.15?p*p/.15*.5:1-Math.pow(1-p,2)*.85;
    const x=x0*(1-clamp(e,0,1));
    drawTear(x,x-14,TAPE_Y-16*Math.sin(Math.PI*p)-6);
    if(p<1)requestAnimationFrame(frame);else finishTear();
  });
}
band.addEventListener('pointerdown',e=>{
  if(!sealed||autoRun)return;e.stopPropagation();
  const r=band.getBoundingClientRect();
  tearDrag={left:r.left,top:r.top,x0:e.clientX,y0:e.clientY,moved:false};
  band.setPointerCapture(e.pointerId);band.classList.add('pulling');
});
band.addEventListener('pointermove',e=>{
  if(!tearDrag)return;
  if(!tearDrag.moved&&Math.hypot(e.clientX-tearDrag.x0,e.clientY-tearDrag.y0)<5)return;
  tearDrag.moved=true;
  const hx=e.clientX-tearDrag.left,hy=e.clientY-tearDrag.top;
  drawTear(clamp(Math.min(tx,hx+12),0,band.offsetWidth),hx,hy);             // 한 번 뜯긴 곳은 다시 붙지 않음
  if(tx<band.offsetWidth*.12){tearDrag=null;finishTear();}
});
function endTear(){
  if(!tearDrag)return;const moved=tearDrag.moved;tearDrag=null;
  if(!sealed)return;
  if(!moved){autoTear();return;}
  band.classList.remove('pulling');restTear();
}
band.addEventListener('pointerup',endTear);
band.addEventListener('pointercancel',endTear);
bandTab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();autoTear();}});

/* ───── 사진첩 열기·닫기 ───── */
function openAlbum(){
  album.hidden=false;album.classList.add('show');document.body.style.overflow='hidden';
  card.classList.add('seen');clearTimeout(openTimer);
  s=0;resetBook();
  if(sealed){sealBand();dragHint.classList.add('off');setTimeout(()=>bandTab.focus({preventScroll:true}),80);}
  else{openTimer=setTimeout(()=>step(1),800);document.getElementById('albumClose').focus();}
}
function closeAlbum(){
  clearTimeout(openTimer);drag=null;tearDrag=null;
  album.classList.remove('show');album.hidden=true;document.body.style.overflow='';
  document.getElementById('stampBtn').focus();
}
document.getElementById('stampBtn').addEventListener('click',openAlbum);
document.getElementById('albumClose').addEventListener('click',closeAlbum);
document.getElementById('replay').addEventListener('click',()=>go(0));
document.getElementById('prevPhoto').addEventListener('click',()=>back());
document.getElementById('nextPhoto').addEventListener('click',()=>go(s+1));
album.addEventListener('click',e=>{if(e.target===album)closeAlbum();});
document.addEventListener('keydown',e=>{
  if(!album.classList.contains('show'))return;
  if(e.key==='Escape')closeAlbum();
  if(e.key==='ArrowLeft')back();
  if(e.key==='ArrowRight')go(s+1);
});
resetBook();
