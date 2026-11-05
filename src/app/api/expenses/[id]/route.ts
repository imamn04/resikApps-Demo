import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    });

    if (!expense) {
      return NextResponse.json({ error: "Pengeluaran tidak ditemukan" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id: params.id },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          entity: "PAYROLL",
          entityId: expense.id,
          details: `Pengeluaran "${expense.title}" senilai Rp ${expense.amount.toLocaleString("id-ID")} dihapus oleh ${user.name}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Pengeluaran berhasil dihapus" });
  } catch (error: any) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

