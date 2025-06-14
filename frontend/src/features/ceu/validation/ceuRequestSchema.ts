// src/features/ceu/validation/ceuRequestSchema.ts
import { z } from 'zod';

export const ceuRequestSchema = z.object({
  eventName: z.string().min(3, 'Введите название мероприятия'),
  eventDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Введите корректную дату'
  ),
  file: z
    .instanceof(File)
    .optional()
    .or(z.literal(undefined)),
  entries: z
    .array(
      z.object({
        category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
        value: z.number().min(0.1, 'Минимум 0.1'),
      })
    )
    .min(1, 'Добавьте хотя бы один балл'),
});

export type CeuRequestFormData = z.infer<typeof ceuRequestSchema>;
