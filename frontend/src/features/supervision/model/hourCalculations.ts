import {
  formatDecimalInput,
  normalizeDecimalInput,
  parseDecimalInput,
  sanitizeDecimalInput,
} from '@/utils/decimalInput';

export type SupervisionDistribution = {
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
};

export function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function formatHours(value: number | null | undefined) {
  if (value == null) return '0';
  return formatDecimalInput(value, 2);
}

export function parseHours(value: string) {
  const parsed = parseDecimalInput(value);
  if (parsed == null) return 0;
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function sanitizeHoursInput(rawValue: string) {
  return sanitizeDecimalInput(rawValue, { maxDecimals: 2 });
}

export function normalizeHoursInput(value: string, max?: number | null) {
  return normalizeDecimalInput(value, { max, maxDecimals: 2 });
}

export function calculateRemainingHours(
  required: number | null | undefined,
  ...usedValues: number[]
) {
  if (required == null) return null;
  const used = usedValues.reduce((sum, value) => sum + value, 0);
  return Math.max(0, roundHours(required - used));
}

export function calculateExpectedSupervision(params: {
  practice: number;
  requiredPractice?: number | null;
  requiredSupervision?: number | null;
}) {
  const { practice, requiredPractice, requiredSupervision } = params;
  if (!requiredPractice || !requiredSupervision || requiredPractice <= 0 || requiredSupervision <= 0) {
    return 0;
  }

  const ratio = requiredPractice / requiredSupervision;
  return Math.min(
    Math.max(0, Math.floor(practice / ratio)),
    requiredSupervision,
  );
}

export function calculateIncrementalSupervision(params: {
  basePractice: number;
  addedPractice: number;
  requiredPractice?: number | null;
  requiredSupervision?: number | null;
  remainingSupervision?: number | null;
}) {
  const {
    basePractice,
    addedPractice,
    requiredPractice,
    requiredSupervision,
    remainingSupervision,
  } = params;

  if (!requiredPractice || !requiredSupervision || requiredPractice <= 0 || requiredSupervision <= 0) {
    return 0;
  }

  const ratio = requiredPractice / requiredSupervision;
  const calculated = Math.max(
    0,
    Math.floor((basePractice + addedPractice) / ratio) - Math.floor(basePractice / ratio),
  );

  return remainingSupervision == null
    ? calculated
    : Math.min(calculated, Math.max(0, remainingSupervision));
}

export function getCumulativePracticeRuleError(params: {
  requiredPractice?: number | null;
  currentImplementing: number;
  currentProgramming: number;
  addedImplementing: number;
  addedProgramming: number;
}) {
  const {
    requiredPractice,
    currentImplementing,
    currentProgramming,
    addedImplementing,
    addedProgramming,
  } = params;
  if (!requiredPractice || requiredPractice <= 0) return null;

  const minimumEach = roundHours(requiredPractice * 0.4);
  const maximumEach = roundHours(requiredPractice - minimumEach);
  const nextImplementing = roundHours(currentImplementing + addedImplementing);
  const nextProgramming = roundHours(currentProgramming + addedProgramming);

  if (addedImplementing > 0 && nextImplementing > maximumEach) {
    return `Полевой практики в текущем цикле может быть не более ${maximumEach} часов: оставьте не менее ${minimumEach} часов для работы с информацией.`;
  }
  if (addedProgramming > 0 && nextProgramming > maximumEach) {
    return `Работы с информацией в текущем цикле может быть не более ${maximumEach} часов: оставьте не менее ${minimumEach} часов для полевой практики.`;
  }

  return null;
}

export function splitNeutralPracticeHours(value: number) {
  const implementing = roundHours(value / 2);
  return {
    implementing,
    programming: roundHours(value - implementing),
  };
}

export function resolvePracticeBalance(params: {
  implementing: number;
  programming: number;
  neutralHours?: number;
}) {
  const neutral = splitNeutralPracticeHours(params.neutralHours ?? 0);
  return {
    implementing: roundHours(params.implementing + neutral.implementing),
    programming: roundHours(params.programming + neutral.programming),
  };
}

export function getPracticeRequirementState(params: {
  requiredPractice?: number | null;
  implementing: number;
  programming: number;
}) {
  const requiredPractice = roundHours(params.requiredPractice ?? 0);
  const implementing = roundHours(params.implementing);
  const programming = roundHours(params.programming);
  if (requiredPractice <= 0) {
    return { totalComplete: true, balanceComplete: true, complete: true, minimumEach: 0 };
  }

  const minimumEach = roundHours(requiredPractice * 0.4);
  const totalComplete = roundHours(implementing + programming) >= requiredPractice;
  const balanceComplete = implementing >= minimumEach && programming >= minimumEach;
  return {
    totalComplete,
    balanceComplete,
    complete: totalComplete && balanceComplete,
    minimumEach,
  };
}

export function summarizeSupervisionDistribution(
  distribution: SupervisionDistribution,
  expectedSupervision: number,
) {
  const directTotal = roundHours(distribution.directIndividual + distribution.directGroup);
  const nonObservingTotal = roundHours(
    distribution.nonObservingIndividual + distribution.nonObservingGroup,
  );
  const distributionTotal = roundHours(directTotal + nonObservingTotal);
  const groupTotal = roundHours(distribution.directGroup + distribution.nonObservingGroup);

  return {
    directTotal,
    nonObservingTotal,
    distributionTotal,
    groupTotal,
    distributionRemaining: roundHours(expectedSupervision - distributionTotal),
  };
}

export function getDistributionRuleError(params: {
  expectedSupervision: number;
  distributionTotal: number;
  groupTotal: number;
  distributionRemaining: number;
}) {
  const { expectedSupervision, distributionTotal, groupTotal, distributionRemaining } = params;

  if (expectedSupervision <= 0) {
    return distributionTotal > 0
      ? 'Пока расчетная супервизия равна 0, распределять часы супервизии нельзя.'
      : null;
  }

  if (Math.abs(distributionRemaining) >= 0.01) {
    return 'Сумма распределенных часов должна совпадать с расчетной супервизией.';
  }

  if (groupTotal > expectedSupervision * 0.5) {
    return 'Часов в группе может быть не более 50% от всех часов супервизии.';
  }

  return null;
}
