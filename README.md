# Pomodoro Session Logger 🍅

A CLI tool to log your focus sessions, track productivity streaks, and analyze your work patterns — built as part of **Kiro University**.

## Features

- Log focus sessions with descriptions and durations
- View today's and this week's sessions
- Delete and edit sessions by ID
- Search sessions by keyword
- Export weekly reports as Markdown files
- Calculate total focus time, streaks, and most productive day
- Visual 4-week streak calendar in the CLI
- Web UI for browser-based session logging and stats
- MongoDB persistence with automatic JSON backup
- Property-based tested for reliability

## Tech Stack

- **Runtime**: Node.js (ESM, `"type": "module"`)
- **CLI**: Commander.js v12
- **Database**: MongoDB via Mongoose v8
- **Web server**: Node.js built-in `http` module + Express
- **Styling**: Chalk v5
- **Testing**: Jest v29 + fast-check v3

## Project Structure

```
pomodoro-session-logger/
├── src/
│   ├── index.js        # CLI entry point (Commander)
│   ├── sessions.js     # Core session logic (pure, no I/O)
│   ├── storage.js      # MongoDB persistence + JSON backup sync
│   ├── stats.js        # Analytics and streak calculation
│   ├── report.js       # Pure Markdown report formatter
│   ├── server.js       # HTTP web server (REST API + static files)
│   ├── db.js           # MongoDB connection helpers
│   ├── seed.js         # Seed script for sample sessions
│   └── models/
│       └── Session.js  # Mongoose session schema
├── client/
│   ├── index.html      # Dashboard
│   ├── timer.html      # Pomodoro timer
│   ├── log.html        # Log a session
│   ├── history.html    # Session history
│   ├── stats.html      # Stats view
│   ├── report.html     # Weekly report view
│   └── voice.js        # Voice input support
├── tests/
│   ├── unit/           # Jest unit tests
│   └── property/       # fast-check property tests
├── data/               # sessions.json backup (git-ignored)
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

## Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally on `mongodb://localhost:27017` (or set `MONGODB_URI` in `.env`)

### Install

```bash
npm install
```

### Environment

Create a `.env` file in the project root (optional — defaults to local MongoDB):

```
MONGODB_URI=mongodb://localhost:27017/pomodoro
PORT=3000
```

### Seed sample data

```bash
node src/seed.js
```

## CLI Usage

```bash
# Log a new session
node src/index.js log "Deep work on feature X" --duration 25

# View today's sessions
node src/index.js today

# View this week's sessions grouped by day
node src/index.js week

# Show stats and streaks
node src/index.js stats

# Show visual 4-week streak calendar
node src/index.js streak

# Search sessions by keyword
node src/index.js search "Java"

# Edit a session by ID
node src/index.js edit <id> --description "New description" --duration 30

# Delete a session by ID
node src/index.js delete <id>

# Export this week's sessions as a Markdown report
node src/index.js export

# Export to a custom path
node src/index.js export --output ./my-report.md
```

## Web UI

Start the web server:

```bash
npm run web
```

Then open `http://localhost:3000` in your browser.

### REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sessions/today` | Today's sessions |
| GET | `/api/sessions/week?date=YYYY-MM-DD` | Week sessions (optional date param) |
| GET | `/api/stats` | Aggregated stats |
| GET | `/api/stats/weekly` | Mon–Sun daily minutes for bar chart |
| GET | `/api/heatmap` | Last 84 days activity heatmap |
| GET | `/api/report` | Weekly Markdown report |
| POST | `/api/sessions` | Create a new session |
| PUT | `/api/sessions/:id` | Update a session's description/duration |
| DELETE | `/api/sessions/:id` | Delete a session by ID |

## Data Model

```json
{
  "id": "uuid-v4",
  "description": "Working on feature X",
  "duration": 25,
  "startTime": "2026-10-05T09:00:00.000Z",
  "date": "2026-10-05",
  "completed": true
}
```

- `duration` is always in **minutes** (1–120)
- `date` is always `YYYY-MM-DD`
- `startTime` is always ISO 8601 UTC
- Sessions are **append-only** — never mutated after creation (use edit/delete commands)

## Running Tests

```bash
npm test
```

## Kiro University Lessons Demonstrated

| Lesson | Implementation |
|--------|----------------|
| 1. Spec-driven Development | `.kiro/specs/` — full requirements, design, and task specs |
| 2. Steering Documents | `.kiro/steering/` — coding standards & project context (always-on) |
| 3. Hooks | `lint-on-save` (PostFileSave) + `test-after-task` (PostTaskExec) |
| 4. Property-based Testing | `tests/property/` — fast-check property tests |
| 5. MCP | Filesystem MCP server — see `docs/mcp-setup.md` |
| 6. Custom Agent | `.kiro/agents/productivity-analyst.md` — reads session data, gives insights |
| 7. Kiro Power | `pomodoro-power/` — distributable plugin with log-session & weekly-report skills |

## MCP Setup

See [`docs/mcp-setup.md`](docs/mcp-setup.md) for instructions on configuring the filesystem MCP server.
