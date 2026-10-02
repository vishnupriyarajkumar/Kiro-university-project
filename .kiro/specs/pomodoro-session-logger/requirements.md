# Requirements: Pomodoro Session Logger

## Overview

A CLI tool for developers to log focus sessions, track productivity over time, and visualize streaks and patterns.

## User Stories

### 1. Log a Session
**As a** developer,  
**I want to** log a completed focus session with a description and duration,  
**So that** I can track what I worked on and for how long.

**Acceptance Criteria:**
- MUST accept a description (string, required) and duration in minutes (integer, required)
- MUST validate duration is between 1 and 120 minutes
- MUST validate description is non-empty after trimming
- MUST generate a unique ID (UUID v4) for each session
- MUST record the current date and time in ISO 8601 UTC format
- MUST persist the session to `data/sessions.json`
- MUST print a confirmation message on success

### 2. View Today's Sessions
**As a** developer,  
**I want to** see all sessions I logged today,  
**So that** I can review my focus time for the day.

**Acceptance Criteria:**
- MUST display all sessions where `date` equals today's date
- MUST show session description, duration, and start time
- MUST show total focus minutes for the day
- MUST display a message if no sessions exist for today

### 3. View This Week's Sessions
**As a** developer,  
**I want to** see all sessions logged this week (Mon–Sun),  
**So that** I can review my weekly productivity.

**Acceptance Criteria:**
- MUST display all sessions for the current Monday–Sunday week
- MUST group sessions by day
- MUST show daily totals and a weekly grand total
- MUST display a message if no sessions exist for this week

### 4. View Stats and Streaks
**As a** developer,  
**I want to** see my overall stats including streaks,  
**So that** I can stay motivated and identify patterns.

**Acceptance Criteria:**
- MUST display total sessions logged (all time)
- MUST display total focus minutes (all time)
- MUST display current streak (consecutive days with at least one session)
- MUST display longest streak ever
- MUST display most productive day of the week (by average minutes)
- MUST display average session duration

## Non-Functional Requirements

- All durations stored as integers in minutes
- Data file is human-readable JSON
- CLI responses must be clear and use color (Chalk) for readability
- App must handle missing or corrupt data file gracefully
- No external API calls — fully offline
