// schemas/createSupervisionSchema.ts
import { z } from 'zod';

// Разрешаем старые и новые значения ради совместимости.
// Хендлер всё равно будет нормализовывать/проверять их.
const hourTypeEnum = z.enum([
  'INSTRUCTOR',   // legacy
  'CURATOR',      // legacy
  'SUPERVISOR',   // mentor hours

  'PRACTICE',     // legacy practice total
  'SUPERVISION',  // legacy след (если где-то остался)

  'IMPLEMENTING', // новый подтип практики
  'PROGRAMMING',  // новый подтип практики
]);

const draftDistributionSchema = z.object({
  directIndividual: z.coerce.number().finite().min(0),
  directGroup: z.coerce.number().finite().min(0),
  nonObservingIndividual: z.coerce.number().finite().min(0),
  nonObservingGroup: z.coerce.number().finite().min(0),
});

export const createSupervisionSchema = z.object({
  supervisorEmail: z.string().trim().email(),
  fileId: z.string().optional(),
  periodStartedAt: z.coerce.date().optional(),
  periodEndedAt: z.coerce.date().optional(),
  treatmentSetting: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  ethicsAccepted: z.boolean().optional(),
  draftDistribution: draftDistributionSchema.optional(),

  entries: z
    .array(
      z.object({
        type: hourTypeEnum.optional(), // type может быть не передан (legacy клиенты)
        value: z.number().min(0.1),
      })
    )
    .min(1),
});
