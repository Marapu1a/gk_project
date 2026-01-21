// src/features/auth/components/RegisterForm.tsx
import { useForm, Controller, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerInputSchema,
  type RegisterFormValues,
  type RegisterDto,
} from '../validation/registerSchema';
import { registerUser } from '../api/register';
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

export function RegisterForm() {
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerInputSchema),
    mode: 'onSubmit',
    defaultValues: {
      countries: [],
      cities: [],
    },
  });

  const mutation = useMutation({
    mutationFn: (dto: RegisterDto) => registerUser(dto),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      toast.success('Регистрация успешна');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Ошибка регистрации');
    },
  });

  const onSubmit = form.handleSubmit(
    (raw) => {
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
      <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
        <div
          className="text-s font-medium text-blue-dark/70 px-3 py-2 rounded-xl"
          style={{ background: 'var(--color-blue-soft)' }}
        >
          После регистрации добавьте фото — так в реестре вы будете выглядеть живым человеком, а не
          пустой карточкой 🙂
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1 text-sm text-blue-dark">
            Email<span className="text-red-500 ml-1">*</span>
          </label>
          <input type="email" className="input" disabled={disabled} {...form.register('email')} />
        </div>

        {/* ФИО рус */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Фамилия (рус.)<span className="text-red-500 ml-1">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('lastName')} />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Имя (рус.)<span className="text-red-500 ml-1">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('firstName')} />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-1 text-sm text-blue-dark">Отчество (рус.)</label>
            <input className="input" disabled={disabled} {...form.register('middleName')} />
          </div>
        </div>

        {/* разделитель */}
        <div className="pt-2">
          <div
            className="text-s font-medium text-blue-dark/70 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-blue-soft)' }}
          >
            ФИО латиницей — как в загранпаспорте
          </div>
        </div>

        {/* ФИО лат */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Фамилия (лат.)<span className="text-red-500 ml-1">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('lastNameLatin')} />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Имя (лат.)<span className="text-red-500 ml-1">*</span>
            </label>
            <input className="input" disabled={disabled} {...form.register('firstNameLatin')} />
          </div>
        </div>

        {/* Телефон */}
        <div>
          <label className="block mb-1 text-sm text-blue-dark">
            Телефон<span className="text-red-500 ml-1">*</span>
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

        {/* Дата рождения */}
        <div>
          <label className="block mb-1 text-sm text-blue-dark">
            Дата рождения<span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="date"
            className="input"
            disabled={disabled}
            {...form.register('birthDate')}
          />
        </div>

        {/* Страна / город — КАК В РЕДАКТУРЕ */}
        <UserLocationFields
          countries={form.watch('countries')}
          cities={form.watch('cities')}
          onChange={({ countries, cities }) => {
            form.setValue('countries', countries, { shouldValidate: true });
            form.setValue('cities', cities, { shouldValidate: true });
          }}
        />

        {/* Пароль */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Пароль<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="password"
              className="input"
              disabled={disabled}
              {...form.register('password')}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">
              Повторите пароль<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="password"
              className="input"
              disabled={disabled}
              {...form.register('confirmPassword')}
            />
          </div>
        </div>

        <Button type="submit" loading={mutation.isPending} disabled={disabled}>
          Зарегистрироваться
        </Button>

        <p className="text-sm mt-2">
          Уже зарегистрированы?{' '}
          <Link to="/login" className="text-brand underline">
            Войти
          </Link>
        </p>
      </form>
    </div>
  );
}
