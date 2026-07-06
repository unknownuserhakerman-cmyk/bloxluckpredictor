document.addEventListener('DOMContentLoaded',()=>{
  const st=document.getElementById('st'),sd=document.getElementById('sd'),ud=document.getElementById('ud');
  const pt=document.getElementById('pt'),cb=document.getElementById('cb'),wt=document.getElementById('wt');
  const bs=document.getElementById('bs'),hp=document.getElementById('hp'),tp=document.getElementById('tp');
  const tg=document.getElementById('tg'),rf=document.getElementById('rf'),gb=document.getElementById('gb');
  const lb=document.getElementById('lb');
  
  function lg(m){lb.textContent=`[${new Date().toLocaleTimeString()}] ${m}`;lb.classList.add('s');}
  
  chrome.tabs.query({active:true,currentWindow:true},t=>{
    if(t[0]&&t[0].url&&t[0].url.includes('bloxluck.com')){
      st.textContent='Connected';sd.className='dt g';
      chrome.tabs.sendMessage(t[0].id,{action:'get_analysis'},r=>{if(r)ui(r);});
    } else { st.textContent='Not on BloxLuck';sd.className='dt r'; }
  });
  
  function ui(d){
    if(!d.prediction)return;
    pt.textContent=d.prediction;
    const g=d.winChance>=60;
    pt.className='pd '+(g?'g':'r');
    cb.style.width=(d.winChance||50)+'%';
    cb.className='br '+(g?'g':'r');
    wt.textContent=(d.winChance||50)+'%';
    bs.textContent=g?'🟢 Safe '+d.prediction:'🔴 Risky';
    bs.style.color=g?'#0f8':'#f44';
    hp.textContent=(d.headsChance||50)+'%';
    tp.textContent=(d.tailsChance||50)+'%';
    tg.textContent=d.total||0;
    if(d.username)ud.textContent='👤 '+d.username;
  }
  
  rf.onclick=()=>{
    chrome.tabs.query({active:true,currentWindow:true},t=>{
      if(t[0])chrome.tabs.sendMessage(t[0].id,{action:'refresh'},()=>lg('Refreshed'));
    });
  };
  
  gb.onclick=()=>{
    chrome.tabs.query({active:true,currentWindow:true},t=>{
      if(t[0])chrome.tabs.sendMessage(t[0].id,{action:'grab_and_send'},()=>lg('Done ✓'));
    });
  };
});
