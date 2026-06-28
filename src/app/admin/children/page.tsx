"use client";

import { useEffect, useState } from "react";
import { Plus, UserPlus, Phone, Mail, Loader2, Calendar, Smile, Search, Award, X, RefreshCw } from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

export default function ChildrenAdminPage() {
  const { showAlert } = useAlert();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [dayOrBoarding, setDayOrBoarding] = useState("Day");
  const [sundayService, setSundayService] = useState("Either");
  const [markPresentToday, setMarkPresentToday] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Selected Child for History View
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [childHistory, setChildHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Auto-calculate age from DOB
  useEffect(() => {
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setAge(calculatedAge >= 0 ? calculatedAge : "");
    }
  }, [dob]);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch("/api/admin/children");
      const data = await res.json();
      if (res.ok) {
        setChildren(data);
      } else {
        console.error("Error fetching children", data.error);
      }
    } catch (err) {
      console.error("Failed to fetch children", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchChildren();
      showAlert("Children directory refreshed!", { type: "success" });
    } catch (e) {
      console.error(e);
      showAlert("Failed to refresh children directory.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const handleRegisterChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || age === "" || !schoolClass.trim() || !dayOrBoarding || !sundayService || !parentName.trim() || !parentPhone.trim()) {
      setError("First Name, Last Name, Age, Class/Grade, Day/Boarding status, Sunday Service selection, Parent's Name, and Parent's Phone are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: Number(age),
          gender,
          dob: dob || undefined,
          parentName: parentName.trim(),
          parentPhone: parentPhone.trim(),
          parentEmail: parentEmail.trim(),
          phone: phone.trim(),
          email: email.trim(),
          schoolClass: schoolClass.trim(),
          dayOrBoarding,
          sundayService,
          markPresentToday,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setChildren([data.child, ...children].sort((a, b) => a.firstName.localeCompare(b.firstName)));
        setFirstName("");
        setLastName("");
        setAge("");
        setGender("Male");
        setDob("");
        setParentName("");
        setParentPhone("");
        setParentEmail("");
        setPhone("");
        setEmail("");
        setSchoolClass("");
        setDayOrBoarding("Day");
        setSundayService("Either");
        setMarkPresentToday(false);
        setSuccessMsg(
          `Successfully registered ${data.child.firstName} ${data.child.lastName}! ${
            data.checkedIn ? "Also checked in for today's active service." : ""
          }`
        );
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setError(data.error || "Failed to register child");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const viewChildHistory = async (child: any) => {
    setSelectedChild(child);
    setHistorySearchQuery("");
    setLoadingHistory(true);
    setChildHistory([]);

    try {
      const res = await fetch(`/api/admin/attendance/sessions`);
      const sessionsData = await res.json();
      
      // Query check-in details for this child across all sessions
      const recordsPromise = sessionsData.map(async (session: any) => {
        const rosterRes = await fetch(`/api/admin/attendance/roster?sessionId=${session._id}`);
        const roster = await rosterRes.json();
        const found = roster.children.find((c: any) => c._id === child._id);
        return {
          sessionTitle: session.title,
          date: session.date,
          serviceType: session.serviceType,
          isPresent: found ? found.isPresent : false,
          checkInTime: found?.record?.checkInTime || null,
        };
      });

      const results = await Promise.all(recordsPromise);
      setChildHistory(results);
    } catch (err) {
      console.error("Failed to load history for child", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const filteredChildren = children.filter((c) => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return (
      fullName.includes(query) ||
      (c.parentPhone && c.parentPhone.includes(query)) ||
      (c.parentName && c.parentName.toLowerCase().includes(query))
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Children Directory</h1>
            <p className="text-sm text-neutral-400 mt-1">Register children and check their attendance records</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh children directory"
            className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Registration Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 self-start space-y-6">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold text-white">Register New Child</h2>
          </div>

          <form onSubmit={handleRegisterChild} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm font-medium animate-pulse">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm font-medium">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-600"
                  placeholder="e.g. Temi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-600"
                  placeholder="e.g. Michael"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Age</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={age}
                  onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all placeholder:text-neutral-650"
                  placeholder="e.g. 12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2 text-sm outline-none transition-all text-neutral-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">School Class / Grade *</label>
              <input
                type="text"
                required
                value={schoolClass}
                onChange={(e) => setSchoolClass(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Grade 6"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Day / Boarding *</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="dayOrBoarding"
                      value="Day"
                      checked={dayOrBoarding === "Day"}
                      onChange={(e) => setDayOrBoarding(e.target.value)}
                      className="text-blue-600 bg-neutral-950 border-neutral-800 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    Day
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="dayOrBoarding"
                      value="Boarding"
                      checked={dayOrBoarding === "Boarding"}
                      onChange={(e) => setDayOrBoarding(e.target.value)}
                      className="text-blue-600 bg-neutral-950 border-neutral-800 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    Boarding
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Sunday Service *</label>
                <div className="flex flex-col gap-2 mt-1.5">
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="sundayService"
                      value="1st Service"
                      checked={sundayService === "1st Service"}
                      onChange={(e) => setSundayService(e.target.value)}
                      className="text-blue-600 bg-neutral-950 border-neutral-800 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    1st Service
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="sundayService"
                      value="2nd Service"
                      checked={sundayService === "2nd Service"}
                      onChange={(e) => setSundayService(e.target.value)}
                      className="text-blue-600 bg-neutral-950 border-neutral-800 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    2nd Service
                  </label>
                  <label className="flex items-center gap-2 text-xs text-neutral-300 font-medium cursor-pointer">
                    <input
                      type="radio"
                      name="sundayService"
                      value="Either"
                      checked={sundayService === "Either"}
                      onChange={(e) => setSundayService(e.target.value)}
                      className="text-blue-600 bg-neutral-950 border-neutral-800 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    Either
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Child's Phone (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                  placeholder="e.g. +234..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1.5">Child's Email (Optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                  placeholder="e.g. child@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Parent's Name *</label>
              <input
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. Kelechi Michael"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Parent's Phone Number *</label>
              <input
                type="text"
                required
                value={parentPhone}
                onChange={(e) => setParentPhone(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. +234 803 000 0001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1.5">Parent's Email</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white rounded-xl px-3 py-2.5 text-sm outline-none transition-all placeholder:text-neutral-600"
                placeholder="e.g. parent@example.com"
              />
            </div>

            {/* Sunday check-in checkbox */}
            <div className="flex items-center gap-2 py-2 select-none">
              <input
                type="checkbox"
                id="markPresentToday"
                checked={markPresentToday}
                onChange={(e) => setMarkPresentToday(e.target.checked)}
                className="rounded border-neutral-800 text-blue-600 bg-neutral-950 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="markPresentToday" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                Mark present for today's active service?
              </label>
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
                  <Plus className="w-5 h-5" /> Register Child
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Roster Directory Table & History log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* List Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-white">Registered Children ({children.length})</h2>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute inset-y-0 left-0 pl-3 h-full w-4 text-neutral-500 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name or parent..."
                  className="w-full bg-neutral-950 border border-neutral-850 focus:border-blue-500 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none transition-all placeholder:text-neutral-600"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-neutral-500 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span>Loading children roster...</span>
              </div>
            ) : filteredChildren.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-sm">
                No matching children records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-neutral-300 min-w-[600px]">
                  <thead className="text-xs uppercase bg-neutral-950 text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Details</th>
                      <th className="px-4 py-3">Parent / Contact</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {filteredChildren.map((child) => (
                      <tr key={child._id} className="hover:bg-neutral-800/30 transition-colors">
                        <td className="px-4 py-4 font-semibold text-white flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                            {child.firstName[0]}{child.lastName[0]}
                          </div>
                          <div>
                            {child.firstName} {child.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-neutral-400">
                          {child.age} yrs / {child.gender}
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="text-xs text-white font-medium">{child.parentName || "N/A"}</div>
                            {child.parentPhone && (
                              <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                                <Phone className="w-3.5 h-3.5 text-neutral-500" />
                                {child.parentPhone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => viewChildHistory(child)}
                            className="action-btn"
                          >
                            Attendance History
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Child History Modal */}
          {selectedChild && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
              onClick={() => setSelectedChild(null)}
            >
              <div
                className="w-full max-w-xl bg-neutral-900 border border-neutral-805 rounded-3xl p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto flex flex-col gap-6 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <Award className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Attendance Log</h3>
                      <p className="text-xs text-neutral-400">For {selectedChild.firstName} {selectedChild.lastName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedChild(null)}
                    className="p-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Parent Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-950 p-4 border border-neutral-800/85 rounded-xl text-xs text-neutral-300">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">Child Details</h4>
                    {selectedChild.dob && <div><span className="text-neutral-500">Date of Birth:</span> {new Date(selectedChild.dob).toLocaleDateString()}</div>}
                    <div><span className="text-neutral-500">Age / Gender:</span> {selectedChild.age} yrs / {selectedChild.gender}</div>
                    {selectedChild.schoolClass && <div><span className="text-neutral-500">Class/Grade:</span> {selectedChild.schoolClass}</div>}
                    {selectedChild.dayOrBoarding && <div><span className="text-neutral-500">Day/Boarding:</span> {selectedChild.dayOrBoarding} Student</div>}
                    {selectedChild.sundayService && <div><span className="text-neutral-500">Sunday Service:</span> {selectedChild.sundayService}</div>}
                    {selectedChild.phone && <div><span className="text-neutral-500">Child's Phone:</span> {selectedChild.phone}</div>}
                    {selectedChild.email && <div><span className="text-neutral-500">Child's Email:</span> {selectedChild.email}</div>}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white uppercase text-[10px] tracking-wider text-blue-400">Parent Info</h4>
                    <div><span className="text-neutral-500">Name:</span> {selectedChild.parentName || "N/A"}</div>
                    {selectedChild.parentPhone && <div><span className="text-neutral-500">Phone:</span> {selectedChild.parentPhone}</div>}
                    {selectedChild.parentEmail && <div><span className="text-neutral-500">Email:</span> {selectedChild.parentEmail}</div>}
                  </div>
                </div>

                {/* Search query input inside modal */}
                {childHistory.length > 0 && (
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
                    <div className="flex items-center justify-center py-12 text-neutral-500 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                      <span>Loading history log...</span>
                    </div>
                  ) : childHistory.length === 0 ? (
                    <div className="text-center py-12 text-neutral-500 text-sm">
                      No attendance records found for this child.
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
                        {childHistory
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
