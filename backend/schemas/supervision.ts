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

export const createSupervisionSchema = z.object({
  supervisorEmail: z.string().email(),
  fileId: z.string().optional(),

  entries: z
    .array(
      z.object({
        type: hourTypeEnum.optional(), // type может быть не передан (legacy клиенты)
        value: z.number().min(0.1),
      })
    )
    .min(1),
});
