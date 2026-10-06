# Contributing to Pomodoro Session Logger

Thanks for taking the time to contribute. This guide covers how to set up the project, the branching strategy, and commit message conventions.

## Prerequisites

- Node.js 20 or later (see `.nvmrc`)
- MongoDB running locally on `mongodb://localhost:27017`, or a connection string set via `MONGODB_URI` in `.env`

## Setup

```bash
# Install dependencies
npm install

# Copy the example env file and adjust if needed
cp .env.example .env

# Seed sample data (optional)
node src/seed.js

# Run the test suite
npm test
```

## Project Structure

| Path | Purpose |
|------|---------|
| `src/sessions.js` | Pure session logic — no I/O, no side effects |
| `src/stats.js` | Pure analytics functions |
| `src/storage.js` | MongoDB persistence + JSON backup |
| `src/server.js` | HTTP web server and REST API |
| `src/index.js` | CLI wiring only — delegates to other modules |
| `tests/unit/` | Jest unit tests |
| `tests/property/` | fast-check property-based tests |

## Branching Strategy

- `master` — stable, always passing tests
- `feat/<short-name>` — new features (e.g. `feat/export-csv`)
- `fix/<short-name>` — bug fixes (e.g. `fix/streak-timezone`)
- `refactor/<short-name>` — internal improvements with no behaviour change
- `test/<short-name>` — test additions or fixes

Create a branch from `master`, make your changes, then open a pull request targeting `master`.

## Commit Message Convention

Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short summary in present tense, lowercase, no period>
```

| Type | When to use |
|------|------------|
| `feat` | New feature visible to users |
| `fix` | Bug fix |
| `refactor` | Code change with no functional difference |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build scripts, dependencies, config |

**Examples:**

```
feat: add --json flag to stats command
fix: correct streak calculation across DST boundary
test: add property tests for totalMinutes invariants
docs: update README with new export command usage
```

## Code Standards

- Use ES Modules (`import`/`export`) — never `require()`
- `const` by default, `let` only when reassignment is necessary
- Strict equality (`===`) always
- Keep functions under ~20 lines and single-purpose
- Every exported function must have a one-line JSDoc comment
- Never silently swallow errors

Run the linter before pushing:

```bash
npm run lint
```

Run the full test suite before opening a PR:

```bash
npm test
```

## Data Integrity Rules

- Duration must be an integer between 1 and 120 minutes
- Description must be a non-empty string after trimming
- Sessions are append-only — never mutate an existing session's `id`, `date`, or `startTime`

## Recently Added Features

These were added after the initial build. When working in these areas, keep the same patterns:

### `filterByDateRange(sessions, fromDate, toDate)` — `src/sessions.js`

Filters sessions whose `date` falls within `[fromDate, toDate]` inclusive. Both dates are `YYYY-MM-DD` strings. Returns an empty array when `fromDate > toDate`. Has 8 unit tests in `tests/unit/sessions.test.js` and 6 property tests in `tests/property/sessions.test.js`.

### `summary(sessions, today)` — `src/stats.js`

Single-call convenience wrapper that returns all key stats in one object: `totalSessions`, `totalMinutes`, `averageDuration`, `currentStreak`, `longestStreak`, `mostProductiveDay`, `mostProductiveHour`. Use this instead of calling individual stat functions separately. Has 9 unit tests in `tests/unit/stats.test.js`.

### `list --count` — CLI

The `list` command now accepts a `--count` flag that prints only the total number of matching sessions as a plain number. Useful for scripting. Example: `node src/index.js list --count` or `node src/index.js list --since 2026-10-01 --count`.

### `GET /api/sessions` — `src/server.js`

Fetches all sessions with optional `?from=YYYY-MM-DD`, `?to=YYYY-MM-DD`, and `?limit=N` query params. The `?limit=N` param returns the most recent N sessions. All query params are validated before any I/O is performed.

### `GET /api/stats/streak` — `src/server.js`

Returns `currentStreak`, `longestStreak`, and `totalDaysLogged` in one JSON response. Use this endpoint when you only need streak data and want to avoid loading the full stats payload.
