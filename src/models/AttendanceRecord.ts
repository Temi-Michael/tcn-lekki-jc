import mongoose from "mongoose";

const AttendanceRecordSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AttendanceSession",
      required: true,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    recordType: {
      type: String,
      enum: ["child", "teacher"],
      required: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    checkedInBy: {
      type: String,
      enum: ["self", "admin"],
      default: "self",
    },
    status: {
      type: String,
      enum: ["present", "absent"],
      default: "present",
    },
  },
  { timestamps: true }
);

// Prevent duplicate entries for the same child/teacher in the same session using partial indexes
AttendanceRecordSchema.index(
  { sessionId: 1, childId: 1 },
  { unique: true, partialFilterExpression: { childId: { $exists: true } } }
);
AttendanceRecordSchema.index(
  { sessionId: 1, teacherId: 1 },
  { unique: true, partialFilterExpression: { teacherId: { $exists: true } } }
);

if (mongoose.models.AttendanceRecord) {
  delete mongoose.models.AttendanceRecord;
}

export default mongoose.model("AttendanceRecord", AttendanceRecordSchema);
