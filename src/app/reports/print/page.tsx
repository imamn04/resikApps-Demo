"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import PrintableReport from "@/components/reports/PrintableReport";
import { exportReportPDF } from "@/lib/reportPdfGenerator";

function ReportPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const autoPrint = searchParams.get("auto") === "true";

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);

        const res = await fetch(`/api/reports?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data laporan");
        const data = await res.json();
        setReportData(data);
      } catch (err: any) {
        setError(err.message || "Gagal memuat laporan");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    if (!loading && reportData && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, reportData, autoPrint]);

  const handleDownloadVectorPdf = async () => {
    if (!reportData) return;
    setDownloadingPdf(true);
    try {
      await exportReportPDF(reportData, startDate, endDate);
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold">Menyiapkan Lembar Laporan A4 Resmi...</p>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-slate-600">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm">
          <p className="text-red-600 font-bold mb-2">Terjadi Kesalahan</p>
          <p className="text-xs text-slate-500 mb-4">{error || "Data laporan tidak ditemukan"}</p>
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
    router.push("/reports");
  };

  return (
    <div className="min-h-screen bg-slate-100/90 py-6 sm:py-10 print:py-0 print:bg-white print:m-0 print:p-0">
      {/* Floating Action Toolbar (Hidden during browser print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 px-4">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Laporan</span>
            </button>
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Dokumen A4 Laporan Resmi Resik Purwokerto</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadVectorPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111C44] text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-amber-500" />
              <span>{downloadingPdf ? "Mengunduh..." : "Download File PDF (.pdf)"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#111C44] hover:bg-[#1B254B] text-amber-400 text-xs font-black transition-all shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main A4 Printable Paper */}
      <main className="max-w-[210mm] mx-auto bg-white shadow-xl rounded-xl print:shadow-none print:rounded-none overflow-hidden">
        <PrintableReport
          reportData={reportData}
          startDate={startDate}
          endDate={endDate}
        />
      </main>
    </div>
  );
}

export default function ReportPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReportPrintContent />
    </Suspense>
  );
}
