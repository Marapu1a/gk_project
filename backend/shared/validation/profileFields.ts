// ╔══════════════════════════════════════════════════════════════════════╗
// ║  КАНОНИЧЕСКИЙ ИСТОЧНИК ПРАВИЛ ВАЛИДАЦИИ ПРОФИЛЯ                          ║
// ║  Файл продублирован (KEEP IN SYNC):                                     ║
// ║    frontend/src/shared/validation/profileFields.ts                      ║
// ║    backend/shared/validation/profileFields.ts                           ║
// ║  При изменении правил — править ОБА файла идентично.                     ║
// ╚══════════════════════════════════════════════════════════════════════╝
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// ===== charset =====
export const NAME_RU_RX = /^[А-ЯЁа-яё\-ʼ' ]+$/;
export const NAME_LAT_RX = /^[A-Za-z\-ʼ' ]+$/;

// ===== диапазон даты рождения (защита от опечаток) =====
export const BIRTH_DATE_MIN = '1940-01-01';
export const MIN_AGE_YEARS = 16;

const DATE_ONLY_RX = /^\d{4}-\d{2}-\d{2}$/;

// ===== телефон =====
/** Нормализует телефон к виду +XXXXXXXX */
export function normalizePhone(raw: string): string {
  const digits = String(raw ?? '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function toDateOnly(value: string): string | null {
  if (DATE_ONLY_RX.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Возвращает текст ошибки для даты рождения либо null, если всё ок. */
export function birthDateError(value: string): string | null {
  const dateOnly = toDateOnly(value);
  if (!dateOnly) return 'Некорректная дата';
  if (dateOnly < BIRTH_DATE_MIN) {
    return `Дата не может быть раньше ${BIRTH_DATE_MIN.slice(0, 4)} года`;
  }

  const now = new Date();
  const maxDate = new Date(
    Date.UTC(now.getUTCFullYear() - MIN_AGE_YEARS, now.getUTCMonth(), now.getUTCDate()),
  );
  if (dateOnly > maxDate.toISOString().slice(0, 10)) {
    return `Возраст должен быть не меньше ${MIN_AGE_YEARS} лет`;
  }

  return null;
}

// ===== поля-кусочки ФИО (для форм по частям) =====
export const zNameRuRequired = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: минимум 2 символа`)
    .max(60, `${label}: максимум 60 символов`)
    .refine((v) => NAME_RU_RX.test(v), `${label}: только кириллица, пробелы, дефис, апостроф`);

export const zNameRuOptional = (label: string) =>
  z
    .string()
    .trim()
    .max(60, `${label}: максимум 60 символов`)
    .refine(
      (v) => v === '' || NAME_RU_RX.test(v),
      `${label}: только кириллица, пробелы, дефис, апостроф`,
    );

export const zNameLatRequired = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: минимум 2 символа`)
    .max(60, `${label}: максимум 60 символов`)
    .refine((v) => NAME_LAT_RX.test(v), `${label}: только латиница, пробелы, дефис, апостроф`);

// ===== составное ФИО (для payload на бэкенд) =====
export const zFullNameRu = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((v) => NAME_RU_RX.test(v), 'ФИО: только кириллица, пробелы, дефис, апостроф');

export const zFullNameLat = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((v) => NAME_LAT_RX.test(v), 'ФИО латиницей: только латиница, пробелы, дефис, апостроф');

// ===== телефон / дата / прочее =====
export const zPhone = z
  .string()
  .trim()
  .max(30)
  .refine((v) => {
    const phone = normalizePhone(v);
    return phone === '' || isValidPhoneNumber(phone);
  }, 'Некорректный номер телефона');

export const zBirthDate = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (v === '') return;
    const error = birthDateError(v);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  });

export const zCountry = z.string().trim().max(100);
export const zCity = z.string().trim().max(100);
export const zBio = z.string().trim().max(500);
export const zIbaoId = z.string().trim().max(100);
