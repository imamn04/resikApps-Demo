import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN", "STAFF_INPUT"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
    });

    if (!job || job.isDeleted) {
      return NextResponse.json({ error: "Pekerjaan tidak ditemukan" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const photoType = (formData.get("photoType") as string) || "BEFORE";
    const caption = (formData.get("caption") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "File foto tidak ditemukan" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "jobs", job.jobNumber);
    await fs.mkdir(uploadsDir, { recursive: true });

    // File naming: [photoType]_[timestamp]_[originalName]
    const ext = path.extname(file.name) || ".jpg";
    const safeName = `${photoType.toLowerCase()}_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, safeName);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/jobs/${job.jobNumber}/${safeName}`;

    // Record to database
    const validPhotoType = ["BEFORE", "AFTER", "CHECKIN"].includes(photoType) ? photoType : "BEFORE";
    const jobPhoto = await prisma.jobPhoto.create({
      data: {
        jobId: job.id,
        photoType: validPhotoType as any,
        filePath: publicUrl,
        fileName: file.name,
        fileSize: buffer.length,
        caption: caption.trim(),
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: `Foto dokumentasi [${photoType}] ditambahkan pada ${job.jobNumber} oleh ${user.name}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, photo: jobPhoto });
  } catch (error: any) {
    console.error("Photo upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { photoId } = await req.json();
    if (!photoId) {
      return NextResponse.json({ error: "Photo ID wajib disertakan" }, { status: 400 });
    }

    const photo = await prisma.jobPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.jobId !== params.id) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
    }

    // Try deleting physical file if exists
    try {
      const fullPath = path.join(process.cwd(), "public", photo.filePath);
      await fs.unlink(fullPath);
    } catch {
      // ignore file not found
    }

    await prisma.jobPhoto.delete({
      where: { id: photoId },
    });

    return NextResponse.json({ success: true, message: "Foto berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

