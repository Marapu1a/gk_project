import { z } from 'zod';

export const updateMeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(100).optional(),
    fullNameLatin: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    birthDate: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ожидается формат YYYY-MM-DD'),
        z.string().datetime(),
      ])
      .optional(),
    country: z.string().trim().max(100).optional(),
    city: z.string().trim().max(100).optional(),
    avatarUrl: z.string().trim().max(500).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  .strict(); // лишние поля — 400

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
