import { mountNav } from '../nav.js';
mountNav('history');

const API         = '';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let weekOffset    = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Fetch JSON and throw on non-OK responses. */
async function fetchJSON(path) {
  const res  = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/** Return a YYYY-MM-DD string offset by `weeks` weeks from today. */
function dateForOffset(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d.toISOString().slice(0, 10);
}

/** Format a UTC time string as HH:MM local display. */
function fmtTime(isoString) {
  return isoString.slice(11, 16) + ' UTC';
}

// ── History sub-tabs ──────────────────────────────────────────────────────────

document.querySelectorAll('.history-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.history-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.history-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById('hpanel-' + btn.dataset.htab);
    panel.classList.add('active');

    if (btn.dataset.htab === 'today')   loadToday();
    if (btn.dataset.htab === 'week')    loadWeek();
    if (btn.dataset.htab === 'heatmap') loadHeatmap();
  });
});

// ── Today ─────────────────────────────────────────────────────────────────────

/** Load and render today's sessions. */
async function loadToday() {
  const el = document.getElementById('today-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await fetchJSON('/api/sessions/today');

    if (data.sessions.length === 0) {
      el.innerHTML = `<div class="empty-card">
        No sessions today yet.
        <a href="/timer.html" style="color:var(--brand-500);font-weight:700">Start a timer</a>.
      </div>`;
      return;
    }

    const items = data.sessions.map(s => `
      <div class="session-item">
        <div>
          <div class="session-desc">${esc(s.description)}</div>
          <div class="session-meta">${fmtTime(s.startTime)}</div>
        </div>
        <span class="session-dur">${s.duration} min</span>
      </div>`).join('');

    el.innerHTML = `
      <div class="sessions-card">
        <h3>Today — ${esc(data.date)}</h3>
        ${items}
        <div class="total-row">
          <span>Total focus time</span>
          <span>${data.totalMinutes} min · ${data.sessions.length} session(s)</span>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Week (multi-week nav) ─────────────────────────────────────────────────────

/** Load and render sessions for the currently selected week. */
async function loadWeek() {
  const el = document.getElementById('week-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const refDate = dateForOffset(weekOffset);
    const data    = await fetchJSON(`/api/sessions/week?date=${refDate}`);

    const mondayDate = new Date(data.monday + 'T00:00:00.000Z');
    const sundayDate = new Date(mondayDate);
    sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
    const sundayStr  = sundayDate.toISOString().slice(0, 10);

    // Update navigation label
    const navLabel = document.getElementById('week-nav-label');
    navLabel.textContent = weekOffset === 0
      ? 'This week'
      : weekOffset === -1
        ? 'Last week'
        : `${data.monday} – ${sundayStr}`;

    document.getElementById('week-next').disabled = weekOffset >= 0;

    if (data.sessions.length === 0) {
      el.innerHTML = '<div class="empty-card">No sessions this week.</div>';
      return;
    }

    let html = '';
    Object.keys(data.grouped).sort().forEach(day => {
      const list     = data.grouped[day];
      const dayTotal = list.reduce((s, x) => s + x.duration, 0);

      const dayItems = list.map(s => `
        <div class="session-item">
          <div>
            <div class="session-desc">${esc(s.description)}</div>
            <div class="session-meta">${fmtTime(s.startTime)}</div>
          </div>
          <span class="session-dur">${s.duration} min</span>
        </div>`).join('');

      html += `
        <div class="day-header">
          <h4>${esc(day)}</h4>
          <span class="day-total-badge">${dayTotal} min</span>
        </div>
        <div class="sessions-card">${dayItems}</div>`;
    });

    html += `<div class="week-total-banner">
      Week Total: ${data.totalMinutes} min · ${data.sessions.length} session(s)
    </div>`;

    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

document.getElementById('week-prev').addEventListener('click', () => { weekOffset--; loadWeek(); });
document.getElementById('week-next').addEventListener('click', () => {
  if (weekOffset < 0) { weekOffset++; loadWeek(); }
});

// ── Heatmap ───────────────────────────────────────────────────────────────────

/** Map total minutes to a heat level 0–4. */
function minutesToLevel(mins) {
  if (mins === 0)  return 0;
  if (mins < 25)   return 1;
  if (mins < 50)   return 2;
  if (mins < 100)  return 3;
  return 4;
}

/** Load and render the 12-week activity heatmap. */
async function loadHeatmap() {
  const el = document.getElementById('heatmap-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data  = await fetchJSON('/api/heatmap');
    const cells = data.heatmap;

    // Group into 12 columns of 7 days
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month label for the first cell of each column
    const monthLabels = weeks.map(week => {
      const d = new Date(week[0].date + 'T00:00:00.000Z');
      return d.getUTCDate() <= 7 ? MONTH_NAMES[d.getUTCMonth()] : '';
    }).map(m => `<div class="heatmap-month-label">${esc(m)}</div>`).join('');

    // Cell grid
    const grid = weeks.map(week => {
      const dayCells = week.map(cell => {
        const lvl = minutesToLevel(cell.minutes);
        return `<div class="heatmap-cell"
          data-level="${lvl}"
          data-date="${esc(cell.date)}"
          data-mins="${cell.minutes}"
          role="gridcell"
          aria-label="${cell.date}: ${cell.minutes} min"></div>`;
      }).join('');
      return `<div class="heatmap-week">${dayCells}</div>`;
    }).join('');

    // Summary numbers
    const activeDays = cells.filter(c => c.minutes > 0).length;
    const totalMins  = cells.reduce((s, c) => s + c.minutes, 0);
    const bestDay    = cells.reduce((b, c) => c.minutes > b.minutes ? c : b, { minutes: 0, date: '—' });

    const legendColors = ['#eef5ee', '#b8ddb8', '#7ab87a', '#4a8c4a', '#2e5c2e'];

    el.innerHTML = `
      <div class="heatmap-card">
        <div class="heatmap-title">Last 12 weeks — daily focus minutes</div>
        <div class="heatmap-month-labels">${monthLabels}</div>
        <div class="heatmap-grid" role="grid">${grid}</div>
        <div class="heatmap-legend">
          Less
          ${legendColors.map(c => `<div class="heatmap-legend-cell" style="background:${c}"></div>`).join('')}
          More
        </div>
        <div class="heatmap-stats-row">
          <div class="heatmap-stat">
            <div class="heatmap-stat-value">${activeDays}</div>
            <div class="heatmap-stat-label">Active Days</div>
          </div>
          <div class="heatmap-stat">
            <div class="heatmap-stat-value">${totalMins}</div>
            <div class="heatmap-stat-label">Total Mins</div>
          </div>
          <div class="heatmap-stat">
            <div class="heatmap-stat-value">${bestDay.minutes}</div>
            <div class="heatmap-stat-label">Best Day Mins</div>
          </div>
        </div>
      </div>`;

    // Wire up tooltip
    const tip = document.getElementById('heatmap-tooltip');
    el.querySelectorAll('.heatmap-cell').forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        const mins = parseInt(cell.dataset.mins, 10);
        tip.textContent   = `${cell.dataset.date}: ${mins} min`;
        tip.style.display = 'block';
      });
      cell.addEventListener('mousemove', (e) => {
        tip.style.left = (e.clientX + 14) + 'px';
        tip.style.top  = (e.clientY - 32) + 'px';
      });
      cell.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Init — load today by default ──────────────────────────────────────────────
loadToday();
