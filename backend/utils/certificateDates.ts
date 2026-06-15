const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MSK_UTC_OFFSET_HOURS = 3;

function parseDateOnly(value: string) {
  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function toMoscowBoundaryDate(
  value: string,
  time: { hours: number; minutes: number; seconds: number; milliseconds: number },
) {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      time.hours - MSK_UTC_OFFSET_HOURS,
      time.minutes,
      time.seconds,
      time.milliseconds,
    ),
  );
}

export function parseCertificateIssuedAt(value: string) {
  return toMoscowBoundaryDate(value, {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
}

export function parseCertificateExpiresAt(value: string) {
  return toMoscowBoundaryDate(value, {
    hours: 23,
    minutes: 59,
    seconds: 59,
    milliseconds: 999,
  });
}
