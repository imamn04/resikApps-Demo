import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

// Unique Slip Number Generator: SLIP-YYYYMM-XXXX
async function generateSlipNumber(year: number, month: number): Promise<string> {
  const prefix = `SLIP-${year}${String(month).padStart(2, "0")}-`;
  const lastSlip = await prisma.payrollSlip.findFirst({
    where: {
      slipNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      slipNumber: "desc",
    },
    select: {
      slipNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastSlip && lastSlip.slipNumber) {
    const parts = lastSlip.slipNumber.split("-");
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Akses ditolak. Menu Slip Gaji hanya untuk Owner dan Admin." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);

  // Helper mode: Hitung otomatis pekerjaan selesai & komisi untuk teknisi
  if (searchParams.get("action") === "calculate-technician-jobs") {
    const technicianName = searchParams.get("technicianName") || "";
    const periodStart = searchParams.get("periodStart") || "";
    const periodEnd = searchParams.get("periodEnd") || "";

    if (!technicianName) {
      return NextResponse.json({ completedJobsCount: 0, totalRevenue: 0, jobs: [] });
    }

    try {
      const whereClause: any = {
        isDeleted: false,
        status: "SELESAI",
        technicianName: {
          contains: technicianName.trim(),
        },
      };

      if (periodStart && periodEnd) {
        whereClause.scheduledDate = {
          gte: periodStart,
          lte: periodEnd,
        };
      }

      const completedJobs = await prisma.job.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true } },
          service: { select: { name: true } },
        },
        orderBy: { scheduledDate: "asc" },
      });

      const totalRevenue = completedJobs.reduce((acc, job) => acc + (job.totalPrice || 0), 0);

      return NextResponse.json({
        technicianName,
        completedJobsCount: completedJobs.length,
        totalRevenue,
        jobs: completedJobs.map((j) => ({
          jobNumber: j.jobNumber,
          scheduledDate: j.scheduledDate,
          customerName: j.customer?.name,
          serviceName: j.service?.name,
          totalPrice: j.totalPrice,
        })),
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Standar: Ambil daftar slip gaji
  const monthStr = searchParams.get("month");
  const yearStr = searchParams.get("year");
  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";

  const whereClause: any = {};

  if (monthStr && monthStr !== "all") {
    whereClause.month = parseInt(monthStr, 10);
  }

  if (yearStr && yearStr !== "all") {
    whereClause.year = parseInt(yearStr, 10);
  }

  if (status && status !== "ALL") {
    whereClause.paymentStatus = status;
  }

  if (search) {
    whereClause.OR = [
      { employeeName: { contains: search } },
      { slipNumber: { contains: search } },
      { employeeRole: { contains: search } },
    ];
  }

  try {
    const slips = await prisma.payrollSlip.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            phone: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Ringkasan KPI
    const totalExpenditure = slips.reduce((sum, s) => sum + s.netSalary, 0);
    const paidSlips = slips.filter((s) => s.paymentStatus === "PAID");
    const totalPaid = paidSlips.reduce((sum, s) => sum + s.netSalary, 0);
    const draftSlips = slips.filter((s) => s.paymentStatus === "DRAFT" || s.paymentStatus === "APPROVED");
    const totalPending = draftSlips.reduce((sum, s) => sum + s.netSalary, 0);

    return NextResponse.json({
      slips,
      kpi: {
        totalSlips: slips.length,
        totalExpenditure,
        totalPaid,
        totalPending,
        paidCount: paidSlips.length,
        pendingCount: draftSlips.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Akses ditolak. Menu Slip Gaji hanya untuk Owner dan Admin." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const {
      userId,
      employeeName,
      employeeRole,
      month,
      year,
      periodStart,
      periodEnd,
      basicSalary = 0,
      jobCommission = 0,
      allowance = 0,
      bonus = 0,
      deductions = 0,
      paymentStatus = "DRAFT",
      paymentMethod,
      notes,
    } = body;

    if (!employeeName || !employeeRole || !month || !year || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "Nama karyawan, peran, bulan, tahun, dan periode tanggal wajib diisi." },
        { status: 400 }
      );
    }

    const nBasicSalary = Number(basicSalary) || 0;
    const nJobCommission = Number(jobCommission) || 0;
    const nAllowance = Number(allowance) || 0;
    const nBonus = Number(bonus) || 0;
    const nDeductions = Number(deductions) || 0;

    const netSalary = Math.max(0, nBasicSalary + nJobCommission + nAllowance + nBonus - nDeductions);
    const slipNumber = await generateSlipNumber(Number(year), Number(month));

    const newSlip = await prisma.payrollSlip.create({
      data: {
        slipNumber,
        userId: userId || null,
        employeeName: employeeName.trim(),
        employeeRole: employeeRole.trim(),
        month: Number(month),
        year: Number(year),
        periodStart,
        periodEnd,
        basicSalary: nBasicSalary,
        jobCommission: nJobCommission,
        allowance: nAllowance,
        bonus: nBonus,
        deductions: nDeductions,
        netSalary,
        paymentStatus,
        paymentDate: paymentStatus === "PAID" ? new Date() : null,
        paymentMethod: paymentMethod || null,
        notes: notes || null,
        createdById: user.id,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Catat Audit Trail
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entity: "PAYROLL",
          entityId: newSlip.id,
          details: `Slip gaji dibuat: ${newSlip.slipNumber} untuk ${newSlip.employeeName} sebesar Rp ${newSlip.netSalary.toLocaleString("id-ID")}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, slip: newSlip }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

