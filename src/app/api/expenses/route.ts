import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let whereClause: any = {};

    if (category) {
      whereClause.category = category;
    }

    if (startDate || endDate) {
      whereClause.expenseDate = {};
      if (startDate) {
        whereClause.expenseDate.gte = startDate;
      }
      if (endDate) {
        whereClause.expenseDate.lte = endDate;
      }
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, name: true, username: true },
        },
      },
      orderBy: { expenseDate: "desc" },
    });

    const totalAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

    return NextResponse.json({
      expenses,
      totalAmount,
    });
  } catch (error: any) {
    console.error("Get expenses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, category, amount, expenseDate, notes } = body;

    if (!title || !amount) {
      return NextResponse.json(
        { error: "Keterangan pengeluaran dan jumlah nominal wajib diisi" },
        { status: 400 }
      );
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Nominal pengeluaran harus berupa angka positif" },
        { status: 400 }
      );
    }

    const expDateStr = expenseDate ? String(expenseDate).split("T")[0] : new Date().toISOString().split("T")[0];

    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        category: category || "OPERASIONAL",
        amount: numAmount,
        expenseDate: expDateStr,
        notes: notes ? notes.trim() : null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entity: "PAYROLL", // or expense
          entityId: expense.id,
          details: `Pengeluaran baru "${expense.title}" senilai Rp ${numAmount.toLocaleString("id-ID")} dicatat oleh ${user.name}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

