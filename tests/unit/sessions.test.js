import { validateSession, createSession, filterByDate, filterByWeek, deleteSession, editSession, searchSessions } from '../../src/sessions.js';

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

describe('deleteSession', () => {
  const sessions = [
    { id: 'aaa', date: '2026-10-01', duration: 25, description: 'Session A' },
    { id: 'bbb', date: '2026-10-02', duration: 30, description: 'Session B' },
    { id: 'ccc', date: '2026-10-03', duration: 20, description: 'Session C' },
  ];

  test('removes the session with the matching ID', () => {
    const { found, sessions: updated } = deleteSession(sessions, 'bbb');
    expect(found).toBe(true);
    expect(updated).toHaveLength(2);
    expect(updated.find((s) => s.id === 'bbb')).toBeUndefined();
  });

  test('returns found: false when ID does not exist', () => {
    const { found, sessions: updated } = deleteSession(sessions, 'zzz');
    expect(found).toBe(false);
    expect(updated).toHaveLength(3);
  });

  test('does not mutate the original sessions array', () => {
    const original = [...sessions];
    deleteSession(sessions, 'aaa');
    expect(sessions).toHaveLength(original.length);
  });

  test('returns empty array when deleting the only session', () => {
    const single = [{ id: 'only', date: '2026-10-01', duration: 25, description: 'Solo' }];
    const { found, sessions: updated } = deleteSession(single, 'only');
    expect(found).toBe(true);
    expect(updated).toHaveLength(0);
  });
});

describe('editSession', () => {
  const sessions = [
    { id: 'aaa', date: '2026-10-01', duration: 25, description: 'Original description', startTime: '2026-10-01T09:00:00.000Z', completed: true },
    { id: 'bbb', date: '2026-10-02', duration: 30, description: 'Another session', startTime: '2026-10-02T10:00:00.000Z', completed: true },
  ];

  test('updates the description when provided', () => {
    const result = editSession(sessions, 'aaa', { description: 'Updated description' });
    expect(result.found).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.session.description).toBe('Updated description');
    expect(result.session.duration).toBe(25);
  });

  test('updates the duration when provided', () => {
    const result = editSession(sessions, 'aaa', { duration: 50 });
    expect(result.found).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.session.duration).toBe(50);
    expect(result.session.description).toBe('Original description');
  });

  test('updates both description and duration when both provided', () => {
    const result = editSession(sessions, 'aaa', { description: 'New desc', duration: 45 });
    expect(result.session.description).toBe('New desc');
    expect(result.session.duration).toBe(45);
  });

  test('returns found: false when ID does not exist', () => {
    const result = editSession(sessions, 'zzz', { description: 'Nope' });
    expect(result.found).toBe(false);
  });

  test('returns valid: false when new values fail validation', () => {
    const result = editSession(sessions, 'aaa', { description: '   ', duration: 25 });
    expect(result.found).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('returns valid: false when duration is out of range', () => {
    const result = editSession(sessions, 'aaa', { duration: 200 });
    expect(result.valid).toBe(false);
  });

  test('does not mutate the original sessions array', () => {
    editSession(sessions, 'aaa', { description: 'Changed' });
    expect(sessions[0].description).toBe('Original description');
  });
});

describe('searchSessions', () => {
  const sessions = [
    { id: '1', date: '2026-10-01', duration: 25, description: 'Deep work on authentication' },
    { id: '2', date: '2026-10-02', duration: 30, description: 'Refactor database layer' },
    { id: '3', date: '2026-10-03', duration: 20, description: 'Write unit tests for auth module' },
    { id: '4', date: '2026-10-04', duration: 45, description: 'Review pull requests' },
  ];

  test('returns sessions whose description contains the keyword', () => {
    const result = searchSessions(sessions, 'auth');
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(expect.arrayContaining(['1', '3']));
  });

  test('is case-insensitive', () => {
    const result = searchSessions(sessions, 'AUTH');
    expect(result).toHaveLength(2);
  });

  test('returns empty array when no sessions match', () => {
    expect(searchSessions(sessions, 'nonexistent')).toHaveLength(0);
  });

  test('returns all sessions when keyword matches all descriptions', () => {
    // All descriptions contain a space
    const result = searchSessions(sessions, ' ');
    expect(result).toHaveLength(4);
  });

  test('returns empty array for empty sessions input', () => {
    expect(searchSessions([], 'auth')).toHaveLength(0);
  });
});

// ── Edge cases added for task 7 ───────────────────────────────────────────────

describe('validateSession — edge cases', () => {
  test('rejects null description', () => {
    expect(validateSession(null, 25).valid).toBe(false);
  });

  test('rejects undefined description', () => {
    expect(validateSession(undefined, 25).valid).toBe(false);
  });

  test('rejects a number passed as description', () => {
    expect(validateSession(42, 25).valid).toBe(false);
  });

  test('rejects duration of exactly 0 (below minimum)', () => {
    expect(validateSession('Valid', 0).valid).toBe(false);
  });

  test('rejects duration of exactly 121 (above maximum)', () => {
    expect(validateSession('Valid', 121).valid).toBe(false);
  });

  test('rejects a float duration like 25.5', () => {
    expect(validateSession('Valid', 25.5).valid).toBe(false);
  });

  test('rejects NaN duration', () => {
    expect(validateSession('Valid', NaN).valid).toBe(false);
  });

  test('rejects a string duration like "25"', () => {
    // String "25" is not an integer — Number.isInteger("25") is false
    expect(validateSession('Valid', '25').valid).toBe(false);
  });

  test('description with only newlines is rejected', () => {
    expect(validateSession('\n\n\n', 25).valid).toBe(false);
  });

  test('description with only tabs is rejected', () => {
    expect(validateSession('\t\t', 25).valid).toBe(false);
  });
});

describe('createSession — edge cases', () => {
  test('description with leading/trailing whitespace is trimmed', () => {
    const s = createSession('  Focus time  ', 25);
    expect(s.description).toBe('Focus time');
  });

  test('duration is stored as a number even when passed as a numeric value', () => {
    const s = createSession('Task', 30);
    expect(typeof s.duration).toBe('number');
  });

  test('each call produces a unique id', () => {
    const a = createSession('Task A', 25);
    const b = createSession('Task B', 25);
    expect(a.id).not.toBe(b.id);
  });

  test('completed is always true', () => {
    const s = createSession('Task', 25);
    expect(s.completed).toBe(true);
  });
});
