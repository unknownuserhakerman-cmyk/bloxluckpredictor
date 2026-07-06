document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const statusText = $('statusText'), statusDot = $('statusDot'), userDisplay = $('userDisplay');
  const predictionText = $('predictionText'), predictionIcon = $('predictionIcon'), winChance = $('winChance');
  const winBar = $('winBar'), headsPct = $('headsPct'), tailsPct = $('tailsPct');
  const matchList = $('matchList'), logBox = $('logBox');
  const predictBtn = $('predictBtn'), refreshBtn = $('refreshBtn'), grabBtn = $('grabBtn');

  function log(msg) {
    logBox.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }

  function updateUI(data) {
    if (!data) return;

    const isHeads = data.prediction === 'HEADS';
    predictionText.textContent = data.prediction;
    predictionIcon.src = isHeads ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';

    const wc = data.winChance || 50;
    winChance.textContent = wc + '%';
    let colorClass = 'y';
    if (wc >= 65) colorClass = 'g';
    else if (wc < 45) colorClass = 'r';
    winChance.className = 'win-chance ' + colorClass;

    winBar.style.width = wc + '%';
    winBar.className = 'bar-fill ' + colorClass;

    headsPct.textContent = (data.headsChance || 50) + '%';
    tailsPct.textContent = (data.tailsChance || 50) + '%';

    if (data.username && data.username !== 'User') {
      userDisplay.textContent = '👤 ' + data.username;
    }

    // Match history
    if (data.matches && data.matches.length > 0) {
      matchList.innerHTML = '';
      data.matches.slice(-15).forEach(m => {
        const div = document.createElement('div');
        div.className = 'match-item ' + (m.win ? 'g' : 'r');
        const img = document.createElement('img');
        img.className = 'mimg';
        img.src = m.heads ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';
        div.appendChild(img);
        const span = document.createElement('span');
        span.textContent = (m.heads ? 'H' : 'T') + ' — ' + m.chance + '% chance';
        div.appendChild(span);
        matchList.appendChild(div);
      });
    }
  }

  // Check current tab
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('bloxluck.com')) {
      statusText.textContent = 'Connected';
      statusDot.className = 'dot g';
      chrome.tabs.sendMessage(tabs[0].id, { action: 'get_analysis' }, r => {
        if (r) updateUI(r);
      });
    } else {
      statusText.textContent = 'Not on BloxLuck';
      statusDot.className = 'dot r';
    }
  });

  predictBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'predict' }, r => {
          if (r) updateUI(r);
          log('Prediction updated');
        });
      }
    });
  };

  refreshBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refresh' }, () => log('Refreshed ✓'));
      }
    });
  };

  grabBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'grab_and_send' }, () => log('Data sent ✓'));
      }
    });
  };
});
