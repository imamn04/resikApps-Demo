"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import AppLayout from "@/components/layout/AppLayout";
import {
  formatRupiah,
  formatDateID,
  getWhatsAppLink,
  getWhatsAppCommissionPaidTemplate,
} from "@/lib/utils";
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
  Zap,
  ExternalLink,
  ArrowRight,
  MessageCircle,
  Camera,
  BarChart3,
  TrendingUp,
  Trophy,
  Activity,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AuthUser, PayrollSlipData, PayrollStatus, JobData } from "@/types";

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

  // Dual-Mode Tab State: "DAILY" (Day-to-day per-job commission) vs "MONTHLY" (Monthly salary slips)
  const [payrollTab, setPayrollTab] = useState<"DAILY" | "MONTHLY">("DAILY");

  // Day-to-Day Komisi State
  const [dailyJobs, setDailyJobs] = useState<JobData[]>([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailySearch, setDailySearch] = useState("");
  const [dailyPeriodFilter, setDailyPeriodFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH">("ALL");
  const [dailyStatusFilter, setDailyStatusFilter] = useState<"ALL" | "UNPAID" | "PAID">("ALL");

  // Transfer Komisi Modal (Day-to-day payout)
  const [isDailyPayoutModalOpen, setIsDailyPayoutModalOpen] = useState(false);
  const [selectedDailyJob, setSelectedDailyJob] = useState<JobData | null>(null);
  const [dailyPayoutMethod, setDailyPayoutMethod] = useState("Transfer BCA");
  const [dailyPayoutNotes, setDailyPayoutNotes] = useState("");
  const [dailyPayoutProofFile, setDailyPayoutProofFile] = useState<File | null>(null);
  const [dailyPayoutProofPreview, setDailyPayoutProofPreview] = useState<string | null>(null);
  const [dailyPayoutSubmitting, setDailyPayoutSubmitting] = useState(false);

  // Chart view mode state: "BAR" (Kolom Harian) vs "AREA" (Kurva Tren) vs "STAFF" (Leaderboard Teknisi)
  const [dailyChartMode, setDailyChartMode] = useState<"BAR" | "AREA" | "STAFF">("BAR");

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

  // Prevent background scroll and hide mobile bottom bar when any modal is open
  useEffect(() => {
    if (isCreateModalOpen || isDetailModalOpen || isDailyPayoutModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isCreateModalOpen, isDetailModalOpen, isDailyPayoutModalOpen]);

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

  // Fetch Daily Completed Jobs for Day-to-Day Commission Payout
  const fetchDailyJobs = async () => {
    setLoadingDaily(true);
    try {
      const res = await fetch("/api/jobs?status=SELESAI");
      if (res.ok) {
        const data = await res.json();
        setDailyJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Fetch daily jobs error:", err);
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (currentUser && (currentUser.role === "OWNER" || currentUser.role === "ADMIN")) {
      fetchDailyJobs();
    }
  }, [currentUser]);

  // Handle Day-to-Day Payout
  const handleDailyPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDailyJob) return;
    setDailyPayoutSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("paymentMethod", dailyPayoutMethod);
      fd.append("notes", dailyPayoutNotes);
      if (dailyPayoutProofFile) {
        fd.append("file", dailyPayoutProofFile);
      }

      const res = await fetch(`/api/jobs/${selectedDailyJob.id}/payout`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mentransfer komisi");
      setIsDailyPayoutModalOpen(false);
      setDailyPayoutProofFile(null);
      setDailyPayoutProofPreview(null);
      setActionMessage({ type: "success", text: json.message || "Komisi berhasil ditransfer!" });
      fetchDailyJobs();
      fetchPayrollSlips();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDailyPayoutSubmitting(false);
    }
  };

  // Filtered Day-to-Day Jobs
  const filteredDailyJobs = useMemo(() => {
    return dailyJobs.filter((job) => {
      // Search filter
      if (dailySearch) {
        const q = dailySearch.toLowerCase();
        const matchJob = job.jobNumber.toLowerCase().includes(q);
        const matchTech = (job.technicianName || "").toLowerCase().includes(q);
        const matchCust = (job.customer.name || "").toLowerCase().includes(q);
        const matchServ = (job.service.name || "").toLowerCase().includes(q);
        if (!matchJob && !matchTech && !matchCust && !matchServ) return false;
      }

      // Status filter
      if (dailyStatusFilter === "UNPAID" && job.commissionStatus === "PAID") return false;
      if (dailyStatusFilter === "PAID" && job.commissionStatus !== "PAID") return false;

      // Period filter
      if (dailyPeriodFilter !== "ALL") {
        const jobDate = new Date(job.completedAt || job.scheduledDate);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

        if (dailyPeriodFilter === "TODAY") {
          if (jobDate < startOfToday) return false;
        } else if (dailyPeriodFilter === "YESTERDAY") {
          if (jobDate < startOfYesterday || jobDate >= startOfToday) return false;
        } else if (dailyPeriodFilter === "THIS_WEEK") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
          if (jobDate < sevenDaysAgo) return false;
        } else if (dailyPeriodFilter === "THIS_MONTH") {
          if (jobDate.getMonth() !== now.getMonth() || jobDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [dailyJobs, dailySearch, dailyStatusFilter, dailyPeriodFilter]);

  // Day-to-Day KPI summary
  const dailyKpi = useMemo(() => {
    let totalCommission = 0;
    let paidCommission = 0;
    let unpaidCommission = 0;
    let unpaidCount = 0;
    let paidCount = 0;

    dailyJobs.forEach((j) => {
      const comm = j.technicianCommission || 0;
      totalCommission += comm;
      if (j.commissionStatus === "PAID") {
        paidCommission += comm;
        paidCount++;
      } else {
        unpaidCommission += comm;
        if (comm > 0) unpaidCount++;
      }
    });

    return {
      totalCommission,
      paidCommission,
      unpaidCommission,
      unpaidCount,
      paidCount,
      totalJobs: dailyJobs.length,
    };
  }, [dailyJobs]);

  // Chart 1: Day-to-Day Commission Trend (Rolling 7-Day Window for aesthetic proportion)
  const dailyTrendChartData = useMemo(() => {
    const daysWindow: Array<{
      date: string;
      fullDate: string;
      dayName: string;
      paid: number;
      pending: number;
      total: number;
      count: number;
    }> = [];

    const now = new Date();
    // 7 consecutive days up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
      daysWindow.push({
        date: label,
        fullDate: iso,
        dayName,
        paid: 0,
        pending: 0,
        total: 0,
        count: 0,
      });
    }

    dailyJobs.forEach((j) => {
      const dRaw = (j.completedAt || j.scheduledDate).slice(0, 10);
      const found = daysWindow.find((item) => item.fullDate === dRaw);
      const comm = j.technicianCommission || 0;
      if (found) {
        if (j.commissionStatus === "PAID") {
          found.paid += comm;
        } else {
          found.pending += comm;
        }
        found.total += comm;
        found.count += 1;
      }
    });

    return daysWindow;
  }, [dailyJobs]);

  // Chart 2: Performa & Komisi per Teknisi Lapangan (Tremor Style Leaderboard)
  const techDistributionChartData = useMemo(() => {
    const map: Record<
      string,
      {
        name: string;
        username?: string;
        paid: number;
        pending: number;
        total: number;
        count: number;
        proofCount: number;
      }
    > = {};

    dailyJobs.forEach((j) => {
      const tech = j.technicianName || "Staff Lapangan";
      if (!map[tech]) {
        map[tech] = {
          name: tech,
          username: j.assignedTo?.username || undefined,
          paid: 0,
          pending: 0,
          total: 0,
          count: 0,
          proofCount: 0,
        };
      }
      const comm = j.technicianCommission || 0;
      if (j.commissionStatus === "PAID") {
        map[tech].paid += comm;
      } else {
        map[tech].pending += comm;
      }
      if (j.commissionProofPath) {
        map[tech].proofCount += 1;
      }
      map[tech].total += comm;
      map[tech].count += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [dailyJobs]);

  // Chart 3: Tren Beban Gaji Bulanan (Monthly Payroll Expense)
  const monthlyPayrollChartData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const currentYear = new Date().getFullYear();
    const map: Record<number, { month: string; basic: number; commission: number; total: number }> = {};

    for (let m = 1; m <= 12; m++) {
      map[m] = { month: months[m - 1], basic: 0, commission: 0, total: 0 };
    }

    slips.forEach((s) => {
      if (s.year === currentYear && map[s.month]) {
        map[s.month].basic += s.basicSalary;
        map[s.month].commission += s.jobCommission;
        map[s.month].total += s.netSalary;
      }
    });

    return Object.values(map);
  }, [slips]);

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

          <div className="flex items-center gap-2">
            {payrollTab === "DAILY" ? (
              <button
                onClick={fetchDailyJobs}
                disabled={loadingDaily}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111C44] hover:bg-[#1B254B] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-75"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{loadingDaily ? "Menyegarkan..." : "Segarkan Komisi"}</span>
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-bold text-sm rounded-xl shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Terbitkan Slip Gaji
              </button>
            )}
          </div>
        </div>

        {/* Dual-Mode Tab Switcher: Day-to-Day Komisi vs Penggajian Bulanan (Ultra-Responsive Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 bg-slate-200/80 p-1.5 rounded-2xl w-full sm:w-fit border border-slate-300">
          <button
            type="button"
            onClick={() => setPayrollTab("DAILY")}
            className={`flex items-center justify-between sm:justify-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
              payrollTab === "DAILY"
                ? "bg-[#111C44] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="whitespace-nowrap truncate">Komisi Harian (Day-to-Day)</span>
            </div>
            {dailyKpi.unpaidCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[#111C44] text-[10px] font-black shrink-0">
                {dailyKpi.unpaidCount} Menunggu TF
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPayrollTab("MONTHLY")}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition-all ${
              payrollTab === "MONTHLY"
                ? "bg-[#111C44] text-white shadow-md"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="whitespace-nowrap">Penggajian Bulanan (Monthly)</span>
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

        {/* ================= VIEW 1: DAY-TO-DAY COMMISSION TAB ================= */}
        {payrollTab === "DAILY" ? (
          <div className="space-y-6">
            {/* Day-to-Day KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Card 1: Total Komisi */}
              <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    Total Komisi Selesai
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-[#1B254B] truncate">
                    {formatRupiah(dailyKpi.totalCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{dailyKpi.totalJobs} order diselesaikan</p>
                </div>
              </div>

              {/* Card 2: Sudah Ditransfer */}
              <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sudah Ditransfer (Lunas)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-emerald-600 truncate">
                    {formatRupiah(dailyKpi.paidCommission)}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{dailyKpi.paidCount} order lunas</p>
                </div>
              </div>

              {/* Card 3: Menunggu Transfer Owner */}
              <div className="horizon-card p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-white to-amber-50/50 border-amber-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
                    Menunggu Transfer Owner
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-amber-700 truncate">
                    {formatRupiah(dailyKpi.unpaidCommission)}
                  </h3>
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                    {dailyKpi.unpaidCount} komisi belum dibayar
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Analytics Chart: Komisi Day-to-Day & Performa Teknisi (Elevated Modern Design) */}
            <div className="horizon-card p-4 sm:p-6 transition-all duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#111C44] to-[#1B254B] text-amber-400 flex items-center justify-center shrink-0 shadow-sm border border-amber-400/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-black text-[#1B254B]">
                        Visualisasi Hak Komisi Teknisi (Day-to-Day)
                      </h3>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Activity className="w-3 h-3 text-emerald-600" />
                        Live Sync
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pantau perputaran hak komisi teknisi harian (7 hari terakhir) dan leaderboard perolehan kerja staf.
                    </p>
                  </div>
                </div>

                {/* Quick Ratio Chips & Mode Switcher */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                  {/* Financial Ratio Pill */}
                  <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold">
                    <span className="text-slate-600">
                      Total: <span className="font-extrabold text-[#111C44]">{formatRupiah(dailyKpi.totalCommission)}</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Lunas: {dailyKpi.totalCommission > 0 ? Math.round((dailyKpi.paidCommission / dailyKpi.totalCommission) * 100) : 0}%
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-amber-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pending: {dailyKpi.totalCommission > 0 ? Math.round((dailyKpi.unpaidCommission / dailyKpi.totalCommission) * 100) : 0}%
                    </span>
                  </div>

                  {/* 3-Way Mode Switcher */}
                  <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setDailyChartMode("BAR")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dailyChartMode === "BAR"
                          ? "bg-[#111C44] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kolom 7 Hari</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDailyChartMode("AREA")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dailyChartMode === "AREA"
                          ? "bg-[#111C44] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>Kurva Tren</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDailyChartMode("STAFF")}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        dailyChartMode === "STAFF"
                          ? "bg-[#111C44] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Leaderboard Staf</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Proportional 7-Day Grouped Bar Chart */}
              {dailyChartMode === "BAR" && (
                <div className="animate-fade-in">
                  <div className="h-64 sm:h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={dailyTrendChartData}
                        barGap={4}
                        barCategoryGap="25%"
                        margin={{ top: 10, right: 15, left: -5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#707E94"
                          fontSize={11}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#707E94"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748B" }}
                          tickFormatter={(v) =>
                            v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}jt`
                              : v >= 1000
                              ? `${(v / 1000).toFixed(0)}rb`
                              : `${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#111C44",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff",
                            fontSize: "12px",
                            boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.35)",
                            padding: "10px 14px",
                          }}
                          labelStyle={{ fontWeight: "bold", color: "#FBBF24", marginBottom: "4px" }}
                          formatter={(val: any, name: any) => [
                            formatRupiah(Number(val) || 0),
                            name === "paid" ? "Sudah Ditransfer (Lunas)" : "Menunggu Transfer (Pending)",
                          ]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                          formatter={(value) =>
                            value === "paid"
                              ? "Sudah Ditransfer (Lunas)"
                              : "Menunggu Transfer (Pending)"
                          }
                        />
                        <Bar
                          dataKey="paid"
                          name="paid"
                          fill="#10B981"
                          barSize={18}
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="pending"
                          name="pending"
                          fill="#F59E0B"
                          barSize={18}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-1">
                    *Kolom menampilkan komparasi hak komisi per hari dalam 7 hari terakhir.
                  </p>
                </div>
              )}

              {/* View 2: Smooth Area Glow Trend */}
              {dailyChartMode === "AREA" && (
                <div className="animate-fade-in">
                  <div className="h-64 sm:h-72 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyTrendChartData}
                        margin={{ top: 10, right: 15, left: -5, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="areaColorPaid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="areaColorPending" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#707E94"
                          fontSize={11}
                          tickLine={false}
                          tick={{ fill: "#64748B", fontWeight: 600 }}
                        />
                        <YAxis
                          stroke="#707E94"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748B" }}
                          tickFormatter={(v) =>
                            v >= 1000000
                              ? `${(v / 1000000).toFixed(1)}jt`
                              : v >= 1000
                              ? `${(v / 1000).toFixed(0)}rb`
                              : `${v}`
                          }
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#111C44",
                            borderRadius: "14px",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "#fff",
                            fontSize: "12px",
                            boxShadow: "0 12px 30px -5px rgba(0, 0, 0, 0.35)",
                          }}
                          labelStyle={{ fontWeight: "bold", color: "#FBBF24" }}
                          formatter={(val: any, name: any) => [
                            formatRupiah(Number(val) || 0),
                            name === "paid" ? "Sudah Ditransfer (Lunas)" : "Menunggu Transfer (Pending)",
                          ]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                          formatter={(value) =>
                            value === "paid"
                              ? "Sudah Ditransfer (Lunas)"
                              : "Menunggu Transfer (Pending)"
                          }
                        />
                        <Area
                          type="monotone"
                          dataKey="paid"
                          name="paid"
                          stroke="#10B981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#areaColorPaid)"
                        />
                        <Area
                          type="monotone"
                          dataKey="pending"
                          name="pending"
                          stroke="#F59E0B"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#areaColorPending)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-[10px] text-slate-400 mt-1">
                    *Kurva gelombang visualisasi tren aliran komisi dan pencairan kas.
                  </p>
                </div>
              )}

              {/* View 3: Tremor-Style Technician Performance Leaderboard Cards */}
              {dailyChartMode === "STAFF" && (
                <div className="animate-fade-in space-y-3 pt-1">
                  {techDistributionChartData.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum ada order komisi staf tercatat.</p>
                    </div>
                  ) : (
                    techDistributionChartData.map((tech, idx) => {
                      const paidPct =
                        tech.total > 0 ? Math.round((tech.paid / tech.total) * 100) : 0;
                      const pendingPct = 100 - paidPct;

                      return (
                        <div
                          key={tech.name}
                          className="p-4 sm:p-4.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100/90 transition-all border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
                        >
                          {/* Rank & Profile Info */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                                idx === 0
                                  ? "bg-gradient-to-tr from-amber-400 to-amber-300 text-amber-950 border border-amber-300/80"
                                  : idx === 1
                                  ? "bg-slate-200 text-slate-800 border border-slate-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                              title={`Peringkat #${idx + 1}`}
                            >
                              #{idx + 1}
                            </div>

                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#111C44] to-[#1B254B] text-amber-400 font-black flex items-center justify-center text-sm shrink-0 shadow-xs">
                              {tech.name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-extrabold text-sm text-[#1B254B] truncate">
                                  {tech.name}
                                </h4>
                                {idx === 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    TOP EARNER 👑
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                {tech.username && <span>@{tech.username}</span>}
                                {tech.username && <span>&bull;</span>}
                                <span className="font-bold text-[#111C44]">
                                  {tech.count} order selesai
                                </span>
                                <span>&bull;</span>
                                <span className="font-bold text-emerald-600">
                                  {paidPct}% Lunas
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Dual-Tone Visual Progress Bar (Tremor Style) */}
                          <div className="flex-1 max-w-lg w-full">
                            <div className="flex justify-between items-center text-[11px] font-bold mb-1.5">
                              <span className="text-emerald-700 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Lunas: {formatRupiah(tech.paid)}
                              </span>
                              <span className="text-amber-700 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Pending: {formatRupiah(tech.pending)}
                              </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex p-0.5">
                              {paidPct > 0 && (
                                <div
                                  style={{ width: `${paidPct}%` }}
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-500 shadow-2xs"
                                  title={`Sudah Ditransfer: ${formatRupiah(tech.paid)} (${paidPct}%)`}
                                />
                              )}
                              {pendingPct > 0 && (
                                <div
                                  style={{ width: `${pendingPct}%` }}
                                  className={`h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500 shadow-2xs ${
                                    paidPct === 0 ? "rounded-full" : "rounded-r-full"
                                  }`}
                                  title={`Menunggu Transfer: ${formatRupiah(tech.pending)} (${pendingPct}%)`}
                                />
                              )}
                            </div>
                          </div>

                          {/* Total Hak Komisi Metric */}
                          <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Total Hak Komisi
                            </span>
                            <span className="text-base sm:text-lg font-black text-[#111C44]">
                              {formatRupiah(tech.total)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Day-to-Day Filter & Search Bar */}
            <div className="horizon-card p-4">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari no. order, teknisi, layanan, atau pelanggan..."
                    value={dailySearch}
                    onChange={(e) => setDailySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                {/* Period Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={dailyPeriodFilter}
                    onChange={(e) => setDailyPeriodFilter(e.target.value as any)}
                    className="px-3 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="ALL">Semua Periode</option>
                    <option value="TODAY">Hari Ini</option>
                    <option value="YESTERDAY">Kemarin</option>
                    <option value="THIS_WEEK">7 Hari Terakhir</option>
                    <option value="THIS_MONTH">Bulan Ini</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={dailyStatusFilter}
                    onChange={(e) => setDailyStatusFilter(e.target.value as any)}
                    className="px-3 py-2.5 bg-[#F4F7FE] border border-slate-200/80 rounded-xl text-xs sm:text-sm font-semibold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="ALL">Semua Status Transfer</option>
                    <option value="UNPAID">⚠️ Menunggu Transfer (UNPAID)</option>
                    <option value="PAID">✅ Sudah Ditransfer (PAID)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Day-to-Day Table of Completed Jobs */}
            <div className="horizon-card overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-sm sm:text-base font-black text-[#1B254B]">
                    Daftar Komisi Order Selesai (Day-to-Day)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pencatatan komisi harian per pekerjaan tuntas siap transfer dan cetak slip.
                  </p>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{filteredDailyJobs.length} order</span>
              </div>

              {loadingDaily ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-500 font-semibold">Memuat rekap komisi harian...</p>
                </div>
              ) : filteredDailyJobs.length === 0 ? (
                <div className="p-12 text-center">
                  <Banknote className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-[#1B254B]">Tidak Ada Data Komisi</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Belum ada order pekerjaan berstatus SELESAI yang cocok dengan filter yang dipilih.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F8FAFC] text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3 px-4">No. Order & Selesai</th>
                        <th className="py-3 px-4">Layanan & Pelanggan</th>
                        <th className="py-3 px-4">Teknisi Lapangan</th>
                        <th className="py-3 px-4 text-right">Nilai Order</th>
                        <th className="py-3 px-4 text-right">Komisi Teknisi</th>
                        <th className="py-3 px-4">Status Transfer</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDailyJobs.map((j) => {
                        const isPaid = j.commissionStatus === "PAID";
                        const comm = j.technicianCommission || 0;
                        const waReceipt = getWhatsAppCommissionPaidTemplate(
                          j.assignedTo?.phone || "",
                          j.technicianName || "Teknisi",
                          j.jobNumber,
                          j.service.name,
                          comm,
                          j.commissionPaymentMethod || "Transfer Bank"
                        );

                        return (
                          <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <a
                                href={`/jobs/${j.id}`}
                                className="font-mono font-bold text-[#111C44] hover:text-amber-600 transition-colors"
                              >
                                {j.jobNumber}
                              </a>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {j.completedAt ? formatDateID(j.completedAt) : formatDateID(j.scheduledDate)}
                              </p>
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#1B254B]">{j.service.name}</p>
                              <p className="text-xs text-slate-500">{j.customer.name}</p>
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-bold text-[#111C44]">{j.technicianName || "-"}</p>
                              <p className="text-[10px] text-slate-400">@{j.assignedTo?.username || "staff"}</p>
                            </td>

                            <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                              {formatRupiah(j.totalPrice)}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <span className="font-black text-[#111C44] text-sm">
                                {formatRupiah(comm)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {isPaid ? (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    LUNAS
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    via {j.commissionPaymentMethod || "Transfer"}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-300">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  MENUNGGU TF
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isPaid && (currentUser?.role === "OWNER" || currentUser?.role === "ADMIN") && (
                                  <button
                                    onClick={() => {
                                      setSelectedDailyJob(j);
                                      setDailyPayoutNotes("");
                                      setDailyPayoutProofFile(null);
                                      setDailyPayoutProofPreview(null);
                                      setIsDailyPayoutModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#111C44] font-black text-xs shadow-xs transition-all"
                                  >
                                    <Banknote className="w-3.5 h-3.5" />
                                    <span>Transfer</span>
                                  </button>
                                )}

                                {isPaid && (
                                  <>
                                    <a
                                      href={`/payroll/print?jobId=${j.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#111C44] hover:bg-[#1B254B] text-white font-bold text-xs shadow-xs transition-all"
                                      title="Cetak Slip Komisi Harian"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                                      <span className="hidden sm:inline">Slip PDF</span>
                                    </a>

                                    {j.commissionProofPath && (
                                      <a
                                        href={j.commissionProofPath}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
                                        title="Lihat Foto Bukti Transfer Bank"
                                      >
                                        <Camera className="w-4 h-4" />
                                      </a>
                                    )}

                                    {j.assignedTo?.phone && (
                                      <a
                                        href={waReceipt}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
                                        title="Kirim Bukti Transfer via WhatsApp"
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                      </a>
                                    )}
                                  </>
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
        ) : (
          /* ================= VIEW 2: MONTHLY PAYROLL TAB ================= */
          <div>
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

            {/* Visual Analytics Chart: Beban Gaji Bulanan (Monthly Payroll Expense) */}
            <div className="horizon-card p-4 sm:p-6 mb-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[#1B254B]">
                    Grafik Komposisi Gaji Pokok & Komisi Bulanan
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Distribusi alokasi beban payroll staf tahun berjalan ({new Date().getFullYear()}).
                  </p>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyPayrollChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorBasic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4318FF" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#4318FF" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" stroke="#707E94" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#707E94"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : `${v}`)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#111C44",
                        borderRadius: "12px",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any) => [
                        formatRupiah(Number(val) || 0),
                        name === "total" ? "Total Payroll Bersih" : "Gaji Pokok",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                      formatter={(value) => (value === "total" ? "Total Gaji & Komisi" : "Gaji Pokok Dasar")}
                    />
                    <Area type="monotone" dataKey="total" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" name="total" />
                    <Area type="monotone" dataKey="basic" stroke="#4318FF" strokeWidth={2} fillOpacity={1} fill="url(#colorBasic)" name="basic" />
                  </AreaChart>
                </ResponsiveContainer>
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
        )}
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
                {/* Tombol Cetak PDF Resmi (Clean Isolated A4 Engine) */}
                <a
                  href={`/payroll/print?slipId=${selectedSlip.id}&auto=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111C44] hover:bg-[#0B1437] text-white rounded-xl text-xs font-bold transition shadow-sm active:scale-95"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  Cetak Dokumen Resmi (PDF)
                </a>

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

      {/* MODAL 3: Transfer Komisi Day-to-Day (Portalled to document.body) */}
      {mounted && isDailyPayoutModalOpen && selectedDailyJob && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm no-print animate-fade-in">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsDailyPayoutModalOpen(false)}
          />

          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-gradient-to-r from-[#111C44] to-[#1B254B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Transfer Komisi Teknisi</h3>
                  <p className="text-[10px] text-slate-300">Resik Purwokerto Day-to-Day Payout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDailyPayoutModalOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDailyPayoutSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
                <div className="flex justify-between items-center text-slate-700 mb-1">
                  <span>Teknisi Bertugas:</span>
                  <span className="font-bold text-[#111C44]">{selectedDailyJob.technicianName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 mb-1">
                  <span>Order:</span>
                  <span className="font-mono font-bold">{selectedDailyJob.jobNumber}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 mb-1">
                  <span>Layanan:</span>
                  <span className="font-semibold text-slate-800">{selectedDailyJob.service.name}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                  <span className="font-bold text-slate-900">Nominal Komisi:</span>
                  <span className="font-black text-base text-amber-800">
                    {formatRupiah(selectedDailyJob.technicianCommission)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Metode Pembayaran / Bank:
                </label>
                <select
                  value={dailyPayoutMethod}
                  onChange={(e) => setDailyPayoutMethod(e.target.value)}
                  className="w-full font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                  <option value="Transfer BNI">Transfer BNI</option>
                  <option value="Transfer Bank Jago">Transfer Bank Jago</option>
                  <option value="Transfer SeaBank">Transfer SeaBank</option>
                  <option value="Tunai / Cash">Tunai / Cash Langsung</option>
                  <option value="E-Wallet DANA">E-Wallet DANA</option>
                  <option value="E-Wallet GoPay">E-Wallet GoPay</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Referensi Transfer:
                </label>
                <input
                  type="text"
                  value={dailyPayoutNotes}
                  onChange={(e) => setDailyPayoutNotes(e.target.value)}
                  placeholder="Contoh: Ref M-Banking #98234, atau titip cash di kantor..."
                  className="w-full font-medium px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Upload Foto Bukti Transfer (Struk Bank / M-Banking - Opsional):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setDailyPayoutProofFile(file);
                      setDailyPayoutProofPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#111C44] file:text-white hover:file:bg-[#1B254B]"
                />
                {dailyPayoutProofPreview && (
                  <div className="mt-2.5 relative w-24 h-20 rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
                    <img src={dailyPayoutProofPreview} alt="Bukti Transfer" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setDailyPayoutProofFile(null);
                        setDailyPayoutProofPreview(null);
                      }}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600 transition-colors"
                      title="Hapus foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDailyPayoutModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={dailyPayoutSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {dailyPayoutSubmitting ? "Memproses..." : "Konfirmasi Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </AppLayout>
  );
}
