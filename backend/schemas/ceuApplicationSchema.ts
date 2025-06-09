// schemas/ceuApplicationSchema.ts
import { z } from 'zod'

export const ceuApplicationSchema = z.object({
  eventName: z.string().min(1),
  eventDate: z.string().datetime().or(z.string().min(1)),
  fileId: z.string().min(1),
  ceu: z.array(z.object({
    category: z.enum(['ETHICS', 'CULTURAL_DIVERSITY', 'SUPERVISION', 'GENERAL']),
    value: z.number().positive(),
  })),
});
