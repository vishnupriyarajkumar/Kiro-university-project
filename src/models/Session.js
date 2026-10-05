import mongoose from 'mongoose';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_REGEX  = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/**
 * Mongoose schema for a Pomodoro session.
 * Shape matches the existing JSON data model exactly so existing
 * data can be migrated without transformation.
 */
const sessionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Session id is required.'],
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required.'],
      trim: true,
      minlength: [1, 'Description must not be empty.'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required.'],
      min: [1,   'Duration must be at least 1 minute.'],
      max: [120, 'Duration must not exceed 120 minutes.'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be an integer.',
      },
    },
    startTime: {
      type: String,
      required: [true, 'startTime is required.'],
      validate: {
        validator: (v) => ISO_REGEX.test(v),
        message: 'startTime must be a valid ISO 8601 string.',
      },
    },
    date: {
      type: String,
      required: [true, 'date is required.'],
      validate: {
        validator: (v) => DATE_REGEX.test(v),
        message: 'date must be in YYYY-MM-DD format.',
      },
    },
    completed: { type: Boolean, default: true },
  },
  {
    versionKey: false,
  }
);

// Fast daily/weekly queries
sessionSchema.index({ date: 1 });
// Fast ID lookups used by delete/update
sessionSchema.index({ id: 1 });

/** Session model — maps to the "sessions" collection in MongoDB. */
const Session = mongoose.model('Session', sessionSchema);

export default Session;
