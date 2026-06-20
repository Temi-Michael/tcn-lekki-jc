import mongoose from "mongoose";

const TeacherSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

TeacherSchema.index({ firstName: 1, lastName: 1 });

if (mongoose.models.Teacher) {
  delete mongoose.models.Teacher;
}

export default mongoose.model("Teacher", TeacherSchema);
