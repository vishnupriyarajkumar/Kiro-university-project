import { mountNav } from '../nav.js';
mountNav('stats');

const API = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function fetchJSON(path) {
  const res  = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

async function loadStats() {
  const el = document.getElementById('stats-grid-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const d = await fetchJSON('/api/stats');
    if (d.totalSessions === 0) {
      el.innerHTML = '<div class="empty-card">No sessions yet — <a href="/log.html" style="color:var(--green-dark);font-weight:700">log your first one</a>.</div>';
      return;
    }
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">🍅</div>
          <div class="stat-value">${d.totalSessions}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-value">${d.totalMinutes}</div>
          <div class="stat-label">Total Minutes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🕐</div>
          <div class="stat-value">${d.averageDuration}</div>
          <div class="stat-label">Avg Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-value">${d.currentStreak}</div>
          <div class="stat-label">Current Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-value">${d.longestStreak}</div>
          <div class="stat-label">Longest Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-value" style="font-size:1rem;padding-top:6px">${esc(d.mostProductiveDay)}</div>
          <div class="stat-label">Best Day</div>
        </div>
      </div>`;

    loadInsights(d);
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Weekly bar chart ──────────────────────────────────────────────────────────

async function loadWeeklyChart() {
  const el = document.getElementById('chart-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await fetchJSON('/api/stats/weekly');
    const days  = data.days; // [{ label:'Mon', minutes:50 }, ...]
    const max   = Math.max(...days.map(d => d.minutes), 1);

    const bars = days.map(d => {
      const heightPct = Math.round((d.minutes / max) * 100);
      const isToday   = d.isToday ? 'style="background:var(--green-dark)"' : '';
      return `
        <div class="bar-col">
          <div class="bar-val">${d.minutes > 0 ? d.minutes : ''}</div>
          <div class="bar" style="height:${heightPct}%" ${isToday} title="${d.label}: ${d.minutes} min"></div>
          <div class="bar-label">${d.label}</div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="chart-card">
        <div class="chart-title">Focus minutes per day — this week</div>
        <div class="bar-chart">${bars}</div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Chart unavailable: ${esc(err.message)}</div>`;
  }
}

// ── Insight cards ─────────────────────────────────────────────────────────────

function loadInsights(d) {
  const el = document.getElementById('insights-content');

  const streakMsg = d.currentStreak >= 3
    ? `You're on a ${d.currentStreak}-day streak — keep it going!`
    : d.currentStreak === 0
      ? 'Log a session today to start a new streak.'
      : `${d.currentStreak} day streak — one more day to build momentum.`;

  const avgMsg = d.averageDuration >= 25
    ? `Great focus depth — your average session is ${d.averageDuration} min.`
    : `Your average session is ${d.averageDuration} min. Try pushing to 25 min for deeper focus.`;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="insight-card">
        <h4>🔥 Streak</h4>
        <div class="insight-value">${d.currentStreak} day${d.currentStreak !== 1 ? 's' : ''}</div>
        <div class="insight-sub">${streakMsg}</div>
      </div>
      <div class="insight-card">
        <h4>🕐 Avg Session</h4>
        <div class="insight-value">${d.averageDuration} min</div>
        <div class="insight-sub">${avgMsg}</div>
      </div>
      <div class="insight-card" style="grid-column:1/-1">
        <h4>⭐ Most Productive Day</h4>
        <div class="insight-value">${esc(d.mostProductiveDay)}</div>
        <div class="insight-sub">Plan your deepest work sessions on ${esc(d.mostProductiveDay)}s.</div>
      </div>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadStats();
loadWeeklyChart();
