/**
 * Shared Web Speech API module.
 * Provides:
 *   - createRecognition()     start/stop a speech recognition session
 *   - parseDuration(text)     extract minutes from natural language
 *   - parseSessionPhrase(text) extract { description, duration } from a phrase
 *   - attachMicButton(btn, inputEl, opts) wire a mic button to an input
 *   - isSpeechSupported()     feature-detect
 */

// ── Feature detection ─────────────────────────────────────────────────────────

/** Returns true if the browser supports Web Speech API. */
export function isSpeechSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

// ── Core recognition factory ──────────────────────────────────────────────────

/**
 * Create and configure a SpeechRecognition instance.
 * @param {object} opts
 * @param {string}   [opts.lang='en-US']
 * @param {boolean}  [opts.continuous=false]
 * @param {function} opts.onResult   called with the final transcript string
 * @param {function} [opts.onStart]  called when mic opens
 * @param {function} [opts.onEnd]    called when mic closes
 * @param {function} [opts.onError]  called with error message string
 */
export function createRecognition({ lang = 'en-US', continuous = false, onResult, onStart, onEnd, onError } = {}) {
  if (!isSpeechSupported()) return null;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang        = lang;
  recognition.continuous  = continuous;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (onResult) onResult(transcript);
  };

  recognition.onstart = () => { if (onStart) onStart(); };
  recognition.onend   = () => { if (onEnd)   onEnd();   };
  recognition.onerror = (event) => {
    const msg = event.error === 'not-allowed'
      ? 'Microphone access denied. Please allow mic permission.'
      : `Speech error: ${event.error}`;
    if (onError) onError(msg);
  };

  return recognition;
}

// ── Natural language parsers ──────────────────────────────────────────────────

/**
 * Extract a duration in minutes from a natural language phrase.
 * Handles many patterns including:
 *   "25 minutes", "30 mins", "half an hour", "1 hour", "one hour",
 *   "about 50 mins", "roughly 45 min", "around 2 pomodoros",
 *   "2 pomodoros", "3 poms", "spent 30 minutes", "took about an hour"
 * Returns null if no duration found.
 */
export function parseDuration(text) {
  const lower = text.toLowerCase();

  // Word-to-number map for spoken and typed numbers
  const WORD_NUMS = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
    'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
    'forty-five': 45, 'forty five': 45, 'fifty': 50, 'sixty': 60,
    'seventy': 70, 'eighty': 80, 'ninety': 90,
  };

  // Fuzzy prefix words that precede a time expression
  const FUZZY = '(?:about|around|roughly|approximately|nearly|almost|over|just|~)?\\s*';

  // "half an hour" → 30
  if (/half\s+an?\s+hour/.test(lower)) return 30;

  // "took about an hour" / "an hour" → 60
  if (/\ban\s+hour\b/.test(lower)) return 60;

  // "a pomodoro" → 25
  if (/\ba\s+pomodoro\b/.test(lower)) return 25;

  // "2 pomodoros", "3 poms", "two pomodoros" → N * 25
  const pomDigit = lower.match(new RegExp(`${FUZZY}(\\d+)\\s*(?:pomodoros?|poms?)`));
  if (pomDigit) return Math.min(parseInt(pomDigit[1], 10) * 25, 120);

  for (const [word, val] of Object.entries(WORD_NUMS)) {
    const pattern = new RegExp(`${FUZZY}${word}\\s+(?:pomodoros?|poms?)`);
    if (pattern.test(lower)) return Math.min(val * 25, 120);
  }

  // "1 hour", "1.5 hours", "about 2 hours" → minutes
  const hourDigit = lower.match(new RegExp(`${FUZZY}(\\d+(?:\\.\\d+)?)\\s*hours?`));
  if (hourDigit) return Math.min(Math.round(parseFloat(hourDigit[1]) * 60), 120);

  // word-based hours: "one hour", "about two hours"
  for (const [word, val] of Object.entries(WORD_NUMS)) {
    const pattern = new RegExp(`${FUZZY}${word}\\s+hours?`);
    if (pattern.test(lower)) return Math.min(val * 60, 120);
  }

  // "25 minutes", "25 mins", "25 min" (with optional fuzzy prefix)
  const minDigit = lower.match(new RegExp(`${FUZZY}(\\d+)\\s*(?:minutes?|mins?|m\\b)`));
  if (minDigit) return parseInt(minDigit[1], 10);

  // word-based minutes: "thirty minutes", "about twenty mins"
  for (const [word, val] of Object.entries(WORD_NUMS)) {
    const pattern = new RegExp(`${FUZZY}${word}\\s+(?:minutes?|mins?)`);
    if (pattern.test(lower)) return val;
  }

  // "spent X", "took X", "for X" bare number at end: "worked on X for 25"
  const bareMatch = lower.match(/(?:spent|took|for|~)\s+(\d+)\s*$/);
  if (bareMatch) return parseInt(bareMatch[1], 10);

  return null;
}

/**
 * Parse a full natural language session phrase into { description, duration }.
 *
 * Examples:
 *   "Working on UI design for 25 minutes"        → { description: "Working on UI design", duration: 25 }
 *   "just finished 2 pomodoros on the auth bug"  → { description: "just finished on the auth bug", duration: 50 }
 *   "spent about 50 mins on code review"         → { description: "code review", duration: 50 }
 *   "deep work on backend for roughly an hour"   → { description: "deep work on backend", duration: 60 }
 *   "debugging the login flow"                   → { description: "debugging the login flow", duration: null }
 */
export function parseSessionPhrase(text) {
  const duration    = parseDuration(text);
  let   description = text;

  if (duration !== null) {
    // Ordered from most-specific to least-specific to avoid partial matches
    const STRIP_PATTERNS = [
      // "spent about 50 mins on" → strip "spent about 50 mins on"
      /^\s*(?:spent|took)\s+(?:about|around|roughly|approximately|nearly|almost|over|just)?\s*\d+(?:\.\d+)?\s*(?:hours?|minutes?|mins?|m\b)\s+(?:on\s+)?/i,
      // "for about 25 minutes" at the end
      /\s+for\s+(?:about|around|roughly|approximately|nearly|almost|over|just)?\s*\d+(?:\.\d+)?\s*(?:hours?|minutes?|mins?|m\b)\s*$/i,
      // "for about an hour" / "for half an hour"
      /\s+for\s+(?:about|around|roughly)?\s*(?:an?\s+hour|half\s+an?\s+hour)\s*$/i,
      // "about 50 mins on" at start
      /^\s*(?:about|around|roughly|approximately)?\s*\d+(?:\.\d+)?\s*(?:hours?|minutes?|mins?|m\b)\s+(?:on\s+)?/i,
      // "2 pomodoros on" → strip pomodoro count
      /\s*(?:about|around|roughly)?\s*\d+\s*(?:pomodoros?|poms?)\s*(?:on\s+)?/i,
      /\s*(?:a\s+)?pomodoro\s*(?:on\s+)?/i,
      // bare "30 mins" or "25 min" anywhere
      /\s+(?:about|around|roughly)?\s*\d+(?:\.\d+)?\s*(?:hours?|minutes?|mins?|m\b)/i,
      // "half an hour"
      /\s+half\s+an?\s+hour/i,
      // "an hour"
      /\s+an?\s+hour/i,
    ];

    for (const pattern of STRIP_PATTERNS) {
      const stripped = description.replace(pattern, ' ');
      if (stripped.trim().length > 0) {
        description = stripped;
      }
    }
  }

  // Strip filler openers: "just finished", "spent time on", "did some", "worked on"
  description = description
    .replace(/^\s*(?:just\s+)?(?:finished|completed|done with|spent\s+(?:time\s+)?(?:on)?|worked\s+on|did\s+(?:some\s+)?|had\s+a\s+session\s+(?:on\s+)?)/i, '')
    .replace(/^[,.\-–\s]+|[,.\-–\s]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Capitalise first letter
  if (description.length > 0) {
    description = description.charAt(0).toUpperCase() + description.slice(1);
  }

  return { description, duration };
}

// ── Mic button factory ────────────────────────────────────────────────────────

/**
 * Attach voice input behaviour to a mic button element.
 * When the button is clicked, starts listening and fills the target input.
 *
 * @param {HTMLButtonElement} btn       - the mic button
 * @param {HTMLInputElement}  inputEl   - the input to fill
 * @param {object}            opts
 * @param {function} [opts.onTranscript]  called with raw transcript before filling
 * @param {function} [opts.onParsed]      called with { description, duration } if session parse is wanted
 * @param {HTMLElement} [opts.statusEl]   element to show listening status in
 */
export function attachMicButton(btn, inputEl, { onTranscript, onParsed, statusEl } = {}) {
  if (!isSpeechSupported()) {
    btn.title    = 'Voice input not supported in this browser';
    btn.disabled = true;
    btn.style.opacity = '0.4';
    return;
  }

  let recognition = null;
  let listening   = false;

  function setStatus(msg) {
    if (statusEl) { statusEl.textContent = msg; statusEl.style.display = msg ? 'block' : 'none'; }
  }

  function startListening() {
    recognition = createRecognition({
      onStart() {
        listening = true;
        btn.classList.add('mic-listening');
        btn.setAttribute('aria-label', 'Stop listening');
        setStatus('🎙️ Listening…');
      },
      onResult(transcript) {
        if (onTranscript) onTranscript(transcript);
        if (onParsed) {
          const parsed = parseSessionPhrase(transcript);
          onParsed(parsed, transcript);
        } else {
          inputEl.value = transcript;
          inputEl.dispatchEvent(new Event('input'));
        }
        setStatus(`✅ Heard: "${transcript}"`);
        setTimeout(() => setStatus(''), 3000);
      },
      onEnd() {
        listening = false;
        btn.classList.remove('mic-listening');
        btn.setAttribute('aria-label', 'Start voice input');
      },
      onError(msg) {
        listening = false;
        btn.classList.remove('mic-listening');
        setStatus(`❌ ${msg}`);
        setTimeout(() => setStatus(''), 4000);
      },
    });
    recognition.start();
  }

  function stopListening() {
    if (recognition) { recognition.stop(); recognition = null; }
    listening = false;
    btn.classList.remove('mic-listening');
    setStatus('');
  }

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (listening) { stopListening(); } else { startListening(); }
  });
}

// ── Timer voice command parser ────────────────────────────────────────────────

const TIMER_COMMANDS = [
  { pattern: /\b(start|begin|go|resume|play)\b/i,   action: 'start'      },
  { pattern: /\b(pause|stop|hold|wait)\b/i,          action: 'pause'      },
  { pattern: /\b(reset|restart|again)\b/i,           action: 'reset'      },
  { pattern: /\b(work|focus|pomodoro)\b/i,           action: 'work-mode'  },
  { pattern: /\b(break|rest|relax)\b/i,              action: 'rest-mode'  },
];

/**
 * Match a spoken phrase to a timer command.
 * Returns the action string or null if no match.
 */
export function parseTimerCommand(text) {
  for (const { pattern, action } of TIMER_COMMANDS) {
    if (pattern.test(text)) return action;
  }
  return null;
}
