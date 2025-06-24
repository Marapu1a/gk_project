// src/features/auth/components/RegisterForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../validation/registerSchema';
import type { RegisterDto } from '../validation/registerSchema';
import { registerUser } from '../api/register';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isValidPhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { Button } from '@/components/Button';

export function RegisterForm() {
  const navigate = useNavigate();
  const form = useForm<RegisterDto>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      alert('Регистрация прошла успешно!');
      navigate('/dashboard');
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
          name="phone"
          control={form.control}
          render={({ field }) => (
            <PhoneInput
              {...field}
              country={'ru'}
              enableSearch={true}
              inputClass="input"
              containerClass="!w-full"
              inputStyle={{ width: '100%' }}
              specialLabel=""
              placeholder="Телефон"
              isValid={(value: string) => {
                // проверка через zod всё равно сработает, это только визуальный индикатор
                return isValidPhoneNumber('+' + value);
              }}
            />
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

      <Button type="submit" loading={mutation.isPending}>
        Зарегистрироваться
      </Button>

      <p className="text-sm mt-2">
        Уже зарегистрированы?{' '}
        <Link to="/login" className="text-brand underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
