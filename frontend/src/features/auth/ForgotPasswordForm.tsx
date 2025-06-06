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
    return (
      <p className="text-center text-brand font-medium mt-10">
        Если email существует, инструкция отправлена
      </p>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-md mx-auto mt-12 font-sans space-y-5"
      >
        {/* Email */}
        <input
          type="email"
          autoComplete="email"
          placeholder="Ваш email"
          {...register('email')}
          className="input"
        />
        {errors.email && <p className="text-error">{errors.email.message}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-brand w-full disabled:opacity-50"
        >
          {mutation.isPending ? 'Отправка...' : 'Восстановить пароль'}
        </button>

        {/* Error */}
        {mutation.isError && (
          <p className="text-error text-center">Произошла ошибка. Попробуйте позже.</p>
        )}
        <BackButton />
      </form>
    </>
  );
}
