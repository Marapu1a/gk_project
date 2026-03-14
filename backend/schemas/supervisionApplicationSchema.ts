// schemas/supervisionApplicationSchema.ts
import { z } from 'zod';

// ✅ Только новая модель. Легаси больше не принимаем.
export const hourTypeEnum = z.enum(['PRACTICE', 'SUPERVISOR']);

export const supervisionApplicationSchema = z.object({
  supervisorEmail: z.string().email(),
  hours: z.array(
    z.object({
      type: hourTypeEnum,
      value: z.number().positive(),
    })
  ),
});
