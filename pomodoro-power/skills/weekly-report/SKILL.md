# Generate a Weekly Report

Use this skill when the user wants a summary of their Pomodoro sessions for the current or a past week.

## Steps

1. Run the weekly report command:
   ```bash
   node src/index.js report --week
   ```

2. The report shows:
   - Total sessions for the week
   - Total focus time in minutes
   - Daily breakdown
   - Current streak (consecutive days with at least one session)
   - Most productive day

3. To export the report to a file:
   ```bash
   node src/index.js report --week --export
   ```
   This saves a Markdown report to the project root.

## Tips
- Streaks are calculated from today backwards — a gap of one day breaks the streak.
- The most productive day is the one with the highest total focus time.
- Sessions must have completed: true to be counted in stats.

## Example
```bash
node src/index.js report --week
node src/index.js report --week --export
```
