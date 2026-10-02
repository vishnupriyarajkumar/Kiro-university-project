import { validateSession, createSession, filterByDate, filterByWeek } from '../../src/sessions.js';

describe('validateSession', () => {
  test('accepts a valid description and duration', () => {
    const result = validateSession('Deep work on auth', 25);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('rejects an empty description', () => {
    const result = validateSession('', 25);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/description/i);
  });

  test('rejects a whitespace-only description', () => {
    const result = validateSession('   ', 25);
    expect(result.valid).toBe(false);
  });

  test('rejects duration of 0', () => {
    const result = validateSession('Valid desc', 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/duration/i);
  });

  test('rejects duration greater than 120', () => {
    const result = validateSession('Valid desc', 121);
    expect(result.valid).toBe(false);
  });

  test('accepts minimum duration of 1', () => {
    expect(validateSession('Valid desc', 1).valid).toBe(true);
  });

  test('accepts maximum duration of 120', () => {
    expect(validateSession('Valid desc', 120).valid).toBe(true);
  });

  test('rejects non-integer duration', () => {
    const result = validateSession('Valid desc', 25.5);
    expect(result.valid).toBe(false);
  });

  test('returns multiple errors when both fields are invalid', () => {
    const result = validateSession('', 200);
    expect(result.errors).toHaveLength(2);
  });
});

describe('createSession', () => {
  test('returns an object with all required fields', () => {
    const session = createSession('Write tests', 30);
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('description', 'Write tests');
    expect(session).toHaveProperty('duration', 30);
    expect(session).toHaveProperty('startTime');
    expect(session).toHaveProperty('date');
    expect(session).toHaveProperty('completed', true);
  });

  test('trims whitespace from the description', () => {
    const session = createSession('  Refactor module  ', 25);
    expect(session.description).toBe('Refactor module');
  });

  test('date is in YYYY-MM-DD format', () => {
    const session = createSession('Test date format', 25);
    expect(session.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('startTime is a valid ISO 8601 string', () => {
    const session = createSession('Test ISO time', 25);
    expect(() => new Date(session.startTime)).not.toThrow();
    expect(new Date(session.startTime).toISOString()).toBe(session.startTime);
  });
});

describe('filterByDate', () => {
  const sessions = [
    { id: '1', date: '2026-10-01', duration: 25, description: 'Day 1 session' },
    { id: '2', date: '2026-10-02', duration: 30, description: 'Day 2 session A' },
    { id: '3', date: '2026-10-02', duration: 25, description: 'Day 2 session B' },
    { id: '4', date: '2026-10-03', duration: 50, description: 'Day 3 session' },
  ];

  test('returns only sessions matching the given date', () => {
    const result = filterByDate(sessions, '2026-10-02');
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.date === '2026-10-02')).toBe(true);
  });

  test('returns empty array when no sessions match', () => {
    expect(filterByDate(sessions, '2026-09-01')).toHaveLength(0);
  });

  test('returns empty array for empty input', () => {
    expect(filterByDate([], '2026-10-02')).toHaveLength(0);
  });
});

describe('filterByWeek', () => {
  const sessions = [
    { id: '1', date: '2026-09-28', duration: 25, description: 'Previous week (Mon)' },
    { id: '2', date: '2026-10-05', duration: 25, description: 'This week Monday' },
    { id: '3', date: '2026-10-07', duration: 30, description: 'This week Wednesday' },
    { id: '4', date: '2026-10-11', duration: 25, description: 'This week Sunday' },
    { id: '5', date: '2026-10-12', duration: 25, description: 'Next week Monday' },
  ];

  test('returns sessions within the Mon–Sun week of the reference date', () => {
    // 2026-10-07 is a Wednesday; week is Oct 5 (Mon) to Oct 11 (Sun)
    const result = filterByWeek(sessions, '2026-10-07');
    expect(result).toHaveLength(3);
    expect(result.map((s) => s.date)).toEqual(
      expect.arrayContaining(['2026-10-05', '2026-10-07', '2026-10-11'])
    );
  });

  test('excludes sessions from previous and next weeks', () => {
    const result = filterByWeek(sessions, '2026-10-07');
    expect(result.map((s) => s.date)).not.toContain('2026-09-28');
    expect(result.map((s) => s.date)).not.toContain('2026-10-12');
  });

  test('returns empty array for empty sessions', () => {
    expect(filterByWeek([], '2026-10-07')).toHaveLength(0);
  });
});
