---
inclusion: always
---

# Coding Standards: Pomodoro Session Logger

## General Rules

- Use **ES Modules** (`import`/`export`) throughout — never `require()`
- Use `const` by default; only use `let` when reassignment is necessary
- Never use `var`
- Always use strict equality (`===`, never `==`)
- Keep functions small and single-purpose (max ~20 lines per function)
- All functions must have a descriptive name — no anonymous functions as exports

## Naming Conventions

- Variables and functions: `camelCase`
- Constants (fixed values): `UPPER_SNAKE_CASE`
- Files: `kebab-case.js` (e.g., `session-utils.js`) — current files use short names which is fine
- No abbreviations unless universally understood (e.g., `id`, `url`, `cli`)

## Error Handling

- Never silently swallow errors — always log or rethrow
- User-facing errors must print a clear message with `console.error()`
- Internal errors (storage failures, parse errors) must include the original error message
- Validate input at the boundary (CLI layer), not deep in business logic

## Comments

- Write comments for **why**, not **what**
- Every exported function must have a one-line JSDoc comment explaining its purpose
- No commented-out code in committed files

## Module Responsibilities

- `sessions.js` — pure logic only, no file I/O, no CLI output
- `storage.js` — file I/O only, no business logic
- `stats.js` — pure calculation functions, no side effects
- `index.js` — CLI wiring only; delegate all logic to other modules

## Testing Standards

- Every pure function in `sessions.js` and `stats.js` must have tests
- Property tests go in `tests/property/` using fast-check
- Unit tests go in `tests/unit/`
- Test descriptions must be human-readable sentences
- No test should rely on the current system date — use fixed dates

## Data Integrity

- Always validate session data before writing to storage
- Duration must be an integer between 1 and 120 (inclusive)
- Description must be a non-empty string after trimming whitespace
- Never modify existing sessions — append only
