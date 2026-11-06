import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "monthly"; // daily, weekly, monthly, yearly
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const todayStr = new Date().toISOString().split("T")[0];

    // Base filter
    const baseWhere: any = { isDeleted: false };
    if (startDate && endDate) {
      baseWhere.scheduledDate = { gte: startDate, lte: endDate };
    }

    // 1. Metric Counts
    const totalJobs = await prisma.job.count({ where: baseWhere });
    const todayJobs = await prisma.job.count({
      where: { ...baseWhere, scheduledDate: todayStr },
    });
    const pendingJobs = await prisma.job.count({
      where: { ...baseWhere, status: "PENDING" },
    });
    const scheduledJobs = await prisma.job.count({
      where: { ...baseWhere, status: "DIJADWALKAN" },
    });
    const inProgressJobs = await prisma.job.count({
      where: { ...baseWhere, status: "DALAM_PENGERJAAN" },
    });
    const completedJobs = await prisma.job.count({
      where: { ...baseWhere, status: "SELESAI" },
    });
    const cancelledJobs = await prisma.job.count({
      where: { ...baseWhere, status: "DIBATALKAN" },
    });

    // 2. Revenue / Omzet & Financial Summary
    const completedRevenueAgg = await prisma.job.aggregate({
      where: { ...baseWhere, status: "SELESAI" },
      _sum: {
        totalPrice: true,
        technicianCommission: true,
      },
    });
    const totalRevenue = completedRevenueAgg._sum.totalPrice || 0;
    const totalCommission = completedRevenueAgg._sum.technicianCommission || 0;

    const allRevenueAgg = await prisma.job.aggregate({
      where: { ...baseWhere, status: { not: "DIBATALKAN" } },
      _sum: { totalPrice: true },
    });
    const potentialRevenue = allRevenueAgg._sum.totalPrice || 0;

    // Expenses calculation within the period
    const expenseWhere: any = {};
    if (startDate && endDate) {
      expenseWhere.expenseDate = { gte: startDate, lte: endDate };
    }
    const expenseAgg = await prisma.expense.aggregate({
      where: expenseWhere,
      _sum: { amount: true },
    });
    const totalExpenses = expenseAgg._sum.amount || 0;

    const netProfit = totalRevenue - totalCommission - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const commissionMargin = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0;
    const expenseMargin = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    const topExpenses = await prisma.expense.findMany({
      where: expenseWhere,
      take: 4,
      orderBy: { amount: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        amount: true,
        expenseDate: true,
      },
    });

    const financialSummary = {
      grossRevenue: totalRevenue,
      technicianCommissions: totalCommission,
      operationalExpenses: totalExpenses,
      netProfit,
      netMargin: Math.round(netMargin * 10) / 10,
      commissionMargin: Math.round(commissionMargin * 10) / 10,
      expenseMargin: Math.round(expenseMargin * 10) / 10,
      topExpenses,
    };

    // 3. Breakdown by Service
    const services = await prisma.service.findMany({
      include: {
        _count: {
          select: { jobs: { where: baseWhere } },
        },
      },
    });

    const serviceStats = await Promise.all(
      services.map(async (s) => {
        const rev = await prisma.job.aggregate({
          where: { ...baseWhere, serviceId: s.id, status: "SELESAI" },
          _sum: { totalPrice: true },
        });
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          jobCount: s._count.jobs,
          revenue: rev._sum.totalPrice || 0,
        };
      })
    );

    // 4. Breakdown by Technician
    const jobsWithTech = await prisma.job.findMany({
      where: {
        ...baseWhere,
        technicianName: { not: null },
      },
      select: {
        technicianName: true,
        status: true,
        totalPrice: true,
      },
    });

    const techMap: Record<string, { jobCount: number; completedCount: number; revenue: number }> = {};
    for (const j of jobsWithTech) {
      const tech = (j.technicianName || "Belum Ditentukan").trim();
      if (!tech) continue;
      if (!techMap[tech]) {
        techMap[tech] = { jobCount: 0, completedCount: 0, revenue: 0 };
      }
      techMap[tech].jobCount += 1;
      if (j.status === "SELESAI") {
        techMap[tech].completedCount += 1;
        techMap[tech].revenue += j.totalPrice;
      }
    }

    const technicianStats = Object.entries(techMap)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.revenue - a.revenue);

    // 5. Breakdown by Input Staff
    const staffMembers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        _count: {
          select: { createdJobs: { where: baseWhere } },
        },
      },
    });

    const staffStats = await Promise.all(
      staffMembers.map(async (st) => {
        const rev = await prisma.job.aggregate({
          where: { ...baseWhere, createdById: st.id, status: "SELESAI" },
          _sum: { totalPrice: true },
        });
        return {
          id: st.id,
          name: st.name,
          username: st.username,
          role: st.role,
          jobCount: st._count.createdJobs,
          revenue: rev._sum.totalPrice || 0,
        };
      })
    );

    // 6. Recent Activities
    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, role: true } },
      },
    });

    // 7. Monthly Trend (Past 6 Months)
    const monthlyTrend: { month: string; jobs: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const monthPrefix = `${y}-${m}`;
      const monthName = d.toLocaleString("id-ID", { month: "short", year: "2-digit" });

      const count = await prisma.job.count({
        where: {
          isDeleted: false,
          scheduledDate: { startsWith: monthPrefix },
        },
      });

      const rev = await prisma.job.aggregate({
        where: {
          isDeleted: false,
          status: "SELESAI",
          scheduledDate: { startsWith: monthPrefix },
        },
        _sum: { totalPrice: true },
      });

      monthlyTrend.push({
        month: monthName,
        jobs: count,
        revenue: rev._sum.totalPrice || 0,
      });
    }

    // 8. Today's Jobs & Recent Jobs for Horizon Dashboard
    const todayJobsList = await prisma.job.findMany({
      where: { isDeleted: false, scheduledDate: todayStr },
      orderBy: [{ scheduledTime: "asc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { name: true, phone: true, address: true } },
        service: { select: { name: true, category: true } },
        createdBy: { select: { name: true } },
      },
    });

    const recentJobs = await prisma.job.findMany({
      where: { isDeleted: false },
      take: 6,
      orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
      include: {
        customer: { select: { name: true, phone: true, address: true } },
        service: { select: { name: true, category: true } },
        createdBy: { select: { name: true } },
      },
    });

    return NextResponse.json({
      metrics: {
        totalJobs,
        todayJobs,
        pendingJobs,
        scheduledJobs,
        inProgressJobs,
        completedJobs,
        cancelledJobs,
        totalRevenue: user.role === "STAFF_INPUT" ? null : totalRevenue,
        potentialRevenue: user.role === "STAFF_INPUT" ? null : potentialRevenue,
      },
      serviceStats,
      technicianStats,
      staffStats,
      financialSummary: user.role === "STAFF_INPUT" ? null : financialSummary,
      monthlyTrend: user.role === "STAFF_INPUT" ? [] : monthlyTrend,
      recentLogs,
      todayJobs: todayJobsList,
      recentJobs,
    });
  } catch (error: any) {
    console.error("Report error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

