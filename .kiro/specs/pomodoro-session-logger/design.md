# Design: Pomodoro Session Logger

## Architecture

The app follows a clean separation of concerns across four modules:

```
CLI Layer (index.js)
    ↓
Business Logic (sessions.js, stats.js)
    ↓
Persistence Layer (storage.js)
    ↓
data/sessions.json
```

## Module Design

### `src/storage.js`
Handles all file I/O. No business logic.

```js
loadSessions()          // Read and parse data/sessions.json → Session[]
saveSessions(sessions)  // Write Session[] to data/sessions.json
```

- Creates the data file if it does not exist
- Returns empty array on missing file
- Throws with clear message on parse error

### `src/sessions.js`
Pure functions — no I/O, no side effects.

```js
createSession(description, duration)   // Validate + build a Session object
filterByDate(sessions, date)           // Return sessions matching YYYY-MM-DD date
filterByWeek(sessions, date)           // Return sessions in the Mon–Sun week of date
validateSession(description, duration) // Returns { valid, errors[] }
```

### `src/stats.js`
Pure calculation functions — no I/O, no side effects.

```js
totalMinutes(sessions)          // Sum of all durations
averageDuration(sessions)       // Mean duration, 0 if empty
currentStreak(sessions, today)  // Consecutive days up to today with ≥1 session
longestStreak(sessions)         // Longest ever consecutive-day streak
mostProductiveDay(sessions)     // Day name with highest average daily minutes
groupByDay(sessions)            // { 'YYYY-MM-DD': Session[] }
```

### `src/index.js`
CLI wiring only using Commander.js.

Commands:
- `log <description> --duration <minutes>` — calls createSession + saveSessions
- `today` — calls loadSessions + filterByDate + display
- `week` — calls loadSessions + filterByWeek + groupByDay + display
- `stats` — calls loadSessions + all stats functions + display

## Data Flow: Logging a Session

```
User: node src/index.js log "Deep work" --duration 25
  → index.js validates CLI args
  → sessions.js: validateSession("Deep work", 25) → { valid: true }
  → sessions.js: createSession("Deep work", 25) → Session object
  → storage.js: loadSessions() → existing []
  → storage.js: saveSessions([...existing, newSession])
  → index.js: print success message
```

## Error Scenarios

| Scenario | Behavior |
|---|---|
| Duration out of range | Print error, exit code 1 |
| Empty description | Print error, exit code 1 |
| data/ dir missing | Auto-create on first write |
| Corrupt JSON file | Print error with filename, exit code 1 |
| No sessions found | Print friendly empty-state message |

## Display Format (Chalk colors)

- Session description: white
- Duration: cyan bold
- Dates: yellow
- Totals/stats: green bold
- Errors: red bold
- Streak numbers: magenta bold
