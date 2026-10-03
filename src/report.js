/** Pure formatting module for generating weekly Markdown reports. No file I/O or side effects. */

import { totalMinutes, averageDuration, groupByDay } from './stats.js';

/**
 * Returns the YYYY-MM-DD date string of the Monday of the ISO week
 * containing the given referenceDate string.
 */
export function getMondayDate(referenceDate) {
  const ref = new Date(referenceDate + 'T00:00:00.000Z');
  const day = ref.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

/**
 * Returns the YYYY-MM-DD date string of the Sunday of the ISO week
 * containing the given referenceDate string.
 */
export function getSundayDate(referenceDate) {
  const monday = new Date(getMondayDate(referenceDate) + 'T00:00:00.000Z');
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return sunday.toISOString().slice(0, 10);
}

// Half-up rounding: Math.floor(value + 0.5) makes the intent explicit
// (distinct from JS Math.round's "round half to even" for negative numbers)
function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

// Produces the ## Summary block from a sessions array
function buildSummarySection(sessions) {
  const total = totalMinutes(sessions);
  const count = sessions.length;
  const avg = count === 0 ? 0 : roundHalfUp(total / count);

  return [
    '## Summary',
    '',
    `- **Total focus time:** ${total} min`,
    `- **Total sessions:** ${count}`,
    `- **Average session duration:** ${avg} min`,
  ].join('\n');
}

// Produces the ## Daily Breakdown block from a sessions array
function buildDailyBreakdown(sessions) {
  const byDay = groupByDay(sessions);
  const sortedDays = Object.keys(byDay).sort();

  const dayBlocks = sortedDays.map(function formatDayBlock(day) {
    const daySessions = byDay[day].slice().sort(function byStartTime(a, b) {
      return a.startTime <= b.startTime ? -1 : 1;
    });
    const items = daySessions.map(function formatItem(s) {
      return `- ${s.description} — ${s.duration} min`;
    });
    return [`### ${day}`, '', ...items].join('\n');
  });

  return ['## Daily Breakdown', '', ...dayBlocks].join('\n\n');
}



/**
 * Generates a Markdown-formatted weekly report string from a sessions array
 * and a reference date string (YYYY-MM-DD). Returns a no-sessions message
 * when the array is empty.
 */
export function generateWeeklyReport(sessions, referenceDate) {
  const monday = getMondayDate(referenceDate);
  const sunday = getSundayDate(referenceDate);
  const heading = `# Weekly Focus Report: ${monday} – ${sunday}`;

  if (sessions.length === 0) {
    return `${heading}\n\nNo sessions were logged for this week.\n`;
  }

  return `${heading}\n\n${buildSummarySection(sessions)}\n\n${buildDailyBreakdown(sessions)}\n`;
}
