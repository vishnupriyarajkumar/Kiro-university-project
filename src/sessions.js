import { v4 as uuidv4 } from 'uuid';

const MIN_DURATION = 1;
const MAX_DURATION = 120;

/** Validate a session's description and duration. Returns { valid, errors }.
 * @param {*} description - The session description (must be a non-empty string).
 * @param {*} duration - The session duration in minutes (must be integer 1–120).
 * @returns {{ valid: boolean, errors: string[] }}
 */
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

/** Create a new session object from a description and duration. Does not persist.
 * @param {string} description - The session description (will be trimmed).
 * @param {number} duration - The session duration in minutes.
 * @returns {{ id: string, description: string, duration: number, startTime: string, date: string, completed: true }}
 */
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

/** Filter sessions to only those matching the given YYYY-MM-DD date string.
 * @param {object[]} sessions - Array of session objects.
 * @param {string} date - The date string to match (YYYY-MM-DD).
 * @returns {object[]}
 */
export function filterByDate(sessions, date) {
  return sessions.filter((s) => s.date === date);
}

/** Delete a session by ID. Returns { found, sessions } where sessions is the updated array.
 * @param {object[]} sessions - Array of session objects.
 * @param {string} id - The UUID of the session to delete.
 * @returns {{ found: boolean, sessions: object[] }}
 */
export function deleteSession(sessions, id) {
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) return { found: false, sessions };
  const updated = [...sessions.slice(0, index), ...sessions.slice(index + 1)];
  return { found: true, sessions: updated };
}

/** Edit a session's description and/or duration by ID. Returns { found, session, sessions }.
 * @param {object[]} sessions - Array of session objects.
 * @param {string} id - The UUID of the session to edit.
 * @param {{ description?: string, duration?: number }} updates - Fields to update.
 * @returns {{ found: boolean, valid?: boolean, errors?: string[], session?: object, sessions: object[] }}
 */
export function editSession(sessions, id, updates) {
  const index = sessions.findIndex((s) => s.id === id);
  if (index === -1) return { found: false, sessions };

  const existing = sessions[index];
  const newDescription = updates.description !== undefined ? updates.description.trim() : existing.description;
  const newDuration = updates.duration !== undefined ? Number(updates.duration) : existing.duration;

  const { valid, errors } = validateSession(newDescription, newDuration);
  if (!valid) return { found: true, valid: false, errors, sessions };

  const updated = { ...existing, description: newDescription, duration: newDuration };
  const updatedSessions = [...sessions.slice(0, index), updated, ...sessions.slice(index + 1)];
  return { found: true, valid: true, session: updated, sessions: updatedSessions };
}

/** Search sessions by keyword in description (case-insensitive).
 * @param {object[]} sessions - Array of session objects.
 * @param {string} keyword - The search keyword.
 * @returns {object[]}
 */
export function searchSessions(sessions, keyword) {
  const lower = keyword.toLowerCase();
  return sessions.filter((s) => s.description.toLowerCase().includes(lower));
}

/** Filter sessions to those within the Mon–Sun week containing referenceDate (YYYY-MM-DD).
 * @param {object[]} sessions - Array of session objects.
 * @param {string} referenceDate - Any date within the target week (YYYY-MM-DD).
 * @returns {object[]}
 */
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

/**
 * Filter sessions whose date falls within [fromDate, toDate] inclusive.
 * Both dates must be YYYY-MM-DD strings.
 * @param {object[]} sessions - Array of session objects.
 * @param {string} fromDate - Start date (YYYY-MM-DD), inclusive.
 * @param {string} toDate - End date (YYYY-MM-DD), inclusive.
 * @returns {object[]}
 */
export function filterByDateRange(sessions, fromDate, toDate) {
  return sessions.filter((s) => s.date >= fromDate && s.date <= toDate);
}
