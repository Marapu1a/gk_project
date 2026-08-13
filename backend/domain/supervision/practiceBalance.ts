export type PracticeBalance = {
  implementing: number;
  programming: number;
};

export type PracticeDistribution = {
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getPracticeBalanceLimits(requiredPractice: number) {
  const minimumEach = round2(requiredPractice * 0.4);
  return {
    minimumEach,
    maximumEach: round2(requiredPractice - minimumEach),
  };
}

export function splitNeutralPracticeHours(value: number): PracticeBalance {
  const implementing = round2(value / 2);
  return {
    implementing,
    programming: round2(value - implementing),
  };
}

export function resolveCumulativePracticeBalance(params: {
  confirmed: PracticeBalance;
  pending?: PracticeBalance;
  correction?: PracticeBalance | null;
  neutralBonus?: number;
}): PracticeBalance {
  const correction = params.correction ?? { implementing: 0, programming: 0 };
  const confirmed = {
    implementing: round2(correction.implementing + params.confirmed.implementing),
    programming: round2(correction.programming + params.confirmed.programming),
  };
  const pending = params.pending ?? { implementing: 0, programming: 0 };
  const bonus = splitNeutralPracticeHours(params.neutralBonus ?? 0);

  return {
    implementing: round2(confirmed.implementing + pending.implementing + bonus.implementing),
    programming: round2(confirmed.programming + pending.programming + bonus.programming),
  };
}

export function resolveCumulativePracticeDistribution(params: {
  correction?: PracticeDistribution | null;
  added: PracticeDistribution;
}): PracticeDistribution {
  const correction = params.correction ?? {
    directIndividual: 0,
    directGroup: 0,
    nonObservingIndividual: 0,
    nonObservingGroup: 0,
  };
  return {
    directIndividual: round2(correction.directIndividual + params.added.directIndividual),
    directGroup: round2(correction.directGroup + params.added.directGroup),
    nonObservingIndividual: round2(
      correction.nonObservingIndividual + params.added.nonObservingIndividual,
    ),
    nonObservingGroup: round2(correction.nonObservingGroup + params.added.nonObservingGroup),
  };
}

export function getCumulativePracticeBalanceError(params: {
  requiredPractice: number;
  current: PracticeBalance;
  added: PracticeBalance;
}) {
  const { requiredPractice, current, added } = params;
  if (requiredPractice <= 0) return null;

  const { minimumEach, maximumEach } = getPracticeBalanceLimits(requiredPractice);
  const nextImplementing = round2(current.implementing + added.implementing);
  const nextProgramming = round2(current.programming + added.programming);

  if (added.implementing > 0 && nextImplementing > maximumEach) {
    return `Полевой практики в текущем цикле может быть не более ${maximumEach} часов: оставьте не менее ${minimumEach} часов для работы с информацией.`;
  }
  if (added.programming > 0 && nextProgramming > maximumEach) {
    return `Работы с информацией в текущем цикле может быть не более ${maximumEach} часов: оставьте не менее ${minimumEach} часов для полевой практики.`;
  }

  return null;
}

export function isPracticeBalanceComplete(params: {
  requiredPractice: number;
  current: PracticeBalance;
}) {
  const { requiredPractice, current } = params;
  if (requiredPractice <= 0) return true;

  const { minimumEach } = getPracticeBalanceLimits(requiredPractice);
  const implementing = round2(current.implementing);
  const programming = round2(current.programming);
  return (
    implementing >= minimumEach &&
    programming >= minimumEach &&
    round2(implementing + programming) >= round2(requiredPractice)
  );
}
