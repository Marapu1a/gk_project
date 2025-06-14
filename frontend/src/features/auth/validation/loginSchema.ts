// src/features/auth/validation/loginSchema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email({ message: 'Некорректный email' }),
  password: z.string().min(6, 'Введите пароль'),
});

export type LoginDto = z.infer<typeof loginSchema>;
