import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah, formatDateID } from "@/lib/utils";

export interface ReportPdfData {
  metrics: {
    totalRevenue: number;
    completedJobs: number;
    totalJobs: number;
    pendingJobs?: number;
    scheduledJobs?: number;
    inProgressJobs?: number;
    cancelledJobs?: number;
  };
  financialSummary?: {
    grossRevenue: number;
    technicianCommissions: number;
    operationalExpenses: number;
    netProfit: number;
    netMargin: number;
    commissionMargin: number;
    expenseMargin: number;
  };
  serviceStats: Array<{
    id: string;
    name: string;
    category: string;
    jobCount: number;
    revenue: number;
  }>;
  technicianStats: Array<{
    name: string;
    jobCount: number;
    completedCount: number;
    revenue: number;
  }>;
}

/**
 * Generate and download an executive corporate A4 PDF report for Resik Purwokerto.
 * Uses pure vector jsPDF + autoTable (No web-capture, crisp fonts, precise margins).
 */
export async function exportReportPDF(
  reportData: ReportPdfData,
  startDate?: string,
  endDate?: string
) {
  // 1. Initialize A4 Document (210 x 297 mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Colors
  const navyDark = [17, 28, 68] as [number, number, number]; // #111C44
  const amberGold = [245, 158, 11] as [number, number, number]; // #F59E0B
  const slateDark = [30, 41, 59] as [number, number, number]; // #1E293B
  const slateLight = [241, 245, 249] as [number, number, number]; // #F1F5F9
  const emeraldGreen = [16, 185, 129] as [number, number, number]; // #10B981

  let currentY = 14;

  // -------------------------------------------------------------
  // HEADER & KOP SURAT RESMI
  // -------------------------------------------------------------

  // Top Accent Bar (Navy & Gold Accent)
  doc.setFillColor(...navyDark);
  doc.rect(margin, currentY, contentWidth, 2, "F");
  currentY += 5;

  // Corporate Monogram Box "RP"
  doc.setFillColor(...navyDark);
  doc.roundedRect(margin, currentY, 14, 14, 2.5, 2.5, "F");
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RP", margin + 7, currentY + 9.5, { align: "center" });

  // Company Information
  doc.setTextColor(...navyDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("RESIK PURWOKERTO", margin + 17, currentY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate 600
  doc.text(
    "Jasa Kebersihan, Cuci Kasur/Sofa & Layanan Lapangan Profesional",
    margin + 17,
    currentY + 9.5
  );
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(
    "Purwokerto, Kab. Banyumas • WhatsApp: 0812-3456-7890 • resikpurwokerto.com",
    margin + 17,
    currentY + 13.5
  );

  // Document Badge & Details (Right side)
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(pageWidth - margin - 62, currentY, 62, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...navyDark);
  doc.text("LAPORAN REKAPITULASI RESMI", pageWidth - margin - 31, currentY + 4.5, {
    align: "center",
  });

  const now = new Date();
  const printTimestamp = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodLabel}`, pageWidth - margin - 31, currentY + 8.5, {
    align: "center",
  });
  doc.text(`Dicetak: ${printTimestamp}`, pageWidth - margin - 31, currentY + 12, {
    align: "center",
  });

  currentY += 18;

  // Thin separator line
  doc.setDrawColor(203, 213, 225); // Slate 300
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // -------------------------------------------------------------
  // EXECUTIVE FINANCIAL & OPERATIONAL SUMMARY (KPI HIGHLIGHT)
  // -------------------------------------------------------------
  const fin = reportData.financialSummary;
  const grossRev = fin?.grossRevenue ?? reportData.metrics.totalRevenue ?? 0;
  const commTotal = fin?.technicianCommissions ?? 0;
  const expTotal = fin?.operationalExpenses ?? 0;
  const netProf = fin?.netProfit ?? grossRev - commTotal - expTotal;
  const netMarg = fin?.netMargin ?? (grossRev > 0 ? (netProf / grossRev) * 100 : 0);

  // Executive Box (Navy Gradient look)
  const boxHeight = 22;
  doc.setFillColor(...navyDark);
  doc.roundedRect(margin, currentY, contentWidth, boxHeight, 2.5, 2.5, "F");

  // KPI Column 1: Omzet Kotor
  doc.setTextColor(245, 158, 11); // Amber
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL OMZET KOTOR", margin + 6, currentY + 6);
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(formatRupiah(grossRev), margin + 6, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`${reportData.metrics.completedJobs} Job Selesai (${reportData.metrics.totalJobs} Order)`, margin + 6, currentY + 17);

  // KPI Column 2: Beban Komisi Teknisi
  const col2X = margin + 50;
  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("BEBAN KOMISI TEKNISI", col2X, currentY + 6);
  doc.setFontSize(11);
  doc.setTextColor(253, 224, 71); // Light amber
  doc.text(formatRupiah(commTotal), col2X, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Alokasi Komisi: ${fin?.commissionMargin ?? 0}%`, col2X, currentY + 17);

  // KPI Column 3: Biaya Operasional
  const col3X = margin + 96;
  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("BIAYA OPERASIONAL & BAHAN", col3X, currentY + 6);
  doc.setFontSize(11);
  doc.setTextColor(248, 113, 113); // Rose/Red
  doc.text(formatRupiah(expTotal), col3X, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Alokasi Biaya: ${fin?.expenseMargin ?? 0}%`, col3X, currentY + 17);

  // KPI Column 4: Laba Bersih (Net Profit)
  const col4X = margin + 142;
  doc.setFillColor(16, 185, 129, 0.2); // Translucent green highlight card
  doc.roundedRect(col4X - 3, currentY + 2.5, 40, boxHeight - 5, 2, 2, "F");
  doc.setTextColor(110, 231, 183); // Light emerald
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("LABA BERSIH (NET PROFIT)", col4X, currentY + 6);
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(formatRupiah(netProf), col4X, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(110, 231, 183);
  doc.text(`Margin: ${Math.round(netMarg * 10) / 10}%`, col4X, currentY + 17);

  currentY += boxHeight + 8;

  // -------------------------------------------------------------
  // TABEL 1: REKAPITULASI BERDASARKAN JENIS LAYANAN
  // -------------------------------------------------------------
  doc.setTextColor(...navyDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("1. Rekapitulasi Berdasarkan Jenis Layanan", margin, currentY);
  currentY += 3;

  const serviceTableData = (reportData.serviceStats || []).map((s, idx) => [
    (idx + 1).toString(),
    s.name || "-",
    s.category || "-",
    `${s.jobCount} Job`,
    formatRupiah(s.revenue),
  ]);

  // Calculate totals
  const totalServiceJobs = (reportData.serviceStats || []).reduce(
    (acc, curr) => acc + (curr.jobCount || 0),
    0
  );
  const totalServiceRev = (reportData.serviceStats || []).reduce(
    (acc, curr) => acc + (curr.revenue || 0),
    0
  );

  autoTable(doc, {
    startY: currentY,
    head: [["No.", "Nama Layanan", "Kategori", "Jumlah Order", "Total Omzet"]],
    body: [
      ...serviceTableData,
      [
        { content: "TOTAL", colSpan: 3, styles: { halign: "right", fontStyle: "bold" } },
        { content: `${totalServiceJobs} Job`, styles: { halign: "center", fontStyle: "bold" } },
        { content: formatRupiah(totalServiceRev), styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2,
      textColor: slateDark,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: navyDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 70 },
      2: { cellWidth: 40 },
      3: { cellWidth: 26, halign: "center" },
      4: { cellWidth: 36, halign: "right" },
    },
  });

  // Get Y position after table
  const afterServiceTable = (doc as any).lastAutoTable?.finalY || currentY + 40;
  currentY = afterServiceTable + 8;

  // -------------------------------------------------------------
  // TABEL 2: REKAPITULASI KINERJA TEKNISI / TIM
  // -------------------------------------------------------------
  // Check if we need a page break or if space is tight
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = margin + 5;
  }

  doc.setTextColor(...navyDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("2. Rekapitulasi Kinerja Teknisi / Tim Lapangan", margin, currentY);
  currentY += 3;

  const techRows = (reportData.technicianStats || []).map((t, idx) => [
    (idx + 1).toString(),
    t.name || "-",
    `${t.jobCount} Job`,
    `${t.completedCount} Job`,
    formatRupiah(t.revenue),
  ]);

  const totalTechCompleted = (reportData.technicianStats || []).reduce(
    (acc, curr) => acc + (curr.completedCount || 0),
    0
  );
  const totalTechRevenue = (reportData.technicianStats || []).reduce(
    (acc, curr) => acc + (curr.revenue || 0),
    0
  );

  autoTable(doc, {
    startY: currentY,
    head: [["No.", "Nama Teknisi / Tim", "Job Ditugaskan", "Job Selesai", "Omzet Dituntaskan"]],
    body: [
      ...techRows,
      [
        { content: "TOTAL", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
        { content: "-", styles: { halign: "center" } },
        { content: `${totalTechCompleted} Job`, styles: { halign: "center", fontStyle: "bold" } },
        { content: formatRupiah(totalTechRevenue), styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    theme: "grid",
    margin: { left: margin, right: margin },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2,
      textColor: slateDark,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: navyDark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 80 },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 26, halign: "center" },
      4: { cellWidth: 40, halign: "right" },
    },
  });

  const afterTechTable = (doc as any).lastAutoTable?.finalY || currentY + 30;
  currentY = afterTechTable + 10;

  // -------------------------------------------------------------
  // SIGNATURE SECTION / PENGESAHAN DOKUMEN
  // -------------------------------------------------------------
  if (currentY > pageHeight - 48) {
    doc.addPage();
    currentY = margin + 10;
  }

  const signWidth = (contentWidth - 20) / 2;

  // Left Sign: Admin Operasional
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Disiapkan oleh:", margin + 5, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navyDark);
  doc.text("Admin Operasional", margin + 5, currentY + 4);

  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, currentY + 22, margin + 5 + 65, currentY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("( Staf Administrasi & Rekap )", margin + 5, currentY + 26);
  doc.text(`Tgl Cetak: ${printTimestamp}`, margin + 5, currentY + 29.5);

  // Right Sign: Owner Resik Purwokerto
  const rightSignX = margin + signWidth + 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Mengetahui & Menyetujui:", rightSignX, currentY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...navyDark);
  doc.text("Owner Resik Purwokerto", rightSignX, currentY + 4);

  doc.setDrawColor(203, 213, 225);
  doc.line(rightSignX, currentY + 22, rightSignX + 65, currentY + 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...navyDark);
  doc.text("Owner Resik Purwokerto", rightSignX, currentY + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text("STATUS: TERVERIFIKASI SISTEM DIGITAL", rightSignX, currentY + 29.5);

  // -------------------------------------------------------------
  // FOOTER & PAGE NUMBERING (ALL PAGES)
  // -------------------------------------------------------------
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Top thin line on subsequent pages
    if (i > 1) {
      doc.setFillColor(...navyDark);
      doc.rect(margin, margin, contentWidth, 1.5, "F");
    }

    // Bottom footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    // Footer Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      "Resik Purwokerto • Dokumen Laporan Operasional Resmi Sistem v2.0 • Kerahasiaan Terjamin",
      margin,
      pageHeight - 7
    );

    doc.text(
      `Halaman ${i} dari ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  }

  // -------------------------------------------------------------
  // TRIGGER DOWNLOAD
  // -------------------------------------------------------------
  const sanitizedPeriod = (startDate || "Semua") + (endDate ? `_sd_${endDate}` : "");
  const fileName = `Laporan_Operasional_Resik_Purwokerto_${sanitizedPeriod}.pdf`;
  doc.save(fileName);
}
