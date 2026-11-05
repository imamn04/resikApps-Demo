import React from "react";
import { JobData } from "@/types";
import { formatDateID, formatRupiah } from "@/lib/utils";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

interface PrintableInvoiceProps {
  job: JobData;
}

export default function PrintableInvoice({ job }: PrintableInvoiceProps) {
  return (
    <div
      id="printable-invoice"
      className="w-full max-w-[210mm] mx-auto p-4 sm:p-6 md:p-8 print:p-0 text-slate-900 bg-white font-sans text-xs leading-normal select-none"
      style={{
        boxSizing: "border-box",
      }}
    >
      {/* Top Accent Ribbon (Corporate Midnight Navy & Sunflower Gold) */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#111C44] via-amber-400 to-[#111C44] rounded-t-sm mb-4 print:mb-3" />

      {/* 1. Header Kop Surat Resmi (Compact & Balanced) */}
      <div className="border-b border-slate-300 pb-3.5 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:flex-row print:items-start">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#111C44] text-amber-400 font-black text-xl flex items-center justify-center border-2 border-amber-400 shrink-0 shadow-xs">
            RP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#111C44] leading-none">
                RESIK PURWOKERTO
              </h1>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> Resmi
              </span>
            </div>
            <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
              Jasa Kebersihan, Cuci Kasur/Sofa & Layanan Lapangan
            </p>
            <p className="text-[9px] text-slate-500 mt-0.5">
              Purwokerto, Banyumas &bull; WA: 0812-3456-7890 &bull; order@resikpurwokerto.com
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right print:text-right shrink-0 w-full sm:w-auto">
          <span className="inline-block text-[9px] font-black uppercase tracking-wider bg-[#111C44] text-white px-2.5 py-0.5 rounded shadow-xs mb-1">
            SURAT PERINTAH KERJA / NOTA
          </span>
          <p className="text-base font-mono font-black text-slate-900 tracking-tight leading-tight">
            {job.jobNumber}
          </p>
          <p className="text-[9px] text-slate-500">
            Dicetak: {formatDateID(new Date())}
          </p>
        </div>
      </div>

      {/* 2. Dua Kolom Informasi: Pelanggan vs Penugasan (Compact Rhythm) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 mb-4">
        {/* Kolom Pelanggan */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            DITAGIHKAN KEPADA (PELANGGAN):
          </p>
          <p className="text-xs font-black text-slate-900">{job.customer.name}</p>
          <p className="font-mono text-slate-700 text-[11px] mt-0.5">{job.customer.phone}</p>
          <p className="text-slate-600 text-[10px] mt-1 leading-snug line-clamp-2">
            {job.customer.address || "Alamat tercatat di sistem operasional"}
          </p>
        </div>

        {/* Kolom Penugasan */}
        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            INFORMASI PELAKSANAAN TUGAS:
          </p>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Jadwal Tanggal:</span>
              <strong className="text-slate-900">{formatDateID(job.scheduledDate)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jam Layanan:</span>
              <strong className="text-slate-900">{job.scheduledTime ? `${job.scheduledTime} WIB` : "-"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Petugas / Tim:</span>
              <strong className="text-[#111C44]">{job.technicianName || "Tim Lapangan RP"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pengerjaan:</span>
              <span className="font-black uppercase text-slate-800 text-[9px] px-1.5 py-0.2 rounded bg-slate-200">
                {job.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tabel Itemized Layanan & Rincian */}
      <div className="mb-4 rounded-xl overflow-x-auto print:overflow-visible border border-slate-300">
        <table className="w-full text-left border-collapse min-w-[320px]">
          <thead className="bg-[#111C44] text-white text-[9px] font-black uppercase tracking-wider">
            <tr>
              <th className="py-2 px-3 w-8 text-center">No</th>
              <th className="py-2 px-3">Deskripsi Layanan & Spesifikasi</th>
              <th className="py-2 px-3 text-right w-28 sm:w-32">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            <tr>
              <td className="py-2 px-3 text-center font-bold text-slate-500">1</td>
              <td className="py-2 px-3">
                <p className="font-black text-slate-900 text-xs">{job.service.name}</p>
                <p className="text-[10px] text-slate-600 leading-snug">
                  {job.jobDetails || "Pengerjaan sesuai standar SOP kualitas dan higienitas Resik Purwokerto."}
                </p>
              </td>
              <td className="py-2 px-3 text-right font-bold text-slate-900">
                {formatRupiah(job.basePrice)}
              </td>
            </tr>

            {job.extraFee > 0 && (
              <tr className="bg-slate-50/50">
                <td className="py-1.5 px-3 text-center font-bold text-slate-500">2</td>
                <td className="py-1.5 px-3 text-[11px] text-slate-700">
                  Biaya Tambahan / Transportasi Lapangan
                </td>
                <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                  {formatRupiah(job.extraFee)}
                </td>
              </tr>
            )}

            {job.discount > 0 && (
              <tr className="bg-rose-50/40">
                <td className="py-1.5 px-3 text-center font-bold text-rose-600">
                  {job.extraFee > 0 ? "3" : "2"}
                </td>
                <td className="py-1.5 px-3 text-[11px] text-rose-700 font-semibold">
                  Potongan Diskon Promo Pelanggan
                </td>
                <td className="py-1.5 px-3 text-right font-black text-rose-600">
                  -{formatRupiah(job.discount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Total Ringkasan Finansial (Sleek Right-Aligned Box) */}
      <div className="flex justify-end mb-4">
        <div className="w-full sm:w-72 print:w-72 p-3 rounded-xl border border-slate-300 bg-slate-50/70 space-y-1 text-xs">
          <div className="flex justify-between text-slate-600 text-[11px]">
            <span>Subtotal Layanan:</span>
            <span className="font-bold text-slate-900">
              {formatRupiah(job.basePrice + (job.extraFee || 0))}
            </span>
          </div>

          {job.discount > 0 && (
            <div className="flex justify-between text-rose-600 text-[11px]">
              <span>Potongan Diskon:</span>
              <span className="font-bold">-{formatRupiah(job.discount)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs font-black text-[#111C44] border-t border-slate-300 pt-1.5 mt-0.5">
            <span>TOTAL PEMBAYARAN:</span>
            <span className="text-sm font-black text-[#111C44]">
              {formatRupiah(job.totalPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Catatan & Kebijakan Garansi Ringkas */}
      <div className="mb-4 p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[10px] text-amber-950 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="leading-snug">
          <strong>Garansi Layanan 1x24 Jam:</strong> Harap simpan dokumen ini sebagai bukti transaksi resmi. Pembayaran sah setelah diterima petugas lapangan atau via rekening resmi perusahaan.
        </span>
      </div>

      {/* 6. Legalitas, QR Verifier, & Dual Signature (Compact Spacing) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-4 items-end pt-3 border-t border-slate-200">
        <div>
          <div className="w-20 h-20 bg-slate-50 border border-slate-300 rounded-xl flex flex-col items-center justify-center p-1 text-center shadow-2xs">
            <span className="text-[8px] font-black text-[#111C44] tracking-wider">RP-VERIFIED</span>
            <div className="w-7 h-7 my-0.5 bg-[#111C44] text-white flex items-center justify-center text-[8px] font-mono rounded">
              QR
            </div>
            <span className="font-mono text-[7px] text-slate-600 truncate max-w-full">
              {job.jobNumber}
            </span>
          </div>
          <p className="text-[8px] text-slate-400 mt-1 leading-tight">
            Dokumen sah terverifikasi elektronik Resik Purwokerto.
          </p>
        </div>

        <div className="text-left sm:text-center print:text-center">
          <p className="text-[10px] font-bold text-slate-600 mb-8 sm:mb-10">Penerima Layanan / Pelanggan,</p>
          <p className="border-t border-slate-400 inline-block px-4 sm:px-6 font-extrabold text-slate-900 text-xs">
            {job.customer.name}
          </p>
        </div>

        <div className="text-left sm:text-center print:text-center">
          <p className="text-[10px] font-bold text-slate-600 mb-8 sm:mb-10">Petugas / Manajemen Lapangan,</p>
          <p className="border-t border-slate-400 inline-block px-4 sm:px-6 font-extrabold text-slate-900 text-xs">
            {job.technicianName || job.createdBy.name || "Resik Purwokerto"}
          </p>
        </div>
      </div>
    </div>
  );
}
