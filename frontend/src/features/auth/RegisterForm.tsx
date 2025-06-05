import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/validators/auth';
import type { RegisterFormData } from '@/validators/auth';
import { useRegisterMutation } from '@/hooks/useRegisterMutation';
import { saveAuth } from '@/utils/auth';
import { useNavigate, Link } from 'react-router-dom';

export function RegisterForm() {
  const navigate = useNavigate();
  const mutation = useRegisterMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...payload } = data;
    mutation.mutate(payload, {
      onSuccess: (res) => {
        saveAuth(res.token);
        navigate('/dashboard');
      },
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md mx-auto mt-10">
        <input
          {...register('email')}
          placeholder="Email"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}

        <input
          {...register('firstName')}
          placeholder="Имя"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.firstName && <p className="text-red-600 text-sm">{errors.firstName.message}</p>}

        <input
          {...register('lastName')}
          placeholder="Фамилия"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.lastName && <p className="text-red-600 text-sm">{errors.lastName.message}</p>}

        <input
          {...register('phone')}
          placeholder="Телефон"
          className="w-full border px-3 py-2 rounded"
        />
        {errors.phone && <p className="text-red-600 text-sm">{errors.phone.message}</p>}

        <input
          {...register('password')}
          type="password"
          placeholder="Пароль"
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
          {mutation.isPending ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        {mutation.isError && <p className="text-red-600">Ошибка: {mutation.error?.message}</p>}
      </form>
      <p className="text-sm text-center text-gray-600">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Войти
        </Link>
      </p>
    </>
  );
}
