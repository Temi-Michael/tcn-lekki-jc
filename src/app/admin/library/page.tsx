"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  BookOpen,
  Library,
  BookMarked,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Search,
  Plus,
  X,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  CornerDownLeft,
  CheckCircle2,
} from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

type Copy = {
  _id: string;
  status: string;
  condition: string;
  categories: string[];
  contributor: string;
  contributorLinked: boolean;
  dateContributed: string;
  notes: string;
};

type Group = {
  key: string;
  title: string;
  author: string;
  isbn: string;
  categories: string[];
  totalCopies: number;
  available: number;
  borrowed: number;
  lost: number;
  retired: number;
  contributors: string[];
  copies: Copy[];
};

type Person = { kind: "child" | "teacher" | null; id: string | null; name: string };
type CopyActionKind = "lost" | "retired" | "available" | "delete";

const CONDITIONS = ["New", "Good", "Fair", "Worn"];
const EMPTY_PERSON: Person = { kind: null, id: null, name: "" };
const PER_PAGE = 8; // book titles shown per inventory page

const COPY_ACTION_TEXT: Record<CopyActionKind, { title: string; message: string; confirm: string; danger?: boolean }> = {
  lost: {
    title: "Mark copy as lost",
    message: "This copy will no longer be available to lend. You can restore it later.",
    confirm: "Mark lost",
  },
  retired: {
    title: "Retire copy",
    message: "This copy will be removed from lending but kept on record. You can restore it later.",
    confirm: "Retire",
  },
  available: {
    title: "Restore copy",
    message: "Return this copy to the shelf so it can be lent again.",
    confirm: "Restore",
  },
  delete: {
    title: "Delete copy",
    message: "Permanently delete this copy and its loan history. This cannot be undone.",
    confirm: "Delete",
    danger: true,
  },
};

const pad = (n: number) => String(n).padStart(2, "0");
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

// Overdue only once the due DAY has fully passed — compare calendar days, not
// timestamps, so a book due today is not shown overdue until tomorrow (matches
// the server's overdue filter).
const isOverdue = (l: any) => {
  if (l.status !== "borrowed" || !l.dueDate) return false;
  const due = new Date(l.dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

/** Type a name freely, or pick a registered child/mentor to link the record. */
function PersonPicker({
  value,
  onChange,
  people,
  placeholder,
}: {
  value: Person;
  onChange: (p: Person) => void;
  people: any[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.name.trim().toLowerCase();
  const matches = q
    ? people
        .filter((p) => `${p.firstName} ${p.lastName}`.toLowerCase().includes(q))
        .slice(0, 6)
    : [];

  return (
    <div className="relative">
      <input
        value={value.name}
        onChange={(e) => {
          onChange({ kind: null, id: null, name: e.target.value });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
      />
      {value.id && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
          {value.kind === "teacher" ? "mentor" : "child"}
        </span>
      )}
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {matches.map((p) => (
            <li key={`${p.kind}-${p._id}`}>
              <button
                type="button"
                onMouseDown={() =>
                  onChange({ kind: p.kind, id: p._id, name: `${p.firstName} ${p.lastName}` })
                }
                className="w-full text-left px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                <span>
                  {p.firstName} {p.lastName}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {p.kind === "teacher" ? "Mentor" : "Child"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const { showAlert } = useAlert();

  const [groups, setGroups] = useState<Group[]>([]);
  const [borrowedLoans, setBorrowedLoans] = useState<any[]>([]);
  const [returnedLoans, setReturnedLoans] = useState<any[] | null>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [invPage, setInvPage] = useState(1);

  // Add / add-copy form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [condition, setCondition] = useState("");
  const [contributor, setContributor] = useState<Person>(EMPTY_PERSON);
  const [dateContributed, setDateContributed] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [savingBook, setSavingBook] = useState(false);

  // Lend modal
  const [lendTarget, setLendTarget] = useState<{ bookId: string; title: string } | null>(null);
  const [borrower, setBorrower] = useState<Person>(EMPTY_PERSON);
  const [borrowerEmail, setBorrowerEmail] = useState("");
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lending, setLending] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  // Return modal
  const [returnTarget, setReturnTarget] = useState<{ loanId: string; title: string } | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [returnCondition, setReturnCondition] = useState("");
  const [returning, setReturning] = useState(false);

  // Renew modal
  const [renewTarget, setRenewTarget] = useState<{ loanId: string; title: string } | null>(null);
  const [renewDue, setRenewDue] = useState("");
  const [renewing, setRenewing] = useState(false);

  // Copy status / delete confirmation
  const [copyAction, setCopyAction] = useState<{ bookId: string; kind: CopyActionKind } | null>(null);
  const [copyBusy, setCopyBusy] = useState(false);

  // Edit categories (applies to every copy of a title)
  const [editTarget, setEditTarget] = useState<{ title: string; copyIds: string[] } | null>(null);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editCategoryInput, setEditCategoryInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Loans panel
  const [loanFilter, setLoanFilter] = useState<"borrowed" | "overdue" | "returned">("borrowed");

  const minDue = localKey(new Date());
  const maxDueDate = new Date();
  maxDueDate.setDate(maxDueDate.getDate() + 14); // 2-week loan period
  const maxDue = localKey(maxDueDate);

  // Monotonic id so out-of-order responses (fast typing, overlapping refetches)
  // can be dropped — only the most recent request is allowed to set state.
  const seqRef = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLibrary = useCallback(
    async (query?: string) => {
      const my = ++seqRef.current;
      const qs = query ? `?group=true&query=${encodeURIComponent(query)}` : "?group=true";
      try {
        const [gRes, lRes] = await Promise.all([
          fetch(`/api/admin/library/books${qs}`),
          fetch(`/api/admin/library/loans?status=borrowed`),
        ]);
        const gJson = await gRes.json();
        const lJson = await lRes.json();
        if (my !== seqRef.current) return; // superseded by a newer request
        if (gRes.ok && lRes.ok) {
          setGroups(gJson);
          setBorrowedLoans(lJson);
        } else {
          showAlert("Could not load the library. Please refresh.", { type: "error" });
        }
      } catch {
        if (my === seqRef.current) {
          showAlert("Could not load the library. Please refresh.", { type: "error" });
        }
      }
    },
    [showAlert]
  );

  useEffect(() => {
    (async () => {
      try {
        const [cRes, tRes] = await Promise.all([
          fetch("/api/admin/children"),
          fetch("/api/admin/attendance/teachers"),
        ]);
        const kids = cRes.ok ? await cRes.json() : [];
        const mentors = tRes.ok ? await tRes.json() : [];
        setPeople([
          ...kids.map((c: any) => ({ kind: "child", _id: c._id, firstName: c.firstName, lastName: c.lastName })),
          ...mentors.map((t: any) => ({ kind: "teacher", _id: t._id, firstName: t.firstName, lastName: t.lastName })),
        ]);
      } catch {
        /* non-fatal: picker just won't suggest */
      }
      await fetchLibrary();
      setLoading(false);
    })();
  }, [fetchLibrary]);

  const refreshAll = async () => {
    await fetchLibrary(search || undefined);
    if (returnedLoans) await loadReturned();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      showAlert("Library refreshed!", { type: "success" });
    } catch {
      showAlert("Failed to refresh the library.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const onSearch = (value: string) => {
    setSearch(value);
    setInvPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLibrary(value || undefined), 300);
  };

  const loadReturned = async () => {
    const res = await fetch("/api/admin/library/loans?status=returned");
    if (res.ok) setReturnedLoans(await res.json());
  };

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setIsbn("");
    setCategories([]);
    setCategoryInput("");
    setCondition("");
    setContributor(EMPTY_PERSON);
    setDateContributed("");
    setNotes("");
    setQuantity(1);
  };

  const addCategory = () => {
    const tag = categoryInput.trim();
    if (tag && !categories.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      setCategories([...categories, tag]);
    }
    setCategoryInput("");
  };

  const startAddCopy = (g: Group) => {
    resetForm();
    setTitle(g.title);
    setAuthor(g.author);
    setIsbn(g.isbn);
    setCategories([...g.categories]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) {
      showAlert("Title and author are required.", { type: "error" });
      return;
    }
    if (!contributor.name.trim()) {
      showAlert("A contributor name is required so we can trace how the book arrived.", { type: "error" });
      return;
    }
    const finalCategories =
      categoryInput.trim() && !categories.some((c) => c.toLowerCase() === categoryInput.trim().toLowerCase())
        ? [...categories, categoryInput.trim()]
        : categories;
    setSavingBook(true);
    try {
      const res = await fetch("/api/admin/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          isbn,
          category: finalCategories,
          condition,
          contributorKind: contributor.kind,
          contributorId: contributor.id,
          contributorName: contributor.name,
          dateContributed,
          notes,
          quantity: typeof quantity === "number" && quantity >= 1 ? quantity : 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add book");
      const n = json.created || 1;
      resetForm();
      setShowForm(false);
      await fetchLibrary(search || undefined);
      showAlert(n > 1 ? `${n} copies added to the library.` : "Book added to the library.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not add the book.", { type: "error" });
    } finally {
      setSavingBook(false);
    }
  };

  const openLend = (bookId: string, bookTitle: string) => {
    setLendTarget({ bookId, title: bookTitle });
    setBorrower(EMPTY_PERSON);
    setBorrowerEmail("");
    setBorrowerPhone("");
    setDueDate("");
  };

  const closeLend = () => {
    setLendTarget(null);
    setConfirmMsg(null);
  };

  const submitLoan = async (confirmDuplicate: boolean) => {
    if (!lendTarget) return;
    setLending(true);
    try {
      const res = await fetch("/api/admin/library/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: lendTarget.bookId,
          borrowerKind: borrower.kind,
          borrowerId: borrower.id,
          borrowerName: borrower.name,
          borrowerEmail,
          borrowerPhone,
          dueDate,
          confirmDuplicate,
        }),
      });
      const json = await res.json();
      // A typed-in name already has a book out — ask the librarian to confirm
      // via a modal instead of a native browser alert.
      if (res.status === 409 && json.requiresConfirm && !confirmDuplicate) {
        setConfirmMsg(json.error);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Failed to lend book");
      closeLend();
      await fetchLibrary(search || undefined);
      showAlert("Book lent out.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not lend the book.", { type: "error" });
    } finally {
      setLending(false);
    }
  };

  const handleLend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lendTarget) return;
    if (!borrower.name.trim()) {
      showAlert("Please enter who is borrowing this book.", { type: "error" });
      return;
    }
    if (!dueDate) {
      showAlert("A due date is required (up to 2 weeks).", { type: "error" });
      return;
    }
    submitLoan(false);
  };

  const openReturn = (loanId: string, bookTitle: string) => {
    setReturnTarget({ loanId, title: bookTitle });
    setReturnNote("");
    setReturnCondition("");
  };

  const submitReturn = async () => {
    if (!returnTarget) return;
    setReturning(true);
    try {
      const res = await fetch("/api/admin/library/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: returnTarget.loanId,
          action: "return",
          returnNote,
          condition: returnCondition || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to return book");
      setReturnTarget(null);
      await refreshAll();
      showAlert("Book returned.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not return the book.", { type: "error" });
    } finally {
      setReturning(false);
    }
  };

  const openRenew = (loanId: string, bookTitle: string) => {
    setRenewTarget({ loanId, title: bookTitle });
    setRenewDue("");
  };

  const submitRenew = async () => {
    if (!renewTarget) return;
    if (!renewDue) {
      showAlert("Pick a new due date (up to 2 weeks).", { type: "error" });
      return;
    }
    setRenewing(true);
    try {
      const res = await fetch("/api/admin/library/loans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanId: renewTarget.loanId, action: "renew", dueDate: renewDue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to renew loan");
      setRenewTarget(null);
      await refreshAll();
      showAlert("Loan renewed.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not renew the loan.", { type: "error" });
    } finally {
      setRenewing(false);
    }
  };

  const runCopyAction = async () => {
    if (!copyAction) return;
    setCopyBusy(true);
    try {
      if (copyAction.kind === "delete") {
        const res = await fetch(`/api/admin/library/books?bookId=${copyAction.bookId}`, { method: "DELETE" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to delete copy");
        showAlert("Copy deleted.", { type: "success" });
      } else {
        const res = await fetch("/api/admin/library/books", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: copyAction.bookId, status: copyAction.kind }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Failed to update copy");
        showAlert("Copy updated.", { type: "success" });
      }
      setCopyAction(null);
      await fetchLibrary(search || undefined);
    } catch (err: any) {
      showAlert(err.message || "Could not update the copy.", { type: "error" });
    } finally {
      setCopyBusy(false);
    }
  };

  const openEditCategories = (g: Group) => {
    setEditTarget({ title: g.title, copyIds: g.copies.map((c) => c._id) });
    setEditCategories([...g.categories]);
    setEditCategoryInput("");
  };

  const addEditCategory = () => {
    const tag = editCategoryInput.trim();
    if (tag && !editCategories.some((c) => c.toLowerCase() === tag.toLowerCase())) {
      setEditCategories([...editCategories, tag]);
    }
    setEditCategoryInput("");
  };

  const submitEditCategories = async () => {
    if (!editTarget) return;
    const finalCats =
      editCategoryInput.trim() && !editCategories.some((c) => c.toLowerCase() === editCategoryInput.trim().toLowerCase())
        ? [...editCategories, editCategoryInput.trim()]
        : editCategories;
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/library/books", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookIds: editTarget.copyIds, category: finalCats }),
      });
      if (!res.ok) throw new Error();
      setEditTarget(null);
      await fetchLibrary(search || undefined);
      showAlert("Categories updated.", { type: "success" });
    } catch {
      showAlert("Could not update the categories.", { type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const switchLoanFilter = async (f: "borrowed" | "overdue" | "returned") => {
    setLoanFilter(f);
    if (f === "returned" && returnedLoans === null) await loadReturned();
  };

  // Summary
  const totalTitles = groups.length;
  const totalCopies = groups.reduce((s, g) => s + g.totalCopies, 0);
  const availableCount = groups.reduce((s, g) => s + g.available, 0);
  const onLoanCount = groups.reduce((s, g) => s + g.borrowed, 0);
  const overdueCount = borrowedLoans.filter(isOverdue).length;

  // Inventory pagination (10 titles per page)
  const totalPages = Math.max(1, Math.ceil(groups.length / PER_PAGE));
  const pagedGroups = groups.slice((invPage - 1) * PER_PAGE, invPage * PER_PAGE);
  useEffect(() => {
    if (invPage > totalPages) setInvPage(totalPages);
  }, [invPage, totalPages]);

  const shownLoans =
    loanFilter === "borrowed"
      ? borrowedLoans
      : loanFilter === "overdue"
      ? borrowedLoans.filter(isOverdue)
      : returnedLoans || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading library...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Library</h1>
            <p className="text-sm text-neutral-400 mt-1">Book inventory and lending</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh library"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm((s) => !s);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer w-full md:w-auto justify-center"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Close" : "Add Book"}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Titles</h3>
          <p className="text-2xl font-bold text-white">{totalTitles}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Copies</h3>
          <p className="text-2xl font-bold text-white">{totalCopies}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Available</h3>
          <p className="text-2xl font-bold text-green-400">{availableCount}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">On Loan</h3>
          <p className="text-2xl font-bold text-white">{onLoanCount}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Overdue</h3>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-amber-500" : "text-white"}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Add / add-copy form */}
      {showForm && (
        <form
          onSubmit={handleAddBook}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" /> Add a Book
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Author *</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">ISBN</label>
              <input
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              >
                <option value="">—</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">
                Categories <span className="text-neutral-600">(press Enter or comma to add several)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 bg-neutral-950 border border-neutral-800 focus-within:border-blue-500 rounded-lg px-2 py-1.5 transition-all">
                {categories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => setCategories(categories.filter((x) => x !== c))}
                      className="text-blue-300/70 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addCategory();
                    } else if (e.key === "Backspace" && !categoryInput && categories.length) {
                      setCategories(categories.slice(0, -1));
                    }
                  }}
                  onBlur={addCategory}
                  placeholder={categories.length ? "" : "e.g. Children, Devotional, Bible Study"}
                  className="flex-1 min-w-[8rem] bg-transparent text-white text-sm px-1 py-1 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Contributor * <span className="text-neutral-600">(link a child/mentor or type a name)</span>
              </label>
              <PersonPicker
                value={contributor}
                onChange={setContributor}
                people={people}
                placeholder="Search a child/mentor or type any name"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Number of copies <span className="text-neutral-600">(same contributor)</span>
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={quantity}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setQuantity(""); // allow clearing so a fresh multi-digit number can be typed
                    return;
                  }
                  const v = parseInt(raw, 10);
                  if (!Number.isNaN(v)) setQuantity(Math.min(Math.max(v, 1), 50));
                }}
                onBlur={() => {
                  if (quantity === "") setQuantity(1);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Date contributed</label>
              <input
                type="date"
                value={dateContributed}
                max={minDue}
                onChange={(e) => setDateContributed(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingBook}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              {savingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {typeof quantity === "number" && quantity > 1 ? `Add ${quantity} copies` : "Add to library"}
            </button>
          </div>
        </form>
      )}

      {/* Inventory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-500" /> Inventory
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search title, author, ISBN"
              className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none transition-all"
            />
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
            <BookOpen className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {search ? "No books match your search" : "No books yet"}
            </h3>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto">
              {search ? "Try a different title or author." : "Use “Add Book” to start the library inventory."}
            </p>
          </div>
        ) : (
          pagedGroups.map((g) => {
            const open = expanded === g.key;
            const firstAvailable = g.copies.find((c) => c.status === "available");
            return (
              <div key={g.key} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
                  <button
                    onClick={() => setExpanded(open ? null : g.key)}
                    className="flex items-start gap-3 text-left cursor-pointer flex-1 min-w-0"
                  >
                    {open ? (
                      <ChevronDown className="w-5 h-5 text-neutral-500 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-500 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{g.title}</h3>
                      <p className="text-xs text-neutral-400 mt-0.5 truncate">
                        {g.author}
                        {g.categories.length ? ` · ${g.categories.join(", ")}` : ""}
                        {g.contributors.length > 0 ? ` · from ${g.contributors.join(", ")}` : ""}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pl-8 sm:pl-0">
                    <span className="text-xs text-neutral-400 whitespace-nowrap mr-auto sm:mr-0">
                      <span className={g.available > 0 ? "text-green-400 font-semibold" : ""}>
                        {g.available} available
                      </span>{" "}
                      / {g.totalCopies}
                    </span>
                    <button
                      onClick={() => firstAvailable && openLend(firstAvailable._id, g.title)}
                      disabled={!firstAvailable}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      <BookMarked className="w-3.5 h-3.5" /> Lend
                    </button>
                    <button
                      onClick={() => startAddCopy(g)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add copy
                    </button>
                    <button
                      onClick={() => openEditCategories(g)}
                      title="Edit categories"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Categories
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-neutral-800 divide-y divide-neutral-800/60">
                    {g.copies.map((c, i) => (
                      <div
                        key={c._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 bg-neutral-950/40"
                      >
                        <div className="text-xs text-neutral-400">
                          <span className="text-neutral-300 font-medium">Copy {i + 1}</span>
                          {" · "}
                          <span
                            className={
                              c.status === "available"
                                ? "text-green-400"
                                : c.status === "borrowed"
                                ? "text-amber-400"
                                : "text-neutral-500"
                            }
                          >
                            {c.status}
                          </span>
                          {c.condition ? ` · ${c.condition}` : ""}
                          {c.contributor ? ` · from ${c.contributor}` : ""}
                          {" · added "}
                          {fmtDate(c.dateContributed)}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.status === "available" && (
                            <>
                              <button
                                onClick={() => openLend(c._id, g.title)}
                                className="px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
                              >
                                Lend
                              </button>
                              <button
                                onClick={() => setCopyAction({ bookId: c._id, kind: "lost" })}
                                className="px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                              >
                                Mark lost
                              </button>
                              <button
                                onClick={() => setCopyAction({ bookId: c._id, kind: "retired" })}
                                className="px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                              >
                                Retire
                              </button>
                            </>
                          )}
                          {c.status === "borrowed" && (
                            <span className="text-xs text-neutral-500">On loan — return from the Loans list below</span>
                          )}
                          {(c.status === "lost" || c.status === "retired") && (
                            <button
                              onClick={() => setCopyAction({ bookId: c._id, kind: "available" })}
                              className="px-2.5 py-1 text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                            >
                              Restore
                            </button>
                          )}
                          {c.status !== "borrowed" && (
                            <button
                              onClick={() => setCopyAction({ bookId: c._id, kind: "delete" })}
                              title="Delete copy"
                              className="px-2.5 py-1 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Pagination */}
        {groups.length > PER_PAGE && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={() => setInvPage((p) => Math.max(1, p - 1))}
              disabled={invPage <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs text-neutral-500">
              Page {invPage} of {totalPages} · {totalTitles} titles
            </span>
            <button
              onClick={() => setInvPage((p) => Math.min(totalPages, p + 1))}
              disabled={invPage >= totalPages}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Loans */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-blue-500" /> Loans
          </h2>
          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-xl p-1">
            {(["borrowed", "overdue", "returned"] as const).map((f) => (
              <button
                key={f}
                onClick={() => switchLoanFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize ${
                  loanFilter === f ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {shownLoans.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 text-sm">
            {loanFilter === "returned"
              ? "No returned loans yet."
              : loanFilter === "overdue"
              ? "Nothing overdue — all lent books are within their due date."
              : "No books are currently on loan."}
          </div>
        ) : (
          <div className="space-y-2.5">
            {shownLoans.map((l) => {
              const overdue = isOverdue(l);
              const contact = [l.borrowerPhone, l.borrowerEmail].filter(Boolean).join(" · ");
              return (
                <div
                  key={l._id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-4 border ${
                    overdue
                      ? "bg-amber-500/5 border-amber-500/20"
                      : l.status === "returned"
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-neutral-950 border-neutral-800"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white text-sm truncate">
                      {l.bookId?.title || "Unknown book"}
                      {l.bookId?.author ? (
                        <span className="text-neutral-500 font-normal"> · {l.bookId.author}</span>
                      ) : null}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {l.borrowerName || "Unknown"} · borrowed {fmtDate(l.borrowedAt)}
                      {l.dueDate ? ` · due ${fmtDate(l.dueDate)}` : ""}
                      {l.returnedAt ? ` · returned ${fmtDate(l.returnedAt)}` : ""}
                      {overdue ? (
                        <span className="ml-2 inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Overdue
                        </span>
                      ) : null}
                    </p>
                    {contact && <p className="text-xs text-neutral-500 mt-0.5">{contact}</p>}
                    {l.status === "returned" && (l.returnCondition || l.returnNote) && (
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {l.returnCondition ? `Returned in ${l.returnCondition} condition` : ""}
                        {l.returnCondition && l.returnNote ? " · " : ""}
                        {l.returnNote ? `“${l.returnNote}”` : ""}
                      </p>
                    )}
                  </div>
                  {l.status === "borrowed" ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openRenew(l._id, l.bookId?.title || "this book")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Renew
                      </button>
                      <button
                        onClick={() => openReturn(l._id, l.bookId?.title || "this book")}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <CornerDownLeft className="w-3.5 h-3.5" /> Return
                      </button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Returned
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lend modal */}
      {lendTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !lending && !confirmMsg && closeLend()}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleLend}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-blue-500" /> Lend book
              </h2>
              <button
                type="button"
                onClick={closeLend}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">
              Lending <span className="text-white font-medium">{lendTarget.title}</span>
            </p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Borrower * <span className="text-neutral-600">(link a child/mentor or type a name)</span>
              </label>
              <PersonPicker
                value={borrower}
                onChange={setBorrower}
                people={people}
                placeholder="Search a child/mentor or type any name"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Phone (optional)</label>
                <input
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Due date * (max 2 weeks)</label>
              <input
                type="date"
                value={dueDate}
                min={minDue}
                max={maxDue}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeLend}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={lending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {lending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                Confirm loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Duplicate-borrower confirmation */}
      {confirmMsg && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-white">Already has a book out</h2>
            </div>
            <p className="text-sm text-neutral-300">{confirmMsg}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmMsg(null)}
                disabled={lending}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitLoan(true)}
                disabled={lending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {lending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
                Lend anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return modal */}
      {returnTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !returning && setReturnTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CornerDownLeft className="w-5 h-5 text-blue-500" /> Return book
              </h2>
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">
              Returning <span className="text-white font-medium">{returnTarget.title}</span>
            </p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Condition on return (optional)</label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              >
                <option value="">— leave unchanged —</option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Note (optional)</label>
              <textarea
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={2}
                placeholder="e.g. cover slightly torn"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReturn}
                disabled={returning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
                Confirm return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew modal */}
      {renewTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !renewing && setRenewTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-blue-500" /> Renew loan
              </h2>
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">
              New due date for <span className="text-white font-medium">{renewTarget.title}</span>
            </p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Due date (max 2 weeks)</label>
              <input
                type="date"
                value={renewDue}
                min={minDue}
                max={maxDue}
                onChange={(e) => setRenewDue(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRenew}
                disabled={renewing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {renewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Confirm renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy status / delete confirmation */}
      {copyAction && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !copyBusy && setCopyAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`w-5 h-5 ${COPY_ACTION_TEXT[copyAction.kind].danger ? "text-red-500" : "text-amber-500"}`}
              />
              <h2 className="text-lg font-bold text-white">{COPY_ACTION_TEXT[copyAction.kind].title}</h2>
            </div>
            <p className="text-sm text-neutral-300">{COPY_ACTION_TEXT[copyAction.kind].message}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCopyAction(null)}
                disabled={copyBusy}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runCopyAction}
                disabled={copyBusy}
                className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                  COPY_ACTION_TEXT[copyAction.kind].danger
                    ? "bg-red-600 hover:bg-red-500 disabled:bg-red-600/50"
                    : "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50"
                }`}
              >
                {copyBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : COPY_ACTION_TEXT[copyAction.kind].danger ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {COPY_ACTION_TEXT[copyAction.kind].confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit categories modal (applies to every copy of the title) */}
      {editTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !savingEdit && setEditTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" /> Edit categories
              </h2>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">
              Applies to every copy of <span className="text-white font-medium">{editTarget.title}</span>
            </p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                Categories <span className="text-neutral-600">(press Enter or comma to add)</span>
              </label>
              <div className="flex flex-wrap items-center gap-2 bg-neutral-950 border border-neutral-800 focus-within:border-blue-500 rounded-lg px-2 py-1.5 transition-all">
                {editCategories.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-md px-2 py-1"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => setEditCategories(editCategories.filter((x) => x !== c))}
                      className="text-blue-300/70 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={editCategoryInput}
                  onChange={(e) => setEditCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addEditCategory();
                    } else if (e.key === "Backspace" && !editCategoryInput && editCategories.length) {
                      setEditCategories(editCategories.slice(0, -1));
                    }
                  }}
                  onBlur={addEditCategory}
                  placeholder={editCategories.length ? "" : "e.g. Children, Devotional"}
                  className="flex-1 min-w-[8rem] bg-transparent text-white text-sm px-1 py-1 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditCategories}
                disabled={savingEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                Save categories
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
