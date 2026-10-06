const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Calculate the sum of all session durations in minutes. */
export function totalMinutes(sessions) {
  return sessions.reduce((sum, s) => sum + s.duration, 0);
}

/** Calculate the average session duration. Returns 0 for an empty array. */
export function averageDuration(sessions) {
  if (sessions.length === 0) return 0;
  return Math.round(totalMinutes(sessions) / sessions.length);
}

/** Group sessions into an object keyed by YYYY-MM-DD date string. */
export function groupByDay(sessions) {
  return sessions.reduce((groups, session) => {
    const key = session.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(session);
    return groups;
  }, {});
}

/** Calculate the current streak: consecutive days up to and including today with at least one session. */
export function currentStreak(sessions, today) {
  if (sessions.length === 0) return 0;

  const daysWithSessions = new Set(sessions.map((s) => s.date));
  let streak = 0;
  const cursor = new Date(today + 'T00:00:00.000Z');

  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    if (!daysWithSessions.has(dateStr)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

/** Calculate the longest ever consecutive-day streak across all sessions. */
export function longestStreak(sessions) {
  if (sessions.length === 0) return 0;

  const sortedDates = [...new Set(sessions.map((s) => s.date))].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1] + 'T00:00:00.000Z');
    const curr = new Date(sortedDates[i] + 'T00:00:00.000Z');
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }

  return longest;
}

/** Find the day of week with the highest average total focus minutes. */
export function mostProductiveDay(sessions) {
  if (sessions.length === 0) return 'N/A';

  // Accumulate total minutes and count per day-of-week index
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);

  for (const session of sessions) {
    const dayIndex = new Date(session.date + 'T00:00:00.000Z').getUTCDay();
    totals[dayIndex] += session.duration;
    counts[dayIndex]++;
  }

  let bestDay = -1;
  let bestAverage = -1;

  for (let i = 0; i < 7; i++) {
    if (counts[i] === 0) continue;
    const avg = totals[i] / counts[i];
    if (avg > bestAverage) {
      bestAverage = avg;
      bestDay = i;
    }
  }

  return bestDay === -1 ? 'N/A' : DAY_NAMES[bestDay];
}

/**
 * Find the hour of day (0-23) with the most total focus minutes across all sessions.
 * Uses the startTime ISO string to extract the UTC hour.
 * Returns a human-readable string like "9 AM" or "N/A" if no sessions have startTime.
 */
export function mostProductiveHour(sessions) {
  if (sessions.length === 0) return 'N/A';

  const totals = Array(24).fill(0);

  for (const session of sessions) {
    if (!session.startTime) continue;
    const hour = new Date(session.startTime).getUTCHours();
    totals[hour] += session.duration;
  }

  let bestHour = -1;
  let bestTotal = 0;

  for (let h = 0; h < 24; h++) {
    if (totals[h] > bestTotal) {
      bestTotal = totals[h];
      bestHour = h;
    }
  }

  if (bestHour === -1) return 'N/A';

  // Format as "9 AM" / "2 PM"
  const period = bestHour < 12 ? 'AM' : 'PM';
  const displayHour = bestHour % 12 === 0 ? 12 : bestHour % 12;
  return `${displayHour} ${period}`;
}

/**
 * Returns a single object containing all key productivity stats for a session array.
 * Convenience wrapper used by the CLI stats command and the API /api/stats route.
 * @param {object[]} sessions - Array of session objects.
 * @param {string} today - Today's date as YYYY-MM-DD (used for currentStreak).
 * @returns {{ totalSessions: number, totalMinutes: number, averageDuration: number,
 *             currentStreak: number, longestStreak: number,
 *             mostProductiveDay: string, mostProductiveHour: string }}
 */
export function summary(sessions, today) {
  return {
    totalSessions:      sessions.length,
    totalMinutes:       totalMinutes(sessions),
    averageDuration:    averageDuration(sessions),
    currentStreak:      currentStreak(sessions, today),
    longestStreak:      longestStreak(sessions),
    mostProductiveDay:  mostProductiveDay(sessions),
    mostProductiveHour: mostProductiveHour(sessions),
  };
}
