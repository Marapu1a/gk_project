// src/features/auth/validation/registerSchema.ts
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';

function capitalizeWords(input: string) {
  return input
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const registerSchema = z
  .object({
    email: z.string().email({ message: 'Некорректный email' }),
    fullName: z
      .string()
      .trim()
      .min(3, 'Введите полное имя')
      .max(100, 'Слишком длинное имя')
      .regex(/^[\p{L}\p{M}\s\-']+$/u, 'Имя может содержать только буквы, пробелы, дефисы и апострофы')
      .transform(capitalizeWords),
    phone: z
      .string()
      .transform((val) => (val.startsWith('+') ? val : '+' + val))
      .refine((val) => isValidPhoneNumber(val), {
        message: 'Неверный номер',
      }),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type RegisterDto = z.infer<typeof registerSchema>;
