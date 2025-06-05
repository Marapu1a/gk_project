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

  if (!token) return <p className="text-red-600">Ссылка недействительна</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
      <input
        {...register('password')}
        type="password"
        placeholder="Новый пароль"
        className="w-full border px-3 py-2 rounded"
      />
      {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}

      <input
        {...register('confirmPassword')}
        type="password"
        placeholder="Повторите пароль"
        className="w-full border px-3 py-2 rounded"
      />
      {errors.confirmPassword && (
        <p className="text-red-600 text-sm">{errors.confirmPassword.message}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {mutation.isPending ? 'Сброс...' : 'Сбросить пароль'}
      </button>

      {mutation.isSuccess && (
        <p className="text-green-600">Пароль обновлён. Перенаправляем на вход...</p>
      )}
      {mutation.isError && <p className="text-red-600 text-sm">Ошибка. Возможно, токен устарел.</p>}
    </form>
  );
}
