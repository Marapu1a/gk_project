import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  message: string;
  link?: string | null;
};

type NotifyAdminsInput = {
  type: NotificationType;
  message: string;
  link?: string | null;
  excludeUserId?: string | null;
};

export async function createNotification({
  userId,
  type,
  message,
  link = null,
}: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      message,
      link,
      isRead: false,
    },
  });
}

export async function notifyAdmins({
  type,
  message,
  link = null,
  excludeUserId = null,
}: NotifyAdminsInput) {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (!admins.length) return { count: 0 };

  const result = await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      type,
      message,
      link,
      isRead: false,
    })),
  });

  return { count: result.count };
}
