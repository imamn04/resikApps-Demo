import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Akses ditolak. Menu Slip Gaji hanya untuk Owner dan Admin." },
      { status: 403 }
    );
  }

  try {
    const slip = await prisma.payrollSlip.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, username: true, phone: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!slip) {
      return NextResponse.json({ error: "Slip gaji tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ slip });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Akses ditolak. Menu Slip Gaji hanya untuk Owner dan Admin." },
      { status: 403 }
    );
  }

  try {
    const slip = await prisma.payrollSlip.findUnique({
      where: { id: params.id },
    });

    if (!slip) {
      return NextResponse.json({ error: "Slip gaji tidak ditemukan." }, { status: 404 });
    }

    const body = await req.json();
    const {
      employeeName,
      employeeRole,
      month,
      year,
      periodStart,
      periodEnd,
      basicSalary,
      jobCommission,
      allowance,
      bonus,
      deductions,
      paymentStatus,
      paymentMethod,
      notes,
    } = body;

    const nBasic = basicSalary !== undefined ? Number(basicSalary) : slip.basicSalary;
    const nCommission = jobCommission !== undefined ? Number(jobCommission) : slip.jobCommission;
    const nAllowance = allowance !== undefined ? Number(allowance) : slip.allowance;
    const nBonus = bonus !== undefined ? Number(bonus) : slip.bonus;
    const nDeductions = deductions !== undefined ? Number(deductions) : slip.deductions;

    const netSalary = Math.max(0, nBasic + nCommission + nAllowance + nBonus - nDeductions);

    let paymentDate = slip.paymentDate;
    if (paymentStatus === "PAID" && !slip.paymentDate) {
      paymentDate = new Date();
    } else if (paymentStatus === "DRAFT" || paymentStatus === "APPROVED") {
      paymentDate = null;
    }

    const updated = await prisma.payrollSlip.update({
      where: { id: params.id },
      data: {
        ...(employeeName ? { employeeName: employeeName.trim() } : {}),
        ...(employeeRole ? { employeeRole: employeeRole.trim() } : {}),
        ...(month !== undefined ? { month: Number(month) } : {}),
        ...(year !== undefined ? { year: Number(year) } : {}),
        ...(periodStart ? { periodStart } : {}),
        ...(periodEnd ? { periodEnd } : {}),
        basicSalary: nBasic,
        jobCommission: nCommission,
        allowance: nAllowance,
        bonus: nBonus,
        deductions: nDeductions,
        netSalary,
        ...(paymentStatus ? { paymentStatus } : {}),
        paymentDate,
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(notes !== undefined ? { notes } : {}),
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
          action: "UPDATE",
          entity: "PAYROLL",
          entityId: updated.id,
          details: `Slip gaji ${updated.slipNumber} (${updated.employeeName}) diupdate oleh ${user.name}. Status: ${updated.paymentStatus}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, slip: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json(
      { error: "Hanya Owner yang memiliki izin menghapus slip gaji." },
      { status: 403 }
    );
  }

  try {
    const slip = await prisma.payrollSlip.findUnique({
      where: { id: params.id },
    });

    if (!slip) {
      return NextResponse.json({ error: "Slip gaji tidak ditemukan." }, { status: 404 });
    }

    await prisma.payrollSlip.delete({
      where: { id: params.id },
    });

    // Catat Audit Trail
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          entity: "PAYROLL",
          entityId: params.id,
          details: `Slip gaji ${slip.slipNumber} (${slip.employeeName}) dihapus oleh Owner (${user.name})`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Slip gaji berhasil dihapus." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

