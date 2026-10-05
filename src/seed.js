/**
 * Seed script — inserts sample study sessions into MongoDB.
 * Run once to populate the database with representative data.
 * Usage: node src/seed.js
 */

import { connectDB, disconnectDB } from './db.js';
import { validateSession, createSession } from './sessions.js';
import { saveSession, loadSessions } from './storage.js';

const SEED_SESSIONS = [
  { description: 'Java',  duration: 45 },
  { description: 'DSA',   duration: 25 },
  { description: 'React', duration: 20 },
  { description: 'Java',  duration: 50 },
];

/** Insert seed sessions that don't already exist (matched by description + date). */
async function seed() {
  await connectDB();

  const today = new Date().toISOString().slice(0, 10);
  const existing = await loadSessions();
  const todayDescriptions = new Set(
    existing.filter((s) => s.date === today).map((s) => s.description)
  );

  let inserted = 0;
  for (const { description, duration } of SEED_SESSIONS) {
    const { valid, errors } = validateSession(description, duration);
    if (!valid) {
      console.error(`Skipping invalid session "${description}": ${errors.join(', ')}`);
      continue;
    }
    // Skip if already logged today with same description
    if (todayDescriptions.has(description)) {
      console.log(`⏭️  Already exists today: ${description} — skipping`);
      continue;
    }
    const session = createSession(description, duration);
    await saveSession(session);
    console.log(`✅ Seeded: ${description} [${duration} min] on ${session.date}`);
    inserted++;
  }

  console.log(`\nDone. ${inserted} session(s) inserted.`);
  await disconnectDB();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
