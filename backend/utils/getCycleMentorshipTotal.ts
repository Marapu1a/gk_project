import { PracticeLevel, RecordStatus, SupervisionAdminCorrectionKind } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { resolveCumulativeMentorshipTotal } from '../domain/supervision/mentorshipBalance';

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function getCycleMentorshipTotal(cycleId: string) {
  const [confirmed, pending, adminCorrection] = await Promise.all([
    prisma.supervisionHour.findMany({
      where: {
        status: RecordStatus.CONFIRMED,
        type: PracticeLevel.SUPERVISOR,
        record: { cycleId },
      },
      select: { value: true, reviewedAt: true },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        status: RecordStatus.UNCONFIRMED,
        type: PracticeLevel.SUPERVISOR,
        record: { cycleId },
      },
      _sum: { value: true },
    }),
    prisma.supervisionAdminCorrection.findUnique({
      where: {
        cycleId_kind: {
          cycleId,
          kind: SupervisionAdminCorrectionKind.MENTORSHIP,
        },
      },
      select: {
        id: true,
        userId: true,
        cycleId: true,
        adminId: true,
        mentor: true,
        notifyUser: true,
        createdAt: true,
        updatedAt: true,
        admin: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  const rawConfirmed = round2(confirmed.reduce((sum, hour) => sum + hour.value, 0));
  const pendingTotal = round2(pending._sum.value ?? 0);
  const confirmedTotal = resolveCumulativeMentorshipTotal({
    confirmed,
    correction: adminCorrection,
  });

  return {
    confirmed: confirmedTotal,
    rawConfirmed,
    pending: pendingTotal,
    adminCorrection,
  };
}
