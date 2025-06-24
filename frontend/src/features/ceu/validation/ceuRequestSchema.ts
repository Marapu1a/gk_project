import { z } from 'zod';

export const ceuRequestSchema = z.object({
  eventName: z.string().min(3, 'Введите название мероприятия'),

  eventDate: z
    .string()
    .refine(
      (val) => {
        const date = new Date(val);
        const now = new Date();
        const min = new Date('2010-01-01');
        return !isNaN(date.getTime()) && date >= min && date <= now;
      },
      'Дата должна быть между 2010 годом и сегодня',
    ),

  fileId: z.string().min(1, 'Файл обязателен'),

  entries: z
    .array(
      z.object({
        category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
        value: z.number().min(0.1, 'Минимум 0.1'),
      }),
    )
    .min(1, 'Добавьте хотя бы один балл'),
});

export type CeuRequestFormData = z.infer<typeof ceuRequestSchema>;
