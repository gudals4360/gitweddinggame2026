/* 소리 : 배경음악(피아노 왈츠)과 종이 소리, 오른쪽 위 소리 켜기/끄기 버튼 */
/* ───── 사운드 : 외부 파일 없이 Web Audio로 합성 ───── */
const Sound=(()=>{
  let ctx,master,music,sfx,verb,noise,timer,nextT=0,bar=0,started=false,muted=false;
  try{muted=localStorage.getItem('letter-muted')==='1'}catch(e){}
  const BEAT=60/66, BAR=3*BEAT, rnd=(a,b)=>a+Math.random()*(b-a);
  const hz=n=>{const m=n.match(/^([A-G])(#?)(\d)$/);
    return 440*Math.pow(2,(12*(+m[3]+1)+{C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]?1:0)-69)/12)};

  function init(){
    if(ctx)return true;
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return false;
    ctx=new AC();
    const comp=ctx.createDynamicsCompressor(); comp.connect(ctx.destination);
    master=ctx.createGain(); master.connect(comp);
    verb=ctx.createConvolver(); verb.buffer=impulse(3.4,2.4);
    const wet=ctx.createGain(); wet.gain.value=.5; verb.connect(wet).connect(master);
    const tone=ctx.createBiquadFilter(); tone.type='lowpass'; tone.frequency.value=3200;
    music=ctx.createGain(); music.gain.value=0; music.connect(tone); tone.connect(master); tone.connect(verb);
    sfx=ctx.createGain(); sfx.gain.value=.9; sfx.connect(master);
    const room=ctx.createGain(); room.gain.value=.12; sfx.connect(room).connect(verb);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);
    const d=noise.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    return true;
  }
  function impulse(sec,decay){
    const len=ctx.sampleRate*sec, b=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay)}
    return b;
  }

  /* 종이 소리 재료 : 필터 거친 노이즈 */
  function hiss(t,dur,{type='bandpass',f0,f1=f0,q=1,peak=.5,attack=.05,curve}){
    const s=ctx.createBufferSource(); s.buffer=noise; s.loop=true;
    const f=ctx.createBiquadFilter(); f.type=type; f.Q.value=q;
    f.frequency.setValueAtTime(f0,t); f.frequency.exponentialRampToValueAtTime(f1,t+dur);
    const g=ctx.createGain();
    if(curve)g.gain.setValueCurveAtTime(curve.map(v=>v*peak),t,dur);
    else{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur)}
    s.connect(f).connect(g).connect(sfx); s.start(t,rnd(0,1.5)); s.stop(t+dur+.05);
  }
  // 바스락 : 아주 짧은 클릭들을 흩뿌림
  function crackle(t,dur,count,peak){
    for(let i=0;i<count;i++){
      const tt=t+dur*Math.pow(Math.random(),.9), len=rnd(.004,.016);
      const s=ctx.createBufferSource(); s.buffer=noise; s.loop=true;
      const f=ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=rnd(1800,5200);
      const g=ctx.createGain(); g.gain.setValueAtTime(peak*rnd(.2,1),tt); g.gain.exponentialRampToValueAtTime(.0001,tt+len);
      s.connect(f).connect(g).connect(sfx); s.start(tt,rnd(0,1.5)); s.stop(tt+len+.02);
    }
  }
  // 종이가 미끄러질 때의 고르지 않은 마찰
  function friction(n=48){
    const c=new Float32Array(n); let v=.7;
    for(let i=0;i<n;i++){v=v*.6+rnd(.4,1)*.4;c[i]=Math.pow(Math.max(0,Math.sin(Math.PI*i/(n-1))),.7)*v}
    return c;
  }

  /* BGM : D장조 3/4 왈츠, 16마디 반복 */
  const D=['D3','A3','D4','F#4'], A=['A2','E3','A3','C#4'], Acs=['C#3','A3','E4','A4'],
        Bm=['B2','F#3','B3','D4'], G=['G2','D3','G3','B3'], Em=['E3','B3','D4','G4'];
  const CH=[D,Acs,Bm,G,Em,A,G,A, D,Acs,Bm,G,Em,A,G,D];
  const MEL=[
    [['F#5',1.5],['E5',.5],['D5',1]], [['E5',2],['A4',1]], [['D5',1.5],['C#5',.5],['B4',1]], [['B4',2],['D5',1]],
    [['G5',1.5],['F#5',.5],['E5',1]], [['E5',1],['C#5',1],['A4',1]], [['B4',1],['D5',1],['G5',1]], [['F#5',1.5],['E5',1.5]],
    [['A5',1.5],['F#5',.5],['D5',1]], [['E5',1.5],['C#5',.5],['A4',1]], [['F#5',1.5],['E5',.5],['D5',1]], [['D5',2],['B4',1]],
    [['G5',1],['F#5',1],['E5',1]], [['A5',2],['C#5',1]], [['B4',1],['C#5',1],['E5',1]], [['D5',3]]
  ];
  function piano(t,f,v,dur){
    const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(v,t+.006);
    g.gain.exponentialRampToValueAtTime(v*.35,t+.3); g.gain.exponentialRampToValueAtTime(.0001,t+dur); g.connect(music);
    [[1,1],[2,.35],[3,.12],[4.02,.05]].forEach(([m,a])=>{
      const o=ctx.createOscillator(); o.frequency.value=f*m; o.detune.value=rnd(-2,2);
      const og=ctx.createGain(); og.gain.setValueAtTime(a,t); og.gain.exponentialRampToValueAtTime(a*.02,t+dur/m);
      o.connect(og).connect(g); o.start(t); o.stop(t+dur+.05);
    });
  }
  function pad(t,notes,dur){
    const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=900;
    const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.03,t+1);
    g.gain.setValueAtTime(.03,t+dur-.2); g.gain.linearRampToValueAtTime(0,t+dur+1);
    f.connect(g).connect(music);
    notes.forEach(n=>[-6,6].forEach(dt=>{
      const o=ctx.createOscillator(); o.type='triangle'; o.frequency.value=hz(n); o.detune.value=dt;
      o.connect(f); o.start(t); o.stop(t+dur+1.1);
    }));
  }
  function playBar(i,t){
    const ch=CH[i%16];
    [0,1,2,3,2,1].forEach((k,j)=>piano(t+j*BEAT/2+rnd(-.008,.008),hz(ch[k]),j?rnd(.2,.26):.42,j?2.6:4.2));
    let o=0; MEL[i%16].forEach(([n,b])=>{piano(t+o*BEAT+rnd(0,.012),hz(n),.4,b*BEAT+1.6);o+=b});
    pad(t,ch.slice(1),BAR);
  }
  function tick(){
    if(nextT<ctx.currentTime)nextT=ctx.currentTime+.05;
    while(nextT<ctx.currentTime+.3){playBar(bar++,nextT);nextT+=BAR}
  }
  function startMusic(t){
    if(started)return; started=true; nextT=t;
    music.gain.setValueAtTime(0,ctx.currentTime); music.gain.linearRampToValueAtTime(.22,t+4);
    tick(); timer=setInterval(tick,100);
  }

  function ready(){
    if(muted||!init())return false;
    if(ctx.state!=='running')ctx.resume();
    return true;
  }
  return {
    open(){
      if(!ready())return; const t=ctx.currentTime+.02;
      crackle(t,.35,26,.5); hiss(t,.3,{f0:1800,q:.9,peak:.12,attack:.03});             // 봉인 뜯기
      hiss(t+.15,.7,{f0:700,f1:2600,q:1.1,peak:.35,attack:.25});                        // 뚜껑 넘기기
      hiss(t+.85,.12,{type:'lowpass',f0:500,q:.7,peak:.5,attack:.008});                  // 뚜껑이 닿는 소리
      hiss(t+.7,1.15,{f0:2600,f1:3400,q:.6,peak:.28,curve:friction()});                  // 편지지가 미끄러져 나옴
      hiss(t+.7,1.15,{type:'lowpass',f0:900,q:.5,peak:.22,curve:friction()});
      crackle(t+.75,1,14,.15);
      crackle(t+2.25,.25,18,.45); hiss(t+2.25,.35,{f0:1200,f1:3000,q:.8,peak:.3,attack:.06}); // 편지 펼치기
      crackle(t+2.6,.2,12,.35);  hiss(t+2.6,.3,{f0:1500,f1:3500,q:.8,peak:.22,attack:.05});
      startMusic(t+1.4);
    },
    fold(){
      if(!ready())return; const t=ctx.currentTime+.02;
      crackle(t,.3,16,.35); hiss(t,.35,{f0:3000,f1:1200,q:.8,peak:.25,attack:.05});
      hiss(t+.35,.6,{f0:3200,f1:2400,q:.6,peak:.2,curve:friction(32)});
      hiss(t+.95,.12,{type:'lowpass',f0:500,q:.7,peak:.4,attack:.008});
    },
    rip(){                                                                              // 띠지가 조금씩 찢어지는 소리
      if(!ready())return; const t=ctx.currentTime+.01;
      crackle(t,.12,9,.42); hiss(t,.14,{f0:2200,f1:3800,q:.9,peak:.16,attack:.01});
    },
    page(){                                                                             // 책장이 들리고 넘어가는 소리
      if(!ready())return; const t=ctx.currentTime+.01;
      hiss(t,.6,{f0:2300,f1:3300,q:.6,peak:.2,curve:friction(24)});
      crackle(t,.45,7,.12); hiss(t+.55,.1,{type:'lowpass',f0:600,q:.7,peak:.22,attack:.008});
    },
    toggle(){
      muted=!muted; try{localStorage.setItem('letter-muted',muted?'1':'0')}catch(e){}
      if(muted){
        if(ctx){master.gain.setTargetAtTime(0,ctx.currentTime,.1);setTimeout(()=>muted&&ctx.suspend(),500)}
      }else if(init()){
        ctx.resume(); master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(0,ctx.currentTime); master.gain.setTargetAtTime(1,ctx.currentTime,.1);
        startMusic(ctx.currentTime+.1);
      }
      return muted;
    },
    get muted(){return muted},
    pause(){ctx&&ctx.suspend()},
    resume(){ctx&&!muted&&ctx.resume()}
  };
})();

const snd=document.getElementById('sound');
const syncSnd=m=>{snd.setAttribute('aria-pressed',m);snd.setAttribute('aria-label',m?'소리 켜기':'소리 끄기')};
syncSnd(Sound.muted);
snd.addEventListener('click',()=>syncSnd(Sound.toggle()));
document.addEventListener('visibilitychange',()=>document.hidden?Sound.pause():Sound.resume());
