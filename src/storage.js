import Session from './models/Session.js';

/**
 * Load all sessions from MongoDB, sorted oldest-first.
 * Returns a plain JS array matching the original JSON shape.
 */
export async function loadSessions() {
  const docs = await Session.find({}).sort({ startTime: 1 }).lean();
  // lean() returns plain objects; rename _id-free docs to match original shape
  return docs.map(normalise);
}

/**
 * Save a single new session to MongoDB.
 * Replaces the old "write the full array" pattern — we only ever append.
 */
export async function saveSession(sessionData) {
  const doc = new Session(sessionData);
  await doc.save();
}

/**
 * Legacy bulk-save kept for any callers that still pass the full array.
 * Upserts each session by its `id` field — safe to call multiple times.
 */
export async function saveSessions(sessions) {
  const ops = sessions.map(s => ({
    updateOne: {
      filter: { id: s.id },
      update: { $set: s },
      upsert: true,
    },
  }));
  if (ops.length > 0) await Session.bulkWrite(ops);
}

/**
 * Strip Mongoose internals and return a plain session object
 * that matches the original { id, description, duration, startTime, date, completed } shape.
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
