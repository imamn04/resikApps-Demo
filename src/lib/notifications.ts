import { prisma } from "@/lib/prisma";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: "DISPATCH" | "APPROVAL" | "VALIDATION" | "FINISHED" | "POOL" | "INFO";
  linkUrl?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "INFO",
        linkUrl: params.linkUrl,
      },
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

export async function createNotificationsForRole(
  role: "OWNER" | "ADMIN" | "STAFF_INPUT",
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const users = await prisma.user.findMany({
      where: { role, isActive: true },
      select: { id: true },
    });

    if (users.length === 0) return [];

    return await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: params.title,
        message: params.message,
        type: params.type || "INFO",
        linkUrl: params.linkUrl,
      })),
    });
  } catch (err) {
    console.error(`Failed to create notifications for role ${role}:`, err);
    return [];
  }
}

