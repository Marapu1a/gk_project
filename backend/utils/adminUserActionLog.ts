import { prisma } from '../lib/prisma';

type AdminUserActionInput = {
  userId: string;
  adminId?: string | null;
  action: string;
  details?: string | null;
};

export async function logAdminUserAction({
  userId,
  adminId,
  action,
  details,
}: AdminUserActionInput) {
  await prisma.adminUserActionLog.create({
    data: {
      userId,
      adminId: adminId ?? null,
      action,
      details: details?.trim() || null,
    },
  });
}
