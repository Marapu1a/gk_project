import { useState, type ReactNode } from 'react';
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
import { toast } from 'sonner';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { AuthCard, AuthField, AuthSubmitButton, PasswordInput } from './AuthLayout';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

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
  isExternalSupervisor: 'Квалификация супервизора IBAO (BCBA)',
};

// Ищем первую ошибку по порядку формы
function getFirstError(errors: FieldErrors<RegisterFormValues>) {
  const order: (keyof RegisterFormValues)[] = [
    'firstName',
    'lastName',
    'middleName',
    'firstNameLatin',
    'lastNameLatin',
    'email',
    'phone',
    'birthDate',
    'countries',
    'cities',
    'password',
    'confirmPassword',
    'isExternalSupervisor',
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
  const [noMiddleName, setNoMiddleName] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

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
      toast.success(UI_TOAST_MESSAGES.auth.registerSuccess);
      navigate('/dashboard-v2');
    },
    onError: (error: any) => {
      const backendMessage = error?.response?.data?.error;

      toast.error(backendMessage || UI_TOAST_MESSAGES.auth.registerFailed);
    },
  });

  const requiredConsentsAccepted =
    consents.PUBLIC_OFFER_ACCEPTED &&
    consents.PD_PROCESSING_ACCEPTED &&
    consents.TRANSBORDER_PD_TRANSFER;

  const onSubmit = form.handleSubmit(
    (raw) => {
      if (!requiredConsentsAccepted) {
        toast.error(UI_TOAST_MESSAGES.auth.requiredConsents);
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
        isExternalSupervisor,
      } = raw;

      const fullName = buildFullNameRu(lastName, firstName, middleName);
      const fullNameLatin = buildFullNameLatin(lastNameLatin, firstNameLatin);

      const phoneIntl = normalizePhone(phone);
      if (phoneIntl && !isValidPhoneNumber(phoneIntl)) {
        toast.error(UI_TOAST_MESSAGES.auth.phoneInvalid);
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
        isExternalSupervisor: isExternalSupervisor === 'YES',
      });
    },
    (errors) => {
      const first = getFirstError(errors);
      if (!first) {
        toast.error(UI_TOAST_MESSAGES.auth.formCheck);
        return;
      }

      toast.error(humanizeError(first.name as string, first.message));
      form.setFocus(first.name);
    },
  );

  const disabled = mutation.isPending;

  return (
    <>
      <AuthCard className="px-4 py-5 md:px-5">
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <AuthField label="Имя" required error={form.formState.errors.firstName?.message}>
            <input
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.firstName}
              {...form.register('firstName')}
            />
          </AuthField>

          <AuthField label="Фамилия" required error={form.formState.errors.lastName?.message}>
            <input
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.lastName}
              {...form.register('lastName')}
            />
          </AuthField>

          <AuthField label="Отчество" error={form.formState.errors.middleName?.message}>
            <input
              className="input-design h-[32px]"
              disabled={disabled || noMiddleName}
              aria-invalid={!!form.formState.errors.middleName}
              {...form.register('middleName')}
            />
          </AuthField>

          <label className="mt-[22px] flex min-h-[32px] items-center gap-2 text-[14px] text-[#8D96B5]">
            <input
              type="checkbox"
              checked={noMiddleName}
              onChange={(e) => {
                setNoMiddleName(e.target.checked);
                if (e.target.checked) {
                  form.setValue('middleName', '', { shouldValidate: true });
                }
              }}
              disabled={disabled}
              className="h-[28px] w-[28px] cursor-pointer accent-[var(--color-blue-dark)]"
            />
            У меня нет отчества
          </label>

          <AuthField
            label="Имя ENG"
            hint="как в загранпаспорте"
            required
            error={form.formState.errors.firstNameLatin?.message}
          >
            <input
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.firstNameLatin}
              {...form.register('firstNameLatin')}
            />
          </AuthField>

          <AuthField
            label="Фамилия ENG"
            hint="как в загранпаспорте"
            required
            error={form.formState.errors.lastNameLatin?.message}
          >
            <input
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.lastNameLatin}
              {...form.register('lastNameLatin')}
            />
          </AuthField>

          <AuthField label="Email" required error={form.formState.errors.email?.message}>
            <input
              type="email"
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
          </AuthField>

          <AuthField label="Телефон" required error={form.formState.errors.phone?.message}>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <PhoneInput
                  country="ru"
                  enableSearch
                  containerClass="auth-phone"
                  inputClass="input-design auth-phone-input"
                  buttonClass="auth-phone-flag"
                  specialLabel=""
                  value={field.value || ''}
                  onChange={(value) => field.onChange(value)}
                  inputProps={{ name: 'tel', autoComplete: 'tel', disabled }}
                />
              )}
            />
          </AuthField>

          <AuthField
            label="Дата рождения"
            required
            error={form.formState.errors.birthDate?.message}
          >
            <input
              type="date"
              className="input-design h-[32px]"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.birthDate}
              {...form.register('birthDate')}
            />
          </AuthField>

          <div className="auth-select grid grid-cols-1 gap-x-4 gap-y-5 sm:col-span-2 sm:grid-cols-2">
            <UserLocationFields
              countries={form.watch('countries')}
              cities={form.watch('cities')}
              onChange={({ countries, cities }) => {
                form.setValue('countries', countries, { shouldValidate: true });
                form.setValue('cities', cities, { shouldValidate: true });
              }}
            />
          </div>

          <AuthField label="Пароль" required error={form.formState.errors.password?.message}>
            <PasswordInput
              autoComplete="new-password"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.password}
              valueVisible={passwordVisible}
              onToggleVisible={() => setPasswordVisible((value) => !value)}
              {...form.register('password')}
            />
          </AuthField>

          <AuthField
            label="Повторите пароль"
            required
            error={form.formState.errors.confirmPassword?.message}
          >
            <PasswordInput
              autoComplete="new-password"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.confirmPassword}
              valueVisible={confirmPasswordVisible}
              onToggleVisible={() => setConfirmPasswordVisible((value) => !value)}
              {...form.register('confirmPassword')}
            />
          </AuthField>

          <div className="rounded-[10px] border border-[var(--color-border-soft)] p-4 sm:col-span-2">
            <div className="text-[14px] font-extrabold text-blue-dark">
              Вы уже являетесь супервизором IBAO (BCBA)?
              <span className="ml-1 text-[var(--color-danger)]">*</span>
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[#8D96B5]">
              Выберите один вариант. Если у вас уже есть такая квалификация, администратор поможет настроить дальнейшую работу в системе.
            </p>
            <Controller
              control={form.control}
              name="isExternalSupervisor"
              render={({ field }) => (
                <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Наличие квалификации супервизора IBAO или BCBA">
                  {([
                    ['NO', 'Нет'],
                    ['YES', 'Да'],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === value}
                      disabled={disabled}
                      onClick={() => field.onChange(value)}
                      className={`h-[40px] rounded-[8px] border text-[14px] font-extrabold transition ${
                        field.value === value
                          ? 'border-[var(--color-blue-dark)] bg-[var(--color-blue-dark)] text-white'
                          : 'border-[var(--color-border-soft)] bg-white text-blue-dark hover:bg-[var(--color-blue-soft)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />
            {form.formState.errors.isExternalSupervisor?.message ? (
              <p className="mt-2 text-[13px] text-[var(--color-danger)]">
                {form.formState.errors.isExternalSupervisor.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-3 rounded-[10px] border border-[var(--color-border-soft)] p-4 sm:col-span-2">
            <div className="text-[14px] font-extrabold text-blue-dark">
              Подтверждение условий и согласий
            </div>

            <ConsentCheckbox
              checked={consents.PUBLIC_OFFER_ACCEPTED}
              disabled={disabled}
              onChange={(checked) =>
                setConsents((prev) => ({ ...prev, PUBLIC_OFFER_ACCEPTED: checked }))
              }
              required
            >
              Я принимаю условия{' '}
              <a
                href="https://reestrpap.ru/oferta"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-dark underline"
              >
                Публичной оферты
              </a>
            </ConsentCheckbox>

            <ConsentCheckbox
              checked={consents.PD_PROCESSING_ACCEPTED}
              disabled={disabled}
              onChange={(checked) =>
                setConsents((prev) => ({ ...prev, PD_PROCESSING_ACCEPTED: checked }))
              }
              required
            >
              Я ознакомлен(а) с{' '}
              <a
                href="https://reestrpap.ru/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-dark underline"
              >
                Политикой обработки персональных данных
              </a>{' '}
              и даю{' '}
              <a
                href="https://reestrpap.ru/user-agreement"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-dark underline"
              >
                согласие
              </a>{' '}
              на обработку персональных данных
            </ConsentCheckbox>

            <ConsentCheckbox
              checked={consents.TRANSBORDER_PD_TRANSFER}
              disabled={disabled}
              onChange={(checked) =>
                setConsents((prev) => ({ ...prev, TRANSBORDER_PD_TRANSFER: checked }))
              }
              required
            >
              Я даю{' '}
              <a
                href="https://reestrpap.ru/soglasie_peredacha_dannyh"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-dark underline"
              >
                согласие на трансграничную передачу моих персональных данных
              </a>{' '}
              в IBAO в целях регистрации и прохождения международной сертификации.
            </ConsentCheckbox>

            <ConsentCheckbox
              checked={consents.EMAIL_MARKETING_ACCEPTED}
              disabled={disabled}
              onChange={(checked) =>
                setConsents((prev) => ({ ...prev, EMAIL_MARKETING_ACCEPTED: checked }))
              }
            >
              Я согласен получать письма информационной рассылки
            </ConsentCheckbox>
          </div>

          <div className="sm:col-span-2">
            <AuthSubmitButton
              loading={mutation.isPending}
              disabled={disabled || !requiredConsentsAccepted}
            >
              Зарегистрироваться
            </AuthSubmitButton>
          </div>
        </form>
      </AuthCard>

      <p className="mt-7 text-center text-[15px] text-[#8D96B5]">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-blue-dark underline">
          Войти
        </Link>
      </p>
    </>
  );
}

function ConsentCheckbox({
  checked,
  disabled,
  onChange,
  required,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 text-[13px] leading-5 text-blue-dark">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-[22px] w-[22px] shrink-0 cursor-pointer accent-[var(--color-blue-dark)]"
      />
      <span>
        {children}
        {required ? <span className="ml-1 text-[var(--color-danger)]">*</span> : null}
      </span>
    </label>
  );
}
