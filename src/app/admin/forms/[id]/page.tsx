"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Download } from "lucide-react";

export default function SubmissionsView({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"approved" | "needs_review">("approved");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`/api/admin/forms/${id}/submissions`);
      const data = await res.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Failed to fetch submissions", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (subId: string, status: string) => {
    try {
      await fetch(`/api/admin/submissions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchSubmissions();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const deleteSubmission = async (subId: string) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      await fetch(`/api/admin/submissions/${subId}`, { method: "DELETE" });
      fetchSubmissions();
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  const filteredSubmissions = submissions
    .filter(s => s.status === activeTab)
    .filter(s => 
      !searchQuery || 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.values(s.data || {}).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()))
    );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <Link href="/admin" className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors self-start">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Form Submissions</h1>
          <p className="text-sm sm:text-base text-neutral-400 mt-1">View and manage registrations</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-neutral-800 pb-px">
        <div className="flex gap-4 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-4 py-2 font-medium text-sm transition-all whitespace-nowrap ${activeTab === "approved" ? "text-blue-500 border-b-2 border-blue-500" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Main List ({submissions.filter(s => s.status === "approved").length})
          </button>
          <button
            onClick={() => setActiveTab("needs_review")}
            className={`px-4 py-2 font-medium text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "needs_review" ? "text-amber-500 border-b-2 border-amber-500" : "text-neutral-500 hover:text-neutral-300"}`}
          >
            Needs Review ({submissions.filter(s => s.status === "needs_review").length})
            {submissions.filter(s => s.status === "needs_review").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search name or answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 text-white text-sm rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <a
            href={`/api/admin/forms/${id}/export`}
            target="_blank"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-500 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-medium">First Name</th>
                <th className="px-6 py-4 font-medium">Last Name</th>
                <th className="px-6 py-4 font-medium">Age</th>
                <th className="px-6 py-4 font-medium">Custom Data</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">Loading submissions...</td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No submissions found in this list.</td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{sub.firstName}</td>
                    <td className="px-6 py-4">{sub.lastName}</td>
                    <td className="px-6 py-4">{sub.age}</td>
                    <td className="px-6 py-4">
                      {sub.data && Object.keys(sub.data).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(sub.data).map(([key, val]) => (
                            <div key={key} className="text-xs">
                              <span className="text-neutral-500">{key}:</span> {String(val)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-xs italic">No custom data</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === "needs_review" && (
                          <button
                            onClick={() => updateStatus(sub._id, "approved")}
                            className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors"
                            title="Approve to Main List"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteSubmission(sub._id)}
                          className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
