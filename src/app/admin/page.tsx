"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings, Trash2, Eye, FileText, AlertTriangle, Edit } from "lucide-react";

export default function AdminDashboard() {
  const [forms, setForms] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchForms();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const fetchForms = async () => {
    try {
      const res = await fetch("/api/admin/forms");
      const data = await res.json();
      setForms(data);
    } catch (error) {
      console.error("Failed to fetch forms", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/forms/${id}`, { method: "DELETE" });
      setForms(forms.filter((f) => f._id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete", error);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-neutral-400 mt-1">Manage your events and attendance forms</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" /> Create Form
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-neutral-400 text-sm font-medium mb-2">Total Active Events</h3>
            <p className="text-3xl font-bold text-white">{stats.activeEvents} <span className="text-lg text-neutral-500 font-normal">/ {stats.totalEvents}</span></p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-neutral-400 text-sm font-medium mb-2">Total Kids Registered</h3>
            <p className="text-3xl font-bold text-white">{stats.totalSubmissions}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-neutral-400 text-sm font-medium mb-2">Pending Reviews</h3>
            <p className={`text-3xl font-bold ${stats.pendingReviews > 0 ? "text-amber-500" : "text-white"}`}>{stats.pendingReviews}</p>
            {stats.pendingReviews > 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full pointer-events-none" />}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-500">Loading forms...</div>
      ) : forms.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">No forms created yet</h3>
          <p className="text-neutral-400 mb-6">Create your first form to start collecting attendance.</p>
          <Link
            href="/admin/forms/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" /> Create Form
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div key={form._id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative group hover:border-neutral-700 transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white truncate pr-4">{form.title}</h3>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${form.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-neutral-800 text-neutral-400 border border-neutral-700'}`}>
                  {form.status}
                </span>
              </div>
              
              <div className="text-sm text-neutral-400 mb-6 font-mono bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                /{form.slug}
              </div>

              <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                <Link
                  href={`/admin/forms/${form._id}`}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-2 transition-colors"
                >
                  <Eye className="w-4 h-4" /> View Submissions
                </Link>
                
                <div className="flex gap-1">
                  <Link href={`/admin/forms/${form._id}/edit`} className="p-2 text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all" title="Edit Form">
                    <Edit className="w-4 h-4" />
                  </Link>
                  {deleteConfirm === form._id ? (
                    <div className="flex items-center gap-2 px-2">
                      <span className="text-xs text-red-400">Sure?</span>
                      <button onClick={() => handleDelete(form._id)} className="text-red-500 hover:text-red-400">Yes</button>
                      <button onClick={() => setDeleteConfirm(null)} className="text-neutral-500 hover:text-neutral-400">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(form._id)} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete Form">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
