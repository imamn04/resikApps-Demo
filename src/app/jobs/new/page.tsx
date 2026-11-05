"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID, sanitizePhoneNumber, getWhatsAppLink } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Search,
  MessageCircle,
  UserCheck,
  Send,
  Layers,
  Truck,
  ShieldCheck,
  X,
  ExternalLink,
} from "lucide-react";
import { AuthUser } from "@/types";

export default function NewJobPage() {
  const router = useRouter();

  // Auth User & Role
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [ownerUser, setOwnerUser] = useState<any | null>(null);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [jobDetails, setJobDetails] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [basePrice, setBasePrice] = useState<number | string>(0);
  const [extraFee, setExtraFee] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);
  const [commission, setCommission] = useState<number | string>("");
  const [notes, setNotes] = useState("");

  // Dispatch Mode: OWNER_APPROVAL vs DIRECT_TECH vs POOL
  const [dispatchMode, setDispatchMode] = useState<"OWNER_APPROVAL" | "DIRECT_TECH" | "POOL">("OWNER_APPROVAL");
  const [selectedTechId, setSelectedTechId] = useState("");

  // Master services & Customers state
  const [services, setServices] = useState<any[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Status & Modal
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdJob, setCreatedJob] = useState<any | null>(null);

  // Auto calculated total
  const calculatedTotal = Math.max(
    0,
    (Number(basePrice) || 0) + (Number(extraFee) || 0) - (Number(discount) || 0)
  );

  // Load Services, Customers, Current User, and Technicians
  useEffect(() => {
    async function initData() {
      try {
        const [meRes, servRes, custRes, userRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/services"),
          fetch("/api/customers"),
          fetch("/api/users").catch(() => null),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          // Access Guard: only ADMIN & OWNER can register jobs
          if (meData.user.role === "STAFF_INPUT" || meData.user.role === "VIEWER") {
            alert("Akses Terbatas: Hanya Admin dan Owner yang berhak mendaftarkan order baru.");
            router.replace("/jobs");
            return;
          }
          setCurrentUser(meData.user);
        }

        if (servRes.ok) {
          const servData = await servRes.json();
          setServices(servData.services || []);
          if (servData.services && servData.services.length > 0) {
            setServiceId(servData.services[0].id);
            setBasePrice(servData.services[0].defaultPrice || 0);
          }
        }

        if (custRes.ok) {
          const custData = await custRes.json();
          setExistingCustomers(custData.customers || []);
        }

        if (userRes && userRes.ok) {
          const uData = await userRes.json();
          const allUsers = uData.users || [];
          setTechnicians(allUsers.filter((u: any) => u.role === "STAFF_INPUT" || u.role === "ADMIN"));
          setOwnerUser(allUsers.find((u: any) => u.role === "OWNER") || null);
        }
      } catch (err) {
        console.error("Failed to load init data:", err);
      } finally {
        setLoadingServices(false);
      }
    }
    initData();
  }, [router]);

  // When Service Changes, auto-fill default base price
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const selected = services.find((s) => s.id === id);
    if (selected && selected.defaultPrice) {
      setBasePrice(selected.defaultPrice);
    }
  };

  // Autocomplete by Phone or Name
  const handlePhoneSearch = (val: string) => {
    setCustomerPhone(val);
    if (val.length >= 3) {
      const matches = existingCustomers.filter((c) =>
        c.phone.toLowerCase().includes(val.toLowerCase())
      );
      setCustomerSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleNameSearch = (val: string) => {
    setCustomerName(val);
    if (val.length >= 3) {
      const matches = existingCustomers.filter((c) =>
        c.name.toLowerCase().includes(val.toLowerCase())
      );
      setCustomerSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectExistingCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || "");
    setShowSuggestions(false);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Nama pelanggan dan nomor WhatsApp wajib diisi!");
      return;
    }

    if (!serviceId) {
      setError("Pilih salah satu layanan pekerjaan!");
      return;
    }

    if (dispatchMode === "DIRECT_TECH" && !selectedTechId) {
      setError("Pilih salah satu teknisi / petugas yang bertugas untuk opsi Langsung ke Petugas!");
      return;
    }

    setSubmitting(true);

    try {
      const chosenTech = technicians.find((t) => t.id === selectedTechId);

      let initialStatus = "MENUNGGU_DISPOSISI";
      let assignedId: string | null = null;
      let techName = "";
      let isPoolFlag = false;

      if (dispatchMode === "OWNER_APPROVAL") {
        initialStatus = "MENUNGGU_DISPOSISI";
      } else if (dispatchMode === "DIRECT_TECH") {
        initialStatus = "DIDISPOSISIKAN";
        assignedId = selectedTechId;
        techName = chosenTech ? chosenTech.name : "";
      } else if (dispatchMode === "POOL") {
        initialStatus = "DIDISPOSISIKAN";
        isPoolFlag = true;
        techName = "Pool Terbuka (Ambil Sendiri)";
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          serviceId,
          jobDetails: jobDetails.trim(),
          scheduledDate,
          scheduledTime,
          technicianName: techName,
          assignedToId: assignedId,
          isPool: isPoolFlag,
          basePrice: Number(basePrice) || 0,
          extraFee: Number(extraFee) || 0,
          discount: Number(discount) || 0,
          technicianCommission: Number(commission) || Math.round(calculatedTotal * 0.15),
          status: initialStatus,
          notes: notes.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Gagal menyimpan pekerjaan baru");
        setSubmitting(false);
        return;
      }

      // Open WhatsApp Dispatch Modal
      setCreatedJob({
        ...json.job,
        selectedTech: chosenTech,
        mode: dispatchMode,
      });
    } catch (err: any) {
      setError("Terjadi kesalahan jaringan saat menyimpan pekerjaan");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper WhatsApp Templates
  const getOwnerApprovalWaLink = (job: any) => {
    const ownerPhone = ownerUser?.phone || "081234567890";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Halo Pak Owner, Admin telah mendaftarkan order baru *${job.jobNumber}* untuk *${job.customer.name}* (Layanan: *${job.service.name}*).
Total Nilai: *${formatRupiah(job.totalPrice)}*
Jadwal: *${formatDateID(job.scheduledDate)} - ${job.scheduledTime || "09:00"} WIB*
Alamat: ${job.customer.address || "-"}

Mohon persetujuan & disposisi teknisi:
${origin}/jobs/${job.id}`;
    return getWhatsAppLink(ownerPhone, msg);
  };

  const getTechnicianDispatchWaLink = (job: any) => {
    const techPhone = job.selectedTech?.phone || "081234567890";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Halo ${job.selectedTech?.name || "Teknisi"}, Anda mendapatkan penugasan order baru dari *Resik Purwokerto*!
No. Order: *${job.jobNumber}*
Pelanggan: *${job.customer.name}* (${job.customer.phone})
Layanan: *${job.service.name}*
Jadwal: *${formatDateID(job.scheduledDate)} - ${job.scheduledTime || "09:00"} WIB*
Alamat: ${job.customer.address || "-"}
Estimasi Komisi: *${formatRupiah(job.technicianCommission)}*

Silakan buka aplikasi untuk konfirmasi perjalanan (OTW):
${origin}/jobs/${job.id}`;
    return getWhatsAppLink(techPhone, msg);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#707E94] hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Pekerjaan
          </Link>
          <span className="text-xs text-[#111C44] bg-amber-100 px-3 py-1 rounded-full font-black border border-amber-300 shadow-2xs">
            Auto Format RP-YYYYMMDD-XXXX
          </span>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-[#1B254B] tracking-tight">
            Input Pekerjaan Baru (Job Intake)
          </h1>
          <p className="text-xs sm:text-sm text-[#707E94] mt-1 font-medium">
            Formulir pendaftaran pelanggan, spesifikasi layanan, disposisi petugas, dan kalkulasi tagihan.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-xs sm:text-sm text-rose-800 animate-fade-in font-bold">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Data Pelanggan */}
          <div className="horizon-card p-5 sm:p-7 relative">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <User className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm sm:text-base font-black text-[#1B254B]">
                1. Data Pelanggan (Client Info)
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* No WhatsApp */}
              <div className="relative">
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Pelanggan *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3AED0]">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567890"
                    value={customerPhone}
                    onChange={(e) => handlePhoneSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Nama Pelanggan */}
              <div className="relative">
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Nama Lengkap Pelanggan *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3AED0]">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Nama pelanggan"
                    value={customerName}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Autocomplete Dropdown */}
              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="sm:col-span-2 bg-white border border-amber-300 rounded-2xl shadow-xl p-2 z-20">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Pelanggan Ditemukan di Database (Klik untuk Isi Otomatis):
                  </p>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {customerSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectExistingCustomer(c)}
                        className="w-full text-left p-2.5 hover:bg-amber-50 rounded-xl transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-[#1B254B]">{c.name}</p>
                          <p className="text-slate-400 text-[11px] font-mono">{c.phone}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          {c.totalOrders}x Order Sebelumnya
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Alamat Lengkap */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Alamat Lengkap Lokasi Pengerjaan *
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3.5 pointer-events-none text-[#A3AED0]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Jl. Overste Isdiman No. 25, RT 02/03, Purwokerto Lor..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-medium text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Detail Layanan & Jadwal */}
          <div className="horizon-card p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm sm:text-base font-black text-[#1B254B]">
                2. Spesifikasi Layanan & Penjadwalan
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Jenis Layanan */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Pilihan Jasa Layanan *
                </label>
                <select
                  required
                  value={serviceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal Jadwal */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Tanggal Pelaksanaan *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3AED0]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Jam Pelaksanaan */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Jam / Estimasi Waktu Tiba
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3AED0]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Spesifikasi Pekerjaan */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Rincian Item / Spesifikasi Pekerjaan
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sofa L shape 3 dudukan, karpet ruang tamu 2x3 meter, kasur king size noda kopi..."
                  value={jobDetails}
                  onChange={(e) => setJobDetails(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-medium text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Pilihan Alur Penugasan & Disposisi (ACC Owner vs Kirim ke Petugas) */}
          <div className="horizon-card p-5 sm:p-7 border-2 border-amber-200 bg-gradient-to-br from-white via-amber-50/20 to-white">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-100">
              <UserCheck className="w-5 h-5 text-amber-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#111C44]">
                  3. Pilihan Alur Penugasan & Disposisi Order
                </h2>
                <p className="text-[11px] text-slate-500">
                  Tentukan apakah order memerlukan persetujuan Owner terlebih dahulu atau langsung ditugaskan ke teknisi
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Opsi 1: Ajukan ke Owner */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  dispatchMode === "OWNER_APPROVAL"
                    ? "bg-[#111C44] text-white border-[#111C44] shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:border-amber-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dispatchMode"
                      checked={dispatchMode === "OWNER_APPROVAL"}
                      onChange={() => setDispatchMode("OWNER_APPROVAL")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-black text-xs">Ajukan Approval ke Owner</span>
                  </div>
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${dispatchMode === "OWNER_APPROVAL" ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <p className={`text-[10px] mt-2 ${dispatchMode === "OWNER_APPROVAL" ? "text-slate-300" : "text-slate-500"}`}>
                  Status: <strong>Menunggu Disposisi</strong>. Owner akan mereview & memilih teknisi.
                </p>
              </label>

              {/* Opsi 2: Langsung Disposisi ke Petugas */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  dispatchMode === "DIRECT_TECH"
                    ? "bg-[#111C44] text-white border-[#111C44] shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:border-amber-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dispatchMode"
                      checked={dispatchMode === "DIRECT_TECH"}
                      onChange={() => setDispatchMode("DIRECT_TECH")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-black text-xs">Langsung ke Petugas</span>
                  </div>
                  <UserCheck className={`w-4 h-4 shrink-0 ${dispatchMode === "DIRECT_TECH" ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <p className={`text-[10px] mt-2 ${dispatchMode === "DIRECT_TECH" ? "text-slate-300" : "text-slate-500"}`}>
                  Status: <strong>Didisposisikan</strong>. Admin langsung memilih teknisi yang bertugas.
                </p>
              </label>

              {/* Opsi 3: Pool Terbuka */}
              <label
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  dispatchMode === "POOL"
                    ? "bg-[#111C44] text-white border-[#111C44] shadow-md"
                    : "bg-white border-slate-200 text-slate-700 hover:border-amber-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="dispatchMode"
                      checked={dispatchMode === "POOL"}
                      onChange={() => setDispatchMode("POOL")}
                      className="w-4 h-4 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="font-black text-xs">Pool Antrean Terbuka</span>
                  </div>
                  <Truck className={`w-4 h-4 shrink-0 ${dispatchMode === "POOL" ? "text-amber-400" : "text-slate-400"}`} />
                </div>
                <p className={`text-[10px] mt-2 ${dispatchMode === "POOL" ? "text-slate-300" : "text-slate-500"}`}>
                  Mode Gojek. Siap diambil mandiri oleh teknisi yang senggang.
                </p>
              </label>
            </div>

            {/* Dropdown Teknisi jika Opsi 2 (Langsung ke Petugas) dipilih */}
            {dispatchMode === "DIRECT_TECH" && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 animate-fade-in">
                <label className="block text-xs font-black text-[#111C44] uppercase tracking-wider mb-1.5">
                  Pilih Teknisi / Petugas yang Ditugaskan *
                </label>
                <select
                  required
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-300 rounded-xl text-xs font-bold text-[#111C44] focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">-- Pilih Teknisi Bertugas --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username}) - {t.phone || "No WA belum ada"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Card 4: Kalkulasi Biaya & Tagihan */}
          <div className="horizon-card p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <DollarSign className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm sm:text-base font-black text-[#1B254B]">
                4. Rincian Biaya, Diskon & Estimasi Komisi
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* Harga Layanan Dasar */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Harga Layanan Dasar (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>

              {/* Biaya Tambahan */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Biaya Tambahan / Transport (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={extraFee}
                  onChange={(e) => setExtraFee(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>

              {/* Potongan Diskon */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Potongan Diskon Promo (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-black text-rose-600 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
            </div>

            {/* Total Highlight Bar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0B1437] via-[#111C44] to-[#1B254B] text-white flex items-center justify-between mb-5 shadow-horizon-navy">
              <div>
                <p className="text-xs text-amber-400 font-black uppercase tracking-wider">
                  Total Tagihan Akhir
                </p>
                <p className="text-[11px] text-slate-300">
                  Harga Dasar + Biaya Tambahan - Diskon
                </p>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-400">
                {formatRupiah(calculatedTotal)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Estimasi Komisi Teknisi */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Estimasi Komisi Teknisi (Rp)</span>
                  <span className="text-[10px] text-amber-600 font-bold lowercase">
                    (default 15%: {formatRupiah(Math.round(calculatedTotal * 0.15))})
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={commission !== "" ? commission : Math.round(calculatedTotal * 0.15)}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder="Estimasi komisi teknisi"
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-black text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-black text-[#1B254B] uppercase tracking-wider mb-1.5">
                  Catatan Khusus Lapangan
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Minta dikerjakan pagi sebelum jam 11"
                  className="w-full px-4 py-2.5 bg-[#F4F7FE] border border-slate-200 rounded-2xl text-sm font-bold text-[#1B254B] focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/jobs"
              className="px-6 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-[#1B254B] text-sm font-bold transition-all shadow-xs"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-sm shadow-horizon-glow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#111C44] border-t-transparent rounded-full animate-spin" />
                  <span>Mendaftarkan Pekerjaan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-[#111C44]" />
                  <span>Simpan & Terbitkan Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modern WhatsApp Dispatch Notification Modal */}
      {createdJob &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-[#0B1437]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-[#111C44]">
                      Order Berhasil Didaftarkan!
                    </h3>
                    <p className="text-xs text-slate-500 font-mono font-bold">
                      {createdJob.jobNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/jobs/${createdJob.id}`)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Info Card */}
              <div className="p-4 rounded-2xl bg-[#F4F7FE] border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-[#111C44]">{createdJob.customer?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="font-bold text-[#111C44]">{createdJob.service?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jadwal:</span>
                  <span className="font-bold text-[#111C44]">
                    {formatDateID(createdJob.scheduledDate)} - {createdJob.scheduledTime || "09:00"} WIB
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-700">Total Tagihan:</span>
                  <span className="font-black text-emerald-700 text-sm">
                    {formatRupiah(createdJob.totalPrice)}
                  </span>
                </div>
              </div>

              {/* Action Buttons for Notification */}
              <div className="space-y-2.5 pt-1">
                {createdJob.mode === "OWNER_APPROVAL" && (
                  <a
                    href={getOwnerApprovalWaLink(createdJob)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Kirim Permintaan Approval ke WhatsApp Owner
                  </a>
                )}

                {createdJob.mode === "DIRECT_TECH" && (
                  <a
                    href={getTechnicianDispatchWaLink(createdJob)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Kirim SPK Tugas via WhatsApp ke {createdJob.selectedTech?.name || "Teknisi"}
                  </a>
                )}

                {createdJob.mode === "POOL" && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-bold text-center">
                    Order telah dimasukkan ke Antrean Terbuka (Pool). Teknisi lapangan dapat langsung mengklaim order ini.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/jobs/${createdJob.id}`)}
                  className="w-full py-3 px-4 rounded-2xl bg-[#111C44] hover:bg-[#1B254B] text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-amber-400" />
                  Buka Halaman Rincian & Tracking Pekerjaan
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AppLayout>
  );
}
