import { z } from 'zod';

export const createSupervisionSchema = z.object({
  supervisorEmail: z.string().email(),
  fileId: z.string().optional(),
  entries: z.array(
    z.object({
      type: z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']),
      value: z.number().min(0.1),
    })
  ),
});
