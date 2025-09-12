// src/features/auth/validation/registerSchema.ts
import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const normalizeFullName = (s: string) =>
  s
    .replace(/\s+/g, ' ')  // схлопываем внутренние пробелы
    .trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

const normalizePhone = (raw: string) => {
  const digits = String(raw).replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
};

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().min(5, 'Введите email').email({ message: 'Некорректный email' }),

  // ВАЖНО: сначала валидации, потом transform
  fullName: z
    .string()
    .trim()
    .min(3, 'Введите полное имя')
    .max(100, 'Слишком длинное имя')
    .regex(/^[\p{L}\p{M}\s\-']+$/u, 'Имя может содержать только буквы, пробелы, дефисы и апострофы')
    .transform(normalizeFullName),

  phone: z
    .string()
    .transform(normalizePhone)
    .refine(val => isValidPhoneNumber(val), { message: 'Неверный номер' }),

  password: z.string().min(6, 'Минимум 6 символов').max(100, 'Слишком длинный пароль'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

export type RegisterDto = z.infer<typeof registerSchema>;
