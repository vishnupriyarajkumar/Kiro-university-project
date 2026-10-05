const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'client');
fs.mkdirSync(clientDir, { recursive: true });

// ── index.html ────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(clientDir, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pomodoro Session Logger</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <header>
    <div class="logo">&#127813; Pomodoro Logger</div>
    <nav>
      <button class="tab-btn active" data-tab="log">&#128221; Log</button>
      <button class="tab-btn" data-tab="today">&#128197; Today</button>
      <button class="tab-btn" data-tab="week">&#128198; Week</button>
      <button class="tab-btn" data-tab="stats">&#128202; Stats</button>
      <button class="tab-btn" data-tab="report">&#128196; Export</button>
    </nav>
  </header>

  <main>
    <!-- LOG -->
    <section id="tab-log" class="tab active">
      <h2>Log a Focus Session</h2>
      <form id="log-form">
        <div class="field">
          <label for="description">What did you work on?</label>
          <input id="description" type="text" placeholder="e.g. Deep work on API design" required />
        </div>
        <div class="field">
          <label for="duration">Duration (minutes, 1-120)</label>
          <input id="duration" type="number" min="1" max="120" placeholder="25" required />
        </div>
        <button type="submit" class="btn-primary">&#127813; Log Session</button>
      </form>
      <div id="log-message" class="message hidden"></div>
    </section>

    <!-- TODAY -->
    <section id="tab-today" class="tab hidden">
      <h2>Today's Sessions</h2>
      <div id="today-content"><p class="loading">Loading...</p></div>
    </section>

    <!-- WEEK -->
    <section id="tab-week" class="tab hidden">
      <h2>This Week's Sessions</h2>
      <div id="week-content"><p class="loading">Loading...</p></div>
    </section>

    <!-- STATS -->
    <section id="tab-stats" class="tab hidden">
      <h2>Your Productivity Stats</h2>
      <div id="stats-content"><p class="loading">Loading...</p></div>
    </section>

    <!-- REPORT -->
    <section id="tab-report" class="tab hidden">
      <h2>Weekly Markdown Report</h2>
      <div class="report-actions">
        <button id="refresh-report" class="btn-secondary">&#128260; Refresh</button>
        <button id="download-report" class="btn-secondary">&#11015;&#65039; Download .md</button>
      </div>
      <div id="report-content"><p class="loading">Loading...</p></div>
    </section>
  </main>

  <script src="app.js"></script>
</body>
</html>`);

// ── style.css ─────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(clientDir, 'style.css'), `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --red:    #e74c3c;
  --red-d:  #c0392b;
  --bg:     #1a1a2e;
  --card:   #16213e;
  --card2:  #0f3460;
  --text:   #eaeaea;
  --muted:  #a0a0b0;
  --accent: #e94560;
  --green:  #2ecc71;
  --radius: 12px;
}

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  background: var(--card);
  border-bottom: 2px solid var(--card2);
  flex-wrap: wrap;
  gap: 12px;
}

.logo {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.5px;
}

nav { display: flex; gap: 8px; flex-wrap: wrap; }

.tab-btn {
  padding: 8px 18px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: var(--card2);
  color: var(--muted);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s;
}
.tab-btn:hover { color: var(--text); border-color: var(--accent); }
.tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }

main { max-width: 800px; margin: 0 auto; padding: 32px 24px; }

.tab { display: none; }
.tab.active { display: block; }
.tab.hidden { display: none; }

h2 { font-size: 1.5rem; margin-bottom: 24px; color: var(--text); }

/* Form */
.field { margin-bottom: 20px; }
label { display: block; margin-bottom: 6px; font-size: 0.9rem; color: var(--muted); font-weight: 600; }
input[type=text], input[type=number] {
  width: 100%;
  padding: 12px 16px;
  background: var(--card);
  border: 2px solid var(--card2);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 1rem;
  transition: border-color 0.2s;
}
input:focus { outline: none; border-color: var(--accent); }

.btn-primary {
  padding: 12px 32px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.btn-primary:hover { background: var(--red-d); }
.btn-primary:active { transform: scale(0.97); }

.btn-secondary {
  padding: 8px 20px;
  background: var(--card2);
  color: var(--text);
  border: 2px solid var(--card2);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s;
}
.btn-secondary:hover { border-color: var(--accent); }

/* Messages */
.message {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: var(--radius);
  font-weight: 600;
}
.message.success { background: #1a4a2e; color: var(--green); border: 1px solid var(--green); }
.message.error   { background: #4a1a1a; color: var(--red);   border: 1px solid var(--red); }
.message.hidden  { display: none; }

/* Cards */
.card {
  background: var(--card);
  border: 1px solid var(--card2);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 16px;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--card2);
}
.session-item:last-child { border-bottom: none; }
.session-desc { font-weight: 600; }
.session-dur {
  background: var(--card2);
  color: var(--accent);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

.total-bar {
  display: flex;
  justify-content: space-between;
  padding: 14px 0 0;
  margin-top: 8px;
  border-top: 1px solid var(--card2);
  font-weight: 700;
  color: var(--green);
}

/* Stats grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
.stat-card {
  background: var(--card);
  border: 1px solid var(--card2);
  border-radius: var(--radius);
  padding: 24px 20px;
  text-align: center;
}
.stat-icon  { font-size: 2rem; margin-bottom: 8px; }
.stat-value { font-size: 2rem; font-weight: 800; color: var(--accent); }
.stat-label { font-size: 0.8rem; color: var(--muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

/* Day header */
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 24px 0 8px;
  padding-bottom: 6px;
  border-bottom: 2px solid var(--card2);
}
.day-header h3 { font-size: 1rem; color: var(--muted); font-weight: 700; }
.day-total { font-size: 0.85rem; color: var(--green); font-weight: 700; }

/* Weekly total */
.week-total {
  margin-top: 24px;
  padding: 14px 20px;
  background: var(--card);
  border: 1px solid var(--green);
  border-radius: var(--radius);
  color: var(--green);
  font-weight: 700;
  text-align: center;
  font-size: 1rem;
}

/* Report */
.report-actions { display: flex; gap: 12px; margin-bottom: 20px; }
.report-pre {
  background: var(--card);
  border: 1px solid var(--card2);
  border-radius: var(--radius);
  padding: 24px;
  white-space: pre-wrap;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text);
  overflow-x: auto;
}

/* Empty / loading */
.empty { text-align: center; color: var(--muted); padding: 40px 0; font-size: 1rem; }
.loading { text-align: center; color: var(--muted); padding: 40px 0; }
`);

// ── app.js ─────────────────────────────────────────────────────────────────────
fs.writeFileSync(path.join(clientDir, 'app.js'), `
const API = '';

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.classList.add('hidden'); });
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    tab.classList.remove('hidden');
    tab.classList.add('active');
    // Refresh data when switching to data tabs
    if (btn.dataset.tab === 'today')  loadToday();
    if (btn.dataset.tab === 'week')   loadWeek();
    if (btn.dataset.tab === 'stats')  loadStats();
    if (btn.dataset.tab === 'report') loadReport();
  });
});

// ── Log form ──────────────────────────────────────────────────────────────────
document.getElementById('log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = document.getElementById('description').value.trim();
  const duration    = parseInt(document.getElementById('duration').value, 10);
  const msgEl = document.getElementById('log-message');

  try {
    const res = await fetch(API + '/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, duration }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log session.');
    showMessage(msgEl, 'success', 'Session logged: ' + data.session.description + ' (' + data.session.duration + ' min)');
    document.getElementById('log-form').reset();
  } catch (err) {
    showMessage(msgEl, 'error', err.message);
  }
});

function showMessage(el, type, text) {
  el.textContent = text;
  el.className = 'message ' + type;
  setTimeout(() => { el.className = 'message hidden'; }, 4000);
}

// ── Today ─────────────────────────────────────────────────────────────────────
async function loadToday() {
  const el = document.getElementById('today-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const data = await fetchJSON('/api/sessions/today');
    if (data.sessions.length === 0) {
      el.innerHTML = '<p class="empty">No sessions logged today yet. Time to focus! &#127813;</p>';
      return;
    }
    let html = '<div class="card">';
    data.sessions.forEach(s => {
      html += '<div class="session-item"><span class="session-desc">' + esc(s.description) + '</span><span class="session-dur">' + s.duration + ' min</span></div>';
    });
    html += '<div class="total-bar"><span>Total focus time</span><span>' + data.totalMinutes + ' min across ' + data.sessions.length + ' session(s)</span></div>';
    html += '</div>';
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = '<p class="empty">Error: ' + esc(err.message) + '</p>';
  }
}

// ── Week ──────────────────────────────────────────────────────────────────────
async function loadWeek() {
  const el = document.getElementById('week-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const data = await fetchJSON('/api/sessions/week');
    if (data.sessions.length === 0) {
      el.innerHTML = '<p class="empty">No sessions this week yet.</p>';
      return;
    }
    const sortedDays = Object.keys(data.grouped).sort();
    let html = '';
    sortedDays.forEach(day => {
      const sessions = data.grouped[day];
      const dayTotal = sessions.reduce((s, x) => s + x.duration, 0);
      html += '<div class="day-header"><h3>' + day + '</h3><span class="day-total">' + dayTotal + ' min</span></div>';
      html += '<div class="card">';
      sessions.forEach(s => {
        html += '<div class="session-item"><span class="session-desc">' + esc(s.description) + '</span><span class="session-dur">' + s.duration + ' min</span></div>';
      });
      html += '</div>';
    });
    html += '<div class="week-total">Weekly Total: ' + data.totalMinutes + ' min across ' + data.sessions.length + ' session(s)</div>';
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = '<p class="empty">Error: ' + esc(err.message) + '</p>';
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const el = document.getElementById('stats-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const d = await fetchJSON('/api/stats');
    if (d.totalSessions === 0) {
      el.innerHTML = '<p class="empty">No sessions yet. Log your first one!</p>';
      return;
    }
    el.innerHTML = \`
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">&#127813;</div><div class="stat-value">\${d.totalSessions}</div><div class="stat-label">Total Sessions</div></div>
        <div class="stat-card"><div class="stat-icon">&#9201;&#65039;</div><div class="stat-value">\${d.totalMinutes}</div><div class="stat-label">Total Minutes</div></div>
        <div class="stat-card"><div class="stat-icon">&#128336;</div><div class="stat-value">\${d.averageDuration}</div><div class="stat-label">Avg Duration (min)</div></div>
        <div class="stat-card"><div class="stat-icon">&#128293;</div><div class="stat-value">\${d.currentStreak}</div><div class="stat-label">Current Streak (days)</div></div>
        <div class="stat-card"><div class="stat-icon">&#127942;</div><div class="stat-value">\${d.longestStreak}</div><div class="stat-label">Longest Streak (days)</div></div>
        <div class="stat-card"><div class="stat-icon">&#11088;</div><div class="stat-value" style="font-size:1.2rem">\${d.mostProductiveDay}</div><div class="stat-label">Most Productive Day</div></div>
      </div>
    \`;
  } catch (err) {
    el.innerHTML = '<p class="empty">Error: ' + esc(err.message) + '</p>';
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
async function loadReport() {
  const el = document.getElementById('report-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const res = await fetch(API + '/api/report');
    const markdown = await res.text();
    el.innerHTML = '<pre class="report-pre">' + esc(markdown) + '</pre>';
  } catch (err) {
    el.innerHTML = '<p class="empty">Error: ' + esc(err.message) + '</p>';
  }
}

document.getElementById('refresh-report').addEventListener('click', loadReport);

document.getElementById('download-report').addEventListener('click', async () => {
  try {
    const res = await fetch(API + '/api/report');
    const markdown = await res.text();
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = 'pomodoro-week-' + today + '.md';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed: ' + err.message);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Load today on startup
loadToday();
`);

console.log('Client files written successfully.');
