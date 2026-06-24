import { PracticeLevel, RecordStatus, SupervisionAdminCorrectionKind } from '@prisma/client';
import { prisma } from '../lib/prisma';

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const PRACTICE_TYPES = [
  PracticeLevel.PRACTICE,
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
];

/**
 * Возвращает админскую корректировку часов практики/супервизии (kind=PRACTICE)
 * и «сырую» подтверждённую практику (для отображения «было → стало»).
 */
export async function getCyclePracticeCorrection(cycleId: string) {
  const [rawConfirmed, adminCorrection] = await Promise.all([
    prisma.supervisionHour.aggregate({
      where: {
        status: RecordStatus.CONFIRMED,
        type: { in: PRACTICE_TYPES },
        record: { cycleId },
      },
      _sum: { value: true },
    }),
    prisma.supervisionAdminCorrection.findUnique({
      where: {
        cycleId_kind: {
          cycleId,
          kind: SupervisionAdminCorrectionKind.PRACTICE,
        },
      },
      select: {
        id: true,
        cycleId: true,
        adminId: true,
        implementing: true,
        programming: true,
        directIndividual: true,
        directGroup: true,
        nonObservingIndividual: true,
        nonObservingGroup: true,
        notifyUser: true,
        createdAt: true,
        updatedAt: true,
        admin: { select: { id: true, fullName: true, email: true } },
      },
    }),
  ]);

  const rawPractice = round2(rawConfirmed._sum.value ?? 0);
  const correctedPractice = adminCorrection
    ? round2(adminCorrection.implementing + adminCorrection.programming)
    : rawPractice;

  return {
    rawPractice, // «было»
    correctedPractice, // «стало»
    adminCorrection,
  };
}
