import mongoose from "mongoose";

// Unified auth record for everyone who can sign in.
// - super_admin: the owner(s) — sign in with a password; see the Access + logs tabs.
// - mentor: a registered mentor — signs in with a username + 6-digit PIN, linked
//   to their Teacher record via teacherId for attribution.
// Credentials (password / pinHash) are select:false so they are never returned by
// a normal query (e.g. the Access list); reads that need them use .select("+...").
const AdminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, select: false }, // super_admin credential (bcrypt)
    pinHash: { type: String, select: false }, // mentor credential (bcrypt of the PIN)
    role: {
      type: String,
      enum: ["super_admin", "mentor"],
      default: "super_admin",
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// A mentor may have at most one login. The $exists guard keeps password-only
// super_admin rows (no teacherId) out of the unique constraint.
AdminSchema.index(
  { teacherId: 1 },
  { unique: true, partialFilterExpression: { teacherId: { $exists: true } } }
);

if (mongoose.models.Admin) {
  delete mongoose.models.Admin;
}

export default mongoose.model("Admin", AdminSchema);
