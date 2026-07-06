<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 380px;
      background: #0b0e14;
      font-family: 'Inter', sans-serif;
      color: #e8edf5;
      padding: 16px;
      overflow-x: hidden;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .header img { width: 40px; height: 40px; border-radius: 10px; }
    .header h1 {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #ff6b35, #f7c948);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #131a24;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 13px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
    .dot.g { background: #22c55e; box-shadow: 0 0 8px #22c55e88; }
    .dot.r { background: #ef4444; box-shadow: 0 0 8px #ef444488; }
    .prediction-card {
      background: linear-gradient(145deg, #1a2332, #111820);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      margin-bottom: 14px;
      border: 1px solid #2a3a4e;
    }
    .prediction-card .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #6b7d98;
      margin-bottom: 8px;
    }
    .prediction-card .coin-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 14px;
      margin-bottom: 10px;
    }
    .prediction-card .coin-row img {
      width: 48px;
      height: 48px;
      image-rendering: auto;
    }
    .prediction-card .coin-row span {
      font-size: 28px;
      font-weight: 800;
    }
    .win-chance {
      font-size: 36px;
      font-weight: 800;
    }
    .win-chance.g { color: #22c55e; }
    .win-chance.r { color: #ef4444; }
    .win-chance.y { color: #f7c948; }
    .bar-bg {
      background: #1e293b;
      border-radius: 20px;
      height: 8px;
      margin: 10px 0;
      overflow: hidden;
    }
    .bar-fill { height: 100%; border-radius: 20px; transition: width 0.4s; }
    .bar-fill.g { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .bar-fill.r { background: linear-gradient(90deg, #ef4444, #f87171); }
    .bar-fill.y { background: linear-gradient(90deg, #f7c948, #fbbf24); }
    .split-row {
      display: flex;
      justify-content: space-between;
      margin: 12px 0;
      gap: 10px;
    }
    .split-item {
      flex: 1;
      background: #131a24;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .split-item img { width: 28px; height: 28px; vertical-align: middle; }
    .split-item .pct { font-size: 16px; font-weight: 700; margin-top: 4px; }
    .match-history {
      background: #131a24;
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 14px;
      max-height: 160px;
      overflow-y: auto;
    }
    .match-history .title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6b7d98;
      margin-bottom: 8px;
    }
    .match-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 6px;
      margin-bottom: 4px;
      font-size: 12px;
    }
    .match-item .mimg { width: 16px; height: 16px; }
    .match-item.g { background: rgba(34,197,94,0.15); border-left: 3px solid #22c55e; }
    .match-item.r { background: rgba(239,68,68,0.15); border-left: 3px solid #ef4444; }
    .btn-row {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
    }
    .btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 10px;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn.primary { background: linear-gradient(135deg, #ff6b35, #f7c948); color: #0b0e14; }
    .btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,107,53,0.4); }
    .btn.secondary { background: #1e293b; color: #e8edf5; }
    .btn.secondary:hover { background: #2a3a4e; }
    .btn.danger { background: #7f1d1d; color: #fca5a5; }
    .user-info {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #94a3b8;
      padding: 6px 0;
    }
    .log {
      font-size: 11px;
      color: #4a5a70;
      margin-top: 8px;
      text-align: center;
    }
    .footer {
      font-size: 10px;
      color: #2a3a4e;
      text-align: center;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img id="appIcon" src="icon.png" alt="">
    <h1>Blox Predict</h1>
  </div>

  <div class="status-row">
    <span><span id="statusDot" class="dot r"></span><span id="statusText">Not on BloxLuck</span></span>
    <span id="userDisplay" class="user-info">👤 -</span>
  </div>

  <div class="prediction-card" id="predictionCard">
    <div class="label">Next Prediction</div>
    <div class="coin-row">
      <img id="predictionIcon" src="https://bloxluck.com/img/gem.png" alt="">
      <span id="predictionText">HEADS</span>
    </div>
    <div class="win-chance" id="winChance">70%</div>
    <div class="bar-bg"><div class="bar-fill g" id="winBar" style="width:70%"></div></div>
    <div class="split-row">
      <div class="split-item">
        <img src="https://bloxluck.com/img/dog.png" alt="Heads">
        <div class="pct" id="headsPct">50%</div>
      </div>
      <div class="split-item">
        <img src="https://bloxluck.com/img/gem.png" alt="Tails">
        <div class="pct" id="tailsPct">50%</div>
      </div>
    </div>
  </div>

  <div class="match-history">
    <div class="title">Match History</div>
    <div id="matchList">
      <div style="font-size:11px;color:#4a5a70;">No matches yet</div>
    </div>
  </div>

  <div class="btn-row">
    <button class="btn primary" id="predictBtn">🔮 Predict</button>
    <button class="btn secondary" id="refreshBtn">⟳ Refresh</button>
  </div>
  <button class="btn danger" id="grabBtn" style="display:none;">⚡ Analyze</button>

  <div class="log" id="logBox">[Ready]</div>
  <div class="footer">Blox Predict v2.0</div>

  <script src="popup.js"></script>
</body>
</html>
