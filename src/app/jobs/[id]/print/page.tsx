"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import PrintableInvoice from "@/components/jobs/PrintableInvoice";
import { JobData } from "@/types";

function JobPrintContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        setLoading(true);
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error("Pekerjaan tidak ditemukan");
        }
        const data = await res.json();
        setJob(data.job);
      } catch (err: any) {
        setError(err.message || "Gagal memuat dokumen");
      } finally {
        setLoading(false);
      }
    }

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  // Auto trigger print dialog if ?auto=true
  useEffect(() => {
    if (job && !loading && searchParams.get("auto") === "true") {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [job, loading, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Menyiapkan Dokumen Nota / SPK...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
          <p className="text-red-600 font-bold mb-2">Terjadi Kesalahan</p>
          <p className="text-xs text-slate-500 mb-4">{error || "Data tidak ditemukan"}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-[#111C44] text-white rounded-xl text-xs font-bold"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    try {
      if (typeof window !== "undefined" && window.opener) {
        window.close();
      }
    } catch {}
    router.push(`/jobs/${job.id}`);
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 sm:py-10 print:py-0 print:bg-white print:m-0 print:p-0">
      {/* Floating Action Toolbar (Hidden during print) */}
      <div className="no-print max-w-3xl mx-auto mb-6 px-4">
        <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200/80 flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Detail</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5" /> Siap Cetak A4
            </span>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#111C44] to-[#1E293B] hover:from-[#1E293B] hover:to-[#111C44] text-white font-bold text-xs shadow-md transition-all active:scale-98"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak Sekarang (PDF / Kertas)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pure A4 Paper Document Canvas */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-2xl rounded-2xl border border-slate-200/80 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        <PrintableInvoice job={job} />
      </div>
    </div>
  );
}

export default function JobPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-500">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-semibold">Menyiapkan Dokumen Nota / SPK...</p>
        </div>
      }
    >
      <JobPrintContent />
    </Suspense>
  );
}
