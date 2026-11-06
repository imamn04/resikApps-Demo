"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID } from "@/lib/utils";
import { exportReportPDF } from "@/lib/reportPdfGenerator";
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  UserCheck,
  Sparkles,
  FileSpreadsheet,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter dates
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setReportData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  // Quick period presets
  const setQuickPeriod = (preset: "today" | "thisWeek" | "thisMonth" | "thisYear" | "all") => {
    const now = new Date();
    if (preset === "today") {
      const d = now.toISOString().split("T")[0];
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "thisWeek") {
      const first = now.getDate() - now.getDay();
      const firstDay = new Date(now.setDate(first)).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(today);
    } else if (preset === "thisMonth") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setStartDate(`${y}-${m}-01`);
      setEndDate(now.toISOString().split("T")[0]);
    } else if (preset === "thisYear") {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(now.toISOString().split("T")[0]);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      window.open(`/api/reports/export?${params.toString()}`, "_blank");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportData) return;
    setDownloadingPdf(true);
    try {
      await exportReportPDF(reportData, startDate, endDate);
    } catch (err) {
      console.error("Gagal generate PDF laporan:", err);
      alert("Terjadi kendala saat menyusun PDF laporan.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPrintView = () => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("auto", "true");
    window.open(`/reports/print?${params.toString()}`, "_blank");
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Laporan & Rekapitulasi Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Analisis rekap pekerjaan, performa teknisi, kontribusi layanan, dan omzet berkala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Export Excel */}
          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs sm:text-sm shadow-horizon-glow transition-all cursor-pointer active:scale-[0.98]"
            title="Download Rekap Data Format Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#111C44]" />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Tombol Unduh PDF Vector Resmi */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loading || !reportData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#111C44] hover:bg-[#1B254B] text-amber-400 font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
            title="Unduh File PDF Laporan Resmi (Vektor Bersih A4 Tanpa Tampilan Web)"
          >
            {downloadingPdf ? (
              <>
                <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span>Menyiapkan PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-amber-400" />
                <span>Unduh PDF Resmi</span>
              </>
            )}
          </button>

          {/* Tombol Cetak Fisik / Print View A4 */}
          <button
            onClick={handleOpenPrintView}
            disabled={loading || !reportData}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-[#1B254B] font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50"
            title="Buka Lembar A4 Siap Cetak ke Printer Fisik"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Print A4</span>
          </button>
        </div>
      </div>

      {/* Preset & Date Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Period Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Periode Cepat:
            </span>
            <button
              onClick={() => setQuickPeriod("today")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={() => setQuickPeriod("thisWeek")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
            >
              Minggu Ini
            </button>
            <button
              onClick={() => setQuickPeriod("thisMonth")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setQuickPeriod("thisYear")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
            >
              Tahun Ini
            </button>
            <button
              onClick={() => setQuickPeriod("all")}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 transition-colors"
            >
              Semua Waktu
            </button>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Rentang:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Mengkalkulasi rekapitulasi data...</p>
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Summary Financial Banner */}
          {reportData.metrics.totalRevenue !== null && (
            <div className="bg-gradient-to-r from-[#0B1437] via-[#111C44] to-[#1B254B] text-white p-6 sm:p-7 rounded-3xl shadow-horizon-navy">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-black text-amber-400 uppercase tracking-widest">
                    Total Omzet Pekerjaan Selesai
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                    {formatRupiah(reportData.metrics.totalRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-blue-200 uppercase tracking-widest">
                    Pekerjaan Tuntas (Selesai)
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                    {reportData.metrics.completedJobs} Job
                  </p>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                    Total Volume Job Masuk
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-white mt-1">
                    {reportData.metrics.totalJobs} Order
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Table: Breakdown Berdasarkan Layanan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Rekapitulasi Berdasarkan Jenis Layanan
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Nama Layanan</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-center">Jumlah Job</th>
                    <th className="py-2.5 px-3 text-right">Omzet Dihasilkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.serviceStats?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-bold text-slate-800">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{s.category}</td>
                      <td className="py-2.5 px-3 text-center font-semibold text-blue-900">
                        {s.jobCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatRupiah(s.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2-Columns: Teknisi & Staf Input */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Table: Breakdown Teknisi / Tim */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Rekap Kinerja Teknisi / Tim
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 text-[10px] uppercase">
                      <th className="py-2.5 px-3">Nama Petugas / Tim</th>
                      <th className="py-2.5 px-3 text-center">Job Dikerjakan</th>
                      <th className="py-2.5 px-3 text-center">Selesai</th>
                      <th className="py-2.5 px-3 text-right">Omzet Dituntaskan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reportData.technicianStats?.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          Belum ada data penugasan teknisi.
                        </td>
                      </tr>
                    ) : (
                      reportData.technicianStats?.map((t: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{t.name}</td>
                          <td className="py-2.5 px-3 text-center">{t.jobCount}</td>
                          <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">
                            {t.completedCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatRupiah(t.revenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card: Ringkasan Laba Bersih & Margin Finansial Riil (Owner Financial Insight) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Laba Bersih & Estimasi Margin Riil</span>
                  </h2>
                  {reportData.financialSummary && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Margin: {reportData.financialSummary.netMargin}%
                    </span>
                  )}
                </div>

                {reportData.financialSummary ? (
                  <div className="space-y-4">
                    {/* Big Net Profit Display */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#111C44] via-[#1B254B] to-[#0B1437] text-white flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                          Estimasi Profit Bersih (Net Profit)
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {formatRupiah(reportData.financialSummary.netProfit)}
                        </h3>
                        <p className="text-[11px] text-slate-300 mt-1">
                          Laba bersih riil setelah komisi & biaya operasional
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30 shrink-0">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="space-y-2 text-xs">
                      {/* Row 1: Omzet Kotor */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Total Penerimaan Omzet (Kotor)
                        </span>
                        <span className="font-bold text-emerald-700">
                          +{formatRupiah(reportData.financialSummary.grossRevenue)}
                        </span>
                      </div>

                      {/* Row 2: Komisi Teknisi */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Beban Komisi Teknisi (Lapangan)
                        </span>
                        <span className="font-bold text-amber-700">
                          -{formatRupiah(reportData.financialSummary.technicianCommissions)}
                        </span>
                      </div>

                      {/* Row 3: Biaya Operasional / Expenses */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Biaya Operasional & Bahan (Chemical/Bensin)
                        </span>
                        <span className="font-bold text-rose-700">
                          -{formatRupiah(reportData.financialSummary.operationalExpenses)}
                        </span>
                      </div>
                    </div>

                    {/* Proportional Stacked Track Bar */}
                    <div>
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                        <span>Alokasi Perputaran Uang</span>
                        <span>100% Total Omzet</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${Math.max(5, reportData.financialSummary.netMargin)}%` }}
                          className="h-full bg-emerald-500 transition-all duration-500"
                          title={`Laba Bersih: ${reportData.financialSummary.netMargin}%`}
                        />
                        <div
                          style={{ width: `${Math.max(0, reportData.financialSummary.commissionMargin)}%` }}
                          className="h-full bg-amber-500 transition-all duration-500"
                          title={`Komisi Teknisi: ${reportData.financialSummary.commissionMargin}%`}
                        />
                        <div
                          style={{ width: `${Math.max(0, reportData.financialSummary.expenseMargin)}%` }}
                          className="h-full bg-rose-500 transition-all duration-500"
                          title={`Beban Operasional: ${reportData.financialSummary.expenseMargin}%`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                        <span className="text-emerald-700 font-bold">● Laba Bersih ({reportData.financialSummary.netMargin}%)</span>
                        <span className="text-amber-700 font-bold">● Komisi ({reportData.financialSummary.commissionMargin}%)</span>
                        <span className="text-rose-700 font-bold">● Biaya ({reportData.financialSummary.expenseMargin}%)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">Memuat ringkasan laba bersih...</p>
                )}
              </div>

              {/* Bottom Quick Navigation */}
              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <a
                  href="/expenses"
                  className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
                >
                  Kelola Biaya Operasional
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
                <a
                  href="/payroll"
                  className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                >
                  Rincian Komisi Teknisi
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

