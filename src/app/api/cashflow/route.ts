import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Get all completed jobs
    const completedJobs = await prisma.job.findMany({
      where: {
        status: "SELESAI",
        isDeleted: false,
      },
      select: {
        id: true,
        totalPrice: true,
        technicianCommission: true,
        completedAt: true,
        createdAt: true,
      },
    });

    // 2. Get all operational expenses
    const allExpenses = await prisma.expense.findMany({
      select: {
        id: true,
        title: true,
        amount: true,
        category: true,
        expenseDate: true,
      },
    });

    // Total Uang Masuk (Gross Revenue)
    const totalIncome = completedJobs.reduce((sum, j) => sum + (j.totalPrice || 0), 0);

    // Total Uang Keluar (Expenses + Commissions)
    const totalOperationalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCommissionsPaid = completedJobs.reduce((sum, j) => sum + (j.technicianCommission || 0), 0);
    const totalExpense = totalOperationalExpenses + totalCommissionsPaid;

    // Total Saldo Kas/Bank
    const currentBalance = totalIncome - totalExpense;

    // Current Month calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthJobs = completedJobs.filter((j) => {
      const dt = j.completedAt ? new Date(j.completedAt) : new Date(j.createdAt);
      return dt >= startOfMonth && dt <= endOfMonth;
    });

    const currentMonthRevenue = thisMonthJobs.reduce((sum, j) => sum + (j.totalPrice || 0), 0);
    const currentMonthOrdersCount = thisMonthJobs.length;

    // 7 Days Trend (from 6 days ago up to today)
    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const sevenDaysTrend = [];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      // Jobs completed on this day
      const dayJobs = completedJobs.filter((j) => {
        const dt = j.completedAt ? new Date(j.completedAt) : new Date(j.createdAt);
        return dt >= startOfDay && dt <= endOfDay;
      });

      const dayIncome = dayJobs.reduce((sum, j) => sum + (j.totalPrice || 0), 0);
      const dayCommissions = dayJobs.reduce((sum, j) => sum + (j.technicianCommission || 0), 0);

      // Expenses on this day (matched by YYYY-MM-DD string)
      const targetDateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
      const dayExpenses = allExpenses.filter((e) => e.expenseDate === targetDateStr);

      const dayOpExpense = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalDayExpense = dayOpExpense + dayCommissions;

      const dateLabel = `${String(targetDate.getDate()).padStart(2, "0")}/${String(targetDate.getMonth() + 1).padStart(2, "0")}`;
      const dayName = dayNames[targetDate.getDay()];

      sevenDaysTrend.push({
        date: dateLabel,
        dayName,
        income: dayIncome,
        expense: totalDayExpense,
        balance: dayIncome - totalDayExpense,
      });
    }

    return NextResponse.json({
      summary: {
        totalIncome,
        totalExpense,
        totalOperationalExpenses,
        totalCommissionsPaid,
        currentBalance,
        currentMonthRevenue,
        currentMonthOrdersCount,
      },
      sevenDaysTrend,
    });
  } catch (error: any) {
    console.error("Cashflow calculation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

