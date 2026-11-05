import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN", "STAFF_INPUT"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { status } = await req.json();
    const validStatuses = [
      "MENUNGGU_DISPOSISI",
      "DIDISPOSISIKAN",
      "MENUJU_LOKASI",
      "TIBA_DI_LOKASI",
      "DALAM_PENGERJAAN",
      "MENUNGGU_VALIDASI",
      "SELESAI",
      "DIBATALKAN",
      "PENDING",
      "DIJADWALKAN",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    // Staff input can only update their own job or jobs assigned to them
    if (user.role === "STAFF_INPUT" && job.createdById !== user.id && job.assignedToId !== user.id) {
      return NextResponse.json(
        { error: "Anda hanya dapat memperbarui status pekerjaan milik sendiri atau yang ditugaskan kepada Anda." },
        { status: 403 }
      );
    }

    const oldStatus = job.status;
    const completedAt =
      status === "SELESAI" && oldStatus !== "SELESAI"
        ? new Date()
        : status !== "SELESAI"
        ? null
        : job.completedAt;

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        status,
        updatedById: user.id,
        completedAt,
      },
    });

    // If job marked as SELESAI, increment customer total spent
    if (status === "SELESAI" && oldStatus !== "SELESAI") {
      await prisma.customer.update({
        where: { id: job.customerId },
        data: { totalSpent: { increment: job.totalPrice } },
      });
    }

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "STATUS_CHANGE",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: `Status ${job.jobNumber} diubah dari [${oldStatus}] menjadi [${status}] oleh ${user.name}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, job: updatedJob });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

