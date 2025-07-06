import { z } from 'zod';

export const ceuReviewSearchSchema = z.object({
  email: z.string().email('Некорректный email'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});
