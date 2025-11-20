// src/features/auth/validation/registerSchema.ts
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

// ===== helpers =====
const NAME_RX = /^[А-ЯЁа-яё\-ʼ' ]+$/; // кириллица + пробел/дефис/апостроф
const NAME_LAT_RX = /^[A-Za-z\-ʼ' ]+$/; // латиница + пробел/дефис/апостроф

const titleCaseRu = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map(token =>
      token
        .split('-')
        .map(p => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');

const titleCaseEn = (s: string) =>
  s
    .trim()
    .split(/\s+/)
    .map(token =>
      token
        .split('-')
        .map(p => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
        .join('-'),
    )
    .join(' ');

const normalizePhone = (raw: string) => {
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
};

const namePartRu = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: минимум 2 символа`)
    .max(60, `${label}: максимум 60 символов`)
    .refine(v => NAME_RX.test(v), `${label}: только кириллица, пробелы, дефис, апостроф`);

const namePartRuOptional = (label: string) =>
  z
    .string()
    .trim()
    .max(60, `${label}: максимум 60 символов`)
    .refine(v => v === '' || NAME_RX.test(v), `${label}: только кириллица, пробелы, дефис, апостроф`);

const namePartLat = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: минимум 2 символа`)
    .max(60, `${label}: максимум 60 символов`)
    .refine(v => NAME_LAT_RX.test(v), `${label}: только латиница, пробелы, дефис, апостроф`);

// ===== схема ввода (UI -> форма) =====
export const registerInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(5, 'Введите email')
      .email({ message: 'Некорректный email' }),

    // Русское ФИО
    lastName: namePartRu('Фамилия (рус.)'),
    firstName: namePartRu('Имя (рус.)'),
    middleName: namePartRuOptional('Отчество (рус., при наличии)'),

    // Латинское ФИО (без отчества)
    lastNameLatin: namePartLat('Фамилия (лат.)'),
    firstNameLatin: namePartLat('Имя (лат.)'),

    phone: z
      .string()
      .transform(normalizePhone)
      .refine(val => isValidPhoneNumber(val), { message: 'Неверный номер' }),

    password: z.string().min(6, 'Минимум 6 символов').max(100, 'Слишком длинный пароль'),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

// ===== схема для API (трансформируем в fullName / fullNameLatin) =====
export const registerSchema = registerInputSchema.transform(d => {
  // RU
  const ln = titleCaseRu(d.lastName);
  const fn = titleCaseRu(d.firstName);
  const mn = d.middleName ? titleCaseRu(d.middleName) : '';
  const fullName = [ln, fn, mn].filter(Boolean).join(' ');

  // LAT — ТОЛЬКО фамилия + имя
  const lnLat = titleCaseEn(d.lastNameLatin);
  const fnLat = titleCaseEn(d.firstNameLatin);
  const fullNameLatin = [lnLat, fnLat].filter(Boolean).join(' ');

  return {
    email: d.email,
    phone: d.phone,
    password: d.password,
    confirmPassword: d.confirmPassword,
    fullName,
    fullNameLatin,
  };
});

// типы
export type RegisterFormValues = z.infer<typeof registerInputSchema>;
export type RegisterDto = z.infer<typeof registerSchema>;
