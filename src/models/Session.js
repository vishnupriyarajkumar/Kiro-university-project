import mongoose from 'mongoose';

/**
 * Mongoose schema for a Pomodoro session.
 * Shape matches the existing JSON data model exactly so existing
 * data can be migrated without transformation.
 */
const sessionSchema = new mongoose.Schema(
  {
    id:          { type: String, required: true, unique: true },
    description: { type: String, required: true, trim: true },
    duration:    { type: Number, required: true, min: 1, max: 120 },
    startTime:   { type: String, required: true },  // ISO 8601 UTC string
    date:        { type: String, required: true },  // YYYY-MM-DD
    completed:   { type: Boolean, default: true },
  },
  {
    // Disable Mongoose's default _id so our own `id` field is the identifier
    versionKey: false,
  }
);

// Index on date for fast daily/weekly queries
sessionSchema.index({ date: 1 });

/** Session model — maps to the "sessions" collection in MongoDB. */
const Session = mongoose.model('Session', sessionSchema);

export default Session;
