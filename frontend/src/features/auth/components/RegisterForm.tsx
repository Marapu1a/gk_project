// src/features/auth/components/RegisterForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../validation/registerSchema';
import type { RegisterDto } from '../validation/registerSchema';
import { registerUser } from '../api/register';
import { useMutation } from '@tanstack/react-query';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

export function RegisterForm() {
  const form = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      // todo: перенаправление по роли
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <input {...form.register('email')} placeholder="Email" className="input" />
        {form.formState.errors.email && (
          <p className="text-error">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div>
        <input {...form.register('fullName')} placeholder="ФИО" className="input" />
        {form.formState.errors.fullName && (
          <p className="text-error">{form.formState.errors.fullName.message}</p>
        )}
      </div>

      <div>
        <Controller
          control={form.control}
          name="phone"
          render={({ field }) => (
            <PhoneInput {...field} defaultCountry="RU" className="input" placeholder="Телефон" />
          )}
        />
        {form.formState.errors.phone && (
          <p className="text-error">{form.formState.errors.phone.message}</p>
        )}
      </div>

      <div>
        <input
          {...form.register('password')}
          placeholder="Пароль"
          type="password"
          className="input"
        />
        {form.formState.errors.password && (
          <p className="text-error">{form.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <input
          {...form.register('confirmPassword')}
          placeholder="Повторите пароль"
          type="password"
          className="input"
        />
        {form.formState.errors.confirmPassword && (
          <p className="text-error">{form.formState.errors.confirmPassword.message}</p>
        )}
      </div>

      <button type="submit" disabled={mutation.isPending} className="btn btn-brand">
        Зарегистрироваться
      </button>
    </form>
  );
}
