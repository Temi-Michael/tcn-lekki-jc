"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Loader2,
  Users,
  Download,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FolderDown,
  Info,
  Search,
  RefreshCw
} from "lucide-react";

import { useAlert } from "@/components/AlertProvider";

export default function AttendanceAdminPage() {
  const { showAlert } = useAlert();
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active/selected session details
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionRoster, setSessionRoster] = useState<{ children: any[]; teachers: any[] }>({
    children: [],
    teachers: [],
  });
  const [loadingRoster, setLoadingRoster] = useState(false);

  // New Session Form State
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [serviceType, setServiceType] = useState("2nd Service");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // Editable Notes State
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Check-in Confirmation Modal State
  const [adminConfirmItem, setAdminConfirmItem] = useState<{ id: string; name: string; type: "child" | "teacher"; isPresent: boolean } | null>(null);

  // Session Search State
  const [sessionSearchQuery, setSessionSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filteredSessions = sessions.filter((session) => {
    const query = sessionSearchQuery.toLowerCase().trim();
    if (!query) return true;
    const title = (session.title || "").toLowerCase();
    const dateStr = new Date(session.date).toLocaleDateString().toLowerCase();
    return title.includes(query) || dateStr.includes(query);
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch("/api/admin/attendance/sessions"),
        fetch("/api/admin/attendance/stats"),
      ]);

      const sessionsData = await sessionsRes.json();
      const statsData = await statsRes.json();

      setSessions(sessionsData);
      setStats(statsData);

      // Auto-select the first session (most recent) if available
      if (sessionsData.length > 0) {
        handleSelectSession(sessionsData[0]);
      }
    } catch (error) {
      console.error("Failed to load attendance initial data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = async (session: any) => {
    setSelectedSession(session);
    setNotesValue(session.notes || "");
    setEditingNotes(false);
    setLoadingRoster(true);
    try {
      const res = await fetch(`/api/admin/attendance/roster?sessionId=${session._id}`);
      const data = await res.json();
      if (res.ok) {
        setSessionRoster(data);
      }
    } catch (error) {
      console.error("Failed to load session roster", error);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedSession) return;
    setRefreshing(true);
    try {
      const [rosterRes, statsRes] = await Promise.all([
        fetch(`/api/admin/attendance/roster?sessionId=${selectedSession._id}`),
        fetch("/api/admin/attendance/stats"),
      ]);

      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        setSessionRoster(rosterData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      showAlert("Attendance data refreshed!", { type: "success" });
    } catch (error) {
      console.error("Failed to refresh attendance data", error);
      showAlert("Failed to refresh attendance data.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Session title is required.");
      return;
    }

    setCreating(true);
    setFormError("");

    try {
      const res = await fetch("/api/admin/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          serviceType,
          teachersAvailable: [],
          notes: notes.trim(),
          status: "active", // newly created sessions are active by default
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSessions([data, ...sessions.map(s => s._id === data._id ? s : { ...s, status: "closed" })]);
        setSelectedSession(data);
        setSessionRoster({
          children: data.children || [],
          teachers: data.teachers || [],
        });
        setIsCreatingSession(false);
        setTitle("");
        setNotes("");
        // Reload stats
        const statsRes = await fetch("/api/admin/attendance/stats");
        const statsData = await statsRes.json();
        setStats(statsData);
        // Refresh selected session roster
        handleSelectSession(data);
      } else {
        setFormError(data.error || "Failed to create session");
      }
    } catch (err) {
      setFormError("An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCheckin = async (id: string, type: "child" | "teacher", currentStatus: boolean) => {
    if (!selectedSession) return;

    if (selectedSession.status !== "active") {
      showAlert("This session is inactive. Attendance modifications are not permitted.", { type: "warning" });
      return;
    }

    const newStatus = currentStatus ? "absent" : "present";
    
    // Optimistic UI updates
    const updatedRoster = { ...sessionRoster };
    if (type === "child") {
      updatedRoster.children = updatedRoster.children.map(c => 
        c._id === id ? { ...c, isPresent: !currentStatus, record: !currentStatus ? { checkInTime: new Date() } : null } : c
      );
    } else {
      updatedRoster.teachers = updatedRoster.teachers.map(t => 
        t._id === id ? { ...t, isPresent: !currentStatus, record: !currentStatus ? { checkInTime: new Date() } : null } : t
      );
    }
    setSessionRoster(updatedRoster);

    try {
      const payload: any = {
        sessionId: selectedSession._id,
        status: newStatus,
        checkedInBy: "admin",
      };
      if (type === "child") payload.childId = id;
      else payload.teacherId = id;

      const res = await fetch("/api/admin/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to toggle check-in");
      }

      // Refresh stats in background
      fetch("/api/admin/attendance/stats")
        .then(res => res.json())
        .then(data => setStats(data));
    } catch (error) {
      console.error("Check-in request failed", error);
      // Revert UI on failure
      handleSelectSession(selectedSession);
    }
  };

  const handleToggleSessionStatus = async (sessionId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "closed" : "active";
    try {
      const res = await fetch("/api/admin/attendance/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: newStatus }),
      });

      const updated = await res.json();

      if (res.ok) {
        setSessions(sessions.map(s => {
          if (s._id === sessionId) return updated;
          if (newStatus === "active" && s.status === "active") return { ...s, status: "closed" };
          return s;
        }));
        if (selectedSession && selectedSession._id === sessionId) {
          setSelectedSession(updated);
        }
      }
    } catch (error) {
      console.error("Failed to toggle session status", error);
    }
  };



  const handleSaveNotes = async () => {
    if (!selectedSession) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/admin/attendance/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: selectedSession._id,
          notes: notesValue.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedSession(data);
        setSessions(sessions.map(s => s._id === data._id ? data : s));
        setEditingNotes(false);
      } else {
        showAlert(data.error || "Failed to save notes", { type: "error" });
      }
    } catch (err) {
      console.error(err);
      showAlert("Error saving notes. Please try again.", { type: "error" });
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading attendance manager...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Top Title & Kiosk Launcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Attendance Manager</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage check-in sessions, mentors, and review reports</p>
          </div>
          {selectedSession && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh attendance records"
              className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
            </button>
          )}
        </div>

        {selectedSession && selectedSession.status === "active" && (
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto bg-neutral-900 border border-neutral-800 p-3 rounded-2xl">
            {/* Kids Board Launcher */}
            <div className="flex flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-neutral-800 pb-3 sm:pb-0 pr-0 sm:pr-4">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kids Church Kiosk</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + "/attendance/child/" + (selectedSession.slug || selectedSession._id));
                    showAlert("Kids check-in link copied to clipboard!", { type: "success" });
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-850 hover:bg-neutral-855 text-white font-semibold rounded-xl border border-neutral-700 transition-all text-xs cursor-pointer"
                >
                  Copy Link
                </button>
                <Link
                  href={`/attendance/child/${selectedSession.slug || selectedSession._id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/15 text-xs text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch
                </Link>
              </div>
            </div>

            {/* Mentors Board Launcher */}
            <div className="flex flex-col gap-1.5 pl-0 sm:pl-1">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mentors Kiosk</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin + "/attendance/teacher/" + (selectedSession.slug || selectedSession._id));
                    showAlert("Mentors check-in link copied to clipboard!", { type: "success" });
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-855 hover:bg-neutral-800 text-white font-semibold rounded-xl border border-neutral-700 transition-all text-xs cursor-pointer"
                >
                  Copy Link
                </button>
                <Link
                  href={`/attendance/teacher/${selectedSession.slug || selectedSession._id}`}
                  target="_blank"
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-purple-650 hover:bg-purple-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-650/15 text-xs text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Launch
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Kids</h3>
            <p className="text-2xl font-bold text-white">{stats.totalChildren}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Mentors</h3>
            <p className="text-2xl font-bold text-white">{stats.totalTeachers}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Avg Attendance Rate</h3>
            <p className="text-2xl font-bold text-white flex items-center gap-2">
              {stats.averageAttendanceRate}% <TrendingUp className="w-5 h-5 text-green-500" />
            </p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 relative overflow-hidden">
            <h3 className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Needs Follow-Up</h3>
            <p className={`text-2xl font-bold ${stats.followUpList.length > 0 ? "text-amber-500" : "text-white"}`}>
              {stats.followUpList.length} <span className="text-xs text-neutral-500 font-normal">absent ≥ 2 wks</span>
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Create session and display roster review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Session log + Session creator */}
        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Sessions Log</h2>
              <button
                onClick={() => setIsCreatingSession(!isCreatingSession)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Session
              </button>
            </div>

            {/* Search sessions */}
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3 h-full w-4 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={sessionSearchQuery}
                onChange={(e) => setSessionSearchQuery(e.target.value)}
                placeholder="Search sessions by name or date..."
                className="w-full bg-neutral-950 border border-neutral-855 focus:border-blue-500 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none transition-all placeholder:text-neutral-600 shadow-sm"
              />
            </div>

            {/* Create Session Form Overlay/Embed */}
            {isCreatingSession && (
              <form onSubmit={handleCreateSession} className="bg-neutral-950 p-4 border border-neutral-800 rounded-xl space-y-4">
                <h3 className="font-bold text-white text-sm">Create New Attendance</h3>
                {formError && <p className="text-red-400 text-xs">{formError}</p>}
                
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Session Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Sunday Service - Kids Church"
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg p-2 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg p-2 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Service Type</label>
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg p-2 outline-none transition-all"
                    >
                      <option value="1st Service">1st Service</option>
                      <option value="2nd Service">2nd Service</option>
                      <option value="Special Event">Special Event</option>
                    </select>
                  </div>
                </div>



                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Notes / Topic Taught</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Topic taught, memory verse, lesson notes..."
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-blue-500 text-white text-xs rounded-lg p-2 outline-none transition-all min-h-[50px]"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    {creating ? "Creating..." : "Launch Session"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSession(false)}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Session Items */}
            {filteredSessions.length === 0 ? (
              <p className="text-center py-6 text-neutral-500 text-sm">
                {sessions.length === 0 ? "No attendance sessions created yet." : "No matching sessions found."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session._id}
                    onClick={() => handleSelectSession(session)}
                    className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                      selectedSession && selectedSession._id === session._id
                        ? "bg-neutral-850 border-blue-500/80 shadow-md shadow-blue-500/5"
                        : "bg-neutral-950 border-neutral-855 hover:bg-neutral-900"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <h3 className="font-semibold text-white text-sm truncate">{session.title}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        {new Date(session.date).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {session.status === "active" ? (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                          {session.status}
                        </span>
                      ) : (
                        <span className="status-pill-closed">
                          {session.status}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-neutral-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Roster Review / Selected Session Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedSession ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
              
              {/* Session Overview Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-800">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white break-words min-w-0">{selectedSession.title}</h2>
                    {selectedSession.status === "active" ? (
                      <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded border bg-green-500/10 text-green-400 border-green-500/20">
                        {selectedSession.status}
                      </span>
                    ) : (
                      <span className="status-pill-closed text-[10px] uppercase">
                        {selectedSession.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">
                    {new Date(selectedSession.date).toDateString()} • {selectedSession.serviceType}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {/* Toggle Active/Closed */}
                  <button
                    onClick={() => handleToggleSessionStatus(selectedSession._id, selectedSession.status)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                      selectedSession.status === "active"
                        ? "bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border-amber-600/20"
                        : "bg-green-600/10 hover:bg-green-600/20 text-green-500 border-green-600/20"
                    }`}
                  >
                    {selectedSession.status === "active" ? "Close Session" : "Open Session"}
                  </button>

                  {/* Export CSV Link */}
                  <a
                    href={`/api/admin/attendance/export?sessionId=${selectedSession._id}`}
                    download
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold border border-neutral-700 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </a>
                </div>
              </div>

              {selectedSession.status !== "active" && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3.5 flex items-center gap-2.5 text-xs font-semibold">
                  <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-amber-500" />
                  <span>This attendance session is closed. Attendance check-ins and modifications are disabled.</span>
                </div>
              )}

              {/* Notes display */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Session Lesson Notes</h4>
                  </div>
                  {!editingNotes && (
                    <button
                      onClick={() => setEditingNotes(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Enter topic taught, lesson details, or other notes for this session..."
                      className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl p-3 text-sm outline-none transition-all focus:border-blue-500 min-h-[85px]"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        {savingNotes ? "Saving..." : "Save Notes"}
                      </button>
                      <button
                        onClick={() => {
                          setNotesValue(selectedSession.notes || "");
                          setEditingNotes(false);
                        }}
                        disabled={savingNotes}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    {selectedSession.notes ? (
                      selectedSession.notes
                    ) : (
                      <span className="italic text-neutral-600 text-xs">No notes entered yet. Click "Edit Notes" to add lesson details.</span>
                    )}
                  </p>
                )}
              </div>

              {/* Roster lists (Teachers Scheduled & Child Review Table) */}
              {loadingRoster ? (
                <div className="flex items-center justify-center py-12 text-neutral-500 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span>Loading session records...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mentors Attendance */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      <Users className="w-4 h-4 text-blue-500" /> Mentors Check-in Roster
                      <span className="ml-1 normal-case px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                        {sessionRoster.teachers.filter((t) => t.isPresent).length} / {sessionRoster.teachers.length} checked in
                      </span>
                    </h3>

                    {sessionRoster.teachers.length === 0 ? (
                      <p className="text-xs text-neutral-500">No mentors available.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/60 p-4 border border-neutral-850 rounded-xl">
                        {sessionRoster.teachers.map((teacher) => (
                          <div key={teacher._id} className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-900">
                            <span className="text-xs font-semibold text-white">
                              {teacher.firstName} {teacher.lastName}
                            </span>

                            <button
                              disabled={selectedSession.status !== "active"}
                              onClick={() => setAdminConfirmItem({
                                id: teacher._id,
                                name: `${teacher.firstName} ${teacher.lastName}`,
                                type: "teacher",
                                isPresent: teacher.isPresent
                              })}
                              className={
                                selectedSession.status !== "active"
                                  ? "flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded border border-neutral-850 cursor-not-allowed opacity-40 bg-neutral-900/55 text-neutral-600"
                                  : teacher.isPresent
                                  ? "flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-green-500/10 text-green-400 border border-green-500/20 cursor-pointer"
                                  : "mentor-mark-btn"
                              }
                            >
                              {teacher.isPresent ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" /> Checked In
                                </>
                              ) : (
                                "Mark Present"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Children Attendance Table */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      <Users className="w-4 h-4 text-blue-500" /> Children Check-in Board Roster
                      <span className="ml-1 normal-case px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                        {sessionRoster.children.filter((c) => c.isPresent).length} / {sessionRoster.children.length} present
                      </span>
                    </h3>

                    {sessionRoster.children.length === 0 ? (
                      <p className="text-xs text-neutral-500">No active children registered. Mark children active to list them here.</p>
                    ) : (
                      <div className="overflow-x-auto border border-neutral-850 rounded-xl">
                        <table className="w-full text-left text-xs text-neutral-300 min-w-[600px]">
                          <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-850">
                            <tr>
                              <th className="px-4 py-3">Name</th>
                              <th className="px-4 py-3">Age / Gender</th>
                              <th className="px-4 py-3">Checked In</th>
                              <th className="px-4 py-3 text-right">Override</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-850/50">
                            {sessionRoster.children.map((child) => (
                              <tr key={child._id} className="hover:bg-neutral-850/30 transition-colors">
                                <td className="px-4 py-3.5 font-medium text-white">
                                  {child.firstName} {child.lastName}
                                </td>
                                <td className="px-4 py-3.5 text-neutral-400 font-mono">
                                  {child.age} yrs / {child.gender}
                                </td>
                                <td className="px-4 py-3.5">
                                  {child.isPresent ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium text-[10px] border border-green-500/20">
                                      Present
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/10 text-red-400 font-medium text-[10px] border border-red-500/20">
                                      Absent
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <button
                                    disabled={selectedSession.status !== "active"}
                                    onClick={() => setAdminConfirmItem({
                                      id: child._id,
                                      name: `${child.firstName} ${child.lastName}`,
                                      type: "child",
                                      isPresent: child.isPresent
                                    })}
                                    className={`px-2 py-1 rounded font-semibold text-[10px] transition-all ${
                                      selectedSession.status !== "active"
                                        ? "bg-neutral-900 text-neutral-600 cursor-not-allowed"
                                        : child.isPresent
                                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                                        : "bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 cursor-pointer"
                                    }`}
                                  >
                                    {child.isPresent ? "Mark Absent" : "Mark Present"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-500">
              <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No session selected</h3>
              <p className="text-sm text-neutral-400 max-w-sm mx-auto">Select a session from the log or create a new one to view and edit attendance rosters.</p>
            </div>
          )}

          {/* Follow-up / Absentees Board */}
          {stats && stats.followUpList.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-lg font-bold text-white">Absentee Follow-Ups</h3>
                  <p className="text-xs text-neutral-400">Children absent for 2 or more consecutive weeks</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stats.followUpList.map((c: any) => (
                  <div key={c.childId} className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-white text-sm">{c.firstName} {c.lastName}</h4>
                      <p className="text-xs text-neutral-400">
                        Age: {c.age} ({c.gender}) • Parent: {c.parentName}
                      </p>
                      <p className="text-[11px] text-amber-500 font-medium">
                        ⚠️ Missed {c.consecutiveAbsences} services in a row
                      </p>
                    </div>

                    <a
                      href={`tel:${c.parentPhone}`}
                      className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-semibold text-xs rounded border border-neutral-800 transition-all whitespace-nowrap"
                    >
                      Call Parent
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* Admin Confirmation Modal Overlay */}
      {adminConfirmItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setAdminConfirmItem(null)}
        >
          <div
            className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl relative flex flex-col items-center text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-2">Confirm Attendance Update</h3>
            <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
              Are you sure you want to mark <span className="font-semibold text-white">{adminConfirmItem.name}</span> as{" "}
              <span className={`font-bold ${adminConfirmItem.isPresent ? "text-red-450" : "text-green-455"}`}>
                {adminConfirmItem.isPresent ? "Absent" : "Present"}
              </span>?
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  handleToggleCheckin(adminConfirmItem.id, adminConfirmItem.type, adminConfirmItem.isPresent);
                  setAdminConfirmItem(null);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => setAdminConfirmItem(null)}
                className="flex-1 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 font-semibold rounded-xl transition-all border border-neutral-700 cursor-pointer text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

        </div>

      </div>
    </div>
  );
}
