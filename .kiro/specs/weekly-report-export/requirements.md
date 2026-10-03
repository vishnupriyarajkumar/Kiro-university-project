# Requirements Document

## Introduction

This feature adds a `pomodoro export` CLI command that generates a formatted Markdown file summarising the current week's focus sessions. The exported file includes a daily breakdown of sessions with descriptions and durations, overall totals, and average session duration. The goal is to give users a shareable, human-readable record of their weekly focus work without leaving the terminal.

A new `report.js` module handles all Markdown formatting as pure functions. File I/O for writing the `.md` file is added to `storage.js`. The `export` command is wired in `index.js` using the existing Commander.js pattern.

## Glossary

- **CLI**: The command-line interface entry point (`src/index.js`) powered by Commander.js.
- **Exporter**: The `pomodoro export` CLI command responsible for orchestrating the export flow.
- **Report_Generator**: The pure-function module (`src/report.js`) responsible for building the Markdown string from session data.
- **Storage**: The file I/O module (`src/storage.js`) responsible for reading sessions and writing the Markdown export file.
- **Session**: A single focus entry with fields `{ id, description, duration, startTime, date, completed }` where `duration` is an integer number of minutes and `date` is a `YYYY-MM-DD` string.
- **Weekly_Sessions**: The subset of sessions whose `date` falls within the Monday–Sunday week that contains the reference date.
- **Export_File**: The `.md` file written to disk containing the formatted weekly report.
- **Reference_Date**: The `YYYY-MM-DD` string representing "today", used to determine which Mon–Sun week to export.

---

## Requirements

### Requirement 1: Export command availability

**User Story:** As a developer, I want a `pomodoro export` CLI command, so that I can generate a weekly report without writing any code.

#### Acceptance Criteria

1. THE CLI SHALL expose a command named `export`.
2. WHEN the user runs `pomodoro export`, THE Exporter SHALL load all sessions from storage and filter them to sessions whose `date` field falls within the Monday-to-Sunday range of the current calendar week, inclusive.
3. WHEN the user runs `pomodoro export` with an `--output <path>` option, THE Exporter SHALL write the Export_File to the path specified by `<path>`.
4. IF the path specified by `--output <path>` cannot be written to due to a filesystem error, THEN THE Exporter SHALL print an error message to stderr indicating the path and reason, and exit with a non-zero status code.
5. WHERE no `--output` option is provided, THE Exporter SHALL write the Export_File to `./pomodoro-week-<YYYY-MM-DD>.md` in the current working directory, where `<YYYY-MM-DD>` is the ISO 8601 date of the Monday of the current calendar week.
6. WHEN the Export_File is written successfully, THE Exporter SHALL print a confirmation message to stdout that includes the absolute resolved file path.
7. IF writing the Export_File fails, THEN THE Exporter SHALL print an error message to stderr indicating the reason for failure and exit with a non-zero status code.

---

### Requirement 2: Markdown report structure

**User Story:** As a developer, I want the exported Markdown file to have a clear, consistent structure, so that I can read it directly or paste it into documentation tools.

#### Acceptance Criteria

1. THE Report_Generator SHALL produce a Markdown string that begins with an `# H1` heading containing the Monday and Sunday dates of the exported week in `YYYY-MM-DD` format (e.g., `# Weekly Focus Report: 2026-10-05 – 2026-10-11`).
2. THE Report_Generator SHALL include a summary section introduced by a `## H2` heading with the exact text `Summary`, followed by the total focus time in minutes as a whole number and the total number of sessions for the week as a whole number.
3. THE Report_Generator SHALL include the average session duration in minutes, rounded to the nearest whole minute using half-up rounding (e.g., 12.5 rounds to 13), in the summary section.
4. THE Report_Generator SHALL include a daily breakdown section introduced by a `## H2` heading with the exact text `Daily Breakdown`, where each day that has at least one session is rendered as an `### H3` heading with the `YYYY-MM-DD` date.
5. WHEN a day has at least one session, THE Report_Generator SHALL list each session as a Markdown list item containing the session description and duration in minutes using the format `- <description> — <duration> min`, where sessions within a day are listed in ascending order of their `startTime`.
6. THE Report_Generator SHALL render daily sections in ascending chronological order by date.
7. IF the week has zero sessions, THEN THE Report_Generator SHALL produce a Markdown string containing only the `# H1` week heading followed by a paragraph stating that no sessions were logged for the week, with no summary or daily breakdown sections present.

---

### Requirement 3: Report_Generator is a pure module

**User Story:** As a developer, I want the Markdown formatting logic isolated in a pure module, so that it is independently testable without file system or CLI dependencies.

#### Acceptance Criteria

1. THE Report_Generator SHALL accept an array of Session objects and a reference date string in `YYYY-MM-DD` format as its only input parameters, and SHALL return a Markdown-formatted string without performing any file I/O or producing any side effects.
2. THE Report_Generator SHALL produce identical Markdown output on every invocation given the same array of Session objects and the same reference date, with sessions rendered in ascending order of their `date` field.
3. THE Report_Generator SHALL include each session's `description` and `duration` as visible text within the returned Markdown string, such that both values are recoverable by string search from the output.
4. IF the input array is empty, THEN THE Report_Generator SHALL return a valid Markdown string containing a message indicating no sessions are present, without throwing an error.
5. THE Report_Generator SHALL not import from `storage.js` or `index.js`.

---

### Requirement 4: Storage module extension for Markdown file writing

**User Story:** As a developer, I want the file-writing responsibility for the export to live in `storage.js`, so that the module boundary between I/O and logic is preserved.

#### Acceptance Criteria

1. WHEN `writeMarkdownFile` is called with a non-empty file path string and a non-empty Markdown content string, THE Storage SHALL write the content to the specified path, overwriting any existing file at that path.
2. IF the directory containing the target file path does not exist, THEN THE Storage SHALL create it before writing the file.
3. IF the write operation fails, THEN THE Storage SHALL throw an error that includes the target file path and the underlying system error message.
4. THE Storage export function SHALL not contain any Markdown formatting logic.
5. IF `writeMarkdownFile` is called with a null or empty file path, or a null or empty Markdown string, THEN THE Storage SHALL throw an error describing which argument is invalid without attempting any file system operation.

---

### Requirement 5: Input validation

**User Story:** As a developer, I want the export command to validate its inputs at the CLI boundary, so that invalid arguments produce clear error messages rather than unexpected runtime failures.

#### Acceptance Criteria

1. IF the `--output` path provided by the user is an empty string or a string containing only whitespace characters, THEN THE Exporter SHALL print an error message to stderr indicating the output path cannot be empty and exit with a non-zero status code without writing any file.
2. IF the `--output` path provided by the user is a non-empty string that contains at least one non-whitespace character, THEN THE Exporter SHALL proceed with writing the Export_File to that path.
3. IF the loaded session data contains a session where `duration` is not an integer between 1 and 120 inclusive, or where `description` is not a non-empty string after trimming whitespace, THEN THE Exporter SHALL skip that session, print a warning message to stderr identifying the skipped session by its `id`, and continue generating the report for the remaining valid sessions.

---

### Requirement 6: Default filename encodes the week

**User Story:** As a developer, I want the default export filename to reflect the week it covers, so that multiple exports do not overwrite each other.

#### Acceptance Criteria

1. IF no `--output` option is provided, THEN THE Exporter SHALL construct the default output filename as `pomodoro-week-<YYYY-MM-DD>.md`, where `<YYYY-MM-DD>` is the date of the Monday of the ISO week containing the current system date at the time the export command is invoked.
2. THE Report_Generator SHALL compute the Monday date of the ISO week containing any given calendar date, returning it as a `YYYY-MM-DD` string, where a date that is itself a Monday returns that same date unchanged.
