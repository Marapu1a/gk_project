import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getCertificateRegistryStatus } from './certificateLifecycle';

const DAY_MS = 24 * 60 * 60 * 1000;

function displayName(user: { fullName: string | null; email: string }) {
  return user.fullName?.trim() || user.email;
}

async function createAdminCertificateTask(
  certificateId: string,
  user: { id: string; fullName: string | null; email: string },
  kind: 'SUSPENDED' | 'GRACE_EXPIRED',
  now: Date,
) {
  const notifiedField =
    kind === 'SUSPENDED' ? 'suspensionNotifiedAt' : 'graceExpiredNotifiedAt';

  return prisma.$transaction(async (tx) => {
    const admins = await tx.user.findMany({
      where: { role: 'ADMIN', archivedAt: null },
      select: { id: true },
    });

    if (!admins.length) return false;

    const claimed = await tx.certificate.updateMany({
      where: { id: certificateId, [notifiedField]: null },
      data:
        kind === 'GRACE_EXPIRED'
          ? { graceExpiredNotifiedAt: now, suspensionNotifiedAt: now }
          : { suspensionNotifiedAt: now },
    });

    if (!claimed.count) return false;

    const name = displayName(user);
    const message =
      kind === 'SUSPENDED'
        ? `Сертификат приостановлен у ${name}. Свяжитесь со специалистом.`
        : `60 дней приостановки сертификата истекли у ${name}. Требуется решение об отзыве.`;

    await tx.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: NotificationType.USER,
        message,
        link: `/admin/users/${encodeURIComponent(user.id)}`,
        isRead: false,
      })),
    });

    return true;
  });
}

export async function processCertificateLifecycleNotifications(now = new Date()) {
  const users = await prisma.user.findMany({
    where: {
      archivedAt: null,
      certificates: { some: { expiresAt: { lt: now } } },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      certificates: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: {
          id: true,
          expiresAt: true,
          suspensionNotifiedAt: true,
          graceExpiredNotifiedAt: true,
        },
      },
    },
  });

  let suspensionTasks = 0;
  let graceExpiredTasks = 0;

  for (const user of users) {
    const certificate = user.certificates[0];
    if (!certificate || certificate.expiresAt >= now) continue;

    const status = getCertificateRegistryStatus(certificate.expiresAt, now);

    if (status === 'GRACE_EXPIRED' && !certificate.graceExpiredNotifiedAt) {
      if (await createAdminCertificateTask(certificate.id, user, status, now)) {
        graceExpiredTasks += 1;
      }
      continue;
    }

    if (status === 'SUSPENDED' && !certificate.suspensionNotifiedAt) {
      if (await createAdminCertificateTask(certificate.id, user, status, now)) {
        suspensionTasks += 1;
      }
    }
  }

  return { suspensionTasks, graceExpiredTasks };
}

export function startCertificateLifecycleScheduler(log: {
  info: (data: unknown, message?: string) => void;
  error: (data: unknown, message?: string) => void;
}) {
  const run = async () => {
    try {
      const result = await processCertificateLifecycleNotifications();
      if (result.suspensionTasks || result.graceExpiredTasks) {
        log.info(result, 'Certificate lifecycle admin tasks created');
      }
    } catch (error) {
      log.error(error, 'Certificate lifecycle scheduler failed');
    }
  };

  void run();
  const timer = setInterval(() => void run(), DAY_MS);
  timer.unref();
  return timer;
}
