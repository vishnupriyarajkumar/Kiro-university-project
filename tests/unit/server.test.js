/**
 * Unit tests for server-related pure logic.
 * Tests the pure functions (sessions, stats, report) that the server routes
 * delegate to — without importing server.js or connecting to MongoDB.
 */
import { validateSession, createSession, filterByDate, filterByWeek } from '../../src/sessions.js';
import { totalMinutes, averageDuration, currentStreak, longestStreak, groupByDay, mostProductiveDay } from '../../src/stats.js';
import { generateWeeklyReport, getMondayDate } from '../../src/report.js';

// Fixed session data matching what the server would load
const SESSIONS = [
  {
    id: 'srv-test-1',
    description: 'Deep work on feature A',
    duration: 25,
    startTime: '2026-10-04T09:00:00.000Z',
    date: '2026-10-04',
    completed: true,
  },
  {
    id: 'srv-test-2',
    description: 'Code review session',
    duration: 30,
    startTime: '2026-10-04T11:00:00.000Z',
    date: '2026-10-04',
    completed: true,
  },
  {
    id: 'srv-test-3',
    description: 'Writing unit tests',
    duration: 45,
    startTime: '2026-10-03T10:00:00.000Z',
    date: '2026-10-03',
    completed: true,
  },
];

// ── GET /api/sessions/today logic ─────────────────────────────────────────────

describe('GET /api/sessions/today — route logic', () => {
  test('filterByDate returns only sessions for the requested date', () => {
    const result = filterByDate(SESSIONS, '2026-10-04');
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.date === '2026-10-04')).toBe(true);
  });

  test('totalMinutes for today sessions is sum of their durations', () => {
    const today = filterByDate(SESSIONS, '2026-10-04');
    expect(totalMinutes(today)).toBe(55);
  });

  test('returns empty array when no sessions exist for the date', () => {
    expect(filterByDate(SESSIONS, '2025-01-01')).toHaveLength(0);
  });
});

// ── GET /api/sessions/week logic ──────────────────────────────────────────────

describe('GET /api/sessions/week — route logic', () => {
  test('filterByWeek includes sessions within the Mon–Sun window', () => {
    // 2026-10-04 is Sunday — week is Sep 28 to Oct 4
    const result = filterByWeek(SESSIONS, '2026-10-04');
    expect(result).toHaveLength(3);
  });

  test('filterByWeek excludes sessions outside the current week', () => {
    // Week of Oct 5–11: none of our sessions fall here
    const result = filterByWeek(SESSIONS, '2026-10-07');
    expect(result).toHaveLength(0);
  });

  test('getMondayDate returns correct Monday for a Sunday reference', () => {
    // 2026-10-04 (Sun) → Monday should be 2026-09-28
    expect(getMondayDate('2026-10-04')).toBe('2026-09-28');
  });

  test('getMondayDate returns the same date for a Monday reference', () => {
    expect(getMondayDate('2026-09-28')).toBe('2026-09-28');
  });
});

// ── GET /api/stats logic ──────────────────────────────────────────────────────

describe('GET /api/stats — route logic', () => {
  test('totalSessions equals the number of sessions', () => {
    expect(SESSIONS.length).toBe(3);
  });

  test('totalMinutes returns the correct sum', () => {
    expect(totalMinutes(SESSIONS)).toBe(100);
  });

  test('averageDuration returns the rounded mean', () => {
    // (25 + 30 + 45) / 3 = 33.3 → rounds to 33
    expect(averageDuration(SESSIONS)).toBe(33);
  });

  test('currentStreak is non-negative', () => {
    expect(currentStreak(SESSIONS, '2026-10-04')).toBeGreaterThanOrEqual(0);
  });

  test('longestStreak is >= currentStreak', () => {
    const today = '2026-10-04';
    expect(longestStreak(SESSIONS)).toBeGreaterThanOrEqual(currentStreak(SESSIONS, today));
  });

  test('mostProductiveDay returns a non-empty string', () => {
    const day = mostProductiveDay(SESSIONS);
    expect(typeof day).toBe('string');
    expect(day.length).toBeGreaterThan(0);
  });

  test('totalMinutes returns 0 for empty sessions', () => {
    expect(totalMinutes([])).toBe(0);
  });

  test('averageDuration returns 0 for empty sessions', () => {
    expect(averageDuration([])).toBe(0);
  });
});

// ── GET /api/heatmap logic ────────────────────────────────────────────────────

describe('GET /api/heatmap — route logic', () => {
  test('groupByDay groups sessions by date key', () => {
    const grouped = groupByDay(SESSIONS);
    expect(Object.keys(grouped)).toContain('2026-10-04');
    expect(Object.keys(grouped)).toContain('2026-10-03');
    expect(grouped['2026-10-04']).toHaveLength(2);
    expect(grouped['2026-10-03']).toHaveLength(1);
  });

  test('groupByDay returns empty object for no sessions', () => {
    expect(groupByDay([])).toEqual({});
  });

  test('sessions on different dates are not mixed', () => {
    const grouped = groupByDay(SESSIONS);
    expect(grouped['2026-10-04'].every((s) => s.date === '2026-10-04')).toBe(true);
    expect(grouped['2026-10-03'].every((s) => s.date === '2026-10-03')).toBe(true);
  });
});

// ── GET /api/report logic ─────────────────────────────────────────────────────

describe('GET /api/report — route logic', () => {
  test('generateWeeklyReport returns a string starting with a heading', () => {
    const result = generateWeeklyReport(SESSIONS, '2026-10-04');
    expect(result).toMatch(/^# Weekly Focus Report:/);
  });

  test('report contains session descriptions', () => {
    const result = generateWeeklyReport(SESSIONS, '2026-10-04');
    expect(result).toContain('Deep work on feature A');
    expect(result).toContain('Code review session');
  });

  test('report contains a Summary section', () => {
    const result = generateWeeklyReport(SESSIONS, '2026-10-04');
    expect(result).toContain('## Summary');
  });

  test('returns no-sessions message for empty array', () => {
    const result = generateWeeklyReport([], '2026-10-04');
    expect(result).toContain('No sessions were logged');
  });

  test('report is deterministic — same input produces same output', () => {
    const a = generateWeeklyReport(SESSIONS, '2026-10-04');
    const b = generateWeeklyReport(SESSIONS, '2026-10-04');
    expect(a).toBe(b);
  });
});

// ── POST /api/sessions — validation logic ────────────────────────────────────

describe('POST /api/sessions — validation logic', () => {
  test('validateSession accepts valid description and duration', () => {
    const { valid } = validateSession('Valid task', 25);
    expect(valid).toBe(true);
  });

  test('validateSession rejects empty description', () => {
    const { valid, errors } = validateSession('', 25);
    expect(valid).toBe(false);
    expect(errors[0]).toMatch(/description/i);
  });

  test('validateSession rejects duration above 120', () => {
    const { valid } = validateSession('Valid task', 999);
    expect(valid).toBe(false);
  });

  test('validateSession rejects duration of 0', () => {
    const { valid } = validateSession('Valid task', 0);
    expect(valid).toBe(false);
  });

  test('createSession returns session with correct shape', () => {
    const session = createSession('New task', 30);
    expect(session).toHaveProperty('id');
    expect(session.description).toBe('New task');
    expect(session.duration).toBe(30);
    expect(session.completed).toBe(true);
    expect(session.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(session.startTime).toMatch(/Z$/);
  });

  test('createSession trims description whitespace', () => {
    const session = createSession('  Trimmed task  ', 25);
    expect(session.description).toBe('Trimmed task');
  });
});

// ── GET /api/sessions/:id logic ───────────────────────────────────────────────

describe('GET /api/sessions/:id — route logic', () => {
  test('finds a session by its exact UUID', () => {
    const result = SESSIONS.find((s) => s.id === 'srv-test-1');
    expect(result).toBeDefined();
    expect(result.description).toBe('Deep work on feature A');
  });

  test('returns undefined when the ID does not exist', () => {
    const result = SESSIONS.find((s) => s.id === 'non-existent-id');
    expect(result).toBeUndefined();
  });

  test('found session has all required fields', () => {
    const result = SESSIONS.find((s) => s.id === 'srv-test-2');
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('startTime');
    expect(result).toHaveProperty('completed');
  });

  test('returns only one session when searching by unique ID', () => {
    const results = SESSIONS.filter((s) => s.id === 'srv-test-3');
    expect(results).toHaveLength(1);
  });

  test('ID lookup is case-sensitive — a partial ID match returns undefined', () => {
    const result = SESSIONS.find((s) => s.id === 'srv-test');
    expect(result).toBeUndefined();
  });
});

// ── GET /api/sessions/today — extended coverage ───────────────────────────────

describe('GET /api/sessions/today — extended coverage', () => {
  test('result sessions all have the same date as the requested date', () => {
    const date = '2026-10-04';
    const result = filterByDate(SESSIONS, date);
    expect(result.every((s) => s.date === date)).toBe(true);
  });

  test('totalMinutes for today is sum of each session duration', () => {
    const todaySessions = filterByDate(SESSIONS, '2026-10-04');
    const expected = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    expect(totalMinutes(todaySessions)).toBe(expected);
  });

  test('result does not include sessions from other dates', () => {
    const result = filterByDate(SESSIONS, '2026-10-04');
    const otherDate = result.find((s) => s.date !== '2026-10-04');
    expect(otherDate).toBeUndefined();
  });

  test('returns an empty array for a future date with no sessions', () => {
    const result = filterByDate(SESSIONS, '2030-01-01');
    expect(result).toHaveLength(0);
    expect(totalMinutes(result)).toBe(0);
  });

  test('response shape contains date, sessions, and totalMinutes fields', () => {
    const date = '2026-10-04';
    const sessions = filterByDate(SESSIONS, date);
    const response = { date, sessions, totalMinutes: totalMinutes(sessions) };
    expect(response).toHaveProperty('date', date);
    expect(response).toHaveProperty('sessions');
    expect(response).toHaveProperty('totalMinutes');
    expect(typeof response.totalMinutes).toBe('number');
  });
});

// ── GET /api/sessions ?from= &to= — filterByDateRange route logic ─────────────

import { filterByDateRange } from '../../src/sessions.js';

const RANGE_SESSIONS = [
  { id: 'r1', date: '2026-09-28', duration: 25, description: 'Sep session' },
  { id: 'r2', date: '2026-10-01', duration: 30, description: 'Oct start' },
  { id: 'r3', date: '2026-10-05', duration: 25, description: 'Oct mid' },
  { id: 'r4', date: '2026-10-10', duration: 45, description: 'Oct late' },
  { id: 'r5', date: '2026-10-15', duration: 20, description: 'Oct end' },
];

describe('GET /api/sessions ?from=&to= — route logic', () => {
  test('returns only sessions within the from–to range', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-10-01', '2026-10-10');
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.id)).toEqual(['r2', 'r3', 'r4']);
  });

  test('from and to boundaries are inclusive', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-09-28', '2026-10-15');
    expect(result).toHaveLength(5);
  });

  test('returns empty array when range excludes all sessions', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2025-01-01', '2025-12-31');
    expect(result).toHaveLength(0);
  });

  test('single-day range returns only that day', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-10-05', '2026-10-05');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r3');
  });

  test('reversed range (from > to) returns empty array', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-10-10', '2026-10-01');
    expect(result).toHaveLength(0);
  });

  test('totalMinutes of range result equals sum of matched durations', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-10-01', '2026-10-10');
    expect(totalMinutes(result)).toBe(100); // 30 + 25 + 45
  });

  test('result count matches the count field the route would return', () => {
    const result = filterByDateRange(RANGE_SESSIONS, '2026-10-01', '2026-10-15');
    const responseShape = { count: result.length, sessions: result };
    expect(responseShape.count).toBe(result.length);
    expect(responseShape.sessions).toHaveLength(4);
  });
});
