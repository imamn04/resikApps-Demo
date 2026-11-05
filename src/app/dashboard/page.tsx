"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID, getWhatsAppLink } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Briefcase,
  Calendar,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Sparkles,
  BarChart2,
  Layers,
  ArrowUpRight,
  User,
  Phone,
  MessageCircle,
  Shield,
  Activity,
  FileText,
  Truck,
  Wrench,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [cashflowData, setCashflowData] = useState<any>(null);
  const [poolOrders, setPoolOrders] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agendaFilter, setAgendaFilter] = useState<"ALL" | "NEED_ACTION" | "TODAY" | "COMPLETED">("ALL");
  const [trendView, setTrendView] = useState<"revenue" | "jobs" | "both">("both");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        let token = typeof window !== "undefined" ? localStorage.getItem("resik_token") : null;
        if (!token && typeof document !== "undefined") {
          const match = document.cookie.match(/resik_session=([^;]+)/);
          if (match) token = match[1];
        }
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [repRes, meRes, cfRes, poolRes] = await Promise.all([
          fetch("/api/reports", { headers, credentials: "include" }),
          fetch("/api/auth/me", { headers, credentials: "include" }),
          fetch("/api/cashflow", { headers, credentials: "include" }).catch(() => null),
          fetch("/api/jobs?isPool=true", { headers, credentials: "include" }).catch(() => null),
        ]);

        if (repRes.ok) {
          const json = await repRes.json();
          setData(json);
        }

        if (meRes.ok) {
          const uJson = await meRes.json();
          setCurrentUser(uJson.user);
        }

        if (cfRes && cfRes.ok) {
          const cfJson = await cfRes.json();
          setCashflowData(cfJson);
        }

        if (poolRes && poolRes.ok) {
          const pJson = await poolRes.json();
          setPoolOrders(pJson.jobs || []);
        }
      } catch (err) {
        console.error("Fetch dashboard error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <AppLayout>
      {/* 1. Horizon Hero Operational Banner */}
      {/* Mobile Compact Greeting (< sm) */}
      <div className="block sm:hidden relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B1437] via-[#111C44] to-[#1B254B] p-4 text-white shadow-horizon-navy mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" /> RESIK PURWOKERTO
            </span>
            <h1 className="text-base font-black text-white truncate mt-0.5">
              Halo, Pengelola! 👋
            </h1>
            <p className="text-[11px] text-slate-300 truncate">
              Pantau antrean operasional & omzet hari ini
            </p>
          </div>
          <Link
            href="/jobs/new"
            className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-[#111C44] font-black text-xs shadow-horizon-glow flex items-center gap-1 active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Job</span>
          </Link>
        </div>
      </div>

      {/* Desktop Horizon Hero Banner (>= sm) */}
      <div className="hidden sm:block relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1437] via-[#111C44] to-[#1B254B] p-6 lg:p-7 text-white shadow-horizon-navy mb-6">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-blue-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sistem Operasional Resmi
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Selamat Datang di <span className="text-amber-400">Resik Purwokerto</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
              Pusat kendali manajemen jasa kebersihan & technical service. Pantau jadwal tim lapangan, rekap order pelanggan, dan laporan keuangan secara terpadu.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs lg:text-sm shadow-horizon-glow transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 lg:w-5 lg:h-5 text-[#111C44]" />
              Input Job Baru
            </Link>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 px-4 py-2.5 lg:px-5 lg:py-3 rounded-2xl bg-[#1B254B]/80 hover:bg-[#253266] text-white border border-white/10 font-bold text-xs lg:text-sm shadow-sm transition-all"
            >
              <BarChart2 className="w-4 h-4 text-amber-400" />
              Rekap Laporan
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-[#1B254B] tracking-wider uppercase">
            Mengkalkulasi Dashboard Horizon...
          </p>
        </div>
      ) : data ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Pool Order Alert (Gojek Mode) */}
          {poolOrders.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-800 to-[#111C44] text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in border border-blue-400/30">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>{poolOrders.length} Order Tersedia di Antrean Terbuka (Pool Gojek Mode)</span>
                    <span className="text-[10px] bg-amber-400 text-[#111C44] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Siap Ambil
                    </span>
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Order belum didisposisikan ke teknisi spesifik. Karyawan/teknisi dapat langsung mengambil job ini.
                  </p>
                </div>
              </div>
              <Link
                href="/jobs"
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs shadow-horizon-glow transition-all active:scale-95 shrink-0 text-center"
              >
                Lihat & Ambil Order
              </Link>
            </div>
          )}

          {/* Ringkasan Finansial & Arus Kas (4 KPI Cards) */}
          {cashflowData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#111C44] uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Ringkasan Finansial & Arus Kas Riil
                </h2>
                <Link
                  href="/expenses"
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <span>Kelola Biaya Operasional</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                {/* 1. Uang Masuk (Terima) */}
                <div className="horizon-card p-4 sm:p-5 relative overflow-hidden group border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Uang Masuk (Terima)
                    </span>
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <ArrowDownCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-base sm:text-2xl font-black text-emerald-700 mt-2 truncate">
                    {formatRupiah(cashflowData.summary.totalIncome)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 font-medium truncate">
                    Penerimaan order selesai
                  </p>
                </div>

                {/* 2. Uang Keluar (Bayar) */}
                <div className="horizon-card p-4 sm:p-5 relative overflow-hidden group border-rose-100 bg-gradient-to-br from-white to-rose-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider">
                      Uang Keluar (Bayar)
                    </span>
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                      <ArrowUpCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-base sm:text-2xl font-black text-rose-600 mt-2 truncate">
                    {formatRupiah(cashflowData.summary.totalExpense)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-rose-500 mt-0.5 font-medium truncate">
                    Operasional + komisi teknisi
                  </p>
                </div>

                {/* 3. Penjualan Bulan Berjalan */}
                <div className="horizon-card p-4 sm:p-5 relative overflow-hidden group border-amber-100 bg-gradient-to-br from-white to-amber-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider">
                      Penjualan Bulan Ini
                    </span>
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-base sm:text-2xl font-black text-amber-600 mt-2 truncate">
                    {formatRupiah(cashflowData.summary.currentMonthRevenue)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-amber-700 mt-0.5 font-medium truncate">
                    {cashflowData.summary.currentMonthOrdersCount} order diselesaikan bulan ini
                  </p>
                </div>

                {/* 4. Total Saldo Kas/Bank */}
                <div className="horizon-card p-4 sm:p-5 relative overflow-hidden group border-slate-200 bg-gradient-to-br from-white to-[#111C44]/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-bold text-[#111C44] uppercase tracking-wider">
                      Total Saldo Kas / Bank
                    </span>
                    <div className="p-2 rounded-xl bg-[#111C44]/10 text-[#111C44]">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p
                    className={`text-base sm:text-2xl font-black mt-2 truncate ${
                      cashflowData.summary.currentBalance >= 0 ? "text-[#111C44]" : "text-rose-600"
                    }`}
                  >
                    {formatRupiah(cashflowData.summary.currentBalance)}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 font-medium truncate">
                    Saldo riil kas & bank perusahaan
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Horizon Grand Metric KPI Cards (2x2 on Mobile, 4 Cards on Desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Card 1: Total Seluruh Pekerjaan */}
            <div className="horizon-card p-3.5 sm:p-5 relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-blue-50 text-[#111C44] flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5 sm:w-7 sm:h-7 text-[#111C44]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider truncate">
                    Total Order Job
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-[#1B254B] mt-0.5">
                    {data.metrics.totalJobs}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-blue-600 flex items-center gap-1 mt-0.5 truncate">
                    <span>Terdaftar di database</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Job Hari Ini */}
            <div className="horizon-card p-3.5 sm:p-5 relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5 sm:w-7 sm:h-7 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider truncate">
                    Jadwal Hari Ini
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-amber-600 mt-0.5">
                    {data.metrics.todayJobs}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 flex items-center gap-1 mt-0.5 truncate">
                    <span>Agenda tanggal hari ini</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Card 3: Sedang Dikerjakan / Proses */}
            <div className="horizon-card p-3.5 sm:p-5 relative overflow-hidden group">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                  <PlayCircle className="w-5 h-5 sm:w-7 sm:h-7 text-sky-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider truncate">
                    Dalam Proses
                  </p>
                  <p className="text-xl sm:text-3xl font-black text-sky-700 mt-0.5">
                    {data.metrics.inProgressJobs + data.metrics.scheduledJobs}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-sky-600 flex items-center gap-1 mt-0.5 truncate">
                    <span>{data.metrics.inProgressJobs} Aktif Lapangan</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Card 4: Total Omzet Selesai */}
            <div className="horizon-card p-3.5 sm:p-5 relative overflow-hidden group bg-gradient-to-br from-white to-amber-50/40 border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-[#111C44] flex items-center justify-center shadow-horizon-glow shrink-0 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-[#111C44]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider truncate">
                    Total Omzet
                  </p>
                  <p className="text-base sm:text-2xl font-black text-[#111C44] mt-0.5 truncate">
                    {data.metrics.totalRevenue !== null
                      ? formatRupiah(data.metrics.totalRevenue)
                      : "Akses Dibatasi"}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 mt-0.5 truncate">
                    Potensi: {formatRupiah(data.metrics.potentialRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Horizon 2-Column Section: Today's Schedule & Fleet Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Widget A: Agenda & Antrean Pekerjaan Lapangan (Horizon Interactive) */}
            <div className="lg:col-span-2 horizon-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#1B254B] flex items-center gap-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    Agenda & Antrean Pekerjaan
                  </h2>
                  <p className="text-[11px] sm:text-xs text-[#707E94] mt-0.5">
                    Monitor pekerjaan terjadwal, aktif di lapangan, dan riwayat selesai
                  </p>
                </div>

                {/* Filter Pills with Horizontal Scroll on Mobile */}
                {data && data.recentJobs && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-[#F4F7FE] border border-slate-200/80 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setAgendaFilter("ALL")}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        agendaFilter === "ALL"
                          ? "bg-[#111C44] text-white shadow-xs font-black"
                          : "text-[#707E94] hover:text-[#111C44] hover:bg-slate-200/60"
                      }`}
                    >
                      Semua ({data.recentJobs.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgendaFilter("NEED_ACTION")}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        agendaFilter === "NEED_ACTION"
                          ? "bg-amber-500 text-[#111C44] shadow-xs font-black"
                          : "text-[#707E94] hover:text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      Perlu Dikerjakan ({data.recentJobs.filter((j: any) => j.status !== "SELESAI" && j.status !== "DIBATALKAN").length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgendaFilter("TODAY")}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        agendaFilter === "TODAY"
                          ? "bg-blue-600 text-white shadow-xs font-black"
                          : "text-[#707E94] hover:text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      Hari Ini ({data.recentJobs.filter((j: any) => j.scheduledDate === new Date().toISOString().split("T")[0]).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgendaFilter("COMPLETED")}
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        agendaFilter === "COMPLETED"
                          ? "bg-emerald-600 text-white shadow-xs font-black"
                          : "text-[#707E94] hover:text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      Selesai ({data.recentJobs.filter((j: any) => j.status === "SELESAI").length})
                    </button>
                  </div>
                )}
              </div>

              {/* Schedule Item List */}
              <div className="space-y-3">
                {(() => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const jobsList = (data?.recentJobs || []).filter((job: any) => {
                    if (agendaFilter === "NEED_ACTION") {
                      return job.status === "DIJADWALKAN" || job.status === "DALAM_PENGERJAAN" || job.status === "PENDING";
                    }
                    if (agendaFilter === "TODAY") {
                      return job.scheduledDate === todayStr;
                    }
                    if (agendaFilter === "COMPLETED") {
                      return job.status === "SELESAI";
                    }
                    return true; // ALL
                  });

                  if (jobsList.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-[#707E94]">
                        Tidak ada pekerjaan pada kategori filter ini.
                      </div>
                    );
                  }

                  return jobsList.map((job: any) => {
                    const waUrl = getWhatsAppLink(
                      job.customer.phone,
                      `Halo ${job.customer.name}, konfirmasi dari Resik Purwokerto terkait jadwal pekerjaan ${job.service.name} (No. Job: ${job.jobNumber}) pada ${job.scheduledDate}.`
                    );
                    const isToday = job.scheduledDate === todayStr;

                    return (
                      <div
                        key={job.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-[#F4F7FE] border border-slate-200/90 hover:border-amber-400/80 hover:bg-white transition-all shadow-2xs group flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        {/* Section 1: Waktu & Tanggal (Fixed width on desktop, clean & readable) */}
                        <div className="shrink-0 sm:w-36">
                          <div className="flex items-center gap-1.5 text-xs font-black text-[#111C44]">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{job.scheduledTime ? `Jam ${job.scheduledTime} WIB` : "Waktu Fleksibel"}</span>
                          </div>
                          <div className="mt-1">
                            {isToday ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-[#111C44] text-[10px] font-black shadow-2xs whitespace-nowrap">
                                <Sparkles className="w-2.5 h-2.5 text-[#111C44]" /> Hari Ini ({formatDateID(job.scheduledDate).split(" ").slice(0, 2).join(" ")})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#707E94] whitespace-nowrap">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" /> {formatDateID(job.scheduledDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Section 2: Pelanggan & Layanan (Flexible, split into 2 sub-columns on desktop with vertical divider) */}
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 sm:border-l sm:border-slate-200/80 sm:pl-4">
                          {/* Sub-col A: No Job & Pelanggan */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/jobs/${job.id}`}
                                className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[#111C44] hover:border-amber-400 hover:text-amber-600 transition-colors shadow-2xs shrink-0"
                              >
                                {job.jobNumber}
                              </Link>
                              <p className="font-black text-xs text-[#1B254B] truncate">
                                {job.customer.name}
                              </p>
                            </div>
                            <p className="text-[11px] text-[#707E94] mt-1 truncate flex items-center gap-1">
                              <span className="text-slate-400 shrink-0">📍</span>
                              <span className="truncate">{job.customer.address || "Purwokerto"}</span>
                            </p>
                          </div>

                          {/* Sub-col B: Layanan & Teknisi */}
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#111C44] truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <span className="truncate">{job.service.name}</span>
                            </p>
                            <p className="text-[11px] font-bold text-[#707E94] mt-1 truncate flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">Teknisi: <strong className="text-[#111C44]">{job.technicianName || "Tim Operasional"}</strong></span>
                            </p>
                          </div>
                        </div>

                        {/* Section 3: Status Badge & WhatsApp Button (Guaranteed space, never overlaps!) */}
                        <div className="shrink-0 flex items-center justify-between sm:justify-end gap-2.5 sm:border-l sm:border-slate-200/80 sm:pl-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="shrink-0">
                            <StatusBadge status={job.status} size="sm" />
                          </div>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-600 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs shrink-0"
                            title="Chat WhatsApp Pelanggan"
                          >
                            <MessageCircle className="w-4 h-4 fill-emerald-100" />
                          </a>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Widget B: Status Kesiapan Armada & Teknisi */}
            <div className="horizon-card p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <h2 className="text-base font-black text-[#1B254B] flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#111C44]" />
                    Status Tim Lapangan
                  </h2>
                  <p className="text-xs text-[#707E94] mt-0.5">Kesiapan armada teknisi</p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    team: "Tim 1 - Cuci & Service AC",
                    leader: "Mas Joko & Tim",
                    status: "Di Lokasi Pelanggan",
                    badge: "bg-amber-100 text-amber-800 border-amber-200",
                    icon: Wrench,
                  },
                  {
                    team: "Tim 2 - Cuci Sofa & Kasur",
                    leader: "Mas Hendra & Rekan",
                    status: "Siap Berangkat",
                    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    icon: Truck,
                  },
                  {
                    team: "Tim 3 - Deep Cleaning Rumah",
                    leader: "Mbak Siti & Tim",
                    status: "Standby di Kantor",
                    badge: "bg-blue-100 text-blue-800 border-blue-200",
                    icon: Sparkles,
                  },
                  {
                    team: "Tim 4 - Teknisi Kelistrikan",
                    leader: "Pak Budi Utomo",
                    status: "Standby Panggilan",
                    badge: "bg-slate-100 text-slate-800 border-slate-200",
                    icon: Activity,
                  },
                ].map((t, idx) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#F4F7FE] border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white text-[#111C44] flex items-center justify-center border border-slate-200 shadow-2xs">
                          <Icon className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-black text-[#1B254B]">{t.team}</p>
                          <p className="text-[11px] text-[#707E94]">{t.leader}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.badge}`}>
                        {t.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7 Days Cashflow Bar Chart (Masuk vs Keluar) */}
          {cashflowData && cashflowData.sevenDaysTrend && (
            <div className="horizon-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-black text-[#1B254B] flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-600" />
                    Grafik Arus Kas 7 Hari Terakhir (Uang Masuk vs Uang Keluar)
                  </h2>
                  <p className="text-xs text-[#707E94] mt-0.5">
                    Membandingkan penerimaan omzet dari order tervalidasi vs pengeluaran operasional & komisi per hari
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold bg-[#F4F7FE] px-3 py-1.5 rounded-2xl border border-slate-200/80">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-3 h-3 rounded-md bg-[#10B981] shrink-0" />
                    Uang Masuk (Terima)
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-3 h-3 rounded-md bg-[#F43F5E] shrink-0" />
                    Uang Keluar (Bayar)
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cashflowData.sevenDaysTrend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      stroke="#A3AED0"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fontWeight: 700, fill: "#707E94" }}
                    />
                    <YAxis
                      stroke="#A3AED0"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: "#707E94" }}
                      tickFormatter={(val: number) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                        return String(val);
                      }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[#111C44] text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs space-y-1">
                              <p className="font-bold text-amber-400">Tanggal: {label}</p>
                              {payload.map((entry: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5">
                                    <span
                                      className="w-2.5 h-2.5 rounded-sm"
                                      style={{ backgroundColor: entry.color }}
                                    />
                                    {entry.name === "income" ? "Uang Masuk" : "Uang Keluar"}:
                                  </span>
                                  <span className="font-black text-white">
                                    {formatRupiah(entry.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="income"
                      name="income"
                      fill="#10B981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                    <Bar
                      dataKey="expense"
                      name="expense"
                      fill="#F43F5E"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. Horizon 2-Column Analytics: Monthly Growth & Top Services */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Horizon Spline Chart (Recharts) */}
            <div className="lg:col-span-2 horizon-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-base font-black text-[#1B254B] flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-amber-500" />
                    Tren Pertumbuhan 6 Bulan
                  </h2>
                  <p className="text-xs text-[#707E94] mt-0.5">
                    Grafik dinamis performa omzet dan volume order Resik Purwokerto
                  </p>
                </div>

                {/* View Switcher: Kombinasi / Omzet / Order */}
                <div className="flex items-center gap-1 bg-[#F4F7FE] p-1 rounded-2xl border border-slate-200/80 self-start sm:self-auto text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTrendView("both")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      trendView === "both"
                        ? "bg-[#111C44] text-white shadow-sm font-black"
                        : "text-[#707E94] hover:text-[#111C44]"
                    }`}
                  >
                    Kombinasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendView("revenue")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      trendView === "revenue"
                        ? "bg-amber-500 text-[#111C44] shadow-sm font-black"
                        : "text-[#707E94] hover:text-[#111C44]"
                    }`}
                  >
                    Omzet (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendView("jobs")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      trendView === "jobs"
                        ? "bg-blue-600 text-white shadow-sm font-black"
                        : "text-[#707E94] hover:text-[#111C44]"
                    }`}
                  >
                    Order (Job)
                  </button>
                </div>
              </div>

              {/* Chart Canvas Area */}
              {mounted && data.monthlyTrend && data.monthlyTrend.length > 0 ? (
                <div className="w-full">
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={data.monthlyTrend}
                        margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="horizonRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="horizonJobsGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#111C44" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#111C44" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" />
                        <XAxis
                          dataKey="month"
                          stroke="#A3AED0"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fontWeight: 700, fill: "#707E94" }}
                        />
                        {(trendView === "revenue" || trendView === "both") && (
                          <YAxis
                            yAxisId="revAxis"
                            orientation="left"
                            stroke="#A3AED0"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fontWeight: 600, fill: "#707E94" }}
                            tickFormatter={(val: number) => {
                              if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}jt`;
                              if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                              return `${val}`;
                            }}
                          />
                        )}
                        {(trendView === "jobs" || trendView === "both") && (
                          <YAxis
                            yAxisId="jobAxis"
                            orientation={trendView === "both" ? "right" : "left"}
                            stroke="#A3AED0"
                            tickLine={false}
                            axisLine={false}
                            tick={{ fontSize: 10, fontWeight: 600, fill: "#707E94" }}
                            tickFormatter={(val: number) => `${val}`}
                          />
                        )}
                        <Tooltip
                          content={({ active, payload, label }: any) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#111C44] text-white p-3.5 rounded-2xl shadow-horizon-navy border border-white/10 text-xs min-w-[170px]">
                                  <p className="font-black text-amber-400 mb-2 border-b border-white/10 pb-1.5 flex items-center justify-between">
                                    <span>Bulan {label}</span>
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  </p>
                                  {payload.map((entry: any, index: number) => {
                                    const isRev = entry.dataKey === "revenue";
                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between gap-4 py-0.5"
                                      >
                                        <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                                          <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                            style={{ backgroundColor: entry.color }}
                                          />
                                          {entry.name}:
                                        </span>
                                        <span className="font-black text-white">
                                          {isRev ? formatRupiah(entry.value) : `${entry.value} Order`}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {(trendView === "revenue" || trendView === "both") && (
                          <Area
                            yAxisId="revAxis"
                            type="monotone"
                            dataKey="revenue"
                            name="Omzet Selesai"
                            stroke="#F59E0B"
                            strokeWidth={3.5}
                            fillOpacity={1}
                            fill="url(#horizonRevenueGrad)"
                            dot={{ r: 4, fill: "#F59E0B", strokeWidth: 2, stroke: "#FFFFFF" }}
                            activeDot={{ r: 7, stroke: "#111C44", strokeWidth: 3, fill: "#F59E0B" }}
                          />
                        )}
                        {(trendView === "jobs" || trendView === "both") && (
                          <Area
                            yAxisId="jobAxis"
                            type="monotone"
                            dataKey="jobs"
                            name="Total Order"
                            stroke="#111C44"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#horizonJobsGrad)"
                            dot={{ r: 4, fill: "#111C44", strokeWidth: 2, stroke: "#FFFFFF" }}
                            activeDot={{ r: 7, stroke: "#F59E0B", strokeWidth: 3, fill: "#111C44" }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Horizon Chart Stat Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                    <div className="p-3 rounded-2xl bg-[#F4F7FE] border border-slate-200/60">
                      <p className="text-[10px] font-bold text-[#707E94] uppercase tracking-wider">
                        Total Omzet 6 Bulan
                      </p>
                      <p className="text-sm font-black text-[#111C44] mt-0.5">
                        {formatRupiah(
                          data.monthlyTrend.reduce((acc: number, cur: any) => acc + (cur.revenue || 0), 0)
                        )}
                      </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-[#F4F7FE] border border-slate-200/60">
                      <p className="text-[10px] font-bold text-[#707E94] uppercase tracking-wider">
                        Total Order 6 Bulan
                      </p>
                      <p className="text-sm font-black text-amber-600 mt-0.5">
                        {data.monthlyTrend.reduce((acc: number, cur: any) => acc + (cur.jobs || 0), 0)} Pekerjaan
                      </p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#F4F7FE] border border-slate-200/60">
                      <p className="text-[10px] font-bold text-[#707E94] uppercase tracking-wider">
                        Rata-Rata Order / Bln
                      </p>
                      <p className="text-sm font-black text-blue-700 mt-0.5">
                        {(
                          data.monthlyTrend.reduce((acc: number, cur: any) => acc + (cur.jobs || 0), 0) /
                          Math.max(data.monthlyTrend.length, 1)
                        ).toFixed(1)}{" "}
                        Job / Bulan
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-[#707E94]">
                  Belum cukup data untuk grafik tren.
                </div>
              )}
            </div>

            {/* Top Services Breakdown */}
            <div className="horizon-card p-6">
              <h2 className="text-base font-black text-[#1B254B] flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-amber-500" />
                Layanan Terpopuler
              </h2>
              <div className="space-y-3">
                {data.serviceStats &&
                  data.serviceStats.slice(0, 5).map((s: any) => (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-2xl bg-[#F4F7FE] border border-slate-200/60 flex items-center justify-between text-xs hover:border-amber-300 transition-colors"
                    >
                      <div>
                        <p className="font-extrabold text-[#1B254B]">{s.name}</p>
                        <p className="text-[10px] text-[#707E94] uppercase tracking-wider mt-0.5">
                          {s.category}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#111C44] bg-amber-400 text-[#111C44] px-2.5 py-0.5 rounded-full text-[11px] shadow-2xs">
                          {s.jobCount} Order
                        </span>
                        {s.revenue > 0 && (
                          <p className="text-[11px] font-bold text-[#111C44] mt-1">
                            {formatRupiah(s.revenue)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}
