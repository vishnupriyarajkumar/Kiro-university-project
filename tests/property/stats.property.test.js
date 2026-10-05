import fc from 'fast-check';
import {
  totalMinutes,
  averageDuration,
  mostProductiveDay,
  mostProductiveHour,
  groupByDay,
  longestStreak,
  currentStreak,
} from '../../src/stats.js';

// ── Arbitraries ───────────────────────────────────────────────────────────────

const validDuration = fc.integer({ min: 1, max: 120 });

const dateString = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2026-12-31'),
}).map((d) => d.toISOString().slice(0, 10));

const sessionArb = fc.record({
  id: fc.uuid(),
  description: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  duration: validDuration,
  date: dateString,
  completed: fc.constant(true),
  startTime: dateString.map((d) => `${d}T09:00:00.000Z`),
});

const sessionsArb = fc.array(sessionArb, { maxLength: 50 });
const nonEmptySessionsArb = fc.array(sessionArb, { minLength: 1, maxLength: 50 });

// ── totalMinutes ──────────────────────────────────────────────────────────────

describe('Property: totalMinutes', () => {
  test('is always non-negative', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => totalMinutes(sessions) >= 0)
    );
  });

  test('equals zero for an empty array', () => {
    expect(totalMinutes([])).toBe(0);
  });

  test('is commutative — order of sessions does not change the total', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const shuffled = [...sessions].sort(() => 0.5 - Math.random());
        return totalMinutes(sessions) === totalMinutes(shuffled);
      })
    );
  });

  test('splitting an array and summing both halves equals totalMinutes of the whole', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const half = Math.floor(sessions.length / 2);
        const a = sessions.slice(0, half);
        const b = sessions.slice(half);
        return totalMinutes(a) + totalMinutes(b) === totalMinutes(sessions);
      })
    );
  });
});

// ── averageDuration ───────────────────────────────────────────────────────────

describe('Property: averageDuration', () => {
  test('returns 0 for an empty array', () => {
    expect(averageDuration([])).toBe(0);
  });

  test('is always a non-negative integer', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const avg = averageDuration(sessions);
        return avg >= 0 && Number.isInteger(avg);
      })
    );
  });

  test('is always between the minimum and maximum duration in the array', () => {
    fc.assert(
      fc.property(nonEmptySessionsArb, (sessions) => {
        const avg = averageDuration(sessions);
        const min = Math.min(...sessions.map((s) => s.duration));
        const max = Math.max(...sessions.map((s) => s.duration));
        return avg >= min && avg <= max;
      })
    );
  });

  test('equals the single session duration when there is exactly one session', () => {
    fc.assert(
      fc.property(sessionArb, (session) => {
        return averageDuration([session]) === session.duration;
      })
    );
  });
});

// ── groupByDay ────────────────────────────────────────────────────────────────

describe('Property: groupByDay', () => {
  test('every key in the result is a valid YYYY-MM-DD string', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const grouped = groupByDay(sessions);
        return Object.keys(grouped).every((k) => /^\d{4}-\d{2}-\d{2}$/.test(k));
      })
    );
  });

  test('total sessions across all groups equals original array length', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const grouped = groupByDay(sessions);
        const count = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
        return count === sessions.length;
      })
    );
  });

  test('every session in a group has the same date as the group key', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const grouped = groupByDay(sessions);
        return Object.entries(grouped).every(([date, group]) =>
          group.every((s) => s.date === date)
        );
      })
    );
  });
});

// ── mostProductiveDay ─────────────────────────────────────────────────────────

describe('Property: mostProductiveDay', () => {
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  test('returns N/A for an empty array', () => {
    expect(mostProductiveDay([])).toBe('N/A');
  });

  test('always returns a valid day name or N/A', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const result = mostProductiveDay(sessions);
        return result === 'N/A' || DAY_NAMES.includes(result);
      })
    );
  });
});

// ── mostProductiveHour ────────────────────────────────────────────────────────

describe('Property: mostProductiveHour', () => {
  test('returns N/A for an empty array', () => {
    expect(mostProductiveHour([])).toBe('N/A');
  });

  test('returns N/A when no sessions have a startTime', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({ id: fc.uuid(), description: fc.constant('x'), duration: validDuration, date: dateString, completed: fc.constant(true) }),
          { minLength: 1, maxLength: 10 }
        ),
        (sessions) => mostProductiveHour(sessions) === 'N/A'
      )
    );
  });

  test('result always matches AM/PM format when sessions have startTime', () => {
    fc.assert(
      fc.property(nonEmptySessionsArb, (sessions) => {
        const result = mostProductiveHour(sessions);
        return result === 'N/A' || /^\d{1,2} (AM|PM)$/.test(result);
      })
    );
  });
});

// ── longestStreak / currentStreak invariants ──────────────────────────────────

describe('Property: streak invariants', () => {
  test('longestStreak is always >= currentStreak for any today', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, today) => {
        return longestStreak(sessions) >= currentStreak(sessions, today);
      })
    );
  });

  test('adding a session can only increase or maintain the longestStreak', () => {
    fc.assert(
      fc.property(sessionsArb, sessionArb, (sessions, extra) => {
        return longestStreak([...sessions, extra]) >= longestStreak(sessions);
      })
    );
  });

  test('currentStreak is always <= number of unique days in the session list', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, today) => {
        const uniqueDays = new Set(sessions.map((s) => s.date)).size;
        return currentStreak(sessions, today) <= uniqueDays;
      })
    );
  });
});
