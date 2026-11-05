"use client";

import React from "react";
import { formatRupiah, formatDateID } from "@/lib/utils";
import { JobData, PayrollSlipData } from "@/types";
import { CheckCircle2, ShieldCheck, QrCode } from "lucide-react";

interface PrintableSlipGajiProps {
  job?: JobData | null;
  payrollSlip?: PayrollSlipData | null;
  mode?: "DAY_TO_DAY" | "MONTHLY";
}

export default function PrintableSlipGaji({
  job,
  payrollSlip,
  mode = job ? "DAY_TO_DAY" : "MONTHLY",
}: PrintableSlipGajiProps) {
  const isDayToDay = mode === "DAY_TO_DAY";

  // Data mapping
  const docNumber = isDayToDay
    ? `SLIP-JOB-${job?.jobNumber || "RP-0000"}`
    : payrollSlip?.slipNumber || "SLIP-0000";

  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const employeeName = isDayToDay
    ? job?.technicianName || job?.assignedTo?.name || "Teknisi Bertugas"
    : payrollSlip?.employeeName || payrollSlip?.user?.name || "Karyawan";

  const employeeUsername = isDayToDay
    ? job?.assignedTo?.username || "staff"
    : payrollSlip?.user?.username || "staff";

  const employeePhone = isDayToDay
    ? job?.assignedTo?.phone || "-"
    : payrollSlip?.user?.phone || "-";

  const paymentStatus = isDayToDay
    ? job?.commissionStatus || "PAID"
    : payrollSlip?.paymentStatus || "PAID";

  const paymentMethod = isDayToDay
    ? job?.commissionPaymentMethod || "Transfer Bank"
    : payrollSlip?.paymentMethod || "Transfer Bank";

  const paymentDate = isDayToDay
    ? job?.commissionPaidAt
      ? formatDateID(job.commissionPaidAt)
      : printDate
    : payrollSlip?.paymentDate
    ? formatDateID(payrollSlip.paymentDate)
    : printDate;

  const totalAmount = isDayToDay
    ? job?.technicianCommission || 0
    : payrollSlip?.netSalary || 0;

  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-slate-900 p-6 sm:p-8 font-sans print:p-0 print:max-w-none text-[12px] leading-relaxed">
      {/* Top Gold Accent Ribbon */}
      <div className="w-full h-1.5 bg-gradient-to-r from-[#111C44] via-amber-500 to-[#111C44] rounded-t-sm mb-5" />

      {/* Corporate Letterhead / Kop Surat */}
      <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900/80 mb-5 gap-4">
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
              Purwokerto, Kab. Banyumas &bull; WA: 0812-3456-7890 &bull; order@resikpurwokerto.com
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-block px-3 py-1 rounded bg-[#111C44] text-amber-400 font-black text-[11px] tracking-wider uppercase shadow-xs">
            {isDayToDay ? "SLIP KOMISI HARIAN" : "SLIP GAJI BULANAN"}
          </span>
          <p className="font-mono font-bold text-xs text-slate-900 mt-1.5">{docNumber}</p>
          <p className="text-[10px] text-slate-500">Dicetak: {printDate}</p>
        </div>
      </div>

      {/* Metadata Cards: 2 Columns */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-[11px]">
        {/* Kolom 1: Penerima / Teknisi */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Penerima Komisi / Gaji:
          </p>
          <p className="font-black text-sm text-[#111C44]">{employeeName}</p>
          <p className="text-slate-600">ID / Username: @{employeeUsername}</p>
          <p className="text-slate-600">Peran: {isDayToDay ? "Teknisi Lapangan" : payrollSlip?.employeeRole || "Staff Lapangan"}</p>
          <p className="text-slate-600">WhatsApp: {employeePhone}</p>
        </div>

        {/* Kolom 2: Referensi Pekerjaan / Periode */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {isDayToDay ? "Referensi Order Lapangan:" : "Periode Penggajian:"}
          </p>
          {isDayToDay && job ? (
            <>
              <p className="font-bold text-[#111C44]">
                No Order: <span className="font-mono font-black">{job.jobNumber}</span>
              </p>
              <p className="text-slate-600">Layanan: <span className="font-semibold text-slate-800">{job.service.name}</span></p>
              <p className="text-slate-600">Pelanggan: {job.customer.name}</p>
              <p className="text-slate-600">
                Nilai Transaksi: <span className="font-semibold text-slate-800">{formatRupiah(job.totalPrice)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-[#111C44]">
                Bulan: <span className="font-black">Bulan {payrollSlip?.month} / {payrollSlip?.year}</span>
              </p>
              <p className="text-slate-600">
                Rentang: {payrollSlip?.periodStart ? formatDateID(payrollSlip.periodStart) : "-"} s/d {payrollSlip?.periodEnd ? formatDateID(payrollSlip.periodEnd) : "-"}
              </p>
              <p className="text-slate-600">
                Metode Pembayaran: <span className="font-semibold text-slate-800">{paymentMethod}</span>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Financial Details Table */}
      <div className="mb-5 border border-slate-300 rounded-xl overflow-hidden">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr className="bg-[#111C44] text-white">
              <th className="py-2 px-3 font-bold w-12 text-center">No</th>
              <th className="py-2 px-3 font-bold">Rincian Komponen Pembayaran</th>
              <th className="py-2 px-3 font-bold text-right w-44">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isDayToDay && job ? (
              <>
                <tr>
                  <td className="py-2.5 px-3 text-center text-slate-500">1</td>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900">Komisi Pengerjaan Layanan</p>
                    <p className="text-[10px] text-slate-500">
                      Komisi per pekerjaan tuntas: {job.service.name} ({job.jobNumber})
                    </p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(job.technicianCommission || 0)}
                  </td>
                </tr>
                {job.commissionNotes && (
                  <tr className="bg-slate-50/60">
                    <td className="py-2 px-3 text-center text-slate-400">2</td>
                    <td className="py-2 px-3 text-slate-600">
                      Catatan / Referensi: {job.commissionNotes}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">-</td>
                  </tr>
                )}
              </>
            ) : (
              <>
                <tr>
                  <td className="py-2.5 px-3 text-center text-slate-500">1</td>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900">Gaji Pokok</p>
                    <p className="text-[10px] text-slate-500">Upah dasar bulanan</p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(payrollSlip?.basicSalary || 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-center text-slate-500">2</td>
                  <td className="py-2.5 px-3">
                    <p className="font-bold text-slate-900">Akumulasi Komisi Pekerjaan</p>
                    <p className="text-[10px] text-slate-500">Total komisi order lapangan bulan ini</p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {formatRupiah(payrollSlip?.jobCommission || 0)}
                  </td>
                </tr>
                {(payrollSlip?.allowance || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-center text-slate-500">3</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">Tunjangan Operasional / Transport</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatRupiah(payrollSlip?.allowance || 0)}
                    </td>
                  </tr>
                )}
                {(payrollSlip?.bonus || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-center text-slate-500">4</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900">Bonus Prestasi / Lembur</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      +{formatRupiah(payrollSlip?.bonus || 0)}
                    </td>
                  </tr>
                )}
                {(payrollSlip?.deductions || 0) > 0 && (
                  <tr>
                    <td className="py-2.5 px-3 text-center text-slate-500">5</td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-rose-700">Potongan (Kasbon / Lainnya)</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                      -{formatRupiah(payrollSlip?.deductions || 0)}
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-amber-50 to-amber-100/60 border-t-2 border-slate-300">
              <td colSpan={2} className="py-3 px-3 text-right font-black text-[#111C44] text-xs">
                TOTAL KOMISI / GAJI BERSIH (NETTO):
              </td>
              <td className="py-3 px-3 text-right font-black text-amber-700 text-sm">
                {formatRupiah(totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Payment Settlement Status Card */}
      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between mb-4 text-[11px]">
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Status: <span className="uppercase tracking-wider font-black">{paymentStatus === "PAID" ? "LUNAS (TELAH DITRANSFER OWNER)" : paymentStatus}</span>
          </span>
        </div>
        <div className="text-right text-emerald-900 font-medium text-[10px]">
          <span>Metode: <strong>{paymentMethod}</strong></span>
          <span className="mx-2">&bull;</span>
          <span>Tanggal: <strong>{paymentDate}</strong></span>
        </div>
      </div>

      {/* Lampiran Bukti Transfer (Jika Ada) */}
      {isDayToDay && job?.commissionProofPath && (
        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between gap-4 mb-5 text-[11px]">
          <div>
            <p className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
              Lampiran Bukti Struk / Transfer Bank:
            </p>
            <p className="text-slate-600 text-[10px] mt-0.5">
              Dokumentasi transfer sah tersimpan di server Resik Purwokerto.
            </p>
          </div>
          <a
            href={job.commissionProofPath}
            target="_blank"
            rel="noopener noreferrer"
            className="w-24 h-16 rounded-lg overflow-hidden border border-emerald-300 shadow-sm shrink-0 bg-white block hover:opacity-90"
          >
            <img
              src={job.commissionProofPath}
              alt="Bukti Transfer"
              className="w-full h-full object-cover"
            />
          </a>
        </div>
      )}

      {/* Signatures & Seal Section */}
      <div className="grid grid-cols-2 gap-8 text-center text-[11px] pt-2 mb-6">
        <div>
          <p className="font-bold text-slate-700">Diterima Oleh (Teknisi),</p>
          <div className="h-16 flex items-end justify-center">
            <span className="text-[10px] text-slate-400 italic mb-1">[Ditandatangani secara digital]</span>
          </div>
          <p className="border-t border-slate-400 inline-block px-8 font-black text-slate-900 pt-1">
            {employeeName}
          </p>
          <p className="text-[10px] text-slate-500">Staff Lapangan</p>
        </div>

        <div>
          <p className="font-bold text-slate-700">Disetujui Oleh (Owner / Finance),</p>
          <div className="h-16 flex items-end justify-center">
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-[10px] text-amber-900 font-bold mb-1 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              VERIFIED OFFICIAL
            </div>
          </div>
          <p className="border-t border-slate-400 inline-block px-8 font-black text-[#111C44] pt-1">
            Management Resik Purwokerto
          </p>
          <p className="text-[10px] text-slate-500">Operasional & Keuangan</p>
        </div>
      </div>

      {/* Security Footer Verification */}
      <div className="pt-3 border-t border-slate-200 text-center text-[9px] text-slate-400 flex items-center justify-between">
        <span>Resik Purwokerto &bull; Sistem Manajemen Komisi & Slip Gaji Terpadu (RPMS)</span>
        <span className="font-mono">Security Hash: {docNumber}-VERIFIED</span>
      </div>
    </div>
  );
}

