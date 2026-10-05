/**
 * Pure rendering module for the 4-week streak calendar.
 * No CLI output — returns an array of lines ready to be printed.
 */

import chalk from 'chalk';

const CALENDAR_DAYS = 28;
const WEEKS = 4;

/** Build the array of 28 date strings starting from the Monday 3 weeks before the current week's Monday. */
function buildCalendarDates(today) {
  const todayDate = new Date(today + 'T00:00:00.000Z');
  const dayOfWeek = todayDate.getUTCDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startDate = new Date(todayDate);
  // Go back 3 full weeks from the current Monday
  startDate.setUTCDate(todayDate.getUTCDate() + diffToMonday - (WEEKS - 1) * 7);
  return Array.from({ length: CALENDAR_DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Format a single calendar cell as a coloured ● or ○ symbol. */
function formatCell(dateStr, today, activeDays) {
  const isToday = dateStr === today;
  const hasSession = activeDays.has(dateStr);
  if (isToday) return hasSession ? chalk.green.bold(' ● ') : chalk.red.bold(' ○ ');
  return hasSession ? chalk.green(' ● ') : chalk.gray(' ○ ');
}

/**
 * Render a 4-week streak calendar.
 * Returns an array of strings — one per line — ready to be joined and printed.
 * @param {string[]} sessionDates - Array of YYYY-MM-DD date strings with sessions.
 * @param {string} today - Today's date as YYYY-MM-DD.
 * @returns {string[]}
 */
export function renderStreakCalendar(sessionDates, today) {
  const activeDays = new Set(sessionDates);
  const dates = buildCalendarDates(today);
  const lines = [];

  lines.push(chalk.yellow.bold('\n  Last 28 days  (● = session logged, ○ = no session)\n'));
  lines.push(chalk.gray('  Mon  Tue  Wed  Thu  Fri  Sat  Sun'));

  let row = '  ';
  dates.forEach((dateStr, i) => {
    row += formatCell(dateStr, today, activeDays) + ' ';
    if ((i + 1) % 7 === 0) {
      lines.push(row);
      row = '  ';
    }
  });

  return lines;
}
