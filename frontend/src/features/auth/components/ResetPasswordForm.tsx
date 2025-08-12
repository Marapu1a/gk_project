import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../validation/passwordResetSchemas';
import { resetPassword } from '../api/passwordReset';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { toast } from 'sonner';

type FormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onSubmit',
  });

  if (!token) {
    return (
      <div className="text-center text-error mt-10 font-medium">
        Ссылка недействительна или отсутствует токен.
      </div>
    );
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await resetPassword({ token, password: data.password });
      toast.success('Пароль обновлён');
      navigate('/login');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Ссылка устарела или недействительна';
      setError('root.serverError', { message });
      toast.error(message);
    }
  });

  return (
    <div
      className="w-full max-w-md mx-auto mt-10 rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h1 className="text-xl font-semibold text-blue-dark">Сброс пароля</h1>
      </div>

      {/* Body */}
      <form onSubmit={onSubmit} className="px-6 py-5 space-y-4">
        {errors.root?.serverError && (
          <div
            className="text-error text-sm border rounded-md p-3"
            style={{ borderColor: 'var(--color-green-light)' }}
          >
            {errors.root.serverError.message}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block mb-1 text-sm text-blue-dark">
            Новый пароль
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input w-full"
            placeholder="Мин. 6 символов"
            disabled={isSubmitting}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-error mt-1">{errors.password.message}</p>}
        </div>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full">
          Установить новый пароль
        </Button>
      </form>
    </div>
  );
}
