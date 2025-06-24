import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '../validation/passwordResetSchemas';
import { requestPasswordReset } from '../api/passwordReset';
import { Button } from '@/components/Button';
import { z } from 'zod';
import { useState } from 'react';

type FormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await requestPasswordReset(data);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Ошибка при отправке запроса');
    }
  };

  if (submitted) {
    return (
      <div className="text-center mt-10 text-green-700 font-medium">
        Если такой email зарегистрирован, ссылка для сброса пароля отправлена.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
      <h1 className="text-xl font-bold text-blue-dark">Восстановление пароля</h1>

      <div>
        <input type="email" placeholder="Email" className="input w-full" {...register('email')} />
        {errors.email && <p className="text-error mt-1">{errors.email.message}</p>}
      </div>

      <Button type="submit" loading={isSubmitting} className="w-full">
        Отправить ссылку
      </Button>
    </form>
  );
}
