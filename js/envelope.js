/* 봉투 : 클릭하면 봉투가 열리고 편지가 나옴, FOLD AGAIN을 누르면 다시 접힘 */
const env=document.getElementById('envelope');
env.addEventListener('click',()=>{
  if(env.classList.contains('open'))return;
  try{Sound.open()}catch(e){}
  env.classList.add('open');
  document.getElementById('stage').classList.add('opened');
  setTimeout(()=>{document.body.classList.add('read');window.scrollTo({top:0,behavior:'smooth'});},2300);
});

document.getElementById('again').addEventListener('click',()=>{
  try{Sound.fold()}catch(e){}
  document.body.classList.remove('read');env.classList.remove('open');
  document.getElementById('stage').classList.remove('opened');
  window.scrollTo({top:0,behavior:'smooth'});
});
