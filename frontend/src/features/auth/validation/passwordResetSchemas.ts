import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Введите корректный email'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Минимум 6 символов'),
});
