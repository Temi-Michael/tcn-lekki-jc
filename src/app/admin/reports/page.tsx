"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Phone,
  Check,
  Undo2,
  RefreshCw,
  CalendarSearch,
} from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

const formatDay = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function SundayReportsPage() {
  const { showAlert } = useAlert();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [busyChild, setBusyChild] = useState<string | null>(null);

  const fetchReports = useCallback(async (date?: string) => {
    const qs = date ? `?date=${date}` : "";
    const res = await fetch(`/api/admin/attendance/reports${qs}`);
    const json = await res.json();
    if (res.ok) setData(json);
    else console.error("Failed to load reports", json.error);
  }, []);

  useEffect(() => {
    fetchReports().finally(() => setLoading(false));
  }, [fetchReports]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchReports(filterDate || undefined);
      showAlert("Reports refreshed!", { type: "success" });
    } catch {
      showAlert("Failed to refresh reports.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const onDateChange = async (value: string) => {
    setFilterDate(value);
    setLoading(true);
    await fetchReports(value || undefined);
    setLoading(false);
  };

  const handleFollowUp = async (childId: string, action: "contact" | "undo") => {
    setBusyChild(childId);
    try {
      const res = await fetch("/api/admin/attendance/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, action }),
      });
      if (!res.ok) throw new Error();
      await fetchReports(filterDate || undefined);
      showAlert(action === "contact" ? "Marked as contacted." : "Follow-up reopened.", { type: "success" });
    } catch {
      showAlert("Could not update follow-up status.", { type: "error" });
    } finally {
      setBusyChild(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading Sunday reports...</span>
      </div>
    );
  }

  const summary = data?.summary;
  const sundays: any[] = data?.sundays || [];
  const followUp: any[] = data?.followUp || [];
  const activeFollowUps = followUp.filter((f) => !f.contacted);
  const contactedFollowUps = followUp.filter((f) => f.contacted);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Sunday Reports</h1>
            <p className="text-sm text-neutral-400 mt-1">Attendance rolled up by Sunday across both services</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh reports"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>

        {/* Date filter */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 w-full md:w-auto">
          <CalendarSearch className="w-4 h-4 text-neutral-500 shrink-0 ml-1" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg px-2 py-1.5 outline-none transition-all flex-1"
          />
          {filterDate && (
            <button
              onClick={() => onDateChange("")}
              className="text-xs px-2.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Recent
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Active Children</h3>
            <p className="text-2xl font-bold text-white">{summary.totalChildren}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Active Mentors</h3>
            <p className="text-2xl font-bold text-white">{summary.totalMentors}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Latest Sunday</h3>
            <p className="text-2xl font-bold text-white">
              {summary.latestSunday ? summary.latestSunday.distinctChildren : "—"}
              <span className="text-xs text-neutral-500 font-normal">
                {summary.latestSunday ? ` · ${summary.latestSunday.distinctMentors} mentors` : ""}
              </span>
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Avg / Recent Sundays</h3>
            <p className="text-2xl font-bold text-white flex items-center gap-2">
              {summary.averageRate}% <TrendingUp className="w-5 h-5 text-green-500" />
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Needs Follow-Up</h3>
            <p className={`text-2xl font-bold ${summary.followUpCount > 0 ? "text-amber-500" : "text-white"}`}>
              {summary.followUpCount}
            </p>
          </div>
        </div>
      )}

      {/* Sunday cards */}
      <div className="space-y-4">
        {sundays.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
            <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {filterDate ? "No session recorded for this date" : "No Sundays recorded yet"}
            </h3>
            <p className="text-sm text-neutral-400 max-w-sm mx-auto">
              {filterDate
                ? "Pick another date, or clear the filter to see recent Sundays."
                : "Create attendance sessions to start seeing Sunday reports here."}
            </p>
          </div>
        ) : (
          sundays.map((sunday) => (
            <div key={sunday.date} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-neutral-800/60">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
                  <h2 className="text-lg font-bold text-white">{formatDay(sunday.date)}</h2>
                </div>
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {sunday.services.length} {sunday.services.length === 1 ? "service" : "services"} · {sunday.rate}% present
                </span>
              </div>

              {/* Per-service lines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                {sunday.services.map((svc: any) => (
                  <div key={svc.sessionId} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                    <div className="text-xs text-neutral-500 mb-1.5">{svc.serviceType}</div>
                    <div className="text-xl font-bold text-white">
                      {svc.presentChildren} <span className="text-sm text-neutral-500 font-normal">kids</span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {svc.boys} boys · {svc.girls} girls · {svc.presentMentors} mentors
                    </div>
                  </div>
                ))}
              </div>

              {/* Distinct Sunday total */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                <div>
                  <div className="text-xs text-blue-400 mb-0.5">That Sunday · distinct people</div>
                  <div className="text-xl font-bold text-blue-300">
                    {sunday.distinct.children} kids
                    <span className="text-sm font-medium"> · {sunday.distinct.mentors} mentors</span>
                  </div>
                </div>
                <div className="text-xs text-blue-400/80">
                  {sunday.distinct.boys} boys · {sunday.distinct.girls} girls
                  {sunday.services.length > 1 ? " — anyone at both services counted once" : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Follow-up list */}
      {(activeFollowUps.length > 0 || contactedFollowUps.length > 0) && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-lg font-bold text-white">Needs Follow-Up</h3>
              <p className="text-xs text-neutral-400">Children who missed 2 or more Sundays in a row</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {activeFollowUps.map((c) => (
              <div
                key={c.childId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-4"
              >
                <div>
                  <h4 className="font-semibold text-white text-sm">
                    {c.firstName} {c.lastName}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Missed {c.missedSundays} {c.missedSundays === 1 ? "Sunday" : "Sundays"} ·{" "}
                    {c.lastSeen ? `last seen ${formatDay(c.lastSeen)}` : "not seen since registering"} · {c.parentName} ({c.parentPhone})
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`tel:${c.parentPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <button
                    onClick={() => handleFollowUp(c.childId, "contact")}
                    disabled={busyChild === c.childId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                  >
                    {busyChild === c.childId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Mark contacted
                  </button>
                </div>
              </div>
            ))}

            {contactedFollowUps.map((c) => (
              <div
                key={c.childId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-green-500/5 border border-green-500/20 rounded-xl p-4"
              >
                <div>
                  <h4 className="font-semibold text-green-400 text-sm">
                    {c.firstName} {c.lastName}
                  </h4>
                  <p className="text-xs text-green-500/80 mt-0.5">
                    Contacted · hidden from the active list until they miss another Sunday
                  </p>
                </div>
                <button
                  onClick={() => handleFollowUp(c.childId, "undo")}
                  disabled={busyChild === c.childId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-semibold rounded-lg border border-neutral-800 transition-all cursor-pointer shrink-0"
                >
                  {busyChild === c.childId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  Undo
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
