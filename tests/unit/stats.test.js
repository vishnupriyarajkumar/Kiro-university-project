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
