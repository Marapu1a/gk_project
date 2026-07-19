import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { reportOperationalWarning } from '../lib/errorMonitoring';

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

export function normalizeNotificationType(type: NotificationType, message = '') {
  if (
    type === NotificationType.SUPERVISION &&
    message.toLowerCase().includes('ментор')
  ) {
    return NotificationType.MENTORSHIP;
  }

  return type;
}

export function normalizeNotificationLink(
  link: string | null | undefined,
  type: NotificationType,
  message = '',
) {
  if (!link) return null;

  const normalizedType = normalizeNotificationType(type, message);

  if (link === '/dashboard') return '/dashboard-v2';
  if (link === '/history') {
    return normalizedType === NotificationType.CEU
      ? '/ceu/points?panel=history'
      : '/supervision/hours?panel=history';
  }
  if (link === '/review/supervision') {
    return normalizedType === NotificationType.MENTORSHIP
      ? '/reviewer/candidates/mentorship?status=UNCONFIRMED'
      : '/reviewer/candidates/supervision?status=UNCONFIRMED';
  }

  return link;
}

export async function createNotification({
  userId,
  type,
  message,
  link = null,
}: CreateNotificationInput) {
  const normalizedType = normalizeNotificationType(type, message);

  return prisma.notification.create({
    data: {
      userId,
      type: normalizedType,
      message,
      link: normalizeNotificationLink(link, normalizedType, message),
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
      archivedAt: null,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (!admins.length) {
    reportOperationalWarning(
      'admin_notification',
      'Admin notification has no active recipients',
      { type },
    );
    return { count: 0, expectedCount: 0 };
  }

  const result = await prisma.notification.createMany({
    data: admins.map((admin) => {
      const normalizedType = normalizeNotificationType(type, message);

      return {
        userId: admin.id,
        type: normalizedType,
        message,
        link: normalizeNotificationLink(link, normalizedType, message),
        isRead: false,
      };
    }),
  });

  if (result.count !== admins.length) {
    reportOperationalWarning(
      'admin_notification',
      'Admin notification recipient count mismatch',
      { type, expectedCount: admins.length, actualCount: result.count },
    );
  }

  return { count: result.count, expectedCount: admins.length };
}
