import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validation/loginSchema';
import type { LoginDto } from '../validation/loginSchema';
import { loginUser } from '../api/login';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function LoginForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Если уже залогинен — сразу в кабинет
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const form = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
  });

  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      toast.success('Вход выполнен');
      const to = params.get('to') || '/dashboard';
      navigate(to, { replace: true }); // чтобы "Назад" не вел на /login
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка входа';
      form.setError('root.serverError', { message });
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));
  const disabled = mutation.isPending;

  return (
    <div
      className="w-full max-w-md rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h1 className="text-xl font-semibold text-blue-dark">Вход</h1>
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

        <div>
          <label htmlFor="email" className="block mb-1 text-sm text-blue-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            className="input"
            aria-invalid={!!form.formState.errors.email}
            disabled={disabled}
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-error">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block mb-1 text-sm text-blue-dark">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            aria-invalid={!!form.formState.errors.password}
            disabled={disabled}
            {...form.register('password')}
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

        <Button type="submit" loading={mutation.isPending} disabled={disabled}>
          Войти
        </Button>

        <p className="text-sm mt-2">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-brand underline">
            Зарегистрируйтесь
          </Link>
        </p>
      </form>
    </div>
  );
}
