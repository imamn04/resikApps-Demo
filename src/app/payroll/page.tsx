"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID, getWhatsAppLink } from "@/lib/utils";
import {
  Banknote,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  Edit,
  Eye,
  Send,
  Sparkles,
  Wallet,
  Users,
  ChevronRight,
  Calculator,
  X,
  FileCheck,
  Building,
  Phone,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { AuthUser, PayrollSlipData, PayrollStatus } from "@/types";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default function PayrollPage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [slips, setSlips] = useState<PayrollSlipData[]>([]);
  const [kpi, setKpi] = useState({
    totalSlips: 0,
    totalExpenditure: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  });

  // Filter states
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlipData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState({
    id: "",
    userId: "",
    employeeName: "",
    employeeRole: "TEKNISI",
    phone: "",
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    periodStart: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`,
    periodEnd: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-30`,
    basicSalary: 0,
    jobCommission: 0,
    allowance: 0,
    bonus: 0,
    deductions: 0,
    paymentStatus: "DRAFT" as PayrollStatus,
    paymentMethod: "TRANSFER_BCA",
    notes: "",
  });

  // Registered staff list for selection dropdown
  const [userList, setUserList] = useState<{ id: string; name: string; username: string; role: string; phone?: string }[]>([]);

  // Auto-fetch commission state
  const [calculatingCommission, setCalculatingCommission] = useState(false);
  const [commissionInsight, setCommissionInsight] = useState<{
    jobsCount: number;
    totalRevenue: number;
  } | null>(null);

  // Mark mounted for portal support
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isCreateModalOpen || isDetailModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isCreateModalOpen, isDetailModalOpen]);

  // Load user info & staff list
  useEffect(() => {
    async function initUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
        }
      } catch (err) {
        console.error(err);
      }
    }
    initUser();
  }, []);

  // Fetch Slips
  const fetchPayrollSlips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedMonth !== "all") params.append("month", selectedMonth);
      if (selectedYear !== "all") params.append("year", selectedYear);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/payroll?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data.slips || []);
        if (data.kpi) setKpi(data.kpi);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (currentUser.role === "OWNER" || currentUser.role === "ADMIN")) {
      fetchPayrollSlips();
    }
  }, [selectedMonth, selectedYear, statusFilter, searchTerm, currentUser]);

  // Load registered users for dropdown
  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUserList(data.users || []);
        }
      } catch {}
    }
    if (currentUser?.role === "OWNER") {
      loadStaff();
    }
  }, [currentUser]);

  // Calculate Net Salary (Take Home Pay)
  const calculatedNetSalary = useMemo(() => {
    const basic = Number(formData.basicSalary) || 0;
    const commission = Number(formData.jobCommission) || 0;
    const allowance = Number(formData.allowance) || 0;
    const bonus = Number(formData.bonus) || 0;
    const deductions = Number(formData.deductions) || 0;
    return Math.max(0, basic + commission + allowance + bonus - deductions);
  }, [formData.basicSalary, formData.jobCommission, formData.allowance, formData.bonus, formData.deductions]);

  // Handle Fetch Commission from Completed Jobs
  const handleCalculateCommission = async () => {
    if (!formData.employeeName) {
      alert("Pilih atau ketik nama teknisi terlebih dahulu!");
      return;
    }

    setCalculatingCommission(true);
    setCommissionInsight(null);
    try {
      const params = new URLSearchParams({
        action: "calculate-technician-jobs",
        technicianName: formData.employeeName,
        periodStart: formData.periodStart,
        periodEnd: formData.periodEnd,
      });

      const res = await fetch(`/api/payroll?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCommissionInsight({
          jobsCount: data.completedJobsCount,
          totalRevenue: data.totalRevenue,
        });

        // Rekomendasi komisi standar: 15% dari total omzet pekerjaan selesai
        const suggestedCommission = Math.round(data.totalRevenue * 0.15);
        setFormData((prev) => ({
          ...prev,
          jobCommission: suggestedCommission,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCalculatingCommission(false);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setCommissionInsight(null);
    setFormData({
      id: "",
      userId: "",
      employeeName: "",
      employeeRole: "TEKNISI",
      phone: "",
      month: Number(selectedMonth !== "all" ? selectedMonth : currentDate.getMonth() + 1),
      year: Number(selectedYear !== "all" ? selectedYear : currentDate.getFullYear()),
      periodStart: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`,
      periodEnd: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-30`,
      basicSalary: 1500000,
      jobCommission: 0,
      allowance: 300000,
      bonus: 0,
      deductions: 0,
      paymentStatus: "DRAFT",
      paymentMethod: "TRANSFER_BCA",
      notes: "",
    });
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (slip: PayrollSlipData) => {
    setIsEditing(true);
    setCommissionInsight(null);
    setFormData({
      id: slip.id,
      userId: slip.userId || "",
      employeeName: slip.employeeName,
      employeeRole: slip.employeeRole,
      phone: slip.user?.phone || "",
      month: slip.month,
      year: slip.year,
      periodStart: slip.periodStart,
      periodEnd: slip.periodEnd,
      basicSalary: slip.basicSalary,
      jobCommission: slip.jobCommission,
      allowance: slip.allowance,
      bonus: slip.bonus,
      deductions: slip.deductions,
      paymentStatus: slip.paymentStatus,
      paymentMethod: slip.paymentMethod || "TRANSFER_BCA",
      notes: slip.notes || "",
    });
    setIsCreateModalOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMessage(null);

    try {
      const url = isEditing ? `/api/payroll/${formData.id}` : "/api/payroll";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal menyimpan slip gaji");

      setActionMessage({
        type: "success",
        text: isEditing ? "Slip gaji berhasil diperbarui." : "Slip gaji baru berhasil diterbitkan.",
      });

      setIsCreateModalOpen(false);
      fetchPayrollSlips();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Update (e.g. Mark as PAID)
  const handleQuickStatusChange = async (slipId: string, newStatus: PayrollStatus) => {
    try {
      const res = await fetch(`/api/payroll/${slipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (res.ok) {
        fetchPayrollSlips();
        if (selectedSlip && selectedSlip.id === slipId) {
          setSelectedSlip((prev) => (prev ? { ...prev, paymentStatus: newStatus } : null));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Slip (Owner only)
  const handleDeleteSlip = async (slip: PayrollSlipData) => {
    if (!confirm(`Hapus permanen slip gaji ${slip.slipNumber} untuk ${slip.employeeName}?`)) return;

    try {
      const res = await fetch(`/api/payroll/${slip.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPayrollSlips();
        if (selectedSlip?.id === slip.id) setIsDetailModalOpen(false);
      } else {
        const data = await res.json();
        alert(data.error || "Gagal menghapus slip");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp Message Generator
  const getWhatsAppSlipMessage = (slip: PayrollSlipData) => {
    const text = `*SLIP GAJI RESIK PURWOKERTO*
━━━━━━━━━━━━━━━━━━━━
No. Slip : ${slip.slipNumber}
Nama     : ${slip.employeeName} (${slip.employeeRole})
Periode  : ${slip.periodStart} s/d ${slip.periodEnd}

*RINCIAN GAJI:*
(+) Gaji Pokok   : ${formatRupiah(slip.basicSalary)}
(+) Komisi Job   : ${formatRupiah(slip.jobCommission)}
(+) Tunjangan    : ${formatRupiah(slip.allowance)}
(+) Bonus Lembur : ${formatRupiah(slip.bonus)}
(-) Potongan     : ${formatRupiah(slip.deductions)}
────────────────────
*TOTAL BERSIH (THP) : ${formatRupiah(slip.netSalary)}*
Status: ${slip.paymentStatus === "PAID" ? "LUNAS / DIBAYARKAN" : "DRAFT"}
━━━━━━━━━━━━━━━━━━━━
Terima kasih atas dedikasi dan kerja keras Anda bersama Resik Purwokerto!`;

    const phone = slip.user?.phone || "";
    return getWhatsAppLink(phone, text);
  };

  // Access Control Guard
  if (currentUser && currentUser.role !== "OWNER" && currentUser.role !== "ADMIN") {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1B254B]">Akses Dibatasi</h2>
          <p className="text-sm text-slate-500 max-w-md mt-2">
            Halaman Slip Gaji dan Manajemen Payroll hanya dapat diakses oleh peran <strong>Owner</strong> dan <strong>Admin</strong>.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Print View (Only visible during print) */}
      {selectedSlip && (
        <div className="print-only hidden p-8 bg-white text-slate-900">
          <div className="border-b-2 border-[#111C44] pb-4 mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[#111C44]">RESIK PURWOKERTO</h1>
              <p className="text-xs text-slate-600 font-medium">Jasa Kebersihan, Cuci Kasur/Sofa/Karpet, AC & Kelistrikan</p>
              <p className="text-xs text-slate-500">Purwokerto, Jawa Tengah • WA: 0812-3456-7890 • IG: @resikpurwokerto</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-bold text-[#111C44] uppercase tracking-wider">
                SLIP GAJI RESMI
              </span>
              <p className="text-sm font-mono font-bold mt-1 text-[#111C44]">{selectedSlip.slipNumber}</p>
              <p className="text-xs text-slate-500">Periode: {selectedSlip.periodStart} s/d {selectedSlip.periodEnd}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500 uppercase font-semibold">Nama Karyawan</p>
              <p className="text-base font-bold text-[#111C44]">{selectedSlip.employeeName}</p>
              <p className="text-xs text-slate-600 font-medium">Peran / Jabatan: {selectedSlip.employeeRole}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase font-semibold">Status Pembayaran</p>
              <p className="text-base font-bold text-emerald-600 uppercase">{selectedSlip.paymentStatus}</p>
              <p className="text-xs text-slate-600">Metode: {selectedSlip.paymentMethod || "TRANSFER"}</p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-[#111C44] text-white">
                <tr>
                  <th className="py-2.5 px-4 text-left font-semibold">Deskripsi Komponen</th>
                  <th className="py-2.5 px-4 text-right font-semibold">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-4 font-medium text-slate-700">(+) Gaji Pokok / Kehadiran</td>
                  <td className="py-2 px-4 text-right font-semibold text-slate-900">{formatRupiah(selectedSlip.basicSalary)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-slate-700">(+) Komisi Pekerjaan Lapangan</td>
                  <td className="py-2 px-4 text-right font-semibold text-slate-900">{formatRupiah(selectedSlip.jobCommission)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-slate-700">(+) Tunjangan Makan & Transport</td>
                  <td className="py-2 px-4 text-right font-semibold text-slate-900">{formatRupiah(selectedSlip.allowance)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-slate-700">(+) Bonus Kinerja / Lembur</td>
                  <td className="py-2 px-4 text-right font-semibold text-slate-900">{formatRupiah(selectedSlip.bonus)}</td>
                </tr>
                <tr className="bg-rose-50/50">
                  <td className="py-2 px-4 font-medium text-rose-700">(-) Potongan Kasbon / Denda</td>
                  <td className="py-2 px-4 text-right font-semibold text-rose-700">-{formatRupiah(selectedSlip.deductions)}</td>
                </tr>
                <tr className="bg-amber-50 font-bold text-base">
                  <td className="py-3 px-4 text-[#111C44]">TOTAL DITERIMA (TAKE HOME PAY)</td>
                  <td className="py-3 px-4 text-right text-[#111C44]">{formatRupiah(selectedSlip.netSalary)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-8 mt-12 border-t border-slate-200">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-16">Penerima (Karyawan),</p>
              <p className="font-bold text-[#111C44] underline">{selectedSlip.employeeName}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-16">Purwokerto, Manajemen Resik,</p>
              <p className="font-bold text-[#111C44] underline">Admin / Owner Operasional</p>
            </div>
          </div>
        </div>
      )}

      {/* Main UI Header (no-print) */}
      <div className="no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1B254B] tracking-tight flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-[#111C44] shadow-sm">
                <Banknote className="w-5 h-5 text-[#111C44]" />
              </div>
              Slip Gaji & Kompensasi Staf
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Kelola penggajian, komisi teknisi, lembur, dan penerbitan slip gaji resmi Resik Purwokerto.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            Terbitkan Slip Gaji
          </button>
        </div>

        {/* Action Alert Banner */}
        {actionMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Horizon KPI Cards (Grid 2x2 di Mobile, 4 Kolom di Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {/* Card 1: Total Beban Gaji */}
          <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Beban Gaji
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#1B254B] truncate">
                {formatRupiah(kpi.totalExpenditure)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.totalSlips} slip diterbitkan</p>
            </div>
          </div>

          {/* Card 2: Sudah Terbayar */}
          <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Sudah Terbayar
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-emerald-600 truncate">
                {formatRupiah(kpi.totalPaid)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.paidCount} staf lunas</p>
            </div>
          </div>

          {/* Card 3: Pending / Draft */}
          <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Pending / Draft
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-amber-600 truncate">
                {formatRupiah(kpi.totalPending)}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.pendingCount} slip menunggu</p>
            </div>
          </div>

          {/* Card 4: Total Staf */}
          <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                Karyawan Terdaftar
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-[#1B254B]">
                {userList.length > 0 ? userList.length : slips.length} Staf
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Teknisi & Operasional</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="horizon-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no. slip, nama karyawan, atau peran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            {/* Select Bulan */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">Semua Bulan</option>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={String(idx + 1)}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Select Tahun */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-3 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="all">Semua Tahun</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>

              {/* Select Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="ALL">Semua Status</option>
                <option value="DRAFT">DRAFT</option>
                <option value="APPROVED">DISETUJUI</option>
                <option value="PAID">LUNAS / DIBAYAR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table of Slips */}
        <div className="horizon-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[#1B254B]">Daftar Slip Gaji Karyawan</h2>
            <span className="text-xs text-slate-400 font-semibold">{slips.length} data ditemukan</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-semibold">Memuat data payroll...</p>
            </div>
          ) : slips.length === 0 ? (
            <div className="p-12 text-center">
              <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-[#1B254B]">Belum Ada Slip Gaji</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Belum ada data slip gaji untuk periode yang dipilih. Klik tombol &quot;Terbitkan Slip Gaji&quot; untuk membuat slip baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F8FAFC] text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">No. Slip</th>
                    <th className="py-3 px-4">Karyawan & Peran</th>
                    <th className="py-3 px-4">Periode</th>
                    <th className="py-3 px-4">Komponen Gaji</th>
                    <th className="py-3 px-4">Total Gaji Bersih</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slips.map((slip) => {
                    const statusBadgeClass =
                      slip.paymentStatus === "PAID"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : slip.paymentStatus === "APPROVED"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200";

                    return (
                      <tr key={slip.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#111C44]">
                          {slip.slipNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#1B254B] truncate max-w-[180px]">{slip.employeeName}</p>
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {slip.employeeRole}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <p className="text-xs font-medium">
                            {MONTH_NAMES[slip.month - 1]} {slip.year}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {slip.periodStart.slice(8, 10)} - {slip.periodEnd.slice(8, 10)} {MONTH_NAMES[slip.month - 1].slice(0, 3)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <p className="text-slate-600">Pokok: {formatRupiah(slip.basicSalary)}</p>
                          {slip.jobCommission > 0 && (
                            <p className="text-amber-600 font-medium">Komisi: +{formatRupiah(slip.jobCommission)}</p>
                          )}
                          {slip.deductions > 0 && (
                            <p className="text-rose-600 font-medium">Potongan: -{formatRupiah(slip.deductions)}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-[#111C44] text-sm sm:text-base">
                            {formatRupiah(slip.netSalary)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-wide uppercase ${statusBadgeClass}`}
                          >
                            {slip.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedSlip(slip);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-[#111C44] hover:bg-slate-100 transition"
                              title="Lihat Detail & Cetak"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(slip)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-600 hover:bg-amber-50 transition"
                              title="Edit Slip"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {currentUser?.role === "OWNER" && (
                              <button
                                onClick={() => handleDeleteSlip(slip)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus Slip (Owner Only)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Buat / Edit Slip Gaji (React Portal ke document.body) */}
      {mounted && isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm no-print animate-fade-in">
          {/* Backdrop click to dismiss */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsCreateModalOpen(false)}
          />

          {/* Modal Container: 3-Tier Structure (Pinned Header + Scroll Body + Pinned Footer) */}
          <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden my-auto">
            {/* 1. PINNED HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                  <Banknote className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-[#111C44] truncate">
                    {isEditing ? "Edit Slip Gaji" : "Terbitkan Slip Gaji Baru"}
                  </h2>
                  <p className="text-xs text-slate-500 truncate">
                    Kelola rincian kompensasi dan komisi pekerjaan staf/teknisi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-2"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY */}
            <form id="payroll-form" onSubmit={handleSubmitForm} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              {/* Data Karyawan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Pilih Karyawan / Teknisi *
                  </label>
                  {userList.length > 0 ? (
                    <select
                      value={formData.userId}
                      onChange={(e) => {
                        const uid = e.target.value;
                        const u = userList.find((usr) => usr.id === uid);
                        setFormData((prev) => ({
                          ...prev,
                          userId: uid,
                          employeeName: u ? u.name : prev.employeeName,
                          phone: u?.phone || prev.phone,
                          employeeRole: u?.role === "STAFF_INPUT" ? "TEKNISI" : u?.role || "TEKNISI",
                        }));
                      }}
                      className="w-full px-3 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-[#1B254B] focus:ring-2 focus:ring-amber-500/40"
                    >
                      <option value="">-- Pilih dari User Terdaftar --</option>
                      {userList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <input
                    type="text"
                    placeholder="Atau ketik nama karyawan langsung..."
                    value={formData.employeeName}
                    onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                    required
                    className="w-full mt-2 px-3 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-xl text-xs sm:text-sm text-[#1B254B] focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Peran / Jabatan *
                  </label>
                  <select
                    value={formData.employeeRole}
                    onChange={(e) => setFormData({ ...formData, employeeRole: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-[#1B254B] focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="TEKNISI">Teknisi AC & Kelistrikan</option>
                    <option value="CLEANER">Cleaner Kasur/Sofa/Karpet</option>
                    <option value="ADMIN">Staf Admin Operasional</option>
                    <option value="DRIVER">Driver / Logistik</option>
                    <option value="LAINNYA">Lainnya / Umum</option>
                  </select>

                  <div className="mt-2">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      No. WhatsApp (Untuk Kirim Slip)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 081234567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl text-xs text-[#1B254B]"
                    />
                  </div>
                </div>
              </div>

              {/* Periode Penggajian */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bulan Gaji</label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#1B254B]"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Tahun</label>
                  <select
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-[#1B254B]"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Mulai Periode</label>
                  <input
                    type="date"
                    value={formData.periodStart}
                    onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-[#1B254B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Akhir Periode</label>
                  <input
                    type="date"
                    value={formData.periodEnd}
                    onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-[#1B254B]"
                  />
                </div>
              </div>

              {/* Fitur Penarik Komisi Otomatis */}
              <div className="p-3.5 bg-amber-500/10 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[#111C44] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Tarik Komisi dari Pekerjaan Selesai
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Hitung otomatis omzet & komisi dari job lapangan yang berstatus SELESAI.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCalculateCommission}
                  disabled={calculatingCommission}
                  className="px-3.5 py-2 bg-[#111C44] hover:bg-[#0B1437] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95"
                >
                  {calculatingCommission ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Calculator className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  Hitung Komisi
                </button>
              </div>

              {commissionInsight && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                  Ditemukan <strong>{commissionInsight.jobsCount} pekerjaan selesai</strong> dengan total omzet{" "}
                  <strong>{formatRupiah(commissionInsight.totalRevenue)}</strong> pada periode ini. Komisi disarankan
                  15%: <strong>{formatRupiah(formData.jobCommission)}</strong> (dapat diedit manual di bawah).
                </div>
              )}

              {/* Rincian Komponen Pendapatan & Potongan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kolom Pendapatan */}
                <div className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                    (+) Penghasilan & Tunjangan
                  </h4>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Gaji Pokok / Kehadiran (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1B254B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Komisi Pekerjaan Selesai (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.jobCommission}
                      onChange={(e) => setFormData({ ...formData, jobCommission: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Uang Makan & Transport (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.allowance}
                      onChange={(e) => setFormData({ ...formData, allowance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1B254B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bonus Kinerja / Lembur (Rp)
                    </label>
                    <input
                      type="number"
                      value={formData.bonus}
                      onChange={(e) => setFormData({ ...formData, bonus: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1B254B]"
                    />
                  </div>
                </div>

                {/* Kolom Potongan & Pembayaran */}
                <div className="space-y-3 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-800 tracking-wider mb-3">
                      (-) Potongan & Kasbon
                    </h4>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kasbon / Pinjaman / Denda (Rp)
                      </label>
                      <input
                        type="number"
                        value={formData.deductions}
                        onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-rose-700"
                      />
                    </div>

                    <div className="mt-4">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Metode Pembayaran</label>
                      <select
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-[#1B254B]"
                      >
                        <option value="TRANSFER_BCA">Transfer Bank BCA</option>
                        <option value="TRANSFER_BRI">Transfer Bank BRI</option>
                        <option value="TRANSFER_MANDIRI">Transfer Bank Mandiri</option>
                        <option value="TUNAI">Tunai / Cash</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Status Slip</label>
                      <select
                        value={formData.paymentStatus}
                        onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as PayrollStatus })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1B254B]"
                      >
                        <option value="DRAFT">DRAFT (Menunggu Verifikasi)</option>
                        <option value="APPROVED">APPROVED (Disetujui Owner)</option>
                        <option value="PAID">PAID (Sudah Ditransfer / Lunas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Highlight Box Take Home Pay */}
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-[#111C44] to-[#0B1437] text-white rounded-2xl shadow-md">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      TOTAL GAJI BERSIH (THP)
                    </span>
                    <h3 className="text-xl font-black text-white mt-0.5">{formatRupiah(calculatedNetSalary)}</h3>
                  </div>
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Slip Gaji (Opsional)
                </label>
                <textarea
                  placeholder="Keterangan tambahan untuk karyawan..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl text-xs text-[#1B254B]"
                />
              </div>
            </form>

            {/* 3. PINNED FOOTER */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#F8FAFC] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                form="payroll-form"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] text-xs font-extrabold rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#111C44] border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>{isEditing ? "Simpan Perubahan" : "Terbitkan Slip Gaji"}</span>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: Detail, Cetak & Kirim Slip Gaji (React Portal ke document.body) */}
      {mounted && isDetailModalOpen && selectedSlip && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm no-print animate-fade-in">
          {/* Backdrop click to dismiss */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsDetailModalOpen(false)}
          />

          {/* Modal Container: 3-Tier Structure */}
          <div className="relative bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/90 flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden my-auto">
            {/* 1. PINNED HEADER */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                  <FileCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-[#111C44] truncate">Slip Gaji Karyawan</h3>
                  <p className="text-xs text-slate-400 font-mono truncate">{selectedSlip.slipNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0 ml-2"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. SCROLLABLE DOCUMENT PREVIEW */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
              {/* Header Surat */}
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <h4 className="text-base font-black text-[#111C44]">RESIK PURWOKERTO</h4>
                  <p className="text-[11px] text-slate-500">Jasa Kebersihan, Cuci Kasur & AC</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      selectedSlip.paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedSlip.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Data Karyawan */}
              <div className="bg-[#F4F7FE] p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Nama Penerima</span>
                  <p className="font-extrabold text-[#111C44] text-sm">{selectedSlip.employeeName}</p>
                  <p className="text-[11px] text-slate-500">{selectedSlip.employeeRole}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase">Periode Penggajian</span>
                  <p className="font-bold text-[#111C44]">
                    {MONTH_NAMES[selectedSlip.month - 1]} {selectedSlip.year}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {selectedSlip.periodStart} s/d {selectedSlip.periodEnd}
                  </p>
                </div>
              </div>

              {/* Rincian Komponen */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-bold text-slate-600">
                  Rincian Komponen Gaji
                </div>
                <div className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">(+) Gaji Pokok</span>
                    <span className="font-bold text-[#111C44]">{formatRupiah(selectedSlip.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">(+) Komisi Pekerjaan</span>
                    <span className="font-bold text-amber-600">+{formatRupiah(selectedSlip.jobCommission)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">(+) Tunjangan & Transport</span>
                    <span className="font-bold text-slate-700">+{formatRupiah(selectedSlip.allowance)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">(+) Bonus / Lembur</span>
                    <span className="font-bold text-slate-700">+{formatRupiah(selectedSlip.bonus)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600 pt-1 border-t border-slate-100">
                    <span>(-) Potongan Kasbon</span>
                    <span className="font-bold">-{formatRupiah(selectedSlip.deductions)}</span>
                  </div>
                </div>

                <div className="bg-amber-50 px-4 py-3 border-t border-amber-200 flex justify-between items-center">
                  <span className="font-black text-[#111C44] text-xs uppercase tracking-wide">
                    TOTAL BERSIH (TAKE HOME PAY)
                  </span>
                  <span className="font-black text-[#111C44] text-base">{formatRupiah(selectedSlip.netSalary)}</span>
                </div>
              </div>

              {selectedSlip.notes && (
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200/80">
                  <span className="font-bold text-slate-700 block mb-0.5">Catatan:</span>
                  {selectedSlip.notes}
                </div>
              )}
            </div>

            {/* 3. PINNED ACTIONS FOOTER */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#F8FAFC] flex flex-col gap-2 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                {/* Tombol Cetak PDF / Print */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111C44] hover:bg-[#0B1437] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  Cetak / Simpan PDF
                </button>

                {/* Tombol WhatsApp */}
                <a
                  href={getWhatsAppSlipMessage(selectedSlip)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  Kirim via WhatsApp
                </a>
              </div>

              {/* Quick Status Update */}
              {selectedSlip.paymentStatus !== "PAID" && (
                <button
                  type="button"
                  onClick={() => handleQuickStatusChange(selectedSlip.id, "PAID")}
                  className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Tandai Telah Dibayarkan (PAID)
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
