import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AuthCard, AuthField, AuthSubmitButton, PasswordInput } from './AuthLayout';
import { loginSchema } from '../validation/loginSchema';
import type { LoginDto } from '../validation/loginSchema';
import { loginUser } from '../api/login';
import { fetchCurrentUser } from '@/features/auth/api/me';

const ARCHIVED_ACCOUNT_MESSAGE = 'Аккаунт удалён, для восстановления свяжитесь с нами';
const CONTACTS_URL = 'https://reestrpap.ru/contacts';

function ArchivedAccountError() {
  return (
    <span>
      Аккаунт удалён, для восстановления{' '}
      <a
        href={CONTACTS_URL}
        target="_blank"
        rel="noreferrer"
        className="cursor-pointer underline underline-offset-2"
      >
        свяжитесь с нами
      </a>
    </span>
  );
}

export function LoginForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Если уже залогинен — проверяем токен сервером
  useEffect(() => {
    const force = params.get('force');
    if (force) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        // Просто вызов без аргументов
        await fetchCurrentUser();
        if (!cancelled) navigate('/dashboard', { replace: true });
      } catch {
        // Токен битый — чистим
        localStorage.removeItem('token');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, params]);

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
      navigate(to, { replace: true });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Ошибка входа';
      form.setError('root.serverError', { message });
      toast.error(message === ARCHIVED_ACCOUNT_MESSAGE ? <ArchivedAccountError /> : message);
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));
  const disabled = mutation.isPending;

  return (
    <>
      <AuthCard className="px-5 py-6 md:px-5">
        <form onSubmit={onSubmit} className="space-y-7">
        {form.formState.errors.root?.serverError && (
          <div
            className="rounded-[10px] border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]"
          >
            {form.formState.errors.root.serverError.message === ARCHIVED_ACCOUNT_MESSAGE ? (
              <ArchivedAccountError />
            ) : (
              form.formState.errors.root.serverError.message
            )}
          </div>
        )}

        <AuthField label="Email" error={form.formState.errors.email?.message}>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            className="input-design h-[32px]"
            aria-invalid={!!form.formState.errors.email}
            disabled={disabled}
            {...form.register('email')}
          />
        </AuthField>

        <AuthField label="Пароль" error={form.formState.errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!form.formState.errors.password}
            disabled={disabled}
            valueVisible={passwordVisible}
            onToggleVisible={() => setPasswordVisible((value) => !value)}
            {...form.register('password')}
          />
        </AuthField>

        <AuthSubmitButton loading={mutation.isPending} disabled={disabled}>
          Войти
        </AuthSubmitButton>

        <div className="text-center">
          <Link to="/forgot-password" className="text-[15px] text-blue-dark underline">
            Восстановить пароль
          </Link>
        </div>
        </form>
      </AuthCard>

      <p className="mt-7 text-center text-[15px] text-[#8D96B5]">
        Нет аккаунта?{' '}
        <Link to="/register" className="text-blue-dark underline">
          Регистрация
        </Link>
      </p>
    </>
  );
}
