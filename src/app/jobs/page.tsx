"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID, getWhatsAppLink } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Search,
  Filter,
  PlusCircle,
  Eye,
  MessageCircle,
  Trash2,
  Calendar,
  X,
  Phone,
  RefreshCw,
  CheckCircle,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { JobData, AuthUser } from "@/types";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [serviceId, setServiceId] = useState("ALL");
  const [technician, setTechnician] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [myOnly, setMyOnly] = useState(false);

  // Master services
  const [services, setServices] = useState<any[]>([]);

  // Action status message
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch Current User
  useEffect(() => {
    async function getUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const json = await res.json();
          setCurrentUser(json.user);
        }
      } catch {}
    }
    getUser();
  }, []);

  // Fetch Services
  useEffect(() => {
    async function getServices() {
      try {
        const res = await fetch("/api/services");
        if (res.ok) {
          const json = await res.json();
          setServices(json.services || []);
        }
      } catch {}
    }
    getServices();
  }, []);

  // Fetch Jobs List
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status !== "ALL") params.append("status", status);
      if (serviceId !== "ALL") params.append("serviceId", serviceId);
      if (technician) params.append("technician", technician);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (myOnly) params.append("myOnly", "true");

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setJobs(json.jobs || []);
      }
    } catch (err) {
      console.error("Fetch jobs error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, status, serviceId, technician, startDate, endDate, myOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  // Quick Status Update
  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setActionMessage(`Status berhasil diperbarui`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchJobs();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal mengubah status");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  // Delete Job (Owner Only)
  const handleDeleteJob = async (jobId: string, jobNumber: string) => {
    if (
      !confirm(
        `APAKAH ANDA YAKIN?\n\nPekerjaan nomor ${jobNumber} akan dihapus dari sistem. Aksi ini akan dicatat dalam Audit Trail.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActionMessage(`Pekerjaan ${jobNumber} berhasil dihapus.`);
        setTimeout(() => setActionMessage(null), 3000);
        fetchJobs();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal menghapus pekerjaan");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("ALL");
    setServiceId("ALL");
    setTechnician("");
    setStartDate("");
    setEndDate("");
    setMyOnly(false);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#1B254B] tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-500" />
            Daftar & Manajemen Pekerjaan
            <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              {jobs.length} Pekerjaan
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[#707E94] mt-1 font-medium">
            Monitor, kelola status, cari pelanggan, dan saring jadwal pekerjaan lapangan.
          </p>
        </div>

        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs sm:text-sm shadow-horizon-glow transition-all cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4 text-[#111C44]" />
          Input Job Baru
        </Link>
      </div>

      {actionMessage && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter and Search Box (Horizon Card) */}
      <div className="horizon-card p-5 mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#A3AED0]">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nomor job (RP-...), nama pelanggan, no. WhatsApp, alamat, atau nama teknisi..."
            className="w-full pl-11 pr-10 py-3 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Badges & Selects */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-black text-[#707E94] uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl font-bold text-[#1B254B] focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU_DISPOSISI">1. Menunggu Disposisi</option>
              <option value="DIDISPOSISIKAN">2. Didisposisikan</option>
              <option value="MENUJU_LOKASI">3. Menuju Lokasi (OTW)</option>
              <option value="TIBA_DI_LOKASI">4. Tiba di Lokasi</option>
              <option value="DALAM_PENGERJAAN">5. Dalam Pengerjaan</option>
              <option value="MENUNGGU_VALIDASI">6. Menunggu Validasi Owner</option>
              <option value="SELESAI">7. Selesai (Tervalidasi)</option>
              <option value="DIBATALKAN">Dibatalkan</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-[10px] font-black text-[#707E94] uppercase tracking-wider mb-1">
              Layanan
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl font-bold text-[#1B254B] focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Layanan</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dari Tanggal */}
          <div>
            <label className="block text-[10px] font-black text-[#707E94] uppercase tracking-wider mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F4F7FE] border border-slate-200 rounded-xl font-bold text-[#1B254B] text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[10px] font-black text-[#707E94] uppercase tracking-wider mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F4F7FE] border border-slate-200 rounded-xl font-bold text-[#1B254B] text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Teknisi */}
          <div>
            <label className="block text-[10px] font-black text-[#707E94] uppercase tracking-wider mb-1">
              Teknisi / Tim
            </label>
            <input
              type="text"
              placeholder="Cari teknisi..."
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#F4F7FE] border border-slate-200 rounded-xl font-bold text-[#1B254B] text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Actions Reset / Mine Only */}
          <div className="flex flex-col justify-end gap-1">
            {currentUser?.role === "STAFF_INPUT" && (
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1B254B] cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={myOnly}
                  onChange={(e) => setMyOnly(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                Inputan Saya
              </label>
            )}
            <button
              onClick={resetFilters}
              className="w-full py-2 px-2 bg-[#F4F7FE] hover:bg-slate-200 text-[#111C44] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1 border border-slate-200"
            >
              <RefreshCw className="w-3 h-3 text-amber-500" />
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Jobs Table (Horizon Style Card) */}
      <div className="horizon-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#1B254B] uppercase tracking-wider">
              Memuat data pekerjaan...
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F4F7FE] text-[#707E94] flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#1B254B]">Tidak ada pekerjaan yang cocok</h3>
            <p className="text-xs text-[#707E94] mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau reset filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F4F7FE] border-b border-slate-200 text-[#707E94] font-black uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-5">No. Job</th>
                  <th className="py-4 px-4">Jadwal & Jam</th>
                  <th className="py-4 px-4">Pelanggan</th>
                  <th className="py-4 px-4">Layanan</th>
                  <th className="py-4 px-4">Petugas / Tim</th>
                  <th className="py-4 px-4">Total Biaya</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const waText = `Halo ${job.customer.name}, ini dari Resik Purwokerto terkait jadwal pekerjaan ${job.service.name} (No. Job: ${job.jobNumber}) pada ${job.scheduledDate}.`;
                  const waUrl = getWhatsAppLink(job.customer.phone, waText);

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-amber-50/30 transition-colors group"
                    >
                      {/* Nomor Job */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-black font-mono text-[#111C44] group-hover:text-amber-600 transition-colors"
                        >
                          {job.jobNumber}
                        </Link>
                        <p className="text-[10px] text-[#707E94] mt-0.5 font-medium">
                          Oleh: {job.createdBy.name.split(" ")[0]}
                        </p>
                      </td>

                      {/* Jadwal */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-extrabold text-[#1B254B]">
                          {formatDateID(job.scheduledDate)}
                        </span>
                        <p className="text-[11px] text-[#707E94] font-bold">
                          {job.scheduledTime ? `Jam ${job.scheduledTime} WIB` : "-"}
                        </p>
                      </td>

                      {/* Pelanggan */}
                      <td className="py-4 px-4">
                        <div className="font-black text-[#1B254B]">{job.customer.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[#707E94] text-[11px] font-bold">
                            {job.customer.phone}
                          </span>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-700 p-0.5 rounded"
                            title="Chat WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-100" />
                          </a>
                        </div>
                        <p className="text-[10px] text-[#707E94] truncate max-w-xs mt-0.5">
                          {job.customer.address}
                        </p>
                      </td>

                      {/* Layanan */}
                      <td className="py-4 px-4">
                        <span className="font-extrabold text-[#1B254B]">
                          {job.service.name}
                        </span>
                        {job.jobDetails && (
                          <p className="text-[10px] text-[#707E94] truncate max-w-xs mt-0.5">
                            {job.jobDetails}
                          </p>
                        )}
                      </td>

                      {/* Teknisi */}
                      <td className="py-4 px-4 whitespace-nowrap text-[#1B254B] font-bold">
                        {job.technicianName || (
                          <span className="text-[#707E94] italic font-normal">Belum ditentukan</span>
                        )}
                      </td>

                      {/* Total Biaya */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-black text-[#111C44]">
                          {formatRupiah(job.totalPrice)}
                        </span>
                        {job.discount > 0 && (
                          <p className="text-[10px] text-rose-600 font-bold">
                            Diskon {formatRupiah(job.discount)}
                          </p>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <select
                          value={job.status}
                          onChange={(e) => handleStatusChange(job.id, e.target.value)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer shadow-2xs"
                        >
                          <option value="PENDING">🟡 Pending</option>
                          <option value="DIJADWALKAN">🔵 Dijadwalkan</option>
                          <option value="DALAM_PENGERJAAN">🟣 Dalam Pengerjaan</option>
                          <option value="SELESAI">🟢 Selesai</option>
                          <option value="DIBATALKAN">🔴 Dibatalkan</option>
                        </select>
                      </td>

                      {/* Aksi */}
                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="p-2 rounded-xl text-[#111C44] hover:bg-[#F4F7FE] border border-slate-200 transition-colors shadow-2xs"
                            title="Lihat Detail & Dokumentasi"
                          >
                            <Eye className="w-4 h-4 text-amber-500" />
                          </Link>

                          {currentUser?.role === "OWNER" && (
                            <button
                              onClick={() => handleDeleteJob(job.id, job.jobNumber)}
                              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
                              title="Hapus Job (Owner Saja)"
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
    </AppLayout>
  );
}
