import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { sanitizePhoneNumber } from "@/lib/utils";

export async function GET(
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
        service: true,
        createdBy: {
          select: { id: true, name: true, username: true, role: true },
        },
        updatedBy: {
          select: { id: true, name: true, username: true },
        },
        assignedTo: {
          select: { id: true, name: true, username: true, phone: true },
        },
        validatedBy: {
          select: { id: true, name: true, username: true },
        },
        photos: {
          include: {
            uploadedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          include: {
            user: {
              select: { id: true, name: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN", "STAFF_INPUT"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existingJob = await prisma.job.findUnique({
      where: { id: params.id },
      include: { customer: true },
    });

    if (!existingJob || existingJob.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    // Role check: Staff Input can only edit their own jobs
    if (user.role === "STAFF_INPUT" && existingJob.createdById !== user.id) {
      return NextResponse.json(
        { error: "Anda hanya memiliki izin untuk mengedit pekerjaan yang Anda input sendiri." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      customerAddress,
      serviceId,
      jobDetails,
      scheduledDate,
      scheduledTime,
      technicianName,
      basePrice,
      extraFee,
      discount,
      status,
      notes,
      assignedToId,
      isPool,
      technicianCommission,
    } = body;

    // Update customer info if changed
    if (customerName || customerPhone || customerAddress) {
      const sanitizedPhone = customerPhone ? sanitizePhoneNumber(customerPhone) : existingJob.customer.phone;
      await prisma.customer.update({
        where: { id: existingJob.customerId },
        data: {
          name: customerName || existingJob.customer.name,
          phone: sanitizedPhone,
          address: customerAddress !== undefined ? customerAddress : existingJob.customer.address,
        },
      });
    }

    const numBasePrice = basePrice !== undefined ? parseFloat(basePrice) : existingJob.basePrice;
    const numExtraFee = extraFee !== undefined ? parseFloat(extraFee) : existingJob.extraFee;
    const numDiscount = discount !== undefined ? parseFloat(discount) : existingJob.discount;
    const totalPrice = Math.max(0, numBasePrice + numExtraFee - numDiscount);

    const oldStatus = existingJob.status;
    const newStatus = status || existingJob.status;
    const completedAt =
      newStatus === "SELESAI" && oldStatus !== "SELESAI"
        ? new Date()
        : newStatus !== "SELESAI"
        ? null
        : existingJob.completedAt;

    const updatedJob = await prisma.job.update({
      where: { id: params.id },
      data: {
        serviceId: serviceId ? parseInt(serviceId, 10) : existingJob.serviceId,
        jobDetails: jobDetails !== undefined ? jobDetails : existingJob.jobDetails,
        scheduledDate: scheduledDate || existingJob.scheduledDate,
        scheduledTime: scheduledTime !== undefined ? scheduledTime : existingJob.scheduledTime,
        technicianName: technicianName !== undefined ? technicianName : existingJob.technicianName,
        basePrice: numBasePrice,
        extraFee: numExtraFee,
        discount: numDiscount,
        totalPrice,
        status: newStatus,
        notes: notes !== undefined ? notes : existingJob.notes,
        assignedToId: assignedToId !== undefined ? assignedToId : existingJob.assignedToId,
        isPool: isPool !== undefined ? isPool : existingJob.isPool,
        technicianCommission: technicianCommission !== undefined ? parseFloat(technicianCommission) : existingJob.technicianCommission,
        updatedById: user.id,
        completedAt,
      },
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: { id: true, name: true, username: true, phone: true },
        },
      },
    });

    // Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: oldStatus !== newStatus ? "STATUS_CHANGE" : "UPDATE",
          entity: "JOB",
          entityId: updatedJob.id,
          jobId: updatedJob.id,
          details: `Perubahan pada ${updatedJob.jobNumber} oleh ${user.name}${
            oldStatus !== newStatus ? ` (Status: ${oldStatus} -> ${newStatus})` : ""
          }`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, job: updatedJob });
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
      { error: "Hanya Owner yang memiliki izin menghapus pekerjaan." },
      { status: 403 }
    );
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    // Soft delete
    await prisma.job.update({
      where: { id: params.id },
      data: {
        isDeleted: true,
        updatedById: user.id,
      },
    });

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        entity: "JOB",
        entityId: job.id,
        jobId: job.id,
        details: `Pekerjaan ${job.jobNumber} dihapus oleh Owner (${user.name})`,
        ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
      },
    });

    return NextResponse.json({ success: true, message: `Pekerjaan ${job.jobNumber} berhasil dihapus.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

