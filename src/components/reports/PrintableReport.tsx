"use client";

import React from "react";
import { formatRupiah, formatDateID } from "@/lib/utils";
import { Sparkles, UserCheck, Wallet, ShieldCheck, CheckCircle2 } from "lucide-react";

interface PrintableReportProps {
  reportData: any;
  startDate?: string;
  endDate?: string;
}

export default function PrintableReport({
  reportData,
  startDate,
  endDate,
}: PrintableReportProps) {
  if (!reportData) return null;

  const now = new Date();
  const printTimestamp = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  let periodLabel = "Semua Periode Data";
  if (startDate && endDate) {
    if (startDate === endDate) {
      periodLabel = formatDateID(startDate);
    } else {
      periodLabel = `${formatDateID(startDate)} s/d ${formatDateID(endDate)}`;
    }
  } else if (startDate) {
    periodLabel = `Mulai: ${formatDateID(startDate)}`;
  } else if (endDate) {
    periodLabel = `Sampai: ${formatDateID(endDate)}`;
  }

  const fin = reportData.financialSummary;
  const grossRev = fin?.grossRevenue ?? reportData.metrics?.totalRevenue ?? 0;
  const commTotal = fin?.technicianCommissions ?? 0;
  const expTotal = fin?.operationalExpenses ?? 0;
  const netProf = fin?.netProfit ?? grossRev - commTotal - expTotal;
  const netMarg = fin?.netMargin ?? (grossRev > 0 ? (netProf / grossRev) * 100 : 0);

  const totalServiceJobs = (reportData.serviceStats || []).reduce(
    (acc: number, curr: any) => acc + (curr.jobCount || 0),
    0
  );
  const totalServiceRev = (reportData.serviceStats || []).reduce(
    (acc: number, curr: any) => acc + (curr.revenue || 0),
    0
  );

  const totalTechCompleted = (reportData.technicianStats || []).reduce(
    (acc: number, curr: any) => acc + (curr.completedCount || 0),
    0
  );
  const totalTechRevenue = (reportData.technicianStats || []).reduce(
    (acc: number, curr: any) => acc + (curr.revenue || 0),
    0
  );

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-8 font-sans print:p-0 print:max-w-none text-[12px] leading-relaxed">
      {/* Top Gold Accent Ribbon */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#111C44] via-amber-500 to-[#111C44] rounded-t-sm mb-5" />

      {/* Corporate Letterhead / Kop Surat */}
      <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900/80 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#111C44] text-amber-400 flex items-center justify-center font-black text-xl shrink-0 shadow-sm border border-amber-400/40 print:border-slate-800">
            RP
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[#111C44]">
              RESIK PURWOKERTO
            </h1>
            <p className="text-[11px] font-semibold text-slate-600">
              Jasa Kebersihan, Cuci Kasur/Sofa & Layanan Lapangan Profesional
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Purwokerto, Kab. Banyumas &bull; WA: 0812-3456-7890 &bull; resikpurwokerto.com
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-block px-3 py-1 rounded bg-[#111C44] text-amber-400 font-black text-[11px] tracking-wider uppercase shadow-xs">
            LAPORAN REKAPITULASI RESMI
          </span>
          <p className="font-semibold text-xs text-slate-800 mt-1.5">
            Periode: <span className="font-bold">{periodLabel}</span>
          </p>
          <p className="text-[10px] text-slate-500">Dicetak: {printTimestamp}</p>
        </div>
      </div>

      {/* Executive Financial Highlights (A4 Print Styled Card) */}
      <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white print:bg-[#111C44] border border-slate-800">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="border-r border-slate-700/60 pr-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400">
              Total Omzet Kotor
            </p>
            <p className="text-base font-black text-white mt-0.5">
              {formatRupiah(grossRev)}
            </p>
            <p className="text-[9px] text-slate-300">
              {reportData.metrics?.completedJobs || 0} Job Selesai
            </p>
          </div>

          <div className="border-r border-slate-700/60 pr-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-200">
              Beban Komisi Teknisi
            </p>
            <p className="text-base font-black text-amber-300 mt-0.5">
              {formatRupiah(commTotal)}
            </p>
            <p className="text-[9px] text-slate-300">
              Alokasi: {fin?.commissionMargin ?? 0}%
            </p>
          </div>

          <div className="border-r border-slate-700/60 pr-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-rose-300">
              Biaya Operasional
            </p>
            <p className="text-base font-black text-rose-300 mt-0.5">
              {formatRupiah(expTotal)}
            </p>
            <p className="text-[9px] text-slate-300">
              Alokasi: {fin?.expenseMargin ?? 0}%
            </p>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
              Laba Bersih (Net Profit)
            </p>
            <p className="text-base font-black text-emerald-400 mt-0.5">
              {formatRupiah(netProf)}
            </p>
            <p className="text-[9px] font-bold text-emerald-300">
              Margin: {Math.round(netMarg * 10) / 10}%
            </p>
          </div>
        </div>
      </div>

      {/* 1. Tabel Rekapitulasi Berdasarkan Jenis Layanan */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-[#111C44] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          1. Rekapitulasi Berdasarkan Jenis Layanan
        </h2>
        <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-[#111C44] text-white font-bold text-[10px] uppercase">
              <th className="py-1.5 px-2 border border-slate-300 w-10 text-center">No.</th>
              <th className="py-1.5 px-2 border border-slate-300">Nama Layanan</th>
              <th className="py-1.5 px-2 border border-slate-300 w-36">Kategori</th>
              <th className="py-1.5 px-2 border border-slate-300 w-24 text-center">Order</th>
              <th className="py-1.5 px-2 border border-slate-300 w-32 text-right">Omzet</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {reportData.serviceStats?.map((s: any, idx: number) => (
              <tr key={s.id || idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                <td className="py-1.5 px-2 border border-slate-200 text-center text-slate-500">
                  {idx + 1}
                </td>
                <td className="py-1.5 px-2 border border-slate-200 font-bold text-slate-900">
                  {s.name}
                </td>
                <td className="py-1.5 px-2 border border-slate-200 text-slate-600">
                  {s.category}
                </td>
                <td className="py-1.5 px-2 border border-slate-200 text-center font-semibold text-slate-800">
                  {s.jobCount} Job
                </td>
                <td className="py-1.5 px-2 border border-slate-200 text-right font-bold text-slate-900">
                  {formatRupiah(s.revenue)}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-black text-slate-900">
              <td colSpan={3} className="py-1.5 px-2 border border-slate-300 text-right uppercase">
                Total
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">
                {totalServiceJobs} Job
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-right">
                {formatRupiah(totalServiceRev)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Tabel Rekapitulasi Kinerja Teknisi */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-[#111C44] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          2. Rekapitulasi Kinerja Teknisi / Tim Lapangan
        </h2>
        <table className="w-full text-left text-[11px] border-collapse border border-slate-300">
          <thead>
            <tr className="bg-[#111C44] text-white font-bold text-[10px] uppercase">
              <th className="py-1.5 px-2 border border-slate-300 w-10 text-center">No.</th>
              <th className="py-1.5 px-2 border border-slate-300">Nama Petugas / Tim</th>
              <th className="py-1.5 px-2 border border-slate-300 w-28 text-center">Job Ditugaskan</th>
              <th className="py-1.5 px-2 border border-slate-300 w-28 text-center">Tuntas (Selesai)</th>
              <th className="py-1.5 px-2 border border-slate-300 w-32 text-right">Omzet Dituntaskan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {reportData.technicianStats?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400">
                  Belum ada data penugasan teknisi.
                </td>
              </tr>
            ) : (
              reportData.technicianStats?.map((t: any, idx: number) => (
                <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50" : "bg-white"}>
                  <td className="py-1.5 px-2 border border-slate-200 text-center text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 font-bold text-slate-900">
                    {t.name}
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 text-center text-slate-700">
                    {t.jobCount} Job
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 text-center font-bold text-emerald-700">
                    {t.completedCount} Job
                  </td>
                  <td className="py-1.5 px-2 border border-slate-200 text-right font-bold text-slate-900">
                    {formatRupiah(t.revenue)}
                  </td>
                </tr>
              ))
            )}
            <tr className="bg-slate-100 font-black text-slate-900">
              <td colSpan={3} className="py-1.5 px-2 border border-slate-300 text-right uppercase">
                Total
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">
                {totalTechCompleted} Job
              </td>
              <td className="py-1.5 px-2 border border-slate-300 text-right">
                {formatRupiah(totalTechRevenue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature Section / Kolom Tanda Tangan */}
      <div className="grid grid-cols-2 gap-8 pt-4 mt-8 border-t border-slate-300 text-[11px]">
        <div>
          <p className="text-slate-600">Disiapkan Oleh:</p>
          <p className="font-bold text-[#111C44] mt-0.5">Admin Operasional</p>
          <div className="h-16 border-b border-dashed border-slate-300 w-44 mt-2" />
          <p className="text-slate-500 text-[10px] mt-1.5">
            ( Staf Administrasi & Rekap )
          </p>
          <p className="text-slate-400 text-[9px]">Tgl Cetak: {printTimestamp}</p>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="text-slate-600">Mengetahui & Menyetujui:</p>
          <p className="font-bold text-[#111C44] mt-0.5">Owner Resik Purwokerto</p>
          <div className="h-16 border-b border-dashed border-slate-300 w-44 mt-2 flex items-center justify-center">
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              TERVERIFIKASI SISTEM
            </span>
          </div>
          <p className="font-bold text-[#111C44] text-[10px] mt-1.5">
            ( Owner Resik Purwokerto )
          </p>
          <p className="text-emerald-600 text-[9px] font-medium">Digital Verification Valid</p>
        </div>
      </div>

      {/* Footer watermark & security note */}
      <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400">
        Resik Purwokerto &bull; Dokumen Resmi Sistem Operasional v2.0 &bull; Halaman Resmi Tercetak
      </div>
    </div>
  );
}
