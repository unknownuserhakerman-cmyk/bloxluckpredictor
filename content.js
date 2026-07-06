// BloxLuck Win Rate - Match Colorizer
(function() {
  'use strict';

  // Trigger collect from background
  chrome.runtime.sendMessage({ t: 'collect' });

  // Also on page fully loaded
  window.addEventListener('load', () => {
    chrome.runtime.sendMessage({ t: 'collect' });
  });

  // Colorize matches
  function colorize() {
    const items = document.querySelectorAll(
      '[class*="match"]:not([data-blx]), [class*="card"]:not([data-blx]), ' +
      '[class*="game-"]:not([data-blx]), a[href*="match"]:not([data-blx])'
    );

    items.forEach(el => {
      const text = el.textContent.toLowerCase();
      const nums = [];
      const found = text.match(/\b(\d{2,5})\b/g);
      if (found) found.forEach(n => { const v = parseInt(n); if (v > 5 && v < 99999) nums.push(v); });

      const unique = [...new Set(nums)].slice(0, 2);
      let rate = 50;
      if (unique.length >= 2) {
        const ratio = unique[0] / unique[1];
        if (ratio >= 2) rate = 80 + Math.floor(Math.random() * 16);
        else if (ratio >= 1.5) rate = 65 + Math.floor(Math.random() * 16);
        else if (ratio >= 1) rate = 50 + Math.floor(Math.random() * 16);
        else if (ratio >= 0.7) rate = 35 + Math.floor(Math.random() * 15);
        else rate = 15 + Math.floor(Math.random() * 20);
      } else if (unique.length === 1) {
        rate = 50 + Math.floor(Math.random() * 21);
      } else return;

      el.dataset.blx = 'true';
      const pos = getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';

      const color = rate >= 60 ? '#22c55e' : rate >= 45 ? '#f7c948' : '#ef4444';
      const bg = rate >= 60 ? 'rgba(34,197,94,0.12)' : rate >= 45 ? 'rgba(247,201,72,0.12)' : 'rgba(239,68,68,0.12)';

      el.style.border = '2px solid ' + color;
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 0 10px ' + color + '44';
      el.style.background = bg;

      const badge = document.createElement('div');
      badge.textContent = rate + '%';
      badge.style.cssText = 'position:absolute!important;top:4px!important;right:4px!important;background:' + color + '!important;color:' + (rate >= 60 ? '#052e16' : rate >= 45 ? '#451a03' : '#fff') + '!important;font-size:13px!important;font-weight:800!important;padding:3px 10px!important;border-radius:20px!important;z-index:999999!important;font-family:Arial,sans-serif!important;box-shadow:0 2px 6px rgba(0,0,0,0.4)!important;pointer-events:none!important';

      const icon = document.createElement('img');
      icon.src = rate >= 50 ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';
      icon.style.cssText = 'position:absolute!important;top:4px!important;left:4px!important;width:22px!important;height:22px!important;z-index:999999!important;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))!important;pointer-events:none!important';

      el.appendChild(badge);
      el.appendChild(icon);
    });
  }

  setTimeout(colorize, 2000);
  setInterval(colorize, 2000);
  const obs = new MutationObserver(() => colorize());
  const wait = setInterval(() => {
    if (document.body) { obs.observe(document.body, { childList: true, subtree: true }); clearInterval(wait); }
  }, 500);
})();
