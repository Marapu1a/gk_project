import { PracticeLevel } from '@prisma/client';
import { splitLegacyPractice } from './legacyPracticeRequest';

export type GroupedPracticeHours = {
  type: PracticeLevel;
  _sum: { value: number | null };
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function aggregatePracticeBreakdown(rows: GroupedPracticeHours[]) {
  let implementing = 0;
  let programming = 0;

  for (const row of rows) {
    const value = row._sum.value ?? 0;
    if (row.type === PracticeLevel.IMPLEMENTING) implementing += value;
    if (row.type === PracticeLevel.PROGRAMMING) programming += value;
    if (row.type === PracticeLevel.PRACTICE) {
      const split = splitLegacyPractice(value);
      implementing += split.implementing;
      programming += split.programming;
    }
  }

  return {
    implementing: round2(implementing),
    programming: round2(programming),
    total: round2(implementing + programming),
  };
}

export function separateLegacyPracticeFromBalance(params: {
  implementing: number;
  programming: number;
  legacy: number;
}) {
  const legacy = splitLegacyPractice(params.legacy);
  return {
    implementing: round2(Math.max(0, params.implementing - legacy.implementing)),
    programming: round2(Math.max(0, params.programming - legacy.programming)),
  };
}
