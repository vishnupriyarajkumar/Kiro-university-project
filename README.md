# Pomodoro Session Logger 🍅

A CLI tool to log your focus sessions, track productivity streaks, and analyze your work patterns — built as part of **Kiro University**.

## Features

- Log focus sessions with descriptions and durations
- View today's and this week's sessions
- Export weekly reports as Markdown files
- Calculate total focus time and streaks
- Identify most productive days
- Web UI for browser-based session logging and stats
- Property-based tested for reliability

## Project Structure

```
pomodoro-session-logger/
├── src/
│   ├── index.js        # CLI entry point (Commander)
│   ├── sessions.js     # Core session logic
│   ├── storage.js      # JSON file persistence + Markdown export
│   ├── stats.js        # Analytics and streak calculation
│   ├── report.js       # Pure Markdown report formatter
│   └── server.js       # HTTP web server (REST API + static files)
├── client/
│   ├── index.html      # Dashboard
│   ├── timer.html      # Pomodoro timer
│   ├── log.html        # Log a session
│   ├── history.html    # Session history
│   ├── stats.html      # Stats view
│   └── report.html     # Weekly report view
├── tests/
│   ├── unit/           # Jest unit tests
│   └── property/       # fast-check property tests
├── data/               # Session data (git-ignored)
├── docs/
│   └── mcp-setup.md    # MCP server configuration guide
├── pomodoro-power/     # Distributable Kiro Power plugin
│   ├── plugin.json
│   └── skills/         # log-session and weekly-report skills
└── .kiro/
    ├── steering/       # Coding standards & project context
    ├── specs/          # Spec-driven feature definitions
    ├── hooks/          # Automated hooks (lint, test, analytics)
    ├── agents/         # Custom productivity analyst agent
    └── settings/       # MCP server configuration
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

# Export this week's sessions as a Markdown report
node src/index.js export

# Export to a custom path
node src/index.js export --output ./my-report.md
```

## Web UI

Start the web server and open the browser UI:

```bash
node src/server.js
```

Then open `http://localhost:3000` in your browser. The server exposes a REST API:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sessions/today` | Today's sessions |
| GET | `/api/sessions/week` | This week's sessions |
| GET | `/api/stats` | Aggregated stats |
| GET | `/api/heatmap` | Last 84 days activity heatmap |
| GET | `/api/report` | Weekly Markdown report |
| POST | `/api/sessions` | Create a new session |

## Kiro University Lessons Demonstrated

| Lesson | Implementation |
|---|---|
| 1. Spec-driven Development | `.kiro/specs/` — full requirements, design, and task specs |
| 2. Steering Documents | `.kiro/steering/` — coding standards & project context (always-on) |
| 3. Hooks | `lint-on-save` (PostFileSave) + `test-after-task` (PostTaskExec) |
| 4. Property-based Testing | `tests/property/` — 18 properties with fast-check |
| 5. MCP | Filesystem MCP server — see `docs/mcp-setup.md` |
| 6. Custom Agent | `.kiro/agents/productivity-analyst.md` — reads session data, gives insights |
| 7. Kiro Power | `pomodoro-power/` — distributable plugin with log-session & weekly-report skills |

## Running Tests

```bash
npm test
```

## MCP Setup

See [`docs/mcp-setup.md`](docs/mcp-setup.md) for instructions on configuring the filesystem MCP server.
