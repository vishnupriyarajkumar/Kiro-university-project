import { mountNav } from '../nav.js';
mountNav('report');

const API = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Load & render report ──────────────────────────────────────────────────────

async function loadReport() {
  const el = document.getElementById('report-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const res      = await fetch(API + '/api/report');
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const markdown = await res.text();
    el.innerHTML   = `<div class="report-pre-card"><pre class="report-pre">${esc(markdown)}</pre></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Could not load report: ${esc(err.message)}</div>`;
  }
}

// ── Download ──────────────────────────────────────────────────────────────────

async function downloadReport() {
  try {
    const res      = await fetch(API + '/api/report');
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const markdown = await res.text();
    const blob     = new Blob([markdown], { type: 'text/markdown' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `pomodoro-week-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed: ' + err.message);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', loadReport);
document.getElementById('download-btn').addEventListener('click', downloadReport);

// ── Init ──────────────────────────────────────────────────────────────────────
loadReport();
