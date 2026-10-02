import fc from 'fast-check';
import { validateSession, filterByDate, filterByWeek } from '../../src/sessions.js';
import { totalMinutes, averageDuration, currentStreak, longestStreak } from '../../src/stats.js';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Generates a valid duration integer between 1 and 120. */
const validDuration = fc.integer({ min: 1, max: 120 });

/** Generates a non-empty string description. */
const validDescription = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

/** Generates a YYYY-MM-DD date string between 2024-01-01 and 2026-12-31. */
const dateString = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2026-12-31'),
}).map((d) => d.toISOString().slice(0, 10));

/** Generates a single session object with valid fields. */
const sessionArb = fc.record({
  id: fc.uuid(),
  description: validDescription,
  duration: validDuration,
  date: dateString,
  completed: fc.constant(true),
  startTime: dateString.map((d) => `${d}T09:00:00.000Z`),
});

/** Generates an array of 0–50 valid sessions. */
const sessionsArb = fc.array(sessionArb, { maxLength: 50 });

// ── Properties ───────────────────────────────────────────────────────────────

describe('Property: validateSession', () => {
  test('always valid for any integer duration 1–120 with non-empty description', () => {
    fc.assert(
      fc.property(validDescription, validDuration, (desc, dur) => {
        const { valid } = validateSession(desc, dur);
        return valid === true;
      })
    );
  });

  test('always invalid for duration below 1', () => {
    fc.assert(
      fc.property(validDescription, fc.integer({ min: -1000, max: 0 }), (desc, dur) => {
        const { valid } = validateSession(desc, dur);
        return valid === false;
      })
    );
  });

  test('always invalid for duration above 120', () => {
    fc.assert(
      fc.property(validDescription, fc.integer({ min: 121, max: 10000 }), (desc, dur) => {
        const { valid } = validateSession(desc, dur);
        return valid === false;
      })
    );
  });

  test('always invalid for empty or whitespace-only description', () => {
    fc.assert(
      fc.property(
        fc.string().map((s) => s.replace(/\S/g, ' ')), // whitespace only
        validDuration,
        (desc, dur) => {
          const { valid } = validateSession(desc, dur);
          return valid === false;
        }
      )
    );
  });
});

describe('Property: totalMinutes', () => {
  test('total always equals sum of individual durations', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const expected = sessions.reduce((acc, s) => acc + s.duration, 0);
        return totalMinutes(sessions) === expected;
      })
    );
  });

  test('total is always non-negative', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        return totalMinutes(sessions) >= 0;
      })
    );
  });

  test('adding a session always increases or maintains the total', () => {
    fc.assert(
      fc.property(sessionsArb, sessionArb, (sessions, newSession) => {
        return totalMinutes([...sessions, newSession]) >= totalMinutes(sessions);
      })
    );
  });
});

describe('Property: averageDuration', () => {
  test('average is always between min and max session duration', () => {
    fc.assert(
      fc.property(fc.array(sessionArb, { minLength: 1, maxLength: 50 }), (sessions) => {
        const avg = averageDuration(sessions);
        const min = Math.min(...sessions.map((s) => s.duration));
        const max = Math.max(...sessions.map((s) => s.duration));
        return avg >= min && avg <= max;
      })
    );
  });

  test('average is always a non-negative integer', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const avg = averageDuration(sessions);
        return avg >= 0 && Number.isInteger(avg);
      })
    );
  });
});

describe('Property: filterByDate', () => {
  test('never returns sessions from a different date', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, targetDate) => {
        const result = filterByDate(sessions, targetDate);
        return result.every((s) => s.date === targetDate);
      })
    );
  });

  test('result length is always <= total session count', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, targetDate) => {
        const result = filterByDate(sessions, targetDate);
        return result.length <= sessions.length;
      })
    );
  });
});

describe('Property: currentStreak', () => {
  test('is always non-negative', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, today) => {
        return currentStreak(sessions, today) >= 0;
      })
    );
  });

  test('is always <= total number of unique days with sessions', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, today) => {
        const uniqueDays = new Set(sessions.map((s) => s.date)).size;
        return currentStreak(sessions, today) <= uniqueDays;
      })
    );
  });

  test('is 0 when there are no sessions', () => {
    fc.assert(
      fc.property(dateString, (today) => {
        return currentStreak([], today) === 0;
      })
    );
  });
});

describe('Property: longestStreak', () => {
  test('is always non-negative', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        return longestStreak(sessions) >= 0;
      })
    );
  });

  test('is always >= currentStreak for any today', () => {
    fc.assert(
      fc.property(sessionsArb, dateString, (sessions, today) => {
        return longestStreak(sessions) >= currentStreak(sessions, today);
      })
    );
  });

  test('is always <= number of unique days with sessions', () => {
    fc.assert(
      fc.property(sessionsArb, (sessions) => {
        const uniqueDays = new Set(sessions.map((s) => s.date)).size;
        return longestStreak(sessions) <= uniqueDays;
      })
    );
  });
});
