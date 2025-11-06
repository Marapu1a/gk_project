// schemas/createSupervisionSchema.ts
import { z } from 'zod';

// Принимаем старые и новые значения
const hourTypeEnum = z.union([
  z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']), // legacy
  z.enum(['PRACTICE', 'SUPERVISION', 'SUPERVISOR']), // новые
]);

export const createSupervisionSchema = z.object({
  supervisorEmail: z.string().email(),
  fileId: z.string().optional(),
  entries: z.array(
    z.object({
      type: hourTypeEnum,
      value: z.number().min(0.1),
    })
  ),
});

// Хелпер для нормализации
export function normalizeHourType(
  type: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | 'PRACTICE' | 'SUPERVISION'
): 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type;
}
