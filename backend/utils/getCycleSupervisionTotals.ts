// src/utils/getCycleSupervisionTotals.ts
import { prisma } from '../lib/prisma';
import { PracticeLevel, TargetLevel, CycleType, SupervisionAdminCorrectionKind } from '@prisma/client';
import {
  calcAutoSupervisionHours,
  calcAutoRenewalSupervisionHours,
} from './supervisionRequirements';
import { targetLevelToGroupName as mapTargetLevel } from '../domain/levels';
import { aggregatePracticeBreakdown } from '../domain/supervision/practiceBreakdown';
import {
  resolveCumulativePracticeBalance,
  resolveCumulativePracticeDistribution,
} from '../domain/supervision/practiceBalance';

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

  const [
    cycle,
    confirmed,
    pending,
    adminCorrection,
    confirmedDistributionRecords,
    pendingDistributionRecords,
  ] = await Promise.all([
    prisma.certificationCycle.findUnique({
      where: { id: cycleId },
      select: { type: true },
    }),
    prisma.supervisionHour.groupBy({
      by: ['type'],
      where: {
        status: 'CONFIRMED',
        type: { in: practiceTypes },
        record: { cycleId },
      },
      _sum: { value: true },
    }),
    prisma.supervisionHour.groupBy({
      by: ['type'],
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
    prisma.supervisionRecord.findMany({
      where: {
        cycleId,
        hours: {
          some: {
            status: 'CONFIRMED',
            type: { in: practiceTypes },
          },
          every: { status: 'CONFIRMED' },
        },
      },
      select: {
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
        hours: {
          where: {
            status: 'CONFIRMED',
            type: { in: practiceTypes },
          },
          select: { reviewedAt: true },
        },
      },
    }),
    prisma.supervisionRecord.findMany({
      where: {
        cycleId,
        hours: {
          some: {
            status: 'UNCONFIRMED',
            type: { in: practiceTypes },
          },
          every: { status: 'UNCONFIRMED' },
        },
      },
      select: {
        draftDirectIndividual: true,
        draftDirectGroup: true,
        draftNonObservingIndividual: true,
        draftNonObservingGroup: true,
      },
    }),
  ]);

  const confirmedBreakdown = aggregatePracticeBreakdown(confirmed);
  const pendingBreakdown = aggregatePracticeBreakdown(pending);
  const confirmedRowsAfterCorrection = adminCorrection
    ? await prisma.supervisionHour.groupBy({
          by: ['type'],
          where: {
            status: 'CONFIRMED',
            type: { in: practiceTypes },
            reviewedAt: { gt: adminCorrection.updatedAt },
            record: { cycleId },
          },
          _sum: { value: true },
        })
    : null;
  const confirmedAfterCorrection = confirmedRowsAfterCorrection
    ? aggregatePracticeBreakdown(confirmedRowsAfterCorrection)
    : confirmedBreakdown;
  const effectiveRawBalance = resolveCumulativePracticeBalance({
    confirmed: confirmedAfterCorrection,
    correction: adminCorrection,
  });
  const practiceConfirmedRaw = round2(
    effectiveRawBalance.implementing + effectiveRawBalance.programming,
  );
  const practicePending = pendingBreakdown.total;

  const confirmedBalance = resolveCumulativePracticeBalance({
    confirmed: effectiveRawBalance,
    neutralBonus: extraConfirmedPracticeHours,
  });

  const effectiveDistributionRecords = adminCorrection
    ? confirmedDistributionRecords.filter((record) =>
        record.hours.some(
          (hour) => hour.reviewedAt != null && hour.reviewedAt > adminCorrection.updatedAt,
        ),
      )
    : confirmedDistributionRecords;
  const addedDistribution = sumDistribution(effectiveDistributionRecords);
  const practiceDistributionConfirmed = resolveCumulativePracticeDistribution({
    correction: adminCorrection,
    added: addedDistribution,
  });
  const practiceDistributionPending = sumDistribution(pendingDistributionRecords);
  const correctionSupervision = adminCorrection
    ? round2(
        practiceDistributionConfirmed.directIndividual +
          practiceDistributionConfirmed.directGroup +
          practiceDistributionConfirmed.nonObservingIndividual +
          practiceDistributionConfirmed.nonObservingGroup,
      )
    : null;

  const practiceConfirmed = practiceConfirmedRaw + extraConfirmedPracticeHours;
  const practiceTotalWithPending = practiceConfirmed + practicePending;

  const groupName = mapTargetLevel(targetLevel);
  const isRenewal = cycle?.type === CycleType.RENEWAL;

  const calcSupervision = (practiceHours: number) =>
    isRenewal
      ? calcAutoRenewalSupervisionHours({
          groupName,
          practiceHours,
        })
      : calcAutoSupervisionHours({
          groupName,
          practiceHours,
        });

  const supervisionConfirmed =
    correctionSupervision == null
      ? calcSupervision(practiceConfirmed)
      : Math.max(correctionSupervision, calcSupervision(practiceConfirmed));

  const supervisionTotalWithPending = calcSupervision(practiceTotalWithPending);

  const supervisionPending = Math.max(
    0,
    supervisionTotalWithPending - supervisionConfirmed
  );

  return {
    practiceConfirmedRaw,
    practiceConfirmed,
    practicePending,
    practiceTotalWithPending,
    practiceImplementingConfirmedRaw: effectiveRawBalance.implementing,
    practiceProgrammingConfirmedRaw: effectiveRawBalance.programming,
    practiceImplementingConfirmed: confirmedBalance.implementing,
    practiceProgrammingConfirmed: confirmedBalance.programming,
    practiceImplementingPending: pendingBreakdown.implementing,
    practiceProgrammingPending: pendingBreakdown.programming,
    extraConfirmedPracticeHours,

    supervisionConfirmed,
    supervisionPending,
    supervisionTotalWithPending,
    practiceDistributionConfirmed,
    practiceDistributionPending,
    adminCorrection,
  };
}

type DistributionRecord = {
  draftDirectIndividual: number | null;
  draftDirectGroup: number | null;
  draftNonObservingIndividual: number | null;
  draftNonObservingGroup: number | null;
};

function sumDistribution(records: DistributionRecord[]) {
  return records.reduce(
    (sum, record) => ({
      directIndividual: sum.directIndividual + (record.draftDirectIndividual ?? 0),
      directGroup: sum.directGroup + (record.draftDirectGroup ?? 0),
      nonObservingIndividual:
        sum.nonObservingIndividual + (record.draftNonObservingIndividual ?? 0),
      nonObservingGroup: sum.nonObservingGroup + (record.draftNonObservingGroup ?? 0),
    }),
    {
      directIndividual: 0,
      directGroup: 0,
      nonObservingIndividual: 0,
      nonObservingGroup: 0,
    },
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
