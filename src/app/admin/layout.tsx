"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  LogOut,
  Menu,
  X,
  Calendar,
  Users,
  Smile,
  BarChart3,
  BookOpen,
  Coins,
  ShieldCheck,
  ScrollText,
  KeyRound,
  Loader2,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAlert } from "@/components/AlertProvider";

type Me = { username: string; role: "super_admin" | "mentor"; name: string; teacherId: string | null };

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  // Change-PIN modal (mentors)
  const [showPin, setShowPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isLoginPage) return;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMe(data))
      .catch(() => {});
  }, [isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const submitPinChange = async () => {
    if (!/^\d{6}$/.test(newPin)) {
      showAlert("New PIN must be exactly 6 digits.", { type: "error" });
      return;
    }
    if (newPin !== confirmPin) {
      showAlert("New PIN and confirmation do not match.", { type: "error" });
      return;
    }
    setSavingPin(true);
    try {
      const res = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change PIN");
      setShowPin(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      showAlert("Your PIN has been changed.", { type: "success" });
    } catch (err: any) {
      showAlert(err.message || "Could not change your PIN.", { type: "error" });
    } finally {
      setSavingPin(false);
    }
  };

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, active: pathname === "/admin" },
    { href: "/admin/forms/new", label: "Create Form", icon: <FileText className="w-5 h-5" />, active: pathname === "/admin/forms/new" },
    { href: "/admin/children", label: "Children Roster", icon: <Smile className="w-5 h-5" />, active: pathname === "/admin/children" },
    { href: "/admin/attendance", label: "Attendance", icon: <Calendar className="w-5 h-5" />, active: pathname.startsWith("/admin/attendance") },
    { href: "/admin/reports", label: "Sunday Reports", icon: <BarChart3 className="w-5 h-5" />, active: pathname === "/admin/reports" },
    { href: "/admin/library", label: "Library", icon: <BookOpen className="w-5 h-5" />, active: pathname.startsWith("/admin/library") },
    { href: "/admin/offerings", label: "Offerings", icon: <Coins className="w-5 h-5" />, active: pathname.startsWith("/admin/offerings") },
    { href: "/admin/teachers", label: "Mentors", icon: <Users className="w-5 h-5" />, active: pathname === "/admin/teachers" },
    { href: "/admin/access", label: "Access", icon: <ShieldCheck className="w-5 h-5" />, active: pathname.startsWith("/admin/access"), superOnly: true },
    { href: "/admin/activity", label: "Activity Log", icon: <ScrollText className="w-5 h-5" />, active: pathname.startsWith("/admin/activity"), superOnly: true },
  ].filter((item) => !item.superOnly || me?.role === "super_admin");

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 z-40 relative">
        <h1 className="text-lg font-bold text-white tracking-tight">TCN Junior Church</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-neutral-300 hover:text-white p-1">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight">TCN Junior Church</h1>
          <p className="text-xs text-neutral-500 mt-1">Admin Portal</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map(({ href, label, icon, active }) => (
            <Link
              key={href}
              href={href}
              style={active ? {} : ({ "--nav-hover-bg": "var(--bg-hover)" } as React.CSSProperties)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                active ? "bg-blue-600 text-white" : "nav-link-inactive"
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-4">
          {me && (
            <div className="px-3">
              <p className="text-sm font-semibold text-white truncate">{me.name}</p>
              <p className="text-[11px] text-neutral-500 capitalize">
                {me.role === "super_admin" ? "Super Admin" : "Mentor"}
              </p>
            </div>
          )}
          <div className="flex justify-between items-center px-3">
            <span className="text-xs text-neutral-400 font-semibold">Theme Mode</span>
            <ThemeToggle />
          </div>
          {me?.role === "mentor" && (
            <button
              onClick={() => setShowPin(true)}
              className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <KeyRound className="w-5 h-5" />
              Change PIN
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full pb-10">{children}</main>

      {/* Change PIN modal */}
      {showPin && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => !savingPin && setShowPin(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-500" /> Change PIN
              </h2>
              <button type="button" onClick={() => setShowPin(false)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {[
              { label: "Current PIN", value: currentPin, set: setCurrentPin },
              { label: "New PIN (6 digits)", value: newPin, set: setNewPin },
              { label: "Confirm new PIN", value: confirmPin, set: setConfirmPin },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-xs text-neutral-400 mb-1">{f.label}</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 text-white text-sm rounded-lg px-3 py-2 outline-none transition-all tracking-widest"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setShowPin(false)} className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white rounded-lg cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPinChange}
                disabled={savingPin}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm font-semibold rounded-lg cursor-pointer"
              >
                {savingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
