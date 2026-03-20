// src/utils/getCycleSupervisionTotals.ts
import { prisma } from '../lib/prisma';
import { PracticeLevel, TargetLevel } from '@prisma/client';
import { calcAutoSupervisionHours } from './supervisionRequirements';

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

  const [confirmed, pending] = await Promise.all([
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
  ]);

  const practiceConfirmedRaw = confirmed._sum.value ?? 0;
  const practicePending = pending._sum.value ?? 0;

  const practiceConfirmed = practiceConfirmedRaw + extraConfirmedPracticeHours;
  const practiceTotalWithPending = practiceConfirmed + practicePending;

  const groupName = mapTargetLevel(targetLevel);

  const supervisionConfirmed = calcAutoSupervisionHours({
    groupName,
    practiceHours: practiceConfirmed,
  });

  const supervisionTotalWithPending = calcAutoSupervisionHours({
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
  };
}

function mapTargetLevel(level: TargetLevel): RuTargetLevel {
  if (level === 'INSTRUCTOR') return 'Инструктор';
  if (level === 'CURATOR') return 'Куратор';
  return 'Супервизор';
}
