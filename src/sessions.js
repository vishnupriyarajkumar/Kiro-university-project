import { v4 as uuidv4 } from 'uuid';

const MIN_DURATION = 1;
const MAX_DURATION = 120;

/** Validate a session's description and duration. Returns { valid, errors }. */
export function validateSession(description, duration) {
  const errors = [];

  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    errors.push('Description must be a non-empty string.');
  }

  const dur = Number(duration);
  if (!Number.isInteger(dur) || dur < MIN_DURATION || dur > MAX_DURATION) {
    errors.push(`Duration must be an integer between ${MIN_DURATION} and ${MAX_DURATION} minutes.`);
  }

  return { valid: errors.length === 0, errors };
}

/** Create a new session object from a description and duration. Does not persist. */
export function createSession(description, duration) {
  const now = new Date();
  return {
    id: uuidv4(),
    description: description.trim(),
    duration: Number(duration),
    startTime: now.toISOString(),
    date: now.toISOString().slice(0, 10),
    completed: true,
  };
}

/** Filter sessions to only those matching the given YYYY-MM-DD date string. */
export function filterByDate(sessions, date) {
  return sessions.filter((s) => s.date === date);
}

/** Filter sessions to those within the Mon–Sun week containing referenceDate (YYYY-MM-DD). */
export function filterByWeek(sessions, referenceDate) {
  const ref = new Date(referenceDate + 'T00:00:00.000Z');
  // Get Monday of the week (getUTCDay: 0=Sun, 1=Mon ... 6=Sat)
  const day = ref.getUTCDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(ref);
  monday.setUTCDate(ref.getUTCDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  const mondayStr = monday.toISOString().slice(0, 10);
  const sundayStr = sunday.toISOString().slice(0, 10);

  return sessions.filter((s) => s.date >= mondayStr && s.date <= sundayStr);
}
