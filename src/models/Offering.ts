import mongoose from "mongoose";

// One offering record per service per Sunday. `denominations` holds the count of
// each Naira note (keyed by note value as a string, e.g. { "1000": 5 }); `total`
// is always recomputed server-side from those counts, never trusted from the
// client. Monthly figures are derived by aggregating records by calendar month —
// there is no stored counter to reset.
const OfferingSchema = new mongoose.Schema(
  {
    // Stored as UTC midnight of the Sunday (from a YYYY-MM-DD input) so the
    // per-service uniqueness holds per calendar day.
    date: { type: Date, required: true },
    serviceType: {
      type: String,
      enum: ["1st Service", "2nd Service", "Special Event"],
      required: true,
    },
    denominations: { type: Map, of: Number, default: {} },
    total: { type: Number, required: true, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

// One offering entry per service per date.
OfferingSchema.index({ date: 1, serviceType: 1 }, { unique: true });
OfferingSchema.index({ date: -1 });

if (mongoose.models.Offering) {
  delete mongoose.models.Offering;
}

export default mongoose.model("Offering", OfferingSchema);
