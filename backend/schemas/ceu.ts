import { z } from 'zod'

export const createCEUSchema = z.object({
  event_name: z.string().min(1),
  event_date: z.coerce.date(), // преобразует строку в Date
  file_id: z.string().min(1),
  ceu_ethics: z.number().min(0),
  ceu_cult_diver: z.number().min(0),
  ceu_superv: z.number().min(0),
  ceu_general: z.number().min(0),
})
