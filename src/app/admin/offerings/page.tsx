"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Coins,
  Plus,
  X,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  Search,
  Download,
} from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

const DENOMS = [1000, 500, 200, 100, 50, 20, 10, 5];
const SERVICES = ["1st Service", "2nd Service", "Special Event"];
type Counts = Record<string, string>;

const naira = (n: number) => "₦" + (n || 0).toLocaleString();
const keyOf = (d: Date) => {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const todayKey = () => keyOf(new Date());
const fmtDay = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const fmtMonth = (key: string) =>
  new Date(`${key}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

const countsTotal = (counts: Counts) =>
  DENOMS.reduce((s, d) => s + d * (parseInt(counts[d] || "0", 10) || 0), 0);

const toPayload = (counts: Counts) => {
  const out: Record<string, number> = {};
  for (const d of DENOMS) {
    const n = parseInt(counts[d] || "0", 10);
    if (n > 0) out[d] = n;
  }
  return out;
};

const fromDenoms = (denoms: Record<string, number>): Counts => {
  const c: Counts = {};
  for (const d of DENOMS) c[d] = denoms?.[d] ? String(denoms[d]) : "";
  return c;
};

export default function OfferingsPage() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [month, setMonth] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null); // per-service denomination breakdown
  const [expandedSundays, setExpandedSundays] = useState<Set<string>>(new Set());
  const [dateSearch, setDateSearch] = useState("");

  // CSV export
  const [showExport, setShowExport] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  // Record form
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(todayKey());
  const [formService, setFormService] = useState("1st Service");
  const [formCounts, setFormCounts] = useState<Counts>({});
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<{ id: string; label: string } | null>(null);
  const [editCounts, setEditCounts] = useState<Counts>({});
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOfferings = useCallback(async (m?: string) => {
    const qs = m ? `?month=${m}` : "";
    const res = await fetch(`/api/admin/offerings${qs}`);
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setMonth(json.month);
      // Expand the most recent Sunday by default; keep the rest collapsed.
      setExpandedSundays(new Set(json.sundays?.[0] ? [json.sundays[0].date] : []));
    } else {
      showAlert(json.error || "Could not load offerings.", { type: "error" });
    }
  }, [showAlert]);

  const toggleSunday = (date: string) =>
    setExpandedSundays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

  const openExport = () => {
    const now = new Date();
    setExportFrom(keyOf(new Date(now.getFullYear(), now.getMonth(), 1)));
    setExportTo(todayKey());
    setShowExport(true);
  };

  const applyExportPreset = (preset: "thisMonth" | "lastMonth" | "last3" | "thisYear") => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (preset === "thisMonth") {
      setExportFrom(keyOf(new Date(y, m, 1)));
      setExportTo(todayKey());
    } else if (preset === "lastMonth") {
      setExportFrom(keyOf(new Date(y, m - 1, 1)));
      setExportTo(keyOf(new Date(y, m, 0))); // last day of previous month
    } else if (preset === "last3") {
      setExportFrom(keyOf(new Date(y, m - 2, 1)));
      setExportTo(todayKey());
    } else {
      setExportFrom(keyOf(new Date(y, 0, 1)));
      setExportTo(todayKey());
    }
  };

  const doExport = () => {
    if (!exportFrom || !exportTo) {
      showAlert("Pick a start and end date.", { type: "error" });
      return;
    }
    if (exportFrom > exportTo) {
      showAlert("The start date must be on or before the end date.", { type: "error" });
      return;
    }
    window.open(`/api/admin/offerings/export?from=${exportFrom}&to=${exportTo}`, "_blank");
    setShowExport(false);
  };

  useEffect(() => {
    fetchOfferings().finally(() => setLoading(false));
  }, [fetchOfferings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOfferings(month || undefined);
      showAlert("Offerings refreshed!", { type: "success" });
    } catch {
      showAlert("Failed to refresh offerings.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const onMonthChange = async (m: string) => {
    setMonth(m);
    setLoading(true);
    await fetchOfferings(m);
    setLoading(false);
  };

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (countsTotal(formCounts) <= 0) {
      showAlert("Enter at least one denomination count.", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: formDate,
          serviceType: formService,
          denominations: toPayload(formCounts),
          notes: formNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record offering");
      setFormCounts({});
      setFormNotes("");
      setShowForm(false);
      await fetchOfferings(formDate.slice(0, 7));
      showAlert("Offering recorded.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not record the offering.", { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (service: any, dateKey: string) => {
    setEditTarget({ id: service._id, label: `${service.serviceType} · ${fmtDay(dateKey)}` });
    setEditCounts(fromDenoms(service.denominations || {}));
    setEditNotes(service.notes || "");
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (countsTotal(editCounts) <= 0) {
      showAlert("Enter at least one denomination count.", { type: "error" });
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch("/api/admin/offerings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offeringId: editTarget.id, denominations: toPayload(editCounts), notes: editNotes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update offering");
      setEditTarget(null);
      await fetchOfferings(month || undefined);
      showAlert("Offering updated.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not update the offering.", { type: "error" });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/offerings?offeringId=${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete offering");
      setDeleteTarget(null);
      await fetchOfferings(month || undefined);
      showAlert("Offering deleted.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not delete the offering.", { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading offerings...</span>
      </div>
    );
  }

  const summary = data?.summary;
  const sundays: any[] = data?.sundays || [];
  const months: string[] = data?.availableMonths || [];
  const monthOptions = months.includes(month) || !month ? months : [month, ...months];

  const dq = dateSearch.trim().toLowerCase();
  const visibleSundays = dq
    ? sundays.filter((s) => fmtDay(s.date).toLowerCase().includes(dq) || s.date.includes(dq))
    : sundays;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Offerings</h1>
            <p className="text-sm text-neutral-400 mt-1">Record and track offerings by service and month</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh offerings"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {monthOptions.length > 0 && (
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 flex-1 md:flex-none">
              <CalendarDays className="w-4 h-4 text-neutral-500 shrink-0 ml-1" />
              <select
                value={month}
                onChange={(e) => onMonthChange(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg px-2 py-1.5 outline-none transition-all flex-1"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {fmtMonth(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={openExport}
            title="Export to CSV"
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-sm font-semibold rounded-xl border border-neutral-800 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={() => {
              setFormCounts({});
              setFormNotes("");
              setShowForm((s) => !s);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Close" : "Record"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 col-span-2 sm:col-span-1">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">This Month</h3>
            <p className="text-2xl font-bold text-green-400">{naira(summary.monthTotal)}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Latest Sunday</h3>
            <p className="text-xl font-bold text-white flex items-center gap-2">
              {summary.latestSunday ? naira(summary.latestSunday.total) : "—"}
              {summary.latestSunday && <TrendingUp className="w-4 h-4 text-green-500" />}
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">1st Service</h3>
            <p className="text-xl font-bold text-white">{naira(summary.serviceTotals["1st Service"])}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">2nd Service</h3>
            <p className="text-xl font-bold text-white">{naira(summary.serviceTotals["2nd Service"])}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Sundays</h3>
            <p className="text-2xl font-bold text-white">{summary.sundaysRecorded}</p>
          </div>
        </div>
      )}

      {/* Record form */}
      {showForm && (
        <form
          onSubmit={handleRecord}
          className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-500" /> Record an Offering
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Date *</label>
              <input
                type="date"
                value={formDate}
                max={todayKey()}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Service *</label>
              <select
                value={formService}
                onChange={(e) => setFormService(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-2">Note counts</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DENOMS.map((d) => (
                <div key={d} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                  <div className="text-xs text-neutral-400 mb-1">{naira(d)}</div>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={formCounts[d] ?? ""}
                    onChange={(e) => setFormCounts({ ...formCounts, [d]: e.target.value })}
                    placeholder="0"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-2 py-1.5 outline-none transition-all"
                  />
                  {parseInt(formCounts[d] || "0", 10) > 0 && (
                    <div className="text-[11px] text-green-400 mt-1">{naira(d * (parseInt(formCounts[d] || "0", 10) || 0))}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Notes (optional)</label>
            <input
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="text-sm text-neutral-400">
              Total: <span className="text-lg font-bold text-green-400">{naira(countsTotal(formCounts))}</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
              Record offering
            </button>
          </div>
        </form>
      )}

      {/* Per-Sunday log */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            {month ? fmtMonth(month) : "This month"} · log
          </h2>
          {sundays.length > 0 && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={dateSearch}
                onChange={(e) => setDateSearch(e.target.value)}
                placeholder="Search a date (e.g. 2, Sunday)"
                className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-xl pl-9 pr-3 py-2 outline-none transition-all"
              />
            </div>
          )}
        </div>

        {sundays.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
            <Coins className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No offerings this month</h3>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto">Use "Record" to log the first service's offering.</p>
          </div>
        ) : visibleSundays.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center text-neutral-500">
            <p className="text-sm">No Sundays match "{dateSearch}".</p>
          </div>
        ) : (
          visibleSundays.map((sunday) => {
            const sundayOpen = expandedSundays.has(sunday.date);
            return (
            <div key={sunday.date} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6">
              <button
                onClick={() => toggleSunday(sunday.date)}
                className={`flex items-center justify-between gap-3 w-full text-left cursor-pointer ${
                  sundayOpen ? "mb-4 pb-4 border-b border-neutral-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {sundayOpen ? (
                    <ChevronDown className="w-5 h-5 text-neutral-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-500 shrink-0" />
                  )}
                  <CalendarDays className="w-5 h-5 text-blue-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-bold text-white truncate">{fmtDay(sunday.date)}</h3>
                </div>
                <span className="text-sm font-bold text-green-400 whitespace-nowrap">
                  {naira(sunday.sundayTotal)}
                  <span className="ml-1.5 text-[11px] font-normal text-neutral-500">
                    · {sunday.services.length} {sunday.services.length === 1 ? "service" : "services"}
                  </span>
                </span>
              </button>

              {sundayOpen && (
              <div className="space-y-2.5">
                {sunday.services.map((svc: any) => {
                  const key = svc._id;
                  const open = expanded === key;
                  const denomEntries = DENOMS.filter((d) => svc.denominations?.[d] > 0);
                  return (
                    <div key={key} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between gap-3 p-3.5">
                        <button
                          onClick={() => setExpanded(open ? null : key)}
                          className="flex items-center gap-2 text-left cursor-pointer min-w-0 flex-1"
                        >
                          {open ? (
                            <ChevronDown className="w-4 h-4 text-neutral-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-white truncate">{svc.serviceType}</span>
                          {svc.notes && <span className="text-xs text-neutral-500 truncate hidden sm:inline">· {svc.notes}</span>}
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-white">{naira(svc.total)}</span>
                          <button
                            onClick={() => openEdit(svc, sunday.date)}
                            title="Edit"
                            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: key, label: `${svc.serviceType} · ${fmtDay(sunday.date)}` })}
                            title="Delete"
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {open && (
                        <div className="border-t border-neutral-800 px-3.5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {denomEntries.length === 0 ? (
                            <span className="text-xs text-neutral-500">No breakdown.</span>
                          ) : (
                            denomEntries.map((d) => (
                              <div key={d} className="text-xs text-neutral-400">
                                {naira(d)} × {svc.denominations[d]}{" "}
                                <span className="text-neutral-500">= {naira(d * svc.denominations[d])}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !savingEdit && setEditTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" /> Edit offering
              </h2>
              <button type="button" onClick={() => setEditTarget(null)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">{editTarget.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DENOMS.map((d) => (
                <div key={d} className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                  <div className="text-xs text-neutral-400 mb-1">{naira(d)}</div>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={editCounts[d] ?? ""}
                    onChange={(e) => setEditCounts({ ...editCounts, [d]: e.target.value })}
                    placeholder="0"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-2 py-1.5 outline-none transition-all"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Notes (optional)</label>
              <input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
              />
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-sm text-neutral-400">
                Total: <span className="font-bold text-green-400">{naira(countsTotal(editCounts))}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitEdit}
                  disabled={savingEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
                >
                  {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-white">Delete offering</h2>
            </div>
            <p className="text-sm text-neutral-300">
              Permanently delete the offering for <span className="font-semibold text-white">{deleteTarget.label}</span>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {showExport && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setShowExport(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-500" /> Export offerings
              </h2>
              <button type="button" onClick={() => setShowExport(false)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-400">Download a CSV of offerings within a date range.</p>

            <div className="flex flex-wrap gap-2">
              {[
                { k: "thisMonth", label: "This month" },
                { k: "lastMonth", label: "Last month" },
                { k: "last3", label: "Last 3 months" },
                { k: "thisYear", label: "This year" },
              ].map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => applyExportPreset(p.k as any)}
                  className="px-3 py-1.5 text-xs font-semibold bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg border border-neutral-800 transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">From</label>
                <input
                  type="date"
                  value={exportFrom}
                  max={exportTo || todayKey()}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">To</label>
                <input
                  type="date"
                  value={exportTo}
                  min={exportFrom || undefined}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExport(false)}
                className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
