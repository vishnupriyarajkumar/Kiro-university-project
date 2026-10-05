import { mountNav } from '../nav.js';
import { icon } from '../icons.js';
mountNav('stats');

const API = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Fetch JSON and throw a descriptive error on non-OK responses. */
async function fetchJSON(path) {
  const res  = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/**
 * Animate a numeric text element from 0 to its target value.
 * Uses ease-out cubic for a satisfying pop-in feel.
 */
function animateCount(el, target) {
  const duration = 700;
  const startTs  = performance.now();

  function step(ts) {
    const progress = Math.min((ts - startTs) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target; // snap to exact value
  }
  requestAnimationFrame(step);
}

// ── KPI stat cards ─────────────────────────────────────────────────────────────

async function loadStats() {
  const el = document.getElementById('stats-grid-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const d = await fetchJSON('/api/stats');

    if (d.totalSessions === 0) {
      el.innerHTML = `<div class="empty-card">
        No sessions yet —
        <a href="/log.html" style="color:var(--brand-500);font-weight:700">log your first one</a>.
      </div>`;
      return;
    }

    const cards = [
      { iconName: 'tomato',   id: 'sv-sessions', value: d.totalSessions,   label: 'Total Sessions' },
      { iconName: 'stopwatch',id: 'sv-minutes',  value: d.totalMinutes,    label: 'Total Minutes'  },
      { iconName: 'clock',    id: 'sv-avg',      value: d.averageDuration, label: 'Avg Duration'   },
      { iconName: 'fire',     id: 'sv-streak',   value: d.currentStreak,   label: 'Current Streak' },
      { iconName: 'trophy',   id: 'sv-longest',  value: d.longestStreak,   label: 'Longest Streak' },
      { iconName: 'star',     id: 'sv-best',     value: null,              label: 'Best Day', text: esc(d.mostProductiveDay) },
    ];

    el.innerHTML = `
      <div class="stats-grid">
        ${cards.map(c => `
          <div class="stat-card">
            <div class="stat-icon">${icon(c.iconName, 40)}</div>
            <div class="stat-value" id="${c.id}"
              style="${c.value === null ? 'font-size:1rem;padding-top:6px' : ''}">
              ${c.value === null ? c.text : '0'}
            </div>
            <div class="stat-label">${c.label}</div>
          </div>`).join('')}
      </div>`;

    // Animate numeric cards after the DOM is painted
    requestAnimationFrame(() => {
      cards.forEach(c => {
        if (c.value !== null) {
          animateCount(document.getElementById(c.id), c.value);
        }
      });
    });

    loadInsights(d);
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Weekly bar chart ───────────────────────────────────────────────────────────

async function loadWeeklyChart() {
  const el = document.getElementById('chart-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await fetchJSON('/api/stats/weekly');
    const days  = data.days; // [{ label, minutes, isToday }]
    const max   = Math.max(...days.map(d => d.minutes), 1);

    // Store target heights as data attributes; bars start at height 0
    const bars = days.map(d => {
      const heightPct  = d.minutes > 0
        ? Math.max(Math.round((d.minutes / max) * 100), 4)
        : 0;
      const todayClass = d.isToday ? ' bar-today' : '';
      return `
        <div class="bar-col">
          <div class="bar-val" id="bv-${d.label}">${d.minutes > 0 ? d.minutes : ''}</div>
          <div class="bar${todayClass}"
            style="height:0%;transition:none"
            data-target="${heightPct}"
            title="${d.label}: ${d.minutes} min"
            aria-label="${d.label}: ${d.minutes} minutes"></div>
          <div class="bar-label">${d.label}</div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="chart-card">
        <div class="chart-title">Focus minutes per day — this week</div>
        <div class="bar-chart">${bars}</div>
      </div>`;

    // Force a layout flush so height:0 is painted, then animate to target
    el.querySelectorAll('.bar').forEach(bar => {
      // Reading offsetHeight forces the browser to apply the height:0 style
      void bar.offsetHeight;
      bar.style.transition = 'height 0.7s cubic-bezier(0.22,1,0.36,1)';
      bar.style.height     = bar.dataset.target + '%';
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Chart unavailable: ${esc(err.message)}</div>`;
  }
}

// ── Insight cards ──────────────────────────────────────────────────────────────

/** Render contextual insight cards below the chart. */
function loadInsights(d) {
  const el = document.getElementById('insights-content');

  const streakMsg = d.currentStreak >= 7
    ? `You're on a ${d.currentStreak}-day streak — incredible focus! 🎉`
    : d.currentStreak >= 3
      ? `You're on a ${d.currentStreak}-day streak — keep the momentum going!`
      : d.currentStreak === 0
        ? 'Log a session today to start a new streak.'
        : `${d.currentStreak} day streak — one more to build momentum.`;

  const avgMsg = d.averageDuration >= 25
    ? `Great depth — your average session is ${d.averageDuration} min.`
    : `Your average is ${d.averageDuration} min. Try aiming for 25 min for deeper focus.`;

  const streakIcon = d.currentStreak >= 7 ? icon('rocket', 36) : d.currentStreak >= 3 ? icon('fire', 36) : icon('bulb', 36);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="insight-card">
        <h4>Streak</h4>
        <div class="insight-value" style="display:flex;align-items:center;gap:10px">${streakIcon} ${d.currentStreak} day${d.currentStreak !== 1 ? 's' : ''}</div>
        <div class="insight-sub">${streakMsg}</div>
      </div>
      <div class="insight-card">
        <h4>Avg Session</h4>
        <div class="insight-value" style="display:flex;align-items:center;gap:10px">${icon('clock', 36)} ${d.averageDuration} min</div>
        <div class="insight-sub">${avgMsg}</div>
      </div>
      <div class="insight-card" style="grid-column:1/-1">
        <h4>Most Productive Day</h4>
        <div class="insight-value" style="display:flex;align-items:center;gap:10px">${icon('star', 36)} ${esc(d.mostProductiveDay)}</div>
        <div class="insight-sub">
          Plan your deepest work sessions on ${esc(d.mostProductiveDay)}s for best results.
        </div>
      </div>
    </div>`;
}

// ── Init ───────────────────────────────────────────────────────────────────────
loadStats();
loadWeeklyChart();
