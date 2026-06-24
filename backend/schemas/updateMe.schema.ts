import { z } from 'zod';
import {
  zFullNameRu,
  zFullNameLat,
  zPhone,
  zBirthDate,
  zCountry,
  zCity,
  zBio,
  zIbaoId,
} from '../shared/validation/profileFields';

// Обязательные поля (никогда не очищаются) — optional на уровне payload,
// т.к. PATCH может прислать только часть полей.
// Очищаемые поля — .nullish(): null очищает значение в БД, undefined пропускает.
export const updateMeSchema = z
  .object({
    fullName: zFullNameRu.optional(),
    fullNameLatin: zFullNameLat.optional(),
    avatarUrl: z.string().trim().max(500).optional(),

    phone: zPhone.nullish(),
    birthDate: zBirthDate.nullish(),
    country: zCountry.nullish(),
    city: zCity.nullish(),
    bio: zBio.nullish(),
    ibaoId: zIbaoId.nullish(),
  })
  .strict(); // лишние поля — 400

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
