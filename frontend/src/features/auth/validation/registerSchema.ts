// src/features/auth/validation/registerSchema.ts
import { z } from 'zod';

// ===== regex =====
const NAME_RX = /^[А-ЯЁа-яё\-ʼ' ]+$/;
const NAME_LAT_RX = /^[A-Za-z\-ʼ' ]+$/;

// ===== helpers =====
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
    .refine(
      v => v === '' || NAME_RX.test(v),
      `${label}: только кириллица, пробелы, дефис, апостроф`,
    );

const namePartLat = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label}: минимум 2 символа`)
    .max(60, `${label}: максимум 60 символов`)
    .refine(v => NAME_LAT_RX.test(v), `${label}: только латиница, пробелы, дефис, апостроф`);

const nonEmptyArray = (label: string) =>
  z.array(z.string().trim().min(1)).min(1, `Укажите ${label}`);

// ===== схема формы (UI) =====
export const registerInputSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(5, 'Введите email')
      .email('Некорректный email'),

    // ФИО (рус.)
    lastName: namePartRu('Фамилия (рус.)'),
    firstName: namePartRu('Имя (рус.)'),
    middleName: namePartRuOptional('Отчество (рус.)'),

    // ФИО (лат.)
    lastNameLatin: namePartLat('Фамилия (лат.)'),
    firstNameLatin: namePartLat('Имя (лат.)'),

    phone: z
      .string()
      .min(1, 'Введите телефон'),

    birthDate: z.string().min(1, 'Укажите дату рождения'),

    // КАК В РЕДАКТУРЕ
    countries: nonEmptyArray('страну'),
    cities: nonEmptyArray('город'),

    password: z.string().min(6, 'Минимум 6 символов').max(100),
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Пароли не совпадают',
  });

// ===== типы =====
export type RegisterFormValues = z.infer<typeof registerInputSchema>;

export type RegisterDto = {
  email: string;
  password: string;
  fullName: string;
  fullNameLatin: string;
  phone: string;
  birthDate: string;
  country: string;
  city: string;
};
