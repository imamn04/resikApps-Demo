"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Truck,
  Camera,
  ShieldCheck,
  Award,
  Send,
  MessageCircle,
  Upload,
  UserCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Layers,
  Banknote,
  DollarSign,
  Printer,
  X,
} from "lucide-react";
import { JobData, AuthUser, JobPhotoData } from "@/types";
import {
  formatDateID,
  formatRupiah,
  getWhatsAppAssignedTemplate,
  getWhatsAppOtwTemplate,
  getWhatsAppArrivedTemplate,
  getWhatsAppDoneTemplate,
  getWhatsAppCommissionPaidTemplate,
  JOB_STATUS_CONFIG,
} from "@/lib/utils";

interface JobStepperTimelineProps {
  job: JobData;
  currentUser: AuthUser | null;
  onRefresh: () => void;
  onOpenLightbox: (index: number) => void;
  technicians?: Array<{ id: string; name: string; username: string }>;
}

export default function JobStepperTimeline({
  job,
  currentUser,
  onRefresh,
  onOpenLightbox,
  technicians = [],
}: JobStepperTimelineProps) {
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states for each stage
  const [dispositionTechId, setDispositionTechId] = useState(job.assignedToId || "");
  const [isPoolToggle, setIsPoolToggle] = useState(false);
  const [techCommission, setTechCommission] = useState<number>(job.technicianCommission || 0);

  // Check-in form
  const [checkinNotes, setCheckinNotes] = useState(job.checkinNotes || "");
  const [checkinFile, setCheckinFile] = useState<File | null>(null);

  // Before form
  const [beforeNotes, setBeforeNotes] = useState(job.notes || "");
  const [beforeFile, setBeforeFile] = useState<File | null>(null);

  // After form
  const [afterNotes, setAfterNotes] = useState("");
  const [afterFile, setAfterFile] = useState<File | null>(null);

  // Transfer Komisi (Day-to-day payout) state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState("Transfer BCA");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [payoutProofPreview, setPayoutProofPreview] = useState<string | null>(null);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  // Prevent background scroll and hide mobile bottom bar when modal is active
  useEffect(() => {
    if (isPayoutModalOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isPayoutModalOpen]);

  const isOwner = currentUser?.role === "OWNER";
  const isAdmin = currentUser?.role === "ADMIN";
  const isTechnician = currentUser?.role === "STAFF_INPUT";
  const isAssignedTechnician = isTechnician && job.assignedToId === currentUser?.id;
  const canOperateField = isAssignedTechnician || isOwner || isAdmin;

  // Determine stage index (1 to 7)
  const getStageIndex = (status: string) => {
    switch (status) {
      case "MENUNGGU_DISPOSISI":
      case "PENDING":
        return 1;
      case "DIDISPOSISIKAN":
      case "DIJADWALKAN":
        return 2;
      case "MENUJU_LOKASI":
        return 3;
      case "TIBA_DI_LOKASI":
        return 4;
      case "DALAM_PENGERJAAN":
        return 5;
      case "MENUNGGU_VALIDASI":
        return 6;
      case "SELESAI":
        return 7;
      default:
        return 1;
    }
  };

  const currentStage = getStageIndex(job.status);

  // Categorize photos
  const allPhotos = job.photos || [];
  const checkinPhotos = allPhotos.filter((p) => p.photoType === "CHECKIN");
  const beforePhotos = allPhotos.filter((p) => p.photoType === "BEFORE");
  const afterPhotos = allPhotos.filter((p) => p.photoType === "AFTER");

  // Helper to upload photo
  const uploadPhotoHelper = async (file: File, type: "CHECKIN" | "BEFORE" | "AFTER", caption: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("photoType", type);
    formData.append("caption", caption);

    const res = await fetch(`/api/jobs/${job.id}/photos`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || `Gagal mengunggah foto ${type}`);
    }
  };

  // 1. Handle Owner Disposition
  const handleDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPoolToggle && !dispositionTechId) {
      alert("Pilih teknisi atau centang mode Pool Terbuka");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/disposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedToId: isPoolToggle ? null : dispositionTechId,
          isPool: isPoolToggle,
          technicianCommission: techCommission,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal melakukan disposisi");
      setActionMessage(json.message || "Disposisi berhasil disimpan!");
      onRefresh();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Handle Technician Claim Pool
  const handleClaimPool = async () => {
    if (!confirm("Ambil dan klaim pesanan ini ke jadwal kerja Anda?")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/claim`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengambil pesanan");
      setActionMessage(json.message);
      onRefresh();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Handle Stepper Actions
  const handleStepperAction = async (action: "OTW" | "CHECKIN" | "PROGRESS" | "FINISH" | "VALIDATE") => {
    setSubmitting(true);
    try {
      if (action === "CHECKIN") {
        if (!checkinFile && checkinPhotos.length === 0) {
          alert("Wajib mengunggah foto bukti tiba di lokasi / APD K3!");
          setSubmitting(false);
          return;
        }
        if (checkinFile) {
          await uploadPhotoHelper(checkinFile, "CHECKIN", checkinNotes || "Check-in Tiba di Lokasi & APD");
        }
      }

      if (action === "PROGRESS") {
        if (beforeFile) {
          await uploadPhotoHelper(beforeFile, "BEFORE", beforeNotes || "Foto Kondisi Awal (Before)");
        }
      }

      if (action === "FINISH") {
        if (!afterFile && afterPhotos.length === 0) {
          alert("Wajib mengunggah foto hasil akhir pengerjaan (After)!");
          setSubmitting(false);
          return;
        }
        if (afterFile) {
          await uploadPhotoHelper(afterFile, "AFTER", afterNotes || "Foto Hasil Akhir (After)");
        }
      }

      const res = await fetch(`/api/jobs/${job.id}/stepper`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          checkinNotes: action === "CHECKIN" ? checkinNotes : undefined,
          notes: action === "PROGRESS" ? beforeNotes : action === "FINISH" ? afterNotes : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses alur kerja");

      setActionMessage(json.message);
      onRefresh();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Commission Payout (Day-to-Day)
  const handleCommissionPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("paymentMethod", payoutMethod);
      fd.append("notes", payoutNotes);
      if (payoutProofFile) {
        fd.append("file", payoutProofFile);
      }

      const res = await fetch(`/api/jobs/${job.id}/payout`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mentransfer komisi");
      setIsPayoutModalOpen(false);
      setPayoutProofFile(null);
      setPayoutProofPreview(null);
      setActionMessage(json.message || "Komisi teknisi berhasil ditransfer!");
      onRefresh();
      setTimeout(() => setActionMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const assignedWaLink = getWhatsAppAssignedTemplate(
    job.customer.phone,
    job.customer.name,
    job.technicianName || currentUser?.name || "Teknisi Resik Purwokerto",
    job.service.name,
    job.jobNumber
  );

  const otwWaLink = getWhatsAppOtwTemplate(
    job.customer.phone,
    job.customer.name,
    job.technicianName || currentUser?.name || "Teknisi Resik",
    job.service.name,
    job.jobNumber
  );

  const arrivedWaLink = getWhatsAppArrivedTemplate(
    job.customer.phone,
    job.customer.name,
    job.technicianName || currentUser?.name || "Teknisi Resik",
    job.service.name,
    job.jobNumber
  );

  const doneWaLink = getWhatsAppDoneTemplate(
    job.customer.phone,
    job.customer.name,
    job.service.name,
    job.jobNumber,
    job.totalPrice
  );

  const commissionPaidWaLink = getWhatsAppCommissionPaidTemplate(
    job.assignedTo?.phone || "",
    job.technicianName || "Teknisi",
    job.jobNumber,
    job.service.name,
    job.technicianCommission || 0,
    job.commissionPaymentMethod || "Transfer Bank"
  );

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/80 shadow-xs mb-8">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#111C44] tracking-tight">
                Live Tracking Progres Layanan
              </h2>
              <p className="text-xs text-[#707E94] font-medium">
                Tahapan pengerjaan teknisi terverifikasi: check-in APD K3, foto before-after, hingga validasi owner
              </p>
            </div>
          </div>
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Tahap Aktif:</span>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-[#111C44] text-white shadow-xs">
            Tahap {currentStage} / 7
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Vertical Stepper Container */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8">
        {/* ================= STEP 1: REGISTRASI ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 1
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 1 ? <CheckCircle2 className="w-4 h-4" /> : "1"}
          </div>

          <div className="bg-[#F4F7FE] p-4 sm:p-5 rounded-2xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44]">
                1. Registrasi & Input Order (Admin)
              </h3>
              <span className="text-[11px] text-[#707E94] font-semibold">
                {formatDateID(job.createdAt)}
              </span>
            </div>
            <p className="text-xs text-[#707E94] mt-1">
              Order didaftarkan oleh <strong>{job.createdBy.name}</strong> dengan estimasi nilai transaksi{" "}
              <strong className="text-emerald-700">{formatRupiah(job.totalPrice)}</strong> dan komisi teknisi{" "}
              <strong className="text-amber-700">{formatRupiah(job.technicianCommission || job.totalPrice * 0.15)}</strong>.
            </p>
          </div>
        </div>

        {/* ================= STEP 2: DISPOSISI OWNER ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 2
                ? "bg-emerald-500 text-white shadow-sm"
                : currentStage === 1
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 2 ? <CheckCircle2 className="w-4 h-4" /> : "2"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 1
                ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <span>2. Disposisi Penugasan (Owner)</span>
                {job.isPool && (
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    Mode Pool Terbuka
                  </span>
                )}
              </h3>
              {job.assignedTo && (
                <span className="text-[11px] text-emerald-700 font-bold">
                  Ditugaskan ke: {job.assignedTo.name}
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Owner memilih karyawan yang ditugaskan atau membuka order ke antrean pool &apos;ambil sendiri ala Gojek&apos;.
            </p>

            {/* Owner Disposition Interactive Form if stage is 1 or owner wants to change */}
            {(isOwner || isAdmin) && currentStage <= 2 && (
              <form onSubmit={handleDisposition} className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#111C44] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPoolToggle}
                      onChange={(e) => setIsPoolToggle(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                    />
                    Buka ke Antrean Pool Terbuka (&apos;Ambil Sendiri ala Gojek&apos;)
                  </label>
                </div>

                {!isPoolToggle && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pilih Teknisi / Karyawan:
                    </label>
                    <select
                      value={dispositionTechId}
                      onChange={(e) => setDispositionTechId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">-- Pilih Teknisi Bertugas --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (@{t.username})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Komisi Teknisi (Rp):
                    </label>
                    <input
                      type="number"
                      value={techCommission}
                      onChange={(e) => setTechCommission(Number(e.target.value))}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#111C44] hover:bg-[#1B254B] text-white font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4 text-amber-400" />
                      {submitting ? "Menyimpan..." : "Simpan Disposisi Order"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Technician Claim Button if Order is Pool */}
            {job.isPool && isTechnician && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs text-blue-900 font-bold">
                  Order ini tersedia di antrean terbuka. Klaim sekarang untuk mengambil pekerjaan ini.
                </span>
                <button
                  type="button"
                  onClick={handleClaimPool}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-xs shrink-0"
                >
                  Ambil Order Ini (Klaim)
                </button>
              </div>
            )}

            {/* 1-Click WhatsApp Notification to Customer that order is taken */}
            {job.assignedTo && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={assignedWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  1-Click WA: Kabari Pelanggan (&quot;Order Diterima Teknisi&quot;)
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 3: MENUJU LOKASI ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 3
                ? "bg-emerald-500 text-white shadow-sm"
                : currentStage === 2
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 3 ? <CheckCircle2 className="w-4 h-4" /> : "3"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 2 || currentStage === 3
                ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                <span>3. Karyawan Menuju Lokasi</span>
              </h3>
              {currentStage >= 3 && (
                <span className="text-[11px] text-emerald-700 font-bold">
                  Status: Menuju Lokasi
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Teknisi berangkat dan mengirim notifikasi WhatsApp 1-klik ke pelanggan untuk konfirmasi kedatangan.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* WhatsApp 1-click notification */}
              <a
                href={otwWaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                1-Click Notifikasi WA ke Pelanggan (&quot;Teknisi Sedang Jalan&quot;)
              </a>

              {/* Action trigger to change status to MENUJU_LOKASI */}
              {canOperateField && currentStage === 2 && (
                <button
                  type="button"
                  onClick={() => handleStepperAction("OTW")}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#111C44] font-black text-xs shadow-xs transition-all"
                >
                  {submitting ? "Memproses..." : "Klik: Saya Berangkat (Menuju Lokasi)"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= STEP 4: TIBA DI LOKASI & CHECK-IN APD ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 4
                ? "bg-emerald-500 text-white shadow-sm"
                : currentStage === 3
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 4 ? <CheckCircle2 className="w-4 h-4" /> : "4"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 3 || currentStage === 4
                ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span>4. Tiba di Lokasi & Check-in APD K3</span>
              </h3>
              {job.checkinAt && (
                <span className="text-[11px] text-blue-700 font-bold">
                  Check-in: {formatDateID(job.checkinAt)}
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Check-in kehadiran di tempat pelanggan dan unggah foto bukti tiba / kelengkapan APD K3.
            </p>

            {job.checkinNotes && (
              <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-800">
                <strong>Catatan Check-in:</strong> {job.checkinNotes}
              </div>
            )}

            {/* Check-in Gallery */}
            {checkinPhotos.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Foto Bukti Tiba / APD:</p>
                <div className="flex flex-wrap gap-2">
                  {checkinPhotos.map((p) => {
                    const globalIdx = allPhotos.findIndex((item) => item.id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onOpenLightbox(globalIdx)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer group border border-slate-300 shadow-2xs hover:ring-2 hover:ring-amber-400 transition-all"
                      >
                        <img src={p.filePath} alt="Check-in APD" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[9px] text-center font-bold py-0.5">
                          Tiba / APD
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 1-Click WhatsApp Notification: Teknisi Telah Tiba di Lokasi */}
            {currentStage >= 3 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={arrivedWaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  1-Click Notifikasi WA: &quot;Teknisi Tiba di Lokasi &amp; Siap Kerja&quot;
                </a>
              </div>
            )}

            {/* Check-in Interactive Form */}
            {canOperateField && currentStage === 3 && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Keterangan Kondisi Lapangan / Check-in:
                  </label>
                  <input
                    type="text"
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder="Contoh: Sudah sampai di lokasi bertemu Bu Dewi, siap eksekusi..."
                    className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Foto Bukti Tiba / APD K3 (Wajib):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setCheckinFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#111C44] file:text-white hover:file:bg-[#1B254B]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStepperAction("CHECKIN")}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-4 h-4" />
                  {submitting ? "Memproses Check-in..." : "Konfirmasi Tiba di Lokasi & Upload APD"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 5: PROSES PENGERJAAN (BEFORE) ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 5
                ? "bg-emerald-500 text-white shadow-sm"
                : currentStage === 4
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 5 ? <CheckCircle2 className="w-4 h-4" /> : "5"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 4 || currentStage === 5
                ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                <span>5. Pengerjaan & Foto Before (Kondisi Awal)</span>
              </h3>
              {currentStage >= 5 && (
                <span className="text-[11px] text-amber-700 font-bold">
                  Status: Dalam Pengerjaan
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Dokumentasi kondisi awal kotor/berdebu sebelum dibersihkan dan pencatatan pengerjaan.
            </p>

            {/* Before Photos Gallery */}
            {beforePhotos.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Foto Kondisi Awal (Before):</p>
                <div className="flex flex-wrap gap-2">
                  {beforePhotos.map((p) => {
                    const globalIdx = allPhotos.findIndex((item) => item.id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onOpenLightbox(globalIdx)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer group border border-slate-300 shadow-2xs hover:ring-2 hover:ring-amber-400 transition-all"
                      >
                        <img src={p.filePath} alt="Before" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-[#111C44] text-[9px] text-center font-black py-0.5">
                          Before
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Before / Progress Interactive Form */}
            {canOperateField && currentStage === 4 && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Kondisi Awal / Pengerjaan:
                  </label>
                  <textarea
                    rows={2}
                    value={beforeNotes}
                    onChange={(e) => setBeforeNotes(e.target.value)}
                    placeholder="Contoh: Sofa bernoda kopi di sisi kiri, karpet berdebu tebal..."
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Foto Before (Kondisi Awal):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setBeforeFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-[#111C44] hover:file:bg-amber-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStepperAction("PROGRESS")}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#111C44] font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {submitting ? "Menyimpan..." : "Mulai Pengerjaan & Simpan Foto Before"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 6: SELESAI PENGERJAAN (AFTER) ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage >= 6
                ? "bg-emerald-500 text-white shadow-sm"
                : currentStage === 5
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage > 6 ? <CheckCircle2 className="w-4 h-4" /> : "6"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 5 || currentStage === 6
                ? "bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" />
                <span>6. Pekerjaan Selesai & Foto After</span>
              </h3>
              {currentStage >= 6 && (
                <span className="text-[11px] text-blue-700 font-bold">
                  Status: Menunggu Validasi Owner
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Unggah foto hasil akhir bersih (*After*) dan submit pekerjaan untuk diajukan validasi ke Owner.
            </p>

            {/* After Photos Gallery */}
            {afterPhotos.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Foto Hasil Selesai (After):</p>
                <div className="flex flex-wrap gap-2">
                  {afterPhotos.map((p) => {
                    const globalIdx = allPhotos.findIndex((item) => item.id === p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => onOpenLightbox(globalIdx)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer group border border-slate-300 shadow-2xs hover:ring-2 hover:ring-amber-400 transition-all"
                      >
                        <img src={p.filePath} alt="After" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute bottom-0 inset-x-0 bg-emerald-600 text-white text-[9px] text-center font-black py-0.5">
                          After
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* After Interactive Form */}
            {canOperateField && currentStage === 5 && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Hasil Akhir:
                  </label>
                  <textarea
                    rows={2}
                    value={afterNotes}
                    onChange={(e) => setAfterNotes(e.target.value)}
                    placeholder="Contoh: Pekerjaan tuntas 100%, noda terangkat, pelanggan puas..."
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Foto After (Hasil Selesai Bersih - Wajib):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && setAfterFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleStepperAction("FINISH")}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? "Mengirim Hasil..." : "Tandai Selesai & Minta Validasi Owner"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= STEP 7: VALIDASI & APPROVAL OWNER ================= */}
        <div className="relative">
          <div
            className={`absolute -left-[31px] sm:-left-[39px] w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ring-4 ring-white ${
              currentStage === 7
                ? "bg-emerald-500 text-white ring-emerald-300 shadow-md"
                : currentStage === 6
                ? "bg-amber-500 text-[#111C44] ring-amber-300 animate-pulse"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {currentStage === 7 ? <ShieldCheck className="w-5 h-5" /> : "7"}
          </div>

          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              currentStage === 7
                ? "bg-emerald-500/10 border-emerald-300 ring-2 ring-emerald-400/20"
                : currentStage === 6
                ? "bg-amber-500/10 border-amber-300"
                : "bg-[#F4F7FE] border-slate-200/80"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-black text-[#111C44] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>7. Validasi & Approval Selesai (Owner)</span>
              </h3>
              {job.validatedAt && (
                <span className="text-[11px] text-emerald-800 font-bold">
                  Disetujui: {formatDateID(job.validatedAt)}
                </span>
              )}
            </div>

            <p className="text-xs text-[#707E94] mt-1">
              Owner memverifikasi seluruh foto dokumentasi (Tiba/APD, Before, After) dan memberikan persetujuan komisi teknisi.
            </p>

            {/* Owner Validation Action Form */}
            {(isOwner || isAdmin) && currentStage === 6 && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-amber-300 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Verifikasi foto evidence di atas sebelum menyetujui komisi sebesar{" "}
                    <strong>{formatRupiah(job.technicianCommission || 0)}</strong> untuk{" "}
                    <strong>{job.technicianName}</strong>.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleStepperAction("VALIDATE")}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {submitting ? "Memvalidasi..." : "Validasi & Selesai (Setujui Komisi Teknisi)"}
                </button>
              </div>
            )}

            {/* Order Selesai Completed State & Commission Payout Section */}
            {currentStage === 7 && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-emerald-200 space-y-4">
                <div className="flex items-center gap-2 text-xs text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Pekerjaan telah 100% tervalidasi dan selesai.
                  </span>
                </div>

                {/* Day-to-Day Commission Card */}
                {job.technicianCommission > 0 && (
                  <div
                    className={`p-4 rounded-2xl border ${
                      job.commissionStatus === "PAID"
                        ? "bg-emerald-50/80 border-emerald-300"
                        : "bg-amber-50/80 border-amber-300"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Banknote
                            className={`w-5 h-5 ${
                              job.commissionStatus === "PAID"
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Komisi Teknisi (Day-to-Day):{" "}
                            <span className="text-sm font-black text-[#111C44]">
                              {formatRupiah(job.technicianCommission)}
                            </span>
                          </h4>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Teknisi Bertugas: <strong>{job.technicianName}</strong>
                        </p>
                        {job.commissionStatus === "PAID" ? (
                          <div className="mt-1.5 text-[11px] text-emerald-800 font-medium">
                            <span className="font-bold">✅ Sudah Ditransfer</span> via{" "}
                            <strong>{job.commissionPaymentMethod || "Transfer Bank"}</strong>{" "}
                            pada{" "}
                            <strong>
                              {job.commissionPaidAt ? formatDateID(job.commissionPaidAt) : "-"}
                            </strong>
                            {job.commissionNotes && (
                              <span className="block text-slate-500 italic mt-0.5">
                                Catatan: {job.commissionNotes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-1.5 text-[11px] text-amber-800 font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Menunggu Transfer Owner / Finance</span>
                          </div>
                        )}
                      </div>

                      {/* Commission Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {job.commissionStatus === "PAID" ? (
                          <>
                            <a
                              href={`/payroll/print?jobId=${job.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111C44] hover:bg-[#1B254B] text-white font-bold text-xs shadow-xs transition-all"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              Cetak Slip Komisi (A4)
                            </a>

                            {job.commissionProofPath && (
                              <a
                                href={job.commissionProofPath}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all shadow-2xs"
                              >
                                <Camera className="w-3.5 h-3.5 text-amber-500" />
                                <span>Bukti Transfer</span>
                              </a>
                            )}

                            {job.assignedTo?.phone && (
                              <a
                                href={commissionPaidWaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                              >
                                <MessageCircle className="w-4 h-4" />
                                Kirim Bukti WA ke Teknisi
                              </a>
                            )}
                          </>
                        ) : (
                          (isOwner || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => setIsPayoutModalOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#111C44] font-black text-xs shadow-horizon-glow transition-all"
                            >
                              <Banknote className="w-4 h-4" />
                              Transfer Komisi Sekarang
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap gap-2">
                  <a
                    href={doneWaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Kirim Bukti Selesai &amp; Nota via WhatsApp ke Pelanggan
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transfer Komisi Modal (Portalled to Document Body) */}
      {isPayoutModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0B1437]/80 backdrop-blur-sm animate-fade-in">
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
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCommissionPayout} className="p-5 space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
                  <div className="flex justify-between items-center text-slate-700 mb-1">
                    <span>Teknisi Bertugas:</span>
                    <span className="font-bold text-[#111C44]">{job.technicianName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700 mb-1">
                    <span>Order:</span>
                    <span className="font-mono font-bold">{job.jobNumber}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-amber-200">
                    <span className="font-bold text-slate-900">Nominal Komisi:</span>
                    <span className="font-black text-base text-amber-800">
                      {formatRupiah(job.technicianCommission)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Metode Pembayaran / Bank:
                  </label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
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
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
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
                        setPayoutProofFile(file);
                        setPayoutProofPreview(URL.createObjectURL(file));
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#111C44] file:text-white hover:file:bg-[#1B254B]"
                  />
                  {payoutProofPreview && (
                    <div className="mt-2.5 relative w-24 h-20 rounded-xl overflow-hidden border border-slate-300 shadow-2xs">
                      <img src={payoutProofPreview} alt="Bukti Transfer" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setPayoutProofFile(null);
                          setPayoutProofPreview(null);
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
                    onClick={() => setIsPayoutModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={payoutSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-black shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {payoutSubmitting ? "Memproses..." : "Konfirmasi Transfer"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

