import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest, hasPermission } from "@/lib/auth";
import { sanitizePhoneNumber } from "@/lib/utils";
import { createNotification, createNotificationsForRole } from "@/lib/notifications";

// Generate Unique Job Number: RP-YYYYMMDD-XXXX
async function generateJobNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const datePrefix = `RP-${year}${month}${day}-`;

  const lastJobToday = await prisma.job.findFirst({
    where: {
      jobNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      jobNumber: "desc",
    },
    select: {
      jobNumber: true,
    },
  });

  let nextSequence = 1;
  if (lastJobToday && lastJobToday.jobNumber) {
    const parts = lastJobToday.jobNumber.split("-");
    const lastSeq = parseInt(parts[2], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  return `${datePrefix}${String(nextSequence).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const serviceId = searchParams.get("serviceId");
  const technician = searchParams.get("technician") || "";
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const poolOnly = searchParams.get("pool") === "true";
  const myJobsOnly = searchParams.get("myJobs") === "true";

  try {
    const whereClause: any = {
      isDeleted: false,
    };

    // Filter khusus pool order (tersedia untuk diambil teknisi)
    if (poolOnly) {
      whereClause.isPool = true;
      whereClause.assignedToId = null;
      whereClause.status = "DIDISPOSISIKAN";
    } else if (myJobsOnly && user.role === "STAFF_INPUT") {
      whereClause.OR = [
        { assignedToId: user.id },
        { createdById: user.id },
        { technicianName: { contains: user.name } },
      ];
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    if (serviceId) {
      whereClause.serviceId = parseInt(serviceId, 10);
    }

    if (technician) {
      whereClause.technicianName = {
        contains: technician,
      };
    }

    if (startDate && endDate) {
      whereClause.scheduledDate = {
        gte: startDate,
        lte: endDate,
      };
    } else if (startDate) {
      whereClause.scheduledDate = {
        gte: startDate,
      };
    } else if (endDate) {
      whereClause.scheduledDate = {
        lte: endDate,
      };
    }

    if (search) {
      whereClause.OR = [
        { jobNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { phone: { contains: search } } },
        { customer: { address: { contains: search } } },
        { technicianName: { contains: search } },
        { jobDetails: { contains: search } },
      ];
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: { id: true, name: true, username: true, phone: true },
        },
        validatedBy: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, username: true },
        },
        updatedBy: {
          select: { id: true, name: true },
        },
        photos: {
          select: {
            id: true,
            photoType: true,
            filePath: true,
            fileName: true,
            caption: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (error: any) {
    console.error("Fetch jobs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = getAuthFromRequest(req);
  if (!user || !hasPermission(user.role, ["OWNER", "ADMIN"])) {
    return NextResponse.json(
      { error: "Hanya Admin dan Owner yang memiliki akses mendaftarkan order pekerjaan baru" },
      { status: 403 }
    );
  }

  try {
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
      assignedToId,
      isPool,
      technicianCommission,
      basePrice,
      extraFee,
      discount,
      status,
      notes,
    } = body;

    if (!customerName || !customerPhone || !serviceId || !scheduledDate) {
      return NextResponse.json(
        { error: "Nama pelanggan, WhatsApp, Layanan, dan Tanggal jadwal wajib diisi!" },
        { status: 400 }
      );
    }

    const sanitizedPhone = sanitizePhoneNumber(customerPhone);

    // 1. Find or create Customer
    let customer = await prisma.customer.findUnique({
      where: { phone: sanitizedPhone },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          address: customerAddress || customer.address,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          phone: sanitizedPhone,
          address: customerAddress || "",
          notes: "",
        },
      });
    }

    // 2. Generate Job Number
    const jobNumber = await generateJobNumber();

    // 3. Compute Financials
    const numBasePrice = parseFloat(basePrice) || 0;
    const numExtraFee = parseFloat(extraFee) || 0;
    const numDiscount = parseFloat(discount) || 0;
    const totalPrice = Math.max(0, numBasePrice + numExtraFee - numDiscount);

    // Default komisi teknisi: 15% dari total harga jika tidak diatur manual
    const commission =
      technicianCommission !== undefined
        ? parseFloat(technicianCommission)
        : Math.round(totalPrice * 0.15);

    // Initial Status: Admin registers -> MENUNGGU_DISPOSISI
    const initialStatus =
      status || (assignedToId ? "DIDISPOSISIKAN" : isPool ? "DIDISPOSISIKAN" : "MENUNGGU_DISPOSISI");

    // 4. Create Job
    const job = await prisma.job.create({
      data: {
        jobNumber,
        customerId: customer.id,
        serviceId: parseInt(serviceId, 10),
        jobDetails: jobDetails || "",
        scheduledDate,
        scheduledTime: scheduledTime || null,
        technicianName: technicianName || "",
        assignedToId: assignedToId || null,
        isPool: Boolean(isPool),
        technicianCommission: commission,
        basePrice: numBasePrice,
        extraFee: numExtraFee,
        discount: numDiscount,
        totalPrice,
        status: initialStatus,
        notes: notes || "",
        createdById: user.id,
      },
      include: {
        customer: true,
        service: true,
        assignedTo: {
          select: { id: true, name: true, phone: true },
        },
        createdBy: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // 5. Update Customer Total Orders
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalOrders: { increment: 1 },
      },
    });

    // 6. Record Audit Log
    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entity: "JOB",
          entityId: job.id,
          jobId: job.id,
          details: `Job baru diregistrasi: ${jobNumber} (${customer.name}) oleh ${user.name}. Status: ${job.status}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {}

    // 7. Trigger In-App Notifications
    try {
      if (job.status === "MENUNGGU_DISPOSISI") {
        // Beritahu Owner bahwa ada order baru yang menunggu persetujuan / disposisi teknisi
        await createNotificationsForRole("OWNER", {
          title: "Order Baru Menunggu Disposisi",
          message: `${user.name} mendaftarkan ${job.jobNumber} (${job.service.name}) untuk ${customer.name}. Menunggu disposisi teknisi.`,
          type: "APPROVAL",
          linkUrl: `/jobs/${job.id}`,
        });
      } else if (assignedToId) {
        // Beritahu teknisi yang langsung ditugaskan
        await createNotification({
          userId: assignedToId,
          title: "Tugas Baru Ditugaskan ke Anda!",
          message: `Anda ditugaskan mengerjakan ${job.service.name} (${job.jobNumber}) untuk ${customer.name}.`,
          type: "DISPATCH",
          linkUrl: `/jobs/${job.id}`,
        });
      } else if (isPool) {
        // Beritahu semua teknisi bahwa order terbuka siap diklaim di antrean pool
        await createNotificationsForRole("STAFF_INPUT", {
          title: "Order Tersedia di Antrean Pool!",
          message: `Order ${job.service.name} (${job.jobNumber}) siap diambil di Antrean Terbuka.`,
          type: "POOL",
          linkUrl: `/jobs/${job.id}`,
        });
      }
    } catch (notifErr) {
      console.error("Failed to send job creation notification:", notifErr);
    }

    return NextResponse.json({ success: true, job }, { status: 201 });
  } catch (error: any) {
    console.error("Create job error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
