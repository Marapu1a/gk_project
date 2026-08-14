import { PracticeLevel } from '@prisma/client';
import { splitLegacyPractice } from './legacyPracticeRequest';

export const SUPERVISION_HISTORY_HOUR_TYPES = [
  PracticeLevel.IMPLEMENTING,
  PracticeLevel.PROGRAMMING,
  PracticeLevel.SUPERVISOR,
  PracticeLevel.PRACTICE,
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.SUPERVISION,
];

const LEGACY_HISTORY_HOUR_TYPES = new Set<PracticeLevel>([
  PracticeLevel.PRACTICE,
  PracticeLevel.INSTRUCTOR,
  PracticeLevel.CURATOR,
  PracticeLevel.SUPERVISION,
]);

export function isLegacySupervisionHistoryRecord(
  hours: Array<{ type: PracticeLevel }>,
) {
  return hours.some((hour) => LEGACY_HISTORY_HOUR_TYPES.has(hour.type));
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function aggregateSupervisionHistoryHours(
  hours: Array<{ type: PracticeLevel; value: number }>,
) {
  let implementing = 0;
  let programming = 0;
  let legacyPractice = 0;
  let mentor = 0;

  for (const hour of hours) {
    if (hour.type === PracticeLevel.IMPLEMENTING) implementing += hour.value;
    if (hour.type === PracticeLevel.PROGRAMMING) programming += hour.value;
    if (
      hour.type === PracticeLevel.PRACTICE ||
      hour.type === PracticeLevel.INSTRUCTOR ||
      hour.type === PracticeLevel.CURATOR
    ) {
      legacyPractice += hour.value;
    }
    if (
      hour.type === PracticeLevel.SUPERVISOR ||
      hour.type === PracticeLevel.SUPERVISION
    ) {
      mentor += hour.value;
    }
  }

  const legacy = splitLegacyPractice(legacyPractice);
  return {
    implementing: round2(implementing + legacy.implementing),
    programming: round2(programming + legacy.programming),
    mentor: round2(mentor),
  };
}
