import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { formatRupiah } from "@/lib/utils";
import path from "path";
import fs from "fs/promises";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json(
      { error: "Hanya Owner dan Admin yang memiliki otorisasi pencairan/transfer komisi" },
      { status: 403 }
    );
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: true,
        service: true,
        customer: true,
      },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    if (job.status !== "SELESAI") {
      return NextResponse.json(
        { error: "Komisi hanya dapat ditransfer setelah pekerjaan SELESAI divalidasi oleh Owner" },
        { status: 400 }
      );
    }

    let paymentMethod = "TRANSFER_BCA";
    let notes = "";
    let proofPath: string | null = null;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      paymentMethod = (formData.get("paymentMethod") as string) || "Transfer BCA";
      notes = (formData.get("notes") as string) || "";
      const file = formData.get("file") as File | null;

      if (file && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name) || ".jpg";
        const safeName = `proof_${Date.now()}${ext}`;
        const uploadDir = path.join(process.cwd(), "public", "uploads", "payouts", job.jobNumber);
        await fs.mkdir(uploadDir, { recursive: true });
        const fullPath = path.join(uploadDir, safeName);
        await fs.writeFile(fullPath, buffer);
        proofPath = `/uploads/payouts/${job.jobNumber}/${safeName}`;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      paymentMethod = body.paymentMethod || "Transfer BCA";
      notes = body.notes || "";
      proofPath = body.proofPath || null;
    }

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        commissionStatus: "PAID",
        commissionPaidAt: new Date(),
        commissionPaymentMethod: paymentMethod,
        commissionNotes: notes,
        ...(proofPath ? { commissionProofPath: proofPath } : {}),
        updatedById: user.id,
      },
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: { id: true, name: true, phone: true, username: true },
        },
        validatedBy: {
          select: { id: true, name: true },
        },
        photos: true,
        createdBy: true,
      },
    });

    // 1. Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "PAYOUT",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: `Owner ${user.name} mentransfer komisi ${formatRupiah(
            job.technicianCommission
          )} kepada ${job.technicianName || "Teknisi"} via ${paymentMethod}${notes ? ` (Catatan: ${notes})` : ""}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    // 2. Notify Technician
    if (job.assignedToId) {
      try {
        await createNotification({
          userId: job.assignedToId,
          title: "Komisi Ditransfer Owner! 💸",
          message: `Owner ${user.name} telah mentransfer komisi sebesar ${formatRupiah(
            job.technicianCommission
          )} untuk pekerjaan ${job.jobNumber} via ${paymentMethod}.`,
          type: "FINISHED",
          linkUrl: `/jobs/${job.id}`,
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Komisi ${formatRupiah(job.technicianCommission)} berhasil ditandai telah ditransfer!`,
      job: updatedJob,
    });
  } catch (error: any) {
    console.error("Commission payout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

