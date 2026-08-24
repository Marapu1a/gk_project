export type SupervisionDistributionValues = {
  directIndividual: number;
  directGroup: number;
  nonObservingIndividual: number;
  nonObservingGroup: number;
};

export type UndistributedSupervisionAllocation = {
  strategy: 'LEGACY_DISTRIBUTION' | 'CONFIRMED_RECORD';
  remainder: number;
  effectiveBefore: SupervisionDistributionValues;
  effectiveAfter: SupervisionDistributionValues;
};

export const EMPTY_SUPERVISION_DISTRIBUTION: SupervisionDistributionValues = {
  directIndividual: 0,
  directGroup: 0,
  nonObservingIndividual: 0,
  nonObservingGroup: 0,
};

export function roundSupervision(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

export function supervisionDistributionTotal(distribution: SupervisionDistributionValues) {
  return roundSupervision(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );
}

export function addToNonObservingIndividual(
  distribution: SupervisionDistributionValues,
  value: number,
): SupervisionDistributionValues {
  return {
    ...distribution,
    nonObservingIndividual: roundSupervision(distribution.nonObservingIndividual + value),
  };
}

export function planUndistributedSupervisionAllocation(params: {
  calculatedSupervision: number;
  confirmedRecordDistribution: SupervisionDistributionValues;
  legacyDistribution?: SupervisionDistributionValues | null;
  hasAdminCorrection: boolean;
}): UndistributedSupervisionAllocation | null {
  if (params.hasAdminCorrection) {
    throw new Error('Автоматическое распределение поверх админской корректировки запрещено');
  }

  const confirmedRecordTotal = supervisionDistributionTotal(
    params.confirmedRecordDistribution,
  );
  const strategy = confirmedRecordTotal > 0 ? 'CONFIRMED_RECORD' : 'LEGACY_DISTRIBUTION';
  const effectiveBefore =
    strategy === 'CONFIRMED_RECORD'
      ? params.confirmedRecordDistribution
      : params.legacyDistribution ?? EMPTY_SUPERVISION_DISTRIBUTION;
  const remainder = roundSupervision(
    Math.max(0, params.calculatedSupervision - supervisionDistributionTotal(effectiveBefore)),
  );

  if (remainder < 0.1) return null;

  const effectiveAfter = addToNonObservingIndividual(effectiveBefore, remainder);
  if (
    supervisionDistributionTotal(effectiveAfter) !==
    roundSupervision(params.calculatedSupervision)
  ) {
    throw new Error('После распределения сумма не совпадает с расчётной супервизией');
  }

  return {
    strategy,
    remainder,
    effectiveBefore,
    effectiveAfter,
  };
}
