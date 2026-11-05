import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { createNotification, createNotificationsForRole } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        photos: true,
      },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json();
    const { action, checkinNotes, notes } = body;

    let updateData: any = {
      updatedById: user.id,
    };
    let auditAction = "STATUS_CHANGE";
    let auditDetail = "";

    switch (action) {
      case "OTW": {
        // Teknisi berangkat menuju lokasi
        if (user.role === "STAFF_INPUT" && job.assignedToId && job.assignedToId !== user.id) {
          return NextResponse.json(
            { error: "Pekerjaan ini ditugaskan ke teknisi lain" },
            { status: 403 }
          );
        }
        updateData.status = "MENUJU_LOKASI";
        auditDetail = `Teknisi ${user.name} sedang menuju lokasi pekerjaan ${job.jobNumber}`;
        break;
      }

      case "CHECKIN": {
        // Tiba di lokasi
        if (user.role === "STAFF_INPUT" && job.assignedToId && job.assignedToId !== user.id) {
          return NextResponse.json(
            { error: "Pekerjaan ini ditugaskan ke teknisi lain" },
            { status: 403 }
          );
        }
        updateData.status = "TIBA_DI_LOKASI";
        updateData.checkinAt = new Date();
        if (checkinNotes) {
          updateData.checkinNotes = checkinNotes;
        }
        auditDetail = `Teknisi ${user.name} check-in tiba di lokasi ${job.jobNumber}${
          checkinNotes ? `: "${checkinNotes}"` : ""
        }`;
        break;
      }

      case "PROGRESS": {
        // Mulai pengerjaan
        if (user.role === "STAFF_INPUT" && job.assignedToId && job.assignedToId !== user.id) {
          return NextResponse.json(
            { error: "Pekerjaan ini ditugaskan ke teknisi lain" },
            { status: 403 }
          );
        }
        updateData.status = "DALAM_PENGERJAAN";
        if (notes) {
          updateData.notes = notes;
        }
        auditDetail = `Teknisi ${user.name} memulai pengerjaan fisik ${job.jobNumber}`;
        break;
      }

      case "FINISH": {
        // Teknisi menyelesaikan pekerjaan, submit untuk validasi Owner
        if (user.role === "STAFF_INPUT" && job.assignedToId && job.assignedToId !== user.id) {
          return NextResponse.json(
            { error: "Pekerjaan ini ditugaskan ke teknisi lain" },
            { status: 403 }
          );
        }
        updateData.status = "MENUNGGU_VALIDASI";
        if (notes) {
          updateData.notes = notes;
        }
        auditDetail = `Teknisi ${user.name} menyelesaikan pekerjaan ${job.jobNumber} dan mengajukan validasi ke Owner`;
        break;
      }

      case "VALIDATE": {
        // Owner memvalidasi dan menyelesaikan order + persetujuan komisi
        if (!hasPermission(user.role, ["OWNER", "ADMIN"])) {
          return NextResponse.json(
            { error: "Hanya Owner (atau Admin) yang berhak memvalidasi penyelesaian order" },
            { status: 403 }
          );
        }
        updateData.status = "SELESAI";
        updateData.completedAt = new Date();
        updateData.validatedAt = new Date();
        updateData.validatedById = user.id;

        // Update customer total spent
        await prisma.customer.update({
          where: { id: job.customerId },
          data: { totalSpent: { increment: job.totalPrice } },
        });

        auditAction = "VALIDATION";
        auditDetail = `Owner ${user.name} menyetujui (validasi) penyelesaian pekerjaan & komisi ${job.jobNumber}`;
        break;
      }

      default:
        return NextResponse.json(
          { error: `Aksi tahapan stepper '${action}' tidak valid` },
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
        validatedBy: {
          select: { id: true, name: true },
        },
        photos: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: auditAction,
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: auditDetail,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    // Trigger Notification
    try {
      if (action === "FINISH") {
        await createNotificationsForRole("OWNER", {
          title: "Pekerjaan Selesai & Menunggu Validasi",
          message: `Teknisi ${user.name} telah menyelesaikan order ${job.jobNumber} (${job.customer.name}). Silakan periksa bukti foto dan lakukan validasi.`,
          type: "VALIDATION",
          linkUrl: `/jobs/${job.id}`,
        });
      } else if (action === "VALIDATE" && updatedJob.assignedToId) {
        await createNotification({
          userId: updatedJob.assignedToId,
          title: "Order Selesai & Komisi Disetujui!",
          message: `Pekerjaan ${job.jobNumber} telah divalidasi oleh Owner (${user.name}). Komisi Rp ${job.technicianCommission.toLocaleString("id-ID")} disetujui!`,
          type: "FINISHED",
          linkUrl: `/jobs/${job.id}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send stepper notification:", notifErr);
    }

    return NextResponse.json({
      success: true,
      action,
      message: auditDetail,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Stepper action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

