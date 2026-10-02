# Implementation Tasks: Pomodoro Session Logger

## Task 1: Storage Module
- [ ] Create `src/storage.js`
- [ ] Implement `loadSessions()` — read JSON, return `[]` if file missing
- [ ] Implement `saveSessions(sessions)` — write JSON with 2-space indent
- [ ] Auto-create `data/` directory if it does not exist
- [ ] Handle and re-throw parse errors with a clear message

## Task 2: Session Logic Module
- [ ] Create `src/sessions.js`
- [ ] Implement `validateSession(description, duration)` — return `{ valid, errors }`
- [ ] Implement `createSession(description, duration)` — return full Session object
- [ ] Implement `filterByDate(sessions, date)` — filter by `YYYY-MM-DD`
- [ ] Implement `filterByWeek(sessions, referenceDate)` — filter Mon–Sun week

## Task 3: Stats Module
- [ ] Create `src/stats.js`
- [ ] Implement `totalMinutes(sessions)`
- [ ] Implement `averageDuration(sessions)`
- [ ] Implement `groupByDay(sessions)`
- [ ] Implement `currentStreak(sessions, today)`
- [ ] Implement `longestStreak(sessions)`
- [ ] Implement `mostProductiveDay(sessions)`

## Task 4: CLI Entry Point
- [ ] Create `src/index.js`
- [ ] Wire up `log` command with `--duration` option
- [ ] Wire up `today` command
- [ ] Wire up `week` command
- [ ] Wire up `stats` command
- [ ] Apply Chalk colors per design spec

## Task 5: Property-based Tests
- [ ] Create `tests/property/sessions.test.js`
- [ ] Property: total minutes always equals sum of individual durations
- [ ] Property: filterByDate never returns sessions from other dates
- [ ] Property: currentStreak is never negative
- [ ] Property: averageDuration is always between min and max session duration

## Task 6: Unit Tests
- [ ] Create `tests/unit/sessions.test.js`
- [ ] Create `tests/unit/stats.test.js`
- [ ] Test all validation rules
- [ ] Test streak edge cases (no sessions, single day, broken streak)
