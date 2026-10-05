const API = '';

// ── Constants ─────────────────────────────────────────────────────────────────
const WORK_DURATION_MINS = 25;
const REST_DURATION_MINS = 5;
const RING_CIRCUMFERENCE = 2 * Math.PI * 90; // 565.49
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── State ─────────────────────────────────────────────────────────────────────
let isRunning        = false;
let isWorkMode       = true;
let remainingSeconds = WORK_DURATION_MINS * 60;
let totalSeconds     = WORK_DURATION_MINS * 60;
let timerInterval    = null;
let weekOffset       = 0;   // 0 = this week, -1 = last week, etc.

// ── DOM refs ──────────────────────────────────────────────────────────────────
const timerCard    = document.getElementById('timer-card');
const timerDisplay = document.getElementById('timer-display');
const modeLabel    = document.getElementById('mode-label');
const modeIcon     = document.getElementById('mode-icon');
const controlBtn   = document.getElementById('control-btn');
const controlLabel = document.getElementById('control-label');
const ringProgress = document.getElementById('ring-progress');
const ringDot      = document.getElementById('ring-dot');
const workModeBtn  = document.getElementById('work-mode-btn');
const restModeBtn  = document.getElementById('rest-mode-btn');

// ── ① CHIME — Web Audio API synthesized bell ──────────────────────────────────
let audioCtx = null;

/** Lazily create an AudioContext (requires user gesture first). */
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/** Play a soft two-tone bell chime. */
function playChime() {
  try {
    const ctx   = getAudioContext();
    const freqs = [523.25, 659.25]; // C5, E5
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type      = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 1.2);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 1.2);
    });
  } catch (_) {
    // Audio not available — fail silently
  }
}

// ── ② KEYBOARD SHORTCUTS ─────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  // Ignore when typing in an input field
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.code === 'Space') {
    e.preventDefault();
    getAudioContext(); // unlock audio on first keypress
    toggleTimer();
  } else if (e.code === 'KeyR') {
    resetTimer();
  } else if (e.code === 'KeyW') {
    if (!isWorkMode) switchMode(true);
  } else if (e.code === 'KeyB') {
    if (isWorkMode) switchMode(false);
  }
});

// ── ③ CONFETTI ────────────────────────────────────────────────────────────────
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx    = confettiCanvas.getContext('2d');
let confettiParticles = [];
let confettiRaf       = null;

const CONFETTI_COLORS = ['#6b8f6b','#4a6e4a','#2e4a2e','#a8d5a8','#ffffff','#ffd700','#ff9f43'];

/** Spawn a burst of confetti particles. */
function launchConfetti() {
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;

  confettiParticles = Array.from({ length: 120 }, () => ({
    x:      Math.random() * confettiCanvas.width,
    y:      -10 - Math.random() * 40,
    r:      4 + Math.random() * 6,
    color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    speedX: (Math.random() - 0.5) * 4,
    speedY: 2 + Math.random() * 4,
    angle:  Math.random() * 360,
    spin:   (Math.random() - 0.5) * 8,
    alpha:  1,
  }));

  if (confettiRaf) cancelAnimationFrame(confettiRaf);
  animateConfetti();
}

/** Animate confetti frame by frame. */
function animateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  let alive = false;

  confettiParticles.forEach(p => {
    p.x     += p.speedX;
    p.y     += p.speedY;
    p.angle += p.spin;
    p.alpha  = Math.max(0, p.alpha - 0.008);
    if (p.y < confettiCanvas.height + 20) alive = true;

    confettiCtx.save();
    confettiCtx.globalAlpha = p.alpha;
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.angle * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.8);
    confettiCtx.restore();
  });

  if (alive) {
    confettiRaf = requestAnimationFrame(animateConfetti);
  } else {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// ── Timer Core ────────────────────────────────────────────────────────────────

/** Format seconds into MM:SS string */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Update the SVG ring progress and rotating dot position */
function updateRing(remaining, total) {
  const fraction = remaining / total;
  const offset   = RING_CIRCUMFERENCE * (1 - fraction);
  ringProgress.style.strokeDashoffset = offset;

  const angle = (1 - fraction) * 360;
  const rad   = ((angle - 90) * Math.PI) / 180;
  ringDot.setAttribute('cx', (100 + 90 * Math.cos(rad)).toFixed(2));
  ringDot.setAttribute('cy', (100 + 90 * Math.sin(rad)).toFixed(2));
}

/** Tick the timer by one second */
function tick() {
  if (remainingSeconds <= 0) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning     = false;
    onTimerComplete();
    return;
  }
  remainingSeconds -= 1;
  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing(remainingSeconds, totalSeconds);
}

/** Handle timer reaching zero */
function onTimerComplete() {
  playChime();
  controlBtn.innerHTML     = '&#9654;';
  controlLabel.textContent = 'Start';

  if (isWorkMode) {
    const cycleComplete = advanceDot();
    if (cycleComplete) launchConfetti();
    // Show quick-log prompt if on timer page
    showQuickLogPrompt();
    switchMode(false);
    showBrowserNotification('Work session done!', 'Time for a short break. 🌿');
  } else {
    switchMode(true);
    showBrowserNotification('Break over!', 'Ready for the next focus session? 🍅');
  }
}

/** Start or pause the timer */
function toggleTimer() {
  if (isRunning) {
    clearInterval(timerInterval);
    timerInterval            = null;
    isRunning                = false;
    controlBtn.innerHTML     = '&#9654;';
    controlLabel.textContent = 'Resume';
  } else {
    isRunning                = true;
    controlBtn.innerHTML     = '&#9646;&#9646;';
    controlLabel.textContent = 'Pause';
    timerInterval            = setInterval(tick, 1000);
  }
}

/** Reset the timer to the start of the current mode */
function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning     = false;
  }
  remainingSeconds         = totalSeconds;
  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing(remainingSeconds, totalSeconds);
  controlBtn.innerHTML     = '&#9654;';
  controlLabel.textContent = 'Start';
}

// ── Mode Switching ─────────────────────────────────────────────────────────────

/** Switch between work and rest modes. */
function switchMode(toWork) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    isRunning     = false;
  }

  isWorkMode       = toWork;
  totalSeconds     = (toWork ? WORK_DURATION_MINS : REST_DURATION_MINS) * 60;
  remainingSeconds = totalSeconds;

  timerDisplay.textContent = formatTime(remainingSeconds);
  updateRing(remainingSeconds, totalSeconds);

  controlBtn.innerHTML     = '&#9654;';
  controlLabel.textContent = 'Start';

  if (toWork) {
    modeLabel.textContent = 'Work Mode';
    modeIcon.textContent  = '\u{1F4BB}';
    timerCard.classList.remove('rest-mode');
    workModeBtn.classList.add('active');
    restModeBtn.classList.remove('active');
  } else {
    modeLabel.textContent = 'Rest';
    modeIcon.textContent  = '\u{1F6BF}';
    timerCard.classList.add('rest-mode');
    restModeBtn.classList.add('active');
    workModeBtn.classList.remove('active');
  }
}

// ── Session Dots ──────────────────────────────────────────────────────────────

/**
 * Advance the active dot to done, activate the next.
 * Returns true when a full 4-dot cycle just completed.
 */
function advanceDot() {
  const dots       = document.querySelectorAll('#session-dots .dot');
  const activeIdx  = [...dots].findIndex(d => d.classList.contains('active'));

  if (activeIdx !== -1) {
    dots[activeIdx].classList.remove('active');
    dots[activeIdx].classList.add('done');
  }

  const nextIdx = activeIdx + 1;
  if (nextIdx < dots.length) {
    dots[nextIdx].classList.add('active');
    return false;
  }

  // Full cycle — reset
  dots.forEach((d, i) => {
    d.className = 'dot';
    if (i === 0) d.classList.add('active');
  });
  return true; // signals confetti
}

// ── Browser Notifications ─────────────────────────────────────────────────────

/** Request notification permission on first user gesture. */
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/** Show a browser notification if permission granted. */
function showBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// ── Event Listeners (timer controls) ─────────────────────────────────────────

controlBtn.addEventListener('click', () => {
  requestNotificationPermission();
  getAudioContext(); // unlock audio on first click
  toggleTimer();
});

workModeBtn.addEventListener('click', () => { if (!isWorkMode) switchMode(true); });
restModeBtn.addEventListener('click', () => { if (isWorkMode)  switchMode(false); });

// ── Nav Tabs ──────────────────────────────────────────────────────────────────

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    const panel = document.getElementById('panel-' + btn.dataset.tab);
    panel.classList.add('active');

    if (btn.dataset.tab === 'today')   loadToday();
    if (btn.dataset.tab === 'week')    loadWeek();
    if (btn.dataset.tab === 'stats')   loadStats();
    if (btn.dataset.tab === 'heatmap') loadHeatmap();
    if (btn.dataset.tab === 'report')  loadReport();
  });
});

// ── ⑤ MULTI-WEEK NAVIGATION ───────────────────────────────────────────────────

/** Return a YYYY-MM-DD string offset by `weeks` weeks from today. */
function getDateForWeekOffset(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d.toISOString().slice(0, 10);
}

document.getElementById('week-prev').addEventListener('click', () => {
  weekOffset -= 1;
  loadWeek();
});

document.getElementById('week-next').addEventListener('click', () => {
  if (weekOffset < 0) {
    weekOffset += 1;
    loadWeek();
  }
});

/** Update the week nav label and disable next button when on current week. */
function updateWeekNav(monday, sunday) {
  const label    = document.getElementById('week-nav-label');
  const nextBtn  = document.getElementById('week-next');
  nextBtn.disabled = weekOffset >= 0;

  if (weekOffset === 0) {
    label.textContent = 'This week';
  } else if (weekOffset === -1) {
    label.textContent = 'Last week';
  } else {
    label.textContent = `${monday} – ${sunday}`;
  }
}

// ── Log Form ──────────────────────────────────────────────────────────────────

document.getElementById('log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = document.getElementById('description').value.trim();
  const duration    = parseInt(document.getElementById('duration').value, 10);
  const msgEl       = document.getElementById('log-message');

  try {
    const res  = await fetch(API + '/api/sessions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ description, duration }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to log session.');
    showMessage(msgEl, 'success', `Logged: ${data.session.description} (${data.session.duration} min)`);
    document.getElementById('log-form').reset();
  } catch (err) {
    showMessage(msgEl, 'error', err.message);
  }
});

/** Display a temporary status message. */
function showMessage(el, type, text) {
  el.textContent = text;
  el.className   = `message ${type}`;
  setTimeout(() => { el.className = 'message hidden'; }, 4000);
}

// ── Today ─────────────────────────────────────────────────────────────────────

async function loadToday() {
  const el = document.getElementById('today-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const data = await fetchJSON('/api/sessions/today');
    if (data.sessions.length === 0) {
      el.innerHTML = '<div class="empty-card">No sessions today yet. Time to focus! &#127813;</div>';
      return;
    }
    let html = '<div class="sessions-card"><h3>Today\'s sessions</h3>';
    data.sessions.forEach(s => {
      html += `<div class="session-item">
        <span class="session-desc">${esc(s.description)}</span>
        <span class="session-dur">${s.duration} min</span>
      </div>`;
    });
    html += `<div class="total-row"><span>Total focus time</span><span>${data.totalMinutes} min · ${data.sessions.length} session(s)</span></div>`;
    html += '</div>';
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Week (with multi-week nav) ────────────────────────────────────────────────

async function loadWeek() {
  const el = document.getElementById('week-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const refDate = getDateForWeekOffset(weekOffset);
    const data    = await fetchJSON(`/api/sessions/week?date=${refDate}`);

    // Calculate Sunday from monday string
    const mondayDate = new Date(data.monday + 'T00:00:00.000Z');
    const sundayDate = new Date(mondayDate);
    sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
    const sundayStr = sundayDate.toISOString().slice(0, 10);

    updateWeekNav(data.monday, sundayStr);

    if (data.sessions.length === 0) {
      el.innerHTML = '<div class="empty-card">No sessions this week.</div>';
      return;
    }

    let html = '';
    const sortedDays = Object.keys(data.grouped).sort();
    sortedDays.forEach(day => {
      const list     = data.grouped[day];
      const dayTotal = list.reduce((sum, s) => sum + s.duration, 0);
      html += `<div class="day-header">
        <h4>${day}</h4>
        <span class="day-total-badge">${dayTotal} min</span>
      </div>
      <div class="sessions-card">`;
      list.forEach(s => {
        html += `<div class="session-item">
          <span class="session-desc">${esc(s.description)}</span>
          <span class="session-dur">${s.duration} min</span>
        </div>`;
      });
      html += '</div>';
    });
    html += `<div class="week-total-banner">Week Total: ${data.totalMinutes} min · ${data.sessions.length} session(s)</div>`;
    el.innerHTML = html;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function loadStats() {
  const el = document.getElementById('stats-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const d = await fetchJSON('/api/stats');
    if (d.totalSessions === 0) {
      el.innerHTML = '<div class="empty-card">No sessions yet. Log your first one!</div>';
      return;
    }
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">&#127813;</div>
          <div class="stat-value">${d.totalSessions}</div>
          <div class="stat-label">Total Sessions</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">&#9201;&#65039;</div>
          <div class="stat-value">${d.totalMinutes}</div>
          <div class="stat-label">Total Minutes</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">&#128336;</div>
          <div class="stat-value">${d.averageDuration}</div>
          <div class="stat-label">Avg Duration</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">&#128293;</div>
          <div class="stat-value">${d.currentStreak}</div>
          <div class="stat-label">Current Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">&#127942;</div>
          <div class="stat-value">${d.longestStreak}</div>
          <div class="stat-label">Longest Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">&#11088;</div>
          <div class="stat-value" style="font-size:1rem;padding-top:4px">${esc(d.mostProductiveDay)}</div>
          <div class="stat-label">Best Day</div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

// ── ④ HEATMAP ─────────────────────────────────────────────────────────────────

/** Map minutes to an intensity level 0–4. */
function minutesToLevel(mins) {
  if (mins === 0)  return 0;
  if (mins < 25)   return 1;
  if (mins < 50)   return 2;
  if (mins < 100)  return 3;
  return 4;
}

async function loadHeatmap() {
  const el = document.getElementById('heatmap-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const data  = await fetchJSON('/api/heatmap');
    const cells = data.heatmap; // array of { date, minutes } — 84 entries

    // Split into 12 columns of 7 days each
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    // Month labels — show month name on the first week of each month
    let monthLabelsHtml = '';
    weeks.forEach(week => {
      const firstDate  = new Date(week[0].date + 'T00:00:00.000Z');
      const monthLabel = firstDate.getUTCDate() <= 7
        ? MONTH_NAMES[firstDate.getUTCMonth()]
        : '';
      monthLabelsHtml += `<div class="heatmap-month-label">${monthLabel}</div>`;
    });

    // Grid cells
    let gridHtml = '';
    weeks.forEach(week => {
      gridHtml += '<div class="heatmap-week">';
      week.forEach(cell => {
        const level = minutesToLevel(cell.minutes);
        gridHtml += `<div class="heatmap-cell" data-level="${level}" data-date="${cell.date}" data-mins="${cell.minutes}"></div>`;
      });
      gridHtml += '</div>';
    });

    // Summary stats from the heatmap data
    const activeDays  = cells.filter(c => c.minutes > 0).length;
    const totalMins   = cells.reduce((s, c) => s + c.minutes, 0);
    const bestDay     = cells.reduce((best, c) => c.minutes > best.minutes ? c : best, { minutes: 0, date: '—' });

    el.innerHTML = `
      <div class="heatmap-card">
        <div class="heatmap-title">Last 12 weeks · daily focus minutes</div>
        <div class="heatmap-month-labels">${monthLabelsHtml}</div>
        <div class="heatmap-grid">${gridHtml}</div>
        <div class="heatmap-legend">
          Less
          <div class="heatmap-legend-cell" style="background:#e8f4e8"></div>
          <div class="heatmap-legend-cell" style="background:#b8ddb8"></div>
          <div class="heatmap-legend-cell" style="background:#7ab87a"></div>
          <div class="heatmap-legend-cell" style="background:#4a8c4a"></div>
          <div class="heatmap-legend-cell" style="background:#2e5c2e"></div>
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
            <div class="heatmap-stat-label">Best Day</div>
          </div>
        </div>
      </div>`;

    // Attach tooltip behaviour
    attachHeatmapTooltips(el);
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

/** Show a floating tooltip on heatmap cell hover. */
function attachHeatmapTooltips(container) {
  // Create tooltip element once
  let tip = document.getElementById('heatmap-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id        = 'heatmap-tooltip';
    tip.className = 'heatmap-tooltip';
    document.body.appendChild(tip);
  }

  container.querySelectorAll('.heatmap-cell').forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
      const mins = parseInt(cell.dataset.mins, 10);
      tip.textContent  = `${cell.dataset.date}: ${mins} min`;
      tip.style.display = 'block';
    });
    cell.addEventListener('mousemove', (e) => {
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top  = (e.clientY - 28) + 'px';
    });
    cell.addEventListener('mouseleave', () => {
      tip.style.display = 'none';
    });
  });
}

// ── Report ────────────────────────────────────────────────────────────────────

async function loadReport() {
  const el = document.getElementById('report-content');
  el.innerHTML = '<p class="loading">Loading...</p>';
  try {
    const res      = await fetch(API + '/api/report');
    const markdown = await res.text();
    el.innerHTML   = `<div class="report-pre-card"><pre class="report-pre">${esc(markdown)}</pre></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-card">Error: ${esc(err.message)}</div>`;
  }
}

document.getElementById('refresh-report').addEventListener('click', loadReport);

document.getElementById('download-report').addEventListener('click', async () => {
  try {
    const res      = await fetch(API + '/api/report');
    const markdown = await res.text();
    const blob     = new Blob([markdown], { type: 'text/markdown' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = `pomodoro-week-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed: ' + err.message);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch JSON from API and throw on non-OK responses. */
async function fetchJSON(path) {
  const res  = await fetch(API + path);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/** Escape HTML special characters to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── ⑥ VOICE COMMANDS (timer page) ────────────────────────────────────────────

(function setupTimerVoice() {
  // Only wire voice if the voice control button exists on this page
  const voiceTimerBtn    = document.getElementById('voice-timer-btn');
  const voiceTimerStatus = document.getElementById('voice-timer-status');
  if (!voiceTimerBtn) return;

  // Dynamically import voice module (ES module — timer.html loads app.js as plain script,
  // so we use a dynamic import to get the ES module functions)
  import('./voice.js').then(({ isSpeechSupported, createRecognition, parseTimerCommand }) => {
    if (!isSpeechSupported()) {
      voiceTimerBtn.style.display = 'none';
      return;
    }

    let listening   = false;
    let recognition = null;

    function setStatus(msg) {
      if (voiceTimerStatus) {
        voiceTimerStatus.textContent  = msg;
        voiceTimerStatus.style.display = msg ? 'block' : 'none';
      }
    }

    function handleVoiceCommand(transcript) {
      const action = parseTimerCommand(transcript);
      setStatus(`🎙️ "${transcript}" → ${action || 'no command matched'}`);
      setTimeout(() => setStatus(''), 3000);

      if (!action) return;
      if (action === 'start')     { if (!isRunning) toggleTimer(); }
      else if (action === 'pause')     { if (isRunning)  toggleTimer(); }
      else if (action === 'reset')     { resetTimer(); }
      else if (action === 'work-mode') { if (!isWorkMode) switchMode(true); }
      else if (action === 'rest-mode') { if (isWorkMode)  switchMode(false); }
    }

    voiceTimerBtn.addEventListener('click', () => {
      if (listening) {
        recognition.stop();
        return;
      }
      recognition = createRecognition({
        continuous: true,
        onStart() {
          listening = true;
          voiceTimerBtn.classList.add('mic-listening');
          voiceTimerBtn.setAttribute('aria-label', 'Stop voice control');
          setStatus('🎙️ Listening for commands…');
        },
        onResult(transcript) { handleVoiceCommand(transcript); },
        onEnd() {
          listening = false;
          voiceTimerBtn.classList.remove('mic-listening');
          voiceTimerBtn.setAttribute('aria-label', 'Start voice control');
          setStatus('');
        },
        onError(msg) {
          listening = false;
          voiceTimerBtn.classList.remove('mic-listening');
          setStatus(`❌ ${msg}`);
          setTimeout(() => setStatus(''), 4000);
        },
      });
      recognition.start();
    });
  }).catch(() => {
    // voice.js not available — fail silently
  });
})();

/** Show the quick-log card after a work session completes. */
function showQuickLogPrompt() {
  const area = document.getElementById('quick-log-area');
  if (!area) return;
  area.style.display = 'block';
  const input = document.getElementById('ql-description');
  if (input) input.focus();
}

/** Hide the quick-log card. */
function hideQuickLogPrompt() {
  const area = document.getElementById('quick-log-area');
  if (area) area.style.display = 'none';
}

// Wire quick-log save/skip if elements exist on this page
const qlSaveBtn = document.getElementById('ql-save-btn');
const qlSkipBtn = document.getElementById('ql-skip-btn');

if (qlSaveBtn) {
  qlSaveBtn.addEventListener('click', async () => {
    const descEl = document.getElementById('ql-description');
    const msgEl  = document.getElementById('ql-message');
    const desc   = descEl ? descEl.value.trim() : '';
    if (!desc) {
      msgEl.textContent = 'Please enter a description.';
      msgEl.className   = 'message error';
      return;
    }
    try {
      const res  = await fetch('/api/sessions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ description: desc, duration: WORK_DURATION_MINS }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      msgEl.textContent = `✅ Saved: "${data.session.description}"`;
      msgEl.className   = 'message success';
      setTimeout(hideQuickLogPrompt, 2000);
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className   = 'message error';
    }
  });
}

if (qlSkipBtn) {
  qlSkipBtn.addEventListener('click', hideQuickLogPrompt);
}

// ── Init ──────────────────────────────────────────────────────────────────────
updateRing(remainingSeconds, totalSeconds);
// Initialise week-next button state
document.getElementById('week-next').disabled = true;
