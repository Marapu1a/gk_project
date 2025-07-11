import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validation/loginSchema';
import type { LoginDto } from '../validation/loginSchema';
import { loginUser } from '../api/login';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';

export function LoginForm() {
  const navigate = useNavigate();

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка входа';
      form.setError('root.serverError', { message });
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div>
        <input {...form.register('email')} type="email" placeholder="Email" className="input" />
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
        <div className="mt-1 text-right">
          <Link to="/forgot-password" className="text-sm text-brand underline">
            Забыли пароль?
          </Link>
        </div>
      </div>

      {form.formState.errors.root?.serverError && (
        <p className="text-error">{form.formState.errors.root.serverError.message}</p>
      )}

      <Button type="submit" loading={mutation.isPending}>
        Войти
      </Button>

      <p className="text-sm mt-2">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-brand underline">
          Зарегистрируйтесь
        </Link>
      </p>
    </form>
  );
}
