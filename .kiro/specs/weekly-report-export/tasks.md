# Implementation Plan: Weekly Report Export

## Overview

Implement the `pomodoro export` command as a read-and-format pipeline: load sessions from storage, filter to the current week, validate each session, generate a Markdown report using a new pure `report.js` module, and write the result to disk via an extended `storage.js`. The design document uses JavaScript (matching the existing codebase), so all code follows ES Modules conventions and the project's coding standards.

## Tasks

- [x] 1. Create `src/report.js` — pure Markdown formatting module
  - [x] 1.1 Implement `getMondayDate(referenceDate)` and `getSundayDate(referenceDate)`
    - Parse `referenceDate` as a UTC date string (`YYYY-MM-DD`), compute `diffToMonday` using the same UTC arithmetic already in `filterByWeek` in `sessions.js` (`day === 0 ? -6 : 1 - day`), return the result as a `YYYY-MM-DD` string
    - `getSundayDate` adds 6 days to the computed Monday
    - Export both functions; no imports from `storage.js` or `index.js`
    - _Requirements: 6.2, 1.5_

  - [x] 1.2 Implement internal helpers `buildSummarySection(sessions)` and `buildDailyBreakdown(sessions)`
    - `buildSummarySection` calls `totalMinutes` and `averageDuration` from `stats.js`; formats the `## Summary` block with total focus time, total sessions, and average duration
    - `buildDailyBreakdown` calls `groupByDay` from `stats.js`; sorts days alphabetically (ascending); within each day sorts sessions by `startTime` string ascending; formats each day as `### YYYY-MM-DD` with list items `- <description> — <duration> min`
    - `roundHalfUp(value)` helper: `Math.floor(value + 0.5)` — explicit half-up rounding for positive values; used inside `buildSummarySection` for average
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Implement `generateWeeklyReport(sessions, referenceDate)`
    - Build the `# Weekly Focus Report: <monday> – <sunday>` H1 heading using `getMondayDate` and `getSundayDate`
    - If `sessions` is empty, return the H1 heading followed by `\nNo sessions were logged for this week.\n`
    - Otherwise, append `buildSummarySection` then `buildDailyBreakdown`
    - Export the function; keep the module free of file I/O and side effects
    - _Requirements: 2.1, 2.7, 3.1, 3.2, 3.4, 3.5_

- [x] 2. Extend `src/storage.js` with `writeMarkdownFile`
  - [x] 2.1 Implement `writeMarkdownFile(filePath, content)`
    - Validate `filePath` and `content` before any filesystem call: throw a descriptive `Error` if either is `null`, `undefined`, empty string, or whitespace-only
    - Resolve the parent directory with `path.dirname(filePath)` and call `mkdirSync(dir, { recursive: true })`
    - Write the file with `writeFileSync(filePath, content, 'utf-8')` (overwrite semantics)
    - On write failure, throw an `Error` that includes `filePath` and the original `err.message`
    - Export the function alongside the existing exports; do not alter any existing function
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Add `export` command to `src/index.js`
  - [x] 3.1 Wire the `export` command using Commander.js
    - Import `writeMarkdownFile` from `./storage.js` and `generateWeeklyReport`, `getMondayDate` from `./report.js`
    - Register the command with `.option('-o, --output <path>', 'Output file path')`
    - Extract `exportAction` as a named function (not anonymous) following the existing pattern
    - _Requirements: 1.1_

  - [x] 3.2 Implement `exportAction` validation and orchestration
    - If `--output` is present and blank/whitespace-only: `console.error` with message + `process.exit(1)` (no file write)
    - Load sessions via `loadSessions()`, compute `today` as `new Date().toISOString().slice(0, 10)`
    - Filter to the current week using `filterByWeek(sessions, today)` (already imported)
    - For each session, run `validateSession(session.description, session.duration)`; skip invalid ones and emit `console.error` (stderr) with the session `id`
    - Call `generateWeeklyReport(validSessions, today)` to build the Markdown string
    - Compute the output path: `options.output ?? path.resolve(\`./pomodoro-week-\${getMondayDate(today)}.md\`)`
    - Call `writeMarkdownFile(outputPath, markdown)` inside a `try/catch`; on failure `console.error` + `process.exit(1)`
    - On success, `console.log` a confirmation that includes `path.resolve(outputPath)`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.1, 5.2, 5.3, 6.1_

- [x] 4. Checkpoint — verify wiring compiles and existing tests still pass
  - Run `node src/index.js --help` to confirm the `export` command is listed
  - Run `npm test` to confirm no regressions in existing tests
  - Ensure all tests pass; ask the user if questions arise.

- [x] 5. Write unit tests for `src/report.js` in `tests/unit/report.test.js`
  - [x] 5.1 Write unit tests for `getMondayDate` and `getSundayDate`
    - Cover: Monday input (identity), mid-week day (Wednesday), Sunday, Saturday
    - Use fixed dates only — never `new Date()` — per testing standards
    - _Requirements: 6.2_

  - [x]* 5.2 Write unit tests for `generateWeeklyReport` — empty and single-session cases
    - Empty array → verify H1 heading present and no `## Summary` or `## Daily Breakdown` sections
    - Single session → verify H1, `## Summary`, one `### <date>` heading, and the `- <desc> — <dur> min` list item
    - _Requirements: 2.1, 2.7, 3.4_

  - [x]* 5.3 Write unit tests for `generateWeeklyReport` — multi-session ordering and formatting
    - Multiple sessions on the same day → verify ascending `startTime` order in output
    - Sessions on multiple days → verify ascending day order
    - Average rounding: 3 sessions totalling 100 min → average renders as `33 min`
    - Exact list item format check: `- <description> — <duration> min`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6. Add `writeMarkdownFile` unit tests to `tests/unit/storage.test.js`
  - [x] 6.1 Write unit tests for `writeMarkdownFile` — invalid argument rejection
    - Throws on `null` `filePath`, empty string `filePath`, and whitespace-only `filePath`
    - Throws on `null` `content` and empty string `content`
    - _Requirements: 4.5, 5.1_

  - [x]* 6.2 Write unit tests for `writeMarkdownFile` — successful write
    - Write to a temp path using `os.tmpdir()`, read back, verify content matches
    - Write to a path whose parent directory does not yet exist, verify directory is created
    - _Requirements: 4.1, 4.2_

- [ ] 7. Write property-based tests in `tests/property/report.property.test.js`
  - [-]* 7.1 Property 1 — H1 heading encodes the correct week range
    - **Property 1: H1 heading encodes the correct week range**
    - Generate arbitrary `YYYY-MM-DD` reference dates; assert first line matches `# Weekly Focus Report: <getMondayDate(ref)> – <getSundayDate(ref)>`
    - **Validates: Requirements 2.1, 6.2**

  - [-]* 7.2 Property 2 — Summary section correctness
    - **Property 2: Summary section correctness**
    - Use `sessionArb` (non-empty array); assert `## Summary` block contains correct total minutes, session count, and `roundHalfUp`-ed average
    - **Validates: Requirements 2.2, 2.3**

  - [-]* 7.3 Property 3 — Daily breakdown structure and ordering
    - **Property 3: Daily breakdown structure and ordering**
    - Use `sessionArb` spanning multiple dates; assert every active date has an `### <date>` heading, no inactive date has a heading, and headings appear in ascending alphabetical order
    - **Validates: Requirements 2.4, 2.6**

  - [-]* 7.4 Property 4 — Session ordering within a day by startTime
    - **Property 4: Session ordering within a day by startTime**
    - Use `sessionArb` with at least 2 sessions on the same date; parse rendered list items and assert ascending `startTime` order
    - **Validates: Requirements 2.5**

  - [-]* 7.5 Property 5 — Determinism
    - **Property 5: Determinism**
    - Call `generateWeeklyReport` twice with identical inputs; assert strict string equality
    - **Validates: Requirements 3.2**

  - [-]* 7.6 Property 6 — Session data inclusion round-trip
    - **Property 6: Session data inclusion round-trip**
    - For every session in a non-empty array, assert `output.includes(session.description)` and `output.includes(\`\${session.duration} min\`)`
    - **Validates: Requirements 3.3**

  - [-]* 7.7 Property 7 — writeMarkdownFile rejects invalid arguments
    - **Property 7: writeMarkdownFile rejects invalid arguments**
    - Use `fc.oneof` for null/empty/whitespace filePath and null/empty content; assert every call throws
    - **Validates: Requirements 4.5, 5.1**

  - [-]* 7.8 Property 8 — Invalid sessions excluded, valid sessions included
    - **Property 8: Invalid sessions excluded, valid sessions included**
    - Use `invalidSessionArb` mixed with `sessionArb`; assert no content from invalid sessions leaks into output
    - **Validates: Requirements 5.3**

  - [-]* 7.9 Property 9 — getMondayDate correctness and idempotence
    - **Property 9: getMondayDate correctness and idempotence**
    - Assert `getUTCDay()` of result is `1` (Monday), result is within `[d - 6, d]`, and `getMondayDate(getMondayDate(d)) === getMondayDate(d)`
    - **Validates: Requirements 6.2**

- [x] 8. Final checkpoint — full test suite green
  - Run `npm test` and confirm all tests pass
  - Ensure all tests pass; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `validateSession` in `sessions.js` accepts `(description, duration)` as separate args — the `exportAction` must destructure from the session object when calling it
- `roundHalfUp` should be an unexported helper inside `report.js`; the existing `averageDuration` in `stats.js` uses `Math.round` which is equivalent for positive integers, but the design calls for explicit half-up rounding in the report module
- Property tests use `{ numRuns: 100 }` and a fixed seed for CI reproducibility
- Use `fc.constantFrom` for the `date` field in `sessionArb` so all generated sessions fall within the same Mon–Sun week as `REFERENCE_DATE = '2026-10-01'`
- The `--output` / `-o` flag and `options.output` must be checked for blank/whitespace before being passed to `writeMarkdownFile` — `writeMarkdownFile` itself also validates, but the CLI layer is the correct validation boundary per coding standards

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["1.3"] },
    { "id": 3, "tasks": ["3.1", "5.1"] },
    { "id": 4, "tasks": ["3.2", "5.2", "6.1"] },
    { "id": 5, "tasks": ["5.3", "6.2", "7.1", "7.7", "7.9"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.5", "7.6", "7.8"] }
  ]
}
```
