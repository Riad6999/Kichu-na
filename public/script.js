const PASSWORD = 'lovemeone';
const overlay=document.getElementById('pwOverlay');
const input=document.getElementById('pwInput');
const btn=document.getElementById('pwBtn');
const msg=document.getElementById('pwMsg');
const main=document.getElementById('main');
const yesBtn=document.getElementById('yesBtn');
const noBtn=document.getElementById('noBtn');
const countEl=document.getElementById('noCount');

let count=0;
btn.onclick=()=>{
  if(input.value.toLowerCase()===PASSWORD){
    overlay.style.display='none'; main.style.display='block';
  }else msg.textContent='Wrong password!';
};
noBtn.onclick=()=>{
  count++; countEl.textContent=count;
  const s=Math.min(2.5,1+count*0.1);
  yesBtn.style.transform=`scale(${s})`;
};
yesBtn.onclick=()=>window.location='yes.html';
