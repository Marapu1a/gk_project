// schemas/supervisionApplicationSchema.ts
import { z } from 'zod';

// Допускаем старые и новые значения, чтобы не ломать старых клиентов
const hourTypeEnum = z.union([
  z.enum(['INSTRUCTOR', 'CURATOR', 'SUPERVISOR']), // legacy
  z.enum(['PRACTICE', 'SUPERVISION', 'SUPERVISOR']), // актуальные
]);

export const supervisionApplicationSchema = z.object({
  supervisorEmail: z.string().email(),
  hours: z.array(
    z.object({
      type: hourTypeEnum,
      value: z.number().positive(),
    })
  ),
});

// 🔹 Хелпер для нормализации типа внутри кода после валидации
export function normalizeHourType(
  type: 'INSTRUCTOR' | 'CURATOR' | 'SUPERVISOR' | 'PRACTICE' | 'SUPERVISION'
): 'PRACTICE' | 'SUPERVISION' | 'SUPERVISOR' {
  if (type === 'INSTRUCTOR') return 'PRACTICE';
  if (type === 'CURATOR') return 'SUPERVISION';
  return type; // SUPERVISOR / PRACTICE / SUPERVISION — как есть
}
