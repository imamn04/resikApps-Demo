import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { createNotificationsForRole } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["STAFF_INPUT", "ADMIN", "OWNER"])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    if (!job.isPool) {
      return NextResponse.json(
        { error: "Pekerjaan ini sudah diambil atau bukan bagian dari antrean Pool terbuka" },
        { status: 400 }
      );
    }

    if (job.status === "SELESAI" || job.status === "DIBATALKAN") {
      return NextResponse.json(
        { error: "Status pekerjaan ini sudah selesai atau dibatalkan" },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        isPool: false,
        assignedToId: user.id,
        technicianName: user.name,
        status: "DIDISPOSISIKAN",
        updatedById: user.id,
      },
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CLAIM_ORDER",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: `Pesanan ${job.jobNumber} berhasil diklaim/diambil oleh teknisi ${user.name} dari Pool Terbuka`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    // Trigger Notification to Owner & Admin
    try {
      await Promise.all([
        createNotificationsForRole("OWNER", {
          title: "Order Diklaim oleh Teknisi",
          message: `Teknisi ${user.name} telah mengambil pesanan ${job.jobNumber} (${updatedJob.service.name}) dari antrean terbuka.`,
          type: "DISPATCH",
          linkUrl: `/jobs/${job.id}`,
        }),
        createNotificationsForRole("ADMIN", {
          title: "Order Diklaim oleh Teknisi",
          message: `Teknisi ${user.name} telah mengambil pesanan ${job.jobNumber} (${updatedJob.service.name}) dari antrean terbuka.`,
          type: "DISPATCH",
          linkUrl: `/jobs/${job.id}`,
        }),
      ]);
    } catch (notifErr) {
      console.error("Failed to send claim notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengambil pesanan ${job.jobNumber}!`,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Claim error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

