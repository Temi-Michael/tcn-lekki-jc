import mongoose from "mongoose";

const SubmissionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },
    // Standard fields for duplicate checks
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    age: { type: Number, required: true },
    
    // Store all custom fields
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },

    status: {
      type: String,
      enum: ["approved", "needs_review", "rejected"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// Indexes to speed up duplicate checking
SubmissionSchema.index({ formId: 1, firstName: 1, lastName: 1 });

if (mongoose.models.Submission) {
  delete mongoose.models.Submission;
}

export default mongoose.model("Submission", SubmissionSchema);
