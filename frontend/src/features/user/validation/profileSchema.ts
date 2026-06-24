import { z } from 'zod';
import {
  zNameRuRequired,
  zNameRuOptional,
  zNameLatRequired,
  zPhone,
  zBirthDate,
  zBio,
  zIbaoId,
} from '@/shared/validation/profileFields';

export const profileFormSchema = z
  .object({
    firstName: zNameRuRequired('Имя'),
    lastName: zNameRuRequired('Фамилия'),
    noMiddleName: z.boolean(),
    middleName: zNameRuOptional('Отчество'),
    firstNameLatin: zNameLatRequired('Имя ENG'),
    lastNameLatin: zNameLatRequired('Фамилия ENG'),
    countries: z.array(z.string()).min(1, 'Укажите страну'),
    cities: z.array(z.string()).min(1, 'Укажите город'),
    birthDate: zBirthDate, // необязательно, но если заполнено — в диапазоне
    phone: zPhone, // необязательно
    bio: zBio, // необязательно
    ibaoId: zIbaoId, // необязательно
  })
  .superRefine((data, ctx) => {
    if (!data.noMiddleName && data.middleName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['middleName'],
        message: 'Укажите отчество или отметьте, что его нет',
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
