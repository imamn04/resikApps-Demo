"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID, getWhatsAppLink } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  MapPin,
  Camera,
  Upload,
  Trash2,
  Printer,
  CheckCircle2,
  Clock3,
  PlayCircle,
  XCircle,
  MessageCircle,
  FileText,
  History,
  AlertCircle,
  Sparkles,
  DollarSign,
  Tag,
  ExternalLink,
  X,
} from "lucide-react";
import { JobData, AuthUser } from "@/types";
import JobStepperTimeline from "@/components/jobs/JobStepperTimeline";
import PhotoLightboxModal from "@/components/ui/PhotoLightboxModal";
import PrintableInvoice from "@/components/jobs/PrintableInvoice";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState<"CHECKIN" | "BEFORE" | "AFTER">("BEFORE");
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Lightbox state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Invoice Preview Modal state
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll and hide mobile bottom bar when modal is active
  useEffect(() => {
    if (isInvoiceModalOpen || isLightboxOpen) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [isInvoiceModalOpen, isLightboxOpen]);

  // Isolated Iframe Print Engine (Zero layout capture, 100% clean A4 PDF)
  const handlePrintInvoice = () => {
    setIsPrinting(true);
    const iframeId = "resik-isolated-print-iframe";
    let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      iframe.remove();
    }
    iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    iframe.src = `/jobs/${jobId}/print?auto=true`;
    document.body.appendChild(iframe);

    setTimeout(() => {
      setIsPrinting(false);
    }, 2500);
  };

  // Fetch Current User & Job
  const fetchJobData = async () => {
    try {
      const [uRes, jRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/jobs/${jobId}`),
      ]);

      if (uRes.ok) {
        const uJson = await uRes.json();
        setCurrentUser(uJson.user);

        if (["OWNER", "ADMIN"].includes(uJson.user.role)) {
          fetch("/api/users")
            .then((r) => r.json())
            .then((data) => {
              if (data.users) {
                setTechnicians(data.users.filter((u: any) => u.role === "STAFF_INPUT" || u.role === "ADMIN"));
              }
            })
            .catch(() => {});
        }
      }

      if (jRes.ok) {
        const jJson = await jRes.json();
        setJob(jJson.job);
      } else {
        router.replace("/jobs");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [jobId]);

  // Handle Photo File Select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Upload Photo
  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("photoType", photoType);
    formData.append("caption", caption);

    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatusMessage("Foto dokumentasi berhasil diunggah!");
        setSelectedFile(null);
        setPreviewUrl(null);
        setCaption("");
        fetchJobData();
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const json = await res.json();
        alert(json.error || "Gagal mengunggah foto");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    } finally {
      setUploading(false);
    }
  };

  // Delete Photo
  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Hapus foto dokumentasi ini?")) return;

    try {
      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (res.ok) {
        fetchJobData();
      } else {
        alert("Gagal menghapus foto");
      }
    } catch {
      alert("Terjadi kesalahan");
    }
  };

  // Update Status
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatusMessage(`Status pekerjaan diperbarui menjadi: ${newStatus}`);
        fetchJobData();
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        const json = await res.json();
        alert(json.error || "Gagal mengubah status");
      }
    } catch {
      alert("Terjadi kesalahan");
    }
  };

  if (loading || !job) {
    return (
      <AppLayout>
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Memuat rincian pekerjaan...</p>
        </div>
      </AppLayout>
    );
  }

  const checkinPhotos = job.photos?.filter((p) => p.photoType === "CHECKIN") || [];
  const beforePhotos = job.photos?.filter((p) => p.photoType === "BEFORE") || [];
  const afterPhotos = job.photos?.filter((p) => p.photoType === "AFTER") || [];
  const waUrl = getWhatsAppLink(
    job.customer.phone,
    `Halo ${job.customer.name}, ini dari Resik Purwokerto terkait pekerjaan ${job.service.name} (${job.jobNumber}).`
  );

  return (
    <AppLayout>
      {/* Web Screen UI Container (Strictly Hidden on Print) */}
      <div className="no-print space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/jobs"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                  {job.jobNumber}
                </h1>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dibuat pada {formatDateID(job.createdAt)} oleh {job.createdBy.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chat WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all shadow-xs"
            >
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Cetak Nota / SPK</span>
            </button>
          </div>
        </div>

      {statusMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Vertical Interactive Stepper Timeline (ICRM Teknisi) */}
      <div className="no-print">
        <JobStepperTimeline
          job={job}
          currentUser={currentUser}
          onRefresh={fetchJobData}
          onOpenLightbox={(idx) => {
            setLightboxIndex(idx);
            setIsLightboxOpen(true);
          }}
          technicians={technicians}
        />
      </div>

      {/* Main Grid: Details & Customer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Job Information */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
              <span>Rincian Pekerjaan</span>
              <span className="text-xs bg-blue-50 text-blue-800 font-semibold px-2 py-0.5 rounded-lg border border-blue-200">
                {job.service.name}
              </span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-medium">Jadwal Tanggal</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {formatDateID(job.scheduledDate)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Waktu / Jam</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {job.scheduledTime ? `${job.scheduledTime} WIB` : "-"}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Teknisi / Petugas Bertugas</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {job.technicianName || "Belum Ditentukan"}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-medium">Penginput Data</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {job.createdBy.name} (@{job.createdBy.username})
                </p>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <p className="text-slate-400 font-medium mb-1">Spesifikasi / Detail Pekerjaan:</p>
                <div className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium">
                  {job.jobDetails || "Tidak ada detail tambahan"}
                </div>
              </div>

              {job.notes && (
                <div className="sm:col-span-2">
                  <p className="text-slate-400 font-medium mb-1">Catatan Khusus:</p>
                  <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-amber-900 font-medium">
                    {job.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card: Photo Documentation Module */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  Dokumentasi Foto Pekerjaan
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Foto kondisi sebelum (*Before*) dan sesudah (*After*) pengerjaan
                </p>
              </div>

              <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full">
                {(job.photos?.length || 0)} Foto
              </span>
            </div>

            {/* Upload Form Box */}
            <form onSubmit={handleUploadPhoto} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
              <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
                Upload Foto Baru
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                {/* Type Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipe Foto *
                  </label>
                  <select
                    value={photoType}
                    onChange={(e) => setPhotoType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="CHECKIN">🛡️ CHECK-IN & APD K3</option>
                    <option value="BEFORE">📸 SEBELUM (BEFORE)</option>
                    <option value="AFTER">✨ SESUDAH (AFTER)</option>
                  </select>
                </div>

                {/* File Input */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Pilih File Foto / Kamera HP *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Keterangan foto (contoh: Noda di sofa sebelum treatment)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                />

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs shadow-horizon-glow transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#111C44] border-t-transparent rounded-full animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-[#111C44]" />
                      <span>Simpan Foto</span>
                    </>
                  )}
                </button>
              </div>

              {previewUrl && (
                <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 inline-block">
                  <p className="text-[10px] text-slate-400 mb-1">Pratinjau:</p>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                </div>
              )}
            </form>

            {/* Photos Gallery */}
            <div className="space-y-6">
              {/* Check-in Section */}
              <div>
                <h3 className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 inline-block mb-3">
                  Foto Bukti Tiba & APD K3 — {checkinPhotos.length}
                </h3>
                {checkinPhotos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada foto check-in / APD.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {checkinPhotos.map((p) => {
                      const globalIdx = (job.photos || []).findIndex((item) => item.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(globalIdx >= 0 ? globalIdx : 0);
                            setIsLightboxOpen(true);
                          }}
                        >
                          <img
                            src={p.filePath}
                            alt={p.caption || "Check-in"}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="p-2 bg-white">
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              {p.caption || "Check-in & APD"}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span>{new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                              {currentUser?.role === "OWNER" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(p.id);
                                  }}
                                  className="text-rose-500 hover:text-rose-700"
                                  title="Hapus Foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Before Section */}
              <div>
                <h3 className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 inline-block mb-3">
                  Foto Sebelum (Before) — {beforePhotos.length}
                </h3>
                {beforePhotos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada foto sebelum pekerjaan.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {beforePhotos.map((p) => {
                      const globalIdx = (job.photos || []).findIndex((item) => item.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(globalIdx >= 0 ? globalIdx : 0);
                            setIsLightboxOpen(true);
                          }}
                        >
                          <img
                            src={p.filePath}
                            alt={p.caption || "Before"}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="p-2 bg-white">
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              {p.caption || "Dokumentasi Sebelum"}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span>{new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                              {currentUser?.role === "OWNER" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(p.id);
                                  }}
                                  className="text-rose-500 hover:text-rose-700"
                                  title="Hapus Foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* After Section */}
              <div>
                <h3 className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block mb-3">
                  Foto Sesudah (After) — {afterPhotos.length}
                </h3>
                {afterPhotos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Belum ada foto sesudah pekerjaan.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {afterPhotos.map((p) => {
                      const globalIdx = (job.photos || []).findIndex((item) => item.id === p.id);
                      return (
                        <div
                          key={p.id}
                          className="group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(globalIdx >= 0 ? globalIdx : 0);
                            setIsLightboxOpen(true);
                          }}
                        >
                          <img
                            src={p.filePath}
                            alt={p.caption || "After"}
                            className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="p-2 bg-white">
                            <p className="text-[11px] font-semibold text-slate-800 truncate">
                              {p.caption || "Dokumentasi Selesai"}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                              <span>{new Date(p.createdAt).toLocaleDateString("id-ID")}</span>
                              {currentUser?.role === "OWNER" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(p.id);
                                  }}
                                  className="text-rose-500 hover:text-rose-700"
                                  title="Hapus Foto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Card & Billing */}
        <div className="space-y-6">
          {/* Card: Customer Info */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 mb-3">
              Informasi Pelanggan
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-400">Nama Pelanggan</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {job.customer.name}
                </p>
              </div>

              <div>
                <p className="text-slate-400">Nomor WhatsApp</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="font-mono font-bold text-slate-800">
                    {job.customer.phone}
                  </span>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Kirim WA
                  </a>
                </div>
              </div>

              <div>
                <p className="text-slate-400">Alamat Pengerjaan</p>
                <p className="font-medium text-slate-800 mt-0.5 leading-relaxed">
                  {job.customer.address || "-"}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Total Riwayat Order:</span>
                <span className="font-bold text-blue-900">
                  {job.customer.totalOrders} Kali
                </span>
              </div>
            </div>
          </div>

          {/* Card: Financial & Billing Summary */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-[#0B1437] via-[#111C44] to-[#1B254B] text-white shadow-horizon-navy">
            <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest pb-3 border-b border-white/10 mb-4">
              Rincian Biaya & Tagihan
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Harga Layanan:</span>
                <span className="font-bold text-white">
                  {formatRupiah(job.basePrice)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span>Biaya Tambahan:</span>
                <span className="font-bold text-white">
                  {formatRupiah(job.extraFee)}
                </span>
              </div>

              {job.discount > 0 && (
                <div className="flex items-center justify-between text-rose-400">
                  <span>Diskon:</span>
                  <span className="font-bold">
                    -{formatRupiah(job.discount)}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-200">Total Tagihan:</span>
                <span className="font-black text-amber-400 text-lg">
                  {formatRupiah(job.totalPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* 100% Isolated Printable Invoice for Print / PDF Generation */}
      <div className="hidden print-only">
        <PrintableInvoice job={job} />
      </div>

      {/* Invoice Preview & Print Modal (Portalled to Document Body to Escape All Stacking Contexts) */}
      {mounted &&
        isInvoiceModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-[#0B1437]/80 backdrop-blur-md no-print animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header Toolbar */}
              <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-[#111C44] via-[#1B254B] to-[#1E293B] text-white flex items-center justify-between shrink-0 gap-3 border-b border-white/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold truncate text-white">Pratinjau Nota / SPK Resmi</h3>
                    <p className="text-[10px] text-slate-300 hidden sm:block">Format A4 resmi terverifikasi sistem</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/jobs/${job.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    title="Buka dokumen di tab khusus untuk cetak/unduh PDF"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline sm:inline">Tab Khusus</span>
                  </a>

                  <button
                    onClick={handlePrintInvoice}
                    disabled={isPrinting}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#111C44] font-black text-xs shadow-horizon-glow transition-all active:scale-95 whitespace-nowrap disabled:opacity-75"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{isPrinting ? "Menyiapkan Dokumen..." : "Cetak Sekarang (PDF)"}</span>
                  </button>

                  <button
                    onClick={() => setIsInvoiceModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-0.5"
                    aria-label="Tutup pratinjau"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Realistic Paper Sheet Preview with Balanced Spacing */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 bg-slate-100/90 flex justify-center">
                <div className="w-full max-w-[210mm] bg-white shadow-xl rounded-2xl border border-slate-200/90 overflow-hidden">
                  <PrintableInvoice job={job} />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Full HD Photo Lightbox Modal */}
      <PhotoLightboxModal
        photos={job.photos || []}
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </AppLayout>
  );
}

