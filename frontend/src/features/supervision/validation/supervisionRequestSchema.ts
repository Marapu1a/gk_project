// src/features/supervision/validation/supervisionRequestSchema.ts
import { z } from 'zod';

export const supervisionRequestSchema = z.object({
  supervisorEmail: z.string().trim().email({ message: 'Неверный формат email' }),
  periodStartedAt: z.string().optional(),
  periodEndedAt: z.string().optional(),
  treatmentSetting: z.string().optional(),
  description: z.string().optional(),
  ethicsAccepted: z.boolean().optional(),
  draftDistribution: z
    .object({
      directIndividual: z.number().min(0),
      directGroup: z.number().min(0),
      nonObservingIndividual: z.number().min(0),
      nonObservingGroup: z.number().min(0),
    })
    .optional(),
  entries: z.array(
    z.object({
      // позволяем и SUPERVISOR — UI решает, кому его показывать
      type: z.enum(['PRACTICE', 'SUPERVISION', 'SUPERVISOR', 'IMPLEMENTING', 'PROGRAMMING'], {
        errorMap: () => ({ message: 'Некорректный тип часов' }),
      }),
      value: z
        .number({ invalid_type_error: 'Введите число' })
        .positive({ message: 'Должно быть положительное число' })
    })
  ).min(1, { message: 'Нужно добавить хотя бы одну запись' }),
});

export type SupervisionRequestFormData = z.infer<typeof supervisionRequestSchema>;
