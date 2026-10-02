---
inclusion: always
---

# Project Context: Pomodoro Session Logger

## What This Project Is

A Node.js CLI tool that helps developers log and analyze their focus (Pomodoro) sessions. Users can log sessions with descriptions and durations, view daily/weekly summaries, track streaks, and identify their most productive days.

## Tech Stack

- **Runtime**: Node.js (ESM modules, `"type": "module"`)
- **CLI framework**: Commander.js v12
- **Styling**: Chalk v5 (ESM-only)
- **IDs**: uuid v10
- **Testing**: Jest v29 with fast-check v3 for property-based tests
- **Linting**: ESLint v8

## Project Structure

```
src/
  index.js      - CLI entry point, Commander command definitions
  sessions.js   - Core session logic (create, validate, filter)
  storage.js    - JSON file read/write (data/sessions.json)
  stats.js      - Analytics: totals, streaks, most productive day
tests/
  unit/         - Standard Jest unit tests
  property/     - fast-check property-based tests
data/
  sessions.json - Persisted session data (git-ignored)
```

## Data Model

A session object looks like this:

```json
{
  "id": "uuid-v4",
  "description": "Working on feature X",
  "duration": 25,
  "startTime": "2026-10-02T09:00:00.000Z",
  "date": "2026-10-02",
  "completed": true
}
```

- `duration` is always in **minutes**
- `date` is always `YYYY-MM-DD` format
- `startTime` is always ISO 8601 UTC

## Key Constraints

- All durations are stored in **minutes** (never seconds or hours)
- A session duration must be between 1 and 120 minutes
- A session must have a non-empty description
- Sessions are appended to the JSON array, never mutated after creation
- Stats are always computed from the full session array, never cached
