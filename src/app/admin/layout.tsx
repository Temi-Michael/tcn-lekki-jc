"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, Menu, X } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800 z-40 relative">
        <h1 className="text-lg font-bold text-white tracking-tight">Smart Attendance</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-neutral-300 hover:text-white p-1">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-white tracking-tight">Smart Attendance</h1>
          <p className="text-xs text-neutral-500 mt-1">Admin Portal</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/admin" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === "/admin" ? "bg-blue-600 text-white" : "text-neutral-300 hover:text-white hover:bg-neutral-800"}`}>
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/forms/new" className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${pathname === "/admin/forms/new" ? "bg-blue-600 text-white" : "text-neutral-300 hover:text-white hover:bg-neutral-800"}`}>
            <FileText className="w-5 h-5" />
            Create Form
          </Link>
        </nav>
        
        <div className="p-4 border-t border-neutral-800">
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
      <main className="flex-1 overflow-y-auto w-full pb-10">
        {children}
      </main>
    </div>
  );
}
