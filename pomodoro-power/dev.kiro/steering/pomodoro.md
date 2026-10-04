---
inclusion: always
---

# Pomodoro Logger — Agent Steering

## Project Overview
This is a Node.js CLI tool for logging and analyzing Pomodoro focus sessions.
Sessions are stored in data/sessions.json as JSON.

## Key Commands
- `node src/index.js log "<description>" --duration <minutes>` — log a session
- `node src/index.js list` — list recent sessions
- `node src/index.js stats` — show streaks and totals
- `node src/index.js report --week` — weekly summary
- `node src/index.js report --week --export` — export report to Markdown

## Data Rules
- Duration: integer, 1-120 minutes
- Description: non-empty string after trim
- Sessions are append-only — never modify existing entries
- date field format: YYYY-MM-DD
- startTime field format: ISO 8601 UTC

## Module Responsibilities
- sessions.js — pure logic, no I/O
- storage.js — file I/O only
- stats.js — pure calculation functions
- index.js — CLI wiring only
