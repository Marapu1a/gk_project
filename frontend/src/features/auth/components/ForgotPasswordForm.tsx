import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../validation/passwordResetSchemas';
import { requestPasswordReset } from '../api/passwordReset';
import { Button } from '@/components/Button';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';

type FormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onSubmit',
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await requestPasswordReset(data);
      setSubmitted(true);
      toast.info('Если email существует, отправили ссылку для сброса');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Ошибка при отправке запроса';
      setError('root.serverError', { message });
      toast.error(message);
    }
  });

  if (submitted) {
    return (
      <div
        className="w-full max-w-md mx-auto mt-10 rounded-2xl border header-shadow bg-white p-6 text-center text-sm"
        style={{ borderColor: 'var(--color-green-light)' }}
      >
        <p className="text-green-700 font-medium">
          Если такой email зарегистрирован, ссылка для сброса пароля отправлена.
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md mx-auto mt-10 rounded-2xl border header-shadow bg-white"
      style={{ borderColor: 'var(--color-green-light)' }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-green-light)' }}>
        <h1 className="text-xl font-semibold text-blue-dark">Восстановление пароля</h1>
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
          <label htmlFor="email" className="block mb-1 text-sm text-blue-dark">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input w-full"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-error mt-1">{errors.email.message}</p>}
        </div>

        <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="w-full">
          Отправить ссылку
        </Button>
      </form>
    </div>
  );
}
