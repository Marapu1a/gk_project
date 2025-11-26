// src/features/supervision/validation/supervisionRequestSchema.ts
import { z } from 'zod';

export const supervisionRequestSchema = z.object({
  supervisorEmail: z.string().email({ message: 'Неверный формат email' }),
  entries: z.array(
    z.object({
      // позволяем и SUPERVISOR — UI решает, кому его показывать
      type: z.enum(['PRACTICE', 'SUPERVISION', 'SUPERVISOR'], {
        errorMap: () => ({ message: 'Некорректный тип часов' }),
      }),
      value: z
        .number({ invalid_type_error: 'Введите число' })
        .positive({ message: 'Должно быть положительное число' })
    })
  ).min(1, { message: 'Нужно добавить хотя бы одну запись' }),
});

export type SupervisionRequestFormData = z.infer<typeof supervisionRequestSchema>;
