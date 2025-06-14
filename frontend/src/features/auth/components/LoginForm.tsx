// src/features/auth/components/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validation/loginSchema';
import type { LoginDto } from '../validation/loginSchema';
import { loginUser } from '../api/login';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

export function LoginForm() {
  const navigate = useNavigate();

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      navigate(data.redirectTo);
    },
    onError: (error) => {
      console.error(error);
      // todo: пользовательское сообщение об ошибке
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

      <button type="submit" disabled={mutation.isPending} className="btn btn-brand">
        Войти
      </button>

      <p className="text-sm mt-2">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-brand underline">
          Зарегистрируйтесь
        </Link>
      </p>
    </form>
  );
}
