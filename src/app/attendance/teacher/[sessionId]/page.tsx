"use client";

import { useEffect, useState, use } from "react";
import { Search, CheckCircle2, Loader2, Check, X, ShieldAlert, Copy, ExternalLink } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { useAlert } from "@/components/AlertProvider";

export default function TeacherCheckinKiosk({ params }: { params: Promise<{ sessionId: string }> }) {
  const { showAlert } = useAlert();
  const unwrappedParams = use(params);
  const { sessionId } = unwrappedParams;

  const [session, setSession] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Confirmation Modal State
  const [confirmItem, setConfirmItem] = useState<any>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);

  useEffect(() => {
    fetchSessionAndRoster();
  }, [sessionId]);

  const fetchSessionAndRoster = async () => {
    try {
      const sessionRes = await fetch(`/api/admin/attendance/sessions?sessionId=${sessionId}`);
      const sessionData = await sessionRes.json();

      if (sessionData && !sessionData.error) {
        setSession(sessionData);
        // Fetch roster for this session
        const rosterRes = await fetch(`/api/admin/attendance/roster?sessionId=${sessionId}`);
        const rosterData = await rosterRes.json();
        setRoster(rosterData.teachers || []);
      } else {
        setSession(null);
      }
    } catch (error) {
      console.error("Failed to load active session kiosk data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async () => {
    if (!session || !confirmItem) return;
    if (session.status !== "active") {
      showAlert("This session is not active. Attendance check-ins are not permitted.", { type: "warning" });
      return;
    }

    setIsCheckingIn(true);

    try {
      const payload = {
        sessionId: session._id,
        teacherId: confirmItem._id,
        status: "present",
        checkedInBy: "self",
      };

      const res = await fetch("/api/admin/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessAnimation(true);
        
        // Update local state inline
        setRoster(prev => prev.map(t => t._id === confirmItem._id ? { ...t, isPresent: true } : t));

        // Close modal and clear search
        setTimeout(() => {
          setConfirmItem(null);
          setSuccessAnimation(false);
          setIsCheckingIn(false);
          setSearchQuery(""); // Clear search so the next mentor can start typing!
        }, 1200);
      } else {
        const errorData = await res.json();
        showAlert(errorData.error || "Check-in failed. Please call an administrator for assistance.", { type: "error" });
        setIsCheckingIn(false);
      }
    } catch (error) {
      console.error(error);
      showAlert("An error occurred. Please try again.", { type: "error" });
      setIsCheckingIn(false);
    }
  };

  // Filter mentors list based on query
  const filteredTeachers = roster.filter((teacher) => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return (
      fullName.includes(query) ||
      (teacher.phone && teacher.phone.includes(query))
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <span className="text-lg font-medium">Booting Check-in System...</span>
      </div>
    );
  }

  if (!session || session.status !== "active") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-amber-500" />
          <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-2">Session Inactive</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            This attendance check-in session is not active. Please ask the administrator to activate this session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative overflow-hidden w-full">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 w-full bg-slate-900/60 border-b border-slate-850 px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
            <Check className="w-6 h-6 text-white stroke-[3px]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">TCN Mentors Check-in Desk</h1>
            <p className="text-[10px] sm:text-[11px] text-indigo-400 font-semibold">{session.title} ({session.serviceType})</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Kiosk Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 relative z-10 overflow-hidden">
        
        {/* Large Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5.5 w-5.5 text-slate-500" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type your name to check in (e.g. Kelechi)..."
            className="w-full bg-slate-900 border border-slate-850 focus:border-indigo-500 text-white rounded-2xl pl-12 pr-4 py-4 text-base sm:text-lg outline-none transition-all placeholder:text-slate-655 shadow-xl"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Registration Callout Banner */}
        <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-lg shadow-indigo-500/5">
          <div className="text-xs sm:text-sm text-slate-300">
            <strong className="text-white font-bold">New Mentor?</strong> Sign up in 1 minute to check in.
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href="/register/mentor"
              target="_blank"
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Register
            </Link>
            <button
              onClick={() => {
                const link = `${window.location.origin}/register/mentor`;
                navigator.clipboard.writeText(link);
                showAlert("Mentor registration link copied to clipboard!", { type: "success" });
              }}
              type="button"
              className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-350 border border-slate-750 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Link
            </button>
          </div>
        </div>

        {/* Scannable Grid Table */}
        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="px-6 py-4 bg-slate-900/90 border-b border-slate-850">
            <h3 className="font-bold text-white text-base">Mentors List</h3>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm text-slate-300 min-w-[400px]">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-xs border-b border-slate-850 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/50">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-center py-16 text-slate-400 px-6">
                      {searchQuery ? (
                        <div className="space-y-4 max-w-sm mx-auto">
                          <p className="font-semibold text-white">No matching mentors found for "{searchQuery}".</p>
                          <p className="text-xs text-slate-400">
                            If you haven't registered yet, click the button below to sign up on your device.
                          </p>
                          <div className="flex justify-center gap-2">
                            <Link
                              href="/register/mentor"
                              target="_blank"
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Register Now
                            </Link>
                          </div>
                        </div>
                      ) : (
                        "Start typing to find your name."
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <tr key={teacher._id} className="hover:bg-slate-850/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white text-sm sm:text-base">
                        {teacher.firstName} {teacher.lastName}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {teacher.isPresent ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 text-green-400 font-bold border border-green-500/20 text-xs">
                            <Check className="w-4 h-4 stroke-[3px]" /> Checked In
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmItem(teacher)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-500/10 text-xs sm:text-sm cursor-pointer"
                          >
                            Check In
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirmation Modal Overlay */}
      {confirmItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in w-full"
          onClick={() => {
            if (!isCheckingIn) setConfirmItem(null);
          }}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
              successAnimation ? "bg-green-500 text-white rotate-[360deg] scale-110" : "bg-indigo-500/10 text-indigo-400"
            }`}>
              {successAnimation ? (
                <CheckCircle2 className="w-14 h-14 stroke-[1.5]" />
              ) : (
                <span className="text-2xl font-bold uppercase">{confirmItem.firstName[0]}{confirmItem.lastName[0]}</span>
              )}
            </div>

            {successAnimation ? (
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-green-400">Success!</h3>
                <p className="text-slate-300">
                  Welcome to service, <span className="font-semibold text-white">{confirmItem.firstName}</span>!
                </p>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                <div>
                  <h3 className="text-xl font-bold text-white">Confirm Check-in</h3>
                  <p className="text-lg font-semibold text-indigo-400 mt-2">
                    {confirmItem.firstName} {confirmItem.lastName}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    disabled={isCheckingIn}
                    onClick={handleCheckInSubmit}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/10 cursor-pointer text-sm"
                  >
                    {isCheckingIn ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      "Yes, Check Me In"
                    )}
                  </button>
                  <button
                    disabled={isCheckingIn}
                    onClick={() => setConfirmItem(null)}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white font-bold rounded-xl transition-all border border-slate-750 cursor-pointer text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
