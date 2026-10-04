import { mountNav } from '../nav.js';
mountNav('log');

const API = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Show a temporary status message inside an element. */
function showMessage(el, type, text) {
  el.textContent = text;
  el.className   = `message ${type}`;
  setTimeout(() => { el.className = 'message hidden'; }, 4000);
}

/** POST a new session to the API. */
async function postSession(description, duration) {
  const res  = await fetch(API + '/api/sessions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ description, duration }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to log session.');
  return data.session;
}

// ── Recent sessions list ──────────────────────────────────────────────────────

/** Load and render the last 10 sessions (today + this week combined). */
async function loadRecent() {
  const el = document.getElementById('recent-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const [todayData, weekData] = await Promise.all([
      fetch(API + '/api/sessions/today').then(r => r.json()),
      fetch(API + '/api/sessions/week').then(r => r.json()),
    ]);

    // Merge, deduplicate by id, sort newest first, take 10
    const seen = new Set();
    const all  = [...todayData.sessions, ...weekData.sessions]
      .filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; })
      .sort((a, b) => b.startTime.localeCompare(a.startTime))
      .slice(0, 10);

    if (all.length === 0) {
      el.innerHTML = '<div class="empty-card">No sessions yet — log your first one above! 🍅</div>';
      return;
    }

    const items = all.map(s => `
      <div class="session-item">
        <div>
          <div class="session-desc">${esc(s.description)}</div>
          <div class="session-meta">${s.date} · ${s.startTime.slice(11, 16)} UTC</div>
        </div>
        <span class="session-dur">${s.duration} min</span>
      </div>`).join('');

    el.innerHTML = `<div class="sessions-card"><h3>Recent sessions</h3>${items}</div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error loading sessions: ${esc(err.message)}</div>`;
  }
}

// ── Log form ──────────────────────────────────────────────────────────────────

document.getElementById('log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl       = document.getElementById('log-message');
  const description = document.getElementById('description').value.trim();
  const duration    = parseInt(document.getElementById('duration').value, 10);

  try {
    const session = await postSession(description, duration);
    showMessage(msgEl, 'success', `✅ Logged: "${session.description}" — ${session.duration} min`);
    document.getElementById('log-form').reset();
    loadRecent(); // refresh list
  } catch (err) {
    showMessage(msgEl, 'error', err.message);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadRecent();
