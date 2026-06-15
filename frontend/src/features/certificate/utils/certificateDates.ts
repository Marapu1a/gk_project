const MOSCOW_TIME_ZONE = 'Europe/Moscow';

function getDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMoscowParts(value: string | null | undefined) {
  const date = getDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: MOSCOW_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  if (!day || !month || !year) return null;
  return { day, month, year };
}

export function formatCertificateDate(value: string | null | undefined) {
  const parts = getMoscowParts(value);
  return parts ? `${parts.day}.${parts.month}.${parts.year}` : '—';
}

export function toCertificateDateInputValue(value: string | null | undefined) {
  const parts = getMoscowParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function isCertificateDateActive(value: string | null | undefined) {
  const date = getDate(value);
  if (!date) return false;
  return date.getTime() >= Date.now();
}
