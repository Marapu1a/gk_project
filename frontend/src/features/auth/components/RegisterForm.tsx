import { useState } from 'react';
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerInputSchema,
  type RegisterFormValues,
  type RegisterDto,
} from '../validation/registerSchema';
import { registerUser } from '../api/register';
import { acceptTransborderConsent } from '../api/consent';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';

// utils
import { buildFullNameRu, buildFullNameLatin } from '@/features/user/utils/name';
import { normalizePhone } from '@/features/user/utils/phone';
import { UserLocationFields } from '@/features/user/components/UserLocationFields';

const arrToStr = (arr: string[]) =>
  arr
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ');

// Человеческие названия полей
const fieldLabel: Record<string, string> = {
  email: 'Email',
  lastName: 'Фамилия (рус.)',
  firstName: 'Имя (рус.)',
  middleName: 'Отчество (рус.)',
  lastNameLatin: 'Фамилия (лат.)',
  firstNameLatin: 'Имя (лат.)',
  phone: 'Телефон',
  birthDate: 'Дата рождения',
  countries: 'Страна',
  cities: 'Город',
  password: 'Пароль',
  confirmPassword: 'Повторите пароль',
};

// Ищем первую ошибку по порядку формы
function getFirstError(errors: FieldErrors<RegisterFormValues>) {
  const order: (keyof RegisterFormValues)[] = [
    'email',
    'lastName',
    'firstName',
    'middleName',
    'lastNameLatin',
    'firstNameLatin',
    'phone',
    'birthDate',
    'countries',
    'cities',
    'password',
    'confirmPassword',
  ];

  for (const name of order) {
    const err: any = errors[name];
    if (!err) continue;

    const message =
      typeof err.message === 'string'
        ? err.message
        : Array.isArray(err) && err[0]?.message
          ? err[0].message
          : '';

    return { name, message };
  }

  return null;
}

// Приводим сообщения к нормальному человеческому виду
function humanizeError(field: string, raw: string) {
  const label = fieldLabel[field] || field;
  const msg = raw?.toLowerCase() ?? '';

  if (msg.includes('латин')) {
    return `Введите «${label}» латиницей`;
  }

  if (msg.includes('кирил')) {
    return `Введите «${label}» кириллицей`;
  }

  if (field === 'phone') {
    return 'Введите корректный номер телефона';
  }

  if (field === 'countries') {
    return 'Укажите страну';
  }

  if (field === 'cities') {
    return 'Укажите город';
  }

  if (field === 'confirmPassword') {
    return raw || 'Пароли не совпадают';
  }

  if (msg.includes('min') || msg.includes('миним')) {
    return `Заполните поле «${label}»`;
  }

  return raw || `Проверьте поле «${label}»`;
}

type ConsentState = {
  PUBLIC_OFFER_ACCEPTED: boolean;
  PD_PROCESSING_ACCEPTED: boolean;
  TRANSBORDER_PD_TRANSFER: boolean;
  EMAIL_MARKETING_ACCEPTED: boolean;
};

const INITIAL_CONSENTS: ConsentState = {
  PUBLIC_OFFER_ACCEPTED: false,
  PD_PROCESSING_ACCEPTED: false,
  TRANSBORDER_PD_TRANSFER: false,
  EMAIL_MARKETING_ACCEPTED: false,
};

export function RegisterForm() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<ConsentState>(INITIAL_CONSENTS);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerInputSchema),
    mode: 'onSubmit',
    defaultValues: {
      countries: [],
      cities: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (dto: RegisterDto) => {
      const data = await registerUser(dto);

      localStorage.setItem('token', data.token);

      try {
        await acceptTransborderConsent({
          source: 'REGISTRATION_MODAL',
          acceptedItems: {
            PUBLIC_OFFER_ACCEPTED: consents.PUBLIC_OFFER_ACCEPTED,
            PD_PROCESSING_ACCEPTED: consents.PD_PROCESSING_ACCEPTED,
            TRANSBORDER_PD_TRANSFER: consents.TRANSBORDER_PD_TRANSFER,
            EMAIL_MARKETING_ACCEPTED: consents.EMAIL_MARKETING_ACCEPTED,
          },
        });
      } catch (error) {
        localStorage.removeItem('token');
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Регистрация успешна');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.error;

      toast.error(
        backendMessage || 'Регистрация прошла, но не удалось зафиксировать обязательные согласия',
      );
    },
  });

  const requiredConsentsAccepted =
    consents.PUBLIC_OFFER_ACCEPTED &&
    consents.PD_PROCESSING_ACCEPTED &&
    consents.TRANSBORDER_PD_TRANSFER;

  const onSubmit = form.handleSubmit(
    (raw) => {
      if (!requiredConsentsAccepted) {
        toast.error('Подтвердите обязательные условия и согласия');
        return;
      }

      const {
        lastName,
        firstName,
        middleName,
        lastNameLatin,
        firstNameLatin,
        phone,
        birthDate,
        countries,
        cities,
        email,
        password,
      } = raw;

      const fullName = buildFullNameRu(lastName, firstName, middleName);
      const fullNameLatin = buildFullNameLatin(lastNameLatin, firstNameLatin);

      const phoneIntl = normalizePhone(phone);
      if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
        toast.error('Введите корректный номер телефона');
        form.setFocus('phone');
        return;
      }

      mutation.mutate({
        email,
        password,
        fullName,
        fullNameLatin,
        phone: phoneIntl,
        birthDate,
        country: arrToStr(countries),
        city: arrToStr(cities),
      });
    },
    (errors) => {
      const first = getFirstError(errors);
      if (!first) {
        toast.error('Проверьте поля формы');
        return;
      }

      toast.error(humanizeError(first.name as string, first.message));
      form.setFocus(first.name);
    },
  );

  const disabled = mutation.isPending;

  return (
    <div
      className="w-full max-w-md rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div
          className="text-s rounded-xl px-3 py-2 font-medium text-blue-dark/70"
          style={{ background: 'var(--color-blue-soft)' }}
        >
          После регистрации добавьте фото — так в реестре вы будете выглядеть живым человеком, а не
          пустой карточкой 🙂
        </div>

        <div>
          <label className="mb-1 block text-sm text-blue-dark">
            Email<span className="ml-1 text-red-500">*</span>
          </label>
          <input type="email" className="input" disabled={disabled} {...form.register('email')} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Фамилия (рус.)<span className="ml-1 text-red-500">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('lastName')} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Имя (рус.)<span className="ml-1 text-red-500">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('firstName')} />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-blue-dark">Отчество (рус.)</label>
            <input className="input" disabled={disabled} {...form.register('middleName')} />
          </div>
        </div>

        <div className="pt-2">
          <div
            className="text-s rounded-xl px-3 py-2 font-medium text-blue-dark/70"
            style={{ background: 'var(--color-blue-soft)' }}
          >
            ФИО латиницей — как в загранпаспорте
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Фамилия (лат.)<span className="ml-1 text-red-500">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('lastNameLatin')} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Имя (лат.)<span className="ml-1 text-red-500">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('firstNameLatin')} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-blue-dark">
            Телефон<span className="ml-1 text-red-500">*</span>
          </label>
          <Controller
            name="phone"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                country="ru"
                enableSearch
                containerClass="w-full"
                inputClass="input"
                buttonClass="!border-none"
                specialLabel=""
                value={field.value || ''}
                onChange={(value) => field.onChange(value)}
                inputProps={{ name: 'tel', autoComplete: 'tel', disabled }}
              />
            )}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-blue-dark">
            Дата рождения<span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="date"
            className="input"
            disabled={disabled}
            {...form.register('birthDate')}
          />
        </div>

        <UserLocationFields
          countries={form.watch('countries')}
          cities={form.watch('cities')}
          onChange={({ countries, cities }) => {
            form.setValue('countries', countries, { shouldValidate: true });
            form.setValue('cities', cities, { shouldValidate: true });
          }}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Пароль<span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="password"
              className="input"
              disabled={disabled}
              {...form.register('password')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-blue-dark">
              Повторите пароль<span className="ml-1 text-red-500">*</span>
            </label>
            <input
              type="password"
              className="input"
              disabled={disabled}
              {...form.register('confirmPassword')}
            />
          </div>
        </div>

        <div
          className="space-y-3 rounded-xl border p-4"
          style={{ borderColor: 'var(--color-border-soft)' }}
        >
          <div className="text-sm font-medium text-blue-darker">
            Подтверждение условий и согласий
          </div>

          <label className="flex items-start gap-3 text-sm leading-6 text-blue-dark">
            <input
              type="checkbox"
              checked={consents.PUBLIC_OFFER_ACCEPTED}
              onChange={(e) =>
                setConsents((prev) => ({
                  ...prev,
                  PUBLIC_OFFER_ACCEPTED: e.target.checked,
                }))
              }
              disabled={disabled}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-green-brand)]"
            />
            <span>
              Я принимаю условия{' '}
              <a
                href="https://reestrpap.ru/oferta"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-darker underline underline-offset-2"
              >
                Публичной оферты
              </a>
              <span className="ml-1 text-pink-accent">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-blue-dark">
            <input
              type="checkbox"
              checked={consents.PD_PROCESSING_ACCEPTED}
              onChange={(e) =>
                setConsents((prev) => ({
                  ...prev,
                  PD_PROCESSING_ACCEPTED: e.target.checked,
                }))
              }
              disabled={disabled}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-green-brand)]"
            />
            <span>
              Я ознакомлен(а) с{' '}
              <a
                href="https://reestrpap.ru/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-darker underline underline-offset-2"
              >
                Политикой обработки персональных данных
              </a>{' '}
              и даю{' '}
              <a
                href="https://reestrpap.ru/user-agreement"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-darker underline underline-offset-2"
              >
                согласие
              </a>{' '}
              на обработку персональных данных
              <span className="ml-1 text-pink-accent">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-blue-dark">
            <input
              type="checkbox"
              checked={consents.TRANSBORDER_PD_TRANSFER}
              onChange={(e) =>
                setConsents((prev) => ({
                  ...prev,
                  TRANSBORDER_PD_TRANSFER: e.target.checked,
                }))
              }
              disabled={disabled}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-green-brand)]"
            />
            <span>
              Я даю{' '}
              <a
                href="https://reestrpap.ru/soglasie_peredacha_dannyh"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-darker underline underline-offset-2"
              >
                согласие на трансграничную передачу моих персональных данных
              </a>{' '}
              в IBAO в целях регистрации и прохождения международной сертификации.
              <span className="ml-1 text-pink-accent">*</span>
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-blue-dark">
            <input
              type="checkbox"
              checked={consents.EMAIL_MARKETING_ACCEPTED}
              onChange={(e) =>
                setConsents((prev) => ({
                  ...prev,
                  EMAIL_MARKETING_ACCEPTED: e.target.checked,
                }))
              }
              disabled={disabled}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-green-brand)]"
            />
            <span>Я согласен получать письма информационной рассылки</span>
          </label>

          <p className="text-xs leading-5 text-blue-dark/70">
            Поля, отмеченные звездочкой, обязательны для регистрации.
          </p>
        </div>

        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={disabled || !requiredConsentsAccepted}
        >
          Зарегистрироваться
        </Button>

        <p className="mt-2 text-sm">
          Уже зарегистрированы?{' '}
          <Link to="/login" className="text-brand underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
