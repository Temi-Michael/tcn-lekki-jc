import mongoose from "mongoose";

// One document == one physical copy. Two people donating the same title creates
// two Book records, each keeping its own contributor — nothing is overwritten.
// The inventory view groups copies by title for display.
const BookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    isbn: { type: String },
    // A book can belong to several categories/genres at once.
    category: { type: [String], default: [] },
    condition: {
      type: String,
      enum: ["New", "Good", "Fair", "Worn"],
    },
    // A contributor may be a registered child or mentor (linked) or anyone else.
    // The name is always stored so we can always trace how each book arrived.
    contributorChildId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Child",
    },
    contributorTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    contributorName: { type: String, required: true },
    dateContributed: { type: Date, default: Date.now },
    notes: { type: String },
    // Denormalized current state, kept in sync by the loan routes. Powers fast
    // "available / on loan" counts and blocks lending a copy that is already out.
    status: {
      type: String,
      enum: ["available", "borrowed", "lost", "retired"],
      default: "available",
    },
  },
  { timestamps: true }
);

// Search + grouping by title/author, plus status counting. No unique index:
// multiple copies legitimately share the same title/author/ISBN.
BookSchema.index({ title: 1, author: 1 });
BookSchema.index({ isbn: 1 });
BookSchema.index({ status: 1 });

if (mongoose.models.Book) {
  delete mongoose.models.Book;
}

export default mongoose.model("Book", BookSchema);
