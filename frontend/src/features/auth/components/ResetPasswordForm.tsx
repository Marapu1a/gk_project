import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema } from '../validation/passwordResetSchemas';
import { resetPassword } from '../api/passwordReset';
import { z } from 'zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';

type FormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  if (!token) {
    return (
      <div className="text-center text-error mt-10 font-medium">
        Ссылка недействительна или отсутствует токен.
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    try {
      await resetPassword({ token, password: data.password });
      alert('Пароль успешно изменён');
      navigate('/login');
    } catch (err) {
      console.error(err);
      alert('Ссылка устарела или недействительна');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
      <h1 className="text-xl font-bold text-blue-dark">Сброс пароля</h1>

      <div>
        <input
          type="password"
          placeholder="Новый пароль (мин. 6 символов)"
          title="Минимум 6 символов"
          className="input w-full"
          {...register('password')}
        />
        {errors.password && <p className="text-error mt-1">{errors.password.message}</p>}
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Установить новый пароль
      </Button>
    </form>
  );
}
