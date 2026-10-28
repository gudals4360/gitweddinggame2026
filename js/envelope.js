/* 봉투 : 봉투 덮개를 손으로 잡아 뜯어 열면 편지가 나옴, FOLD AGAIN을 누르면 다시 접힘 */
const env=document.getElementById('envelope');
const flap=env.querySelector('.flap');
const scrap=document.createElement('div');                 // 덮개를 뜯을 때 봉투에 붙어 남는 종이 조각
scrap.className='scrap';scrap.setAttribute('aria-hidden','true');flap.after(scrap);
const glue=document.createElement('div');                  // 풀이 버틸 때 늘어나는 종이 섬유
glue.className='glue';glue.setAttribute('aria-hidden','true');flap.after(glue);
const fshadow=document.createElement('div');               // 들린 덮개가 봉투에 드리우는 그림자
fshadow.className='flap-shadow';fshadow.setAttribute('aria-hidden','true');flap.before(fshadow);
const envReduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const eclamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esfx=n=>{try{Sound[n]&&Sound[n]()}catch(e){}};
const STICK=42;                                              // 풀이 떨어질 때까지 당겨야 하는 거리(px)
let torn=false,flapA=0,envBusy=false,skipClick=false,peel=null;

/* 덮개 각도 : 0=닫힘, 180=완전히 젖혀짐 */
function setFlap(a,stretch=0){
  flapA=a;
  const under=a>90,lift=Math.sin(a*Math.PI/180);
  fshadow.style.opacity=under?0:(lift*1.6).toFixed(3);
  fshadow.style.transform=`translateY(${(lift*10).toFixed(1)}px)`;
  glue.style.opacity=torn?0:Math.min(1,a/6).toFixed(3);
  glue.style.transform=`translate(-50%,-100%) scaleY(${(.15+a/18*.6).toFixed(3)})`;
  flap.style.transition='none';
  flap.style.transform=`rotateX(${a.toFixed(2)}deg)`+(stretch?` scaleY(${(1+stretch).toFixed(3)})`:'');
  flap.style.zIndex=under?1:5;
  flap.style.background=under?'var(--mint-deep)':'';
  flap.style.filter=`brightness(${(1-.14*Math.sin(a*Math.PI/180)).toFixed(3)})`;
}
function clearFlap(){['transition','transform','zIndex','background','filter'].forEach(k=>flap.style[k]='');fshadow.style.opacity=0;glue.style.opacity=0;}
function tearSeal(){                                        // 풀칠된 끝이 찢어지는 순간
  if(torn)return;torn=true;env.classList.add('torn');esfx('rip');setTimeout(()=>esfx('rip'),70);
}
function animateFlap(from,to,dur,done,{bounce=false}={}){
  envBusy=true;const t0=performance.now();if(envReduce)dur=100;
  requestAnimationFrame(function frame(now){
    const p=Math.min(1,(now-t0)/dur);
    let e;
    if(bounce){const q=(p-.7)/.3;e=p<.7?Math.pow(p/.7,2):1-Math.sin(q*Math.PI)*.12*(1-q);}        // 툭 떨어졌다 살짝 튐
    else{e=p<.85?(1-Math.pow(1-p/.85,3))*1.03:1.03-(p-.85)/.15*.03;}                           // 젖혀졌다 살짝 넘쳤다 내려앉음
    setFlap(eclamp(from+(to-from)*e,0,182));
    if(p<1)requestAnimationFrame(frame);else{envBusy=false;done&&done();}
  });
}
function finishOpen(){
  clearFlap();
  env.classList.add('open');
  document.getElementById('stage').classList.add('opened');
  esfx('open');
  setTimeout(()=>{document.body.classList.add('read');window.scrollTo({top:0,behavior:'smooth'});},2300);
}
function openFrom(a){animateFlap(a,180,Math.max(320,(180-a)/180*800),finishOpen);}
function dropTo(a,to){animateFlap(a,to,380,()=>{if(to===0)clearFlap();},{bounce:true});}

/* 톡 누르면 손이 대신 두어 번 당겼다가 뜯어서 엶 */
function autoPeel(){
  if(env.classList.contains('open')||envBusy)return;
  if(torn){openFrom(flapA);return;}
  envBusy=true;const t0=performance.now(),D=envReduce?150:620;let ripped=0;
  requestAnimationFrame(function frame(now){
    const p=Math.min(1,(now-t0)/D);
    const tug=Math.max(0,Math.sin(p*Math.PI*2.2))*(7+p*11);             // 두 번 잡아당기며 버팀
    setFlap(tug,tug*.004);
    if(p>.25&&ripped===0){ripped=1;esfx('rip');}
    if(p<1)requestAnimationFrame(frame);
    else{envBusy=false;tearSeal();openFrom(flapA);}
  });
}

/* 손으로 덮개를 잡고 위로 끌기 */
env.addEventListener('pointerdown',e=>{
  if(env.classList.contains('open')||envBusy||e.button>0)return;
  const r=env.getBoundingClientRect();
  peel={x0:e.clientX,y0:e.clientY,top:r.top,moved:false,startA:flapA,off:null,lastRip:0,hist:[[e.clientY,performance.now()]]};
  env.setPointerCapture(e.pointerId);
});
env.addEventListener('pointermove',e=>{
  if(!peel)return;
  const dy=peel.y0-e.clientY;
  if(!peel.moved){if(Math.hypot(e.clientX-peel.x0,dy)<5)return;peel.moved=true;skipClick=true;}
  peel.hist.push([e.clientY,performance.now()]);if(peel.hist.length>6)peel.hist.shift();
  if(!torn){                                                 // 아직 풀이 붙어 있음 : 덮개가 버티며 조금만 들림
    const t=Math.max(0,dy)/STICK;
    setFlap(t*18,t*.03);
    if(dy-peel.lastRip>14){peel.lastRip=dy;esfx('rip');}
    if(dy>STICK)tearSeal();
    return;
  }
  const r=Math.max(40,peel.y0-peel.top);                     // 경첩에서 잡은 곳까지의 거리
  const raw=Math.acos(eclamp((e.clientY-peel.top)/r,-1,1))*180/Math.PI;
  if(peel.off===null)peel.off=flapA-raw;                     // 찢어진 순간 각도가 튀지 않게 이어 붙임
  setFlap(eclamp(raw+peel.off,0,180));
});
function endPeel(){
  if(!peel)return;const p=peel;peel=null;
  if(!p.moved)return;                                        // 그냥 누른 것은 click에서 처리
  const [y1,t1]=p.hist[0],[y2,t2]=p.hist[p.hist.length-1];
  const v=(y2-y1)/Math.max(1,t2-t1);                         // 위로 휙 튕기면 음수
  if(torn&&(flapA>70||v<-.6))openFrom(flapA);
  else if(torn)dropTo(flapA,38);                             // 찢어졌지만 덜 열면 살짝 열린 채로 내려앉음
  else dropTo(flapA,0);                                      // 풀이 버티면 다시 착 붙음
}
env.addEventListener('pointerup',endPeel);
env.addEventListener('pointercancel',endPeel);
env.addEventListener('click',()=>{if(skipClick){skipClick=false;return;}autoPeel();});

document.getElementById('again').addEventListener('click',()=>{
  try{Sound.fold()}catch(e){}
  clearFlap();flapA=0;
  document.body.classList.remove('read');env.classList.remove('open');
  document.getElementById('stage').classList.remove('opened');
  window.scrollTo({top:0,behavior:'smooth'});
});
