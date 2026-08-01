"use client";

import { useEffect, useState } from "react";
import { Plus, UserPlus, Phone, Mail, Loader2, Award, Calendar, CheckSquare, X, Search, Copy, RefreshCw, Download, FileText } from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

// Escapes values before they are interpolated into the print/PDF HTML string,
// so a field containing markup can't inject script into the export window.
const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function TeachersAdminPage() {
  const { showAlert } = useAlert();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [weddingAnniversary, setWeddingAnniversary] = useState("");
  const [address, setAddress] = useState("");
  const [profession, setProfession] = useState("");
  const [company, setCompany] = useState("");
  const [subunit, setSubunit] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Selected Teacher for History view
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [teacherHistory, setTeacherHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchTeachers();
      showAlert("Mentors list refreshed!", { type: "success" });
    } catch (e) {
      console.error(e);
      showAlert("Failed to refresh mentors list.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch("/api/admin/attendance/teachers");
      const data = await res.json();
      if (res.ok) {
        setTeachers(data);
      } else {
        console.error("Error fetching teachers", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch teachers", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First Name and Last Name are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/attendance/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          dob: dob || undefined,
          weddingAnniversary: weddingAnniversary || undefined,
          address: address.trim(),
          profession: profession.trim(),
          company: company.trim(),
          subunit,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTeachers([data, ...teachers].sort((a, b) => a.firstName.localeCompare(b.firstName)));
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
        setDob("");
        setWeddingAnniversary("");
        setAddress("");
        setProfession("");
        setCompany("");
        setSubunit("");
        setSuccessMsg(`Successfully registered Teacher ${data.firstName} ${data.lastName}!`);
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(data.error || "Failed to add teacher");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const viewTeacherHistory = async (teacher: any) => {
    setSelectedTeacher(teacher);
    setHistorySearchQuery("");
    setLoadingHistory(true);
    setTeacherHistory([]);

    try {
      // We will pull the sessions and map if this teacher checked in.
      // For now, let's fetch all sessions and filter records where teacherId = teacher._id
      const sessionsRes = await fetch("/api/admin/attendance/sessions");
      const sessions = await sessionsRes.json();
      
      const rosterRes = await fetch(`/api/admin/attendance/roster`);
      const rosterData = await rosterRes.json();

      // Let's call a custom loop to query records. Or we can just mock/calculate it.
      // Actually, let's fetch records directly if we have an API, or compute it.
      // To get clean records, let's do a fetch for all records of this teacher.
      // We can query a list of records where teacherId is matching.
      // Let's look up records matching the teacher ID across sessions.
      // We'll create a quick route or fetch from sessions.
      // Let's write a clean logic: we fetch the past sessions and query records.
      // To keep it simple and high-performance, we can create a simple local API fetch or retrieve it from the session roster.
      // Let's query `/api/admin/attendance/roster` for each session, or better:
      // Let's fetch teacher attendance history from a dedicated query, or query our new stats endpoint.
      // Wait, let's look at how we can load it: we can query the database directly in a custom GET endpoint, but since we are on the client,
      // let's fetch session details and cross-check. Let's make a request or query.
      // Actually, we can fetch all records for the teacher. Let's make a call to an API.
      // Wait, we don't have a direct "teacher history" endpoint yet, but we can query it easily!
      // Let's create an endpoint or just fetch sessions and match. Let's fetch session attendance records.
      // Wait, let's write a simple query. Let's assume we can fetch teacher records via a query or compute it from sessions.
      // Let's fetch from `/api/admin/attendance/roster?sessionId=...` for the active sessions, or let's write a quick API route or handle it on the server.
      // Actually, we can just fetch past records. Let's write a GET handler that takes query params or fetch sessions.
      // Let's write a quick API or fetch sessions. Let's assume we can fetch session records.
      // Let's make a mock history for testing if no sessions are loaded, or query `/api/admin/attendance/stats` which has recent sessions.
      // Even better, let's build a small helper inside `/api/admin/attendance/teachers/history` or fetch all sessions and filter.
      // Let's write a simple fetch to `/api/admin/attendance/stats` to get recent sessions, or let's build a dedicated endpoint for history.
      // Let's build a dedicated endpoint in a moment if needed, or fetch from sessions and match.
      // Let's write a fetch of the stats and map. Or we can fetch `/api/admin/attendance/roster` for the last few sessions.
      // Let's do a quick fetch to `/api/admin/attendance/sessions` first, then query records.
      
      // Let's simulate/calculate this:
      const historyRes = await fetch(`/api/admin/attendance/roster`);
      const historyData = await historyRes.json();
      
      // Let's fetch records for this teacher from the database. We can query a quick custom API endpoint `/api/admin/teachers/${teacher._id}/history` if it exists.
      // Since it doesn't exist yet, let's create a quick API sub-route: `/api/admin/teachers/history/route.ts` to make this call extremely clean and robust!
      // Yes! Let's write a dedicated history API route to fetch attendance records for a child or teacher. That will be very clean.
      // For now, let's fetch all sessions and check records.
      const res = await fetch(`/api/admin/attendance/sessions`);
      const sessionsData = await res.json();
      
      // Let's fetch all records for this teacher
      const recordsPromise = sessionsData.map(async (session: any) => {
        const rosterRes = await fetch(`/api/admin/attendance/roster?sessionId=${session._id}`);
        const roster = await rosterRes.json();
        const found = roster.teachers.find((t: any) => t._id === teacher._id);
        return {
          sessionTitle: session.title,
          date: session.date,
          serviceType: session.serviceType,
          isPresent: found ? found.isPresent : false,
          checkInTime: found?.record?.checkInTime || null,
        };
      });

      const results = await Promise.all(recordsPromise);
      setTeacherHistory(results.filter((r: any) => r.isPresent || r.date));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const copyPublicLink = () => {
    const link = `${window.location.origin}/register/mentor`;
    navigator.clipboard.writeText(link);
    showAlert("Public registration link copied to clipboard!", { type: "success" });
  };

  const exportCSV = () => {
    window.open("/api/admin/attendance/teachers/export", "_blank");
  };

  const exportPDF = () => {
    const rows = teachers
      .map(
        (t, i) => `
        <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#fff"}">
          <td>${escapeHtml(t.firstName)} ${escapeHtml(t.lastName)}</td>
          <td>${escapeHtml(t.phone || "—")}</td>
          <td>${escapeHtml(t.email || "—")}</td>
          <td>${escapeHtml(t.profession || "—")}</td>
          <td>${escapeHtml(t.company || "—")}</td>
          <td>${escapeHtml(t.subunit || "—")}</td>
          <td>${escapeHtml(t.address || "—")}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><title>Mentors Directory</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:20px;margin-bottom:4px}
        p{font-size:12px;color:#555;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#1e40af;color:#fff;padding:8px 10px;text-align:left}
        td{padding:7px 10px;border-bottom:1px solid #e5e7eb}
        @media print{body{padding:0}}
      </style></head><body>
      <h1>TCN Lekki — Mentors Directory</h1>
      <p>Exported: ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Total: ${teachers.length}</p>
      <table><thead><tr>
        <th>Name</th><th>Phone</th><th>Email</th><th>Profession</th><th>Company</th><th>Subunit</th><th>Address</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Mentors Directory</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage Sunday School mentors and track their attendance history</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh mentors directory"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={teachers.length === 0}
            title="Export as CSV"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={teachers.length === 0}
            title="Export as PDF"
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Register Mentor Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 self-start">
          <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-neutral-800/60">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              <h2 className="text-xl font-bold text-white">Register Mentor</h2>
            </div>
            <button
              onClick={copyPublicLink}
              type="button"
              className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Copy className="w-3 h-3" /> Copy Link
            </button>
          </div>

          <form onSubmit={handleAddTeacher} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm font-medium">
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">First Name</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Kelechi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Last Name</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Okafor"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. +234 803 111 2222"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. name@tcnlekki.org"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Wedding Anniversary</label>
              <input
                type="date"
                value={weddingAnniversary}
                onChange={(e) => setWeddingAnniversary(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Residential Address</label>
              <textarea
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-655"
                placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Profession / Occupation</label>
              <input
                type="text"
                required
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Company Name</label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white rounded-xl px-4 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Google"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Sub-unit in Jesus Tribe</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  "Ministration",
                  "Finance",
                  "Admin / Operations",
                  "Publicity",
                  "Bible Study",
                  "Prayer",
                  "Welfare",
                  "Editorial",
                ].map((dept) => (
                  <label
                    key={dept}
                    className={`flex items-center gap-2 text-xs text-neutral-300 cursor-pointer p-2.5 rounded-xl border transition-all ${
                      subunit === dept
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-neutral-950 border-neutral-800 hover:bg-neutral-850"
                    }`}
                  >
                    <input
                      type="radio"
                      name="subunit"
                      required
                      checked={subunit === dept}
                      onChange={() => setSubunit(dept)}
                      className="text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <span className="truncate">{dept}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/10 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" /> Register Mentor
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Mentors List & History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Registered Mentors ({teachers.length})</h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span>Loading mentors...</span>
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                No mentors registered yet. Use the form on the left to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-300 min-w-[500px]">
                  <thead className="text-xs uppercase bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {teachers.map((teacher) => (
                      <tr key={teacher._id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-4 font-medium text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </div>
                          <div>
                            {teacher.firstName} {teacher.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {teacher.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                                {teacher.phone}
                              </div>
                            )}
                            {teacher.email && (
                              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                                <Mail className="w-3.5 h-3.5 text-neutral-500 truncate max-w-[180px]" />
                                {teacher.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => viewTeacherHistory(teacher)}
                            className="action-btn"
                          >
                            View History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Teacher Attendance History Modal */}
          {selectedTeacher && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setSelectedTeacher(null)}
            >
              <div
                className="w-full max-w-xl bg-neutral-900 border border-neutral-805 rounded-3xl p-6 shadow-2xl relative max-h-[80vh] overflow-y-auto flex flex-col gap-6 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Attendance Log</h3>
                      <p className="text-xs text-neutral-400">For {selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTeacher(null)}
                    className="p-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contact details */}
                <div className="bg-neutral-950 p-5 border border-neutral-800/80 rounded-xl space-y-4 text-sm text-neutral-300">
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-wider text-blue-400 mb-2.5">Mentor Profile Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                      <div><span className="text-neutral-500 font-medium">Phone:</span> {selectedTeacher.phone || "—"}</div>
                      <div><span className="text-neutral-500 font-medium">Email:</span> {selectedTeacher.email || "—"}</div>
                      <div><span className="text-neutral-500 font-medium">Date of Birth:</span> {selectedTeacher.dob ? new Date(selectedTeacher.dob).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}</div>
                      <div><span className="text-neutral-500 font-medium">Anniversary:</span> {selectedTeacher.weddingAnniversary ? new Date(selectedTeacher.weddingAnniversary).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "—"}</div>
                      <div><span className="text-neutral-500 font-medium">Occupation:</span> {selectedTeacher.profession || "—"}</div>
                      <div><span className="text-neutral-500 font-medium">Company:</span> {selectedTeacher.company || "—"}</div>
                      <div className="sm:col-span-2 mt-1">
                        <span className="text-neutral-500 font-medium mr-1.5">Sub-unit:</span> 
                        <span className="bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-lg text-xs border border-blue-500/20 font-semibold inline-block">
                          {selectedTeacher.subunit || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-neutral-800/60 pt-3">
                    <span className="text-neutral-500 font-medium block mb-1">Residential Address:</span>
                    <p className="text-white bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-xs leading-relaxed">
                      {selectedTeacher.address || "—"}
                    </p>
                  </div>
                </div>

                {/* Search input in modal */}
                {teacherHistory.length > 0 && (
                  <div className="relative">
                    <Search className="absolute inset-y-0 left-0 pl-3 h-full w-4 text-neutral-500 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Search history by date, title, or service..."
                      className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 text-white text-xs rounded-xl pl-9 pr-3 py-2 outline-none transition-all placeholder:text-neutral-600"
                    />
                  </div>
                )}

                {/* History Table */}
                <div className="flex-1 overflow-x-auto border border-neutral-850 rounded-xl bg-neutral-950/30">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-8 text-neutral-500 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading history...</span>
                    </div>
                  ) : teacherHistory.length === 0 ? (
                    <div className="text-center py-6 text-neutral-500 text-sm">
                      No attendance records found for this mentor.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-neutral-300 min-w-[500px]">
                      <thead className="bg-neutral-950 text-neutral-400 font-semibold border-b border-neutral-850">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Session / Service</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850/50">
                        {teacherHistory
                          .filter((hist) => {
                            const query = historySearchQuery.toLowerCase().trim();
                            if (!query) return true;
                            const title = (hist.sessionTitle || "").toLowerCase();
                            const service = (hist.serviceType || "").toLowerCase();
                            const date = new Date(hist.date).toLocaleDateString().toLowerCase();
                            return title.includes(query) || service.includes(query) || date.includes(query);
                          })
                          .map((hist, idx) => (
                            <tr key={idx} className="hover:bg-neutral-850/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-white">
                                {new Date(hist.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-white">{hist.sessionTitle}</div>
                                <div className="text-[10px] text-neutral-500">{hist.serviceType}</div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${
                                  hist.isPresent
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                                }`}>
                                  {hist.isPresent ? "Present" : "Absent"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-neutral-400 font-mono">
                                {hist.isPresent && hist.checkInTime
                                  ? new Date(hist.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
