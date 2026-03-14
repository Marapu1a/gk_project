// schemas/createSupervisionSchema.ts
import { z } from 'zod';

// Принимаем старые и новые значения ТОЛЬКО ради совместимости.
// В новой модели type может игнорироваться/нормализоваться на стороне хендлера.
const hourTypeEnum = z.enum([
  'INSTRUCTOR',   // legacy
  'CURATOR',      // legacy
  'SUPERVISOR',   // legacy + new (mentor)
  'PRACTICE',     // new
  'SUPERVISION',  // legacy-след (если где-то остался)
]);

export const createSupervisionSchema = z.object({
  supervisorEmail: z.string().email(),
  fileId: z.string().optional(),
  entries: z.array(
    z.object({
      type: hourTypeEnum.optional(), // <-- важное: опционально
      value: z.number().min(0.1),
    })
  ),
});
