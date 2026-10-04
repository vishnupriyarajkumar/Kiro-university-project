# Log a Pomodoro Session

Use this skill when the user wants to log a focus session using the Pomodoro CLI.

## Steps

1. Ask the user for a session description if not provided.
   - Must be non-empty after trimming whitespace.
   - Example: "Implementing auth module", "Writing unit tests"

2. Ask for the duration in minutes if not provided.
   - Must be an integer between 1 and 120 inclusive.
   - Default Pomodoro duration is 25 minutes.

3. Run the log command:
   ```bash
   node src/index.js log "<description>" --duration <minutes>
   ```

4. Confirm the session was logged by showing the output.

## Tips
- A standard Pomodoro is 25 minutes. Short sessions can be 5 or 15 minutes.
- Descriptions should be specific enough to be useful in weekly reports.
- Sessions are appended to data/sessions.json and never modified after creation.

## Example
```bash
node src/index.js log "Refactored storage module" --duration 25
```
