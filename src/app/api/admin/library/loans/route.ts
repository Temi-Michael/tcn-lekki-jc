import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Book from "@/models/Book";
import BookLoan from "@/models/BookLoan";
import { nameRegex } from "@/lib/matching";
import { logActivity } from "@/lib/activity";

const LOAN_UNAVAILABLE_MESSAGE = "This copy is already on loan.";
const BORROWER_LIMIT_MESSAGE = "This borrower already has a book on loan.";
const MAX_LOAN_DAYS = 14; // a book may be lent for up to 2 weeks
const MENTOR_MAX_BOOKS = 2; // registered mentors may hold 2 books at once; everyone else 1

const dayKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
// dueDate is stored as UTC midnight of the due day; "start of today" is the
// boundary for overdue so a loan due today is not overdue until tomorrow.
const startOfTodayUTC = () => new Date(`${dayKey(new Date())}T00:00:00.000Z`);

// Validates the required due date: no earlier than today, no later than the loan
// period out. Returns an error string, or null when valid.
const validateDueDate = (dueDate: any): string | null => {
  if (!dueDate) return "A due date is required.";
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return "The due date is invalid.";

  const dueK = dayKey(due);
  const todayK = dayKey(new Date());
  const max = new Date();
  max.setDate(max.getDate() + MAX_LOAN_DAYS);
  const maxK = dayKey(max);

  if (dueK < todayK) return "The due date cannot be in the past.";
  if (dueK > maxK) return `A book cannot be lent for more than ${MAX_LOAN_DAYS} days.`;
  return null;
};

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status"); // borrowed | returned | overdue
    const query = (searchParams.get("query") || "").trim().slice(0, 100).toLowerCase();

    const filter: any = {};
    if (statusParam === "returned") filter.status = "returned";
    else if (statusParam === "borrowed" || statusParam === "overdue") filter.status = "borrowed";
    // Overdue only once the due DAY has fully passed (compare to start of today,
    // not "now"), otherwise a book due today reads as overdue all day.
    if (statusParam === "overdue") filter.dueDate = { $lt: startOfTodayUTC() };

    let loans = await BookLoan.find(filter)
      .populate("bookId", "title author isbn")
      .sort({ borrowedAt: -1 });

    // Small dataset: plain case-insensitive substring match (no RegExp on user
    // input) over the borrower name and the referenced book title.
    if (query) {
      loans = loans.filter(
        (l: any) =>
          (l.borrowerName || "").toLowerCase().includes(query) ||
          (l.bookId?.title || "").toLowerCase().includes(query)
      );
    }

    return NextResponse.json(loans);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      bookId,
      borrowerKind,
      borrowerId,
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      dueDate,
      notes,
      confirmDuplicate,
    } = body;

    if (!bookId || !mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "A valid bookId is required" }, { status: 400 });
    }
    if (!borrowerName || !borrowerName.trim()) {
      return NextResponse.json({ error: "A borrower name is required" }, { status: 400 });
    }

    const dueError = validateDueDate(dueDate);
    if (dueError) {
      return NextResponse.json({ error: dueError }, { status: 400 });
    }

    // Resolve an optional child/mentor link from the borrower.
    let borrowerChildId: string | undefined;
    let borrowerTeacherId: string | undefined;
    if (borrowerKind === "child" && borrowerId && mongoose.Types.ObjectId.isValid(borrowerId)) {
      borrowerChildId = borrowerId;
    } else if (borrowerKind === "teacher" && borrowerId && mongoose.Types.ObjectId.isValid(borrowerId)) {
      borrowerTeacherId = borrowerId;
    }

    // Borrowing limits: a registered mentor may hold up to MENTOR_MAX_BOOKS at
    // once; a registered child (and any free-text borrower) may hold 1. A linked
    // child is hard-blocked at 1 (also backed by a unique index). A free-text name
    // can only be string-matched, so it is a confirmable warning the librarian can
    // override for a genuinely different person with the same name.
    if (borrowerChildId) {
      const existing = await BookLoan.findOne({ status: "borrowed", borrowerChildId });
      if (existing) {
        return NextResponse.json({ error: BORROWER_LIMIT_MESSAGE }, { status: 409 });
      }
    } else if (borrowerTeacherId) {
      const held = await BookLoan.countDocuments({ status: "borrowed", borrowerTeacherId });
      if (held >= MENTOR_MAX_BOOKS) {
        return NextResponse.json(
          { error: `A mentor can borrow up to ${MENTOR_MAX_BOOKS} books at a time.` },
          { status: 409 }
        );
      }
    } else if (!confirmDuplicate) {
      const existing = await BookLoan.findOne({
        status: "borrowed",
        borrowerName: nameRegex(borrowerName),
      });
      if (existing) {
        return NextResponse.json(
          {
            error: `Someone named "${borrowerName.trim()}" already has a book on loan. Confirm to lend anyway.`,
            requiresConfirm: true,
          },
          { status: 409 }
        );
      }
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }
    if (book.status !== "available") {
      return NextResponse.json({ error: LOAN_UNAVAILABLE_MESSAGE }, { status: 409 });
    }

    // Create the loan first: the partial unique index rejects a second open loan
    // for this copy, so a concurrent double-lend fails here rather than corrupting
    // the count. Only then flip the denormalized book status.
    let loan;
    try {
      loan = await BookLoan.create({
        bookId,
        borrowerChildId,
        borrowerTeacherId,
        borrowerName: borrowerName.trim(),
        borrowerEmail: borrowerEmail?.trim() || undefined,
        borrowerPhone: borrowerPhone?.trim() || undefined,
        borrowedAt: new Date(),
        dueDate: new Date(dueDate),
        notes: notes?.trim() || undefined,
        status: "borrowed",
      });
    } catch (err: any) {
      // Both the copy limit and the borrower limit are enforced by partial unique
      // indexes, so a concurrent race surfaces here. keyPattern tells them apart.
      if (err.code === 11000) {
        const key = err.keyPattern || {};
        if (key.borrowerChildId || key.borrowerTeacherId) {
          return NextResponse.json({ error: BORROWER_LIMIT_MESSAGE }, { status: 409 });
        }
        return NextResponse.json({ error: LOAN_UNAVAILABLE_MESSAGE }, { status: 409 });
      }
      throw err;
    }

    book.status = "borrowed";
    await book.save();

    const populated = await BookLoan.findById(loan._id).populate("bookId", "title author isbn");
    await logActivity(
      {
        action: "loan.lend",
        summary: `Lent "${book.title}" to ${borrowerName.trim()}`,
        targetType: "BookLoan",
        targetId: loan._id,
      },
      request
    );
    return NextResponse.json(populated, { status: 201 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to lend book" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const { loanId, action, returnNote, condition, dueDate } = await request.json();

    if (!loanId || !mongoose.Types.ObjectId.isValid(loanId) || !["return", "renew"].includes(action)) {
      return NextResponse.json(
        { error: "A valid loanId and action ('return' or 'renew') are required" },
        { status: 400 }
      );
    }

    const loan = await BookLoan.findById(loanId);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }
    if (loan.status === "returned") {
      return NextResponse.json({ error: "This loan is already returned" }, { status: 409 });
    }

    // Renew: extend the due date, still capped at two months from today.
    if (action === "renew") {
      const dueError = validateDueDate(dueDate);
      if (dueError) {
        return NextResponse.json({ error: dueError }, { status: 400 });
      }
      loan.dueDate = new Date(dueDate);
      await loan.save();
      const populated = await BookLoan.findById(loan._id).populate("bookId", "title author isbn");
      await logActivity(
        {
          action: "loan.renew",
          summary: `Renewed "${(populated as any)?.bookId?.title || "a book"}" for ${loan.borrowerName}`,
          targetType: "BookLoan",
          targetId: loan._id,
        },
        request
      );
      return NextResponse.json(populated);
    }

    // Return: close the loan, optionally record the returned condition + note.
    const validCondition = condition && ["New", "Good", "Fair", "Worn"].includes(condition) ? condition : null;
    loan.status = "returned";
    loan.returnedAt = new Date();
    if (returnNote && returnNote.trim()) loan.returnNote = returnNote.trim();
    if (validCondition) loan.returnCondition = validCondition;
    await loan.save();

    // Return the copy to the shelf unless it was marked lost/retired meanwhile.
    const bookUpdate: any = { status: "available" };
    if (validCondition) bookUpdate.condition = validCondition;
    await Book.updateOne({ _id: loan.bookId, status: "borrowed" }, { $set: bookUpdate });

    const populated = await BookLoan.findById(loan._id).populate("bookId", "title author isbn");
    await logActivity(
      {
        action: "loan.return",
        summary: `Returned "${(populated as any)?.bookId?.title || "a book"}" from ${loan.borrowerName}`,
        targetType: "BookLoan",
        targetId: loan._id,
      },
      request
    );
    return NextResponse.json(populated);
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Failed to update loan" }, { status: 500 });
  }
}
