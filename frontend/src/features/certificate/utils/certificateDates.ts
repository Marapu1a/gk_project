import { APP_TIME_ZONE, parseCalendarDate } from '@/utils/dateFormat';

function getDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMoscowParts(value: string | null | undefined) {
  const date = getDate(value);
  if (!date) return null;

  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: APP_TIME_ZONE,
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

function getCertificateDateParts(value: string | null | undefined) {
  const calendarDate = parseCalendarDate(value);
  if (calendarDate) {
    return {
      day: String(calendarDate.day).padStart(2, '0'),
      month: String(calendarDate.month).padStart(2, '0'),
      year: String(calendarDate.year).padStart(4, '0'),
    };
  }

  return getMoscowParts(value);
}

export function formatCertificateDate(value: string | null | undefined) {
  const parts = getCertificateDateParts(value);
  return parts ? `${parts.day}.${parts.month}.${parts.year}` : '—';
}

export function toCertificateDateInputValue(value: string | null | undefined) {
  const parts = getCertificateDateParts(value);
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : '';
}

export function isCertificateDateActive(value: string | null | undefined) {
  const calendarDate = parseCalendarDate(value);
  if (calendarDate) {
    const today = getMoscowParts(new Date().toISOString());
    if (!today) return false;

    const expiryKey = `${String(calendarDate.year).padStart(4, '0')}-${String(calendarDate.month).padStart(2, '0')}-${String(calendarDate.day).padStart(2, '0')}`;
    const todayKey = `${today.year}-${today.month}-${today.day}`;
    return expiryKey >= todayKey;
  }

  const date = getDate(value);
  if (!date) return false;
  return date.getTime() >= Date.now();
}
