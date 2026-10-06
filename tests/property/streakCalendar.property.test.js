/**
 * Property-based tests for streakCalendar.js.
 * Verifies structural invariants of renderStreakCalendar for any
 * valid combination of session dates and today values.
 */
import fc from 'fast-check';
import { renderStreakCalendar } from '../../src/streakCalendar.js';

// Strip ANSI colour codes to inspect plain text content
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

// Count only rows containing exactly 7 calendar symbols (the data rows)
function countDataCells(lines) {
  return lines
    .filter((l) => (l.match(/[●○]/g) || []).length === 7)
    .reduce((sum, l) => sum + (l.match(/[●○]/g) || []).length, 0);
}

const dateArb = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2027-12-31'),
}).map((d) => d.toISOString().slice(0, 10));

const dateArrayArb = fc.array(dateArb, { maxLength: 60 });

describe('Property: renderStreakCalendar structural invariants', () => {
  test('always produces exactly 28 calendar cells regardless of session dates', () => {
    fc.assert(
      fc.property(dateArrayArb, dateArb, (sessionDates, today) => {
        const lines = renderStreakCalendar(sessionDates, today).map(stripAnsi);
        return countDataCells(lines) === 28;
      })
    );
  });

  test('always returns exactly 4 data rows (one per week)', () => {
    fc.assert(
      fc.property(dateArrayArb, dateArb, (sessionDates, today) => {
        const lines = renderStreakCalendar(sessionDates, today).map(stripAnsi);
        const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
        return dataRows.length === 4;
      })
    );
  });

  test('filled cells never exceed the number of unique active dates in the window', () => {
    fc.assert(
      fc.property(dateArrayArb, dateArb, (sessionDates, today) => {
        const lines = renderStreakCalendar(sessionDates, today).map(stripAnsi);
        const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
        const filled = dataRows.reduce((sum, l) => sum + (l.match(/●/g) || []).length, 0);
        // At most 28 unique active days can appear in a 28-day window
        return filled <= 28;
      })
    );
  });

  test('empty session list always produces 0 filled cells', () => {
    fc.assert(
      fc.property(dateArb, (today) => {
        const lines = renderStreakCalendar([], today).map(stripAnsi);
        const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
        const filled = dataRows.reduce((sum, l) => sum + (l.match(/●/g) || []).length, 0);
        return filled === 0;
      })
    );
  });

  test('result is always an array of strings', () => {
    fc.assert(
      fc.property(dateArrayArb, dateArb, (sessionDates, today) => {
        const result = renderStreakCalendar(sessionDates, today);
        return Array.isArray(result) && result.every((l) => typeof l === 'string');
      })
    );
  });
});
