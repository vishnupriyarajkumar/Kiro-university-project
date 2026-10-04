import { mountNav } from '../nav.js';
mountNav('history');

const API        = '';
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
let weekOffset   = 0;

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

/** Return a YYYY-MM-DD string offset by `weeks` weeks from today. */
function dateForOffset(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d.toISOString().slice(0, 10);
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

async function loadToday() {
  const el = document.getElementById('today-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data = await fetchJSON('/api/sessions/today');
    if (data.sessions.length === 0) {
      el.innerHTML = '<div class="empty-card">No sessions today yet. <a href="/timer.html" style="color:var(--green-dark);font-weight:700">Start a timer</a>.</div>';
      return;
    }
    const items = data.sessions.map(s => `
      <div class="session-item">
        <div>
          <div class="session-desc">${esc(s.description)}</div>
          <div class="session-meta">${s.startTime.slice(11,16)} UTC</div>
        </div>
        <span class="session-dur">${s.duration} min</span>
      </div>`).join('');
    el.innerHTML = `<div class="sessions-card"><h3>Today — ${data.date}</h3>${items}
      <div class="total-row"><span>Total focus time</span><span>${data.totalMinutes} min · ${data.sessions.length} session(s)</span></div>
    </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Week (multi-week nav) ─────────────────────────────────────────────────────

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

    // Update nav label
    const navLabel = document.getElementById('week-nav-label');
    navLabel.textContent = weekOffset === 0 ? 'This week'
      : weekOffset === -1 ? 'Last week'
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
            <div class="session-meta">${s.startTime.slice(11,16)} UTC</div>
          </div>
          <span class="session-dur">${s.duration} min</span>
        </div>`).join('');
      html += `<div class="day-header"><h4>${day}</h4><span class="day-total-badge">${dayTotal} min</span></div>
               <div class="sessions-card">${dayItems}</div>`;
    });
    html += `<div class="week-total-banner">Week Total: ${data.totalMinutes} min · ${data.sessions.length} session(s)</div>`;
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

document.getElementById('week-prev').addEventListener('click', () => { weekOffset--; loadWeek(); });
document.getElementById('week-next').addEventListener('click', () => { if (weekOffset < 0) { weekOffset++; loadWeek(); } });

// ── Heatmap ───────────────────────────────────────────────────────────────────

function minutesToLevel(mins) {
  if (mins === 0) return 0;
  if (mins < 25)  return 1;
  if (mins < 50)  return 2;
  if (mins < 100) return 3;
  return 4;
}

async function loadHeatmap() {
  const el = document.getElementById('heatmap-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const data  = await fetchJSON('/api/heatmap');
    const cells = data.heatmap;

    // Group into 12 weeks of 7 days
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month labels
    const monthLabels = weeks.map(week => {
      const d = new Date(week[0].date + 'T00:00:00.000Z');
      return d.getUTCDate() <= 7 ? MONTH_NAMES[d.getUTCMonth()] : '';
    }).map(m => `<div class="heatmap-month-label">${m}</div>`).join('');

    // Grid
    const grid = weeks.map(week => {
      const dayCells = week.map(cell => {
        const lvl = minutesToLevel(cell.minutes);
        return `<div class="heatmap-cell" data-level="${lvl}" data-date="${cell.date}" data-mins="${cell.minutes}"></div>`;
      }).join('');
      return `<div class="heatmap-week">${dayCells}</div>`;
    }).join('');

    // Summary
    const activeDays = cells.filter(c => c.minutes > 0).length;
    const totalMins  = cells.reduce((s, c) => s + c.minutes, 0);
    const bestDay    = cells.reduce((b, c) => c.minutes > b.minutes ? c : b, { minutes: 0, date: '—' });

    el.innerHTML = `
      <div class="heatmap-card">
        <div class="heatmap-title">Last 12 weeks — daily focus minutes</div>
        <div class="heatmap-month-labels">${monthLabels}</div>
        <div class="heatmap-grid">${grid}</div>
        <div class="heatmap-legend">
          Less
          ${[0,1,2,3,4].map(l => `<div class="heatmap-legend-cell" style="background:${'#e8f4e8,#b8ddb8,#7ab87a,#4a8c4a,#2e5c2e'.split(',')[l]}"></div>`).join('')}
          More
        </div>
        <div class="heatmap-stats-row">
          <div class="heatmap-stat"><div class="heatmap-stat-value">${activeDays}</div><div class="heatmap-stat-label">Active Days</div></div>
          <div class="heatmap-stat"><div class="heatmap-stat-value">${totalMins}</div><div class="heatmap-stat-label">Total Mins</div></div>
          <div class="heatmap-stat"><div class="heatmap-stat-value">${bestDay.minutes}</div><div class="heatmap-stat-label">Best Day</div></div>
        </div>
      </div>`;

    // Tooltip
    const tip = document.getElementById('heatmap-tooltip');
    el.querySelectorAll('.heatmap-cell').forEach(cell => {
      cell.addEventListener('mouseenter', () => {
        tip.textContent   = `${cell.dataset.date}: ${cell.dataset.mins} min`;
        tip.style.display = 'block';
      });
      cell.addEventListener('mousemove', (e) => {
        tip.style.left = (e.clientX + 12) + 'px';
        tip.style.top  = (e.clientY - 28) + 'px';
      });
      cell.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
    });
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Init — load today by default ──────────────────────────────────────────────
loadToday();
