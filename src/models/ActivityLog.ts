import mongoose from "mongoose";

// Append-only audit trail: who did what, when. Written best-effort by the
// logActivity() helper after a successful mutating action. Never edited/deleted
// through the app.
const ActivityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    actorName: { type: String, default: "system" }, // display name at the time
    actorRole: { type: String },
    action: { type: String, required: true }, // controlled slug, e.g. "loan.lend"
    targetType: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    summary: { type: String, required: true }, // human-readable line
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ actorId: 1, createdAt: -1 });

if (mongoose.models.ActivityLog) {
  delete mongoose.models.ActivityLog;
}

export default mongoose.model("ActivityLog", ActivityLogSchema);
