import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format number to Rupiah (e.g. Rp 150.000)
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format Indonesian Date (e.g. 01 November 2026)
export function formatDateID(dateString: string | Date | null | undefined): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return String(dateString);
  }
}

// Format WhatsApp Phone Number to Standard 628...
export function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

// Generate WhatsApp Direct Message Link
export function getWhatsAppLink(phone: string, message: string = ""): string {
  const sanitized = sanitizePhoneNumber(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encoded}`;
}

// WhatsApp Template: Order Diterima / Teknisi Siap
export function getWhatsAppAssignedTemplate(
  phone: string,
  customerName: string,
  technicianName: string,
  serviceName: string,
  jobNumber?: string
): string {
  const msg = `Halo Kak ${customerName}, pesanan pengerjaan *${serviceName}*${jobNumber ? ` (${jobNumber})` : ""} telah diterima oleh teknisi kami *${technicianName || "Teknisi Resik Purwokerto"}*. Kami sedang mempersiapkan perlengkapan dan akan mengabari saat mulai berangkat menuju lokasi Anda. Terima kasih! 🧹✨`;
  return getWhatsAppLink(phone, msg);
}

// WhatsApp Template: Menuju Lokasi (OTW)
export function getWhatsAppOtwTemplate(
  phone: string,
  customerName: string,
  technicianName: string,
  serviceName: string,
  jobNumber?: string
): string {
  const msg = `Halo Kak ${customerName}, saya ${technicianName || "Teknisi"} dari *Resik Purwokerto* sedang dalam perjalanan menuju lokasi Anda untuk pengerjaan *${serviceName}*${jobNumber ? ` (No. Order: ${jobNumber})` : ""}. Mohon berkenan ditunggu ya Kak! 🙏🛵`;
  return getWhatsAppLink(phone, msg);
}

// WhatsApp Template: Tiba di Lokasi & Mulai Pengerjaan
export function getWhatsAppArrivedTemplate(
  phone: string,
  customerName: string,
  technicianName: string,
  serviceName: string,
  jobNumber?: string
): string {
  const msg = `Halo Kak ${customerName}, teknisi kami *${technicianName || "Teknisi"}* dari *Resik Purwokerto* telah tiba di lokasi Anda untuk pengerjaan *${serviceName}*${jobNumber ? ` (${jobNumber})` : ""}. Kami siap memulai pengerjaan sesuai SOP kebersihan prima. Terima kasih! 🏡✨`;
  return getWhatsAppLink(phone, msg);
}

// WhatsApp Template: Selesai Pengerjaan
export function getWhatsAppDoneTemplate(
  phone: string,
  customerName: string,
  serviceName: string,
  jobNumber: string,
  totalPrice: number
): string {
  const msg = `Halo Kak ${customerName}, pengerjaan *${serviceName}* (No. Order: ${jobNumber}) telah selesai kami bersihkan dengan prima. Total biaya: *${formatRupiah(totalPrice)}*. Terima kasih banyak telah mempercayakan kebersihan rumah Anda kepada *Resik Purwokerto*! ✨🧼`;
  return getWhatsAppLink(phone, msg);
}

// WhatsApp Template: Pemberitahuan Transfer Komisi ke Teknisi
export function getWhatsAppCommissionPaidTemplate(
  phone: string,
  technicianName: string,
  jobNumber: string,
  serviceName: string,
  commissionAmount: number,
  paymentMethod: string
): string {
  const msg = `Halo Mas ${technicianName}, komisi pengerjaan order *${jobNumber}* (*${serviceName}*) sebesar *${formatRupiah(commissionAmount)}* telah berhasil ditransfer via *${paymentMethod}*. Terima kasih banyak atas dedikasi dan kerja kerasnya bersama Resik Purwokerto! 💸🚀`;
  return getWhatsAppLink(phone, msg);
}

// Job Status Configuration with Resik Purwokerto Theme & Stepper ICRM
export const JOB_STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string; stepNumber: number }
> = {
  MENUNGGU_DISPOSISI: {
    label: "Menunggu Disposisi",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
    stepNumber: 1,
  },
  DIDISPOSISIKAN: {
    label: "Didisposisikan",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    dot: "bg-sky-500",
    stepNumber: 2,
  },
  MENUJU_LOKASI: {
    label: "Menuju Lokasi (OTW)",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
    stepNumber: 3,
  },
  TIBA_DI_LOKASI: {
    label: "Tiba di Lokasi",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    dot: "bg-blue-600",
    stepNumber: 4,
  },
  DALAM_PENGERJAAN: {
    label: "Dalam Pengerjaan",
    bg: "bg-cyan-50",
    text: "text-cyan-800",
    border: "border-cyan-200",
    dot: "bg-cyan-600",
    stepNumber: 5,
  },
  MENUNGGU_VALIDASI: {
    label: "Menunggu Validasi Owner",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    dot: "bg-purple-600",
    stepNumber: 6,
  },
  SELESAI: {
    label: "Selesai (Tervalidasi)",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    stepNumber: 7,
  },
  DIBATALKAN: {
    label: "Dibatalkan",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
    stepNumber: 0,
  },
  // Legacy status fallback
  PENDING: {
    label: "Menunggu Disposisi",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
    stepNumber: 1,
  },
  DIJADWALKAN: {
    label: "Didisposisikan",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    dot: "bg-sky-500",
    stepNumber: 2,
  },
};
