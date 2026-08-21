export function roundDistributionHours(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getMaximumGroupHours(expectedSupervision: number) {
  if (expectedSupervision <= 0) return 0;
  return roundDistributionHours(expectedSupervision * 0.5);
}

export function getDistributionPracticeLinkError(params: {
  implementing: number;
  programming: number;
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
  };
}) {
  const directTotal = roundDistributionHours(
    params.distribution.directIndividual + params.distribution.directGroup,
  );
  const nonObservingTotal = roundDistributionHours(
    params.distribution.nonObservingIndividual + params.distribution.nonObservingGroup,
  );

  if (params.implementing <= 0 && directTotal > 0) {
    return 'Чтобы указать часы супервизии с наблюдением, добавьте часы полевой практики.';
  }
  if (params.programming <= 0 && nonObservingTotal > 0) {
    return 'Чтобы указать часы супервизии без наблюдения, добавьте часы работы с информацией.';
  }

  return null;
}

export function getSupervisionDistributionError(params: {
  expectedSupervision: number;
  distribution: {
    directIndividual: number;
    directGroup: number;
    nonObservingIndividual: number;
    nonObservingGroup: number;
  };
  baseSupervision?: number;
  baseGroup?: number;
}) {
  const {
    expectedSupervision,
    distribution,
    baseSupervision = 0,
    baseGroup = 0,
  } = params;
  const distributionTotal = roundDistributionHours(
    distribution.directIndividual +
      distribution.directGroup +
      distribution.nonObservingIndividual +
      distribution.nonObservingGroup,
  );
  const groupTotal = roundDistributionHours(
    distribution.directGroup + distribution.nonObservingGroup,
  );

  if (expectedSupervision <= 0) {
    return distributionTotal > 0
      ? 'Пока расчетная супервизия равна 0, распределять часы нельзя.'
      : null;
  }

  if (Math.abs(expectedSupervision - distributionTotal) >= 0.01) {
    return 'Сумма часов, распределённых по типам супервизии, должна совпадать с рассчитанным количеством часов супервизии.';
  }

  if (
    roundDistributionHours(baseGroup + groupTotal) >
    getMaximumGroupHours(roundDistributionHours(baseSupervision + expectedSupervision))
  ) {
    return 'Часов групповой супервизии может быть не более 50% от всех часов супервизии.';
  }

  return null;
}
