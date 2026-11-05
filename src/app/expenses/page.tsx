"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { formatRupiah, formatDateID } from "@/lib/utils";
import {
  DollarSign,
  PlusCircle,
  Trash2,
  Calendar,
  Filter,
  ArrowDownRight,
  TrendingDown,
  PieChart,
  Tag,
  Search,
  CheckCircle2,
  X,
  CreditCard,
} from "lucide-react";
import { createPortal } from "react-dom";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("OPERASIONAL");
  const [formAmount, setFormAmount] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append("category", filterCategory);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
        setTotalAmount(json.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [filterCategory, startDate, endDate]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount) {
      alert("Keterangan dan jumlah nominal wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle,
          category: formCategory,
          amount: parseFloat(formAmount),
          expenseDate: formDate,
          notes: formNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mencatat pengeluaran");

      setMessage("Pengeluaran operasional berhasil dicatat!");
      setIsModalOpen(false);
      setFormTitle("");
      setFormAmount("");
      setFormNotes("");
      fetchExpenses();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchExpenses();
      } else {
        const json = await res.json();
        alert(json.error || "Gagal menghapus pengeluaran");
      }
    } catch {
      alert("Terjadi kesalahan jaringan");
    }
  };

  return (
    <AppLayout>
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1437] via-[#111C44] to-[#1B254B] p-6 text-white shadow-horizon-navy mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-black tracking-wider uppercase mb-2">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Modul Keuangan Operasional
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Biaya & Pengeluaran Operasional
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Catat pembelian bahan pembersih, operasional teknisi, transport, dan pengeluaran harian lainnya
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-[#111C44] font-black text-xs sm:text-sm shadow-horizon-glow transition-all active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-[#111C44]" />
            Catat Pengeluaran Baru
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
        <div className="horizon-card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider">
            Total Pengeluaran
          </p>
          <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            {formatRupiah(totalAmount)}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Sesuai filter pencarian</p>
        </div>

        <div className="horizon-card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider">
            Jumlah Transaksi
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#111C44] mt-1">
            {expenses.length} Catatan
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Biaya tercatat</p>
        </div>

        <div className="horizon-card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider">
            Bahan & Alat
          </p>
          <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
            {formatRupiah(
              expenses
                .filter((e) => e.category === "ALAT_BAHAN")
                .reduce((sum, item) => sum + item.amount, 0)
            )}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Chemical & perlengkapan</p>
        </div>

        <div className="horizon-card p-4 sm:p-5">
          <p className="text-[10px] sm:text-xs font-bold text-[#707E94] uppercase tracking-wider">
            Bensin & Transport
          </p>
          <p className="text-xl sm:text-2xl font-black text-blue-600 mt-1">
            {formatRupiah(
              expenses
                .filter((e) => e.category === "TRANSPORT")
                .reduce((sum, item) => sum + item.amount, 0)
            )}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Mobilitas teknisi</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="horizon-card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl font-semibold text-slate-800"
            >
              <option value="">Semua Kategori</option>
              <option value="OPERASIONAL">Operasional Umum</option>
              <option value="ALAT_BAHAN">Alat & Bahan / Chemical</option>
              <option value="TRANSPORT">Bensin & Transport</option>
              <option value="MAKAN_MINUM">Konsumsi Lapangan</option>
              <option value="LAINNYA">Lain-lain</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#F4F7FE] border border-slate-200 rounded-xl font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterCategory("");
                setStartDate("");
                setEndDate("");
              }}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="horizon-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-black text-[#111C44]">
            Riwayat Pengeluaran Operasional
          </h2>
          <span className="text-xs bg-[#F4F7FE] text-slate-600 font-bold px-3 py-1 rounded-full">
            {expenses.length} Baris Data
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Memuat data pengeluaran...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Belum ada catatan pengeluaran operasional.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F4F7FE] text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4">Dicatat Oleh</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                      {formatDateID(exp.expenseDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] font-normal text-slate-400 mt-0.5">
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                      {formatRupiah(exp.amount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {exp.createdBy?.name || "Admin"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tambah Pengeluaran Baru */}
      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[999] bg-[#0B1437]/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-base font-black text-[#111C44]">
                  Catat Pengeluaran Baru
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Keterangan Pengeluaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beli Karbol & Sabun Cuci Karpet 5L"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Kategori
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="OPERASIONAL">Operasional Umum</option>
                      <option value="ALAT_BAHAN">Alat & Bahan / Chemical</option>
                      <option value="TRANSPORT">Bensin & Transport</option>
                      <option value="MAKAN_MINUM">Konsumsi Lapangan</option>
                      <option value="LAINNYA">Lain-lain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nominal Biaya (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-[#111C44] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Keterangan toko, bukti struk, dsb."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-[#111C44] hover:bg-[#1B254B] text-white font-black shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <CreditCard className="w-4 h-4 text-amber-400" />
                    {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
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

