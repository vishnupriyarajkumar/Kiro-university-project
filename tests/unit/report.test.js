import { getMondayDate, getSundayDate, generateWeeklyReport } from '../../src/report.js';

describe('getMondayDate', () => {
  test('returns the same date when the input is already a Monday', () => {
    // 2026-10-05 is a Monday
    expect(getMondayDate('2026-10-05')).toBe('2026-10-05');
  });

  test('returns the Monday of the week when the input is a Wednesday', () => {
    // 2026-10-07 is a Wednesday; Monday of that week is 2026-10-05
    expect(getMondayDate('2026-10-07')).toBe('2026-10-05');
  });

  test('returns the Monday six days earlier when the input is a Sunday', () => {
    // 2026-10-11 is a Sunday; Monday of that week is 2026-10-05
    expect(getMondayDate('2026-10-11')).toBe('2026-10-05');
  });

  test('returns the Monday of the week when the input is a Saturday', () => {
    // 2026-10-10 is a Saturday; Monday of that week is 2026-10-05
    expect(getMondayDate('2026-10-10')).toBe('2026-10-05');
  });

  test('applying getMondayDate twice returns the same result as applying it once (idempotence)', () => {
    const dates = ['2026-10-05', '2026-10-07', '2026-10-11', '2026-10-10'];
    for (const date of dates) {
      const once = getMondayDate(date);
      const twice = getMondayDate(once);
      expect(twice).toBe(once);
    }
  });
});

describe('getSundayDate', () => {
  test('returns the Sunday six days later when the input is a Monday', () => {
    // 2026-10-05 is a Monday; Sunday of that week is 2026-10-11
    expect(getSundayDate('2026-10-05')).toBe('2026-10-11');
  });

  test('returns the correct Sunday when the input is a mid-week day', () => {
    // 2026-10-07 is a Wednesday; Sunday of that week is 2026-10-11
    expect(getSundayDate('2026-10-07')).toBe('2026-10-11');
  });

  test('returns the same date when the input is already a Sunday', () => {
    // 2026-10-11 is a Sunday
    expect(getSundayDate('2026-10-11')).toBe('2026-10-11');
  });
});

// ─── Task 5.2: empty and single-session cases ────────────────────────────────

describe('generateWeeklyReport — empty session array', () => {
  const REFERENCE_DATE = '2026-10-07'; // Wednesday in week 2026-10-05..11

  test('output contains the # Weekly Focus Report: H1 heading', () => {
    const result = generateWeeklyReport([], REFERENCE_DATE);
    expect(result).toContain('# Weekly Focus Report:');
  });

  test('output contains the no-sessions message', () => {
    const result = generateWeeklyReport([], REFERENCE_DATE);
    expect(result).toContain('No sessions were logged for this week.');
  });

  test('output does not contain a ## Summary section', () => {
    const result = generateWeeklyReport([], REFERENCE_DATE);
    expect(result).not.toContain('## Summary');
  });

  test('output does not contain a ## Daily Breakdown section', () => {
    const result = generateWeeklyReport([], REFERENCE_DATE);
    expect(result).not.toContain('## Daily Breakdown');
  });
});

describe('generateWeeklyReport — single session', () => {
  const REFERENCE_DATE = '2026-10-07'; // Wednesday in week 2026-10-05..11
  const singleSession = {
    id: 'test-id-1',
    description: 'Deep work on API',
    duration: 25,
    startTime: '2026-10-07T09:00:00.000Z',
    date: '2026-10-07',
    completed: true,
  };

  test('output contains the # Weekly Focus Report: H1 heading', () => {
    const result = generateWeeklyReport([singleSession], REFERENCE_DATE);
    expect(result).toContain('# Weekly Focus Report:');
  });

  test('output contains the ## Summary section', () => {
    const result = generateWeeklyReport([singleSession], REFERENCE_DATE);
    expect(result).toContain('## Summary');
  });

  test("output contains the session's description", () => {
    const result = generateWeeklyReport([singleSession], REFERENCE_DATE);
    expect(result).toContain('Deep work on API');
  });

  test('output contains the session duration formatted as 25 min', () => {
    const result = generateWeeklyReport([singleSession], REFERENCE_DATE);
    expect(result).toContain('25 min');
  });
});

// ─── Task 5.3: multi-session ordering and formatting ─────────────────────────

describe('generateWeeklyReport — multi-session ordering and formatting', () => {
  const REFERENCE_DATE = '2026-10-07';

  const twoSessionsSameDay = [
    { id: 'a', description: 'Morning review', duration: 20, startTime: '2026-10-07T08:00:00.000Z', date: '2026-10-07', completed: true },
    { id: 'b', description: 'Afternoon deep work', duration: 45, startTime: '2026-10-07T14:00:00.000Z', date: '2026-10-07', completed: true },
  ];

  const sessionsDifferentDays = [
    { id: 'c', description: 'Monday task', duration: 25, startTime: '2026-10-05T09:00:00.000Z', date: '2026-10-05', completed: true },
    { id: 'd', description: 'Wednesday task', duration: 30, startTime: '2026-10-07T09:00:00.000Z', date: '2026-10-07', completed: true },
  ];

  const roundingSessions = [
    { id: 'e', description: 'A', duration: 33, startTime: '2026-10-07T09:00:00.000Z', date: '2026-10-07', completed: true },
    { id: 'f', description: 'B', duration: 33, startTime: '2026-10-07T10:00:00.000Z', date: '2026-10-07', completed: true },
    { id: 'g', description: 'C', duration: 34, startTime: '2026-10-07T11:00:00.000Z', date: '2026-10-07', completed: true },
  ];

  test('sessions on the same day are listed with the earlier startTime first', () => {
    const result = generateWeeklyReport(twoSessionsSameDay, REFERENCE_DATE);
    const morningPos = result.indexOf('Morning review');
    const afternoonPos = result.indexOf('Afternoon deep work');
    expect(morningPos).toBeGreaterThan(-1);
    expect(afternoonPos).toBeGreaterThan(-1);
    expect(morningPos).toBeLessThan(afternoonPos);
  });

  test('sessions on different days are rendered with the earlier date first', () => {
    const result = generateWeeklyReport(sessionsDifferentDays, REFERENCE_DATE);
    const mondayPos = result.indexOf('Monday task');
    const wednesdayPos = result.indexOf('Wednesday task');
    expect(mondayPos).toBeGreaterThan(-1);
    expect(wednesdayPos).toBeGreaterThan(-1);
    expect(mondayPos).toBeLessThan(wednesdayPos);
  });

  test('average duration of 3 sessions totalling 100 min is rendered as 33 min (half-up rounding)', () => {
    // 33 + 33 + 34 = 100; 100 / 3 = 33.33… rounds down to 33
    const result = generateWeeklyReport(roundingSessions, REFERENCE_DATE);
    expect(result).toContain('**Average session duration:** 33 min');
  });

  test('each session is formatted as a Markdown list item with description and duration', () => {
    const session = {
      id: 'h',
      description: 'Deep work on API design',
      duration: 30,
      startTime: '2026-10-07T09:00:00.000Z',
      date: '2026-10-07',
      completed: true,
    };
    const result = generateWeeklyReport([session], REFERENCE_DATE);
    expect(result).toContain('- Deep work on API design — 30 min');
  });
});
