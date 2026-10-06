import { totalMinutes, averageDuration, groupByDay, currentStreak, longestStreak, mostProductiveDay } from '../../src/stats.js';

const makeSessions = (entries) =>
  entries.map(([date, duration], i) => ({
    id: String(i),
    date,
    duration,
    description: `Session ${i}`,
    completed: true,
    startTime: `${date}T09:00:00.000Z`,
  }));

describe('totalMinutes', () => {
  test('sums all session durations', () => {
    const sessions = makeSessions([['2026-10-01', 25], ['2026-10-01', 50]]);
    expect(totalMinutes(sessions)).toBe(75);
  });

  test('returns 0 for empty array', () => {
    expect(totalMinutes([])).toBe(0);
  });
});

describe('averageDuration', () => {
  test('returns correct average', () => {
    const sessions = makeSessions([['2026-10-01', 20], ['2026-10-01', 40]]);
    expect(averageDuration(sessions)).toBe(30);
  });

  test('returns 0 for empty array', () => {
    expect(averageDuration([])).toBe(0);
  });

  test('rounds to nearest integer', () => {
    const sessions = makeSessions([['2026-10-01', 25], ['2026-10-01', 25], ['2026-10-01', 26]]);
    expect(Number.isInteger(averageDuration(sessions))).toBe(true);
  });
});

describe('groupByDay', () => {
  test('groups sessions by their date key', () => {
    const sessions = makeSessions([
      ['2026-10-01', 25],
      ['2026-10-01', 30],
      ['2026-10-02', 25],
    ]);
    const grouped = groupByDay(sessions);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped['2026-10-01']).toHaveLength(2);
    expect(grouped['2026-10-02']).toHaveLength(1);
  });

  test('returns empty object for empty array', () => {
    expect(groupByDay([])).toEqual({});
  });
});

describe('currentStreak', () => {
  test('returns 0 when there are no sessions', () => {
    expect(currentStreak([], '2026-10-02')).toBe(0);
  });

  test('returns 1 when only today has a session', () => {
    const sessions = makeSessions([['2026-10-02', 25]]);
    expect(currentStreak(sessions, '2026-10-02')).toBe(1);
  });

  test('returns consecutive day count up to today', () => {
    const sessions = makeSessions([
      ['2026-10-01', 25],
      ['2026-10-02', 25],
      ['2026-10-03', 25],
    ]);
    expect(currentStreak(sessions, '2026-10-03')).toBe(3);
  });

  test('returns 0 when today has no session', () => {
    const sessions = makeSessions([['2026-10-01', 25]]);
    expect(currentStreak(sessions, '2026-10-03')).toBe(0);
  });

  test('breaks streak on a gap day', () => {
    const sessions = makeSessions([
      ['2026-10-01', 25],
      // gap on Oct 2
      ['2026-10-03', 25],
    ]);
    expect(currentStreak(sessions, '2026-10-03')).toBe(1);
  });
});

describe('longestStreak', () => {
  test('returns 0 for empty sessions', () => {
    expect(longestStreak([])).toBe(0);
  });

  test('returns 1 for a single session', () => {
    const sessions = makeSessions([['2026-10-01', 25]]);
    expect(longestStreak(sessions)).toBe(1);
  });

  test('counts consecutive days correctly', () => {
    const sessions = makeSessions([
      ['2026-10-01', 25],
      ['2026-10-02', 25],
      ['2026-10-03', 25],
      ['2026-10-05', 25], // gap
      ['2026-10-06', 25],
    ]);
    expect(longestStreak(sessions)).toBe(3);
  });

  test('handles multiple sessions on same day as one streak day', () => {
    const sessions = makeSessions([
      ['2026-10-01', 25],
      ['2026-10-01', 30],
      ['2026-10-02', 25],
    ]);
    expect(longestStreak(sessions)).toBe(2);
  });
});

describe('mostProductiveDay', () => {
  test('returns N/A for empty sessions', () => {
    expect(mostProductiveDay([])).toBe('N/A');
  });

  test('returns the day with highest average minutes', () => {
    const sessions = makeSessions([
      ['2026-10-05', 100], // Monday
      ['2026-10-06', 25],  // Tuesday
    ]);
    expect(mostProductiveDay(sessions)).toBe('Monday');
  });

  test('returns a valid day name', () => {
    const sessions = makeSessions([['2026-10-07', 25]]); // Wednesday
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    expect(validDays).toContain(mostProductiveDay(sessions));
  });
});

// ── summary() ─────────────────────────────────────────────────────────────────

import { summary } from '../../src/stats.js';

const SUMMARY_SESSIONS = [
  { id: 's1', date: '2026-10-03', duration: 25, startTime: '2026-10-03T09:00:00.000Z', description: 'A', completed: true },
  { id: 's2', date: '2026-10-04', duration: 30, startTime: '2026-10-04T09:00:00.000Z', description: 'B', completed: true },
  { id: 's3', date: '2026-10-05', duration: 45, startTime: '2026-10-05T14:00:00.000Z', description: 'C', completed: true },
];

describe('summary()', () => {
  test('returns an object with all seven expected keys', () => {
    const result = summary(SUMMARY_SESSIONS, '2026-10-05');
    expect(result).toHaveProperty('totalSessions');
    expect(result).toHaveProperty('totalMinutes');
    expect(result).toHaveProperty('averageDuration');
    expect(result).toHaveProperty('currentStreak');
    expect(result).toHaveProperty('longestStreak');
    expect(result).toHaveProperty('mostProductiveDay');
    expect(result).toHaveProperty('mostProductiveHour');
  });

  test('totalSessions equals the length of the input array', () => {
    expect(summary(SUMMARY_SESSIONS, '2026-10-05').totalSessions).toBe(3);
  });

  test('totalMinutes is the sum of all durations', () => {
    expect(summary(SUMMARY_SESSIONS, '2026-10-05').totalMinutes).toBe(100);
  });

  test('averageDuration is rounded correctly', () => {
    // 100 / 3 = 33.3 → rounds to 33
    expect(summary(SUMMARY_SESSIONS, '2026-10-05').averageDuration).toBe(33);
  });

  test('currentStreak is 3 when today is the last of three consecutive days', () => {
    expect(summary(SUMMARY_SESSIONS, '2026-10-05').currentStreak).toBe(3);
  });

  test('longestStreak is >= currentStreak', () => {
    const result = summary(SUMMARY_SESSIONS, '2026-10-05');
    expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak);
  });

  test('returns zeroed/N-A values for an empty session array', () => {
    const result = summary([], '2026-10-05');
    expect(result.totalSessions).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.averageDuration).toBe(0);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.mostProductiveDay).toBe('N/A');
    expect(result.mostProductiveHour).toBe('N/A');
  });

  test('summary is deterministic — same input produces same output', () => {
    const a = summary(SUMMARY_SESSIONS, '2026-10-05');
    const b = summary(SUMMARY_SESSIONS, '2026-10-05');
    expect(a).toEqual(b);
  });

  test('mostProductiveHour is a valid AM/PM string', () => {
    const result = summary(SUMMARY_SESSIONS, '2026-10-05');
    expect(result.mostProductiveHour).toMatch(/^\d{1,2} (AM|PM)$/);
  });
});
