"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Trash2,
  RefreshCw,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { useAlert } from "@/components/AlertProvider";

const PIN_RE = /^\d{6}$/;

const nameOf = (u: any) =>
  u.teacherId?.firstName ? `${u.teacherId.firstName} ${u.teacherId.lastName}` : u.username;

export default function AccessPage() {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Create form
  const [teacherId, setTeacherId] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [creating, setCreating] = useState(false);

  // Reset-PIN modal
  const [resetTarget, setResetTarget] = useState<{ id: string; label: string } | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetting, setResetting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [uRes, tRes] = await Promise.all([
      fetch("/api/admin/super/users"),
      fetch("/api/admin/attendance/teachers"),
    ]);
    if (uRes.ok) setUsers(await uRes.json());
    if (tRes.ok) setTeachers(await tRes.json());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      showAlert("Access list refreshed.", { type: "success" });
    } catch {
      showAlert("Failed to refresh.", { type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  const linkedTeacherIds = new Set(users.map((u) => u.teacherId?._id).filter(Boolean));
  const availableTeachers = teachers.filter((t) => !linkedTeacherIds.has(t._id));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) return showAlert("Pick a mentor.", { type: "error" });
    if (!username.trim()) return showAlert("Enter a username.", { type: "error" });
    if (!PIN_RE.test(pin)) return showAlert("PIN must be exactly 6 digits.", { type: "error" });
    setCreating(true);
    try {
      const res = await fetch("/api/admin/super/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, username: username.trim(), pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create login");
      setTeacherId("");
      setUsername("");
      setPin("");
      await load();
      showAlert("Mentor login created.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not create the login.", { type: "error" });
    } finally {
      setCreating(false);
    }
  };

  const patch = async (userId: string, body: any, successMsg: string) => {
    setBusy(userId);
    try {
      const res = await fetch("/api/admin/super/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      await load();
      showAlert(successMsg, { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not update.", { type: "error" });
    } finally {
      setBusy(null);
    }
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    if (!PIN_RE.test(resetPin)) return showAlert("PIN must be exactly 6 digits.", { type: "error" });
    setResetting(true);
    try {
      const res = await fetch("/api/admin/super/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: resetTarget.id, action: "resetPin", pin: resetPin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reset PIN");
      setResetTarget(null);
      setResetPin("");
      showAlert("PIN reset.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not reset the PIN.", { type: "error" });
    } finally {
      setResetting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/super/users?userId=${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to delete");
      setDeleteTarget(null);
      await load();
      showAlert("Login removed.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not remove the login.", { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-neutral-500 gap-2">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span>Loading access...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-blue-500" /> Access
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Manage mentor logins, PINs, and roles</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 self-center"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin text-blue-500" : ""}`} />
        </button>
      </div>

      {/* Create mentor login */}
      <form onSubmit={handleCreate} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-500" /> Create a mentor login
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Mentor *</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
            >
              <option value="">Select a mentor…</option>
              {availableTeachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Username *</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ada"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-400 mb-1">PIN (6 digits) *</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all tracking-widest"
            />
          </div>
        </div>
        {availableTeachers.length === 0 && (
          <p className="text-xs text-neutral-500">Every registered mentor already has a login.</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Create login
          </button>
        </div>
      </form>

      {/* Logins list */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Logins ({users.length})</h2>
        {users.map((u) => {
          const isSuper = u.role === "super_admin";
          const disabled = u.status === "disabled";
          return (
            <div
              key={u._id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl p-4 border ${
                disabled ? "bg-neutral-950/40 border-neutral-800 opacity-70" : "bg-neutral-900 border-neutral-800"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white text-sm">{nameOf(u)}</h3>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${isSuper ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-blue-400 bg-blue-500/10 border-blue-500/20"}`}>
                    {isSuper ? "Super Admin" : "Mentor"}
                  </span>
                  {disabled && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border text-neutral-400 bg-neutral-800 border-neutral-700">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  username: {u.username}
                  {u.teacherId ? " · PIN login" : " · password login"}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {u.teacherId && (
                  <button
                    onClick={() => {
                      setResetTarget({ id: u._id, label: nameOf(u) });
                      setResetPin("");
                    }}
                    disabled={busy === u._id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Reset PIN
                  </button>
                )}
                <button
                  onClick={() =>
                    patch(
                      u._id,
                      { action: "setRole", role: isSuper ? "mentor" : "super_admin" },
                      isSuper ? "Changed to mentor." : "Promoted to super admin."
                    )
                  }
                  disabled={busy === u._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-all cursor-pointer"
                >
                  {isSuper ? <ArrowDownCircle className="w-3.5 h-3.5" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                  {isSuper ? "Make mentor" : "Make super admin"}
                </button>
                <button
                  onClick={() =>
                    patch(
                      u._id,
                      { action: "setStatus", status: disabled ? "active" : "disabled" },
                      disabled ? "Login enabled." : "Login disabled."
                    )
                  }
                  disabled={busy === u._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-all cursor-pointer"
                >
                  {disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  {disabled ? "Enable" : "Disable"}
                </button>
                <button
                  onClick={() => setDeleteTarget({ id: u._id, label: nameOf(u) })}
                  disabled={busy === u._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset PIN modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !resetting && setResetTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-500" /> Reset PIN
            </h2>
            <p className="text-sm text-neutral-400">
              New 6-digit PIN for <span className="text-white font-medium">{resetTarget.label}</span>.
            </p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={resetPin}
              onChange={(e) => setResetPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all tracking-widest"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetTarget(null)} className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg cursor-pointer">
                Cancel
              </button>
              <button
                onClick={submitReset}
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-bold text-white">Remove login</h2>
            </div>
            <p className="text-sm text-neutral-300">
              Remove the login for <span className="font-semibold text-white">{deleteTarget.label}</span>? They will no longer be able to sign in.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg cursor-pointer">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-600/50 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
