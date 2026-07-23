export type PendingPracticeRecord = {
  id: string;
  practice: number;
  shouldConvert: boolean;
};

export type LegacyPracticeConversion = {
  id: string;
  practice: number;
  implementing: number;
  programming: number;
  nonObservingIndividual: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function splitLegacyPractice(practice: number) {
  const implementing = round2(practice / 2);
  return {
    implementing,
    programming: round2(practice - implementing),
  };
}

export function planLegacyPracticeConversions(params: {
  confirmedPractice: number;
  practiceToSupervisionRatio: number | null;
  pendingRecords: PendingPracticeRecord[];
}) {
  const { practiceToSupervisionRatio, pendingRecords } = params;
  let cumulativePractice = params.confirmedPractice;

  return pendingRecords.reduce<LegacyPracticeConversion[]>((result, record) => {
    const before = cumulativePractice;
    cumulativePractice = round2(cumulativePractice + record.practice);

    if (!record.shouldConvert) return result;

    const split = splitLegacyPractice(record.practice);
    const nonObservingIndividual =
      practiceToSupervisionRatio && practiceToSupervisionRatio > 0
        ? Math.max(
            0,
            Math.floor(cumulativePractice / practiceToSupervisionRatio) -
              Math.floor(before / practiceToSupervisionRatio),
          )
        : 0;

    result.push({
      id: record.id,
      practice: round2(record.practice),
      implementing: split.implementing,
      programming: split.programming,
      nonObservingIndividual,
    });

    return result;
  }, []);
}
