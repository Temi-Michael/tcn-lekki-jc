import mongoose from "mongoose";

// Tracks failed login attempts per client key (IP) within a rolling window.
// A TTL index removes stale documents automatically, so this collection is
// self-cleaning and works across serverless instances (unlike in-memory counters).
const LoginAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // Document auto-deletes once this timestamp passes (expireAfterSeconds: 0).
  expiresAt: { type: Date, required: true },
});

LoginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.LoginAttempt ||
  mongoose.model("LoginAttempt", LoginAttemptSchema);
