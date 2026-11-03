"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  ClipboardList,
  Users,
  BarChart3,
  UserCheck,
  History,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  User,
  Clock,
  PhoneCall,
  Bell,
  Search,
  Banknote,
} from "lucide-react";
import { AuthUser } from "@/types";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    // Live Clock
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
          " • " +
          now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
          " WIB"
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        let token = typeof window !== "undefined" ? localStorage.getItem("resik_token") : null;
        if (!token && typeof document !== "undefined") {
          const match = document.cookie.match(/resik_session=([^;]+)/);
          if (match) token = match[1];
        }

        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/auth/me", {
          headers,
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        } else {
          localStorage.removeItem("resik_token");
          localStorage.removeItem("resik_user");
          window.location.href = "/login";
        }
      } catch (err) {
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("resik_token");
      localStorage.removeItem("resik_user");
      window.location.href = "/login";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold tracking-wider text-[#1B254B] uppercase">
            Memuat Resik Purwokerto...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["OWNER", "ADMIN", "STAFF_INPUT", "VIEWER"],
    },
    {
      label: "Input Job Baru",
      href: "/jobs/new",
      icon: PlusCircle,
      roles: ["OWNER", "ADMIN", "STAFF_INPUT"],
      highlight: true,
    },
    {
      label: "Daftar Pekerjaan",
      href: "/jobs",
      icon: ClipboardList,
      roles: ["OWNER", "ADMIN", "STAFF_INPUT", "VIEWER"],
    },
    {
      label: "Data Pelanggan (CRM)",
      href: "/customers",
      icon: Users,
      roles: ["OWNER", "ADMIN", "STAFF_INPUT", "VIEWER"],
    },
    {
      label: "Laporan & Rekap",
      href: "/reports",
      icon: BarChart3,
      roles: ["OWNER", "ADMIN", "VIEWER"],
    },
    {
      label: "Slip Gaji (Payroll)",
      href: "/payroll",
      icon: Banknote,
      roles: ["OWNER", "ADMIN"],
    },
    {
      label: "Manajemen Akun",
      href: "/users",
      icon: UserCheck,
      roles: ["OWNER"],
    },
    {
      label: "Audit Trail",
      href: "/audit-logs",
      icon: History,
      roles: ["OWNER"],
    },
  ];

  const allowedNav = navItems.filter((item) =>
    item.roles.includes(currentUser.role)
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "OWNER":
        return "bg-amber-400/20 text-amber-300 border-amber-400/40";
      case "ADMIN":
        return "bg-blue-400/20 text-blue-300 border-blue-400/40";
      case "STAFF_INPUT":
        return "bg-sky-400/20 text-sky-300 border-sky-400/40";
      default:
        return "bg-slate-400/20 text-slate-300 border-slate-400/40";
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col md:flex-row font-sans text-[#1B254B]">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-[#111C44] text-white px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-[#111C44] font-black text-sm shadow-horizon-glow">
            RP
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white leading-tight">
              RESIK PURWOKERTO
            </h1>
            <p className="text-[10px] text-amber-400 font-semibold tracking-wide">
              Management System
            </p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-[#1B254B] text-slate-100 hover:bg-[#253266] transition-colors"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          <div
            className="fixed inset-0 bg-[#0B1437]/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-[#111C44] text-white p-5 flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#1B254B] mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-[#111C44] font-black text-base shadow-horizon-glow">
                    RP
                  </div>
                  <div>
                    <h2 className="font-black text-sm text-white">RESIK PURWOKERTO</h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${getRoleBadge(
                        currentUser.role
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {allowedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                        isActive
                          ? "bg-amber-500 text-[#111C44] shadow-horizon-glow"
                          : item.highlight
                          ? "bg-[#1B254B] text-amber-400 border border-amber-400/30"
                          : "text-slate-300 hover:bg-[#1B254B] hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#1B254B]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="text-xs">
                  <p className="font-bold text-white">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400">@{currentUser.username}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors border border-rose-900/50"
              >
                <LogOut className="w-4 h-4" />
                Keluar Aplikasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Horizon Navy Sidebar */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-[#111C44] text-white shrink-0 min-h-screen sticky top-0 h-screen select-none shadow-horizon-navy z-40">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-[#1B254B] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-[#111C44] font-black text-2xl shadow-horizon-glow ring-4 ring-amber-400/20">
              RP
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white flex items-center gap-1.5 leading-none">
                RESIK
                <span className="text-amber-400 font-extrabold text-[11px] px-1.5 py-0.5 rounded-md bg-[#1B254B] border border-amber-400/30">
                  PURWOKERTO
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-medium">
                <Sparkles className="w-3 h-3 text-amber-400 inline" /> Official System
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 space-y-1.5 mt-4">
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#707E94] mb-2">
              Menu Utama
            </p>
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all group ${
                    isActive
                      ? "bg-amber-500 text-[#111C44] shadow-horizon-glow font-black"
                      : item.highlight
                      ? "bg-[#1B254B] text-amber-400 hover:bg-[#223061] hover:text-white border border-amber-400/20"
                      : "text-slate-300 hover:bg-[#1B254B] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        isActive
                          ? "text-[#111C44]"
                          : item.highlight
                          ? "text-amber-400"
                          : "text-slate-400 group-hover:text-amber-400"
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-[#111C44]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1B254B]">
          {/* Compact User Info in Sidebar Footer */}
          <div className="flex items-center gap-3 px-1 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-[#111C44] font-black flex items-center justify-center text-xs shadow-xs shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-amber-400 font-medium">@{currentUser.username}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-950/50 rounded-xl transition-all border border-rose-900/40"
          >
            <LogOut className="w-4 h-4" />
            Keluar Aplikasi
          </button>
          <div className="text-center mt-2.5">
            <p className="text-[10px] text-slate-500 font-semibold">
              Resik Purwokerto &bull; v2.0 Horizon
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Header Bar (Horizon Floating Bar) */}
        <div className="hidden md:flex items-center justify-between mx-8 mt-5 px-6 py-4 horizon-glass rounded-3xl sticky top-4 z-30">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-xs font-bold text-[#707E94]">
              <span>Resik Purwokerto</span>
              <span>/</span>
              <span className="text-[#1B254B] capitalize font-extrabold">
                {pathname === "/dashboard"
                  ? "Dashboard Operasional"
                  : pathname.replace("/", "").replace("-", " ")}
              </span>
            </div>
            <h2 className="text-lg font-black text-[#1B254B] capitalize mt-0.5">
              {pathname === "/dashboard"
                ? "Ringkasan Operasional"
                : pathname.replace("/", "").replace("-", " ")}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Clock Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F4F7FE] border border-slate-200 text-xs font-bold text-[#1B254B]">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentTime || "Purwokerto"}</span>
            </div>

            {/* User Role Pill */}
            <span
              className={`text-xs px-3 py-1 rounded-full font-black uppercase tracking-wider border shadow-2xs ${
                currentUser.role === "OWNER"
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : currentUser.role === "ADMIN"
                  ? "bg-blue-100 text-blue-900 border-blue-300"
                  : "bg-slate-100 text-slate-800 border-slate-300"
              }`}
            >
              👑 {currentUser.role}
            </span>

            <div className="h-6 w-px bg-slate-200" />

            {/* User Avatar */}
            <div className="flex items-center gap-2.5 text-xs font-extrabold text-[#1B254B]">
              <div className="w-8 h-8 rounded-full bg-[#111C44] text-amber-400 font-bold flex items-center justify-center text-xs shadow-sm">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline">{currentUser.name}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-fade-in pb-20 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly with Floating Button) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 z-40 flex items-center justify-around shadow-2xl">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
            pathname === "/dashboard" ? "text-amber-600" : "text-[#707E94]"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>
        <Link
          href="/jobs/new"
          className="flex flex-col items-center gap-1 text-[11px] font-extrabold text-[#111C44]"
        >
          <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-[#111C44] flex items-center justify-center shadow-horizon-glow border-2 border-white">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span>Input Job</span>
        </Link>
        <Link
          href="/jobs"
          className={`flex flex-col items-center gap-1 text-[11px] font-bold transition-colors ${
            pathname === "/jobs" ? "text-amber-600" : "text-[#707E94]"
          }`}
        >
          <ClipboardList className="w-5 h-5" />
          <span>Semua Job</span>
        </Link>
      </div>
    </div>
  );
}
