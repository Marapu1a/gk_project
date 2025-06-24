// src/features/supervision/validation/supervisionRequestSchema.ts
import { z } from 'zod';

export const supervisionRequestSchema = z.object({
  supervisorEmail: z.string().email({ message: 'Неверный формат email' }),

  entries: z
    .array(
      z.object({
        type: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']),
        value: z
          .number({ invalid_type_error: 'Введите число' })
          .positive({ message: 'Должно быть положительное число' })
          .max(200, { message: 'Слишком много часов' }),
      })
    )
    .min(1, { message: 'Нужно добавить хотя бы одну запись' }),
});

export type SupervisionRequestFormData = z.infer<typeof supervisionRequestSchema>;
