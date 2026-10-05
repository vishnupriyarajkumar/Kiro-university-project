import { mountNav } from '../nav.js';
import {
  attachMicButton,
  isSpeechSupported,
  parseSessionPhrase,
  createRecognition,
} from '../voice.js';
mountNav('log');

const API = '';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape HTML to prevent XSS. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Show a temporary status message and auto-hide after 4 s. */
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

/** Highlight the matching preset pill for a given duration value. */
function syncPresetPills(value) {
  document.querySelectorAll('.preset-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.mins, 10) === value);
  });
}

// ── Natural Language Input ────────────────────────────────────────────────────

const nlInput    = document.getElementById('nl-input');
const nlPreview  = document.getElementById('nl-preview');
const nlChipDesc = document.getElementById('nl-chip-desc');
const nlChipDur  = document.getElementById('nl-chip-dur');
const nlBtnUse   = document.getElementById('nl-btn-use');
const nlBtnClear = document.getElementById('nl-btn-clear');
const nlCard     = document.getElementById('nl-card');

/** Current parsed result — updated on every keystroke. */
let nlParsed = { description: '', duration: null };

/**
 * Re-parse the NL input and refresh the live preview chips.
 * Shows the preview panel once the user has typed something.
 */
function updateNlPreview() {
  const raw = nlInput.value.trim();

  if (!raw) {
    nlPreview.classList.remove('visible');
    nlInput.classList.remove('nl-has-result');
    nlBtnUse.disabled = true;
    return;
  }

  nlParsed = parseSessionPhrase(raw);
  const { description, duration } = nlParsed;

  // Description chip
  if (description && description.length > 0) {
    nlChipDesc.textContent = description;
    nlChipDesc.classList.remove('missing');
  } else {
    nlChipDesc.textContent = 'Could not parse — try rephrasing';
    nlChipDesc.classList.add('missing');
  }

  // Duration chip
  if (duration !== null) {
    nlChipDur.textContent = `${duration} min`;
    nlChipDur.classList.remove('missing');
  } else {
    nlChipDur.textContent = 'Not detected — will use 25 min default';
    nlChipDur.classList.add('missing');
  }

  // Enable "Use this" only when description is non-empty
  const canUse = description && description.length > 0;
  nlBtnUse.disabled = !canUse;
  nlInput.classList.toggle('nl-has-result', canUse);
  nlPreview.classList.add('visible');
}

/**
 * Apply the parsed result to the manual form fields.
 * Scrolls to the form so the user can review and submit.
 */
function applyNlResult() {
  const { description, duration } = nlParsed;
  if (!description) return;

  const descInput = document.getElementById('description');
  const durInput  = document.getElementById('duration');

  // Fill description
  descInput.value = description;
  descInput.classList.remove('input-invalid');
  descInput.classList.add('input-valid');
  document.getElementById('description-error').classList.add('hidden');

  // Fill duration — fall back to 25 if not parsed
  const finalDur = (duration !== null && duration >= 1 && duration <= 120) ? duration : 25;
  durInput.value = finalDur;
  durInput.classList.remove('input-invalid');
  durInput.classList.add('input-valid');
  document.getElementById('duration-error').classList.add('hidden');
  syncPresetPills(finalDur);

  // Flash the NL card to confirm, then scroll to the form
  nlCard.classList.remove('flash-success');
  void nlCard.offsetWidth; // force reflow to restart animation
  nlCard.classList.add('flash-success');

  document.querySelector('.log-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  descInput.focus();
}

/** Clear NL input and hide the preview. */
function clearNlInput() {
  nlInput.value = '';
  nlParsed      = { description: '', duration: null };
  nlPreview.classList.remove('visible');
  nlInput.classList.remove('nl-has-result');
  nlBtnUse.disabled = true;
  nlInput.focus();
}

// Debounce — avoid re-parsing on every single keypress
let nlDebounce = null;
nlInput.addEventListener('input', () => {
  clearTimeout(nlDebounce);
  nlDebounce = setTimeout(updateNlPreview, 180);
});

// Also parse immediately on Enter so power users can hit Enter → Enter
nlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(nlDebounce);
    updateNlPreview();
    if (!nlBtnUse.disabled) applyNlResult();
  }
});

nlBtnUse.addEventListener('click', applyNlResult);
nlBtnClear.addEventListener('click', clearNlInput);

// Example prompt pills — click to populate the input
document.getElementById('nl-examples').addEventListener('click', (e) => {
  const pill = e.target.closest('.nl-example-pill');
  if (!pill) return;
  nlInput.value = pill.dataset.text;
  nlInput.focus();
  updateNlPreview();
});

// ── NL Mic button ─────────────────────────────────────────────────────────────

/** Wire the mic button on the NL card for voice → NL input. */
function setupNlMic() {
  const btn = document.getElementById('nl-mic-btn');
  if (!btn) return;

  if (!isSpeechSupported()) {
    btn.style.display = 'none';
    return;
  }

  let recognition = null;
  let listening   = false;

  btn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
      return;
    }

    recognition = createRecognition({
      onStart() {
        listening = true;
        btn.classList.add('mic-listening');
        btn.setAttribute('aria-label', 'Stop listening');
      },
      onResult(transcript) {
        // Drop the transcript straight into the NL input and parse it
        nlInput.value = transcript;
        updateNlPreview();
      },
      onEnd() {
        listening = false;
        btn.classList.remove('mic-listening');
        btn.setAttribute('aria-label', 'Speak your session');
      },
      onError(msg) {
        listening = false;
        btn.classList.remove('mic-listening');
        // Show error briefly in the preview area
        nlChipDesc.textContent = `❌ ${msg}`;
        nlChipDesc.classList.add('missing');
        nlPreview.classList.add('visible');
        setTimeout(() => {
          if (!nlInput.value.trim()) nlPreview.classList.remove('visible');
        }, 4000);
      },
    });
    recognition.start();
  });
}

// ── Manual form mic button ────────────────────────────────────────────────────

/** Wire the mic button on the manual form description field. */
function setupFormVoiceInput() {
  const descInput   = document.getElementById('description');
  const durInput    = document.getElementById('duration');
  const voiceBtn    = document.getElementById('voice-btn');
  const voiceStatus = document.getElementById('voice-status');

  if (!voiceBtn) return;
  if (!isSpeechSupported()) { voiceBtn.style.display = 'none'; return; }

  attachMicButton(voiceBtn, descInput, {
    statusEl: voiceStatus,
    onParsed({ description, duration }) {
      if (description) {
        descInput.value = description;
        descInput.dispatchEvent(new Event('input'));
      }
      if (duration !== null && duration >= 1 && duration <= 120) {
        durInput.value = duration;
        durInput.dispatchEvent(new Event('input'));
        syncPresetPills(duration);
      }
    },
  });
}

// ── Recent sessions ───────────────────────────────────────────────────────────

/** Load and render the 10 most recent sessions. */
async function loadRecent() {
  const el = document.getElementById('recent-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const [todayData, weekData] = await Promise.all([
      fetch(API + '/api/sessions/today').then(r => r.json()),
      fetch(API + '/api/sessions/week').then(r => r.json()),
    ]);

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

// ── Log form submit ───────────────────────────────────────────────────────────

document.getElementById('log-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl       = document.getElementById('log-message');
  const description = document.getElementById('description').value.trim();
  const duration    = parseInt(document.getElementById('duration').value, 10);

  try {
    const session = await postSession(description, duration);
    showMessage(msgEl, 'success', `✅ Logged: "${session.description}" — ${session.duration} min`);

    // Reset both the manual form and the NL input
    document.getElementById('log-form').reset();
    syncPresetPills(25);
    document.getElementById('duration').value = 25;
    clearNlInput();

    loadRecent();
  } catch (err) {
    showMessage(msgEl, 'error', err.message);
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
setupNlMic();
setupFormVoiceInput();
loadRecent();
