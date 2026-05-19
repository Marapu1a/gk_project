import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../validation/passwordResetSchemas';
import { requestPasswordReset } from '../api/passwordReset';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { AuthCard, AuthField, AuthFooterLinks, AuthSubmitButton } from './AuthLayout';

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
      <>
        <AuthCard className="text-center text-[15px] leading-6">
          Если такой email зарегистрирован, ссылка для сброса пароля отправлена.
        </AuthCard>
        <AuthFooterLinks />
      </>
    );
  }

  return (
    <>
      <AuthCard className="px-5 py-8">
        <form onSubmit={onSubmit} className="space-y-5">
        {errors.root?.serverError && (
          <div
            className="rounded-[10px] border border-[var(--color-danger)] p-3 text-sm text-[var(--color-danger)]"
          >
            {errors.root.serverError.message}
          </div>
        )}

        <p className="mx-auto max-w-[260px] text-center text-[15px] leading-5 text-[#8D96B5]">
          Введите Email, который использовали при регистрации
        </p>

        <AuthField label="Email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input-design h-[32px]"
            disabled={isSubmitting}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </AuthField>

        <AuthSubmitButton loading={isSubmitting} disabled={isSubmitting}>
          Далее
        </AuthSubmitButton>
        </form>
      </AuthCard>
      <AuthFooterLinks />
    </>
  );
}
