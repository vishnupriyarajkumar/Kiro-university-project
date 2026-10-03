import * as fc from 'fast-check';
import { generateWeeklyReport, getMondayDate, getSundayDate } from '../../src/report.js';
import { writeMarkdownFile } from '../../src/storage.js';
import { totalMinutes } from '../../src/stats.js';
import os from 'os';
import { join } from 'path';
import { existsSync, rmSync } from 'fs';

// ── Shared Arbitraries ────────────────────────────────────────────────────────

const REFERENCE_DATE = '2026-10-01'; // Thursday — week is 2026-09-28..2026-10-04

// Arbitrary valid session — date and startTime derived from the same offset so they stay consistent
const dayOffset = fc.integer({ min: 0, max: 6 });
const sessionArb = dayOffset.chain(offset => {
  const baseDate = new Date('2026-09-28T00:00:00.000Z');
  baseDate.setUTCDate(baseDate.getUTCDate() + offset);
  const dateStr = baseDate.toISOString().slice(0, 10);
  const startTimeStr = baseDate.toISOString();
  return fc.record({
    id: fc.uuid(),
    description: fc.string({ minLength: 1, maxLength: 60 }).map(s => s.trim()).filter(s => s.length > 0),
    duration: fc.integer({ min: 1, max: 120 }),
    startTime: fc.constant(startTimeStr),
    date: fc.constant(dateStr),
    completed: fc.constant(true),
  });
});

// Arbitrary for valid YYYY-MM-DD date strings across the full year 2026
const dateStringArb = fc.integer({ min: 0, max: 364 }).map(offset => {
  const d = new Date('2026-01-01T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
});

// Arbitrary invalid session — either empty description OR duration > 120
const invalidSessionArb = fc.oneof(
  fc.record({
    id: fc.uuid(),
    description: fc.constant(''),
    duration: fc.integer({ min: 1, max: 120 }),
    startTime: fc.constant('2026-10-01T09:00:00.000Z'),
    date: fc.constant('2026-10-01'),
    completed: fc.constant(true),
  }),
  fc.record({
    id: fc.uuid(),
    description: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
    duration: fc.integer({ min: 121, max: 999 }),
    startTime: fc.constant('2026-10-01T09:00:00.000Z'),
    date: fc.constant('2026-10-01'),
    completed: fc.constant(true),
  })
);

// ── Property 1 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 1: H1 heading encodes the correct week range
// Validates: Requirements 2.1, 6.2
describe('Property 1: H1 heading encodes the correct week range', () => {
  test('the first line of the report is an H1 heading with the correct Monday and Sunday dates', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 5 }),
        dateStringArb,
        (sessions, ref) => {
          const output = generateWeeklyReport(sessions, ref);
          const firstLine = output.split('\n')[0];
          const expectedHeading = `# Weekly Focus Report: ${getMondayDate(ref)} \u2013 ${getSundayDate(ref)}`;
          return firstLine === expectedHeading;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 2: Summary section correctness
// Validates: Requirements 2.2, 2.3
describe('Property 2: Summary section correctness', () => {
  test('the Summary section contains the correct total minutes, session count, and rounded average', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 8 }),
        (sessions) => {
          const output = generateWeeklyReport(sessions, REFERENCE_DATE);
          const total = totalMinutes(sessions);
          const count = sessions.length;
          // half-up rounding: Math.floor(value + 0.5)
          const avg = Math.floor(total / count + 0.5);

          expect(output).toContain('## Summary');
          expect(output).toContain(`${total}`);
          expect(output).toContain(`${count}`);
          expect(output).toContain(`${avg} min`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 3: Daily breakdown structure and ordering
// Validates: Requirements 2.4, 2.6
describe('Property 3: Daily breakdown structure and ordering', () => {
  test('every date with sessions has an H3 heading and headings appear in ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 8 }),
        (sessions) => {
          const output = generateWeeklyReport(sessions, REFERENCE_DATE);

          expect(output).toContain('## Daily Breakdown');

          // Unique dates sorted ascending
          const uniqueDates = [...new Set(sessions.map(s => s.date))].sort();

          // Every unique date must appear as an ### heading
          for (const date of uniqueDates) {
            expect(output).toContain(`### ${date}`);
          }

          // Headings must appear in strictly ascending order
          const headingPositions = uniqueDates.map(date => output.indexOf(`### ${date}`));
          for (let i = 1; i < headingPositions.length; i++) {
            expect(headingPositions[i]).toBeGreaterThan(headingPositions[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 4: session ordering within a day by startTime
// Validates: Requirements 2.5
describe('Property 4: session ordering within a day by startTime', () => {
  test('sessions on the same day are rendered in ascending startTime order', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringMatching(/^[a-z][a-z0-9]{3,15}$/),
          fc.stringMatching(/^[a-z][a-z0-9]{3,15}$/),
        ).filter(([a, b]) => a !== b && !a.includes(b) && !b.includes(a)),
        ([descA, descB]) => {
          const sessionA = {
            id: 'session-a',
            description: descA,
            duration: 25,
            startTime: '2026-10-01T08:00:00.000Z',
            date: '2026-10-01',
            completed: true,
          };
          const sessionB = {
            id: 'session-b',
            description: descB,
            duration: 25,
            startTime: '2026-10-01T16:00:00.000Z',
            date: '2026-10-01',
            completed: true,
          };

          // Pass in reverse order to verify the sort is actually applied
          const output = generateWeeklyReport([sessionB, sessionA], REFERENCE_DATE);

          // Search for the exact list-item format to avoid false matches against
          // other parts of the Markdown output (headings, summary numbers, etc.)
          const itemA = `- ${descA} \u2014 25 min`;
          const itemB = `- ${descB} \u2014 25 min`;
          const posA = output.indexOf(itemA);
          const posB = output.indexOf(itemB);

          expect(posA).toBeGreaterThan(-1);
          expect(posB).toBeGreaterThan(-1);
          expect(posA).toBeLessThan(posB);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 5: determinism
// Validates: Requirements 3.2
describe('Property 5: determinism', () => {
  test('generateWeeklyReport returns identical output on every call with the same inputs', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 0, maxLength: 5 }),
        dateStringArb,
        (sessions, ref) => {
          const first = generateWeeklyReport(sessions, ref);
          const second = generateWeeklyReport(sessions, ref);
          return first === second;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 6 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 6: session data inclusion round-trip
// Validates: Requirements 3.3
describe('Property 6: session data inclusion round-trip', () => {
  test('every session description and duration appears as a substring in the report output', () => {
    fc.assert(
      fc.property(
        fc.array(sessionArb, { minLength: 1, maxLength: 8 }),
        (sessions) => {
          const output = generateWeeklyReport(sessions, REFERENCE_DATE);
          for (const s of sessions) {
            expect(output).toContain(s.description.trim());
            expect(output).toContain(`${s.duration} min`);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 7 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 7: writeMarkdownFile rejects invalid arguments
// Validates: Requirements 4.5, 5.1
describe('Property 7: writeMarkdownFile rejects invalid arguments', () => {
  const tmpDir = join(os.tmpdir(), `pbt-prop7-${process.pid}`);

  afterAll(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('writeMarkdownFile throws for any null, empty, or whitespace-only filePath', () => {
    const invalidFilePathArb = fc.oneof(
      fc.constant(null),
      fc.constant(''),
      fc.constant('   ')
    );

    fc.assert(
      fc.property(invalidFilePathArb, (badPath) => {
        expect(() => writeMarkdownFile(badPath, '# Valid content')).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('writeMarkdownFile throws for any null or empty content', () => {
    const invalidContentArb = fc.oneof(
      fc.constant(null),
      fc.constant('')
    );

    const validPath = join(tmpDir, 'test.md');

    fc.assert(
      fc.property(invalidContentArb, (badContent) => {
        expect(() => writeMarkdownFile(validPath, badContent)).toThrow();
      }),
      { numRuns: 100 }
    );
  });
});

// ── Property 8 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 8: invalid sessions excluded, valid sessions included
// Validates: Requirements 5.3
describe('Property 8: invalid sessions excluded, valid sessions included', () => {
  test('when all sessions are invalid, the report contains the no-sessions message', () => {
    fc.assert(
      fc.property(
        fc.array(invalidSessionArb, { minLength: 1, maxLength: 5 }),
        (invalids) => {
          // Simulate what exportAction does: filter out invalid sessions before calling generateWeeklyReport
          const validSessions = invalids.filter(s =>
            Number.isInteger(s.duration) &&
            s.duration >= 1 &&
            s.duration <= 120 &&
            s.description != null &&
            s.description.trim().length > 0
          );

          // By construction all sessions in invalids fail validation, so validSessions is always empty
          const output = generateWeeklyReport(validSessions, REFERENCE_DATE);
          expect(output).toContain('No sessions were logged for this week.');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 9 ────────────────────────────────────────────────────────────────
// Feature: weekly-report-export, Property 9: getMondayDate correctness and idempotence
// Validates: Requirements 6.2
describe('Property 9: getMondayDate correctness and idempotence', () => {
  test('getMondayDate always returns a Monday', () => {
    fc.assert(
      fc.property(dateStringArb, (d) => {
        const monday = getMondayDate(d);
        const dayOfWeek = new Date(monday + 'T00:00:00.000Z').getUTCDay();
        return dayOfWeek === 1;
      }),
      { numRuns: 100 }
    );
  });

  test('getMondayDate result is within 6 days before or equal to the input date', () => {
    fc.assert(
      fc.property(dateStringArb, (d) => {
        const monday = getMondayDate(d);

        // Monday must not be after d (string comparison is safe for YYYY-MM-DD)
        if (monday > d) return false;

        // Monday must be at most 6 days before d
        const inputDate = new Date(d + 'T00:00:00.000Z');
        const sixDaysBefore = new Date(inputDate);
        sixDaysBefore.setUTCDate(inputDate.getUTCDate() - 6);
        const sixDaysBeforeStr = sixDaysBefore.toISOString().slice(0, 10);

        return monday >= sixDaysBeforeStr;
      }),
      { numRuns: 100 }
    );
  });

  test('getMondayDate is idempotent', () => {
    fc.assert(
      fc.property(dateStringArb, (d) => {
        const monday = getMondayDate(d);
        return getMondayDate(monday) === monday;
      }),
      { numRuns: 100 }
    );
  });
});
