import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../validation/passwordResetSchemas';
import { resetPassword } from '../api/passwordReset';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { AuthCard, AuthField, AuthFooterLinks, AuthSubmitButton, PasswordInput } from './AuthLayout';
import { UI_TOAST_MESSAGES } from '@/utils/uiMessages';

type FormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [passwordVisible, setPasswordVisible] = useState(false);

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
      <>
        <AuthCard className="text-center text-sm text-[var(--color-danger)]">
          Ссылка недействительна или отсутствует токен.
        </AuthCard>
        <AuthFooterLinks />
      </>
    );
  }

  const onSubmit = handleSubmit(async (data) => {
    try {
      await resetPassword({ token, password: data.password });
      toast.success(UI_TOAST_MESSAGES.auth.passwordUpdated);
      navigate('/login');
    } catch (err: any) {
      const message = err?.response?.data?.error || UI_TOAST_MESSAGES.auth.passwordResetLinkInvalid;
      setError('root.serverError', { message });
      toast.error(message);
    }
  });

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

          <AuthField label="Новый пароль" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Мин. 6 символов"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              valueVisible={passwordVisible}
              onToggleVisible={() => setPasswordVisible((value) => !value)}
              {...register('password')}
            />
          </AuthField>

          <AuthSubmitButton loading={isSubmitting} disabled={isSubmitting}>
            Установить новый пароль
          </AuthSubmitButton>
        </form>
      </AuthCard>
      <AuthFooterLinks />
    </>
  );
}
