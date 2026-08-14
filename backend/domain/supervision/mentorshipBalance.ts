export function resolveCumulativeMentorshipTotal(params: {
  confirmed: Array<{ value: number; reviewedAt: Date | null }>;
  correction?: { mentor: number; updatedAt: Date } | null;
}) {
  const effectiveConfirmed = params.correction
    ? params.confirmed.filter(
        (hour) => hour.reviewedAt != null && hour.reviewedAt > params.correction!.updatedAt,
      )
    : params.confirmed;

  return round2(
    (params.correction?.mentor ?? 0) +
      effectiveConfirmed.reduce((sum, hour) => sum + hour.value, 0),
  );
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}
