import { z } from 'zod';

const ceuActivityTypeSchema = z.enum([
  'TRAINING_ATTENDANCE',
  'PRESENTATION',
  'PUBLICATION',
  'TEACHING',
]);

export const createCeuSchema = z.object({
  eventName: z.string().min(1),
  eventDate: z.string(), // ISO date
  fileId: z.string().optional(),
  activityType: ceuActivityTypeSchema.optional(),
  entries: z
    .array(
      z.object({
        category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
        activityType: ceuActivityTypeSchema,
        value: z.number().positive().refine((value) => Number.isInteger(value * 2), {
          message: 'Баллы указываются с шагом 0,5',
        }),
      })
    )
    .min(1),
}).superRefine((data, ctx) => {
  const categories = data.entries.map((entry) => entry.category);
  if (new Set(categories).size !== categories.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['entries'],
      message: 'Каждую категорию CEU можно указать только один раз',
    });
  }
});
