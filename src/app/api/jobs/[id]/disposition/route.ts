import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { createNotification, createNotificationsForRole } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json(
      { error: "Hanya Owner dan Admin yang memiliki akses disposisi pesanan" },
      { status: 403 }
    );
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { assignedToId, isPool, technicianCommission } = body;

    let updateData: any = {
      status: "DIDISPOSISIKAN",
      updatedById: user.id,
    };

    if (technicianCommission !== undefined) {
      updateData.technicianCommission = parseFloat(technicianCommission) || 0;
    }

    let detailMessage = "";

    if (isPool) {
      updateData.isPool = true;
      updateData.assignedToId = null;
      updateData.technicianName = "Pool Terbuka (Ambil Sendiri)";
      detailMessage = `Pesanan ${job.jobNumber} dibuka ke Pool Terbuka oleh ${user.name}`;
    } else if (assignedToId) {
      const technician = await prisma.user.findUnique({
        where: { id: assignedToId },
      });

      if (!technician) {
        return NextResponse.json({ error: "Teknisi tidak ditemukan" }, { status: 404 });
      }

      updateData.isPool = false;
      updateData.assignedToId = technician.id;
      updateData.technicianName = technician.name;
      detailMessage = `Pesanan ${job.jobNumber} didisposisikan kepada ${technician.name} oleh ${user.name}`;
    } else {
      return NextResponse.json(
        { error: "Pilih teknisi atau aktifkan mode Pool Pesanan" },
        { status: 400 }
      );
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: updateData,
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
          action: "DISPOSITION",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: detailMessage,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    // Trigger Notification
    try {
      if (isPool) {
        await createNotificationsForRole("STAFF_INPUT", {
          title: "Order Baru di Antrean Pool!",
          message: `${user.name} membuka tugas ${updatedJob.service.name} (${updatedJob.jobNumber}) untuk ${updatedJob.customer.name} ke antrean terbuka.`,
          type: "POOL",
          linkUrl: `/jobs/${updatedJob.id}`,
        });
      } else if (assignedToId) {
        await createNotification({
          userId: assignedToId,
          title: "Disposisi Penugasan Baru!",
          message: `${user.name} menugaskan pekerjaan ${updatedJob.service.name} (${updatedJob.jobNumber}) untuk ${updatedJob.customer.name} kepada Anda.`,
          type: "DISPATCH",
          linkUrl: `/jobs/${updatedJob.id}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send disposition notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: detailMessage,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Disposition error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

