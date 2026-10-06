/**
 * Unit tests for streakCalendar.js — renderStreakCalendar output structure.
 * Uses fixed dates so tests are never affected by the current system date.
 */
import { renderStreakCalendar } from '../../src/streakCalendar.js';

// Strip ANSI colour codes so we can inspect plain text content
function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

const TODAY = '2026-10-05'; // Monday

describe('renderStreakCalendar — structure', () => {
  test('returns an array', () => {
    const result = renderStreakCalendar([], TODAY);
    expect(Array.isArray(result)).toBe(true);
  });

  test('returns at least 6 lines (header + day-names + 4 week rows)', () => {
    const result = renderStreakCalendar([], TODAY);
    expect(result.length).toBeGreaterThanOrEqual(6);
  });

  test('contains exactly 4 week rows (28 cells across 4 rows)', () => {
    const lines = renderStreakCalendar([], TODAY).map(stripAnsi);
    // Each data row contains exactly 7 bullet symbols (● or ○)
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    expect(dataRows).toHaveLength(4);
  });

  test('total calendar cells across all rows equals 28', () => {
    const lines = renderStreakCalendar([], TODAY).map(stripAnsi);
    // Only count rows that are actual data rows (contain exactly 7 symbols per row)
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    const totalCells = dataRows.reduce((sum, l) => sum + (l.match(/[●○]/g) || []).length, 0);
    expect(totalCells).toBe(28);
  });

  test('header line contains "Last 28 days"', () => {
    const lines = renderStreakCalendar([], TODAY).map(stripAnsi);
    const header = lines.find((l) => l.includes('Last 28 days'));
    expect(header).toBeDefined();
  });

  test('day-names row contains Mon through Sun', () => {
    const lines = renderStreakCalendar([], TODAY).map(stripAnsi);
    const dayNames = lines.find((l) => l.includes('Mon') && l.includes('Sun'));
    expect(dayNames).toBeDefined();
  });
});

describe('renderStreakCalendar — active day marking', () => {
  test('a date in the window is marked ● (filled circle)', () => {
    // TODAY is 2026-10-05 (Monday) — first day of the most recent week row
    const lines = renderStreakCalendar([TODAY], TODAY).map(stripAnsi);
    const filled = lines.some((l) => l.includes('●'));
    expect(filled).toBe(true);
  });

  test('empty session list produces no filled circles in data rows', () => {
    const lines = renderStreakCalendar([], TODAY).map(stripAnsi);
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    const anyFilled = dataRows.some((l) => l.includes('●'));
    expect(anyFilled).toBe(false);
  });

  test('a date outside the 28-day window does not mark any cell as filled', () => {
    // A date 60 days before today is outside the 28-day window
    const farDate = '2026-08-06';
    const lines = renderStreakCalendar([farDate], TODAY).map(stripAnsi);
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    const anyFilled = dataRows.some((l) => l.includes('●'));
    expect(anyFilled).toBe(false);
  });

  test('multiple active dates in the window each show as filled circles', () => {
    const activeDates = ['2026-09-28', '2026-09-29', '2026-09-30'];
    const lines = renderStreakCalendar(activeDates, TODAY).map(stripAnsi);
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    const filledCount = dataRows.reduce((sum, l) => sum + (l.match(/●/g) || []).length, 0);
    expect(filledCount).toBe(3);
  });

  test('duplicate dates are counted as one filled cell, not two', () => {
    const lines = renderStreakCalendar([TODAY, TODAY, TODAY], TODAY).map(stripAnsi);
    const dataRows = lines.filter((l) => (l.match(/[●○]/g) || []).length === 7);
    const filledCount = dataRows.reduce((sum, l) => sum + (l.match(/●/g) || []).length, 0);
    // TODAY is in the window — should be exactly 1 filled cell
    expect(filledCount).toBe(1);
  });
});
