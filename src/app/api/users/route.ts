import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json({ error: "Hanya Owner dan Admin yang dapat mengakses daftar pengguna" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { createdJobs: { where: { isDeleted: false } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Hanya Owner yang dapat menambah akun" }, { status: 403 });
  }

  try {
    const { name, username, password, role, phone, email } = await req.json();

    if (!name || !username || !password || !role) {
      return NextResponse.json({ error: "Nama, username, password, dan role wajib diisi" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Username sudah digunakan, pilih username lain" }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        username: username.trim(),
        email: email ? email.trim().toLowerCase() : null,
        password: passwordHash,
        role,
        phone: phone || null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entity: "USER",
          entityId: newUser.id,
          details: `User baru dibuat: ${newUser.username} (${newUser.role}) oleh ${user.name}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "Hanya Owner yang dapat mengubah akun" }, { status: 403 });
  }

  try {
    const { id, name, role, phone, isActive, newPassword } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "User ID wajib disertakan" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (newPassword && newPassword.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        isActive: true,
      },
    });

    // Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE",
          entity: "USER",
          entityId: updated.id,
          details: `Akun ${updated.username} diperbarui oleh Owner (${user.name})`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

