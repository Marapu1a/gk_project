import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema } from '@/validators/auth';
import type { ForgotPasswordFormData } from '@/validators/auth';
import { useForgotPasswordMutation } from '@/hooks/useForgotPasswordMutation';
import { useState } from 'react';
import BackButton from '@/components/BackButton';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useForgotPasswordMutation();

  const onSubmit = (data: ForgotPasswordFormData) => {
    mutation.mutate(data, {
      onSuccess: () => setSent(true),
    });
  };

  if (sent) {
    return <p className="text-green-600">Если email существует, инструкция отправлена</p>;
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
        <input
          {...register('email')}
          type="email"
          placeholder="Ваш email"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {mutation.isPending ? 'Отправка...' : 'Восстановить пароль'}
        </button>

        {mutation.isError && (
          <p className="text-red-600 text-sm">Произошла ошибка. Попробуйте позже.</p>
        )}
      </form>
      <BackButton />
    </>
  );
}
