import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Book from "@/models/Book";
import BookLoan from "@/models/BookLoan";
import { escapeRegExp } from "@/lib/matching";

const MAX_BULK_COPIES = 50;

// Normalizes a category value (array or comma string) into clean, unique tags.
const normalizeCategories = (value: any): string[] => {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const tag = String(item || "").trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
};

// Resolves the contributor from a {kind, id, name} triple. The name is always
// required; a child/mentor link is optional and only set when a real id is given.
const resolveContributor = (kind: any, id: any) => {
  if (kind === "child" && id && mongoose.Types.ObjectId.isValid(id)) {
    return { contributorChildId: id, contributorTeacherId: undefined };
  }
  if (kind === "teacher" && id && mongoose.Types.ObjectId.isValid(id)) {
    return { contributorChildId: undefined, contributorTeacherId: id };
  }
  return { contributorChildId: undefined, contributorTeacherId: undefined };
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    // Escape metacharacters and cap length, then pass the literal string to
    // Mongo's $regex (not a JS RegExp on user input) — safe against ReDoS.
    const query = escapeRegExp((searchParams.get("query") || "").trim().slice(0, 100));
    const status = searchParams.get("status");
    const group = searchParams.get("group") === "true";

    const filter: any = {};
    if (query) {
      const rx = { $regex: query, $options: "i" };
      filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }];
    }
    if (status) filter.status = status;

    const books = await Book.find(filter).sort({ title: 1, author: 1, createdAt: 1 });

    if (!group) {
      return NextResponse.json(books);
    }

    // Group copies by title + author (case-insensitive) so the same title reads
    // as one row, while each copy stays independently tracked and lendable.
    const groups = new Map<string, any>();
    for (const book of books) {
      const key = `${(book.title || "").trim().toLowerCase()}|${(book.author || "").trim().toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title: book.title,
          author: book.author,
          isbn: book.isbn || "",
          categories: [] as string[],
          totalCopies: 0,
          available: 0,
          borrowed: 0,
          lost: 0,
          retired: 0,
          contributors: [] as string[],
          copies: [] as any[],
        });
      }
      const g = groups.get(key);
      g.totalCopies++;
      if (book.status in g && typeof g[book.status] === "number") g[book.status]++;
      if (!g.isbn && book.isbn) g.isbn = book.isbn;
      for (const cat of book.category || []) {
        if (!g.categories.includes(cat)) g.categories.push(cat);
      }
      if (book.contributorName && !g.contributors.includes(book.contributorName)) {
        g.contributors.push(book.contributorName);
      }
      g.copies.push({
        _id: book._id,
        status: book.status,
        condition: book.condition || "",
        categories: book.category || [],
        contributor: book.contributorName || "",
        contributorLinked: !!(book.contributorChildId || book.contributorTeacherId),
        dateContributed: book.dateContributed,
        notes: book.notes || "",
      });
    }

    return NextResponse.json([...groups.values()]);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch books" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      title,
      author,
      isbn,
      category,
      condition,
      contributorKind,
      contributorId,
      contributorName,
      dateContributed,
      notes,
      quantity,
    } = body;

    if (!title || !author) {
      return NextResponse.json({ error: "Title and author are required" }, { status: 400 });
    }
    if (!contributorName || !contributorName.trim()) {
      return NextResponse.json({ error: "A contributor name is required" }, { status: 400 });
    }

    // Bulk add: one contributor donating several copies of the same title.
    const rawQty = Number(quantity);
    const count = Number.isInteger(rawQty) && rawQty >= 1 ? Math.min(rawQty, MAX_BULK_COPIES) : 1;

    const link = resolveContributor(contributorKind, contributorId);
    const base = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn?.trim() || undefined,
      category: normalizeCategories(category),
      condition: condition || undefined,
      ...link,
      contributorName: contributorName.trim(),
      dateContributed: dateContributed ? new Date(dateContributed) : new Date(),
      notes: notes?.trim() || undefined,
      status: "available",
    };

    const created = await Book.insertMany(Array.from({ length: count }, () => ({ ...base })));

    return NextResponse.json({ created: created.length, books: created }, { status: 201 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to add book" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { bookId, bookIds, status, category, contributorKind, contributorId, contributorName, ...rest } = body;

    const isBulk = Array.isArray(bookIds) && bookIds.length > 0;
    if (!isBulk && (!bookId || !mongoose.Types.ObjectId.isValid(bookId))) {
      return NextResponse.json({ error: "A valid bookId is required" }, { status: 400 });
    }
    if (isBulk && !bookIds.every((id: any) => mongoose.Types.ObjectId.isValid(id))) {
      return NextResponse.json({ error: "One or more book ids are invalid" }, { status: 400 });
    }

    const update: any = {};
    for (const field of ["title", "author", "isbn", "condition", "notes"]) {
      if (rest[field] !== undefined) update[field] = rest[field];
    }
    if (category !== undefined) update.category = normalizeCategories(category);

    // Status can be adjusted for shelf state only. "borrowed" is owned by the
    // loan routes and must never be set here.
    if (status !== undefined) {
      if (!["available", "lost", "retired"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      // A copy that is on loan must be returned first — otherwise flipping it to
      // available desyncs Book.status from the open loan, and lost/retired would
      // orphan that loan. (The DELETE route enforces the same rule.)
      const ids = isBulk ? bookIds : [bookId];
      const onLoan = await BookLoan.findOne({ bookId: { $in: ids }, status: "borrowed" });
      if (onLoan) {
        return NextResponse.json(
          { error: "This copy is on loan. Return it before changing its status." },
          { status: 409 }
        );
      }
      update.status = status;
    }

    if (contributorName !== undefined) {
      if (!contributorName.trim()) {
        return NextResponse.json({ error: "A contributor name is required" }, { status: 400 });
      }
      update.contributorName = contributorName.trim();
      Object.assign(update, resolveContributor(contributorKind, contributorId));
    }

    // Bulk edit (e.g. re-categorising every copy of a title at once).
    if (isBulk) {
      const result = await Book.updateMany({ _id: { $in: bookIds } }, update, { runValidators: true });
      return NextResponse.json({ updated: result.modifiedCount });
    }

    const book = await Book.findByIdAndUpdate(bookId, update, { new: true, runValidators: true });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(book);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      return NextResponse.json({ error: "Invalid book update" }, { status: 400 });
    }
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to update book" }, { status: 500 });
  }
}

// Permanently removes a copy (for genuine mistakes). A copy that is currently on
// loan must be returned first; otherwise the copy and its loan history are removed
// together so no orphaned loan records are left behind.
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    let bookId = searchParams.get("bookId");
    if (!bookId) {
      const body = await request.json().catch(() => ({}));
      bookId = body.bookId;
    }

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "A valid bookId is required" }, { status: 400 });
    }

    const activeLoan = await BookLoan.findOne({ bookId, status: "borrowed" });
    if (activeLoan) {
      return NextResponse.json(
        { error: "This copy is on loan. Return it before deleting." },
        { status: 409 }
      );
    }

    const book = await Book.findByIdAndDelete(bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    await BookLoan.deleteMany({ bookId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to delete book" }, { status: 500 });
  }
}
