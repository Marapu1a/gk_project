export const APP_TIME_ZONE = 'Europe/Moscow';

type DateValue = string | number | Date | null | undefined;
export type CalendarDateParts = { year: number; month: number; day: number };

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: APP_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year: number, month: number) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

export function parseCalendarDate(value: unknown): CalendarDateParts | null {
  if (typeof value !== 'string') return null;

  const match = DATE_ONLY_RE.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) return null;

  return { year, month, day };
}

function formatCalendarDate(parts: CalendarDateParts) {
  return `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}.${parts.year}`;
}

function parseDate(value: DateValue) {
  if (value == null || value === '') return null;
  const calendarDate = parseCalendarDate(value);
  if (typeof value === 'string' && DATE_ONLY_RE.test(value.trim()) && !calendarDate) return null;

  const date = value instanceof Date
    ? value
    : calendarDate
      ? new Date(`${String(calendarDate.year).padStart(4, '0')}-${String(calendarDate.month).padStart(2, '0')}-${String(calendarDate.day).padStart(2, '0')}T00:00:00+03:00`)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatOptionalDateRu(value: DateValue) {
  const calendarDate = parseCalendarDate(value);
  if (calendarDate) return formatCalendarDate(calendarDate);

  const date = parseDate(value);
  return date ? dateFormatter.format(date) : null;
}

export function formatDateRu(value: DateValue, fallback = '—') {
  return formatOptionalDateRu(value) ?? fallback;
}

export function formatDateTimeRu(value: DateValue, fallback = '—') {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : fallback;
}

export function formatTimeRu(value: DateValue, fallback = '—') {
  const date = parseDate(value);
  return date ? timeFormatter.format(date) : fallback;
}

export function toAppDateInputValue(value: Date = new Date()) {
  if (Number.isNaN(value.getTime())) return '';

  const parts = dateFormatter.formatToParts(value);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;

  return day && month && year ? `${year}-${month}-${day}` : '';
}
