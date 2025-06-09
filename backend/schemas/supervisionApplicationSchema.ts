// schemas/supervisionApplicationSchema.ts
import { z } from 'zod'

export const supervisionApplicationSchema = z.object({
  supervisorEmail: z.string().email(),
  hours: z.array(z.object({
    type: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']),
    value: z.number().positive(),
  })),
});
