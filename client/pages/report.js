import { mountNav } from '../nav.js';
mountNav('report');

const API = '';

// ── State ─────────────────────────────────────────────────────────────────────
let currentMarkdown = '';
let viewMode        = 'rendered'; // 'rendered' | 'raw'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Minimal Markdown → HTML renderer covering the subset used by generateWeeklyReport().
 * Handles: h1–h3, bold, horizontal rules, unordered lists, plain paragraphs.
 */
function renderMarkdown(md) {
  const lines  = md.split('\n');
  const output = [];
  let inList   = false;

  for (const raw of lines) {
    const line = raw;

    if (line.startsWith('### ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
    } else if (line.startsWith('- ')) {
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
    } else if (/^---+$/.test(line.trim())) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<hr>');
    } else if (line.trim() === '') {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('');
    } else {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }
  if (inList) output.push('</ul>');
  return output.join('\n');
}

/** Process inline markdown: **bold** and `code`. */
function inlineMarkdown(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g,     '<code>$1</code>');
}

/** Render the report into the content area in the current viewMode. */
function renderReport() {
  const el = document.getElementById('report-content');
  if (!currentMarkdown) return;

  if (viewMode === 'rendered') {
    el.innerHTML = `
      <div class="report-pre-card">
        <div class="report-rendered">${renderMarkdown(currentMarkdown)}</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="report-pre-card">
        <pre class="report-pre">${esc(currentMarkdown)}</pre>
      </div>`;
  }
}

// ── Load report from API ───────────────────────────────────────────────────────

/** Fetch report markdown from the server and render it. */
async function loadReport() {
  const el = document.getElementById('report-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const res = await fetch(API + '/api/report');
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    currentMarkdown = await res.text();
    renderReport();
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Could not load report: ${esc(err.message)}</div>`;
  }
}

// ── Download ──────────────────────────────────────────────────────────────────

/** Download the current report markdown as a .md file. */
async function downloadReport() {
  try {
    const res = await fetch(API + '/api/report');
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

// ── View toggle ───────────────────────────────────────────────────────────────

document.getElementById('view-rendered').addEventListener('click', () => {
  viewMode = 'rendered';
  document.getElementById('view-rendered').classList.add('active');
  document.getElementById('view-raw').classList.remove('active');
  renderReport();
});

document.getElementById('view-raw').addEventListener('click', () => {
  viewMode = 'raw';
  document.getElementById('view-raw').classList.add('active');
  document.getElementById('view-rendered').classList.remove('active');
  renderReport();
});

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('refresh-btn').addEventListener('click', loadReport);
document.getElementById('download-btn').addEventListener('click', downloadReport);

// ── Init ──────────────────────────────────────────────────────────────────────
loadReport();
