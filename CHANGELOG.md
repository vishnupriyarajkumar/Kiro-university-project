# Changelog

All notable changes to this project are documented here.

## [Unreleased]

## [1.5.0] — 2026-10-05

### Added
- `mostProductiveHour` function in `stats.js` — finds the peak focus hour from session startTime
- `mostProductiveHour` exposed in CLI `stats` command and `GET /api/stats` response
- `Best Hour` insight card on the web stats page
- `GET /api/sessions/search?q=` endpoint for keyword search via the web API
- `DELETE /api/sessions/:id` and `PUT /api/sessions/:id` REST endpoints
- Date format validation on `GET /api/sessions/week?date=` query param
- `src/seed.js` — reusable script to populate MongoDB with sample sessions
- `npm run seed`, `npm run cli`, and `npm run test:unit` scripts in `package.json`
- Error boundaries on all client fetch calls in `client/pages/stats.js`
- Parallel page load via `Promise.allSettled` in stats page

### Changed
- `storage.js` — added `deleteSessionById`, `updateSessionById`, and `syncToJson` (auto-backup to `sessions.json`)
- `src/index.js` CLI — `log`, `delete`, `edit` commands now use targeted MongoDB ops instead of load-all/bulk-upsert
- `src/models/Session.js` — strengthened with custom validators for ISO date format, YYYY-MM-DD format, and integer duration
- README updated to reflect MongoDB architecture, full API table, and all CLI commands

## [1.4.0] — 2026-10-04

### Added
- MongoDB persistence via Mongoose — replaces flat JSON file as primary store
- `src/db.js` — `connectDB` / `disconnectDB` helpers
- `src/models/Session.js` — Mongoose schema with date index
- `src/server.js` — Express HTTP server with REST API and static file serving
- Web UI — Dashboard, Timer, Log, History, Stats, and Report pages
- `client/voice.js` — voice input support for session logging
- `client/icons.js` — shared SVG icon helpers

## [1.3.0] — 2026-09-28

### Added
- `export` CLI command — generates a weekly Markdown report file
- `src/report.js` — pure Markdown formatter for weekly session data
- Property-based tests using fast-check in `tests/property/`
- Weekly report unit tests in `tests/unit/report.test.js`

## [1.2.0] — 2026-09-21

### Added
- `delete <id>` CLI command — remove a session by UUID
- `edit <id>` CLI command — update description and/or duration
- `search <keyword>` CLI command — filter sessions by description keyword
- `streak` CLI command — visual 4-week calendar with current and longest streak

## [1.1.0] — 2026-09-14

### Added
- `stats` CLI command — total sessions, total minutes, average duration, streaks, most productive day
- `week` CLI command — sessions grouped by day for the current week
- `src/stats.js` — `totalMinutes`, `averageDuration`, `groupByDay`, `currentStreak`, `longestStreak`, `mostProductiveDay`
- Unit tests for `sessions.js` and `stats.js`

## [1.0.0] — 2026-09-07

### Added
- `log <description> --duration <minutes>` CLI command
- `today` CLI command — list today's sessions
- `src/sessions.js` — `validateSession`, `createSession`, `filterByDate`, `filterByWeek`
- `src/storage.js` — JSON file read/write
- Session data model: `id`, `description`, `duration`, `startTime`, `date`, `completed`
- `.kiro/specs/` — full requirements, design, and task specs
- `.kiro/steering/` — coding standards and project context steering files
- `.kiro/hooks/` — lint-on-save and test-after-task hooks
