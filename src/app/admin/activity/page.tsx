"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  ScrollText,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

const fmtWhen = (d: string) =>
  new Date(d).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const roleBadge = (role?: string) =>
  role === "super_admin"
    ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : role === "mentor"
    ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
    : "text-neutral-400 bg-neutral-800 border-neutral-700";

export default function ActivityPage() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/admin/super/activity?${params.toString()}`);
    const json = await res.json();
    if (res.ok) setData(json);
    else showAlert(json.error || "Could not load activity.", { type: "error" });
  }, [page, action, q, from, to, showAlert]);

  useEffect(() => {
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchLogs();
      showAlert("Activity refreshed.", { type: "success" });
    } catch {
      showAlert("Failed to refresh.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  // Reset to page 1 whenever a filter changes.
  const onFilter = (fn: () => void) => {
    setPage(1);
    fn();
  };

  const logs: any[] = data?.logs || [];
  const actions: string[] = data?.actions || [];
  const pages = data?.pages || 1;
  const total = data?.total || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading activity...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-blue-500" /> Activity Log
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Who did what, and when · {total} events</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => onFilter(() => setQ(e.target.value))}
            placeholder="Search actor or summary"
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none transition-all"
          />
        </div>
        <select
          value={action}
          onChange={(e) => onFilter(() => setAction(e.target.value))}
          className="bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => onFilter(() => setFrom(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg px-2 py-2 outline-none transition-all"
          />
          <span className="text-neutral-600 text-xs">to</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => onFilter(() => setTo(e.target.value))}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg px-2 py-2 outline-none transition-all"
          />
        </div>
      </div>

      {/* Log list */}
      {logs.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
          <ScrollText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <p className="text-sm">No activity matches these filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l._id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm">{l.actorName}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${roleBadge(l.actorRole)}`}>
                    {l.actorRole === "super_admin" ? "Super Admin" : l.actorRole || "system"}
                  </span>
                  <code className="text-[11px] text-neutral-500 bg-neutral-950 border border-neutral-800 rounded px-1.5 py-0.5">
                    {l.action}
                  </code>
                </div>
                <p className="text-sm text-neutral-300 mt-1">{l.summary}</p>
              </div>
              <div className="text-xs text-neutral-500 whitespace-nowrap flex items-center gap-1.5 shrink-0">
                <CalendarDays className="w-3.5 h-3.5" />
                {fmtWhen(l.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-xs text-neutral-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer"
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
