import mongoose from "mongoose";

const ChildSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    dob: { type: Date, required: true },
    parentName: { type: String, required: true },
    parentPhone: { type: String, required: true },
    parentEmail: { type: String },
    phone: { type: String },
    email: { type: String },
    schoolClass: { type: String, required: true },
    dayOrBoarding: { type: String, enum: ["Day", "Boarding"], required: true },
    sundayService: { type: String, enum: ["1st Service", "2nd Service", "Either"], required: true },
    customData: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Search indexes for faster querying at the kiosk check-in board
ChildSchema.index({ firstName: 1, lastName: 1 });
ChildSchema.index({ parentPhone: 1 });

// The same child cannot be registered twice. Enforced by the database so that
// two simultaneous writes cannot both slip past the application-level check.
// strength: 2 makes the name comparison case-insensitive ("ada" === "Ada").
ChildSchema.index(
  { firstName: 1, lastName: 1, parentPhone: 1, dob: 1 },
  { unique: true, name: "uniq_child_identity", collation: { locale: "en", strength: 2 } }
);

if (mongoose.models.Child) {
  delete mongoose.models.Child;
}

export default mongoose.model("Child", ChildSchema);
