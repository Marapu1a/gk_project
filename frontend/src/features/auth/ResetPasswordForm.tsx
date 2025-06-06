import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '@/validators/auth';
import { useResetPasswordMutation } from '@/hooks/useResetPasswordMutation';
import { useEffect } from 'react';

export function ResetPasswordForm() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const mutation = useResetPasswordMutation(token || '');

  useEffect(() => {
    if (mutation.isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [mutation.isSuccess, navigate]);

  const onSubmit = (data: ResetPasswordFormData) => {
    mutation.mutate(data);
  };

  if (!token) {
    return <p className="text-error text-center mt-10">Ссылка недействительна</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto mt-12 font-sans space-y-5">
      {/* Новый пароль */}
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Новый пароль"
        {...register('password')}
        className="input"
      />
      {errors.password && <p className="text-error">{errors.password.message}</p>}

      {/* Подтверждение */}
      <input
        type="password"
        autoComplete="new-password"
        placeholder="Повторите пароль"
        {...register('confirmPassword')}
        className="input"
      />
      {errors.confirmPassword && <p className="text-error">{errors.confirmPassword.message}</p>}

      {/* Кнопка */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="btn btn-brand w-full disabled:opacity-50"
      >
        {mutation.isPending ? 'Сброс...' : 'Сбросить пароль'}
      </button>

      {/* Уведомления */}
      {mutation.isSuccess && (
        <p className="text-brand text-center mt-4">Пароль обновлён. Перенаправляем на вход...</p>
      )}

      {mutation.isError && (
        <p className="text-error text-center mt-4">Ошибка. Возможно, токен устарел.</p>
      )}
    </form>
  );
}
