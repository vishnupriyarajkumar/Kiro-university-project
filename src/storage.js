import { writeFileSync } from 'fs';
import { resolve } from 'path';
import Session from './models/Session.js';

const SESSIONS_JSON_PATH = resolve('./data/sessions.json');

/**
 * Load all sessions from MongoDB, sorted oldest-first.
 * Returns a plain JS array matching the original JSON shape.
 */
export async function loadSessions() {
  const docs = await Session.find({}).sort({ startTime: 1 }).lean();
  return docs.map(normalise);
}

/**
 * Save a single new session to MongoDB and sync to sessions.json.
 */
export async function saveSession(sessionData) {
  const doc = new Session(sessionData);
  await doc.save();
  await syncToJson();
}

/**
 * Legacy bulk-save kept for callers that pass the full array.
 * Upserts each session by its `id` field — safe to call multiple times.
 */
export async function saveSessions(sessions) {
  if (sessions.length === 0) return;
  const ops = sessions.map((s) => ({
    updateOne: {
      filter: { id: s.id },
      update: { $set: s },
      upsert: true,
    },
  }));
  await Session.bulkWrite(ops);
  await syncToJson();
}

/**
 * Delete a single session by its UUID string id.
 * Returns true if a document was deleted, false if not found.
 */
export async function deleteSessionById(id) {
  const result = await Session.deleteOne({ id });
  if (result.deletedCount > 0) {
    await syncToJson();
    return true;
  }
  return false;
}

/**
 * Update description and/or duration of a session by its UUID string id.
 * Returns the updated plain session object, or null if not found.
 */
export async function updateSessionById(id, updates) {
  const doc = await Session.findOneAndUpdate(
    { id },
    { $set: updates },
    { new: true }
  ).lean();
  if (doc) await syncToJson();
  return doc ? normalise(doc) : null;
}

/**
 * Write the full session list to sessions.json as a backup/reference.
 * Fails silently — JSON file is not the primary store.
 */
async function syncToJson() {
  try {
    const sessions = await loadSessions();
    writeFileSync(SESSIONS_JSON_PATH, JSON.stringify(sessions, null, 2), 'utf8');
  } catch {
    // Non-critical — MongoDB is the source of truth
  }
}

/**
 * Strip Mongoose internals and return a plain session object
 * matching the { id, description, duration, startTime, date, completed } shape.
 */
function normalise(doc) {
  return {
    id:          doc.id,
    description: doc.description,
    duration:    doc.duration,
    startTime:   doc.startTime,
    date:        doc.date,
    completed:   doc.completed,
  };
}
