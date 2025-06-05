// src/validators/auth.ts
import { z } from 'zod'

export const registerSchema = z
  .object({
    email: z.string().email('Невалидный email'),
    firstName: z.string().min(1, 'Укажите имя'),
    lastName: z.string().min(1, 'Укажите фамилию'),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+7\d{10}$/.test(val),
        { message: 'Введите номер в формате +7XXXXXXXXXX' }
      ),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  email: z.string().email('Невалидный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export type RegisterFormData = z.infer<typeof registerSchema>

export type LoginFormData = z.infer<typeof loginSchema>

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
