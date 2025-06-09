import { z } from 'zod';

export const createCeuSchema = z.object({
  eventName: z.string().min(1),
  eventDate: z.string(), // ISO date
  fileId: z.string().optional(),
  entries: z
    .array(
      z.object({
        category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
        value: z.number().positive(),
      })
    )
    .min(1),
});
