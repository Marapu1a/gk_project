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
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/Button';
import { toast } from 'sonner';

export function RegisterForm() {
  const navigate = useNavigate();

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
      <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
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
            {...form.register('email')}
          />
        </div>

        {/* Русское ФИО */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">Фамилия (рус.)</label>
            <input className="input" disabled={disabled} {...form.register('lastName')} />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">Имя (рус.)</label>
            <input className="input" disabled={disabled} {...form.register('firstName')} />
          </div>

          <div className="sm:col-span-2">
            <label className="block mb-1 text-sm text-blue-dark">Отчество (рус.)</label>
            <input className="input" disabled={disabled} {...form.register('middleName')} />
          </div>
        </div>

        {/* Разделитель */}
        <div className="pt-2">
          <div
            className="text-xs font-medium text-blue-dark/70 px-3 py-2 rounded-xl"
            style={{ background: 'var(--color-blue-soft)' }}
          >
            ФИО латиницей — введите как указано в загранпаспорте
          </div>
        </div>

        {/* Латиница */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">Фамилия (лат.)</label>
            <input className="input" disabled={disabled} {...form.register('lastNameLatin')} />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">Имя (лат.)</label>
            <input className="input" disabled={disabled} {...form.register('firstNameLatin')} />
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

        {/* Пароль */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block mb-1 text-sm text-blue-dark">Пароль</label>
            <input
              type="password"
              className="input"
              disabled={disabled}
              {...form.register('password')}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm text-blue-dark">Повторите пароль</label>
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
