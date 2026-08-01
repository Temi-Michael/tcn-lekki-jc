import mongoose from "mongoose";

// A single borrow/return event, linking a Book copy to whoever is holding it.
// The borrower may be a registered child or mentor (linked) or anyone else; the
// name is always stored for display and duplicate-borrow checks.
const BookLoanSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    borrowerChildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },
    borrowerTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    borrowerName: { type: String, required: true },
    borrowerEmail: { type: String },
    borrowerPhone: { type: String },
    borrowedAt: { type: Date, default: Date.now, required: true },
    dueDate: { type: Date, required: true },
    returnedAt: { type: Date },
    // Optional note + condition recorded when the book is handed back.
    returnNote: { type: String },
    returnCondition: { type: String, enum: ["New", "Good", "Fair", "Worn"] },
    status: {
      type: String,
      enum: ["borrowed", "returned"],
      default: "borrowed",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

// A copy can only have one open loan at a time. This partial unique index is the
// real integrity guard against double-lending (same technique as
// AttendanceRecord), so no multi-document transaction is needed.
BookLoanSchema.index(
  { bookId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "borrowed" } }
);
// Enforce "one book on loan per borrower at a time" for linked people. Partial +
// unique so the limit holds even under concurrent lends; the $exists guard keeps
// free-text-name loans (no linked id) out of the index so they never collide.
BookLoanSchema.index(
  { borrowerChildId: 1, status: 1 },
  { unique: true, partialFilterExpression: { borrowerChildId: { $exists: true }, status: "borrowed" } }
);
BookLoanSchema.index(
  { borrowerTeacherId: 1, status: 1 },
  { unique: true, partialFilterExpression: { borrowerTeacherId: { $exists: true }, status: "borrowed" } }
);
BookLoanSchema.index({ status: 1, dueDate: 1 });

if (mongoose.models.BookLoan) {
  delete mongoose.models.BookLoan;
}

export default mongoose.model("BookLoan", BookLoanSchema);
