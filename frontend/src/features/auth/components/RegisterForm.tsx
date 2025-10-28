// src/features/auth/components/RegisterForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerInputSchema,
  registerSchema,
  type RegisterFormValues,
  type RegisterDto,
} from '../validation/registerSchema';
import { registerUser } from '../api/register';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isValidPhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/Button';
import { toast } from 'sonner';

export function RegisterForm() {
  const navigate = useNavigate();

  // форма валидируется по input-схеме (раздельные поля имени)
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerInputSchema),
    mode: 'onSubmit',
  });

  const mutation = useMutation({
    mutationFn: (dto: RegisterDto) => registerUser(dto),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      toast.success('Регистрация успешна');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка регистрации';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((raw) => {
    // превращаем input -> DTO (добавится fullName)
    const parsed = registerSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? 'Проверьте поля формы';
      toast.error(msg);
      return;
    }
    mutation.mutate(parsed.data);
  });

  const disabled = mutation.isPending;

  return (
    <div
      className="w-full max-w-md rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h1 className="text-xl font-semibold text-blue-dark">Регистрация</h1>
      </div>

      <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
        {form.formState.errors.root?.serverError && (
          <div
            className="text-error text-sm border rounded-md p-3"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            {form.formState.errors.root.serverError.message}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="block mb-1 text-sm text-blue-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            disabled={disabled}
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-error">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* ФИО по частям */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="lastName" className="block mb-1 text-sm text-blue-dark">
              Фамилия
            </label>
            <input
              id="lastName"
              autoComplete="family-name"
              className="input"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.lastName}
              {...form.register('lastName')}
            />
            {form.formState.errors.lastName && (
              <p className="text-error">{form.formState.errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="firstName" className="block mb-1 text-sm text-blue-dark">
              Имя
            </label>
            <input
              id="firstName"
              autoComplete="given-name"
              className="input"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.firstName}
              {...form.register('firstName')}
            />
            {form.formState.errors.firstName && (
              <p className="text-error">{form.formState.errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="middleName" className="block mb-1 text-sm text-blue-dark">
              Отчество <span className="text-gray-500">(если есть)</span>
            </label>
            <input
              id="middleName"
              autoComplete="additional-name"
              className="input"
              disabled={disabled}
              aria-invalid={!!form.formState.errors.middleName}
              {...form.register('middleName')}
            />
            {form.formState.errors.middleName && (
              <p className="text-error">{form.formState.errors.middleName.message}</p>
            )}
          </div>
        </div>

        {/* Телефон */}
        <div>
          <label className="block mb-1 text-sm text-blue-dark">Телефон</label>
          <Controller
            name="phone"
            control={form.control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                country="ru"
                enableSearch
                containerClass="!w-full"
                inputClass="input !pl-12"
                buttonClass="!border-none"
                specialLabel=""
                inputProps={{ name: 'tel', autoComplete: 'tel', disabled }}
                isValid={(value: string) =>
                  isValidPhoneNumber('+' + String(value).replace(/[^\d+]/g, ''))
                }
              />
            )}
          />
          {form.formState.errors.phone && (
            <p className="text-error">{form.formState.errors.phone.message}</p>
          )}
        </div>

        {/* Пароль */}
        <div>
          <label htmlFor="password" className="block mb-1 text-sm text-blue-dark">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            disabled={disabled}
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-error">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block mb-1 text-sm text-blue-dark">
            Повторите пароль
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className="input"
            disabled={disabled}
            aria-invalid={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-error">{form.formState.errors.confirmPassword.message}</p>
          )}
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
