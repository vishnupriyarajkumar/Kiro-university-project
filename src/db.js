import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/pomodoro';

/** Connect to MongoDB. Reads MONGODB_URI from environment, falls back to local. */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${uri}`);
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

/** Gracefully close the MongoDB connection. */
export async function disconnectDB() {
  await mongoose.disconnect();
}
