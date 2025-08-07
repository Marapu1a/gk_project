import { z } from 'zod';

export const updatePaymentSchema = z.object({
  status: z.enum(['UNPAID', 'PENDING', 'PAID']),
  comment: z.string().optional(),
});
