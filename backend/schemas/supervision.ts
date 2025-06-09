import { z } from 'zod';

export const createSupervisionSchema = z.object({
  fileId: z.string().optional(),
  entries: z
    .array(
      z.object({
        type: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']),
        value: z.number().positive(),
      })
    )
    .min(1),
});
