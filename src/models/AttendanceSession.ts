import mongoose from "mongoose";

const AttendanceSessionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String },
    date: { type: Date, required: true },
    serviceType: {
      type: String,
      enum: ["1st Service", "2nd Service", "Special Event"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
    teachersAvailable: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

AttendanceSessionSchema.index({ date: 1, serviceType: 1 });

if (mongoose.models.AttendanceSession) {
  delete mongoose.models.AttendanceSession;
}

export default mongoose.model("AttendanceSession", AttendanceSessionSchema);
