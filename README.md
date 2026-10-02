# Pomodoro Session Logger 🍅

A CLI tool to log your focus sessions, track productivity streaks, and analyze your work patterns — built as part of **Kiro University**.

## Features

- Log focus sessions with descriptions and durations
- View today's and this week's sessions
- Calculate total focus time and streaks
- Identify most productive days
- Property-based tested for reliability

## Project Structure

```
pomodoro-session-logger/
├── src/
│   ├── index.js        # CLI entry point (Commander)
│   ├── sessions.js     # Core session logic
│   ├── storage.js      # JSON file persistence
│   └── stats.js        # Analytics and streak calculation
├── tests/
│   ├── unit/
│   └── property/       # fast-check property tests
├── data/               # Session data (git-ignored)
├── .kiro/
│   ├── steering/       # Coding standards & project context
│   ├── specs/          # Spec-driven feature definitions
│   ├── hooks/          # Automated hooks
│   └── agents/         # Custom agents
└── package.json
```

## Usage

```bash
# Log a new session
node src/index.js log "Deep work on feature X" --duration 25

# View today's sessions
node src/index.js today

# View this week's sessions
node src/index.js week

# Show stats and streaks
node src/index.js stats
```

## Kiro University Lessons Demonstrated

| Lesson | Implementation |
|---|---|
| Steering Documents | `.kiro/steering/` — coding standards & project context |
| Spec-driven Development | `.kiro/specs/` — feature spec before code |
| Hooks | PostFileSave lint + PostTaskExec test runner |
| Property-based Testing | `tests/property/` with fast-check |
| MCP | Filesystem MCP server for session data access |
| Custom Agents | Productivity analyst agent |

## Running Tests

```bash
npm test
npm run test:property
```
