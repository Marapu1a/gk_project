// backend/schemas/supervisionDistributionSchema.ts
import { z } from 'zod';

export const supervisionDistributionSchema = z.object({
  directIndividual: z.coerce.number().finite().min(0),
  directGroup: z.coerce.number().finite().min(0),
  nonObservingIndividual: z.coerce.number().finite().min(0),
  nonObservingGroup: z.coerce.number().finite().min(0),
});

export type SupervisionDistributionInput = z.infer<
  typeof supervisionDistributionSchema
>;
