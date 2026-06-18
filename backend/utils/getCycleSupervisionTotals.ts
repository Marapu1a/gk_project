// src/utils/getCycleSupervisionTotals.ts
import { prisma } from '../lib/prisma';
import { PracticeLevel, TargetLevel, CycleType, SupervisionAdminCorrectionKind } from '@prisma/client';
import {
  calcAutoSupervisionHours,
  calcAutoRenewalSupervisionHours,
} from './supervisionRequirements';

type RuTargetLevel = 'Инструктор' | 'Куратор' | 'Супервизор';

export async function getCycleSupervisionTotals(
  cycleId: string,
  targetLevel: TargetLevel,
  extraConfirmedPracticeHours = 0
) {
  const practiceTypes = [
    PracticeLevel.PRACTICE,
    PracticeLevel.IMPLEMENTING,
    PracticeLevel.PROGRAMMING,
  ];

  const [cycle, confirmed, pending, adminCorrection] = await Promise.all([
    prisma.certificationCycle.findUnique({
      where: { id: cycleId },
      select: { type: true },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        status: 'CONFIRMED',
        type: { in: practiceTypes },
        record: { cycleId },
      },
      _sum: { value: true },
    }),
    prisma.supervisionHour.aggregate({
      where: {
        status: 'UNCONFIRMED',
        type: { in: practiceTypes },
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
        implementing: true,
        programming: true,
        directIndividual: true,
        directGroup: true,
        nonObservingIndividual: true,
        nonObservingGroup: true,
        updatedAt: true,
      },
    }),
  ]);

  const correctionPractice =
    adminCorrection ? adminCorrection.implementing + adminCorrection.programming : null;
  const correctionSupervision = adminCorrection
    ? adminCorrection.directIndividual +
      adminCorrection.directGroup +
      adminCorrection.nonObservingIndividual +
      adminCorrection.nonObservingGroup
    : null;

  const practiceConfirmedRaw = correctionPractice ?? confirmed._sum.value ?? 0;
  const practicePending = pending._sum.value ?? 0;

  const practiceConfirmed = practiceConfirmedRaw + extraConfirmedPracticeHours;
  const practiceTotalWithPending = practiceConfirmed + practicePending;

  const groupName = mapTargetLevel(targetLevel);
  const isRenewal = cycle?.type === CycleType.RENEWAL;

  const supervisionConfirmed =
    correctionSupervision ??
    (isRenewal
      ? calcAutoRenewalSupervisionHours({
        groupName,
        practiceHours: practiceConfirmed,
      })
      : calcAutoSupervisionHours({
        groupName,
        practiceHours: practiceConfirmed,
      }));

  const supervisionTotalWithPending = isRenewal
    ? calcAutoRenewalSupervisionHours({
      groupName,
      practiceHours: practiceTotalWithPending,
    })
    : calcAutoSupervisionHours({
      groupName,
      practiceHours: practiceTotalWithPending,
    });

  const supervisionPending = Math.max(
    0,
    supervisionTotalWithPending - supervisionConfirmed
  );

  return {
    practiceConfirmedRaw,
    practiceConfirmed,
    practicePending,
    practiceTotalWithPending,
    extraConfirmedPracticeHours,

    supervisionConfirmed,
    supervisionPending,
    supervisionTotalWithPending,
    adminCorrection,
  };
}

function mapTargetLevel(level: TargetLevel): RuTargetLevel {
  if (level === 'INSTRUCTOR') return 'Инструктор';
  if (level === 'CURATOR') return 'Куратор';
  return 'Супервизор';
}
